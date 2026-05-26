/**
 * 玩家从AI托管状态返回（我回来了）
 * POST /api/game/return-from-drag
 * Body: { gameId, playerId }
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'gameId, playerId are required'
    });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  await requireGamePlayerAccess(event, game, playerId);

  const player = game.players.find(p => p.id === playerId);
  const playerName = player?.name || playerId;

  gameManager.disableDragMode(gameId, playerId);

  // 广播回来消息
  gameManager.broadcastQuickMessage(gameId, `✅ ${playerName}回来了，已重新接管游戏`, 'info', 'dragReturn');
  gameManager.broadcastGameState(gameId);

  return {
    success: true,
    data: { playerId, playerName, returned: true }
  };
});
