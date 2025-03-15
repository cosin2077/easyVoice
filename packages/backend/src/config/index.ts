import dotenv from "dotenv";
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  modelApiUrl: process.env.MODEL_API_URL || "https://api.example.com",
};

export const AUDIO_DIR = path.join(__dirname, '../../audio');
export const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg']);
