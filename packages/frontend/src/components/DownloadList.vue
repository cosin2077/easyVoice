<template>
  <div
    v-if="store.audioList && store.audioList.length > 0"
    class="download-area"
  >
    <!-- 下载列表标题 -->
    <div class="download-header">
      <span class="header-title">下载列表 ({{ store.audioList.length }})</span>
    </div>

    <!-- 下载列表容器 -->
    <el-scrollbar class="download-list">
      <div
        v-for="(item, index) in store.audioList"
        :key="index"
        class="download-item"
        :class="{ downloading: item.isDownloading }"
      >
        <!-- 文件信息 -->
        <div class="file-info">
          <span class="filename">{{ item.file }}</span>
          <span class="file-size">{{ formatFileSize(item.size || 0) }}</span>
        </div>

        <!-- 操作区域 -->
        <div class="actions">
          <el-button
            type="success"
            size="small"
            round
            @click="playAudio(item, index)"
            :icon="item.isPlaying ? VideoPause : VideoPlay"
          >
            {{ item.isPlaying ? "播放中" : "播放" }}
          </el-button>
          <el-button
            :type="item.isDownloading ? 'primary' : 'success'"
            size="small"
            round
            @click="downloadAudio(item, index)"
            :disabled="item.isDownloading"
            :loading="item.isDownloading"
            :icon="Download"
          >
            {{ item.isDownloading ? "下载中" : "下载" }}
          </el-button>
          <el-tooltip
            content="删除"
            placement="top"
            :disabled="item.isDownloading"
            effect="dark"
          >
            <el-icon class="delete-icon" @click="removeDownloadItem(item)">
              <CircleCloseFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </div>
    </el-scrollbar>

    <!-- 批量操作 -->
    <div class="batch-actions">
      <el-button type="primary" size="small" round @click="downloadAll">
        <el-icon><Download /></el-icon>
        全部下载
      </el-button>
      <el-button type="danger" size="small" round @click="clearAll">
        <el-icon><Delete /></el-icon>
        清空列表
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { downloadFile } from "@/api/tts";
import { useGenerationStore } from "@/stores/generation";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Download,
  CircleCloseFilled,
  Delete,
  VideoPause,
  VideoPlay,
} from "@element-plus/icons-vue";
import { useAudio } from "@/utils/index";
import type { Audio } from "../stores/generation";

const store = useGenerationStore();

const playAudio = async (item: Audio, _: number) => {
  const audio = useAudio(item.audio);
  if (audio.isPlaying.value) {
    audio.pause();
    item.isPlaying = false;
  } else {
    await audio.play();
    item.isPlaying = true;
  }
};
const downloadAudio = (item: Audio, _: number) => {
  if (!item.file) return;
  item.isDownloading = true;
  const url = downloadFile(item.file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `novel_audio_${Date.now()}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success("下载成功！");
  setTimeout(() => {
    item.isDownloading = false;
  }, 1200);
};

const removeDownloadItem = (item: Audio) => {
  if (item.isDownloading) return;
  // 确认删除操作
  ElMessageBox.confirm("确定删除该下载项吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    const newList = store.audioList.filter((audio) => audio !== item);
    store.updateAudioList(newList);
    ElMessage.success("已删除");
  });
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const downloadAll = () => {
  store.audioList.forEach((item, index) => {
    if (!item.isDownloading) {
      downloadAudio(item, index);
    }
  });
};

const clearAll = () => {
  ElMessageBox.confirm("确定清空下载列表吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    store.updateAudioList([]);
    ElMessage.success("已清空");
  });
};
</script>

<style scoped>
.download-area {
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
}

.download-header {
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.download-list {
  max-height: 320px;
  margin: 12px 0;
}

.download-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

.download-item:hover {
  background: #f5f7fa;
}

.download-item.downloading {
  background: #e6f7ff;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.filename {
  color: #606266;
  font-size: 14px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-icon {
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  transition: color 0.3s;
}

.delete-icon:hover {
  color: #f56c6c;
}

.batch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
