/** Friendly labels for Edge locale prefixes. Unknown codes fall back to the code itself. */
export const LOCALE_LABELS: Record<string, string> = {
  'zh-CN': '中文（简体）',
  'zh-TW': '中文（繁体）',
  'zh-HK': '中文（香港）',
  'en-US': '英语（美国）',
  'en-GB': '英语（英国）',
  'en-AU': '英语（澳大利亚）',
  'en-CA': '英语（加拿大）',
  'en-IN': '英语（印度）',
  'en-IE': '英语（爱尔兰）',
  'en-NZ': '英语（新西兰）',
  'en-SG': '英语（新加坡）',
  'en-ZA': '英语（南非）',
  'en-HK': '英语（香港）',
  'en-KE': '英语（肯尼亚）',
  'en-NG': '英语（尼日利亚）',
  'en-PH': '英语（菲律宾）',
  'en-TZ': '英语（坦桑尼亚）',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'fr-FR': '法语（法国）',
  'fr-CA': '法语（加拿大）',
  'fr-BE': '法语（比利时）',
  'fr-CH': '法语（瑞士）',
  'de-DE': '德语（德国）',
  'de-AT': '德语（奥地利）',
  'de-CH': '德语（瑞士）',
  'es-ES': '西班牙语（西班牙）',
  'es-MX': '西班牙语（墨西哥）',
  'es-AR': '西班牙语（阿根廷）',
  'es-CO': '西班牙语（哥伦比亚）',
  'es-US': '西班牙语（美国）',
  'pt-BR': '葡萄牙语（巴西）',
  'pt-PT': '葡萄牙语（葡萄牙）',
  'it-IT': '意大利语',
  'ru-RU': '俄语',
  'ar-SA': '阿拉伯语（沙特）',
  'ar-EG': '阿拉伯语（埃及）',
  'hi-IN': '印地语',
  'th-TH': '泰语',
  'vi-VN': '越南语',
  'id-ID': '印尼语',
  'ms-MY': '马来语',
  'nl-NL': '荷兰语',
  'pl-PL': '波兰语',
  'tr-TR': '土耳其语',
  'sv-SE': '瑞典语',
  'da-DK': '丹麦语',
  'fi-FI': '芬兰语',
  'nb-NO': '挪威语',
  'cs-CZ': '捷克语',
  'ro-RO': '罗马尼亚语',
  'hu-HU': '匈牙利语',
  'el-GR': '希腊语',
  'he-IL': '希伯来语',
  'uk-UA': '乌克兰语',
}

const PREFERRED = ['zh-CN', 'zh-TW', 'zh-HK', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'ja-JP', 'ko-KR']

export function localeFromVoiceName(name: string): string | null {
  // zh-CN-liaoning-XiaobeiNeural → zh-CN; en-US-JennyNeural → en-US
  const m = name.match(/^([a-z]{2,3}-[A-Z]{2})/)
  return m ? m[1] : null
}

export function buildLanguageOptions(voices: { Name: string }[]) {
  const set = new Set<string>()
  for (const v of voices) {
    const loc = localeFromVoiceName(v.Name)
    if (loc) set.add(loc)
  }
  const all = [...set]
  all.sort((a, b) => {
    const ia = PREFERRED.indexOf(a)
    const ib = PREFERRED.indexOf(b)
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
    return a.localeCompare(b)
  })
  return all.map((code) => ({ code, name: LOCALE_LABELS[code] || code }))
}
