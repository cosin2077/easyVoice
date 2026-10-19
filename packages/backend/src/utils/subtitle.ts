/**
 * Subtitle time model
 * -------------------
 * Edge TTS reports WordBoundary metadata with `Offset`/`Duration` in 100-ns ticks,
 * relative to the start of *that synthesis request's* audio. We store them as
 * integer milliseconds (`ticks / 10_000`) per segment, together with the segment's
 * real audio duration (`durationMs`, derived from counting the MP3 frames Edge sent).
 *
 * When segments are concatenated (ffmpeg `-c copy` or raw byte streaming), segment k
 * starts exactly at sum(durationMs[0..k-1]). Using the last cue's end instead (the
 * previous behaviour) drops each segment's trailing silence (~0.9 s for Edge) and
 * makes subtitles drift progressively later than the audio.
 */

export interface SubtitleItem {
  part: string
  /** ms, relative to the owning audio (segment-local or absolute after merge) */
  start: number
  end: number
}

export type SubtitleFile = SubtitleItem[]
export type SubtitleFiles = SubtitleFile[]

/** On-disk per-segment subtitle document (v2). Legacy files are a bare SubtitleItem[]. */
export interface SegmentSubtitleDoc {
  version: 2
  /** Real decoded duration of the segment audio in ms (frame-accurate). */
  durationMs: number
  cues: SubtitleItem[]
}

export interface SegmentSubtitle {
  cues: SubtitleItem[]
  /** undefined for legacy files without duration information */
  durationMs?: number
}

class SubtitleMergeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubtitleMergeError'
  }
}

export const TICKS_PER_MS = 10_000

export function ticksToMs(ticks: number): number {
  return Math.round(ticks / TICKS_PER_MS)
}

/** Accepts both v2 docs and legacy arrays. */
export function parseSegmentSubtitle(raw: unknown): SegmentSubtitle {
  if (Array.isArray(raw)) return { cues: raw as SubtitleItem[] }
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).cues)) {
    const d = (raw as any).durationMs
    return {
      cues: (raw as any).cues,
      durationMs: typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : undefined,
    }
  }
  throw new SubtitleMergeError('Unrecognized subtitle document')
}

export function toSegmentDoc(cues: SubtitleItem[], durationMs: number): SegmentSubtitleDoc {
  return { version: 2, durationMs: Math.round(durationMs), cues }
}

/**
 * Merge per-segment subtitles into one absolute timeline.
 * Offset of segment k = sum of previous segments' real durations; for legacy
 * segments without duration we fall back to their last cue end (old behaviour).
 */
export function mergeSegmentSubtitles(
  segments: SegmentSubtitle[],
  gap = 0
): { cues: SubtitleItem[]; durationMs: number } {
  if (!Array.isArray(segments)) throw new SubtitleMergeError('Input must be an array')
  if (typeof gap !== 'number' || gap < 0)
    throw new SubtitleMergeError('Gap must be a non-negative number')
  const cues: SubtitleItem[] = []
  let offset = 0
  segments.forEach((seg, index) => {
    if (!seg || !Array.isArray(seg.cues))
      throw new SubtitleMergeError(`Subtitle file at index ${index} is not an array`)
    seg.cues.forEach((item, i) => {
      if (!isValidSubtitleItem(item))
        throw new SubtitleMergeError(`Invalid subtitle item at file ${index}, item ${i}`)
      cues.push({ part: item.part, start: item.start + offset, end: item.end + offset })
    })
    const length =
      seg.durationMs ?? (seg.cues.length ? seg.cues[seg.cues.length - 1].end : 0)
    if (index < segments.length - 1) offset += length + gap
    else offset += length
  })
  return { cues, durationMs: offset }
}

/** Legacy API kept for callers/tests: merge bare arrays using last-cue-end offsets. */
export function mergeSubtitleFiles(subtitleFiles: SubtitleFiles, gap = 0): SubtitleItem[] {
  if (!Array.isArray(subtitleFiles))
    throw new SubtitleMergeError('Input must be an array of subtitle files')
  subtitleFiles.forEach((f, i) => {
    if (!Array.isArray(f)) throw new SubtitleMergeError(`Subtitle file at index ${i} is not an array`)
  })
  return mergeSegmentSubtitles(
    subtitleFiles.map((cues) => ({ cues })),
    gap
  ).cues
}

const CLOSERS = `["'”’」』）)\\]》】]*`
const SENTENCE_END = new RegExp(`(?:[。！？!?；;…]|\\.)${CLOSERS}$`)
const SOFT_BREAK = new RegExp(`[，,、：:]${CLOSERS}$`)

/**
 * Group word-level cues into readable subtitle lines: break on sentence punctuation,
 * on soft punctuation once the line is long enough, on long pauses, or hard limits.
 */
export function groupCues(
  words: SubtitleItem[],
  opts: { maxChars?: number; softChars?: number; maxDurationMs?: number; pauseMs?: number } = {}
): SubtitleItem[] {
  const { maxChars = 42, softChars = 16, maxDurationMs = 6000, pauseMs = 600 } = opts
  const out: SubtitleItem[] = []
  let cur: SubtitleItem | null = null
  const visibleLen = (s: string) => s.replace(/\s+/g, ' ').trim().length
  const flush = () => {
    if (cur && cur.part.trim()) out.push({ ...cur, part: cur.part.replace(/\s+/g, ' ').trim() })
    cur = null
  }
  for (const w of words) {
    const part = (w.part || '').replace(/\s+/g, ' ')
    if (!part.trim()) continue
    if (cur) {
      const c: SubtitleItem = cur
      const pause = w.start - c.end
      const joined = joinParts(c.part, part)
      if (
        pause >= pauseMs ||
        visibleLen(joined) > maxChars ||
        w.end - c.start > maxDurationMs
      ) {
        flush()
      } else {
        c.part = joined
        c.end = w.end
        const t = c.part.trim()
        if (SENTENCE_END.test(t) || (SOFT_BREAK.test(t) && visibleLen(t) >= softChars)) flush()
        continue
      }
    }
    cur = { part, start: w.start, end: w.end }
    const t = part.trim()
    if (SENTENCE_END.test(t)) flush()
  }
  flush()
  return out
}

function joinParts(a: string, b: string): string {
  const needsSpace = /[A-Za-z0-9.,!?;:'")\]]$/.test(a.trimEnd()) && /^[A-Za-z0-9'"(\[]/.test(b.trimStart())
  if (needsSpace && !/\s$/.test(a) && !/^\s/.test(b)) return a + ' ' + b
  return a + b
}

/** HH:MM:SS,mmm from (possibly fractional) milliseconds. */
export function formatSrtTime(msIn: number): string {
  const ms = Math.max(0, Math.round(msIn))
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const r = ms % 1000
  const p = (n: number, l = 2) => n.toString().padStart(l, '0')
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`
}

export function cuesToSrt(cues: SubtitleItem[]): string {
  return cues
    .map((c, i) => {
      const text = c.part.replace(/\r?\n+/g, ' ').trim()
      const end = Math.max(c.end, c.start + 1)
      return `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(end)}\n${text}\n`
    })
    .join('\n')
}

function isValidSubtitleItem(item: any): item is SubtitleItem {
  return (
    item != null &&
    typeof item === 'object' &&
    typeof item.part === 'string' &&
    typeof item.start === 'number' &&
    typeof item.end === 'number' &&
    item.start >= 0 &&
    item.end >= item.start
  )
}

const OPENERS = /[『「“‘(（\[《〈【]/

/**
 * Map Edge word-boundary tokens back onto the source text so cues keep the original
 * punctuation. Trailing punctuation/space between this token and the next is attached
 * to this cue, except opening quotes/brackets which belong to the next cue.
 * Newlines are collapsed (they used to leak into SRT and break its block structure).
 */
export function alignCueText(text: string, cues: SubtitleItem[], maxSkip = 24): SubtitleItem[] {
  const out: SubtitleItem[] = cues.map((c) => ({ ...c }))
  let pos = 0
  let carry = ''
  for (let i = 0; i < out.length; i++) {
    const part = out[i].part || ''
    const idx = part ? text.indexOf(part, pos) : -1
    if (idx < 0 || idx - pos > maxSkip) {
      out[i].part = (carry + part).replace(/\s+/g, ' ')
      carry = ''
      continue
    }
    const end = idx + part.length
    const next = out[i + 1]?.part
    let nextIdx = next ? text.indexOf(next, end) : text.length
    if (nextIdx < 0 || nextIdx - end > maxSkip) {
      const m = /^[\s\p{P}]*/u.exec(text.slice(end))
      nextIdx = end + (m ? m[0].length : 0)
    }
    const tail = text.slice(end, nextIdx)
    let cut = tail.search(OPENERS)
    if (cut < 0) cut = tail.length
    out[i].part = (carry + text.slice(pos, end) + tail.slice(0, cut)).replace(/\s+/g, ' ')
    carry = tail.slice(cut).replace(/\s+/g, '')
    pos = nextIdx
  }
  return out
}
