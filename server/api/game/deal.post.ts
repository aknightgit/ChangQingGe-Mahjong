/**
 * POST /api/game/deal
 * 新开局流程 - 第三步：点击发牌，切换到 PLAYING 阶段
 * 骰子阶段结束后（无论掷了1次还是2次），玩家手动触发
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;
  const startTime = Date.now();

  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: 'deal', statusCode: 400, durationMs: Date.now() - startTime, error: 'Game ID and player ID are required' });
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  let game;
  try {
    game = await gameManager.getGame(gameId);
  } catch (err: any) {
    await apiLog(event, { endpoint: 'deal', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: err.message || 'Game not found' });
    throw createError({ statusCode: 404, message: err.message || 'Game not found' });
  }
  if (!game) {
    await apiLog(event, { endpoint: 'deal', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: 'Game not found' });
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);

  try {
    await gameManager.dealGame(gameId);

    await apiLog(event, { endpoint: 'deal', gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });

    return {
      success: true,
      phase: 'playing',
    };
  } catch (error: any) {
    await apiLog(event, { endpoint: 'deal', gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || 'Failed to deal game' });
    throw createError({ statusCode: 400, message: error.message || 'Failed to deal game' });
  }
});
