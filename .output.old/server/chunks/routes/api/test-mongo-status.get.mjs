import { d as defineEventHandler, J as getDb, a as getCollection } from '../../nitro/nitro.mjs';
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

const testMongoStatus_get = defineEventHandler(async (event) => {
  try {
    const db = await getDb();
    const admin = db.admin();
    const serverStatus = await admin.serverStatus();
    const collections = await db.listCollections().toArray();
    const users = await getCollection("users");
    const userCount = await users.countDocuments();
    const allUsers = await users.find({}).toArray();
    return {
      success: true,
      mongodb: {
        connected: true,
        version: serverStatus.version,
        database: db.databaseName
      },
      collections: collections.map((c) => c.name),
      users: {
        count: userCount,
        data: allUsers
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});

export { testMongoStatus_get as default };
//# sourceMappingURL=test-mongo-status.get.mjs.map
