/**
 * bailoutTracker.ts — 互包追踪（从 gameManager 拆分）
 * 管理吃碰杠互包关系、三口四口检测、广播
 */
import { GameState, MeldType } from '../types/game';

export class BailoutTracker {
  private mutualBailout: Map<string, Map<string, Map<string, number>>> = new Map();
  private bailoutRelationsCache: Map<string, { result: any[]; timestamp: number }> = new Map();

  private invalidateCache(gameId: string): void {
    this.bailoutRelationsCache.delete(gameId);
  }

  recordBailoutAction(
    gameId: string,
    playerId: string,
    sourcePlayerId: string | undefined,
    meldType: MeldType
  ): number {
    if (!sourcePlayerId) {
      this.invalidateCache(gameId);
      console.warn(`[BAILOUT] recordBailoutAction SKIP: no sourcePlayerId for playerId=${playerId} meldType=${meldType}`);
      return 0;
    }
    if (meldType !== MeldType.TRIPLET && meldType !== MeldType.SEQUENCE && meldType !== MeldType.KONG) return 0;

    if (!this.mutualBailout.has(gameId)) {
      this.mutualBailout.set(gameId, new Map());
    }
    const gameBailout = this.mutualBailout.get(gameId)!;

    if (!gameBailout.has(playerId)) {
      gameBailout.set(playerId, new Map());
    }
    const playerBailout = gameBailout.get(playerId)!;

    const currentCount = playerBailout.get(sourcePlayerId) || 0;
    const nextCount = currentCount + 1;
    playerBailout.set(sourcePlayerId, nextCount);
    console.log(`[BAILOUT] game=${gameId} ${playerId} ate ${nextCount}x from ${sourcePlayerId} (meldType=${meldType})`);
    this.invalidateCache(gameId);
    return nextCount;
  }

  getMutualBailoutRelations(gameId: string): Array<{
    player1: string;
    player2: string;
    type: '三口' | '四口';
  }> {
    const cached = this.bailoutRelationsCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < 500) {
      return cached.result;
    }
    const relations: Array<{ player1: string; player2: string; type: '三口' | '四口' }> = [];
    const gameBailout = this.mutualBailout.get(gameId);
    if (!gameBailout) {
      this.bailoutRelationsCache.set(gameId, { result: relations, timestamp: Date.now() });
      return relations;
    }

    const checked = new Set<string>();

    for (const [playerId, partnerCounts] of gameBailout) {
      for (const [partnerId, count] of partnerCounts) {
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

  checkAndBroadcastBailout(
    game: GameState,
    playerId: string,
    sourcePlayerId: string,
    broadcastQuickMessage: (gameId: string, text: string, type: string, actionKind?: string) => void
  ): void {
    const player = game.players.find(p => p.id === playerId);
    const source = game.players.find(p => p.id === sourcePlayerId);
    if (!player || !source) {
      console.log(`[BAILOUT] SKIP: player=${!!player} source=${!!source} playerId=${playerId} sourcePlayerId=${sourcePlayerId}`);
      return;
    }

    const rawCount = this.mutualBailout.get(game.gameId)?.get(playerId)?.get(sourcePlayerId);
    const currentCount = rawCount || 0;
    console.log(`[BAILOUT] game=${game.gameId} player=${player.name} source=${source.name} count=${currentCount}`);

    const msgByCount: Record<number, string> = {
      2: `📣 ${player.name}搞了${source.name}两口了！`,
      3: `📣 ${player.name}搞了${source.name}三口了！！`,
      4: `📣 ${player.name}搞了${source.name}四口了！！！`
    };

    const msg = msgByCount[currentCount];
    if (msg) {
      broadcastQuickMessage(game.gameId, msg, 'special', 'bailout');
    }
  }

  getBailoutMultiplier(
    gameId: string,
    payerId: string,
    winnerId: string
  ): { multiplier: number; type: string | null } {
    const relations = this.getMutualBailoutRelations(gameId);

    for (const rel of relations) {
      if ((rel.player1 === payerId && rel.player2 === winnerId) ||
          (rel.player1 === winnerId && rel.player2 === payerId)) {
        return {
          multiplier: rel.type === '四口' ? 5 : 3,
          type: rel.type
        };
      }
    }
    return { multiplier: 1, type: null };
  }

  clearGame(gameId: string): void {
    this.mutualBailout.delete(gameId);
    this.bailoutRelationsCache.delete(gameId);
  }

  /** 供 startGame 中读取 mutualBailout 做清理 */
  getGameBailout(gameId: string): Map<string, Map<string, number>> | undefined {
    return this.mutualBailout.get(gameId);
  }
}
