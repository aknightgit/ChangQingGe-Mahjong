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

const replacePlayer_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetPlayerId } = body;
  if (!gameId || !playerId || !targetPlayerId) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: "Game not found" });
  await requireGamePlayerAccess(event, game, playerId);
  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target) throw createError({ statusCode: 404, message: "Target player not found" });
  const spectatorName = body.spectatorName || "\u66FF\u8865\u73A9\u5BB6";
  if (!game.pendingReplacements) game.pendingReplacements = [];
  game.pendingReplacements = game.pendingReplacements.filter((r) => r.aiPlayerId !== targetPlayerId);
  game.pendingReplacements.push({
    spectatorId: playerId,
    aiPlayerId: targetPlayerId,
    spectatorName
  });
  return { success: true };
});

export { replacePlayer_post as default };
//# sourceMappingURL=replace-player.post.mjs.map
