import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
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
  srt?: string;
  id: string;
}
export type Voices = {
  "Name": string;
  "Gender": string;
  "ContentCategories": string[];
  "VoicePersonalities": string[];
}
export const getVoices = () =>
  api.get<Voices[]>("/voices");

export const generateTTS = (data: GenerateRequest) =>
  api.post<GenerateResponse>("/generate", data);

export const getProgress = (data: TaskRequest) =>
  api.post<TaskResponse>(`/task/${data.id}`);

export const downloadFile = (file: string) =>
  `${api.defaults.baseURL}/download/${file}`;