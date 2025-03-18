// OpenAI 请求的基本配置接口
interface OpenAIConfig {
  apiKey: string;
  baseURL?: string; // 默认使用 OpenAI 的 URL，可自定义
  model?: string;   // 默认模型
  timeout?: number; // 请求超时时间
}

// Chat Completion 请求参数
interface ChatCompletionRequest {
  model?: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: { type: string }
}

// Chat Completion 响应格式
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}