import axios from 'axios'

const DEV_URL = 'http://localhost:3000/api/v1/tts'
const PROD_URL = import.meta.env.VITE_API_URL || '/api/v1/tts'
const baseURL = import.meta.env.MODE === 'development' ? DEV_URL : PROD_URL

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
})

export interface GenerateRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  useLLM?: boolean
  openaiBaseUrl?: string
  openaiKey?: string
  openaiModel?: string
}
export interface TaskRequest {
  id: string
}
export interface TaskResponse {
  success: string
  url: string
  progress: number
  message?: string
}

export interface ResponseWrapper<T> {
  success: boolean
  data?: T
  code: number
  message?: string
}
export interface GenerateResponse {
  audio: string
  file: string
  srt?: string
  size?: number
  id: string
}
export type Voice = {
  Name: string
  cnName?: string
  Gender: string
  ContentCategories: string[]
  VoicePersonalities: string[]
}
export interface Task {
  id: string
  fields: any
  status: string
  progress: number
  message: string
  code?: string | number
  result: any
  createdAt: Date
  updatedAt?: Date
  updateProgress?: (taskId: string, progress: number) => Task | undefined
}
export const getVoiceList = async () => {
  const response = await api.get<ResponseWrapper<Voice[]>>('/voiceList')
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}

export const generateTTS = async (data: GenerateRequest, signal?: AbortSignal) => {
  const response = await api.post<ResponseWrapper<GenerateResponse>>('/generate', data, { signal })
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}
export const getTask = async (data: TaskRequest) => {
  const response = await api.get<ResponseWrapper<Task>>(`/task/${data.id}`)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}
export const createTask = async (data: TaskRequest) => {
  const response = await api.post<ResponseWrapper<Task>>(`/create`, data)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}

export const createTaskStream = async (data: TaskRequest, signal?: AbortSignal) => {
  const response = await api.post<ReadableStream | ResponseWrapper<GenerateResponse>>(
    `/createStream`,
    data,
    {
      responseType: 'stream',
      adapter: 'fetch',
      timeout: 0,
      signal,
    }
  )
  const ttsType = response.headers['x-generate-tts-type']
  const contentType = response.headers['content-type']
  const rawFileId = response.headers['x-generate-tts-id'] as string | undefined
  let fileId = rawFileId
  if (rawFileId) {
    try {
      fileId = decodeURIComponent(rawFileId)
    } catch {
      fileId = rawFileId
    }
  }
  if (
    response.status !== 200 ||
    ttsType === 'application/json' ||
    contentType?.includes?.('application/json')
  ) {
    const text = await new Response(response.data as any).text()
    const responseData = JSON.parse(text)
    return responseData
  }
  return { stream: response.data as ReadableStream, fileId }
}

export const downloadFile = (file: string) => `${api.defaults.baseURL}/download/${encodeURIComponent(file)}`
