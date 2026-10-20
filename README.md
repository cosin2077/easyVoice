# EasyVoice 🎙️

## 项目简介 ✨  

**EasyVoice** 是一个开源的文本、小说智能转语音解决方案，旨在帮助用户轻松将文本内容转换为高质量的语音输出。  

- **一键生成语音和字幕**

- **AI 智能推荐配音**

- **完全免费，无时长、无字数限制**

- **支持将 10 万字以上的小说一键转为有声书！**

- **流式传输，多长的文本都能立刻播放**

- **支持自定义多角色配音**

无论你是想听小说、为创作配音，还是打造个性化音频，EasyVoice 都是你的最佳助手！

**你可以轻松的将 EasyVoice 部署到你的云服务器或者本地！**

## 体验一下

[easyvoice.ioplus.tech](https://easyvoice.ioplus.tech)

## 核心功能 🌟

- **文本转语音** 📝 ➡️ 🎵  
  一键将大段文本转为语音，高效又省时。
- **流式传输** 🌊  
  再多的文本，都可以迅速返回音频直接开始试听！
- **多语言支持** 🌍  
  支持中文、英文等多种语言。  
- **字幕支持** 💬  
  自动生成字幕文件，方便视频制作和字幕翻译。  
- **角色配音** 🎭  
  提供多种声音选项，完美适配不同角色。  
- **自定义设置** ⚙️  
  可调整语速、音调等参数，打造专属语音风格。  
- **AI 推荐** 🧠  
  通过 AI 智能推荐最适合的语音配置，省心又贴心。  
- **试听功能** 🎧  
  生成前可试听效果，确保每一句都如你所愿！  

## Screenshots📸

![Home](./images/readme.home.jpg)
![Generate](./images/readme.generate.jpg)

## 快速开始 🚀

### 1. 通过 docker 运行

```bash
# 极简运行，你可以通过 -e 指定环境变量
docker run -d -p 3000:3000 -v $(pwd)/audio:/app/audio cosincox/easyvoice:latest
```

or 将仓库克隆到本地，使用 Docker Compose 一键运行！

```bash
docker-compose up -d
```

### 2. 本地运行项目（需要 Node.js 20 及以上，参考：[安装 Node.js](https://zhuanlan.zhihu.com/p/442215189)）

```bash
# 开启/安装 pnpm
corepack enable
# 或者使用 npm 安装 pnpm
npm install -g pnpm

# 克隆仓库
git clone git@github.com:cosin2077/easyVoice.git
cd easyVoice
# 安装依赖
pnpm i -r

# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

### 3. 生成的音频、字幕保存位置

- Docker 部署： 保存在挂载的 `audio` 目录下
- Node.js 运行保存在 `./packages/backend/audio` 目录下

## 高级

### 插入停顿（静音）

在文本里写停顿标记，会在该位置插入**真实静音**（不是用省略号凑），字幕时间轴会同步顺延，SRT 里也不会出现标记文字。单个停顿最长 30 秒。

```text
春江潮水连海平，(((停顿3秒)))海上明月共潮生。
(((暂停1.5秒)))  (((静音2秒)))  (((pause 2s)))  [pause:500ms]  <break time="2s"/>
```

网页、`/generate`、`/createStream`、`/generateJson`（每个 `text` 里都可以写）均支持。

### 数字读法

数量、金额、小数、年份、日期（如 `300元`、`2000人`、`1.5倍`、`2024年10月20日`）交给 Edge 按正常数字读法朗读。中文里**像编号的数字**会逐位读出：

- 前面有关键字：`股票代码601012`、`手机尾号8888`、`订单号20241020123456`、`验证码4821`
- 括号里的 5 位以上数字：`隆基绿能（601012）`
- 以 0 开头的 4 位以上数字：`000001`
- 7 位以上、后面不跟单位的数字：手机号、单号等

逐位读只影响发音，字幕里仍显示原文数字（`601012`，不会变成 `六零一零一二`）。

### 命令行生成并保存字幕（SRT）

`/generateJson` 和 `/createStream` 直接返回 MP3 流，响应头 `x-generate-tts-id` 是文件名（URL 编码）。把扩展名换成 `.srt` 就能下载对应的字幕：

```bash
curl -sS -D headers.txt -o output.mp3 -X POST http://localhost:3000/api/v1/tts/createStream \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是一段命令行生成的语音。(((停顿1秒)))再见。","voice":"zh-CN-XiaoxiaoNeural"}'
ID=$(grep -i '^x-generate-tts-id' headers.txt | cut -d' ' -f2 | tr -d '\r')
curl -sS -o output.srt "http://localhost:3000/api/v1/tts/download/${ID%.mp3}.srt"
```

短文本（不超过 `DIRECT_GEN_LIMIT`）也可以用 `/generate`，返回的 JSON 里直接带 `file` 和 `srt` 文件名。

### 角色自定义

启动服务后尝试在命令行运行下述命令：

```bash
curl -X POST http://localhost:3000/api/v1/tts/generateJson \
  -H "Content-Type: application/json" \
  -d '{
  "data": [
    {
      "desc": "徐凤年",
      "text": "你敢动他，我会穷尽一生毁掉卢家，说到做到",
      "voice": "zh-CN-YunjianNeural",
      "volume": "40%"
    },
    {
      "desc": "姜泥",
      "text": "徐凤年，你快走，你打不过的",
      "voice": "zh-CN-XiaoyiNeural"
    },
    {
      "desc": "路人甲",
      "text": "他可是堂堂棠溪剑仙，这小子真是遇到强敌了",
      "voice": "zh-CN-XiaoniNeural",
      "volume": "-20%"
    },
    {
      "desc": "路人乙",
      "text": "这小子真是不知死活，竟然敢挑战卢白撷",
      "voice": "zh-TW-HsiaoChenNeural",
      "volume": "-20%"
    },
    {
      "desc": "旁白",
      "text": "面对棠溪剑仙卢白撷的杀意，徐凤年按住剑柄蓄势待发，他将姜泥放在心尖上，话锋一句比一句犀利，威逼利诱的要求卢白撷放姜泥一条生路。卢白撷也是不撞南墙不回头的人，他与西楚有深仇大恨不得不报...",
      "voice": "zh-CN-YunxiNeural",
      "rate": "0%",
      "pitch": "0Hz",
      "volume": "0%"
    },
    {
      "desc": "旁白",
      "text": "卢白撷凝聚剑气，剑光如虹，直指姜泥。剑气快到姜泥的时候，竟然被一颗小石子打破！万千剑气瞬间消散。居然就是刚刚进入山门的青衣男子。卢白撷心中警铃大作，再次凝结千万水剑想要先下手为强，青衣男子竟然一只手就挡下了，随之飓风盘起，竟然有山呼海啸之势，众人分分被逼退。随后的打斗，青衣男子每一步都精准预测了卢白撷的动作，卢白撷心中惊骇不已。",
      "voice": "zh-CN-YunxiNeural",
      "rate": "0%",
      "pitch": "0Hz",
      "volume": "0%"
    },
    {
      "desc": "卢白撷",
      "text": "人心入局，观子无敌，棋局未央，棋子难逃。你是！？ 曹长卿！",
      "voice": "zh-CN-YunyangNeural",
      "rate": "-2%",
      "pitch": "2Hz",
      "volume": "10%"
    }
  ]
}' \
-o output.mp3

```

你将看到output.mp3文件的生成，并立即可以播放。单条 `text` 很长时会自动切成多段合成，不会再触发 Edge 单次 10 分钟的上限；字幕的获取方式见上文「命令行生成并保存字幕」。

#### 参数说明

- text: 你需要转语音的文字。
- voice: 你需要用到的声音，参考：[支持的声音列表](./packages/backend/src/llm/prompt/voiceList.json)
- rate: 语速调整，百分比形式，默认 +0%（正常），如 "+50%"（加快 50%），"-20%"（减慢 20%）。
- volume: 音量调整，百分比形式，默认 +0%（正常），如 "+20%"（增 20%），"-10%"（减 10%）。
- pitch: 音调调整，默认 +0Hz（正常），如 "+10Hz"（提高 10 赫兹），"-5Hz"（降低 5 赫兹）。

### 接入其他 TTS 服务

- TODO

## 技术实现 🛠️

- **前端**：Vue 3 + TypeScript + Element Plus 🌐  
- **后端**：Node.js + Express + TypeScript ⚡  
- **语音合成**：Microsoft Azure TTS(更多引擎接入中) + OpenAI(OpenAI 兼容即可) + ffmpeg 🎤  
- **部署**：Node.js + Docker + Docker Compose 🐳  

## 快速开发 🚀

1.克隆仓库

```bash
git clone https://github.com/cosin2077/easyVoice.git
```

2.安装依赖

```bash
pnpm i -r
```

3.启动项目

```bash
pnpm dev
```

4.打开浏览器，访问 `http://localhost:5173/`，开始体验吧！

## 环境变量 ⚙️

| 变量名              | 默认值                         | 描述                          |
|--------------------|-------------------------------|------------------------------|
| `PORT`             | `3000`                        | 服务端口                      |
| `OPENAI_BASE_URL`  | `https://api.openai.com/v1`   | OpenAI 兼容 API 地址          |
| `OPENAI_API_KEY`   | -                             | OpenAI API Key               |
| `MODEL_NAME`       | -                             | 使用的模型名称                 |
| `RATE_LIMIT_WINDOW`| `1`                           | 速率限制窗口大小（分钟）         |
| `RATE_LIMIT`       | `10`                          | 速率限制次数                   |
| `EDGE_API_LIMIT`   | `3`                           | Edge-TTS API 并发数           |
| `TASK_TTL_MS`      | `3600000`                     | `/create` 任务完成后可查询的保留时长（毫秒） |

- **AI 推荐**：同时配置了 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`MODEL_NAME` 后，网页的「AI 推荐」里会显示「服务器已配置 AI：模型 · 域名」，Key 留空就能直接用（Key 不会下发到浏览器）。服务端 Key 只会发给 `OPENAI_BASE_URL`；用户自己填了别的 API 地址时，必须同时填自己的 Key。
- **配置文件**：可在 `.env` 或 `packages/backend/.env` 中设置，优先级为 `packages/backend/.env > .env`。  
- **Docker 配置**：通过 `-e` 参数传入环境变量，如上文示例。

## FAQ

- **Q: 如何配置 OpenAI 相关信息?**
- A: 在 `.env` 文件中添加 `OPENAI_API_KEY=your_api_key` `OPENAI_BASE_URL=openai_compatible_base_url` `MODEL_NAME=openai_model_name`，你可以用任何 openai compatible 的 API 地址和模型名称，例如 `https://openrouter.ai/api/v1/` 和 `deepseek`。

- **Q: 为什么我的AI配音效果不好？**
- A: AI 推荐配音是通过大模型来决定不同的段落的配音参数，大模型的能力直接影响配音结果，你可以尝试更换不同的大模型，或者是用 Edge-TTS 选择固定的声音配音。

- **Q: 速度太慢？**
- A: AI 推荐配音需要把输入的文本分段、然后让 AI 分析、推荐每一分段的配音参数，最后再生成音频、拼接。速度会比直接用 Edge-TTS慢。你可以更换相应更快的大模型，或者尝试调节 Edge-TTS 的并发参数：EDGE_API_LIMIT为更大的值(10 以下)，注意并发太高可能会有限制。

## Tips

- 当前主要通过 Edge-TTS API 提供免费语音合成。  

- 未来计划支持官方 API、Google TTS、声音克隆等功能。
