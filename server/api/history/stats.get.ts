import { MatchHistoryService } from '../../services/matchHistoryService';
import { isBotPlayer } from '../../services/botService';
import type { MatchHistoryResult } from '../../types/database';

interface PlayerStat {
  playerId: string;
  name: string;
  isAI: boolean;
  totalGames: number;
  totalScore: number;         // 总输赢
  effectiveScore: number;     // 有效战绩（总输赢 - 与AI间的净得分）
  vsAIWin: number;            // 从AI赢了多少（正数）
  vsAILose: number;           // 输给AI多少（正数）
  vsAINet: number;            // 与AI净输赢（赢AI - 输AI）
  selfDrawCount: number;      // 自摸次数
  catchDiscardCount: number;  // 捉冲次数
  maxWin: number;             // 最大赢
  maxLoss: number;            // 最大输
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined;
  const limit = Number.isFinite(limitParam) && limitParam! > 0 ? limitParam : 100;
  const sinceParam = typeof query.since === 'string' ? query.since : undefined;

  const histories = await MatchHistoryService.listMatches({ limit, since: sinceParam });
  const playerStats = new Map<string, PlayerStat>();

  // Helper: get or create player stat
  const getStat = (playerId: string, name: string, isAI: boolean): PlayerStat => {
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
        maxLoss: 0,
      });
    }
    return playerStats.get(playerId)!;
  };

  // Process each match
  for (const match of histories) {
    if (!match.results?.length) continue;

    // Build player info for this match
    const matchPlayers = match.results.map(r => ({
      id: r.playerId,
      name: r.name,
      isAI: r.name.startsWith('AI-') || r.name.startsWith('电脑'),
      score: r.finalScore ?? match.finalScores?.[r.playerId] ?? 0,
      winType: r.winType,
      status: r.status,
    }));

    const humanPlayers = matchPlayers.filter(p => !p.isAI);
    const aiPlayers = matchPlayers.filter(p => p.isAI);

    for (const p of matchPlayers) {
      const stat = getStat(p.id, p.name, p.isAI);
      stat.totalGames++;
      stat.totalScore += p.score;

      // Track max win/loss
      if (p.score > 0) stat.maxWin = Math.max(stat.maxWin, p.score);
      if (p.score < 0) stat.maxLoss = Math.min(stat.maxLoss, p.score);

      // Win type stats (only for winners)
      if (p.status === 'won') {
        if (p.winType === 'self_draw') stat.selfDrawCount++;
        else if (p.winType === 'catch_discard' || p.winType === 'rob_kong') stat.catchDiscardCount++;
      }

      // 与AI互相战绩：有AI参与的局，直接累计该局得分
      if (!p.isAI && aiPlayers.length > 0) {
        if (p.score > 0) {
          stat.vsAIWin += p.score; // 从AI局赢了多少
        } else if (p.score < 0) {
          stat.vsAILose += Math.abs(p.score); // 输给AI局多少
        }
      }
    }
  }

  // Calculate net vs AI and effective score
  for (const stat of playerStats.values()) {
    stat.vsAINet = stat.vsAIWin - stat.vsAILose;
    stat.effectiveScore = stat.totalScore - stat.vsAINet;
  }

  // Sort by effective score descending, then total score
  const sorted = Array.from(playerStats.values())
    .filter(s => s.totalGames > 0)
    .sort((a, b) => b.effectiveScore - a.effectiveScore || b.totalScore - a.totalScore);

  return {
    success: true,
    data: sorted,
  };
});
