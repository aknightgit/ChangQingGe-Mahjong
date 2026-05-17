import { d as defineEventHandler, c as createError } from '../../../nitro/nitro.mjs';
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

const mockGoogleLogin_post = defineEventHandler(async (event) => {
  {
    throw createError({ statusCode: 404, message: "Not found" });
  }
});

export { mockGoogleLogin_post as default };
//# sourceMappingURL=mock-google-login.post.mjs.map
