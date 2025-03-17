import { Router } from "express";
import { generateAudio, downloadAudio, getVoiceList } from "../controllers/tts.controller";
import { validateGenerate } from "../../schema/generate";

const router = Router();

router.get("/voiceList", getVoiceList);
router.post("/generate", validateGenerate, generateAudio);
router.get("/download/:file", downloadAudio);

export default router;