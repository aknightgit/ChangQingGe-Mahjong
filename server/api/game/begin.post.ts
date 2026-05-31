/**
 * POST /api/game/begin
 * 新开局流程 - 第一步：洗牌 + 发牌 + 第一次掷骰子 + 广播
 * 服务端原子完成所有初始化，客户端只需等广播显示骰子动画
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, hesitationWindow } = body;
  const startTime = Date.now();

  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: 'begin', statusCode: 400, durationMs: Date.now() - startTime, error: 'Game ID and player ID are required' });
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  let game;
  try {
    game = await gameManager.getGame(gameId);
  } catch (err: any) {
    await apiLog(event, { endpoint: 'begin', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: err.message || 'Game not found' });
    throw createError({ statusCode: 404, message: err.message || 'Game not found' });
  }
  if (!game) {
    await apiLog(event, { endpoint: 'begin', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: 'Game not found' });
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);

  try {
    await gameManager.beginGame(gameId, { hesitationWindow });

    await apiLog(event, { endpoint: 'begin', gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });

    return {
      success: true,
      phase: 'starting',
      dice: game.dice,
      diceRolls: game.diceRolls,
      roundMultiplier: game.roundMultiplier,
      diceRollCount: game.diceRollCount ?? 2,
    };
  } catch (error: any) {
    await apiLog(event, { endpoint: 'begin', gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || 'Failed to begin game' });
    throw createError({ statusCode: 400, message: error.message || 'Failed to begin game' });
  }
});
