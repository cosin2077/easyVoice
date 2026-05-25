import { TTSEngine, TtsOptions } from '../types'
import { fetcher } from '../../utils/request'
import { Readable } from 'stream' // Node.js 流支持

// Kokoro 支持的音频格式
const RESPONSE_FORMATS = ['mp3', 'wav'] as const
type ResponseFormat = (typeof RESPONSE_FORMATS)[number]

// 扩展 TtsOptions，添加 stream 参数
interface ExtendedTtsOptions extends TtsOptions {
  stream?: boolean // 是否返回流式响应
}

export class KokoroTtsEngine implements TTSEngine {
  name = 'kokoro-tts'
  private baseUrl: string
  private initialized = false

  constructor(baseUrl: string = 'http://localhost:8880/v1') {
    this.baseUrl = baseUrl
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetcher.get<{ status: string }>(
        `${this.baseUrl.replace('/v1', '')}/health`
      )
      console.log(`Initialize KokoroTtsEngine response:`, response.data)
      if (response.data.status !== 'healthy') {
        throw new Error('Kokoro TTS server is not healthy.')
      }
      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize Kokoro TTS: ${(error as Error).message}`)
    }
  }

  // 修改 synthesize 方法，返回 Buffer 或 Readable
  async synthesize(text: string, options: ExtendedTtsOptions): Promise<Buffer | Readable> {
    if (!this.initialized) {
      await this.initialize()
    }

    const {
      voice = 'af_bella',
      speed = 1.0,
      format = 'mp3',
      stream = false, // 默认一次性返回 Buffer
    } = options

    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('Input text is required.')
    }
    if (!RESPONSE_FORMATS.includes(format as ResponseFormat)) {
      throw new Error(
        `Invalid response format: ${format}. Supported formats are: ${RESPONSE_FORMATS.join(', ')}.`
      )
    }

    try {
      const requestBody = {
        model: 'kokoro',
        input: text,
        voice,
        speed,
        response_format: format,
      }

      if (stream) {
        const response = await fetcher.post(`${this.baseUrl}/audio/speech`, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
        })
        return response.data
      } else {
        const response = await fetcher.post(`${this.baseUrl}/audio/speech`, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
        })
        return Buffer.from(response.data)
      }
    } catch (error) {
      const err = error as any
      if (err.response?.status === 400) {
        throw new Error('Invalid request to Kokoro TTS server.')
      } else if (err.response?.status === 503) {
        throw new Error('Kokoro TTS server is unavailable.')
      }
      throw new Error(`Failed to synthesize speech with Kokoro TTS: ${err.message}`)
    }
  }

  async getSupportedLanguages(): Promise<string[]> {
    return ['en-US', 'ja-JP', 'ko-KR', 'zh-CN']
  }

  async getVoiceOptions(): Promise<string[]> {
    try {
      // Kokoro-FastAPI v0.4.0+ returns [{id, name}]; older versions returned strings.
      const response = await fetcher.get<{
        voices: Array<string | { id?: string; name?: string }>
      }>(`${this.baseUrl}/audio/voices`)
      return response.data.voices
        .map(v => (typeof v === 'string' ? v : (v.id ?? v.name ?? '')))
        .filter(Boolean)
    } catch (error) {
      console.warn(`Failed to fetch Kokoro voice options: ${(error as Error).message}`)
      return ['af_bella', 'af_sky', 'am_adam', 'bf_emma']
    }
  }
}

if (require.main === module) {
  ;(async () => {
    const ttsEngine = new KokoroTtsEngine()
    await ttsEngine.initialize()
    const voices = await ttsEngine.getVoiceOptions()
    console.log('Available voices:', voices)

    const text = `
The Lantern in the Woods
In a small village nestled between rolling hills and a dense forest, there lived an old woman named Elara. She was known for her peculiar habit of wandering into the woods every night, carrying a glowing lantern. The villagers whispered about her—some said she was a witch, others believed she was searching for a lost treasure. But no one dared to follow her.
One autumn evening, a curious boy named Finn decided to uncover the truth. As the sun dipped below the horizon, he watched Elara shuffle toward the trees, her lantern casting a warm golden light. Finn grabbed his coat and followed at a distance, his heart pounding with excitement and fear.
The forest was alive with sounds—crickets chirping, leaves rustling in the wind—but Elara moved with purpose, her steps steady. Finn struggled to keep up, ducking under branches and tripping over roots. The lantern’s light bobbed ahead like a guiding star. After what felt like hours, Elara stopped in a small clearing. Finn hid behind a tree, peering out.
In the center of the clearing stood an ancient oak, its gnarled branches stretching toward the sky. Elara hung her lantern on a low branch, and to Finn’s astonishment, the tree began to glow faintly. Tiny lights, like fireflies, emerged from the bark, swirling around the lantern. The air hummed with a soft, melodic sound, and Finn felt a strange warmth wash over him.
Elara knelt before the tree and whispered something Finn couldn’t hear. The lights danced faster, then spiraled upward, vanishing into the night sky. She stood, retrieved her lantern, and turned back toward the village. Finn stayed hidden until she was gone, then crept toward the oak. The glow had faded, but the tree felt alive, its trunk warm to the touch.
The next day, Finn couldn’t resist telling his friends what he’d seen. They laughed, calling it a wild tale, but that night, he returned to the clearing alone. The oak stood silent, no lights, no hum. Disappointed, he sat beneath it, wondering if he’d imagined everything. Then, a faint glow flickered in the branches above. A single light floated down, hovering before him. It pulsed, as if alive, and Finn felt a whisper in his mind: “Keep it safe.”
Startled, he ran home, the words echoing in his ears. From then on, Finn visited the oak often, though the lights never returned. He never saw Elara go back either—she passed away that winter, her lantern left on her porch. The villagers forgot her strange walks, but Finn didn’t. Years later, as an old man, he hung a lantern on that same oak every autumn, hoping the lights would dance again. They never did, but the warmth remained—a quiet secret between him and the woods.
`
    const audioBuffer = (await ttsEngine.synthesize(`This is a direct test ` + text, {
      voice: 'af_nicole',
      speed: 0.9,
      stream: false,
    })) as Buffer

    console.log('Audio buffer:', audioBuffer)
    const fs = await import('fs/promises')
    const path = await import('path')
    await fs.writeFile(path.resolve(__dirname, './test.mp3'), audioBuffer)
    console.log('Test audio audioBuffer saved to test.mp3')

    const audioStream = (await ttsEngine.synthesize('This is a streaming test.' + text, {
      voice: 'af_nicole',
      speed: 1.0,
      stream: true,
    })) as Readable
    console.log('Streaming audio...')
    audioStream.pipe(require('fs').createWriteStream(path.resolve(__dirname, './test_stream.mp3')))
    audioStream.on('close', () => {
      console.log('Test audio audioStream saved to test_stream.mp3')
    })
  })()
}
