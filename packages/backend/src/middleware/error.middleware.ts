import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error(`${err.name}: ${err.message}`);
  res.status(500).json({ error: err.message });
}