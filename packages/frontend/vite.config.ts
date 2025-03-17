import { defineConfig } from 'vitest/config';
import vue from "@vitejs/plugin-vue";
import path from "path";
export default defineConfig({

  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "./dist", // 输出到根目录 dist，与后端共享
  },
  test: {
    environment: 'jsdom',
    globals: true, // 全局 test/expect
  },
});