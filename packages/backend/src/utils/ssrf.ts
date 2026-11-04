/**
 * SSRF guard for user-supplied LLM endpoints (`openaiBaseUrl`).
 *
 * Policy (issue #87):
 *  - The operator's own OPENAI_BASE_URL is trusted config and is never filtered.
 *  - Any other URL comes from an unauthenticated caller and is default-deny for
 *    loopback / private / link-local / metadata / reserved addresses, unless the operator
 *    opts in with ALLOW_PRIVATE_OPENAI_URL=true (self-hosters pointing at a local LLM).
 *    Even with the opt-in, link-local, cloud-metadata, unspecified, multicast and other
 *    reserved ranges stay blocked.
 *  - Checks happen twice: up front (literal IP + DNS pre-resolution → clean 400) and again
 *    inside the socket's DNS lookup, so the connection is pinned to the address that was
 *    validated (no DNS-rebinding window). Redirects and env proxies are disabled for these
 *    requests (see llmRequestOptions).
 *
 * Error messages are deliberately generic: they never echo resolved addresses.
 */
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { URL } from 'node:url'

export type IpClass = 'public' | 'private' | 'blocked'

export type SsrFCheckOptions = {
  /** Allow loopback / RFC1918 / ULA / CGNAT targets. Default false (opt-in via env). */
  allowPrivate?: boolean
}

export class UnsafeUrlError extends Error {
  readonly code = 'EUNSAFEURL'
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

export const MSG_INVALID = 'OpenAI API URL 无效'
export const MSG_SCHEME = 'OpenAI API URL 只支持 http/https'
export const MSG_CREDENTIALS = 'OpenAI API URL 不能包含用户名或密码'
export const MSG_BLOCKED = 'OpenAI API URL 不允许指向内网、本机或保留地址'
export const MSG_UNRESOLVABLE = 'OpenAI API URL 域名无法解析'

/** ALLOW_PRIVATE_OPENAI_URL=true is the only way to allow private targets. */
export function policyFromEnv(env: NodeJS.ProcessEnv = process.env): Required<SsrFCheckOptions> {
  return { allowPrivate: String(env.ALLOW_PRIVATE_OPENAI_URL || '').trim().toLowerCase() === 'true' }
}

const normBase = (u?: string) => (u || '').trim().replace(/\/+$/, '').toLowerCase()
export const sameBaseUrl = (a?: string, b?: string) => !!normBase(a) && normBase(a) === normBase(b)

/** The operator-configured endpoint is trusted; everything else is user input. */
export function isOperatorBaseUrl(url?: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return sameBaseUrl(url, env.OPENAI_BASE_URL)
}

// ---------------------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------------------

const blockedV4 = new net.BlockList()
const privateV4 = new net.BlockList()
const blockedV6 = new net.BlockList()
const privateV6 = new net.BlockList()

for (const [net4, prefix] of [
  ['0.0.0.0', 8], // "this network", incl. 0.0.0.0
  ['169.254.0.0', 16], // link-local, AWS/GCP/Azure/OCI metadata 169.254.169.254
  ['100.100.100.200', 32], // Alibaba Cloud metadata (inside CGNAT range)
  ['168.63.129.16', 32], // Azure WireServer
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blockedV4.addSubnet(net4, prefix, 'ipv4')
}
for (const [net4, prefix] of [
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT / Tailscale
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  // 198.18.0.0/15 (RFC 2544 benchmarking) is intentionally NOT listed: it hosts no real
  // services, and "fake-ip" DNS proxies (Clash/mihomo/sing-box, common in self-hosting)
  // answer every hostname with an address from it — blocking it would block every URL.
] as const) {
  privateV4.addSubnet(net4, prefix, 'ipv4')
}
for (const [net6, prefix] of [
  ['::', 128], // unspecified
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
  ['100::', 64], // discard-only
  ['2001::', 32], // Teredo (embeds an obfuscated IPv4)
  ['2001:db8::', 32], // documentation
  ['fd00:ec2::254', 128], // AWS IMDS over IPv6
] as const) {
  blockedV6.addSubnet(net6, prefix, 'ipv6')
}
for (const [net6, prefix] of [
  ['::1', 128], // loopback
  ['fc00::', 7], // unique local
  ['fec0::', 10], // deprecated site-local
] as const) {
  privateV6.addSubnet(net6, prefix, 'ipv6')
}

/** Expand an IPv6 literal into 8 16-bit groups (handles `::` and trailing dotted IPv4). */
function ipv6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (v4) {
    const p = v4[1].split('.').map(Number)
    if (p.some((n) => n > 255)) return null
    s = s.slice(0, -v4[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0
  if (fill < 0) return null
  const groups = [...head, ...Array(fill).fill('0'), ...tail].map((g) => parseInt(g, 16))
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff)) return null
  return groups
}

const v4FromGroups = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`

/** IPv4 embedded in an IPv6 address via mapping / compat / NAT64 / 6to4, if any. */
function embeddedIpv4(groups: number[]): string | null {
  const zero = (from: number, to: number) => groups.slice(from, to).every((g) => g === 0)
  // ::ffff:a.b.c.d (mapped) and ::ffff:0:a.b.c.d (SIIT)
  if (zero(0, 5) && groups[5] === 0xffff) return v4FromGroups(groups[6], groups[7])
  if (zero(0, 4) && groups[4] === 0xffff && groups[5] === 0) return v4FromGroups(groups[6], groups[7])
  // ::a.b.c.d (deprecated IPv4-compatible); ::/::1 themselves are handled by the v6 lists
  if (zero(0, 6) && (groups[6] !== 0 || groups[7] > 1)) return v4FromGroups(groups[6], groups[7])
  // 64:ff9b::/96 NAT64 well-known prefix, 64:ff9b:1::/48 local-use NAT64
  if (groups[0] === 0x64 && groups[1] === 0xff9b && zero(2, 6)) return v4FromGroups(groups[6], groups[7])
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups[2] === 1) return v4FromGroups(groups[6], groups[7])
  // 2002:AABB:CCDD::/48 6to4
  if (groups[0] === 0x2002) return v4FromGroups(groups[1], groups[2])
  return null
}

export function classifyIp(ip: string): IpClass {
  const bare = ip.replace(/^\[|\]$/g, '')
  const family = net.isIP(bare.split('%')[0])
  if (family === 4) {
    if (blockedV4.check(bare, 'ipv4')) return 'blocked'
    if (privateV4.check(bare, 'ipv4')) return 'private'
    return 'public'
  }
  if (family === 6) {
    const groups = ipv6Groups(bare)
    if (!groups) return 'blocked'
    const canonical = groups.map((g) => g.toString(16)).join(':')
    if (blockedV6.check(canonical, 'ipv6')) return 'blocked'
    if (privateV6.check(canonical, 'ipv6')) return 'private'
    const v4 = embeddedIpv4(groups)
    if (v4) return classifyIp(v4)
    return 'public'
  }
  // Not an IP at all: never connect to it as if it were one.
  return 'blocked'
}

export function isIpAllowed(ip: string, opts: SsrFCheckOptions = {}): boolean {
  const cls = classifyIp(ip)
  return cls === 'public' || (cls === 'private' && opts.allowPrivate === true)
}

// ---------------------------------------------------------------------------------------
// Hostname / URL checks
// ---------------------------------------------------------------------------------------

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'instance-data',
  'instance-data.ec2.internal',
])

function hostClass(host: string): IpClass | 'name' {
  if (!host) return 'blocked'
  if (host.startsWith('[') || net.isIP(host)) return classifyIp(host)
  if (BLOCKED_HOSTS.has(host)) return 'blocked'
  // RFC 6761: *.localhost always resolves to loopback
  if (host === 'localhost' || host.endsWith('.localhost')) return 'private'
  return 'name'
}

/**
 * Synchronous structural check. WHATWG URL parsing canonicalizes decimal / octal / hex /
 * shortened IPv4 forms (http://2130706433, http://0x7f.1, http://017700000001) to dotted
 * quads and IPv6 to compressed form, so literal IPs are always classified correctly here.
 * Returns the normalized URL (no trailing slash).
 */
export function assertSafeOpenaiBaseUrl(raw: string, opts: SsrFCheckOptions = {}): string {
  let url: URL
  try {
    url = new URL(String(raw).trim())
  } catch {
    throw new UnsafeUrlError(MSG_INVALID)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(MSG_SCHEME)
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError(MSG_CREDENTIALS)
  }
  const host = url.hostname.toLowerCase().replace(/\.+$/, '')
  const cls = hostClass(host)
  if (cls === 'blocked' || (cls === 'private' && !opts.allowPrivate)) {
    throw new UnsafeUrlError(MSG_BLOCKED)
  }
  url.hash = ''
  return url.toString().replace(/\/+$/, '')
}

export type LookupAllFn = (hostname: string) => Promise<{ address: string; family: number }[]>

const defaultLookupAll: LookupAllFn = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true })

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new UnsafeUrlError(MSG_UNRESOLVABLE)), ms)
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e))
    )
  })
}

/**
 * Full pre-flight check: structure + DNS. Every resolved address must be allowed (a host
 * that resolves to both a public and a private address is rejected).
 */
export async function assertSafeOpenaiBaseUrlResolved(
  raw: string,
  opts: SsrFCheckOptions = {},
  lookupAll: LookupAllFn = defaultLookupAll
): Promise<string> {
  const normalized = assertSafeOpenaiBaseUrl(raw, opts)
  const host = new URL(normalized).hostname.toLowerCase().replace(/\.+$/, '')
  if (host.startsWith('[') || net.isIP(host)) return normalized
  let addrs: { address: string }[]
  try {
    addrs = await withTimeout(lookupAll(host), 5000)
  } catch {
    throw new UnsafeUrlError(MSG_UNRESOLVABLE)
  }
  if (!addrs.length) throw new UnsafeUrlError(MSG_UNRESOLVABLE)
  if (!addrs.every((a) => isIpAllowed(a.address, opts))) {
    throw new UnsafeUrlError(MSG_BLOCKED)
  }
  return normalized
}

// ---------------------------------------------------------------------------------------
// Connection pinning
// ---------------------------------------------------------------------------------------

type LookupCb = (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
type LookupLike = (hostname: string, options: any, cb: LookupCb) => void

/**
 * A `lookup` for http(s).Agent that resolves, validates and hands the socket only the
 * validated addresses. Because the socket connects to exactly what this returns, a DNS
 * answer that changes between the pre-check and the request (rebinding) cannot reach a
 * private address. Note: Node skips `lookup` for literal IPs, which is why
 * assertSafeOpenaiBaseUrl must also run right before every request.
 */
export function createGuardedLookup(opts: SsrFCheckOptions, resolver: LookupLike = dns.lookup as any): LookupLike {
  return (hostname, options, cb) => {
    if (typeof options === 'function') {
      cb = options
      options = {}
    }
    const wantAll = !!options?.all
    resolver(hostname, { ...(typeof options === 'object' ? options : {}), all: true }, (err, addresses) => {
      if (err) return cb(err, wantAll ? [] : '', undefined)
      const list: { address: string; family: number }[] = Array.isArray(addresses)
        ? addresses
        : [{ address: addresses, family: net.isIP(addresses) }]
      if (!list.length || !list.every((a) => isIpAllowed(a.address, opts))) {
        return cb(new UnsafeUrlError(MSG_BLOCKED) as any, wantAll ? [] : '', undefined)
      }
      if (wantAll) return cb(null, list)
      return cb(null, list[0].address, list[0].family)
    })
  }
}

const agentCache = new Map<string, { httpAgent: http.Agent; httpsAgent: https.Agent }>()

export function guardedAgents(opts: SsrFCheckOptions) {
  const key = opts.allowPrivate ? 'private' : 'public'
  let agents = agentCache.get(key)
  if (!agents) {
    const lookup = createGuardedLookup(opts) as any
    agents = {
      httpAgent: new http.Agent({ keepAlive: true, lookup }),
      httpsAgent: new https.Agent({ keepAlive: true, lookup }),
    }
    agentCache.set(key, agents)
  }
  return agents
}

/**
 * Axios options for a request to an LLM endpoint. For the operator's own endpoint nothing
 * changes. For user-supplied endpoints: re-check the URL, pin DNS via the guarded agents,
 * never follow redirects (a 30x to an internal host would bypass the check) and never route
 * through HTTP(S)_PROXY (the proxy would do its own, unchecked, resolution).
 */
export function llmRequestOptions(baseURL: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (!baseURL || isOperatorBaseUrl(baseURL, env)) return {}
  const policy = policyFromEnv(env)
  assertSafeOpenaiBaseUrl(baseURL, policy)
  return { ...guardedAgents(policy), maxRedirects: 0, proxy: false as const }
}
