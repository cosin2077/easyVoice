import { safeRunWithRetry } from '../src/utils'

describe('safeRunWithRetry (used by non-stream segment path)', () => {
  test('retries then succeeds', async () => {
    let n = 0
    const result = await safeRunWithRetry(
      async () => {
        n++
        if (n < 3) throw new Error('transient')
        return 'ok'
      },
      { retries: 3, baseDelayMs: 1 }
    )
    expect(result).toBe('ok')
    expect(n).toBe(3)
  })

  test('throws after exhausting retries', async () => {
    let n = 0
    await expect(
      safeRunWithRetry(
        async () => {
          n++
          throw new Error('always')
        },
        { retries: 3, baseDelayMs: 1 }
      )
    ).rejects.toThrow('always')
    expect(n).toBe(3)
  })
})
