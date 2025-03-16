<template>
  <div class="home-container">
    <transition name="el-fade-in-linear">
      <router-view />
    </transition>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { defineComponent } from "vue";
import Footer from "@/components/Footer.vue";
defineComponent({ name: "App" });
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 20px;
  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
}
</style>