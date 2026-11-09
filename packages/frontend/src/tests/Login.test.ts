import { beforeEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ElementPlus from 'element-plus'
import Login from '@/views/Login.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/api/auth', () => ({
  fetchSession: vi.fn(async () => ({ enabled: true, authenticated: false, username: '' })),
  login: vi.fn(async (username: string, password: string) => {
    if (username === 'operator' && password === 'secret') {
      return { enabled: true, authenticated: true, username }
    }
    const err: any = new Error('用户名或密码错误')
    err.response = { data: { message: '用户名或密码错误' } }
    throw err
  }),
  logout: vi.fn(async () => {}),
}))

async function mountLogin() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: Login },
      { path: '/generate', component: { template: '<div>generate</div>' } },
    ],
  })
  await router.push('/login')
  await router.isReady()
  return mount(Login, {
    global: { plugins: [pinia, router, ElementPlus] },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('renders a username and password form', async () => {
  const wrapper = await mountLogin()
  expect(wrapper.text()).toContain('登录 EasyVoice')
  expect(wrapper.find('input[name="username"]').exists()).toBe(true)
  expect(wrapper.find('input[name="password"]').exists()).toBe(true)
})

test('shows an error when fields are empty', async () => {
  const wrapper = await mountLogin()
  await wrapper.find('form').trigger('submit.prevent')
  expect(wrapper.text()).toContain('请输入用户名和密码')
})

test('logs in and goes to generate', async () => {
  const wrapper = await mountLogin()
  await wrapper.find('input[name="username"]').setValue('operator')
  await wrapper.find('input[name="password"]').setValue('secret')
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
  const auth = useAuthStore()
  expect(auth.authenticated).toBe(true)
  expect(wrapper.vm.$router.currentRoute.value.path).toBe('/generate')
})

test('shows the server error for a bad password', async () => {
  const wrapper = await mountLogin()
  await wrapper.find('input[name="username"]').setValue('operator')
  await wrapper.find('input[name="password"]').setValue('nope')
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
  expect(wrapper.text()).toContain('用户名或密码错误')
})
