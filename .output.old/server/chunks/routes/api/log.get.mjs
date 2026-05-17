import { d as defineEventHandler, I as formatBeijingDateTime } from '../../nitro/nitro.mjs';
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

const log_get = defineEventHandler((event) => {
  var _a, _b, _c;
  const req = (_a = event.node) == null ? void 0 : _a.req;
  const url = (_b = req == null ? void 0 : req.url) != null ? _b : "/";
  const method = (_c = req == null ? void 0 : req.method) != null ? _c : "GET";
  console.log(`[api/log] ${formatBeijingDateTime()} ${method} ${url}`);
  return { ok: true };
});

export { log_get as default };
//# sourceMappingURL=log.get.mjs.map
