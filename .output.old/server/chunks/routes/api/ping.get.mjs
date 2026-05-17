import { d as defineEventHandler, J as getDb } from '../../nitro/nitro.mjs';
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

const ping_get = defineEventHandler(async () => {
  const db = await getDb();
  const result = await db.command({ ping: 1 });
  return { ok: 1, mongo: result };
});

export { ping_get as default };
//# sourceMappingURL=ping.get.mjs.map
