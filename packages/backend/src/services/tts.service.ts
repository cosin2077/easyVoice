import path from 'path'
import fs from 'fs/promises'
import {
  AUDIO_DIR,
  STATIC_DOMAIN,
  EDGE_API_LIMIT,
  SEGMENT_MAX_RETRIES,
  SEGMENT_RETRY_BASE_DELAY_MS,
} from '../config'
import { logger } from '../utils/logger'
import { getPrompt } from '../llm/prompt/generateSegment'
import { ensureDir, generateId, getLangConfig, safeRunWithRetry } from '../utils'
import { generateSingleVoice, generateSrt } from './edge-tts.service'
import { EdgeSchema } from '../schema/generate'
import audioCacheInstance from './audioCache.service'
import taskManager, { Task } from '../utils/taskManager'
import { planSpeech, preprocessTextForTts } from './textNormalize'
import { silentMp3 } from '../utils/mp3'
import { toSegmentDoc } from '../utils/subtitle'
import { buildSrtFromSegments, concatAudioFiles } from './subtitle.service'
import {
  CastSegment,
  defaultVoiceFor,
  ErrorMessages,
  fetchLLMSegment,
  formatLlmSegments,
  isEnglishVoiceMismatch,
  LlmConfig,
  runConcurrentTasks,
  unitsToCast,
} from './tts.shared'

export { ErrorMessages }

type TaskParams = Required<EdgeSchema> & { llm?: LlmConfig }

/**
 * 生成文本转语音 (TTS) 的音频和字幕（非流式：/generate 与 /create）
 */
export async function generateTTS(params: TaskParams, task?: Task): Promise<TTSResult> {
  const { pitch, voice, rate, volume, useLLM } = params
  // `text` keeps pause markers (cache identity); `spoken` is it without markers
  const text = params.text
  const spoken = preprocessTextForTts(text)
  const cacheKey = taskManager.generateTaskId({ text, pitch, voice, rate, volume })
  if (!useLLM) {
    const cache = await audioCacheInstance.getAudio(cacheKey)
    if (cache) {
      logger.info(`Cache hit: ${voice} ${text.slice(0, 10)}`)
      return cache
    }
  }

  const segment: Segment = { id: generateId(`${useLLM ? 'aigen-' : voice}`, spoken), text: spoken }
  const { lang, voiceList } = await getLangConfig(segment.text)
  if (!useLLM && isEnglishVoiceMismatch(lang, voice, segment.text)) {
    throw new Error(ErrorMessages.ENG_MODEL_INVALID_TEXT)
  }

  const units = planSpeech(text)
  let cast: CastSegment[]
  let warning: string | undefined
  if (useLLM) {
    const fallbackVoice = voice && voice.includes('-') ? voice : defaultVoiceFor(lang, spoken)
    cast = []
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      if (unit.type === 'break') {
        cast.push({ text: '', voice: fallbackVoice, rate, pitch, volume, silenceMs: unit.ms })
        continue
      }
      try {
        const resp = await fetchLLMSegment(getPrompt(lang, voiceList, unit.text), params.llm)
        const list = formatLlmSegments(resp?.segments || [], { voiceList, fallbackVoice })
        if (!list.length) throw new Error('empty casting')
        cast.push(...list)
      } catch (err) {
        logger.warn(`LLM casting failed for chunk ${i + 1}, fallback voice: ${(err as Error).message}`)
        warning = `AI 分角失败，已用默认音色朗读（${(err as Error).message.replace(/^Chat completion request failed: /, '')}）`
        cast.push({ text: unit.text, voice: fallbackVoice, rate, pitch, volume })
      }
      task?.updateProgress?.(task.id, Number((((i + 1) / units.length) * 50).toFixed(2)))
    }
  } else {
    cast = unitsToCast(units, { voice, rate, pitch, volume })
  }
  if (!cast.length) throw new Error('Nothing to synthesize')

  const result =
    cast.length === 1 && !useLLM && !cast[0].silenceMs
      ? await buildSegment(segment, cast[0])
      : await buildSegmentList(segment, cast, task, useLLM ? 50 : 0)
  task?.updateProgress?.(task.id, 100)
  if (warning) result.warning = warning

  if (!result.audio) throw new Error(`${ErrorMessages.INCOMPLETE_RESULT} for segment ${segment.id}`)
  if (result.partial) {
    logger.warn(`Partial result detected, some splits generated audio failed!`)
  } else if (!useLLM) {
    await audioCacheInstance.setAudio(cacheKey, { ...params, llm: undefined, ...result } as any)
  }
  return result
}

/** 单段：直接生成到最终文件，并在返回前写好 SRT（此前是 200ms 定时器，存在竞态）。 */
async function buildSegment(segment: Segment, params: CastSegment): Promise<TTSResult> {
  const output = path.resolve(AUDIO_DIR, segment.id)
  await safeRunWithRetry(() => generateSingleVoice({ ...params, output }), {
    retries: SEGMENT_MAX_RETRIES,
    baseDelayMs: SEGMENT_RETRY_BASE_DELAY_MS,
    onError: (err, attempt) =>
      logger.warn(`buildSegment failed (attempt ${attempt}/${SEGMENT_MAX_RETRIES}): ${(err as Error).message}`),
  })
  await generateSrt(`${output}.json`, output.replace(/\.mp3$/, '.srt'))
  return {
    audio: `${STATIC_DOMAIN}/${segment.id}`,
    srt: `${STATIC_DOMAIN}/${segment.id.replace(/\.mp3$/, '.srt')}`,
  }
}

/**
 * 多段：并发生成，按 *段索引* 而不是完成顺序/文件名 拼接音频与字幕。
 * （旧实现把缓存命中的其他任务文件名混入 fileList 后按 `N_splits` 排序，顺序会错。）
 */
async function buildSegmentList(
  segment: Segment,
  segments: CastSegment[],
  task?: Task,
  progressBase = 0
): Promise<TTSResult> {
  if (!segments.length) throw new Error(`No segments found for task ${task?.id || 'unknown'}!`)
  const { id } = segment
  const tmpDirPath = path.resolve(AUDIO_DIR, id.replace(/\.mp3$/, ''))
  await ensureDir(tmpDirPath)
  await fs.writeFile(path.resolve(tmpDirPath, 'segments.json'), JSON.stringify(segments, null, 2))
  let done = 0
  const span = 100 - progressBase

  const tasks = segments.map((seg, index) => async () => {
    const { text, pitch, voice, rate, volume } = seg
    if (seg.silenceMs) {
      const output = path.resolve(tmpDirPath, `${index + 1}_splits.mp3`)
      const { buffer, durationMs } = silentMp3(seg.silenceMs)
      await fs.writeFile(output, buffer)
      await fs.writeFile(`${output}.json`, JSON.stringify(toSegmentDoc([], durationMs)))
      done++
      return output
    }
    const cacheKey = taskManager.generateTaskId({ text, pitch, voice, rate, volume })
    const cache = await audioCacheInstance.getAudio(cacheKey)
    let audio: string
    if (cache?.audio && (await exists(cache.audio)) && (await exists(`${cache.audio}.json`))) {
      logger.info(`Cache hit[segments]: ${voice} ${text.slice(0, 10)}`)
      audio = cache.audio
    } else {
      const output = path.resolve(tmpDirPath, `${index + 1}_splits.mp3`)
      await safeRunWithRetry(() => generateSingleVoice({ text, pitch, voice, rate, volume, output }), {
        retries: SEGMENT_MAX_RETRIES,
        baseDelayMs: SEGMENT_RETRY_BASE_DELAY_MS,
        onError: (err, attempt) =>
          logger.warn(`Segment ${index + 1} failed (attempt ${attempt}/${SEGMENT_MAX_RETRIES}): ${(err as Error).message}`),
      })
      audio = output
      await audioCacheInstance.setAudio(cacheKey, {
        text, pitch, voice, rate, volume, audio: output, srt: output.replace(/\.mp3$/, '.srt'),
      } as any)
    }
    done++
    task?.updateProgress?.(task.id, Number((progressBase + (done / segments.length) * span).toFixed(2)))
    return audio
  })

  const results = await runConcurrentTasks(tasks, EDGE_API_LIMIT)
  const ordered: string[] = []
  let partial = false
  segments.forEach((_, i) => {
    const r: any = (results as any[])[i]
    if (r?.success && r.value) ordered.push(r.value)
    else partial = true
  })
  if (!ordered.length) throw new Error(ErrorMessages.TTS_GENERATION_FAILED)
  if (partial) logger.warn(`Partial result: ${segments.length - ordered.length} segment(s) failed`)

  const outputFile = path.resolve(AUDIO_DIR, id)
  await concatAudioFiles(ordered, outputFile, tmpDirPath)
  await buildSrtFromSegments(
    ordered.map((audio) => ({ audio, json: `${audio}.json` })),
    outputFile.replace(/\.mp3$/, '.srt'),
    path.resolve(tmpDirPath, 'all_splits.mp3.json')
  )
  return {
    audio: `${STATIC_DOMAIN}/${id}`,
    srt: `${STATIC_DOMAIN}/${id.replace(/\.mp3$/, '.srt')}`,
    partial,
  }
}

async function exists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
