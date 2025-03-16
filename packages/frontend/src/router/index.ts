import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../views/Home.vue'
import AboutView from '../views/About.vue'
import NovelToAudio from '../views/NovelToAudio.vue'

const routes = [
  { path: '/', component: HomeView },
  // { path: '/novel-to-audio', component: NovelToAudio },
  { path: '/about', component: AboutView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})