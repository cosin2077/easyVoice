<template>
  <div class="custom-generate-container">
    <div class="header">
      <h1>角色自定义生成</h1>
      <p class="subtitle">为不同角色自定义语音参数，支持多段文本组合生成</p>
    </div>

    <el-row :gutter="20">
      <!-- 左侧：记录列表 -->
      <el-col :span="12">
        <el-card class="list-card">
          <template #header>
            <div class="card-header">
              <span>角色列表 ({{ items.length }}/1000)</span>
              <div class="header-actions">
                <el-button type="success" size="small" @click="exportData" :disabled="items.length === 0">
                  <Download class="icon" /> 导出
                </el-button>
                <el-button type="warning" size="small" @click="triggerImport" :disabled="items.length >= 1000">
                  <Upload class="icon" /> 导入
                </el-button>
                <el-button type="primary" size="small" @click="addItem" :disabled="items.length >= 1000">
                  <Plus class="icon" /> 新增
                </el-button>
              </div>
            </div>
          </template>
          <div class="items-list" v-if="items.length > 0">
            <div v-for="(item, index) in items" :key="item.id"
              :class="['item-card', { active: selectedIndex === index }]" @click="selectItem(index)" draggable="true"
              @dragstart="handleDragStart(index, $event)" @dragover.prevent="handleDragOver($event)"
              @drop="handleDrop(index, $event)" @dragend="handleDragEnd">
              <div class="item-content">
                <div class="item-header">
                  <span class="item-index">{{ index + 1 }}</span>
                  <span class="item-desc">{{ item.desc || `角色 ${index + 1}` }}</span>
                  <div class="item-actions">
                    <el-button type="primary" size="small" text @click.stop="handleCopyItem(index)" class="copy-btn"
                      title="复制">
                      <Copy class="icon-small" />
                    </el-button>
                    <el-button type="danger" size="small" text @click.stop="removeItem(index)" class="delete-btn"
                      title="删除">
                      <Delete class="icon-small" />
                    </el-button>
                  </div>
                </div>
                <div class="item-text">{{ item.text || '（未输入文本）' }}</div>
                <div class="item-info">
                  <el-tag size="small" type="info">{{ item.voice || '未选择语音' }}</el-tag>
                  <span class="item-params" v-if="item.rate || item.pitch || item.volume">
                    {{ formatParams(item) }}
                  </span>
                </div>
              </div>
              <div class="drag-handle">
                <GripVertical class="drag-icon" />
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无角色，点击新增按钮添加" />
        </el-card>
      </el-col>

      <!-- 右侧：语音设置 -->
      <el-col :span="12">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>语音设置</span>
              <span v-if="selectedItem" class="selected-info">编辑第 {{ selectedIndex + 1 }} 条</span>
            </div>
          </template>
          <div v-if="selectedItem" class="settings-form">
            <el-form label-position="top" size="default">
              <el-form-item label="角色描述">
                <el-input v-model="selectedItem.desc" placeholder="例如：徐凤年、姜泥、旁白等" clearable
                  @input="saveToLocalStorage" />
              </el-form-item>

              <el-form-item label="文本内容" required>
                <el-input v-model="selectedItem.text" type="textarea" :rows="4" placeholder="请输入要转换的文本" resize="none"
                  @input="saveToLocalStorage" />
              </el-form-item>

              <el-form-item label="语言">
                <el-select v-model="selectedLanguage" placeholder="选择语言" @change="filterVoices">
                  <el-option v-for="lang in languages" :key="lang.code" :label="lang.name" :value="lang.code" />
                </el-select>
              </el-form-item>

              <el-form-item label="性别">
                <el-select v-model="selectedGender" placeholder="选择性别" @change="filterVoices">
                  <el-option label="全部" value="All" />
                  <el-option label="男性" value="Male" />
                  <el-option label="女性" value="Female" />
                </el-select>
              </el-form-item>

              <el-form-item label="语音" required>
                <el-select v-model="selectedItem.voice" placeholder="选择语音" filterable @change="saveToLocalStorage">
                  <el-option v-for="voice in filteredVoices" :key="voice.Name" :label="voice.cnName || voice.Name"
                    :value="voice.Name">
                    <div class="voice-option">
                      <span>{{ voice.cnName || voice.Name }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="语速">
                <el-slider v-model="rateValue" :min="-99" :max="99" :format-tooltip="formatRate" @change="updateRate" />
                <el-input-number v-model="rateValue" :min="-99" :max="99" size="small"
                  style="width: 100%; margin-top: 10px" @change="updateRate" />
              </el-form-item>

              <el-form-item label="音量">
                <el-slider v-model="volumeValue" :min="-99" :max="99" :format-tooltip="formatVolume"
                  @change="updateVolume" />
                <el-input-number v-model="volumeValue" :min="-99" :max="99" size="small"
                  style="width: 100%; margin-top: 10px" @change="updateVolume" />
              </el-form-item>

              <el-form-item label="音调">
                <el-slider v-model="pitchValue" :min="-99" :max="99" :format-tooltip="formatPitch"
                  @change="updatePitch" />
                <el-input-number v-model="pitchValue" :min="-99" :max="99" size="small"
                  style="width: 100%; margin-top: 10px" @change="updatePitch" />
              </el-form-item>
            </el-form>
          </div>
          <el-empty v-else description="请从左侧选择一个角色进行编辑" />
        </el-card>
      </el-col>
    </el-row>

    <div class="action-area">
      <el-button type="primary" size="large" @click="handleGenerate" :loading="generating" :disabled="!canGenerate">
        生成语音
      </el-button>
      <el-button :disabled="generating" type="danger" size="large" @click="reset">
        重置
      </el-button>
    </div>

    <div class="progress-bar">
      <el-progress v-if="generating" style="margin: 0px auto; max-width: 400px" :stroke-width="12"
        :percentage="progress" :color="customColors" />
    </div>

    <StreamButton ref="audioPlayerRef" v-if="showStreamButton" :duration="streamDuration" @close="handleClose" />
    <DownloadList />

    <!-- 复制对话框 -->
    <el-dialog v-model="copyDialogVisible" title="复制角色" width="500px">
      <el-form label-position="top">
        <el-form-item label="新文本内容" required>
          <el-input v-model="copyText" type="textarea" :rows="4" placeholder="请输入新的文本内容" resize="none" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCopy">确认</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件输入框用于导入 -->
    <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleFileImport" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, GripVertical, Copy, Download, Upload } from 'lucide-vue-next'
import { useGenerationStore } from '@/stores/generation'
import { mapZHVoiceName } from '@/utils'
import { defaultVoiceList } from '@/constants/voice'
import DownloadList from '@/components/DownloadList.vue'
import StreamButton from '@/components/StreamButton.vue'
import {
  getVoiceList,
  generateJson,
  type Voice,
  type GenerateResponse,
  type CustomGenerateItem,
} from '@/api/tts'
import { AxiosError } from 'axios'
import { createAudioStreamProcessor, mockProgress, toFixed, debounce } from '@/utils'
import { asyncSleep } from '@/utils'
import Notification from '@/assets/notification.mp3'

interface CustomItem extends CustomGenerateItem {
  id: string
}

const generationStore = useGenerationStore()
const items = ref<CustomItem[]>([])
const selectedIndex = ref<number>(-1)
const selectedLanguage = ref<string>('zh-CN')
const selectedGender = ref<string>('All')
const voiceList = ref<Voice[]>(defaultVoiceList)
const generating = ref(false)
const progress = ref(0)
const showStreamButton = ref(false)
const streamDuration = ref<number>(0)
const audioPlayerRef = ref<InstanceType<typeof StreamButton> | null>(null)
const processor = ref<ReturnType<typeof createAudioStreamProcessor> | null>(null)
const dragStartIndex = ref<number>(-1)
const copyDialogVisible = ref(false)
const copyText = ref('')
const copySourceIndex = ref<number>(-1)
const fileInputRef = ref<HTMLInputElement | null>(null)

const STORAGE_KEY = 'customGenerateData'

const languages = ref([
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'zh-HK', name: '中文（香港）' },
  { code: 'en-US', name: '英语（美国）' },
  { code: 'en-GB', name: '英语（英国）' },
  { code: 'en-AU', name: '英语（澳大利亚）' },
  { code: 'en-CA', name: '英语（加拿大）' },
])

const customColors = [
  { color: '#f5222d', percentage: 10 },
  { color: '#fa541c', percentage: 20 },
  { color: '#fa8c16', percentage: 30 },
  { color: '#fadb14', percentage: 40 },
  { color: '#fadb14', percentage: 50 },
  { color: '#a0d911', percentage: 60 },
  { color: '#73d13d', percentage: 70 },
  { color: '#52c41a', percentage: 80 },
  { color: '#52c41a', percentage: 90 },
  { color: '#52c41a', percentage: 100 },
]

const selectedItem = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < items.value.length) {
    return items.value[selectedIndex.value]
  }
  return null
})

const rateValue = computed({
  get: () => {
    if (!selectedItem.value?.rate) return 0
    const match = selectedItem.value.rate.match(/([+-]?\d+)%/)
    return match ? parseInt(match[1]) : 0
  },
  set: (val: number) => {
    if (selectedItem.value) {
      selectedItem.value.rate = `${val > 0 ? '+' : ''}${val}%`
    }
  },
})

const volumeValue = computed({
  get: () => {
    if (!selectedItem.value?.volume) return 0
    const match = selectedItem.value.volume.match(/([+-]?\d+)%/)
    return match ? parseInt(match[1]) : 0
  },
  set: (val: number) => {
    if (selectedItem.value) {
      selectedItem.value.volume = `${val > 0 ? '+' : ''}${val}%`
    }
  },
})

const pitchValue = computed({
  get: () => {
    if (!selectedItem.value?.pitch) return 0
    const match = selectedItem.value.pitch.match(/([+-]?\d+)Hz/)
    return match ? parseInt(match[1]) : 0
  },
  set: (val: number) => {
    if (selectedItem.value) {
      selectedItem.value.pitch = `${val > 0 ? '+' : ''}${val}Hz`
    }
  },
})

const filteredVoices = computed(() => {
  return voiceList.value
    .filter((voice) => {
      const matchLanguage = voice.Name.startsWith(selectedLanguage.value)
      const matchGender =
        selectedGender.value === 'All' || voice.Gender === selectedGender.value
      return matchLanguage && matchGender
    })
    .map((voice) => ({
      ...voice,
      cnName: mapZHVoiceName(voice.Name) ?? voice.Name,
    }))
})

const canGenerate = computed(() => {
  if (items.value.length === 0) return false
  return items.value.every((item) => item.text.trim() && item.voice)
})

const addItem = () => {
  if (items.value.length >= 1000) {
    ElMessage.warning('最多只能添加1000条记录')
    return
  }
  const newItem: CustomItem = {
    id: `item-${Date.now()}-${Math.random()}`,
    desc: '',
    text: '',
    voice: '',
  }
  items.value.push(newItem)
  selectedIndex.value = items.value.length - 1
  saveToLocalStorage()
}

const removeItem = (index: number) => {
  if (items.value.length <= 1) {
    ElMessage.warning('至少需要保留一条记录')
    return
  }
  items.value.splice(index, 1)
  if (selectedIndex.value >= items.value.length) {
    selectedIndex.value = items.value.length - 1
  }
  if (selectedIndex.value === index && selectedIndex.value > 0) {
    selectedIndex.value = index - 1
  }
  saveToLocalStorage()
}

const handleCopyItem = (index: number) => {
  copySourceIndex.value = index
  copyText.value = ''
  copyDialogVisible.value = true
}

const confirmCopy = () => {
  if (!copyText.value.trim()) {
    ElMessage.warning('请输入文本内容')
    return
  }
  if (copySourceIndex.value < 0 || copySourceIndex.value >= items.value.length) {
    ElMessage.error('复制源数据无效')
    return
  }
  if (items.value.length >= 1000) {
    ElMessage.warning('最多只能添加1000条记录')
    return
  }

  const sourceItem = items.value[copySourceIndex.value]
  const newItem: CustomItem = {
    id: `item-${Date.now()}-${Math.random()}`,
    desc: sourceItem.desc || '',
    text: copyText.value.trim(),
    voice: sourceItem.voice || '',
    rate: sourceItem.rate || '',
    pitch: sourceItem.pitch || '',
    volume: sourceItem.volume || '',
  }
  items.value.push(newItem)
  selectedIndex.value = items.value.length - 1
  copyDialogVisible.value = false
  copyText.value = ''
  copySourceIndex.value = -1
  ElMessage.success('复制成功')
  saveToLocalStorage()
}

// 导出功能
const exportData = () => {
  if (items.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  try {
    const dataToExport = items.value.map((item) => ({
      desc: item.desc || '',
      text: item.text || '',
      voice: item.voice || '',
      rate: item.rate || '',
      pitch: item.pitch || '',
      volume: item.volume || '',
    }))

    const jsonString = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `custom-voice-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 导入功能
const triggerImport = () => {
  if (items.value.length >= 1000) {
    ElMessage.warning('已达到最大记录数（1000条），无法导入')
    return
  }
  fileInputRef.value?.click()
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 重置文件输入，以便可以再次选择同一文件
  target.value = ''

  try {
    const text = await file.text()
    const importedData = JSON.parse(text)

    // 验证数据格式
    if (!Array.isArray(importedData)) {
      throw new Error('导入的数据必须是数组格式')
    }

    if (importedData.length === 0) {
      ElMessage.warning('导入的文件为空')
      return
    }

    // 验证每条数据的格式
    const validData: CustomGenerateItem[] = []
    for (let i = 0; i < importedData.length; i++) {
      const item = importedData[i]
      if (typeof item !== 'object' || item === null) {
        throw new Error(`第 ${i + 1} 条数据格式错误：必须是对象`)
      }
      if (typeof item.text !== 'string') {
        throw new Error(`第 ${i + 1} 条数据格式错误：text 字段必须是字符串`)
      }
      if (typeof item.voice !== 'string') {
        throw new Error(`第 ${i + 1} 条数据格式错误：voice 字段必须是字符串`)
      }

      validData.push({
        desc: typeof item.desc === 'string' ? item.desc : '',
        text: item.text,
        voice: item.voice,
        rate: typeof item.rate === 'string' ? item.rate : '',
        pitch: typeof item.pitch === 'string' ? item.pitch : '',
        volume: typeof item.volume === 'string' ? item.volume : '',
      })
    }

    // 检查是否会超过最大限制
    const remainingSlots = 1000 - items.value.length
    if (validData.length > remainingSlots) {
      ElMessage.warning(`只能导入 ${remainingSlots} 条记录，当前有 ${items.value.length} 条，最多支持 1000 条`)
      return
    }

    // 添加到列表末尾
    const newItems: CustomItem[] = validData.map((item, index) => ({
      id: `item-${Date.now()}-${index}-${Math.random()}`,
      ...item,
    }))

    items.value.push(...newItems)
    ElMessage.success(`成功导入 ${newItems.length} 条记录`)
    saveToLocalStorage()
  } catch (error) {
    console.error('导入失败:', error)
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON 格式错误，请检查文件内容')
    } else if (error instanceof Error) {
      ElMessage.error(`导入失败：${error.message}`)
    } else {
      ElMessage.error('导入失败，请检查文件格式')
    }
  }
}

const selectItem = (index: number) => {
  selectedIndex.value = index
  if (items.value[index].voice) {
    const voice = voiceList.value.find((v) => v.Name === items.value[index].voice)
    if (voice) {
      const langMatch = voice.Name.match(/^([a-z]{2}-[A-Z]{2})/)
      if (langMatch) {
        selectedLanguage.value = langMatch[1]
      }
      selectedGender.value = voice.Gender
    }
  }
}

const filterVoices = () => {
  if (selectedItem.value && filteredVoices.value.length > 0) {
    const currentVoice = selectedItem.value.voice
    const isValid = filteredVoices.value.some((v) => v.Name === currentVoice)
    if (!isValid) {
      selectedItem.value.voice = filteredVoices.value[0].Name
    }
  }
}

const formatRate = (val: number) => {
  return val > 0 ? `+${val}%` : `${val}%`
}

const formatVolume = (val: number) => {
  return val >= 0 ? `+${val}%` : `${val}%`
}

const formatPitch = (val: number) => {
  return val >= 0 ? `+${val}Hz` : `${val}Hz`
}

const formatParams = (item: CustomItem) => {
  const params: string[] = []
  if (item.rate) params.push(`语速: ${item.rate}`)
  if (item.pitch) params.push(`音调: ${item.pitch}`)
  if (item.volume) params.push(`音量: ${item.volume}`)
  return params.join(' | ')
}

const updateRate = (val: number) => {
  if (selectedItem.value) {
    selectedItem.value.rate = `${val > 0 ? '+' : ''}${val}%`
    saveToLocalStorage()
  }
}

const updateVolume = (val: number) => {
  if (selectedItem.value) {
    selectedItem.value.volume = `${val > 0 ? '+' : ''}${val}%`
    saveToLocalStorage()
  }
}

const updatePitch = (val: number) => {
  if (selectedItem.value) {
    selectedItem.value.pitch = `${val > 0 ? '+' : ''}${val}Hz`
    saveToLocalStorage()
  }
}

// 拖动排序
const handleDragStart = (index: number, event: DragEvent) => {
  dragStartIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', '')
  }
  ; (event.target as HTMLElement).style.opacity = '0.5'
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (index: number, event: DragEvent) => {
  event.preventDefault()
  if (dragStartIndex.value === -1) return

  const draggedItem = items.value[dragStartIndex.value]
  items.value.splice(dragStartIndex.value, 1)
  items.value.splice(index, 0, draggedItem)

  if (selectedIndex.value === dragStartIndex.value) {
    selectedIndex.value = index
  } else if (
    selectedIndex.value > dragStartIndex.value &&
    selectedIndex.value <= index
  ) {
    selectedIndex.value--
  } else if (
    selectedIndex.value < dragStartIndex.value &&
    selectedIndex.value >= index
  ) {
    selectedIndex.value++
  }

  dragStartIndex.value = -1
  saveToLocalStorage()
}

const handleDragEnd = (event: DragEvent) => {
  ; (event.target as HTMLElement).style.opacity = '1'
  dragStartIndex.value = -1
}

const reset = () => {
  ElMessageBox.confirm('确定要重置所有数据吗？', '操作提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    items.value = []
    selectedIndex.value = -1
    selectedLanguage.value = 'zh-CN'
    selectedGender.value = 'All'
    saveToLocalStorage()
  })
}

// localStorage 存储和加载
const saveToLocalStorage = debounce(() => {
  try {
    const dataToSave = items.value.map((item) => ({
      desc: item.desc,
      text: item.text,
      voice: item.voice,
      rate: item.rate || '',
      pitch: item.pitch || '',
      volume: item.volume || '',
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('保存到 localStorage 失败:', error)
  }
}, 300)

const loadFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        items.value = parsedData.map((item, index) => ({
          id: `item-${Date.now()}-${index}-${Math.random()}`,
          desc: item.desc || '',
          text: item.text || '',
          voice: item.voice || '',
          rate: item.rate || '',
          pitch: item.pitch || '',
          volume: item.volume || '',
        }))
        if (items.value.length > 0) {
          selectedIndex.value = 0
        }
      }
    }
  } catch (error) {
    console.error('从 localStorage 加载失败:', error)
  }
}

// 监听 items 变化，自动保存
watch(
  () => items.value,
  () => {
    saveToLocalStorage()
  },
  { deep: true }
)

const handleClose = (realClose: () => void) => {
  if (generating.value) {
    ElMessageBox.confirm('确定关闭吗，这将停止当前的生成任务', '操作提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      realClose()
      generating.value = false
      progress.value = 0
      processor.value!.stop()
      showStreamButton.value = false
    })
  } else {
    realClose()
    showStreamButton.value = false
  }
}

const playSuccessSound = () => {
  const audio = new Audio(Notification)
  audio.currentTime = 0
  audio.play().catch((error) => {
    console.error('播放音效失败:', error)
  })
}

const commonErrorHandler = async (error: unknown) => {
  if (error instanceof AxiosError) {
    const { message, errors } = (error.response?.data as any) || {}
    if (message) {
      ElMessage.error(message)
    } else if (errors?.length) {
      ElMessage.error(errors[0].message)
    } else {
      ElMessage.error('请求失败！')
    }
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
  progress.value = 100
}

const handleGenerate = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('请确保所有记录都已填写文本和选择语音')
    return
  }

  generating.value = true
  progress.value = 0

  try {
    const requestData = items.value.map((item) => ({
      desc: item.desc,
      text: item.text,
      voice: item.voice,
      rate: item.rate || '',
      pitch: item.pitch || '',
      volume: item.volume || '',
    }))

    // 使用 generateJson 接口生成
    const stream = await generateJson({ data: requestData })

    if (!(stream instanceof ReadableStream)) {
      if (stream.code && stream.data) {
        updateAudioList(stream.data)
        return
      }
    }

    showStreamButton.value = true
    const onStart = () => {
      console.log('call onStart...')
    }
    const progressMock = mockProgress(2)
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
      progress.value = progressMock.increase()
    }
    const onFinished = (newAudioUrl: string, blobs: Blob[]) => {
      audioPlayerRef.value!.audioRef!.src = newAudioUrl
      const name = `custom-${Date.now()}`
      generating.value = false
      const result = {
        audio: audioPlayerRef.value!.audioRef!.src,
        file: name,
        id: name,
        name,
        blobs,
      }
      progress.value = 100
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
      ElMessage.error(msg)
      generating.value = false
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
  } catch (error) {
    console.error('生成失败:', error)
    commonErrorHandler(error)
    generating.value = false
  }
}

onMounted(async () => {
  // 先从 localStorage 加载数据
  loadFromLocalStorage()

  try {
    const response = await getVoiceList()
    voiceList.value = response?.data || defaultVoiceList
  } catch (error) {
    console.error('获取语音列表失败:', error)
  }
})
</script>

<style scoped lang="less">
.custom-generate-container {
  max-width: 1400px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-info {
  font-size: 0.9rem;
  color: #64748b;
}

.list-card,
.settings-card {
  height: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.items-list {
  max-height: 70vh;
  overflow-y: auto;
}

.item-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  position: relative;
}

.item-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.item-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.item-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.item-desc {
  font-weight: 600;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.copy-btn,
.delete-btn {
  flex-shrink: 0;
}

.item-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-params {
  font-size: 12px;
  color: #909399;
}

.drag-handle {
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: grab;
  color: #909399;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-icon {
  width: 20px;
  height: 20px;
}

.icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  vertical-align: middle;
}

.icon-small {
  width: 14px;
  height: 14px;
}

.settings-form {
  max-height: 70vh;
  overflow-y: auto;
}

.voice-option {
  display: flex;
  align-items: center;
}

.action-area {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  margin-top: 20px;
  margin-bottom: 20px;
  height: 12px;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .custom-generate-container {
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
</style>
