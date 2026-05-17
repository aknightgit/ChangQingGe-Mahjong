import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, o as requireGamePlayerAccess, P as PlayerStatus, w as getSpectatorView } from '../../../nitro/nitro.mjs';
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

const spectateApproval_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, requestId, choice } = body;
  if (!gameId || !playerId || !requestId || !choice) {
    throw createError({ statusCode: 400, message: "Game ID, player ID, request ID, and choice are required" });
  }
  if (choice !== "approve" && choice !== "reject") {
    throw createError({ statusCode: 400, message: "Choice must be approve or reject" });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: "Game not found" });
  }
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  const request = (game.spectatorApprovalRequests || []).find((entry) => entry.id === requestId);
  if (!request || request.status !== "pending" || request.targetId !== player.id) {
    throw createError({ statusCode: 404, message: "Pending spectator request not found" });
  }
  const requester = game.players.find((entry) => entry.id === request.requesterId);
  if (!requester || requester.status !== PlayerStatus.WON) {
    request.status = "cancelled";
    request.resolvedAt = Date.now();
    await gameManager.persistGame(game);
    gameManager.broadcastGameState(gameId);
    return { success: true, status: "cancelled" };
  }
  const view = getSpectatorView(game, requester.id);
  const now = Date.now();
  if (choice === "approve") {
    if (view.approvedHumanPlayerId && view.approvedHumanPlayerId !== player.id) {
      request.status = "rejected";
      request.resolvedAt = now;
      if (view.pendingHumanPlayerId === player.id) {
        view.pendingHumanPlayerId = null;
        view.updatedAt = now;
      }
      await gameManager.persistGame(game);
      gameManager.broadcastGameState(gameId);
      return { success: true, status: "rejected", reason: "human_limit_reached" };
    }
    view.approvedHumanPlayerId = player.id;
    view.pendingHumanPlayerId = null;
    view.viewingPlayerId = player.id;
    view.updatedAt = now;
    request.status = "approved";
    request.resolvedAt = now;
    game.spectatorMode = { playerId: requester.id, viewingPlayerId: player.id };
  } else {
    if (view.pendingHumanPlayerId === player.id) {
      view.pendingHumanPlayerId = null;
      view.updatedAt = now;
    }
    request.status = "rejected";
    request.resolvedAt = now;
  }
  await gameManager.persistGame(game);
  gameManager.broadcastGameState(gameId);
  return { success: true, status: request.status };
});

export { spectateApproval_post as default };
//# sourceMappingURL=spectate-approval.post.mjs.map
