import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, o as requireGamePlayerAccess, G as GamePhase, w as getSpectatorView, P as PlayerStatus, x as canUseDebugBotSpectator, y as isSpectatorTargetWatchable, z as isBotPlayer, B as clearPendingSpectatorRequests } from '../../../nitro/nitro.mjs';
import { randomUUID } from 'crypto';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
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

function getSpectatorScope(game) {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === GamePhase.ENDED ? completedRounds : completedRounds + 1;
}
const spectate_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, viewingPlayerId } = body;
  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: "Game ID and player ID are required" });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: "Game not found" });
  }
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.ENDED) {
    throw createError({ statusCode: 400, message: "Spectator view is only available after the round starts" });
  }
  const view = getSpectatorView(game, player.id);
  if (!viewingPlayerId) {
    view.viewingPlayerId = null;
    view.updatedAt = Date.now();
    game.spectatorMode = null;
    await gameManager.persistGame(game);
    gameManager.broadcastGameState(gameId);
    return { success: true, status: "cleared" };
  }
  if (viewingPlayerId === player.id) {
    throw createError({ statusCode: 400, message: "Cannot spectate yourself" });
  }
  const target = game.players.find((entry) => entry.id === viewingPlayerId);
  if (!target) {
    throw createError({ statusCode: 404, message: "Target player not found" });
  }
  if (player.status !== PlayerStatus.WON && player.status !== PlayerStatus.SPECTATING && !canUseDebugBotSpectator(player, target)) {
    throw createError({ statusCode: 400, message: "Only players who have won can use spectator view" });
  }
  if (!isSpectatorTargetWatchable(target)) {
    throw createError({ statusCode: 400, message: "Target player is not watchable in this round" });
  }
  const targetIsBot = isBotPlayer(target);
  if (targetIsBot) {
    view.viewingPlayerId = target.id;
    view.updatedAt = Date.now();
    game.spectatorMode = { playerId: player.id, viewingPlayerId: target.id };
    await gameManager.persistGame(game);
    gameManager.broadcastGameState(gameId);
    return { success: true, status: "approved", targetIsBot: true };
  }
  if (view.approvedHumanPlayerId) {
    if (view.approvedHumanPlayerId !== target.id) {
      throw createError({
        statusCode: 400,
        message: "Only one real player can be approved for spectator view in a round"
      });
    }
    view.viewingPlayerId = target.id;
    view.pendingHumanPlayerId = null;
    view.updatedAt = Date.now();
    clearPendingSpectatorRequests(game, player.id, target.id);
    game.spectatorMode = { playerId: player.id, viewingPlayerId: target.id };
    await gameManager.persistGame(game);
    gameManager.broadcastGameState(gameId);
    return { success: true, status: "approved", targetIsBot: false };
  }
  if (view.pendingHumanPlayerId && view.pendingHumanPlayerId !== target.id) {
    throw createError({
      statusCode: 400,
      message: "A real-player spectator request is already pending"
    });
  }
  game.spectatorApprovalRequests = game.spectatorApprovalRequests || [];
  let request = game.spectatorApprovalRequests.find(
    (entry) => entry.status === "pending" && entry.roundNumber === getSpectatorScope(game) && entry.requesterId === player.id && entry.targetId === target.id
  );
  if (!request) {
    clearPendingSpectatorRequests(game, player.id);
    request = {
      id: randomUUID(),
      requesterId: player.id,
      requesterName: player.name,
      targetId: target.id,
      targetName: target.name,
      roundNumber: getSpectatorScope(game),
      status: "pending",
      requestedAt: Date.now()
    };
    game.spectatorApprovalRequests.push(request);
  }
  view.pendingHumanPlayerId = target.id;
  view.updatedAt = Date.now();
  await gameManager.persistGame(game);
  gameManager.broadcastGameState(gameId);
  return { success: true, status: "pending", requestId: request.id, targetIsBot: false };
});

export { spectate_post as default };
//# sourceMappingURL=spectate.post.mjs.map
