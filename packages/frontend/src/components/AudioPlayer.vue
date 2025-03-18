<template>
  <div class="tts-audio-player">
    <el-slider v-model="progress" :max="100" @change="seek" show-tooltip />
    <div class="controls">
      <el-button
        circle
        :icon="isPlaying ? VideoPause : CaretRight"
        @click="togglePlay"
      />
      <el-button circle :icon="Refresh" @click="replay" />
      <el-text class="time"
        >{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</el-text
      >
    </div>
    <audio
      ref="audio"
      @timeupdate="updateProgress"
      @ended="onEnded"
      @loadedmetadata="updateDuration"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { ElSlider, ElButton, ElText } from "element-plus";
import { Refresh, VideoPause, CaretRight } from "@element-plus/icons-vue";
import type { Arrayable } from "element-plus/es/utils/index.mjs";

// Props: 接收 TTS 生成的音频数据（URL 或 Blob）
const props = defineProps({
  audioData: { type: [String, Blob], required: true },
});

// 状态管理
const audio = ref<HTMLAudioElement>();
const isPlaying = ref(false);
const progress = ref(0);
const currentTime = ref(0);
const duration = ref(0);

// 监听 audioData 变化，动态加载音频
watch(
  () => props.audioData,
  (newData) => {
    // setTimeout(() => {
    if (newData instanceof Blob) {
      if (audio.value) audio.value.src = URL.createObjectURL(newData);
    } else {
      if (audio.value) audio.value.src = newData;
    }
    console.log("Audio source updated:", newData);
    console.log("audio.value:", audio.value);
    audio.value?.load();
    isPlaying.value = false;
    progress.value = 0;
    // });
  },
  { immediate: false }
);

// 播放/暂停
const togglePlay = () => {
  if (isPlaying.value) {
    audio.value?.pause();
  } else {
    audio.value?.play();
  }
  isPlaying.value = !isPlaying.value;
};

// 重播
const replay = () => {
  audio.value!.currentTime = 0;
  audio.value?.play();
  isPlaying.value = true;
};

// 更新进度
const updateProgress = () => {
  currentTime.value = audio.value!.currentTime;
  duration.value = audio.value!.duration;
  progress.value = (currentTime.value / duration.value) * 100 || 0;
};

// 跳转进度
const seek = (value: Arrayable<number>) => {
  if (Array.isArray(value)) return; // 如果是数组，直接忽略（单值滑块不会触发）
  const newTime = (value / 100) * duration.value;
  audio.value!.currentTime = newTime;
};
// 音频结束
const onEnded = () => {
  isPlaying.value = false;
  progress.value = 0;
};

// 更新音频时长
const updateDuration = () => {
  duration.value = audio.value!.duration;
};

// 格式化时间
const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" + sec : sec}`;
};
</script>

<style scoped>
.tts-audio-player {
  width: 300px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.time {
  font-size: 12px;
  color: #666;
}
</style>
