import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess, resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  let { gameId, playerName } = body;
  const user = await resolveUserFromEvent(event);

  if (!gameId || !playerName) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player name are required'
    });
  }

  // 如果输入的是4位数字，尝试通过房间号查找
  if (/^\d{4}$/.test(gameId)) {
    const foundGameId = await gameManager.findGameByRoomNumber(gameId);
    if (foundGameId) {
      gameId = foundGameId;
    } else {
      throw createError({
        statusCode: 404,
        message: `房间号 ${gameId} 不存在或已结束`
      });
    }
  }

  try {
    const isBotJoin = typeof playerName === 'string' && (playerName.startsWith('AI-') || playerName.startsWith('电脑'));

    if (isBotJoin) {
      const game = await gameManager.getGame(gameId);
      if (!game) {
        throw createError({ statusCode: 404, message: 'Game not found' });
      }

      const ownerPlayerId = body.ownerPlayerId || game.players.find((entry) => entry.userId === user.userId)?.id;
      if (!ownerPlayerId) {
        throw createError({ statusCode: 403, message: 'Only game participants can add bots' });
      }

      await requireGamePlayerAccess(event, game, ownerPlayerId);
      const result = await gameManager.joinGame(gameId, playerName);

      return {
        success: true,
        data: result
      };
    }

    const result = await gameManager.joinGame(gameId, user.name, { userId: user.userId });
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to join game'
    });
  }
});
