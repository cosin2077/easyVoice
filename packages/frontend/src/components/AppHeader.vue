<template>
  <header class="app-header" :class="{ open }">
    <div class="bar">
      <router-link to="/" class="brand" aria-label="EasyVoice 首页">
        <span class="brand-mark" aria-hidden="true" />
        EasyVoice
      </router-link>

      <nav class="nav-inline" aria-label="主导航">
        <router-link v-for="l in links" :key="l.to" :to="l.to" class="nav-link">{{ l.label }}</router-link>
        <a class="nav-link icon-link" :href="repo" target="_blank" rel="noopener" aria-label="GitHub">
          <Github :size="18" :stroke-width="1.75" />
        </a>
      </nav>

      <button
        type="button"
        class="menu-btn"
        :aria-expanded="open"
        aria-controls="ev-mobile-nav"
        :aria-label="open ? '关闭菜单' : '打开菜单'"
        @click="open = !open"
      >
        <X v-if="open" :size="20" :stroke-width="1.75" />
        <Menu v-else :size="20" :stroke-width="1.75" />
      </button>
    </div>

    <transition name="sheet">
      <nav v-if="open" id="ev-mobile-nav" class="nav-sheet" aria-label="主导航">
        <router-link v-for="l in links" :key="l.to" :to="l.to" class="sheet-link">{{ l.label }}</router-link>
        <a class="sheet-link" :href="repo" target="_blank" rel="noopener">
          GitHub <ExternalLink :size="14" :stroke-width="1.75" />
        </a>
      </nav>
    </transition>
  </header>
  <div v-if="open" class="scrim" aria-hidden="true" @click="open = false" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Github, Menu, X, ExternalLink } from 'lucide-vue-next'

const repo = 'https://github.com/cosin2077/easyVoice'
const links = [
  { to: '/', label: '首页' },
  { to: '/generate', label: '生成语音' },
  { to: '/about', label: '关于' },
]
const open = ref(false)
const route = useRoute()
watch(
  () => route.fullPath,
  () => (open.value = false)
)
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped lang="less">
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: var(--ev-safe-top);
  background: rgba(247, 247, 248, 0.78);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.bar {
  max-width: var(--ev-page-max);
  height: var(--ev-header-h);
  margin: 0 auto;
  padding: 0 calc(var(--ev-gutter) + var(--ev-safe-right)) 0 calc(var(--ev-gutter) + var(--ev-safe-left));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--ev-touch);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ev-text);
}
.brand:hover {
  color: var(--ev-text);
}
.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--ev-accent);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
}

.nav-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ev-muted);
  transition: color 0.15s, background-color 0.15s;
}
.nav-link:hover {
  color: var(--ev-text);
  background: rgba(0, 0, 0, 0.04);
}
.nav-link.router-link-exact-active {
  color: var(--ev-text);
  background: rgba(0, 0, 0, 0.05);
}
.icon-link {
  padding: 0 9px;
}
@media @bp-touch {
  .nav-link {
    height: var(--ev-touch);
    padding: 0 14px;
  }
  .icon-link {
    width: var(--ev-touch);
    justify-content: center;
    padding: 0;
  }
}

.menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--ev-touch);
  height: var(--ev-touch);
  margin-right: -10px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ev-text);
  cursor: pointer;
}
.menu-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.nav-sheet {
  display: none;
}
.scrim {
  display: none;
}

@media @bp-phone {
  .nav-inline {
    display: none;
  }
  .menu-btn {
    display: inline-flex;
  }
  .nav-sheet {
    display: flex;
    flex-direction: column;
    padding: 4px calc(var(--ev-gutter) + var(--ev-safe-right)) 12px calc(var(--ev-gutter) + var(--ev-safe-left));
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }
  .sheet-link {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 0 4px;
    font-size: 16px;
    font-weight: 500;
    color: var(--ev-text-2);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  .sheet-link:last-child {
    border-bottom: 0;
  }
  .sheet-link.router-link-exact-active {
    color: var(--ev-accent);
  }
  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(15, 15, 20, 0.18);
  }
  .app-header.open {
    background: rgba(247, 247, 248, 0.96);
  }
}

/* landscape phones: don't pin chrome over a 390px-tall screen */
@media @bp-short {
  .app-header {
    position: relative;
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
