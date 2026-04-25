import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { PlayerStatus } from '../../types/game';
import { getSpectatorView } from '../../utils/spectatorView';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, requestId, choice } = body as {
    gameId?: string;
    playerId?: string;
    requestId?: string;
    choice?: 'approve' | 'reject';
  };

  if (!gameId || !playerId || !requestId || !choice) {
    throw createError({ statusCode: 400, message: 'Game ID, player ID, request ID, and choice are required' });
  }

  if (choice !== 'approve' && choice !== 'reject') {
    throw createError({ statusCode: 400, message: 'Choice must be approve or reject' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);
  const request = (game.spectatorApprovalRequests || []).find((entry) => entry.id === requestId);
  if (!request || request.status !== 'pending' || request.targetId !== player.id) {
    throw createError({ statusCode: 404, message: 'Pending spectator request not found' });
  }

  const requester = game.players.find((entry) => entry.id === request.requesterId);
  if (!requester || requester.status !== PlayerStatus.WON) {
    request.status = 'cancelled';
    request.resolvedAt = Date.now();
    await (gameManager as any).persistGame(game);
    (gameManager as any).broadcastGameState(gameId);
    return { success: true, status: 'cancelled' };
  }

  const view = getSpectatorView(game, requester.id);
  const now = Date.now();

  if (choice === 'approve') {
    if (view.approvedHumanPlayerId && view.approvedHumanPlayerId !== player.id) {
      request.status = 'rejected';
      request.resolvedAt = now;
      if (view.pendingHumanPlayerId === player.id) {
        view.pendingHumanPlayerId = null;
        view.updatedAt = now;
      }
      await (gameManager as any).persistGame(game);
      (gameManager as any).broadcastGameState(gameId);
      return { success: true, status: 'rejected', reason: 'human_limit_reached' };
    }

    view.approvedHumanPlayerId = player.id;
    view.pendingHumanPlayerId = null;
    view.viewingPlayerId = player.id;
    view.updatedAt = now;
    request.status = 'approved';
    request.resolvedAt = now;
    game.spectatorMode = { playerId: requester.id, viewingPlayerId: player.id };
  } else {
    if (view.pendingHumanPlayerId === player.id) {
      view.pendingHumanPlayerId = null;
      view.updatedAt = now;
    }
    request.status = 'rejected';
    request.resolvedAt = now;
  }

  await (gameManager as any).persistGame(game);
  (gameManager as any).broadcastGameState(gameId);

  return { success: true, status: request.status };
});
