<template>
  <div class="novel-to-audio-container">
    <!-- 顶部标题 -->
    <div class="header">
      <h1>小说转语音</h1>
      <p class="subtitle">将您的文本一键转换为自然流畅的语音</p>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧：文本输入和文件上传 -->
      <el-col :span="16">
        <el-card class="input-card">
          <template #header>
            <div class="card-header">
              <span>文本输入</span>
              <el-button type="primary" size="small" @click="clearText"
                >清空</el-button
              >
            </div>
          </template>
          <el-input
            v-model="text"
            type="textarea"
            placeholder="请输入或粘贴小说文本"
            :rows="12"
            resize="none"
          />
          <div class="upload-area">
            <el-upload
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFile"
              :show-file-list="false"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                拖拽文件到此处或 <em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">支持 .txt 文本文件</div>
              </template>
            </el-upload>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：语音设置和控制 -->
      <el-col :span="8">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>语音设置</span>
            </div>
          </template>

          <!-- 语音选择模式切换 -->
          <div class="voice-mode-selector">
            <el-radio-group v-model="voiceMode" size="large">
              <el-radio-button label="preset">预设语音</el-radio-button>
              <el-radio-button label="ai">AI 推荐</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 预设语音选择 -->
          <div v-if="voiceMode === 'preset'" class="voice-selector">
            <el-form label-position="top">
              <el-form-item label="语言">
                <el-select
                  v-model="selectedLanguage"
                  placeholder="选择语言"
                  @change="filterVoices"
                >
                  <el-option
                    v-for="lang in languages"
                    :key="lang.code"
                    :label="lang.name"
                    :value="lang.code"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="性别">
                <el-select
                  v-model="selectedGender"
                  placeholder="选择性别"
                  @change="filterVoices"
                >
                  <el-option label="全部" value="" />
                  <el-option label="男性" value="Male" />
                  <el-option label="女性" value="Female" />
                </el-select>
              </el-form-item>

              <el-form-item label="语音">
                <el-select
                  v-model="selectedVoice"
                  placeholder="选择语音"
                  filterable
                >
                  <el-option
                    v-for="voice in filteredVoices"
                    :key="voice.Name"
                    :label="voice.Name"
                    :value="voice.Name"
                  >
                    <div class="voice-option">
                      <span>{{ voice.Name }}</span>
                      <span class="voice-personality">{{
                        voice.VoicePersonalities.join(", ")
                      }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="语速">
                <el-slider
                  v-model="rate"
                  :min="-50"
                  :max="50"
                  :format-tooltip="formatRate"
                />
              </el-form-item>

              <el-form-item label="音调">
                <el-slider
                  v-model="pitch"
                  :min="-10"
                  :max="10"
                  :format-tooltip="formatPitch"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- AI 推荐设置 -->
          <div v-else class="ai-settings">
            <el-form label-position="top">
              <el-form-item label="OpenAI API URL">
                <el-input
                  v-model="openaiBaseUrl"
                  placeholder="https://api.openai.com/v1"
                />
              </el-form-item>

              <el-form-item label="API Key">
                <el-input
                  v-model="openaiKey"
                  type="password"
                  show-password
                  placeholder="sk-..."
                />
              </el-form-item>

              <el-form-item label="模型">
                <el-select v-model="openaiModel" placeholder="选择模型">
                  <el-option label="gpt-3.5-turbo" value="gpt-3.5-turbo" />
                  <el-option label="gpt-4" value="gpt-4" />
                  <el-option label="gpt-4-turbo" value="gpt-4-turbo" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>

          <!-- 试听功能 -->
          <div class="preview-section">
            <el-form-item label="试听文本">
              <el-input
                v-model="previewText"
                placeholder="输入短文本进行试听"
                :disabled="!canPreview"
              />
            </el-form-item>
            <el-button
              type="primary"
              @click="previewAudio"
              :disabled="!canPreview || previewLoading"
              :loading="previewLoading"
            >
              试听
            </el-button>
            <audio
              v-if="previewAudioUrl"
              controls
              class="preview-audio"
              :src="previewAudioUrl"
            ></audio>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部操作区域 -->
    <div class="action-area">
      <el-button
        type="primary"
        size="large"
        @click="generateAudio"
        :loading="generating"
        :disabled="!canGenerate"
      >
        生成语音
      </el-button>

      <!-- 进度条 -->
      <div v-if="generating || progress > 0" class="progress-container">
        <el-progress
          :percentage="progress"
          :status="progress >= 100 ? 'success' : ''"
          :stroke-width="20"
        >
          <template #default="{ percentage }">
            <span class="progress-text">{{ percentage.toFixed(0) }}%</span>
          </template>
        </el-progress>
        <div class="progress-status">{{ progressStatus }}</div>
      </div>

      <!-- 下载区域 -->
      <div v-if="audio" class="download-area">
        <el-button type="success" size="large" @click="downloadAudio">
          <el-icon><download /></el-icon>
          下载语音文件
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useGenerationStore } from "@/stores/generation";
import {
  generateTTS,
  downloadFile,
  getProgress,
  getVoiceList,
  type Voice,
} from "@/api/tts";
import { UploadFilled, Download } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { defaultVoiceList } from "@/constants/voice";

// 状态管理
const store = useGenerationStore();
const { progress, audio } = store;

// 文本输入
const text = ref("");
const generating = ref(false);
const progressStatus = ref("准备中...");

// 语音设置
const voiceMode = ref("preset");
const selectedLanguage = ref("zh-CN");
const selectedGender = ref("");
const selectedVoice = ref("zh-CN-XiaoxiaoNeural");
const rate = ref(0);
const pitch = ref(0);

// AI 设置
const openaiBaseUrl = ref("");
const openaiKey = ref("");
const openaiModel = ref("gpt-3.5-turbo");

// 试听功能
const previewText = ref("这是一段测试文本，用于试听语音效果。");
const previewAudioUrl = ref("");
const previewLoading = ref(false);

// 语音数据
const voices = ref<Voice[]>(defaultVoiceList);
const languages = ref([
  { code: "zh-CN", name: "中文（简体）" },
  { code: "zh-TW", name: "中文（繁体）" },
  { code: "zh-HK", name: "中文（香港）" },
  { code: "en-US", name: "英语（美国）" },
  { code: "en-GB", name: "英语（英国）" },
  { code: "en-AU", name: "英语（澳大利亚）" },
  { code: "en-CA", name: "英语（加拿大）" },
  { code: "en-IN", name: "英语（印度）" },
]);

// 过滤后的语音列表
const filteredVoices = computed(() => {
  return voices.value.filter((voice) => {
    const matchLanguage = voice.Name.startsWith(selectedLanguage.value);
    const matchGender =
      !selectedGender.value || voice.Gender === selectedGender.value;
    return matchLanguage && matchGender;
  });
});

// 是否可以生成语音
const canGenerate = computed(() => {
  if (!text.value.trim()) return false;

  if (voiceMode.value === "preset") {
    return !!selectedVoice.value;
  } else {
    return !!openaiBaseUrl.value && !!openaiKey.value && !!openaiModel.value;
  }
});

// 是否可以试听
const canPreview = computed(() => {
  if (voiceMode.value === "preset") {
    return !!selectedVoice.value;
  } else {
    return !!openaiBaseUrl.value && !!openaiKey.value && !!openaiModel.value;
  }
});

// 格式化语速显示
const formatRate = (val: number) => {
  return val > 0 ? `+${val}%` : `${val}%`;
};

// 格式化音调显示
const formatPitch = (val: number) => {
  return val > 0 ? `+${val}Hz` : `${val}Hz`;
};

// 加载语音数据
onMounted(async () => {
  try {
    // 这里应该从后端获取语音列表，暂时使用模拟数据
    const response = await getVoiceList();
    voices.value = response.data;
  } catch (error) {
    console.error("Failed to load voices:", error);
  }
});

// 处理文件上传
const handleFile = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    text.value = e.target?.result as string;
  };
  reader.readAsText(file.raw);
};

// 清空文本
const clearText = () => {
  text.value = "";
};

// 根据语言和性别过滤语音
const filterVoices = () => {
  // 如果当前选择的语音不在过滤后的列表中，重置选择
  const isCurrentVoiceValid = filteredVoices.value.some(
    (v) => v.Name === selectedVoice.value
  );
  if (!isCurrentVoiceValid && filteredVoices.value.length > 0) {
    selectedVoice.value = filteredVoices.value[0].Name;
  }
};

// 试听功能
const previewAudio = async () => {
  if (!previewText.value.trim() || !canPreview.value) return;

  previewLoading.value = true;
  try {
    // 构建请求参数
    const params: any = {
      text: previewText.value,
    };

    if (voiceMode.value === "preset") {
      params.voice = selectedVoice.value;
      params.rate = `${rate.value > 0 ? "+" : ""}${rate.value}%`;
      params.pitch = `${pitch.value > 0 ? "+" : ""}${pitch.value}Hz`;
    } else {
      params.useLLM = true;
      params.openaiBaseUrl = openaiBaseUrl.value;
      params.openaiKey = openaiKey.value;
      params.openaiModel = openaiModel.value;
    }

    const { data } = await generateTTS(params);
    previewAudioUrl.value = downloadFile(data.audio);
  } catch (error) {
    console.error("Preview failed:", error);
    ElMessage.error("试听失败，请稍后重试");
  } finally {
    previewLoading.value = false;
  }
};

// 生成音频
const generateAudio = async () => {
  if (!text.value.trim() || !canGenerate.value) return;

  generating.value = true;
  store.updateProgress(0);
  progressStatus.value = "准备中...";

  try {
    // 构建请求参数
    const params: any = {
      text: text.value,
    };

    if (voiceMode.value === "preset") {
      params.voice = selectedVoice.value;
      params.rate = `${rate.value > 0 ? "+" : ""}${rate.value}%`;
      params.pitch = `${pitch.value > 0 ? "+" : ""}${pitch.value}Hz`;
    } else {
      params.useLLM = true;
      params.openaiBaseUrl = openaiBaseUrl.value;
      params.openaiKey = openaiKey.value;
      params.openaiModel = openaiModel.value;
    }

    const { data } = await generateTTS(params);
    const { id } = data;

    // 轮询进度
    let intervalId: number | null = null;
    try {
      intervalId = window.setInterval(async () => {
        try {
          const { data: progressData } = await getProgress({ id });
          const { progress: currentProgress, success, message } = progressData;

          // 更新进度和状态
          store.updateProgress(currentProgress);

          // 更新进度状态文本
          if (currentProgress < 20) {
            progressStatus.value = "分析文本中...";
          } else if (currentProgress < 40) {
            progressStatus.value = "生成语音中...";
          } else if (currentProgress < 70) {
            progressStatus.value = "处理音频中...";
          } else if (currentProgress < 90) {
            progressStatus.value = "优化音频质量...";
          } else {
            progressStatus.value = "即将完成...";
          }

          // 检查是否完成
          if (currentProgress >= 100 || success) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            store.setAudio(data.audio);
            progressStatus.value = "生成完成！";
            ElMessage.success("语音生成成功！");
            generating.value = false;
          }

          // 检查是否有错误
          if (!success && message) {
            console.error(message);
            ElMessage.error(`生成失败: ${message}`);
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            generating.value = false;
          }
        } catch (error) {
          console.error("获取进度失败:", error);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          generating.value = false;
        }
      }, 2000);
    } catch (error) {
      console.error("设置进度轮询失败:", error);
      if (intervalId) {
        clearInterval(intervalId);
      }
      generating.value = false;
    }
  } catch (error) {
    console.error("生成失败:", error);
    ElMessage.error("生成失败，请稍后重试");
    generating.value = false;
  }
};

// 下载音频
const downloadAudio = () => {
  if (!audio) return;
  console.log("audio: ", audio);
  const url = downloadFile(audio);
  const link = document.createElement("a");
  link.href = url;
  link.download = `novel_audio_${Date.now()}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<style scoped>
.novel-to-audio-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  color: #2c3e50;
}

.header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1a56db;
}

.subtitle {
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.input-card,
.settings-card {
  height: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.input-card:hover,
.settings-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.el-input.el-input--large {
  margin-bottom: 1rem;
}

.upload-area {
  margin-top: 1.5rem;
  border-top: 1px dashed #e2e8f0;
  padding-top: 1.5rem;
}

.voice-mode-selector {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.voice-selector,
.ai-settings {
  margin-bottom: 1.5rem;
}

.voice-option {
  display: flex;
  flex-direction: column;
}

.voice-personality {
  font-size: 0.8rem;
  color: #64748b;
}

.preview-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px dashed #e2e8f0;
}

.preview-audio {
  width: 100%;
  margin-top: 1rem;
}

.action-area {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-container {
  width: 100%;
  max-width: 600px;
  margin: 1.5rem auto;
}

.progress-text {
  font-weight: 600;
  color: #1a56db;
}

.progress-status {
  text-align: center;
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
}

.download-area {
  margin-top: 1.5rem;
  text-align: center;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .novel-to-audio-container {
    padding: 1.5rem 1rem;
  }
}

@media (max-width: 992px) {
  .header h1 {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .el-row {
    display: flex;
    flex-direction: column;
  }

  .el-col {
    width: 100% !important;
    max-width: 100%;
    flex: 0 0 100%;
    margin-bottom: 1.5rem;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.8rem;
  }

  .action-area {
    margin-top: 1rem;
  }
}

@media (max-width: 576px) {
  .novel-to-audio-container {
    padding: 1rem 0.75rem;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .voice-mode-selector .el-radio-group {
    width: 100%;
    display: flex;
  }

  .voice-mode-selector .el-radio-button {
    flex: 1;
  }
}
</style>
