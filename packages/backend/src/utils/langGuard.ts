/**
 * Decide whether an English Edge voice should reject the given text.
 *
 * franc is unreliable on short Latin text (returns und / sco / xho / wol / …).
 * We only reject when the text is clearly non-English:
 *   - contains a substantial non-Latin script (CJK / Hangul / Kana / Arabic / Cyrillic / …), or
 *   - franc returns a high-confidence non-English language code AND the text is long enough.
 */
export const ENG_MODEL_INVALID_TEXT = 'English model cannot process non-English text'

/** franc / ISO codes that clearly mean "not English". */
export const CLEARLY_NON_ENGLISH = new Set([
  'cmn',
  'zh',
  'zho',
  'yue',
  'jpn',
  'kor',
  'vie',
  'tha',
  'lao',
  'khm',
  'mya',
  'ara',
  'heb',
  'fas',
  'urd',
  'hin',
  'ben',
  'tam',
  'tel',
  'mar',
  'guj',
  'kan',
  'mal',
  'pan',
  'rus',
  'ukr',
  'bel',
  'bul',
  'mkd',
  'srp',
  'ell',
  'hye',
  'kat',
  'amh',
  'tir',
])

export const SHORT_TEXT_LIMIT = 20

/** CJK, Hangul, Kana, Arabic, Hebrew, Cyrillic, Thai, Devanagari, etc. */
const NON_LATIN_SCRIPT =
  /[\u0400-\u04FF\u0500-\u052F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/u

export function hasNonLatinScript(text: string): boolean {
  return NON_LATIN_SCRIPT.test(text)
}

/**
 * Returns true when an English voice must refuse this text.
 * `lang` is the franc code (already mapped cmn→zh by getLangConfig callers if desired).
 */
export function shouldRejectEnglishVoice(lang: string, voice: string, text: string): boolean {
  if (!voice?.startsWith('en')) return false
  const trimmed = (text || '').trim()
  if (!trimmed) return false

  // Script check applies at any length (e.g. "你好" with en-US voice).
  if (hasNonLatinScript(trimmed)) return true

  // Short Latin text: franc is too noisy — allow.
  if (trimmed.length < SHORT_TEXT_LIMIT) return false

  return CLEARLY_NON_ENGLISH.has(lang)
}

/** Strip ```json fences / leading prose so JSON.parse can succeed (#71). */
export function extractJsonPayload(content: string): string {
  const trimmed = (content || '').trim()
  if (!trimmed) return trimmed

  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) return fence[1].trim()

  // Content may wrap the object with prose; take the outermost JSON object/array.
  const objStart = trimmed.indexOf('{')
  const arrStart = trimmed.indexOf('[')
  let start = -1
  if (objStart >= 0 && arrStart >= 0) start = Math.min(objStart, arrStart)
  else start = Math.max(objStart, arrStart)
  if (start < 0) return trimmed

  const open = trimmed[start]
  const close = open === '{' ? '}' : ']'
  const end = trimmed.lastIndexOf(close)
  if (end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

export function parseLLMJsonContent(content: string): unknown {
  return JSON.parse(extractJsonPayload(content))
}
