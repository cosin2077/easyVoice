import { createHash } from 'node:crypto'
export const CHROMIUM_FULL_VERSION = '130.0.2849.68'
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WINDOWS_FILE_TIME_EPOCH = 11644473600n

export function generateSecMsGecToken() {
  const ticks = BigInt(Math.floor(Date.now() / 1000 + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n
  const roundedTicks = ticks - (ticks % 3000000000n)

  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`

  const hash = createHash('sha256')
  hash.update(strToHash, 'ascii')

  return hash.digest('hex').toUpperCase()
}
