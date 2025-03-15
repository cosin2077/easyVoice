// tests/tts.test.ts
import { generateTTS } from "../src/api/services/tts.service";

jest.mock("axios");
test("generateTTS works", async () => {
  const result = await generateTTS({ id: "test", text: "Hello" });
  expect(result.audio).toBeDefined();
});