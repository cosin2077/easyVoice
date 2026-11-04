import http from 'node:http'
import type { AddressInfo } from 'node:net'
import axios from 'axios'
import {
  assertSafeOpenaiBaseUrl,
  assertSafeOpenaiBaseUrlResolved,
  classifyIp,
  createGuardedLookup,
  isIpAllowed,
  llmRequestOptions,
  policyFromEnv,
  UnsafeUrlError,
} from '../src/utils/ssrf'

const PRIV = { allowPrivate: true }

describe('classifyIp', () => {
  test.each([
    ['8.8.8.8', 'public'],
    ['1.1.1.1', 'public'],
    ['172.15.255.255', 'public'],
    ['172.32.0.1', 'public'],
    ['2606:4700:4700::1111', 'public'],
    ['127.0.0.1', 'private'],
    ['127.255.255.254', 'private'],
    ['10.1.2.3', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['192.168.1.1', 'private'],
    ['100.64.0.1', 'private'],
    ['198.18.0.1', 'public'], // fake-ip DNS range, see ssrf.ts
    ['::1', 'private'],
    ['fd12:3456::1', 'private'],
    ['fc00::1', 'private'],
    ['0.0.0.0', 'blocked'],
    ['0.1.2.3', 'blocked'],
    ['169.254.169.254', 'blocked'],
    ['169.254.0.1', 'blocked'],
    ['100.100.100.200', 'blocked'],
    ['168.63.129.16', 'blocked'],
    ['224.0.0.1', 'blocked'],
    ['255.255.255.255', 'blocked'],
    ['192.0.2.1', 'blocked'],
    ['::', 'blocked'],
    ['fe80::1', 'blocked'],
    ['ff02::1', 'blocked'],
    ['fd00:ec2::254', 'blocked'],
    ['2001:db8::1', 'blocked'],
    ['2001:0:4136:e378:8000:63bf:3fff:fdd2', 'blocked'], // Teredo
    // IPv4 embedded in IPv6
    ['::ffff:127.0.0.1', 'private'],
    ['::ffff:7f00:1', 'private'],
    ['::ffff:a9fe:a9fe', 'blocked'], // ::ffff:169.254.169.254
    ['::ffff:0:a00:1', 'private'], // SIIT 10.0.0.1
    ['::127.0.0.1', 'private'], // IPv4-compatible
    ['64:ff9b::a9fe:a9fe', 'blocked'], // NAT64 → metadata
    ['64:ff9b::808:808', 'public'], // NAT64 → 8.8.8.8
    ['2002:c0a8:0101::1', 'private'], // 6to4 → 192.168.1.1
    ['2002:0808:0808::1', 'public'],
    ['[::1]', 'private'],
    ['not-an-ip', 'blocked'],
  ])('%s → %s', (ip, cls) => {
    expect(classifyIp(ip)).toBe(cls)
  })

  test('opt-in allows private but never blocked ranges', () => {
    expect(isIpAllowed('10.0.0.1')).toBe(false)
    expect(isIpAllowed('10.0.0.1', PRIV)).toBe(true)
    expect(isIpAllowed('169.254.169.254', PRIV)).toBe(false)
    expect(isIpAllowed('0.0.0.0', PRIV)).toBe(false)
    expect(isIpAllowed('8.8.8.8')).toBe(true)
  })
})

describe('assertSafeOpenaiBaseUrl (structural)', () => {
  test('accepts public https / http', () => {
    expect(assertSafeOpenaiBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1')
    expect(assertSafeOpenaiBaseUrl('http://8.8.8.8:8080/v1')).toBe('http://8.8.8.8:8080/v1')
  })

  test.each([
    'http://127.0.0.1:8317/v1',
    'http://localhost:11434/v1',
    'http://LOCALHOST./v1',
    'http://foo.localhost/v1',
    'http://10.0.0.5/v1',
    'http://192.168.1.1/v1',
    'http://[::1]:8080/v1',
    'http://[::ffff:127.0.0.1]/v1',
    'http://[::ffff:7f00:1]/v1',
    'http://2130706433/v1', // decimal 127.0.0.1
    'http://0x7f000001/v1', // hex
    'http://0x7f.1/v1', // short hex
    'http://017700000001/v1', // octal
    'http://0177.0.0.1/v1', // octal dotted
    'http://127.1/v1', // shortened
    'http://3232235777/v1', // 192.168.1.1
  ])('rejects private by default: %s', (u) => {
    expect(() => assertSafeOpenaiBaseUrl(u)).toThrow(UnsafeUrlError)
  })

  test.each([
    'http://169.254.169.254/latest/meta-data',
    'http://2852039166/', // decimal 169.254.169.254
    'http://0xa9fea9fe/',
    'http://[::ffff:169.254.169.254]/',
    'http://[fd00:ec2::254]/',
    'http://metadata.google.internal/computeMetadata/v1',
    'http://metadata.google.internal./',
    'http://0.0.0.0:3000/',
    'http://0/',
    'http://[::]/',
    'http://100.100.100.200/',
  ])('rejects metadata/reserved even with opt-in: %s', (u) => {
    expect(() => assertSafeOpenaiBaseUrl(u, PRIV)).toThrow(UnsafeUrlError)
  })

  test('opt-in allows loopback / LAN', () => {
    expect(assertSafeOpenaiBaseUrl('http://127.0.0.1:8317/v1', PRIV)).toBe('http://127.0.0.1:8317/v1')
    expect(assertSafeOpenaiBaseUrl('http://localhost:11434/v1', PRIV)).toBe('http://localhost:11434/v1')
    expect(assertSafeOpenaiBaseUrl('http://192.168.1.10:1234/v1', PRIV)).toContain('192.168.1.10')
  })

  test.each(['file:///etc/passwd', 'gopher://127.0.0.1:6379/_x', 'ftp://example.com/', 'javascript:alert(1)', 'dict://x/', 'not a url', ''])(
    'rejects non-http(s) / invalid: %s',
    (u) => {
      expect(() => assertSafeOpenaiBaseUrl(u, PRIV)).toThrow(UnsafeUrlError)
    }
  )

  test('rejects userinfo tricks', () => {
    expect(() => assertSafeOpenaiBaseUrl('http://api.openai.com@127.0.0.1/v1')).toThrow(UnsafeUrlError)
    expect(() => assertSafeOpenaiBaseUrl('https://user:pass@api.openai.com/v1')).toThrow(/用户名或密码/)
    expect(() => assertSafeOpenaiBaseUrl('http://127.0.0.1#@api.openai.com/v1')).toThrow(UnsafeUrlError)
    expect(() => assertSafeOpenaiBaseUrl('http://127.0.0.1\\@api.openai.com/v1')).toThrow(UnsafeUrlError)
  })

  test('error messages never echo the target', () => {
    try {
      assertSafeOpenaiBaseUrl('http://10.11.12.13:6379/v1')
    } catch (e) {
      expect((e as Error).message).not.toMatch(/10\.11|6379/)
    }
  })
})

describe('policyFromEnv', () => {
  test('private is opt-in only', () => {
    expect(policyFromEnv({}).allowPrivate).toBe(false)
    expect(policyFromEnv({ ALLOW_PRIVATE_OPENAI_URL: 'false' }).allowPrivate).toBe(false)
    expect(policyFromEnv({ ALLOW_PRIVATE_OPENAI_URL: '1' }).allowPrivate).toBe(false)
    expect(policyFromEnv({ ALLOW_PRIVATE_OPENAI_URL: 'true' }).allowPrivate).toBe(true)
    expect(policyFromEnv({ ALLOW_PRIVATE_OPENAI_URL: ' TRUE ' }).allowPrivate).toBe(true)
  })
})

describe('assertSafeOpenaiBaseUrlResolved (DNS)', () => {
  const fake = (map: Record<string, string[]>) => async (h: string) => {
    if (!map[h]) throw Object.assign(new Error('ENOTFOUND ' + h), { code: 'ENOTFOUND' })
    return map[h].map((address) => ({ address, family: address.includes(':') ? 6 : 4 }))
  }

  test('public hostname passes', async () => {
    await expect(
      assertSafeOpenaiBaseUrlResolved('https://api.example.com/v1', {}, fake({ 'api.example.com': ['93.184.216.34'] }))
    ).resolves.toBe('https://api.example.com/v1')
  })

  test('hostname resolving to a private address is rejected', async () => {
    const lookup = fake({ 'evil.example.com': ['127.0.0.1'], 'nip.example.com': ['10.0.0.1'], 'v6.example.com': ['::ffff:169.254.169.254'] })
    for (const h of ['evil.example.com', 'nip.example.com', 'v6.example.com']) {
      await expect(assertSafeOpenaiBaseUrlResolved(`http://${h}/v1`, {}, lookup)).rejects.toThrow(UnsafeUrlError)
    }
  })

  test('mixed public + private answers are rejected', async () => {
    await expect(
      assertSafeOpenaiBaseUrlResolved('http://mixed.example.com/v1', {}, fake({ 'mixed.example.com': ['93.184.216.34', '192.168.0.1'] }))
    ).rejects.toThrow(UnsafeUrlError)
  })

  test('unresolvable host gives a generic error', async () => {
    await expect(assertSafeOpenaiBaseUrlResolved('http://nope.invalid/v1', {}, fake({}))).rejects.toThrow(/无法解析/)
  })

  test('opt-in allows hostnames that resolve to LAN, still not metadata', async () => {
    const lookup = fake({ 'llm.lan': ['192.168.1.20'], 'meta.lan': ['169.254.169.254'] })
    await expect(assertSafeOpenaiBaseUrlResolved('http://llm.lan:1234/v1', PRIV, lookup)).resolves.toContain('llm.lan')
    await expect(assertSafeOpenaiBaseUrlResolved('http://meta.lan/v1', PRIV, lookup)).rejects.toThrow(UnsafeUrlError)
  })
})

describe('connection pinning (DNS rebinding)', () => {
  let server: http.Server
  let port: number
  let hits: string[]
  beforeAll(async () => {
    hits = []
    server = http.createServer((req, res) => {
      hits.push(req.url || '')
      if (req.url?.startsWith('/redirect')) {
        res.writeHead(302, { Location: `http://127.0.0.1:${port}/internal` })
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    port = (server.address() as AddressInfo).port
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))
  beforeEach(() => (hits = []))

  // A resolver that answers "public" the first time and "loopback" afterwards — the
  // classic rebinding attack against check-then-fetch.
  const rebinding = () => {
    let n = 0
    return (_h: string, _o: any, cb: any) => {
      n++
      cb(null, [{ address: n === 1 ? '93.184.216.34' : '127.0.0.1', family: 4 }])
    }
  }

  test('guarded lookup rejects a rebinding answer at connect time', async () => {
    const resolver = rebinding()
    // 1st answer (the pre-check) is public …
    await new Promise<void>((resolve) => resolver('rebind.test', {}, () => resolve()))
    // … 2nd answer (the actual connection) is loopback and must be refused.
    const lookup = createGuardedLookup({}, resolver)
    const agent = new http.Agent({ lookup: lookup as any })
    await expect(
      axios.get(`http://rebind.test:${port}/secret`, { httpAgent: agent, proxy: false, maxRedirects: 0 })
    ).rejects.toMatchObject({ cause: expect.any(UnsafeUrlError) })
    expect(hits).toEqual([])
  })

  test('the socket connects to exactly the validated address', async () => {
    // With the opt-in the same loopback answer is allowed, proving the connection uses
    // the address returned by the guarded lookup (not a second, unchecked resolution).
    const lookup = createGuardedLookup(PRIV, (_h: string, _o: any, cb: any) => cb(null, [{ address: '127.0.0.1', family: 4 }]))
    const agent = new http.Agent({ lookup: lookup as any })
    const res = await axios.get(`http://pinned.test:${port}/ok`, { httpAgent: agent, proxy: false })
    expect(res.data).toEqual({ ok: true })
    expect(hits).toEqual(['/ok'])
  })

  test('supports non-`all` lookups too', (done) => {
    const lookup = createGuardedLookup({}, (_h: string, _o: any, cb: any) => cb(null, [{ address: '10.0.0.1', family: 4 }]))
    lookup('x.test', {}, (err) => {
      expect(err).toBeInstanceOf(UnsafeUrlError)
      done()
    })
  })

  test('redirects are not followed for user-supplied endpoints', async () => {
    const env = { ALLOW_PRIVATE_OPENAI_URL: 'true' }
    const opts = llmRequestOptions(`http://127.0.0.1:${port}/v1`, env)
    expect(opts).toMatchObject({ maxRedirects: 0, proxy: false })
    await expect(axios.post(`http://127.0.0.1:${port}/redirect`, {}, opts)).rejects.toMatchObject({
      response: { status: 302 },
    })
    expect(hits).toEqual(['/redirect'])
  })

  test('llmRequestOptions re-checks literal IPs (lookup is skipped for them)', () => {
    expect(() => llmRequestOptions('http://127.0.0.1:1/v1', {})).toThrow(UnsafeUrlError)
    expect(() => llmRequestOptions('http://2130706433/v1', {})).toThrow(UnsafeUrlError)
  })

  test('operator OPENAI_BASE_URL is trusted as-is', () => {
    const env = { OPENAI_BASE_URL: 'http://127.0.0.1:8317/v1' }
    expect(llmRequestOptions('http://127.0.0.1:8317/v1/', env)).toEqual({})
  })
})
