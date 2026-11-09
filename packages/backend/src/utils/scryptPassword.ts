import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'

export const SCRYPT_N = 16384
export const SCRYPT_R = 8
export const SCRYPT_P = 1
export const SCRYPT_KEYLEN = 32
export const SCRYPT_SALT_BYTES = 16

export type ParsedScryptHash = {
  N: number
  r: number
  p: number
  keylen: number
  salt: Buffer
  hash: Buffer
}

type ScryptParams = { N: number; r: number; p: number }

function scrypt(password: string, salt: Buffer, keylen: number, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, params, (err, derived) => {
      if (err) reject(err)
      else resolve(derived)
    })
  })
}

/**
 * Encoded form: scrypt$N$r$p$keylen$salt_b64url$hash_b64url
 */
export function isScryptHash(encoded: string): boolean {
  return parseScryptHash(encoded) !== null
}

export function parseScryptHash(encoded: string): ParsedScryptHash | null {
  if (!encoded || !encoded.startsWith('scrypt$')) return null
  const parts = encoded.split('$')
  if (parts.length !== 7) return null
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const keylen = Number(parts[4])
  if (![N, r, p, keylen].every((n) => Number.isInteger(n) && n > 0)) return null
  if (N < 2 || (N & (N - 1)) !== 0) return null
  try {
    const salt = Buffer.from(parts[5], 'base64url')
    const hash = Buffer.from(parts[6], 'base64url')
    if (salt.length < 16 || hash.length !== keylen) return null
    return { N, r, p, keylen, salt, hash }
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES)
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${SCRYPT_KEYLEN}$${salt.toString(
    'base64url'
  )}$${hash.toString('base64url')}`
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parseScryptHash(encoded)
  if (!parsed) return false
  const hash = await scrypt(password, parsed.salt, parsed.keylen, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
  })
  if (hash.length !== parsed.hash.length) return false
  return timingSafeEqual(hash, parsed.hash)
}
