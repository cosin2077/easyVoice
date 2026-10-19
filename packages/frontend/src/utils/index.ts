export const asyncSleep = (delay = 200) => new Promise((resolve) => setTimeout(resolve, delay))

const zhVoiceMap = {
  'zh-CN-XiaoxiaoNeural': 'zh-CN-晓晓', // 标准普通话女声
  'zh-CN-XiaoyiNeural': 'zh-CN-晓伊', // 普通话男声
  'zh-CN-YunjianNeural': 'zh-CN-云健', // 普通话男声，剑指坚韧风格
  'zh-CN-YunxiNeural': 'zh-CN-云希', // 普通话男声，温和自然
  'zh-CN-YunxiaNeural': 'zh-CN-云夏', // 普通话女声，清新夏日感
  'zh-CN-YunyangNeural': 'zh-CN-云扬', // 普通话男声，阳刚有力
  'zh-CN-liaoning-XiaobeiNeural': 'zh-CN-辽宁-晓北', // 辽宁方言女声，亲切东北风
  'zh-CN-shaanxi-XiaoniNeural': 'zh-CN-陕西-晓妮', // 陕西方言女声，带秦腔韵味
  'zh-HK-HiuGaaiNeural': 'zh-HK-曉佳', // 粤语女声，优雅港风
  'zh-HK-HiuMaanNeural': 'zh-HK-曉曼', // 粤语女声，温柔细腻
  'zh-HK-WanLungNeural': 'zh-HK-雲龍', // 粤语男声，沉稳有力
  'zh-TW-HsiaoChenNeural': 'zh-TW-曉臻', // 台湾普通话女声，清晨般清新
  'zh-TW-HsiaoYuNeural': 'zh-TW-曉雨', // 台湾普通话女声，柔和优雅
  'zh-TW-YunJheNeural': 'zh-TW-雲哲', // 台湾普通话男声，睿智沉稳
} as const

type VoiceKey = keyof typeof zhVoiceMap

export const mapZHVoiceName = (name: string): string | undefined => {
  if (name in zhVoiceMap) {
    return zhVoiceMap[name as VoiceKey]
  }
  return undefined
}
import { ref, type Ref } from 'vue'
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
  let blobs: { duration: number; blob: Blob }[] = []
  let bitrate = 48_000 // match edge output audio-24khz-48kbitrate-mono-mp3
  let finished = false
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
      if (!sourceBuffer?.updating && mediaSource.readyState === 'open') {
        mediaSource.endOfStream()
      }
      const audioBlob = new Blob(
        blobs.map((b) => b.blob),
        { type: mimeType }
      )
      const audioNewUrl = URL.createObjectURL(audioBlob)
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
          const blobDuration = (blob.size * 8) / bitrate
          blobs.push({ blob, duration: blobDuration })
          onProgress()
        }
      }
    } catch (error) {
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
  const getLoadedDuration = () => {
    const totalDuration = blobs.reduce((acc, blob) => acc + blob.duration, 0)
    return totalDuration
  }
  const stop = () => {
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
  const isActive = () => mediaSource.readyState === 'open'
  return {
    audioUrl,
    appendBuffer,
    stop,
    isActive,
    getLoadedDuration,
    downloadAudio,
    finished,
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
