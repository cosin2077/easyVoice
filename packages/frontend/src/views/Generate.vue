<template>
  <div class="novel-to-audio-container">
    <div class="header">
      <h1>文本转语音</h1>
      <p class="subtitle">将您的文本一键转换为自然流畅的语音</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="input-card">
          <template #header>
            <div class="card-header">
              <span>文本输入</span>
              <el-button type="primary" size="small" @click="clearText">清空</el-button>
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
              accept=".txt"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
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
                content="通过AI推荐不同的角色语音！(实验性功能，结果取决于模型能力！)"
                placement="top"
                effect="light"
              >
                <el-radio-button label="ai">
                  AI 推荐
                  <Sparkles class="sparkles-icon" :size="24" :stroke-width="1.25" />
                </el-radio-button>
              </el-tooltip>
            </el-radio-group>
          </div>

          <!-- 预设语音选择 -->
          <div v-if="audioConfig.voiceMode === 'preset'" class="voice-selector">
            <el-form label-position="top" size="default">
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
                <el-select v-model="audioConfig.selectedVoice" placeholder="选择语音" filterable>
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

          <div v-else class="ai-settings">
            <el-form label-position="top">
              <el-form-item label="OpenAI API URL">
                <el-input
                  v-model="audioConfig.openaiBaseUrl"
                  clearable
                  placeholder="https://api.openai.com/v1"
                />
              </el-form-item>

              <el-form-item label="API Key">
                <el-input
                  v-model="audioConfig.openaiKey"
                  type="password"
                  show-password
                  clearable
                  placeholder="sk-..."
                />
              </el-form-item>

              <el-form-item label="模型">
                <el-input v-model="audioConfig.openaiModel" clearable placeholder="gpt-4o..." />
              </el-form-item>
            </el-form>
          </div>

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
    <div class="action-area">
      <el-button
        type="primary"
        size="large"
        @click="handleGenerate"
        :loading="generating"
        :disabled="!canGenerate"
      >
        生成语音
      </el-button>
      <el-button :disabled="generating" type="danger" size="large" @click="reset">
        重置配置
      </el-button>
    </div>
    <div class="progress-bar">
      <el-progress
        v-if="generating"
        style="margin: 0px auto; max-width: 400px"
        :stroke-width="12"
        :percentage="generationStore.progress"
        :color="customColors"
      />
    </div>
    <StreamButton
      ref="audioPlayerRef"
      v-if="showStreamButton"
      :duration="streamDuration"
      @close="handleClose"
    />
    <DownloadList />
  </div>
</template>

<script setup lang="ts">
import { AxiosError } from 'axios'
import { Sparkles } from 'lucide-vue-next'
import { ref, computed, onMounted, watch, onBeforeMount, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useGenerationStore } from '@/stores/generation'
import { UploadFilled, Service } from '@element-plus/icons-vue'
import {
  asyncSleep,
  createAudioStreamProcessor,
  mapZHVoiceName,
  mockProgress,
  toFixed,
} from '@/utils'
import confetti from 'canvas-confetti'
import { useAudioConfigStore, type AudioConfig } from '@/stores/audioConfig'
import { defaultVoiceList, previewTextSelect } from '@/constants/voice'
import { buildLanguageOptions } from '@/constants/locales'
import DownloadList from '@/components/DownloadList.vue'
import Notification from '@/assets/notification.mp3'
import StreamButton from '@/components/StreamButton.vue'
import {
  generateTTS,
  getVoiceList,
  type Voice,
  type GenerateResponse,
  createTaskStream,
} from '@/api/tts'

const generationStore = useGenerationStore()
const configStore = useAudioConfigStore()
const { audioConfig } = configStore

const streamDuration = ref<number>(0)

const generating = ref(false)
const previewLoading = ref(false)
const showStreamButton = ref(false)

const successAudio = ref<HTMLAudioElement>()
const audioPlayer = ref<HTMLAudioElement>()
const confettiElement = ref<HTMLElement | null>(null)

const voiceList = ref<Voice[]>(defaultVoiceList)
const audioPlayerRef = ref<InstanceType<typeof StreamButton> | null>(null)
const processor = ref<ReturnType<typeof createAudioStreamProcessor> | null>(null)

const languages = ref(buildLanguageOptions(defaultVoiceList))
const customColors = [
  { color: '#f5222d', percentage: 10 }, // 红色 (开始/较低)
  { color: '#fa541c', percentage: 20 }, // 橘红
  { color: '#fa8c16', percentage: 30 }, // 橘黄
  { color: '#fadb14', percentage: 40 }, // 黄色
  { color: '#fadb14', percentage: 50 }, // 黄色 (中间状态)
  { color: '#a0d911', percentage: 60 }, // 酸橙绿
  { color: '#73d13d', percentage: 70 }, // 浅绿
  { color: '#52c41a', percentage: 80 }, // 绿色
  { color: '#52c41a', percentage: 90 }, // 绿色 (接近完成)
  { color: '#52c41a', percentage: 100 }, // 纯绿 (完成)
]

const handleClose = (realClose: () => void) => {
  if (generating.value) {
    ElMessageBox.confirm('确定关闭吗，这将停止当前的生成任务', '操作提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      realClose()
      generating.value = false
      generationStore.updateProgress(0)
      processor.value!.stop()
      showStreamButton.value = false
    })
  } else {
    realClose()
    showStreamButton.value = false
  }
}
const reset = () => {
  ElMessageBox.confirm('确定将配置重置为初始状态', '操作提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    configStore.reset()
  })
}
const updateConfig = (prop: keyof AudioConfig, value: string) => {
  configStore.updateConfig(prop, value)
}
const betterShowCN = (voiceList: Voice[]) => {
  if (audioConfig.selectedLanguage?.includes('zh-')) {
    return voiceList.map((voice) => {
      return {
        ...voice,
        cnName: mapZHVoiceName(voice.Name) ?? voice.Name,
      }
    })
  }
  return voiceList
}
const filteredVoices = computed(() => {
  return betterShowCN(
    voiceList.value.filter((voice) => {
      const matchLanguage = voice.Name.startsWith(audioConfig.selectedLanguage)
      const matchGender =
        audioConfig.selectedGender === 'All' || voice.Gender === audioConfig.selectedGender
      return matchLanguage && matchGender
    })
  )
})

const canGenerate = computed(() => {
  const { inputText, voiceMode, openaiBaseUrl, openaiKey, openaiModel, selectedVoice } = audioConfig
  if (!inputText.trim()) return false

  if (voiceMode === 'preset') {
    return !!selectedVoice
  } else {
    return (!!openaiBaseUrl && !!openaiKey && !!openaiModel) || true
  }
})

const canPreview = computed(() => {
  const { voiceMode, selectedVoice } = audioConfig
  if (voiceMode === 'preset') {
    return !!selectedVoice
  } else {
    return true
  }
})

const formatRate = (val: number) => {
  return val > 0 ? `+${val}%` : `${val}%`
}
const formatVolume = (val: number) => {
  return val >= 0 ? `+${val}%` : `${val}%`
}

const formatPitch = (val: number) => {
  return val >= 0 ? `+${val}Hz` : `${val}Hz`
}
watch(
  () => audioConfig.selectedLanguage,
  (value, oldValue) => {
    if (value === oldValue) return
    const matchLang = /([a-zA-Z]{2,5}-[a-zA-Z]{2,5}\b)/.exec(value)?.[1]
    if (matchLang && matchLang in previewTextSelect) {
      updateConfig(`previewText`, previewTextSelect[matchLang as keyof typeof previewTextSelect])
    }
  }
)
const handleStreamError = async (error: AxiosError) => {
  if (
    error?.response?.headers['content-type']?.includes('application/json') &&
    error?.response?.data instanceof ReadableStream
  ) {
    const responseData = JSON.parse(await new Response(error.response.data as any).text())
    error.response.data = responseData
  }
}
const commonErrorHandler = async (error: unknown) => {
  if (error instanceof AxiosError) {
    const status = error.status
    await handleStreamError(error)
    switch (status) {
      case 400:
        return handle400(error)
      case 429:
        return handle429(error)
      case 500:
        return handle500(error)
      default:
        ElMessage.error('请求失败！')
    }
  }
}

const handle400 = (error: AxiosError) => {
  const { errors, message } = error?.response?.data as any
  if (message) {
    if (message === 'English model cannot process non-English text') {
      ElMessage.error(`英文模型不支持转中文语音哦！请切换模型到中文！`)
    } else {
      ElMessage.error(message)
    }
  } else if (errors?.length) {
    ElMessage.error(errors[0].message)
  } else {
    ElMessage.error(error.message || '操作失败!')
  }
}
const handle429 = (error: unknown) => {
  if (error instanceof AxiosError) {
    if (error.status === 429) {
      ElMessage.error('请求太快啦，小服务器扛不住！请稍后再试')
    }
  }
}
const handle500 = (error: AxiosError) => {
  const { message } = error?.response?.data as any
  if (message) {
    ElMessage.error(message)
  } else {
    ElMessage.error(error.message || '操作失败!')
  }
}
const playSuccessSound = () => {
  if (successAudio.value) {
    successAudio.value.currentTime = 0
    successAudio.value.play().catch((error) => {
      console.error('播放音效失败:', error)
    })
  }
}

const handleFile = (file: any) => {
  const reader = new FileReader()
  const { name, type } = file.raw
  if (type !== 'text/plain') {
    ElMessage.error('请上传 txt 文本！')
    console.log(name, type)
    return
  }
  reader.onload = (e) => {
    updateConfig('inputText', e.target?.result as string)
  }
  reader.onerror = () => {
    ElMessage.error('文件读取错误，请上传 txt 文本！')
  }
  reader.readAsText(file.raw)
}

const clearText = () => {
  updateConfig('inputText', '')
}

const filterVoices = () => {
  const { selectedVoice } = audioConfig
  const isCurrentVoiceValid = filteredVoices.value.some((v) => v.Name === selectedVoice)
  console.log(
    `isCurrentVoiceValid: ${isCurrentVoiceValid}, filteredVoices.length: ${filteredVoices.value.length}`
  )
  if (filteredVoices.value.length > 0) {
    updateConfig('selectedVoice', filteredVoices.value[0].Name)
  } else {
    updateConfig('selectedVoice', '')
  }
}

const buildParams = (text: string) => {
  const { selectedVoice, rate, pitch, volume, openaiBaseUrl, openaiKey, openaiModel, voiceMode } =
    audioConfig
  const params: any = {
    text: text.trim(),
  }

  if (voiceMode === 'preset') {
    params.voice = selectedVoice
    params.rate = `${rate > 0 ? '+' : ''}${rate}%`
    params.pitch = `${pitch > 0 ? '+' : ''}${pitch}Hz`
    params.volume = `${volume > 0 ? '+' : ''}${volume}%`
  } else {
    params.useLLM = true
    params.openaiBaseUrl = openaiBaseUrl
    params.openaiKey = openaiKey
    params.openaiModel = openaiModel
  }
  return params
}

const previewAudio = async () => {
  const { previewText } = audioConfig
  if (!previewText.trim() || !canPreview.value) return
  previewLoading.value = true
  try {
    const params = buildParams(previewText)
    const { data } = await generateTTS(params)
    if (data?.audio) {
      updateConfig('previewAudioUrl', data?.audio)
    }
    playSuccessSound()
    setTimeout(audioPlayer?.value!.play)
  } catch (error) {
    console.error('Preview failed:', error)
    commonErrorHandler(error)
  } finally {
    previewLoading.value = false
  }
}

const handleGenerate = (event: Event) => {
  confettiElement.value = event.target as HTMLElement
  const { inputText } = audioConfig
  if (!inputText.trim() || !canGenerate.value) return
  if (inputText.length < 200) {
    console.warn('[handleGenerate]Input text is too short, generating directly...')
    generateAudio() // for test
  } else {
    console.warn('[handleGenerate]Input text is long, creating task...')
    generateAudioTask()
  }
}
const updateAudioList = (data: GenerateResponse) => {
  const audioItem = {
    ...data,
    audio: data.audio,
    file: data.file,
    size: data.size,
    srt: data.srt,
    isDownloading: false,
    isSrtLoading: false,
    isPlaying: false,
    progress: 0,
  }
  const newAudioList = [...generationStore.audioList, audioItem]
  generationStore.updateAudioList(newAudioList)
  ElMessage.success('语音生成成功！')
  playSuccessSound()
  generating.value = false

  const rect = confettiElement.value?.getBoundingClientRect()
  if (rect) {
    const originX = (rect.left + rect.width / 2) / window.innerWidth
    const originY = (rect.top + rect.height / 2) / window.innerHeight
    console.log(originX, originY)
    confetti({
      particleCount: 300,
      spread: 360,
      origin: { x: originX, y: originY },
    })
  }
}
const generateAudio = async () => {
  const { inputText } = audioConfig
  if (!inputText.trim() || !canGenerate.value) return

  generating.value = true
  generationStore.updateProgress(0)

  try {
    const params = buildParams(inputText)
    const { data } = await generateTTS(params)
    if (!data) {
      throw new Error(`no data returned from generateTTS`)
    }
    updateAudioList(data)
  } catch (error) {
    console.error('生成失败:', error)
    commonErrorHandler(error)
    generating.value = false
  }
}

const generateAudioTask = async () => {
  const { inputText } = audioConfig
  if (!inputText.trim() || !canGenerate.value) return
  generating.value = true
  generationStore.updateProgress(0)

  try {
    const params = buildParams(inputText)
    const streamResult = await createTaskStream(params)
    // JSON cache/short-circuit response
    if (streamResult && typeof streamResult === 'object' && 'code' in (streamResult as any) && (streamResult as any).data) {
      updateAudioList((streamResult as any).data)
      return
    }
    const streamed = streamResult as { stream: ReadableStream; fileId?: string }
    const stream = streamed.stream
    const streamFileId = (() => {
      const id = streamed.fileId
      if (!id) return id
      try {
        return decodeURIComponent(id)
      } catch {
        return id
      }
    })()
    console.log('typeof stream:', typeof stream, 'fileId:', streamFileId)
    showStreamButton.value = true
    const onStart = () => {
      console.log('call onStart...')
    }
    const progress = mockProgress(2)
    const onProgress = () => {
      let duration = 0
      if (!processor.value?.isActive()) {
        duration = audioPlayerRef.value!.audioRef!.duration
      } else {
        duration = processor.value!.getLoadedDuration?.()
      }
      if (!Number.isNaN(duration)) {
        streamDuration.value = toFixed(duration)
      }
      generationStore.updateProgress(progress.increase())
    }
    const onFinished = (newAudioUrl: string, blobs: Blob[]) => {
      audioPlayerRef.value!.audioRef!.src = newAudioUrl
      const name = streamFileId || `${params.voice}-${params.text.slice(0, 10)}-${Date.now()}`
      generating.value = false
      const srtName = typeof name === 'string' && name.endsWith('.mp3') ? name.replace(/\.mp3$/, '.srt') : undefined
      const result = {
        audio: audioPlayerRef.value!.audioRef!.src,
        file: name,
        id: name,
        name,
        blobs,
        ...(srtName ? { srt: srtName } : {}),
      }
      generationStore.updateProgress(100)
      updateAudioList(result)
      audioPlayerRef.value!.audioRef?.addEventListener(
        'loadedmetadata',
        () => {
          streamDuration.value = audioPlayerRef.value!.audioRef!.duration
        },
        { once: true }
      )
    }
    const onError = (msg: string) => {
      console.error(msg)
    }
    processor.value = createAudioStreamProcessor(
      stream as unknown as ReadableStream,
      onStart,
      onProgress,
      onFinished,
      onError
    )
    await asyncSleep(100)
    audioPlayerRef.value!.audioRef!.src = processor.value!.audioUrl
    ;(globalThis as any).processor = processor
  } catch (error) {
    console.error('生成失败:', error)
    commonErrorHandler(error)
    generating.value = false
  }
}
const beforeUnloadHandler = async (event: BeforeUnloadEvent) => {
  console.log(`beforeUnloadHandler:`, event.target)
  if (generationStore.audioList.length > 0) {
    // 同步阻止关闭，显示浏览器默认提示
    event.preventDefault()
    event.returnValue = '操作将删除页面上的所有音频文件，请确认已经下载！'
    return event.returnValue
  }

  if (generationStore.audioList.length > 0) {
    try {
      await ElMessageBox.confirm('操作将删除页面上的所有音频文件，请确认已经下载！', '操作提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch (error) {
      console.log(`取消关闭页面`)
      event.preventDefault()
      event.returnValue = ''
    }
  }
}

// 组件挂载时添加事件监听
onBeforeMount(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
onMounted(async () => {
  successAudio.value = new Audio(Notification)
  try {
    const response = await getVoiceList()
    voiceList.value = response?.data!
    if (response?.data?.length) {
      languages.value = buildLanguageOptions(response.data)
    }
  } catch (error) {
    handle429(error)
  }
})
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
.progress-bar {
  margin-top: 20px;
  margin-bottom: 20px;
  height: 12px;
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
}
</style>
