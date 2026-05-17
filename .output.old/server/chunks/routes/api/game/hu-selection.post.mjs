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

const huSelection_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, locked } = body;
  if (!gameId || !playerId || typeof locked !== "boolean") {
    throw createError({
      statusCode: 400,
      message: "Game ID, player ID, and locked flag are required"
    });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: "Game not found" });
  }
  await requireGamePlayerAccess(event, game, playerId);
  await gameManager.setHuSelectionLock(gameId, playerId, locked);
  return { success: true };
});

export { huSelection_post as default };
//# sourceMappingURL=hu-selection.post.mjs.map
