import cors from 'cors'
import helmet from 'helmet'
import express, { Application } from 'express'
import { rateLimit } from 'express-rate-limit'
import history from 'connect-history-api-fallback'
import ttsRoutes from './routes/tts.route'
import { AUDIO_DIR, PUBLIC_DIR, RATE_LIMIT, RATE_LIMIT_WINDOW } from './config'
import { errorHandler } from './middleware/error.middleware'
import { requestLoggerMiddleware } from './middleware/info.middleware'
import { logger } from './utils/logger'

const isDev = process.env.NODE_ENV === 'development'
export function createApp(): Application {
  logger.debug('Creating app...')
  const app = express()
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
    limit: isDev ? 1e6 : RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })

  if (!isDev) {
    logger.debug('Using helmet...')
    app.use(helmet())
  }

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(limiter)

  app.use(history())

  app.use(express.static(AUDIO_DIR))
  app.use(express.static(PUBLIC_DIR))
  app.use(requestLoggerMiddleware)

  app.use('/api/v1/tts', ttsRoutes)

  app.use(errorHandler)

  return app
}
