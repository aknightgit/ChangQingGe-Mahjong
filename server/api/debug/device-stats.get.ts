import { getCollection } from '../../utils/mongo'

/**
 * 设备性能统计 API — 对比不同手机接口响应速度
 * GET /api/debug/device-stats?endpoint=state&minutes=60
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const minutes = parseInt(query.minutes as string) || 60
  const endpointFilter = query.endpoint as string || undefined
  const since = new Date(Date.now() - minutes * 60 * 1000)

  if (!process.env.DEVICE_LOG) {
    return { success: false, message: 'DEVICE_LOG not enabled' }
  }

  const col = await getCollection('deviceTiming')
  if (!col) {
    return { success: false, message: 'Collection not found' }
  }

  // Build filter
  const filter: any = { timestamp: { $gte: since } }
  if (endpointFilter) filter.endpoint = { $regex: endpointFilter }

  // 聚合：按设备型号分组统计
  const stats = await col.aggregate([
    { $match: filter },
    { $group: {
      _id: { deviceModel: '$deviceModel', endpoint: '$endpoint' },
      count: { $sum: 1 },
      avgMs: { $avg: '$durationMs' },
      minMs: { $min: '$durationMs' },
      maxMs: { $max: '$durationMs' },
      p50: { $percentile: { p: [0.5], field: '$durationMs' } },
      p95: { $percentile: { p: [0.95], field: '$durationMs' } },
      p99: { $percentile: { p: [0.99], field: '$durationMs' } },
    }},
    { $sort: { '_id.endpoint': 1, '_id.deviceModel': 1 } },
    { $limit: 200 },
  ]).toArray()

  // 按设备汇总
  const deviceSummary = await col.aggregate([
    { $match: filter },
    { $group: {
      _id: '$deviceModel',
      count: { $sum: 1 },
      avgMs: { $avg: '$durationMs' },
      maxMs: { $max: '$durationMs' },
      p95: { $percentile: { p: [0.95], field: '$durationMs' } },
    }},
    { $sort: { avgMs: -1 } },
  ]).toArray()

  // 慢请求 TOP20
  const slowRequests = await col.find(filter)
    .sort({ durationMs: -1 })
    .limit(20)
    .project({ _id: 0, timestamp: 1, endpoint: 1, durationMs: 1, deviceModel: 1, method: 1, statusCode: 1 })
    .toArray()

  return {
    success: true,
    since: since.toISOString(),
    totalRequests: stats.reduce((a: number, s: any) => a + s.count, 0),
    byDevice: deviceSummary,
    byEndpointAndDevice: stats.map((s: any) => ({
      device: s._id.deviceModel,
      endpoint: s._id.endpoint,
      count: s.count,
      avgMs: Math.round(s.avgMs),
      minMs: Math.round(s.minMs),
      maxMs: Math.round(s.maxMs),
      p50Ms: Math.round((s.p50?.[0] || 0)),
      p95Ms: Math.round((s.p95?.[0] || 0)),
    })),
    slowest: slowRequests.map((r: any) => ({
      time: r.timestamp,
      endpoint: r.endpoint,
      ms: r.durationMs,
      device: r.deviceModel,
      status: r.statusCode,
    })),
  }
})
