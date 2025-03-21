import { defineStore } from "pinia";
import { ref } from "vue";

export interface Audio {
  audio: string;
  file: string;
  size?: number;
  srt?: number;
  isDownloading: boolean;
  isPlaying: boolean;
  progress: number;
}

export const useGenerationStore = defineStore("generation", () => {
  const audio = ref<string | null>(null);
  const file = ref<string | null>(null);
  const progress = ref<number>(0);
  const audioList = ref<Audio[]>([])
  function setAudio(url: string) {
    audio.value = url;
  }

  function setFile(url: string) {
    file.value = url;
  }

  function updateProgress(value: number) {
    progress.value = value;
  }
  function updateAudioList(newAudioList: Audio[]) {
    audioList.value.length = 0;
    audioList.value.push(...newAudioList);
  }
  return { audio, file, progress, setFile, setAudio, updateProgress, audioList, updateAudioList };
}, { persist: true });
