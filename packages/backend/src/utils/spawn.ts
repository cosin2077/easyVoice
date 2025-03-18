import { spawn } from "child_process";
import { logger } from "./logger";

//TODO: Node.js implementation of edge-tts
export function runEdgeTTS(params: TTSParams): Promise<{ audio: string; srt: string; success: boolean }> {
  return new Promise((resolve, reject) => {
    logger.info(`run with : edge-tts --text ${params.text.slice(0, 10) + '...'} --voice ${params.voice}  --volume=${params.volume} --pitch=${params.pitch} --rate=${params.rate} --write-media ${params.output}`)
    const child = spawn("edge-tts", [
      "--text",
      params.text,
      "--voice",
      params.voice,
      `--volume=${params.volume}`,
      `--pitc=${params.pitch}`,
      `--rate=${params.rate}`,
      "--write-media",
      params.output,
    ], { cwd: process.cwd() });

    let stdout = '';
    let stderr = '';
    // 实时收集标准输出
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Output:', data.toString());
    });
    // 实时收集错误输出
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Error output:', data.toString());
    });
    // 进程结束
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`Voice file generated successfully: ${params.output}`);
        resolve({ success: true, audio: params.output, srt: '' });
      } else {
        reject({
          success: false,
          error: stderr || `Process exited with code ${code}`
        });
      }
    });
    // 错误处理
    child.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });
  });
}
