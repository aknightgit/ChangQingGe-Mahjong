import {
  GameState,
  GamePhase,
  Player,
  PlayerStatus,
  Tile,
  ActionType,
  GameAction,
  Meld,
  MeldType,
  PendingAction,
  TileSuit,
  GameEndReason
} from '../types/game';
import { createDeck, shuffleTiles, findTileById, removeTile, sortTiles, tilesEqual, groupTiles, isMissingOneSuit, isFlower, isWind, isDragon, isFivePoison, getTileDisplayName } from './tiles';
import * as tileHelper from './tileHelper';
import { BroadcastService } from './broadcastService';
import { TimerManager } from './timerManager';
import { canWin, isTing, detectHandTypes, buildWildTileChecker, HandType, checkChowPongExclusion, updateChowPongExclusion } from './handValidator';
import { WinEvaluator } from './winEvaluator';
import { BailoutTracker } from './bailoutTracker';
import { SwapManager } from './swapManager';
import { calculateScore, calculateRoundMultiplier, calculateGameResult, calculateGlobalMultiplier, calculateSettlementBreakdownByRules, generateWinOptions, type WinOption } from './scoring';
import { randomUUID } from 'crypto';
import { saveGameState, loadGameState, loadAllGameStates, loadActiveGameStates, deleteGameState } from './gamePersistence';
import { MatchHistoryService } from '../services/matchHistoryService';
import { TrainingRecordService } from '../services/trainingRecordService';
import { isBotPlayer, selectBotChowTileIds, selectDiscardTile, shouldClaimPendingAction, refreshRouteMemoryAfterClaim } from '../services/botService';
import { formatBeijingTime } from './beijingTime';
import { isConcealedDiscardState, tileLabel } from './gameHelpers';
import { RoomGameBridge } from '../services/roomGameBridge';
import { GameStore } from '../services/gameStore';
import { BotController, type BotControllerDeps } from './botController';
import { ActionHandler, type ActionHandlerDeps } from './actionHandler';


/**
 * In-memory game state manager
 */
class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;
  private broadcastService = new BroadcastService();
  private timerManager = new TimerManager();
  private isHydrated = false;
  private botModePlayers: Set<string> = new Set();

  // ---- Public accessors for RoomGameBridge ----
  /** @internal */
  getActiveGames(): Map<string, GameState> { return this.games; }
  /** @internal */
  getWsManager(): any { return this.wsManager; }

  private store: GameStore;
  private botController: BotController;
  private actionHandler: ActionHandler;
  private winEvaluator = new WinEvaluator();
  private bailoutTracker = new BailoutTracker();
  private swapManager = new SwapManager(
    (id) => this.games.get(id),
    (gid, pid) => this.getPlayerCumulativeScore(gid, pid),
    (p) => this.isPlayerBotControlled(p)
  );

  constructor() {
    this.store = new GameStore();
    this.store._inject(this);
    this.store.startCleanup();
    this.botController = new BotController(this.createBotControllerDeps());
    this.actionHandler = new ActionHandler(this.createActionHandlerDeps());
  }

  private createBotControllerDeps(): BotControllerDeps {
    return {
      games: this.games,
      isPlayerBotControlled: (p) => this.isPlayerBotControlled(p),
      getCachedWinOptions: (g, p, c, f) => this.winEvaluator.getCachedWinOptions(g, p, c, f),
      getCachedWinCheck: (g, p) => this.winEvaluator.getCachedWinCheck(g, p),
      handlePass: (g, p) => this.handlePass(g, p),
      handlePeng: (g, p) => this.handlePeng(g, p),
      handleKong: (g, p, t) => this.handleKong(g, p, t),
      handleHu: (g, p, l) => this.handleHu(g, p, l),
      handleChow: (g, p, t) => this.handleChow(g, p, t),
      resolvePendingAction: (g, p, pa) => this.resolvePendingAction(g, p, pa),
      countExposedTilesExcludingFlowerMelds: (p) => this.countExposedTilesExcludingFlowerMelds(p),
      persistGame: (g) => this.persistGame(g),
      broadcastGameState: (id) => this.broadcastGameState(id),
      schedulePendingActionTimeout: (id) => this.schedulePendingActionTimeout(id),
      clearCurrentTurnPendingActions: (g, pid) => this.clearCurrentTurnPendingActions(g, pid),
      moveToNextPlayer: (g) => this.moveToNextPlayer(g),
      executeAction: (id, pid, a, t) => this.executeAction(id, pid, a, t),
      getAvailableActions: (id, pid) => this.getAvailableActions(id, pid),
      getGame: (id) => this.getGame(id),
      enableBotMode: (id, pid) => this.enableBotMode(id, pid),
      canPlayerDrawOnCurrentTurn: (g, p) => this.canPlayerDrawOnCurrentTurn(g, p),
      isConcealedDiscardState: (p) => this.isConcealedDiscardState(p),
      isChowChoiceOnlyActions: (a) => this.isChowChoiceOnlyActions(a),
      shouldAdvanceTurnAfterPass: (g) => this.shouldAdvanceTurnAfterPass(g),
      timerManager: this.timerManager
    };
  }

  private createActionHandlerDeps(): ActionHandlerDeps {
    return {
      games: this.games,
      endRound: (g, r) => this.endRound(g, r),
      broadcastGameState: (id) => this.broadcastGameState(id),
      broadcastQuickMessage: (id, text, type, actionKind) => this.broadcastQuickMessage(id, text, type as any, actionKind),
      persistGame: (g) => this.persistGame(g),
      recordWinImmediately: (g, w, f) => this.recordWinImmediately(g, w, f),
      handleDraw: (g, p, opts) => this.handleDraw(g, p, opts),
      replaceFlowers: (g, p) => this.replaceFlowers(g, p),
      isPlayerBotControlled: (p) => this.isPlayerBotControlled(p),
      timerManager: this.timerManager,
      getNextActivePlayer: (g, idx) => this.getNextActivePlayer(g, idx),
      getPreviousActivePlayer: (g, idx) => this.getPreviousActivePlayer(g, idx),
      moveToNextPlayer: (g) => this.moveToNextPlayer(g),
      isWildTile: (g, t) => this.isWildTile(g, t),
      sortHandWithWildFront: (t, g) => this.sortHandWithWildFront(t, g),
      getPlayerFlowerTiles: (p) => tileHelper.getPlayerFlowerTiles(p),
      isPlayerMenQing: (p) => tileHelper.isPlayerMenQing(p),
      getLastDiscardPlayerId: (g) => this.getLastDiscardPlayerId(g),
      getLastDiscardPosition: (g) => this.getLastDiscardPosition(g),
      isWinAfterKong: (g, pid) => this.isWinAfterKong(g, pid),
      getCachedWinOptions: (g, p, c, f) => this.winEvaluator.getCachedWinOptions(g, p, c, f),
      getCachedWinCheck: (g, p) => this.winEvaluator.getCachedWinCheck(g, p),
      invalidateWinEvaluationCache: (id, pids) => this.winEvaluator.invalidateCache(id, pids),
      schedulePendingActionTimeout: (id) => this.schedulePendingActionTimeout(id),
      scheduleBotDiscard: (id, pid) => this.scheduleBotDiscard(id, pid),
      clearAutoTakeover: (id, pid) => this.clearAutoTakeover(id, pid),
      recordBailoutAction: (id, pid, src, meld) => this.bailoutTracker.recordBailoutAction(id, pid, src, meld),
      checkAndBroadcastBailout: (g, pid, src) => this.bailoutTracker.checkAndBroadcastBailout(g, pid, src, (id, text, type, kind) => this.broadcastQuickMessage(id, text, type as any, kind)),
      getPlayerCumulativeScore: (id, pid) => this.getPlayerCumulativeScore(id, pid),
      checkQJThresholdAlerts: (g) => this.checkQJThresholdAlerts(g),
      enableBotMode: (id, pid) => this.enableBotMode(id, pid),
      autoStartNextRound: (id, delay) => this.autoStartNextRound(id, delay),
      advanceApprovalConflict: (g) => this.advanceApprovalConflict(g),
      beginCurrentPlayerTurn: (g) => this.beginCurrentPlayerTurn(g),
      checkLeadingBrother: (g, t, p) => this.checkLeadingBrother(g, t, p),
      updateRoundNumber: (g) => this.updateRoundNumber(g),
      resolveRobKongIfNeeded: (g) => this.resolveRobKongIfNeeded(g),
      clearBroadcasts: (id) => this.broadcastService.clearBroadcasts(id),
      store: this.store,
      getGame: (id) => this.getGame(id),
      replaceInitialFlowers: (g, p) => this.replaceInitialFlowers(g, p),
      getPlayableTileCount: (p) => this.getPlayableTileCount(p),
      broadcastKongSupplement: (g, p, kind) => this.broadcastService.broadcastKongSupplement(g, p, kind),
      broadcastFlowerReplacement: (g, p, c) => this.broadcastService.broadcastFlowerReplacement(g, p, c)
    };
  }

  getStore(): GameStore { return this.store; }

  // 互包跟踪: gameId -> Map<playerId, Map<partnerId, count>>
  // 记录每个玩家从另一个玩家吃/碰/杠了多少口

  // 互包关系缓存（500ms TTL，避免每次 state.get 重算）

  // 广播消息缓存: gameId -> BroadcastMsg[]（供HTTP API兜底，避免依赖WebSocket）
  // recentBroadcasts moved to BroadcastService

  // Pending action超时处理(自动推进)
  
  
  
  private isConcealedDiscardState = isConcealedDiscardState;

  private tileLabel = tileLabel;

  public broadcastQuickMessage(gameId: string, text: string, type: 'info' | 'warn' | 'special' = 'info', actionKind?: string): void {
    this.broadcastService.broadcastQuickMessage(gameId, text, type, actionKind);
  }

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
    console.log('[timing-startGame] persistGame:', Date.now() - Date.now(), 'ms');
        this.broadcastGameState(gameId);
    console.log('[timing-startGame] broadcastGameState:', Date.now() - Date.now(), 'ms');
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
      this.timerManager.clearPendingActionTimer(game.gameId);
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
      this.timerManager.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }

  private clearCurrentPlayerChowPending(game: GameState): boolean {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter(pendingAction => !this.shouldRetainCurrentPlayerChowPending(game, pendingAction));
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.timerManager.clearPendingActionTimer(game.gameId);
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
      this.timerManager.clearPendingActionTimer(game.gameId);
    }
  }

  private clearCurrentTurnPendingActions(game: GameState, playerId: string): boolean {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter(pendingAction => pendingAction.playerId !== playerId);
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.timerManager.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }

  private autoDrawForCurrentPlayer(game: GameState): boolean {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== PlayerStatus.PLAYING) return false;
    if (!this.canPlayerDrawOnCurrentTurn(game, currentPlayer)) return false;

    // 【修复】遵守决策犹豫期冻结，不绕过 freeze 检查
    const freezeUntil = Number((game as any)._freezeUntil ?? 0);
    const now = Date.now();
    if (freezeUntil > now) {
      console.log('[autoDraw] blocked by freeze:', freezeUntil - now, 'ms remaining');
      return false;
    }
    if (game.thinkFreezeUntil && game.thinkFreezeUntil > now && game.thinkFreezePlayerId !== currentPlayer.id) return false;

    this.replaceInitialFlowers(game, currentPlayer);
    const totalTileCount = this.getPlayableTileCount(currentPlayer);
    if (totalTileCount >= 14) {
      game.drawnThisTurn = true;
      return true;
    }

    this.handleDraw(game, currentPlayer);
    game.drawnThisTurn = true;
    if (this.isPlayerBotControlled(currentPlayer)) {
      this.scheduleBotDiscard(game.gameId, currentPlayer.id);
    }
    return true;
  }

  private canPlayerDeclareTurnHu(game: GameState, player: Player): boolean {
    if (!game.drawnThisTurn) return false;
    if ((player as any).lastDrawnTile) return true;
    const lastAction = game.actionHistory[game.actionHistory.length - 1];
    return !!lastAction && lastAction.playerId === player.id && lastAction.type === ActionType.DRAW;
  }

  private getConcealedPlayableTiles(game: GameState, player: Player): Tile[] {
    return tileHelper.getConcealedPlayableTiles(game, player);
  }

  private isListeningPreviewState(game: GameState, player: Player): boolean {
    const concealedPlayableCount = this.getConcealedPlayableTiles(game, player).length;
    return [1, 2, 4, 5, 7, 8, 10, 11, 13, 14].includes(concealedPlayableCount);
  }

  // Proxy for state.get.ts
  getMutualBailoutRelations(gameId: string) {
    return this.bailoutTracker.getMutualBailoutRelations(gameId);
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
  
  // AI托管模式:玩家ID集合,被标记的玩家由AI自动出牌
  /** 训练快速模式: TRAINING_FAST_MODE=true 或 allClaimMode */
  private isTrainingFastMode(game: GameState): boolean {
    const fastByEnv = String(process.env.TRAINING_FAST_MODE || '').toLowerCase() === 'true';
    return fastByEnv || !!(game as any).allClaimMode;
  }

  /** 获取决策犹豫期(毫秒):训练模式0~30ms,实战默认5000ms */

  /** 获取犹豫等待毫秒数(用于setTimeout等) */

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

  setWebSocketManager(manager: any) {
    this.wsManager = manager;
    this.broadcastService.setWsManager(manager);
  }

  /** 获取广播消息缓存（供HTTP API兜底） */
  getRecentBroadcasts(gameId: string): { id: number; text: string; type: string; timestamp: number; timeLabel: string }[] {
    return this.broadcastService.getRecentBroadcasts(gameId) || [];
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
    // ★ "我回来了" → 从botTakeoverPlayers移除，当局不减半
    for (const game of this.games.values()) {
      if (game.botTakeoverPlayers) {
        const idx = game.botTakeoverPlayers.indexOf(playerId);
        if (idx >= 0) {
          game.botTakeoverPlayers.splice(idx, 1);
          console.log(`[BotPenalty] ${playerId} 已回来，取消减半`);
        }
      }
    }
    // ★ 回来时重置连续超时计数，避免下次超时从累积值继续
    for (const [key, _] of this.timerManager.consecutiveTimeouts) {
      if (key.endsWith(`-${playerId}`)) {
        this.timerManager.consecutiveTimeouts.delete(key);
      }
    }
  }

  /**
   * 检查玩家是否处于AI托管模式
   */
  isPlayerInBotMode(playerId: string): boolean {
    return this.botModePlayers.has(playerId);
  }

  private clearPendingActionTimer(gameId: string): void {
    this.timerManager.clearPendingActionTimer(gameId);
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
    const nextExpiresAt = now + this.timerManager.getHesitationWindow(game);
    for (const pendingAction of game.pendingActions) {
      if (predicate && !predicate(pendingAction)) continue;
      pendingAction.expiresAt = Math.max(
        typeof pendingAction.expiresAt === 'number' ? pendingAction.expiresAt : 0,
        nextExpiresAt
      );
    }
  }

  private schedulePendingActionTimeout(gameId: string): void {
    this.timerManager.clearPendingActionTimer(gameId);

    // 等freeze延迟(1000ms)结束后才开始pending计时
    // 这样human玩家在freeze期间看清UI后,还有完整的1s反应时间
    const timer = this.timerManager.detachTimer(setTimeout(async () => {
      // 原子保护：若已在消费中则忽略本次触发
      if (this.timerManager.actionResolutionLocks.has(gameId)) return;
      this.timerManager.actionResolutionLocks.add(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (!game.pendingActions.length) return;

        // [FIX] 先处理所有机器人 pending action（吃/碰/杠/胡），无论是否在冻结期
        const botProcessed = await this.handleBotPendingActions(gameId);
        if (botProcessed) return;

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
          this.timerManager.refreshPendingActionExpirations(game, now);
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
            // ⭐ Bot有吃牌pending时先执行吃, 而不是直接清掉自动摸牌
            const chowPa = game.pendingActions.find(pa => pa.playerId === currentPlayer.id);
            if (chowPa && game.pendingActions.length === 1) {
              chowPa.selectedChowTileIds = chowPa.tile
                ? selectBotChowTileIds(currentPlayer, game, chowPa.tile, chowPa.chowOptions)
                : undefined;
              // ★ 修复：直接调用 handleChow，避免 resolvePendingAction 中 shouldClaimPendingAction 的随机概率推翻已做出的吃牌决策
              if (chowPa.selectedChowTileIds && chowPa.selectedChowTileIds.length > 0 && currentPlayer.hand.concealedTiles.length >= 2) {
                await this.handleChow(game, currentPlayer, chowPa.selectedChowTileIds);
                refreshRouteMemoryAfterClaim(currentPlayer, game);
              } else {
                this.handlePass(game, currentPlayer);
              }
              game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== currentPlayer.id);
              await this.persistGame(game);
              this.broadcastGameState(gameId);
              this.scheduleBotDiscard(gameId, currentPlayer.id);
              return;
            }
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
        this.timerManager.actionResolutionLocks.delete(gameId);
        if (this.timerManager.pendingActionTimers.get(gameId) === timer) {
          this.timerManager.pendingActionTimers.delete(gameId);
        }
      }
    }, this.timerManager.getPendingActionWaitMs(gameId))); // 决策犹豫期(训练模式可加速)

    this.timerManager.pendingActionTimers.set(gameId, timer);
  }

  /**
   * 让 bot 处理自己的 pending action(碰/杠/胡/吃/过)
   * Bug修复:bot必须等满 hesitationWindow 再 action,否则人类按钮闪现消失
   */


  /** 统一处理 pendingAction 决策(吃/碰/杠/胡/PASS) */
  private async resolvePendingAction(game: GameState, player: Player, pa: PendingAction): Promise<ActionType> {
    const action = await shouldClaimPendingAction(player, pa.availableActions, game);
    console.log(`[PendingResolve] ${player.name} → ${action}`);
    if (action === ActionType.PASS) {
      this.handlePass(game, player);
    } else if (action === ActionType.PENG) {
      if (player.hand.concealedTiles.length >= 2) {
        this.handlePeng(game, player);
        refreshRouteMemoryAfterClaim(player, game);
      }
      else { this.handlePass(game, player); }
    } else if (action === ActionType.CHOW) {
      if (player.hand.concealedTiles.length >= 2) {
        console.log(`[PendingResolve] ${player.name} executing CHOW (concealed=${player.hand.concealedTiles.length})`);
        this.handleChow(game, player, pa.selectedChowTileIds);
        refreshRouteMemoryAfterClaim(player, game);
      } else {
        console.warn(`[PendingResolve] ${player.name} CHOW blocked: not enough tiles`);
        this.handlePass(game, player);
      }
    } else if (action === ActionType.HU) {
      // ★ 捉冲校验: 用 getCachedWinOptions + extraTile 严格检查能否胡
      const huPendingTile = pa.tile;
      const winOptions = this.winEvaluator.getCachedWinOptions(game, player, 'discard', {
        extraTile: huPendingTile || undefined
      });
      if (winOptions.length === 0) {
        console.log(`[resolvePendingAction] ${player.name} HU rejected: winOptions=0 (canWin=false with extraTile)`);
        this.handlePass(game, player);
      } else {
        console.log(`[resolvePendingAction] ${player.name} HU before: currentPlayerIndex=${game.currentPlayerIndex} phase=${game.phase} wall=${game.wall?.length}`);
        await this.handleHu(game, player);
        console.log(`[resolvePendingAction] ${player.name} HU after: currentPlayerIndex=${game.currentPlayerIndex} phase=${game.phase} wall=${game.wall?.length} drawnThisTurn=${game.drawnThisTurn} pendingActions=${game.pendingActions?.length}`);
      }
    } else {
      this.handlePass(game, player);
    }
    return action;
  }

  /** bot 训练模式专用 */

  private countExposedTilesExcludingFlowerMelds(player: Player): number {
    return tileHelper.countExposedTilesExcludingFlowerMelds(player);
  }

  private getPlayableTileCount(player: Player): number {
    return tileHelper.getPlayableTileCount(player);
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
  private async handleBotPendingActions(gameId: string): Promise<boolean> {
    return this.botController.handleBotPendingActions(gameId);
  }


      private async resolveBotChowNow(game: GameState, player: Player, pa: PendingAction): Promise<void> {
    return this.botController.resolveBotChowNow(game, player, pa);
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
      ActionType.KONG,
      ActionType.CONCEALED_KONG,
      ActionType.EXTENDED_KONG
    ]);

    // 从 actionHistory 末尾向前找,找到该玩家最近的非DRAW动作
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      const action = game.actionHistory[i];
      if (action.playerId !== playerId) continue;
      if (action.type === ActionType.DRAW) continue; // 跳过自动补牌
      // 第一个非DRAW动作
      return kongTypes.has(action.type);
    }
    return false;
  }

  public async hydrateFromDatabase(): Promise<void> {
    return this.store.hydrateFromDatabase();
  }

  public async ensureGameLoaded(gameId: string): Promise<GameState | undefined> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }

    try {
      const stored = await loadGameState(gameId);
      if (stored) {
                this.games.set(gameId, stored);
        // 🔧 【根治】修复恢复时 player.id 为空: userId → id
        for (const player of stored.players) {
          const oldId = player.id;
          if (!player.id && player.userId) {
            player.id = player.userId;
          } else if (!player.id && !player.userId) {
            player.id = 'recovered-' + randomUUID();
          }
          if (player.id) {
            this.playerToGame.set(player.id, gameId);
            if (oldId !== player.id) {
              console.log('[Recovery] Fixed player.id for', player.name, ':', oldId, '->', player.id);
            }
          }
        }
        // 🔧 【根治】恢复重启后丢失的 pending 超时和 freeze timer
        if (stored.phase === 'playing') {
          const currentPlayer = stored.players[stored.currentPlayerIndex];
          const hasPending = stored.pendingActions && stored.pendingActions.length > 0;
          
          if (hasPending) {
            const now = Date.now();
            const hasUnresolved = stored.pendingActions.some(pa =>
              typeof pa.expiresAt === 'number' && pa.expiresAt > now
            );
            if (hasUnresolved) {
              // 重建 freeze timer (bot) 或 pending timer (human)
              this.schedulePendingActionTimeout(gameId);
              console.log('[Recovery] Restored pending timeout for game', gameId);
            } else {
              setImmediate(() => this.schedulePendingActionTimeout(gameId));
              console.log('[Recovery] Scheduled immediate resolution for expired pending in game', gameId);
            }
          } else if (currentPlayer && this.isPlayerBotControlled(currentPlayer)) {
            // ⭐ 修复核心: bot 轮到但没有 freeze timer → 模拟 beginCurrentPlayerTurn 的 freeze
            const freezeMs = this.timerManager.getHesitationWindow(stored);
            console.log('[Recovery] Restoring bot freeze timer for', currentPlayer.name, 'delay:', freezeMs);
            const botFreezeTimer = this.timerManager.detachTimer(setTimeout(async () => {
              try {
                this.timerManager.freezeTimers.delete(gameId);
                const freshGame = await this.getGame(gameId);
                if (!freshGame || freshGame.phase !== 'playing') return;
                if (freshGame.currentPlayerIndex !== stored.currentPlayerIndex) return;
                const livePlayer = freshGame.players[freshGame.currentPlayerIndex];
                if (!livePlayer || livePlayer.status !== 'playing') return;
                console.log('[Recovery] Bot freeze expired for', livePlayer.name, 'drawing...');
                if (freshGame.wall.length === 0) {
                  this.endRound(freshGame, 'wall_exhausted');
                  return;
                }
                this.replaceFlowers(freshGame, livePlayer);
                if (this.getPlayableTileCount(livePlayer) >= 14) {
                  freshGame.drawnThisTurn = true;
                } else {
                  this.handleDraw(freshGame, livePlayer);
                  freshGame.drawnThisTurn = true;
                }
                this.scheduleBotDiscard(gameId, livePlayer.id);
                await this.persistGame(freshGame);
                this.broadcastGameState(gameId);
              } catch (err) {
                console.warn('[Recovery] Bot freeze handler error:', err);
              }
            }, freezeMs));
            this.timerManager.freezeTimers.set(gameId, botFreezeTimer);
          } else if (currentPlayer) {
            // 人类玩家: 调度 pending 超时等待操作
            this.schedulePendingActionTimeout(gameId);
            console.log('[Recovery] Scheduled pending timeout for human player', currentPlayer.name);
          }
        }
      }
        return stored;
    } catch (err: any) {
      console.warn('⚠️ ensureGameLoaded failed:', err.message);
    }

    return undefined;
  }

  public async persistGame(game: GameState): Promise<void> {
    return this.store.persistGame(game);
  }

  /**
   * ★ K哥铁律: 胡牌成功的瞬间立即记录 winner 数据到 mahjongTrainingRounds
   * 不依赖 endRound, 即使后续游戏崩溃/玩家退场, 胡牌案例已存档
   * 使用已存在的 latestRoundStat(从 game.roundStats 末位)或构造临时 stat
   */
  public async recordWinImmediately(
    game: GameState,
    winner: Player,
    flags?: { isSelfDrawn?: boolean; isKongFlower?: boolean; isRobbingKong?: boolean }
  ): Promise<void> {
    try {
      // 构造临时 roundStat(供 TrainingRecordService 使用)
      const tempRoundStat: any = {
        roundNumber: game.roundNumber,
        winners: [winner.id],
        selfDraws: flags?.isSelfDrawn ? [winner.id] : [],
        winnerDetails: [{
          playerId: winner.id,
          playerName: winner.name,
          winOrder: winner.winOrder ?? null,
          winRound: winner.winRound ?? null,
          winTimestamp: winner.winTimestamp ?? null,
          handTypeName: winner.winHandType || winner.handTypeName || '未知',
          isSelfDrawn: flags?.isSelfDrawn ?? false,
          isKongFlower: flags?.isKongFlower ?? false,
          isRobbingKong: flags?.isRobbingKong ?? false,
          handTiles: winner.hand?.concealedTiles || [],
          exposedTiles: winner.hand?.exposedMelds?.flatMap((m: any) => m.tiles) || [],
          tileFaces: [],
          baseFan: winner.wonFan || 0,
          finalPoints: winner.wonFan || 0,
          isMenQing: !winner.hand?.exposedMelds?.length,
        }],
        finalScores: game.players.reduce((acc, p) => { acc[p.id] = 0; return acc }, {} as Record<string, number>),
      }
      await TrainingRecordService.recordRound(game, 'win_immediately', tempRoundStat.finalScores, tempRoundStat).catch((e: any) => {
        console.warn('[recordWinImmediately] TrainingRecordService failed:', e?.message);
      })
      console.log(`[recordWinImmediately] ${winner.name} 麻将案例已存档 (gameId=${game.gameId.substring(0,8)})`)
    } catch (e: any) {
      console.warn('[recordWinImmediately] error:', e?.message)
    }
  }

  /** 立即持久化（不走延迟队列） */
  public async persistGameImmediate(game: GameState): Promise<void> {
    return this.store.persistGameImmediate(game);
  }

  /** 关键节点立即刷盘（回合结束/退房/断连） */
  public async flushGameNow(gameId: string): Promise<void> {
    return this.store.flushGameNow(gameId);
  }

  /** 服务关闭前刷所有脏数据 */
  public async flushAllGames(): Promise<void> {
    return this.store.flushAll();
  }

  public broadcastGameState(gameId: string): void {
    this.store.broadcastGameState(gameId);
  }

  /**
   * Create a new game
   */
  private generateRoomNumber(): string {
    return RoomGameBridge.generateRoomNumber(this.games);
  }

  async createGame(playerName: string, options?: { userId?: string; roomNumber?: string; diceRollCount?: number; firstRoundDouble?: boolean; liangShanThreshold?: number; thinkChances?: number; settlementMultiplier?: number; maxBots?: number; minPlayers?: number; hesitationWindow?: number; allClaimMode?: boolean; selectedBots?: string[] }): Promise<{ gameId: string; playerId: string }> {
    await this.hydrateFromDatabase();

    const gameId = randomUUID();
    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      userId: options?.userId,
      name: playerName,
      position: 0,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: true,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    };

    const game: GameState = {
      gameId,
      roomNumber: options?.roomNumber || this.generateRoomNumber(),
      phase: GamePhase.WAITING,
      endReason: null,
      players: [player],
      wall: [],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: Date.now(),
      lastActionTime: Date.now(),
      endedAt: undefined,
      customScoringMode: null,
      finalScores: undefined,
      pendingActions: [],
      pendingKongClaim: undefined,
      multiHuStarterIndex: undefined,
      dice: undefined,
      roundMultiplier: undefined,
      inheritMultiplier: undefined,
      inheritedGlobalMultiplier: options?.firstRoundDouble ? 2 : 1,
      rebelEvent: undefined,
      diceRollCount: options?.diceRollCount ?? 2,
      liangShanThreshold: options?.liangShanThreshold ?? 4000,
      thinkChances: options?.thinkChances ?? 3,
      settlementMultiplier: options?.settlementMultiplier ?? 10,
      maxBots: options?.maxBots ?? 3,  // 默认允许最多3个AI
      minPlayers: options?.minPlayers ?? 4,  // 默认最少4人开局
      hesitationWindow: (() => {
        const raw = options?.hesitationWindow;
        const fastByEnv = String(process.env.TRAINING_FAST_MODE || '').toLowerCase() === 'true';
        const fastMode = fastByEnv || !!options?.allClaimMode;
        return fastMode ? Math.min(30, Math.max(0, raw ?? 0)) : (raw ?? 0);
      })(), // 决策犹豫期:训练模式0~30ms,实战默认5秒
      thinkUsage: {},
      allClaimMode: options?.allClaimMode,
      spectatorMode: null,
      spectatorViews: {},
      spectatorApprovalRequests: []
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    // 立即添加选定的AI玩家
    const aiBots = options?.selectedBots ?? [];
    for (const botName of aiBots) {
      if (game.players.length >= 4) break;
      const botId = randomUUID();
      const botPlayer = {
        id: botId,
        name: botName,
        position: game.players.length,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PlayerStatus.WAITING,
        isDealer: false,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0,
        winOrder: null,
        winRound: null,
        winTimestamp: null,
        score: 0,
      };
      game.players.push(botPlayer);
      this.playerToGame.set(botId, gameId);
    }

    // 立即刷盘，确保其他设备能从 MongoDB 查到此房间
    await this.persistGameImmediate(game);

    return { gameId, playerId };
  }

  /**
   * Join an existing game
   */
  /**
   * 通过4位房间号查找游戏
   */
  async findGameByRoomNumber(roomNumber: string): Promise<string | null> {
    return RoomGameBridge.findGameByRoomNumber(
      () => this.hydrateFromDatabase(),
      this.games,
      roomNumber
    );
  }

  async joinGame(gameId: string, playerName: string, options?: { userId?: string }): Promise<{ playerId: string; position: number; isSpectator?: boolean }> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // 满员 → 以观赛者身份加入
    // 注意：未满员但已开局（如A+2个AI已开始），真人玩家仍作为正式玩家加入
    const minPlayers = (game as any).minPlayers ?? 4;
    const isFull = game.players.length >= minPlayers;
    if (isFull) {
      const spectatorId = 'spectator-' + randomUUID();
      const spectator: Player = {
        id: spectatorId,
        userId: options?.userId,
        name: playerName + '(观赛)',
        position: -1,
        status: PlayerStatus.SPECTATING,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        score: 0
      };
      game.players.push(spectator);
      if (!game.spectatorViews) game.spectatorViews = {};
      const scope = (() => {
        const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
        return game.phase === 'ended' ? completedRounds : completedRounds + 1;
      })();
      // 默认指向庄家或第一个非观赛玩家，让观赛者进来就能看到牌背
      const defaultTarget = game.players.find(p => p.status !== 'spectating' && p.status !== 'left');
      game.spectatorViews[spectatorId] = {
        viewingPlayerId: defaultTarget ? defaultTarget.id : null,
        approvedHumanPlayerId: null,
        pendingHumanPlayerId: null,
        roundNumber: scope,
        updatedAt: Date.now()
      };
      await this.persistGame(game);
      return { playerId: spectatorId, position: -1, isSpectator: true };
    }

    // Bot上限检查:建房时的AI玩家上限全程有效
    const isBotJoin = playerName.startsWith('AI-') || playerName.startsWith('电脑');
    if (isBotJoin) {
      const currentBots = game.players.filter(p => p.name.startsWith('AI-') || p.name.startsWith('电脑')).length;
      const maxBots = game.maxBots ?? 3;
      if (currentBots >= maxBots) {
        throw new Error(`AI玩家数量已达上限(${maxBots}个)`);
      }
    }

    if (options?.userId) {
      const existingPlayer = game.players.find((player) => player.userId === options.userId);
      if (existingPlayer) {
        // 玩家已在房间中 — 用 userId 作为 playerId 返回
        // 同时确保 player 有 id 字段（防止后续其他地方用 entry.id 匹配失败）
        if (!existingPlayer.id) {
          existingPlayer.id = existingPlayer.userId!
        }
        return { playerId: existingPlayer.id!, position: existingPlayer.position };
      }
    }

    const playerId = randomUUID();
    const position = game.players.length;

    const player: Player = {
      id: playerId,
      userId: options?.userId,
      name: playerName,
      position,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: false,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    };

    game.players.push(player);
    this.playerToGame.set(playerId, gameId);

    // 【新增】房间满员时第一时间广播
    const minPlayersForBroadcast = (game as any).minPlayers ?? 4;
    if (game.players.filter(p => p.status !== 'spectating' && p.status !== 'left').length >= minPlayersForBroadcast) {
      this.broadcastQuickMessage(gameId, '🀄 房间满员了，正式开干！', 'special');
    }

    // Auto-start removed. Use manual start.
    // if (game.players.length === 4) {
    //   this.startGame(gameId);
    // }

    // Broadcast update so lobby sees new player
    await this.persistGame(game);
    if (!isBotJoin) {
      this.broadcastService.broadcastRoomJoin(game, player);
    }
    this.broadcastGameState(gameId);

    return { playerId, position };
  }

  /**
   * Set game to STARTING phase (broadcast to all clients for dice animation)
   * Called when dealer clicks "开始游戏" in waiting room, before actual dealing
   */
  /**
  // ═══════════════════════════════════════════════════════════
  // 新开局流程: beginGame → rollFirstDice(人类庄家) → rollSecondDice → dealGame
  // ═══════════════════════════════════════════════════════════

  /**
   * 新开局流程 - 第一步: 洗牌 + 发牌 + 第一次掷骰子
   * 服务端原子完成，客户端只需等广播显示骰子动画
   */
  public async beginGame(gameId: string, options?: { hesitationWindow?: number }): Promise<void> {
    const _bgTimer = Date.now();
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase === GamePhase.PLAYING || game.phase === GamePhase.STARTING) {
      console.log('[beginGame] Already STARTING or PLAYING, skipping');
      return;
    }
    // ★ K哥铁律(2026-06-05): 上一局可能遗留 winnersCount 等胜者计数跨局。
    // 重新计算本局真实的 winnersCount(根据玩家 status 重新统计)。
    const realWinnersCount = game.players.filter(p => p.status === PlayerStatus.WON).length;
    if (realWinnersCount !== game.winnersCount) {
      console.warn(`[beginGame] Sync winnersCount: ${game.winnersCount} → ${realWinnersCount} (based on player status)`);
      game.winnersCount = realWinnersCount;
    }
    if (game.players.length < 4) {
      throw new Error('Need 4 players to start');
    }

    // ── 重置上一局残留状态 ──
    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.customScoringMode = null;
    game.liangShanSuccess = undefined;
    game.liangShanVotes = [];
    game.discardPile = [];
    game.actionHistory = [];
    game.pendingActions = [];
    game.drawnThisTurn = false;
    if (typeof options?.hesitationWindow === 'number') {
      game.hesitationWindow = options.hesitationWindow;
    }
    game.thinkFreezeUntil = undefined;
    game.thinkFreezePlayerId = undefined;
    game.spectatorMode = null;
    game.spectatorViews = {};
    game.spectatorApprovalRequests = [];
    game.consecutiveDiscards = null;
    game.leadingBrotherEvent = null;
    this.bailoutTracker.clearGame(gameId);
    (game as any).bailoutRelations = [];

    // 清除残留 timer
    const oldFreezeTimer = this.timerManager.freezeTimers.get(gameId);
    if (oldFreezeTimer) {
      clearTimeout(oldFreezeTimer);
      this.timerManager.freezeTimers.delete(gameId);
    }
    game.freezePlayerId = null;
    game.freezeComplete = false;
    game.freezeRound = undefined;

    // ── 换位 + 观赛替换AI ──
    this.swapManager.applySwapRequests(game);
    this.swapManager.applyBotReplacement(game);

    // ── 首局随机座位 ──
    const isFirstRound = (game.roundStats || []).length === 0;
    // 【修复】记录建房者ID（首局=第一个加入房间的玩家）
    const creatorId = game.players[0]?.userId || game.players[0]?.id;
    if (isFirstRound) {
      const shuffledIndices = Array.from({ length: game.players.length }, (_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      game.players = shuffledIndices.map((origIdx, newPos) => {
        const p = game.players[origIdx];
        p.position = newPos;
        return p;
      });
    }

    // ── 选庄家: 首局建房者坐庄，后续上局首胡者坐庄 ──
    if (game.nextDealerId) {
      const nextDealer = game.players.find(p => p.id === game.nextDealerId);
      if (nextDealer) {
        game.dealerIndex = nextDealer.position;
        console.log(`[beginGame] 上局指定庄家: ${nextDealer.name}`);
      } else {
        game.dealerIndex = Math.floor(Math.random() * game.players.length);
      }
      game.nextDealerId = null;
    } else {
      // 【修复】首局：建房者坐庄（按creatorId查找，不受座位打乱影响）
      if (creatorId) {
        const creatorPos = game.players.findIndex(p => (p.userId && p.userId === creatorId) || p.id === creatorId);
        game.dealerIndex = creatorPos >= 0 ? creatorPos : 0;
        console.log(`[beginGame] 首局建房者坐庄: ${game.players[game.dealerIndex]?.name} pos=${game.dealerIndex}`);
      } else {
        game.dealerIndex = 0;
      }
    }
    game.players.forEach((p, i) => { p.isDealer = (i === game.dealerIndex); });

    // ── 创建牌墙(144张) + 选百搭 ──
    const deck = createDeck();
    game.wall = shuffleTiles(deck);
    console.log(`[beginGame] wall: ${game.wall.length} tiles`);

    const allTileTypes: Array<{ suit: TileSuit; value: number }> = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let v = 1; v <= 9; v++) allTileTypes.push({ suit, value: v });
    }
    for (let v = 1; v <= 4; v++) allTileTypes.push({ suit: TileSuit.WIND, value: v });
    for (let v = 1; v <= 3; v++) allTileTypes.push({ suit: TileSuit.DRAGON, value: v });
    for (let v = 1; v <= 8; v++) allTileTypes.push({ suit: TileSuit.FLOWER, value: v });
    const wildIndex = Math.floor(Math.random() * allTileTypes.length);
    const wildType = allTileTypes[wildIndex];
    game.customScoringMode = `${wildType.suit}-${wildType.value}`;
    if (wildType.suit === TileSuit.FLOWER) {
      game.wildTileGroup = wildType.value <= 4 ? ['1', '2', '3', '4'] : ['5', '6', '7', '8'];
    }

    // ── 重置吃碰排斥 ──
    game.chowPongExclusion = {};

    // ── 发牌: 每人13张，庄家14张 ──
    for (const player of game.players) {
      player.hand.concealedTiles = [];
      player.hand.exposedMelds = [];
      player.hand.discardedTiles = [];
      for (let i = 0; i < 13; i++) {
        const tile = game.wall.pop()!;
        if (isFlower(tile) && !this.isWildTile(game, tile)) {
          // 普通花牌放到门口,等回合补花
          player.hand.exposedMelds.push({
            type: MeldType.TRIPLET,
            tiles: [tile],
            isConcealed: false,
            replacementDone: false as any
          } as any);
        } else {
          player.hand.concealedTiles.push(tile);
        }
      }
      player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      player.status = PlayerStatus.PLAYING;
      player.score = 0;
    }
    // 庄家摸第14张
    {
      const tile = game.wall.pop()!;
      if (isFlower(tile) && !this.isWildTile(game, tile)) {
        game.players[game.dealerIndex].hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [tile],
          isConcealed: false,
          replacementDone: false as any
        } as any);
      } else {
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      }
      game.players[game.dealerIndex].hand.concealedTiles = this.sortHandWithWildFront(
        game.players[game.dealerIndex].hand.concealedTiles, game
      );
    }
    console.log(`[beginGame] after dealing: wall=${game.wall.length} tiles`);

    // ── 重置玩家赢牌状态 ──
    for (const player of game.players) {
      player.winOrder = null;
      player.winRound = null;
      player.winTimestamp = null;
      player.wonFan = 0;
      player.winHandType = undefined;
      player.isSelfDrawn = undefined;
      player.discarderId = undefined;
      (player as any).winningTileName = undefined;
      player.winningScoreBreakdown = undefined;
      player.score = 0;
    }

    // ── 继承上局全局倍数 ──
    const prevGlobal = game.inheritedGlobalMultiplier ?? 1;
    if (game.rebelEvent) {
      game.inheritMultiplier = calculateGlobalMultiplier(prevGlobal, '造反');
      game.rebelEvent = undefined;
    } else {
      game.inheritMultiplier = prevGlobal;
    }
    game.inheritedGlobalMultiplier = undefined;

    // ── 根据继承倍数确定掷骰次数：>=2倍时只掷1次 ──
    const baseRollCount = game.diceRollCount ?? 2;
    const effectiveRollCount = prevGlobal >= 2 ? 1 : baseRollCount;
    (game as any).effectiveDiceRollCount = effectiveRollCount;

    // ── 掷骰子：人类庄家不预先掷，等玩家自己点击 ──
    const dealer = game.players[game.dealerIndex];
    const humanDealer = dealer && !isBotPlayer(dealer);

    if (!humanDealer) {
      // AI 庄家：服务端预先掷骰子
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      game.dice = [d1, d2];
      game.diceRolls = undefined;

      const singleMult = (() => {
        const isDouble = d1 === d2;
        const isOneFour = (d1 === 1 && d2 === 4) || (d1 === 4 && d2 === 1);
        if (isDouble) return (d1 === 1 || d1 === 4) ? 4 : 2;
        if (isOneFour) return 2;
        return 1;
      })();
      game.roundMultiplier = singleMult;

      // 继承倍数>=2时只掷1次，第一次掷完直接标记不需要第二次
      const needSecondRoll = effectiveRollCount >= 2 && singleMult === 1;
      (game as any)._needSecondRoll = needSecondRoll;

      if (this.wsManager) {
        this.wsManager.broadcast(gameId, 'diceRoll', {
          dice1: d1, dice2: d2,
          timestamp: Date.now()
        });
      }

      console.log(`[beginGame] AI dealer: dice=${d1}+${d2} mult=${singleMult} needSecond=${needSecondRoll}`);
    } else {
      // 人类庄家：不掷骰子，等玩家自己点击
      game.dice = [0, 0];
      game.diceRolls = undefined;
      game.roundMultiplier = 1;
      (game as any)._needSecondRoll = false;
      (game as any)._humanRollPending = true;
      console.log(`[beginGame] Human dealer: waiting for player to roll dice`);
    }

    // 切换到 STARTING 阶段
    game.phase = GamePhase.STARTING;
    game.lastActionTime = Date.now();
    game.currentPlayerIndex = game.dealerIndex;
    console.log(`[timing-beginGame] prep done: ${Date.now() - _bgTimer}ms`);

    await this.persistGame(game);
    this.broadcastGameState(gameId);
    console.log(`[beginGame] STARTING total=${Date.now() - _bgTimer}ms`);
  }

  /**
   * 新开局流程 - 人类庄家掷骰子（客户端触发，随机生成）
   */
  public async rollFirstDice(gameId: string): Promise<{ dice1: number; dice2: number; roundMultiplier: number }> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.STARTING) {
      throw new Error('Game is not in STARTING phase');
    }
    if (!(game as any)._humanRollPending) {
      throw new Error('Dice already rolled');
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    game.dice = [d1, d2];
    game.diceRolls = undefined;

    const singleMult = (() => {
      const isDouble = d1 === d2;
      const isOneFour = (d1 === 1 && d2 === 4) || (d1 === 4 && d2 === 1);
      if (isDouble) return (d1 === 1 || d1 === 4) ? 4 : 2;
      if (isOneFour) return 2;
      return 1;
    })();
    game.roundMultiplier = singleMult;

    const effectiveRollCount = (game as any).effectiveDiceRollCount ?? game.diceRollCount ?? 2;
    const needSecondRoll = effectiveRollCount >= 2 && singleMult === 1;
    (game as any)._needSecondRoll = needSecondRoll;
    delete (game as any)._humanRollPending;

    if (this.wsManager) {
      this.wsManager.broadcast(gameId, 'diceRoll', {
        dice1: d1, dice2: d2,
        timestamp: Date.now()
      });
    }

    await this.persistGame(game);
    this.broadcastGameState(gameId);
    console.log(`[rollFirstDice] dice=${d1}+${d2} mult=${singleMult} needSecond=${needSecondRoll}`);

    return { dice1: d1, dice2: d2, roundMultiplier: singleMult, needSecondRoll };
  }

  /**
   * 新开局流程 - 第二步(可选): 第二次掷骰子
   * 仅当 diceRollCount>=2 且第一次骰子未翻倍时调用
   */
  public async rollSecondDice(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.STARTING) {
      throw new Error('Game is not in STARTING phase');
    }
    if (game.diceRolls) {
      throw new Error('Already rolled twice');
    }

    const d1 = game.dice![0];
    const d2 = game.dice![1];
    const d3 = Math.floor(Math.random() * 6) + 1;
    const d4 = Math.floor(Math.random() * 6) + 1;

    game.diceRolls = [[d1, d2], [d3, d4]];
    game.roundMultiplier = calculateRoundMultiplier(d1, d2, d3, d4);

    // 广播第二次骰子
    if (this.wsManager) {
      this.wsManager.broadcast(gameId, 'diceRoll', {
        dice1: d3, dice2: d4,
        dice3: d1, dice4: d2,
        timestamp: Date.now()
      });
    }

    (game as any)._needSecondRoll = false;

    await this.persistGame(game);
    this.broadcastGameState(gameId);
    console.log(`[rollSecondDice] dice=${d1}+${d2} / ${d3}+${d4} mult=${game.roundMultiplier}`);
  }

  /**
   * 新开局流程 - 第三步: 点击发牌，切换到 PLAYING 阶段
   */
  public async dealGame(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.STARTING) {
      throw new Error('Game is not in STARTING phase');
    }

    // 清除临时标记
    delete (game as any)._needSecondRoll;

    // 切换到 PLAYING
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();

    // 广播开局消息（已在 joinGame 时广播过，此处不重复）
    TrainingRecordService.captureRoundStart(game);

    console.log(`[dealGame] PLAYING: wall=${game.wall.length} tiles, dealer=${game.players[game.dealerIndex]?.name}`);

    this.broadcastGameState(gameId);
    await this.persistGame(game);

    // 庄家首轮 freeze 后自动摸牌
    const freezeMs = this.timerManager.getHesitationWindow(game);
    const dealer = game.players[game.currentPlayerIndex];
    if (dealer) {
      if (this.isPlayerBotControlled(dealer)) {
        (game as any)._freezeUntil = Date.now() + freezeMs;
        const botTimer = this.timerManager.detachTimer(setTimeout(async () => {
          try {
            this.timerManager.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            const liveDealer = freshGame.players[freshGame.currentPlayerIndex];
            if (!liveDealer || liveDealer.id !== dealer.id || liveDealer.status !== PlayerStatus.PLAYING) return;
            this.replaceFlowers(freshGame, liveDealer);
            if (this.getPlayableTileCount(liveDealer) >= 14) {
              freshGame.drawnThisTurn = true;
            } else {
              this.handleDraw(freshGame, liveDealer);
              freshGame.drawnThisTurn = true;
            }
            this.scheduleBotDiscard(gameId, liveDealer.id);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error('[dealGame-bot-freeze] Error:', err);
          }
        }, this.timerManager.getHesitationWindow(game)));
        this.timerManager.freezeTimers.set(gameId, botTimer);
      } else {
        (game as any)._freezeUntil = Date.now() + freezeMs;
        await this.persistGame(game);
        this.broadcastGameState(gameId);

        const humanTimer = this.timerManager.detachTimer(setTimeout(async () => {
          try {
            this.timerManager.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            if (freshGame.pendingActions.length > 0) return;

            delete (freshGame as any)._freezeUntil;
            const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
              this.replaceFlowers(freshGame, nextPlayer);
              if (this.getPlayableTileCount(nextPlayer) >= 14) {
                freshGame.drawnThisTurn = true;
              } else {
                this.handleDraw(freshGame, nextPlayer);
                freshGame.drawnThisTurn = true;
              }
              await this.persistGame(freshGame);
              this.broadcastGameState(gameId);
            }
          } catch (err) {
            console.error('[dealGame-human-freeze] Error:', err);
          }
        }, this.timerManager.getHesitationWindow(game)));
        this.timerManager.freezeTimers.set(gameId, humanTimer);
      }
    }
  }

  /**
   * Start the game (旧流程，兼容)
   */
  public async startGame(gameId: string, options?: { hesitationWindow?: number; fixedDice?: [number, number] }): Promise<void> {
    const _startGameTimer = Date.now();
    console.log('[timing-startGame] BEGIN');
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;
    console.log('[timing-startGame] ensureGameLoaded:', Date.now() - Date.now(), 'ms');

    // ★ 防重复调用：如果已经 PLAYING 则跳过
    if (game.phase === GamePhase.PLAYING) {
      console.log('[startGame] Already PLAYING, skipping duplicate call');
      return;
    }

    if (game.players.length < 4) {
      throw new Error('Need 4 players to start');
    }

    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.customScoringMode = null;
    game.winnersCount = 0;  // ★ 新局重置赢家计数（防止跨局累积导致 PeriodicCleanup 误判）
    // ★ 强制重置所有玩家 status 为 PLAYING（防止 endRound 异常中断后 status 残留）
    // 注意：p.score 是累计分，不能清零！endRound 里 player.score = finalScores[pid] 是单局得分
    for (const p of game.players) {
      p.status = PlayerStatus.PLAYING;
      p.winOrder = null;
      p.winRound = null;
      p.winTimestamp = null;
      p.isSelfDrawn = undefined;
      p.discarderId = undefined;
      p.winningScoreBreakdown = undefined;
      p.wonFan = 0;
      p.winHandType = undefined;
      // p.score 不重置！战绩榜需要累计
    }
    game.liangShanSuccess = undefined;  // 清除聚义成功标记
    game.liangShanVotes = [];  // 重置聚义投票，新局允许再次发起
    // 清空上一局残留状态
    game.discardPile = [];
    game.pendingActions = [];
    game.drawnThisTurn = false;
    // 统一使用 hesitationWindow（决策犹豫期），仅从建房参数传入，不做二次裁剪
    if (typeof options?.hesitationWindow === "number") {
      game.hesitationWindow = options.hesitationWindow;
    }
    game.thinkFreezeUntil = undefined;
    game.thinkFreezePlayerId = undefined;
    game.spectatorMode = null;
    game.spectatorViews = {};
    game.spectatorApprovalRequests = [];
    game.consecutiveDiscards = null;  // 每局重置「谢谢带头大哥」追踪
    game.leadingBrotherEvent = null;  // 每局重置「谢谢带头大哥」事件
    this.bailoutTracker.clearGame(gameId);
    (game as any).bailoutRelations = [];

    // 清除上一局残留的freeze/dealer auto-draw timer,防止旧timer覆盖新游戏状态
    const oldFreezeTimer = this.timerManager.freezeTimers.get(gameId);
    if (oldFreezeTimer) {
      clearTimeout(oldFreezeTimer);
      this.timerManager.freezeTimers.delete(gameId);
      console.log(`[WallDebug] Cleared stale freeze timer for game ${gameId}`);
    }
    // ★ K哥铁律(2026-06-05): 清除上一局残留的 REVEAL 定时器
    // handleHu/endRound 设的 5s REVEAL 定时器如果没触发，新局开始时必须清除，否则新局被强制结束
    if ((game as any)._revealEndScheduled) {
      delete (game as any)._revealEndScheduled;
      console.log(`[beginGame] Cleared stale _revealEndScheduled for game ${gameId}`);
    }
    this.timerManager.clearRevealTimer(gameId);
    console.log(`[beginGame] Cleared REVEAL timers for game ${gameId.substring(0,8)}`);
    // 每局重置百搭冷冻状态
    game.freezePlayerId = null;
    game.freezeComplete = false;
    game.freezeRound = undefined;

    // 🔄 换位置请求:每局都可以生效
    this.swapManager.applySwapRequests(game);

    // 🔄 观赛者替换AI请求:每局生效
    this.swapManager.applyBotReplacement(game);
    console.log('[timing-startGame] setup+swap+replace:', Date.now() - Date.now(), 'ms');

    // 🎲 随机选位置:仅首次开局时随机,后续座位固定(除非换位置)
    const isFirstRound = (game.roundStats || []).length === 0;
    // 【修复】记录建房者ID（首局=第一个加入房间的玩家）
    const creatorId = game.players[0]?.userId || game.players[0]?.id;
    if (isFirstRound) {
      const shuffledIndices = Array.from({ length: game.players.length }, (_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      game.players = shuffledIndices.map((origIdx, newPos) => {
        const p = game.players[origIdx];
        p.position = newPos;
        return p;
      });
    }

    // 🎰 选庄家:上局首胡者掷骰(一炮多响则放冲者掷骰)
    if (game.nextDealerId) {
      const nextDealer = game.players.find(p => p.id === game.nextDealerId);
      if (nextDealer) {
        game.dealerIndex = nextDealer.position;
        console.log(`[StartGame] 上局指定庄家: ${nextDealer.name}`);
      } else {
        game.dealerIndex = Math.floor(Math.random() * game.players.length);
      }
      game.nextDealerId = null;
    } else {
      // 【修复】首局：建房者坐庄（按creatorId查找，不受座位打乱影响）
      if (creatorId) {
        const creatorPos = game.players.findIndex(p => (p.userId && p.userId === creatorId) || p.id === creatorId);
        game.dealerIndex = creatorPos >= 0 ? creatorPos : 0;
        console.log(`[StartGame] 首局建房者坐庄: ${game.players[game.dealerIndex]?.name} pos=${game.dealerIndex}`);
      } else {
        game.dealerIndex = 0;
      }
    }
    game.players.forEach((p, i) => { p.isDealer = (i === game.dealerIndex); });

    // 🎲 掷骰子+广播
    const rollCount = game.diceRollCount ?? 2;
    let d1: number, d2: number, d3: number | undefined, d4: number | undefined;
    if (options?.fixedDice) {
      d1 = Math.min(6, Math.max(1, Math.round(options.fixedDice[0])));
      d2 = Math.min(6, Math.max(1, Math.round(options.fixedDice[1])));
    } else {
      d1 = Math.floor(Math.random() * 6) + 1;
      d2 = Math.floor(Math.random() * 6) + 1;
    }
    if (rollCount >= 2) {
      d3 = Math.floor(Math.random() * 6) + 1;
      d4 = Math.floor(Math.random() * 6) + 1;
    }
    game.dice = [d1, d2];
    game.diceRolls = d3 !== undefined ? [[d1, d2], [d3, d4!]] : undefined;

    // 🔥 立即广播骰子（客户端马上播放动画，与后续牌墙创建+发牌并行）
    if (this.wsManager) {
      this.wsManager.broadcast(gameId, 'diceRoll', {
        dice1: d1, dice2: d2,
        dice3: d3, dice4: d4,
        timestamp: Date.now()
      });
    }
    game.roundMultiplier = calculateRoundMultiplier(d1, d2, d3, d4);

    // ── 创建牌墙(144张) + 选百搭 ──
    const deck = createDeck();
    game.wall = shuffleTiles(deck);

    const allTileTypes: Array<{ suit: TileSuit; value: number }> = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let v = 1; v <= 9; v++) allTileTypes.push({ suit, value: v });
    }
    for (let v = 1; v <= 4; v++) allTileTypes.push({ suit: TileSuit.WIND, value: v });
    for (let v = 1; v <= 3; v++) allTileTypes.push({ suit: TileSuit.DRAGON, value: v });
    for (let v = 1; v <= 8; v++) allTileTypes.push({ suit: TileSuit.FLOWER, value: v });
    const wildIndex = Math.floor(Math.random() * allTileTypes.length);
    const wildType = allTileTypes[wildIndex];
    game.customScoringMode = `${wildType.suit}-${wildType.value}`;

    if (wildType.suit === TileSuit.FLOWER) {
      if (wildType.value <= 4) {
        game.wildTileGroup = ['1', '2', '3', '4'];
      } else {
        game.wildTileGroup = ['5', '6', '7', '8'];
      }
    }

    // 每局重置吃碰排斥状态
    game.chowPongExclusion = {};

    // 发牌(花牌不补花,放到门口等待回合补花)
    for (const player of game.players) {
      player.hand.concealedTiles = [];
      player.hand.exposedMelds = [];
      player.hand.discardedTiles = [];
      for (let i = 0; i < 13; i++) {
        const tile = game.wall.pop()!;
        if (isFlower(tile) && !this.isWildTile(game, tile)) {
          // 普通花牌放到门口,不补花(等自己回合再补)
          player.hand.exposedMelds.push({
            type: MeldType.TRIPLET,
            tiles: [tile],
            isConcealed: false,
            replacementDone: false as any
          } as any);
        } else if (isFlower(tile) && this.isWildTile(game, tile)) {
          // 花牌百搭 → 进手牌,不放门口
          player.hand.concealedTiles.push(tile);
        } else {
          player.hand.concealedTiles.push(tile);
        }
      }
      player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      player.status = PlayerStatus.PLAYING;
      player.score = 0;
    }

    // 庄家摸牌(也处理花牌:普通花放门口,百搭进手牌)
    {
      const tile = game.wall.pop()!;
      if (isFlower(tile) && !this.isWildTile(game, tile)) {
        game.players[game.dealerIndex].hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [tile],
          isConcealed: false,
          replacementDone: false as any
        } as any);
      } else if (isFlower(tile) && this.isWildTile(game, tile)) {
        // 花牌百搭 → 进手牌
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      } else {
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      }
      game.players[game.dealerIndex].hand.concealedTiles = this.sortHandWithWildFront(
        game.players[game.dealerIndex].hand.concealedTiles, game
      );
    }

    console.log(`[WallDebug] after dealing (13×4+1): wall=${game.wall.length} tiles`);

    for (const player of game.players) {
      player.winOrder = null;
      player.winRound = null;
      player.winTimestamp = null;
      player.wonFan = 0;
      player.winHandType = undefined;
      player.isSelfDrawn = undefined;
      player.discarderId = undefined;
      (player as any).winningTileName = undefined;
      player.winningScoreBreakdown = undefined;
      player.score = 0;
    }

    // 继承上局全局倍数(或从造反事件继承)
    const prevGlobal = game.inheritedGlobalMultiplier ?? 1;
    if (game.rebelEvent) {
      game.inheritMultiplier = calculateGlobalMultiplier(prevGlobal, '造反');
      game.rebelEvent = undefined;
    } else {
      game.inheritMultiplier = prevGlobal;
    }
    game.inheritedGlobalMultiplier = undefined;

    game.currentPlayerIndex = game.dealerIndex;
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();

    // 补花广播由 replaceFlowers 处理，此处不重复

    TrainingRecordService.captureRoundStart(game);

    console.log(`[WallDebug] after dealing: wall=${game.wall.length} tiles, PLAYING phase`);
    // 🔥 先广播再持久化（广播触发客户端HTTP fetch取完整状态，不等MongoDB写入）
    this.broadcastGameState(gameId);
    this.persistGame(game).catch(err => console.error('[startGame] async persistGame error:', err));

    // 庄家首轮自动摸牌(模拟 moveToNextPlayer 的 freeze 机制)
    const freezeMs = this.timerManager.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI
    const dealer = game.players[game.currentPlayerIndex];
    if (dealer) {
      if (this.isPlayerBotControlled(dealer)) {
        // Bot 庄家:freeze 后自动摸+出牌
        (game as any)._freezeUntil = Date.now() + freezeMs;
        const botTimer = this.timerManager.detachTimer(setTimeout(async () => {
          try {
            this.timerManager.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            const liveDealer = freshGame.players[freshGame.currentPlayerIndex];
            if (!liveDealer || liveDealer.id !== dealer.id || liveDealer.status !== PlayerStatus.PLAYING) return;
            this.replaceFlowers(freshGame, liveDealer);
            if (this.getPlayableTileCount(liveDealer) >= 14) {
              freshGame.drawnThisTurn = true;
              console.log(`[start-bot-freeze] Dealer ${liveDealer.name} reached discard state after flower replacement`);
            } else {
              this.handleDraw(freshGame, liveDealer);
              freshGame.drawnThisTurn = true; // 【状态机修复】标记已摸牌
            }
            this.scheduleBotDiscard(gameId, liveDealer.id);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error('[start-bot-freeze] Error:', err);
          }
        }, this.timerManager.getHesitationWindow(game)));
        this.timerManager.freezeTimers.set(gameId, botTimer);
      } else {
        // Human 庄家:设置 freeze 让客户端显示冻结进度,到期自动摸
        (game as any)._freezeUntil = Date.now() + freezeMs;
        await this.persistGame(game);
        this.broadcastGameState(gameId);

        const humanTimer = this.timerManager.detachTimer(setTimeout(async () => {
          try {
            this.timerManager.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            if (freshGame.pendingActions.length > 0) return;

            delete (freshGame as any)._freezeUntil;
            const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
              this.replaceFlowers(freshGame, nextPlayer);
              if (this.getPlayableTileCount(nextPlayer) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[start-freeze] Dealer ${nextPlayer.name} reached discard state after flower replacement`);
              } else {
                this.handleDraw(freshGame, nextPlayer);
                freshGame.drawnThisTurn = true; // 【状态机修复】标记已摸牌，防同回合连续摸牌
                console.log(`[start-freeze] Auto-draw for dealer ${nextPlayer.name}`);
              }
            }
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error('[start-freeze] Error:', err);
          }
        }, freezeMs));
        this.timerManager.freezeTimers.set(gameId, humanTimer);
      }
    }
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    // 先检查内存,避免重复MongoDB查询
    if (this.games.has(gameId)) return this.games.get(gameId);
    return this.ensureGameLoaded(gameId);
  }

  /**
   * Get game by player ID
   */
  async getGameByPlayer(playerId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return undefined;
    return this.ensureGameLoaded(gameId);
  }

  /**
   * Get available actions for a player
   */
  async getAvailableActions(gameId: string, playerId: string): Promise<ActionType[]> {
    try {
      await this.hydrateFromDatabase();
      const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
      if (!game) {
        console.warn('⚠️ getAvailableActions: game not found:', gameId);
        return [];
      }
      if (game.phase !== GamePhase.PLAYING) return [];

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.status !== PlayerStatus.PLAYING) return [];

    // 等我想一想冻结:非触发玩家在冻结期间不能操作
    // 返回正常actions,但前端通过 thinkFreezeUntil 判断冻结状态来禁用按钮
    // 不再返回空数组,避免按钮消失
    if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now()) {
      if (game.thinkFreezePlayerId !== playerId) {
        const currentTurnPlayer = game.players[game.currentPlayerIndex];
        if (currentTurnPlayer?.id === playerId && this.canPlayerDrawOnCurrentTurn(game, player)) {
          return [ActionType.DRAW];
        }
        // 冻结期间:返回 pending actions(如果有的话)让前端显示但禁用
        // 不返回 turn actions(摸牌/出牌),因为这些在冻结期间不应该操作
        const pendingAction = game.pendingActions.find(pa => pa.playerId === playerId);
        if (pendingAction) {
          return pendingAction.availableActions; // 前端会因 thinkFreezeActive 禁用这些按钮
        }
        // 没有pending时,返回空(确实没有可操作的)
        return [];
      }
      // 触发者可以继续操作(碰/胡/过等)
    }

    const actions: ActionType[] = [];
    const currentPlayer = game.players[game.currentPlayerIndex];

    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);

    if (!currentPlayer) {
      // Game might still be in setup; no actions available yet
      return actions;
    }

    // Check pending actions (peng, kong, hu from another player's discard)
    const pendingAction = game.pendingActions.find(pa => pa.playerId === playerId);
    if (pendingAction) {
      // 冷冻期间不响应其他玩家的弃牌(吃/碰/杠/胡),但自摸胡不受影响
      // 自摸胡在玩家自己的回合通过 turn actions 处理
      // 冷冻规则：打出百搭后，一圈内其他玩家不能吃/碰/捉冲
      // 一圈 = 4个玩家各出一次牌（从打出百搭的玩家开始数）
      if (game.freezePlayerId && game.freezePlayerId !== playerId) {
        // 当前玩家不是打出百搭的人，检查是否过了一圈
        if (!game.freezeComplete) {
          return [];  // 冷冻中，不能响应其他玩家的弃牌
        }
        // freezeComplete = true 时表示已过完整一圈，解除冷冻
      }
      // 等我想一想:有胡/碰/杠选项时可用,每局限定次数
      const pendingHasPriority = pendingAction.availableActions.some(a =>
        a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG ||
        a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
      );
      if (pendingHasPriority) {
        const maxChances = game.thinkChances ?? 3;
        const used = game.thinkUsage?.[playerId] ?? 0;
        if (used < maxChances) {
          const pendingActionsWithThink = [...pendingAction.availableActions, ActionType.THINK];
          if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !pendingActionsWithThink.includes(ActionType.DRAW)) {
            pendingActionsWithThink.push(ActionType.DRAW);
          }
          return pendingActionsWithThink;
        }
      }
      if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !pendingAction.availableActions.includes(ActionType.DRAW)) {
        return [...pendingAction.availableActions, ActionType.DRAW];
      }
      return pendingAction.availableActions;
    }

    // 梁山聚义:前三巡(出牌轮次)可投票,没投过+活跃+倍数未达8倍上限
    // 巡数 = 出牌次数(DISCARD action)，三巡以内(=0,1,2)可投
    const discardCount = game.actionHistory.filter(a => a.type === ActionType.DISCARD).length;
    if (game.phase === GamePhase.PLAYING && player.status === PlayerStatus.PLAYING && discardCount < 3) {
      // 全局倍数已达8倍上限时,禁止梁山聚义
      const effectiveGlobal = Math.min((game.inheritMultiplier ?? 1) * (game.roundMultiplier ?? 1), 8);
      const atMultiplierCap = effectiveGlobal >= 8;
      if (!atMultiplierCap) {
        const votes = game.liangShanVotes || [];
        if (!votes.includes(playerId)) {
          actions.push(ActionType.LIANG_SHAN);
        }
      }
    }

    // 等我想一想:有胡/碰/杠选项时可用,每局限定次数
    const hasPriorityActions = actions.some(a =>
      a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG ||
      a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
    );
    if (hasPriorityActions) {
      const maxChances = game.thinkChances ?? 3;
      const used = game.thinkUsage?.[playerId] ?? 0;
      if (used < maxChances) {
        actions.push(ActionType.THINK);
      }
    }

    // If it's the player's turn, allow turn actions
    // freeze 百搭期间不能出牌(响应其他玩家弃牌),但可以摸牌(自己的回合动作)
    if (currentPlayer.id === playerId) {
      // 有其他玩家在抢牌(pending claim),当前玩家等待决策窗口
      if (game.pendingActions.length > 0 && !this.canCurrentTurnPlayerDrawDuringPending(game, playerId)) {
        if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !actions.includes(ActionType.DRAW)) {
          actions.push(ActionType.DRAW);
        }
        // 五毒散造反在 pending 期间也应检查（摸牌后的 pending 不影响造反资格）
        const rebellionTurns = game.actionHistory.filter(a => a.type === ActionType.DISCARD).length;
        const isFirstTurn = rebellionTurns === 0;
        const hasEatenBefore = player.hand.exposedMelds.some(m => m.type === MeldType.SEQUENCE);
        if (game.roundNumber <= 1 && isFirstTurn && !hasEatenBefore) {
          const wildParts = game.customScoringMode?.split('-');
          const wildSuit = wildParts ? wildParts[0] as TileSuit : undefined;
          const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : undefined;
          if (isFivePoison(
            player.hand.concealedTiles,
            wildSuit,
            wildValue,
            player.hand.exposedMelds.flatMap(meld => meld.tiles || [])
          )) {
            actions.push(ActionType.REBEL);
          }
        }
        return actions;
      }

      // 自动补花:如果门口有未替换的花牌,先补花
      const unreplacedFlowers = player.hand.exposedMelds.filter(
        m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !(m as any).replacementDone
      )
      if (unreplacedFlowers.length > 0 && game.wall.length > 0) {
        // 仅在手牌未满14张时允许"摸"(执行 replaceFlowers+handleDraw)
        // 若补花后已到14张,应直接允许出牌,不能继续高亮"摸"
        const totalTileCount = this.getPlayableTileCount(player);
        if (totalTileCount < 14) {
          actions.push(ActionType.DRAW);
          return actions;
        }
        actions.push(ActionType.DISCARD);
        return actions;
      }
      // 检查造反(五毒散) - 条件：庄家(player.position === dealerIndex) + 首巡(尚未打出过牌)
      //       + 没有吃过牌(exposedMelds无CHOW) + 仅第一局 + 五毒散牌型
      const rebellionTurns = game.actionHistory.filter(a => a.type === ActionType.DISCARD).length;
      const isFirstTurn = rebellionTurns === 0;
      const hasEatenBefore = player.hand.exposedMelds.some(m => m.type === MeldType.SEQUENCE);
      // 任何玩家满足五毒散均可造反
      if (game.roundNumber <= 1 && isFirstTurn && !hasEatenBefore) {
        const wildParts = game.customScoringMode?.split('-');
        const wildSuit = wildParts ? wildParts[0] as TileSuit : undefined;
        const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : undefined;
        if (isFivePoison(
          player.hand.concealedTiles,
          wildSuit,
          wildValue,
          player.hand.exposedMelds.flatMap(meld => meld.tiles || [])
        )) {
          actions.push(ActionType.REBEL);
        }
      }

      // 【状态机修复】出牌:必须先摸牌
      if (player.hand.concealedTiles.length > 0 && game.drawnThisTurn) {
        actions.push(ActionType.DISCARD);
      }

      // 摸牌:手牌+门口(不含花牌)< 14张时可以摸;每回合只能摸一次
      const totalTileCount = this.getPlayableTileCount(player);
      const winCheck = this.winEvaluator.getCachedWinCheck(game, player);
      if (this.isDaDiaoReadyState(game, player) && winCheck.canWin && winCheck.types.length > 0) {
        actions.push(ActionType.HU);
      } else if (totalTileCount < 14 && game.wall.length > 0 && !game.drawnThisTurn) {
        actions.push(ActionType.DRAW);
      }

      if (totalTileCount >= 14) {
        // Check for concealed kong
        const groups = groupTiles(player.hand.concealedTiles);
        for (const group of groups.values()) {
          if (group.length === 4) {
            actions.push(ActionType.CONCEALED_KONG);
          }
        }

        // Check for extended kong (if player has exposed triplet and draws the 4th)
        for (const meld of player.hand.exposedMelds) {
          if (meld.type === MeldType.TRIPLET) {
            const hasFourth = player.hand.concealedTiles.some(t => tilesEqual(t, meld.tiles[0]));
            if (hasFourth) {
              actions.push(ActionType.EXTENDED_KONG);
            }
          }
        }

        // Check if can win (必须有有效牌型)
        // 【P0-7修复】第二参数为number时，第三参数必须是wildTileId字符串而非函数
        if (this.canPlayerDeclareTurnHu(game, player) && winCheck.canWin && winCheck.types.length > 0) {
          actions.push(ActionType.HU);
        }
      }
    }

    const hasFinalPriorityActions = actions.some(a =>
      a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG ||
      a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
    );
    if (hasFinalPriorityActions && !actions.includes(ActionType.THINK)) {
      const maxChances = game.thinkChances ?? 3;
      const used = game.thinkUsage?.[playerId] ?? 0;
      if (used < maxChances) {
        actions.push(ActionType.THINK);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    }

    return actions;
    } catch (err: any) {
      console.warn('⚠️ getAvailableActions failed:', err.message);
      return [];
    }
  }

  async getWinOptionsForPlayer(gameId: string, playerId: string): Promise<WinOption[]> {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const pendingAction = game.pendingActions.find(pa => pa.playerId === playerId);
    // 碰/杠后pending被清但仍是捉冲,从actionHistory确认
    const hadPengOrKongOnDiscard = (game.actionHistory || []).some(a =>
      a.type === 'peng' || a.type === 'kong'
    );
    // 只检查本局内是否有碰/杠动作（不是从远古今检测）
    const currentRoundActions = (game.actionHistory || []).filter(a => {
      // roundNumber 在 action 上记录
      return (a as any).roundNumber === game.roundNumber || (a as any).roundNumber === undefined;
    });
    // 自摸/捉冲判断：
    // 1. pending中带tile → 有人弃牌，这是捉冲
    // 2. 没有pending（自摸自己摸到的牌）→ 自摸
    const isDiscardContext = !!pendingAction?.tile;
    const context: 'self_draw' | 'discard' = isDiscardContext ? 'discard' : 'self_draw';
    return this.winEvaluator.getCachedWinOptions(game, player, context, {
      isKongFlower: false,
      isRobbingKong: !!pendingAction?.tile && !!game.pendingKongClaim,
      extraTile: pendingAction?.tile
    });
  }

  async getTingPreviewForPlayer(gameId: string, playerId: string, options?: { skipQuickPrecheck?: boolean }): Promise<{
    isTing: boolean;
    winningTiles: Array<{
      tile: Tile;
      remainingCount: number;
      bestDiscardOption: WinOption | null;
      bestSelfDrawOption: WinOption | null;
      bestOverallOption: WinOption | null;
    }>;
  }> {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.status !== PlayerStatus.PLAYING) {
      return { isTing: false, winningTiles: [] };
    }

    const preview = this.winEvaluator.getCachedTingPreview(game, player, options);
    if (!preview.isTing && !player.isTing) {
      return { isTing: false, winningTiles: [] };
    }
    return preview;
  }

  /**
   * Execute a game action
   */
  async executeAction(gameId: string, playerId: string, action: ActionType, tileId?: string, tileIds?: string[], winOptionLabel?: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.PLAYING) {
      throw new Error('Game is not active');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    // ★ 修复：已胡牌/已出局的玩家不能执行任何动作
    if (player.status !== PlayerStatus.PLAYING && action !== ActionType.PASS) {
      console.warn(`[executeAction] Blocked: ${player.name} status=${player.status}, cannot execute ${action}`);
      return;
    }

    // 玩家已响应,取消当前自动超时推进
    this.timerManager.clearPendingActionTimer(gameId);
    // 取消超时自动接管(玩家已操作)
    this.timerManager.clearAutoTakeover(gameId, playerId);

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
          } else if (freezeUntil > 0) {
            // ★ 安全检查：freezeUntil 已过期但未清除 → 主动清除
            delete (game as any)._freezeUntil;
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
          game.drawnThisTurn = true; // 吃/碰/杠后手牌已满或即将满，标记已摸牌状态
            break;
          }
        }
        // 正常摸牌(摸到花牌会递归补花)
        this.handleDraw(game, player);
        game.drawnThisTurn = true;
        break;

      case ActionType.PENG:
        // 防止超限:碰牌至少需要2张手牌
        {
          if (player.hand.concealedTiles.length < 2) {
            console.warn(`[PENG] Blocked: player ${player.id} needs 2 tiles in hand`);
            break;
          }
        }
        this.handlePeng(game, player);
        refreshRouteMemoryAfterClaim(player, game);
        break;

      case ActionType.CHOW:
        // 防止超限:吃牌至少需要2张手牌
        {
          if (player.hand.concealedTiles.length < 2) {
            console.warn(`[CHOW] Blocked: player ${player.id} needs 2 tiles in hand`);
            break;
          }
        }
        this.handleChow(game, player, tileIds);
        refreshRouteMemoryAfterClaim(player, game);
        break;

      case ActionType.KONG:
        {
          if (player.hand.concealedTiles.length < 3) {
            console.warn(`[KONG] Blocked: player ${player.id} needs 3 tiles in hand`);
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
        console.log(`[executeAction-HU] ${player.name} HU before: currentPlayerIndex=${game.currentPlayerIndex} phase=${game.phase} wall=${game.wall?.length}`);
        await this.handleHu(game, player, winOptionLabel);
        console.log(`[executeAction-HU] ${player.name} HU after: currentPlayerIndex=${game.currentPlayerIndex} phase=${game.phase} wall=${game.wall?.length} drawnThisTurn=${game.drawnThisTurn} pendingActions=${game.pendingActions?.length}`);
        break;

      case ActionType.CHEAT_HU:
        this.handleCheatHu(game, player);
        break;

      case ActionType.REBEL:
        console.log(`[executeAction] ${player.name} REBEL → handleRebel`);
        await this.handleRebel(game, player);
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
          game.drawnThisTurn = true; // 吃/碰/杠后手牌已满或即将满，标记已摸牌状态
          this.scheduleBotDiscard(gameId, currentP.id);
        }
      }
      if (action === ActionType.PASS && this.shouldAdvanceTurnAfterPass(game)) {
        await this.moveToNextPlayer(game);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    }

    this.winEvaluator.invalidateCache(gameId);
    if (game.phase === GamePhase.PLAYING) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && currentP.status === PlayerStatus.PLAYING && game.drawnThisTurn) {
        this.winEvaluator.prewarm(game, currentP, 'self_draw');
      }
      for (const pending of game.pendingActions) {
        if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
        const targetPlayer = game.players.find(p => p.id === pending.playerId);
        if (!targetPlayer) continue;
        this.winEvaluator.prewarm(game, targetPlayer, 'discard', pending.tile);
      }
      if (!this.isTrainingFastMode(game)) {
        for (const candidate of game.players) {
          if (candidate.status === PlayerStatus.PLAYING && candidate.isTing) {
            this.winEvaluator.getCachedTingPreview(game, candidate);
          }
        }
      }
    }

    // Broadcast game state update
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  private async handleDiscard(game: GameState, player: Player, tileId: string): Promise<void> {
    return this.actionHandler.handleDiscard(game, player, tileId);
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
    return tileHelper.countFlowerTiles(player);
  }

  private handleDraw(game: GameState, player: Player, options?: { allowFullHand?: boolean }): void {
    this.actionHandler.handleDraw(game, player, options);
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
    }
    // 补花广播由 replaceFlowers 统一处理
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
    return tileHelper.sortHandWithWildFront(tiles, game);
  };

  /**
   * 检查牌是否是百搭
   */
  private isWildTile(game: GameState, tile: Tile): boolean {
    return tileHelper.isWildTile(game, tile);
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
      const winCheck = canWin(testHand, p.hand.exposedMelds, this.winEvaluator.getWinWildArg(game), undefined, game.wildTileGroup);
      if (winCheck.canWin) {
        const handTypes = detectHandTypes(testHand, p.hand.exposedMelds, false, this.countFlowerTiles(p), null, game.wildTileGroup);
        if (handTypes.length > 0) {
          // 捉冲限制：碰碰胡/混一色要求门口有花/风箭刻/杠（大吊或基础分>=10豁免）
          const topType = handTypes[0];
          const needsRestriction = topType === HandType.ALL_TRIPLETS || topType === HandType.HALF_FLUSH;
          const isExempt = handTypes.includes(HandType.DA_DIAO) ||
            handTypes.includes(HandType.HUN_PENG) || handTypes.includes(HandType.QING_PENG) ||
            handTypes.includes(HandType.FENG_PENG) || handTypes.includes(HandType.ALL_WIND) ||
            handTypes.includes(HandType.FULL_FLUSH) || handTypes.includes(HandType.EIGHT_FLOWERS) ||
            handTypes.includes(HandType.FOUR_WILD);
          if (needsRestriction && !isExempt) {
            const exposed = p.hand.exposedMelds;
            const hasFlower = exposed.some(m => m.tiles.some(t => isFlower(t)));
            const hasWindMeld = exposed.some(m => m.tiles.some(t => isWind(t) || isDragon(t)) && (m.type === MeldType.TRIPLET || m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG));
            const hasKong = exposed.some(m => m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG);
            if (!hasFlower && !hasWindMeld && !hasKong) {
              continue; // 不满足捉冲条件，跳过
            }
          }
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

  private async advanceApprovalConflict(game: GameState): Promise<void> {
    const conflict = game.pengChowConflict;
    if (!conflict) return;

    const activeStageIds = new Set(conflict.currentStagePlayerIds || []);
    const stagePending = game.pendingActions.filter(pa => activeStageIds.has(pa.playerId));
    if (stagePending.length > 0) return;

    const queue = conflict.approvalQueue || [];
    if (queue.length === 0) {
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== conflict.requesterId);
      this.timerManager.clearPendingActionTimer(game.gameId);
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
    conflict.expiresAt = Date.now() + this.timerManager.getHesitationWindow(game);

    this.timerManager.clearPendingActionTimer(game.gameId);

    const requester = game.players.find(p => p.id === conflict.requesterId);
    if (!requester || !this.wsManager) return;

    const label = conflict.requesterAction === 'chow' ? '吃' : conflict.requesterAction === 'peng' ? '碰' : '杠';
    for (const candidate of stage) {
      const candidatePlayer = game.players.find(p => p.id === candidate.playerId);
      if (!candidatePlayer) continue;
      const expiresAt = Date.now() + this.timerManager.getHumanClaimDecisionTimeoutMs(
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
    this.timerManager.detachTimer(setTimeout(async () => {
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
    }, this.timerManager.getHesitationWindow(game)));
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
    this.timerManager.clearPendingActionTimer(game.gameId);

    const requester = game.players.find(p => p.id === requesterPlayerId);
    if (!requester) return;

    for (const c of candidates) {
      const candPlayer = game.players.find(p => p.id === c.playerId);
      if (!candPlayer || !this.wsManager) continue;

      // 设置pending action(审批窗口,无"过"按钮)
      const existingPending = game.pendingActions.find(pa => pa.playerId === c.playerId);
      if (!existingPending) {
        const label = requesterAction === 'chow' ? '吃' : requesterAction === 'peng' ? '碰' : '杠';
        const expiresAt = Date.now() + this.timerManager.getHumanClaimDecisionTimeoutMs(game, candPlayer, c.availableActions);
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
          ? this.timerManager.getHumanClaimDecisionTimeoutMs(game, player, candidate.availableActions as ActionType[])
          : this.timerManager.getHesitationWindow(game);
      })
    );
    this.timerManager.detachTimer(setTimeout(async () => {
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
        if (player && this.isPlayerBotControlled(player)) {
          this.scheduleBotDiscard(gid, player.id);
        }
      } catch (e) { console.error('[Approval] timeout err:', e); }
    }, approvalWaitMs));
  }

  private async handleChow(game: GameState, player: Player, tileIds?: string[]): Promise<void> {
    return this.actionHandler.handleChow(game, player, tileIds);
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

    const sequences = tileHelper.findChowSequences(player.hand.concealedTiles, discardedTile, game);
    if (sequences.length === 0) { console.warn('[CHOW] No sequence'); return; }

    const sequence = tileHelper.selectChowSequence(sequences, discardedTile, tileIds);
    const handTiles = sequence.filter(t => t.id !== discardedTile.id);

    const _bailoutCount = this.bailoutTracker.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.SEQUENCE);
    this.bailoutTracker.checkAndBroadcastBailout(game, player.id, sourcePlayerId, (id, text, type, kind) => this.broadcastQuickMessage(id, text, type as any, kind));
    // 广播吃牌到牌局快讯（所有吃都会显示，不限于口数）

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
    if (this.isPlayerBotControlled(player)) {
      this.scheduleBotDiscard(game.gameId, player.id);
}
    // 吃后手牌排序(百搭置顶)
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);

    // 广播吃牌到牌局快讯
    const _bc = this.bailoutTracker.getGameBailout(game.gameId)?.get(player.id)?.get(sourcePlayerId) || 0;
    console.log(`[CHOW-BC] wsManager=${!!this.wsManager} player=${player.name} source=${sourcePlayerId} bailoutCount=${_bc} gameId=${game.gameId}`);
    if (this.wsManager) {
      const _suffix = _bc >= 2 ? ` (${_bc}口)` : '';
      // Removed: 吃牌消息已由 bailout checkAndBroadcastBailout 统一处理
      console.log(`[CHOW-BC] CHOW by ${player.name} (${_bc}口)`);
    } else {
      console.log('[CHOW-BC] SKIP: wsManager is null');
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
      console.warn(`[PENG] Player ${player.name} blocked by exclusion rule (firstAction=${state.firstActionSuit}), passing`);
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
      this.handlePass(game, player);
      return;
    }

    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    const _bailoutCount2 = this.bailoutTracker.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.TRIPLET);
    this.bailoutTracker.checkAndBroadcastBailout(game, player.id, sourcePlayerId, (id, text, type, kind) => this.broadcastQuickMessage(id, text, type as any, kind));
    // 碰牌广播已合并到上方bailout逻辑中
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
    if (this.isPlayerBotControlled(player)) {
      this.scheduleBotDiscard(game.gameId, player.id);
    }
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
    this.bailoutTracker.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.KONG);
    if (sourcePlayerId) {
      this.bailoutTracker.checkAndBroadcastBailout(game, player.id, sourcePlayerId, (id, text, type, kind) => this.broadcastQuickMessage(id, text, type as any, kind));
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
      this.broadcastService.broadcastQuickMessage(game.gameId, `ⓘ ${player.name}${label}`, 'info', 'kong');
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
    if (this.isPlayerBotControlled(player)) {
      this.scheduleBotDiscard(game.gameId, currentPlayer.id);
    }
    this.broadcastService.broadcastKongSupplement(game, player, 'ming');
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
      if (!candPlayer || !pending) return;

      this.timerManager.clearPendingActionTimer(gameId);
      game.pendingActions = game.pendingActions.filter(pa =>
        pa.playerId === playerId ||
        (
          pa.playerId !== approvalConflict.requesterId &&
          !(approvalConflict.currentStagePlayerIds || []).includes(pa.playerId)
        )
      );
      game.pengChowConflict = null;

      if (pending.availableActions.includes(ActionType.HU)) {
        await this.executeWinDirectly(game, candPlayer, approvalConflict.tile);
      } else if (pending.availableActions.includes(ActionType.KONG)) {
        this.executeKongDirectly(game, candPlayer, approvalConflict.tile.id);
      } else if (pending.availableActions.includes(ActionType.PENG)) {
        this.executePengDirectly(game, candPlayer);
      }

      await this.persistGame(game);
      this.broadcastGameState(gameId);
      return;
    }

    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== playerId);
    if (approvalConflict.currentStagePlayerIds?.includes(playerId)) {
      approvalConflict.currentStagePlayerIds = approvalConflict.currentStagePlayerIds.filter(id => id !== playerId);
    }
    await this.advanceApprovalConflict(game);
    await this.persistGame(game);
    this.broadcastGameState(gameId);
    return;

    const conflict = game.pengChowConflict;
    const requesterId = conflict.requesterId;
    const requesterAction = conflict.requesterAction;
    const tile = conflict.tile;

    // 清除冲突状态和该玩家的pending(保留winner's pending供executeWinDirectly使用)
    game.pengChowConflict = null;
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== playerId);

    const requester = game.players.find(p => p.id === requesterId);

    if (choice === 'confirm') {
      const candPlayer = game.players.find(p => p.id === playerId);
      if (!candPlayer) return;
      // 执行候选者的高优先级动作
      const pending = game.pendingActions.find(pa => pa.playerId === playerId);
      if (pending?.availableActions.includes(ActionType.HU)) {
        // 执行胡牌
        await this.executeWinDirectly(game, candPlayer, tile);
        return;
      } else if (pending?.availableActions.includes(ActionType.PENG)) {
        this.executePengDirectly(game, candPlayer);
      }
      // 清除请求者的pending
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== requesterId);
    } else {
      // 放弃 → 允许低优先级动作
      if (requester) {
        if (requesterAction === 'chow') this.executeChowDirectly(game, requester, conflict.requesterTileIds);
        else if (requesterAction === 'peng') this.executePengDirectly(game, requester);
        else if (requesterAction === 'kong') this.executeKongDirectly(game, requester, tile.id);
      }
    }
  }

  /**
   * @deprecated 使用 handleApprovalChoice 代替
   */
  handlePengChowChoice(gameId: string, pengPlayerId: string, choice: 'peng' | 'pass'): void {
    this.handleApprovalChoice(gameId, pengPlayerId, choice === 'peng' ? 'confirm' : 'pass');
  }

  private async handlePeng(game: GameState, player: Player): Promise<void> {
    return this.actionHandler.handlePeng(game, player);
  }

  private async handleKong(game: GameState, player: Player, tileId: string): Promise<void> {
    // 【修复】明杠前先检查其他玩家是否可以胡（审批流程）
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (lastDiscard) {
      const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
      if (huCandidates.length > 0) {
        const candidates = huCandidates.map(pid => ({ playerId: pid, availableActions: ['hu'] as ActionType[] }));
        await this.startApproval(game, player.id, 'kong', candidates, lastDiscard);
        return;
      }
    }
    return this.actionHandler.handleKong(game, player, tileId);
  }

  private handleConcealedKong(game: GameState, player: Player, tileIds: string[]): void {
    this.actionHandler.handleConcealedKong(game, player, tileIds);
  }

  private handleExtendedKong(game: GameState, player: Player, tileId: string): void {
    this.actionHandler.handleExtendedKong(game, player, tileId);
  }

  private completeExtendedKong(game: GameState, player: Player, tile: Tile): void {
    // Remove tile from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);

    // Find matching exposed triplet again (state might have changed)
    const tripletIndex = player.hand.exposedMelds.findIndex(
      m => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;

    // Convert triplet to kong
    player.hand.exposedMelds[tripletIndex].type = MeldType.KONG;
    player.hand.exposedMelds[tripletIndex].tiles.push(tile);

    // Award extended kong score - each non-winner pays 1
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.windScore += nonWinners.length * 1;

    // Draw supplement tile
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    if (this.isPlayerBotControlled(player)) {
      this.scheduleBotDiscard(game.gameId, currentPlayer.id);
    }
    this.broadcastService.broadcastKongSupplement(game, player, 'jia');
  }

  private resolveRobKongIfNeeded(game: GameState): boolean {
    const pendingClaim = game.pendingKongClaim;
    if (!pendingClaim) return false;

    // 仍有玩家等待响应,先不继续
    if (game.pendingActions.length > 0) return true;

    if (!pendingClaim.cancelledByHu) {
      const kongPlayer = game.players.find(p => p.id === pendingClaim.playerId);
      if (kongPlayer && kongPlayer.status === PlayerStatus.PLAYING) {
        this.completeExtendedKong(game, kongPlayer, pendingClaim.tile);
      }
    }

    game.pendingKongClaim = undefined;
    return true;
  }

  private async handleHu(game: GameState, player: Player, selectedWinOptionLabel?: string): Promise<void> {
    return this.actionHandler.handleHu(game, player, selectedWinOptionLabel);
  }

  /**
   * 造反处理
   * 触发条件: 五毒散(见 isFivePoison)
   * 效果: 本局结束,下局倍数×2,造反者成为庄家
   */
  private async handleRebel(game: GameState, player: Player): Promise<void> {
    return this.actionHandler.handleRebel(game, player);
  }

  /**
   * 梁山聚义:全员投票机制(仅活跃玩家,4人全真人时开启)
   * - 每个活跃玩家可点击一次(之后锁定)
   * - 累积赢分超过被QJ线的玩家:自动视为同意,无否决权
   * - 全部活跃玩家都同意 → 本局结束,下把翻倍
   */
  private handleLiangShan(game: GameState, player: Player): void {
    this.actionHandler.handleLiangShan(game, player);
  }

  /**
   * 等我想一想:冻结其他玩家8秒,给自己思考时间
   * - 每局限定次数(默认3次)
   * - 只有有胡/碰/杠选项时可用
   * - 冻结期间其他家不能操作
   */
  private handleThink(game: GameState, player: Player): void {
    this.actionHandler.handleThink(game, player);
  }

  /**
   * 获取玩家在本房间的累积有效输赢(仅计算与真人玩家的对战,去掉AI)
   * 通过 matchHistory 计算
   */
  private getPlayerCumulativeScore(gameId: string, playerId: string): number {
    // 从当前内存中的游戏历史计算
    // 注意:这里简化处理,通过当前游戏的 roundStats 追踪
    // 如果没有 roundStats,返回 0
    const game = this.games.get(gameId);
    if (!game || !game.roundStats) return 0;

    let cumulative = 0;
    for (const round of game.roundStats) {
      const score = round.scores[playerId] ?? 0;
      if (score > 0) {
        cumulative += score;
      }
    }
    return cumulative;
  }

  /**
   * 检查各玩家是否突破被聚义QJ线,更新 qjAlerts(每局独立刷新)
   */
  private checkQJThresholdAlerts(game: GameState): void {
    const threshold = game.liangShanThreshold ?? 4000;
    const alerts: { playerId: string; playerName: string; score: number }[] = [];

    for (const player of game.players) {
      if (this.isPlayerBotControlled(player)) continue; // 跳过AI
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, player.id);
      if (cumulativeScore > threshold) {
        alerts.push({ playerId: player.id, playerName: player.name, score: cumulativeScore });
      }
    }

    game.qjAlerts = alerts;
    if (alerts.length > 0) {
      console.log(`[QJ Alert] ${alerts.map(a => `${a.playerName}(${a.score})`).join(', ')} 已突破被聚义QJ线${threshold}`);
    }
  }

  /**
   * 计算玩家换位置次数(基于累积输分)
   * 每输一个QJ线距离,获得1次机会
   * 默认QJ线4000:输4000→1次,输8000→2次,输12000→3次
   */


  /**
   * 应用待生效的换位请求(在startGame中调用)
   */

  /**
   * 观赛者请求下局替换某个AI
   */

  /**
   * 应用待生效的替换AI请求(在startGame中调用)
   */


  private handleCheatHu(game: GameState, player: Player): void {
    this.actionHandler.handleCheatHu(game, player);
  }

  private async handlePass(game: GameState, player: Player): Promise<void> {
    return this.actionHandler.handlePass(game, player);
  }
  private checkPendingActions(game: GameState, discardedTile: Tile): void {
    game.pendingActions = [];
    delete (game as any).hasTriggeredAction;
    const discarderIndex = game.currentPlayerIndex;

    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);

    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING) continue;
      if (player.id && player.id === game.players[game.currentPlayerIndex].id) continue;

      const actions: ActionType[] = [];

      // Check for peng
      const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, discardedTile));
      if (matchingTiles.length >= 2) {
        actions.push(ActionType.PENG);
      }

      // Check for kong
      if (matchingTiles.length >= 3) {
        actions.push(ActionType.KONG);
      }

      // Check for hu
      const testHand = [...player.hand.concealedTiles, discardedTile];
      // 传实际 melds 对象（非 length），确保 canWin 正确识别包含门口牌的完整牌型
      const wildTileId = typeof game.customScoringMode === 'string' ? game.customScoringMode : null;
      const wildChecker = buildWildTileChecker(wildTileId, game.wildTileGroup);
      const winCheck = canWin(testHand, player.hand.exposedMelds, wildChecker, undefined, game.wildTileGroup);
      if (winCheck.canWin) {
        // 规则:门口无花不能捉冲(所有非豁免牌型);豁免:风碰/风一色/清碰/混碰/八花/四百搭/清一色/大吊
        const flowerCount = player.hand.exposedMelds
          .flatMap(m => m.tiles)
          .filter(t => isFlower(t)).length;

        const handTypes = detectHandTypes(
          testHand,
          player.hand.exposedMelds,
          false,
          flowerCount,
          game.customScoringMode || null,
          game.wildTileGroup
        );

        const concealedNonFlower = player.hand.concealedTiles.filter(t => !isFlower(t));
        const isDaDiao = concealedNonFlower.length === 1;
        const hasTenPointExemption = this.hasTenPointClaimExemption(handTypes, isDaDiao);
        // 规则：门口无花不能捉冲（对所有非豁免牌型生效）
        // 豁免牌型：风碰/风一色/清碰/混碰/八花/四百搭/清一色/大吊
        const requiresFlowerGate = !hasTenPointExemption;
        // 花牌 或 风箭刻 或 任意杠牌 满足其一即可
        const hasFlowerAtDoor = flowerCount > 0;
        const hasWindDragonTriplet = player.hand.exposedMelds.some(m =>
          (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) &&
          m.tiles[0] && (isWind(m.tiles[0]) || isDragon(m.tiles[0]))
        );
        const hasAnyKong = player.hand.exposedMelds.some(m => m.type === MeldType.KONG);
        const hasGatePass = hasFlowerAtDoor || hasWindDragonTriplet || hasAnyKong;

        if (!requiresFlowerGate || hasGatePass) {
          actions.push(ActionType.HU);
        }
      }

      if (actions.length > 0) {
        actions.push(ActionType.PASS);
        game.pendingActions.push({
          playerId: player.id,
          availableActions: actions,
          tile: discardedTile,
          expiresAt: Date.now() + this.timerManager.getHumanClaimDecisionTimeoutMs(game, player, actions)
        });
      }
    }

    // Check for CHOW (吃) - only the next active player (下家) can chow
    // 吃和碰同时进入pending池,碰优先级高于吃
    for (const pending of game.pendingActions) {
      if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
      const targetPlayer = game.players.find(player => player.id === pending.playerId);
      if (!targetPlayer) continue;
      this.winEvaluator.invalidateCache(game.gameId, [targetPlayer.id]);
      this.winEvaluator.prewarm(game, targetPlayer, 'discard', pending.tile);
    }

    const chowPlayer = this.getNextActivePlayer(game, discarderIndex);
    if (chowPlayer) {
      const sequences = tileHelper.findChowSequences(chowPlayer.hand.concealedTiles, discardedTile, game);
      if (sequences.length > 0) {
        const chowOptions = tileHelper.buildChowOptionIds(sequences, discardedTile);
        // 检查该玩家是否已有碰/杠/胡的pending(如果有,追加吃选项)
        const existing = game.pendingActions.find(pa => pa.playerId === chowPlayer.id);
        if (existing) {
          if (!existing.availableActions.includes(ActionType.CHOW)) {
            existing.availableActions.push(ActionType.CHOW);
          }
          existing.chowOptions = chowOptions;
          existing.selectedChowTileIds = this.isPlayerBotControlled(chowPlayer)
            ? selectBotChowTileIds(chowPlayer, game, discardedTile, chowOptions)
            : undefined;
        } else {
          game.pendingActions.push({
            playerId: chowPlayer.id,
            availableActions: [ActionType.CHOW, ActionType.PASS],
            tile: discardedTile,
            chowOptions,
            selectedChowTileIds: this.isPlayerBotControlled(chowPlayer)
              ? selectBotChowTileIds(chowPlayer, game, discardedTile, chowOptions)
              : undefined,
            expiresAt: Date.now() + this.timerManager.getHumanClaimDecisionTimeoutMs(game, chowPlayer, [ActionType.CHOW, ActionType.PASS])
          });
        }
      }
    }

    if (chowPlayer) {
      const chowPlayerIndex = game.players.findIndex(p => p.id === chowPlayer.id);
      if (chowPlayerIndex >= 0) {
        const hasPendingForChowPlayer = game.pendingActions.some(pa => pa.playerId === chowPlayer.id);
        if (hasPendingForChowPlayer) {
          game.currentPlayerIndex = chowPlayerIndex;
          console.log(`[handleDiscard] CHOW player ${chowPlayer.name} resetting drawnThisTurn=false`);
          game.drawnThisTurn = false;
        }
      }
    }

    if (game.pendingActions.length === 0) {
      this.timerManager.clearPendingActionTimer(game.gameId);
    }
  }

  /**
   * Get the next active (PLAYING) player after the given index, skipping WON/LOST players
   */
  private getNextActivePlayer(game: GameState, afterIndex: number): Player | undefined {
    const count = game.players.length;
    for (let i = 1; i <= count; i++) {
      const idx = (afterIndex + i) % count;
      if (game.players[idx].status === PlayerStatus.PLAYING) {
        return game.players[idx];
      }
    }
    return undefined;
  }

  /**
   * Get the previous active (PLAYING) player before the given index, skipping WON/LOST players
   */
  private getPreviousActivePlayer(game: GameState, beforeIndex: number): Player | undefined {
    const count = game.players.length;
    for (let i = 1; i <= count; i++) {
      const idx = (beforeIndex - i + count) % count;
      if (game.players[idx].status === PlayerStatus.PLAYING) {
        return game.players[idx];
      }
    }
    return undefined;
  }

  /**
   * Find all possible sequence combinations in hand that include the given tile
   * Only works for number suits (筒万条)
   * 百搭牌不能用于吃牌
   */

  /**
   * 对吃牌组合评分,选择最优吃法
   * 评分规则:
   * - 夹张(弃牌在中间):最高优先,完成搭子
   * - 单边(弃牌在边且手牌是1,2或8,9):次优先,完成边搭
   * - 两面(弃牌在边且手牌连号):最低优先,留下灵活搭子
   */

  /**
   * 从多个吃牌组合中选择最优组合
   */

  private async moveToNextPlayer(game: GameState): Promise<void> {
    if (game.phase !== GamePhase.PLAYING) {
      return;
    }

    // 如果还有 pending actions 未处理,不要推进
    if (game.pendingActions.length > 0) {
      console.log(`[moveToNextPlayer] Skipped: ${game.pendingActions.length} pending actions remaining`);
      return;
    }

    if (game.players.length === 0) {
      throw new Error('No players remaining');
    }

    let rotations = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      rotations++;
      if (rotations > game.players.length) {
        throw new Error('No active players remaining');
      }
    } while (game.players[game.currentPlayerIndex].status !== PlayerStatus.PLAYING);

    await this.beginCurrentPlayerTurn(game);
  }

  private async beginCurrentPlayerTurn(game: GameState): Promise<void> {
    const nextPlayer = game.players[game.currentPlayerIndex];
    if (!nextPlayer) {
      throw new Error('No current player available');
    }

    const freezeMs = this.timerManager.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI

    console.log(`[moveToNextPlayer] → ${nextPlayer.name} (${this.isPlayerBotControlled(nextPlayer) ? 'BOT' : 'HUMAN'}), freeze: ${freezeMs}ms`);

    // 【状态机修复】新回合:重置摸牌状态
    // 每次轮到新玩家时重置drawnThisTurn，让该玩家能正常摸牌。
    // 这修复了"在别人回合中声称PENG/KONG后该玩家无法摸牌"的bug。
    // 但如果玩家手牌已达14张（吃碰杠后进入出牌状态），不重置以防再摸导致超限
    if (this.getPlayableTileCount(nextPlayer) < 14) {
      console.log(`[beginCurrentPlayerTurn] ${nextPlayer.name} resetting drawnThisTurn=false`);
      game.drawnThisTurn = false;
    } else {
      console.log(`[beginCurrentPlayerTurn] ${nextPlayer.name} hand full (${this.getPlayableTileCount(nextPlayer)} tiles), keeping drawnThisTurn=true`);
    }
    // 百搭冷冻一圈完成检查：当再次轮到打出百搭的玩家时，解除冷冻
    // 冷冻从打出百搭开始，经过上家、对家、下家各一出牌后（即该玩家再次轮到）解除
    if (game.freezePlayerId) {
      const freezePlayer = game.players.find(p => p.id === game.freezePlayerId);
      if (freezePlayer && nextPlayer.id === game.freezePlayerId) {
        // 打出百搭的玩家再次轮到，一圈完成，解除冷冻
        console.log(`[Freeze] 一圈完成，解除冷冻 for ${freezePlayer.name}`);
        game.freezePlayerId = null;
        game.freezeComplete = false;
        if (this.wsManager) {
          this.broadcastService.broadcastQuickMessage(game.gameId, `🃏 冷冻解除，现在可以正常吃碰捉冲了！`, 'info');
        }
      }
    }

    this.replaceFlowers(game, nextPlayer);
    // 补花后手牌可能已达14张，标记已摸牌，避免 bot 出牌时尝试 DRAW 被拒绝
    if (this.getPlayableTileCount(nextPlayer) >= 14) {
      game.drawnThisTurn = true;
    }

    // 设置 freezeUntil 同时控制人类和 Bot，让 autoDrawForCurrentPlayer 都能检查
    (game as any)._freezeUntil = Date.now() + freezeMs;

    // 人类玩家也需要定时器清除冻结（否则 _freezeUntil 永远不会被清除）
    if (!this.isPlayerBotControlled(nextPlayer)) {
      const humanFreezeIndex = game.currentPlayerIndex;
      this.timerManager.detachTimer(setTimeout(async () => {
        try {
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== humanFreezeIndex) return;
          delete (freshGame as any)._freezeUntil;
          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (e) { /* ignore */ }
      }, freezeMs));
    }

    if (this.isPlayerBotControlled(nextPlayer)) {
      const freezeBotIndex = game.currentPlayerIndex;
      const botFreezeTimer = this.timerManager.detachTimer(setTimeout(async () => {
        try {
          this.timerManager.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeBotIndex) return; // 已被 claim 接管
          const livePlayer = freshGame.players[freshGame.currentPlayerIndex];
          if (!livePlayer || livePlayer.id !== nextPlayer.id || livePlayer.status !== PlayerStatus.PLAYING) return;
          if (freshGame.pendingActions.length > 0) {
            const botLogMsg = (freshGame as any).hasTriggeredAction
              ? '[bot-freeze] hasTriggeredAction=true, clearing expired claims after freeze'
              : '[bot-freeze] No action triggered, clearing CD claims (B preserved)';
            console.log(`[bot-freeze] Freeze expired for ${livePlayer.name}, ${botLogMsg}`);
            // ★ 犹豫期到期后，不管 hasTriggeredAction，都要清除过期 claims
            // 否则其他玩家的过期 pending action 永远不清除，游戏卡住
            delete (freshGame as any).hasTriggeredAction;
            this.clearExpiredClaimsForDecisionWindow(freshGame);
            if (freshGame.pendingActions.length > 0 && !this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              this.schedulePendingActionTimeout(game.gameId);
              return;
            }
            if (this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
              // [FIX] Bot with chow-only pending: decide chow instead of clearing
              if (this.isPlayerBotControlled(livePlayer)) {
                const chowPa = freshGame.pendingActions.find(pa => pa.playerId === livePlayer.id);
                if (chowPa && freshGame.pendingActions.length === 1) {
                  chowPa.selectedChowTileIds = chowPa.tile
                    ? selectBotChowTileIds(livePlayer, freshGame, chowPa.tile, chowPa.chowOptions)
                    : undefined;
                  // ★ 修复：直接调用 handleChow，避免 resolvePendingAction 中 shouldClaimPendingAction 的随机概率推翻已做出的吃牌决策
                  if (chowPa.selectedChowTileIds && chowPa.selectedChowTileIds.length > 0 && livePlayer.hand.concealedTiles.length >= 2) {
                    await this.handleChow(freshGame, livePlayer, chowPa.selectedChowTileIds);
                  } else {
                    this.handlePass(freshGame, livePlayer);
                  }
                  freshGame.pendingActions = freshGame.pendingActions.filter(pa => pa.playerId !== livePlayer.id);
                  await this.persistGame(freshGame);
                  this.broadcastGameState(game.gameId);
                  // ⚠️ 不要 return！必须继续执行摸牌逻辑
                }
              }
              this.clearCurrentTurnPendingActions(freshGame, livePlayer.id);
            }
            if (freshGame.pendingActions.length > 0) {
              // 🔴 修复：bot freeze到期后还有pending残留 → 视为bot没反应 → auto-pass
              // 直接清除pending继续推进，而不是renew超时导致死循环
              console.log(`[bot-freeze] ${livePlayer.name} no response, clearing pending actions`);
              freshGame.pendingActions = [];
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
            }
          }
          // ★ 清除 _freezeUntil（定时器到期，冻结结束）
          delete (freshGame as any)._freezeUntil;
          console.log(`[bot-freeze] Freeze expired for ${livePlayer.name}, drawing...`);
          // 牌墙已空 → 流局
          if (freshGame.wall.length === 0) {
            this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            return;
          }
          this.replaceFlowers(freshGame, livePlayer);
          if (this.getPlayableTileCount(livePlayer) >= 14) {
            freshGame.drawnThisTurn = true;
            console.log(`[bot-freeze] ${livePlayer.name} already filled hand via flower replacement, scheduling discard`);
          } else {
            this.handleDraw(freshGame, livePlayer);
            freshGame.drawnThisTurn = true; // 【状态机修复】标记已摸牌
            console.log(`[bot-freeze] Draw done, hand: ${livePlayer.hand.concealedTiles.length} tiles, scheduling discard`);
          }
          this.scheduleBotDiscard(game.gameId, livePlayer.id);
          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error('[bot-freeze] Error:', err);
        }
      }, this.timerManager.getHesitationWindow(game)));
      this.timerManager.freezeTimers.set(game.gameId, botFreezeTimer);
    } else {
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);

      const freezeCurrentIndex = game.currentPlayerIndex;
      const humanFreezeTimer = this.timerManager.detachTimer(setTimeout(async () => {
        try {
          this.timerManager.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeCurrentIndex) return; // 已被 claim 接管

          delete (freshGame as any)._freezeUntil;

          if (freshGame.pendingActions.length > 0) {
            // [Fix] hesitation/freeze expiry should not clear any player's claim options
            console.log(`[freeze] Pending actions active for ${freshGame.players[freezeCurrentIndex]?.name}, keeping all claims`);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            this.schedulePendingActionTimeout(game.gameId);
            return;
          }

          // 冻结窗口结束 → 人类玩家手动摸牌,AI自动摸牌
          const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
          if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
            // 牌墙已空 → 流局
            if (freshGame.wall.length === 0) {
              this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              return;
            }
            // AI玩家:自动摸牌
            if (this.isPlayerBotControlled(nextPlayer)) {
              this.replaceFlowers(freshGame, nextPlayer);
              if (this.getPlayableTileCount(nextPlayer) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[freeze] ${nextPlayer.name} reached discard state after flower replacement`);
              } else {
                this.handleDraw(freshGame, nextPlayer);
                freshGame.drawnThisTurn = true; // 【状态机修复】标记已摸牌
                console.log(`[freeze] Auto-draw for bot ${nextPlayer.name}`);
              }
              this.scheduleBotDiscard(game.gameId, nextPlayer.id);
            } else {
              if (this.getPlayableTileCount(nextPlayer) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[freeze] Human ${nextPlayer.name} reached discard state after flower replacement`);
              } else {
                // 人类玩家:不自动摸,清除冻结,广播状态让前端显示"摸"按钮
                console.log(`[freeze] Human ${nextPlayer.name} freeze expired, waiting for manual draw`);
              }
            }

            // 超时自动接管:人类玩家连续2回合未操作 → 自动AI托管
            if (!this.isPlayerBotControlled(nextPlayer)) {
              this.scheduleAutoTakeover(game.gameId, nextPlayer.id, freezeCurrentIndex);
            }
          }

          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error('[freeze] Error clearing freeze:', err);
        }
      }, freezeMs));
      this.timerManager.freezeTimers.set(game.gameId, humanFreezeTimer);
    }
  }

  /**
   * 超时自动接管:人类玩家连续2回合60秒未操作 → 自动AI托管
   * 仅本局结算减半,玩家回来后下一局恢复正常
   */
    // 追踪每个玩家连续超时次数(gameId-playerId → count)
  
  private getAutoTakeoverTimeoutMs(): number {
    return this.timerManager.getAutoTakeoverTimeoutMs();
  }

  private scheduleAutoTakeover(gameId: string, playerId: string, expectedIndex: number): void {
    this.botController.scheduleAutoTakeover(gameId, playerId, expectedIndex);
  }


  /**
   * 取消超时自动接管(玩家已操作),重置连续超时计数
   */
  private clearAutoTakeover(gameId: string, playerId: string): void {
    this.botController.clearAutoTakeover(gameId, playerId);
  }

  /**
   * 调度 bot 玩家延迟出牌
   */
  
  private scheduleBotDiscard(gameId: string, playerId: string): void {
    this.botController.scheduleBotDiscard(gameId, playerId);
  }


  /**
   * 补花:门口有花牌时,从牌墙补牌到手牌
   */
  private replaceFlowers(game: GameState, player: Player): void {
    // 找到门口的花牌meld(只有1张牌的meld就是花牌)
    const flowerMelds = player.hand.exposedMelds.filter(
      m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !(m as any).replacementDone
    );

    if (flowerMelds.length === 0) return;

    // 从 exposedMelds 中移除这些花牌 meld

    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      (meld as any).replacementDone = true;
      const flowerTile = meld.tiles[0];

      let replacement = game.wall.pop()!;

      // 如果补到花牌,花牌留在门口,继续摸(正确麻将规则:花牌不增加总牌数)
      while (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false,
          replacementDone: true as any
        } as any);
        if (game.wall.length === 0) {
          replacement = null as any;
          break;
        }
        replacement = game.wall.pop()!;
      }

      if (replacement) {
        // 补到普通牌,加入手牌(替换原来花牌的位置)
        player.hand.concealedTiles.push(replacement);
        (player as any).lastDrawnTile = replacement;
      }
    }
    // 有补花时广播一条消息
    if (flowerMelds.length > 0) {
      this.broadcastService.broadcastFlowerReplacement(game, player, flowerMelds.length);
    }

    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);

    // 补花后检查牌墙是否空了
    if (game.wall.length === 0 && game.phase === GamePhase.PLAYING) {
      console.log(`[replaceFlowers] Wall exhausted after flower replacement`);
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
    }
  }

  private updateRoundNumber(game: GameState): void {
    const playerCount = game.players.length || 1;
    const discardCount = game.discardPile.length;
    const calculatedRound = Math.max(1, Math.ceil(discardCount / playerCount));
    game.roundNumber = calculatedRound;
  }

  /**
   * 生成赔付算式明细
   * 例：自摸 + 三口：160+160+160*3=800
   * 捉冲 + 互包：160(放冲)+160(互包补赔)=320
   * 捉冲 + 互包 + 其他玩家不付：0+160+160=320
   * 普通自摸：160+160+160=480
   */
  private static formatPaymentFormula(
    transfers: Array<{ amount: number; bailoutType?: string; reason: string }>,
    isSelfDrawn: boolean,
    totalPlayers: number,
    isBotPenalty: boolean = false
  ): string {
    if (!transfers || transfers.length === 0) return '';
    // 补齐全部玩家：未参与的玩家计为0
    const filled: Array<{ amount: number; bailoutType?: string; reason: string }> = [...transfers];
    if (filled.length < totalPlayers - 1) {
      // 补 0 的位置（未参与赔付的玩家）
      while (filled.length < totalPlayers - 1) {
        filled.push({ amount: 0, reason: '不参与' });
      }
    }
    const parts = filled.map(t => {
      if (t.amount === 0) return '0';
      let term: string;
      if (t.bailoutType && (t.reason.includes('互包') || t.bailoutType === '三口' || t.bailoutType === '四口')) {
        const bailoutMultiplier = t.bailoutType === '四口' ? 5 : 3;
        term = `${t.amount / bailoutMultiplier}*${bailoutMultiplier}`;
      } else {
        term = String(t.amount);
      }
      if (isBotPenalty) term = `(${term})/2`;
      return term;
    });
    const total = transfers.reduce((s, t) => s + t.amount, 0);
    const finalTotal = isBotPenalty ? Math.ceil(total / 2) : total;
    return `${parts.join('+')}=${finalTotal}`;
  }

  public endRound(game: GameState, reason: GameEndReason): void {
    // ★ K哥铁律(2026-06-05): 防止上一局残留的 REVEAL 定时器在新局里触发
    // 如果游戏已经不在 REVEAL/PLAYING 阶段（比如已经 ENDED 或 STARTING），跳过
    if (game.phase !== GamePhase.REVEAL && game.phase !== GamePhase.PLAYING) {
      console.log(`[endRound] Skipped: game phase=${game.phase}, stale timer?`)
      return
    }
    this.timerManager.clearPendingActionTimer(game.gameId);
    // 【2026-05-29 验牌阶段】如果还不是REVEAL阶段，先进入REVEAL并延迟5秒
    // 梁山聚义成功：跳过验牌，直接结算
    // 流局（wall_exhausted）：跳过验牌阶段，直接结算（K哥要求）
    const skipReveal = !!(game as any).liangShanSuccess || reason === GameEndReason.WALL_EXHAUSTED;
    if (game.phase !== GamePhase.REVEAL && !skipReveal) {
      game.phase = GamePhase.REVEAL;
      game.endReason = reason;
      const winners = game.players.filter(p => p.status === PlayerStatus.WON);
      const winnerIds = new Set(winners.map(w => w.id));
      for (const player of game.players) {
        if (!winnerIds.has(player.id) && player.status === PlayerStatus.PLAYING) {
          player.status = PlayerStatus.LOST;
        }
      }
      this.store.flushGameNow(game.gameId, game).catch(() => {});
      this.broadcastGameState(game.gameId);
      const gameId = game.gameId;
      const revealTimer = setTimeout(async () => {
        this.timerManager.revealTimers.delete(gameId);
        try {
          console.log(`[enterReveal] 5s timer FIRED gameId=${gameId.substring(0,8)}`);
          const fresh = await this.getGame(gameId);
          console.log(`[enterReveal] game=${!!fresh} phase=${fresh?.phase}`);
          if (!fresh || fresh.phase !== GamePhase.REVEAL) {
            console.warn(`[enterReveal] Game not in REVEAL (phase=${fresh?.phase}), aborting.`);
            return;
          }
          this.endRound(fresh, reason);
        } catch (e) {
          console.warn("[enterReveal] end error:", e);
        }
      }, 5000);
      this.timerManager.revealTimers.set(gameId, revealTimer);
      this.timerManager.detachTimer(revealTimer);
      return;
    }
    // 已处于REVEAL阶段，执行结算
    game.phase = GamePhase.ENDED;
    // ★ K哥铁律(2026-06-05): 本局结算完成,重置 winnersCount 防下一局跨局累积
    game.winnersCount = 0;
    // 回合结束立即刷盘
    this.store.flushGameNow(game.gameId, game).catch(() => {});
    this.broadcastGameState(game.gameId);
    console.log(`[endRound] phase=ENDED, starting settlement game=${game.gameId.substring(0,8)}`);

    try {

    // Calculate final scores
    const winners = game.players.filter(p => p.status === PlayerStatus.WON);
      const winnerIds = new Set(winners.map(w => w.id));
      for (const player of game.players) {
        if (!winnerIds.has(player.id)) {
          player.status = PlayerStatus.LOST;
        }
      }
    let finalScores: Record<string, number>;
    const roundTransfers: Array<{
      fromPlayerId: string;
      fromPlayerName: string;
      toPlayerId: string;
      toPlayerName: string;
      amount: number;
      reason: string;
      bailoutType?: '三口' | '四口';
    }> = [];
    const specialEvents: Array<{
      type: 'leading_brother';
      fromPlayerId: string;
      fromPlayerName: string;
      totalAmount: number;
      amountPerPlayer: number;
    }> = [];

    if (game.customScoringMode === 'cheat') {
      finalScores = {};
      for (const player of game.players) {
        const isWinner = winners.some(w => w.id === player.id);
        finalScores[player.id] = isWinner ? 1 : -1;
      }
    } else {
      // 精确赔付:每个赢家独立结算
      // - 自摸:所有未胡玩家均摊赔付
      // - 捉冲:只有放冲者全额赔付
      finalScores = {};
      for (const p of game.players) {
        finalScores[p.id] = 0;
      }

      const mutualBailoutRelations = this.bailoutTracker.getMutualBailoutRelations(game.gameId);
      console.log(`[SETTLEMENT] game=${game.gameId} bailoutRelations=${JSON.stringify(mutualBailoutRelations)} players=${game.players.map(p => p.name).join(',')}`);
      // 构建 mutualBailout Map<playerIndex, {partnerIndex, type}>
      const mutualBailout = new Map<number, { partnerIndex: number; type: '三口' | '四口' }>();
      for (const rel of mutualBailoutRelations) {
        const p1Idx = game.players.findIndex(p => p.id === rel.player1);
        const p2Idx = game.players.findIndex(p => p.id === rel.player2);
        if (p1Idx >= 0 && p2Idx >= 0) {
          mutualBailout.set(p1Idx, { partnerIndex: p2Idx, type: rel.type });
          mutualBailout.set(p2Idx, { partnerIndex: p1Idx, type: rel.type });
        }
      }

      // 【修复】多人胡时，按胡牌时间戳排序 winOrder
      // 先胡的排前面，与座位无关
      if (winners.length > 1) {
        const sortedWinners = [...winners].sort((a, b) => (a.winTimestamp ?? 0) - (b.winTimestamp ?? 0));
        sortedWinners.forEach((w, i) => { w.winOrder = i + 1; });
        console.log(`[SETTLEMENT] winOrder by time: ${sortedWinners.map(w => `${w.name}=${w.winOrder}(${w.winTimestamp})`).join(', ')}`);
      }

      for (const winner of winners) {
        const winnerIdx = game.players.findIndex(p => p.id === winner.id);
        if (winnerIdx < 0) continue;
        const currentWinOrder = winner.winOrder ?? Number.MAX_SAFE_INTEGER;
        const eligiblePlayerIndices = game.players
          .map((player, index) => ({ player, index }))
          .filter(({ player, index }) => {
            if (index === winnerIdx) return true;
            return player.winOrder == null || player.winOrder > currentWinOrder;
          })
          .map(({ index }) => index);

        // 捉冲时找放冲者index
        let discarderIdx: number | undefined;
        if (!winner.isSelfDrawn && winner.discarderId) {
          discarderIdx = game.players.findIndex(p => p.id === winner.discarderId);
        }

        // 互包赔付: finalPoints × 3/5 (自摸) 或 × 2 (捉冲)
        // winner.wonFan = finalPoints (已含 baseFan × extraMultipliers × globalMultiplier)
        const breakdown = calculateSettlementBreakdownByRules(
          winner.wonFan,        // 最终点数（已含全局倍数，用于正常结算和互包赔付）
          winner.isSelfDrawn ?? false,
          winnerIdx,
          eligiblePlayerIndices,
          mutualBailout,
          discarderIdx
        );
        console.log(`[SETTLEMENT] winner=${game.players[winnerIdx]?.name} wonFan=${winner.wonFan} isSelfDrawn=${winner.isSelfDrawn} bailoutSize=${mutualBailout.size} eligibleIndices=${JSON.stringify(eligiblePlayerIndices)}`);

        for (const transfer of breakdown.transfers) {
          roundTransfers.push({
            fromPlayerId: game.players[transfer.fromIndex].id,
            fromPlayerName: game.players[transfer.fromIndex].name,
            toPlayerId: game.players[transfer.toIndex].id,
            toPlayerName: game.players[transfer.toIndex].name,
            amount: transfer.amount,
            reason: transfer.reason,
            bailoutType: transfer.bailoutType
          });
        }

        // ★ 生成赔付算式明细 (例：自摸 三口时输出 160+160+160*3=800)
        (winner as any)._paymentFormula = GameManager.formatPaymentFormula(
          breakdown.transfers.map(t => ({
            amount: t.amount,
            bailoutType: t.bailoutType,
            reason: t.reason
          })),
          winner.isSelfDrawn ?? false,
          game.players.length,
          botTakeovers.includes(winner.id)
        );

        for (const [idx, delta] of breakdown.deltas) {
          const pid = game.players[idx].id;
          finalScores[pid] = (finalScores[pid] ?? 0) + delta;
        }
      }
    }

    const botTakeovers = game.botTakeoverPlayers || [];
    // ★ BotPenalty：AI接管玩家赢分减半（基于单局 finalScores，不是累计分）
    for (const player of game.players) {
      if (botTakeovers.includes(player.id) && (finalScores[player.id] ?? 0) > 0) {
        finalScores[player.id] = Math.ceil(finalScores[player.id] / 2);
        console.log(`[BotPenalty] ${player.name}(AI托管) 单局赢分减半: ${finalScores[player.id]}`);
      }
    }

    // ★ 带头大哥：基于 finalScores 处理
    if (game.leadingBrotherEvent) {
      const { firstPlayerId } = game.leadingBrotherEvent;
      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      if (firstPlayer) {
        const penalty = 30;
        finalScores[firstPlayerId] = (finalScores[firstPlayerId] || 0) - penalty;
        specialEvents.push({
          type: 'leading_brother',
          fromPlayerId: firstPlayer.id,
          fromPlayerName: firstPlayer.name,
          totalAmount: penalty,
          amountPerPlayer: 10
        });
        for (const p of game.players) {
          if (p.id !== firstPlayerId) {
            finalScores[p.id] = (finalScores[p.id] || 0) + 10;
            roundTransfers.push({
              fromPlayerId: firstPlayer.id,
              fromPlayerName: firstPlayer.name,
              toPlayerId: p.id,
              toPlayerName: p.name,
              amount: 10,
              reason: '谢谢带头大哥赔付'
            });
          }
        }
        console.log(`[LeadingBrother] ${firstPlayer.name} 赔付30分(每家10分)`);
      }
      game.leadingBrotherEvent = null;
    }

    game.finalScores = finalScores;
    // ★ player.score 是累计分，每局累加（不覆盖）
    for (const player of game.players) {
      player.score = (player.score || 0) + (finalScores[player.id] ?? 0);
    }

    // 清除本局AI接管记录
    game.botTakeoverPlayers = [];

    // 记录本局统计
    if (!game.roundStats) game.roundStats = [];
    const roundWinners = game.players.filter(p => p.status === PlayerStatus.WON).sort((a, b) => (a.winOrder ?? 99) - (b.winOrder ?? 99));

    // 检查被聚义QJ线(每局刷新)
    this.checkQJThresholdAlerts(game);

    const finalReason = (reason === GameEndReason.WALL_EXHAUSTED && roundWinners.length > 0)
      ? GameEndReason.LAST_PLAYER
      : reason;

    // ★ K哥铁律(2026-06-05): 下一局庄家 = 本局首胡者(一炮多响则放冲者坐庄)
    // 流局时庄家不变(已处理)。跳走这个逻辑让上局赢家中 winner=1 当庄。
    if (!game.nextDealerId && roundWinners.length > 0 && finalReason !== GameEndReason.WALL_EXHAUSTED) {
      const firstWinner = roundWinners[0];
      // 检查是否一炮多响（多个 winner 同一时间胡）
      const isMultipleWinners = roundWinners.length > 1
      if (isMultipleWinners) {
        // 一炮多响: 放冲者坐庄（winner.discarderId）
        const discarder = game.players.find(p => p.id === firstWinner.discarderId)
        if (discarder) {
          game.nextDealerId = discarder.id
          console.log(`[endRound] 一炮多响，放冲者坐庄: ${discarder.name}`)
        } else {
          game.nextDealerId = firstWinner.id
          console.log(`[endRound] 首胡者坐庄 (放冲者未找到): ${firstWinner.name}`)
        }
      } else {
        game.nextDealerId = firstWinner.id
        console.log(`[endRound] 首胡者坐庄: ${firstWinner.name}`)
      }
    }

    // 倍数继承链:溢出倍数继承(超过8倍封顶的部分传递给下一把)
    // 规则:effective = inheritMultiplier × roundMultiplier,封顶8,超出部分 = effective/8 继承给下把
    // 注意:聚义/造反已经自行设置 inheritedGlobalMultiplier,不要覆盖
    if (finalReason === GameEndReason.WALL_EXHAUSTED) {
      // 流局:庄家不变,保留当前庄家为下局庄家
      if (!game.nextDealerId) {
        const currentDealer = game.players[game.dealerIndex];
        if (currentDealer) {
          game.nextDealerId = currentDealer.id;
          console.log(`[endRound] 流局，庄家不变: ${currentDealer.name}`);
        }
      }
      // 流局:先翻倍,再算溢出(但全局倍数封顶8)
      const currentGlobal = game.inheritMultiplier ?? 1;
      const roundMul = game.roundMultiplier ?? 1;
      // 先翻倍,封顶8
      const doubled = Math.min(currentGlobal * 2, 8);
      const effective = doubled * roundMul;
      // 全局倍数封顶8,溢出部分继承
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : doubled, 8);
    } else if (game.inheritedGlobalMultiplier === undefined) {
      // 正常结算(有人胡了)且没有被聚义/造反提前设置
      const currentGlobal = game.inheritMultiplier ?? 1;
      const roundMul = game.roundMultiplier ?? 1;
      const effective = currentGlobal * roundMul;
      // 全局倍数封顶8,溢出部分继承
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : 1, 8);
    }
    // else: inheritedGlobalMultiplier 已被聚义/造反设置,不覆盖

    game.roundStats.push({
      roundNumber: game.roundNumber,
      scores: { ...finalScores },
      winners: roundWinners.map(w => w.id),
      selfDraws: roundWinners.filter(w => w.isSelfDrawn).map(w => w.id),
      diceMultiplier: game.roundMultiplier ?? 1,
      inheritMultiplier: game.inheritMultiplier ?? 1,
      effectiveMultiplier: Math.min((game.inheritMultiplier ?? 1) * (game.roundMultiplier ?? 1), 8),
      settlementMultiplier: game.settlementMultiplier ?? 1,
      overflowCarryMultiplierNextRound: game.inheritedGlobalMultiplier ?? 1,
      bailoutRelations: this.bailoutTracker.getMutualBailoutRelations(game.gameId).map(rel => ({
        ...rel,
        player1Name: game.players.find(player => player.id === rel.player1)?.name,
        player2Name: game.players.find(player => player.id === rel.player2)?.name
      })),
      winnerDetails: roundWinners.map(winner => {
        const discarder = winner.discarderId
          ? game.players.find(player => player.id === winner.discarderId)
          : undefined;
        const concealedTiles = winner.hand.concealedTiles.map(tile => ({ ...tile }));
        const exposedTiles = winner.hand.exposedMelds.flatMap(meld => meld.tiles).map(tile => ({ ...tile }));
        const allWinnerTiles = [...concealedTiles, ...exposedTiles];
        const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
        const isBotPenalty = botTakeovers.includes(winner.id);
        return {
          playerId: winner.id,
          playerName: winner.name,
          handTypeName: winner.winHandType,
          isSelfDrawn: winner.isSelfDrawn ?? false,
          isBotPenalty,
          discarderId: winner.discarderId,
          discarderName: discarder?.name,
          baseFan: winner.winningScoreBreakdown?.baseFan ?? 0,
          extraMultipliers: winner.winningScoreBreakdown?.extraMultipliers ?? 1,
          diceMultiplier: winner.winningScoreBreakdown?.diceMultiplier ?? (game.roundMultiplier ?? 1),
          inheritMultiplier: winner.winningScoreBreakdown?.inheritMultiplier ?? (game.inheritMultiplier ?? 1),
          effectiveMultiplier: winner.winningScoreBreakdown?.effectiveMultiplier ?? Math.min((game.inheritMultiplier ?? 1) * (game.roundMultiplier ?? 1), 8),
          settlementMultiplier: winner.winningScoreBreakdown?.settlementMultiplier ?? (game.settlementMultiplier ?? 1),
          finalPoints: winner.winningScoreBreakdown?.finalPoints ?? winner.wonFan,
          details: winner.winningScoreBreakdown?.details ?? [],
          paymentFormula: (winner as any)._paymentFormula || '',
          flowerCount: tileHelper.getPlayerFlowerTiles(winner).length,
          handTiles: concealedTiles,
          exposedTiles,
          exposedMeldGroups: winner.hand.exposedMelds.map(meld => meld.tiles.map(tile => ({ ...tile }))),
          tileFaces: allWinnerTiles.map(tile => this.tileLabel(tile)),
          isMenQing: tileHelper.isPlayerMenQing(winner),
          hasWild: allWinnerTiles.some(tile => isWildTile(tile))
        };
      }),
      transfers: roundTransfers,
      specialEvents: specialEvents.length ? specialEvents : undefined
    });

    const latestRoundStat = game.roundStats[game.roundStats.length - 1];

    const endedAt = Date.now();
    game.phase = GamePhase.ENDED;
    game.endReason = finalReason;
    game.pendingActions = [];
    game.endedAt = endedAt;
    game.lastActionTime = endedAt;
    this.broadcastGameState(game.gameId);

    console.log("[ENDED] broadcastGameState for game", game.gameId, "reason=", finalReason);
    // ENDED 阶段数据完整，立即刷盘确保 MongoDB 不丢数据
    this.store.flushGameNow(game.gameId, game).catch(() => {});
    MatchHistoryService.recordMatch(game, finalScores, finalReason).catch((error) => {
      console.error('Failed to persist match history:', error);
    });

    TrainingRecordService.recordRound(game, finalReason, finalScores, latestRoundStat).catch((error) => {
      console.error('Failed to persist training round record:', error);
    });

    game.customScoringMode = null;

    // 处理下局移除/替换请求
    this.applyPendingChanges(game);

    // 🔄 自动进入下一局（正常结束/流局）
    // 延迟一小段时间让客户端展示结算画面，然后自动进入掷骰子阶段
    if (
      finalReason === GameEndReason.LAST_PLAYER ||
      finalReason === GameEndReason.WALL_EXHAUSTED
    ) {
      // ★ V2.13 K哥优化: 加速进下一局
      // 聚义成功: 只需弹窗(1.8s) -> 4s
      // 流局/造反: 已有 10s 倒计时弹窗 -> 后端 5s(避免和前端倒计时竞争)
      // 胡牌正常结算: 玩家看结算面板 -> 12s
      const isLiangShan = !!(game as any).liangShanSuccess
      const isWallExhausted = finalReason === GameEndReason.WALL_EXHAUSTED
      const hasRebel = !!(game as any).rebelEvent
      let nextRoundDelay: number
      if (isLiangShan) nextRoundDelay = 4000
      else if (isWallExhausted || hasRebel) nextRoundDelay = 5000  // 流局/造反, 客户端有 10s 倒计时但后端不能等太久
      else nextRoundDelay = 10000  // 胡牌正常结算（10秒，与客户端倒计时一致）
      this.autoStartNextRound(game.gameId, nextRoundDelay);
    }
    } catch (e: any) {
      console.error('[endRound] Settlement error:', e?.stack || e);
    }
  }

  /**
   * 自动进入下一局（延时后设置STARTING阶段）
   */
  private autoStartNextRound(gameId: string, delayMs: number = 2000): void {
    console.log(`[autoStartNextRound] SCHEDULED gameId=${gameId.substring(0,8)} delay=${delayMs}ms`);
    const timer = this.timerManager.detachTimer(setTimeout(async () => {
      try {
        console.log(`[autoStartNextRound] FIRING gameId=${gameId.substring(0,8)}`);
        const game = await this.getGame(gameId);
        console.log(`[autoStartNextRound] game=${!!game} phase=${game?.phase} players=${game?.players?.length}`);
        if (!game) {
          console.error(`[autoStartNextRound] Game ${gameId.substring(0,8)} not found! Aborting.`);
          return;
        }
        if (game.phase !== GamePhase.ENDED) {
          console.warn(`[autoStartNextRound] Game ${gameId.substring(0,8)} not ENDED (phase=${game.phase}), skipping.`);
          return;
        }
        // 新流程：beginGame 原子完成洗牌+发牌+骰子
        await this.beginGame(gameId);
        console.log(`[autoStartNextRound] beginGame DONE gameId=${gameId.substring(0,8)} phase=${game.phase}`);

        // 检查庄家是否是真实玩家 — 真实玩家需要自己掷骰子+确认发牌
        const dealer = game.players[game.dealerIndex];
        const isHumanDealer = dealer && !isBotPlayer(dealer);
        if (isHumanDealer) {
          console.log(`[autoStartNextRound] Human dealer (${dealer.name}), skipping auto-deal — waiting for player action`);
          return;
        }

        // AI 庄家：等骰子动画后自动发牌
        const diceAnimMs = 2500;
        const dealTimer = this.timerManager.detachTimer(setTimeout(async () => {
          try {
            const g = await this.getGame(gameId);
            if (g && g.phase === GamePhase.STARTING) {
              await this.dealGame(gameId);
              console.log(`[autoStartNextRound] dealGame DONE gameId=${gameId.substring(0,8)}`);
            }
          } catch (err) {
            console.error('[autoStartNextRound] dealGame Error:', err);
          }
        }, diceAnimMs));
      } catch (err) {
        console.error('[autoStartNextRound] Error:', err);
      }
    }, delayMs));
  }

  /**
   * 应用出局/替换请求(在每局结束后调用)
   */
  private applyPendingChanges(game: GameState): void {
    // 处理替换请求(优先)
    if (game.pendingReplacements?.length) {
      for (const req of game.pendingReplacements) {
        const aiIdx = game.players.findIndex(p => p.id === req.aiPlayerId);
        if (aiIdx === -1) continue;
        const aiName = game.players[aiIdx].name;
        // 替换 AI 玩家:保留位置,改名+改ID
        game.players[aiIdx].id = req.spectatorId;
        game.players[aiIdx].name = req.spectatorName || '替补玩家';
        console.log(`[ApplyChanges] ${aiName} → ${req.spectatorName || '替补玩家'} 接替`);
      }
      game.pendingReplacements = [];
    }

    // 处理移除请求
    if (game.pendingRemovals?.length) {
      for (const removeId of game.pendingRemovals) {
        const idx = game.players.findIndex(p => p.id === removeId);
        if (idx === -1) continue;
        const name = game.players[idx].name;
        game.players.splice(idx, 1);
        // 更新位置
        game.players.forEach((p, i) => { p.position = i; });
        console.log(`[ApplyChanges] ${name} 已移除`);
      }
      game.pendingRemovals = [];

      // 人数不足 → 回到等待状态(麻将需要4人满桌)
      if (game.players.length < 4) {
        game.phase = GamePhase.WAITING;
        // 重置回合相关状态,准备新玩家加入
        game.currentPlayerIndex = 0;
        game.dealerIndex = 0;
        game.pendingActions = [];
        game.actionHistory = [];
        game.discardPile = [];
        game.winnersCount = 0;
        game.roundNumber = 1;
        // 清除所有玩家的游戏中状态,恢复为等待
        for (const p of game.players) {
          p.status = PlayerStatus.WAITING;
          p.hand = { concealedTiles: [], exposedMelds: [], discardedTiles: [] };
          p.isTing = false;
          p.missingSuit = null;
          p.windScore = 0;
          p.rainScore = 0;
          p.wonFan = 0;
          p.winHandType = undefined;
          p.winOrder = null;
          p.winRound = null;
          p.winTimestamp = null;
          p.isSelfDrawn = undefined;
          (p as any).winningTileName = undefined;
          p.discarderId = undefined;
          p.winningScoreBreakdown = undefined;
          p.score = 0;
        }
        console.log(`[ApplyChanges] 玩家不足4人(${game.players.length}),回到等待状态`);
      }
    }
  }

  async endGameForEmptyRoom(gameId: string, reason: GameEndReason = GameEndReason.EMPTY_ROOM): Promise<void> {
    await RoomGameBridge.endGameForEmptyRoom(
      () => this.hydrateFromDatabase(),
      (id) => this.ensureGameLoaded(id),
      (g) => this.persistGame(g),
      (g, r) => this.endRound(g, r),
      (id) => this.broadcastGameState(id),
      gameId,
      reason
    );
  }

  /**
   * List all active games
   */
  async listGames(): Promise<GameState[]> {
    // 从 MongoDB 只加载未结束的游戏（惰性加载不加载所有游戏到内存）
    const allGames = await loadActiveGameStates();
    return Array.from(allGames);
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (game) {
      for (const player of game.players) {
        this.playerToGame.delete(player.id);
      }
      this.games.delete(gameId);
    }
    await deleteGameState(gameId);
  }
}

// Singleton instance
// Use globalThis to persist state across HMR reloads in development
const globalGameManager = globalThis as unknown as { gameManager: GameManager };

if (!globalGameManager.gameManager) {
  globalGameManager.gameManager = new GameManager();
}

export const gameManager = globalGameManager.gameManager;

