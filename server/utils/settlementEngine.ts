/**
 * settlementEngine.ts — 结算/互包/连包/QJ线（从 gameManager 拆分）
 */
import { GameState, Player, PlayerStatus, MeldType, ActionType, Tile, GameEndReason } from '../types/game';
import { HandType } from './handValidator';
import { calculateGameResult } from './scoring';
import type { BroadcastService } from './broadcastService';

export interface WsManager {
  broadcast(gameId: string, event: string, data: any): void;
}

export class SettlementEngine {
  private mutualBailout: Map<string, Map<string, Map<string, number>>> = new Map();
  private bailoutRelationsCache: Map<string, { result: BailoutRelation[]; timestamp: number }> = new Map();

  constructor(
    private broadcastService: BroadcastService,
    private getWsManager: () => WsManager | null
  ) {}

  // ==================== 互包记录 ====================

  invalidateBailoutCache(gameId: string): void {
    this.bailoutRelationsCache.delete(gameId);
  }

  recordBailoutAction(
    gameId: string,
    playerId: string,
    sourcePlayerId: string | undefined,
    meldType: MeldType
  ): number {
    if (!sourcePlayerId) {
      this.invalidateBailoutCache(gameId);
      return 0;
    }
    if (meldType !== MeldType.TRIPLET && meldType !== MeldType.SEQUENCE && meldType !== MeldType.KONG) return 0;

    if (!this.mutualBailout.has(gameId)) this.mutualBailout.set(gameId, new Map());
    const gameBailout = this.mutualBailout.get(gameId)!;
    if (!gameBailout.has(playerId)) gameBailout.set(playerId, new Map());
    const playerBailout = gameBailout.get(playerId)!;
    const currentCount = playerBailout.get(sourcePlayerId) || 0;
    const nextCount = currentCount + 1;
    playerBailout.set(sourcePlayerId, nextCount);
    this.invalidateBailoutCache(gameId);
    return nextCount;
  }

  // ==================== 互包关系查询 ====================

  getMutualBailoutRelations(gameId: string): BailoutRelation[] {
    const cached = this.bailoutRelationsCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < 500) return cached.result;

    const relations: BailoutRelation[] = [];
    const gameBailout = this.mutualBailout.get(gameId);
    if (!gameBailout) {
      this.bailoutRelationsCache.set(gameId, { result: relations, timestamp: Date.now() });
      return relations;
    }

    const checked = new Set<string>();
    for (const [playerId, partnerCounts] of gameBailout) {
      for (const [partnerId] of partnerCounts) {
        const key = [playerId, partnerId].sort().join('-');
        if (checked.has(key)) continue;
        checked.add(key);
        const countAtoB = gameBailout.get(playerId)?.get(partnerId) || 0;
        const countBtoA = gameBailout.get(partnerId)?.get(playerId) || 0;
        if (countAtoB >= 4 || countBtoA >= 4) {
          relations.push({ player1: playerId, player2: partnerId, type: '四口' });
        } else if (countAtoB >= 3 || countBtoA >= 3) {
          relations.push({ player1: playerId, player2: partnerId, type: '三口' });
        }
      }
    }
    this.bailoutRelationsCache.set(gameId, { result: relations, timestamp: Date.now() });
    return relations;
  }

  getBailoutMultiplier(gameId: string, payerId: string, winnerId: string): { multiplier: number; type: string | null } {
    for (const rel of this.getMutualBailoutRelations(gameId)) {
      if ((rel.player1 === payerId && rel.player2 === winnerId) ||
          (rel.player1 === winnerId && rel.player2 === payerId)) {
        return { multiplier: rel.type === '四口' ? 5 : 3, type: rel.type };
      }
    }
    return { multiplier: 1, type: null };
  }

  checkAndBroadcastBailout(game: GameState, playerId: string, sourcePlayerId: string): void {
    const player = game.players.find(p => p.id === playerId);
    const source = game.players.find(p => p.id === sourcePlayerId);
    if (!player || !source) return;
    const rawCount = this.mutualBailout.get(game.gameId)?.get(playerId)?.get(sourcePlayerId);
    const currentCount = rawCount || 0;
    const msgByCount: Record<number, string> = {
      2: `📣 [${player.name}]搞了[${source.name}]两口了！`,
      3: `📣 [${player.name}]搞了[${source.name}]三口了！！`,
      4: `📣 ${player.name}搞了${source.name}四口了！！！`
    };
    const msg = msgByCount[currentCount];
    if (msg) this.broadcastService.broadcastQuickMessage(game.gameId, msg, 'special', 'bailout');
  }

  // ==================== 连包/带头大哥 ====================

  checkLeadingBrother(game: GameState, tile: Tile, currentPlayer: Player): void {
    const tileKey = `${tile.suit}-${tile.value}`;
    if (!game.consecutiveDiscards || game.consecutiveDiscards.suit !== tile.suit || game.consecutiveDiscards.value !== tile.value) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }
    const cd = game.consecutiveDiscards;
    if (cd.playerIds.includes(currentPlayer.id)) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }
    cd.playerIds.push(currentPlayer.id);
    const activePlayerIds = new Set(game.players.filter(p => p.status === PlayerStatus.PLAYING).map(p => p.id));
    const activeDiscarders = new Set(cd.playerIds.filter(id => activePlayerIds.has(id)));
    if (activePlayerIds.size >= 4 && cd.playerIds.length === 4 && activeDiscarders.size === 4) {
      const firstPlayerId = cd.playerIds[0]!;
      game.leadingBrotherEvent = { firstPlayerId, tileKey };
      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      const ws = this.getWsManager();
      if (ws) {
        ws.broadcast(game.gameId, 'leadingBrother', { firstPlayerName: firstPlayer?.name || '未知', tileKey });
      }
      game.consecutiveDiscards = null;
    }
  }

  // ==================== QJ线 ====================

  getPlayerCumulativeScore(gameId: string, playerId: string, games: Map<string, GameState>): number {
    const game = games.get(gameId);
    if (!game || !game.roundStats) return 0;
    let cumulative = 0;
    for (const round of game.roundStats) {
      const score = round.scores[playerId] ?? 0;
      if (score > 0) cumulative += score;
    }
    return cumulative;
  }

  checkQJThresholdAlerts(game: GameState, isPlayerBotControlled: (p: Player) => boolean, games: Map<string, GameState>): void {
    const threshold = game.liangShanThreshold ?? 4000;
    const alerts: { playerId: string; playerName: string; score: number }[] = [];
    for (const player of game.players) {
      if (isPlayerBotControlled(player)) continue;
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, player.id, games);
      if (cumulativeScore > threshold) {
        alerts.push({ playerId: player.id, playerName: player.name, score: cumulativeScore });
      }
    }
    game.qjAlerts = alerts;
  }

  computeSwapChances(game: GameState, playerId: string, games: Map<string, GameState>): number {
    const threshold = game.liangShanThreshold ?? 4000;
    const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, playerId, games);
    if (cumulativeScore >= 0) return 0;
    return Math.min(Math.floor(Math.abs(cumulativeScore) / threshold), 10);
  }

  // ==================== 十点牌型豁免 ====================

  hasTenPointClaimExemption(handTypes: HandType[], isDaDiao: boolean): boolean {
    if (isDaDiao) return true;
    // ★ 只有固定10番及以上的牌型才能豁免“门口无花不能捉冲”
    // 混碰/清碰 不是固定10番（用公式计算，最低2点），不能豁免
    return handTypes.some(type => [
      HandType.FENG_PENG, HandType.ALL_WIND,
      HandType.EIGHT_FLOWERS, HandType.FOUR_WILD, HandType.FULL_FLUSH
    ].includes(type));
  }

  // ==================== 清理 ====================

  clearGame(gameId: string): void {
    this.mutualBailout.delete(gameId);
    this.bailoutRelationsCache.delete(gameId);
  }
}

export interface BailoutRelation {
  player1: string;
  player2: string;
  type: '三口' | '四口';
}
