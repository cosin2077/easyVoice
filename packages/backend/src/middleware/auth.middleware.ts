import { NextFunction, Request, Response } from 'express'
import type { AuthService } from '../services/auth.service'

export const LOGIN_ERROR_MESSAGE = '用户名或密码错误'
export const UNAUTHORIZED_MESSAGE = '未登录'
export const CSRF_REJECT_MESSAGE = '请求来源不被允许'

export function getAuth(req: Request): AuthService {
  const auth = req.app.locals.auth as AuthService | undefined
  if (!auth) {
    throw new Error('Auth service is not initialized')
  }
  return auth
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (!key) continue
    const raw = part.slice(idx + 1).trim()
    try {
      out[key] = decodeURIComponent(raw)
    } catch {
      out[key] = raw
    }
  }
  return out
}

export function readSessionToken(req: Request): string | undefined {
  const auth = getAuth(req)
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[auth.config.cookieName]
  return token || undefined
}

export function isHttps(req: Request): boolean {
  const forwarded = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  return req.secure || forwarded === 'https'
}

export function cookieHeader(
  name: string,
  value: string,
  opts: { maxAgeSec: number; secure: boolean; clear?: boolean }
): string {
  const parts = [
    `${name}=${opts.clear ? '' : encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (opts.clear) {
    parts.push('Max-Age=0')
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
  } else {
    parts.push(`Max-Age=${opts.maxAgeSec}`)
  }
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
}

export function requestSelfOrigin(req: Request): string {
  const proto = (
    String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() ||
    req.protocol ||
    'http'
  ).toLowerCase()
  const host = String(req.headers.host || '').split(',')[0].trim()
  return host ? `${proto}://${host}` : ''
}

function requestSelfOrigins(req: Request): string[] {
  const host = String(req.headers.host || '').split(',')[0].trim()
  if (!host) return []
  // Include both schemes so a TLS-terminating proxy does not reject a
  // same-host Origin that still uses http in tests or mixed setups.
  return [`http://${host}`, `https://${host}`]
}

export function devDefaultOrigins(): string[] {
  if (process.env.NODE_ENV !== 'development') return []
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ]
}

export function allowedOrigins(req: Request): Set<string> {
  const auth = getAuth(req)
  const origins = new Set<string>([
    ...auth.config.corsOrigins,
    ...devDefaultOrigins(),
    ...requestSelfOrigins(req),
  ])
  return origins
}

export function isAllowedOrigin(req: Request, origin: string): boolean {
  if (!origin || origin === 'null') return false
  return allowedOrigins(req).has(origin)
}

export function getRequestOrigin(req: Request): string | undefined {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : ''
  if (origin) return origin
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer.trim() : ''
  if (!referer) return undefined
  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req)
  if (!auth.enabled) return next()
  if (!MUTATING.has(req.method.toUpperCase())) return next()
  const origin = getRequestOrigin(req)
  if (!origin || !isAllowedOrigin(req, origin)) {
    noStore(res)
    res.status(403).json({ success: false, code: 403, message: CSRF_REJECT_MESSAGE })
    return
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req)
  if (!auth.enabled) return next()
  const session = auth.getSession(readSessionToken(req))
  if (!session) {
    noStore(res)
    res.status(401).json({ success: false, code: 401, message: UNAUTHORIZED_MESSAGE })
    return
  }
  res.locals.authUser = session.user
  next()
}

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.srt'])

export function requireAuthForAudio(req: Request, res: Response, next: NextFunction): void {
  const ext = extensionOf(req.path)
  if (!AUDIO_EXTS.has(ext)) return next()
  return requireAuth(req, res, next)
}

function extensionOf(urlPath: string): string {
  const base = urlPath.split('?')[0]
  const slash = base.lastIndexOf('/')
  const name = slash >= 0 ? base.slice(slash + 1) : base
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export function clientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim()
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown'
}

export function credentialedCors(req: Request, res: Response, next: NextFunction): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : ''
  if (origin && isAllowedOrigin(req, origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader(
      'Access-Control-Expose-Headers',
      'x-generate-tts-type, x-generate-tts-id, x-generate-tts-warning, content-type'
    )
  }
  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(req, origin)) {
      res.status(403).end()
      return
    }
    res.status(204).end()
    return
  }
  next()
}
