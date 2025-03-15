import { runEdgeTTS } from "../../utils/spawn";
import axios from "axios";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { genSegment } from "../../llm/prompt/generateSegment";
import { getLangConfig } from "../../utils";

export interface Segment {
  id: string;
  text: string;
}

export interface TTSResult {
  audio: string;
  srt: string;
}

export interface TTSParams {
  name: string;
  text: string;
  voice: string;
  pitch: string;
  speed: string;
  output: string;
}
/**
 * 生成文本转语音(TTS)的音频和字幕
 * @param segment 输入的文本片段
 * @throws {Error} 当API调用失败、参数解析失败或TTS生成失败时抛出具体错误
 * @returns {Promise<TTSResult>} 包含音频路径和字幕的Promise
 */
export async function generateTTS(segment: Segment): Promise<TTSResult> {
  // 输入验证
  if (!segment?.id || !segment?.text?.trim()) {
    throw new Error('Invalid segment: id and text are required');
  }

  let response;
  try {
    const { lang, voiceList } = await getLangConfig(segment.text)
    const prompt = genSegment(lang, voiceList, segment.text)
    response = await axios.post(config.modelApiUrl, {
      prompt,
    }, {
      timeout: 10_000
    });
  } catch (error) {
    throw new Error(`Failed to fetch TTS parameters from API: ${(error as Error).message}`);
  }

  // 检查API响应
  if (!response?.data?.choices?.[0]?.text) {
    throw new Error('Invalid API response: no TTS parameters returned');
  }

  let params: TTSParams;
  try {
    params = JSON.parse(response.data.choices[0].text) as TTSParams;
  } catch (error) {
    throw new Error(`Failed to parse TTS parameters: ${(error as Error).message}`);
  }

  // TTS参数验证
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid TTS parameters format');
  }
  const output = `${segment.id}.mp3`;
  let result: TTSResult;
  try {
    result = await runEdgeTTS({
      ...params,
      text: segment.text.trim(),
      output
    });
  } catch (error) {
    throw new Error(`TTS generation failed for segment ${segment.id}: ${(error as Error).message}`);
  }

  // 验证生成结果
  if (!result?.audio || !result?.srt) {
    throw new Error(`Incomplete TTS result for segment ${segment.id}`);
  }

  logger.info(`Generated TTS for segment ${segment.id}`);
  return result;
}