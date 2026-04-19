import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, targetId } = body;

  if (!gameId || !playerId || !targetId) {
    throw createError({ statusCode: 400, message: 'Game ID, player ID, and target ID are required' });
  }

  if (playerId === targetId) {
    throw createError({ statusCode: 400, message: 'Cannot swap with yourself' });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: 'Game not found' });
    }

    await requireGamePlayerAccess(event, game, playerId);
    const result = gameManager.requestSwapPosition(gameId, playerId, targetId);
    return { success: true, data: result };
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || 'Swap request failed' });
  }
});
