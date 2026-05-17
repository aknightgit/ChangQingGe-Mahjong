import { d as defineEventHandler, e as getCookie, c as createError, A as AuthService, r as readBody } from '../../../nitro/nitro.mjs';
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

const join_post = defineEventHandler(async (event) => {
  const token = getCookie(event, "mahjong_session");
  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Not authenticated"
    });
  }
  const userId = await AuthService.validateSession(token);
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: "Invalid session"
    });
  }
  const body = await readBody(event);
  const { roomId, password } = body;
  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: "Room ID is required"
    });
  }
  try {
    const room = await RoomService.joinRoom(roomId, userId, password);
    return {
      success: true,
      data: room
    };
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error.message || "Failed to join room"
    });
  }
});

export { join_post as default };
//# sourceMappingURL=join.post.mjs.map
