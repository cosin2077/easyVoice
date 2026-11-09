import { beforeEach, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const fetchSession = vi.fn()
const login = vi.fn()
const logout = vi.fn()

vi.mock('@/api/auth', () => ({
  fetchSession: (...args: unknown[]) => fetchSession(...args),
  login: (...args: unknown[]) => login(...args),
  logout: (...args: unknown[]) => logout(...args),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSession.mockReset()
  login.mockReset()
  logout.mockReset()
})

test('needsLogin is true only when auth is enabled and the session is missing', async () => {
  fetchSession.mockResolvedValue({ enabled: true, authenticated: false, username: '' })
  const store = useAuthStore()
  await store.ensureSession()
  expect(store.needsLogin).toBe(true)

  store.apply({ enabled: true, authenticated: true, username: 'op' })
  expect(store.needsLogin).toBe(false)

  store.apply({ enabled: false, authenticated: false, username: '' })
  expect(store.needsLogin).toBe(false)
})

test('clearLocal drops the session without disabling auth', () => {
  const store = useAuthStore()
  store.apply({ enabled: true, authenticated: true, username: 'op' })
  store.clearLocal()
  expect(store.enabled).toBe(true)
  expect(store.authenticated).toBe(false)
  expect(store.username).toBe('')
})

test('logout clears the local session even if the request fails', async () => {
  logout.mockRejectedValue(new Error('network'))
  const store = useAuthStore()
  store.apply({ enabled: true, authenticated: true, username: 'op' })
  await expect(store.logout()).rejects.toThrow('network')
  expect(store.authenticated).toBe(false)
})
