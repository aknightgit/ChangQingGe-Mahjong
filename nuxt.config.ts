// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/mahjong/',
    head: {
      title: '长清阁麻将',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ]
    }
  },
  modules: [
    ['@nuxt/ui', {
      // 关键：关闭 @nuxt/ui 自动注入的 @nuxt/fonts（默认会拉 google/googleicons 元数据）
      fonts: false
    }]
  ],
  css: ['~/main.css'],
  // 双保险：即便有其它模块尝试走字体模块，也保持关闭
  fonts: false,
  icon: {
    provider: 'none'
  },
  nitro: {
    experimental: {
      websocket: true
    },
    // Ensure Socket.IO can access the HTTP server
    timing: false,
    // ⚠️ errorHandler 已移至 server/utils/errorHandler.ts（Nitro 自动发现）
  },
  // Socket.IO needs CORS for cross-origin dev
  vite: {
    server: {
      hmr: {
        overlay: false
      }
    }
  }
})
