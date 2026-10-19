<template>
  <div class="audio-player" :class="{ 'is-playing': isPlaying }">
    <div class="player-container">
      <el-button circle :icon="isPlaying ? VideoPause : CaretRight" @click="togglePlay" />
      <div class="progress-container">
        <div class="time current-time">{{ formatTime(currentTime) }}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" @mousedown="seek" ref="progressBar">
            <!-- 添加分段颜色 -->
            <div class="progress-segments">
              <div
                v-for="(segment, index) in voiceSegments"
                :key="index"
                class="segment"
                :style="segmentStyle(segment)"
                :title="`${segment.voice} (${formatTime(segment.start)} - ${formatTime(
                  segment.end
                )})`"
              ></div>
            </div>
            <div class="progress-filled" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
          </div>
        </div>
        <div class="time duration">{{ formatTime(duration) }}</div>
      </div>
    </div>
    <!-- 声音名称展示区 -->
    <div class="voice-display" v-if="currentVoice?.voice">
      <transition name="voice-bubble" mode="out-in">
        <div class="voice-bubble-wrapper" :key="currentVoice.voice">
          <div class="voice-bubble" :style="{ backgroundColor: currentVoice.color }">
            <el-avatar :size="28" :src="currentVoice.avatar" class="bubble-avatar" />
            <span
              class="voice-name"
              @click="jumpToVoice(currentVoice.voice)"
              :style="{ color: currentVoice.textColor }"
            >
              <span>{{ currentVoice.voice }}</span>
              <ChatLineRound size="14" class="chat-line-round-icon" />
            </span>
            <!-- 气泡尾巴 -->
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '@/utils/format'
import Hero from '@/assets/hero.mp3'
import { VideoPause, CaretRight, ChatLineRound } from '@element-plus/icons-vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import zhCNYunyangNeural from '@/assets/avatar/zh-CN-YunyangNeural.png'
import zhCNXiaoxiaoNeural from '@/assets/avatar/zh-CN-XiaoxiaoNeural.png'
import zhCNYunxiNeural from '@/assets/avatar/zh-CN-YunxiNeural.png'
import zhMale from '@/assets/avatar/zh-CN-standard-male.svg'
import zhFemale from '@/assets/avatar/zh-CN-standard-female.svg'

defineOptions({
  name: 'AppleAudioPlayer',
})

const progressBar = ref<HTMLElement | null>(null)
const audio = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const currentVoice = ref()
const duration = ref(0)
const progressPercent = ref(0)

const colorMap = {
  徐凤年: (opacity = 1) => `rgba(255, 135, 135, ${opacity})`,
  姜泥: (opacity = 1) => `rgba(100, 100, 211, ${opacity})`,
  路人甲: (opacity = 1) => `rgba(90, 185, 138, ${opacity})`,
  路人乙: (opacity = 1) => `rgba(163, 217, 100, ${opacity})`,
  旁白1: (opacity = 1) => `rgba(245, 225, 164, ${opacity})`,
  旁白2: (opacity = 1) => `rgba(245, 215, 100, ${opacity})`,
  卢白撷: (opacity = 1) => `rgba(142, 158, 239, ${opacity})`,
}
type VoiceColor = keyof typeof colorMap
const getVoiceColor = (name: VoiceColor, opacity: number = 1) => colorMap[name](opacity)
const voiceColors = Object.fromEntries(
  Object.entries(colorMap).map(([key, fn]) => [key, fn(1)])
) as {
  [K in VoiceColor]: string
}
const voiceSegments = [
  {
    voice: '徐凤年',
    start: 0,
    end: 4.237,
    avatar: zhMale,
    color: getVoiceColor('徐凤年', 0.3),
    textColor: getVoiceColor('徐凤年'),
  },
  {
    voice: '姜泥',
    start: 4.337,
    end: 7.8,
    avatar: zhCNXiaoxiaoNeural,
    color: getVoiceColor('姜泥', 0.3),
    textColor: getVoiceColor('姜泥'),
  },
  {
    voice: '路人甲',
    start: 7.81,
    end: 13.0,
    avatar: zhFemale,
    color: getVoiceColor('路人甲', 0.3),
    textColor: getVoiceColor('路人甲'),
  },
  {
    voice: '路人乙',
    start: 13.1,
    end: 17.8,
    avatar: zhFemale,
    color: getVoiceColor('路人乙', 0.3),
    textColor: getVoiceColor('路人乙'),
  },
  {
    voice: '旁白1',
    start: 17.9,
    end: 36.4,
    avatar: zhCNYunxiNeural,
    color: getVoiceColor('旁白1', 0.3),
    textColor: getVoiceColor('旁白1'),
  },
  {
    voice: '旁白2',
    start: 36.5,
    end: 69.8,
    avatar: zhCNYunxiNeural,
    color: getVoiceColor('旁白2', 0.3),
    textColor: getVoiceColor('旁白2'),
  },
  {
    voice: '卢白撷',
    start: 69.81,
    end: 9999, // until metadata; clamped in formatTime/segmentStyle
    avatar: zhCNYunyangNeural,
    color: getVoiceColor('卢白撷', 0.3),
    textColor: getVoiceColor('卢白撷'),
  },
]

onMounted(() => {
  audio.value = new Audio(Hero)
  audio.value.addEventListener('timeupdate', updateProgress)
  audio.value.addEventListener('loadedmetadata', () => {
    duration.value = audio.value!.duration
    const last = voiceSegments[voiceSegments.length - 1]
    if (last && (!Number.isFinite(last.end) || last.end > duration.value)) {
      last.end = duration.value
    }
  })
  audio.value.addEventListener('ended', () => {
    isPlaying.value = false
  })
  audio.value.load()
})

onBeforeUnmount(() => {
  if (audio.value) {
    audio.value.removeEventListener('timeupdate', updateProgress)
    audio.value.pause()
    audio.value = null
  }
})

const togglePlay = () => {
  if (!audio.value) return
  ;(globalThis as any).audio = audio.value
  if (isPlaying.value) {
    audio.value.pause()
  } else {
    audio.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const updateProgress = () => {
  if (!audio.value) return
  currentTime.value = audio.value.currentTime
  progressPercent.value = (currentTime.value / duration.value) * 100 || 0

  const currentSegment = voiceSegments.find(
    (segment) => currentTime.value >= segment.start && currentTime.value < segment.end
  )
  if (currentSegment) {
    currentVoice.value = currentSegment
  }
}

const seek = (event: MouseEvent) => {
  if (!audio.value || !progressBar.value) return

  const updatePosition = (e: MouseEvent) => {
    const rect = progressBar.value!.getBoundingClientRect()
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percent = offsetX / rect.width
    progressPercent.value = percent * 100 // 实时更新进度百分比
    audio.value!.currentTime = percent * duration.value
  }

  updatePosition(event)

  const onMouseMove = (e: MouseEvent) => updatePosition(e)
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const segmentStyle = (segment: (typeof voiceSegments)[0]) => {
  const dur = duration.value > 0 ? duration.value : 1
  const startPercent = (segment.start / dur) * 100
  const endPercent = Math.min((Math.min(segment.end, dur) / dur) * 100, 100)
  return {
    left: `${startPercent}%`,
    width: `${endPercent - startPercent}%`,
    backgroundColor: getSegmentColor(segment.voice),
  }
}

const getSegmentColor = (voice: string) => {
  if (voice in voiceColors) {
    return voiceColors[voice as VoiceColor]
  }
  return '#007aff'
}

const jumpToVoice = (voice: string) => {
  const segment = voiceSegments.find((s) => s.voice === voice)
  if (segment && audio.value) {
    audio.value.currentTime = segment.start
    if (!isPlaying.value) togglePlay()
  }
}


defineExpose({
  togglePlay,
  seek,
  formatTime,
})
</script>

<style scoped>
.audio-player {
  margin: 20px auto;
  max-width: 300px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  transition: all 0.3s ease;
}
.audio-player:hover {
  transform: scale(1.1);
}
/* 新增样式 */
.progress-segments {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

.segment {
  height: 100%;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.segment:hover {
  opacity: 1;
}

.voice-display {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.voice-bubble-wrapper {
  position: relative;
}
.voice-bubble {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.voice-bubble:hover {
  transform: scale(1.05);
}

.bubble-avatar {
  flex-shrink: 0;
}
.voice-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.chat-line-round-icon {
  margin-left: 2px;
  height: 20px;
  /* transition: transform 0.3s ease; */
}

/* 气泡动画 */
.voice-bubble-enter-active,
.voice-bubble-leave-active {
  transition: all 0.3s ease;
}

.voice-bubble-enter-from,
.voice-bubble-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.9);
}
.voice-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}
.voice-name {
  cursor: pointer;
  transition: all 0.3s ease;
}

.voice-name:hover {
  /* background: #e0e0e0; */
  transform: scale(1.05);
}

.voice-fade-enter-active,
.voice-fade-leave-active {
  transition: all 0.1s ease;
}

.voice-fade-enter-from,
.voice-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.audio-player.is-playing {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.player-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.time {
  font-size: 11px;
  color: #555;
  min-width: 30px;
}

.progress-bar-container {
  flex-grow: 1;
}

.progress-bar {
  height: 8px;
  /* background: #e0e0e0; */
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.progress-filled {
  height: 100%;
  background: #007aff;
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.2s ease;
}

.progress-thumb {
  width: 12px;
  height: 12px;
  background: #007aff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-6px, -50%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-bar:hover .progress-thumb {
  opacity: 1;
}

/* 响应式调整 */
@media (max-width: 320px) {
  .audio-player {
    width: 240px;
    padding: 8px;
  }

  .time {
    font-size: 10px;
  }
}
</style>
