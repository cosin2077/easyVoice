import { ensureDir } from "./utils";
import { AUDIO_DIR, PUBLIC_DIR } from "./config";


export async function initApp() {
  await ensureDir(AUDIO_DIR)
  await ensureDir(PUBLIC_DIR)
}
