import axios from 'axios'

const baseURL = import.meta.env.VITE_AUTH_URL || '/api/v1/auth'

export const authApi = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
})

export type AuthSession = {
  enabled: boolean
  authenticated: boolean
  username: string
}

type Wrapper<T> = {
  success: boolean
  code: number
  data?: T
  message?: string
}

export async function fetchSession(): Promise<AuthSession> {
  const response = await authApi.get<Wrapper<AuthSession>>('/session')
  return (
    response.data?.data ?? {
      enabled: false,
      authenticated: false,
      username: '',
    }
  )
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await authApi.post<Wrapper<AuthSession>>('/login', { username, password })
  if (response.data?.code !== 200 || !response.data?.success || !response.data.data) {
    throw new Error(response.data?.message || '登录失败')
  }
  return response.data.data
}

export async function logout(): Promise<void> {
  await authApi.post('/logout')
}
