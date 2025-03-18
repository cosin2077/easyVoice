import axios, { type AxiosResponse } from "axios";

const DEV_URL = "http://localhost:3000/api";
const PROD_URL = import.meta.env.VITE_API_URL;
const baseURL = import.meta.env.MODE === 'development' ? DEV_URL : PROD_URL

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
});

export interface GenerateRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  useLLM?: boolean;
  openaiBaseUrl?: string;
  openaiKey?: string;
  openaiModel?: string;
}
export interface TaskRequest {
  id: string;
}
export interface TaskResponse {
  success: string;
  url: string;
  progress: number;
  message?: string;
}

export interface GenerateResponse {
  audio: string;
  file: string;
  srt?: string;
  size?: number;
  id: string;
}
export type Voice = {
  "Name": string;
  "cnName"?: string;
  "Gender": string;
  "ContentCategories": string[];
  "VoicePersonalities": string[];
}
export const getVoiceList = () =>
  api.get<AxiosResponse<Voice[]>>("/voiceList");

export const generateTTS = (data: GenerateRequest) =>
  api.post<GenerateResponse>("/generate", data);

export const getProgress = (data: TaskRequest) =>
  api.post<TaskResponse>(`/task/${data.id}`);

export const downloadFile = (file: string) =>
  `${api.defaults.baseURL}/download/${file}`;