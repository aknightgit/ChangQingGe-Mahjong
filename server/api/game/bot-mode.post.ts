/**
 * AI托管模式控制
 * POST /api/game/bot-mode
 * Body: { gameId, playerId, enabled: boolean }
 */
import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, enabled } = body;

  if (!gameId || !playerId || typeof enabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'gameId, playerId, enabled are required'
    });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  await requireGamePlayerAccess(event, game, playerId);

  if (enabled) {
    gameManager.enableBotMode(gameId, playerId);
  } else {
    gameManager.disableBotMode(playerId);
  }

  return {
    success: true,
    data: {
      playerId,
      botMode: enabled
    }
  };
});
