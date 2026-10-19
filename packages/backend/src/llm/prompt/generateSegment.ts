const sharedRules = `
Rules:
1. Split by scene / speaker / narration. Keep original order. Do not drop text.
2. Pick voice "Name" values ONLY from the provided voice list.
3. rate like "+0%" / "-10%" / "+20%"; pitch like "+0Hz"; volume like "+0%".
4. character: speaker name or "narration".
5. Return ONLY valid JSON (no markdown fences) matching:
{"segments":[{"voice":"zh-CN-XiaoxiaoNeural","character":"narration","rate":"+0%","pitch":"+0Hz","volume":"+0%","text":"..."}]}
`

const cnTemplate = (voiceList: VoiceConfig[], text: string) => `
你是配音导演。根据声音列表为文本分配音色与韵律。
${sharedRules}

### 声音列表
${JSON.stringify(voiceList, null, 2)}

### 文本
${text}
`

const engTemplate = (voiceList: VoiceConfig[], text: string) => `
You are a casting director for text-to-speech.
${sharedRules}

### Voices
${JSON.stringify(voiceList, null, 2)}

### Text
${text}
`

export function getPrompt(lang = 'cn', voiceList: VoiceConfig[], text: string) {
  switch (lang) {
    case 'zh':
    case 'cn':
    case 'cmn':
      return cnTemplate(
        voiceList.filter((voice) => voice.Name.startsWith('zh')),
        text
      )
    case 'eng':
    case 'en':
      return engTemplate(
        voiceList.filter((voice) => voice.Name.startsWith('en')),
        text
      )
    default:
      // Mixed / other: pass zh+en subset for casting flexibility
      return engTemplate(
        voiceList.filter((v) => v.Name.startsWith('zh') || v.Name.startsWith('en')),
        text
      )
  }
}
