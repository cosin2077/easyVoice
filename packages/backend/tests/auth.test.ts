import http from 'http'
import type { AddressInfo } from 'net'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Application } from 'express'
import { createApp } from '../src/app'
import { AuthService, loadAuthConfig } from '../src/services/auth.service'
import { hashPassword } from '../src/utils/scryptPassword'

const USER = 'operator'
const PASS = 'test-pass-for-auth'

type Started = {
  server: http.Server
  base: string
  audioDir: string
  publicDir: string
  app: Application
}

async function listen(app: Application): Promise<Started> {
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    server,
    base: `http://127.0.0.1:${port}`,
    audioDir: '',
    publicDir: '',
    app,
  }
}

function close(started: { server: http.Server }): Promise<void> {
  return new Promise((resolve) => started.server.close(() => resolve()))
}

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

async function withAuthEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const keys = [
    'AUTH_USERNAME',
    'AUTH_PASSWORD_HASH',
    'AUTH_SESSION_TTL_MS',
    'AUTH_COOKIE_NAME',
    'AUTH_CORS_ORIGINS',
    'NODE_ENV',
  ]
  const saved: Record<string, string | undefined> = {}
  for (const k of keys) saved[k] = process.env[k]
  try {
    for (const k of keys) {
      if (k in env) {
        if (env[k] === undefined) delete process.env[k]
        else process.env[k] = env[k]
      } else if (k.startsWith('AUTH_')) {
        delete process.env[k]
      }
    }
    return await fn()
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
}

function makeApp(audioDir: string, publicDir: string) {
  return createApp({
    isDev: true,
    rateLimit: 1e6,
    rateLimitWindow: 10,
    audioDir,
    publicDir,
  })
}

async function json(
  base: string,
  urlPath: string,
  opts: {
    method?: string
    body?: unknown
    cookie?: string
    origin?: string | null
    headers?: Record<string, string>
  } = {}
) {
  const headers: Record<string, string> = { ...(opts.headers || {}) }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.cookie) headers.Cookie = opts.cookie
  if (opts.origin !== null) headers.Origin = opts.origin ?? new URL(base).origin
  const res = await fetch(`${base}${urlPath}`, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { res, data, setCookie: res.headers.get('set-cookie') || '' }
}

function sessionCookie(setCookie: string): string {
  const m = setCookie.match(/ev_session=([^;]*)/)
  return m ? `ev_session=${m[1]}` : ''
}

describe('loadAuthConfig', () => {
  it('is disabled when both values are empty', () => {
    const cfg = loadAuthConfig({ AUTH_USERNAME: '', AUTH_PASSWORD_HASH: '' })
    expect(cfg.enabled).toBe(false)
  })

  it('fails closed when only one value is set', () => {
    expect(() => loadAuthConfig({ AUTH_USERNAME: 'a', AUTH_PASSWORD_HASH: '' })).toThrow(
      /both be set/
    )
    expect(() => loadAuthConfig({ AUTH_USERNAME: '', AUTH_PASSWORD_HASH: 'scrypt$x' })).toThrow(
      /both be set/
    )
  })

  it('rejects a non-scrypt hash', async () => {
    expect(() =>
      loadAuthConfig({ AUTH_USERNAME: 'a', AUTH_PASSWORD_HASH: 'plaintext' })
    ).toThrow(/valid scrypt hash/)
  })
})

describe('auth HTTP', () => {
  let hash: string
  beforeAll(async () => {
    hash = await hashPassword(PASS)
  })

  it('leaves TTS open when auth is not configured', async () => {
    await withAuthEnv({}, async () => {
      const audioDir = tmpDir('ev-audio-')
      const publicDir = tmpDir('ev-pub-')
      const started = await listen(makeApp(audioDir, publicDir))
      try {
        const r = await json(started.base, '/api/v1/tts/llmConfig', { origin: null })
        expect(r.res.status).toBe(200)
        expect(r.data.success).toBe(true)
        const session = await json(started.base, '/api/v1/auth/session')
        expect(session.data.data.enabled).toBe(false)
      } finally {
        await close(started)
        fs.rmSync(audioDir, { recursive: true, force: true })
        fs.rmSync(publicDir, { recursive: true, force: true })
      }
    })
  })

  it('protects TTS, downloads, static audio/subtitles, and allows health plus public assets', async () => {
    await withAuthEnv({ AUTH_USERNAME: USER, AUTH_PASSWORD_HASH: hash }, async () => {
      const audioDir = tmpDir('ev-audio-')
      const publicDir = tmpDir('ev-pub-')
      fs.writeFileSync(path.join(audioDir, 'secret.mp3'), 'audio')
      fs.writeFileSync(path.join(audioDir, 'secret.srt'), '1\n')
      fs.writeFileSync(path.join(publicDir, 'ok.txt'), 'public')
      const started = await listen(makeApp(audioDir, publicDir))
      const origin = new URL(started.base).origin
      try {
        const paths = [
          '/api/v1/tts/llmConfig',
          '/api/v1/tts/voiceList',
          '/api/v1/tts/task/stats',
          '/api/v1/tts/task/abc',
          '/api/v1/tts/download/secret.mp3',
          '/secret.mp3',
          '/secret.srt',
        ]
        for (const p of paths) {
          const r = await json(started.base, p, { origin })
          expect(`${p}:${r.res.status}`).toBe(`${p}:401`)
          expect(r.data.message).toBe('未登录')
          expect(r.data.message).not.toMatch(/operator|AUTH_|hash/i)
        }

        const postPaths = ['/api/v1/tts/create', '/api/v1/tts/createStream', '/api/v1/tts/generate', '/api/v1/tts/generateJson']
        for (const p of postPaths) {
          const r = await json(started.base, p, { origin, body: { text: 'hi' } })
          expect(`${p}:${r.res.status}`).toBe(`${p}:401`)
        }

        const health = await json(started.base, '/api/health', { origin: null })
        expect(health.res.status).toBe(200)

        const asset = await fetch(`${started.base}/ok.txt`)
        expect(asset.status).toBe(200)
        expect(await asset.text()).toBe('public')
      } finally {
        await close(started)
        fs.rmSync(audioDir, { recursive: true, force: true })
        fs.rmSync(publicDir, { recursive: true, force: true })
      }
    })
  })

  it('logs in with HttpOnly Lax cookie, rejects bad passwords, and serves protected files after login', async () => {
    await withAuthEnv({ AUTH_USERNAME: USER, AUTH_PASSWORD_HASH: hash }, async () => {
      const audioDir = tmpDir('ev-audio-')
      const publicDir = tmpDir('ev-pub-')
      fs.writeFileSync(path.join(audioDir, 'secret.mp3'), 'audio')
      fs.writeFileSync(path.join(audioDir, 'secret.srt'), '1\n')
      const started = await listen(makeApp(audioDir, publicDir))
      const origin = new URL(started.base).origin
      try {
        const badUser = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: 'nope', password: PASS },
        })
        const badPass = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: 'nope' },
        })
        expect(badUser.res.status).toBe(401)
        expect(badPass.res.status).toBe(401)
        expect(badUser.data.message).toBe(badPass.data.message)
        expect(badUser.data.message).toBe('用户名或密码错误')
        expect(JSON.stringify(badUser.data)).not.toMatch(/operator/)

        const ok = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: PASS },
        })
        expect(ok.res.status).toBe(200)
        expect(ok.data.data.authenticated).toBe(true)
        expect(ok.data.data.username).toBe(USER)
        const setCookie = ok.setCookie
        expect(setCookie).toMatch(/HttpOnly/i)
        expect(setCookie).toMatch(/SameSite=Lax/i)
        expect(setCookie).not.toMatch(/Secure/i)
        expect(ok.res.headers.get('cache-control') || '').toMatch(/no-store/)

        const cookie = sessionCookie(setCookie)
        const me = await json(started.base, '/api/v1/auth/session', { cookie, origin })
        expect(me.data.data.authenticated).toBe(true)

        const cfg = await json(started.base, '/api/v1/tts/llmConfig', { cookie, origin })
        expect(cfg.res.status).toBe(200)

        const audio = await fetch(`${started.base}/secret.mp3`, { headers: { Cookie: cookie, Origin: origin } })
        expect(audio.status).toBe(200)
        expect(await audio.text()).toBe('audio')
        const srt = await fetch(`${started.base}/secret.srt`, { headers: { Cookie: cookie, Origin: origin } })
        expect(srt.status).toBe(200)
        const dl = await fetch(`${started.base}/api/v1/tts/download/secret.mp3`, {
          headers: { Cookie: cookie, Origin: origin },
        })
        // downloadAudio reads the process AUDIO_DIR, not the test temp dir;
        // a non-401 status means the request passed authentication.
        expect(dl.status).not.toBe(401)
      } finally {
        await close(started)
        fs.rmSync(audioDir, { recursive: true, force: true })
        fs.rmSync(publicDir, { recursive: true, force: true })
      }
    })
  })

  it('sets Secure on HTTPS logins and rejects cross-site or origin-less state changes', async () => {
    await withAuthEnv({ AUTH_USERNAME: USER, AUTH_PASSWORD_HASH: hash }, async () => {
      const audioDir = tmpDir('ev-audio-')
      const publicDir = tmpDir('ev-pub-')
      const started = await listen(makeApp(audioDir, publicDir))
      const origin = new URL(started.base).origin
      try {
        const httpsLogin = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: PASS },
          headers: { 'X-Forwarded-Proto': 'https' },
        })
        expect(httpsLogin.res.status).toBe(200)
        expect(httpsLogin.setCookie).toMatch(/Secure/i)

        const csrf = await json(started.base, '/api/v1/auth/login', {
          origin: 'https://evil.example',
          body: { username: USER, password: PASS },
        })
        expect(csrf.res.status).toBe(403)

        const missing = await fetch(`${started.base}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: USER, password: PASS }),
        })
        expect(missing.status).toBe(403)
      } finally {
        await close(started)
        fs.rmSync(audioDir, { recursive: true, force: true })
        fs.rmSync(publicDir, { recursive: true, force: true })
      }
    })
  })

  it('rate-limits failed logins, rejects expired or tampered cookies, and revokes on logout', async () => {
    await withAuthEnv({ AUTH_USERNAME: USER, AUTH_PASSWORD_HASH: hash }, async () => {
      const audioDir = tmpDir('ev-audio-')
      const publicDir = tmpDir('ev-pub-')
      fs.writeFileSync(path.join(audioDir, 'secret.mp3'), 'audio')
      const started = await listen(makeApp(audioDir, publicDir))
      const origin = new URL(started.base).origin
      const auth = started.app.locals.auth as AuthService
      try {
        for (let i = 0; i < 10; i++) {
          const r = await json(started.base, '/api/v1/auth/login', {
            origin,
            body: { username: USER, password: 'wrong' },
          })
          expect(r.res.status).toBe(401)
        }
        const limited = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: PASS },
        })
        expect(limited.res.status).toBe(429)
        auth.resetLoginLimiter()

        const ok = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: PASS },
        })
        expect(ok.res.status).toBe(200)
        const cookie = sessionCookie(ok.setCookie)
        const token = cookie.slice('ev_session='.length)

        const tampered = await json(started.base, '/api/v1/tts/llmConfig', {
          origin,
          cookie: 'ev_session=this-is-not-a-valid-token',
        })
        expect(tampered.res.status).toBe(401)

        auth.expireSession(token)
        const expired = await json(started.base, '/api/v1/tts/llmConfig', { origin, cookie })
        expect(expired.res.status).toBe(401)

        const ok2 = await json(started.base, '/api/v1/auth/login', {
          origin,
          body: { username: USER, password: PASS },
        })
        const cookie2 = sessionCookie(ok2.setCookie)
        const out = await json(started.base, '/api/v1/auth/logout', { method: 'POST', origin, cookie: cookie2 })
        expect(out.res.status).toBe(200)
        expect(out.setCookie).toMatch(/Max-Age=0/i)
        const after = await json(started.base, '/api/v1/tts/llmConfig', { origin, cookie: cookie2 })
        expect(after.res.status).toBe(401)
        const audio = await fetch(`${started.base}/secret.mp3`, {
          headers: { Cookie: cookie2, Origin: origin },
        })
        expect(audio.status).toBe(401)
      } finally {
        await close(started)
        fs.rmSync(audioDir, { recursive: true, force: true })
        fs.rmSync(publicDir, { recursive: true, force: true })
      }
    })
  })
})
