import {
  materializePausesForEdge,
  normalizeChineseNumbers,
  parsePauseMarkers,
  preprocessTextForTts,
} from '../src/services/textNormalize'

describe('textNormalize', () => {
  test('parses pause markers', () => {
    const parts = parsePauseMarkers('你好(((停顿2秒)))世界[pause:1s]')
    expect(parts).toEqual([
      { type: 'text', text: '你好' },
      { type: 'break', seconds: 2 },
      { type: 'text', text: '世界' },
      { type: 'break', seconds: 1 },
    ])
  })

  test('materialize pauses for Edge', () => {
    const out = materializePausesForEdge('A(((pause 1s)))B')
    expect(out.startsWith('A')).toBe(true)
    expect(out.includes('…')).toBe(true)
    expect(out.endsWith('B') || out.includes('B')).toBe(true)
  })

  test('year reading', () => {
    expect(normalizeChineseNumbers('2024年')).toContain('二')
    expect(normalizeChineseNumbers('2024年')).toContain('年')
  })

  test('preprocess integrates pauses', () => {
    const out = preprocessTextForTts('春江(((停顿1秒)))潮水')
    expect(out.includes('春江')).toBe(true)
    expect(out.includes('潮水')).toBe(true)
  })

  test('numbers are left to Edge by default (no 三零零元 / 一.五)', () => {
    expect(preprocessTextForTts('价格300元，共2000人，增长1.5倍')).toBe('价格300元，共2000人，增长1.5倍')
  })
})
