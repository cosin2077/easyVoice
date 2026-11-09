import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchSession, login as loginRequest, logout as logoutRequest, type AuthSession } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const enabled = ref(false)
  const authenticated = ref(false)
  const username = ref('')
  const ready = ref(false)
  const pending = ref<Promise<void> | null>(null)

  const needsLogin = computed(() => enabled.value && !authenticated.value)

  function apply(session: AuthSession) {
    enabled.value = session.enabled
    authenticated.value = session.authenticated
    username.value = session.username || ''
  }

  function clearLocal() {
    authenticated.value = false
    username.value = ''
  }

  async function refreshSession() {
    try {
      apply(await fetchSession())
    } catch {
      if (enabled.value) clearLocal()
    } finally {
      ready.value = true
    }
  }

  function ensureSession() {
    if (ready.value) return Promise.resolve()
    if (!pending.value) {
      pending.value = refreshSession().finally(() => {
        pending.value = null
      })
    }
    return pending.value
  }

  async function login(name: string, password: string) {
    const session = await loginRequest(name, password)
    apply(session)
    ready.value = true
    return session
  }

  async function logout() {
    try {
      await logoutRequest()
    } finally {
      clearLocal()
    }
  }

  return {
    enabled,
    authenticated,
    username,
    ready,
    needsLogin,
    apply,
    clearLocal,
    refreshSession,
    ensureSession,
    login,
    logout,
  }
})
