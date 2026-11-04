/**
 * Lightweight service-level checks (no live Edge / OpenAI).
 * Heavy generateTTS integration is covered manually / via curl in round2.
 */
import { preprocessTextForTts } from '../src/services/textNormalize'
import { shouldRejectEnglishVoice } from '../src/utils/langGuard'
import { assertSafeOpenaiBaseUrl } from '../src/utils/ssrf'

describe('tts prerequisites', () => {
  test('preprocess keeps Chinese text and drops pause markers (no filler)', () => {
    const out = preprocessTextForTts('你好(((停顿1秒)))世界')
    expect(out.includes('你好')).toBe(true)
    expect(out.includes('世界')).toBe(true)
    expect(out).not.toMatch(/停顿|…/)
  })

  test('English short text is allowed with en voice', () => {
    expect(shouldRejectEnglishVoice('xho', 'en-US-JennyNeural', 'Hello world')).toBe(false)
  })

  test('openai base url guard blocks local targets by default, allows them on opt-in (#87)', () => {
    expect(() => assertSafeOpenaiBaseUrl('http://127.0.0.1:8317/v1')).toThrow()
    expect(() => assertSafeOpenaiBaseUrl('http://127.0.0.1:8317/v1', { allowPrivate: true })).not.toThrow()
  })
})
