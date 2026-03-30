import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetPlayerId } = body;

  if (!gameId || !playerId || !targetPlayerId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

  const target = game.players.find(p => p.id === targetPlayerId);
  if (!target) throw createError({ statusCode: 404, message: 'Target player not found' });

  // 标记 AI 玩家下局移除
  if (!game.pendingRemovals) game.pendingRemovals = [];
  if (!game.pendingRemovals.includes(targetPlayerId)) {
    game.pendingRemovals.push(targetPlayerId);
  }

  return { success: true };
});
