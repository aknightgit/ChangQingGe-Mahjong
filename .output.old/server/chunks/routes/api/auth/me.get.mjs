import { d as defineEventHandler, i as resolveUserFromEvent, c as createError } from '../../../nitro/nitro.mjs';
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

const me_get = defineEventHandler(async (event) => {
  var _a;
  try {
    const user = await resolveUserFromEvent(event);
    return {
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: (_a = user.isAdmin) != null ? _a : false
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to get user"
    });
  }
});

export { me_get as default };
//# sourceMappingURL=me.get.mjs.map
