<template>
  <div class="novel-to-audio-container">
    <div class="header">
      <h1>文本转语音</h1>
      <p class="subtitle">自然朗读 · 多语种 · 可选 AI 分角</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="16">
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
            placeholder="在此粘贴小说、对话或旁白… 也可用下方「填入示例」"
            :rows="12"
            resize="none"
            class="main-textarea"
          />
          <div class="text-toolbar">
            <el-button size="small" text type="primary" @click="fillSample">填入示例</el-button>
            <span class="hint">支持 .txt 拖拽上传 · 长文本将自动流式生成</span>
          </div>
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
      <el-col :xs="24" :sm="24" :md="8">
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
              <el-radio-button label="ai">
                  AI 推荐
                  <Sparkles class="sparkles-icon" :size="16" :stroke-width="1.75" />
                </el-radio-button>
            </el-radio-group>
          </div>

          <!-- 预设语音选择 -->
          <div v-if="audioConfig.voiceMode === 'preset'" class="voice-selector">
            <el-form label-position="top" size="default">
              <el-form-item label="语言">
                <el-select
                  v-model="audioConfig.selectedLanguage"
                  placeholder="搜索语言 / 代码"
                  filterable
                  :filter-method="onLangFilter"
                  @visible-change="(v:boolean)=>!v && onLangFilter('')"
                  @change="filterVoices"
                >
                  <el-option-group
                    v-for="group in languageGroups"
                    :key="group.label"
                    :label="group.label"
                  >
                    <el-option
                      v-for="lang in group.options"
                      :key="lang.code"
                      :label="lang.name"
                      :value="lang.code"
                    >
                      <span class="lang-opt">{{ lang.name }}</span>
                      <span class="lang-code">{{ lang.code }}</span>
                    </el-option>
                  </el-option-group>
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
                    :label="voiceDisplay(voice)"
                    :value="voice.Name"
                  >
                    <div class="voice-option">
                      <span>{{ voiceDisplay(voice) }}</span>
                      <span class="voice-meta">{{ voice.Name.split('-').slice(0,2).join('-') }}</span>
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
            <p class="ai-help">
              用大模型按角色/旁白自动分配音色与语速。兼容 OpenAI Chat Completions；密钥仅保存在本机浏览器（localStorage），不会上传到 EasyVoice 服务器以外的地址（请求直达你填写的 API）。
            </p>
            <el-form label-position="top" require-asterisk-position="right">
              <el-form-item label="API Base URL" required>
                <el-input
                  v-model="audioConfig.openaiBaseUrl"
                  clearable
                  placeholder="https://api.openai.com/v1"
                />
              </el-form-item>
              <el-form-item label="API Key" required>
                <el-input
                  v-model="audioConfig.openaiKey"
                  type="password"
                  show-password
                  clearable
                  placeholder="sk-…"
                  autocomplete="off"
                />
              </el-form-item>
              <el-form-item label="模型" required>
                <el-input v-model="audioConfig.openaiModel" clearable placeholder="gpt-4o-mini" />
              </el-form-item>
            </el-form>
          </div>

          <div class="preview-section">
            <el-form-item label="试听文本" class="preview-field">
              <div class="preview-row">
                <el-input
                  v-model="audioConfig.previewText"
                  placeholder="短句试听"
                  :disabled="!canPreview"
                  clearable
                />
                <el-button
                  type="primary"
                  @click="previewAudio"
                  :disabled="!canPreview || previewLoading"
                  :loading="previewLoading"
                >
                  试听
                </el-button>
              </div>
            </el-form-item>
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
    <div v-if="langMismatch" class="mismatch-banner">
      <span>{{ langMismatch }}</span>
      <el-button size="small" type="primary" text @click="applySuggestedVoice">一键切换音色</el-button>
    </div>
    <div class="action-area" :class="{ sticky: true }">
      <div class="action-row">
        <el-button
          v-if="!generating"
          type="primary"
          size="large"
          class="primary-cta"
          @click="handleGenerate"
          :disabled="!canGenerate"
        >
          生成语音
        </el-button>
        <el-button
          v-else
          type="danger"
          size="large"
          class="primary-cta"
          @click="cancelGenerate"
        >
          停止生成
        </el-button>
        <el-button :disabled="generating" size="large" @click="reset">重置</el-button>
      </div>
      <el-progress
        v-if="generating"
        class="inline-progress"
        :stroke-width="8"
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
import { UploadFilled } from '@element-plus/icons-vue'
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
import { buildLanguageOptions, filterLanguageOptions } from '@/constants/locales'
import { friendlyVoiceName, looksLikeChinese, looksLikeEnglish } from '@/utils/format'
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
  return voiceList.map((voice) => {
    const zh = audioConfig.selectedLanguage?.includes('zh-')
      ? mapZHVoiceName(voice.Name)
      : undefined
    return {
      ...voice,
      cnName: zh || friendlyVoiceName(voice.Name, voice.Gender),
    }
  })
}
const langQuery = ref('')
const onLangFilter = (q: string) => {
  langQuery.value = q || ''
}
const filteredLangOptions = computed(() =>
  filterLanguageOptions(langQuery.value, languages.value as any)
)
const languageGroups = computed(() => {
  const map = new Map<string, { code: string; name: string; group?: string }[]>()
  for (const lang of filteredLangOptions.value as any[]) {
    const g = lang.group || '其他'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(lang)
  }
  const entries = [...map.entries()]
  // Flatten groups with a single locale: use language name as group label (e.g. 日语)
  return entries.map(([label, options]) => {
    if (options.length === 1) {
      const only = options[0]
      const langName = (only.name || '').split('（')[0] || label
      return { label: langName, options }
    }
    return { label, options }
  })
})
const voiceDisplay = (voice: Voice) =>
  voice.cnName || friendlyVoiceName(voice.Name, voice.Gender)

const SAMPLE_TEXT =
  '春江潮水连海平，海上明月共潮生。\n滟滟随波千万里，何处春江无月明。'
const fillSample = () => updateConfig('inputText', SAMPLE_TEXT)

const suggestedVoice = ref('')
const langMismatch = computed(() => {
  const text = audioConfig.inputText || ''
  const voice = audioConfig.selectedVoice || ''
  if (audioConfig.voiceMode !== 'preset' || !text.trim() || !voice) {
    suggestedVoice.value = ''
    return ''
  }
  if (looksLikeChinese(text) && voice.startsWith('en')) {
    suggestedVoice.value = 'zh-CN-XiaoxiaoNeural'
    return '检测到中文文本，当前却是英文音色。'
  }
  if (looksLikeEnglish(text) && voice.startsWith('zh')) {
    suggestedVoice.value = 'en-US-JennyNeural'
    return '检测到英文文本，当前却是中文音色。'
  }
  suggestedVoice.value = ''
  return ''
})
const applySuggestedVoice = () => {
  if (!suggestedVoice.value) return
  const v = suggestedVoice.value
  const loc = v.split('-').slice(0, 2).join('-')
  updateConfig('selectedLanguage', loc)
  updateConfig('selectedVoice', v)
}

let abortCtrl: AbortController | null = null
const cancelGenerate = () => {
  abortCtrl?.abort()
  abortCtrl = null
  processor.value?.stop?.()
  generating.value = false
  generationStore.updateProgress(0)
  ElMessage.info('已停止生成')
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
  }
  return !!(openaiBaseUrl && openaiKey && openaiModel)

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

const handleGenerate = async (event: Event) => {
  confettiElement.value = event.target as HTMLElement
  const { inputText } = audioConfig
  if (!inputText.trim() || !canGenerate.value) return
  if (langMismatch.value) {
    try {
      await ElMessageBox.confirm(
        langMismatch.value + ' 仍要继续，或先一键切换音色？',
        '语言与音色不匹配',
        {
          confirmButtonText: '一键切换并继续',
          cancelButtonText: '仍用当前音色',
          distinguishCancelAndClose: true,
          type: 'warning',
        }
      )
      applySuggestedVoice()
    } catch (e) {
      if (e === 'close') return
    }
  }
  if (inputText.length < 200) {
    console.warn('[handleGenerate]Input text is too short, generating directly...')
    generateAudio()
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
    name: (audioConfig.inputText || '').replace(/\s+/g, ' ').trim().slice(0, 24),
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
  abortCtrl = new AbortController()

  try {
    const params = buildParams(inputText)
    const { data } = await generateTTS(params, abortCtrl.signal)
    if (!data) {
      throw new Error(`no data returned from generateTTS`)
    }
    updateAudioList(data)
  } catch (error) {
    if ((error as any)?.name === 'CanceledError' || (error as any)?.code === 'ERR_CANCELED' || (error as any)?.name === 'AbortError') {
      console.info('generation aborted')
    } else {
      console.error('生成失败:', error)
      commonErrorHandler(error)
    }
    generating.value = false
  } finally {
    abortCtrl = null
  }
}

const generateAudioTask = async () => {
  const { inputText } = audioConfig
  if (!inputText.trim() || !canGenerate.value) return
  processor.value?.stop?.()
  generating.value = true
  generationStore.updateProgress(0)

  try {
    const params = buildParams(inputText)
    abortCtrl = new AbortController()
    const streamResult = await createTaskStream(params, abortCtrl.signal)
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
    if ((error as any)?.name === 'CanceledError' || (error as any)?.code === 'ERR_CANCELED' || (error as any)?.name === 'AbortError') {
      console.info('generation aborted')
    } else {
      console.error('生成失败:', error)
      commonErrorHandler(error)
    }
    generating.value = false
  } finally {
    abortCtrl = null
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
  processor.value?.stop?.()
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
  --ev-bg: #fafafa;
  --ev-panel: #ffffff;
  --ev-border: #e8e8e8;
  --ev-text: #1a1a1a;
  --ev-muted: #6b6b6b;
  --ev-accent: #5e6ad2;
  --ev-radius: 10px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
  color: var(--ev-text);
  background: transparent;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC',
    'Noto Sans SC', sans-serif;
}

.header {
  margin-bottom: 1.75rem;
}
.header h1 {
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 0.35rem;
  color: var(--ev-text);
}
.subtitle {
  margin: 0;
  color: var(--ev-muted);
  font-size: 0.925rem;
}

.input-card,
.settings-card {
  border: 1px solid var(--ev-border) !important;
  border-radius: var(--ev-radius) !important;
  box-shadow: none !important;
  background: var(--ev-panel);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  font-size: 0.9rem;
}

.upload-area {
  margin-top: 0.85rem;
}
.upload-area :deep(.el-upload-dragger) {
  border-radius: 8px;
  border-color: var(--ev-border);
  background: #fcfcfc;
  padding: 1.25rem;
}

.voice-mode-selector {
  margin-bottom: 1rem;
}
.voice-mode-selector :deep(.el-radio-button__inner) {
  border-radius: 8px !important;
}

.voice-selector,
.ai-settings {
  margin-top: 0.25rem;
}

.voice-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sparkles-icon {
  margin-left: 4px;
  vertical-align: middle;
  color: var(--ev-accent);
}

.preview-section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ev-border);
}
.preview-audio {
  width: 100%;
  margin-top: 0.75rem;
}

.generate-section {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.generate-section :deep(.el-button--primary) {
  background: var(--ev-accent);
  border-color: var(--ev-accent);
  font-weight: 500;
}
.generate-section :deep(.el-button--primary:hover) {
  filter: brightness(1.05);
}


.action-area {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}
.action-area :deep(.el-button--primary) {
  background: var(--ev-accent);
  border-color: var(--ev-accent);
  font-weight: 500;
  min-width: 140px;
}
.progress-bar {
  margin-top: 1rem;
}

.progress-wrap {
  margin-top: 0.5rem;
}

@media (max-width: 900px) {
  .novel-to-audio-container {
    padding: 1.25rem 0.85rem 3rem;
  }
  .header h1 {
    font-size: 1.35rem;
  }
}

.main-textarea :deep(textarea) {
  font-size: 15px;
  line-height: 1.6;
  color: #1a1a1a;
}
.text-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0 6px;
  flex-wrap: wrap;
}
.text-toolbar .hint,
.upload-area :deep(.el-upload__tip),
.ai-help {
  font-size: 13px;
  color: #525252;
  line-height: 1.45;
}
.upload-area :deep(.el-upload__text) {
  font-size: 14px;
  color: #3a3a3a;
}
.lang-opt { float: left; }
.lang-code {
  float: right;
  color: #8a8a8a;
  font-size: 12px;
  margin-left: 12px;
}
.voice-meta {
  color: #6b6b6b;
  font-size: 12px;
}
.preview-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.preview-row .el-input { flex: 1; }
.preview-field { width: 100%; }
.ai-help {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: #f4f5fb;
  border-radius: 8px;
  border: 1px solid #e7e9f5;
}
.ai-settings {
  min-height: 280px;
}
.sparkles-icon { color: var(--ev-accent); opacity: 0.9; }
.mismatch-banner {
  margin: 16px 0 0;
  padding: 10px 14px;
  background: #fff8e8;
  border: 1px solid #f0e0b2;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: #5c4b1f;
}
.action-area.sticky {
  margin-top: 20px;
  padding: 14px;
  border: 1px solid var(--ev-border);
  border-radius: var(--ev-radius);
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.primary-cta { min-width: 148px; }
.inline-progress { margin-top: 12px; }
.settings-card, .input-card {
  margin-bottom: 0;
}
.el-form-item { margin-bottom: 14px; }
:deep(.el-form-item__label) {
  font-size: 13px;
  color: #3a3a3a;
  font-weight: 500;
}
:deep(.el-option-group__title) {
  font-size: 12px;
  color: #6b6b6b;
  font-weight: 600;
  padding: 8px 12px 4px;
}
@media (max-width: 640px) {
  .novel-to-audio-container { padding-bottom: 96px; }
  .action-area.sticky {
    position: sticky;
    bottom: 0;
    z-index: 30;
    margin-left: -4px;
    margin-right: -4px;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -6px 20px rgba(0,0,0,0.06);
  }
  .primary-cta { flex: 1; width: 100%; }
  .action-row { width: 100%; }
  .action-row .el-button { flex: 1; }
  .main-textarea :deep(textarea) { font-size: 16px; }
  .text-toolbar .hint { font-size: 13px; }
}

</style>
