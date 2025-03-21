import { Application } from 'express'
import express from 'express'

interface StaticConfig {
  audioDir: string
  publicDir: string
}

export function configureStaticFiles(
  app: Application,
  { audioDir, publicDir }: StaticConfig
): void {
  app.use(express.static(audioDir))
  app.use(express.static(publicDir))
}
