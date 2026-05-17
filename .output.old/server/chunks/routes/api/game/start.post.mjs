import { d as defineEventHandler, r as readBody, t as apiLog, c as createError, n as gameManager, o as requireGamePlayerAccess, p as emitToRoom } from '../../../nitro/nitro.mjs';
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
  const body = await readBody(event);
  const { gameId, playerId, hesitationWindow, phaseOnly, dice } = body;
  const startTime = Date.now();
  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: "start", statusCode: 400, durationMs: Date.now() - startTime, error: "Game ID and player ID are required" });
    throw createError({ statusCode: 400, message: "Game ID and player ID are required" });
  }
  let game;
  try {
    game = await gameManager.getGame(gameId);
  } catch (err) {
    await apiLog(event, { endpoint: "start", gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: err.message || "Game not found" });
    throw createError({ statusCode: 404, message: err.message || "Game not found" });
  }
  if (!game) {
    await apiLog(event, { endpoint: "start", gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: "Game not found" });
    throw createError({ statusCode: 404, message: "Game not found" });
  }
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  const canAnyPlayerRestart = game.phase === "ended" || game.phase === "cha_jiao" || game.phase === "starting";
  if (!canAnyPlayerRestart && !player.isDealer) {
    await apiLog(event, { endpoint: "start", gameId, playerId, statusCode: 403, durationMs: Date.now() - startTime, error: "Only the dealer can start the game" });
    throw createError({ statusCode: 403, message: "Only the dealer can start the game" });
  }
  try {
    if (phaseOnly) {
      await gameManager.setStartingPhase(gameId);
      await apiLog(event, { endpoint: "start-phaseOnly", gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });
      return { success: true, phase: "starting" };
    }
    await gameManager.startGame(gameId, {
      hesitationWindow: hesitationWindow != null ? hesitationWindow : 5e3,
      fixedDice: Array.isArray(dice) && dice.length === 2 ? [Number(dice[0]) || 1, Number(dice[1]) || 1] : void 0
    });
    emitToRoom(gameId, "game:state-changed", {
      gameId,
      phase: "playing",
      source: "start"
    });
    await apiLog(event, { endpoint: "start", gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });
    return {
      success: true,
      message: "Game started"
    };
  } catch (error) {
    await apiLog(event, { endpoint: "start", gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || "Failed to start game" });
    throw createError({
      statusCode: 400,
      message: error.message || "Failed to start game"
    });
  }
});

export { start_post as default };
//# sourceMappingURL=start.post.mjs.map
