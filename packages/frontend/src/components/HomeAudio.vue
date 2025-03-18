<template>
  <div class="audio-player" :class="{ 'is-playing': isPlaying }">
    <div class="player-container">
      <el-button
        circle
        :icon="isPlaying ? VideoPause : CaretRight"
        @click="togglePlay"
      >
        <VideoPause />
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

<script>
import Hero from "@/assets/hero.mp3";
import { Refresh, VideoPause, CaretRight } from "@element-plus/icons-vue";
export default {
  name: "AppleAudioPlayer",
  components: {
    Refresh,
    VideoPause,
    CaretRight,
  },
  data() {
    return {
      audio: null,
      isPlaying: false,
      isMuted: false,
      currentTime: 0,
      currentVoice: "晓晓",
      duration: 0,
      progressPercent: 0,
    };
  },
  mounted() {
    this.audio = new Audio(Hero);

    this.audio.addEventListener("timeupdate", this.updateProgress);
    this.audio.addEventListener("loadedmetadata", () => {
      this.duration = this.audio.duration;
    });
    this.audio.addEventListener("ended", () => {
      this.isPlaying = false;
    });

    // 预加载音频
    this.audio.load();
  },
  beforeUnmount() {
    this.audio.removeEventListener("timeupdate", this.updateProgress);
    this.audio.pause();
    this.audio = null;
  },
  methods: {
    togglePlay() {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        this.audio.play();
      }
      this.isPlaying = !this.isPlaying;
    },
    toggleMute() {
      this.isMuted = !this.isMuted;
      this.audio.muted = this.isMuted;
    },
    updateProgress() {
      this.currentTime = this.audio.currentTime;
      this.progressPercent = (this.currentTime / this.duration) * 100 || 0;
      if (this.currentTime > 3.816) {
        this.currentVoice = "晓伊";
      }
      if (this.currentTime > 8.88) {
        this.currentVoice = "云健";
      }
      if (this.currentTime > 14.40) {
        this.currentVoice = "云希";
      }
      if (this.currentTime > 19.28) {
        this.currentVoice = "云夏";
      }
      if (this.currentTime > 24.632) {
        this.currentVoice = "云阳";
      }
    },
    seek(event) {
      const progressBar = this.$refs.progressBar;
      const percent = event.offsetX / progressBar.offsetWidth;
      this.audio.currentTime = percent * this.duration;
    },
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    },
  },
};
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
