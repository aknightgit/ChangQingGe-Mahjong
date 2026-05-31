import { gameManager } from '../../utils/gameManager';
import { emitToRoom } from '../../utils/socket';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, hesitationWindow, dice } = body;
  const startTime = Date.now();

  if (!gameId || !playerId) {
    await apiLog(event, { endpoint: 'start', statusCode: 400, durationMs: Date.now() - startTime, error: 'Game ID and player ID are required' });
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  let game;
  try {
    game = await gameManager.getGame(gameId);
  } catch (err: any) {
    await apiLog(event, { endpoint: 'start', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: err.message || 'Game not found' });
    throw createError({ statusCode: 404, message: err.message || 'Game not found' });
  }
  if (!game) {
    await apiLog(event, { endpoint: 'start', gameId, playerId, statusCode: 404, durationMs: Date.now() - startTime, error: 'Game not found' });
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  // waiting/starting/ended/cha_jiao 均允许任意玩家开局；AI是庄家时人类玩家也能点开始
  const { player } = await requireGamePlayerAccess(event, game, playerId);
  const canAnyPlayerRestart = game.phase === 'ended' || game.phase === 'cha_jiao' || game.phase === 'starting' || game.phase === 'waiting';

  if (!canAnyPlayerRestart && !player.isDealer) {
    await apiLog(event, { endpoint: 'start', gameId, playerId, statusCode: 403, durationMs: Date.now() - startTime, error: 'Only the dealer can start the game' });
    throw createError({ statusCode: 403, message: 'Only the dealer can start the game' });
  }

  try {
    console.log('[timing-api] before gameManager.startGame:', Date.now() - startTime, 'ms');
    await gameManager.startGame(gameId, {
      hesitationWindow: hesitationWindow,
      fixedDice: Array.isArray(dice) && dice.length === 2
        ? [Number(dice[0]) || 1, Number(dice[1]) || 1]
        : undefined
    });
    console.log('[timing-api] after gameManager.startGame:', Date.now() - startTime, 'ms');
    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      phase: 'playing',
      source: 'start'
    });

    await apiLog(event, { endpoint: 'start', gameId, playerId, statusCode: 200, durationMs: Date.now() - startTime });

    return {
      success: true,
      message: 'Game started'
    };
  } catch (error: any) {
    await apiLog(event, { endpoint: 'start', gameId, playerId, statusCode: 400, durationMs: Date.now() - startTime, error: error.message || 'Failed to start game' });
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to start game'
    });
  }
});