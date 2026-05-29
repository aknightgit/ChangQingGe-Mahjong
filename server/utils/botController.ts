/**
 * botController.ts — Bot AI 决策与调度（从 gameManager 拆分）
 * 负责：bot pending 动作处理、吃牌决策、出牌调度、超时自动接管
 */
import { GameState, Player, GamePhase, PlayerStatus, ActionType, PendingAction } from '../types/game';
import { shouldClaimPendingAction, selectBotChowTileIds, selectDiscardTile } from '../services/botService';

/** BotController 依赖的 GameManager 接口 */
export interface BotControllerDeps {
  games: Map<string, GameState>;
  isPlayerBotControlled(player: Player): boolean;
  getCachedWinOptions(game: GameState, player: Player, context: 'self_draw' | 'discard', flags?: any): any[];
  handlePass(game: GameState, player: Player): void;
  handlePeng(game: GameState, player: Player): void;
  handleKong(game: GameState, player: Player, tileId: string): void;
  handleHu(game: GameState, player: Player, selectedWinOptionLabel?: string): Promise<void>;
  handleChow(game: GameState, player: Player, tileIds?: string[]): void;
  resolvePendingAction(game: GameState, player: Player, pa: PendingAction): Promise<ActionType>;
  countExposedTilesExcludingFlowerMelds(player: Player): number;
  persistGame(game: GameState): Promise<void>;
  broadcastGameState(gameId: string): void;
  schedulePendingActionTimeout(gameId: string): void;
  clearCurrentTurnPendingActions(game: GameState, playerId: string): boolean;
  moveToNextPlayer(game: GameState): Promise<void>;
  executeAction(gameId: string, playerId: string, action: ActionType, tileId?: string): Promise<void>;
  getAvailableActions(gameId: string, playerId: string): Promise<ActionType[]>;
  getGame(gameId: string): Promise<GameState | undefined>;
  enableBotMode(gameId: string, playerId: string): void;
  canPlayerDrawOnCurrentTurn(game: GameState, player: Player): boolean;
  isConcealedDiscardState(player: Player): boolean;
  isChowChoiceOnlyActions(actions: ActionType[]): boolean;
  shouldAdvanceTurnAfterPass(game: GameState): boolean;
  timerManager: any;
}

export class BotController {
  private deps: BotControllerDeps;

  constructor(deps: BotControllerDeps) {
    this.deps = deps;
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
  async handleBotPendingActions(gameId: string): Promise<boolean> {
    const { games, isPlayerBotControlled, getCachedWinOptions, handlePass, handlePeng, handleKong, handleHu, handleChow, resolvePendingAction, countExposedTilesExcludingFlowerMelds, persistGame, broadcastGameState, schedulePendingActionTimeout, clearCurrentTurnPendingActions, moveToNextPlayer, timerManager } = this.deps;

    const game = games.get(gameId);
    if (!game) return false;

    try {
      if (game.phase !== GamePhase.PLAYING) return false;
      if (game.pendingActions.length === 0) return false;

      let hasBotAction = false;
      let claimedHigherPriority = false;

      // 如果人类玩家还有未过期的高优先级 pending（碰/杠/胡），bot 不能抢先处理
      // 吃（CHOW）是低优先级，不影响
      const now = Date.now();
      const humanHasHighPriorityClaim = game.pendingActions.some(pa => {
        const p = game.players.find(pl => pl.id === pa.playerId);
        if (!p || isPlayerBotControlled(p)) return false;
        if (!pa.expiresAt || pa.expiresAt <= now) return false;
        return pa.availableActions.some(a =>
          a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG ||
          a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
        );
      });
      if (humanHasHighPriorityClaim) return false;

      // 保存人类玩家的 pending（bot 的 claim 不应清除人类的犹豫窗口）
      const humanPendingActions = game.pendingActions.filter(pa => {
        const p = game.players.find(pl => pl.id === pa.playerId);
        return p && !isPlayerBotControlled(p);
      });

      // 第一轮：bot 处理碰/杠/胡（高优先级，立即执行）
      for (const pa of [...game.pendingActions]) {
        const player = game.players.find(p => p.id === pa.playerId);
        if (!player || player.status !== PlayerStatus.PLAYING) continue;
        if (!isPlayerBotControlled(player)) continue;

        const higherActions = pa.availableActions.filter(
          a => a === ActionType.PENG || a === ActionType.KONG || a === ActionType.HU
        );
        if (higherActions.length === 0) {
          if (pa.availableActions.includes(ActionType.CHOW)) {
            await this.resolveBotChowNow(game, player, pa);
            hasBotAction = true;
          } else {
            handlePass(game, player);
            hasBotAction = true;
          }
          continue;
        }

        const filteredHigherActions = higherActions.filter((candidate) => {
          if (candidate !== ActionType.HU) return true;
          const winOptions = getCachedWinOptions(game, player, 'discard', {
            isRobbingKong: !!game.pendingKongClaim
          });
          return winOptions.length > 0;
        });
        if (filteredHigherActions.length === 0) {
          if (pa.availableActions.includes(ActionType.CHOW)) {
            await this.resolveBotChowNow(game, player, pa);
            hasBotAction = true;
          } else {
            handlePass(game, player);
            hasBotAction = true;
          }
          continue;
        }

        const action = await shouldClaimPendingAction(player, filteredHigherActions, game);
        console.log(`[BotService] ${player.name} priority action: ${action} (from ${filteredHigherActions})`);

        if (action === ActionType.PENG) {
          const pengExposedCount = countExposedTilesExcludingFlowerMelds(player);
          const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
          if (pengTotalCount - 2 + 3 <= 14) {
            handlePeng(game, player);
            claimedHigherPriority = true;
            hasBotAction = true;
          } else {
            console.warn(`[BotPeng] ${player.name} blocked: would exceed 14 tiles`);
            handlePass(game, player);
          }
        } else if (action === ActionType.KONG) {
          const kongExposedCount = countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 <= 14) {
            handleKong(game, player, pa.tile?.id || '');
            claimedHigherPriority = true;
            hasBotAction = true;
          } else {
            console.warn(`[BotKong] ${player.name} blocked: would exceed 14 tiles`);
            handlePass(game, player);
          }
        } else if (action === ActionType.HU) {
          try {
            await handleHu(game, player);
            claimedHigherPriority = true;
            hasBotAction = true;
          } catch (err: any) {
            console.warn(`[BotHu] ${player.name} skipped invalid hu: ${err?.message || err}`);
            handlePass(game, player);
          }
        }
      }

      // bot 执行高优先级动作后处理
      if (claimedHigherPriority) {
        // 清除 bot 自己的 pending
        const botIds = new Set(game.players.filter(p => isPlayerBotControlled(p)).map(p => p.id));
        game.pendingActions = game.pendingActions.filter(pa => !botIds.has(pa.playerId));
      } else {
        // bot 没有高优先级动作 → 清除 bot 的 pending，保留人类的
        const botIds = new Set(game.players.filter(p => isPlayerBotControlled(p)).map(p => p.id));
        game.pendingActions = game.pendingActions.filter(pa =>
          !botIds.has(pa.playerId) || pa.availableActions.includes(ActionType.CHOW)
        );
        for (const pa of [...game.pendingActions]) {
          const pendingPlayer = game.players.find(p => p.id === pa.playerId);
          if (pendingPlayer && isPlayerBotControlled(pendingPlayer)) {
            const remaining = pa.availableActions.filter(a => a === ActionType.CHOW || a === ActionType.PASS);
            if (remaining.includes(ActionType.CHOW)) {
              pa.availableActions = remaining;
            }
            if (this.deps.isChowChoiceOnlyActions(pa.availableActions)) {
              pa.selectedChowTileIds = pa.tile
                ? selectBotChowTileIds(pendingPlayer, game, pa.tile, pa.chowOptions)
                : undefined;
              const resolved = await resolvePendingAction(game, pendingPlayer, pa);
              if (resolved === ActionType.CHOW) {
                hasBotAction = true;
              }
            }
          }
        }
      }

      await persistGame(game);
      broadcastGameState(gameId);

      // 如果 bot 碰/杠/吃成功，调度 bot 出牌
      if (claimedHigherPriority || hasBotAction) {
        const claimingPlayer = game.players[game.currentPlayerIndex];
        if (claimingPlayer && isPlayerBotControlled(claimingPlayer)) {
          this.scheduleBotDiscard(gameId, claimingPlayer.id);
        }
        schedulePendingActionTimeout(gameId);
      } else if (game.pendingActions.length === 0 && this.deps.shouldAdvanceTurnAfterPass(game)) {
        await moveToNextPlayer(game);
      } else {
        schedulePendingActionTimeout(gameId);
      }
      return hasBotAction;
    } catch (err) {
      console.error('[BotService] Pending action error:', err);
      return false;
    }
  }

  /**
   * Bot自动决策吃牌：选择吃牌组合后resolve，或自动pass
   */
  async resolveBotChowNow(game: GameState, player: Player, pa: PendingAction): Promise<void> {
    const { handlePass, resolvePendingAction } = this.deps;
    if (!pa.tile || !pa.chowOptions || pa.chowOptions.length === 0) {
      handlePass(game, player);
      return;
    }
    pa.selectedChowTileIds = selectBotChowTileIds(player, game, pa.tile, pa.chowOptions);
    if (pa.selectedChowTileIds && pa.selectedChowTileIds.length > 0) {
      await resolvePendingAction(game, player, pa);
      game.pendingActions = game.pendingActions.filter(p => p.playerId !== player.id);
    } else {
      handlePass(game, player);
    }
  }

  /**
   * 调度 bot 玩家延迟出牌
   */
  scheduleBotDiscard(gameId: string, playerId: string): void {
    const { games, timerManager, isPlayerBotControlled, getGame, executeAction, getAvailableActions, clearCurrentTurnPendingActions, schedulePendingActionTimeout, enableBotMode, persistGame, broadcastGameState, canPlayerDrawOnCurrentTurn, isConcealedDiscardState, getGame: getGameFn } = this.deps;

    const existing = timerManager.botTimers.get(gameId);
    if (existing) clearTimeout(existing);

    const timer = timerManager.detachTimer(setTimeout(async () => {
      timerManager.botTimers.delete(gameId);
      try {
        const game = await getGameFn(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) {
          console.log(`[bot-discard] Game not playing, skipping`);
          return;
        }
        const currentP = game.players[game.currentPlayerIndex];
        if (currentP.id !== playerId) {
          if (isPlayerBotControlled(currentP) && !timerManager.botTimers.has(gameId)) {
            console.log(`[bot-discard] Current player changed to bot ${currentP.name}, rescheduling`);
            this.scheduleBotDiscard(gameId, currentP.id);
          }
          return;
        }
        if (game.pendingActions.length > 0) {
          const currentPlayerOwnPending = game.pendingActions.every(pa => pa.playerId === currentP.id);
          if (currentPlayerOwnPending) {
            if (game.drawnThisTurn) {
              clearCurrentTurnPendingActions(game, currentP.id);
              await persistGame(game);
            }
          } else {
            if (!game.drawnThisTurn) {
              game.pendingActions = game.pendingActions.filter(pa => pa.playerId === currentP.id);
              await persistGame(game);
            } else {
              console.log(`[bot-discard] Pending actions still unresolved for ${currentP.name}, delegating to timeout`);
              schedulePendingActionTimeout(gameId);
              return;
            }
          }
        }

        if (!game.drawnThisTurn) {
          console.log(`[bot-discard] ${currentP.name} has not drawn yet, drawing first...`);
          await executeAction(gameId, playerId, ActionType.DRAW, undefined);
        }

        const refreshedGame = await getGameFn(gameId);
        if (!refreshedGame || refreshedGame.phase !== GamePhase.PLAYING) return;
        if (refreshedGame.pendingActions.length > 0) {
          console.log(`[bot-discard] Pending actions reappeared for ${playerId}, delegating to timeout`);
          schedulePendingActionTimeout(gameId);
          return;
        }
        const refreshedPlayer = refreshedGame.players[refreshedGame.currentPlayerIndex];
        if (!refreshedPlayer || refreshedPlayer.id !== playerId) return;
        const availableActions = await getAvailableActions(gameId, playerId);
        if (availableActions.includes(ActionType.HU)) {
          console.log(`[bot-discard] ${refreshedPlayer.name} found self-draw HU before discard`);
          await executeAction(gameId, playerId, ActionType.HU);
          return;
        }
        if (!isConcealedDiscardState(refreshedPlayer)) {
          console.warn(
            `[bot-discard] ${refreshedPlayer.name} is not in discard state: concealed=${refreshedPlayer.hand.concealedTiles.length}, drawn=${refreshedGame.drawnThisTurn}`
          );
          return;
        }

        const tileId = selectDiscardTile(refreshedPlayer, refreshedGame);
        if (tileId) {
          console.log(`[bot-discard] ${refreshedPlayer.name} discarding tile: ${tileId}`);
          await executeAction(gameId, playerId, ActionType.DISCARD, tileId);
        } else {
          console.warn(`[bot-discard] ${refreshedPlayer.name} has no tile to discard! hand: ${refreshedPlayer.hand.concealedTiles.length}`);
        }
      } catch (err) {
        console.error('[bot-discard] Error:', err);
      }
    }, (() => {
      const g = games.get(gameId);
      if (!g) return 500;
      return timerManager.getBotDiscardDelayMs(g);
    })()));

    timerManager.botTimers.set(gameId, timer);
  }

  /**
   * 调度超时自动接管
   */
  scheduleAutoTakeover(gameId: string, playerId: string, expectedIndex: number): void {
    const { timerManager, getGame, isPlayerBotControlled, executeAction, enableBotMode, persistGame, broadcastGameState, canPlayerDrawOnCurrentTurn, isConcealedDiscardState } = this.deps;

    const key = `${gameId}-${playerId}`;
    const existing = timerManager.autoTakeoverTimers.get(key);
    if (existing) clearTimeout(existing);
    const existingWarning = timerManager.autoTakeoverWarnings.get(key);
    if (existingWarning) clearTimeout(existingWarning);

    // 50秒预警
    const warningTimer = timerManager.detachTimer(setTimeout(async () => {
      timerManager.autoTakeoverWarnings.delete(key);
      try {
        const game = await getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (game.currentPlayerIndex !== expectedIndex) return;
        const player = game.players[game.currentPlayerIndex];
        if (!player || player.id !== playerId) return;
        if (isPlayerBotControlled(player)) return;
        broadcastGameState(gameId);
      } catch (_) {}
    }, 50000));
    timerManager.autoTakeoverWarnings.set(key, warningTimer);

    const timer = timerManager.detachTimer(setTimeout(async () => {
      timerManager.autoTakeoverTimers.delete(key);
      try {
        const game = await getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (game.currentPlayerIndex !== expectedIndex) return;
        const player = game.players[game.currentPlayerIndex];
        if (!player || player.id !== playerId) return;
        if (isPlayerBotControlled(player)) return;

        const currentCount = (timerManager.consecutiveTimeouts.get(key) || 0) + 1;
        timerManager.consecutiveTimeouts.set(key, currentCount);

        if (game.pendingActions.length > 0) {
          console.log(`[AutoTakeover] ${player.name} 超时60秒,清除所有pendingActions(${game.pendingActions.length}个)`);
          game.pendingActions = [];
          timerManager.clearPendingActionTimer(gameId);
        }

        if (!game.drawnThisTurn && canPlayerDrawOnCurrentTurn(game, player)) {
          await executeAction(gameId, playerId, ActionType.DRAW, undefined);
        }
        const refreshedGame = await getGame(gameId);
        const refreshedPlayer = refreshedGame?.players?.[refreshedGame.currentPlayerIndex];
        if (
          refreshedGame &&
          refreshedGame.phase === GamePhase.PLAYING &&
          refreshedPlayer &&
          refreshedPlayer.id === playerId &&
          refreshedGame.drawnThisTurn &&
          isConcealedDiscardState(refreshedPlayer)
        ) {
          const forcedTileId =
            (refreshedPlayer as any).lastDrawnTile?.id ||
            refreshedPlayer.hand.concealedTiles[refreshedPlayer.hand.concealedTiles.length - 1]?.id;
          if (forcedTileId) {
            await executeAction(gameId, playerId, ActionType.DISCARD, forcedTileId);
          }
        }
        timerManager.consecutiveTimeouts.set(key, currentCount);

        if (currentCount >= 2) {
          console.log(`[AutoTakeover] ${player.name} 连续${currentCount}回合超时60秒,自动AI接管`);
          timerManager.consecutiveTimeouts.delete(key);
          enableBotMode(gameId, playerId);
          await persistGame(game);
          broadcastGameState(gameId);
        } else {
          console.log(`[AutoTakeover] ${player.name} 第${currentCount}次超时60秒(连续2次才接管)`);
        }
      } catch (err) {
        console.error('[AutoTakeover] Error:', err);
      }
    }, 60000));

    timerManager.autoTakeoverTimers.set(key, timer);
  }

  /**
   * 取消超时自动接管(玩家已操作),重置连续超时计数
   */
  clearAutoTakeover(gameId: string, playerId: string): void {
    this.deps.timerManager.clearAutoTakeover(gameId, playerId);
  }
}
