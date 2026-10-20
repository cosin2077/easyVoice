import { assertSafeOpenaiBaseUrl } from '../src/utils/ssrf'

describe('assertSafeOpenaiBaseUrl', () => {
  test('accepts https openai', () => {
    expect(assertSafeOpenaiBaseUrl('https://api.openai.com/v1')).toContain('https://')
  })
  test('accepts localhost when private allowed', () => {
    expect(assertSafeOpenaiBaseUrl('http://127.0.0.1:8317/v1')).toContain('127.0.0.1')
  })
  test('rejects metadata host', () => {
    expect(() => assertSafeOpenaiBaseUrl('http://169.254.169.254/latest')).toThrow(/not allowed/)
  })
  test('rejects non-http', () => {
    expect(() => assertSafeOpenaiBaseUrl('file:///etc/passwd')).toThrow()
  })
  test('rejects private when disabled', () => {
    expect(() =>
      assertSafeOpenaiBaseUrl('http://192.168.1.1/v1', { allowPrivate: false })
    ).toThrow(/private/)
  })
})
