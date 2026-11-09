import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { isScryptHash, verifyPassword } from '../utils/scryptPassword'

export const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const DEFAULT_COOKIE_NAME = 'ev_session'
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_MAX_ATTEMPTS = 10

export type AuthConfig = {
  enabled: boolean
  username: string
  passwordHash: string
  sessionTtlMs: number
  cookieName: string
  corsOrigins: string[]
}

type SessionRecord = {
  user: string
  expiresAt: number
  createdAt: number
}

type LoginAttempt = {
  count: number
  resetAt: number
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const username = (env.AUTH_USERNAME || '').trim()
  const passwordHash = (env.AUTH_PASSWORD_HASH || '').trim()
  const sessionTtlMs = parsePositiveInt(env.AUTH_SESSION_TTL_MS, DEFAULT_SESSION_TTL_MS)
  const cookieName = (env.AUTH_COOKIE_NAME || '').trim() || DEFAULT_COOKIE_NAME
  const corsOrigins = (env.AUTH_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!username && !passwordHash) {
    return {
      enabled: false,
      username: '',
      passwordHash: '',
      sessionTtlMs,
      cookieName,
      corsOrigins,
    }
  }

  if (!username || !passwordHash) {
    throw new Error(
      'AUTH_USERNAME and AUTH_PASSWORD_HASH must both be set, or both left empty. Partial auth config is not allowed.'
    )
  }

  if (!isScryptHash(passwordHash)) {
    throw new Error(
      'AUTH_PASSWORD_HASH is not a valid scrypt hash. Generate one with: node scripts/hash-password.mjs'
    )
  }

  return {
    enabled: true,
    username,
    passwordHash,
    sessionTtlMs,
    cookieName,
    corsOrigins,
  }
}

export class AuthService {
  private sessions = new Map<string, SessionRecord>()
  private loginAttempts = new Map<string, LoginAttempt>()

  constructor(public readonly config: AuthConfig) {}

  get enabled(): boolean {
    return this.config.enabled
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    if (!this.config.enabled) return false
    const userOk = safeEqualString(username, this.config.username)
    // Always verify against the real hash so a wrong username is not faster.
    const passOk = await verifyPassword(password, this.config.passwordHash)
    return userOk && passOk
  }

  createSession(username: string): { token: string; expiresAt: number } {
    this.pruneSessions()
    const token = randomBytes(32).toString('base64url')
    const now = Date.now()
    const expiresAt = now + this.config.sessionTtlMs
    this.sessions.set(sessionKey(token), {
      user: username,
      expiresAt,
      createdAt: now,
    })
    return { token, expiresAt }
  }

  getSession(token: string | undefined): SessionRecord | null {
    if (!token) return null
    this.pruneSessions()
    const record = this.sessions.get(sessionKey(token))
    if (!record) return null
    if (record.expiresAt <= Date.now()) {
      this.sessions.delete(sessionKey(token))
      return null
    }
    return record
  }

  revokeSession(token: string | undefined): void {
    if (!token) return
    this.sessions.delete(sessionKey(token))
  }

  /** Test helper: mark a session expired without waiting. */
  expireSession(token: string): void {
    const key = sessionKey(token)
    const record = this.sessions.get(key)
    if (record) record.expiresAt = Date.now() - 1
  }

  checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now()
    const current = this.loginAttempts.get(ip)
    if (!current || current.resetAt <= now) {
      this.loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_WINDOW_MS })
      return { allowed: true, retryAfterSec: 0 }
    }
    if (current.count >= LOGIN_MAX_ATTEMPTS) {
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
    }
    return { allowed: true, retryAfterSec: 0 }
  }

  recordLoginFailure(ip: string): void {
    const now = Date.now()
    const current = this.loginAttempts.get(ip)
    if (!current || current.resetAt <= now) {
      this.loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
      return
    }
    current.count += 1
  }

  clearLoginFailures(ip: string): void {
    this.loginAttempts.delete(ip)
  }

  resetLoginLimiter(): void {
    this.loginAttempts.clear()
  }

  private pruneSessions(): void {
    const now = Date.now()
    for (const [key, record] of this.sessions) {
      if (record.expiresAt <= now) this.sessions.delete(key)
    }
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = parseInt(value || '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function sessionKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function safeEqualString(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

