<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <transition name="el-fade-in-linear">
        <router-view />
      </transition>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import Footer from '@/components/Footer.vue'
</script>

<style scoped lang="less">
/* The shell owns the page background and the horizontal gutter; pages only lay out content. */
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: var(--ev-text);
}
.app-main {
  flex: 1;
  width: 100%;
  padding-left: calc(var(--ev-gutter) + var(--ev-safe-left));
  padding-right: calc(var(--ev-gutter) + var(--ev-safe-right));
}
</style>
