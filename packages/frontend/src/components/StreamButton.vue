<template>
  <div class="tts-audio-player" :class="{ streaming }">
    <audio
      ref="audioRef"
      preload="auto"
      @timeupdate="refresh"
      @loadedmetadata="refresh"
      @durationchange="refresh"
      @progress="refresh"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onended"
    >
      你的浏览器不支持音频播放。
    </audio>
    <div class="controls">
      <el-button text circle aria-label="后退 10 秒" @click="left10">
        <el-icon><DArrowLeft /></el-icon>
      </el-button>
      <el-button type="primary" circle :aria-label="isPlaying ? '暂停' : '播放'" @click="toggle">
        <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
        <el-icon v-else><VideoPause /></el-icon>
      </el-button>
      <el-button text circle aria-label="前进 10 秒" @click="right10">
        <el-icon><DArrowRight /></el-icon>
      </el-button>
    </div>
    <el-slider
      v-model="progress"
      class="progress-slider"
      size="small"
      :max="100"
      :show-tooltip="false"
      :disabled="knownDuration <= 0"
      @change="seek"
      @input="input"
    />
    <span class="time-display" :title="streaming ? '仍在生成，时长随生成增长' : ''">
      {{ formatTime(currentTime) }} / {{ knownDuration > 0 ? formatTime(knownDuration) : '--:--'
      }}<span v-if="streaming" class="growing">+</span>
    </span>
    <el-button text circle class="close" aria-label="关闭播放器" @click="closeThisCard">
      <el-icon><Close /></el-icon>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { debounce } from '@/utils'
import { formatTime } from '@/utils/format'
import { ElButton, ElSlider } from 'element-plus'
import type { Arrayable } from 'element-plus/es/utils/index.mjs'
import { VideoPlay, VideoPause, Close, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'

/**
 * Docked stream player (lives inside the action card; never overlays page content).
 * Duration: while MSE streams, `audio.duration` is Infinity/NaN — we show the exact
 * decoded length streamed so far (`duration` prop, from MP3 frame counting) with a "+".
 * Once final (`streaming=false`), the real media duration wins.
 */
const props = withDefaults(defineProps<{ duration: number; streaming?: boolean }>(), {
  streaming: false,
})
const emit = defineEmits(['close'])
const audioRef = ref<HTMLAudioElement | null>(null)
const progress = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const knownDuration = ref(0)

const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0

function refresh() {
  const a = audioRef.value
  let d = 0
  if (a && finite(a.duration)) d = a.duration
  else if (finite(props.duration)) d = props.duration
  else if (a && a.buffered.length) d = a.buffered.end(a.buffered.length - 1)
  knownDuration.value = d
  if (a) currentTime.value = a.currentTime
  progress.value = d > 0 ? Math.min(100, (currentTime.value / d) * 100) : 0
}
watch(() => [props.duration, props.streaming], refresh)

const closeThisCard = () => emit('close', realClose)
const realClose = () => {
  stop()
  if (audioRef.value) audioRef.value.src = ''
}
const toggle = () => {
  const a = audioRef.value
  if (!a) return
  if (a.paused) a.play().catch(() => {})
  else a.pause()
}
const left10 = () => {
  const a = audioRef.value
  if (a) a.currentTime = Math.max(a.currentTime - 10, 0)
}
const right10 = () => {
  const a = audioRef.value
  if (a && knownDuration.value > 0) a.currentTime = Math.min(a.currentTime + 10, knownDuration.value)
}
const stop = () => {
  const a = audioRef.value
  if (a) {
    a.pause()
    a.currentTime = 0
  }
  progress.value = 0
  currentTime.value = 0
}
const onended = () => {
  isPlaying.value = false
}
const seekTo = (value: number) => {
  const a = audioRef.value
  if (a && knownDuration.value > 0) a.currentTime = (value / 100) * knownDuration.value
}
const seek = (value: Arrayable<number>) => {
  if (!Array.isArray(value)) seekTo(value)
}
const input = debounce((value: Arrayable<number>) => {
  if (!Array.isArray(value)) seekTo(value)
}, 100)

defineExpose({ audioRef, refresh })
</script>

<style scoped>
.tts-audio-player {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 8px 8px 8px 10px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #fafafa;
}
.controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.controls .el-button.is-text {
  color: #3a3a3a;
}
.controls .el-button {
  margin: 0;
}
.progress-slider {
  min-width: 80px;
}
.progress-slider :deep(.el-slider__runway) {
  background: #e0e0e0;
}
.time-display {
  font-size: 13px;
  color: #3a3a3a;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.growing {
  color: #6b6b6b;
  margin-left: 1px;
}
.close {
  color: #525252;
  margin: 0;
}
@media (max-width: 480px) {
  .tts-audio-player {
    grid-template-columns: auto 1fr auto;
    row-gap: 4px;
  }
  .progress-slider {
    grid-column: 1 / -1;
    order: 3;
  }
}
</style>
