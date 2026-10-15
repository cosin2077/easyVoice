import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { ErrorMessages } from '../services/tts.service'

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Request failed:', {
    name: err.name,
    message: err.message,
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      path: req.path,
    },
  })
  const code = getCode(err.message)
  res.status(code).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
}
function getCode(message: string): number {
  if (message.includes(ErrorMessages.ENG_MODEL_INVALID_TEXT)) return 400
  return 500
}
