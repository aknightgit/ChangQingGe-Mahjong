import { randomUUID } from 'crypto';
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { GamePhase, PlayerStatus } from '../../types/game';
import { isBotPlayer } from '../../services/botService';
import { clearPendingSpectatorRequests, getSpectatorView, isSpectatorTargetWatchable } from '../../utils/spectatorView';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, viewingPlayerId } = body as {
    gameId?: string;
    playerId?: string;
    viewingPlayerId?: string | null;
  };

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);
  if (player.status !== PlayerStatus.WON) {
    throw createError({ statusCode: 400, message: 'Only players who have won can use spectator view' });
  }

  if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.ENDED) {
    throw createError({ statusCode: 400, message: 'Spectator view is only available after the round starts' });
  }

  const view = getSpectatorView(game, player.id);

  if (!viewingPlayerId) {
    view.viewingPlayerId = null;
    view.updatedAt = Date.now();
    game.spectatorMode = null;
    await (gameManager as any).persistGame(game);
    (gameManager as any).broadcastGameState(gameId);
    return { success: true, status: 'cleared' };
  }

  if (viewingPlayerId === player.id) {
    throw createError({ statusCode: 400, message: 'Cannot spectate yourself' });
  }

  const target = game.players.find((entry) => entry.id === viewingPlayerId);
  if (!target) {
    throw createError({ statusCode: 404, message: 'Target player not found' });
  }
  if (!isSpectatorTargetWatchable(target)) {
    throw createError({ statusCode: 400, message: 'Target player is not watchable in this round' });
  }

  const targetIsBot = isBotPlayer(target);
  if (targetIsBot) {
    view.viewingPlayerId = target.id;
    view.updatedAt = Date.now();
    game.spectatorMode = { playerId: player.id, viewingPlayerId: target.id };
    await (gameManager as any).persistGame(game);
    (gameManager as any).broadcastGameState(gameId);
    return { success: true, status: 'approved', targetIsBot: true };
  }

  if (view.approvedHumanPlayerId) {
    if (view.approvedHumanPlayerId !== target.id) {
      throw createError({
        statusCode: 400,
        message: 'Only one real player can be approved for spectator view in a round'
      });
    }

    view.viewingPlayerId = target.id;
    view.pendingHumanPlayerId = null;
    view.updatedAt = Date.now();
    clearPendingSpectatorRequests(game, player.id, target.id);
    game.spectatorMode = { playerId: player.id, viewingPlayerId: target.id };
    await (gameManager as any).persistGame(game);
    (gameManager as any).broadcastGameState(gameId);
    return { success: true, status: 'approved', targetIsBot: false };
  }

  if (view.pendingHumanPlayerId && view.pendingHumanPlayerId !== target.id) {
    throw createError({
      statusCode: 400,
      message: 'A real-player spectator request is already pending'
    });
  }

  game.spectatorApprovalRequests = game.spectatorApprovalRequests || [];
  let request = game.spectatorApprovalRequests.find((entry) =>
    entry.status === 'pending' &&
    entry.roundNumber === game.roundNumber &&
    entry.requesterId === player.id &&
    entry.targetId === target.id
  );

  if (!request) {
    clearPendingSpectatorRequests(game, player.id);
    request = {
      id: randomUUID(),
      requesterId: player.id,
      requesterName: player.name,
      targetId: target.id,
      targetName: target.name,
      roundNumber: game.roundNumber,
      status: 'pending',
      requestedAt: Date.now()
    };
    game.spectatorApprovalRequests.push(request);
  }

  view.pendingHumanPlayerId = target.id;
  view.updatedAt = Date.now();
  await (gameManager as any).persistGame(game);
  (gameManager as any).broadcastGameState(gameId);

  return { success: true, status: 'pending', requestId: request.id, targetIsBot: false };
});
