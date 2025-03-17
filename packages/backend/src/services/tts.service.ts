import { runEdgeTTS } from "../utils/spawn";
import { config } from "../config";
import { logger } from "../utils/logger";
import { genSegment } from "../llm/prompt/generateSegment";
import { ensureDir, getLangConfig } from "../utils";
import { fetcher } from "../utils/request";
import { openai } from "../utils/openai";
import { splitText } from "./text.service";
import { generateSingleVoice } from "./edge-tts.service";
import { Generate } from "../schema/generate";
import path from "path";
import fs from "fs/promises";
import ffmpeg from 'fluent-ffmpeg';

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
export async function generateTTS({ text, pitch, voice, rate, volume, useLLM }: Generate): Promise<TTSResult> {
  try {
    const segment: Segment = { id: `seg_${Date.now()}.mp3`, text };
    validateSegment(segment);
    const { lang, voiceList } = await getLangConfig(segment.text);
    let result: TTSResult
    if (!useLLM) {
      // no LLM
      const { text, id } = segment
      const { length, segments } = splitText(text)
      if (length <= 1) {
        const output = path.resolve(__dirname, '..', '..', 'audio', id)
        result = await runEdgeTTS({ text: segments[0], pitch, voice, rate, volume, output })
        result.audio = `http://localhost:3000/${id}`
      } else {
        const fileList = []
        const tmpDirName = Math.random().toString().slice(0, 10)
        const tmpDirPath = path.resolve(__dirname, '..', '..', 'audio', tmpDirName)
        ensureDir(tmpDirPath)
        for (let index = 0; index < segments.length; index++) {
          const segment = segments[index]
          const output = path.resolve(tmpDirPath, `${index + 1}_splits.mp3`)
          await runEdgeTTS({ text: segment, pitch, voice, rate, volume, output })
          fileList.push(output)
        }
        const inputDir = tmpDirPath
        const outputFile = path.resolve(tmpDirPath, 'final.mp3')
        await concatMp3Files({ inputDir, outputFile })
        result = {
          audio: `http://localhost:3000/${tmpDirName}/final.mp3`,
          srt: ''
        }
      }
    } else {
      // use LLM
      const prompt = genSegment(lang, voiceList, segment.text);
      // formated JSON LLM returns.
      const segmentList = await fetchLLMSegment(prompt);
      // const output = `${segment.id}.mp3`;
      const result = await runEdgeTTS({
        ...(prompt as any),
        text: segment.text.trim(),
      });
    }
    // 验证结果
    validateTTSResult(result!, segment.id);
    logger.info(`Generated TTS for segment ${segment.id}`);
    return result!;
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
async function fetchLLMSegment(prompt: string): Promise<any> {
  try {

    const response = await openai.createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // const response = await fetcher.post(config.modelApiUrl, { prompt }, { timeout: API_TIMEOUT })
    if (!response.choices[0].message.content) {
      throw new Error(ErrorMessages.INVALID_API_RESPONSE);
    }
    parseLLMResponse(response);
    return response;
  } catch (error) {
    throw new Error(`${ErrorMessages.API_FETCH_FAILED}: ${(error as Error).message}`);
  }
}

/**
 * 解析TTS参数
 * @throws {Error} 当解析失败时抛出错误
 */
function parseLLMResponse(response: any): TTSParams {
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

export interface ConcatAudioParams {
  inputDir: string; // 输入文件夹路径
  outputFile: string; // 输出文件路径
}
/**
 * 将指定文件夹中的 MP3 文件拼接成单个音频文件
 * @param params 输入参数
 * @returns Promise<void>
 */
export async function concatMp3Files(params: ConcatAudioParams): Promise<void> {
  const { inputDir, outputFile } = params;

  try {
    // 检查输入文件夹是否存在
    await fs.access(inputDir)

    // 查找所有 MP3 文件并排序
    const mp3Files = (await fs.readdir(inputDir))
      .filter((file) => path.extname(file).toLowerCase() === '.mp3')
      .map((file) => path.join(inputDir, file))
      .sort((x: string, y: string) => Number(x.split('_')[0]) - Number(y.split('_')[0])); // 按文件名自然排序

    // 检查是否有 MP3 文件
    if (mp3Files.length === 0) {
      throw new Error('错误: 输入文件夹中没有找到 MP3 文件');
    }

    // 创建临时文件列表
    const tempListPath = path.resolve(inputDir, 'file_list.txt');
    const fileListContent = mp3Files.map((file) => `file '${file}'`).join('\n');
    await fs.writeFile(tempListPath, fileListContent);

    // 使用 fluent-ffmpeg 拼接
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(tempListPath)
        .inputFormat('concat')
        .inputOption('-safe', '0') // 允许非标准路径
        .audioCodec('copy') // 不重新编码，直接复制
        .output(outputFile)
        .on('end', () => {
          console.log(`成功: 已生成 ${outputFile}`);
          resolve();
        })
        .on('error', (err: Error) => {
          reject(new Error(`错误: 拼接失败 - ${err.message}`));
        })
        .run();
    });

    // await fs.unlink(tempListPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : '未知错误');
    throw error;
  }
}