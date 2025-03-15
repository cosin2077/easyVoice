import { runEdgeTTS } from "../../utils/spawn";
import axios from "axios";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { genSegment } from "../../llm/prompt/generateSegment";
import { getLangConfig } from "../../utils";
import { Segment, TTSResult, TTSParams } from "../../types/tts";

const API_TIMEOUT = 10_000;

// 错误消息枚举
enum ErrorMessages {
  INVALID_SEGMENT = "Invalid segment: id and text are required",
  API_FETCH_FAILED = "Failed to fetch TTS parameters from API",
  INVALID_API_RESPONSE = "Invalid API response: no TTS parameters returned",
  PARAMS_PARSE_FAILED = "Failed to parse TTS parameters",
  INVALID_PARAMS_FORMAT = "Invalid TTS parameters format",
  TTS_GENERATION_FAILED = "TTS generation failed",
  INCOMPLETE_RESULT = "Incomplete TTS result"
}

/**
 * 生成文本转语音(TTS)的音频和字幕
 * @param segment 输入的文本片段
 * @throws {Error} 当处理过程中发生错误时抛出具体错误
 * @returns {Promise<TTSResult>} 包含音频路径和字幕的Promise
 */
export async function generateTTS(segment: Segment): Promise<TTSResult> {
  try {
    validateSegment(segment);

    const { lang, voiceList } = await getLangConfig(segment.text);
    const prompt = genSegment(lang, voiceList, segment.text);

    const response = await fetchTTSParams(prompt);
    const params = parseTTSParams(response);

    const output = `${segment.id}.mp3`;

    const result = await runEdgeTTS({
      ...params,
      text: segment.text.trim(),
      output
    });

    // 验证结果
    validateTTSResult(result, segment.id);

    logger.info(`Generated TTS for segment ${segment.id}`);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`TTS generation error: ${errorMessage}`);
    throw error;
  }
}

/**
 * 验证输入的segment
 * @throws {Error} 当segment无效时抛出错误
 */
function validateSegment(segment: Segment): void {
  if (!segment?.id || !segment?.text?.trim()) {
    throw new Error(ErrorMessages.INVALID_SEGMENT);
  }
}

/**
 * 获取TTS参数
 * @throws {Error} 当API调用失败时抛出错误
 */
async function fetchTTSParams(prompt: string): Promise<any> {
  try {
    const response = await axios.post(config.modelApiUrl, { prompt }, { timeout: API_TIMEOUT });
    if (!response?.data?.choices?.[0]?.text) {
      throw new Error(ErrorMessages.INVALID_API_RESPONSE);
    }
    return response;
  } catch (error) {
    throw new Error(`${ErrorMessages.API_FETCH_FAILED}: ${(error as Error).message}`);
  }
}

/**
 * 解析TTS参数
 * @throws {Error} 当解析失败时抛出错误
 */
function parseTTSParams(response: any): TTSParams {
  try {
    const params = JSON.parse(response.data.choices[0].text) as TTSParams;
    if (!params || typeof params !== 'object') {
      throw new Error(ErrorMessages.INVALID_PARAMS_FORMAT);
    }
    return params;
  } catch (error) {
    throw new Error(`${ErrorMessages.PARAMS_PARSE_FAILED}: ${(error as Error).message}`);
  }
}

/**
 * 验证TTS生成结果
 * @throws {Error} 当结果无效时抛出错误
 */
function validateTTSResult(result: TTSResult, segmentId: string): void {
  if (!result?.audio || !result?.srt) {
    throw new Error(`${ErrorMessages.INCOMPLETE_RESULT} for segment ${segmentId}`);
  }
}