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
  css: {
    preprocessorOptions: {
      less: {
        // shared breakpoints (@bp-phone, @bp-touch, ...) available in every less block
        additionalData: `@import "@/styles/breakpoints.less";\n`,
      },
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
    globals: true,
  },
});