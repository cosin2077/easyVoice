/**
 * Lightweight text normalization before TTS / LLM.
 * - Pause markers: (((停顿3秒))) / (((pause 3s))) / [pause:3s] → explicit break segments
 * - Simple number reading hints for Chinese (optional light touch)
 */

export type NormalizedPart =
  | { type: 'text'; text: string }
  | { type: 'break'; seconds: number }

const PAUSE_RE =
  /\(\(\(\s*(?:停顿|暂停|pause)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:秒|s|sec|seconds?)?\s*\)\)\)|\[\s*pause\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*(s|sec|seconds?)?\s*\]/gi

export function parsePauseMarkers(input: string): NormalizedPart[] {
  const parts: NormalizedPart[] = []
  let last = 0
  let m: RegExpExecArray | null
  const re = new RegExp(PAUSE_RE.source, 'gi')
  while ((m = re.exec(input))) {
    if (m.index > last) {
      const chunk = input.slice(last, m.index)
      if (chunk.trim()) parts.push({ type: 'text', text: chunk })
    }
    const sec = Number(m[1] || m[2] || 0)
    if (sec > 0 && sec <= 30) parts.push({ type: 'break', seconds: sec })
    last = m.index + m[0].length
  }
  if (last < input.length) {
    const chunk = input.slice(last)
    if (chunk.trim()) parts.push({ type: 'text', text: chunk })
  }
  if (!parts.length && input) parts.push({ type: 'text', text: input })
  return parts
}

/** Expand pause markers into spoken ellipsis gaps Edge can roughly honor via punctuation. */
export function materializePausesForEdge(input: string): string {
  return parsePauseMarkers(input)
    .map((p) => {
      if (p.type === 'text') return p.text
      // Edge has no true silence API here; use long ellipsis / ideographic space runs as a pragmatic pause.
      const beats = Math.min(12, Math.max(1, Math.round(p.seconds * 2)))
      return '，' + '…'.repeat(beats) + '。'
    })
    .join('')
}

/** Very small CN number helper: years like 2024 → 二零二四；plain integers < 10000. */
export function normalizeChineseNumbers(text: string): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  return text.replace(/\d+/g, (num) => {
    if (num.length === 4 && (num.startsWith('19') || num.startsWith('20'))) {
      return num.split('').map((d) => digits[Number(d)] || d).join('')
    }
    if (num.length > 6) return num
    // fallback: digit-by-digit for clarity in IDs/phones
    if (num.length >= 5) return num.split('').map((d) => digits[Number(d)] || d).join('')
    const n = Number(num)
    if (Number.isNaN(n)) return num
    if (n < 10) return digits[n]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const o = n % 10
      return (t > 1 ? digits[t] : '') + '十' + (o ? digits[o] : '')
    }
    return num.split('').map((d) => digits[Number(d)] || d).join('')
  })
}

export function preprocessTextForTts(text: string, opts: { normalizeNumbers?: boolean } = {}): string {
  let out = materializePausesForEdge(text)
  // Off by default: Edge already reads quantities/years/decimals correctly, and the
  // digit-by-digit helper turned 300元 into 三零零元 and 1.5 into 一.五 (v0.0.20 regression).
  if (opts.normalizeNumbers === true) {
    // Only apply CN digit reading when text has CJK
    if (/[\u3400-\u9fff]/.test(out)) out = normalizeChineseNumbers(out)
  }
  return out
}
