import { silentMp3, mp3DurationMs, parseFrameHeader } from '../src/utils/mp3'
import { mergeSegmentSubtitles } from '../src/utils/subtitle'
import { unitsToCast } from '../src/services/tts.shared'
import { planJsonItems } from '../src/services/tts.stream.service'
import taskManager, { publicTask } from '../src/utils/taskManager'

describe('silence frames', () => {
  test('Edge-format silent frames with exact duration', () => {
    const { buffer, durationMs } = silentMp3(3000)
    expect(durationMs).toBe(3000)
    expect(buffer.length).toBe(125 * 288)
    const h = parseFrameHeader(buffer, 0)!
    expect(h).toEqual({ length: 288, samples: 576, sampleRate: 24000 })
    expect(mp3DurationMs(buffer)).toBe(3000)
  })

  test('rounds to whole 24ms frames', () => {
    expect(silentMp3(500).durationMs).toBe(504)
    expect(silentMp3(0).buffer.length).toBe(0)
  })

  test('silence shifts later subtitles by exactly its duration', () => {
    const merged = mergeSegmentSubtitles([
      { cues: [{ part: 'a', start: 100, end: 900 }], durationMs: 1200 },
      { cues: [], durationMs: 3000 },
      { cues: [{ part: 'b', start: 80, end: 700 }], durationMs: 1000 },
    ])
    expect(merged.cues).toEqual([
      { part: 'a', start: 100, end: 900 },
      { part: 'b', start: 4280, end: 4900 },
    ])
    expect(merged.durationMs).toBe(5200)
  })
})

describe('cast planning', () => {
  test('unitsToCast keeps prosody and marks silences', () => {
    const p = { voice: 'zh-CN-XiaoxiaoNeural', rate: '+0%', pitch: '+0Hz', volume: '+0%' }
    expect(unitsToCast([{ type: 'text', text: '你好' }, { type: 'break', ms: 2000 }], p)).toEqual([
      { ...p, text: '你好' },
      { ...p, text: '', silenceMs: 2000 },
    ])
  })

  test('generateJson splits oversized items and honours pauses (#62)', () => {
    const big = '很长的一段旁白。'.repeat(1000) // ~8000 chars, > 10 min of audio in one request
    const cast = planJsonItems([
      { text: big, voice: 'zh-CN-YunxiNeural', rate: '+0%', pitch: '+0Hz', volume: '+0%', useLLM: false },
      { text: '你好(((停顿2秒)))再见', voice: 'zh-CN-XiaoyiNeural', rate: '-10%', pitch: '+0Hz', volume: '+0%', useLLM: false },
    ])
    const spoken = cast.filter((c) => !c.silenceMs)
    expect(spoken.length).toBeGreaterThan(10)
    expect(spoken.every((c) => c.text.length <= 500)).toBe(true)
    expect(cast.slice(-3).map((c) => [c.text, c.silenceMs ?? 0, c.voice])).toEqual([
      ['你好', 0, 'zh-CN-XiaoyiNeural'],
      ['', 2000, 'zh-CN-XiaoyiNeural'],
      ['再见', 0, 'zh-CN-XiaoyiNeural'],
    ])
  })
})

describe('task records', () => {
  test('terminal tasks drop request context and serialize safely', () => {
    const t = taskManager.createTask({ text: 'unit-test-' + Date.now() })
    const circular: any = { self: null }
    circular.self = circular
    t.context = { body: circular }
    taskManager.finishTask(t.id)
    expect(t.context).toBeUndefined()
    expect(() => JSON.stringify(publicTask(taskManager.getTask(t.id)!))).not.toThrow()
    expect(taskManager.finishTask(t.id)?.status).toBe('completed') // idempotent
  })
})
