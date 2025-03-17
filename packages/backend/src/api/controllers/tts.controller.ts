import { Request, Response, NextFunction } from "express";
import { generateTTS } from "../services/tts.service";
import { logger } from "../../utils/logger";
import path from "path";
import fs from "fs/promises";
import { ALLOWED_EXTENSIONS, AUDIO_DIR } from "../../config";

export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, pitch, voice, rate, useLLM } = req.body;
    if (!text?.trim()) throw new Error("Text is required");
    logger.info(`generateAudio body: `, req.body)
    const segment: Segment = { id: `seg_${Date.now()}`, text };
    const result = await generateTTS(segment, useLLM);

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

export async function getVoices(req: Request, res: Response, next: NextFunction) {
  try {
    const voices = require('../../llm/prompt/voice.json')
    res.json({
      data: voices,
      success: true,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`getVoices Error: ${errorMessage}`);
    res.status(500).json({
      msg: errorMessage,
      success: false,
    })
  }
}