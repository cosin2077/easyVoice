import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../views/Home.vue'
import HomeView2 from '../views/Home2.vue'
import AboutView from '../views/About.vue'
import Generate from '../views/Generate.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/home2', component: HomeView2 },
  { path: '/generate', component: Generate },
  { path: '/about', component: AboutView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})