<template>
  <el-container>
    <el-main>
      <el-input
        v-model="text"
        type="textarea"
        placeholder="输入文本"
        :rows="5"
      />
      <el-upload drag action="#" :auto-upload="false" :on-change="handleFile">
        <div>拖拽或点击上传文本文件</div>
      </el-upload>
      <el-button type="primary" @click="generate" :loading="generating">
        生成配音
      </el-button>
      <el-progress :percentage="progress" v-if="generating" />
      <a v-if="audio" :href="downloadUrl" download>下载配音</a>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useGenerationStore } from "@/stores/generation";
import { generateTTS, downloadFile, getProgress } from "@/api/tts";
import { asyncSleep } from "../utils";

const text = ref("");
const generating = ref(false);
const store = useGenerationStore();
const { progress, audio } = store;

const handleFile = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => (text.value = e.target?.result as string);
  reader.readAsText(file.raw);
};

const generate = async () => {
  generating.value = true;
  try {
    const { data } = await generateTTS({ text: text.value });
    const { id } = data;
    while (true) {
      const {
        data: { progress, success, message },
      } = await getProgress({ id });

      if (progress >= 100 || success) break;
      if (!success && message) {
        console.error(message);
      }
      store.updateProgress(progress);
      await asyncSleep(10 * 1e3);
    }

    store.setAudio(data.audio);
    // 模拟进度（实际需后端推送）
    const interval = setInterval(() => {
      if (progress < 90) store.updateProgress(progress + 10);
      else clearInterval(interval);
    }, 500);
  } catch (error) {
    console.error(error);
  } finally {
    generating.value = false;
  }
};

const downloadUrl = computed(() => (audio ? downloadFile(audio) : ""));
</script>

<style scoped>
.el-container {
  padding: 20px;
}
</style>
