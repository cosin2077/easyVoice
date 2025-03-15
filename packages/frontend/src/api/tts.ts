import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 60000,
});

export interface GenerateRequest {
  text: string;
}

export interface GenerateResponse {
  audio: string;
  srt?: string;
}

export const generateTTS = (data: GenerateRequest) =>
  api.post<GenerateResponse>("/generate", data);

export const downloadFile = (file: string) =>
  `${api.defaults.baseURL}/download/${file}`;