import cors from 'cors';
import { rateLimit } from 'express-rate-limit'
import express, { Application } from "express";
import helmet from 'helmet'
import history from 'connect-history-api-fallback'
import ttsRoutes from "./routes/tts.route";
import { AUDIO_DIR, PUBLIC_DIR, RATE_LIMIT, RATE_LIMIT_WINDOW } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import { requestLoggerMiddleware } from "./middleware/info.middleware";


export function createApp(): Application {
  const app = express();
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW * 60 * 1000, // 1 minutes
    limit: RATE_LIMIT, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  })
  app.use(helmet());
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
