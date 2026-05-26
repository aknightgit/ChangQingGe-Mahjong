/**
 * API Log Service — 全链路API请求日志，写入MongoDB
 * 记录每个请求的: endpoint, user, gameId, playerId, status, duration, error
 * 
 * 开关：环境变量 ENABLE_API_LOG=true 时启用，默认关闭。
 * 用法:
 *   import { apiLog, ApiLogLevel } from '../../utils/apiLogService'
 *   await apiLog(event, { endpoint: 'join', gameId, playerId, ... })
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:***@192.168.3.241:27017/changqingge?authSource=admin'
const MONGO_DB = process.env.MONGODB_DB || 'changqingge'
const LOG_COLLECTION = 'apiLogs'

// 开关：默认关闭。设置 ENABLE_API_LOG=true 启用
const IS_ENABLED = (process.env.ENABLE_API_LOG || '').toLowerCase() === 'true'

let _client: MongoClient | null = null
let _connected = false
let _connectError: string | null = null

async function getCollection() {
  if (!_client) {
    _client = new MongoClient(MONGO_URI, {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 5,
      minPoolSize: 1,
    })
  }
  if (!_connected) {
    try {
      await _client.connect()
      _connected = true
    } catch (e: any) {
      _connectError = e.message
      console.warn('[ApiLog] MongoDB connect failed:', e.message)
      return null
    }
  }
  try {
    return _client.db(MONGO_DB).collection(LOG_COLLECTION)
  } catch (e: any) {
    console.warn('[ApiLog] getCollection failed:', e.message)
    return null
  }
}

export interface ApiLogEntry {
  endpoint: string           // 'join' | 'state' | 'start' | 'action' | 'comeback' | 'my-games' | ...
  userId?: string
  userName?: string
  gameId?: string
  playerId?: string
  roomNumber?: string
  statusCode: number         // HTTP status code
  durationMs: number
  error?: string
  ip?: string
  userAgent?: string
  timestamp: Date
}

export async function apiLog(
  event: any,
  data: {
    endpoint: string
    gameId?: string
    playerId?: string
    roomNumber?: string
    statusCode: number
    durationMs: number
    error?: string
  }
): Promise<void> {
  // 开关关闭时直接跳过，零开销（无 try/catch）
  if (!IS_ENABLED) return
  try {
    const col = await getCollection()
    if (!col) return

    // 尝试从 event 获取用户信息
    let userId: string | undefined
    let userName: string | undefined
    try {
      const cookie = event?.headers?.cookie || ''
      // 从 cookie 中解析 user_id
      const match = cookie.match(/user_id=([^;]+)/)
      userId = match ? decodeURIComponent(match[1]) : undefined
    } catch {}

    const entry: ApiLogEntry = {
      endpoint: data.endpoint,
      userId,
      userName: undefined,
      gameId: data.gameId,
      playerId: data.playerId,
      roomNumber: data.roomNumber,
      statusCode: data.statusCode,
      durationMs: data.durationMs,
      error: data.error,
      timestamp: new Date(),
    }

    // 不要 blocking 请求
    col.insertOne(entry).catch((e: any) => {
      console.warn('[ApiLog] insert failed:', e.message)
    })
  } catch (e: any) {
    console.warn('[ApiLog] log failed:', e.message)
  }
}

/**
 * 查询API日志（按时间倒序）
 */
export async function queryApiLogs(options: {
  endpoint?: string
  gameId?: string
  playerId?: string
  userId?: string
  limit?: number
  skip?: number
  since?: Date
  onlyErrors?: boolean
} = {}): Promise<ApiLogEntry[]> {
  const col = await getCollection()
  if (!col) return []

  const filter: any = {}
  if (options.endpoint) filter.endpoint = options.endpoint
  if (options.gameId) filter.gameId = options.gameId
  if (options.playerId) filter.playerId = options.playerId
  if (options.userId) filter.userId = options.userId
  if (options.since) filter.timestamp = { $gte: options.since }
  if (options.onlyErrors) filter.error = { $exists: true, $ne: '' }

  return col
    .find(filter)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .toArray() as Promise<ApiLogEntry[]>
}

/**
 * 健康检查 — 检查 MongoDB 连接状态
 */
export function getApiLogStatus() {
  if (_connectError) return { connected: false, error: _connectError }
  return { connected: _connected, clientExists: !!_client }
}
