import { Application } from 'express'
import ttsRoutes from './tts.route'
import authRoutes from './auth.route'
import history from 'connect-history-api-fallback'
import { healthHandler } from '../middleware/health.middleware'
import { requireAuth } from '../middleware/auth.middleware'

export function setupRoutes(app: Application): void {
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/tts', requireAuth, ttsRoutes)
  app.use('/api/health', healthHandler)
  app.use(history())
}
