/**
 * Minimal MPEG audio frame counter.
 * Used to derive the *real* playable duration of each TTS segment from the bytes
 * Edge sends, so subtitle offsets match the concatenated audio frame-accurately.
 */

const BITRATES: Record<string, number[]> = {
  // [versionKey-layer]: kbps by index (0 = free, 15 = bad)
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, -1],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, -1],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, -1],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, -1],
}
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG1
  2: [22050, 24000, 16000], // MPEG2
  0: [11025, 12000, 8000], // MPEG2.5
}

export interface FrameHeader {
  length: number
  samples: number
  sampleRate: number
}

export function parseFrameHeader(buf: Buffer, i: number): FrameHeader | null {
  if (i + 4 > buf.length) return null
  if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return null
  const versionBits = (buf[i + 1] >> 3) & 0x03
  const layerBits = (buf[i + 1] >> 1) & 0x03
  if (versionBits === 1 || layerBits === 0) return null
  const layer = 4 - layerBits // 1..3
  const brIdx = (buf[i + 2] >> 4) & 0x0f
  const srIdx = (buf[i + 2] >> 2) & 0x03
  const padding = (buf[i + 2] >> 1) & 0x01
  if (brIdx === 0 || brIdx === 15 || srIdx === 3) return null
  const vKey = versionBits === 3 ? 1 : 2
  const bitrate = BITRATES[`${vKey}-${layer}`][brIdx] * 1000
  const sampleRate = SAMPLE_RATES[versionBits][srIdx]
  let samples: number
  let length: number
  if (layer === 1) {
    samples = 384
    length = (Math.floor((12 * bitrate) / sampleRate) + padding) * 4
  } else if (layer === 2 || vKey === 1) {
    samples = 1152
    length = Math.floor((144 * bitrate) / sampleRate) + padding
  } else {
    samples = 576
    length = Math.floor((72 * bitrate) / sampleRate) + padding
  }
  if (length < 4) return null
  return { length, samples, sampleRate }
}

function id3v2Size(buf: Buffer, i: number): number {
  if (i + 10 > buf.length) return 0
  if (buf.toString('latin1', i, i + 3) !== 'ID3') return 0
  const size =
    ((buf[i + 6] & 0x7f) << 21) |
    ((buf[i + 7] & 0x7f) << 14) |
    ((buf[i + 8] & 0x7f) << 7) |
    (buf[i + 9] & 0x7f)
  const footer = buf[i + 5] & 0x10 ? 10 : 0
  return 10 + size + footer
}

/** Incremental counter: feed arbitrary chunks (frames may straddle chunks). */
export class Mp3FrameCounter {
  private pending: Buffer = Buffer.alloc(0)
  private first = true
  frames = 0
  samples = 0
  sampleRate = 0

  push(chunk: Buffer): void {
    let buf = this.pending.length ? Buffer.concat([this.pending, chunk]) : chunk
    let i = 0
    while (i + 4 <= buf.length) {
      const id3 = id3v2Size(buf, i)
      if (id3) {
        if (i + id3 > buf.length) break
        i += id3
        continue
      }
      const h = parseFrameHeader(buf, i)
      if (!h) {
        i++
        continue
      }
      if (i + h.length > buf.length) break
      // Skip Xing/Info/VBRI metadata frames (they carry no audio for the player)
      const isMeta =
        this.first &&
        /Xing|Info|VBRI/.test(buf.toString('latin1', i + 4, Math.min(i + h.length, i + 64)))
      this.first = false
      if (!isMeta) {
        this.frames++
        this.samples += h.samples
        this.sampleRate = h.sampleRate
      }
      i += h.length
    }
    this.pending = Buffer.from(buf.subarray(i))
  }

  get durationMs(): number {
    return this.sampleRate ? (this.samples / this.sampleRate) * 1000 : 0
  }
}

export function mp3DurationMs(buf: Buffer): number {
  const c = new Mp3FrameCounter()
  c.push(buf)
  return c.durationMs
}

/**
 * Digital silence in the exact format Edge TTS returns (`audio-24khz-96kbitrate-mono-mp3`:
 * MPEG-2 Layer III, 24 kHz, 96 kbps, mono, no CRC). Each frame is 576 samples = 24 ms,
 * 72 * 96000 / 24000 = 288 bytes. A frame whose side info is all zero (part2_3_length = 0,
 * global_gain = 0, main_data_begin = 0) decodes to pure silence and does not borrow from
 * the bit reservoir, so it can be concatenated byte-for-byte between Edge segments.
 */
export const EDGE_FRAME_MS = 24
const EDGE_SILENT_FRAME = (() => {
  const f = Buffer.alloc(288, 0)
  f[0] = 0xff
  f[1] = 0xf3 // sync, MPEG-2, Layer III, no CRC
  f[2] = 0xa4 // bitrate idx 10 (96 kbps), sample-rate idx 1 (24 kHz), no padding
  f[3] = 0xc0 // mono
  return f
})()

/** Silent MP3 of `ms` milliseconds (rounded to whole 24 ms frames). */
export function silentMp3(ms: number): { buffer: Buffer; durationMs: number } {
  const frames = Math.max(0, Math.round(ms / EDGE_FRAME_MS))
  return {
    buffer: Buffer.concat(Array.from({ length: frames }, () => EDGE_SILENT_FRAME)),
    durationMs: frames * EDGE_FRAME_MS,
  }
}
