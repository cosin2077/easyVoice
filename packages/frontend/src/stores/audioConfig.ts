import { defineStore } from "pinia";
import { reactive } from "vue";

export interface AudioConfig {
  volume: number;
  rate: number;
  pitch: number;
  voiceMode: string;
  inputText: string;
  selectedLanguage: string;
  selectedGender: string;
  selectedVoice: string;
  previewText: string;
  openaiBaseUrl: string;
  openaiKey: string;
  openaiModel: string;
  previewAudioUrl: string;
}

// 默认配置常量
const defaultConfig: AudioConfig = {
  rate: 0,
  volume: 0,
  pitch: 0,
  voiceMode: 'preset',
  inputText: '',
  selectedLanguage: 'zh-CN',
  selectedGender: 'All',
  selectedVoice: 'zh-CN-YunxiNeural',
  previewText: '这是一段测试文本，用于试听语音效果。',
  openaiBaseUrl: '',
  openaiKey: '',
  openaiModel: '',
  previewAudioUrl: '',
};

export const useAudioConfigStore = defineStore('audioConfig', () => {
  const audioConfig = reactive<AudioConfig>({ ...defaultConfig });

  function updateConfig<K extends keyof AudioConfig>(prop: K, value: AudioConfig[K]) {
    if (Object.prototype.hasOwnProperty.call(audioConfig, prop)) {
      audioConfig[prop] = value;
    } else {
      console.warn(`Property "${prop}" does not exist in audioConfig`);
    }
  }

  function reset() {
    Object.assign(audioConfig, { ...defaultConfig });
  }

  return { audioConfig, updateConfig, reset };
}, {
  persist: true
});