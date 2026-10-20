/**
 * Real progress for streamed TTS: the server streams audio roughly as it is synthesised,
 * so progress = decoded seconds received / expected spoken seconds of the input text.
 * Speaking speed measured on Edge voices at rate 0: Chinese ≈ 5 chars/s, Latin ≈ 16 chars/s.
 */
const CJK = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g

export function estimateSpeechSeconds(text: string, ratePercent = 0) {
  const cjk = (text.match(CJK) || []).length
  const other = text.replace(CJK, '').replace(/\s+/g, ' ').trim().length
  const base = cjk / 5 + other / 16
  const speed = Math.max(0.05, 1 + (Number(ratePercent) || 0) / 100)
  return Math.max(1, base / speed)
}

/** Monotonic percentage (0..99 while streaming, 100 only via done()). */
export function createStreamProgress(expectedSeconds: number) {
  let last = 0
  return {
    update(loadedSeconds: number) {
      if (!(loadedSeconds > 0) || !(expectedSeconds > 0)) return last
      const pct = Math.min(99, Math.floor((loadedSeconds / expectedSeconds) * 100))
      last = Math.max(last, pct)
      return last
    },
    done() {
      last = 100
      return last
    },
  }
}
