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

const create_post = defineEventHandler(async (event) => {
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
  const { name, isPrivate, password, allowSpectators } = body;
  if (!name) {
    throw createError({
      statusCode: 400,
      message: "Room name is required"
    });
  }
  try {
    const room = await RoomService.createRoom({
      ownerId: userId,
      name,
      isPrivate,
      password,
      allowSpectators
    });
    return {
      success: true,
      data: room
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to create room"
    });
  }
});

export { create_post as default };
//# sourceMappingURL=create.post.mjs.map
