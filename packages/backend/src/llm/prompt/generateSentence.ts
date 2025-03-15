const template =
  `
我希望你根据以下声音配置和一段文字内容，为文字配音提供优化建议。任务包括：
1. 将文字按场景、角色、旁白分割。
2. 根据角色的性格、对话语气，从声音配置中推荐合适的“Name”。
3. 为每段推荐合理的“rate”（语速）、“volume”（音量）、“pitch”（音调）参数。
4. 返回结果为 JSON 格式。

### 声音配置
[
  {"Name": "zh-CN-XiaoxiaoNeural", "Gender": "Female", "ContentCategories": ["News", "Novel"], "VoicePersonalities": ["Warm"]},
  {"Name": "zh-CN-XiaoyiNeural", "Gender": "Female", "ContentCategories": ["Cartoon", "Novel"], "VoicePersonalities": ["Lively"]},
  {"Name": "zh-CN-YunjianNeural", "Gender": "Male", "ContentCategories": ["Sports", "Novel"], "VoicePersonalities": ["Passion"]},
  {"Name": "zh-CN-YunxiNeural", "Gender": "Male", "ContentCategories": ["Novel"], "VoicePersonalities": ["Lively", "Sunshine"]},
  {"Name": "zh-CN-YunxiaNeural", "Gender": "Male", "ContentCategories": ["Cartoon", "Novel"], "VoicePersonalities": ["Cute"]},
  {"Name": "zh-CN-YunyangNeural", "Gender": "Male", "ContentCategories": ["News"], "VoicePersonalities": ["Professional", "Reliable"]},
  {"Name": "zh-CN-liaoning-XiaobeiNeural", "Gender": "Female", "ContentCategories": ["Dialect"], "VoicePersonalities": ["Humorous"]},
  {"Name": "zh-CN-shaanxi-XiaoniNeural", "Gender": "Female", "ContentCategories": ["Dialect"], "VoicePersonalities": ["Bright"]},
  {"Name": "zh-HK-HiuGaaiNeural", "Gender": "Female", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]},
  {"Name": "zh-HK-HiuMaanNeural", "Gender": "Female", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]},
  {"Name": "zh-HK-WanLungNeural", "Gender": "Male", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]},
  {"Name": "zh-TW-HsiaoChenNeural", "Gender": "Female", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]},
  {"Name": "zh-TW-HsiaoYuNeural", "Gender": "Female", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]},
  {"Name": "zh-TW-YunJheNeural", "Gender": "Male", "ContentCategories": ["General"], "VoicePersonalities": ["Friendly", "Positive"]}
]

### 参数说明
- name: 声音配置中的 Name 字段，区分旁白和角色。
- rate: 语速调整，百分比形式，默认 +0%（正常），如 "+50%"（加快 50%），"-20%"（减慢 20%）。
- volume: 音量调整，百分比形式，默认 +0%（正常），如 "+20%"（增 20%），"-10%"（减 10%）。
- pitch: 音调调整，默认 +0Hz（正常），如 "+10Hz"（提高 10 赫兹），"-5Hz"（降低 5 赫兹）。

### 输出格式
[
  {
    "name": "specific voice",
    "charactor": "角色名或narration",
    "rate": "语速",
    "volume": "音量",
    "pitch": "音调",
    "segment": "文本段落"
  },
  ...
]

### 待处理内容

`
const cnTemplate = (voiceList: string[], text: string) => `
我希望你根据以下声音配置和一段文字内容，为文字配音提供优化建议。任务包括：
1. 将文字按场景、角色、旁白分割。
2. 根据角色的性格、对话语气，从声音配置中推荐合适的“Name”。
3. 为每段推荐合理的“rate”（语速）、“volume”（音量）、“pitch”（音调）参数。
4. 返回结果为 JSON 格式。

### 声音配置
${voiceList}

### 参数说明
- name: 声音配置中的 Name 字段，区分旁白和角色。
- rate: 语速调整，百分比形式，默认 +0%（正常），如 "+50%"（加快 50%），"-20%"（减慢 20%）。
- volume: 音量调整，百分比形式，默认 +0%（正常），如 "+20%"（增 20%），"-10%"（减 10%）。
- pitch: 音调调整，默认 +0Hz（正常），如 "+10Hz"（提高 10 赫兹），"-5Hz"（降低 5 赫兹）。

### 输出格式
[
  {
    "name": "specific voice",
    "charactor": "角色名或narration",
    "rate": "语速",
    "volume": "音量",
    "pitch": "音调",
    "segment": "文本段落"
  },
  ...
]

### 待处理内容
${text}
`
const engTemplate = (voiceList: string[], text: string) => `
I hope you can provide optimization suggestions for text dubbing based on the following sound configuration and a paragraph of text content. Tasks include:
1. Divide the text by scene, role, and narration.
2. Recommend a suitable "Name" from the sound configuration based on the character's personality and dialogue tone.
3. Recommend reasonable "rate" (speech speed), "volume" (volume), and "pitch" (pitch) parameters for each paragraph.
4. The result is returned in JSON format.

### Sound configuration
${voiceList}

### Parameter description
- name: Name field in the sound configuration, distinguishing between narration and role.
- rate: Speech speed adjustment, percentage form, default +0% (normal), such as "+50%" (50% faster), "-20%" (20% slower).
- volume: Volume adjustment, percentage form, default +0% (normal), such as "+20%" (increase 20%), "-10%" (decrease 10%).
- pitch: pitch adjustment, default +0Hz (normal), such as "+10Hz" (increase 10 Hz), "-5Hz" (decrease 5 Hz).

### Output format
[
{
"name": "specific voice",
"character": "character name or narration",
"rate": "speech rate",
"volume": "volume",
"pitch": "pitch",
"segment": "text paragraph"
},
...
]

### Content to be processed
${text}
`
export async function genSegment(lang = 'cn', voiceList: string[], text: string) {
  switch (lang) {
    case 'cn':
      return cnTemplate(voiceList, text);
    case 'eng':
      return engTemplate(voiceList, text);
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }
}