import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/** GitHub project site: https://<user>.github.io/NimiqLens/ */
const githubPagesBase = process.env.GITHUB_PAGES === 'true' ? '/NimiqLens/' : undefined

export default defineConfig({
  base: githubPagesBase,
  plugins: [vue(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
