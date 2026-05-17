import { d as defineEventHandler, e as getCookie, c as createError, A as AuthService, E as getRouterParam } from '../../../nitro/nitro.mjs';
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

const _id__get = defineEventHandler(async (event) => {
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
  const gameId = getRouterParam(event, "id");
  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: "Game ID is required"
    });
  }
  try {
    const game = await GameService.getGameById(gameId);
    if (!game) {
      throw createError({
        statusCode: 404,
        message: "Game not found"
      });
    }
    const isPlayer = game.players.some((p) => p.userId === userId);
    if (!isPlayer) {
      throw createError({
        statusCode: 403,
        message: "Not a player in this game"
      });
    }
    const sanitizedGame = {
      ...game,
      players: game.players.map((p) => ({
        ...p,
        hand: {
          ...p.hand,
          concealedTiles: p.userId === userId ? p.hand.concealedTiles : []
        }
      })),
      wall: []
      // Don't send wall tiles to client
    };
    return {
      success: true,
      data: sanitizedGame
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to get game"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
