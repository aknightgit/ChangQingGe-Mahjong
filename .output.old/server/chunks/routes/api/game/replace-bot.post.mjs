import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, t as apiLog } from '../../../nitro/nitro.mjs';
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

const replaceBot_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, spectatorId, targetBotId, playerName } = body;
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg;
  try {
    if (!gameId || !spectatorId || !targetBotId || !playerName) {
      statusCode = 400;
      errorMsg = "gameId, spectatorId, targetBotId, playerName are required";
      throw createError({ statusCode: 400, message: errorMsg });
    }
    gameManager.requestBotReplacement(gameId, spectatorId, targetBotId, playerName);
    await apiLog(event, {
      endpoint: "replace-bot",
      gameId,
      playerId: spectatorId,
      statusCode: 200,
      durationMs: Date.now() - startTime
    });
    return { success: true };
  } catch (error) {
    statusCode = error.statusCode || 400;
    errorMsg = error.message || "Failed to request bot replacement";
    await apiLog(event, {
      endpoint: "replace-bot",
      gameId,
      playerId: spectatorId,
      statusCode,
      durationMs: Date.now() - startTime,
      error: errorMsg
    });
    throw createError({ statusCode, message: errorMsg });
  }
});

export { replaceBot_post as default };
//# sourceMappingURL=replace-bot.post.mjs.map
