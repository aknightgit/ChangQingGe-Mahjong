import { d as defineEventHandler, a as getCollection, c as createError } from '../../nitro/nitro.mjs';
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

const testUsers_get = defineEventHandler(async (event) => {
  try {
    const users = await getCollection("users");
    const allUsers = await users.find({}).toArray();
    return {
      success: true,
      count: allUsers.length,
      users: allUsers.map((user) => {
        var _a;
        return {
          userId: user.userId,
          email: user.email,
          name: user.name,
          oauthProvider: user.oauthProvider,
          isAdmin: (_a = user.isAdmin) != null ? _a : false,
          createdAt: user.createdAt,
          stats: user.stats
        };
      })
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch users"
    });
  }
});

export { testUsers_get as default };
//# sourceMappingURL=test-users.get.mjs.map
