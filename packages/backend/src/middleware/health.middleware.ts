import { Request, Response } from 'express'
import { logger } from '../utils/logger'

export function healthHandler(req: Request, res: Response) {
  try {
    // await db.ping();
    const extraInfo = {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    }
    logger.debug(`Health check: `, extraInfo)
    res.status(200).json({
      status: 'ok',
    })
  } catch (error: unknown) {
    // 类型断言或类型检查来处理 unknown
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: errorMessage,
    })
  }
}
