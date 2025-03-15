import { Router } from "express";
import { generateAudio, downloadAudio } from "../controllers/tts.controller";

const router = Router();

router.post("/generate", generateAudio);
router.get("/download/:file", downloadAudio);

export default router;