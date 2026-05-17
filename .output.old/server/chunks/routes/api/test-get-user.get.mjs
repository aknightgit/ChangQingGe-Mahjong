import { d as defineEventHandler, g as getQuery, c as createError, a as getCollection } from '../../nitro/nitro.mjs';
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

const testGetUser_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { userId } = query;
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "userId query parameter is required"
      });
    }
    const users = await getCollection("users");
    const user = await users.findOne({ userId });
    if (!user) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      });
    }
    return {
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        oauthProvider: user.oauthProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: user.stats
      }
    };
  } catch (error) {
    console.error("Get User Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to get user"
    });
  }
});

export { testGetUser_get as default };
//# sourceMappingURL=test-get-user.get.mjs.map
