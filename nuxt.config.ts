// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
    // 全局错误拦截：ECONNABORTED 不触发 Nuxt 重启
    errorHandler: (error, event) => {
      const code = (error as any)?.code
      if (code === 'ECONNABORTED' || (error as any)?.message?.includes('ECONNABORTED')) {
        console.warn('⚠️ [nitro.errorHandler] ECONNABORTED suppressed:', code)
        return
      }
      // 其他错误正常抛出
      console.error('[nitro.errorHandler]', error)
      throw error
    },
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
