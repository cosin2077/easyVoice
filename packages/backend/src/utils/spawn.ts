import { spawn } from "child_process";
import { logger } from "./logger";

//TODO: Node.js implementation of edge-tts
export function runEdgeTTS(params: TTSParams): Promise<{ audio: string; srt: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("edge_tts", [
      "--text",
      params.text,
      "--voice",
      params.voice,
      "--pitch",
      params.pitch,
      "--rate",
      params.rate,
      "--write-media",
      params.output,
      "--write-subtitles",
    ], { cwd: process.cwd() });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ audio: params.output, srt: `${params.output}.srt` });
      } else {
        reject(new Error(`Edge-TTS failed with code ${code}`));
      }
    });

    proc.stderr.on("data", (data) => logger.error(data.toString()));
  });
}