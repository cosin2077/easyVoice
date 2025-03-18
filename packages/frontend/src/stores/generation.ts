import { defineStore } from "pinia";
import { ref } from "vue";

export const useGenerationStore = defineStore("generation", () => {
  const audio = ref<string | null>(null);
  const file = ref<string | null>(null);
  const progress = ref<number>(0);

  function setAudio(url: string) {
    audio.value = url;
  }

  function setFile(url: string) {
    file.value = url;
  }

  function updateProgress(value: number) {
    progress.value = value;
  }

  return { audio, file, progress, setFile, setAudio, updateProgress };
});