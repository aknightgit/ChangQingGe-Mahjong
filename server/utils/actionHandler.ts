/**
 * actionHandler.ts — 玩家动作处理（从 gameManager 拆分）
 * 负责：出牌、摸牌、吃、碰、杠、胡、造反、聚义、想一想、过
 */
import { GameState, Player, GamePhase, PlayerStatus, ActionType, PendingAction, MeldType, Tile, GameEndReason, TileSuit } from '../types/game';
import { findTileById, removeTile, isFlower, tilesEqual, isMissingOneSuit, getTileDisplayName } from './tiles';
import { buildWildTileChecker, canWin, HandType, isTing, checkChowPongExclusion, updateChowPongExclusion, detectHandTypes } from './handValidator';
import { calculateGameResult, generateWinOptions, calculateScore, type WinOption } from './scoring';
import { selectBotChowTileIds } from '../services/botService';
import * as tileHelper from './tileHelper';

/** ActionHandler 依赖的 GameManager 接口 */
export interface ActionHandlerDeps {
  games: Map<string, GameState>;
  endRound(game: GameState, reason: GameEndReason): void;
  broadcastGameState(gameId: string): void;
  broadcastQuickMessage(gameId: string, text: string, type?: string, actionKind?: string): void;
  persistGame(game: GameState): Promise<void>;
  handleDraw(game: GameState, player: Player, options?: { allowFullHand?: boolean }): void;
  replaceFlowers(game: GameState, player: Player): void;
  isPlayerBotControlled(player: Player): boolean;
  timerManager: any;
  getNextActivePlayer(game: GameState, afterIndex: number): Player | undefined;
  getPreviousActivePlayer(game: GameState, beforeIndex: number): Player | undefined;
  moveToNextPlayer(game: GameState): Promise<void>;
  isWildTile(game: GameState, tile: Tile): boolean;
  sortHandWithWildFront(tiles: Tile[], game: GameState): Tile[];
  getPlayerFlowerTiles(player: Player): Tile[];
  isPlayerMenQing(player: Player): boolean;
  getLastDiscardPlayerId(game: GameState): string | undefined;
  getLastDiscardPosition(game: GameState): number | undefined;
  isWinAfterKong(game: GameState, playerId: string): boolean;
  getCachedWinOptions(game: GameState, player: Player, context: 'self_draw' | 'discard', flags?: any): WinOption[];
  getCachedWinCheck(game: GameState, player: Player): { canWin: boolean; types: HandType[] };
  invalidateWinEvaluationCache(gameId: string, playerIds?: string[]): void;
  schedulePendingActionTimeout(gameId: string): void;
  scheduleBotDiscard(gameId: string, playerId: string): void;
  clearAutoTakeover(gameId: string, playerId: string): void;
  recordBailoutAction(gameId: string, playerId: string, sourcePlayerId: string | undefined, meldType: MeldType): number;
  checkAndBroadcastBailout(game: GameState, playerId: string, sourcePlayerId: string): void;
  getPlayerCumulativeScore(gameId: string, playerId: string): number;
  checkQJThresholdAlerts(game: GameState): void;
  enableBotMode(gameId: string, playerId: string): void;
  autoStartNextRound(gameId: string, delayMs: number): void;
  advanceApprovalConflict(game: GameState): Promise<void>;
  beginCurrentPlayerTurn(game: GameState): Promise<void>;
  checkLeadingBrother(game: GameState, tile: Tile, currentPlayer: Player): void;
  updateRoundNumber(game: GameState): void;
  resolveRobKongIfNeeded(game: GameState): boolean;
  clearBroadcasts(gameId: string): void;
  store: any;
  getGame(gameId: string): Promise<GameState | undefined>;
  replaceInitialFlowers(game: GameState, player: Player): void;
  getPlayableTileCount(player: Player): number;
  broadcastKongSupplement(game: GameState, player: Player, kind: 'ming' | 'an' | 'jia'): void;
  broadcastFlowerReplacement(game: GameState, player: Player, count?: number): void;
}

export class ActionHandler {
  private deps: ActionHandlerDeps;

  constructor(deps: ActionHandlerDeps) {
    this.deps = deps;
  }

  /**
   * 处理出牌
   */
  async handleDiscard(game: GameState, player: Player, tileId: string): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, beginCurrentPlayerTurn, checkLeadingBrother, updateRoundNumber, store } = this.deps;

    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) {
      throw new Error('Tile not found in hand');
    }

    const discarderIndex = game.currentPlayerIndex;
    game.lastDiscardPlayerId = player.id;
    game.lastDiscardPosition = player.position;

    // 从手牌移除
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    (player as any).lastDrawnTile = null;

    // 加入玩家个人弃牌区 + 全局弃牌堆
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);

    // 排序手牌（百搭放最前面）
    player.hand.concealedTiles = sortHandWithWildFront(player.hand.concealedTiles, game);

    // 带头大哥检查
    checkLeadingBrother(game, tile, player);
    updateRoundNumber(game);

    // 缺门检测
    const missing = isMissingOneSuit(player.hand.concealedTiles);
    if (missing.missing) {
      player.missingSuit = missing.missingSuit;
    }

    // 更新听牌状态
    player.isTing = isTing(
      player.hand.concealedTiles,
      player.hand.exposedMelds.length,
      game.customScoringMode || null,
      game.wildTileGroup
    );

    // 清除摸牌标记
    console.log(`[handleDiscard] ${player.name} resetting drawnThisTurn=false`);
    game.drawnThisTurn = false;

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.DISCARD,
      playerId: player.id,
      tileId: tile.id,
      timestamp: Date.now()
    });

    // 清除该玩家的超时自动接管计时器
    clearAutoTakeover(game.gameId, player.id);

    // 百搭冷冻逻辑
    if (isWildTile(game, tile)) {
      game.freezePlayerId = player.id;
      game.freezeComplete = false;
      game.pendingActions = [];
      broadcastQuickMessage(game.gameId, `🃏 ${player.name}打出了百搭，本轮不能吃碰捉冲！`, 'warn');
      await persistGame(game);
      broadcastGameState(game.gameId);
      await beginCurrentPlayerTurn(game);
      return;
    }

    // 检查其他玩家是否可以碰/杠/胡
    this.checkPendingActions(game, tile);

    // 推进到下一个玩家（和老代码 _handleDiscard_original 一致：始终调用 beginCurrentPlayerTurn）
    const nextPlayer = getNextActivePlayer(game, discarderIndex);
    if (nextPlayer) {
      game.currentPlayerIndex = game.players.findIndex(p => p.id === nextPlayer.id);
    }

    // 【关键】始终调用 beginCurrentPlayerTurn：重置 drawnThisTurn、调度 freeze timer、调度 autoTakeover
    // 老代码在 pending 检查之前就调用了，新代码不能跳过
    await beginCurrentPlayerTurn(game);

    // 如果有 pending actions，调度超时
    if (game.pendingActions.length > 0) {
      const existingBotTimer = timerManager.botTimers?.get(game.gameId);
      if (existingBotTimer) {
        clearTimeout(existingBotTimer);
        timerManager.botTimers.delete(game.gameId);
      }
      schedulePendingActionTimeout(game.gameId);
    }
  }

  /**
   * 处理摸牌
   */
  handleDraw(game: GameState, player: Player, options?: { allowFullHand?: boolean }): void {
    const { endRound, broadcastQuickMessage, replaceFlowers, isPlayerBotControlled, timerManager, isWildTile, sortHandWithWildFront, getLastDiscardPlayerId, schedulePendingActionTimeout, store } = this.deps;

    console.log(`[handleDraw] ${player.name} drawnThisTurn=${game.drawnThisTurn} wall=${game.wall.length} concealed=${player.hand.concealedTiles.length} allowFull=${options?.allowFullHand}`);

    // 【状态机守卫】已摸牌则禁止再摸（防止同回合多次摸牌）
    if (!options?.allowFullHand && game.drawnThisTurn) {
      console.warn(`[handleDraw] BLOCKED: ${player.name} already drew this turn`);
      return;
    }

    // 牌墙为空 → 流局（和老代码一致，先检查牌墙）
    if (game.wall.length === 0) {
      endRound(game, GameEndReason.WALL_EXHAUSTED);
      return;
    }

    // 牌数上限检查（和老代码一致）
    if (!options?.allowFullHand && player.hand.concealedTiles.length >= 14) {
      return;
    }

    let tile = game.wall.pop()!;

    // 循环补花:摸到普通花牌就放门口继续摸,直到摸到非花牌
    let flowerCount = 0
    while (isFlower(tile) && !isWildTile(game, tile)) {
      player.hand.exposedMelds.push({
        type: MeldType.TRIPLET,
        tiles: [tile],
        isConcealed: false,
        replacementDone: true as any
      } as any);
      flowerCount++
      console.log(`[FLOWER] ${player.name} 摸到花牌: ${tile.id}, 门口花牌数: ${player.hand.exposedMelds.filter(m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !isWildTile(game, m.tiles[0])).length}`);
      if (game.wall.length === 0) {
        // 补花广播由 replaceFlowers 统一处理
        endRound(game, GameEndReason.WALL_EXHAUSTED);
        return;
      }
      tile = game.wall.pop()!;
    }
    // 补花广播由 replaceFlowers 统一处理

    // 花牌百搭 → 进手牌
    if (isFlower(tile) && isWildTile(game, tile)) {
      player.hand.concealedTiles.push(tile);
    } else {
      // 普通牌 → 进手牌
      player.hand.concealedTiles.push(tile);
    }
    player.hand.concealedTiles = sortHandWithWildFront(player.hand.concealedTiles, game);
    (player as any).lastDrawnTile = tile;
    game.drawnThisTurn = true;

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.DRAW,
      playerId: player.id,
      tileId: tile.id,
      timestamp: Date.now()
    });

    // 检查是否可以自摸胡
    const winCheck = this.deps.getCachedWinCheck(game, player);
    if (winCheck.canWin) {
      // 可以自摸胡，添加pending action
      const winOptions = this.deps.getCachedWinOptions(game, player, 'self_draw');
      if (winOptions.length > 0) {
        game.pendingActions.push({
          playerId: player.id,
          availableActions: [ActionType.HU, ActionType.PASS],
          tile: tile,
          expiresAt: Date.now() + timerManager.getHesitationWindow(game)
        });
        this.deps.schedulePendingActionTimeout(game.gameId);
      }
    }
  }

  /**
   * 处理吃牌
   */
  async handleChow(game: GameState, player: Player, tileIds?: string[]): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, beginCurrentPlayerTurn } = this.deps;

    // 找到最后一个弃牌
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) {
      throw new Error('No tile to chow');
    }

    // 百搭牌不能被吃
    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    if (wildChecker(lastDiscard)) {
      throw new Error('百搭牌不能被吃');
    }

    // ---- 异门吃碰互斥检查 ----
    const exclusion = game.chowPongExclusion?.[player.id];
    const exclusionState = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(exclusionState, 'chow', lastDiscard.suit)) {
      console.warn(`[CHOW] Player ${player.name} blocked by exclusion rule (firstAction=${exclusionState.firstActionSuit})`);
      throw new Error('异门吃碰互斥：不能吃不同门的牌');
    }

    // 找到吃的组合
    const sequences = this.findChowSequences(player.hand.concealedTiles, lastDiscard, game);
    if (sequences.length === 0) {
      throw new Error('No valid chow sequence');
    }

    // 选择吃的组合
    let selectedSequence: Tile[];
    if (tileIds && tileIds.length > 0) {
      // 使用指定的牌
      const matchingSeq = sequences.find(seq => 
        tileIds.length === seq.length && tileIds.every(id => seq.some(t => t.id === id))
      );
      if (!matchingSeq) {
        throw new Error('Specified tile ids do not match any chow sequence');
      }
      selectedSequence = matchingSeq;
    } else {
      // 选择最佳组合
      selectedSequence = this.selectBestChowSequence(sequences, lastDiscard);
    }

    // 从手牌移除吃的牌
    for (const tile of selectedSequence) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // 从弃牌堆移除
    game.discardPile.pop();

    // 添加到副露
    player.hand.exposedMelds.push({
      type: MeldType.SEQUENCE,
      tiles: [lastDiscard, ...selectedSequence].sort((a, b) => a.value - b.value),
      isConcealed: false,
      sourcePosition: game.lastDiscardPosition,
      sourceTileId: lastDiscard.id
    });

    // 吃牌广播（牌局快讯+语音）
    const chowTileName = getTileDisplayName(lastDiscard);
    const chowSourceName = game.players.find(p => p.id === lastDiscardPlayerId)?.name || '';
    broadcastQuickMessage(game.gameId, `🍽️ ${player.name}吃了${chowSourceName}的${chowTileName}`, 'info', 'chow');

    // 记录互包
    const lastDiscardPlayerId = getLastDiscardPlayerId(game);
    if (lastDiscardPlayerId) {
      this.deps.recordBailoutAction(game.gameId, player.id, lastDiscardPlayerId, MeldType.SEQUENCE);
      this.deps.checkAndBroadcastBailout(game, player.id, lastDiscardPlayerId);
    }

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.CHOW,
      playerId: player.id,
      tileIds: [lastDiscard.id, ...selectedSequence.map(t => t.id)],
      timestamp: Date.now()
    });

    // 更新异门吃碰互斥状态
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, 'chow', lastDiscard.suit);

    // 清除pending actions
    game.pendingActions = [];

    // 吃牌后需要出牌（和老代码 executeChowDirectly 一致）
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    this.deps.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    if (this.deps.isPlayerBotControlled(player)) {
      this.deps.scheduleBotDiscard(game.gameId, player.id);
    }
    player.hand.concealedTiles = this.deps.sortHandWithWildFront(player.hand.concealedTiles, game);
    await persistGame(game);
    this.deps.broadcastGameState(game.gameId);
    // 【修复】吃牌后开启该玩家回合：调度 freeze timer + 更新 pendingExpiresAt
    (game as any)._freezeUntil = Date.now() + timerManager.getHesitationWindow(game); // 碰吃后同一玩家直接进出牌
    if (game.pendingActions.length > 0) {
      schedulePendingActionTimeout(game.gameId);
    }
  
  }

  /**
   * 处理碰牌
   */
  async handlePeng(game: GameState, player: Player): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, beginCurrentPlayerTurn } = this.deps;

    // 找到最后一个弃牌
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) {
      throw new Error('No tile to peng');
    }

    // 百搭牌不能被碰
    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    if (wildChecker(lastDiscard)) {
      throw new Error('百搭牌不能被碰');
    }

    // ---- 异门吃碰互斥检查 ----
    const exclusion = game.chowPongExclusion?.[player.id];
    const exclusionState = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(exclusionState, 'pong', lastDiscard.suit)) {
      console.warn(`[PENG] Player ${player.name} blocked by exclusion rule (firstAction=${exclusionState.firstActionSuit})`);
      throw new Error('异门吃碰互斥：不能碰不同门的牌');
    }

    // 找到手牌中相同的牌
    const matchingTiles = player.hand.concealedTiles.filter(t => 
      t.suit === lastDiscard.suit && t.value === lastDiscard.value
    );

    if (matchingTiles.length < 2) {
      throw new Error('Not enough tiles to peng');
    }

    // 从手牌移除两张
    const tilesToUse = matchingTiles.slice(0, 2);
    for (const tile of tilesToUse) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // 从弃牌堆移除
    game.discardPile.pop();

    // 添加到副露
    player.hand.exposedMelds.push({
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, ...tilesToUse],
      isConcealed: false,
      sourcePosition: game.lastDiscardPosition,
      sourceTileId: lastDiscard.id
    });

    // 碰牌广播（牌局快讯+语音）
    const pengTileName = getTileDisplayName(lastDiscard);
    const pengSourceName = game.players.find(p => p.id === getLastDiscardPlayerId(game))?.name || '';
    broadcastQuickMessage(game.gameId, `碰！ ${player.name}碰了${pengSourceName}的${pengTileName}`, 'info', 'pong');

    // 记录互包
    const lastDiscardPlayerId = getLastDiscardPlayerId(game);
    if (lastDiscardPlayerId) {
      this.deps.recordBailoutAction(game.gameId, player.id, lastDiscardPlayerId, MeldType.TRIPLET);
      this.deps.checkAndBroadcastBailout(game, player.id, lastDiscardPlayerId);
    }

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.PENG,
      playerId: player.id,
      tileId: lastDiscard.id,
      timestamp: Date.now()
    });

    // 更新异门吃碰互斥状态
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, 'pong', lastDiscard.suit);

    // 清除pending actions
    game.pendingActions = [];

    // 碰牌后需要出牌（和老代码 executePengDirectly 一致）
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    this.deps.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    if (this.deps.isPlayerBotControlled(player)) {
      this.deps.scheduleBotDiscard(game.gameId, player.id);
    }
    player.hand.concealedTiles = this.deps.sortHandWithWildFront(player.hand.concealedTiles, game);
    await persistGame(game);
    this.deps.broadcastGameState(game.gameId);
    // 【修复】碰牌后开启该玩家回合：调度 freeze timer + 更新 pendingExpiresAt
    // 老代码 executePengDirectly 之后不调用 beginCurrentPlayerTurn（静默开启），
    // 但新代码需要广播 gameState 后显式调用，让下家能看到新的 pending timer
    (game as any)._freezeUntil = Date.now() + timerManager.getHesitationWindow(game); // 碰吃后同一玩家直接进出牌

    // 如果有 pending actions（不太可能，但保险），调度超时
    if (game.pendingActions.length > 0) {
      schedulePendingActionTimeout(game.gameId);
    }
  
  }

  /**
   * 处理杠牌
   */
  async handleKong(game: GameState, player: Player, tileId: string): Promise<void> {
    const { broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, getLastDiscardPlayerId, getLastDiscardPosition, store, beginCurrentPlayerTurn, broadcastKongSupplement } = this.deps;

    // 【修复】明杠：从弃牌堆取 lastDiscard（和老代码 executeKongDirectly 一致）
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;

    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;

    // 互包记录
    const sourcePlayerId = getLastDiscardPlayerId(game);
    this.deps.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.KONG);
    if (sourcePlayerId) {
      this.deps.checkAndBroadcastBailout(game, player.id, sourcePlayerId);
    }

    // 从手牌移除三张
    for (const t of matchingTiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, t.id);
    }

    // 添加到副露（明杠）
    const sourcePos = getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.KONG,
      tiles: [lastDiscard, ...matchingTiles],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos }),
      sourceTileId: lastDiscard.id
    });

    // 从弃牌堆移除被杠的牌
    const kgIdx = game.discardPile.findIndex(t => t.id === lastDiscard.id);
    if (kgIdx >= 0) game.discardPile.splice(kgIdx, 1);

    // 从弃牌者的 discardedTiles 中也移除
    const discarder = game.players.find(p => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter(t => t.id !== lastDiscard.id);
    }

    // 点杠积分：出牌者付2分
    player.windScore += 2;

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.KONG,
      playerId: player.id,
      tileId: lastDiscard.id,
      timestamp: Date.now()
    });

    // 清除pending actions 和冲突状态
    game.pendingActions = [];
    (game as any).pengChowConflict = null;

    // 杠牌广播（牌局快讯+语音，含牌名）
    const kongTileName = getTileDisplayName(lastDiscard);
    const kongSourceName = game.players.find(p => p.id === sourcePlayerId)?.name || '';
    broadcastQuickMessage(game.gameId, `杠！ ${player.name}杠了${kongSourceName}的${kongTileName}`, 'info', 'kong');
    broadcastKongSupplement(game, player, 'ming');

    // 设置当前玩家
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);

    // 杠后摸牌
    replaceFlowers(game, player);
    handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;

    if (isPlayerBotControlled(player)) {
      this.deps.scheduleBotDiscard(game.gameId, player.id);
    }

    await persistGame(game);
    broadcastGameState(game.gameId);
  }

  /**
   * 处理暗杠
   */
  async handleConcealedKong(game: GameState, player: Player, tileIds: string[]): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, beginCurrentPlayerTurn } = this.deps;

    // 找到手牌中相同的牌
    const tiles = tileIds.map(id => findTileById(player.hand.concealedTiles, id)).filter(Boolean) as Tile[];
    if (tiles.length !== 4) {
      throw new Error('Need exactly 4 tiles for concealed kong');
    }

    // 检查是否是相同的牌
    const firstTile = tiles[0];
    if (!tiles.every(t => t.suit === firstTile.suit && t.value === firstTile.value)) {
      throw new Error('All tiles must be the same for concealed kong');
    }

    // 从手牌移除
    for (const tile of tiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // 添加到副露（暗杠）
    player.hand.exposedMelds.push({
      type: MeldType.CONCEALED_KONG,
      tiles: tiles,
      isConcealed: true
    });

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.CONCEALED_KONG,
      playerId: player.id,
      tileIds: tileIds,
      timestamp: Date.now()
    });

    // 【修复】暗杠积分：每个未胡玩家付2分
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.rainScore += nonWinners.length * 2;

    // 【修复】杠牌广播（牌局快讯）
    this.deps.broadcastKongSupplement(game, player, 'an');

    // 暗杠后补牌（allowFullHand=true）
    replaceFlowers(game, player);
    handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    player.hand.concealedTiles = sortHandWithWildFront(player.hand.concealedTiles, game);

    if (isPlayerBotControlled(player)) {
      this.deps.scheduleBotDiscard(game.gameId, player.id);
    }

    // 【修复】暗杠后开启该玩家回合（freeze timer）
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    await beginCurrentPlayerTurn(game);

    await persistGame(game);
    broadcastGameState(game.gameId);
  }

  /**
   * 处理加杠
   */
  async handleExtendedKong(game: GameState, player: Player, tileId: string): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, beginCurrentPlayerTurn } = this.deps;

    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) {
      throw new Error('Tile not found in hand');
    }

    // 找到已有的碰
    const existingMeld = player.hand.exposedMelds.find(m => 
      m.type === MeldType.TRIPLET && 
      !m.isConcealed && 
      m.tiles.length === 3 && 
      m.tiles[0].suit === tile.suit && 
      m.tiles[0].value === tile.value
    );

    if (!existingMeld) {
      throw new Error('No existing meld to extend');
    }

    // 从手牌移除
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);

    // 更新副露
    existingMeld.tiles.push(tile);

    // 加杠也记录互包（老代码 executeExtendedKongDirectly 有此逻辑）
    const existingSourceTileId = existingMeld.sourceTileId;
    if (existingSourceTileId) {
      const sourcePlayer = game.players.find(p => p.hand.discardedTiles.some(t => t.id === existingSourceTileId));
      if (sourcePlayer) {
        this.deps.recordBailoutAction(game.gameId, player.id, sourcePlayer.id, MeldType.KONG);
        this.deps.checkAndBroadcastBailout(game, player.id, sourcePlayer.id);
      }
    }

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.EXTENDED_KONG,
      playerId: player.id,
      tileId: tile.id,
      timestamp: Date.now()
    });

    // 【修复】加杠积分：每个未胡玩家付1分
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.windScore += nonWinners.length * 1;

    // 【修复】杠牌广播（牌局快讯）
    this.deps.broadcastKongSupplement(game, player, 'jia');

    // 加杠后补牌（allowFullHand=true）
    replaceFlowers(game, player);
    handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    player.hand.concealedTiles = sortHandWithWildFront(player.hand.concealedTiles, game);

    if (isPlayerBotControlled(player)) {
      this.deps.scheduleBotDiscard(game.gameId, player.id);
    }

    // 【修复】加杠后开启该玩家回合（freeze timer）
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    await beginCurrentPlayerTurn(game);

    await persistGame(game);
    broadcastGameState(game.gameId);
  }

  /**
   * 处理胡牌
   */
  async handleHu(game: GameState, player: Player, selectedWinOptionLabel?: string): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    // 判断是自摸还是捉冲（有pendingAction且含HU = 捉冲）
    const huPendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    const huIsSelfDraw = !huPendingAction;
    const huPendingTile = huPendingAction?.tile;

    // 用正确的手牌检测胡牌（捉冲时加入弃牌）
    const handForCheck = huPendingTile
      ? [...player.hand.concealedTiles, huPendingTile]
      : player.hand.concealedTiles;
    const winCheck = canWin(handForCheck, player.hand.exposedMelds, game.customScoringMode || null);
    if (!winCheck.canWin) {
      throw new Error('Cannot win');
    }

    // 获取胡牌选项（捉冲用 discard context + extraTile）
    const context = huIsSelfDraw ? 'self_draw' : 'discard';
    const winOptions = getCachedWinOptions(game, player, context, {
      extraTile: huPendingTile,
      isKongFlower: false,
      isRobbingKong: !!huPendingAction?.tile && !!(game as any).pendingKongClaim
    });
    if (winOptions.length === 0) {
      throw new Error('No win options available');
    }

    // 选择胡牌选项
    let selectedOption = winOptions[0];
    if (selectedWinOptionLabel) {
      const found = winOptions.find(opt => opt.label === selectedWinOptionLabel);
      if (found) {
        selectedOption = found;
      }
    }

    // 设置胡牌状态
    player.status = PlayerStatus.WON;
    player.winOrder = game.winnersCount + 1;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    game.winnersCount++;

    // 【修复】计算番数和最终点数（老代码 _handleHu_original 有，新代码漏了）
    const huPlayerIdx = game.players.findIndex(p => p.id === player.id);
    const isSelfDrawn = game.currentPlayerIndex === huPlayerIdx;
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    const isKongFlower = isSelfDrawn && !!(player as any).isSelfDrawn;
    const isRobbingKong = !!pendingAction?.tile && !!(game as any).pendingKongClaim;
    const flowerTiles = player.hand.exposedMelds
      .flatMap((m: any) => m.tiles)
      .filter((t: any) => isFlower(t));
    const concealedNonFlower = player.hand.concealedTiles.filter(t => !isFlower(t));
    const isDaDiao = concealedNonFlower.length === 1;
    const isMenQing = !player.hand.exposedMelds.some((m: any) =>
      m.type === MeldType.TRIPLET ||
      m.type === MeldType.SEQUENCE ||
      (m.type === MeldType.KONG && !m.isConcealed)
    );
    const handTypes = detectHandTypes(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      isSelfDrawn,
      flowerTiles.length,
      game.customScoringMode,
      game.wildTileGroup
    );
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts && wildParts[0] ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1], 10) : undefined;
    const scoreResult = calculateScore({
      handTiles: player.hand.concealedTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles,
      handTypes,
      isSelfDrawn,
      isKongFlower,
      isRobbingKong,
      isMenQing,
      isDaDiao,
      wildTileSuit: wildSuit,
      wildTileValue: wildValue,
      wildTileGroup: game.wildTileGroup,
      rawRoundMultiplier: game.roundMultiplier ?? 1,
      rawInheritMultiplier: game.inheritMultiplier ?? 1,
      globalIncludesRound: true,
      settlementMultiplier: game.settlementMultiplier ?? 1
    });
    player.wonFan = selectedOption?.score ?? scoreResult.finalPoints;
    player.winHandType = selectedOption?.handTypeName ?? scoreResult.handTypeName;
    player.winningScoreBreakdown = {
      baseFan: scoreResult.baseFan,
      extraMultipliers: scoreResult.extraMultipliers,
      diceMultiplier: scoreResult.roundMultiplier,
      inheritMultiplier: scoreResult.inheritMultiplier,
      effectiveMultiplier: scoreResult.globalMultiplier,
      settlementMultiplier: scoreResult.settlementMultiplier,
      finalPoints: player.wonFan,
      details: [...scoreResult.details]
    };

    // 记录动作历史
    game.actionHistory.push({
      type: ActionType.HU,
      playerId: player.id,
      timestamp: Date.now()
    });

    // 胡牌广播
    player.isSelfDrawn = isSelfDrawn;
    if (!isSelfDrawn) {
      player.discarderId = game.players[game.currentPlayerIndex]?.id;
      player.discarderName = game.players[game.currentPlayerIndex]?.name;
    }
    // 捉冲：从pendingAction.tile获取放冲牌名；自摸：从lastDrawnTile获取摸到的牌名
    const pendingTile = game.pendingActions.find(pa => pa.playerId === player.id)?.tile;
    const lastDrawn = (player as any).lastDrawnTile;
    const winningTileName = isSelfDrawn
      ? (lastDrawn ? getTileDisplayName(lastDrawn) : '')
      : (pendingTile ? getTileDisplayName(pendingTile) : (lastDrawn ? getTileDisplayName(lastDrawn) : ''));
    const handTypeLabel = (player as any).winHandType || '';
    const discarderName = isSelfDrawn ? '' : (game.players[game.currentPlayerIndex]?.name || '');
    const huMsg = isSelfDrawn
      ? `🎉 ${player.name} 自摸${winningTileName ? '-' + winningTileName : ''}`
      : `🎉 ${player.name} 捉冲${discarderName}${winningTileName ? '-' + winningTileName : ''}${handTypeLabel ? '·' + handTypeLabel : ''}`;
    broadcastQuickMessage(game.gameId, huMsg, 'special', isSelfDrawn ? 'selfHu' : 'hu');

    // 清除pending actions
    game.pendingActions = [];

    // 检查是否需要结束牌局
    const remainingActive = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    if (remainingActive <= 1 || game.winnersCount >= 3) {
      // 【修复】进入5秒亮牌阶段，再进入结算
      game.phase = GamePhase.REVEAL;
      await persistGame(game);
      broadcastGameState(game.gameId);
      const gameId = game.gameId;
      const { timerManager: tm } = this.deps;
      tm.detachTimer(setTimeout(async () => {
        try {
          console.log(`[handleHu-reveal] 5s timer FIRED gameId=${gameId.substring(0,8)}`);
          const fresh = await this.deps.getGame(gameId);
          console.log(`[handleHu-reveal] game=${!!fresh} phase=${fresh?.phase}`);
          if (!fresh || fresh.phase !== GamePhase.REVEAL) {
            console.warn(`[handleHu-reveal] Game not in REVEAL (phase=${fresh?.phase}), aborting.`);
            return;
          }
          endRound(fresh, GameEndReason.LAST_PLAYER);
        } catch (e) { console.warn('[handleHu] reveal end error', e); }
      }, 5000));
      return;
    }

    // 继续牌局：检查牌墙是否已空
    if (game.wall.length === 0) {
      game.phase = GamePhase.REVEAL;
      await persistGame(game);
      broadcastGameState(game.gameId);
      const gameId = game.gameId;
      const { timerManager: tm } = this.deps;
      tm.detachTimer(setTimeout(async () => {
        try {
          console.log(`[handleHu-wall] 5s timer FIRED gameId=${gameId.substring(0,8)}`);
          const fresh = await this.deps.getGame(gameId);
          if (!fresh || fresh.phase !== GamePhase.REVEAL) return;
          endRound(fresh, GameEndReason.LAST_PLAYER);
        } catch (e) { console.warn('[handleHu] reveal end error', e); }
      }, 5000));
      return;
    }

    // 牌墙未空，找下一个未胡牌玩家继续
    let nextIdx = game.currentPlayerIndex;
    let searched = 0;
    while (searched < game.players.length) {
      nextIdx = (nextIdx + 1) % game.players.length;
      searched++;
      if (game.players[nextIdx].status === PlayerStatus.PLAYING) break;
    }
    game.currentPlayerIndex = nextIdx;
    game.drawnThisTurn = false;
    const nextPlayer = game.players[nextIdx];
    this.deps.replaceInitialFlowers(game, nextPlayer);
    const totalTiles = this.deps.getPlayableTileCount(nextPlayer);
    if (totalTiles < 14) {
      handleDraw(game, nextPlayer);  // handleDraw 内部已设置 drawnThisTurn = true
    } else {
      game.drawnThisTurn = true;
    }
    await persistGame(game);
    broadcastGameState(game.gameId);
    if (this.deps.isPlayerBotControlled(nextPlayer)) {
      this.deps.scheduleBotDiscard(game.gameId, nextPlayer.id);
    }
  }

    /** 广播自定义事件（绕开 broadcastService，直接走 wsManager） */
  broadcastCustomEvent(gameId: string, event: string, data: any): void {
    const wsManager = (this.deps as any).store?.getWsManager?.();
    if (wsManager) {
      wsManager.broadcast(gameId, event, data);
    }
  }

  /**
   * 处理造反
   */
  broadcastCustomEvent(gameId: string, event: string, data: any): void {
    const wsManager = (this.deps as any).store?.getWsManager?.();
    if (wsManager) {
      wsManager.broadcast(gameId, event, data);
    }
  }

  async handleRebel(game: GameState, player: Player): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, broadcastCustomEvent, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    // 造反：所有玩家重新发牌
    broadcastQuickMessage(game.gameId, `⚔️ ${player.name} 发起了造反！`, 'special');

    // 广播造反亮手牌事件（给所有客户端）
    broadcastCustomEvent(game.gameId, 'rebel', {
      playerId: player.id,
      playerName: player.name,
      hand: player.hand.concealedTiles,
      rebelEndTime: Date.now() + 5000
    });

    // 翻倍
    game.inheritedGlobalMultiplier = Math.min((game.inheritedGlobalMultiplier || 1) * 2, 8);

    // 重新发牌
    const deck = createDeck();
    game.wall = deck;

    // 重新发牌给所有玩家
    for (const p of game.players) {
      p.hand.concealedTiles = [];
      p.hand.exposedMelds = [];
      p.status = PlayerStatus.PLAYING;
    }

    // 发牌
    for (let i = 0; i < 13; i++) {
      for (const p of game.players) {
        if (game.wall.length > 0) {
          const tile = game.wall.pop()!;
          p.hand.concealedTiles.push(tile);
        }
      }
    }

    // 庄家多摸一张
    const dealer = game.players[game.dealerIndex];
    if (game.wall.length > 0) {
      const tile = game.wall.pop()!;
      dealer.hand.concealedTiles.push(tile);
    }

    await persistGame(game);
    broadcastGameState(game.gameId);
  }

  /**
   * 处理聚义
   */
  handleLiangShan(game: GameState, player: Player): void {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    if (game.phase !== GamePhase.PLAYING) return;
    if (player.status !== PlayerStatus.PLAYING) return;

    // 全局倍数已达8倍上限时,禁止梁山聚义
    const effectiveGlobal = Math.min((game.inheritedGlobalMultiplier ?? game.inheritMultiplier ?? 1) * (game.roundMultiplier ?? 1), 8);
    if (effectiveGlobal >= 8) return;

    // 初始化投票列表
    if (!game.liangShanVotes) {
      game.liangShanVotes = [];
    }

    // 已投过票则忽略
    if (game.liangShanVotes.includes(player.id)) return;

    // 记录投票
    game.liangShanVotes.push(player.id);

    // 广播投票消息
    broadcastQuickMessage(game.gameId, `🔥 ${player.name}响应了梁山聚义！`, 'special');

    // 活跃玩家总数（只统计真人）
    const activePlayers = game.players.filter(p => p.status === PlayerStatus.PLAYING);
    const activeHumans = activePlayers.filter(p => !isPlayerBotControlled(p));

    // 计算有效投票数:手动投票 + 超过被QJ线的玩家自动同意
    const threshold = game.liangShanThreshold ?? 4000;
    let effectiveVoteCount = game.liangShanVotes.length;

    // 广播投票进度
    broadcastGameState(game.gameId);

    for (const ap of activeHumans) {
      if (game.liangShanVotes.includes(ap.id)) continue;
      const cumulativeScore = getPlayerCumulativeScore(game.gameId, ap.id);
      if (cumulativeScore > threshold) {
        effectiveVoteCount++;
        if (!game.liangShanVotes.includes(ap.id)) {
          game.liangShanVotes.push(ap.id);
          broadcastQuickMessage(game.gameId, `🔥 ${ap.name}响应了${player.name}的梁山聚义！`, 'special');
        }
        console.log(`[LiangShan] ${ap.name} 累积赢分${cumulativeScore}超过QJ线${threshold},自动同意`);
      }
    }

    console.log(`[LiangShan] ${player.name} voted (${effectiveVoteCount}/${activeHumans.length}, threshold: ${threshold})`);

    // 全部真人投票 → 结束本局,下把翻倍
    if (effectiveVoteCount >= activeHumans.length) {
      console.log(`[LiangShan] All players agreed! Ending round with ×2 multiplier.`);


      // 所有未胡牌玩家标记为输
      for (const p of game.players) {
        if (p.status !== PlayerStatus.WON) {
          p.status = PlayerStatus.LOST;
        }
      }

      // 下局全局倍数 ×2
      const doubled = Math.min((game.inheritMultiplier ?? 1) * 2, 8);
      const roundMul = game.roundMultiplier ?? 1;
      const effective = doubled * roundMul;
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : doubled, 8);

      // 聚义成功标记（客户端据此显示弹窗而非结算）
      game.liangShanSuccess = true;

      // 结束本局（broadcastGameState 在 endRound 内部，会把 gameMessage 推送给客户端）
      // endRound 内部已有 autoStartNextRound，不需要重复调用
      endRound(game, GameEndReason.LAST_PLAYER);

      // 聚义成功：庄家不变
      if (!game.nextDealerId) {
        const currentDealer = game.players[game.dealerIndex];
        if (currentDealer) {
          game.nextDealerId = currentDealer.id;
        }
      }
    } else {
      broadcastGameState(game.gameId);
    }
  }

  /**
   * 处理想一想
   */
  handleThink(game: GameState, player: Player): void {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    if (game.phase !== GamePhase.PLAYING) return;

    const maxChances = game.thinkChances ?? 3;
    if (!game.thinkUsage) game.thinkUsage = {};
    const used = game.thinkUsage[player.id] ?? 0;
    let remaining = Math.max(0, maxChances - used);

    // 如果玩家可胡（有HU的pending），视为HuPanel弹出锁定，不消耗次数
    const hasHuClaim = game.pendingActions.some(pa =>
      pa.playerId === player.id && pa.availableActions.includes(ActionType.HU)
    );

    if (!hasHuClaim) {
      if (used >= maxChances) return;
      game.thinkUsage[player.id] = used + 1;
      remaining = maxChances - used - 1;
      console.log(`[Think] ${player.name} used think chance (${used + 1}/${maxChances})`);
    } else {
      console.log(`[Think] ${player.name} opened HuPanel (auto-lock, no chance consumed)`);
    }

    // 冻结8秒
    game.thinkFreezeUntil = Date.now() + 8000;
    game.thinkFreezePlayerId = player.id;
    const freezeTimer = timerManager.freezeTimers.get(game.gameId);
    if (freezeTimer) {
      clearTimeout(freezeTimer);
    }
    timerManager.freezeTimers.set(game.gameId, setTimeout(() => {
      game.thinkFreezeUntil = undefined;
      game.thinkFreezePlayerId = undefined;
      timerManager.freezeTimers.delete(game.gameId);
      broadcastGameState(game.gameId);
    }, 8000));

    broadcastQuickMessage(game.gameId, `⏳ ${player.name} 想一想！(剩余${remaining}次)`, 'special');
    broadcastGameState(game.gameId);
  }

  /**
   * 处理过
   */
  async handlePass(game: GameState, player: Player): Promise<void> {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode, advanceApprovalConflict, resolveRobKongIfNeeded, moveToNextPlayer } = this.deps;

    // Remove player's pending action
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);

    if (game.pengChowConflict?.currentStagePlayerIds?.includes(player.id)) {
      game.pengChowConflict.currentStagePlayerIds = game.pengChowConflict.currentStagePlayerIds.filter(id => id !== player.id);
      await advanceApprovalConflict(game);
      if (game.pengChowConflict) {
        return;
      }
    }

    // 抢杠场景:所有候选都过了,补杠继续
    if (game.pendingActions.length === 0 && game.pendingKongClaim && game.multiHuStarterIndex === undefined) {
      resolveRobKongIfNeeded(game);
      return;
    }

    // 一炮多响场景:所有候选响应结束,从弃牌者右手继续
    if (game.pendingActions.length === 0 && game.multiHuStarterIndex !== undefined) {
      const starter = game.multiHuStarterIndex;
      const discarderIdx = (game as any).multiHuDiscarderIndex;
      game.multiHuStarterIndex = undefined;
      delete (game as any).multiHuDiscarderIndex;
      if (game.pendingKongClaim?.cancelledByHu) {
        game.pendingKongClaim = undefined;
      }
      const next = discarderIdx !== undefined
        ? getNextActivePlayer(game, discarderIdx)
        : getNextActivePlayer(game, starter);
      if (next) {
        game.currentPlayerIndex = game.players.findIndex(p => p.id === next.id);
        replaceFlowers(game, next);
        handleDraw(game, next);
        game.drawnThisTurn = true;
      } else {
        endRound(game, GameEndReason.LAST_PLAYER);
      }
      return;
    }

    // 普通场景 - 由调用方统一处理
  }

  /**
   * 处理作弊胡牌
   */
  handleCheatHu(game: GameState, player: Player): void {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== player.id) {
      throw new Error('Cheat Hu is only available on your turn');
    }

    if (player.status !== PlayerStatus.PLAYING) {
      return;
    }

    game.pendingActions = [];
    player.status = PlayerStatus.WON;
    player.winOrder = game.winnersCount + 1;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    player.wonFan = 1;
    game.winnersCount++;
    game.customScoringMode = 'cheat';
    endRound(game, GameEndReason.LAST_PLAYER);
  }

  /**
   * 检查其他玩家是否可以碰/杠/胡
   */
  private checkPendingActions(game: GameState, discardedTile: Tile): void {
    const { games, endRound, broadcastGameState, broadcastQuickMessage, persistGame, handleDraw, replaceFlowers, isPlayerBotControlled, timerManager, getNextActivePlayer, isWildTile, sortHandWithWildFront, getPlayerFlowerTiles, getLastDiscardPlayerId, schedulePendingActionTimeout, clearAutoTakeover, store, getCachedWinOptions, getCachedWinCheck, invalidateWinEvaluationCache, recordBailoutAction, checkAndBroadcastBailout, getPlayerCumulativeScore, checkQJThresholdAlerts, enableBotMode } = this.deps;

    game.pendingActions = [];
    delete (game as any).hasTriggeredAction;
    const discarderIndex = game.currentPlayerIndex;

    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);

    // 百搭牌不能被吃/碰/杠
    if (wildChecker(discardedTile)) {
      // 百搭牌只能被胡
      for (const player of game.players) {
        if (player.status !== PlayerStatus.PLAYING) continue;
        if (player.id && player.id === game.players[game.currentPlayerIndex].id) continue;
        const winCheck = getCachedWinCheck(game, player);
        if (winCheck.canWin) {
          game.pendingActions.push({
            playerId: player.id,
            availableActions: [ActionType.HU, ActionType.PASS],
            tile: discardedTile,
            expiresAt: Date.now() + timerManager.getHesitationWindow(game)
          });
        }
      }
      return;
    }

    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING) continue;
      if (player.id && player.id === game.players[game.currentPlayerIndex].id) continue;

      const availableActions: ActionType[] = [];

      // 异门吃碰互斥状态
      const exclusion = game.chowPongExclusion?.[player.id];
      const exclusionState = exclusion || { firstActionSuit: null, firstActionType: null };

      // 检查是否可以碰
      const matchingTiles = player.hand.concealedTiles.filter(t => 
        t.suit === discardedTile.suit && t.value === discardedTile.value
      );
      if (matchingTiles.length >= 2 && checkChowPongExclusion(exclusionState, 'pong', discardedTile.suit)) {
        availableActions.push(ActionType.PENG);
      }

      // 检查是否可以杠
      if (matchingTiles.length >= 3) {
        availableActions.push(ActionType.KONG);
      }

      // 检查是否可以吃（只有下家可以吃）
      const nextPlayerIndex = (discarderIndex + 1) % game.players.length;
      let chowOptions: string[][] | undefined;
      if (game.players[nextPlayerIndex]?.id === player.id) {
        if (checkChowPongExclusion(exclusionState, 'chow', discardedTile.suit)) {
          const sequences = this.findChowSequences(player.hand.concealedTiles, discardedTile, game);
          if (sequences.length > 0) {
            availableActions.push(ActionType.CHOW);
            chowOptions = tileHelper.buildChowOptionIds(sequences, discardedTile);
          }
        }
      }

      // 检查是否可以胡（把弃牌加入手牌后能否胡）
      const wildArg = (game.customScoringMode || null);
      const wildGroup = game.wildTileGroup || [];
      const handWithDiscard = [...player.hand.concealedTiles, discardedTile];
      const huCheck = canWin(handWithDiscard, player.hand.exposedMelds, wildArg, undefined, wildGroup);
      if (huCheck.canWin) {
        availableActions.push(ActionType.HU);
      }

      if (availableActions.length > 0) {
        availableActions.push(ActionType.PASS);
        game.pendingActions.push({
          playerId: player.id,
          availableActions,
          tile: discardedTile,
          ...(chowOptions ? {
            chowOptions,
            selectedChowTileIds: this.deps.isPlayerBotControlled(player)
              ? selectBotChowTileIds(player, game, discardedTile, chowOptions)
              : undefined
          } : {}),
          expiresAt: Date.now() + timerManager.getHesitationWindow(game)
        });
      }
    }
  }

  /**
   * 找到吃牌的组合
   */
  private findChowSequences(hand: Tile[], discardedTile: Tile, game?: GameState): Tile[][] {
    const sequences: Tile[][] = [];
    const wildChecker = game ? buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup) : () => false;

    // 字牌（风/箭/花）不能被吃，只有数牌（万/条/筒）可以组成顺子
    if (discardedTile.suit === TileSuit.WIND || discardedTile.suit === TileSuit.DRAGON || discardedTile.suit === TileSuit.FLOWER) return [];

    // 如果弃牌本身是百搭,不能被吃
    if (game && wildChecker(discardedTile)) return [];

    // 过滤掉手牌中的百搭牌(百搭不能参与吃牌)
    const eligibleHand = game
      ? hand.filter(t => !wildChecker(t))
      : hand;
    
    // 按花色和数值排序
    const sortedHand = [...eligibleHand].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.value - b.value;
    });

    // 找到所有可能的吃牌组合
    for (let i = 0; i < sortedHand.length; i++) {
      for (let j = i + 1; j < sortedHand.length; j++) {
        const tile1 = sortedHand[i];
        const tile2 = sortedHand[j];
        
        // 检查是否是同一花色
        if (tile1.suit !== discardedTile.suit || tile2.suit !== discardedTile.suit) continue;
        
        // 检查是否是连续的三张牌
        const values = [tile1.value, tile2.value, discardedTile.value].sort((a, b) => a - b);
        if (values[0] + 1 === values[1] && values[1] + 1 === values[2]) {
          sequences.push([tile1, tile2]);
        }
      }
    }

    return sequences;
  }

  /**
   * 选择最佳吃牌组合
   */
  private selectBestChowSequence(sequences: Tile[][], discardedTile: Tile): Tile[] {
    if (sequences.length === 0) {
      throw new Error('No sequences available');
    }

    // 选择最简单的组合（数值最小的）
    return sequences.reduce((best, current) => {
      const bestSum = best.reduce((sum, t) => sum + t.value, 0);
      const currentSum = current.reduce((sum, t) => sum + t.value, 0);
      return currentSum < bestSum ? current : best;
    });
  }

  /**
   * 直接执行吃牌
   */
  executeChowDirectly(game: GameState, player: Player, tileIds?: string[]): void {
    this.handleChow(game, player, tileIds);
  }

  /**
   * 直接执行碰牌
   */
  executePengDirectly(game: GameState, player: Player): void {
    this.handlePeng(game, player);
  }

  /**
   * 直接执行胡牌
   */
  async executeWinDirectly(game: GameState, player: Player, winningTile: Tile): Promise<void> {
    this.handleHu(game, player);
  }

  /**
   * 直接执行杠牌
   */
  executeKongDirectly(game: GameState, player: Player, tileId: string): void {
    this.handleKong(game, player, tileId);
  }

  /**
   * 完成加杠
   */
  completeExtendedKong(game: GameState, player: Player, tile: Tile): void {
    this.handleExtendedKong(game, player, tile.id);
  }

  /**
   * 抢杠检查
   */
  resolveRobKongIfNeeded(game: GameState): boolean {
    return false;
  }
}
