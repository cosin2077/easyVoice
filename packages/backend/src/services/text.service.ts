// src/api/services/text.service.ts
import { Jieba } from "@node-rs/jieba";

const jieba = new Jieba()
const TARGET_LENGTH = 500;
// 中文分割函数
export function splitText(text: string, targetLength = TARGET_LENGTH) {
  if (text.length < targetLength) return { length: 1, segments: [text] };
  const segments: string[] = [];
  let currentSegment = "";
  let sentences = text.split(/([。！？.!?])/); // 按句号、感叹号、问号分割，并保留标点

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = (sentences[i] || "") + (sentences[i + 1] || ""); // 拼接句子和标点
    if (!sentence.trim()) continue;

    // 检查当前片段加上新句子后的长度
    if ((currentSegment + sentence).length <= targetLength) {
      currentSegment += sentence;
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = sentence; // 开始新片段
    }
  }

  // 处理最后一个片段
  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  // 对过长的片段进一步细分
  const finalSegments = [];
  for (let segment of segments) {
    if (segment.length <= targetLength) {
      finalSegments.push(segment);
    } else {
      // 使用 jieba 分词后按词数重新分割
      const words = jieba.cut(segment);
      let subSegment = "";
      for (let word of words) {
        if ((subSegment + word).length <= targetLength) {
          subSegment += word;
        } else {
          finalSegments.push(subSegment);
          subSegment = word;
        }
      }
      if (subSegment) finalSegments.push(subSegment);
    }
  }

  return { length: finalSegments.length, segments: finalSegments };
}