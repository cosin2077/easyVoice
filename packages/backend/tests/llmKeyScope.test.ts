import { sameBaseUrl, validateLLM } from '../src/schema/generate'

function run(body: any, env: Record<string, string>) {
  const saved = { ...process.env }
  Object.assign(process.env, env)
  const req: any = { body, url: '/api/v1/tts/createStream' }
  const res: any = { status: () => res, json: () => res }
  let nexted = false
  try {
    validateLLM(req, res, () => (nexted = true))
  } finally {
    process.env = saved
  }
  return { body: req.body, nexted }
}

describe('server OPENAI_API_KEY scope', () => {
  const env = { OPENAI_BASE_URL: 'https://api.example.com/v1', OPENAI_API_KEY: 'server-key', MODEL_NAME: 'm' }

  it('normalizes base urls', () => {
    expect(sameBaseUrl('https://API.example.com/v1/', 'https://api.example.com/v1')).toBe(true)
    expect(sameBaseUrl('', 'https://api.example.com/v1')).toBe(false)
  })

  it('lends the server key to the server endpoint', () => {
    const { body, nexted } = run({ text: 'hello world', useLLM: true }, env)
    expect(body.openaiKey).toBe('server-key')
    expect(nexted).toBe(true)
  })

  it('never sends the server key to a client-supplied endpoint', () => {
    const { body, nexted } = run(
      { text: 'hello world', useLLM: true, openaiBaseUrl: 'https://attacker.example.net/v1' },
      env
    )
    expect(body.openaiKey).toBeUndefined()
    expect(nexted).toBe(false)
  })
})

describe('openaiBaseUrl SSRF guard in validateLLM (#87)', () => {
  const env = { OPENAI_BASE_URL: 'http://127.0.0.1:8317/v1', OPENAI_API_KEY: 'server-key', MODEL_NAME: 'm' }

  async function runAsync(body: any, extraEnv: Record<string, string> = {}) {
    const saved = { ...process.env }
    delete process.env.ALLOW_PRIVATE_OPENAI_URL
    Object.assign(process.env, env, extraEnv)
    const req: any = { body, url: '/api/v1/tts/createStream' }
    let status = 200
    let json: any
    let nexted = false
    try {
      await new Promise<void>((resolve) => {
        const res: any = {
          status: (s: number) => ((status = s), res),
          json: (j: any) => ((json = j), resolve(), res),
        }
        validateLLM(req, res, () => ((nexted = true), resolve()))
      })
    } finally {
      process.env = saved
    }
    return { status, json, nexted, body: req.body }
  }

  const user = (openaiBaseUrl: string) => ({
    text: 'hello world',
    useLLM: true,
    openaiBaseUrl,
    openaiKey: 'user-key',
    openaiModel: 'x',
  })

  it('trusts the operator endpoint even when it is private (local LLM)', async () => {
    const r = await runAsync({ text: 'hello world', useLLM: true })
    expect(r.nexted).toBe(true)
    expect(r.body.openaiBaseUrl).toBe(env.OPENAI_BASE_URL)
    const r2 = await runAsync({ text: 'hello world', useLLM: true, openaiBaseUrl: 'HTTP://127.0.0.1:8317/v1/' })
    expect(r2.nexted).toBe(true)
    expect(r2.body.openaiBaseUrl).toBe(env.OPENAI_BASE_URL)
    expect(r2.body.openaiKey).toBe('server-key')
  })

  it.each([
    'http://127.0.0.1:6379/v1',
    'http://localhost:3000/v1',
    'http://169.254.169.254/latest',
    'http://2130706433:8080/v1',
    'http://[::ffff:127.0.0.1]/v1',
    'http://10.0.0.1/v1',
    'gopher://example.com/',
  ])('rejects user-supplied %s with 400 by default', async (u) => {
    const r = await runAsync(user(u))
    expect(r.nexted).toBe(false)
    expect(r.status).toBe(400)
    expect(JSON.stringify(r.json)).not.toMatch(/127\.0|10\.0|169\.254|6379/)
  })

  it('ALLOW_PRIVATE_OPENAI_URL=true lets self-hosters use a LAN endpoint, not metadata', async () => {
    const ok = await runAsync(user('http://192.168.1.20:1234/v1'), { ALLOW_PRIVATE_OPENAI_URL: 'true' })
    expect(ok.nexted).toBe(true)
    const bad = await runAsync(user('http://169.254.169.254/v1'), { ALLOW_PRIVATE_OPENAI_URL: 'true' })
    expect(bad.status).toBe(400)
  })

  it('ALLOW_PRIVATE_OPENAI_URL=false (old opt-out spelling) still blocks', async () => {
    const r = await runAsync(user('http://127.0.0.1:1/v1'), { ALLOW_PRIVATE_OPENAI_URL: 'false' })
    expect(r.status).toBe(400)
  })
})
