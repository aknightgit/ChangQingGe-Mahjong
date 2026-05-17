import { d as defineEventHandler, g as getQuery, k as requireAdminUser, q as queryApiLogs, l as getApiLogStatus } from '../../../nitro/nitro.mjs';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'socket.io';
import '@socket.io/redis-adapter';
import 'redis';
import 'fs';
import 'path';
import 'node:url';
import '@iconify/utils';
import 'consola';

const apiLogs_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const startTime = Date.now();
  await requireAdminUser(event);
  const logs = await queryApiLogs({
    endpoint: query.endpoint ? String(query.endpoint) : void 0,
    gameId: query.gameId ? String(query.gameId) : void 0,
    playerId: query.playerId ? String(query.playerId) : void 0,
    limit: query.limit ? Math.min(Number(query.limit), 500) : 50,
    skip: query.skip ? Number(query.skip) : 0,
    onlyErrors: query.onlyErrors === "true"
  });
  return {
    success: true,
    data: {
      logs,
      count: logs.length,
      dbStatus: getApiLogStatus(),
      queryDurationMs: Date.now() - startTime
    }
  };
});

export { apiLogs_get as default };
//# sourceMappingURL=api-logs.get.mjs.map
