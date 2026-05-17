import { d as defineEventHandler, J as getDb, a as getCollection, c as createError } from '../../nitro/nitro.mjs';
import { randomUUID } from 'crypto';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
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

const testInsert_post = defineEventHandler(async (event) => {
  try {
    const db = await getDb();
    const dbName = db.databaseName;
    const users = await getCollection("users");
    const testUser = {
      userId: randomUUID(),
      email: `test-${Date.now()}@example.com`,
      // Unique email each time
      name: "Test User 2",
      avatar: "https://ui-avatars.com/api/?name=Test+User",
      oauthProvider: "local",
      isAdmin: false,
      createdAt: /* @__PURE__ */ new Date(),
      lastLoginAt: /* @__PURE__ */ new Date(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestFan: 0,
        winRate: 0
      }
    };
    const result = await users.insertOne(testUser);
    const insertedUser = await users.findOne({ _id: result.insertedId });
    const totalCount = await users.countDocuments();
    return {
      success: true,
      insertedId: result.insertedId.toString(),
      userId: testUser.userId,
      database: dbName,
      collection: "users",
      totalUsersInDB: totalCount,
      verifiedInsertion: insertedUser !== null,
      insertedUser,
      message: "User inserted successfully",
      instructions: `Check MongoDB Compass:
1. Database: "${dbName}"
2. Collection: "users"
3. Document count should be: ${totalCount}`
    };
  } catch (error) {
    console.error("MongoDB Insert Error:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to insert user",
      stack: error.stack
    });
  }
});

export { testInsert_post as default };
//# sourceMappingURL=test-insert.post.mjs.map
