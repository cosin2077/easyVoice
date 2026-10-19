import path from 'path'
import { Readable, PassThrough } from 'stream'
import { AUDIO_DIR, SEGMENT_MAX_RETRIES, SEGMENT_RETRY_BASE_DELAY_MS } from '../config'
import { logger } from '../utils/logger'
import { getPrompt } from '../llm/prompt/generateSegment'
import { ensureDir, generateId, getLangConfig, safeRunWithRetry, streamToResponse } from '../utils'
import { preprocessTextForTts } from './textNormalize'
import { splitText } from './text.service'
import { generateSingleVoiceStream } from './edge-tts.service'
import { EdgeSchema } from '../schema/generate'
import audioCacheInstance from './audioCache.service'
import taskManager, { Task } from '../utils/taskManager'
import { buildSrtFromSegments, removeDirQuiet, segmentSubtitlePath } from './subtitle.service'

/** Set KEEP_TTS_TMP=true to keep per-segment subtitle json (debug / sync audits). */
const cleanupTmp = (dir: string) =>
  process.env.KEEP_TTS_TMP === 'true' ? Promise.resolve() : removeDirQuiet(dir)
import {
  CastSegment,
  defaultVoiceFor,
  ErrorMessages,
  fetchLLMSegment,
  formatLlmSegments,
  isEnglishVoiceMismatch,
  LlmConfig,
} from './tts.shared'

type StreamParams = Required<EdgeSchema> & { llm?: LlmConfig }

/**
 * 流式生成文本转语音 (TTS) 的音频和字幕
 */
export async function generateTTSStream(params: StreamParams, task: Task) {
  const res = task.context?.res
  try {
    const { pitch, voice, rate, volume, useLLM } = params
    const text = preprocessTextForTts(params.text)
    const segment: Segment = { id: generateId(useLLM ? 'aigen-' : voice, text), text }
    const { lang, voiceList } = await getLangConfig(segment.text)
    task.context!.segment = segment
    task.context!.lang = lang
    task.context!.voiceList = voiceList

    if (!useLLM && isEnglishVoiceMismatch(lang, voice, segment.text)) {
      res?.status(400).send({ code: 400, success: false, message: ErrorMessages.ENG_MODEL_INVALID_TEXT })
      task.endTask?.(task.id)
      return
    }

    const cacheKey = taskManager.generateTaskId({ text, pitch, voice, rate, volume })
    const cache = !useLLM ? await audioCacheInstance.getAudio(cacheKey) : null
    if (cache) {
      logger.info(`Cache hit: ${voice} ${text.slice(0, 10)}`)
      res?.setHeader('x-generate-tts-type', 'application/json')
      res?.setHeader('Access-Control-Expose-Headers', 'x-generate-tts-type')
      res?.json({
        code: 200,
        success: true,
        data: { ...cache, file: path.parse(cache.audio).base, srt: path.parse(cache.srt).base, text: '' },
      })
      task.endTask?.(task.id)
      return
    }

    const chunks = splitText(segment.text).segments
    if (useLLM) {
      const fallbackVoice = voice && voice.includes('-') ? voice : defaultVoiceFor(lang, text)
      const state: { warning?: string } = {}
      await streamSegments(
        task,
        castWithLLM(chunks, { lang, voiceList, fallbackVoice, llm: params.llm, task, state }),
        () => state.warning
      )
    } else {
      await streamSegments(task, fromList(chunks.map((t) => ({ text: t, voice, rate, pitch, volume }))))
    }
  } catch (err) {
    failStream(task, err as Error)
  }
}

/** /generateJson: caller supplies the exact segment list. */
export async function generateTTSStreamJson(formatedBody: Required<EdgeSchema>[], task: Task) {
  try {
    await streamSegments(
      task,
      fromList(formatedBody.map(({ text, voice, rate, pitch, volume }) => ({ text, voice, rate, pitch, volume })))
    )
  } catch (err) {
    failStream(task, err as Error)
  }
}

async function* fromList(list: CastSegment[]): AsyncGenerator<CastSegment> {
  for (const s of list) yield s
}

/**
 * Cast each text chunk with the LLM lazily (so audio for chunk 1 streams while chunk 2
 * is being cast). If the LLM fails for a chunk, read that chunk with the fallback voice
 * instead of aborting the whole stream.
 */
async function* castWithLLM(
  chunks: string[],
  opts: {
    lang: string
    voiceList: VoiceConfig[]
    fallbackVoice: string
    llm?: LlmConfig
    task: Task
    state: { warning?: string }
  }
): AsyncGenerator<CastSegment> {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    let cast: CastSegment[] = []
    try {
      const resp = await fetchLLMSegment(getPrompt(opts.lang, opts.voiceList, chunk), opts.llm)
      cast = formatLlmSegments(resp?.segments || [], {
        voiceList: opts.voiceList,
        fallbackVoice: opts.fallbackVoice,
      })
      logger.info(
        `LLM cast chunk ${i + 1}/${chunks.length}: ${cast.length} segments ` +
          JSON.stringify(cast.map((c) => [c.character || '-', c.voice, c.rate, c.pitch, c.text.slice(0, 24)]))
      )
    } catch (err) {
      logger.warn(`LLM casting failed for chunk ${i + 1}, fallback voice: ${(err as Error).message}`)
      opts.state.warning = 'ai-fallback'
    }
    if (!cast.length) {
      cast = [{ text: chunk, voice: opts.fallbackVoice, rate: '+0%', pitch: '+0Hz', volume: '+0%' }]
    }
    for (const s of cast) yield s
    opts.task.updateProgress?.(opts.task.id, Number((((i + 1) / chunks.length) * 100).toFixed(2)))
  }
}

/**
 * Single streaming engine for every stream path (plain / LLM / json).
 * Segments are synthesized sequentially and piped into one HTTP response + local mp3.
 * Each segment writes `<id>_tmp/seg-NNNN.json` containing word cues AND its frame-accurate
 * audio duration; the SRT is built from those in index order *before* the response ends,
 * so the client can fetch it as soon as the audio stream completes.
 */
async function streamSegments(
  task: Task,
  source: AsyncIterable<CastSegment>,
  getWarning?: () => string | undefined
): Promise<void> {
  const { res, segment } = task.context as Required<NonNullable<Task['context']>>
  // Pull the first segment before sending headers so a first-chunk AI fallback can be flagged.
  const iterator = source[Symbol.asyncIterator]()
  const first = await iterator.next()
  const rest: AsyncIterable<CastSegment> = {
    [Symbol.asyncIterator]: () => {
      let pendingFirst = !first.done
      return {
        next: () => {
          if (pendingFirst) {
            pendingFirst = false
            return Promise.resolve(first)
          }
          return iterator.next()
        },
      }
    },
  }
  const warning = getWarning?.()
  const output = path.resolve(AUDIO_DIR, segment.id)
  const tmpDir = output + '_tmp'
  await ensureDir(tmpDir)
  const outputStream = new PassThrough()
  let cancelled = false
  let current: Readable | null = null
  // settles as soon as the client goes away, so no await below can outlive the request
  let onCancel: () => void = () => {}
  const cancelledP = new Promise<void>((resolve) => (onCancel = resolve))

  streamToResponse(res, outputStream, {
    headers: {
      'content-type': 'application/octet-stream',
      'x-generate-tts-type': 'stream',
      'x-generate-tts-id': segment.id,
      ...(warning ? { 'x-generate-tts-warning': warning } : {}),
      'Access-Control-Expose-Headers': 'x-generate-tts-type, x-generate-tts-id, x-generate-tts-warning',
    },
    onError: (err) => `Custom error: ${err.message}`,
    fileName: segment.id,
    onEnd: () => {
      task.endTask?.(task.id)
      logger.info(`Streaming ${task.id} finished`)
    },
    onClose: () => {
      cancelled = true
      task.endTask?.(task.id)
      logger.info(`Streaming ${task.id} closed (client disconnect / cancel)`)
      current?.destroy()
      onCancel()
    },
  })

  const jsonPaths: string[] = []
  let index = 0
  try {
    for await (const seg of rest) {
      if (cancelled) break
      const subtitlePath = segmentSubtitlePath(tmpDir, index)
      const pending = safeRunWithRetry(
        () =>
          generateSingleVoiceStream({ ...seg, output, outputType: 'stream', subtitlePath }) as Promise<Readable>,
        {
          retries: SEGMENT_MAX_RETRIES,
          baseDelayMs: SEGMENT_RETRY_BASE_DELAY_MS,
          onError: (err, attempt) =>
            logger.warn(`Segment ${index + 1} failed (attempt ${attempt}/${SEGMENT_MAX_RETRIES}): ${(err as Error).message}`),
        }
      ) as Promise<Readable>
      const audio = await Promise.race([pending, cancelledP.then(() => null)])
      if (cancelled || !audio) {
        // cancelled while Edge was still connecting: drop that segment's stream when it arrives
        pending.then((a) => a?.destroy()).catch(() => {})
        break
      }
      current = audio
      await new Promise<void>((resolve, reject) => {
        audio.on('end', resolve)
        audio.on('error', (e) => (cancelled ? resolve() : reject(e)))
        audio.on('close', () => (cancelled ? resolve() : undefined))
        cancelledP.then(() => resolve())
        audio.pipe(outputStream, { end: false })
      })
      current = null
      if (cancelled) break
      jsonPaths.push(subtitlePath)
      logger.info(`Segment ${index + 1} streamed: ${seg.text.slice(0, 12)}…`)
      index++
    }
  } catch (err) {
    const error = err as Error
    logger.error(`Stream segment ${index + 1} failed: ${error.message}`)
    if (!cancelled) outputStream.emit('error', error)
    await cleanupTmp(tmpDir)
    return
  }

  if (cancelled) {
    logger.info(`Streaming ${task.id} cancelled after ${index} segment(s); skipping SRT`)
    await cleanupTmp(tmpDir)
    return
  }
  try {
    const srtPath = output.replace(/\.mp3$/, '.srt')
    const { durationMs, cues } = await buildSrtFromSegments(
      jsonPaths.map((json) => ({ json })),
      srtPath
    )
    logger.info(`SRT built: ${cues} cues, ${(durationMs / 1000).toFixed(2)}s over ${jsonPaths.length} segment(s)`)
  } catch (err) {
    logger.error(`SRT build failed: ${(err as Error).message}`)
  }
  await cleanupTmp(tmpDir)
  outputStream.end()
}

function failStream(task: Task, error: Error) {
  logger.error(`Stream task ${task.id} failed: ${error.message}`)
  const res = task.context?.res
  task.endTask?.(task.id)
  if (res && !res.headersSent) {
    res.status(500).json({ code: 500, success: false, message: error.message })
  } else if (res && !res.writableEnded) {
    res.end()
  }
}
