import { initializeSocketIO } from '../utils/socket'
import type { Server as HTTPServer } from 'http'

let initialized = false

export default defineNitroPlugin((nitroApp) => {
  // Initialize Socket.IO as early as possible on first request
  nitroApp.hooks.hook('request', (event) => {
    if (initialized) return
    
    try {
      const req = event.node.req
      const rawSocket = req.socket as any
      
      if (rawSocket && rawSocket.server) {
        const server = rawSocket.server as HTTPServer
        initializeSocketIO(server)
        initialized = true
        console.log('✅ Socket.IO initialized on first request')
      }
    } catch (err) {
      console.error('❌ Socket.IO init failed:', err)
    }
  })
  
  // Also try to initialize on error (some Nitro versions expose server differently)
  nitroApp.hooks.hook('error', () => {
    if (initialized) return
    try {
      // Fallback: try globalThis
      const server = (globalThis as any).__nitro_server
      if (server) {
        initializeSocketIO(server)
        initialized = true
        console.log('✅ Socket.IO initialized via fallback')
      }
    } catch {}
  })
})
