import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, o as requireGamePlayerAccess } from '../../../nitro/nitro.mjs';
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

const comeback_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;
  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: "Game ID and Player ID are required"
    });
  }
  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: "Game not found" });
    }
    await requireGamePlayerAccess(event, game, playerId);
    gameManager.disableBotMode(playerId);
    if (game) {
      await gameManager.persistGame(game);
      gameManager.broadcastGameState(gameId);
    }
    return {
      success: true,
      message: "\u5DF2\u56DE\u5230\u724C\u684C"
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "\u64CD\u4F5C\u5931\u8D25"
    });
  }
});

export { comeback_post as default };
//# sourceMappingURL=comeback.post.mjs.map
