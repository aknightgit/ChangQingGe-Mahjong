import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess, resolveUserFromEvent } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';
import { createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  let { gameId, playerName } = body;
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg: string | undefined;

  // 降级解析用户：允许访客（无 session）通过前端传的 playerName 加入
  let user: { name: string; userId?: string } | null = null;
  try {
    user = await resolveUserFromEvent(event);
  } catch {
    // 访客模式：使用前端提供的名字
    user = {
      name: playerName || 'Guest',
      userId: undefined
    };
  }

  try {
    if (!gameId || !playerName) {
      statusCode = 400;
      errorMsg = 'Game ID and player name are required';
      throw createError({ statusCode: 400, message: errorMsg });
    }

    // 如果输入的是4位数字，尝试通过房间号查找
    if (/^\d{4}$/.test(gameId)) {
      const foundGameId = await gameManager.findGameByRoomNumber(gameId);
      if (foundGameId) {
        gameId = foundGameId;
      } else {
        statusCode = 404;
        errorMsg = `房间号 ${gameId} 不存在或已结束`;
        throw createError({ statusCode: 404, message: errorMsg });
      }
    }

    try {
      const isBotJoin = typeof playerName === 'string' && (playerName.startsWith('AI-') || playerName.startsWith('电脑'));

      if (isBotJoin) {
        const game = await gameManager.getGame(gameId);
        if (!game) {
          statusCode = 404;
          errorMsg = 'Game not found';
          throw createError({ statusCode: 404, message: errorMsg });
        }

        const ownerPlayerId = body.ownerPlayerId || game.players.find((entry) => entry.userId === user.userId)?.id;
        if (!ownerPlayerId) {
          statusCode = 403;
          errorMsg = 'Only game participants can add bots';
          throw createError({ statusCode: 403, message: errorMsg });
        }

        await requireGamePlayerAccess(event, game, ownerPlayerId);
        const result = await gameManager.joinGame(gameId, playerName);

        await apiLog(event, {
          endpoint: 'join-bot',
          gameId,
          playerId: result.playerId,
          statusCode: 200,
          durationMs: Date.now() - startTime,
        });

        return {
          success: true,
          data: { ...result, gameId }
        };
      }

      const result = await gameManager.joinGame(gameId, user.name, { userId: user.userId });

      await apiLog(event, {
        endpoint: 'join',
        gameId,
        playerId: result.playerId,
        statusCode: 200,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: { ...result, gameId }
      };
    } catch (error: any) {
      statusCode = 400;
      errorMsg = error.message || 'Failed to join game';

      // 把传入的房间号一起记下
      const rawGameId = body?.gameId || gameId;
      await apiLog(event, {
        endpoint: 'join',
        gameId: rawGameId,
        statusCode,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      });

      throw createError({ statusCode: 400, message: errorMsg });
    }
  } catch (error: any) {
    // 外层 catch — 如果是已经记过日志的 createError，就不要再记了
    await apiLog(event, {
      endpoint: 'join',
      gameId: body?.gameId || gameId,
      statusCode: error.statusCode || 500,
      durationMs: Date.now() - startTime,
      error: error.message || errorMsg,
    });
    throw error;
  }
});
