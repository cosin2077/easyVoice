import { defineStore } from "pinia";
import { ref } from "vue";

export const useGenerationStore = defineStore("generation", () => {
  const audio = ref<string | null>(null);
  const progress = ref<number>(0);

  function setAudio(url: string) {
    audio.value = url;
  }

  function updateProgress(value: number) {
    progress.value = value;
  }

  return { audio, progress, setAudio, updateProgress };
});