import { d as defineEventHandler, g as getQuery, t as apiLog, c as createError, n as gameManager, o as requireGamePlayerAccess, x as canUseDebugBotSpectator, C as canRevealSpectatorTarget, T as TileSuit } from '../../../nitro/nitro.mjs';
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

function getEffectiveGlobalMultiplier(game) {
  var _a, _b, _c;
  const inherit = (_b = (_a = game.inheritMultiplier) != null ? _a : game.inheritedGlobalMultiplier) != null ? _b : 1;
  const round = (_c = game.roundMultiplier) != null ? _c : 1;
  return Math.min(inherit * round, 8);
}
function getCurrentRoundNumber(game) {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === "ended" ? Math.max(1, completedRounds) : completedRounds + 1;
}
function getSpectatorScope(game) {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === "ended" ? completedRounds : completedRounds + 1;
}
const state_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId, debugAccessToken } = query;
  const startTime = Date.now();
  if (!gameId || !playerId) {
    await apiLog(event, {
      endpoint: "state",
      statusCode: 400,
      durationMs: Date.now() - startTime,
      error: "Game ID and player ID are required"
    });
    throw createError({
      statusCode: 400,
      message: "Game ID and player ID are required"
    });
  }
  const normalizedGameId = gameId;
  const normalizedPlayerId = playerId;
  let game;
  try {
    game = await gameManager.getGame(normalizedGameId);
  } catch (err) {
    console.warn("\u26A0\uFE0F getGame failed:", err.message);
    game = void 0;
  }
  if (!game) {
    await apiLog(event, {
      endpoint: "state",
      gameId: normalizedGameId,
      playerId: normalizedPlayerId,
      statusCode: 404,
      durationMs: Date.now() - startTime,
      error: "Game not found"
    });
    throw createError({
      statusCode: 404,
      message: "Game not found"
    });
  }
  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === "true";
  const isDebugBypass = debugRoutesEnabled && typeof debugAccessToken === "string" && game.debugAccessToken === debugAccessToken;
  let access;
  try {
    access = isDebugBypass ? {
      player: game.players.find((entry) => entry.id === normalizedPlayerId || entry.userId === normalizedPlayerId),
      isAdmin: true
    } : await requireGamePlayerAccess(event, game, normalizedPlayerId, { allowAdmin: true });
  } catch (err) {
    const fallbackPlayer = game.players.find(
      (entry) => entry.id === normalizedPlayerId || entry.userId === normalizedPlayerId
    );
    if (fallbackPlayer && (err.statusCode === 401 || err.statusCode === 403)) {
      access = { player: fallbackPlayer, isAdmin: false };
      console.log("[state.get] Guest access granted for player:", fallbackPlayer.name);
    } else {
      await apiLog(event, {
        endpoint: "state",
        gameId: normalizedGameId,
        playerId: normalizedPlayerId,
        statusCode: err.statusCode || 403,
        durationMs: Date.now() - startTime,
        error: err.message || "Access denied"
      });
      throw err;
    }
  }
  if (!access.player) {
    await apiLog(event, {
      endpoint: "state",
      gameId: normalizedGameId,
      playerId: normalizedPlayerId,
      statusCode: 404,
      durationMs: Date.now() - startTime,
      error: "Player not found"
    });
    throw createError({
      statusCode: 404,
      message: "Player not found"
    });
  }
  const { player, isAdmin } = access;
  let availableActions = [];
  try {
    availableActions = await gameManager.getAvailableActions(normalizedGameId, normalizedPlayerId);
  } catch (err) {
    console.warn("\u26A0\uFE0F getAvailableActions failed:", err.message);
    availableActions = [];
  }
  const bailoutRelations = gameManager.getMutualBailoutRelations(normalizedGameId);
  game.bailoutRelations = bailoutRelations;
  const maskedPlayers = game.players.map((p) => {
    var _a, _b, _c, _d, _e;
    const hasDebugSpectatorLock = !!player && !!((_a = game.spectatorViews) == null ? void 0 : _a[normalizedPlayerId]) && ((_c = (_b = game.spectatorViews) == null ? void 0 : _b[normalizedPlayerId]) == null ? void 0 : _c.roundNumber) === getSpectatorScope(game) && ((_e = (_d = game.spectatorViews) == null ? void 0 : _d[normalizedPlayerId]) == null ? void 0 : _e.viewingPlayerId) === p.id && canUseDebugBotSpectator(player, p);
    const shouldReveal = isAdmin || p.id === normalizedPlayerId || canRevealSpectatorTarget(game, normalizedPlayerId, p) || hasDebugSpectatorLock;
    return {
      ...p,
      hand: {
        ...p.hand,
        concealedTiles: shouldReveal ? p.hand.concealedTiles : p.hand.concealedTiles.map((_, index) => ({
          id: `hidden-${p.id}-${index}`,
          suit: TileSuit.CHARACTERS,
          value: 0
        }))
      }
    };
  });
  let tingPreview = { isTing: false, winningTiles: [] };
  if (query.tingPreview === "true") {
    try {
      tingPreview = await gameManager.getTingPreviewForPlayer(normalizedGameId, normalizedPlayerId);
    } catch (err) {
      console.warn("getTingPreviewForPlayer failed:", err.message);
    }
  }
  player.isDealer;
  await apiLog(event, {
    endpoint: "state",
    gameId: normalizedGameId,
    playerId: normalizedPlayerId,
    statusCode: 200,
    durationMs: Date.now() - startTime
  });
  return {
    success: true,
    data: {
      game: {
        ...game,
        currentRound: getCurrentRoundNumber(game),
        globalMultiplier: getEffectiveGlobalMultiplier(game),
        players: maskedPlayers
      },
      playerView: player.hand,
      availableActions,
      // [Fix] Only return tingPreview when explicitly requested, otherwise omit
      // so the frontend can distinguish "not requested" from "not ting"
      ...query.tingPreview === "true" ? { tingPreview } : {}
    }
  };
});

export { state_get as default };
//# sourceMappingURL=state.get.mjs.map
