import path from 'path'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import taskManager from '../utils/taskManager'
import { EdgeSchema } from '../schema/generate'
import { generateTTSStream, generateTTSStreamJson } from '../services/tts.stream.service'
import { generateId, streamWithLimit } from '../utils'
function formatBody({ text, pitch, voice, volume, rate, useLLM }: EdgeSchema) {
  const positivePercent = (value: string | undefined) => {
    if (value === '0%' || value === '0' || value === undefined || value === '') return '+0%'
    return value
  }
  const positiveHz = (value: string | undefined) => {
    if (value === '0Hz' || value === '0' || value === undefined || value === '') return '+0Hz'
    return value
  }
  return {
    text: text.trim(),
    pitch: positiveHz(pitch),
    voice: positivePercent(voice),
    rate: positivePercent(rate),
    volume: positivePercent(volume),
    useLLM,
  }
}
/**
 * @description 流式返回音频, 支持长文本
 * @param req
 * @param res
 * @param next
 * @returns ReadableStream
 */
export async function createTaskStream(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query?.mock) {
      logger.info('Mocking audio stream...')
      streamWithLimit(res, path.join(__dirname, '../../mock/flying.mp3'), 1280) // Mock stream with limit
      return
    }
    logger.debug('Generating audio request:', {
      textLength: typeof req.body?.text === 'string' ? req.body.text.length : 0,
      useLLM: Boolean(req.body?.useLLM),
    })
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    task.context = { req, res, body: req.body }
    logger.info(`Generated stream task ID: ${task.id}`)
    generateTTSStream(formattedBody, task)
  } catch (error) {
    console.log(`createTaskStream error:`, error)
    next(error)
  }
}
export async function generateJson(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body?.data
    logger.debug('Generating JSON audio request:', {
      segments: Array.isArray(data) ? data.length : 0,
      textLength: Array.isArray(data)
        ? data.reduce((total: number, item: any) => total + (item.text?.length ?? 0), 0)
        : 0,
    })
    const formatedBody = data.map((item: any) => formatBody(item))
    const text = data.map((item: any) => item.text).join('')
    const taskParams = {
      ...formatedBody[0],
      text,
    }
    const task = taskManager.createTask(taskParams)
    const voice = formatedBody[0].voice

    const segment: Segment = { id: generateId(voice, text), text }
    task.context = { req, res, segment, body: req.body }
    logger.info(`Generated stream task ID: ${task.id}`)
    generateTTSStreamJson(formatedBody, task)
  } catch (error) {
    console.log(`createTaskStream error:`, error)
    next(error)
  }
}
