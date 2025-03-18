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
export async function safeRunWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    baseDelayMs?: number;
    onError?: (err: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, baseDelayMs = 200, onError = defaultErrorHandler } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      onError(err, attempt + 1);
      if (attempt < retries - 1) {
        await asyncSleep(baseDelayMs * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unexpected execution flow'); // 理论上不会到达这里
}

// 默认错误处理器
function defaultErrorHandler(err: unknown, attempt: number): void {
  const message = err instanceof Error ? err.message : String(err);
  const fnName = (err as any)?.fn?.name || 'anonymous';
  if (message.includes('Invalid response status')) {
    console.log(`Attempt ${attempt} failed for ${fnName}: ${message}`);
  } else {
    console.error(`Attempt ${attempt} failed for ${fnName}:`, err);
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

export async function fileExist(path: string) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}