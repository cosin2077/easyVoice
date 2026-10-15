export const CHROMIUM_FULL_VERSION = '143.0.3650.75'
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
export const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`

const WINDOWS_FILE_TIME_EPOCH = 11644473600n
const SECONDS_PER_TOKEN_WINDOW = 300n
const WINDOWS_TICKS_PER_SECOND = 10000000n
const U32_MASK_BIGINT = 0xffffffffn
const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]
const SHA256_STATE = [
  0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a, 0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2,
]
const SHA256_SCHEDULE = [
  0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba, 0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6,
  0xf0c31573, 0x7058ce4e, 0x7188e606, 0x00e5ab33, 0xd258b060, 0x72766564,
]
const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]
const SHA256_ADJUSTMENT = 0xc9dc06a7
const SHA256_BLOCK_CONSTANTS = [
  ...SHA256_ROUND_CONSTANTS.slice(0, 14),
  SHA256_ADJUSTMENT,
  ...SHA256_ROUND_CONSTANTS.slice(15),
]
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0

// Port of edge-tts 7.3.0's modified SHA-256 and CS64 token algorithm.
// See EDGE-TTS-LICENSE.txt for the upstream LGPL-3.0 license and attribution.
const CS64_COEFFICIENTS: ReadonlyArray<readonly [number, number]> = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
]

function multiply32(left: number, right: number): number {
  return Number((BigInt(left >>> 0) * BigInt(right >>> 0)) & U32_MASK_BIGINT)
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) >>> 0
}

function rotateLeft16(value: number): number {
  const word = value >>> 0
  return ((word << 16) | (word >>> 16)) >>> 0
}

const u32 = (value: number): number => value >>> 0
const rotateRight = (value: number, bits: number): number =>
  ((value >>> bits) | (value << (32 - bits))) >>> 0
const sigma0 = (value: number): number =>
  (rotateRight(value, 7) ^ rotateRight(value, 18) ^ (value >>> 3)) >>> 0
const sigma1 = (value: number): number =>
  (rotateRight(value, 17) ^ rotateRight(value, 19) ^ (value >>> 10)) >>> 0

function sha256Rounds(state: number[], words: number[], firstRound = 0): number[] {
  let [a, b, c, d, e, f, g, h] = state
  const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS
  for (let index = firstRound; index < 64; index++) {
    const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
    const choice = g ^ (e & (f ^ g))
    const t1 = u32(h + u32(sum1) + u32(choice) + constants[index] + words[index])
    const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
    const majority = (a & b) | (c & (a | b))
    const t2 = u32(u32(sum0) + u32(majority))
    h = g
    g = f
    f = e
    e = u32(d + t1)
    d = c
    c = b
    b = a
    a = u32(t1 + t2)
  }
  return [a, b, c, d, e, f, g, h]
}

function expandSha256Schedule(words: number[], firstWord = 16): void {
  for (let index = firstWord; index < 64; index++) {
    words.push(
      u32(
        sigma1(words[index - 2]) +
          words[index - 7] +
          sigma0(words[index - 15]) +
          words[index - 16]
      )
    )
  }
}

function readBigEndianWord(data: Uint8Array, offset: number, length: number): number {
  let value = 0
  for (let index = 0; index < length; index++) value = u32(value * 256 + data[offset + index])
  return value
}

function sha256InitialState(firstSevenBytes: Uint8Array): number[] {
  const words: number[] = new Array(14).fill(0)
  words.push(readBigEndianWord(firstSevenBytes, 0, 3))
  words.push(readBigEndianWord(firstSevenBytes, 3, 4))

  for (let index = 16; index < 30; index++) {
    let value = SHA256_SCHEDULE[index - 16]
    if (index - 2 >= 14) {
      value +=
        index === 16
          ? u32(sigma1(words[index - 2]) ^ SHA256_SIGMA1_ADJUSTMENT)
          : sigma1(words[index - 2])
    }
    if (index - 7 >= 14) value += words[index - 7]
    if (index - 15 >= 14) {
      value +=
        index === 29
          ? u32(sigma0(words[index - 15]) ^ SHA256_SIGMA0_ADJUSTMENT)
          : sigma0(words[index - 15])
    }
    words.push(u32(value))
  }

  words.push(
    u32(
      sigma1(words[28]) +
        words[23] +
        sigma0(words[15]) +
        words[14] +
        SHA256_ADJUSTMENT -
        SHA256_ROUND_CONSTANTS[14]
    )
  )
  expandSha256Schedule(words, 31)
  const workingState = sha256Rounds(SHA256_STATE, words, 14)
  return SHA256_INITIAL.map((word, index) => u32(word + workingState[index]))
}

function sha256Digest(data: Uint8Array): Buffer {
  if (data.length < 7) throw new Error('Token salt must contain at least seven bytes')

  // edge-tts 7.3.0 uses a modified SHA-256 first block for the v2 token.
  const bitLength = (57 + data.length) * 8
  const zeroCount = (((55 - (57 + data.length)) % 64) + 64) % 64
  const padded = Buffer.alloc(data.length - 7 + 1 + zeroCount + 8)
  Buffer.from(data.subarray(7)).copy(padded)
  padded[data.length - 7] = 0x80
  padded.writeBigUInt64BE(BigInt(bitLength), padded.length - 8)

  let state = sha256InitialState(data.subarray(0, 7))
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words: number[] = []
    for (let index = 0; index < 16; index++) {
      words.push(padded.readUInt32BE(offset + index * 4))
    }
    expandSha256Schedule(words)
    const workingState = sha256Rounds(state, words)
    state = state.map((word, index) => u32(word + workingState[index]))
  }

  const digest = Buffer.alloc(32)
  state.forEach((word, index) => digest.writeUInt32BE(word, index * 4))
  return digest
}

function wordsLe4Even(data: Buffer): number[] {
  const paddedLength = Math.ceil(data.length / 4) * 4
  const padded = Buffer.alloc(paddedLength)
  data.copy(padded)

  const words: number[] = []
  for (let offset = 0; offset < padded.length; offset += 4) {
    words.push(padded.readUInt32LE(offset))
  }
  if (words.length % 2 !== 0) words.push(0)
  return words
}

function cs64Digest(data: Buffer, sha256Digest: Buffer): [number, number] {
  const keyA = (sha256Digest.readUInt32LE(0) | 1) >>> 0
  const keyB = (sha256Digest.readUInt32LE(4) | 1) >>> 0
  const factorA = multiply32(keyA, 0x82893933)
  const factorB = multiply32(keyB, 0x82893933)
  const terms = CS64_COEFFICIENTS.map(([coefficient], index) =>
    multiply32(coefficient, index % 2 === 0 ? factorA : factorB)
  )
  const offsets = CS64_COEFFICIENTS.map(([, offset]) => offset)

  const words = wordsLe4Even(Buffer.concat([Buffer.from([0]), data]))
  words.forEach((word, index) => {
    const even = index % 2 === 0
    let term = multiply32(word, even ? keyA : keyB)
    let offset = multiply32(rotateLeft16(word), even ? 0xef0569fb : 0xc31713db)
    if (index === 0) {
      term = add32(term, multiply32(0xf2f90b1a, factorA))
      offset = add32(offset, 0x0b1a0000)
    }
    terms.push(term)
    offsets.push(offset)
  })

  let swapAccumulator = 0
  let swapLast = 0
  let state = 0
  let accumulator = 0

  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index]
    const y = terms[index + 1]

    let value = rotateLeft16(add32(offsets[index], x))
    let mixed = multiply32(value, 0x76f50f34)
    swapAccumulator = add32(
      swapAccumulator,
      multiply32(rotateLeft16(mixed), 0xc3efea97),
      mixed
    )

    value = rotateLeft16(add32(offsets[index + 1], y))
    mixed = multiply32(value, 0x1881ce3c)
    swapLast = add32(multiply32(rotateLeft16(mixed), 0x35bd1ec9), mixed)
    swapAccumulator = add32(swapAccumulator, swapLast)

    state = add32(multiply32(state, keyA), x)
    state = multiply32(rotateLeft16(state), 0xcf98b111)
    state = multiply32(rotateLeft16(state), 0x87085b9f)
    state = multiply32(rotateLeft16(state), 0x12ceb96d)
    state = multiply32(rotateLeft16(state), 0x257e1d83)
    accumulator = add32(accumulator, state)

    value = add32(multiply32(state, keyB), y)
    value = multiply32(rotateLeft16(value), 0xa27416f5)
    value = multiply32(rotateLeft16(value), 0xd38396ff)
    state = multiply32(rotateLeft16(multiply32(rotateLeft16(value), 0x7c932b89)), 0xbfa49f69)
    accumulator = add32(accumulator, state)
  }

  return [(swapLast ^ state) >>> 0, (swapAccumulator ^ accumulator) >>> 0]
}

/**
 * Generate the v2 Sec-MS-GEC token required by Edge TTS.
 * The token remains valid for a five-minute time window.
 */
export function generateSecMsGecToken(unixTimestamp = Date.now() / 1000): string {
  const windowsSeconds = BigInt(Math.floor(unixTimestamp)) + WINDOWS_FILE_TIME_EPOCH
  const roundedSeconds = windowsSeconds - (windowsSeconds % SECONDS_PER_TOKEN_WINDOW)
  const ticks = roundedSeconds * WINDOWS_TICKS_PER_SECOND
  const tokenInput = Buffer.from(`${ticks}${TRUSTED_CLIENT_TOKEN}`, 'ascii')
  const digest = sha256Digest(tokenInput)
  const [firstWord, secondWord] = cs64Digest(tokenInput, digest)
  const cs64 = Buffer.alloc(8)
  cs64.writeUInt32LE(firstWord, 0)
  cs64.writeUInt32LE(secondWord, 4)

  return `${cs64.toString('hex').toUpperCase()}-${digest.toString('hex').toUpperCase()}`
}
