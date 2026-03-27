// Suppress ECONNABORTED errors to prevent Nuxt dev server restarts
// This error occurs when the client aborts an HTTP connection mid-response
// during MongoDB hydration or game state reads

// Process-level handler - runs at module load time (before Nitro plugin)
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason: any) => {
    if (reason?.code === 'ECONNABORTED' || 
        (typeof reason === 'object' && reason?.message?.includes('ECONNABORTED'))) {
      console.warn('⚠️ ECONNABORTED rejected promise suppressed (client disconnected)')
      return
    }
    console.error('❌ unhandledRejection:', reason)
  })
  
  process.on('uncaughtException', (error: any) => {
    if (error?.code === 'ECONNABORTED' || 
        error?.message?.includes('ECONNABORTED')) {
      console.warn('⚠️ ECONNABORTED exception suppressed (client disconnected)')
      return
    }
    console.error('❌ uncaughtException:', error)
    process.exit(1)
  })
}

export default defineNitroPlugin((nitroApp) => {
  // Log that the error handler is active
  console.log('🛡️ Error handler: ECONNABORTED suppression active')
})
