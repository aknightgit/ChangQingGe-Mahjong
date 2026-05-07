import { gameManager } from '../../utils/gameManager';
import { emitToRoom } from '../../utils/socket';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, hesitationWindow, phaseOnly, dice } = body;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  // 等待房间开局仍要求庄家；流局/结算后下一局允许房间内任意玩家触发。
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  const canAnyPlayerRestart = game.phase === 'ended' || game.phase === 'cha_jiao';

  if (!canAnyPlayerRestart && !player.isDealer) {
    throw createError({
      statusCode: 403,
      message: 'Only the dealer can start the game'
    });
  }

  try {
    // phaseOnly=true: 只设 STARTING 阶段（等待房间点"开始"），不发牌
    if (phaseOnly) {
      await gameManager.setStartingPhase(gameId);
      return { success: true, phase: 'starting' };
    }

    await gameManager.startGame(gameId, {
      hesitationWindow: hesitationWindow ?? 5000,
      fixedDice: Array.isArray(dice) && dice.length === 2
        ? [Number(dice[0]) || 1, Number(dice[1]) || 1]
        : undefined
    });
    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      phase: 'playing',
      source: 'start'
    });

    return {
      success: true,
      message: 'Game started'
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to start game'
    });
  }
});
