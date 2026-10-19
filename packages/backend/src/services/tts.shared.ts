/**
 * Pieces shared by the stream (tts.stream.service) and task (tts.service) pipelines.
 * Previously each file carried its own copy of these helpers.
 */
import { logger } from '../utils/logger'
import { openai } from '../utils/openai'
import { parseLLMJsonContent, shouldRejectEnglishVoice } from '../utils/langGuard'
import { normalizeLlmCasting } from '../llm/segmentSchema'
import { MapLimitController } from '../controllers/concurrency.controller'

export enum ErrorMessages {
  ENG_MODEL_INVALID_TEXT = 'English model cannot process non-English text',
  API_FETCH_FAILED = 'Failed to fetch TTS parameters from API',
  INVALID_API_RESPONSE = 'Invalid API response: no TTS parameters returned',
  PARAMS_PARSE_FAILED = 'Failed to parse TTS parameters',
  INVALID_PARAMS_FORMAT = 'Invalid TTS parameters format',
  TTS_GENERATION_FAILED = 'TTS generation failed',
  INCOMPLETE_RESULT = 'Incomplete TTS result',
}

/** Per-request LLM endpoint. Never stored globally (was a cross-request key leak). */
export interface LlmConfig {
  baseURL?: string
  apiKey?: string
  model?: string
}

export function isEnglishVoiceMismatch(lang: string, voice: string, text: string): boolean {
  return shouldRejectEnglishVoice(lang, voice, text)
}

export const DEFAULT_VOICES: Record<string, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-AvaMultilingualNeural',
  eng: 'en-US-AvaMultilingualNeural',
}

export function defaultVoiceFor(lang: string, text = ''): string {
  if (DEFAULT_VOICES[lang]) return DEFAULT_VOICES[lang]
  return /[\u3400-\u9fff]/.test(text) ? DEFAULT_VOICES.zh : DEFAULT_VOICES.en
}

export async function fetchLLMSegment(prompt: string, cfg?: LlmConfig): Promise<any> {
  const response = await openai.createChatCompletion(
    {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. And you can return valid json object',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      ...(cfg?.model ? { model: cfg.model } : {}),
    },
    cfg
  )
  const raw = response?.choices?.[0]?.message?.content
  if (!raw) throw new Error(ErrorMessages.INVALID_API_RESPONSE)
  try {
    return normalizeLlmCasting(parseLLMJsonContent(raw))
  } catch {
    throw new Error(ErrorMessages.INVALID_PARAMS_FORMAT)
  }
}

export interface CastSegment {
  text: string
  voice: string
  rate: string
  pitch: string
  volume: string
  character?: string
}

const RATE_RE = /^[+-]\d{1,3}%$/
const PITCH_RE = /^[+-]\d{1,3}Hz$/
const VOL_RE = /^[+-]\d{1,3}%$/

/**
 * Sanitize LLM casting: keep only voices that exist, clamp prosody format, and
 * fall back to a sensible default voice instead of letting Edge reject the request.
 */
export function formatLlmSegments(
  llmSegments: any[],
  opts: { voiceList?: VoiceConfig[]; fallbackVoice: string }
): CastSegment[] {
  const known = new Set((opts.voiceList || []).map((v) => v.Name))
  return (Array.isArray(llmSegments) ? llmSegments : [])
    .filter((s: any) => s && typeof s.text === 'string' && s.text.trim())
    .map((s: any) => {
      let voice = String(s.voice || s.name || '').trim()
      if (!voice || (known.size && !known.has(voice))) {
        if (voice) logger.warn(`LLM picked unknown voice "${voice}", using ${opts.fallbackVoice}`)
        voice = opts.fallbackVoice
      }
      const pick = (v: any, re: RegExp, d: string) => (typeof v === 'string' && re.test(v.trim()) ? v.trim() : d)
      return {
        text: s.text,
        voice,
        rate: pick(s.rate, RATE_RE, '+0%'),
        pitch: pick(s.pitch, PITCH_RE, '+0Hz'),
        volume: pick(s.volume, VOL_RE, '+0%'),
        character: s.character,
      }
    })
}

export async function runConcurrentTasks<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const controller = new MapLimitController(tasks, limit, () =>
    logger.info('All concurrent tasks completed')
  )
  const { results, cancelled } = await controller.run()
  logger.info(`Tasks completed: ${results.length}, cancelled: ${cancelled}`)
  return results
}
