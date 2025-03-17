import { NextFunction, Response, Request } from 'express';
import { z } from 'zod';

export const generateSchema = z.object({
  text: z.string(),
  pitch: z.string(),
  voice: z.string(),
  volume: z.string(),
  rate: z.string(),
  useLLM: z.boolean().default(false)
})
export type Generate = z.infer<typeof generateSchema>;
export const validateGenerate = (req: Request, res: Response, next: NextFunction) => {
  try {
    generateSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors, success: false });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};