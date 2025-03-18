import { Request, Response, NextFunction } from "express";
import { generateTTS } from "../services/tts.service";
import { logger } from "../utils/logger";
import path from "path";
import fs from "fs/promises";
import { ALLOWED_EXTENSIONS, AUDIO_DIR } from "../config";
import { Generate } from "../schema/generate";

function formatBody({ text, pitch, voice, volume, rate, useLLM }: Generate) {
  const positivePercent = (value: string) => {
    if (value === '0%') return '+0%'
    return value
  }
  const positiveHz = (value: string) => {
    if (value === '0Hz') return '+0Hz'
    return value
  }
  return {
    text: text.trim(), pitch: positiveHz(pitch), voice: positivePercent(voice), rate: positivePercent(rate), volume: positivePercent(volume), useLLM
  }
}
export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, pitch, volume, voice, rate, useLLM } = req.body;
    logger.info(`generateAudio body: `, req.body)
    const formattedBody = formatBody({ text, pitch, volume, voice, rate, useLLM })
    const result = await generateTTS(formattedBody);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadAudio(req: Request, res: Response): Promise<void> {
  const fileName = req.params.file;

  try {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid file name');
    }

    const fileExt = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw new Error('Invalid file type');
    }

    const safeFileName = path.basename(fileName);
    const filePath = path.join(AUDIO_DIR, safeFileName);

    await fs.access(filePath, fs.constants.R_OK);

    res.setHeader('Content-Type', `audio/${fileExt.slice(1)}`);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

    res.download(filePath, safeFileName, (err) => {
      if (err) { throw err; }
      logger.info(`Successfully downloaded file: ${safeFileName}`);
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Download failed for ${fileName}: ${errorMessage}`);

    const statusCode = errorMessage.includes('Invalid') ? 400 :
      errorMessage.includes('ENOENT') ? 404 : 500;

    res.status(statusCode).json({
      error: 'Failed to download file',
      message: errorMessage
    });
  }
}

export async function getVoiceList(req: Request, res: Response, next: NextFunction) {
  try {
    const voices = require('../llm/prompt/voice.json')
    res.json({
      data: voices,
      success: true,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`getVoiceList Error: ${errorMessage}`);
    res.status(500).json({
      msg: errorMessage,
      success: false,
    })
  }
}