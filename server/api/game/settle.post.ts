import { gameManager } from '../../utils/gameManager';
import { GamePhase, GameEndReason } from '../../types/game';
import { getCollection } from '../../utils/mongo';
import type { SettlementHistory } from '../../types/database';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, action, debugAccessToken } = body;

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' });
  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true';
  const isDebugBypass =
    debugRoutesEnabled &&
    typeof debugAccessToken === 'string' &&
    (game as any).debugAccessToken === debugAccessToken;
  if (!isDebugBypass) {
    await requireGamePlayerAccess(event, game, playerId);
  }

  if (action === 'request') {
    // 请求退房结算
    game.settleRequested = true;
    console.log(`[Settle] ${playerId} requested settlement`);
    const requestPlayer = game.players.find((p: any) => p.id === playerId);
    const requestPlayerName = requestPlayer?.name || '玩家';
    gameManager.broadcastQuickMessage(gameId, `🏠 ${requestPlayerName}申请退房，本局后结算`, 'warn');

    // 识别AI玩家ID集合
    const aiPlayerIds = new Set(
      game.players.filter((p: any) => p.name?.startsWith('AI-')).map((p: any) => p.id)
    );

    // 收集所有在roundStats中出现过的玩家ID(包括已离场的AI/真人)
    const allPlayerIds = new Set(game.players.map((p: any) => p.id));
    for (const round of (game.roundStats || [])) {
      for (const pid of Object.keys(round.scores)) allPlayerIds.add(pid);
    }

    // 计算累计统计数据
    const nameMap: Record<string, string> = {};
    for (const p of game.players) nameMap[p.id] = p.name;
    const playerStats: Record<string, any> = {};
    for (const pid of allPlayerIds) {
      playerStats[pid] = {
        id: pid,
        name: nameMap[pid] || pid.slice(0, 8),
        totalScore: 0,
        effectiveScore: 0,   // 有效战绩（排除与AI对战的局）
        vsAiScore: 0,        // 与AI战绩
        wins: 0,
        selfDraws: 0,
        discards: 0,         // 捉冲次数
        maxWin: 0,
        maxLoss: 0,
        rounds: 0
      };
    }

    for (const round of (game.roundStats || [])) {
      // 判断该局是否有AI参与
      const roundHasAI = round.winners.some((wid: string) => aiPlayerIds.has(wid)) ||
        Object.keys(round.scores).some((pid: string) => aiPlayerIds.has(pid));

      for (const [pid, score] of Object.entries(round.scores)) {
        if (!playerStats[pid]) continue;
        playerStats[pid].totalScore += score;
        playerStats[pid].rounds += 1;
        if (score > 0) {
          if (score > playerStats[pid].maxWin) playerStats[pid].maxWin = score;
        } else if (score < 0) {
          if (score < playerStats[pid].maxLoss) playerStats[pid].maxLoss = score;
        }
        // 有效战绩 vs 与AI战绩
        if (roundHasAI) {
          playerStats[pid].vsAiScore += score;
        } else {
          playerStats[pid].effectiveScore += score;
        }
      }
      for (const wid of round.winners) {
        if (playerStats[wid]) playerStats[wid].wins += 1;
      }
      // 自摸 vs 捉冲
      const selfDrawSet = new Set(round.selfDraws || []);
      for (const sid of round.selfDraws || []) {
        if (playerStats[sid]) playerStats[sid].selfDraws += 1;
      }
      // 捉冲：赢家且不是自摸
      for (const wid of round.winners) {
        if (playerStats[wid] && !selfDrawSet.has(wid)) {
          playerStats[wid].discards += 1;
        }
      }
    }

    return {
      success: true,
      data: {
        settleRequested: true,
        playerStats: Object.values(playerStats).sort((a: any, b: any) => b.totalScore - a.totalScore),
        totalRounds: (game.roundStats || []).length,
        roomNumber: game.roomNumber,
        roundDetails: game.roundStats || []
      }
    };
  }
  if (action === 'cancel') {
    // 取消退房结算
    game.settleRequested = false;
    const cancelPlayer = game.players.find((p: any) => p.id === playerId);
    const cancelPlayerName = cancelPlayer?.name || '玩家';
    gameManager.broadcastQuickMessage(gameId, `🏠 ${cancelPlayerName}取消了退房`, 'warn');
    gameManager.broadcastGameState(gameId);
    console.log('[Settle] ' + playerId + ' cancelled settlement');
    return { success: true, data: { settleRequested: false } };
  }


  if (action === 'save') {
    // 识别AI玩家ID集合
    const aiPlayerIds = new Set(
      game.players.filter((p: any) => p.name?.startsWith('AI-')).map((p: any) => p.id)
    );

    // 计算累计统计数据（与 request 一致）
    const playerStatsMap: Record<string, any> = {};
    for (const p of game.players) {
      playerStatsMap[p.id] = {
        id: p.id,
        name: p.name,
        totalScore: 0,
        effectiveScore: 0,
        vsAiScore: 0,
        wins: 0,
        selfDraws: 0,
        discards: 0,
        maxWin: 0,
        maxLoss: 0,
        rounds: 0
      };
    }

    for (const round of (game.roundStats || [])) {
      const roundHasAI = round.winners.some((wid: string) => aiPlayerIds.has(wid)) ||
        Object.keys(round.scores).some((pid: string) => aiPlayerIds.has(pid));

      for (const [pid, score] of Object.entries(round.scores)) {
        if (!playerStatsMap[pid]) continue;
        playerStatsMap[pid].totalScore += score;
        playerStatsMap[pid].rounds += 1;
        if (score > 0) {
          if (score > playerStatsMap[pid].maxWin) playerStatsMap[pid].maxWin = score;
        } else if (score < 0) {
          if (score < playerStatsMap[pid].maxLoss) playerStatsMap[pid].maxLoss = score;
        }
        if (roundHasAI) {
          playerStatsMap[pid].vsAiScore += score;
        } else {
          playerStatsMap[pid].effectiveScore += score;
        }
      }
      for (const wid of round.winners) {
        if (playerStatsMap[wid]) playerStatsMap[wid].wins += 1;
      }
      const selfDrawSet = new Set(round.selfDraws || []);
      for (const sid of round.selfDraws || []) {
        if (playerStatsMap[sid]) playerStatsMap[sid].selfDraws += 1;
      }
      for (const wid of round.winners) {
        if (playerStatsMap[wid] && !selfDrawSet.has(wid)) {
          playerStatsMap[wid].discards += 1;
        }
      }
    }

    // 保存结算数据到 MongoDB
    const collection = await getCollection<SettlementHistory>('settlementHistory');
    const settlementDoc: SettlementHistory = {
      gameId: game.gameId,
      roomNumber: (game as any).roomNumber,
      totalRounds: (game.roundStats || []).length,
      playerStats: Object.values(playerStatsMap),
      roundDetails: game.roundStats || [],
      savedAt: new Date(),
      savedBy: playerId
    };
    await collection.updateOne(
      { gameId: game.gameId },
      { $set: settlementDoc },
      { upsert: true }
    );

    console.log(`[Settle] 结算已保存到MongoDB: gameId=${game.gameId}, rounds=${settlementDoc.totalRounds}`);

    // 结束游戏
    game.settleRequested = true;
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.OWNER_LEFT;
    gameManager.broadcastQuickMessage(gameId, `🏠 本局结束,退房结算中...`, 'warn');
    game.endedAt = Date.now();
    game.lastActionTime = Date.now();
    return { success: true };
  }

  return { success: false, message: 'Unknown action' };
});