import { d as defineEventHandler, r as readBody, c as createError, a as getCollection } from '../../nitro/nitro.mjs';
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

const testUpdate_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId, updates } = body;
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "userId is required"
      });
    }
    const users = await getCollection("users");
    const userBefore = await users.findOne({ userId });
    if (!userBefore) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      });
    }
    const updateData = {
      ...updates,
      lastLoginAt: /* @__PURE__ */ new Date()
      // Always update last login
    };
    delete updateData.userId;
    delete updateData._id;
    const result = await users.updateOne(
      { userId },
      { $set: updateData }
    );
    const userAfter = await users.findOne({ userId });
    return {
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      userId,
      before: userBefore,
      after: userAfter,
      message: "User updated successfully"
    };
  } catch (error) {
    console.error("Update Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to update user"
    });
  }
});

export { testUpdate_post as default };
//# sourceMappingURL=test-update.post.mjs.map
