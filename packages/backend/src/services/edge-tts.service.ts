import { Generate } from "../schema/generate";
import { runEdgeTTS } from "../utils/spawn";

export const generateSingleVoice = async ({ text, pitch, voice, rate, output }: Generate & { output: string }) => {

  await runEdgeTTS({ text, pitch, voice, rate, output })
} 