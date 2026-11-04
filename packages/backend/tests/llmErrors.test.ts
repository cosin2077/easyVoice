import { createOpenAIClient, LlmRequestError } from '../src/utils/openai'
import { publicLlmReason, ErrorMessages } from '../src/services/tts.shared'

describe('LLM errors shown to callers do not leak internals (#87)', () => {
  const client = createOpenAIClient()
  const saved = { ...process.env }
  afterEach(() => (process.env = { ...saved }))

  it('blocked target → fixed message, no request', async () => {
    delete process.env.ALLOW_PRIVATE_OPENAI_URL
    const err = await client
      .createChatCompletion({ messages: [] } as any, { baseURL: 'http://127.0.0.1:9/v1', apiKey: 'k' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(LlmRequestError)
    expect(err.publicMessage).toBe('AI 地址不被允许')
  })

  it('connection failure → generic message without address/port/errno', async () => {
    process.env.ALLOW_PRIVATE_OPENAI_URL = 'true'
    const err = await client
      .createChatCompletion({ messages: [] } as any, { baseURL: 'http://127.0.0.1:9/v1', apiKey: 'k', timeout: 2000 })
      .catch((e) => e)
    expect(err).toBeInstanceOf(LlmRequestError)
    expect(err.publicMessage).toBe('无法连接 AI 服务')
    expect(publicLlmReason(err)).not.toMatch(/127|ECONN|:9/)
  })

  it('maps parse failures and unknown errors to fixed strings', () => {
    expect(publicLlmReason(new Error(ErrorMessages.INVALID_PARAMS_FORMAT))).toBe('AI 返回格式无效')
    expect(publicLlmReason(new Error('connect ECONNREFUSED 10.0.0.1:6379'))).toBe('AI 服务异常')
  })
})
