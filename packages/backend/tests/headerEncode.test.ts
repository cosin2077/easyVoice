import http from 'http'
import express from 'express'
import { PassThrough } from 'stream'
import { decodeHeaderValue, encodeHeaderValue, streamToResponse } from '../src/utils'

describe('header encoding for CJK filenames', () => {
  const chineseId = 'zh-CN-XiaoxiaoNeural-春江潮水连海平海上-1792419000000.mp3'

  test('encode/decode roundtrip keeps ASCII-only header value', () => {
    const enc = encodeHeaderValue(chineseId)
    expect(/[^\x00-\x7F]/.test(enc)).toBe(false)
    expect(enc).toContain('%')
    expect(decodeHeaderValue(enc)).toBe(chineseId)
  })

  test('raw Chinese id is rejected by Node setHeader, encoded is accepted', () => {
    const res = new http.ServerResponse({} as http.IncomingMessage)
    expect(() => res.setHeader('x-generate-tts-id', chineseId)).toThrow(/Invalid character/)
    expect(() => res.setHeader('x-generate-tts-id', encodeHeaderValue(chineseId))).not.toThrow()
  })

  test('streamToResponse encodes x-generate-tts-id and still streams body', async () => {
    const app = express()
    app.get('/t', (_req, res) => {
      const input = new PassThrough()
      streamToResponse(res, input, {
        headers: {
          'x-generate-tts-type': 'stream',
          'x-generate-tts-id': chineseId,
          'Access-Control-Expose-Headers': 'x-generate-tts-type, x-generate-tts-id',
        },
      })
      input.end(Buffer.from('abc'))
    })

    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    try {
      const { port } = server.address() as { port: number }
      const res = await fetch(`http://127.0.0.1:${port}/t`)
      const captured = res.headers.get('x-generate-tts-id') || ''
      const body = Buffer.from(await res.arrayBuffer())
      expect(res.status).toBe(200)
      expect(body.toString()).toBe('abc')
      expect(captured).toBe(encodeHeaderValue(chineseId))
      expect(decodeHeaderValue(captured)).toBe(chineseId)
      expect(res.headers.get('access-control-expose-headers') || '').toMatch(/x-generate-tts-id/)
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
    }
  })
})
