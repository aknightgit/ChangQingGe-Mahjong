import { gameManager } from '../../utils/gameManager';
import { GamePhase, GameEndReason } from '../../types/game';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, action } = body;

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

  if (action === 'request') {
    // 请求退房结算
    game.settleRequested = true;
    console.log(`[Settle] ${playerId} requested settlement`);

    // 计算累计统计数据
    const playerStats: Record<string, any> = {};
    for (const p of game.players) {
      playerStats[p.id] = {
        id: p.id,
        name: p.name,
        totalScore: 0,
        wins: 0,
        selfDraws: 0,
        maxWin: 0,
        maxLoss: 0,
        rounds: 0
      };
    }

    for (const round of (game.roundStats || [])) {
      for (const [pid, score] of Object.entries(round.scores)) {
        if (!playerStats[pid]) continue;
        playerStats[pid].totalScore += score;
        playerStats[pid].rounds += 1;
        if (score > 0) {
          if (score > playerStats[pid].maxWin) playerStats[pid].maxWin = score;
        } else if (score < 0) {
          if (score < playerStats[pid].maxLoss) playerStats[pid].maxLoss = score;
        }
      }
      for (const wid of round.winners) {
        if (playerStats[wid]) playerStats[wid].wins += 1;
      }
      for (const sid of round.selfDraws) {
        if (playerStats[sid]) playerStats[sid].selfDraws += 1;
      }
    }

    return {
      success: true,
      data: {
        settleRequested: true,
        playerStats: Object.values(playerStats).sort((a: any, b: any) => b.totalScore - a.totalScore),
        totalRounds: (game.roundStats || []).length,
        roomNumber: game.roomNumber
      }
    };
  }

  if (action === 'save') {
    // 保存结算并结束
    game.settleRequested = true;
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.OWNER_LEFT;
    game.endedAt = Date.now();
    game.lastActionTime = Date.now();
    return { success: true };
  }

  return { success: false, message: 'Unknown action' };
});
