import { Request, Response, NextFunction } from 'express'
import { generateTTS } from '../services/tts.service'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs/promises'
import { ALLOWED_EXTENSIONS, AUDIO_DIR } from '../config'
import { Generate } from '../schema/generate'
import taskManager from '../controllers/taskManager'
function formatBody({ text, pitch, voice, volume, rate, useLLM }: Generate) {
  const positivePercent = (value: string | undefined) => {
    if (value === '0%' || value === '0' || value === undefined) return '+0%'
    return value
  }
  const positiveHz = (value: string | undefined) => {
    if (value === '0Hz' || value === '0' || value === undefined) return '+0Hz'
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
export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    logger.info(`Generated task ID: ${task.id}`)

    generateTTS(formattedBody)
      .then((result) => {
        const data = {
          ...result,
          file: path.parse(result.audio).base,
          srt: path.parse(result.srt).base,
        }
        taskManager.updateTask(task.id, data)
        logger.info(`Updated task ID: ${task.id} with result`, result)
      })
      .catch((err) => {
        const data = {
          message: (err as Error).message,
        }
        taskManager.failTask(task.id, data)
      })
    const data = {
      success: true,
      data: { task },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function getTask(req: Request, res: Response, next: NextFunction) {
  const taskId = req.params.id
  try {
    const task = taskManager.getTask(taskId)
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found', code: 404 })
      return
    }
    const responseResult = {
      success: true,
      data: { task },
      code: 200,
    }
    res.json(responseResult)
  } catch (error) {
    next(error)
  }
}
export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const result = await generateTTS(formattedBody)
    const responseResult = {
      success: true,
      data: {
        ...result,
        file: path.parse(result.audio).base,
        srt: path.parse(result.srt).base,
      },
      code: 200,
    }
    res.json(responseResult)
  } catch (error) {
    next(error)
  }
}

export async function downloadAudio(req: Request, res: Response): Promise<void> {
  const fileName = req.params.file

  try {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid file name')
    }

    const fileExt = path.extname(fileName).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw new Error('Invalid file type')
    }

    const safeFileName = path.basename(fileName)
    const encodedFileName = encodeURIComponent(safeFileName)
    const filePath = path.join(AUDIO_DIR, safeFileName)

    await fs.access(filePath, fs.constants.R_OK)

    res.setHeader('Content-Type', `audio/${fileExt.slice(1)}`)
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`)

    res.download(filePath, safeFileName, (err) => {
      if (err) {
        throw err
      }
      logger.info(`Successfully downloaded file: ${safeFileName}`)
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Download failed for ${fileName}: ${errorMessage}`)

    const statusCode = errorMessage.includes('Invalid')
      ? 400
      : errorMessage.includes('ENOENT')
      ? 404
      : 500

    res.status(statusCode).json({
      error: 'Failed to download file',
      message: errorMessage,
    })
  }
}

export async function getVoiceList(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Fetching voice list...')
    const voices = require('../llm/prompt/voice.json')
    res.json({
      data: voices,
      success: true,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`getVoiceList Error: ${errorMessage}`)
    res.status(500).json({
      msg: errorMessage,
      success: false,
    })
  }
}
