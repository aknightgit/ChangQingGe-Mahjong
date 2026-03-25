// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/main.css'],
  // Disable Google Fonts/Icons to avoid 30s+ timeout on startup
  icon: {
    provider: 'none'
  },
  hooks: {
    'fonts:providers' (providers: any) {
      delete providers.google
      delete providers.googleicons
    }
  },
  nitro: {
    experimental: {
      websocket: true
    },
    // Ensure Socket.IO can access the HTTP server
    timing: false,
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
