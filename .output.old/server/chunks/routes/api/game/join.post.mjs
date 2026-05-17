import { d as defineEventHandler, r as readBody, i as resolveUserFromEvent, c as createError, n as gameManager, o as requireGamePlayerAccess, t as apiLog } from '../../../nitro/nitro.mjs';
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

const join_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  let { gameId, playerName } = body;
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg;
  let user = null;
  try {
    user = await resolveUserFromEvent(event);
  } catch {
    user = {
      name: playerName || "Guest",
      userId: void 0
    };
  }
  try {
    if (!gameId || !playerName) {
      statusCode = 400;
      errorMsg = "Game ID and player name are required";
      throw createError({ statusCode: 400, message: errorMsg });
    }
    if (/^\d{4}$/.test(gameId)) {
      const foundGameId = await gameManager.findGameByRoomNumber(gameId);
      if (foundGameId) {
        gameId = foundGameId;
      } else {
        statusCode = 404;
        errorMsg = `\u623F\u95F4\u53F7 ${gameId} \u4E0D\u5B58\u5728\u6216\u5DF2\u7ED3\u675F`;
        throw createError({ statusCode: 404, message: errorMsg });
      }
    }
    try {
      const isBotJoin = typeof playerName === "string" && (playerName.startsWith("AI-") || playerName.startsWith("\u7535\u8111"));
      if (isBotJoin) {
        const game = await gameManager.getGame(gameId);
        if (!game) {
          statusCode = 404;
          errorMsg = "Game not found";
          throw createError({ statusCode: 404, message: errorMsg });
        }
        const ownerPlayerId = body.ownerPlayerId || ((_a = game.players.find((entry) => entry.userId === user.userId)) == null ? void 0 : _a.id);
        if (!ownerPlayerId) {
          statusCode = 403;
          errorMsg = "Only game participants can add bots";
          throw createError({ statusCode: 403, message: errorMsg });
        }
        await requireGamePlayerAccess(event, game, ownerPlayerId);
        const result2 = await gameManager.joinGame(gameId, playerName);
        await apiLog(event, {
          endpoint: "join-bot",
          gameId,
          playerId: result2.playerId,
          statusCode: 200,
          durationMs: Date.now() - startTime
        });
        return {
          success: true,
          data: { ...result2, gameId }
        };
      }
      const result = await gameManager.joinGame(gameId, user.name, { userId: user.userId });
      await apiLog(event, {
        endpoint: "join",
        gameId,
        playerId: result.playerId,
        statusCode: 200,
        durationMs: Date.now() - startTime
      });
      return {
        success: true,
        data: { ...result, gameId }
      };
    } catch (error) {
      statusCode = 400;
      errorMsg = error.message || "Failed to join game";
      const rawGameId = (body == null ? void 0 : body.gameId) || gameId;
      await apiLog(event, {
        endpoint: "join",
        gameId: rawGameId,
        statusCode,
        durationMs: Date.now() - startTime,
        error: errorMsg
      });
      throw createError({ statusCode: 400, message: errorMsg });
    }
  } catch (error) {
    await apiLog(event, {
      endpoint: "join",
      gameId: (body == null ? void 0 : body.gameId) || gameId,
      statusCode: error.statusCode || 500,
      durationMs: Date.now() - startTime,
      error: error.message || errorMsg
    });
    throw error;
  }
});

export { join_post as default };
//# sourceMappingURL=join.post.mjs.map
