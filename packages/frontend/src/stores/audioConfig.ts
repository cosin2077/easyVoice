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

export const useAudioConfigStore = defineStore('audioConfig', () => {
  const audioConfig = reactive<AudioConfig>({
    rate: 0,                          // 语速
    volume: 0,                        // 音量/速率
    pitch: 0,                         // 音调
    voiceMode: 'preset',               // 语音模式，默认 preset
    inputText: '',                     // 输入文本
    selectedLanguage: 'zh-CN',         // 默认语言为中文
    selectedGender: 'All',             // 默认性别为全部
    selectedVoice: 'zh-CN-YunxiNeural',// 默认语音模型
    previewText: '这是一段测试文本，用于试听语音效果。',
    openaiBaseUrl: '',
    openaiKey: '',
    openaiModel: '',
    previewAudioUrl: '',
  });

  function updateConfig(prop: keyof AudioConfig, value: string) {
    if (Object.prototype.hasOwnProperty.call(audioConfig, prop)) {
      audioConfig[prop] = value;
    } else {
      console.warn(`Property "${prop}" does not exist in audioConfig`);
    }
  }
  return { audioConfig, updateConfig };
}, {
  persist: true
});