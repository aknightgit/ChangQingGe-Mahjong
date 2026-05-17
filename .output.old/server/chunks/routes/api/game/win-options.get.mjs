import { d as defineEventHandler, g as getQuery, c as createError, n as gameManager, o as requireGamePlayerAccess, D as getTileDisplayName } from '../../../nitro/nitro.mjs';
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

function buildDisplayLabel(option, winningTileName) {
  var _a, _b, _c, _d, _e, _f;
  const summary = (option == null ? void 0 : option.summary) || {};
  const baseFan = Number((_a = summary.baseFan) != null ? _a : 0);
  Number((_b = summary.roundMultiplier) != null ? _b : 1);
  const globalMultiplier = Number((_c = summary.globalMultiplier) != null ? _c : 1);
  const settlementMultiplier = Number((_d = summary.settlementMultiplier) != null ? _d : 1);
  const finalPoints = Number((_f = (_e = summary.finalPoints) != null ? _e : option == null ? void 0 : option.score) != null ? _f : 0);
  const details = Array.isArray(option == null ? void 0 : option.details) ? option.details : [];
  const label = String((option == null ? void 0 : option.label) || "").replace(/·自摸|·捉冲|\(无百搭×2\)/g, "").trim();
  const method = (option == null ? void 0 : option.type) === "self_draw" ? `\u81EA\u6478${winningTileName}` : `\u6349\u51B2${winningTileName}`;
  const factors = [`\u57FA\u7840\u756A${baseFan}`];
  if (details.some((detail) => detail.includes("\u95E8\u6E05"))) {
    factors.push("\u95E8\u6E052");
  }
  if (details.some((detail) => detail.includes("\u65E0\u767E\u642D"))) {
    factors.push("\u65E0\u767E\u642D*2");
  }
  factors.push(`\u5168\u5C40\u500D\u6570${globalMultiplier}`);
  factors.push(`\u7ED3\u7B97\u7CFB\u6570${settlementMultiplier}`);
  return `[${label}\uFF1A${method}\uFF08${factors.join("*")}\uFF09=${finalPoints}]`;
}
const winOptions_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query;
  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: "Game ID and player ID are required" });
  }
  try {
    const game = await gameManager.getGame(gameId);
    if (!game) throw createError({ statusCode: 404, message: "Game not found" });
    await requireGamePlayerAccess(event, game, playerId);
    const pendingAction = game.pendingActions.find((entry) => entry.playerId === playerId);
    const currentPlayer = game.players.find((entry) => entry.id === playerId);
    const lastDiscardAction = [...game.actionHistory || []].reverse().find(
      (a) => a.type === "discard" || a.type === "peng" || a.type === "kong"
    );
    const winningTile = (pendingAction == null ? void 0 : pendingAction.tile) || (currentPlayer == null ? void 0 : currentPlayer.lastDrawnTile) || (lastDiscardAction == null ? void 0 : lastDiscardAction.tile) || null;
    const winningTileName = winningTile ? getTileDisplayName(winningTile) : "";
    const filteredWinOptions = await gameManager.getWinOptionsForPlayer(gameId, playerId);
    const decoratedWinOptions = filteredWinOptions.map((option) => ({
      ...option,
      internalLabel: option.label,
      label: buildDisplayLabel(option, winningTileName)
    }));
    return { success: true, winOptions: decoratedWinOptions };
  } catch (error) {
    throw createError({ statusCode: 400, message: error.message || "Failed to get win options" });
  }
});

export { winOptions_get as default };
//# sourceMappingURL=win-options.get.mjs.map
