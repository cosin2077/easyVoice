import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
export default defineConfig({
  // css: {
  //   postcss: {
  //     plugins: [
  //       tailwindcss(), autoprefixer()
  //     ],
  //   },
  // },
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
    outDir: "../dist", // 输出到根目录 dist，与后端共享
  },
});