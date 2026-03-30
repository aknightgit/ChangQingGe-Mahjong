import { getCollection } from '../utils/mongo';
import type { MatchHistory } from '../types/database';
import { calculateGameResult } from '../utils/scoring';
import { PlayerStatus, type GameState, type GameEndReason, ActionType } from '../types/game';

export class MatchHistoryService {
  private static COLLECTION_NAME = 'matchHistory';

  /**
   * 从 actionHistory 推断胡牌类型
   */
  private static inferWinType(
    game: GameState,
    playerId: string
  ): 'self_draw' | 'catch_discard' | 'rob_kong' | null {
    const actions = game.actionHistory;
    // 从后往前找该玩家的胡牌动作
    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      if (action.playerId === playerId && action.type === ActionType.HU) {
        // 检查前一个动作是否是摸牌（自摸）或别人的弃牌（捉冲）
        if (i > 0) {
          const prev = actions[i - 1];
          if (prev.type === ActionType.DRAW && prev.playerId === playerId) {
            return 'self_draw'; // 自摸：自己摸牌后胡
          }
          if (prev.type === ActionType.DISCARD && prev.playerId !== playerId) {
            return 'catch_discard'; // 捉冲：别人出牌后胡
          }
          // 抢杠：前序是补杠动作
          if (prev.type === ActionType.EXTENDED_KONG) {
            return 'rob_kong';
          }
        }
        // 兜底：如果有 tile 且不是自己的牌，大概率是捉冲
        if (action.tile) {
          const isOwnTile = game.players
            .find(p => p.id === playerId)
            ?.hand.concealedTiles.some(t => t.id === action.tile?.id);
          if (!isOwnTile) return 'catch_discard';
        }
        return 'self_draw'; // 默认自摸
      }
    }
    return null;
  }

  static async recordMatch(
    game: GameState,
    finalScores: Record<string, number>,
    reason: GameEndReason
  ): Promise<void> {
    const collection = await getCollection<MatchHistory>(this.COLLECTION_NAME);
    const completedAtMs = game.endedAt ?? Date.now();

    const winners = game.players.filter(player => player.status === PlayerStatus.WON);

    const computedScores:
      | Record<string, number>
      | undefined = game.customScoringMode === 'cheat'
        ? game.players.reduce<Record<string, number>>((acc, player) => {
            acc[player.id] = winners.some(w => w.id === player.id) ? 1 : -1;
            return acc;
          }, {})
        : calculateGameResult(game.players, winners);

    const history: MatchHistory = {
      gameId: game.gameId,
      roomId: game.gameId,
      endReason: reason,
      winnersCount: game.winnersCount,
      roundNumber: game.roundNumber,
      completedAt: new Date(completedAtMs),
      durationMs: Math.max(completedAtMs - game.createdAt, 0),
      finalScores: finalScores ?? computedScores,
      results: game.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        position: player.position,
        status: player.status,
        winOrder: player.winOrder ?? null,
        winRound: player.winRound ?? null,
        winTimestamp: player.winTimestamp ?? null,
        winType: player.status === PlayerStatus.WON 
          ? this.inferWinType(game, player.id) 
          : null,
        wonFan: player.wonFan,
        windScore: player.windScore,
        rainScore: player.rainScore,
        finalScore:
          player.score ?? finalScores[player.id] ?? computedScores?.[player.id] ?? 0
      }))
    };

    await collection.updateOne(
      { gameId: game.gameId },
      { $set: history },
      { upsert: true }
    );
  }

  static async listMatches(options?: { userId?: string; limit?: number }): Promise<MatchHistory[]> {
    const collection = await getCollection<MatchHistory>(this.COLLECTION_NAME);
    const { userId, limit = 20 } = options || {};

    const query = userId
      ? { 'results.playerId': userId }
      : {};

    return collection
      .find(query)
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray();
  }
}
