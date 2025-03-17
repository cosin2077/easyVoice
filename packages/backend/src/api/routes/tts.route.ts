import { Router } from "express";
import { generateAudio, downloadAudio, getVoices } from "../controllers/tts.controller";

const router = Router();

router.get("/voices", getVoices);
router.post("/generate", generateAudio);
router.get("/download/:file", downloadAudio);

export default router;