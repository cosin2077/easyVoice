import { Application } from 'express'
import ttsRoutes from './tts.route'
import history from 'connect-history-api-fallback'
import { healthHandler } from '../middleware/health.middleware'

export function setupRoutes(app: Application): void {
  app.use('/api/v1/tts', ttsRoutes)
  app.use('/api/health', healthHandler)
  app.use(history())
}
