import { hashPassword, isScryptHash, parseScryptHash, verifyPassword } from '../src/utils/scryptPassword'

describe('scryptPassword', () => {
  it('hashes and verifies a password', async () => {
    const encoded = await hashPassword('correct horse battery')
    expect(isScryptHash(encoded)).toBe(true)
    expect(await verifyPassword('correct horse battery', encoded)).toBe(true)
    expect(await verifyPassword('wrong', encoded)).toBe(false)
  })

  it('rejects malformed hashes without throwing', async () => {
    expect(isScryptHash('')).toBe(false)
    expect(isScryptHash('bcrypt$foo')).toBe(false)
    expect(parseScryptHash('scrypt$1$8$1$32$aa$bb')).toBeNull()
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
  })
})
