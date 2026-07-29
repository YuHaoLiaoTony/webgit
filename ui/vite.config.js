import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: '.',
  plugins: [vue()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
  },
})
