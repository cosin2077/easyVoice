import { Request, Response, NextFunction } from "express";
import { generateTTS } from "../services/tts.service";
import { logger } from "../../utils/logger";
import { Segment } from "../../types/tts";

export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body;
    if (!text) throw new Error("Text is required");

    const segment: Segment = { id: `seg_${Date.now()}`, text };
    const result = await generateTTS(segment);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export function downloadAudio(req: Request, res: Response) {
  const file = req.params.file;
  res.download(file, (err) => {
    if (err) {
      logger.error(`Download failed: ${err.message}`);
      res.status(500).send("Failed to download file");
    }
  });
}