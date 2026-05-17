import { randomUUID } from 'crypto';
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { GamePhase, PlayerStatus } from '../../types/game';
import { isBotPlayer } from '../../services/botService';
import {
  canUseDebugBotSpectator,
  clearPendingSpectatorRequests,
  getSpectatorView,
  isSpectatorTargetWatchable
} from '../../utils/spectatorView';

function getSpectatorScope(game: any): number {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === GamePhase.ENDED ? completedRounds : completedRounds + 1;
}

export default defineEventHandler(async (event) => {
  let gameId: string | undefined;
  try {
    const body = await readBody(event);
    const bodyData = body as {
      gameId?: string;
      playerId?: string;
      viewingPlayerId?: string | null;
    };
    gameId = bodyData.gameId;
    const playerId = bodyData.playerId;
    const viewingPlayerId = bodyData.viewingPlayerId;

    if (!gameId || !playerId) {
      throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
    }

    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: 'Game not found' });
    }

    let playerData;
    try {
      playerData = await requireGamePlayerAccess(event, game, playerId);
    } catch (authErr: any) {
      console.error(`[Spectate] Auth failed: gameId=${gameId} playerId=${playerId} status=${authErr.statusCode} msg=${authErr.message}`);
      throw authErr;
    }
    const { player } = playerData;

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
    if (player.status !== PlayerStatus.WON && player.status !== PlayerStatus.SPECTATING && !canUseDebugBotSpectator(player, target)) {
      throw createError({ statusCode: 400, message: 'Only players who have won can use spectator view' });
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
      entry.roundNumber === getSpectatorScope(game) &&
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
        roundNumber: getSpectatorScope(game),
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
  } catch (err: any) {
    console.error(`[Spectate API Error] gameId=${gameId} status=${err.statusCode || 500} msg=${err.message || 'unknown'}`);
    console.error(`[Spectate API Error] stack:`, err.stack?.split('\n').slice(0, 5).join('\n'));
    throw err;
  }
});
