import { defaultVoiceFor, formatLlmSegments } from '../src/services/tts.shared'

const voiceList = [
  { Name: 'zh-CN-XiaoxiaoNeural', Gender: 'Female' },
  { Name: 'zh-CN-YunyangNeural', Gender: 'Male' },
] as any

describe('LLM casting sanitation', () => {
  test('unknown voices and malformed prosody fall back safely', () => {
    const out = formatLlmSegments(
      [
        { voice: 'zh-CN-YunyangNeural', character: '老李', text: '你好', rate: '-8%', pitch: '-5Hz' },
        { voice: 'zh-CN-MadeUpNeural', text: '编造的音色', rate: 'fast', pitch: '高', volume: '+200' },
        { voice: '', text: '没有音色' },
        { voice: 'zh-CN-XiaoxiaoNeural', text: '   ' },
      ],
      { voiceList, fallbackVoice: 'zh-CN-XiaoxiaoNeural' }
    )
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ voice: 'zh-CN-YunyangNeural', rate: '-8%', pitch: '-5Hz', volume: '+0%' })
    expect(out[1]).toMatchObject({ voice: 'zh-CN-XiaoxiaoNeural', rate: '+0%', pitch: '+0Hz', volume: '+0%' })
    expect(out[2].voice).toBe('zh-CN-XiaoxiaoNeural')
  })
  test('default voice by language / script', () => {
    expect(defaultVoiceFor('zh')).toBe('zh-CN-XiaoxiaoNeural')
    expect(defaultVoiceFor('und', '中文文本')).toBe('zh-CN-XiaoxiaoNeural')
    expect(defaultVoiceFor('und', 'hello')).toMatch(/^en-/)
  })
})
