export const asyncSleep = (delay = 200) => new Promise((resolve) => setTimeout(resolve, delay))

// Chinese display names (gender comes from the voice list, not from this table)
const zhVoiceMap = {
  'zh-CN-XiaoxiaoNeural': '晓晓',
  'zh-CN-XiaoyiNeural': '晓伊',
  'zh-CN-YunjianNeural': '云健',
  'zh-CN-YunxiNeural': '云希',
  'zh-CN-YunxiaNeural': '云夏',
  'zh-CN-YunyangNeural': '云扬',
  'zh-CN-liaoning-XiaobeiNeural': '晓北（东北话）',
  'zh-CN-shaanxi-XiaoniNeural': '晓妮（陕西话）',
  'zh-HK-HiuGaaiNeural': '曉佳（粤语）',
  'zh-HK-HiuMaanNeural': '曉曼（粤语）',
  'zh-HK-WanLungNeural': '雲龍（粤语）',
  'zh-TW-HsiaoChenNeural': '曉臻（台湾）',
  'zh-TW-HsiaoYuNeural': '曉雨（台湾）',
  'zh-TW-YunJheNeural': '雲哲（台湾）',
} as const

type VoiceKey = keyof typeof zhVoiceMap

export const mapZHVoiceName = (name: string): string | undefined => {
  if (name in zhVoiceMap) {
    return zhVoiceMap[name as VoiceKey]
  }
  return undefined
}
import { ref, type Ref } from 'vue'
import { Mp3DurationCounter } from './mp3'
interface AudioController {
  play: () => Promise<void>
  pause: () => void
  toggle: () => void
  destroy: () => void
  isPlaying: Ref<boolean> // 暴露响应式的 isPlaying
}

const audioCache = new Map<string, AudioController>()

export function useAudio(mp3Url: string): AudioController {
  if (audioCache.has(mp3Url)) {
    return audioCache.get(mp3Url)!
  }

  const isPlaying = ref(false) // 使用 ref 使其响应式
  let audio: HTMLAudioElement | null = null

  const initAudio = () => {
    if (!audio) {
      audio = new Audio(mp3Url)
      audio.addEventListener('ended', () => {
        isPlaying.value = false
      })
    }
  }

  const play = async () => {
    initAudio()
    if (audio && !isPlaying.value) {
      await audio.play()
      isPlaying.value = true
    }
  }

  const pause = () => {
    if (audio && isPlaying.value) {
      audio.pause()
      isPlaying.value = false
    }
  }

  const toggle = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  const destroy = () => {
    if (audio) {
      audio.pause()
      audio.removeEventListener('ended', () => {})
      audio = null
      isPlaying.value = false
      audioCache.delete(mp3Url)
    }
  }

  const controller: AudioController = { play, pause, toggle, destroy, isPlaying }
  audioCache.set(mp3Url, controller)
  return controller
}

interface AudioProcessor {
  audioUrl: string // 用于绑定到 <audio> 元素的 src
  appendBuffer: (data: ArrayBuffer) => void // 追加音频数据
  stop: () => void // 停止并清理资源
  isActive: () => boolean // 检查 MediaSource 是否活跃
  getLoadedDuration: () => number // 返回duration
  downloadAudio: () => void // 返回duration
  finished: boolean // 是否结束缓冲流
  isFinished: () => boolean // 流是否已完整读完
}

/**
 * 创建一个基于 MediaSource 的音频流处理器
 * @param stream axios 返回的 ReadableStream
 * @param mimeType 音频流的 MIME 类型，默认为 'audio/mpeg'
 * @returns AudioProcessor 接口
 */

// TODO: 动态缓冲区
export function createAudioStreamProcessor(
  stream: ReadableStream<Uint8Array>,
  onStart: () => void,
  onProgress: () => void,
  onFinished: (audioNewUrl: string, blobs: Blob[]) => void,
  onError: (msg: string) => void,
  mimeType: string = 'audio/mpeg'
): AudioProcessor {
  if (typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported(mimeType)) {
    onError(
      '当前浏览器不支持流式试听（MediaSource），请使用最新 Chrome/Edge，或等待生成结束后下载音频。'
    )
  }
  const mediaSource = typeof MediaSource !== 'undefined' ? new MediaSource() : (null as any)
  let sourceBuffer: SourceBuffer | null = null
  let isAppending = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let blobs: { blob: Blob }[] = []
  // exact duration from MP3 frame headers (the old fixed 48 kbps guess was 2x off for 96 kbps)
  const counter = new Mp3DurationCounter()
  let finished = false
  let stopped = false
  let stopBuffering = false
  const audioUrl = mediaSource ? URL.createObjectURL(mediaSource) : ''

  mediaSource?.addEventListener('sourceopen', async () => {
    if (!mediaSource || mediaSource.sourceBuffers.length) return
    const sb = mediaSource.addSourceBuffer(mimeType)
    sb.mode = 'sequence'
    sourceBuffer = sb

    sb.addEventListener('updateend', () => {
      isAppending = false
      if (
        mediaSource.readyState === 'open' &&
        reader === null &&
        sb.buffered.length === 0
      ) {
        mediaSource.endOfStream()
      }
    })
    onStart()
    await startReadingStream()
  })
  // 读取流并追加数据
  async function startReadingStream() {
    reader = stream.getReader()
    const cleanup = () => {
      reader = null
      if (stopped) return // user cancelled: never report success
      if (!sourceBuffer?.updating && mediaSource.readyState === 'open') {
        mediaSource.endOfStream()
      }
      const audioBlob = new Blob(
        blobs.map((b) => b.blob),
        { type: mimeType }
      )
      const audioNewUrl = URL.createObjectURL(audioBlob)
      finished = true
      onFinished(
        audioNewUrl,
        blobs.map((b) => b.blob)
      )
    }
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          cleanup()
          break
        }
        if (value) {
          await appendBuffer(value.buffer)
          const blob = new Blob([value.buffer], { type: mimeType })
          counter.push(value)
          blobs.push({ blob })
          onProgress()
        }
      }
    } catch (error) {
      if (stopped) return
      console.error('Error reading stream:', error)
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream('network')
      }
      onError((error as Error).message)
    }
  }

  async function appendBuffer(data: ArrayBuffer): Promise<void> {
    if (stopBuffering) return
    if (!sourceBuffer || mediaSource.readyState !== 'open') {
      return
    }
    if (sourceBuffer.updating || isAppending) {
      await new Promise((resolve) => {
        sourceBuffer!.addEventListener('updateend', resolve, { once: true })
      })
    }

    try {
      isAppending = true
      sourceBuffer.appendBuffer(data)
    } catch (error) {
      isAppending = false
      if ((error as Error).name === 'QuotaExceededError') {
        stopBuffering = true
        console.log('stop buffering...')
      } else {
        console.error('Error appending buffer:', error)
      }
    }
  }
  function downloadAudio() {
    if (blobs.length === 0) {
      console.warn('No audio data to download.')
      return
    }
    const audioBlob = new Blob(
      blobs.map((b) => b.blob),
      { type: mimeType }
    )
    const url = URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url
    const ext = mimeType.split('/')[1]
    a.download = 'audio.' + (ext === 'mpeg' ? 'mp3' : ext || 'mp3')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const getLoadedDuration = () => counter.duration
  const stop = () => {
    stopped = true
    try {
      if (reader) {
        reader.cancel().catch(() => {})
        reader = null
      }
      if (mediaSource && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream()
        } catch {
          /* already ended */
        }
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    } catch (e) {
      console.warn('stop stream processor', e)
    }
  }
  const isActive = () => !!mediaSource && mediaSource.readyState === 'open'
  const isFinished = () => finished
  return {
    audioUrl,
    appendBuffer,
    stop,
    isActive,
    getLoadedDuration,
    downloadAudio,
    finished,
    isFinished,
  }
}

export const toFixed = (num: number | string, toFixed = 2) => {
  return Number(Number(num).toFixed(toFixed))
}

export const throttle = <T extends (...args: any[]) => void>(fn: T, wait: number) => {
  let lastTime = 0
  return (...args: Parameters<T>): void => {
    const now = Date.now()
    if (now - lastTime >= wait) {
      fn(...args)
      lastTime = now
    }
  }
}

export const debounce = <T extends (...args: any[]) => void>(fn: T, wait: number) => {
  let timer: NodeJS.Timeout | null = null
  return (...args: Parameters<T>): void => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, wait)
  }
}
export const mockProgress = (toFixed = 2) => {
  let currentProgress = 0
  let lastCallTime: number | null = null
  let velocity = 0

  function increase() {
    const now = Date.now()
    if (lastCallTime !== null) {
      const timeDiff = now - lastCallTime
      const frequencyFactor = Math.min(Math.max(2000 / timeDiff, 0.1), 2)
      velocity = velocity * 0.7 + frequencyFactor * 0.3
    }
    lastCallTime = now

    const remaining = 100 - currentProgress
    const baseIncrement = (Math.random() * 5 + 0.1) * velocity
    const increment = Math.min(baseIncrement, remaining * 0.2) * (1 - currentProgress / 100)

    currentProgress += increment
    currentProgress = Math.min(currentProgress, 99.99)

    return Number(currentProgress.toFixed(toFixed))
  }
  return { increase }
}
