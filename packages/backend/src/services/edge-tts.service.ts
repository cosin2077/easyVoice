import { Generate } from "../schema/generate";
import { fileExist, safeRunWithRetry } from "../utils";
import { EdgeTTS } from 'node-edge-tts'
import fs from 'fs/promises'

async function runEdgeTTS({ text, pitch, volume, voice, rate, output }: Omit<Generate, 'useLLM'> & { output: string }) {
  const lang = /([a-zA-Z]{2,5}-[a-zA-Z]{2,5}\b)/.exec(voice)?.[1];
  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    saveSubtitles: true,
    pitch,
    rate,
    volume,
    timeout: 20_000
  })
  console.log(`run with nodejs edge-tts service...`)
  await tts.ttsPromise(text, output)
  return {
    audio: output,
    srt: output.replace('.mp3', '.srt'),
    success: true
  }
}
export const generateSingleVoice = async ({ text, volume, pitch, voice, rate, output }: Omit<Generate, 'useLLM'> & { output: string }) => {
  let result: TTSResult = {
    audio: '',
    srt: '',
  }
  await safeRunWithRetry(async () => {
    result = await runEdgeTTS({ text, pitch, volume, voice, rate, output });
  })
  return result!
}

// 定义字幕数据的类型
interface Subtitle {
  part: string;    // 字幕文本
  start: number;   // 开始时间（毫秒）
  end: number;     // 结束时间（毫秒）
}

/**
 * 将毫秒转换为 SRT 时间格式（HH:MM:SS,MMM）
 * @param ms 毫秒数
 * @returns 格式化的时间字符串
 */
function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000).toString().padStart(2, '0');
  const minutes = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const milliseconds = (ms % 1000).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

/**
 * 将字幕 JSON 数据转换为 SRT 格式字符串
 * @param subtitles 字幕数组
 * @returns SRT 格式的字符串
 */
function convertToSrt(subtitles: Subtitle[]): string {
  let srtContent = '';

  subtitles.forEach((subtitle, index) => {
    const startTime = formatTime(subtitle.start);
    const endTime = formatTime(subtitle.end);

    // 拼接 SRT 格式：序号 + 时间戳 + 文本 + 空行
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${subtitle.part}\n\n`;
  });

  return srtContent;
}


export const handleSRT = async (output: string) => {
  const jsonPath = output + '.json';
  const srtPath = output.replace('.mp3', '.srt');
  if (await fileExist(srtPath)) {
    console.log(`SRT file already exists at ${srtPath}`);
    return;
  }
  if (!await fileExist(jsonPath)) {
    console.log(`JSON file does not exist at ${jsonPath}`);
    return
  }
  try {
    const subtitles = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const srtResult = convertToSrt(subtitles);
    await fs.writeFile(srtPath, srtResult, 'utf8');
    console.log(`SRT file created at ${srtPath}`);
    await fs.unlink(jsonPath); // 删除 JSON 文件，因为它已经转换为 SRT 文件
    return srtPath; // 返回 SRT 文件路径
  } catch (err) {
    console.error(`Error reading JSON file at ${jsonPath}:`, err);
    return;
  }
}