import { randomBytes } from 'node:crypto'
import { createWriteStream, WriteStream } from 'node:fs'
import { WebSocket } from 'ws'
import { parse, resolve } from 'path'
import { access, writeFile } from 'node:fs/promises'
import { HttpsProxyAgent } from 'https-proxy-agent'
import {
  adjustClockSkew,
  CHROMIUM_MAJOR_VERSION,
  connectId,
  generateMuid,
  generateSecMsGecToken,
  SEC_MS_GEC_VERSION,
  TRUSTED_CLIENT_TOKEN,
} from './drm'
import { Readable } from 'node:stream'
import { ensureDir, escapeSSML } from '../../utils'
import { Mp3FrameCounter } from '../../utils/mp3'
import { alignCueText, ticksToMs, toSegmentDoc } from '../../utils/subtitle'

interface SubLine {
  part: string
  start: number
  end: number
}

// 定义选项接口
interface TtsOptions {
  outputType?: 'stream' | 'buffer' | 'file' // 返回类型：流、Buffer 或写入文件
  audioPath?: string // 如果是文件输出，则需要路径
  saveSubtitles?: boolean // 是否保存字幕
  /** Explicit subtitle json path (deterministic ordering for multi-segment jobs). */
  subtitlePath?: string
}
type configure = {
  voice?: string
  lang?: string
  outputFormat?: string
  wordBoundary?: boolean
  sentenceBoundary?: boolean
  saveSubtitles?: boolean
  proxy?: string
  rate?: string
  pitch?: string
  volume?: string
  timeout?: number
}

class EdgeTTS {
  private voice: string
  private lang: string
  private outputFormat: string
  private wordBoundary: boolean
  private sentenceBoundary: boolean
  private saveSubtitles: boolean
  private proxy: string
  private rate: string
  private pitch: string
  private volume: string
  private timeout: number

  constructor({
    voice = 'zh-CN-XiaoyiNeural',
    lang = 'zh-CN',
    outputFormat = 'audio-24khz-48kbitrate-mono-mp3',
    wordBoundary = true,
    sentenceBoundary = false,
    saveSubtitles = false,
    proxy,
    rate = 'default',
    pitch = 'default',
    volume = 'default',
    timeout = 10000,
  }: configure = {}) {
    this.voice = voice
    this.lang = lang
    this.outputFormat = outputFormat
    this.saveSubtitles = saveSubtitles
    this.wordBoundary = wordBoundary
    this.sentenceBoundary = sentenceBoundary
    this.proxy = proxy ?? ''
    this.rate = rate
    this.pitch = pitch
    this.volume = volume
    this.timeout = timeout
  }

  async _connectWebSocket(retryOn403 = true): Promise<WebSocket> {
    try {
      return await this._openWebSocket()
    } catch (err) {
      // 403 通常是 Sec-MS-GEC 过期/本机时钟偏差：用服务器 Date 校正后重试一次
      const serverDate = (err as { serverDate?: string }).serverDate
      if (retryOn403 && (err as { statusCode?: number }).statusCode === 403 && adjustClockSkew(serverDate)) {
        return this._connectWebSocket(false)
      }
      throw err
    }
  }

  _openWebSocket(): Promise<WebSocket> {
    const wsConnect = new WebSocket(
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectId()}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`,
      {
        host: 'speech.platform.bing.com',
        origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' +
            ` (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36` +
            ` Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Cookie: `muid=${generateMuid()};`,
        },
        agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined,
      }
    )

    return new Promise((resolve: (ws: WebSocket) => void, reject: (reason: Error) => void) => {
      const timeoutId = setTimeout(() => {
        wsConnect.close()
        reject(new Error('WebSocket connection timed out'))
      }, this.timeout)

      wsConnect.on('unexpected-response', (_req, res) => {
        clearTimeout(timeoutId)
        const err = new Error(`WebSocket error: Unexpected server response: ${res.statusCode}`) as Error & {
          statusCode?: number
          serverDate?: string
        }
        err.statusCode = res.statusCode
        err.serverDate = res.headers['date']
        res.resume()
        wsConnect.terminate()
        reject(err)
      })

      wsConnect.on('open', () => {
        clearTimeout(timeoutId)
        wsConnect.send(
          `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
          {
            "context": {
              "synthesis": {
                "audio": {
                  "metadataoptions": {
                    "sentenceBoundaryEnabled": "${this.sentenceBoundary}",
                    "wordBoundaryEnabled": "${this.wordBoundary}"
                  },
                  "outputFormat": "${this.outputFormat}"
                }
              }
            }
          }
        `
        )
        resolve(wsConnect)
      })

      wsConnect.on('error', (err: Error) => {
        clearTimeout(timeoutId)
        reject(new Error(`WebSocket error: ${err.message}`))
      })

      wsConnect.on('close', (code: number, reason: string) => {
        clearTimeout(timeoutId)
        if (code !== 1000) {
          // 1000 表示正常关闭
          reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reason.toString()}`))
        }
      })
    })
  }
  async getSrtPath(audioPath: string): Promise<string> {
    let basePath = audioPath + '.srt.json'
    let subPath = basePath
    let counter = 1

    try {
      await access(subPath)
      while (true) {
        subPath = `${basePath}.${counter}`
        try {
          await access(subPath)
          counter++
        } catch (error) {
          return subPath
        }
      }
    } catch (error) {
      return subPath
    }
  }
  async _saveSubFile(
    subFile: SubLine[],
    text: string,
    audioPath: string,
    outputType: string | undefined,
    durationMs: number,
    explicitPath?: string
  ) {
    let subPath = explicitPath || audioPath + '.json'
    if (!explicitPath && outputType === 'stream') {
      // legacy naming: <audio>_tmp/<base>.srt.json[.N]
      const tmpDir = audioPath + '_tmp'
      await ensureDir(tmpDir)
      const { base } = parse(audioPath)
      subPath = await this.getSrtPath(resolve(tmpDir, base))
    }
    const cues = alignCueText(text, subFile)
    await writeFile(subPath, JSON.stringify(toSegmentDoc(cues, durationMs), null, 2), {
      encoding: 'utf-8',
    })
    return subPath
  }

  async ttsPromise(text: string, options: TtsOptions = {}): Promise<Readable | Buffer | void> {
    const {
      outputType = 'buffer',
      audioPath,
      saveSubtitles = this.saveSubtitles,
      subtitlePath,
    } = options
    const frameCounter = new Mp3FrameCounter()
    let turnEnded = false

    if (outputType === 'file' && !audioPath) {
      throw new Error('audioPath is required when outputType is "file"')
    }

    let _wsConnect: WebSocket
    try {
      _wsConnect = await this._connectWebSocket()
    } catch (err) {
      throw new Error(`Failed to connect WebSocket: ${(err as Error).message}`)
    }

    let audioStream: WriteStream | undefined
    let readableStream: Readable | undefined
    let audioChunks: Buffer[] = []
    let subFile: SubLine[] = []
    let isStreamDestroyed = false
    let resolveBuffer: (value: Buffer) => void
    let rejectBuffer: (reason: Error) => void
    let resolveFile: () => void
    let rejectFile: (reason: Error) => void

    // 初始化输出
    if (outputType === 'file') {
      try {
        audioStream = createWriteStream(audioPath!)
      } catch (err) {
        _wsConnect.close()
        throw new Error(`Failed to create write stream: ${(err as Error).message}`)
      }
    } else if (outputType === 'stream') {
      readableStream = new Readable({
        read() {},
        destroy(err, callback) {
          isStreamDestroyed = true
          _wsConnect.close()
          callback(err)
        },
      })
    }

    // 空闲超时：每收到一条消息就重新计时（此前只覆盖首包，中途卡住会永久挂起）
    const onTimeout = () => {
      _wsConnect.close()
      if (readableStream) readableStream.destroy(new Error('WebSocket timed out'))
      if (outputType === 'file') {
        audioStream?.end()
        rejectFile?.(new Error('WebSocket timed out'))
      }
      if (outputType === 'buffer') rejectBuffer?.(new Error('WebSocket timed out'))
    }
    let timeout = setTimeout(onTimeout, this.timeout)

    // 处理 WebSocket 消息
    _wsConnect.on('message', (data: Buffer, isBinary: boolean) => {
      clearTimeout(timeout)
      if (!turnEnded) timeout = setTimeout(onTimeout, this.timeout)
      if (isBinary) {
        const separator = 'Path:audio\r\n'
        const index = data.indexOf(separator) + separator.length
        const audioData = data.subarray(index)
        frameCounter.push(audioData)

        if (outputType === 'file') {
          try {
            audioStream!.write(audioData)
          } catch (err) {
            audioStream!.end()
            _wsConnect.close()
            throw new Error(`Failed to write to file: ${(err as Error).message}`)
          }
        } else if (outputType === 'stream' && !isStreamDestroyed) {
          readableStream!.push(audioData) // 实时推送
        } else if (outputType === 'buffer') {
          audioChunks.push(audioData)
        }
      } else {
        const message = data.toString()
        if (message.includes('Path:turn.end')) {
          turnEnded = true
          clearTimeout(timeout)
          // Persist subtitles (with frame-accurate duration) BEFORE signalling completion,
          // so downstream merging never races the json write.
          const saved: Promise<unknown> = saveSubtitles
            ? this._saveSubFile(
                subFile,
                text,
                audioPath!,
                outputType,
                frameCounter.durationMs,
                subtitlePath
              ).catch((err) => console.error('save subtitles failed:', (err as Error).message))
            : Promise.resolve()
          if (outputType === 'file') {
            _wsConnect.close()
            audioStream!.end(() => {
              saved.then(() => resolveFile())
            })
          } else if (outputType === 'stream' && !isStreamDestroyed) {
            _wsConnect.close()
            saved.then(() => {
              if (!isStreamDestroyed) readableStream!.push(null)
            })
          } else if (outputType === 'buffer') {
            const audioBuffer = Buffer.concat(audioChunks)
            _wsConnect.close()
            saved.then(() => resolveBuffer?.(audioBuffer))
          }
        } else if (message.includes('Path:audio.metadata')) {
          const splitTexts = message.split('\r\n')
          try {
            const metadata = JSON.parse(splitTexts[splitTexts.length - 1])
            metadata['Metadata'].forEach((element: any) => {
              const type = element?.['Type']
              if (type && type !== 'WordBoundary' && type !== 'SentenceBoundary') return
              const textPart = element?.['Data']?.['text']?.['Text']
              const offset = element?.['Data']?.['Offset']
              const duration = element?.['Data']?.['Duration']
              if (typeof textPart !== 'string' || typeof offset !== 'number') return
              // Offset/Duration are 100-ns ticks relative to this request's audio start
              subFile.push({
                part: textPart,
                start: ticksToMs(offset),
                end: ticksToMs(offset + (typeof duration === 'number' ? duration : 0)),
              })
            })
          } catch {
            // 忽略解析错误
          }
        }
      }
    })

    // WebSocket 错误处理
    _wsConnect.on('error', (err: Error) => {
      clearTimeout(timeout)
      if (outputType === 'file') {
        audioStream?.end()
        rejectFile?.(new Error(`WebSocket error: ${err.message}`))
      }
      if (outputType === 'stream' && !isStreamDestroyed) readableStream?.destroy(err)
      if (outputType === 'buffer') rejectBuffer?.(new Error(`WebSocket error: ${err.message}`))
      _wsConnect.close()
    })

    // WebSocket 关闭处理
    _wsConnect.on('close', (code: number, reason: string) => {
      clearTimeout(timeout)
      if (code !== 1000 && !turnEnded) {
        const errMsg = `WebSocket closed unexpectedly with code ${code}: ${reason.toString()}`
        if (outputType === 'file') {
          audioStream?.end()
          rejectFile?.(new Error(errMsg))
        }
        if (outputType === 'stream' && !isStreamDestroyed)
          readableStream?.destroy(new Error(errMsg))
        if (outputType === 'buffer') rejectBuffer?.(new Error(errMsg))
      }
    })

    // 文件流错误处理
    if (outputType === 'file') {
      audioStream!.on('error', (err) => {
        audioStream!.end()
        _wsConnect.close()
        throw new Error(`File stream error: ${err.message}`)
      })
    }

    // 发送 SSML 请求
    try {
      const requestId = randomBytes(16).toString('hex')
      _wsConnect.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
          <voice name="${this.voice}">
            <prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
              ${escapeSSML(text)}
            </prosody>
          </voice>
        </speak>`
      )
    } catch (err) {
      _wsConnect.close()
      if (readableStream) readableStream.destroy(err as Error)
      throw new Error(`Failed to send SSML request: ${(err as Error).message}`)
    }

    // 立即返回
    if (outputType === 'stream') {
      return readableStream!
    } else if (outputType === 'buffer') {
      return new Promise<Buffer>((resolve, reject) => {
        resolveBuffer = resolve
        rejectBuffer = reject
      })
    } else if (outputType === 'file') {
      return new Promise<void>((resolve, reject) => {
        resolveFile = resolve
        rejectFile = reject
      })
    } else {
      throw new Error(`Invalid output type: ${outputType}`)
    }
  }
}

export { EdgeTTS }
