/**
 * botController.ts — Bot AI 决策与调度（从 gameManager 拆分）
 * 负责：bot pending 动作处理、吃牌决策、出牌调度、超时自动接管
 */
import { GameState, Player, GamePhase, PlayerStatus, ActionType, PendingAction, MeldType, Tile, TileSuit } from '../types/game';
import { shouldClaimPendingAction, selectBotChowTileIds, selectDiscardTile } from '../services/botService';

function isHonorTile(tile: Tile): boolean {
  return tile.suit === TileSuit.WINDS || tile.suit === TileSuit.DRAGONS;
}

/**
 * AI 自杠决策：加杠/暗杠是否值得执行
 * 考虑因素：牌是否有用（对子/顺子）、杠后损失、政策偏好
 */
function evaluateSelfKong(
  player: Player,
  game: GameState,
  availableActions: ActionType[]
): { shouldKong: boolean; type: 'extended' | 'concealed'; reason: string } {
  // 默认政策值（可通过 AI_policies JSON 覆盖）
  const kongChance = 0.7;
  const kakanAggression = 0.3;
  const anKongAggression = 0.3;

  // 检查加杠
  if (availableActions.includes(ActionType.EXTENDED_KONG)) {
    // 找到可加杠的牌
    for (const meld of player.hand.exposedMelds) {
      if (meld.type === MeldType.TRIPLET) {
        const fourth = player.hand.concealedTiles.find(
          t => t.suit === meld.tiles[0].suit && t.value === meld.tiles[0].value
        );
        if (!fourth) continue;

        // ★ K哥铁律(2026-06-05): 做风一色/风碰时严禁杠风箭牌
        // 杠会少一张风箭 + 补的牌不一定是风箭
        if (isHonorTile(fourth) && (game as any).winnersCount === 0) {
          // 检查是否在做风一色/风碰路线（手牌风箭多）
          const honorCount = player.hand.concealedTiles.filter(t => isHonorTile(t)).length +
            (player.hand.exposedMelds?.flatMap(m => m.tiles).filter(t => isHonorTile(t)).length || 0)
          if (honorCount >= 7) {
            return { shouldKong: false, type: 'extended', reason: 'kge_honor_kong_forbidden' };
          }
        }

        // 检查这张牌在手中是否还有用（组成对子或顺子）
        const sameTiles = player.hand.concealedTiles.filter(
          t => t.suit === fourth.suit && t.value === fourth.value
        );
        // 如果手里还有同牌（除了要杠的这张），说明有对子，可能有用
        if (sameTiles.length > 1) {
          return { shouldKong: false, type: 'extended', reason: 'tile-pair-useful' };
        }

        // 检查是否靠近顺子（左右相邻牌）—— 风牌/箭牌不检查（不能组顺子）
        if (!isHonorTile(fourth)) {
          const nearChow = player.hand.concealedTiles.some(t =>
            t.suit === fourth.suit && t.id !== fourth.id && Math.abs(t.value - fourth.value) <= 2
          );
          if (nearChow) {
            return { shouldKong: false, type: 'extended', reason: 'tile-near-chow' };
          }
        }

        // 加杠决策：基于 kongChance + kakanAggression
        const score = kongChance + kakanAggression * 0.5;
        if (Math.random() < score) {
          return { shouldKong: true, type: 'extended', reason: `score=${score.toFixed(2)}` };
        } else {
          return { shouldKong: false, type: 'extended', reason: `score-low=${score.toFixed(2)}` };
        }
      }
    }
  }

  // 检查暗杠
  if (availableActions.includes(ActionType.CONCEALED_KONG)) {
    // 找到可暗杠的4张牌
    const counts = new Map<string, Tile[]>();
    for (const t of player.hand.concealedTiles) {
      const key = `${t.suit}-${t.value}`;
      if (!counts.has(key)) counts.set(key, []);
      counts.get(key)!.push(t);
    }
    for (const [key, tiles] of counts) {
      if (tiles.length === 4) {
        // ★ K哥铁律(2026-06-05): 做风一色/风碰时严禁暗杠风箭牌
        if (isHonorTile(tiles[0]) && (game as any).winnersCount === 0) {
          const honorCount = player.hand.concealedTiles.filter(t => isHonorTile(t)).length +
            (player.hand.exposedMelds?.flatMap(m => m.tiles).filter(t => isHonorTile(t)).length || 0)
          if (honorCount >= 7) {
            return { shouldKong: false, type: 'concealed', reason: 'kge_honor_kong_forbidden' };
          }
        }
        // 检查这4张牌是否都孤立（无相邻牌）
        const suit = tiles[0].suit;
        const value = tiles[0].value;
        const nearTiles = player.hand.concealedTiles.filter(t =>
          t.suit === suit && t.id !== tiles[0].id && t.id !== tiles[1].id && t.id !== tiles[2].id && t.id !== tiles[3].id && Math.abs(t.value - value) <= 2
        );
        if (nearTiles.length > 0) {
          return { shouldKong: false, type: 'concealed', reason: 'tile-near-chow' };
        }

        // 暗杠决策：基于 kongChance + anKongAggression
        const score = kongChance + anKongAggression * 0.5;
        if (Math.random() < score) {
          return { shouldKong: true, type: 'concealed', reason: `score=${score.toFixed(2)}` };
        } else {
          return { shouldKong: false, type: 'concealed', reason: `score-low=${score.toFixed(2)}` };
        }
      }
    }
  }

  return { shouldKong: false, type: 'concealed', reason: 'no-kong-available' };
}

/** BotController 依赖的 GameManager 接口 */
export interface BotControllerDeps {
  games: Map<string, GameState>;
  isPlayerBotControlled(player: Player): boolean;
  getCachedWinOptions(game: GameState, player: Player, context: 'self_draw' | 'discard', flags?: any): any[];
  getCachedWinCheck(game: GameState, player: Player): any;
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
  /** AI 吃碰随机延迟（0.5-2s），仅有人类玩家时生效 */
  private async randomClaimDelay(game: GameState): Promise<void> {
    const hasHuman = game.players.some(p => !this.deps.isPlayerBotControlled(p));
    if (!hasHuman) return;
    const delay = 500 + Math.random() * 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async handleBotPendingActions(gameId: string): Promise<boolean> {
    const { games, isPlayerBotControlled, getCachedWinOptions, handlePass, handlePeng, handleKong, handleHu, handleChow, resolvePendingAction, countExposedTilesExcludingFlowerMelds, persistGame, broadcastGameState, schedulePendingActionTimeout, clearCurrentTurnPendingActions, moveToNextPlayer, timerManager, beginCurrentPlayerTurn } = this.deps;

    const game = games.get(gameId);
    if (!game) return false;

    try {
      if (game.phase !== GamePhase.PLAYING) return false;
      if (game.pendingActions.length === 0) return false;

      let hasBotAction = false;
      let claimedHigherPriority = false;

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
            // ★ 修复：bot 吃牌前检查是否有其他玩家有更高优先级动作（碰/杠/胡）
            const otherPlayersHaveHigherPriority = game.pendingActions.some(otherPa => {
              if (otherPa.playerId === pa.playerId) return false;
              return otherPa.availableActions.some(a =>
                a === ActionType.PENG || a === ActionType.KONG || a === ActionType.HU
              );
            });
            if (otherPlayersHaveHigherPriority) {
              // 有更高优先级玩家，跳过吃牌，等审批流程处理
              continue;
            }
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
            isRobbingKong: !!game.pendingKongClaim,
            extraTile: pa.tile || undefined  // ★ 修复：传入弃牌 tile，否则 canWin 检查的是缺一张的手牌
          });
          // ★ 诊断: HU 被过滤时打印原因
          if (winOptions.length === 0) {
            console.log(`[BotHU-filtered] ${player.name} HU filtered out! concealed=${player.hand.concealedTiles.length} exposed=${player.hand.exposedMelds.length} tile=${pa.tile?.suit}-${pa.tile?.value}`);
          } else {
            // ★ 诊断: HU 通过时打印手牌详情（调试捉冲问题）
            const concealedStr = player.hand.concealedTiles.map(t => `${t.suit}-${t.value}`).join(',');
            const exposedStr = player.hand.exposedMelds.map(m => `[${m.type}:${m.tiles.map(t => `${t.suit}-${t.value}`).join(',')}]`).join(',');
            console.log(`[BotHU-accepted] ${player.name} concealed=[${concealedStr}] exposed=[${exposedStr}] tile=${pa.tile?.suit}-${pa.tile?.value} wildId=${game.customScoringMode}`);
          }
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

        // AI 吃碰胡随机延迟（模拟真人思考）
        if (action !== ActionType.PASS) {
          await this.randomClaimDelay(game);
        }

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
        } else if (action === ActionType.PASS && pa.availableActions.includes(ActionType.CHOW)) {
          // ★ 修复：bot 有 PENG+CHOW 但决定不碰 → 评估 CHOW 而非直接 PASS
          await this.resolveBotChowNow(game, player, pa);
          hasBotAction = true;
        } else if (action === ActionType.KONG) {
          const kongExposedCount = countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 <= 14) {
            await handleKong(game, player, pa.tile?.id || '');
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
    const { handlePass, handleChow, beginCurrentPlayerTurn } = this.deps;
    if (!pa.tile || !pa.chowOptions || pa.chowOptions.length === 0) {
      handlePass(game, player);
      return;
    }
    // AI 吃牌随机延迟
    await this.randomClaimDelay(game);
    pa.selectedChowTileIds = selectBotChowTileIds(player, game, pa.tile, pa.chowOptions);
    if (pa.selectedChowTileIds && pa.selectedChowTileIds.length > 0) {
      // ★ 修复：直接调用 handleChow，不通过 resolvePendingAction（避免 shouldClaimPendingAction 的随机概率推翻已做出的吃牌决策）
      if (player.hand.concealedTiles.length >= 2) {
        try {
          await handleChow(game, player, pa.selectedChowTileIds);
        } catch (e) {
          // ★ 吃牌失败（牌已被抢走/状态不一致），不卡住游戏
          console.warn(`[BotChow] ${player.name} chow failed, fallback to pass:`, (e as Error).message);
          handlePass(game, player);
        }
        game.pendingActions = game.pendingActions.filter(p => p.playerId !== player.id);
      } else {
        handlePass(game, player);
      }
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
        // ★ 修复：跳过已胡牌的玩家，防止对 WON 状态的 bot 调度出牌
        if (currentP.status !== PlayerStatus.PLAYING) {
          console.log(`[bot-discard] ${currentP.name} status=${currentP.status}, skipping`);
          return;
        }
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
        // 摸牌后检查加杠/暗杠（需AI决策，非无条件执行）
        if (availableActions.includes(ActionType.EXTENDED_KONG) || availableActions.includes(ActionType.CONCEALED_KONG)) {
          const kongDecision = evaluateSelfKong(refreshedPlayer, refreshedGame, availableActions);
          if (kongDecision.shouldKong) {
            console.log(`[bot-discard] ${refreshedPlayer.name} executing ${kongDecision.type} (reason: ${kongDecision.reason})`);
            if (kongDecision.type === 'extended') {
              const kongTile = refreshedPlayer.hand.concealedTiles.find(t =>
                refreshedPlayer.hand.exposedMelds.some(m => m.type === 'triplet' && m.tiles[0].suit === t.suit && m.tiles[0].value === t.value)
              );
              if (kongTile) {
                await executeAction(gameId, playerId, ActionType.EXTENDED_KONG, kongTile.id);
                return;
              }
            } else {
              await executeAction(gameId, playerId, ActionType.CONCEALED_KONG);
              return;
            }
          }
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
      } catch (err: any) {
        console.error('[bot-discard] Error:', err);
        // 犹豫期冻结导致摸牌失败 → 等待冻结结束后重试
        if (err?.message?.includes('Draw is locked') || err?.message?.includes('hesitation freeze')) {
          const retryDelay = 800;
          console.log(`[bot-discard] Retrying draw in ${retryDelay}ms after hesitation freeze...`);
          setTimeout(() => this.scheduleBotDiscard(gameId, playerId), retryDelay);
          return;
        }
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
