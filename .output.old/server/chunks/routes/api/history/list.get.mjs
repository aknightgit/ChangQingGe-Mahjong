import { d as defineEventHandler, g as getQuery, M as MatchHistoryService } from '../../../nitro/nitro.mjs';
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

const list_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = typeof query.userId === "string" ? query.userId : void 0;
  const playerId = typeof query.playerId === "string" ? query.playerId : void 0;
  const limitParam = typeof query.limit === "string" ? parseInt(query.limit, 10) : void 0;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;
  const histories = await MatchHistoryService.listMatches({ userId, playerId, limit });
  return {
    success: true,
    data: histories
  };
});

export { list_get as default };
//# sourceMappingURL=list.get.mjs.map
