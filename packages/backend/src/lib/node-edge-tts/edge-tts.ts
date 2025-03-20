import { randomBytes } from 'node:crypto'
import { writeFileSync, createWriteStream } from 'node:fs'
import { WebSocket } from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { generateSecMsGecToken, TRUSTED_CLIENT_TOKEN, CHROMIUM_FULL_VERSION } from './drm'

type subLine = {
  part: string
  start: number
  end: number
}

type configure = {
  voice?: string
  lang?: string
  outputFormat?: string
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
    saveSubtitles = false,
    proxy,
    rate = 'default',
    pitch = 'default',
    volume = 'default',
    timeout = 10000
  }: configure = {}) {
    this.voice = voice
    this.lang = lang
    this.outputFormat = outputFormat
    this.saveSubtitles = saveSubtitles
    this.proxy = proxy ?? ''
    this.rate = rate
    this.pitch = pitch
    this.volume = volume
    this.timeout = timeout
  }

  async _connectWebSocket(): Promise<WebSocket> {
    const wsConnect = new WebSocket(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`, {
      host: 'speech.platform.bing.com',
      origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      },
      agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined
    })
    return new Promise((resolve: Function) => {
      wsConnect.on('open', () => {
        wsConnect.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
          {
            "context": {
              "synthesis": {
                "audio": {
                  "metadataoptions": {
                    "sentenceBoundaryEnabled": "false",
                    "wordBoundaryEnabled": "true"
                  },
                  "outputFormat": "${this.outputFormat}"
                }
              }
            }
          }
        `)
        resolve(wsConnect)
      })
    })
  }


  _saveSubFile(subFile: subLine[], text: string, audioPath: string) {
    let subPath = audioPath + '.json'
    let subChars = text.split('')
    let subCharIndex = 0
    subFile.forEach((cue: subLine, index: number) => {
      let fullPart = ''
      let stepIndex = 0
      for (let sci = subCharIndex; sci < subChars.length; sci++) {
        if (subChars[sci] === cue.part[stepIndex]) {
          fullPart = fullPart + subChars[sci]
          stepIndex += 1
        } else if (subChars[sci] === subFile?.[index + 1]?.part?.[0]) {
          subCharIndex = sci
          break
        } else {
          fullPart = fullPart + subChars[sci]
        }
      }
      cue.part = fullPart
    })
    writeFileSync(subPath, JSON.stringify(subFile, null, '  '), { encoding: 'utf-8' })
  }

  async ttsPromise(text: string, audioPath: string) {
    const _wsConnect = await this._connectWebSocket()
    return new Promise((resolve: Function, reject: Function) => {
      let audioStream = createWriteStream(audioPath)
      let subFile: subLine[] = []
      let timeout = setTimeout(() => reject('Timed out'), this.timeout)
      _wsConnect.on('message', async (data: Buffer, isBinary) => {
        if (isBinary) {
          let separator = 'Path:audio\r\n'
          let index = data.indexOf(separator) + separator.length
          let audioData = data.subarray(index)
          audioStream.write(audioData)
        } else {
          let message = data.toString()
          if (message.includes('Path:turn.end')) {
            audioStream.end()
            _wsConnect.close()
            if (this.saveSubtitles) {
              this._saveSubFile(subFile, text, audioPath)
            }
            clearTimeout(timeout)
            resolve()
          } else if (message.includes('Path:audio.metadata')) {
            let splitTexts = message.split('\r\n')
            try {
              let metadata = JSON.parse(splitTexts[splitTexts.length - 1])
              metadata['Metadata'].forEach((element: any) => {
                subFile.push({
                  part: element['Data']['text']['Text'],
                  start: Math.floor(element['Data']['Offset'] / 10000),
                  end: Math.floor((element['Data']['Offset'] + element['Data']['Duration']) / 10000)
                })
              })
            } catch { }
          }
        }
      })
      let requestId = randomBytes(16).toString('hex')
      _wsConnect.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
      ` + `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
        <voice name="${this.voice}">
          <prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
            ${text}
          </prosody>
        </voice>
      </speak>`)
    })
  }
}

export { EdgeTTS }