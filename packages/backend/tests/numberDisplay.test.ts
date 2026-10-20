import { toSpeechText } from '../src/utils/numberSpeech'
import { alignCueText, restoreCueDisplay } from '../src/utils/subtitle'
import { planSpeech } from '../src/services/textNormalize'

describe('spoken form vs displayed subtitles', () => {
  test('toSpeechText spells code-like runs and records spans', () => {
    const { spoken, spans } = toSpeechText('股票代码601012涨了3元')
    expect(spoken).toBe('股票代码六零一零一二涨了3元')
    expect(spans).toEqual([{ start: 4, end: 10, display: '601012' }])
    expect(spoken.slice(spans[0].start, spans[0].end)).toBe('六零一零一二')
  })

  test('no spans for English or quantities', () => {
    expect(toSpeechText('Call 5551234567 now').spans).toEqual([])
    expect(toSpeechText('一共300元，2024年').spans).toEqual([])
  })

  test('restores original digits when Edge splits the spelled run across cues', () => {
    const { spoken, spans } = toSpeechText('股票代码601012涨了，尾号8888。')
    const raw = [
      { part: '股票', start: 0, end: 300 },
      { part: '代码', start: 300, end: 600 },
      { part: '六零一', start: 600, end: 900 },
      { part: '零一二', start: 900, end: 1200 },
      { part: '涨了', start: 1200, end: 1500 },
      { part: '尾号', start: 1600, end: 1900 },
      { part: '八八八八', start: 1900, end: 2400 },
    ]
    const cues = restoreCueDisplay(alignCueText(spoken, raw), spoken, spans)
    expect(cues.map((c) => c.part).join('')).toBe('股票代码601012涨了，尾号8888。')
    // the two cues Edge produced for 六零一 / 零一二 become one cue spanning both
    expect(cues[2]).toEqual({ part: '601012', start: 600, end: 1200 })
    expect(cues.map((c) => c.start)).toEqual([0, 300, 600, 1200, 1600, 1900])
    expect(cues[5]).toEqual({ part: '8888。', start: 1900, end: 2400 })
  })

  test('punctuation inside a split spelled run stays with the merged cue', () => {
    const { spoken, spans } = toSpeechText('客服电话4008123456。下一句')
    const raw = [
      { part: '客服', start: 0, end: 300 },
      { part: '电话', start: 300, end: 600 },
      { part: '四零零八一二', start: 600, end: 1600 },
      { part: '三四五六', start: 1600, end: 2300 },
      { part: '下一句', start: 2500, end: 3000 },
    ]
    const cues = restoreCueDisplay(alignCueText(spoken, raw), spoken, spans)
    expect(cues.map((c) => c.part)).toEqual(['客服', '电话', '4008123456。', '下一句'])
    expect(cues[2]).toMatchObject({ start: 600, end: 2300 })
  })

  test('literal Chinese digits written by the user stay untouched', () => {
    const text = '一二三四，编号0001'
    const { spoken, spans } = toSpeechText(text)
    const raw = [
      { part: '一二三四', start: 0, end: 500 },
      { part: '编号', start: 600, end: 900 },
      { part: '零零零一', start: 900, end: 1400 },
    ]
    const cues = restoreCueDisplay(alignCueText(spoken, raw), spoken, spans)
    expect(cues.map((c) => c.part).join('')).toBe(text)
  })

  test('planSpeech keeps original wording (numbers are applied at the Edge layer)', () => {
    expect(planSpeech('股票代码601012涨了', (t) => [t])).toEqual([
      { type: 'text', text: '股票代码601012涨了' },
    ])
  })
})
