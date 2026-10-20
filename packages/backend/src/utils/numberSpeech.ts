/**
 * Digit reading for Edge TTS. Edge reads quantities well on its own (300元, 1.5倍, 2024年),
 * so only code-like digit runs in CJK text are spelled digit by digit.
 */
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const spell = (digits: string) => digits.replace(/[0-9]/g, (d) => CN_DIGITS[Number(d)])

/** Keywords after which a digit run is an identifier, not a quantity. */
const CODE_CONTEXT =
  /(?:代码|代号|编号|编码|号码|电话|手机|手机号|座机|账号|帐号|账户|卡号|尾号|单号|订单号?|快递|股票|证券|基金|工号|学号|房号|车牌|邮编|验证码|密码|序列号|型号|QQ|qq|ID|id|No\.?|NO\.?)[\s:：#号为是]*$/
/** A unit/quantifier right after the number means it is a quantity → let Edge read it. */
const QUANTITY_AFTER = /^\s*(?:[%‰℃°]|[元块角分毛人个只位名次回遍条件张本页册台辆架艘头匹斤两克吨米里亩升岁年月日号时点秒天周万亿千百十倍成折度]|千米|公里|公斤|毫升|小时|分钟|美元|港元|英镑|欧元)/
const CURRENCY_BEFORE = /[¥￥$€£]\s*$/
const BRACKET_OPEN = /[（(【\[「『<《]\s*$/
const BRACKET_CLOSE = /^\s*[）)】\]」』>》]/

/** True when `digits` at [start, end) of `text` reads as an identifier. */
export function isCodeLike(text: string, start: number, end: number): boolean {
  const digits = text.slice(start, end)
  const before = text.slice(Math.max(0, start - 12), start)
  const after = text.slice(end, end + 6)
  if (digits.length < 3) return false
  // decimals / thousands separators belong to a quantity: 1.5, 1,000, 12:30
  if (/[.,:：]$/.test(before) && /[0-9]/.test(text[start - 2] || '')) return false
  if (/^[.,:：][0-9]/.test(after)) return false
  if (CURRENCY_BEFORE.test(before)) return false
  if (CODE_CONTEXT.test(before)) return true
  if (QUANTITY_AFTER.test(after)) return false
  if (digits.length >= 5 && BRACKET_OPEN.test(before) && BRACKET_CLOSE.test(after)) return true
  if (digits.length >= 4 && digits.startsWith('0')) return true
  if (digits.length >= 7) return true
  return false
}

/** Spell code-like digit runs in CJK text; everything else is left to Edge. */
export function normalizeNumbersForSpeech(text: string): string {
  return toSpeechText(text).spoken
}

/** A spelled run in the spoken text and the original digits it replaced. */
export interface SpokenSpan {
  start: number
  end: number
  display: string
}

/**
 * Spoken form of `text` plus the spans that were rewritten, so subtitles produced from the
 * spoken text can be mapped back to what the user wrote (601012, not 六零一零一二).
 */
export function toSpeechText(text: string): { spoken: string; spans: SpokenSpan[] } {
  const spans: SpokenSpan[] = []
  if (!/[\u3400-\u9fff]/.test(text)) return { spoken: text, spans }
  let spoken = ''
  let last = 0
  for (const m of text.matchAll(/[0-9]+/g)) {
    const start = m.index!
    const end = start + m[0].length
    if (!isCodeLike(text, start, end)) continue
    spoken += text.slice(last, start)
    const s = spoken.length
    spoken += spell(m[0])
    spans.push({ start: s, end: spoken.length, display: m[0] })
    last = end
  }
  return { spoken: spoken + text.slice(last), spans }
}
