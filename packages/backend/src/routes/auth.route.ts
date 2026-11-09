import { Router, Request, Response } from 'express'
import {
  cookieHeader,
  getAuth,
  isHttps,
  noStore,
  readSessionToken,
  requireCsrf,
  clientIp,
  LOGIN_ERROR_MESSAGE,
} from '../middleware/auth.middleware'

const router = Router()

router.get('/session', (req: Request, res: Response) => {
  noStore(res)
  const auth = getAuth(req)
  if (!auth.enabled) {
    res.json({ success: true, code: 200, data: { enabled: false, authenticated: false, username: '' } })
    return
  }
  const session = auth.getSession(readSessionToken(req))
  res.json({
    success: true,
    code: 200,
    data: {
      enabled: true,
      authenticated: !!session,
      username: session?.user || '',
    },
  })
})

router.post('/login', requireCsrf, async (req: Request, res: Response) => {
  noStore(res)
  const auth = getAuth(req)
  if (!auth.enabled) {
    res.status(400).json({ success: false, code: 400, message: '未启用登录鉴权' })
    return
  }

  const ip = clientIp(req)
  const limit = auth.checkLoginRateLimit(ip)
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSec))
    res.status(429).json({ success: false, code: 429, message: '登录尝试过多，请稍后再试' })
    return
  }

  const username = typeof req.body?.username === 'string' ? req.body.username : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const ok = await auth.authenticate(username, password)
  if (!ok) {
    auth.recordLoginFailure(ip)
    res.status(401).json({ success: false, code: 401, message: LOGIN_ERROR_MESSAGE })
    return
  }

  auth.clearLoginFailures(ip)
  const { token, expiresAt } = auth.createSession(auth.config.username)
  const maxAgeSec = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))
  res.setHeader(
    'Set-Cookie',
    cookieHeader(auth.config.cookieName, token, { maxAgeSec, secure: isHttps(req) })
  )
  res.json({
    success: true,
    code: 200,
    data: { enabled: true, authenticated: true, username: auth.config.username },
  })
})

router.post('/logout', requireCsrf, (req: Request, res: Response) => {
  noStore(res)
  const auth = getAuth(req)
  auth.revokeSession(readSessionToken(req))
  res.setHeader(
    'Set-Cookie',
    cookieHeader(auth.config.cookieName, '', { maxAgeSec: 0, secure: isHttps(req), clear: true })
  )
  res.json({ success: true, code: 200, data: { enabled: auth.enabled, authenticated: false, username: '' } })
})

export default router
