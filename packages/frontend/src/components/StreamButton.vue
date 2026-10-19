<template>
  <div class="tts-audio-player">
    <audio ref="audioRef" @timeupdate="updateProgress" @ended="onended">
      你的浏览器不支持音频播放。
    </audio>
    <div class="controls">
      <el-button circle @click="left10">
        <el-icon><DArrowLeft /></el-icon>
      </el-button>
      <el-button :type="isPlaying ? 'warning' : 'primary'" circle size="large" @click="toggle">
        <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
        <el-icon v-else><VideoPause /></el-icon>
      </el-button>
      <el-button circle @click="right10">
        <el-icon><DArrowRight /></el-icon>
      </el-button>
    </div>
    <div class="progress-container">
      <el-slider
        size="small"
        v-model="progress"
        :max="100"
        :show-tooltip="false"
        @change="seek"
        @input="input"
        class="progress-slider"
      />
    </div>
    <div class="time-display">
      <span>{{ formatTime(currentTime) }}<template v-if="displayDuration > 0"> / {{ formatTime(displayDuration) }}</template></span>
    </div>
    <span class="close" @click="closeThisCard">
      <el-icon><Close /></el-icon>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { debounce } from '@/utils'
import { ElButton, ElSlider } from 'element-plus'
import type { Arrayable } from 'element-plus/es/utils/index.mjs'
import { VideoPlay, VideoPause, Close, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'

interface Prop {
  duration: number
}
const props = defineProps<Prop>()
const emit = defineEmits(['close'])
const audioRef = ref<HTMLAudioElement | null>(null)
const progress = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)

const closeThisCard = () => {
  emit('close', realClose)
}
const realClose = () => {
  stop()
  isPlaying.value = false

  progress.value = 0
  currentTime.value = 0

  if (audioRef.value) {
    audioRef.value.src = ''
  }
}
const toggle = () => {
  if (isPlaying.value) {
    pause().then(() => (isPlaying.value = false))
  } else {
    play().then(() => (isPlaying.value = true))
  }
}
const left10 = () => {
  audioRef.value!.currentTime = Math.max(audioRef.value!.currentTime - 10, 0)
}
const right10 = () => {
  audioRef.value!.currentTime = Math.min(audioRef.value!.currentTime + 10, audioRef.value!.duration)
}
const play = async () => audioRef.value!.play()
const pause = async () => audioRef.value!.pause()

const stop = () => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
    progress.value = 0
    currentTime.value = 0
  }
}

const displayDuration = ref(0)
const updateProgress = () => {
  if (!audioRef.value) return
  currentTime.value = audioRef.value.currentTime
  const d =
    Number.isFinite(audioRef.value.duration) && audioRef.value.duration > 0
      ? audioRef.value.duration
      : Number.isFinite(props.duration) && props.duration > 0
        ? props.duration
        : 0
  displayDuration.value = d
  progress.value = d > 0 ? (currentTime.value / d) * 100 : 0
}

const onended = () => {
  isPlaying.value = false
}

const seek = (value: Arrayable<number>) => {
  if (Array.isArray(value)) return
  const d = displayDuration.value || props.duration
  if (audioRef.value && d > 0) {
    audioRef.value.currentTime = (value / 100) * d
  }
}
const input = debounce((value: Arrayable<number>) => {
  if (Array.isArray(value)) return
  const d = displayDuration.value || props.duration
  if (audioRef.value && d > 0) {
    audioRef.value.currentTime = (value / 100) * d
  }
}, 100)

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '0:00'
  const m = Math.floor(time / 60)
  const sec = Math.floor(time % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
defineExpose({
  audioRef,
})
</script>

<style scoped>
.tts-audio-player {
  margin: 10px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  width: 300px;
  transition: all 0.3s ease;
  position: relative;
}

.tts-audio-player:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.el-button {
  font-size: 18px;
  padding: 10px;
  transition: transform 0.2s ease;
}

.el-button:hover {
  transform: scale(1.1);
}

.progress-container {
  width: 100%;
  padding: 0 10px;
  margin-bottom: 10px;
}

.progress-slider {
  width: 100%;
}

.time-display {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.7);
  padding: 5px 10px;
  border-radius: 20px;
}
.close {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.close:hover {
  transform: scale(1.1);
}

.tts-audio-player {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 40;
  width: min(420px, calc(100vw - 24px));
  margin: 0 !important;
  padding: 14px 16px 12px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #d4d4d4;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
}
.controls { display: flex; justify-content: center; gap: 10px; }
.controls .el-button { color: #1a1a1a; }
.time-display {
  text-align: center;
  font-size: 13px;
  color: #3a3a3a;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}
.close {
  position: absolute;
  top: 8px;
  right: 10px;
  color: #525252;
  cursor: pointer;
}
.close:hover { color: #1a1a1a; }
.progress-slider :deep(.el-slider__runway) { background: #e5e5e5; }
.progress-slider :deep(.el-slider__bar) { background: var(--el-color-primary); }

</style>
