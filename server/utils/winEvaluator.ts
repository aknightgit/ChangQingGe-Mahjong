/**
 * winEvaluator.ts — 胡牌评估缓存（从 gameManager 拆分）
 * 管理胡牌检测缓存、听牌预览、候选牌计算
 */
import { Tile, TileSuit, Meld, MeldType, GameState, Player, PlayerStatus } from '../types/game';
import { canWin, detectHandTypes, buildWildTileChecker, HandType } from './handValidator';
import { generateWinOptions, type WinOption } from './scoring';
import { isFlower } from './tiles';
import { buildTileSignature, buildMeldSignature, getPlayerFlowerTiles, isPlayerMenQing, filterBigDiaoPreviewTiles, getConcealedPlayableTiles } from './tileHelper';

// ==================== 缓存类型 ====================

interface PlayerWinCache {
  fast: Map<string, { canWin: boolean; types: HandType[] }>;
  options: Map<string, WinOption[]>;
  ting: Map<string, TingResult>;
}

export interface TingResult {
  isTing: boolean;
  winningTiles: Array<{
    tile: Tile;
    remainingCount: number;
    bestDiscardOption: WinOption | null;
    bestSelfDrawOption: WinOption | null;
    bestOverallOption: WinOption | null;
  }>;
}

// ==================== WinEvaluator ====================

export class WinEvaluator {
  private cache: Map<string, Map<string, PlayerWinCache>> = new Map();

  // ==================== 缓存管理 ====================

  private getPlayerCache(gameId: string, playerId: string): PlayerWinCache {
    if (!this.cache.has(gameId)) {
      this.cache.set(gameId, new Map());
    }
    const gameCache = this.cache.get(gameId)!;
    if (!gameCache.has(playerId)) {
      gameCache.set(playerId, { fast: new Map(), options: new Map(), ting: new Map() });
    }
    return gameCache.get(playerId)!;
  }

  invalidateCache(gameId: string, playerIds?: string[]): void {
    if (!playerIds || playerIds.length === 0) {
      this.cache.delete(gameId);
      return;
    }
    const gameCache = this.cache.get(gameId);
    if (!gameCache) return;
    for (const pid of playerIds) gameCache.delete(pid);
    if (gameCache.size === 0) this.cache.delete(gameId);
  }

  // ==================== 上下文 Key ====================

  private getContextKey(game: GameState, player: Player): string {
    return [
      `concealed=${buildTileSignature(player.hand.concealedTiles)}`,
      `melds=${buildMeldSignature(player.hand.exposedMelds)}`,
      `flowers=${getPlayerFlowerTiles(player).length}`,
      `wild=${game.customScoringMode || ''}`,
      `wildGroup=${(game.wildTileGroup || []).join(',')}`,
      `round=${game.roundMultiplier ?? 1}`,
      `inherit=${game.inheritMultiplier ?? 1}`,
      `settlement=${game.settlementMultiplier ?? 1}`
    ].join('|');
  }

  private getWinWildArg(game: GameState): string | null {
    return game.customScoringMode || null;
  }

  // ==================== 胡牌检测 ====================

  getCachedWinCheck(game: GameState, player: Player): { canWin: boolean; types: HandType[] } {
    const pc = this.getPlayerCache(game.gameId, player.id);
    const key = this.getContextKey(game, player);
    const cached = pc.fast.get(key);
    if (cached) return cached;
    const result = canWin(player.hand.concealedTiles, player.hand.exposedMelds, this.getWinWildArg(game));
    pc.fast.set(key, result);
    return result;
  }

  // ==================== 胡牌选项 ====================

  getCachedWinOptions(
    game: GameState,
    player: Player,
    context: 'self_draw' | 'discard',
    flags?: { isKongFlower?: boolean; isRobbingKong?: boolean; extraTile?: Tile }
  ): WinOption[] {
    const pc = this.getPlayerCache(game.gameId, player.id);
    const key = [
      this.getContextKey(game, player),
      `ctx=${context}`,
      `kongFlower=${flags?.isKongFlower ? 1 : 0}`,
      `robKong=${flags?.isRobbingKong ? 1 : 0}`,
      `extra=${flags?.extraTile ? `${flags.extraTile.suit}-${flags.extraTile.value}` : ''}`
    ].join('|');
    const cached = pc.options.get(key);
    if (cached) return cached;

    const handTiles = flags?.extraTile
      ? [...player.hand.concealedTiles, flags.extraTile]
      : player.hand.concealedTiles;
    const winCheck = flags?.extraTile
      ? canWin(handTiles, player.hand.exposedMelds, this.getWinWildArg(game))
      : this.getCachedWinCheck(game, player);
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts?.[0] ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts?.[1] ? parseInt(wildParts[1], 10) : undefined;
    const isDaDiao = player.hand.concealedTiles.filter(t => !isFlower(t)).length === 1;
    const allOptions = generateWinOptions({
      handTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles: getPlayerFlowerTiles(player),
      handTypes: winCheck.types,
      isKongFlower: !!flags?.isKongFlower,
      isRobbingKong: !!flags?.isRobbingKong,
      isMenQing: isPlayerMenQing(player),
      isDaDiao,
      wildTileSuit: wildSuit,
      wildTileValue: wildValue,
      wildTileGroup: game.wildTileGroup,
      rawRoundMultiplier: game.roundMultiplier ?? 1,
      rawInheritMultiplier: game.inheritMultiplier ?? 1,
      settlementMultiplier: game.settlementMultiplier ?? 1
    });
    const topOptions = allOptions
      .filter(option => option.type === context)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    pc.options.set(key, topOptions);
    return topOptions;
  }

  // ==================== 预热 ====================

  prewarm(game: GameState, player: Player, context: 'self_draw' | 'discard', extraTile?: Tile): void {
    if (player.status !== PlayerStatus.PLAYING) return;
    const winCheck = extraTile
      ? canWin([...player.hand.concealedTiles, extraTile], player.hand.exposedMelds, this.getWinWildArg(game))
      : this.getCachedWinCheck(game, player);
    if (!winCheck.canWin) return;
    this.getCachedWinOptions(game, player, context, {
      isKongFlower: context === 'self_draw' && !!player.isSelfDrawn,
      isRobbingKong: context === 'discard' && !!game.pendingKongClaim,
      extraTile
    });
  }

  // ==================== 候选牌 ====================

  getWinningTileCandidates(): Array<{ suit: TileSuit; value: number }> {
    const cands: Array<{ suit: TileSuit; value: number }> = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let v = 1; v <= 9; v++) cands.push({ suit, value: v });
    }
    for (let v = 1; v <= 4; v++) cands.push({ suit: TileSuit.WIND, value: v });
    for (let v = 1; v <= 3; v++) cands.push({ suit: TileSuit.DRAGON, value: v });
    return cands;
  }

  getTingPreviewCandidates(game: GameState, player: Player): Array<{ suit: TileSuit; value: number }> {
    const candidates = this.getWinningTileCandidates();
    if (game.customScoringMode?.startsWith(`${TileSuit.FLOWER}-`) && Array.isArray(game.wildTileGroup)) {
      for (const vt of game.wildTileGroup) {
        const v = parseInt(vt, 10);
        if (!Number.isNaN(v) && v >= 1 && v <= 8) candidates.push({ suit: TileSuit.FLOWER, value: v });
      }
    }
    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const playerSuits = new Set<TileSuit>();
    for (const tile of player.hand.concealedTiles) {
      if (!isFlower(tile) && !wildChecker(tile)) playerSuits.add(tile.suit);
    }
    for (const meld of player.hand.exposedMelds) {
      for (const tile of meld.tiles) {
        if (!isFlower(tile) && !wildChecker(tile)) playerSuits.add(tile.suit);
      }
    }
    const numberSuits = [...playerSuits].filter(s => s !== TileSuit.WIND && s !== TileSuit.DRAGON);
    if (numberSuits.length < 2) {
      return candidates.filter(c => {
        if (c.suit === TileSuit.WIND || c.suit === TileSuit.DRAGON || c.suit === TileSuit.FLOWER) return true;
        return playerSuits.has(c.suit);
      });
    }
    return candidates;
  }

  // ==================== 快速粗筛 ====================

  quickPrecheckTenpai(game: GameState, player: Player): boolean {
    const discardCount = game.discardPile.length;
    const playerCount = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    const calculatedRound = Math.max(1, Math.ceil(discardCount / Math.max(1, playerCount)));
    if (calculatedRound < 3) return false;

    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const concealed = player.hand.concealedTiles;
    const wildCount = concealed.filter(t => wildChecker(t)).length;
    const flowerCount = concealed.filter(t => isFlower(t)).length;
    if (wildCount >= 4) return true;
    if (flowerCount >= 8) return true;

    const nonWildNonFlower = concealed.filter(t => !isFlower(t) && !wildChecker(t));
    const valueCounts = new Map<string, number>();
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }
    const numberSuits = new Set<string>();
    for (const t of nonWildNonFlower) {
      if (t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON) numberSuits.add(t.suit);
    }
    const hasMultipleNumberSuits = numberSuits.size >= 2;

    let orphanCount = 0;
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      if (valueCounts.get(key)! >= 2) continue;
      if (t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON) { orphanCount++; continue; }
      if (hasMultipleNumberSuits) { orphanCount++; continue; }
      const hasAdj = nonWildNonFlower.some(o =>
        o.id !== t.id && o.suit === t.suit && Math.abs(o.value - t.value) <= 1
      );
      if (!hasAdj) orphanCount++;
    }
    return orphanCount < 4;
  }

  // ==================== 听牌预览 ====================

  getCachedTingPreview(game: GameState, player: Player, options?: { skipQuickPrecheck?: boolean }): TingResult {
    const pc = this.getPlayerCache(game.gameId, player.id);
    const key = `${this.getContextKey(game, player)}|ting-preview`;
    const cached = pc.ting.get(key);
    if (cached) return cached;

    const emptyResult: TingResult = { isTing: false, winningTiles: [] };

    if (!options?.skipQuickPrecheck && !this.quickPrecheckTenpai(game, player)) {
      pc.ting.set(key, emptyResult);
      return emptyResult;
    }

    const candidates = this.getTingPreviewCandidates(game, player);
    const winWildArg = this.getWinWildArg(game);
    const winningTileMap = new Map<string, TingResult['winningTiles'][0]>();

    const playable = getConcealedPlayableTiles(game, player);
    const playableCount = playable.length;
    const isListeningState = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14].includes(playableCount);
    if (!isListeningState) {
      pc.ting.set(key, emptyResult);
      return emptyResult;
    }

    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);

    for (const { suit, value } of candidates) {
      const isWildCandidate = wildChecker({ suit, value, id: '', isFlower: false });
      const testTile: Tile = {
        id: `ting-preview-${suit}-${value}`,
        suit, value,
        isFlower: suit === TileSuit.FLOWER && !isWildCandidate
      };
      const winCheck = canWin([...player.hand.concealedTiles, testTile], player.hand.exposedMelds, winWildArg, undefined, game.wildTileGroup);
      if (!winCheck.canWin) continue;

      const discardOptions = this.getCachedWinOptions(game, player, 'discard', { extraTile: testTile, isRobbingKong: false });
      const selfDrawOptions = this.getCachedWinOptions(game, player, 'self_draw', { extraTile: testTile, isKongFlower: false });
      const bestDiscard = discardOptions[0] || null;
      const bestSelfDraw = selfDrawOptions[0] || null;
      const bestOverall = [bestDiscard, bestSelfDraw].filter(Boolean).sort((a, b) => (b!.score ?? 0) - (a!.score ?? 0))[0] || null;

      winningTileMap.set(`${suit}-${value}`, {
        tile: testTile,
        remainingCount: 0,
        bestDiscardOption: bestDiscard,
        bestSelfDrawOption: bestSelfDraw,
        bestOverallOption: bestOverall
      });
    }

    const result: TingResult = {
      isTing: winningTileMap.size > 0,
      winningTiles: filterBigDiaoPreviewTiles(game, player, [...winningTileMap.values()])
    };
    pc.ting.set(key, result);
    return result;
  }
}
