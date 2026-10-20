import http from 'http'
import express from 'express'
import { PassThrough } from 'stream'
import { AddressInfo } from 'net'
import { streamToResponse } from '../src/utils'

describe('streamToResponse mid-stream failure', () => {
  test('aborts the response instead of appending error text to the audio', async () => {
    const app = express()
    app.get('/t', (_req, res) => {
      const input = new PassThrough()
      streamToResponse(res, input, { headers: { 'content-type': 'application/octet-stream' } })
      input.write(Buffer.from([0xff, 0xf3, 0x00, 0x00]))
      setTimeout(() => input.emit('error', new Error('WebSocket closed unexpectedly with code 1006')), 50)
    })
    const server = app.listen(0)
    const { port } = server.address() as AddressInfo
    const outcome = await new Promise<{ aborted: boolean; body: Buffer }>((resolve) => {
      http.get(`http://127.0.0.1:${port}/t`, (res) => {
        const chunks: Buffer[] = []
        let aborted = false
        res.on('data', (c) => chunks.push(c))
        res.on('aborted', () => (aborted = true))
        res.on('error', () => (aborted = true))
        res.on('close', () => resolve({ aborted: aborted || !res.complete, body: Buffer.concat(chunks) }))
      })
    })
    server.close()
    expect(outcome.aborted).toBe(true)
    expect(outcome.body.toString('latin1')).not.toMatch(/error/i)
  })
})
