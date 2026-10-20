import { Router } from 'express'
import {
  generateAudio,
  downloadAudio,
  getVoiceList,
  createTask,
  getTask,
  getTaskStats,
} from '../controllers/tts.controller'
import { pickSchema } from '../controllers/pick.controller'
import { ttsPluginManager } from '../tts/pluginManager'
import { createTaskStream, generateJson } from '../controllers/stream.controller'
import { validateJson } from '../schema/generate'

const router = Router()

router.get('/engines', (req, res) => {
  const engines = ttsPluginManager.getAllEngines().map((engine) => ({
    name: engine.name,
    languages: engine.getSupportedLanguages(),
    voices: engine.getVoiceOptions?.() || [],
  }))
  res.json(engines)
})

/**
 * Whether the server has its own LLM endpoint configured (OPENAI_BASE_URL + OPENAI_API_KEY
 * + MODEL_NAME). Only the model name and host are exposed — never the key. The key is lent
 * only to that same base URL (see validateLLM), so the page can use AI mode without one.
 */
router.get('/llmConfig', (_req, res) => {
  const { OPENAI_BASE_URL, OPENAI_API_KEY, MODEL_NAME } = process.env
  let host = ''
  try {
    host = OPENAI_BASE_URL ? new URL(OPENAI_BASE_URL).host : ''
  } catch {
    host = ''
  }
  const available = !!(host && OPENAI_API_KEY && MODEL_NAME)
  res.json({
    success: true,
    code: 200,
    data: { available, model: available ? MODEL_NAME : '', host: available ? host : '' },
  })
})

router.get('/voiceList', getVoiceList)
router.get('/task/stats', getTaskStats)
router.get('/task/:id', getTask)
router.get('/download/:file', downloadAudio)

router.post('/create', pickSchema, createTask)
router.post('/createStream', pickSchema, createTaskStream)
router.post('/generate', pickSchema, generateAudio)
router.post('/generateJson', validateJson, generateJson)

export default router
