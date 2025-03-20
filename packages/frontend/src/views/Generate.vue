<template>
  <div class="novel-to-audio-container">
    <!-- 顶部标题 -->
    <div class="header">
      <h1>文本转语音</h1>
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
            v-model="audioConfig.inputText"
            type="textarea"
            placeholder="请输入或粘贴文本"
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
            <el-radio-group v-model="audioConfig.voiceMode" size="large">
              <el-radio-button label="preset">预设语音</el-radio-button>
              <el-tooltip
                content="通过AI推荐不同的角色语音，即将推出，尽请期待！"
                placement="top"
                effect="light"
              >
                <el-radio-button label="ai" disabled>
                  AI 推荐
                  <Sparkles
                    class="sparkles-icon"
                    :size="24"
                    :stroke-width="1.25"
                  />
                </el-radio-button>
              </el-tooltip>
            </el-radio-group>
          </div>

          <!-- 预设语音选择 -->
          <div v-if="audioConfig.voiceMode === 'preset'" class="voice-selector">
            <el-form label-position="top">
              <el-form-item label="语言">
                <el-select
                  v-model="audioConfig.selectedLanguage"
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
                  v-model="audioConfig.selectedGender"
                  placeholder="选择性别"
                  @change="filterVoices"
                >
                  <el-option label="全部" value="All" />
                  <el-option label="男性" value="Male" />
                  <el-option label="女性" value="Female" />
                </el-select>
              </el-form-item>

              <el-form-item label="语音">
                <el-select
                  v-model="audioConfig.selectedVoice"
                  placeholder="选择语音"
                  filterable
                >
                  <el-option
                    v-for="voice in filteredVoices"
                    :key="voice.Name"
                    :label="voice.cnName"
                    :value="voice.Name"
                  >
                    <div class="voice-option">
                      <span>{{ voice.cnName || voice.Name }}</span>
                      <Sparkles
                        :size="16"
                        :stroke-width="1.25"
                        style="margin-left: 10px; color: red"
                        v-if="voice.Name === 'zh-CN-YunxiNeural'"
                      />
                      <!-- <span class="voice-personality">{{
                        voice.VoicePersonalities.join(", ")
                      }}</span> -->
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="语速">
                <el-slider
                  v-model="audioConfig.rate"
                  :min="-99"
                  :max="99"
                  :format-tooltip="formatRate"
                />
              </el-form-item>

              <el-form-item label="音量">
                <el-slider
                  v-model="audioConfig.volume"
                  :min="-99"
                  :max="99"
                  :format-tooltip="formatVolume"
                />
              </el-form-item>
              <el-form-item label="音调">
                <el-slider
                  v-model="audioConfig.pitch"
                  :min="-99"
                  :max="99"
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
                  v-model="audioConfig.openaiBaseUrl"
                  placeholder="https://api.openai.com/v1"
                />
              </el-form-item>

              <el-form-item label="API Key">
                <el-input
                  v-model="audioConfig.openaiKey"
                  type="password"
                  show-password
                  placeholder="sk-..."
                />
              </el-form-item>

              <el-form-item label="模型">
                <el-select
                  v-model="audioConfig.openaiModel"
                  placeholder="选择模型"
                >
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
                v-model="audioConfig.previewText"
                placeholder="输入短文本进行试听"
                :disabled="!canPreview"
              />
            </el-form-item>
            <el-button
              type="primary"
              @click="previewAudio"
              :disabled="!canPreview || previewLoading"
              :loading="previewLoading"
              :icon="Service"
            >
              试听
            </el-button>
            <audio
              ref="audioPlayer"
              v-show="audioConfig.previewAudioUrl"
              controls="false"
              class="preview-audio"
              :src="audioConfig.previewAudioUrl"
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
      <el-button type="danger" size="large" @click="reset">
        重置配置
      </el-button>
    </div>
    <DownloadList />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useGenerationStore } from "@/stores/generation";
import { useAudioConfigStore, type AudioConfig } from "@/stores/audioConfig";
import { generateTTS, getProgress, getVoiceList, type Voice } from "@/api/tts";
import { Sparkles } from "lucide-vue-next";
import { UploadFilled, Service } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { defaultVoiceList, previewTextSelect } from "@/constants/voice";
import { mapZHVoiceName } from "@/utils";
import DownloadList from "@/components/DownloadList.vue";
import { AxiosError } from "axios";
// 状态管理
const generationStore = useGenerationStore();
const configStore = useAudioConfigStore();
const { audioConfig } = configStore;

const generating = ref(false);
const progressStatus = ref("准备中...");

const previewLoading = ref(false);
const audioPlayer = ref<HTMLAudioElement>();

const voiceList = ref<Voice[]>(defaultVoiceList);

const languages = ref([
  { code: "zh-CN", name: "中文（简体）" },
  { code: "zh-TW", name: "中文（繁体）" },
  { code: "zh-HK", name: "中文（香港）" },
  { code: "en-US", name: "英语（美国）" },
  { code: "en-GB", name: "英语（英国）" },
  { code: "en-AU", name: "英语（澳大利亚）" },
  { code: "en-CA", name: "英语（加拿大）" },
]);

const reset = () => {
  ElMessageBox.confirm("确定将配置重置为初始状态", "操作提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    configStore.reset();
  });
};
const updateConfig = (prop: keyof AudioConfig, value: string) => {
  configStore.updateConfig(prop, value);
};
const betterShowCN = (voiceList: Voice[]) => {
  if (audioConfig.selectedLanguage?.includes("zh-")) {
    return voiceList.map((voice) => {
      return {
        ...voice,
        cnName: mapZHVoiceName(voice.Name) ?? voice.Name,
      };
    });
  }
  return voiceList;
};
// 过滤后的语音列表
const filteredVoices = computed(() => {
  return betterShowCN(
    voiceList.value.filter((voice) => {
      const matchLanguage = voice.Name.startsWith(audioConfig.selectedLanguage);
      const matchGender =
        audioConfig.selectedGender === "All" ||
        voice.Gender === audioConfig.selectedGender;
      return matchLanguage && matchGender;
    })
  );
});

// 是否可以生成语音
const canGenerate = computed(() => {
  const {
    inputText,
    voiceMode,
    openaiBaseUrl,
    openaiKey,
    openaiModel,
    selectedVoice,
  } = audioConfig;
  if (!inputText.trim()) return false;

  if (voiceMode === "preset") {
    return !!selectedVoice;
  } else {
    return !!openaiBaseUrl && !!openaiKey && !!openaiModel;
  }
});

// 是否可以试听
const canPreview = computed(() => {
  const { voiceMode, openaiBaseUrl, openaiKey, openaiModel, selectedVoice } =
    audioConfig;
  if (voiceMode === "preset") {
    return !!selectedVoice;
  } else {
    return !!openaiBaseUrl && !!openaiKey && !!openaiModel;
  }
});

// 格式化语速显示
const formatRate = (val: number) => {
  return val > 0 ? `+${val}%` : `${val}%`;
};
const formatVolume = (val: number) => {
  return val >= 0 ? `+${val}%` : `${val}%`;
};

// 格式化音调显示
const formatPitch = (val: number) => {
  return val >= 0 ? `+${val}Hz` : `${val}Hz`;
};
watch(audioConfig, (audioConfig) => {
  const value = audioConfig.selectedLanguage;
  const matchLang = /([a-zA-Z]{2,5}-[a-zA-Z]{2,5}\b)/.exec(value)?.[1];
  if (matchLang && matchLang in previewTextSelect) {
    updateConfig(
      `previewText`,
      previewTextSelect[matchLang as keyof typeof previewTextSelect]
    );
  }
});
const commonErrorHandler = (error: unknown) => {
  if (error instanceof AxiosError) {
    const status = error.status;
    switch (status) {
      case 429:
        return handle429(error);
      case 400:
        return handle400(error);
      default:
        ElMessage.error("请求失败！");
    }
  }
};
const handle429 = (error: unknown) => {
  if (error instanceof AxiosError) {
    if (error.status === 429) {
      ElMessage.error("请求太快啦，小服务器扛不住！请稍后再试");
    }
  }
};
const handle400 = (error: AxiosError) => {
  const { errors } = error?.response?.data as any;
  if (errors?.some((error: any) => error.code === "too_small")) {
    ElMessage.error("请至少输入5个字符以上！");
  } else {
    ElMessage.error("请求失败！");
  }
};
// 加载语音数据
onMounted(async () => {
  try {
    const response = await getVoiceList();
    voiceList.value = response?.data?.data;
  } catch (error) {
    handle429(error);
  }
});

// 处理文件上传
const handleFile = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    updateConfig("inputText", e.target?.result as string);
  };
  reader.readAsText(file.raw);
};

// 清空文本
const clearText = () => {
  updateConfig("inputText", "");
};

// 根据语言和性别过滤语音
const filterVoices = () => {
  const { selectedVoice, selectedGender } = audioConfig;
  const isCurrentVoiceValid = filteredVoices.value.some(
    (v) => v.Name === selectedVoice
  );
  if (
    (!isCurrentVoiceValid && filteredVoices.value.length > 0) ||
    selectedGender === "All"
  ) {
    updateConfig("selectedVoice", filteredVoices.value[0].Name);
  } else {
    updateConfig("selectedVoice", "");
  }
};

// 试听功能
const previewAudio = async () => {
  const {
    previewText,
    selectedVoice,
    rate,
    pitch,
    volume,
    openaiBaseUrl,
    openaiKey,
    openaiModel,
    voiceMode,
  } = audioConfig;
  if (!previewText.trim() || !canPreview.value) return;
  previewLoading.value = true;
  try {
    // 构建请求参数
    const params: any = {
      text: previewText,
    };

    if (voiceMode === "preset") {
      params.voice = selectedVoice;
      params.rate = `${rate > 0 ? "+" : ""}${rate}%`;
      params.pitch = `${pitch > 0 ? "+" : ""}${pitch}Hz`;
      params.volume = `${volume > 0 ? "+" : ""}${volume}%`;
    } else {
      params.useLLM = true;
      params.openaiBaseUrl = openaiBaseUrl;
      params.openaiKey = openaiKey;
      params.openaiModel = openaiModel;
    }

    const { data } = await generateTTS(params);
    updateConfig("previewAudioUrl", data.audio);

    setTimeout(() => {
      // Next tick to ensure the audio element is updated
      (audioPlayer?.value as HTMLAudioElement).play();
    });
  } catch (error) {
    console.error("Preview failed:", error);
    commonErrorHandler(error);
  } finally {
    previewLoading.value = false;
  }
};

// 生成音频
const generateAudio = async () => {
  if (!audioConfig.inputText.trim() || !canGenerate.value) return;
  const {
    rate,
    pitch,
    volume,
    openaiBaseUrl,
    openaiKey,
    openaiModel,
    voiceMode,
    selectedVoice,
  } = audioConfig;
  generating.value = true;
  generationStore.updateProgress(0);
  progressStatus.value = "准备中...";

  try {
    // 构建请求参数
    const params: any = {
      text: audioConfig.inputText,
    };

    if (voiceMode === "preset") {
      params.voice = selectedVoice;
      params.rate = `${rate >= 0 ? "+" : ""}${rate}%`;
      params.pitch = `${pitch >= 0 ? "+" : ""}${pitch}Hz`;
      params.volume = `${volume >= 0 ? "+" : ""}${volume}%`;
    } else {
      params.useLLM = true;
      params.openaiBaseUrl = openaiBaseUrl;
      params.openaiKey = openaiKey;
      params.openaiModel = openaiModel;
    }
    const { data } = await generateTTS(params);
    const audioItem = {
      audio: data.audio,
      file: data.file,
      size: data.size,
      isDownloading: false,
      isPlaying: false,
      progress: 0,
    };
    const newAudioList = [...generationStore.audioList, audioItem];
    generationStore.updateAudioList(newAudioList);
    progressStatus.value = "生成完成！";
    ElMessage.success("语音生成成功！");
    generating.value = false;
    if (Math.random() > 1e5) {
      // TODO: 根据ID轮询进度，展示不同文案
      pooling("123");
    }
  } catch (error) {
    console.error("生成失败:", error);
    commonErrorHandler(error);
    generating.value = false;
  }
};
const pooling = async (id: string) => {
  // 轮询进度
  let intervalId: number | null = null;
  try {
    intervalId = window.setInterval(async () => {
      try {
        const { data: progressData } = await getProgress({ id });
        const {
          progress: currentProgress,
          success,
          message,
          url,
        } = progressData;

        // 更新进度和状态
        generationStore.updateProgress(currentProgress);

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
          generationStore.setAudio(url);
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
.sparkles-icon {
  position: absolute;
  top: -8px;
  right: 2px;
}
.voice-selector,
.ai-settings {
  margin-bottom: 1.5rem;
}

.voice-option {
  display: flex;
  flex-direction: row;
  align-items: center;
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
  justify-content: center;
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
    /* flex: 0.5; */
  }
}
</style>
