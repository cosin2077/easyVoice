import { MODEL_NAME, OPENAI_BASE_URL, OPENAI_KEY } from "../config";
import { fetcher } from "./request";

/**
 * 创建 OpenAI 客户端实例
 * @param config OpenAI 配置
 * @returns OpenAI 工具函数集合
 */
export function createOpenAIClient() {
  const defaultConfig = {
    baseURL: OPENAI_BASE_URL,
    model: MODEL_NAME,
    timeout: 60000,
  };

  // 设置默认 headers
  const defaultHeaders = {
    'Authorization': `Bearer ${OPENAI_KEY}`,
    'Content-Type': 'application/json',
  };

  /**
   * 创建 Chat Completion
   * @param request 请求参数
   * @param customConfig 自定义配置，可覆盖默认配置
   */
  async function createChatCompletion(
    request: ChatCompletionRequest,
    customConfig?: Partial<OpenAIConfig>
  ): Promise<ChatCompletionResponse> {
    try {
      const mergedConfig = {
        ...defaultConfig,
        ...customConfig,
      };

      const response = await fetcher.post<ChatCompletionResponse>(
        `${mergedConfig.baseURL}/chat/completions`,
        {
          model: request.model || mergedConfig.model,
          messages: request.messages,
          temperature: request.temperature ?? 1.0,
          max_tokens: request.max_tokens,
          top_p: request.top_p ?? 1.0,
          stream: request.stream ?? false,
        },
        {
          headers: defaultHeaders,
          timeout: mergedConfig.timeout,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Chat completion request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取可用模型列表
   */
  async function getModels(): Promise<{ data: { id: string }[] }> {
    try {
      const response = await fetcher.get<{ data: { id: string }[] }>(
        `${defaultConfig.baseURL}/models`,
        {},
        {
          headers: defaultHeaders,
          timeout: defaultConfig.timeout,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Get models failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    createChatCompletion,
    getModels,
  };
}
export const openai = createOpenAIClient()
// 使用示例
// async function example() {
//   // 创建客户端实例
//   const openai = createOpenAIClient({
//     apiKey: 'your-api-key-here',
//     baseURL: 'https://api.openai.com/v1', // 可替换为其他兼容服务
//   });

//   try {
//     // 创建对话
//     const response = await openai.createChatCompletion({
//       messages: [
//         { role: 'system', content: 'You are a helpful assistant.' },
//         { role: 'user', content: 'Hello, how can you help me today?' },
//       ],
//       temperature: 0.7,
//       max_tokens: 500,
//     });

//     console.log(response.choices[0].message.content);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }