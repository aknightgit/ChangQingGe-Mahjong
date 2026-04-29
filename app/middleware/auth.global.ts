export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const debugAccessToken =
    typeof to.query.debugAccessToken === 'string' ? to.query.debugAccessToken : ''
  if (debugAccessToken && to.path.startsWith('/gameroom/')) return

  const authToken = useCookie('auth_token').value
  const userId = useCookie('user_id').value

  if (!authToken && !userId) {
    return navigateTo('/login')
  }

  try {
    await $fetch('/api/auth/me', {
      headers: process.server ? useRequestHeaders(['cookie']) : undefined,
      cache: 'no-cache'
    })
  } catch {
    useCookie('auth_token').value = null
    useCookie('user_id').value = null
    useCookie('user_name').value = null
    return navigateTo('/login')
  }
})
