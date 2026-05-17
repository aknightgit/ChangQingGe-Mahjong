import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, o as requireGamePlayerAccess, a as getCollection, G as GamePhase, v as GameEndReason } from '../../../nitro/nitro.mjs';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'socket.io';
import '@socket.io/redis-adapter';
import 'redis';
import 'fs';
import 'path';
import 'node:url';
import '@iconify/utils';
import 'consola';

const settle_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, action, debugAccessToken } = body;
  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  const game = await gameManager.getGame(gameId);
  if (!game) throw createError({ statusCode: 404, message: "Game not found" });
  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === "true";
  const isDebugBypass = debugRoutesEnabled && typeof debugAccessToken === "string" && game.debugAccessToken === debugAccessToken;
  if (!isDebugBypass) {
    await requireGamePlayerAccess(event, game, playerId);
  }
  if (action === "request") {
    game.settleRequested = true;
    console.log(`[Settle] ${playerId} requested settlement`);
    const aiPlayerIds = new Set(
      game.players.filter((p) => {
        var _a;
        return (_a = p.name) == null ? void 0 : _a.startsWith("AI-");
      }).map((p) => p.id)
    );
    const allPlayerIds = new Set(game.players.map((p) => p.id));
    for (const round of game.roundStats || []) {
      for (const pid of Object.keys(round.scores)) allPlayerIds.add(pid);
    }
    const nameMap = {};
    for (const p of game.players) nameMap[p.id] = p.name;
    const playerStats = {};
    for (const pid of allPlayerIds) {
      playerStats[pid] = {
        id: pid,
        name: nameMap[pid] || pid.slice(0, 8),
        totalScore: 0,
        effectiveScore: 0,
        // 有效战绩（排除与AI对战的局）
        vsAiScore: 0,
        // 与AI战绩
        wins: 0,
        selfDraws: 0,
        discards: 0,
        // 捉冲次数
        maxWin: 0,
        maxLoss: 0,
        rounds: 0
      };
    }
    for (const round of game.roundStats || []) {
      const roundHasAI = round.winners.some((wid) => aiPlayerIds.has(wid)) || Object.keys(round.scores).some((pid) => aiPlayerIds.has(pid));
      for (const [pid, score] of Object.entries(round.scores)) {
        if (!playerStats[pid]) continue;
        playerStats[pid].totalScore += score;
        playerStats[pid].rounds += 1;
        if (score > 0) {
          if (score > playerStats[pid].maxWin) playerStats[pid].maxWin = score;
        } else if (score < 0) {
          if (score < playerStats[pid].maxLoss) playerStats[pid].maxLoss = score;
        }
        if (roundHasAI) {
          playerStats[pid].vsAiScore += score;
        } else {
          playerStats[pid].effectiveScore += score;
        }
      }
      for (const wid of round.winners) {
        if (playerStats[wid]) playerStats[wid].wins += 1;
      }
      const selfDrawSet = new Set(round.selfDraws || []);
      for (const sid of round.selfDraws || []) {
        if (playerStats[sid]) playerStats[sid].selfDraws += 1;
      }
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
        playerStats: Object.values(playerStats).sort((a, b) => b.totalScore - a.totalScore),
        totalRounds: (game.roundStats || []).length,
        roomNumber: game.roomNumber,
        roundDetails: game.roundStats || []
      }
    };
  }
  if (action === "save") {
    const aiPlayerIds = new Set(
      game.players.filter((p) => {
        var _a;
        return (_a = p.name) == null ? void 0 : _a.startsWith("AI-");
      }).map((p) => p.id)
    );
    const playerStatsMap = {};
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
    for (const round of game.roundStats || []) {
      const roundHasAI = round.winners.some((wid) => aiPlayerIds.has(wid)) || Object.keys(round.scores).some((pid) => aiPlayerIds.has(pid));
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
    const collection = await getCollection("settlementHistory");
    const settlementDoc = {
      gameId: game.gameId,
      roomNumber: game.roomNumber,
      totalRounds: (game.roundStats || []).length,
      playerStats: Object.values(playerStatsMap),
      roundDetails: game.roundStats || [],
      savedAt: /* @__PURE__ */ new Date(),
      savedBy: playerId
    };
    await collection.updateOne(
      { gameId: game.gameId },
      { $set: settlementDoc },
      { upsert: true }
    );
    console.log(`[Settle] \u7ED3\u7B97\u5DF2\u4FDD\u5B58\u5230MongoDB: gameId=${game.gameId}, rounds=${settlementDoc.totalRounds}`);
    game.settleRequested = true;
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.OWNER_LEFT;
    game.endedAt = Date.now();
    game.lastActionTime = Date.now();
    return { success: true };
  }
  return { success: false, message: "Unknown action" };
});

export { settle_post as default };
//# sourceMappingURL=settle.post.mjs.map
