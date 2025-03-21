import { Router } from 'express'
import { validateCreateTask, validateGenerate } from '../schema/generate'
import { generateAudio, downloadAudio, getVoiceList, createTask, getTask } from '../controllers/tts.controller'

const router = Router()

router.get('/voiceList', getVoiceList)
router.post('/create', validateCreateTask, createTask)
router.post('/task/:id', getTask)
router.post('/generate', validateGenerate, generateAudio)
router.get('/download/:file', downloadAudio)

export default router
