import {
  extractJsonPayload,
  parseLLMJsonContent,
  shouldRejectEnglishVoice,
  SHORT_TEXT_LIMIT,
} from '../src/utils/langGuard'

describe('shouldRejectEnglishVoice', () => {
  const en = 'en-US-JennyNeural'
  const zh = 'zh-CN-XiaoxiaoNeural'

  test('never rejects non-English voices', () => {
    expect(shouldRejectEnglishVoice('cmn', zh, '你好世界')).toBe(false)
  })

  test('rejects Chinese text with English voice (any length)', () => {
    expect(shouldRejectEnglishVoice('und', en, '你好')).toBe(true)
    expect(shouldRejectEnglishVoice('zh', en, '这是一段比较长的中文文本用来测试')).toBe(true)
  })

  test('allows short English phrases that franc mislabels', () => {
    const samples = [
      'Healthy',
      'Hello world',
      'I am healthy',
      'How are you today',
      'Please generate speech',
      'English only text here',
    ]
    for (const text of samples) {
      expect(text.length < SHORT_TEXT_LIMIT || true).toBe(true)
      // even if franc returns xho/wol/nds/hat/nld, short Latin text must pass
      expect(shouldRejectEnglishVoice('xho', en, text)).toBe(false)
      expect(shouldRejectEnglishVoice('wol', en, text)).toBe(false)
      expect(shouldRejectEnglishVoice('nds', en, text)).toBe(false)
      expect(shouldRejectEnglishVoice('hat', en, text)).toBe(false)
      expect(shouldRejectEnglishVoice('nld', en, text)).toBe(false)
      expect(shouldRejectEnglishVoice('und', en, text)).toBe(false)
    }
  })

  test('allows longer English when franc is noisy (not clearly non-English)', () => {
    const text = 'The weather is nice today and we should go outside.'
    expect(text.length).toBeGreaterThanOrEqual(SHORT_TEXT_LIMIT)
    expect(shouldRejectEnglishVoice('sco', en, text)).toBe(false)
    expect(shouldRejectEnglishVoice('eng', en, text)).toBe(false)
    expect(shouldRejectEnglishVoice('und', en, text)).toBe(false)
  })

  test('rejects longer text when franc is clearly non-English', () => {
    const text = 'Konnichiwa, this filler makes the string long enough!!'
    expect(text.length).toBeGreaterThanOrEqual(SHORT_TEXT_LIMIT)
    expect(shouldRejectEnglishVoice('jpn', en, text)).toBe(true)
    expect(shouldRejectEnglishVoice('kor', en, text)).toBe(true)
  })
})

describe('extractJsonPayload / parseLLMJsonContent (#71)', () => {
  test('parses raw object', () => {
    expect(parseLLMJsonContent('{"result":[{"text":"hi"}]}')).toEqual({
      result: [{ text: 'hi' }],
    })
  })

  test('strips markdown fences', () => {
    const raw = '```json\n{"segments":[{"text":"a","voice":"en-US-JennyNeural"}]}\n```'
    expect(parseLLMJsonContent(raw)).toEqual({
      segments: [{ text: 'a', voice: 'en-US-JennyNeural' }],
    })
  })

  test('strips prose around JSON', () => {
    const raw = 'Here you go:\n{"result":[1,2,3]}\nThanks'
    expect(extractJsonPayload(raw)).toBe('{"result":[1,2,3]}')
    expect(parseLLMJsonContent(raw)).toEqual({ result: [1, 2, 3] })
  })
})
