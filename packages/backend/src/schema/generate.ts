import { config, DIRECT_GEN_LIMIT, LIMIT_TEXT_LENGTH, LIMIT_TEXT_LENGTH_ERROR_MESSAGE } from './../config/index'
import { NextFunction, Response, Request } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { openai } from '../utils/openai'

export const edgeSchema = z.object({
  text: z.string().trim().min(5, { message: '文本最少 5 字符！' }),
  voice: z.string().min(1),
  pitch: z.string().optional(),
  volume: z.string().optional(),
  rate: z.string().optional(),
  useLLM: z.boolean().default(false),
})

export const llmSchema = z.object({
  text: z.string().trim().min(5, { message: '文本最少 5 字符！' }),
  openaiBaseUrl: z.preprocess(
    (val) => val ?? '',
    z.string().trim().url({ message: '请输入有效的 OpenAI API URL！' })
  ),
  openaiKey: z.preprocess(
    (val) => val ?? '',
    z.string().trim().min(1, { message: '请在环境变量设置或前端传入 openaiKey！' })
  ),
  openaiModel: z.preprocess(
    (val) => val ?? '',
    z.string().trim().min(1, { message: '请在环境变量设置或前端传入 openaiModel 模型名称！' })
  ),
  useLLM: z.boolean().default(true),
})

const dataItemSchema = z.object({
  text: z.string().min(1, '文本内容不能为空'),
  voice: z.string().min(1, '语音类型不能为空'),
  rate: z.string().default(''),
  pitch: z.string().default(''),
  volume: z.string().default(''),
})

const jsonSchema = z.object({
  data: z.array(dataItemSchema).min(1, '数据数组不能为空'),
})

// 导出类型（可选）
export type DataItem = z.infer<typeof dataItemSchema>
export type JsonSchema = z.infer<typeof jsonSchema>

export type LlmSchema = z.infer<typeof llmSchema>

export type EdgeSchema = z.infer<typeof edgeSchema>

const commonValidate = (req: Request, res: Response, next: NextFunction, schema: z.ZodTypeAny) => {
  try {
    schema.parse(req.body)
    openai.config({
      apiKey: req.body.openaiKey,
      baseURL: req.body.openaiBaseUrl,
      model: req.body.openaiModel,
    })
    if (LIMIT_TEXT_LENGTH) {
      const allTxt = req.body.text
      if (allTxt?.length > LIMIT_TEXT_LENGTH) {
        res.status(400).json({
          code: 400,
          message:
            LIMIT_TEXT_LENGTH_ERROR_MESSAGE || `文本内容不能超出 ${LIMIT_TEXT_LENGTH} 字符哦！`,
          success: false,
        })
        return
      }
    }
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ code: 400, errors: error.errors, success: false })
      return
    }
    res.status(500).json({ code: 500, message: 'Internal server error' })
    return
  }
}

export const validateEdge = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body
  const isGenerate = req.url.includes('/generate')
  logger.info('validateEdge', { fields: Object.keys(body ?? {}), path: req.path })
  if (isGenerate && body.text?.length > DIRECT_GEN_LIMIT) {
    res.status(400).json({
      code: 400,
      errors: [{ message: `文本长度不能超过 ${DIRECT_GEN_LIMIT} 个字符，长文本请用流式接口`, path: ['text'] }],
      success: false,
    })
    return
  }
  commonValidate(req, res, next, edgeSchema)
}
export const validateLLM = (req: Request, res: Response, next: NextFunction) => {
  const { useLLM, text } = req.body
  const isGenerate = req.url.includes('/generate')
  logger.info('validateLLM', { useLLM, path: req.path })
  if (isGenerate && useLLM && text?.length > DIRECT_GEN_LIMIT) {
    res.status(400).json({
      code: 400,
      errors: [{ message: `文本长度不能超过 ${DIRECT_GEN_LIMIT} 个字符，长文本请用流式接口`, path: ['text'] }],
      success: false,
    })
    return
  }
  // read from env if not provided in request body
  const { OPENAI_BASE_URL, OPENAI_API_KEY, MODEL_NAME } = process.env
  if (!req.body?.openaiBaseUrl && OPENAI_BASE_URL) {
    req.body.openaiBaseUrl = OPENAI_BASE_URL
  }
  if (!req.body?.openaiKey && OPENAI_API_KEY) {
    req.body.openaiKey = OPENAI_API_KEY
  }
  if (!req.body?.openaiModel && MODEL_NAME) {
    req.body.openaiModel = MODEL_NAME
  }
  commonValidate(req, res, next, llmSchema)
}
export const validateJson = (req: Request, res: Response, next: NextFunction) => {
  try {
    jsonSchema.parse(req.body)
    if (LIMIT_TEXT_LENGTH) {
      const allTxt = req.body.data.map((item: any) => item.text).join('')
      if (allTxt?.length > LIMIT_TEXT_LENGTH) {
        res.status(400).json({
          code: 400,
          message:
            LIMIT_TEXT_LENGTH_ERROR_MESSAGE || `文本内容不能超出 ${LIMIT_TEXT_LENGTH} 字符哦！`,
          success: false,
        })
        return
      }
    }
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ code: 400, errors: error.errors, success: false })
      return
    }
    res.status(500).json({ code: 500, message: 'Internal server error' })
    return
  }
}
