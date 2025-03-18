import fs from "fs/promises";
import { franc } from 'franc';
import { resolve } from 'path';

export async function getLangConfig(text: string) {
  let lang = franc(text)
  if (lang === 'cmn') { lang = 'zh' }
  const voicePath = resolve(__dirname, `../llm/prompt/voice.json`)
  const voiceList = await readJSON<VoiceConfig[]>(voicePath)
  return { lang, voiceList }
}

export async function readJSON<T>(path: string): Promise<T> {
  try {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data)
  } catch (err) {
    console.log(`readJSON ${path} error:`, (err as Error).message)
    return {} as T
  }
}
export async function ensureDir(path: string) {
  try {
    await fs.access(path);
    console.log(`dir exists: ${path}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await fs.mkdir(path, { recursive: true });
      console.log(`create dir succed: ${path}`);
    } else {
      throw error;
    }
  }
}
export async function safeRunWithRetry(fn: () => {}) {
  for (let retry = 0; retry < 3; retry++) {
    try {
      return await fn();
    } catch (err) {
      if ((err as Error)?.message?.includes('Invalid response status')) {
        console.log(`safeRunWithRetry run ${fn.name} error:`, (err as Error).message);
      } else {
        console.log(err)
        console.log(`safeRunWithRetry run ${fn.name} error:`, (err as Error).message);
      }
      await asyncSleep(200 * (retry + 1));
    }
  }
}
export async function asyncSleep(delay = 200) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
export function generateId(voice: string, text: string) {
  const now = Date.now()
  return `${voice}-${safeFileName(text).slice(0, 10)}_${now}.mp3`
}
function safeFileName(fileName: string) {
  return fileName.replace(/[/\\?%*:|"<>\r\n\s]/g, '-');
}