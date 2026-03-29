import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  let { gameId, playerName } = body;

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
    const result = await gameManager.joinGame(gameId, playerName);
    
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
