import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetPlayerId } = body;

  if (!gameId || !playerId || !targetPlayerId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

  const { player } = await requireGamePlayerAccess(event, game, playerId);
  if (!player.isDealer) {
    throw createError({ statusCode: 403, message: 'Only the dealer can kick players' });
  }

  const target = game.players.find(p => p.id === targetPlayerId);
  if (!target) throw createError({ statusCode: 404, message: 'Target player not found' });

  if (!game.pendingRemovals) game.pendingRemovals = [];
  if (!game.pendingRemovals.includes(targetPlayerId)) {
    game.pendingRemovals.push(targetPlayerId);
  }

  return { success: true };
});
