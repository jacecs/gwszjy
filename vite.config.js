import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
export default defineConfig(({ command }) => ({
  base: '/agriVisual/', // command === 'build' ? '/agriVisual/' : '/',
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
      },
      '/hualin-video': {
        target: 'https://hualin.xyune.com:8443',
        changeOrigin: true,
        secure: false, 
        rewrite: (path) => path.replace(/^\/hualin-video/, '') // 这里的正则也要同步改！
      }
    }
  },
  build: {
    target: 'esnext'
  }
}))
