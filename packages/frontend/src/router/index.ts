import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '@/views/Home.vue'
import AboutView from '@/views/About.vue'
import Generate from '@/views/Generate.vue'
import CustomGenerate from '@/views/CustomGenerate.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/generate', component: Generate },
  { path: '/custom-generate', component: CustomGenerate },
  { path: '/about', component: AboutView },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
