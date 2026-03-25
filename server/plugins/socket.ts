import { initializeSocketIO } from '../utils/socket'
import type { Server as HTTPServer } from 'http'

let initialized = false

export default defineNitroPlugin((nitroApp) => {
  // Initialize Socket.IO on first request (any request)
  nitroApp.hooks.hook('request', (event) => {
    if (initialized) return
    try {
      const req = event.node.req
      const rawSocket = req.socket as any
      if (rawSocket && rawSocket.server) {
        initializeSocketIO(rawSocket.server as HTTPServer)
        initialized = true
        console.log('✅ Socket.IO initialized from Nitro plugin')
      }
    } catch (err) {
      console.error('❌ Socket.IO init failed:', err)
    }
  })
})
