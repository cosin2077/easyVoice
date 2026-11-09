import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '@/views/Home.vue'
import AboutView from '@/views/About.vue'
import Generate from '@/views/Generate.vue'
import Login from '@/views/Login.vue'
import NotFound from '@/views/NotFound.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', component: HomeView, meta: { public: true } },
  { path: '/generate', component: Generate },
  { path: '/about', component: AboutView, meta: { public: true } },
  { path: '/login', component: Login, meta: { public: true } },
  { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound, meta: { public: true } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureSession()
  if (!auth.enabled) {
    if (to.path === '/login') return { path: '/' }
    return true
  }
  if (to.path === '/login' && auth.authenticated) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/generate'
    return redirect.startsWith('/') ? redirect : '/generate'
  }
  if (to.meta.public) return true
  if (!auth.authenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})
