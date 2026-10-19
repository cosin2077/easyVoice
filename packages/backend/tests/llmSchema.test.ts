import { normalizeLlmCasting } from '../src/llm/segmentSchema'

describe('normalizeLlmCasting', () => {
  test('accepts modern schema', () => {
    const out = normalizeLlmCasting({
      segments: [
        {
          voice: 'zh-CN-XiaoxiaoNeural',
          character: 'narration',
          text: '你好',
          rate: '+0%',
          pitch: '+0Hz',
          volume: '+0%',
        },
      ],
    })
    expect(out.segments).toHaveLength(1)
    expect(out.segments[0].voice).toBe('zh-CN-XiaoxiaoNeural')
  })

  test('maps legacy name/charactor', () => {
    const out = normalizeLlmCasting({
      result: [{ name: 'en-US-JennyNeural', charactor: 'Alice', text: 'Hi' }],
    })
    expect(out.segments[0].voice).toBe('en-US-JennyNeural')
    expect(out.segments[0].character).toBe('Alice')
  })

  test('rejects empty', () => {
    expect(() => normalizeLlmCasting({ segments: [] })).toThrow()
  })
})
