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

const kickPlayer_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetPlayerId } = body;
  if (!gameId || !playerId || !targetPlayerId) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: "Game not found" });
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  if (!player.isDealer) {
    throw createError({ statusCode: 403, message: "Only the dealer can kick players" });
  }
  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target) throw createError({ statusCode: 404, message: "Target player not found" });
  if (!game.pendingRemovals) game.pendingRemovals = [];
  if (!game.pendingRemovals.includes(targetPlayerId)) {
    game.pendingRemovals.push(targetPlayerId);
  }
  return { success: true };
});

export { kickPlayer_post as default };
//# sourceMappingURL=kick-player.post.mjs.map
