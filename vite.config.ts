import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 개발 시 /api 요청을 백엔드 서버로 프록시
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: path => path,
      },
    },
  },
})
