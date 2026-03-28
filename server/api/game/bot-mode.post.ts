/**
 * AI托管模式控制
 * POST /api/game/bot-mode
 * Body: { gameId, playerId, enabled: boolean }
 */
import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, enabled } = body;

  if (!gameId || !playerId || typeof enabled !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'gameId, playerId, enabled are required'
    });
  }

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
