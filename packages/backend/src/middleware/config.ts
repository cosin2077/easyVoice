import cors from 'cors'
import helmet from 'helmet'
import { rateLimit as RateLimit } from 'express-rate-limit'
import express, { Request, Response, NextFunction } from 'express'
import { errorHandler } from './error.middleware'
import { requestLoggerMiddleware } from './info.middleware'

interface MiddlewareConfig {
  isDev: boolean
  rateLimit: number
  rateLimitWindow: number
}

export function createMiddlewareConfig({ isDev, rateLimit, rateLimitWindow }: MiddlewareConfig) {
  const limiter = RateLimit({
    windowMs: rateLimitWindow * 60 * 1000,
    limit: isDev ? 1e6 : rateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })

  return {
    helmet: isDev ? (_req: Request, _res: Response, next: NextFunction) => next() : helmet(),
    cors: cors(),
    json: express.json({ limit: '10mb' }),
    limiter,
    requestLogger: requestLoggerMiddleware,
    errorHandler,
  }
}
