import { Request, Response, NextFunction } from 'express'
import { generateTTS } from '../services/tts.service'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs/promises'
import { ALLOWED_EXTENSIONS, AUDIO_DIR } from '../config'
import { EdgeSchema } from '../schema/generate'
import taskManager from '../utils/taskManager'
function formatBody({ text, pitch, voice, volume, rate, useLLM }: EdgeSchema) {
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

    generateTTS(formattedBody, task)
      .then((result) => {
        const data = {
          ...result,
          file: path.parse(result.audio).base,
          srt: path.parse(result.srt).base,
        }
        taskManager.updateTask(task.id, { result: data })
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
      data: { ...task },
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
    const data = {
      success: true,
      data: { ...task },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function getTaskStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = taskManager.getTaskStats()
    logger.debug('stats:', stats)
    if (!stats) {
      res.status(404).json({ success: false, message: 'stats not found', code: 404 })
      return
    }
    const data = {
      success: true,
      data: { ...stats },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    let result = await generateTTS(formattedBody)
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
    const filePath = path.resolve(AUDIO_DIR, safeFileName)
    const audioRoot = path.resolve(AUDIO_DIR)
    if (filePath !== audioRoot && !filePath.startsWith(audioRoot + path.sep)) {
      throw new Error('Invalid file name')
    }

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

function normalizeVoiceEntry(v: any) {
  const toArr = (x: unknown) =>
    Array.isArray(x) ? x : typeof x === 'string' ? x.split(',').map((s) => s.trim()).filter(Boolean) : []
  return {
    ...v,
    ContentCategories: toArr(v.ContentCategories),
    VoicePersonalities: toArr(v.VoicePersonalities),
  }
}

export async function getVoiceList(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Fetching voice list...')
    // Full Edge voice catalog (all locales). voice.json is a zh/en subset kept for LLM prompts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const raw = require('../llm/prompt/voiceList.json') as any[]
    const voices = Array.isArray(raw) ? raw.map(normalizeVoiceEntry) : []
    res.json({
      code: 200,
      data: voices,
      success: true,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`getVoiceList Error: ${errorMessage}`)
    res.status(500).json({
      code: 500,
      message: errorMessage,
      success: false,
    })
  }
}
