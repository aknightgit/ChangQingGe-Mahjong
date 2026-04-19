import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query as { gameId?: string; playerId?: string };

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

    await requireGamePlayerAccess(event, game, playerId);

    const filteredWinOptions = await gameManager.getWinOptionsForPlayer(gameId, playerId);

    return { success: true, winOptions: filteredWinOptions };
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || 'Failed to get win options' });
  }
});
