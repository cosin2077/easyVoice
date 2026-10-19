import fs from 'fs/promises'
import { EdgeSchema } from '../schema/generate'
import { EdgeTTS } from '../lib/node-edge-tts/edge-tts-fixed'
import { readSegmentSubtitle, writeSrt } from './subtitle.service'

export async function runEdgeTTS({
  text,
  pitch,
  volume,
  voice,
  rate,
  output,
  outputType = 'file',
  subtitlePath,
}: Omit<EdgeSchema, 'useLLM'> & { output: string; outputType?: string; subtitlePath?: string }) {
  const lang = /([a-zA-Z]{2,5}-[a-zA-Z]{2,5}\b)/.exec(voice)?.[1]
  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    saveSubtitles: true,
    pitch,
    rate,
    volume,
    timeout: 30_000,
  })
  if (outputType === 'file') {
    await tts.ttsPromise(text, { audioPath: output, outputType, subtitlePath })
    return {
      audio: output,
      srt: output.replace('.mp3', '.srt'),
      file: '',
    }
  }
  return tts.ttsPromise(text, { audioPath: output, outputType: outputType as any, subtitlePath })
}
export const generateSingleVoice = async (
  params: Omit<EdgeSchema, 'useLLM'> & { output: string; subtitlePath?: string }
) => {
  // Retries are owned by callers (SEGMENT_MAX_RETRIES); nesting another retry loop here
  // used to multiply attempts (5 x N) and hide persistent failures for minutes.
  return (await runEdgeTTS({ ...params })) as TTSResult
}
export const generateSingleVoiceStream = async (
  params: Omit<EdgeSchema, 'useLLM'> & {
    output: string
    outputType?: string
    subtitlePath?: string
  }
) => {
  return runEdgeTTS({ ...params, outputType: 'stream' })
}

/**
 * Convert one segment subtitle json (v2 or legacy array) into an SRT file.
 * Always (re)writes: a stale SRT from an earlier run must never win.
 */
export const generateSrt = async (jsonPath: string, srtPath: string, deleteJson = false) => {
  try {
    const seg = await readSegmentSubtitle(jsonPath)
    await writeSrt(seg.cues, srtPath)
    if (deleteJson) await fs.unlink(jsonPath)
    return srtPath
  } catch (err) {
    console.error(`Error converting subtitles ${jsonPath}:`, (err as Error).message)
    return
  }
}
