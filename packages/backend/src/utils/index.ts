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
export async function safeRun(fn: () => {}) {
  for (let retry = 0; retry < 3; retry++) {
    try {
      return await fn();
    } catch (err) {
      console.log(err)
      console.log(`safeRun run ${fn.name} error:`, (err as Error).message);
      await asyncSleep(1000);
    }
  }
}
export async function asyncSleep(delay = 200) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}