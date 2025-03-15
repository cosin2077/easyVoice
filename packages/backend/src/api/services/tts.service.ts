import { runEdgeTTS, TTSParams } from "../../utils/spawn";
import axios from "axios";
import { config } from "../../config";
import { logger } from "../../utils/logger";

export interface Segment {
  id: string;
  text: string;
}

export async function generateTTS(segment: Segment): Promise<{ audio: string; srt: string }> {
  // 调用大模型获取参数
  const { data } = await axios.post(config.modelApiUrl, {
    prompt: `为这段文字推荐语音参数：${segment.text}`,
    max_tokens: 50,
  });
  const params: TTSParams = JSON.parse(data.choices[0].text);

  // 生成音频和字幕
  const output = `${segment.id}.mp3`;
  const result = await runEdgeTTS({ ...params, text: segment.text, output });

  logger.info(`Generated TTS for segment ${segment.id}`);
  return result;
}