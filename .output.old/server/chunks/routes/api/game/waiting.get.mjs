import { d as defineEventHandler, n as gameManager, t as apiLog, c as createError } from '../../../nitro/nitro.mjs';
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

const waiting_get = defineEventHandler(async (event) => {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg;
  try {
    const games = await gameManager.listGames();
    const now = Date.now();
    const INACTIVE_TIMEOUT_MS = 30 * 60 * 1e3;
    const activeGames = (games || []).filter((game) => {
      const phase = game.phase || "";
      if (phase === "ended" || phase === "playing") return false;
      const lastActive = game.lastActionTime || game.createdAt || 0;
      if (now - lastActive > INACTIVE_TIMEOUT_MS) {
        console.log(`[waiting] Filtering out inactive room ${game.roomNumber || game.gameId}: lastActive ${new Date(lastActive).toISOString()}`);
        return false;
      }
      return true;
    });
    await apiLog(event, {
      endpoint: "waiting",
      statusCode: 200,
      durationMs: Date.now() - startTime
    });
    return {
      success: true,
      data: { games: activeGames }
    };
  } catch (error) {
    statusCode = 500;
    errorMsg = error.message || "Internal server error";
    await apiLog(event, {
      endpoint: "waiting",
      statusCode,
      durationMs: Date.now() - startTime,
      error: errorMsg
    });
    throw createError({ statusCode, message: errorMsg });
  }
});

export { waiting_get as default };
//# sourceMappingURL=waiting.get.mjs.map
