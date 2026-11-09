#!/usr/bin/env node
/**
 * Generate an AUTH_PASSWORD_HASH for EasyVoice login.
 * Usage:
 *   printf '%s' 'your-password' | node scripts/hash-password.mjs
 *   node scripts/hash-password.mjs your-password   (visible in process list; prefer stdin)
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { promisify } from 'node:util'
import { stdin, stdout, stderr, argv, exit } from 'node:process'

const scrypt = promisify(scryptCb)
const N = 16384
const r = 8
const p = 1
const keylen = 32

async function readPassword() {
  if (argv[2]) {
    stderr.write('Warning: passing the password as an argument may expose it in the process list. Prefer stdin.\n')
    return argv[2]
  }
  if (stdin.isTTY) {
    stderr.write('Password: ')
  }
  const chunks = []
  for await (const chunk of stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
}

const password = await readPassword()
if (!password) {
  stderr.write('No password provided.\n')
  exit(1)
}

const salt = randomBytes(16)
const hash = await scrypt(password, salt, keylen, { N, r, p })
const encoded = `scrypt$${N}$${r}$${p}$${keylen}$${salt.toString('base64url')}$${hash.toString('base64url')}`
stdout.write(`${encoded}\n`)
