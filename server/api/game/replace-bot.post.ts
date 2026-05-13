import { gameManager } from '../../utils/gameManager';
import { apiLog } from '../../utils/apiLogService';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, spectatorId, targetBotId, playerName } = body;
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg: string | undefined;

  try {
    if (!gameId || !spectatorId || !targetBotId || !playerName) {
      statusCode = 400;
      errorMsg = 'gameId, spectatorId, targetBotId, playerName are required';
      throw createError({ statusCode: 400, message: errorMsg });
    }

    gameManager.requestBotReplacement(gameId, spectatorId, targetBotId, playerName);

    await apiLog(event, {
      endpoint: 'replace-bot',
      gameId,
      playerId: spectatorId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });

    return { success: true };
  } catch (error: any) {
    statusCode = error.statusCode || 400;
    errorMsg = error.message || 'Failed to request bot replacement';

    await apiLog(event, {
      endpoint: 'replace-bot',
      gameId,
      playerId: spectatorId,
      statusCode,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    });

    throw createError({ statusCode, message: errorMsg });
  }
});
