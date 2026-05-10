import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, locked } = body as { gameId?: string; playerId?: string; locked?: boolean };

  if (!gameId || !playerId || typeof locked !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Game ID, player ID, and locked flag are required'
    });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  await requireGamePlayerAccess(event, game, playerId);
  await gameManager.setHuSelectionLock(gameId, playerId, locked);

  return { success: true };
});
