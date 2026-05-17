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

const swapPosition_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetId } = body;
  if (!gameId || !playerId || !targetId) {
    throw createError({ statusCode: 400, message: "Game ID, player ID, and target ID are required" });
  }
  if (playerId === targetId) {
    throw createError({ statusCode: 400, message: "Cannot swap with yourself" });
  }
  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: "Game not found" });
    }
    await requireGamePlayerAccess(event, game, playerId);
    const result = gameManager.requestSwapPosition(gameId, playerId, targetId);
    return { success: true, data: result };
  } catch (error) {
    throw createError({ statusCode: 400, message: error.message || "Swap request failed" });
  }
});

export { swapPosition_post as default };
//# sourceMappingURL=swap-position.post.mjs.map
