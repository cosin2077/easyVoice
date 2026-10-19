import path from 'path'
import fs from 'fs/promises'
import ffmpeg from 'fluent-ffmpeg'
import { logger } from '../utils/logger'
import {
  cuesToSrt,
  groupCues,
  mergeSegmentSubtitles,
  parseSegmentSubtitle,
  SegmentSubtitle,
  SubtitleItem,
  toSegmentDoc,
} from '../utils/subtitle'
import { mp3DurationMs } from '../utils/mp3'

/** Per-segment subtitle json path inside a job's temp dir (index is 0-based). */
export function segmentSubtitlePath(tmpDir: string, index: number): string {
  return path.resolve(tmpDir, `seg-${String(index).padStart(4, '0')}.json`)
}

export async function readSegmentSubtitle(
  jsonPath: string,
  audioPath?: string
): Promise<SegmentSubtitle> {
  const seg = parseSegmentSubtitle(JSON.parse(await fs.readFile(jsonPath, 'utf-8')))
  if (seg.durationMs === undefined && audioPath) {
    // Legacy json (no duration): measure the audio itself instead of trusting last cue end.
    try {
      seg.durationMs = mp3DurationMs(await fs.readFile(audioPath))
    } catch (err) {
      logger.warn(`Cannot measure ${audioPath}: ${(err as Error).message}`)
    }
  }
  return seg
}

export async function writeSrt(cues: SubtitleItem[], srtPath: string): Promise<void> {
  await fs.writeFile(srtPath, cuesToSrt(groupCues(cues)), 'utf8')
}

/**
 * Merge ordered per-segment subtitle docs into one SRT (+ merged v2 json).
 * `items` MUST be in playback order; never derive order from file names/readdir.
 */
export async function buildSrtFromSegments(
  items: { json: string; audio?: string }[],
  srtPath: string,
  mergedJsonPath?: string
): Promise<{ durationMs: number; cues: number }> {
  if (!items.length) throw new Error('No subtitle segments')
  const segments = await Promise.all(items.map((i) => readSegmentSubtitle(i.json, i.audio)))
  const merged = mergeSegmentSubtitles(segments)
  if (mergedJsonPath) {
    await fs.writeFile(
      mergedJsonPath,
      JSON.stringify(toSegmentDoc(merged.cues, merged.durationMs), null, 2)
    )
  }
  await writeSrt(merged.cues, srtPath)
  return { durationMs: merged.durationMs, cues: merged.cues.length }
}

/** Concatenate MP3 files in the given order (stream copy). */
export async function concatAudioFiles(
  files: string[],
  outputFile: string,
  listDir: string
): Promise<void> {
  if (!files.length) throw new Error('No MP3 files to concatenate')
  const listPath = path.resolve(listDir, 'file_list.txt')
  await fs.writeFile(
    listPath,
    files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n')
  )
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputFormat('concat')
      .inputOption('-safe', '0')
      .audioCodec('copy')
      .output(outputFile)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Concat failed: ${err.message}`)))
      .run()
  })
}

export async function removeDirQuiet(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch (err) {
    logger.warn(`cleanup ${dir} failed: ${(err as Error).message}`)
  }
}
