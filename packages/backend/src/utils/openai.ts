import axios, { AxiosError } from 'axios'
import { MODEL_NAME, OPENAI_BASE_URL, OPENAI_API_KEY } from '../config'
import { logger } from './logger'
import { llmRequestOptions, UnsafeUrlError } from './ssrf'

// 配置接口定义
interface OpenAIConfig {
  baseURL?: string
  model?: string
  timeout: number
  apiKey?: string
}

/**
 * Error surfaced to callers. `publicMessage` is safe to show to the (untrusted) requester:
 * it never contains socket errors, resolved addresses or upstream bodies, so a failing
 * request cannot be used as an internal-network reachability oracle (#87).
 */
export class LlmRequestError extends Error {
  constructor(
    readonly publicMessage: string,
    readonly status?: number
  ) {
    super(`Chat completion request failed: ${publicMessage}`)
    this.name = 'LlmRequestError'
  }
}

function toLlmError(error: unknown): LlmRequestError {
  if (error instanceof UnsafeUrlError) return new LlmRequestError('AI 地址不被允许')
  if (error instanceof AxiosError) {
    const status = error.response?.status
    if (status) return new LlmRequestError(`AI 服务返回 HTTP ${status}`, status)
    if (error.cause instanceof UnsafeUrlError) return new LlmRequestError('AI 地址不被允许')
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new LlmRequestError('AI 服务请求超时')
    }
  }
  return new LlmRequestError('无法连接 AI 服务')
}

// Dedicated instance: the generic `fetcher` adds JWT_TOKEN as Authorization to every
// request, which would overwrite the LLM key and hand that token to user-supplied hosts.
const http = axios.create({ headers: { 'Content-Type': 'application/json' } })

/**
 * 创建 OpenAI 客户端实例
 * @returns OpenAI 工具函数集合
 */
export function createOpenAIClient() {
  // 默认配置
  let currentConfig: OpenAIConfig = {
    baseURL: OPENAI_BASE_URL,
    model: MODEL_NAME,
    timeout: 60000,
    apiKey: OPENAI_API_KEY,
  }
  logger.debug(`init openai with: `, {
    ...currentConfig,
    apiKey: currentConfig?.apiKey ? currentConfig?.apiKey?.slice(0, 10) + '***' : undefined,
  })
  // 设置 headers
  const getHeaders = (cfg: OpenAIConfig = currentConfig) => ({
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  })

  const merge = (customConfig?: Partial<OpenAIConfig>): OpenAIConfig => {
    const overrides = Object.fromEntries(
      Object.entries(customConfig || {}).filter(([, v]) => v !== undefined && v !== '')
    ) as Partial<OpenAIConfig>
    return { ...currentConfig, ...overrides }
  }

  const join = (base: string | undefined, path: string) =>
    `${base}${base?.endsWith('/') ? '' : '/'}${path}`

  /**
   * 创建 Chat Completion
   * @param request 请求参数
   * @param customConfig 自定义配置，可覆盖默认配置
   */
  async function createChatCompletion(
    request: ChatCompletionRequest,
    customConfig?: Partial<OpenAIConfig>
  ): Promise<ChatCompletionResponse> {
    const mergedConfig = merge(customConfig)
    try {
      const guard = llmRequestOptions(mergedConfig.baseURL)
      const response = await http.post<ChatCompletionResponse>(
        join(mergedConfig.baseURL, 'chat/completions'),
        {
          model: request.model || mergedConfig.model,
          temperature: request.temperature ?? 1.0,
          max_tokens: request.max_tokens,
          top_p: request.top_p ?? 1.0,
          stream: request.stream ?? false,
          ...request,
        },
        { headers: getHeaders(mergedConfig), timeout: mergedConfig.timeout, ...guard }
      )
      return response.data
    } catch (error) {
      const err = toLlmError(error)
      // Server-side log keeps the detail for the operator; the caller only sees publicMessage.
      logger.warn(
        `createChatCompletion failed: ${err.publicMessage} (${error instanceof Error ? (error as any).code || error.message : String(error)})`
      )
      throw err
    }
  }

  /**
   * 获取可用模型列表
   */
  async function getModels(customConfig?: Partial<OpenAIConfig>): Promise<{ data: { id: string }[] }> {
    const cfg = merge(customConfig)
    try {
      const response = await http.get<{ data: { id: string }[] }>(join(cfg.baseURL, 'models'), {
        headers: getHeaders(cfg),
        timeout: cfg.timeout,
        ...llmRequestOptions(cfg.baseURL),
      })
      return response.data
    } catch (error) {
      throw toLlmError(error)
    }
  }

  /**
   * 动态更新配置
   * @param newConfig 新的配置参数
   */
  function config(newConfig: Partial<OpenAIConfig>) {
    currentConfig = {
      ...currentConfig,
      ...newConfig,
    }
    logger.debug(`openai config updated`, { baseURL: currentConfig.baseURL, model: currentConfig.model })
  }

  return {
    createChatCompletion,
    getModels,
    config,
  }
}

export const openai = createOpenAIClient()
