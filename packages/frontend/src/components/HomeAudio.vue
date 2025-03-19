<template>
  <div class="audio-player" :class="{ 'is-playing': isPlaying }">
    <div class="player-container">
      <el-button
        circle
        :icon="isPlaying ? VideoPause : CaretRight"
        @click="togglePlay"
      >
      </el-button>
      <div class="progress-container">
        <div class="time current-time">{{ formatTime(currentTime) }}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" @click="seek" ref="progressBar">
            <div
              class="progress-filled"
              :style="{ width: progressPercent + '%' }"
            ></div>
            <div
              class="progress-thumb"
              :style="{ left: progressPercent + '%' }"
            ></div>
          </div>
        </div>
        <div class="time duration">{{ formatTime(duration) }}</div>
      </div>
      <div class="volume-container"></div>
    </div>
    <div>{{ currentVoice }}</div>
  </div>
</template>
<script setup lang="ts">
import Hero from "@/assets/hero.mp3";
import { Refresh, VideoPause, CaretRight } from "@element-plus/icons-vue";
import { ref, onMounted, onBeforeUnmount } from "vue";

// 定义组件名称
defineOptions({
  name: "AppleAudioPlayer",
});

// 响应式状态
const audio = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const isMuted = ref(false);
const currentTime = ref(0);
const currentVoice = ref("晓晓");
const duration = ref(0);
const progressPercent = ref(0);

// 初始化音频
onMounted(() => {
  audio.value = new Audio(Hero);

  audio.value.addEventListener("timeupdate", updateProgress);
  audio.value.addEventListener("loadedmetadata", () => {
    duration.value = audio.value!.duration;
  });
  audio.value.addEventListener("ended", () => {
    isPlaying.value = false;
  });

  // 预加载音频
  audio.value.load();
});

// 清理事件监听
onBeforeUnmount(() => {
  if (audio.value) {
    audio.value.removeEventListener("timeupdate", updateProgress);
    audio.value.pause();
    audio.value = null;
  }
});

// 播放/暂停切换
const togglePlay = () => {
  if (!audio.value) return;
  if (isPlaying.value) {
    audio.value.pause();
  } else {
    audio.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

// 静音切换
const toggleMute = () => {
  if (!audio.value) return;
  isMuted.value = !isMuted.value;
  audio.value.muted = isMuted.value;
};

// 更新进度
const updateProgress = () => {
  if (!audio.value) return;
  currentTime.value = audio.value.currentTime;
  progressPercent.value = (currentTime.value / duration.value) * 100 || 0;

  if (currentTime.value > 3.816) {
    currentVoice.value = "晓伊";
  }
  if (currentTime.value > 8.88) {
    currentVoice.value = "云健";
  }
  if (currentTime.value > 14.4) {
    currentVoice.value = "云希";
  }
  if (currentTime.value > 19.28) {
    currentVoice.value = "云夏";
  }
  if (currentTime.value > 24.632) {
    currentVoice.value = "云阳";
  }
};

// 拖动进度条
const seek = (event: MouseEvent) => {
  if (!audio.value) return;
  const progressBar = (event.target as HTMLElement).closest(".progress-bar");
  if (!progressBar) return;
  const percent = event.offsetX / progressBar.offsetWidth;
  audio.value.currentTime = percent * duration.value;
};

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// 暴露给模板使用的变量和方法
defineExpose({
  togglePlay,
  toggleMute,
  seek,
  formatTime,
});
</script>

<style scoped>
.audio-player {
  margin: 20px auto;
  width: 280px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  transition: all 0.3s ease;
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
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.progress-filled {
  height: 100%;
  background: #007aff;
  border-radius: 2px;
  position: absolute;
  top: 0;
  left: 0;
  transition: width 0.1s ease;
}

.progress-thumb {
  width: 12px;
  height: 12px;
  background: #007aff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
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
