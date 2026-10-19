import { mapZHVoiceName } from './index'
/** Safe mm:ss for UI; never show Infinity/NaN. */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Friendly voice label used everywhere: `Nanami · 女`, `晓晓 · 女`, `Andrew · 男 · 多语` */
export function friendlyVoiceName(name: string, gender?: string, displayName?: string): string {
  // zh-CN-YunxiNeural / ja-JP-NanamiNeural / en-US-AndrewMultilingualNeural
  const parts = name.split('-')
  const last = parts[parts.length - 1] || name
  const multilingual = /Multilingual/i.test(last)
  const raw = displayName || last.replace(/Neural$/i, '').replace(/Multilingual$/i, '')
  const g =
    gender === 'Female' || gender === '女'
      ? '女'
      : gender === 'Male' || gender === '男'
        ? '男'
        : ''
  return [raw, g, multilingual ? '多语' : ''].filter(Boolean).join(' · ')
}

const VOICE_ID_RE = /^([a-z]{2,3}-[A-Z]{2}(?:-[a-z]+)?-[A-Za-z]+Neural)-?/

/** UI label for a generated file: `晓晓 · 我不见他，已是三十…` (real filename stays untouched). */
export function friendlyDownloadLabel(file?: string, textSnippet?: string): string {
  if (!file) return '音频'
  const base = file.replace(/\.mp3$/i, '')
  const m = VOICE_ID_RE.exec(base)
  const voice = m ? friendlyVoiceName(m[1], undefined, mapZHVoiceName(m[1])) : base.startsWith('aigen-') ? 'AI 配音' : ''
  let snip = (textSnippet || '').replace(/\s+/g, ' ').trim()
  if (!snip) {
    snip = (m ? base.slice(m[0].length) : base.replace(/^aigen-/, '')).replace(/-?\d{10,}$/, '').replace(/-+$/, '')
  }
  const chars = Array.from(snip)
  const limit = /[\u3400-\u9fff]/.test(snip) ? 18 : 28 // CJK glyphs are ~2x wider
  const short = chars.length > limit ? chars.slice(0, limit).join('').replace(/\s+\S*$/, '') + '…' : snip
  return [voice, short].filter(Boolean).join(' · ') || '音频'
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
