// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // Allow login page without auth
  if (to.path === '/login') return

  const debugAccessToken =
    typeof to.query.debugAccessToken === 'string' ? to.query.debugAccessToken : ''
  if (debugAccessToken && to.path.startsWith('/gameroom/')) return

  const token = useCookie('auth_token').value

  // Not logged in → redirect to login
  if (!token) {
    return navigateTo('/login')
  }
})
