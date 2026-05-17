import { d as defineEventHandler, e as getCookie, c as createError, A as AuthService, r as readBody, U as UserService } from '../../../nitro/nitro.mjs';
import { R as RoomService } from '../../../_/roomService.mjs';
import { G as GameService } from '../../../_/gameService.mjs';
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

const start_post = defineEventHandler(async (event) => {
  var _a;
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
  const { roomId } = body;
  if (!roomId) {
    throw createError({
      statusCode: 400,
      message: "Room ID is required"
    });
  }
  try {
    const room = await RoomService.getRoomById(roomId);
    if (!room) {
      throw createError({
        statusCode: 404,
        message: "Room not found"
      });
    }
    if (room.ownerId !== userId) {
      throw createError({
        statusCode: 403,
        message: "Only room owner can start the game"
      });
    }
    if (room.currentPlayers.length !== 4) {
      throw createError({
        statusCode: 400,
        message: "Need exactly 4 players to start"
      });
    }
    if (room.status !== "waiting") {
      throw createError({
        statusCode: 400,
        message: "Room has already started"
      });
    }
    const players = await Promise.all(
      room.currentPlayers.map(async (playerId) => {
        const user = await UserService.getUserById(playerId);
        return {
          userId: playerId,
          name: (user == null ? void 0 : user.name) || "Unknown"
        };
      })
    );
    const game = await GameService.createGame(
      roomId,
      players,
      (_a = room.settings.hesitationWindow) != null ? _a : 2e3
    );
    await RoomService.updateRoomStatus(roomId, "playing");
    return {
      success: true,
      data: {
        gameId: game.gameId,
        room: await RoomService.getRoomById(roomId)
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to start game"
    });
  }
});

export { start_post as default };
//# sourceMappingURL=start.post.mjs.map
