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
