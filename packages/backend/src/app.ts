import express, { Request, Response, NextFunction, Application } from "express";
import { errorHandler } from "./middleware/error.middleware";
import ttsRoutes from "./routes/tts.route";
import { logger } from "./utils/logger";
import path from "path";
import cors from 'cors';
import { requestLoggerMiddleware } from "./middleware/info.middleware";
import { AUDIO_DIR , PUBLIC_DIR} from "./config";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(AUDIO_DIR));
  app.use(express.static(PUBLIC_DIR));

  app.use(requestLoggerMiddleware);
  app.use("/api", ttsRoutes);
  app.use(errorHandler);

  return app;
}
