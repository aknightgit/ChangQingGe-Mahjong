// Suppress ECONNABORTED / EPIPE / ECONNRESET errors to prevent Nuxt dev server restarts
const SUPPRESS_CODES = new Set(['ECONNABORTED', 'EPIPE', 'ECONNRESET', 'ECANCELED'])

function shouldSuppress(err: any): boolean {
  if (!err) return false
  if (SUPPRESS_CODES.has(err?.code)) return true
  if (typeof err?.message === 'string' && [...SUPPRESS_CODES].some(c => err.message.includes(c))) return true
  if (typeof err?.stack === 'string' && [...SUPPRESS_CODES].some(c => err.stack.includes(c))) return true
  if (Array.isArray(err?.errors) && err.errors.some((inner: any) => shouldSuppress(inner))) return true
  if (err?.error && shouldSuppress(err.error)) return true
  if (err?.data && shouldSuppress(err.data)) return true
  if (err?.reason && shouldSuppress(err.reason)) return true
  if (err?.cause) return shouldSuppress(err.cause)
  return false
}

// Process-level handlers — 必须在模块加载最早期执行
process.on('unhandledRejection', (reason: any) => {
  if (shouldSuppress(reason)) {
    console.warn('⚠️ Suppressed rejection:', reason?.code || String(reason?.message || reason).slice(0, 60))
    return
  }
  console.error('❌ unhandledRejection:', reason)
})

process.on('uncaughtException', (error: any) => {
  if (shouldSuppress(error)) {
    console.warn('⚠️ Suppressed exception:', error?.code || String(error?.message || error).slice(0, 60))
    return
  }
  console.error('❌ uncaughtException:', error)
  // 不 exit，让 Nuxt 继续运行
})

export default defineNitroPlugin(() => {
  console.log('🛡️ Error handler active')
})
