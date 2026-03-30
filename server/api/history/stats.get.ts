import { MatchHistoryService } from '../../services/matchHistoryService';
import { isBotPlayer } from '../../services/botService';
import type { MatchHistoryResult } from '../../types/database';

interface PlayerStat {
  playerId: string;
  name: string;
  isAI: boolean;
  totalGames: number;
  totalScore: number;         // 总输赢
  effectiveScore: number;     // 有效战绩（扣除与AI的输赢）
  vsAIScore: number;          // 与AI互相战绩
  selfDrawCount: number;      // 自摸次数
  catchDiscardCount: number;  // 捉冲次数
  maxWin: number;             // 最大赢
  maxLoss: number;            // 最大输
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined;
  const limit = Number.isFinite(limitParam) && limitParam! > 0 ? limitParam : 100;

  const histories = await MatchHistoryService.listMatches({ limit });
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
        vsAIScore: 0,
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

      // Calculate vs AI score for this match
      // vsAIScore = 与AI玩家对战的分数（人类 vs AI 场次中，该玩家的得分）
      // If this player is human and there are AI players in the game
      if (!p.isAI && aiPlayers.length > 0) {
        // 这局有人类和AI混搭，记录与AI的对战分数
        stat.vsAIScore += p.score;
      }

      // effectiveScore = totalScore - vsAIScore（纯人类对局的得分）
      // 先算出来，后面统一设置
    }
  }

  // Calculate effective score
  for (const stat of playerStats.values()) {
    stat.effectiveScore = stat.totalScore - stat.vsAIScore;
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
