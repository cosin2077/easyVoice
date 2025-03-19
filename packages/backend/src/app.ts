import cors from 'cors';
import express, { Application } from "express";
import ttsRoutes from "./routes/tts.route";
import { AUDIO_DIR, FRONT_DIST, PUBLIC_DIR } from "./config";
import history from 'connect-history-api-fallback'
import { errorHandler } from "./middleware/error.middleware";
import { requestLoggerMiddleware } from "./middleware/info.middleware";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(history({
    index: '/index.html',
    logger: console.log.bind(console),
    rewrites: [
      // { from: /\/api\/.*/, to: '' } 
    ]
  }));

  app.use(express.static(AUDIO_DIR));
  app.use(express.static(PUBLIC_DIR));
  app.use(express.static(FRONT_DIST));
  app.use(requestLoggerMiddleware);
  app.use("/api", ttsRoutes);

  app.use(errorHandler);

  return app;
}
