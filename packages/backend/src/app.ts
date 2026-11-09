import express, { Application } from 'express'
import { logger } from './utils/logger'
import { createMiddlewareConfig } from './middleware/config'
import { configureStaticFiles } from './middleware/static'
import { setupRoutes } from './routes'
import { registerEngines } from './tts/engines'
import { ttsPluginManager } from './tts/pluginManager'
import { errorHandler } from './middleware/error.middleware'
import { AuthService, loadAuthConfig } from './services/auth.service'
import { credentialedCors } from './middleware/auth.middleware'

interface AppConfig {
  isDev: boolean
  rateLimit: number
  rateLimitWindow: number
  audioDir: string
  publicDir: string
}

export function createApp(config: AppConfig): Application {
  const { isDev, rateLimit, rateLimitWindow, audioDir, publicDir } = config
  logger.debug('Initializing application...')

  const auth = new AuthService(loadAuthConfig())
  const app = express()
  if (auth.enabled) {
    app.set('trust proxy', 1)
    logger.info('TTS authentication is enabled (username/password login).')
  } else {
    logger.warn(
      'TTS authentication is disabled. Set AUTH_USERNAME and AUTH_PASSWORD_HASH to require login.'
    )
  }
  app.locals.auth = auth

  const middleware = createMiddlewareConfig({
    isDev,
    rateLimit,
    rateLimitWindow,
  })

  const { cors, ...rest } = middleware
  if (auth.enabled) {
    app.use(credentialedCors)
  } else {
    app.use(cors)
  }
  Object.values(rest).forEach((mw) => app.use(mw))

  setupRoutes(app)

  configureStaticFiles(app, { audioDir, publicDir })

  registerEngines()
  app.use(errorHandler)
  return app
}
