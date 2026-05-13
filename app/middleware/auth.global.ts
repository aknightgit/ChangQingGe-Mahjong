// 注意：baseURL 为 /mahjong/，to.path 在服务端/客户端都包含 baseURL 前缀
const LOGIN_PATH = '/mahjong/login'
const JOIN_PATH = '/mahjong/join-game'
const CREATE_PATH = '/mahjong/create-room'
const RULES_PATH = '/mahjong/rules'
const HOME_PATH = '/mahjong/'
const ADMIN_PATH = '/mahjong/admin-test'
const ERROR_PATH = '/mahjong/__nuxt_error'

export default defineNuxtRouteMiddleware(async (to) => {
  // 登录页、错误页——直接放行
  if (to.path === LOGIN_PATH || to.path === ERROR_PATH) return

  const debugAccessToken =
    typeof to.query.debugAccessToken === 'string' ? to.query.debugAccessToken : ''
  if (debugAccessToken && to.path.startsWith('/mahjong/gameroom/')) return

  const authToken = useCookie('auth_token').value
  const userId = useCookie('user_id').value

  if (!authToken && !userId) {
    // 访客允许访问 gameroom 和 join-game（通过房间号/链接加入时不需要登录）
    if (to.path.startsWith('/mahjong/gameroom/') || to.path === JOIN_PATH) return
    return navigateTo(LOGIN_PATH)
  }

  // 有 cookie 但服务端验证可能因瞬时故障失败，不销毁 cookie
  // 让页面自己拉 API 重试，避免把已登录用户踢回登录页
  if (to.path.startsWith('/mahjong/gameroom/') || to.path.startsWith(JOIN_PATH) || to.path.startsWith(CREATE_PATH)) {
    return // 游戏房间/加入/创建页面不严格要求服务端验证
  }

  try {
    await $fetch('/mahjong/api/auth/me', {
      headers: process.server ? useRequestHeaders(['cookie']) : undefined,
      cache: 'no-cache'
    })
  } catch {
    useCookie('auth_token').value = null
    useCookie('user_id').value = null
    useCookie('user_name').value = null
    return navigateTo(LOGIN_PATH)
  }
})
