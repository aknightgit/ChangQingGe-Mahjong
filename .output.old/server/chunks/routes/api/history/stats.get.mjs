import { d as defineEventHandler, g as getQuery, M as MatchHistoryService } from '../../../nitro/nitro.mjs';
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

const stats_get = defineEventHandler(async (event) => {
  var _a;
  const query = getQuery(event);
  const limitParam = typeof query.limit === "string" ? parseInt(query.limit, 10) : void 0;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 100;
  const histories = await MatchHistoryService.listMatches({ limit });
  const playerStats = /* @__PURE__ */ new Map();
  const getStat = (playerId, name, isAI) => {
    if (!playerStats.has(playerId)) {
      playerStats.set(playerId, {
        playerId,
        name,
        isAI,
        totalGames: 0,
        totalScore: 0,
        effectiveScore: 0,
        vsAIWin: 0,
        vsAILose: 0,
        vsAINet: 0,
        selfDrawCount: 0,
        catchDiscardCount: 0,
        maxWin: 0,
        maxLoss: 0
      });
    }
    return playerStats.get(playerId);
  };
  for (const match of histories) {
    if (!((_a = match.results) == null ? void 0 : _a.length)) continue;
    const matchPlayers = match.results.map((r) => {
      var _a2, _b, _c;
      return {
        id: r.playerId,
        name: r.name,
        isAI: r.name.startsWith("AI-") || r.name.startsWith("\u7535\u8111"),
        score: (_c = (_b = r.finalScore) != null ? _b : (_a2 = match.finalScores) == null ? void 0 : _a2[r.playerId]) != null ? _c : 0,
        winType: r.winType,
        status: r.status
      };
    });
    matchPlayers.filter((p) => !p.isAI);
    const aiPlayers = matchPlayers.filter((p) => p.isAI);
    for (const p of matchPlayers) {
      const stat = getStat(p.id, p.name, p.isAI);
      stat.totalGames++;
      stat.totalScore += p.score;
      if (p.score > 0) stat.maxWin = Math.max(stat.maxWin, p.score);
      if (p.score < 0) stat.maxLoss = Math.min(stat.maxLoss, p.score);
      if (p.status === "won") {
        if (p.winType === "self_draw") stat.selfDrawCount++;
        else if (p.winType === "catch_discard" || p.winType === "rob_kong") stat.catchDiscardCount++;
      }
      if (!p.isAI && aiPlayers.length > 0) {
        if (p.score > 0) {
          stat.vsAIWin += p.score;
        } else if (p.score < 0) {
          stat.vsAILose += Math.abs(p.score);
        }
      }
    }
  }
  for (const stat of playerStats.values()) {
    stat.vsAINet = stat.vsAIWin - stat.vsAILose;
    stat.effectiveScore = stat.totalScore - stat.vsAINet;
  }
  const sorted = Array.from(playerStats.values()).filter((s) => s.totalGames > 0).sort((a, b) => b.effectiveScore - a.effectiveScore || b.totalScore - a.totalScore);
  return {
    success: true,
    data: sorted
  };
});

export { stats_get as default };
//# sourceMappingURL=stats.get.mjs.map
