import path from "path";
import { ensureDir } from "./utils";

const AUDIO_DIR = path.resolve(__dirname, '..', 'audio');

export async function initApp() {
  // Prepare works like db, runtime configs...
  await ensureDir(AUDIO_DIR)
}