import { URL } from 'node:url'

/** Block obvious SSRF targets when users supply openaiBaseUrl. */
const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.google.com',
  '169.254.169.254',
])

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

export type SsrFCheckOptions = {
  /** Allow loopback / private hosts (local CLI proxy). Default true for self-host. */
  allowPrivate?: boolean
}

export function assertSafeOpenaiBaseUrl(raw: string, opts: SsrFCheckOptions = {}): string {
  const allowPrivate = opts.allowPrivate !== false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid OpenAI API URL')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OpenAI API URL must use http or https')
  }
  const host = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error('OpenAI API URL host is not allowed')
  }
  if (!allowPrivate && (host === 'localhost' || host.endsWith('.local') || isPrivateIpv4(host))) {
    throw new Error('OpenAI API URL must not point to a private network')
  }
  // Strip path noise later in client; keep origin + optional path
  return url.toString().replace(/\/$/, '')
}
