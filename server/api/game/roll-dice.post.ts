/**
 * POST /api/game/roll-dice
 * 新开局流程 - 第二步（可选）：第二次掷骰子
 * 仅当 diceRollCount>=2 且第一次骰子未翻倍时才需要
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;
  const startTime = Date.now();

  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: 'roll-dice', statusCode: 400, durationMs: Date.now() - startTime, error: 'Game ID and player ID are required' });
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  let game;
  try {
    game = await gameManager.getGame(gameId);
  } catch (err: any) {
    await apiLog(event, { endpoint: 'roll-dice', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: err.message || 'Game not found' });
    throw createError({ statusCode: 404, message: err.message || 'Game not found' });
  }
  if (!game) {
    await apiLog(event, { endpoint: 'roll-dice', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: 'Game not found' });
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);

  try {
    await gameManager.rollSecondDice(gameId);

    await apiLog(event, { endpoint: 'roll-dice', gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });

    return {
      success: true,
      dice: game.dice,
      diceRolls: game.diceRolls,
      roundMultiplier: game.roundMultiplier,
    };
  } catch (error: any) {
    await apiLog(event, { endpoint: 'roll-dice', gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || 'Failed to roll dice' });
    throw createError({ statusCode: 400, message: error.message || 'Failed to roll dice' });
  }
});
