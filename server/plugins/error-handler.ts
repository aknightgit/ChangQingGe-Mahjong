// Suppress ECONNABORTED / EPIPE / ECONNRESET errors to prevent Nuxt dev server restarts
// These errors occur when the client aborts an HTTP connection mid-response
const SUPPRESS_CODES = new Set(['ECONNABORTED', 'EPIPE', 'ECONNRESET', 'ECANCELED'])

function shouldSuppress(err: any): boolean {
  if (!err) return false
  if (SUPPRESS_CODES.has(err.code)) return true
  if (typeof err.message === 'string' && [...SUPPRESS_CODES].some(c => err.message.includes(c))) return true
  if (err.cause) return shouldSuppress(err.cause)
  return false
}

if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: any) => {
    if (shouldSuppress(reason)) {
      console.warn('⚠️ Suppressed:', reason?.code || reason?.message?.slice(0, 60))
      return
    }
    console.error('❌ unhandledRejection:', reason)
  })

  process.on('uncaughtException', (error: any) => {
    if (shouldSuppress(error)) {
      console.warn('⚠️ Suppressed:', error?.code || error?.message?.slice(0, 60))
      return
    }
    console.error('❌ uncaughtException:', error)
    process.exit(1)
  })
}

export default defineNitroPlugin((nitroApp) => {
  console.log('🛡️ Error handler active (suppressing ECONNABORTED/EPIPE/ECONNRESET)')
})
