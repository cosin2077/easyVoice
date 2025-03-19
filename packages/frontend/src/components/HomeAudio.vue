<template>
  <div class="audio-player" :class="{ 'is-playing': isPlaying }">
    <div class="player-container">
      <el-button
        circle
        :icon="isPlaying ? VideoPause : CaretRight"
        @click="togglePlay"
      />
      <div class="progress-container">
        <div class="time current-time">{{ formatTime(currentTime) }}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" @click="seek" ref="progressBar">
            <!-- 添加分段颜色 -->
            <div class="progress-segments">
              <div
                v-for="(segment, index) in voiceSegments"
                :key="index"
                class="segment"
                :style="segmentStyle(segment)"
                :title="`${segment.voice} (${formatTime(
                  segment.start
                )} - ${formatTime(segment.end)})`"
              ></div>
            </div>
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
    </div>
    <!-- 声音名称展示区 -->
    <div class="voice-display">
      <transition name="voice-fade" mode="out-in">
        <div class="voice-info" :key="currentVoice.voice">
          <el-avatar :size="24" :src="currentVoice.avatar" />
          <el-tag
            class="voice-name"
            @click="jumpToVoice(currentVoice.voice)"
            :style="{ color: currentVoice.textColor }"
            effect="light"
            :color="currentVoice.color"
          >
            {{ currentVoice.voice }}
          </el-tag>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import Hero from "@/assets/hero.mp3";
import { Refresh, VideoPause, CaretRight } from "@element-plus/icons-vue";
import { ref, onMounted, onBeforeUnmount } from "vue";

defineOptions({
  name: "AppleAudioPlayer",
});
const avatar =
  "https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png";
const audio = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const currentVoice = ref({ voice: "晓晓", avatar: avatar });
const duration = ref(0);
const progressPercent = ref(0);

// 定义声音时间段
const voiceSegments = [
  {
    voice: "晓晓",
    start: 0,
    end: 3.816,
    avatar,
    color: "rgba(255, 107, 107, 0.3)",
    textColor: "#ff6b6b",
  },
  {
    voice: "晓伊",
    start: 3.816,
    end: 8.88,
    avatar,
    color: "rgba(78, 205, 196, 0.3)",
    textColor: "#4ecdc4",
  },
  {
    voice: "云健",
    start: 8.88,
    end: 14.4,
    avatar,
    color: "rgba(69, 183, 209, 0.3)",
    textColor: "#45b7d1",
  },
  {
    voice: "云希",
    start: 14.4,
    end: 19.28,
    avatar,
    color: "rgba(150, 201, 61, 0.3)",
    textColor: "#96c93d",
  },
  {
    voice: "云夏",
    start: 19.28,
    end: 24.232,
    avatar,
    color: "rgba(247, 215, 148, 0.3)",
    textColor: "#f7d794",
  },
  {
    voice: "云阳",
    start: 24.232,
    end: Infinity,
    avatar,
    color: "rgba(119, 139, 235, 0.3)",
    textColor: "#778beb",
  },
];

onMounted(() => {
  audio.value = new Audio(Hero);
  audio.value.addEventListener("timeupdate", updateProgress);
  audio.value.addEventListener("loadedmetadata", () => {
    duration.value = audio.value!.duration;
  });
  audio.value.addEventListener("ended", () => {
    isPlaying.value = false;
  });
  audio.value.load();
});

onBeforeUnmount(() => {
  if (audio.value) {
    audio.value.removeEventListener("timeupdate", updateProgress);
    audio.value.pause();
    audio.value = null;
  }
});

const togglePlay = () => {
  if (!audio.value) return;
  if (isPlaying.value) {
    audio.value.pause();
  } else {
    audio.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const updateProgress = () => {
  if (!audio.value) return;
  currentTime.value = audio.value.currentTime;
  progressPercent.value = (currentTime.value / duration.value) * 100 || 0;

  // 更新当前声音
  const currentSegment = voiceSegments.find(
    (segment) =>
      currentTime.value >= segment.start && currentTime.value < segment.end
  );
  if (currentSegment) {
    currentVoice.value = currentSegment;
  }
};

const seek = (event: MouseEvent) => {
  if (!audio.value) return;
  const progressBar = (event.target as HTMLElement).closest(".progress-bar");
  if (!progressBar) return;
  
  // 获取进度条的边界信息
  const rect = progressBar.getBoundingClientRect();
  // 计算点击位置相对于进度条左边缘的偏移量
  const offsetX = event.clientX - rect.left;
  // 计算百分比
  const percent = offsetX / rect.width;
  audio.value.currentTime = percent * duration.value;
};

// 计算分段样式
const segmentStyle = (segment: (typeof voiceSegments)[0]) => {
  const startPercent = (segment.start / duration.value) * 100;
  const endPercent = Math.min((segment.end / duration.value) * 100, 100);
  return {
    left: `${startPercent}%`,
    width: `${endPercent - startPercent}%`,
    backgroundColor: getSegmentColor(segment.voice),
  };
};
const voiceColors = {
  晓晓: "#ff6b6b",
  晓伊: "#4ecdc4",
  云健: "#45b7d1",
  云希: "#96c93d",
  云夏: "#f7d794",
  云阳: "#778beb",
};
// 为不同声音分配颜色
const getSegmentColor = (voice: string) => {
  return voiceColors[voice] || "#007aff";
};

// 跳转到指定声音
const jumpToVoice = (voice: string) => {
  const segment = voiceSegments.find((s) => s.voice === voice);
  if (segment && audio.value) {
    audio.value.currentTime = segment.start;
    if (!isPlaying.value) togglePlay();
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

defineExpose({
  togglePlay,
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
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.segment:hover {
  opacity: 0.5;
}

.voice-display {
  margin-top: 8px;
  text-align: center;
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
  height: 6px;
  /* background: #e0e0e0; */
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
