/**
 * POST /api/game/roll-first-dice
 * 人类庄家掷第一次骰子（随机生成）
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;
  const startTime = Date.now();

  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: 'roll-first-dice', statusCode: 400, durationMs: Date.now() - startTime, error: 'Game ID and player ID are required' });
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    await apiLog(event, { endpoint: 'roll-first-dice', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: 'Game not found' });
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  await requireGamePlayerAccess(event, game, playerId);

  try {
    const result = await gameManager.rollFirstDice(gameId);
    await apiLog(event, { endpoint: 'roll-first-dice', gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });
    // needSecondRoll 告知客户端是否需要第二次掷骰子
    return { success: true, ...result, needSecondRoll: (result as any).needSecondRoll ?? false };
  } catch (error: any) {
    await apiLog(event, { endpoint: 'roll-first-dice', gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || 'Failed to roll dice' });
    throw createError({ statusCode: 400, message: error.message || 'Failed to roll dice' });
  }
});
