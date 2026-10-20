/**
 * Text → speech plan.
 *
 * - Pause markers become real silence units (no filler text reaches Edge or the SRT):
 *     (((停顿3秒)))  (((暂停1.5秒)))  (((pause 2s)))  [pause:500ms]  <break time="2s"/>
 * - Numbers (applied right before Edge, see utils/numberSpeech) are left to Edge's native reading (300元, 2000人, 1.5倍, 2024年 are all read
 *   correctly by Edge). Only *code-like* digit runs in CJK text are spelled digit by digit:
 *   stock codes / IDs after a keyword (股票代码601012, 尾号8888), digits in brackets
 *   (隆基绿能（601012）), numbers with leading zeros (000001) and long runs (phone numbers,
 *   order ids) that are not followed by a unit.
 */
import { splitText } from './text.service'

export type NormalizedPart = { type: 'text'; text: string } | { type: 'break'; seconds: number }
export type SpeechUnit = { type: 'text'; text: string } | { type: 'break'; ms: number }

export const MAX_PAUSE_SECONDS = 30

const NUM = '([0-9]+(?:\\.[0-9]+)?)'
const UNIT = '(秒钟?|s|secs?|seconds?|毫秒|ms)?'
const PAUSE_SOURCES = [
  `\\(\\(\\(\\s*(?:停顿|暂停|静音|pause|break)\\s*${NUM}\\s*${UNIT}\\s*\\)\\)\\)`,
  `\\[\\s*(?:pause|break|停顿)\\s*[:：]\\s*${NUM}\\s*${UNIT}\\s*\\]`,
  `<\\s*break\\s+time\\s*=\\s*["']?${NUM}\\s*${UNIT}["']?\\s*\\/?\\s*>`,
]
const PAUSE_RE = new RegExp(PAUSE_SOURCES.join('|'), 'gi')

function toSeconds(value: string, unit?: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return unit && /^(毫秒|ms)$/i.test(unit) ? n / 1000 : n
}

export function parsePauseMarkers(input: string): NormalizedPart[] {
  const parts: NormalizedPart[] = []
  let last = 0
  const re = new RegExp(PAUSE_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) {
    if (m.index > last) {
      const chunk = input.slice(last, m.index)
      if (chunk.trim()) parts.push({ type: 'text', text: chunk })
    }
    // groups come in (value, unit) pairs, one pair per alternative
    let sec = 0
    for (let g = 1; g < m.length; g += 2) {
      if (m[g] !== undefined) {
        sec = toSeconds(m[g], m[g + 1])
        break
      }
    }
    if (sec > 0) parts.push({ type: 'break', seconds: Math.min(sec, MAX_PAUSE_SECONDS) })
    last = m.index + m[0].length
  }
  if (last < input.length) {
    const chunk = input.slice(last)
    if (chunk.trim()) parts.push({ type: 'text', text: chunk })
  }
  return parts
}

/** Remove pause markers (for language detection, ids, LLM-free checks). */
export function stripPauseMarkers(input: string): string {
  return input.replace(new RegExp(PAUSE_RE.source, 'gi'), ' ')
}

export { isCodeLike, normalizeNumbersForSpeech, toSpeechText } from '../utils/numberSpeech'

/**
 * Text as the user wrote it, minus pause markers. Number reading is applied later, at the
 * Edge layer, so subtitles keep the original digits.
 */
export function preprocessTextForTts(text: string): string {
  return stripPauseMarkers(text)
}

/**
 * Turn user text into ordered speech units: text chunks (split to Edge-friendly sizes,
 * original wording kept) and real silences. Adjacent breaks are merged. Number reading is
 * applied at the Edge layer (toSpeechText) so subtitles can keep the original digits.
 */
export function planSpeech(
  text: string,
  split: (t: string) => string[] = (t) => splitText(t).segments
): SpeechUnit[] {
  const units: SpeechUnit[] = []
  for (const part of parsePauseMarkers(text)) {
    if (part.type === 'break') {
      const ms = Math.round(part.seconds * 1000)
      const prev = units[units.length - 1]
      if (prev?.type === 'break') prev.ms = Math.min(prev.ms + ms, MAX_PAUSE_SECONDS * 1000)
      else units.push({ type: 'break', ms })
      continue
    }
    for (const chunk of split(part.text)) {
      if (chunk && chunk.trim()) units.push({ type: 'text', text: chunk })
    }
  }
  return units
}
