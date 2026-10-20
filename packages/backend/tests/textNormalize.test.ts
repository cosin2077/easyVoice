import {
  isCodeLike,
  normalizeNumbersForSpeech,
  parsePauseMarkers,
  planSpeech,
  preprocessTextForTts,
  stripPauseMarkers,
} from '../src/services/textNormalize'

describe('pause markers', () => {
  test('parses every supported syntax and unit', () => {
    const parts = parsePauseMarkers(
      '你好(((停顿2秒)))世界[pause:500ms]A(((pause 1.5s)))B<break time="3s"/>C(((暂停1秒钟)))D'
    )
    expect(parts).toEqual([
      { type: 'text', text: '你好' },
      { type: 'break', seconds: 2 },
      { type: 'text', text: '世界' },
      { type: 'break', seconds: 0.5 },
      { type: 'text', text: 'A' },
      { type: 'break', seconds: 1.5 },
      { type: 'text', text: 'B' },
      { type: 'break', seconds: 3 },
      { type: 'text', text: 'C' },
      { type: 'break', seconds: 1 },
      { type: 'text', text: 'D' },
    ])
  })

  test('clamps to 30s and ignores zero', () => {
    expect(parsePauseMarkers('a(((停顿99秒)))b(((停顿0秒)))c')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'break', seconds: 30 },
      { type: 'text', text: 'b' },
      { type: 'text', text: 'c' },
    ])
  })

  test('stripPauseMarkers leaves no filler text', () => {
    expect(stripPauseMarkers('春江(((停顿3秒)))潮水')).toBe('春江 潮水')
    expect(preprocessTextForTts('春江(((停顿3秒)))潮水')).not.toMatch(/…|停顿/)
  })

  test('planSpeech yields ordered text + break units and merges adjacent breaks', () => {
    const units = planSpeech('春江潮水连海平，(((停顿3秒)))(((停顿1秒)))海上明月共潮生。', (t) => [t])
    expect(units).toEqual([
      { type: 'text', text: '春江潮水连海平，' },
      { type: 'break', ms: 4000 },
      { type: 'text', text: '海上明月共潮生。' },
    ])
  })

  test('planSpeech splits long text parts', () => {
    const long = '这是一个句子。'.repeat(200)
    const units = planSpeech(long)
    expect(units.length).toBeGreaterThan(1)
    expect(units.every((u) => u.type === 'text' && u.text.length <= 500)).toBe(true)
  })
})

describe('number reading', () => {
  const n = normalizeNumbersForSpeech

  test('quantities, decimals, years, dates stay for Edge to read natively', () => {
    const keep = [
      '价格300元，共2000人，增长1.5倍，第12章',
      '2024年10月20日下午3点',
      '共有10000人参加，营收1000000元',
      '比例是12.345%，温度30℃',
      '账户余额¥123456',
      '1,000,000 人次',
      '他跑了42195米',
      '买了601012',
    ]
    for (const t of keep) expect(n(t)).toBe(t)
  })

  test('code-like tokens are read digit by digit', () => {
    expect(n('股票代码601012今天涨了')).toBe('股票代码六零一零一二今天涨了')
    expect(n('隆基绿能（601012）')).toBe('隆基绿能（六零一零一二）')
    expect(n('平安银行000001')).toBe('平安银行零零零零零一')
    expect(n('手机尾号8888')).toBe('手机尾号八八八八')
    expect(n('电话13800138000')).toBe('电话一三八零零一三八零零零')
    expect(n('订单号：20241020123456')).toBe('订单号：二零二四一零二零一二三四五六')
    expect(n('验证码 4821')).toBe('验证码 四八二一')
  })

  test('English text is untouched', () => {
    expect(n('Call 13800138000 about order 601012')).toBe('Call 13800138000 about order 601012')
  })

  test('isCodeLike guards decimals', () => {
    const t = '增长了1234.5678倍'
    expect(isCodeLike(t, 3, 7)).toBe(false)
    expect(isCodeLike(t, 8, 12)).toBe(false)
  })
})
