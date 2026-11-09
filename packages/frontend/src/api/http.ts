import type { AxiosInstance } from 'axios'
import { authApi } from '@/api/auth'
import { ttsApi } from '@/api/tts'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'

function attach401(client: AxiosInstance) {
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status
      const url = String(err?.config?.url || '')
      if (status === 401 && !url.includes('/login')) {
        const auth = useAuthStore()
        if (auth.enabled) {
          auth.clearLocal()
          if (router.currentRoute.value.path !== '/login') {
            router.push({
              path: '/login',
              query: { redirect: router.currentRoute.value.fullPath },
            })
          }
        }
      }
      return Promise.reject(err)
    }
  )
}

export function attachAuthInterceptors() {
  attach401(authApi)
  attach401(ttsApi)
}
