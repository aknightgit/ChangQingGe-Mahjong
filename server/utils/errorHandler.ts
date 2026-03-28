// server/utils/errorHandler.ts
// Nitro 全局错误拦截：ECONNABORTED 不触发 Nuxt 重启
export default defineNitroErrorHandler((error, event) => {
  const code = (error as any)?.code
  if (code === 'ECONNABORTED' || (error as any)?.message?.includes('ECONNABORTED')) {
    console.warn('⚠️ [nitro.errorHandler] ECONNABORTED suppressed:', code)
    return
  }
  console.error('[nitro.errorHandler]', error)
  throw error
})
