import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from '../views/Home.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/about', component: HomeView },
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
})