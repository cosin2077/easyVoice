import express, { Request, Response, NextFunction } from "express";
import { errorHandler } from "./middleware/error.middleware";
import ttsRoutes from "./api/routes/tts.route";
import { logger } from "./utils/logger";
import path from "path";

export function createApp(): Application {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../../dist"))); // 前端静态文件

  // 日志中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // 路由
  app.use("/api", ttsRoutes);

  // 错误处理
  app.use(errorHandler);

  return app;
}