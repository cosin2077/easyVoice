import { Mp3DurationCounter } from './mp3'

export interface AudioProcessor {
  /** object URL for the <audio> element (MediaSource), '' when MSE is unavailable */
  audioUrl: string
  stop: () => void
  isActive: () => boolean
  /** exact decoded seconds received so far (MP3 frame count) */
  getLoadedDuration: () => number
  downloadAudio: () => void
  isFinished: () => boolean
}

/**
 * Streams an MP3 body into a MediaSource for live playback while collecting the bytes.
 *
 * - Reading starts immediately and does not depend on MediaSource `sourceopen`
 *   (which only fires once an <audio> element is attached); chunks received before
 *   the SourceBuffer exists are queued.
 * - Appends are serialised through one queue drained on `updateend`; reading never
 *   waits on MSE, so a slow/full SourceBuffer cannot stall end-of-stream detection.
 * - Chunks are copied: a fetch chunk is a Uint8Array *view*; using `value.buffer`
 *   would append/collect the whole backing ArrayBuffer.
 * - Exactly one terminal callback: onFinished (body fully read) or onError; neither
 *   after stop().
 */
export function createAudioStreamProcessor(
  stream: ReadableStream<Uint8Array>,
  onStart: () => void,
  onProgress: () => void,
  onFinished: (audioNewUrl: string, blobs: Blob[]) => void,
  onError: (msg: string) => void,
  mimeType: string = 'audio/mpeg'
): AudioProcessor {
  const mseOk = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(mimeType)
  const mediaSource: MediaSource | null = mseOk ? new MediaSource() : null
  const audioUrl = mediaSource ? URL.createObjectURL(mediaSource) : ''
  let sourceBuffer: SourceBuffer | null = null
  const queue: Uint8Array[] = []
  const chunks: Uint8Array[] = []
  const counter = new Mp3DurationCounter()
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let readDone = false
  let finished = false
  let stopped = false
  let mseBroken = false

  const tryEndOfStream = () => {
    if (!mediaSource || mediaSource.readyState !== 'open') return
    if (sourceBuffer?.updating || queue.length) return
    try {
      mediaSource.endOfStream()
    } catch {
      /* already ended */
    }
  }

  const pump = () => {
    if (!sourceBuffer || sourceBuffer.updating || stopped || mseBroken) return
    if (!mediaSource || mediaSource.readyState !== 'open') return
    const next = queue.shift()
    if (!next) {
      if (readDone) tryEndOfStream()
      return
    }
    try {
      sourceBuffer.appendBuffer(next as BufferSource)
    } catch (e) {
      // QuotaExceeded etc.: live preview stops growing, the full file is still collected
      mseBroken = true
      queue.length = 0
      console.warn('stream preview stopped buffering:', (e as Error).name)
    }
  }

  if (mediaSource) {
    mediaSource.addEventListener('sourceopen', () => {
      if (mediaSource.sourceBuffers.length) return
      try {
        sourceBuffer = mediaSource.addSourceBuffer(mimeType)
        sourceBuffer.mode = 'sequence'
        sourceBuffer.addEventListener('updateend', pump)
      } catch (e) {
        mseBroken = true
        console.warn('addSourceBuffer failed', e)
        return
      }
      pump()
    })
  } else {
    // no live preview; the complete file still plays/downloads once finished
    console.warn('MediaSource unsupported for', mimeType)
  }

  const read = async () => {
    reader = stream.getReader()
    onStart()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (stopped) return
        if (done) break
        if (!value || !value.byteLength) continue
        const bytes = value.slice() // own copy (value may be a view on a larger buffer)
        chunks.push(bytes)
        counter.push(bytes)
        if (!mseBroken) {
          queue.push(bytes)
          pump()
        }
        onProgress()
      }
    } catch (error) {
      if (stopped) return
      console.error('Error reading stream:', error)
      try {
        if (mediaSource?.readyState === 'open') mediaSource.endOfStream('network')
      } catch {
        /* ignore */
      }
      onError((error as Error).message || '流式读取失败')
      return
    } finally {
      reader = null
    }
    readDone = true
    finished = true
    pump() // ends the MediaSource once the queue drains
    let audioNewUrl: string
    let blobs: Blob[]
    try {
      blobs = chunks.map((c) => new Blob([c as BlobPart], { type: mimeType }))
      audioNewUrl = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: mimeType }))
    } catch (e) {
      onError((e as Error).message || '音频组装失败') // never leave the run hanging
      return
    }
    onFinished(audioNewUrl, blobs)
  }
  read().catch((e) => onError((e as Error)?.message || String(e)))

  function downloadAudio() {
    if (!chunks.length) return
    const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: mimeType }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'audio.mp3'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    queue.length = 0
    reader?.cancel().catch(() => {})
    try {
      if (mediaSource?.readyState === 'open' && !sourceBuffer?.updating) mediaSource.endOfStream()
    } catch {
      /* ignore */
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }

  return {
    audioUrl,
    stop,
    isActive: () => !!mediaSource && mediaSource.readyState === 'open',
    getLoadedDuration: () => counter.duration,
    downloadAudio,
    isFinished: () => finished,
  }
}
