<!-- 下载区域 -->
<template>
  <div
    v-if="store.audioList && store.audioList.length > 0"
    class="download-area"
  >
    <!-- 下载列表容器 -->
    <div class="download-list">
      <div
        v-for="(item, index) in store.audioList"
        :key="index"
        class="download-item"
      >
        <!-- 下载按钮和文件信息 -->
        <el-button
          type="success"
          size="large"
          @click="downloadAudio(item, index)"
          :disabled="item.isDownloading"
          :loading="item.isDownloading"
        >
          <el-icon>
            <download v-if="!item.isDownloading" />
            <loading v-else />
          </el-icon>
          <span>{{ item.isDownloading ? "下载中" : "下载" }}</span>
        </el-button>
        <span class="filename">{{ item.file }}</span>
        <!-- 文件大小显示 -->
        <span class="file-size">{{ formatFileSize(item.size || 0) }}</span>
        <!-- 删除按钮 -->
        <el-icon class="delete-icon" v-if="!item.isDownloading">
          <CircleCloseFilled @click="removeDownloadItem(index)" />
        </el-icon>
      </div>
    </div>
    <!-- 批量操作 -->
    <div class="batch-actions">
      <el-button type="primary" size="small" @click="downloadAll">
        全部下载
      </el-button>
      <el-button type="danger" size="small" @click="clearAll">
        清空列表
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { downloadFile } from "@/api/tts";
import { useGenerationStore } from "@/stores/generation";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, CircleCloseFilled } from "@element-plus/icons-vue";
import type { Audio } from "../stores/generation";
const store = useGenerationStore();

const downloadAudio = (item: Audio, _: number) => {
  console.log("store.file: ", item.file);
  if (!item.file) return;
  console.log("file: ", item.file);
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
  }, 200);
};

// 删除单个下载项
const removeDownloadItem = (index: number) => {
  ElMessageBox.confirm("确定删除该下载项吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    const newList = store.audioList.filter((_, i) => i !== index);
    store.updateAudioList(newList);
    ElMessage.success("已删除");
  });
};

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 下载全部
const downloadAll = () => {
  store.audioList.forEach((item, index) => {
    if (!item.isDownloading) {
      downloadAudio(item, index);
    }
  });
};

// 清空列表
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
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-top: 20px;
}

.download-list {
  max-height: 300px;
  overflow-y: auto;
}

.download-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.download-item:last-child {
  border-bottom: none;
}

.filename {
  margin-left: 10px;
  max-width: 600px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  margin: 0 15px;
  color: #909399;
  font-size: 12px;
}

.download-progress {
  flex: 1;
  margin: 0 15px;
}

.delete-icon {
  cursor: pointer;
  color: #909399;
  margin-left: 10px;
}

.delete-icon:hover {
  color: #f56c6c;
}

.batch-actions {
  margin-top: 15px;
  text-align: right;
}
</style>
