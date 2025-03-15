import { runEdgeTTS, TTSParams } from "../../utils/spawn";
import axios from "axios";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { genSegment } from "../../llm/prompt/generateSegment";
import { getLangConfig } from "../../utils";

export interface Segment {
  id: string;
  text: string;
}

export async function generateTTS(segment: Segment): Promise<{ audio: string; srt: string }> {
  const { lang, voiceList } = await getLangConfig(segment.text)
  const prompt = genSegment(lang, voiceList, segment.text)
  const { data } = await axios.post(config.modelApiUrl, {
    prompt,
  });
  const params: TTSParams = JSON.parse(data.choices[0].text);

  // 生成音频和字幕
  const output = `${segment.id}.mp3`;
  const result = await runEdgeTTS({ ...params, text: segment.text, output });

  logger.info(`Generated TTS for segment ${segment.id}`);
  return result;
}