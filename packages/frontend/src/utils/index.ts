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

export { createAudioStreamProcessor } from './streamProcessor'
export type { AudioProcessor } from './streamProcessor'

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
