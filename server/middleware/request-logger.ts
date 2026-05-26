import { defineEventHandler } from 'h3'
import { formatBeijingDateTime } from '../utils/beijingTime'
import { getCollection } from '../utils/mongo'

/**
 * 设备性能日志中间件 — 记录每个请求的耗时、设备信息、接口
 * 写入 MongoDB deviceTiming 集合，用于对比不同手机的响应差异
 *
 * 启用：设置环境变量 DEVICE_LOG=true
 */

const IS_ENABLED = (process.env.DEVICE_LOG || '').toLowerCase() === 'true'

// 快速设备识别
function identifyDevice(ua: string): { model: string; brand: string } {
  if (!ua) return { model: 'unknown', brand: 'unknown' }

  const lower = ua.toLowerCase()

  if (lower.includes('23116pn5bc')) {
    return { model: 'Xiaomi 17 Ultra', brand: 'Xiaomi' }
  }
  if (lower.includes('23113rk66c')) {
    return { model: 'Xiaomi 14 Pro', brand: 'Xiaomi' }
  }

  // 通用 Android 识别
  const andMatch = lower.match(/android\s+(\d+)/)
  const androidVer = andMatch ? andMatch[1] : '?'

  if (lower.includes('xiaomi') || lower.includes('mi ') || lower.includes('redmi')) {
    return { model: `Xiaomi(Android${androidVer})`, brand: 'Xiaomi' }
  }
  if (lower.includes('iphone') || lower.includes('ipad')) {
    return { model: 'iOS Device', brand: 'Apple' }
  }

  return { model: `Unknown(${androidVer})`, brand: 'Unknown' }
}

export default defineEventHandler(async (event) => {
  if (!IS_ENABLED) return

  const startTime = Date.now()
  const req = (event.node as any)?.req
  const url = req?.url ?? '/'
  const method = req?.method ?? 'GET'
  const ua = req?.headers?.['user-agent'] || req?.headers?.['User-Agent'] || ''
  const device = identifyDevice(ua)

  // 从 Cookie 提取 userId
  const cookieStr = req?.headers?.cookie || ''
  const userIdMatch = cookieStr.match(/user_id=([^;]+)/)
  const userId = userIdMatch ? decodeURIComponent(userIdMatch[1]) : undefined

  // 从 URL 提取 gameId / playerId
  let gameId: string | undefined
  let playerId: string | undefined
  try {
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : null
    gameId = qs?.get('gameId') || undefined
    playerId = qs?.get('playerId') || undefined
  } catch {}

  // 响应完成时记录
  const res = (event.node as any)?.res
  if (res) {
    const origEnd = res.end.bind(res)
    // @ts-ignore
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime

      // 异步写入 MongoDB
      const entry = {
        timestamp: new Date(),
        method,
        endpoint: url.split('?')[0],
        statusCode: res.statusCode || 200,
        durationMs: duration,
        userAgent: ua,
        deviceModel: device.model,
        deviceBrand: device.brand,
        userId,
        gameId,
        playerId,
      }

      getCollection('deviceTiming').then((col) => {
        if (col) {
          col.insertOne(entry).catch(() => {})
        }
      }).catch(() => {})

      // 仅在慢请求时 console
      if (duration > 500) {
        console.log(`[SLOW] ${formatBeijingDateTime()} ${method} ${url} ${duration}ms [${device.model}]`)
      }

      return origEnd(...args)
    }
  }
})
