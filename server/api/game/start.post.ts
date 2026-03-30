import { gameManager } from '../../utils/gameManager';
import { emitToRoom } from '../../utils/socket';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, freezeDurationMs, phaseOnly } = body;

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

  // Check if player is the dealer (creator)
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found in this game'
    });
  }

  if (!player.isDealer) {
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

    await gameManager.startGame(gameId, { freezeDurationMs: freezeDurationMs || 1000 });
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
