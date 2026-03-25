/**
 * Catch-all route for Socket.IO requests.
 * This prevents Vue Router from intercepting /socket.io/... requests.
 * The actual Socket.IO handling is done by the Socket.IO server attached to the HTTP server.
 */
export default defineEventHandler(() => {
  // Socket.IO handles this at the HTTP server level.
  // This route just prevents Vue Router from returning a 404 page.
  return null
})
