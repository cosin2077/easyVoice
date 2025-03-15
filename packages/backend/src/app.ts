import express, { Request, Response, NextFunction, Application } from "express";
import { errorHandler } from "./middleware/error.middleware";
import ttsRoutes from "./api/routes/tts.route";
import { logger } from "./utils/logger";
import path from "path";
import cors from 'cors';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../../dist")));

  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  app.use("/api", ttsRoutes);

  app.use(errorHandler);

  return app;
}
