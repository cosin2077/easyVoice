import { Request, Response } from 'express'
import { logger } from '../utils/logger'

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     description: 检查服务器运行状态
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 服务器运行正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 uptime:
 *                   type: number
 *                   example: 12345
 *       500:
 *         description: 服务器异常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 */
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
