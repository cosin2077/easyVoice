import { Application } from 'express'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from '../swagger' // 引入上一步创建的 Swagger 配置
import ttsRoutes from './tts.route'
import history from 'connect-history-api-fallback'
import { healthHandler } from '../middleware/health.middleware'
import { auth } from '../middleware/auth.middleware'

export function setupRoutes(app: Application): void {
  app.use('/api/v1/tts', ttsRoutes)
  app.use('/api/health', healthHandler)
  app.use('/api-docs',auth, swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  app.use(history())
}
