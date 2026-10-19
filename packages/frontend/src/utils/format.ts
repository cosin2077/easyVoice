/** Safe mm:ss for UI; never show Infinity/NaN. */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Friendly voice label: Nanami · 女 */
export function friendlyVoiceName(name: string, gender?: string): string {
  // zh-CN-YunxiNeural / ja-JP-NanamiNeural / en-US-JennyMultilingualNeural
  const parts = name.split('-')
  let raw = parts[parts.length - 1] || name
  raw = raw.replace(/Neural$/i, '').replace(/Multilingual$/i, '')
  // Keep CamelCase spaced lightly: YunXi -> YunXi
  const g =
    gender === 'Female' || gender === '女'
      ? '女'
      : gender === 'Male' || gender === '男'
        ? '男'
        : ''
  return g ? `${raw} · ${g}` : raw
}

export function friendlyDownloadLabel(file?: string, textSnippet?: string): string {
  if (!file) return '音频'
  // voice-snippet-timestamp.mp3
  const base = file.replace(/\.mp3$/i, '')
  const bits = base.split('-')
  // drop trailing timestamp if all digits
  if (bits.length && /^\d{10,}$/.test(bits[bits.length - 1])) bits.pop()
  let label = bits.slice(0, 4).join('-')
  if (textSnippet) {
    const snip = textSnippet.replace(/\s+/g, ' ').trim().slice(0, 12)
    if (snip) label = `${bits.slice(0, 3).join('-')} · ${snip}`
  }
  return label.length > 36 ? label.slice(0, 34) + '…' : label
}

export function looksLikeChinese(text: string): boolean {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  return cjk >= 4 && cjk >= latin
}

export function looksLikeEnglish(text: string): boolean {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  return latin >= 8 && cjk === 0
}
