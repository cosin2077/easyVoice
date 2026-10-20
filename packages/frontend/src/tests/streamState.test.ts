import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { GenerationRun, isAbortError } from '@/utils/generationRun'
import { createStreamProgress, estimateSpeechSeconds } from '@/utils/streamProgress'
import { Mp3DurationCounter } from '@/utils/mp3'
import { createAudioStreamProcessor } from '@/utils/streamProcessor'

/** MPEG-2 Layer III, 24 kHz, 96 kbps mono, no padding (Edge's format): 288 bytes, 576 samples = 24 ms */
const frame = () => {
  const f = new Uint8Array(288)
  f.set([0xff, 0xf3, 0xa4, 0xc4])
  return f
}
const mp3 = (frames: number, id3 = false) => {
  const head = id3 ? new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20, ...new Array(20).fill(0)]) : new Uint8Array(0)
  const out = new Uint8Array(head.length + frames * 288)
  out.set(head)
  for (let i = 0; i < frames; i++) out.set(frame(), head.length + i * 288)
  return out
}
const streamOf = (parts: Uint8Array[], { hang = false } = {}) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      parts.forEach((p) => c.enqueue(p))
      if (!hang) c.close()
    },
  })
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('GenerationRun state machine', () => {
  it('done and cancelled are mutually exclusive', () => {
    const run = new GenerationRun()
    const { id } = run.start()
    expect(run.isLive(id)).toBe(true)
    expect(run.finish(id)).toBe(true)
    expect(run.cancel()).toBe(false) // stop after completion is ignored
    expect(run.state).toBe('done')

    const r2 = run.start()
    expect(run.cancel()).toBe(true)
    expect(r2.signal.aborted).toBe(true) // cancel reaches the request
    expect(run.finish(r2.id)).toBe(false) // late completion is dropped
    expect(run.fail(r2.id)).toBe(false)
    expect(run.state).toBe('cancelled')
  })
  it('progress callbacks do not end the run (regression: run.state="idle" in onProgress)', () => {
    const run = new GenerationRun()
    const { id } = run.start()
    for (let i = 0; i < 100; i++) expect(run.isLive(id)).toBe(true)
    expect(run.cancel()).toBe(true)
  })
  it('a new run supersedes a stale one and aborts it', () => {
    const run = new GenerationRun()
    const a = run.start()
    const b = run.start()
    expect(a.signal.aborted).toBe(true)
    expect(run.finish(a.id)).toBe(false)
    expect(run.finish(b.id)).toBe(true)
  })
  it('fail is terminal and recognises abort errors', () => {
    const run = new GenerationRun()
    const { id } = run.start()
    expect(run.fail(id)).toBe(true)
    expect(run.cancel()).toBe(false)
    expect(isAbortError({ name: 'CanceledError' })).toBe(true)
    expect(isAbortError(new Error('x'))).toBe(false)
  })
})

describe('MP3 duration', () => {
  it('counts 24 ms frames exactly, across chunk splits and ID3', () => {
    const data = mp3(2500, true) // 60 s
    const c = new Mp3DurationCounter()
    for (let i = 0; i < data.length; i += 997) c.push(data.subarray(i, i + 997))
    expect(c.duration).toBeCloseTo(60, 6)
  })
  it('a 9.5 min stream reports ~570 s, not a multiple of it', () => {
    const c = new Mp3DurationCounter()
    const minute = mp3(2500)
    for (let i = 0; i < 9; i++) c.push(minute)
    c.push(mp3(1250))
    expect(c.duration).toBeCloseTo(570, 6)
  })
})

describe('stream progress', () => {
  it('estimates speech length and stays monotonic below 100 until done', () => {
    expect(estimateSpeechSeconds('字'.repeat(2600))).toBeCloseTo(520, 0)
    expect(estimateSpeechSeconds('a'.repeat(1600), 100)).toBeCloseTo(50, 0)
    const p = createStreamProgress(100)
    expect(p.update(0)).toBe(0)
    expect(p.update(30)).toBe(30)
    expect(p.update(10)).toBe(30)
    expect(p.update(500)).toBe(99)
    expect(p.done()).toBe(100)
  })
})

describe('createAudioStreamProcessor', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock') as any
    URL.revokeObjectURL = vi.fn() as any
  })
  afterEach(() => vi.unstubAllGlobals())
  it('finishes once with exact duration, copying chunk views (no MediaSource)', async () => {
    const backing = mp3(500) // 12 s
    // views into one larger buffer, like fetch chunks
    const parts = [backing.subarray(0, 5000), backing.subarray(5000, 100000), backing.subarray(100000)]
    const onFinished = vi.fn()
    const onError = vi.fn()
    const onProgress = vi.fn()
    const p = createAudioStreamProcessor(streamOf(parts), () => {}, onProgress, onFinished, onError)
    await vi.waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1))
    expect(onError).not.toHaveBeenCalled()
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(p.isFinished()).toBe(true)
    expect(p.getLoadedDuration()).toBeCloseTo(12, 6)
    const blobs: Blob[] = onFinished.mock.calls[0][1]
    expect(blobs.reduce((n, b) => n + b.size, 0)).toBe(backing.byteLength)
  })
  it('stop() mid-stream: no onFinished, no onError', async () => {
    const onFinished = vi.fn()
    const onError = vi.fn()
    const p = createAudioStreamProcessor(streamOf([mp3(10)], { hang: true }), () => {}, () => {}, onFinished, onError)
    await flush()
    p.stop()
    await flush()
    await flush()
    expect(onFinished).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(p.isFinished()).toBe(false)
  })
  it('with MediaSource: appends are queued until updateend and endOfStream is called after the last one', async () => {
    const appended: number[] = []
    let ms: any
    class FakeSB extends EventTarget {
      updating = false
      mode = 'segments'
      appendBuffer(d: Uint8Array) {
        this.updating = true
        appended.push(d.byteLength)
        setTimeout(() => {
          this.updating = false
          this.dispatchEvent(new Event('updateend'))
        }, 1)
      }
    }
    class FakeMS extends EventTarget {
      static isTypeSupported = () => true
      readyState = 'closed'
      sourceBuffers: FakeSB[] = []
      endOfStream = vi.fn(() => {
        this.readyState = 'ended'
      })
      constructor() {
        super()
        ms = this
      }
      addSourceBuffer() {
        const sb = new FakeSB()
        this.sourceBuffers.push(sb)
        return sb
      }
    }
    vi.stubGlobal('MediaSource', FakeMS)
    const onFinished = vi.fn()
    createAudioStreamProcessor(streamOf([mp3(10), mp3(10), mp3(10)]), () => {}, () => {}, onFinished, () => {})
    // body is read (and finished) even before the <audio> element opens the MediaSource
    await vi.waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1))
    expect(appended).toEqual([])
    ms.readyState = 'open'
    ms.dispatchEvent(new Event('sourceopen'))
    await vi.waitFor(() => expect(ms.endOfStream).toHaveBeenCalledTimes(1))
    expect(appended).toEqual([2880, 2880, 2880])
  })
})
