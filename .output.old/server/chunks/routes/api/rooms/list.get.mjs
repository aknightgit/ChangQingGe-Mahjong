import { d as defineEventHandler, g as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { R as RoomService } from '../../../_/roomService.mjs';
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

const list_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const includePrivate = query.includePrivate === "true";
  try {
    const rooms = await RoomService.listAvailableRooms(includePrivate);
    return {
      success: true,
      data: { rooms }
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to list rooms"
    });
  }
});

export { list_get as default };
//# sourceMappingURL=list.get.mjs.map
