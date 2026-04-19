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

  await requireGamePlayerAccess(event, game, playerId);

  const target = game.players.find(p => p.id === targetPlayerId);
  if (!target) throw createError({ statusCode: 404, message: 'Target player not found' });

  const spectatorName = body.spectatorName || '替补玩家';

  if (!game.pendingReplacements) game.pendingReplacements = [];
  game.pendingReplacements = game.pendingReplacements.filter(r => r.aiPlayerId !== targetPlayerId);
  game.pendingReplacements.push({
    spectatorId: playerId,
    aiPlayerId: targetPlayerId,
    spectatorName
  });

  return { success: true };
});
