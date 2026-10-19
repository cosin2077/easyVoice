/**
 * Minimal MPEG audio frame counter (browser, Uint8Array).
 * Mirrors packages/backend/src/utils/mp3.ts — gives the exact playable duration of
 * streamed bytes, independent of the server's chosen bitrate.
 */
const BR: Record<string, number[]> = {
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, -1],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, -1],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, -1],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
}
const SR: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

function header(b: Uint8Array, i: number) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null
  const v = (b[i + 1] >> 3) & 3
  const l = (b[i + 1] >> 1) & 3
  if (v === 1 || l === 0) return null
  const layer = 4 - l
  const bi = (b[i + 2] >> 4) & 15
  const si = (b[i + 2] >> 2) & 3
  const pad = (b[i + 2] >> 1) & 1
  if (bi === 0 || bi === 15 || si === 3) return null
  const vk = v === 3 ? 1 : 2
  const br = BR[`${vk}-${layer}`][bi] * 1000
  const sr = SR[v][si]
  let samples = 1152
  let len: number
  if (layer === 1) {
    samples = 384
    len = (Math.floor((12 * br) / sr) + pad) * 4
  } else if (layer === 2 || vk === 1) {
    len = Math.floor((144 * br) / sr) + pad
  } else {
    samples = 576
    len = Math.floor((72 * br) / sr) + pad
  }
  return len >= 4 ? { len, samples, sr } : null
}

export class Mp3DurationCounter {
  private pending = new Uint8Array(0)
  samples = 0
  sampleRate = 0
  push(chunk: Uint8Array) {
    let b = chunk
    if (this.pending.length) {
      b = new Uint8Array(this.pending.length + chunk.length)
      b.set(this.pending)
      b.set(chunk, this.pending.length)
    }
    let i = 0
    while (i + 4 <= b.length) {
      if (b[i] === 0x49 && b[i + 1] === 0x44 && b[i + 2] === 0x33 && i + 10 <= b.length) {
        const size = ((b[i + 6] & 0x7f) << 21) | ((b[i + 7] & 0x7f) << 14) | ((b[i + 8] & 0x7f) << 7) | (b[i + 9] & 0x7f)
        if (i + 10 + size > b.length) break
        i += 10 + size
        continue
      }
      const h = header(b, i)
      if (!h) {
        i++
        continue
      }
      if (i + h.len > b.length) break
      this.samples += h.samples
      this.sampleRate = h.sr
      i += h.len
    }
    this.pending = b.slice(i)
  }
  /** seconds */
  get duration() {
    return this.sampleRate ? this.samples / this.sampleRate : 0
  }
}
