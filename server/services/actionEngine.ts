/**
 * ActionEngine - action execution
 * Extracted from gameManager.ts
 */

import { randomUUID } from 'crypto';
import type { GameState, Player, ActionType, PendingAction, Tile, TileSuit, HandType, Meld, MeldType, WinOption } from '../types/game';
import { GamePhase, PlayerStatus } from '../types/game';
import { GameEndReason } from '../types/game';
import { isConcealedDiscardState, tileLabel, buildMeldSignature, buildTileSignature, isDaDiao } from '../utils/gameHelpers';
import { tilesEqual, removeTile, isFlower } from '../utils/tiles';
import { canWin, isTing, detectHandTypes, buildWildTileChecker, checkChowPongExclusion, updateChowPongExclusion } from '../utils/handValidator';
import { calculateRoundMultiplier, calculateGlobalMultiplier } from '../utils/scoring';
import { formatBeijingTime } from '../utils/beijingTime';

export class ActionEngine {
  private gm: any;

  constructor(gm: any) {
    this.gm = gm;
  }

  private mutualBailout: Map<string, Map<string, Map<string, number>>> = new Map();

  // Pending action超时处理(自动推进)
  private pendingActionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // 原子锁：防止同一游戏并发重复消费 pending actions
  private actionResolutionLocks: Set<string> = new Set();

  private detachTimer<T extends ReturnType<typeof setTimeout>>(timer: T): T {
    (timer as any)?.unref?.();
    return timer;
  }

  private isConcealedDiscardState = isConcealedDiscardState;

  private canPlayerDrawOnCurrentTurn(game: GameState, player: Player): boolean {
    return game.phase === GamePhase.PLAYING
      && game.players[game.currentPlayerIndex]?.id === player.id
      && !game.drawnThisTurn
      && this.getPlayableTileCount(player) < 14
      && game.wall.length > 0;
  }

  private hasActiveHuSelectionLock(game: GameState, excludePlayerId?: string): boolean {
    const locks = game.huSelectionLocks || {};
    return Object.keys(locks).some(playerId => playerId !== excludePlayerId && Number(locks[playerId]) > 0);
  }

  private hasBlockingDecisionLock(game: GameState, playerId: string): boolean {
    if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now() && game.thinkFreezePlayerId !== playerId) {
      return true;
    }
    return this.hasActiveHuSelectionLock(game, playerId);
  }

  async setHuSelectionLock(gameId: string, playerId: string, locked: boolean): Promise<void> {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const nextLocks = { ...(game.huSelectionLocks || {}) };
    if (locked) {
      nextLocks[playerId] = Date.now();
    } else {
      delete nextLocks[playerId];
    }
    game.huSelectionLocks = Object.keys(nextLocks).length ? nextLocks : undefined;
    await this.persistGame(game);
    console.log('[timing-startGame] persistGame:', Date.now() - _startGameTimer, 'ms');
        this.broadcastGameState(gameId);
    console.log('[timing-startGame] broadcastGameState:', Date.now() - _startGameTimer, 'ms');
      }

  private isSharedDrawClaimWindow(game: GameState, playerId: string): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    const playerPending = game.pendingActions.filter(pa => pa.playerId === playerId);
    if (playerPending.length === 0) return false;
    if (game.pendingActions.some(pa => pa.playerId !== playerId)) return false;
    return playerPending.every(pa =>
      pa.availableActions.length > 0 &&
      pa.availableActions.every(action => action === ActionType.CHOW || action === ActionType.PASS)
    );
  }

  private isChowOnlyPendingTurn(game: GameState, playerId: string): boolean {
    if (game.players[game.currentPlayerIndex]?.id !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    return game.pendingActions.every(pa =>
      pa.playerId === playerId &&
      pa.availableActions.every(action => action === ActionType.CHOW || action === ActionType.PASS)
    );
  }

  private canCurrentTurnPlayerDrawDuringPending(game: GameState, playerId: string): boolean {
    void game;
    void playerId;
    return false;
  }

  private canExposeCurrentTurnPlayerDrawDuringPending(game: GameState, playerId: string): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    if (game.drawnThisTurn) return false;
    return this.canPlayerDrawOnCurrentTurn(game, currentPlayer);
  }

  private canExecuteCurrentTurnPlayerDrawDuringPending(game: GameState, playerId: string, now = Date.now()): boolean {
    void now;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (!this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId)) return false;
    return game.pendingActions.length > 0 && game.pendingActions.every(pa => pa.playerId === playerId);
  }

  private shouldAdvanceTurnAfterPass(game: GameState): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== PlayerStatus.PLAYING) return false;
    return !this.isConcealedDiscardState(currentPlayer) && !this.canPlayerDrawOnCurrentTurn(game, currentPlayer);
  }

  private shouldRetainCurrentPlayerChowPending(game: GameState, pendingAction: PendingAction): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || pendingAction.playerId !== currentPlayer.id) return false;
    return this.isSharedDrawClaimWindow(game, currentPlayer.id)
      && pendingAction.availableActions.every(action => action === ActionType.CHOW || action === ActionType.PASS);
  }

  /**
   * 按第5条规则清除过期claim：
   * - 当前摸牌方（下家B）的所有claim永远不清除
   * - 其他玩家（C/D）的过期claim清除
   * - 如果决策期内有动作触发（hasTriggeredAction），不清除任何claim
   */
  private clearExpiredClaimsButKeepCurrentPlayerChow(game: GameState, now = Date.now()): void {
    if ((game as any).hasTriggeredAction) {
      // 决策期内有动作 → 不清除任何claim
      return;
    }
    const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
    game.pendingActions = game.pendingActions.filter(pendingAction => {
      if (!pendingAction.expiresAt || pendingAction.expiresAt > now) return true; // 未过期保留
      if (pendingAction.playerId === currentPlayerId) return true; // 下家B永远保留
      // 【修复】人类玩家的过期claim也保留——玩家可能在犹豫或操作选择中
      const player = game.players.find(p => p.id === pendingAction.playerId);
      if (player && !this.isPlayerBotControlled(player)) return true;
      return false; // bot玩家的过期claim清除
    });
    game.pengChowConflict = null;
    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
    }
  }

  /**
   * 清除当前玩家已过期的吃牌待处理动作。
   * 【重要】对于人类玩家，即使过期也不清除——玩家可能正在吃牌选择器中做选择，
   * 清除会导致前端丢失状态（玩家已点"吃"、选择中，却被摸倒计时清除了）。
   * 人类玩家应通过自己摸牌、过牌或确认吃牌来自然清除。bot 的吃牌过期则正常清除。
   */
  private clearExpiredCurrentPlayerChowPending(game: GameState, now = Date.now()): boolean {
    const before = game.pendingActions.length;
    const currentPlayer = game.players[game.currentPlayerIndex];
    const isHumanPlayer = currentPlayer && !this.isPlayerBotControlled(currentPlayer);
    game.pendingActions = game.pendingActions.filter(pendingAction => {
      if (!this.shouldRetainCurrentPlayerChowPending(game, pendingAction)) return true;
      const expiresAt = typeof pendingAction.expiresAt === 'number' ? pendingAction.expiresAt : 0;
      if (expiresAt > now) return true; // 未过期 -> 保留
      // 【修复】人类玩家的过期吃牌不清除，让玩家自行操作
      if (isHumanPlayer) return true;
      return false; // bot 过期吃牌 -> 清除
    });
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }

  private clearCurrentPlayerChowPending(game: GameState): boolean {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter(pendingAction => !this.shouldRetainCurrentPlayerChowPending(game, pendingAction));
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }

  private clearExpiredClaimsForDecisionWindow(game: GameState, now = Date.now()): void {
    if ((game as any).hasTriggeredAction) return;
    const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
    game.pendingActions = game.pendingActions.filter(pendingAction => {
      if (!pendingAction.expiresAt || pendingAction.expiresAt > now) return true;
      return pendingAction.playerId === currentPlayerId;
    });
    game.pengChowConflict = null;
    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
    }
  }

  private clearCurrentTurnPendingActions(game: GameState, playerId: string): boolean {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter(pendingAction => pendingAction.playerId !== playerId);
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }

  private autoDrawForCurrentPlayer(game: GameState): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== PlayerStatus.PLAYING) return false;
    if (!this.canPlayerDrawOnCurrentTurn(game, currentPlayer)) return false;

    this.replaceInitialFlowers(game, currentPlayer);
    const totalTileCount = this.getPlayableTileCount(currentPlayer);
    if (totalTileCount >= 14) {
      game.drawnThisTurn = true;
      return true;
    }

    this.handleDraw(game, currentPlayer);
    game.drawnThisTurn = true;
    return true;
  }

  private canPlayerDeclareTurnHu(game: GameState, player: Player): boolean {
    if (!game.drawnThisTurn) return false;
    if ((player as any).lastDrawnTile) return true;
    const lastAction = game.actionHistory[game.actionHistory.length - 1];
    return !!lastAction && lastAction.playerId === player.id && lastAction.type === ActionType.DRAW;
  }

  private getConcealedPlayableTiles(game: GameState, player: Player): Tile[] {
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    return player.hand.concealedTiles.filter(tile => !isFlower(tile) || isWildTile(tile));
  }

  private isListeningPreviewState(game: GameState, player: Player): boolean {
    const concealedPlayableCount = this.getConcealedPlayableTiles(game, player).length;
    return [1, 4, 7, 10, 13].includes(concealedPlayableCount);
  }

  private isDaDiaoReadyState(game: GameState, player: Player): boolean {
    return this.getConcealedPlayableTiles(game, player).length === 1;
  }

  private filterBigDiaoPreviewTiles(
    game: GameState,
    player: Player,
    winningTiles: Array<{
      tile: Tile;
      remainingCount: number;
      bestDiscardOption: WinOption | null;
      bestSelfDrawOption: WinOption | null;
      bestOverallOption: WinOption | null;
    }>
  ) {
    if (!this.isDaDiaoReadyState(game, player)) return winningTiles;

    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const visibleTiles = [
      ...player.hand.concealedTiles.filter(tile => !isWildTile(tile) && !isFlower(tile)),
      ...player.hand.exposedMelds.flatMap(meld => meld.tiles || []).filter(tile => !isWildTile(tile) && !isFlower(tile))
    ];
    const numberSuits = new Set(visibleTiles
      .filter(tile => tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS)
      .map(tile => tile.suit));
    const hasHonor = visibleTiles.some(tile => tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON);

    if (numberSuits.size !== 1 || hasHonor) return winningTiles;

    const [lockedSuit] = [...numberSuits];
    return winningTiles.filter(entry => entry.tile.suit === lockedSuit);
  }

  // Freeze/dealer auto-draw timers(需要在新局开始时清除)
  private freezeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // AI托管模式:玩家ID集合,被标记的玩家由AI自动出牌
  private botModePlayers: Set<string> = new Set();
  private winEvaluationCache: Map<string, Map<string, {
    fast: Map<string, { canWin: boolean; types: HandType[] }>;
    options: Map<string, WinOption[]>;
    ting: Map<string, {
      isTing: boolean;
      winningTiles: Array<{
        tile: Tile;
        remainingCount: number;
        bestDiscardOption: WinOption | null;
        bestSelfDrawOption: WinOption | null;
        bestOverallOption: WinOption | null;
      }>;
    }>;
  }>> = new Map();

  private getPlayerWinCache(gameId: string, playerId: string) {
    if (!this.winEvaluationCache.has(gameId)) {
      this.winEvaluationCache.set(gameId, new Map());
    }
    const gameCache = this.winEvaluationCache.get(gameId)!;
    if (!gameCache.has(playerId)) {
      gameCache.set(playerId, {
        fast: new Map(),
        options: new Map(),
        ting: new Map()
      });
    }
    return gameCache.get(playerId)!;
  }

  private invalidateWinEvaluationCache(gameId: string, playerIds?: string[]): void {
    if (!playerIds || playerIds.length === 0) {
      this.winEvaluationCache.delete(gameId);
      return;
    }

    const gameCache = this.winEvaluationCache.get(gameId);
    if (!gameCache) return;
    for (const playerId of playerIds) {
      gameCache.delete(playerId);
    }
    if (gameCache.size === 0) {
      this.winEvaluationCache.delete(gameId);
    }
  }

  private buildTileSignature(tiles: Tile[]): string {
    return tiles
      .map(tile => `${tile.suit}:${tile.value}`)
  }

  private buildMeldSignature(melds: Meld[]): string {
    return melds
      .map(meld => `${meld.type}:${meld.isConcealed ? '1' : '0'}:${this.buildTileSignature(meld.tiles)}`)
      .sort()
      .join('|');
  }

  private getPlayerFlowerTiles(player: Player): Tile[] {
    return player.hand.exposedMelds
      .flatMap(meld => meld.tiles)
      .filter(tile => isFlower(tile));
  }

  private isPlayerMenQing(player: Player): boolean {
    return !player.hand.exposedMelds.some(meld =>
      meld.type === MeldType.TRIPLET ||
      meld.type === MeldType.SEQUENCE ||
      (meld.type === MeldType.KONG && !meld.isConcealed)
    );
  }

  private getPlayerWinContextKey(game: GameState, player: Player): string {
    return [
      `concealed=${this.buildTileSignature(player.hand.concealedTiles)}`,
      `melds=${this.buildMeldSignature(player.hand.exposedMelds)}`,
      `flowers=${this.getPlayerFlowerTiles(player).length}`,
      `wild=${game.customScoringMode || ''}`,
      `wildGroup=${(game.wildTileGroup || []).join(',')}`,
      `round=${game.roundMultiplier ?? 1}`,
      `inherit=${game.inheritMultiplier ?? 1}`,
      `settlement=${game.settlementMultiplier ?? 1}`
    ].join('|');
  }

  private getWinWildArg(game: GameState): string | null {
    return (game.customScoringMode || null);
  }

  private getCachedWinCheck(game: GameState, player: Player): { canWin: boolean; types: HandType[] } {
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = this.getPlayerWinContextKey(game, player);
    const cached = playerCache.fast.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = canWin(player.hand.concealedTiles, player.hand.exposedMelds, this.getWinWildArg(game));
    playerCache.fast.set(cacheKey, result);
    return result;
  }

  private getCachedWinOptions(
    game: GameState,
    player: Player,
    context: 'self_draw' | 'discard',
    flags?: { isKongFlower?: boolean; isRobbingKong?: boolean; extraTile?: Tile }
  ): WinOption[] {
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = [
      this.getPlayerWinContextKey(game, player),
      `ctx=${context}`,
      `kongFlower=${flags?.isKongFlower ? 1 : 0}`,
      `robKong=${flags?.isRobbingKong ? 1 : 0}`,
      `extra=${flags?.extraTile ? `${flags.extraTile.suit}-${flags.extraTile.value}` : ''}`
    ].join('|');
    const cached = playerCache.options.get(cacheKey);
    if (cached) {
      return cached;
    }

    const handTiles = flags?.extraTile
      ? [...player.hand.concealedTiles, flags.extraTile]
      : player.hand.concealedTiles;
    const winCheck = flags?.extraTile
      ? canWin(handTiles, player.hand.exposedMelds, this.getWinWildArg(game))
      : this.getCachedWinCheck(game, player);
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts?.[0] ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts?.[1] ? parseInt(wildParts[1], 10) : undefined;
    const allOptions = generateWinOptions({
      handTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles: this.getPlayerFlowerTiles(player),
      handTypes: winCheck.types,
      isKongFlower: !!flags?.isKongFlower,
      isRobbingKong: !!flags?.isRobbingKong,
      isMenQing: this.isPlayerMenQing(player),
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

    playerCache.options.set(cacheKey, topOptions);
    return topOptions;
  }

  private prewarmWinEvaluation(
    game: GameState,
    player: Player,
    context: 'self_draw' | 'discard',
    extraTile?: Tile
  ): void {
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

  private getWinningTileCandidates(): Array<{ suit: TileSuit; value: number }> {
    const candidates: Array<{ suit: TileSuit; value: number }> = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let value = 1; value <= 9; value++) {
        candidates.push({ suit, value });
      }
    }
    for (let value = 1; value <= 4; value++) {
      candidates.push({ suit: TileSuit.WIND, value });
    }
    for (let value = 1; value <= 3; value++) {
      candidates.push({ suit: TileSuit.DRAGON, value });
    }
    return candidates;
  }

  private getTingPreviewCandidates(game: GameState, player: Player): Array<{ suit: TileSuit; value: number }> {
    const candidates = this.getWinningTileCandidates();
    if (game.customScoringMode?.startsWith(`${TileSuit.FLOWER}-`) && Array.isArray(game.wildTileGroup)) {
      for (const valueText of game.wildTileGroup) {
        const value = parseInt(valueText, 10);
        if (!Number.isNaN(value) && value >= 1 && value <= 8) {
          candidates.push({ suit: TileSuit.FLOWER, value });
        }
      }
    }
    // 根据玩家手牌过滤：只保留玩家当前持有花色+风牌+箭牌的候选，避免列出所有牌面
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const playerSuits = new Set<TileSuit>();
    for (const tile of player.hand.concealedTiles) {
      if (!isFlower(tile) && !isWildTile(tile)) playerSuits.add(tile.suit);
    }
    for (const meld of player.hand.exposedMelds) {
      for (const tile of meld.tiles) {
        if (!isFlower(tile) && !isWildTile(tile)) playerSuits.add(tile.suit);
      }
    }
    // 多花色（2+数字花色）则不限制,否则只保留匹配花色+风牌+箭牌
    const numberSuits = [...playerSuits].filter(s => s !== TileSuit.WIND && s !== TileSuit.DRAGON);
    const multiNumberSuit = numberSuits.length >= 2;
    if (!multiNumberSuit) {
      return candidates.filter(c => {
        if (c.suit === TileSuit.WIND || c.suit === TileSuit.DRAGON) return true;
        if (c.suit === TileSuit.FLOWER) return true;
        return playerSuits.has(c.suit);
      });
    }
    return candidates;
  }

  private getTileMaxCopies(suit: TileSuit): number {
    return suit === TileSuit.FLOWER ? 1 : 4;
  }

  private getVisibleRemainingCount(game: GameState, player: Player, suit: TileSuit, value: number): number {
    const visibleCount =
      player.hand.concealedTiles.filter(tile => tile.suit === suit && tile.value === value).length +
      game.discardPile.filter(tile => tile.suit === suit && tile.value === value).length +
      game.players.flatMap(p => p.hand.exposedMelds).flatMap(meld => meld.tiles).filter(tile => tile.suit === suit && tile.value === value).length;
    return Math.max(0, this.getTileMaxCopies(suit) - visibleCount);
  }

  private quickPrecheckTenpai(game: GameState, player: Player): boolean {
    // 1) 巡目门槛：前 3 巡几乎不可能听牌，跳过计算
    const discardCount = game.discardPile.length;
    const playerCount = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    const calculatedRound = Math.max(1, Math.ceil(discardCount / Math.max(1, playerCount)));
    if (calculatedRound < 3) {
      return false;
    }

    // 2) 特殊牌型始终计算（不跳过）
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const concealed = player.hand.concealedTiles;
    // 统计四百搭和八花
    const wildCount = concealed.filter(t => isWildTile(t)).length;
    const flowerCount = concealed.filter(t => isFlower(t)).length;
    if (wildCount >= 4) return true;   // 四百搭，跳过粗筛
    if (flowerCount >= 8) return true; // 八花，跳过粗筛

    // 3) 孤牌检测——只针对非百搭非花牌的数字牌
    // 先过滤出有效牌：不花牌且非百搭的数字牌、风牌、箭牌
    const nonWildNonFlower = concealed.filter(t => !isFlower(t) && !isWildTile(t));

    // 统计每张牌出现次数（找对子）
    const valueCounts = new Map<string, number>();
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }

    // 统计有几门数字牌
    const numberSuits = new Set<string>();
    for (const t of nonWildNonFlower) {
      if (t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON) {
        numberSuits.add(t.suit);
      }
    }
    const hasMultipleNumberSuits = numberSuits.size >= 2;

    // 计算孤牌数
    let orphanCount = 0;
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      if (valueCounts.get(key)! >= 2) continue; // 有对子 → 不是孤牌
      if (t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON) {
        orphanCount++; // 风牌/箭牌无对子即孤牌
        continue;
      }
      // 数牌：检查 ±1 有无同花色邻牌
      const prevKey = `${t.suit}-${t.value - 1}`;
      const nextKey = `${t.suit}-${t.value + 1}`;
      if (!valueCounts.has(prevKey) && !valueCounts.has(nextKey)) {
        orphanCount++;
      }
    }

    if (wildCount === 0) {
      // 无百搭：任意 2+ 孤牌即可跳过
      if (orphanCount >= 2) return false;
      // 无百搭 + 两门数字牌 + 任一门有孤牌 → 跳过
      if (hasMultipleNumberSuits && orphanCount >= 1) return false;
      return true;
    }

    // wildCount 为 1 的情况（>=4 的已经在上面 return true 了）
    // 1百搭 + 有两门数字牌 + 有 2+ 孤牌 → 跳过
    if (hasMultipleNumberSuits && orphanCount >= 2) return false;

    return true;
  }

  private getCachedTingPreview(game: GameState, player: Player) {
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = `${this.getPlayerWinContextKey(game, player)}|ting-preview`;
    const cached = playerCache.ting.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 快速粗筛：巡目门槛 + 孤牌检查
    if (!this.quickPrecheckTenpai(game, player)) {
      const emptyResult = { isTing: false, winningTiles: [] as Array<{
        tile: Tile;
    const base = this.getHesitationWindow(game);
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, base));
    }
    return base;
  }

  private getBotDiscardDelayMs(game: GameState): number {
    const base = this.getHesitationWindow(game);
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, base));
    }
    const reducedBase = Math.max(250, Math.floor(base / 2));
    return reducedBase + Math.floor(Math.random() * 250);
  }

  private isChowChoiceOnlyActions(actions: ActionType[]): boolean {
    return actions.includes(ActionType.CHOW) &&
      !actions.some(action => [
        ActionType.HU,
        ActionType.PENG,
        ActionType.KONG,
        ActionType.CONCEALED_KONG,
        ActionType.EXTENDED_KONG
      ].includes(action));
  }

  private getPendingActionExpiresAt(game: GameState, actions: ActionType[]): number {
    return Date.now() + this.getHesitationWindow(game);
  }

  private getHumanClaimDecisionTimeoutMs(game: GameState, player: Player, actions: ActionType[]): number {
    return this.getHesitationWindow(game);
  }

  private getPendingActionWaitMs(gameId: string): number {
    const game = this.games.get(gameId);
    if (!game?.pendingActions.length) return this.getHesitationWaitMs(gameId);
    const now = Date.now();
    const nextExpiresAt = Math.min(
      ...game.pendingActions.map(pa =>
        typeof pa.expiresAt === 'number' ? pa.expiresAt : now + this.getHesitationWindow(game)
      )
    );
    return Math.max(0, nextExpiresAt - now);
  }

  setWebSocketManager(manager: any) {
    this.wsManager = manager;
  }

  // ===== AI托管模式控制 =====
  /**
   * 判断玩家是否被AI托管(包括本身是bot玩家,或被手动标记为AI托管)
   */
  private isPlayerBotControlled(player: Player): boolean {
    return isBotPlayer(player) || this.botModePlayers.has(player.id);
  }

  /**
   * 启用AI托管模式
   */
  enableBotMode(gameId: string, playerId: string): void {
    this.botModePlayers.add(playerId);
    // 记录本局被AI接管的玩家(用于结算减半)
    const game = this.games.get(gameId);
    if (game) {
      if (!game.botTakeoverPlayers) game.botTakeoverPlayers = [];
      if (!game.botTakeoverPlayers.includes(playerId)) {
        game.botTakeoverPlayers.push(playerId);
      }
    }
    // 立即由 AI 开始出牌
    this.scheduleBotDiscard(gameId, playerId);
  }

  /**
   * 禁用AI托管模式(玩家回来)
   */
  disableBotMode(playerId: string): void {
    this.botModePlayers.delete(playerId);
  }

  /**
   * 检查玩家是否处于AI托管模式
   */
  isPlayerInBotMode(playerId: string): boolean {
    return this.botModePlayers.has(playerId);
  }

  private clearPendingActionTimer(gameId: string): void {
    const timer = this.pendingActionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.pendingActionTimers.delete(gameId);
    }
  }

  private currentTurnPlayerHasPendingClaims(game: GameState): boolean {
    const currentPlayerId = game.players[game.currentPlayerIndex]?.id;
    if (!currentPlayerId) return false;
    return game.pendingActions.some(pa => pa.playerId === currentPlayerId);
  }

  private refreshPendingActionExpirations(
    game: GameState,
    now = Date.now(),
    predicate?: (pendingAction: PendingAction) => boolean
  ): void {
    const nextExpiresAt = now + this.getHesitationWindow(game);
    for (const pendingAction of game.pendingActions) {
      if (predicate && !predicate(pendingAction)) continue;
      pendingAction.expiresAt = Math.max(
        typeof pendingAction.expiresAt === 'number' ? pendingAction.expiresAt : 0,
        nextExpiresAt
      );
    }
  }

  private schedulePendingActionTimeout(gameId: string): void {
    this.clearPendingActionTimer(gameId);

    // 等freeze延迟(1000ms)结束后才开始pending计时
    // 这样human玩家在freeze期间看清UI后,还有完整的1s反应时间
    const timer = this.detachTimer(setTimeout(async () => {
      // 原子保护：若已在消费中则忽略本次触发
      if (this.actionResolutionLocks.has(gameId)) return;
      this.actionResolutionLocks.add(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (!game.pendingActions.length) return;

        if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now()) {
          this.schedulePendingActionTimeout(gameId);
          return;
        }

        // 审批流进行中时,不要提前PASS清空pending,否则会打断5秒审批窗口
        if (game.pengChowConflict) {
          this.schedulePendingActionTimeout(gameId);
          return;
        }

        // 修复竞态:如果牌已被bot吃/碰消耗(discardPile变短),不要auto-pass
        // handleBotPendingActions已经处理了,此时pending是新的
        const pendingTiles = game.pendingActions.map(pa => pa.tile?.id).filter(Boolean);
        const discardIds = new Set(game.discardPile.map(t => t.id));
        const tileClaimed = pendingTiles.some(tid => tid && !discardIds.has(tid));
        if (tileClaimed) {
          // 牌已被claim,pending已过时,直接清除
          game.pendingActions = [];
          await this.persistGame(game);
          return;
        }

        const allClaimMode = (game as any).allClaimMode;
        const now = Date.now();
        const currentPlayer = game.players[game.currentPlayerIndex];
        const expired = game.pendingActions.filter(pa =>
          (!pa.expiresAt || pa.expiresAt <= now)
        );
        const hasTriggeredAction = !!(game as any).hasTriggeredAction;

        if (allClaimMode) {
          const pending = game.pendingActions;
          const resolvedPlayerIds = new Set<string>();
          for (const pa of pending) {
            const player = game.players.find(p => p.id === pa.playerId);
            if (!player || !this.isPlayerBotControlled(player)) continue;
            await this.resolvePendingAction(game, player, pa);
            resolvedPlayerIds.add(player.id);
          }
          if (resolvedPlayerIds.size === 0) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
            return;
          }
          game.pendingActions = game.pendingActions.filter(pa => !resolvedPlayerIds.has(pa.playerId));
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          if (game.pendingActions.length > 0) {
            this.schedulePendingActionTimeout(gameId);
            return;
          }
          if (currentPlayer && this.isPlayerBotControlled(currentPlayer) && this.autoDrawForCurrentPlayer(game)) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
          }
          return;
        }

        if (hasTriggeredAction) {
          this.refreshPendingActionExpirations(game, now);
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          this.schedulePendingActionTimeout(gameId);
          return;
        }

        this.clearExpiredClaimsForDecisionWindow(game, now);
        if (game.pendingActions.length === 0) {
          if (currentPlayer && this.isPlayerBotControlled(currentPlayer) && this.autoDrawForCurrentPlayer(game)) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
            this.scheduleBotDiscard(gameId, currentPlayer.id);
            return;
          }
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          return;
        }
        // 【优化】如果只剩当前人类玩家的吃牌待处理，不再重复调度定时器
        // 玩家会通过主动摸牌/过牌/确认吃牌来触发下一步
        if (currentPlayer && this.canExecuteCurrentTurnPlayerDrawDuringPending(game, currentPlayer.id)) {
          if (this.isPlayerBotControlled(currentPlayer)) {
            this.clearCurrentTurnPendingActions(game, currentPlayer.id);
            if (this.autoDrawForCurrentPlayer(game)) {
              await this.persistGame(game);
              this.broadcastGameState(gameId);
              this.scheduleBotDiscard(gameId, currentPlayer.id);
              return;
            }
          }
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          return;
        }
        this.schedulePendingActionTimeout(gameId);
        await this.persistGame(game);
        this.broadcastGameState(gameId);
      } catch (err) {
        console.error('Failed to auto-resolve pending actions:', err);
      } finally {
        this.actionResolutionLocks.delete(gameId);
        if (this.pendingActionTimers.get(gameId) === timer) {
          this.pendingActionTimers.delete(gameId);
        }
      }
    }, this.getPendingActionWaitMs(gameId))); // 决策犹豫期(训练模式可加速)

    this.pendingActionTimers.set(gameId, timer);
  }

  /**
   * 让 bot 处理自己的 pending action(碰/杠/胡/吃/过)
   * Bug修复:bot必须等满 hesitationWindow 再 action,否则人类按钮闪现消失
   */
    const action = await shouldClaimPendingAction(player, pa.availableActions, game);
    console.log(`[PendingResolve] ${player.name} → ${action}`);
    if (action === ActionType.PASS) {
      this.handlePass(game, player);
    } else if (action === ActionType.PENG) {
      const pengExposed = this.countExposedTilesExcludingFlowerMelds(player);
      const pengTotal = player.hand.concealedTiles.length + pengExposed;
      if (pengTotal - 2 + 3 <= 14) { this.handlePeng(game, player); }
      else { this.handlePass(game, player); }
    } else if (action === ActionType.CHOW) {
      const chowExposed = this.countExposedTilesExcludingFlowerMelds(player);
      const chowTotal = player.hand.concealedTiles.length + chowExposed;
      if (chowTotal - 2 + 3 <= 14) {
        console.log(`[PendingResolve] ${player.name} executing CHOW (concealed=${player.hand.concealedTiles.length}, exposed=${chowExposed})`);
        this.handleChow(game, player, pa.selectedChowTileIds);
      } else {
        console.warn(`[PendingResolve] ${player.name} CHOW blocked: would exceed 14 tiles (total=${chowTotal})`);
        this.handlePass(game, player);
      }
    } else if (action === ActionType.HU) {
      await this.handleHu(game, player);
    } else {
      this.handlePass(game, player);
    }
  }

  /** bot 训练模式专用 */

  private countExposedTilesExcludingFlowerMelds(player: Player): number {
    return player.hand.exposedMelds.reduce((sum, m) => {
      if (m.tiles.length === 1 && isFlower(m.tiles[0])) return sum;
      if (m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG) return sum + 3;
      return sum + m.tiles.length;
    }, 0);
  }

  private getPlayableTileCount(player: Player): number {
    return player.hand.concealedTiles.length + this.countExposedTilesExcludingFlowerMelds(player);
  }

  /**
   * 实战模式：bot 高优先级动作（碰/杠/胡）立即执行，但不破坏人类玩家的决策窗口
   * 
   * 核心规则：
   * 1. bot 的碰/杠/胡可以立即执行（不需要等满 hesitationWindow）
   * 2. 执行后保留人类玩家的 pending 状态，特别是胡按钮必须在决策期内保持可用
   * 3. 人类玩家的吃按钮可以被清除（因为碰/杠/胡优先级更高）
   * 4. 人类的胡按钮必须在 hesitationWindow 内保持可用，等人类自己响应或超时
   */
  private async handleBotPendingActions(gameId: string): Promise<void> {
    // 原子保护：若 timer 已在消费则跳过
    if (this.actionResolutionLocks.has(gameId)) return;
    const game = this.games.get(gameId);
    if (!game) return;

    // 立即同步处理 bot 的高优先级动作（碰/杠/胡），不等延迟
    try {
      if (game.phase !== GamePhase.PLAYING) return;
      if (game.pendingActions.length === 0) return;

      let claimedHigherPriority = false; // 碰/杠/胡是否已被bot执行

      // 保存人类玩家的 pending（bot 的 claim 不应清除人类的犹豫窗口）
      const humanPendingActions = game.pendingActions.filter(pa => {
        const p = game.players.find(pl => pl.id === pa.playerId);
        return p && !this.isPlayerBotControlled(p);
      });

      // 第一轮：bot 处理碰/杠/胡（高优先级，立即执行）
      for (const pa of [...game.pendingActions]) {
        const player = game.players.find(p => p.id === pa.playerId);
        if (!player || player.status !== PlayerStatus.PLAYING) continue;
        if (!this.isPlayerBotControlled(player)) continue;

        const higherActions = pa.availableActions.filter(
          a => a === ActionType.PENG || a === ActionType.KONG || a === ActionType.HU
        );
        if (higherActions.length === 0) continue;

        const filteredHigherActions = higherActions.filter((candidate) => {
          if (candidate !== ActionType.HU) return true;
          const winOptions = this.getCachedWinOptions(game, player, 'discard', {
            isRobbingKong: !!game.pendingKongClaim
          });
          return winOptions.length > 0;
        });
        if (filteredHigherActions.length === 0) {
          if (pa.availableActions.includes(ActionType.CHOW)) continue;
          this.handlePass(game, player);
          continue;
        }

        const action = await shouldClaimPendingAction(player, filteredHigherActions, game);
        console.log(`[BotService] ${player.name} priority action: ${action} (from ${filteredHigherActions})`);

        if (action === ActionType.PENG) {
          const pengExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
          if (pengTotalCount - 2 + 3 <= 14) {
            this.handlePeng(game, player);
            claimedHigherPriority = true;
          } else {
            console.warn(`[BotPeng] ${player.name} blocked: would exceed 14 tiles`);
            this.handlePass(game, player);
          }
        } else if (action === ActionType.KONG) {
          const kongExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 <= 14) {
            this.handleKong(game, player, pa.tile?.id || '');
            claimedHigherPriority = true;
          } else {
            console.warn(`[BotKong] ${player.name} blocked: would exceed 14 tiles`);
            this.handlePass(game, player);
          }
        } else if (action === ActionType.HU) {
          try {
            await this.handleHu(game, player);
            claimedHigherPriority = true;
          } catch (err: any) {
            console.warn(`[BotHu] ${player.name} skipped invalid hu: ${err?.message || err}`);
            this.handlePass(game, player);
          }
        }
      }

      // bot 执行高优先级动作后：
      // - 如果 bot 胡了：游戏进入胡牌流程，pending 由 handleHu 处理
      // - 如果 bot 碰/杠了：tile 被消耗，人类的吃按钮应被清除（优先级低）
      //   但人类的胡按钮必须保留，等人类在 hesitationWindow 内响应
      if (claimedHigherPriority) {
        // 清除 bot 自己的 pending
        const botIds = new Set(game.players.filter(p => this.isPlayerBotControlled(p)).map(p => p.id));
        game.pendingActions = game.pendingActions.filter(pa => !botIds.has(pa.playerId));
        // 人类的 pending（特别是胡）保留，由 schedulePendingActionTimeout 的 5 秒计时器处理
      } else {
        // bot 没有高优先级动作 → 清除 bot 的 pending，保留人类的
        const botIds = new Set(game.players.filter(p => this.isPlayerBotControlled(p)).map(p => p.id));
        game.pendingActions = game.pendingActions.filter(pa =>
          !botIds.has(pa.playerId) || pa.availableActions.includes(ActionType.CHOW)
        );
        const now = Date.now();
        for (const pa of game.pendingActions) {
          const pendingPlayer = game.players.find(p => p.id === pa.playerId);
          if (pendingPlayer && this.isPlayerBotControlled(pendingPlayer) && this.isChowChoiceOnlyActions(pa.availableActions)) {
            pa.selectedChowTileIds = pa.tile
              ? selectBotChowTileIds(pendingPlayer, game, pa.tile, pa.chowOptions)
              : undefined;
            pa.expiresAt = now + this.getHesitationWindow(game);
          }
        }
      }

      await this.persistGame(game);
      this.broadcastGameState(gameId);

      // 如果 bot 碰/杠成功，调度 bot 出牌
      if (claimedHigherPriority) {
        const claimingPlayer = game.players[game.currentPlayerIndex];
        if (claimingPlayer && this.isPlayerBotControlled(claimingPlayer)) {
          this.scheduleBotDiscard(gameId, claimingPlayer.id);
        }
        // 备份调度: 如果 scheduleBotDiscard 因pending残留无法出牌,
        // schedulePendingActionTimeout 提供退路
        this.schedulePendingActionTimeout(gameId);
      } else if (game.pendingActions.length === 0 && this.shouldAdvanceTurnAfterPass(game)) {
        // 所有 bot 都 PASS 且没有人类 pending 残留时，必须继续推进回合。
        // 否则会停在弃牌者身上，出现 "Skipped: pending cleared but turn not advanced" 卡死。
        await this.moveToNextPlayer(game);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    } catch (err) {
      console.error('[BotService] Pending action error:', err);
    }
  }

  /**
   * 记录吃/碰来源,检测互包关系
   */
  private recordBailoutAction(
    gameId: string,
    playerId: string,
    sourcePlayerId: string | undefined,
    meldType: MeldType
  ): number {
    if (!sourcePlayerId) return 0;
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
    return nextCount;
  }

  /**
   * 获取互包关系
   * @returns 三口/四口关系列表
   */
  getMutualBailoutRelations(gameId: string): Array<{
    player1: string;
    player2: string;
    type: '三口' | '四口';
  }> {
    const relations: Array<{ player1: string; player2: string; type: '三口' | '四口' }> = [];
    const gameBailout = this.mutualBailout.get(gameId);
    if (!gameBailout) return relations;

    const checked = new Set<string>();

    for (const [playerId, partnerCounts] of gameBailout) {
      for (const [partnerId, count] of partnerCounts) {
        const key = [playerId, partnerId].sort().join('-');
        if (checked.has(key)) continue;
        checked.add(key);

        // 检查双方互相的口数
        const countAtoB = gameBailout.get(playerId)?.get(partnerId) || 0;
        const countBtoA = gameBailout.get(partnerId)?.get(playerId) || 0;

        // 互包定义:单向三口或四口
        if (countAtoB >= 4 || countBtoA >= 4) {
          relations.push({ player1: playerId, player2: partnerId, type: '四口' });
        } else if (countAtoB >= 3 || countBtoA >= 3) {
          relations.push({ player1: playerId, player2: partnerId, type: '三口' });
        }
      }
    }

    return relations;
  }

  /** 检测新形成的互包关系并广播到牌局快讯 */
  checkAndBroadcastBailout(
    game: GameState,
    playerId: string,
    sourcePlayerId: string,
  ): void {
    const player = game.players.find(p => p.id === playerId);
    const source = game.players.find(p => p.id === sourcePlayerId);
    if (!player || !source) {
      console.log(`[BAILOUT] SKIP: player=${!!player} source=${!!source} playerId=${playerId} sourcePlayerId=${sourcePlayerId}`);
      return;
    }

    const rawCount = this.mutualBailout.get(game.gameId)?.get(playerId)?.get(sourcePlayerId);
    const currentCount = rawCount || 0;
    console.log(`[BAILOUT] game=${game.gameId} player=${player.name} source=${source.name} count=${currentCount} wsManager=${!!this.wsManager}`);

    const msgByCount: Record<number, string> = {
      2: `📣 ${player.name}搞了${source.name}两口了！`,
      3: `📣 ${player.name}搞了${source.name}三口了！！`,
      4: `📣 ${player.name}搞了${source.name}四口了！！！`
    };

    const msg = msgByCount[currentCount];
    if (msg) {
      this.broadcastQuickMessage(game.gameId, msg, 'special', 'bailout');
    }
  }

  /**
   * 检查两个玩家之间是否有互包关系
   */
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

  /**
   * 获取最后一张弃牌的玩家ID
   */
  private getLastDiscardPlayerId(game: GameState): string | undefined {
    if (game.lastDiscardPlayerId) {
      return game.lastDiscardPlayerId;
    }
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      if (game.actionHistory[i].type === ActionType.DISCARD) {
        return game.actionHistory[i].playerId;
      }
    }
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (lastDiscard) {
      const discarder = game.players.find(p => p.hand.discardedTiles.some(t => t.id === lastDiscard.id));
      if (discarder) return discarder.id;
      return game.players[game.currentPlayerIndex]?.id;
    }
    return undefined;
  }

  private getPlayerPosition(game: GameState, playerId: string): number {
    return game.players.find(p => p.id === playerId)?.position ?? 0;
  }

  private getLastDiscardPosition(game: GameState): number | undefined {
    if (typeof game.lastDiscardPosition === 'number') {
      return game.lastDiscardPosition;
    }
    const id = this.getLastDiscardPlayerId(game);
    if (!id) return undefined;
    return this.getPlayerPosition(game, id);
  }

  /**
   * 检测杠上开花:自摸且最近的非DRAW动作是杠牌
   * 流程:杠 → 自动补牌(可能补花再DRAW) → 玩家回合胡牌
   */
  private isWinAfterKong(game: GameState, playerId: string): boolean {
    const kongTypes = new Set([
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.PLAYING) {
      throw new Error('Game is not active');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 玩家已响应,取消当前自动超时推进
    this.clearPendingActionTimer(gameId);
    // 取消超时自动接管(玩家已操作)
    this.clearAutoTakeover(gameId, playerId);

    const gameAction: GameAction = {
      playerId,
      type: action,
      timestamp: Date.now()
    };

    if (game.huSelectionLocks?.[playerId]) {
      const nextLocks = { ...game.huSelectionLocks };
      delete nextLocks[playerId];
      game.huSelectionLocks = Object.keys(nextLocks).length ? nextLocks : undefined;
    }

    // 标记决策期内有动作触发（第5d条：有动作时不清除任何claim）
    // PASS 和 DRAW 不触发此标记
    if (action !== ActionType.PASS && action !== ActionType.DRAW) {
      (game as any).hasTriggeredAction = true;
    }

    switch (action) {
      case ActionType.DISCARD:
        {
          const currentTurnPlayer = game.players[game.currentPlayerIndex];
          if (!currentTurnPlayer || currentTurnPlayer.id !== player.id) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} is not current player (current=${currentTurnPlayer?.name ?? 'none'} index=${game.currentPlayerIndex})`
            );
            throw new Error('Not your turn to discard');
          }

          if (game.pendingActions.length > 0) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} attempted discard with pending actions unresolved (${game.pendingActions.length})`
            );
            throw new Error('Pending actions must resolve before discarding');
          }

          const concealedCount = player.hand.concealedTiles.length;
          if (!this.isConcealedDiscardState(player)) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} has invalid concealed count for discard (${concealedCount})`
            );
            throw new Error('Invalid hand state for discard');
          }
        }

        // 【状态机修复】未摸牌不可出牌
        if (!game.drawnThisTurn) {
          console.warn(`[DISCARD] Blocked: ${player.name} has not drawn yet this turn`);
          throw new Error('Must draw before discarding');
        }
        gameAction.tile = findTileById(player.hand.concealedTiles, tileId!);
        await this.handleDiscard(game, player, tileId!);
        break;

      case ActionType.DRAW:
        {
          const freezeUntil = Number((game as any)._freezeUntil ?? 0);
          if (freezeUntil > Date.now()) {
            console.warn(`[DRAW] Blocked: ${player.name} is still in hesitation freeze until ${freezeUntil}`);
            throw new Error('Draw is locked until the hesitation window ends');
          }
          if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now() && game.thinkFreezePlayerId !== player.id) {
            console.warn(`[DRAW] Blocked: ${player.name} is waiting for ${game.thinkFreezePlayerId} think freeze to end`);
            throw new Error('Draw is locked while another player is thinking');
          }
          if (this.hasActiveHuSelectionLock(game, player.id)) {
            console.warn(`[DRAW] Blocked: ${player.name} is waiting for another player's HU selection lock`);
            throw new Error('Draw is locked while another player is selecting a HU option');
          }
          if (game.pendingActions.length > 0 && !this.canExecuteCurrentTurnPlayerDrawDuringPending(game, player.id)) {
            console.warn(
              `[DRAW] Deferred: ${player.name} must wait for pending window to end before drawing`
            );
            throw new Error('Draw is not available until the current response window ends');
          }
        }
        {
          const currentTurnPlayer = game.players[game.currentPlayerIndex];
          if (!currentTurnPlayer || currentTurnPlayer.id !== player.id) {
            console.warn(
              `[DRAW] Blocked: ${player.name} is not current player (current=${currentTurnPlayer?.name ?? 'none'} index=${game.currentPlayerIndex})`
            );
            throw new Error('Not your turn to draw');
          }
          const unreplacedFlowers = player.hand.exposedMelds.filter(
            m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !(m as any).replacementDone
          );
          const hasPendingDrawWork = unreplacedFlowers.length > 0 || this.canPlayerDrawOnCurrentTurn(game, player);
          if (!hasPendingDrawWork) {
            console.warn(
              `[DRAW] Blocked: ${player.name} is not eligible to draw (drawn=${game.drawnThisTurn}, playable=${this.getPlayableTileCount(player)}, wall=${game.wall.length})`
            );
            throw new Error('Cannot draw in current state');
          }
        }
        // 【状态机修复】每回合最多摸一次，防同回合连续摸牌
        if (game.drawnThisTurn) {
          console.warn(`[DRAW] Blocked: ${player.name} already drew this turn (double-draw attempt)`);
          throw new Error('Already drew this turn');
        }
        // 先处理门口的花牌替换(花牌在门口占坑,需先补到手牌)
        if (game.pendingActions.length > 0 && this.canExecuteCurrentTurnPlayerDrawDuringPending(game, player.id)) {
          this.clearCurrentTurnPendingActions(game, player.id);
        }
        this.replaceInitialFlowers(game, player);
        // 替换后检查手牌+门口是否已满14张
        {
          const totalTileCount = this.getPlayableTileCount(player);
          if (totalTileCount >= 14) {
            console.warn(`[DRAW] Flower replacement already filled hand: player ${player.id} has ${totalTileCount} playable tiles`);
            game.drawnThisTurn = true; // 标记已处理过摸牌阶段，防止连续摸牌
            break;
          }
        }
        // 正常摸牌(摸到花牌会递归补花)
        this.handleDraw(game, player);
        game.drawnThisTurn = true;
        break;

      case ActionType.PENG:
        // 防止超限:碰牌后手牌不能超过14张
        {
          const pengExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
          if (pengTotalCount - 2 + 3 > 14) { // 碰牌从手牌拿2张+弃牌1张组成3张meld
            console.warn(`[PENG] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handlePeng(game, player);
        break;

      case ActionType.CHOW:
        // 防止超限:吃牌后手牌不能超过14张
        {
          const chowExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const chowTotalCount = player.hand.concealedTiles.length + chowExposedCount;
          if (chowTotalCount - 2 + 3 > 14) { // 吃牌从手牌拿2张+弃牌1张组成3张meld
            console.warn(`[CHOW] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handleChow(game, player, tileIds);
        break;

      case ActionType.KONG:
        {
          const kongExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 > 14) {
            console.warn(`[KONG] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handleKong(game, player, tileId!);
        break;

      case ActionType.CONCEALED_KONG:
        this.handleConcealedKong(game, player, tileIds!);
        break;

      case ActionType.EXTENDED_KONG:
        this.handleExtendedKong(game, player, tileId!);
        break;

      case ActionType.HU:
        await this.handleHu(game, player, winOptionLabel);
        break;

      case ActionType.CHEAT_HU:
        this.handleCheatHu(game, player);
        break;

      case ActionType.REBEL:
        this.handleRebel(game, player);
        break;

      case ActionType.LIANG_SHAN:
        this.handleLiangShan(game, player);
        break;

      case ActionType.THINK:
        this.handleThink(game, player);
        break;

      case ActionType.PASS:
        this.handlePass(game, player);
        break;
    }

    game.actionHistory.push(gameAction);
    game.lastActionTime = Date.now();

    // Claim/杠动作执行后,当前玩家接管回合。
    // 吃/碰后应直接出牌,不能补摸；各类杠完成补牌后再出牌。
    if (game.pendingActions.length === 0) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && this.isPlayerBotControlled(currentP) && currentP.status === PlayerStatus.PLAYING) {
        if (
          action === ActionType.PENG ||
          action === ActionType.CHOW ||
          action === ActionType.KONG ||
          action === ActionType.CONCEALED_KONG ||
          action === ActionType.EXTENDED_KONG
        ) {
          this.scheduleBotDiscard(gameId, currentP.id);
        }
      }
      if (action === ActionType.HU && game.phase === GamePhase.PLAYING) {
        await this.moveToNextPlayer(game);
      } else if (action === ActionType.PASS && this.shouldAdvanceTurnAfterPass(game)) {
        await this.moveToNextPlayer(game);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    }

    this.invalidateWinEvaluationCache(gameId);
    if (game.phase === GamePhase.PLAYING) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && currentP.status === PlayerStatus.PLAYING && game.drawnThisTurn) {
        this.prewarmWinEvaluation(game, currentP, 'self_draw');
      }
      for (const pending of game.pendingActions) {
        if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
        const targetPlayer = game.players.find(p => p.id === pending.playerId);
        if (!targetPlayer) continue;
        this.prewarmWinEvaluation(game, targetPlayer, 'discard', pending.tile);
      }
      if (!this.isTrainingFastMode(game)) {
        for (const candidate of game.players) {
          if (candidate.status === PlayerStatus.PLAYING && candidate.isTing) {
            this.getCachedTingPreview(game, candidate);
          }
        }
      }
    }

    // Broadcast game state update
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) throw new Error('Tile not found');
    const discarderIndex = game.currentPlayerIndex;
    game.lastDiscardPlayerId = player.id;
    game.lastDiscardPosition = player.position;

    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);
    (player as any).lastDrawnTile = null;
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);

    this.checkLeadingBrother(game, tile, player);
    this.updateRoundNumber(game);

    const missing = isMissingOneSuit(player.hand.concealedTiles);
    if (missing.missing) {
      player.missingSuit = missing.missingSuit;
    }

    player.isTing = isTing(
      player.hand.concealedTiles,
      player.hand.exposedMelds.length,
      game.customScoringMode || null,
      game.wildTileGroup
    );

    if (this.isWildTile(game, tile)) {
      game.freezePlayerId = player.id;
      game.freezeComplete = false;
      game.pendingActions = [];
      if (this.wsManager) {
        this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
          id: Date.now(),
          text: `🃏 ${player.name}打出了百搭，本轮不能吃碰捉冲！`,
          type: 'warn',
          timestamp: Date.now(),
          timeLabel: formatBeijingTime()
        });
      }
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);
      await this.moveToNextPlayer(game);
      return;
    }

    this.checkPendingActions(game, tile);

    const nextPlayer = this.getNextActivePlayer(game, discarderIndex);
    if (nextPlayer) {
      const nextPlayerIndex = game.players.findIndex(p => p.id === nextPlayer.id);
      if (nextPlayerIndex >= 0) {
        game.currentPlayerIndex = nextPlayerIndex;
      }
    }

    await this.beginCurrentPlayerTurn(game);

    if (game.pendingActions.length > 0) {
      const existingBotTimer = this.botTimers.get(game.gameId);
      if (existingBotTimer) {
        clearTimeout(existingBotTimer);
        this.botTimers.delete(game.gameId);
      }
      this.schedulePendingActionTimeout(game.gameId);
    }
  }

  /**
   * 谢谢带头大哥:四名玩家连续打出同一张牌(不要求相邻出牌)
   * 第一个打出该牌的玩家,结算时额外赔付其余三家每家10分
   */
  private checkLeadingBrother(game: GameState, tile: Tile, currentPlayer: Player): void {
    const tileKey = `${tile.suit}-${tile.value}`;

    // 初始化或重置追踪(换了一种牌)
    if (!game.consecutiveDiscards || game.consecutiveDiscards.suit !== tile.suit || game.consecutiveDiscards.value !== tile.value) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }

    // 同一牌型继续追加
    const cd = game.consecutiveDiscards;
    if (cd.playerIds.includes(currentPlayer.id)) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }

    // 追加当前玩家(允许同一玩家重复出现,统计4个不同玩家即可)
    cd.playerIds.push(currentPlayer.id);

    // 统计不同玩家数量
    const uniquePlayerIds = new Set(cd.playerIds);

    // 检查是否4个不同玩家都出过同一张牌(不要求连续/相邻)
    // 必须四名玩家都齐全且未胡牌(status === PLAYING)
    const activePlayerIds = new Set(
      game.players.filter(p => p.status === PlayerStatus.PLAYING).map(p => p.id)
    );
    // 只统计仍在游戏中(未胡牌)的玩家
    const activeDiscarders = new Set(cd.playerIds.filter(id => activePlayerIds.has(id)));
    if (activePlayerIds.size >= 4 && cd.playerIds.length === 4 && activeDiscarders.size === 4) {
      // 触发!第一个出该牌的玩家是带头大哥
      const firstPlayerId = cd.playerIds[0]!;
      game.leadingBrotherEvent = { firstPlayerId, tileKey };

      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      console.log(`[LeadingBrother] ${firstPlayer?.name} 是带头大哥!连续出 ${tileKey}`);

      // 广播给所有客户端显示弹窗
      if (this.wsManager) {
        this.wsManager.broadcast(game.gameId, 'leadingBrother', {
          firstPlayerName: firstPlayer?.name || '未知',
          tileKey
        });
      }

      // 重置追踪
      game.consecutiveDiscards = null;
    }
  }

  private hasTenPointClaimExemption(handTypes: HandType[], isDaDiao: boolean): boolean {
    if (isDaDiao) return true;

    return handTypes.some(type => [
      HandType.FENG_PENG,
      HandType.ALL_WIND,
      HandType.QING_PENG,
      HandType.HUN_PENG,
      HandType.EIGHT_FLOWERS,
      HandType.FOUR_WILD,
      HandType.FULL_FLUSH
    ].includes(type));
  }

  private countFlowerTiles(player: Player): number {
    return player.hand.exposedMelds
      .flatMap(m => m.tiles)
      .filter(t => isFlower(t)).length;
  }

  private handleDraw(game: GameState, player: Player, options?: { allowFullHand?: boolean }): void {
    if (game.wall.length === 0) {
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
      return;
    }

    // 牌数上限检查(不含花牌的门口牌+手牌 < 14 才能摸)
    const playableTileCount = this.getPlayableTileCount(player);
    if (!options?.allowFullHand && playableTileCount >= 14) {
      console.warn(`[DRAW] Skipped: ${player.name} already has ${playableTileCount} playable tiles`);
      return;
    }

    let tile = game.wall.pop()!;

    // 循环补花:摸到普通花牌就放门口继续摸,直到摸到非花牌
    while (isFlower(tile) && !this.isWildTile(game, tile)) {
      player.hand.exposedMelds.push({
        type: MeldType.TRIPLET,
        tiles: [tile],
        isConcealed: false,
        replacementDone: true as any
      } as any);
      this.broadcastFlowerReplacement(game, player);
      console.log(`[FLOWER] ${player.name} 摸到花牌: ${tile.id}, 门口花牌数: ${player.hand.exposedMelds.filter(m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0])).length}`);
      if (game.wall.length === 0) {
        this.endRound(game, GameEndReason.WALL_EXHAUSTED);
        return;
      }
      tile = game.wall.pop()!;
    }

    // 花牌百搭 → 进手牌
    if (isFlower(tile) && this.isWildTile(game, tile)) {
      player.hand.concealedTiles.push(tile);
    } else {
      // 普通牌 → 进手牌
      player.hand.concealedTiles.push(tile);
    }
    (player as any).lastDrawnTile = tile;
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
  }

  /**
   * 替换门口的初始花牌(发牌时放门口但未补花的)
   */
  private replaceInitialFlowers(game: GameState, player: Player): void {
    const flowerMelds = player.hand.exposedMelds.filter(
      m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !(m as any).replacementDone
    );
    if (flowerMelds.length === 0) return;

    console.log(`[WallDebug] replaceInitialFlowers: ${player.name} has ${flowerMelds.length} flowers, wall=${game.wall.length}`);

    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      (meld as any).replacementDone = true;
      let replacement = game.wall.pop()!;
      console.log(`[WallDebug] flower replace: drew ${replacement.id}, wall now=${game.wall.length}`);

      while (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false,
          replacementDone: true as any
        } as any);
        this.broadcastFlowerReplacement(game, player);
        if (game.wall.length === 0) {
          replacement = null as any;
          break;
        }
        replacement = game.wall.pop()!;
        console.log(`[WallDebug] flower replace: chained draw ${replacement.id}, wall now=${game.wall.length}`);
      }

      if (!replacement) {
        break;
      }

      if (isFlower(replacement) && this.isWildTile(game, replacement)) {
        // 百搭花牌 → 进手牌
        player.hand.concealedTiles.push(replacement);
        (player as any).lastDrawnTile = replacement;
        player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      } else {
        // 普通牌 → 进手牌
        player.hand.concealedTiles.push(replacement);
        (player as any).lastDrawnTile = replacement;
        player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      }

      this.broadcastFlowerReplacement(game, player);
    }
  }

  /**
   * 手牌排序:百搭放最左边,其余按花色数值排序
   */
  /**
   * 手牌排序:百搭放最左边,其余按花色→点数排序
   * - 百搭最前
   * - 数牌(dots→characters→bamboos)按花色→点数
   * - 风/箭/花统一在数牌后按suit顺序
   * - 含边界保护(空牌/缺字段时不抛异常)
   */
  private sortHandWithWildFront(tiles: Tile[], game: GameState): Tile[] {
    if (!tiles || tiles.length === 0) return [];
    const suitOrder: Record<string, number> = {
      dots: 0, wan: 1, tiao: 2, feng: 3, jian: 4, hua: 5
    };
    return [...tiles].sort((a, b) => {
      if (!a || !a.suit || a.value == null) return 1;
      if (!b || !b.suit || b.value == null) return -1;
      const aIsWild = this.isWildTile(game, a);
      const bIsWild = this.isWildTile(game, b);
      if (aIsWild && !bIsWild) return -1;
      if (!aIsWild && bIsWild) return 1;
      if (aIsWild && bIsWild) return 0;
      // 非百搭:按花色数值排序
      if (a.suit !== b.suit) return (suitOrder[a.suit] ?? 99) - (suitOrder[b.suit] ?? 99);
      return a.value - b.value;
    });
  }

  /**
   * 检查牌是否是百搭
   */
  private isWildTile(game: GameState, tile: Tile): boolean {
    if (!game.customScoringMode) return false;
    const parts = game.customScoringMode.split('-');
    if (parts.length < 2) return false;
    const wildSuit = parts[0] as TileSuit;
    const wildValue = parseInt(parts[1]);

    // 普通百搭
    if (tile.suit === wildSuit && tile.value === wildValue) return true;

    // 花牌百搭: 一组花牌全部为百搭
    if (tile.suit === TileSuit.FLOWER && wildSuit === TileSuit.FLOWER && game.wildTileGroup) {
      return game.wildTileGroup.includes(String(tile.value));
    }

    return false;
  }

  /**
   * 通用审批流程:检查高优先级玩家
   */
  private checkHighPriorityCandidates(
    game: GameState,
    requestingPlayerId: string,
    discardedTile: Tile
  ): { huCandidates: string[]; pengCandidates: string[]; kongCandidates: string[] } {
    const huCandidates: string[] = [];
    const pengCandidates: string[] = [];
    const kongCandidates: string[] = [];

    for (const p of game.players) {
      if (p.id === requestingPlayerId) continue;
      if (p.status !== PlayerStatus.PLAYING) continue;

      // 检查能否胡(必须有有效牌型)
      const testHand = [...p.hand.concealedTiles, discardedTile];
      const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
      const winCheck = canWin(testHand, p.hand.exposedMelds.length, this.getWinWildArg(game));
      if (winCheck.canWin) {
        const handTypes = detectHandTypes(testHand, p.hand.exposedMelds, false, this.countFlowerTiles(p), null, game.wildTileGroup);
        if (handTypes.length > 0) {
          huCandidates.push(p.id);
          continue;
        }
      }

      // 检查碰/杠
      const matchingCount = p.hand.concealedTiles.filter(t => tilesEqual(t, discardedTile)).length;
      if (matchingCount >= 2) {
        pengCandidates.push(p.id);
        if (matchingCount >= 3) kongCandidates.push(p.id);
      }
    }
    return { huCandidates, pengCandidates, kongCandidates };
  }

  /**
   * 通用审批:给高优先级玩家广播冲突事件并设置pending
   */
  private getApprovalActionPriority(action: string): number {
    switch (action) {
      case ActionType.HU:
      case 'hu':
        return 3;
      case ActionType.KONG:
      case 'kong':
        return 2;
      case ActionType.PENG:
      case 'peng':
        return 1;
      default:
        return 0;
    }
  }

  private executeRequesterApprovalAction(game: GameState): void {
    const conflict = game.pengChowConflict;
    if (!conflict) return;

    const requester = game.players.find(p => p.id === conflict.requesterId);
    if (!requester) return;

    if (conflict.requesterAction === 'chow') {
      this.executeChowDirectly(game, requester, conflict.requesterTileIds);
    } else if (conflict.requesterAction === 'peng') {
      this.executePengDirectly(game, requester);
    } else {
      this.executeKongDirectly(game, requester, conflict.tile.id);
    }
  }
    const conflict = game.pengChowConflict;
    if (!conflict) return;

    const activeStageIds = new Set(conflict.currentStagePlayerIds || []);
    const stagePending = game.pendingActions.filter(pa => activeStageIds.has(pa.playerId));
    if (stagePending.length > 0) return;

    const queue = conflict.approvalQueue || [];
    if (queue.length === 0) {
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== conflict.requesterId);
      this.clearPendingActionTimer(game.gameId);
      this.executeRequesterApprovalAction(game);
      game.pengChowConflict = null;
      return;
    }

    const highestPriority = Math.max(
      ...queue.map(candidate => Math.max(...candidate.availableActions.map(action => this.getApprovalActionPriority(action))))
    );
    const stage = queue.filter(candidate =>
      candidate.availableActions.some(action => this.getApprovalActionPriority(action) === highestPriority)
    );

    conflict.approvalQueue = queue.filter(candidate => !stage.some(current => current.playerId === candidate.playerId));
    conflict.currentStagePlayerIds = stage.map(candidate => candidate.playerId);
    conflict.timestamp = Date.now();
    conflict.expiresAt = Date.now() + this.getHesitationWindow(game);

    this.clearPendingActionTimer(game.gameId);

    const requester = game.players.find(p => p.id === conflict.requesterId);
    if (!requester || !this.wsManager) return;

    const label = conflict.requesterAction === 'chow' ? '吃' : conflict.requesterAction === 'peng' ? '碰' : '杠';
    for (const candidate of stage) {
      const candidatePlayer = game.players.find(p => p.id === candidate.playerId);
      if (!candidatePlayer) continue;
      const expiresAt = Date.now() + this.getHumanClaimDecisionTimeoutMs(
        game,
        candidatePlayer,
        candidate.availableActions as ActionType[]
      );
      const existingPending = game.pendingActions.find(pa => pa.playerId === candidate.playerId);
      if (existingPending) {
        const previousHadHu = existingPending.availableActions.includes(ActionType.HU);
        const previousExpiresAt = existingPending.expiresAt;
        existingPending.availableActions = candidate.availableActions as ActionType[];
        existingPending.tile = conflict.tile;
        existingPending.expiresAt = previousHadHu && typeof previousExpiresAt === 'number'
          ? previousExpiresAt
          : expiresAt;
      } else {
        game.pendingActions.push({
          playerId: candidate.playerId,
          availableActions: candidate.availableActions as ActionType[],
          tile: conflict.tile,
          expiresAt
        });
      }

      this.wsManager.broadcast(game.gameId, 'actionApproval', {
        requesterName: requester.name,
        requesterAction: label,
        candidatePlayerId: candidate.playerId,
        availableActions: candidate.availableActions,
        tileKey: `${conflict.tile.suit}-${conflict.tile.value}`,
        expiresAt
      });
    }

    const expectedTimestamp = conflict.timestamp;
    const gid = game.gameId;
    this.detachTimer(setTimeout(async () => {
      try {
        const freshGame = await this.getGame(gid);
        const freshConflict = freshGame?.pengChowConflict;
        if (!freshGame || !freshConflict || freshConflict.timestamp !== expectedTimestamp) return;

        const currentStageIds = new Set(freshConflict.currentStagePlayerIds || []);
        freshGame.pendingActions = freshGame.pendingActions.filter(pa => !currentStageIds.has(pa.playerId));
        freshConflict.currentStagePlayerIds = [];
        await this.advanceApprovalConflict(freshGame);

        await this.persistGame(freshGame);
        this.broadcastGameState(gid);

        const currentPlayer = freshGame.players[freshGame.currentPlayerIndex];
        if (currentPlayer && this.isPlayerBotControlled(currentPlayer)) {
          this.scheduleBotDiscard(gid, currentPlayer.id);
        }
      } catch (e) {
        console.error('[Approval] timeout err:', e);
      }
    }, this.getHesitationWaitMs(game.gameId)));
  }

  private async startApproval(
    game: GameState,
    requesterPlayerId: string,
    requesterAction: 'chow' | 'peng' | 'kong',
    candidates: Array<{ playerId: string; availableActions: string[] }>,
    tile: Tile,
    requesterTileIds?: string[]
  ): Promise<void> {
    // AI不参与审批：AI候选人直接按优先级决策(HU > KONG > PENG > PASS)
    // 只把纯人类候选人送进advanceApprovalConflict
    const aiCandidates = candidates.filter(c => {
      const p = game.players.find(pl => pl.id === c.playerId);
      return p && this.isPlayerBotControlled(p);
    });
    const humanCandidates = candidates.filter(c => {
      const p = game.players.find(pl => pl.id === c.playerId);
      return !p || !this.isPlayerBotControlled(p);
    });

    // 先处理AI候选人：按优先级排序，AI之间直接竞争
    if (aiCandidates.length > 0) {
      const sortedAi = [...aiCandidates].sort((a, b) => {
        const aPriority = Math.max(...a.availableActions.map(action => this.getApprovalActionPriority(action)));
        const bPriority = Math.max(...b.availableActions.map(action => this.getApprovalActionPriority(action)));
        return bPriority - aPriority;
      });
      for (const aiCand of sortedAi) {
        const aiPlayer = game.players.find(p => p.id === aiCand.playerId);
        if (!aiPlayer || aiPlayer.status !== PlayerStatus.PLAYING) continue;

        const aiActions = aiCand.availableActions as ActionType[];
        if (aiActions.includes(ActionType.HU)) {
          try {
            await this.executeWinDirectly(game, aiPlayer, tile);
            return; // 胡牌后游戏状态已结束
          } catch (e) {
            console.warn('[Approval] AI HU failed:', e);
          }
        }
        if (aiActions.includes(ActionType.KONG)) {
          this.executeKongDirectly(game, aiPlayer, tile.id);
          return;
        }
        if (aiActions.includes(ActionType.PENG)) {
          this.executePengDirectly(game, aiPlayer);
          return;
        }
        // AI只有CHOW → PASS，继续看下一个AI
      }
    }

    // 如果没有人类候选人，AI都已决策完毕或PASS，直接执行请求者动作
    if (humanCandidates.length === 0) {
      if (requesterAction === 'chow') this.executeChowDirectly(game, game.players.find(p => p.id === requesterPlayerId)!, requesterTileIds);
      else if (requesterAction === 'peng') this.executePengDirectly(game, game.players.find(p => p.id === requesterPlayerId)!);
      else if (requesterAction === 'kong') this.executeKongDirectly(game, game.players.find(p => p.id === requesterPlayerId)!, tile.id);
      return;
    }

    // 只有人类候选人需要审批流程
    game.pengChowConflict = {
      requesterId: requesterPlayerId,
      requesterAction,
      tile,
      requesterTileIds,
      timestamp: Date.now(),
      approvalQueue: humanCandidates.map(candidate => ({
        playerId: candidate.playerId,
        availableActions: candidate.availableActions as ActionType[]
      })),
      currentStagePlayerIds: []
    };
    await this.advanceApprovalConflict(game);
    return;

    game.pengChowConflict = { requesterId: requesterPlayerId, requesterAction, tile, requesterTileIds, timestamp: Date.now() };

    // 审批开始时清理旧的pending超时,避免2秒自动PASS抢跑破坏5秒审批
    this.clearPendingActionTimer(game.gameId);

    const requester = game.players.find(p => p.id === requesterPlayerId);
    if (!requester) return;

    for (const c of candidates) {
      const candPlayer = game.players.find(p => p.id === c.playerId);
      if (!candPlayer || !this.wsManager) continue;

      // 设置pending action(审批窗口,无"过"按钮)
      const existingPending = game.pendingActions.find(pa => pa.playerId === c.playerId);
      if (!existingPending) {
        const label = requesterAction === 'chow' ? '吃' : requesterAction === 'peng' ? '碰' : '杠';
        const expiresAt = Date.now() + this.getHumanClaimDecisionTimeoutMs(game, candPlayer, c.availableActions);
        game.pendingActions.push({
          playerId: c.playerId,
          availableActions: c.availableActions,
          tile,
          expiresAt
        });
        // 广播
        this.wsManager.broadcast(game.gameId, 'actionApproval', {
          requesterName: requester.name,
          requesterAction: label,
          candidatePlayerId: c.playerId,
          availableActions: c.availableActions,
          tileKey: `${tile.suit}-${tile.value}`,
          expiresAt
        });
      }
    }

    // 审批候选窗口超时后，允许低优先级动作继续执行
    const ts = game.pengChowConflict.timestamp;
    const gid = game.gameId;
    const approvalWaitMs = Math.max(
      ...candidates.map((candidate) => {
        const player = game.players.find(p => p.id === candidate.playerId);
        return player
          ? this.getHumanClaimDecisionTimeoutMs(game, player, candidate.availableActions as ActionType[])
          : this.getHesitationWaitMs(game.gameId);
      })
    );
    this.detachTimer(setTimeout(async () => {
      try {
        const fg = await this.getGame(gid);
        if (!fg || !fg.pengChowConflict || fg.pengChowConflict.timestamp !== ts) return;
        fg.pengChowConflict = null;
        // 清除所有候选者 AND 请求者的 pending action(修复:之前只清候选者,请求者pending残留导致游戏卡住)
        for (const c of candidates) fg.pendingActions = fg.pendingActions.filter(pa => pa.playerId !== c.playerId);
        fg.pendingActions = fg.pendingActions.filter(pa => pa.playerId !== requesterPlayerId);
        const rp = fg.players.find(p => p.id === requesterPlayerId);
        if (!rp) return;
        if (requesterAction === 'chow') this.executeChowDirectly(fg, rp, requesterTileIds);
        else if (requesterAction === 'peng') this.executePengDirectly(fg, rp);
        else if (requesterAction === 'kong') this.executeKongDirectly(fg, rp, tile.id);
        await this.persistGame(fg);
        this.broadcastGameState(gid);
        // 修复:审批超时执行后,如果是bot接管回合,调度bot出牌
        const currentPlayer = fg.players[fg.currentPlayerIndex];
        if (currentPlayer && this.isPlayerBotControlled(currentPlayer)) {
          this.scheduleBotDiscard(gid, currentPlayer.id);
        }
      } catch (e) { console.error('[Approval] timeout err:', e); }
    }, approvalWaitMs));
  }

  private async handleChow(game: GameState, player: Player, tileIds?: string[]): Promise<void> {
    let pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    // Bug修复: pending被timeout清空后,从discardPile重建
    if (!pendingAction || !pendingAction.tile) {
      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (!lastDiscard) return;
      pendingAction = { playerId: player.id, availableActions: [ActionType.CHOW], tile: lastDiscard } as any;
    }

    const discardedTile = pendingAction.tile;

    // 只在决策犹豫期内才需要审批(其他玩家有pending = 还在窗口内)
    const otherPlayersPending = game.pendingActions.filter(pa =>
      pa.playerId !== player.id &&
      pa.availableActions.some(a => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG)
    );

    if (otherPlayersPending.length > 0) {
      // 决策犹豫期内 → 检查高优先级玩家,触发审批
      // 优先级: HU > KONG > PENG > CHOW
      const { huCandidates, pengCandidates, kongCandidates } = this.checkHighPriorityCandidates(game, player.id, discardedTile);
      
      // 只要有任何高优先级玩家(HU/KONG/PENG)能响应,就需要审批
      if (huCandidates.length > 0 || pengCandidates.length > 0 || kongCandidates.length > 0) {
        const candidates: Array<{ playerId: string; availableActions: string[] }> = [];
        // HU 最高优先级
        for (const pid of huCandidates) {
          candidates.push({ playerId: pid, availableActions: ['hu'] });
        }
        // KONG 次高优先级
        for (const pid of kongCandidates) {
          const existing = candidates.find(c => c.playerId === pid);
          if (existing) {
            if (!existing.availableActions.includes('hu')) existing.availableActions.push('kong');
          } else {
            candidates.push({ playerId: pid, availableActions: ['kong'] });
          }
        }
        // PENG 最低优先级
        for (const pid of pengCandidates) {
          const existing = candidates.find(c => c.playerId === pid);
          if (existing) {
            if (!existing.availableActions.includes('hu') && !existing.availableActions.includes('kong')) {
              existing.availableActions.push('peng');
            }
          } else {
            candidates.push({ playerId: pid, availableActions: ['peng'] });
          }
        }
        await this.startApproval(game, player.id, 'chow', candidates, discardedTile, tileIds);
        return;
      }
    }

    // 决策犹豫期已过 → 碰/杠/胡家已丧失机会,直接吃
    this.executeChowDirectly(game, player, tileIds);
  }

  /**
   * 直接执行吃牌(不检查碰优先级)
   */
  private executeChowDirectly(game: GameState, player: Player, tileIds?: string[]): void {
    // ---- 吃碰排斥检查 ----
    const discardTile = game.discardPile[game.discardPile.length - 1];
    if (!discardTile) return;
    const exclusion = game.chowPongExclusion?.[player.id];
    const state = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(state, 'chow', discardTile.suit)) {
      console.warn(`[CHOW] Player ${player.name} blocked by exclusion rule (firstAction=${state.firstActionSuit})`);
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
      return;
    }

    let pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    // Bug修复: pending被timeout清空后,从discardPile重建
    if (!pendingAction || !pendingAction.tile) {
      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (!lastDiscard) return;
      // 从discardPile重建pendingAction
      pendingAction = { playerId: player.id, availableActions: [ActionType.CHOW], tile: lastDiscard } as any;
    }

    const discardedTile = pendingAction.tile;
    // 修复BUG:吃牌玩家应该是弃牌者的下家(下一个活跃玩家),不是前一个
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    const discarderIndex = game.players.findIndex(p => p.id === sourcePlayerId);
    const nextPlayerAfterDiscarder = discarderIndex >= 0 ? this.getNextActivePlayer(game, discarderIndex) : undefined;
    if (!nextPlayerAfterDiscarder || nextPlayerAfterDiscarder.id !== player.id) {
      console.warn(`[CHOW] Not the next player after discarder: expected=${nextPlayerAfterDiscarder?.name}, got=${player.id}`);
      return;
    }

    const sequences = this.findChowSequences(player.hand.concealedTiles, discardedTile, game);
    if (sequences.length === 0) { console.warn('[CHOW] No sequence'); return; }

    const sequence = this.selectChowSequence(sequences, discardedTile, tileIds);
    const handTiles = sequence.filter(t => t.id !== discardedTile.id);

    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.SEQUENCE);

    this.checkAndBroadcastBailout(game, player.id, sourcePlayerId);

    for (const tile of handTiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    const sourcePos = this.getLastDiscardPosition(game);
    const meld: Meld = {
      type: MeldType.SEQUENCE,
      tiles: sequence,
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos }),
      sourceTileId: discardedTile.id
    };
    player.hand.exposedMelds.push(meld);

    // ---- 更新吃碰排斥状态 ----
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, 'chow', discardTile.suit);

    // Bug6: 用findIndex找并移除被吃牌
    const cdIdx = game.discardPile.findIndex(t => t.id === discardedTile.id);
    if (cdIdx >= 0) game.discardPile.splice(cdIdx, 1);
    const discarder = game.players.find(p => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter(t => t.id !== discardedTile.id);
    }
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    this.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    // 吃后手牌排序(百搭置顶)
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);

    // 广播吃牌到牌局快讯
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `🍜 ${player.name}吃牌`,
        actionKind: 'chow',
        type: 'info',
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
  }

  /**
   * 直接执行碰(不检查胡优先级)
   */
  private executePengDirectly(game: GameState, player: Player): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // ---- 吃碰排斥检查 ----
    const exclusion = game.chowPongExclusion?.[player.id];
    const state = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(state, 'pong', lastDiscard.suit)) {
      console.warn(`[PENG] Player ${player.name} blocked by exclusion rule (firstAction=${state.firstActionSuit})`);
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
      return;
    }

    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.TRIPLET);
    this.checkAndBroadcastBailout(game, player.id, sourcePlayerId);
    // 广播碰牌到牌局快讯
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `ⓘ ${player.name}碰牌`,
        actionKind: 'pong',
        type: 'info',
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[0].id);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[1].id);
    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, matchingTiles[0], matchingTiles[1]],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos }),
      sourceTileId: lastDiscard.id
    });

    // ---- 更新吃碰排斥状态 ----
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, 'pong', lastDiscard.suit);

    // Bug6: 用findIndex找并移除被碰牌
    const pdIdx = game.discardPile.findIndex(t => t.id === lastDiscard.id);
    if (pdIdx >= 0) game.discardPile.splice(pdIdx, 1);
    // Bug1修复: 同时从弃牌者的个人弃牌列表中移除
    const discarder = game.players.find(p => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter(t => t.id !== lastDiscard.id);
    }
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    this.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    // 碰后手牌排序(百搭置顶)
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
  }

  /**
   * 直接执行胡(碰吃冲突中,高优先级胡直接执行)
   */
  private async executeWinDirectly(game: GameState, player: Player, winningTile: Tile): Promise<void> {
    // 构造假的pendingAction,让handleHu能获取winningTile
    const fakePending = {
      playerId: player.id,
      availableActions: [ActionType.HU],
      tile: winningTile
    };
    game.pendingActions.push(fakePending as any);

    try {
      await this.handleHu(game, player);
    } finally {
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
    }
  }

  /**
   * 直接执行杠(不检查胡优先级)
   */
  private executeKongDirectly(game: GameState, player: Player, tileId: string): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;

    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.KONG);
    if (sourcePlayerId) {
      this.checkAndBroadcastBailout(game, player.id, sourcePlayerId);
    }
    for (const t of matchingTiles) player.hand.concealedTiles = removeTile(player.hand.concealedTiles, t.id);

    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.KONG,
      tiles: [lastDiscard, ...matchingTiles],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos }),
      sourceTileId: lastDiscard.id
    });

    // Bug6: 用findIndex找并移除被杠牌
    const kgIdx = game.discardPile.findIndex(t => t.id === lastDiscard.id);
    if (kgIdx >= 0) game.discardPile.splice(kgIdx, 1);
    // 广播杠牌到牌局快讯
    if (this.wsManager) {
      const label = pendingAction.type === 'kong_an' ? '暗杠' : pendingAction.type === 'kong_bu' ? '补杠' : '明杠';
      this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `ⓘ ${player.name}${label}`,
        actionKind: 'kong',
        type: 'info',
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    const discarder = game.players.find(p => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter(t => t.id !== lastDiscard.id);
    }
    // 点杠积分:出牌者付2分
    player.windScore += 2;
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, 'ming');
  }

  /**
   * 处理审批回应(碰吃冲突、碰胡冲突等)
   */
  async handleApprovalChoice(gameId: string, playerId: string, choice: 'confirm' | 'pass'): Promise<void> {
    const game = this.games.get(gameId);
    if (!game || !game.pengChowConflict) return;

    const approvalConflict = game.pengChowConflict;
    const pending = game.pendingActions.find(pa => pa.playerId === playerId);

    if (choice === 'confirm') {
      const candPlayer = game.players.find(p => p.id === playerId);
}
