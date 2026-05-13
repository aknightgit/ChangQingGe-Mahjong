export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const debugAccessToken =
    typeof to.query.debugAccessToken === 'string' ? to.query.debugAccessToken : ''
  if (debugAccessToken && to.path.startsWith('/gameroom/')) return

  const authToken = useCookie('auth_token').value
  const userId = useCookie('user_id').value

  if (!authToken && !userId) {
    // 访客允许访问 gameroom 和 join-game（通过房间号/链接加入时不需要登录）
    if (to.path.startsWith('/gameroom/') || to.path === '/join-game') return
    return navigateTo('/login')
  }

  // 有 cookie 但服务端验证可能因瞬时故障失败，不销毁 cookie
  // 让页面自己拉 API 重试，避免把已登录用户踢回登录页
  if (to.path.startsWith('/gameroom/') || to.path.startsWith('/join-game') || to.path.startsWith('/create-room')) {
    return // 游戏房间/加入/创建页面不严格要求服务端验证
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
