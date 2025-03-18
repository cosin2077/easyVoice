import path from "path";
import { ensureDir } from "./utils";
import { AUDIO_DIR, PUBLIC_DIR } from "./config";


export async function initApp() {
  // Prepare works like db, runtime configs...
  await ensureDir(AUDIO_DIR)
  await ensureDir(PUBLIC_DIR)
}