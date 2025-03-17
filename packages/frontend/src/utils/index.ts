export const asyncSleep = (delay = 200) => new Promise((resolve) => setTimeout(resolve, delay))


const zhVoiceMap = {
  "zh-CN-XiaoxiaoNeural": 'zh-CN-晓晓',       // 标准普通话女声
  "zh-CN-XiaoyiNeural": 'zh-CN-晓伊',         // 普通话男声
  "zh-CN-YunjianNeural": 'zh-CN-云健',        // 普通话男声，剑指坚韧风格
  "zh-CN-YunxiNeural": 'zh-CN-云希',          // 普通话男声，温和自然
  "zh-CN-YunxiaNeural": 'zh-CN-云夏',         // 普通话女声，清新夏日感
  "zh-CN-YunyangNeural": 'zh-CN-云扬',        // 普通话男声，阳刚有力
  "zh-CN-liaoning-XiaobeiNeural": 'zh-CN-辽宁-晓北',  // 辽宁方言女声，亲切东北风
  "zh-CN-shaanxi-XiaoniNeural": 'zh-CN-陕西-晓妮',   // 陕西方言女声，带秦腔韵味
  "zh-HK-HiuGaaiNeural": 'zh-HK-曉佳',        // 粤语女声，优雅港风
  "zh-HK-HiuMaanNeural": 'zh-HK-曉曼',        // 粤语女声，温柔细腻
  "zh-HK-WanLungNeural": 'zh-HK-雲龍',        // 粤语男声，沉稳有力
  "zh-TW-HsiaoChenNeural": 'zh-TW-曉臻',      // 台湾普通话女声，清晨般清新
  "zh-TW-HsiaoYuNeural": 'zh-TW-曉雨',        // 台湾普通话女声，柔和优雅
  "zh-TW-YunJheNeural": 'zh-TW-雲哲',         // 台湾普通话男声，睿智沉稳
} as const;

type VoiceKey = keyof typeof zhVoiceMap;

export const mapZHVoiceName = (name: string): string | undefined => {
  if (name in zhVoiceMap) {
    return zhVoiceMap[name as VoiceKey];
  }
  return undefined;
};