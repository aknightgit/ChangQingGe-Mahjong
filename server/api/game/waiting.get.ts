import { gameManager } from '../../utils/gameManager';
import { apiLog } from '../../utils/apiLogService';

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMsg: string | undefined;

  try {
    const games = await gameManager.listGames();
    const now = Date.now();
    const INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

    // 过滤：排除已开始、已结束、不活跃超过30分钟的房间
    const activeGames = (games || []).filter((game: any) => {
      const phase = game.phase || '';
      if (phase === 'ended' || phase === 'playing') return false;

      // 检查不活跃：最后有玩家操作的时间
      const lastActive = game.lastActionTime || game.createdAt || 0;
      if (now - lastActive > INACTIVE_TIMEOUT_MS) {
        console.log(`[waiting] Filtering out inactive room ${game.roomNumber || game.gameId}: lastActive ${new Date(lastActive).toISOString()}`);
        return false;
      }

      return true;
    });

    await apiLog(event, {
      endpoint: 'waiting',
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      data: { games: activeGames }
    };
  } catch (error: any) {
    statusCode = 500;
    errorMsg = error.message || 'Internal server error';
    await apiLog(event, {
      endpoint: 'waiting',
      statusCode,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    });
    throw createError({ statusCode, message: errorMsg });
  }
});
