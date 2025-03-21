import { Router } from "express";
import { validateGenerate } from "../schema/generate";
import { generateAudio, downloadAudio, getVoiceList } from "../controllers/tts.controller";

const router = Router();

router.get("/voiceList", getVoiceList);
router.post("/generate", validateGenerate, generateAudio);
router.get("/download/:file", downloadAudio);

export default router;
