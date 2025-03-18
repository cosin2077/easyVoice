// tests/tts.test.ts
import { generateTTS } from "../src/services/tts.service";

jest.mock("axios");
test("generateTTS works", async () => {
  const text = 'Hello', pitch = '0Hz', voice = 'zh-CN', rate = '0%', volume = '0%', useLLM = false;
  const result = await generateTTS({ text, pitch, voice, rate, volume, useLLM });
  expect(result.audio).toBeDefined();
});