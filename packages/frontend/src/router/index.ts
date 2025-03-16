import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../views/Home.vue'
import AboutView from '../views/About.vue'
import Generate from '../views/Generate.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/generate', component: Generate },
  { path: '/about', component: AboutView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})