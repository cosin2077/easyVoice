import expressWinston from "express-winston";
import { logger } from "../utils/logger";

export const requestLoggerMiddleware = expressWinston.logger({
  winstonInstance: logger,
  meta: false, // 记录请求/响应的详细元数据
  msg: "HTTP {{req.method}} {{req.url}}", // 日志消息模板
  expressFormat: true, // 使用类似 Morgan 的格式
  colorize: false, // 控制台是否启用颜色（JSON 不需要）
  dynamicMeta: (req, res) => { // 可选：动态添加元数据
    return {
      ip: req.ip,
      // userAgent: req.headers["user-agent"],
    };
  },
});
