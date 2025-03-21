import { createApp } from './app'
import { config } from './config'
import { initApp } from './initApp'
import { logger } from './utils/logger'

const app = createApp()

const start = async () => {
  await initApp()
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`)
  })
}

start()
