import { Application } from 'express'
import express from 'express'
import { requireAuthForAudio } from './auth.middleware'

interface StaticConfig {
  audioDir: string
  publicDir: string
}

export function configureStaticFiles(
  app: Application,
  { audioDir, publicDir }: StaticConfig
): void {
  app.use(requireAuthForAudio, express.static(audioDir))
  app.use(express.static(publicDir))
}
