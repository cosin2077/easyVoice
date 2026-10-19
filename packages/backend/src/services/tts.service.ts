import path from 'path'
import fs from 'fs/promises'
import ffmpeg from 'fluent-ffmpeg'
import { AUDIO_DIR, STATIC_DOMAIN, EDGE_API_LIMIT, SEGMENT_MAX_RETRIES, SEGMENT_RETRY_BASE_DELAY_MS } from '../config'
import { logger } from '../utils/logger'
import { getPrompt } from '../llm/prompt/generateSegment'
import { ensureDir, generateId, getLangConfig, readJson, safeRunWithRetry } from '../utils'
import { parseLLMJsonContent, shouldRejectEnglishVoice } from '../utils/langGuard'
import { openai } from '../utils/openai'
import { splitText } from './text.service'
import { generateSingleVoice, generateSrt } from './edge-tts.service'
import { EdgeSchema } from '../schema/generate'
import { MapLimitController } from '../controllers/concurrency.controller'
import audioCacheInstance from './audioCache.service'
import { mergeSubtitleFiles, SubtitleFile, SubtitleFiles } from '../utils/subtitle'
import taskManager, { Task } from '../utils/taskManager'
import { handleSrt } from './tts.stream.service'
import { preprocessTextForTts } from './textNormalize'
import { normalizeLlmCasting } from '../llm/segmentSchema'

// 错误消息枚举
export enum ErrorMessages {
  ENG_MODEL_INVALID_TEXT = 'English model cannot process non-English text',
  API_FETCH_FAILED = 'Failed to fetch TTS parameters from API',
  INVALID_API_RESPONSE = 'Invalid API response: no TTS parameters returned',
  PARAMS_PARSE_FAILED = 'Failed to parse TTS parameters',
  INVALID_PARAMS_FORMAT = 'Invalid TTS parameters format',
  TTS_GENERATION_FAILED = 'TTS generation failed',
  INCOMPLETE_RESULT = 'Incomplete TTS result',
}

/**
 * 生成文本转语音 (TTS) 的音频和字幕
 */
export async function generateTTS(params: Required<EdgeSchema>, task?: Task): Promise<TTSResult> {
  const { pitch, voice, rate, volume, useLLM } = params
  const text = preprocessTextForTts(params.text)
  // 检查缓存
  const cacheKey = taskManager.generateTaskId({ text, pitch, voice, rate, volume })
  const cache = await audioCacheInstance.getAudio(cacheKey)
  if (cache) {
    logger.info(`Cache hit: ${voice} ${text.slice(0, 10)}`)
    return cache
  }

  const segment: Segment = { id: generateId(`${useLLM ? 'aigen-' : voice}`, text), text }
  const { lang, voiceList } = await getLangConfig(segment.text)
  logger.debug(`Language detected lang: `, lang)
  validateLangAndVoice(lang, voice, segment.text)

  let result: TTSResult
  if (useLLM) {
    try {
      result = await generateWithLLM(segment, voiceList, lang, task)
    } catch (err) {
      logger.warn(`LLM casting failed, falling back to Edge TTS: ${(err as Error).message}`)
      result = await generateWithoutLLM(
        segment,
        { text, pitch, voice, rate, volume },
        task
      )
    }
  } else {
    result = await generateWithoutLLM(
      segment,
      {
        text,
        pitch,
        voice,
        rate,
        volume,
        output: segment.id,
      },
      task
    )
  }

  // 验证结果并缓存
  validateTTSResult(result, segment.id)
  logger.info(`Generated audio succeed: `, result)
  if (result.partial) {
    logger.warn(`Partial result detected, some splits generated audio failed!`)
  } else {
    await audioCacheInstance.setAudio(cacheKey, { ...params, ...result })
  }
  return result
}

/**
 * 使用 LLM 生成 TTS
 */
async function generateWithLLM(
  segment: Segment,
  voiceList: VoiceConfig[],
  lang: string,
  task?: Task
): Promise<TTSResult> {
  const { text, id } = segment
  const { length, segments } = splitText(text.trim())
  const formatLlmSegments = (llmSegments: any) =>
    llmSegments
      .filter((segment: any) => segment.text && (segment.voice || segment.name))
      .map((segment: any) => ({
        text: segment.text,
        voice: segment.voice || segment.name,
        rate: segment.rate || '+0%',
        pitch: segment.pitch || '+0Hz',
        volume: segment.volume || '+0%',
      }))
  if (length <= 1) {
    const prompt = getPrompt(lang, voiceList, segments[0])
    // logger.debug(`Prompt for LLM: ${prompt}`)
    const llmResponse = await fetchLLMSegment(prompt)
    let llmSegments = llmResponse?.segments || []
    if (!Array.isArray(llmSegments)) {
      task?.endTask?.(task.id)
      throw new Error(
        'LLM response is not an array, please switch to Edge TTS mode or use another model'
      )
    }
    const result = await buildSegmentList(segment, formatLlmSegments(llmSegments), task)
    task?.updateProgress?.(task.id, 100)
    return result
  } else {
    logger.info('Splitting text into multiple segments:', segments.length)
    let finalSegments = []
    let count = 0
    const getProgress = () => {
      return Number(((count / segments.length) * 100).toFixed(2))
    }
    for (let seg of segments) {
      count++
      const prompt = getPrompt(lang, voiceList, seg)
      // logger.debug(`Prompt for LLM: ${prompt}`)
      const llmResponse = await fetchLLMSegment(prompt)
      let llmSegments = llmResponse?.segments || []
      if (!Array.isArray(llmSegments)) {
        throw new Error(
          'LLM response is not an array, please switch to Edge TTS mode or use another model'
        )
      }
      const result = await buildSegmentList(
        { ...segment, id: `[segments:${count}]${segment.id}` },
        formatLlmSegments(llmSegments)
      )
      task?.updateProgress?.(task.id, getProgress())
      finalSegments.push(result)
    }
    return await buildFinal(finalSegments, id)
  }
}
const buildFinal = async (finalSegments: TTSResult[], id: string) => {
  const subtitleFiles: SubtitleFiles = await Promise.all(
    finalSegments.map((file) => {
      const base = path.basename(file.audio)
      const jsonPath = path.resolve(AUDIO_DIR, base.replace('.mp3', ''), 'all_splits.mp3.json')
      return readJson<SubtitleFile>(jsonPath)
    })
  )

  const mergedJson = mergeSubtitleFiles(subtitleFiles)
  const finalDir = path.resolve(AUDIO_DIR, id.replace('.mp3', ''))
  await ensureDir(finalDir)
  const finalJson = path.resolve(finalDir, '[merged]all_splits.mp3.json')
  await fs.writeFile(finalJson, JSON.stringify(mergedJson, null, 2))
  await generateSrt(finalJson, path.resolve(AUDIO_DIR, id.replace('.mp3', '.srt')))
  const fileList = finalSegments.map((segment) =>
    path.resolve(AUDIO_DIR, path.parse(segment.audio).base)
  )
  const outputFile = path.resolve(AUDIO_DIR, id)
  await concatDirAudio({ inputDir: finalDir, fileList, outputFile })
  return {
    audio: `${STATIC_DOMAIN}/${id}`,
    srt: `${STATIC_DOMAIN}/${id.replace('.mp3', '.srt')}`,
  }
}
/**
 * 不使用 LLM 生成 TTS
 */
async function generateWithoutLLM(
  segment: Segment,
  params: TTSParams,
  task?: Task
): Promise<TTSResult> {
  const { text, pitch, voice, rate, volume } = params
  const { length, segments } = splitText(text)

  if (length <= 1) {
    return buildSegment(segment, params)
  } else {
    const buildSegments = segments.map((segment) => ({ ...params, text: segment }))
    let result = await buildSegmentList(segment, buildSegments, task)
    task?.updateProgress?.(task.id, 100)
    return result
  }
}

/**
 * 生成单个片段的音频和字幕
 */
async function buildSegment(
  segment: Segment,
  params: TTSParams,
  dir: string = ''
): Promise<TTSResult> {
  const { id, text } = segment
  const { pitch, voice, rate, volume } = params
  const output = path.resolve(AUDIO_DIR, dir, id)
  const result = await safeRunWithRetry(
    () =>
      generateSingleVoice({
        text,
        pitch,
        voice,
        rate,
        volume,
        output,
      }),
    {
      retries: SEGMENT_MAX_RETRIES,
      baseDelayMs: SEGMENT_RETRY_BASE_DELAY_MS,
      onError: (err, attempt) =>
        logger.warn(
          `buildSegment failed (attempt ${attempt}/${SEGMENT_MAX_RETRIES}): ${(err as Error).message}`
        ),
    }
  )
  logger.info('Generated single segment:', result)
  setTimeout(() => {
    handleSrt(output, false)
  }, 200)
  return {
    audio: `${STATIC_DOMAIN}/${path.join(dir, id)}`,
    srt: `${STATIC_DOMAIN}/${path.join(dir, id.replace('.mp3', '.srt'))}`,
  }
}

/**
 * 生成多个片段并合并的 TTS
 */
async function buildSegmentList(
  segment: Segment,
  segments: BuildSegment[],
  task?: Task
): Promise<TTSResult> {
  const fileList: string[] = []
  const length = segments.length
  let handledLength = 0

  if (!length) {
    throw new Error(`No segments found for task ${task?.id || 'unknown'}!`)
  }
  const { id } = segment
  const tmpDirName = id.replace('.mp3', '')
  const tmpDirPath = path.resolve(AUDIO_DIR, tmpDirName)
  await ensureDir(tmpDirPath)
  await fs.writeFile(
    path.resolve(tmpDirPath, 'ai-segments.json'),
    JSON.stringify(segments, null, 2)
  )
  const getProgress = () => {
    return Number((((handledLength / length) * 100) / (id.includes('segment') ? 2 : 1)).toFixed(2))
  }
  const tasks = segments.map((segment, index) => async () => {
    const { text, pitch, voice, rate, volume } = segment
    const output = path.resolve(tmpDirPath, `${index + 1}_splits.mp3`)
    const cacheKey = taskManager.generateTaskId({ text, pitch, voice, rate, volume })
    const cache = await audioCacheInstance.getAudio(cacheKey)
    if (cache) {
      logger.info(`Cache hit[segments]: ${voice} ${text.slice(0, 10)}`)
      fileList.push(cache.audio)
      return cache
    }
    const result = await safeRunWithRetry(
      () => generateSingleVoice({ text, pitch, voice, rate, volume, output }),
      {
        retries: SEGMENT_MAX_RETRIES,
        baseDelayMs: SEGMENT_RETRY_BASE_DELAY_MS,
        onError: (err, attempt) =>
          logger.warn(
            `Segment ${index + 1} failed (attempt ${attempt}/${SEGMENT_MAX_RETRIES}): ${(err as Error).message}`
          ),
      }
    )
    logger.debug(`Cache miss and generate audio: ${result.audio}, ${result.srt}`)
    fileList.push(result.audio)
    handledLength++
    task?.updateProgress?.(task.id, getProgress())
    const params = { text, pitch, voice, rate, volume }
    await audioCacheInstance.setAudio(cacheKey, { ...params, ...result })
    return result
  })
  let partial = false
  const results = await runConcurrentTasks(tasks, EDGE_API_LIMIT)
  if (results?.some((result) => !result.success)) {
    logger.warn(`Partial result detected, some splits generated audio failed!`, results)
    partial = true
  }
  const outputFile = path.resolve(AUDIO_DIR, id)
  logger.debug(`Concatenating audio files from ${tmpDirPath} to ${outputFile}`)
  await concatDirAudio({ inputDir: tmpDirPath, fileList, outputFile })
  await concatDirSrt({ inputDir: tmpDirPath, fileList, outputFile })
  logger.debug(
    `Concatenating SRT files from ${tmpDirPath} to ${outputFile.replace('.mp3', '.srt')}`
  )

  return {
    audio: `${STATIC_DOMAIN}/${id}`,
    srt: `${STATIC_DOMAIN}/${id.replace('.mp3', '.srt')}`,
    partial,
  }
}

/**
 * 并发执行任务
 */
async function runConcurrentTasks(tasks: (() => Promise<any>)[], limit: number): Promise<any[]> {
  logger.debug(`Running ${tasks.length} tasks with a limit of ${limit}`)
  const controller = new MapLimitController(tasks, limit, () =>
    logger.info('All concurrent tasks completed')
  )
  const { results, cancelled } = await controller.run()
  logger.info(`Tasks completed: ${results.length}, cancelled: ${cancelled}`)
  logger.debug(`Task results:`, results)
  return results
}

/**
 * 验证语言和语音参数
 */
function validateLangAndVoice(lang: string, voice: string, text: string): void {
  if (shouldRejectEnglishVoice(lang, voice, text)) {
    throw new Error(ErrorMessages.ENG_MODEL_INVALID_TEXT)
  }
}

/**
 * 从 LLM 获取分段参数
 */
async function fetchLLMSegment(prompt: string): Promise<any> {
  const response = await openai.createChatCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. And you can return valid json object',
      },
      { role: 'user', content: prompt },
    ],
    // temperature: 0.7,
    // max_tokens: 500,
    response_format: { type: 'json_object' },
  })

  if (!response.choices[0].message.content) {
    throw new Error(ErrorMessages.INVALID_API_RESPONSE)
  }
  return parseLLMResponse(response)
}

/**
 * 解析 LLM 响应
 */
function parseLLMResponse(response: any): any {
  const raw = response.choices[0].message.content
  try {
    const parsed = parseLLMJsonContent(raw)
    return normalizeLlmCasting(parsed)
  } catch {
    throw new Error(ErrorMessages.INVALID_PARAMS_FORMAT)
  }
}

/**
 * 验证 TTS 结果
 */
function validateTTSResult(result: TTSResult, segmentId: string): void {
  if (!result.audio) {
    throw new Error(`${ErrorMessages.INCOMPLETE_RESULT} for segment ${segmentId}`)
  }
}

/**
 * 拼接音频文件
 */
export async function concatDirAudio({
  fileList,
  outputFile,
  inputDir,
}: ConcatAudioParams): Promise<void> {
  const mp3Files = sortAudioDir(fileList, '.mp3')
  if (!mp3Files.length) throw new Error('No MP3 files found in input directory')

  const tempListPath = path.resolve(inputDir, 'file_list.txt')
  await fs.writeFile(tempListPath, mp3Files.map((file) => `file '${file}'`).join('\n'))

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(tempListPath)
      .inputFormat('concat')
      .inputOption('-safe', '0')
      .audioCodec('copy')
      .output(outputFile)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Concat failed: ${err.message}`)))
      .run()
  })
}

/**
 * 拼接字幕文件
 */
export async function concatDirSrt({
  fileList,
  outputFile,
  inputDir,
}: ConcatAudioParams): Promise<void> {
  const jsonFiles = sortAudioDir(
    fileList.map((file) => `${file}.json`),
    '.json'
  )
  if (!jsonFiles.length) throw new Error('No JSON files found for subtitles')

  const subtitleFiles: SubtitleFiles = await Promise.all(
    jsonFiles.map((file) => readJson<SubtitleFile>(file))
  )
  const mergedJson = mergeSubtitleFiles(subtitleFiles)
  const tempJsonPath = path.resolve(inputDir, 'all_splits.mp3.json')
  await fs.writeFile(tempJsonPath, JSON.stringify(mergedJson, null, 2))
  await generateSrt(tempJsonPath, outputFile.replace('.mp3', '.srt'))
}

/**
 * 按文件名排序音频文件
 */
function sortAudioDir(fileList: string[], ext: string = '.mp3'): string[] {
  return fileList
    .filter((file) => path.extname(file).toLowerCase() === ext)
    .sort(
      (a, b) => Number(path.parse(a).name.split('_')[0]) - Number(path.parse(b).name.split('_')[0])
    )
}

export interface ConcatAudioParams {
  fileList: string[]
  outputFile: string
  inputDir: string
}
