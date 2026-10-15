import expressWinston from 'express-winston'
import { logger } from '../utils/logger'

export const requestLoggerMiddleware = expressWinston.logger({
  winstonInstance: logger,
  meta: false, // 记录请求/响应的详细元数据
  msg: 'HTTP {{req.method}} {{req.path}}', // 避免把 query 参数写入访问日志
  expressFormat: true, // 使用类似 Morgan 的格式
  colorize: false, // 控制台是否启用颜色（JSON 不需要）
})
