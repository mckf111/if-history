import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径基座：本地与 GitHub Pages 子路径部署通吃
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
