import { Router } from "express";
import { generateAudio, downloadAudio, getVoices } from "../controllers/tts.controller";
import { validateGenerate } from "../../schema/generate";

const router = Router();

router.get("/voices", getVoices);
router.post("/generate", validateGenerate, generateAudio);
router.get("/download/:file", downloadAudio);

export default router;