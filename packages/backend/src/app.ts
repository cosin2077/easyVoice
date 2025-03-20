import cors from 'cors';
import { rateLimit } from 'express-rate-limit'
import express, { Application } from "express";
import helmet from 'helmet'
import history from 'connect-history-api-fallback'
import ttsRoutes from "./routes/tts.route";
import { AUDIO_DIR, PUBLIC_DIR, RATE_LIMIT, RATE_LIMIT_WINDOW } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import { requestLoggerMiddleware } from "./middleware/info.middleware";

const isDev = process.env.NODE_ENV === 'development'
export function createApp(): Application {
  const app = express();
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
    limit: isDev ? 1e6 : RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })

  if (!isDev) {
    app.use(helmet());
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(limiter);

  app.use(history());

  app.use(express.static(AUDIO_DIR));
  app.use(express.static(PUBLIC_DIR));
  app.use(requestLoggerMiddleware);

  app.use("/api", ttsRoutes);

  app.use(errorHandler);

  return app;
}
