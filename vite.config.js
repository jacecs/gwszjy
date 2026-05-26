import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/iotservice': {
        target: 'http://182.40.36.93:8900',
        changeOrigin: true
      },
      '/api': {
        target: 'http://110.42.225.206:8280',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext'
  }
})
