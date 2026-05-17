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

const testDelete_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId } = body;
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "userId is required"
      });
    }
    const users = await getCollection("users");
    const userToDelete = await users.findOne({ userId });
    if (!userToDelete) {
      throw createError({
        statusCode: 404,
        message: `User with userId ${userId} not found`
      });
    }
    const result = await users.deleteOne({ userId });
    const remainingCount = await users.countDocuments();
    return {
      success: true,
      deleted: result.deletedCount > 0,
      deletedCount: result.deletedCount,
      remainingUsers: remainingCount,
      deletedUser: {
        userId: userToDelete.userId,
        email: userToDelete.email,
        name: userToDelete.name
      },
      message: "User deleted successfully"
    };
  } catch (error) {
    console.error("Delete Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to delete user"
    });
  }
});

export { testDelete_post as default };
//# sourceMappingURL=test-delete.post.mjs.map
