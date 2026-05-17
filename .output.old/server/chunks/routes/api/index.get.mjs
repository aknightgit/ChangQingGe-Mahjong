import { d as defineEventHandler, K as resolveUserIdFromEvent, U as UserService, c as createError } from '../../nitro/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const userId = await resolveUserIdFromEvent(event);
  const user = await UserService.getUserById(userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found"
    });
  }
  return {
    success: true,
    data: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      address: (_a = user.address) != null ? _a : "",
      dateOfBirth: (_b = user.dateOfBirth) != null ? _b : "",
      gender: (_c = user.gender) != null ? _c : ""
    }
  };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
