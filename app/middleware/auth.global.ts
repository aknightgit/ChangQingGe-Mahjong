// 全局 auth middleware
// 路径匹配兼容 baseURL = / 和 baseURL = /mahjong/ 两种场景
// 已知 Nuxt 4 server-side navigateTo 有 baseURL 叠加 bug，手动拼接 redirect URL

const BASE_PREFIX = "/mahjong"
const LOGIN_PATH = BASE_PREFIX + "/login"
const JOIN_PATH = "/join-game"
const CREATE_PATH = "/create-room"
const HOME_PATH = "/"
const ERROR_PATH = "/__nuxt_error"

export default defineNuxtRouteMiddleware(async (to) => {
  // Normalize: 剥掉 baseURL 前缀，适配服务端（带前缀）和客户端（无前缀）
  const rawPath = to.path
  const p = rawPath.startsWith(BASE_PREFIX) ? rawPath.replace(BASE_PREFIX, "") || "/" : rawPath

  // ============ 允许直接放行的路径 ============
  if (p === "/login" || p === ERROR_PATH) return

  const debugAccessToken =
    typeof to.query.debugAccessToken === "string" ? to.query.debugAccessToken : ""
  if (debugAccessToken && p.startsWith("/gameroom/")) return

  const authToken = useCookie("auth_token").value
  const userId = useCookie("user_id").value

  // ============ 无 cookie 访客 ============
  if (!authToken && !userId) {
    if (p.startsWith("/gameroom/") || p === JOIN_PATH) return
    return navigateTo(LOGIN_PATH, { external: true })
  }

  // ============ 有 cookie ============
  if (p.startsWith("/gameroom/") || p.startsWith(JOIN_PATH) || p.startsWith(CREATE_PATH)) {
    return
  }

  try {
    await $fetch(BASE_PREFIX + "/api/auth/me", {
      headers: process.server ? useRequestHeaders(["cookie"]) : undefined,
      cache: "no-cache"
    })
  } catch {
    useCookie("auth_token").value = null
    useCookie("user_id").value = null
    useCookie("user_name").value = null
    return navigateTo(LOGIN_PATH, { external: true })
  }
})
