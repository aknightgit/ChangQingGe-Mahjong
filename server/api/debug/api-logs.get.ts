/**
 * GET /api/debug/api-logs
 * 查询全链路API日志（需要管理员权限）
 */
import { queryApiLogs, getApiLogStatus } from '../../utils/apiLogService'
import { requireAdminUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const startTime = Date.now()

  // 需要管理员权限
  await requireAdminUser(event)

  const logs = await queryApiLogs({
    endpoint: query.endpoint ? String(query.endpoint) : undefined,
    gameId: query.gameId ? String(query.gameId) : undefined,
    playerId: query.playerId ? String(query.playerId) : undefined,
    limit: query.limit ? Math.min(Number(query.limit), 500) : 50,
    skip: query.skip ? Number(query.skip) : 0,
    onlyErrors: query.onlyErrors === 'true',
  })

  return {
    success: true,
    data: {
      logs,
      count: logs.length,
      dbStatus: getApiLogStatus(),
      queryDurationMs: Date.now() - startTime,
    }
  }
})
