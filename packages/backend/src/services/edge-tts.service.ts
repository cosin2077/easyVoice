import { Generate } from "../schema/generate";
import { safeRunWithRetry } from "../utils";
import { runEdgeTTS } from "../utils/spawn";

export const generateSingleVoice = async ({ text, volume, pitch, voice, rate, output }: Omit<Generate, 'useLLM'> & { output: string }) => {
  let result: TTSResult = {
    audio: '',
    srt: ''
  }
  await safeRunWithRetry(async () => {
    result = await runEdgeTTS({ text, pitch, volume, voice, rate, output });
  })
  return result!
} 