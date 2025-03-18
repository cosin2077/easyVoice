import cors from 'cors';
import express, { Application } from "express";
import ttsRoutes from "./routes/tts.route";
import { AUDIO_DIR, PUBLIC_DIR } from "./config";
import history from 'connect-history-api-fallback'
import { errorHandler } from "./middleware/error.middleware";
import { requestLoggerMiddleware } from "./middleware/info.middleware";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(AUDIO_DIR));
  app.use(express.static(PUBLIC_DIR));
  app.use(history())

  app.use(requestLoggerMiddleware);
  app.use("/api", ttsRoutes);
  app.use(errorHandler);

  return app;
}
