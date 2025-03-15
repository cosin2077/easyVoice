import { franc } from 'franc';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

export async function getLangConfig(text: string) {
  let lang = franc(text)
  if (lang === 'cmn') { lang = 'zh' }
  const voicePath = resolve(__dirname, `../llm/prompt/voice.json`)
  const voiceList = await readJSON<VoiceConfig[]>(voicePath)
  return { lang, voiceList }
}

export async function readJSON<T>(path: string): Promise<T> {
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data)
  } catch (err) {
    console.log(`readJSON ${path} error:`, (err as Error).message)
    return {} as T
  }
}