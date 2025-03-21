import { runEdgeTTS } from '../utils/spawn'
import { AUDIO_DIR, STATIC_DOMAIN } from '../config'
import { logger } from '../utils/logger'
import { genSegment } from '../llm/prompt/generateSegment'
import { ensureDir, generateId, getLangConfig, readJson } from '../utils'
import { openai } from '../utils/openai'
import { splitText } from './text.service'
import { generateSingleVoice, generateSrt } from './edge-tts.service'
import { Generate } from '../schema/generate'
import path from 'path'
import fs from 'fs/promises'
import ffmpeg from 'fluent-ffmpeg'
import { MapLimitController } from '../controllers/concurrency.controller'
import audioCacheInstance from './audioCache.service'
import { mergeSubtitleFiles, SubtitleFile, SubtitleFiles } from '../utils/subtitle'

// 错误消息枚举
enum ErrorMessages {
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
export async function generateTTS(params: Required<Generate>): Promise<TTSResult> {
  const { text, pitch, voice, rate, volume, useLLM } = params

  // 检查缓存
  const cache = await getCache(voice, text)
  if (cache) {
    logger.info(`Cache hit: ${voice} ${text.slice(0, 10)}`)
    return cache
  }

  const segment: Segment = { id: generateId(voice, text), text }
  const { lang, voiceList } = await getLangConfig(segment.text)
  validateLangAndVoice(lang, voice)

  let result: TTSResult
  if (useLLM) {
    result = await generateWithLLM(segment, voiceList, lang)
  } else {
    result = await generateWithoutLLM(segment, {
      text,
      pitch,
      voice,
      rate,
      volume,
      output: segment.id,
    })
  }

  // 验证结果并缓存
  validateTTSResult(result, segment.id)
  await audioCacheInstance.setAudio(`${voice}_${text}`, { ...params, ...result })
  logger.info(`Generated TTS for segment ${segment.id}`)
  return result
}

/**
 * 从缓存中获取 TTS 结果
 */
async function getCache(voice: string, text: string): Promise<TTSResult | null> {
  try {
    const cache = await audioCacheInstance.getAudio(`${voice}_${text}`)
    return cache && cache.audio ? { audio: cache.audio, srt: cache.srt } : null
  } catch (error) {
    logger.warn(`Cache retrieval failed: ${error}`)
    return null
  }
}

/**
 * 使用 LLM 生成 TTS
 */
async function generateWithLLM(
  segment: Segment,
  voiceList: VoiceConfig[],
  lang: string
): Promise<TTSResult> {
  const prompt = genSegment(lang, voiceList, segment.text)
  const llmResponse = await fetchLLMSegment(prompt)
  // TODO: not works now.
  return runEdgeTTS({ ...(llmResponse as any), text: segment.text.trim() })
}

/**
 * 不使用 LLM 生成 TTS
 */
async function generateWithoutLLM(segment: Segment, params: TTSParams): Promise<TTSResult> {
  const { text, pitch, voice, rate, volume } = params
  const { length, segments } = splitText(text)

  if (length <= 1) {
    return generateSingleSegment(segment, params)
  } else {
    return generateMultipleSegments(segment, segments, params)
  }
}

/**
 * 生成单个片段的 TTS
 */
async function generateSingleSegment(segment: Segment, params: TTSParams): Promise<TTSResult> {
  const { pitch, voice, rate, volume } = params
  const output = path.resolve(AUDIO_DIR, segment.id)
  const result = await generateSingleVoice({
    text: segment.text,
    pitch,
    voice,
    rate,
    volume,
    output,
  })
  const jsonPath = `${output}.json`
  const srtPath = output.replace('.mp3', '.srt')
  await generateSrt(jsonPath, srtPath)
  return {
    audio: `${STATIC_DOMAIN}/${segment.id}`,
    srt: `${STATIC_DOMAIN}/${segment.id.replace('.mp3', '.srt')}`,
  }
}

/**
 * 生成多个片段并合并的 TTS
 */
async function generateMultipleSegments(
  segment: Segment,
  segments: string[],
  params: TTSParams
): Promise<TTSResult> {
  const { pitch, voice, rate, volume } = params
  const tmpDirName = segment.id.replace('.mp3', '')
  const tmpDirPath = path.resolve(AUDIO_DIR, tmpDirName)
  ensureDir(tmpDirPath)

  const fileList: string[] = []
  const tasks = segments.map((text, index) => async () => {
    const output = path.resolve(tmpDirPath, `${index + 1}_splits.mp3`)
    const cache = await getCache(voice, text)
    if (cache) {
      logger.info(`Cache hit: ${voice} ${text.slice(0, 10)}`)
      fileList.push(cache.audio)
      return cache
    }
    const result = await generateSingleVoice({ text, pitch, voice, rate, volume, output })
    fileList.push(result.audio)
    await audioCacheInstance.setAudio(`${voice}_${text}`, { ...params, ...result })
    return result
  })

  await runConcurrentTasks(tasks, 3)
  const outputFile = path.resolve(AUDIO_DIR, segment.id)
  await concatDirAudio({ inputDir: tmpDirPath, fileList, outputFile })
  await concatDirSrt({ inputDir: tmpDirPath, fileList, outputFile })

  return {
    audio: `${STATIC_DOMAIN}/${segment.id}`,
    srt: `${STATIC_DOMAIN}/${segment.id.replace('.mp3', '.srt')}`,
  }
}

/**
 * 并发执行任务
 */
async function runConcurrentTasks(tasks: (() => Promise<any>)[], limit: number): Promise<void> {
  const controller = new MapLimitController(tasks, limit, () =>
    logger.info('All concurrent tasks completed')
  )
  const { results, cancelled } = await controller.run()
  logger.info(`Tasks completed: ${results.length}, cancelled: ${cancelled}`)
}

/**
 * 验证语言和语音参数
 */
function validateLangAndVoice(lang: string, voice: string): void {
  if (lang !== 'eng' && voice.startsWith('en')) {
    throw new Error(ErrorMessages.ENG_MODEL_INVALID_TEXT)
  }
}

/**
 * 从 LLM 获取分段参数
 */
async function fetchLLMSegment(prompt: string): Promise<any> {
  const response = await openai.createChatCompletion({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
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
function parseLLMResponse(response: any): TTSParams {
  const params = JSON.parse(response.choices[0].message.content) as TTSParams
  if (!params || typeof params !== 'object') {
    throw new Error(ErrorMessages.INVALID_PARAMS_FORMAT)
  }
  return params
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
