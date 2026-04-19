import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId } = body;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and Player ID are required'
    });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: 'Game not found' });
    }

    await requireGamePlayerAccess(event, game, playerId);
    gameManager.disableBotMode(playerId);

    if (game) {
      await (gameManager as any).persistGame(game);
      (gameManager as any).broadcastGameState(gameId);
    }

    return {
      success: true,
      message: '已回到牌桌'
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || '操作失败'
    });
  }
});
