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
import { createDeck, shuffleTiles, findTileById, removeTile, sortTiles, tilesEqual, groupTiles, isMissingOneSuit, isFlower, isFivePoison } from './tiles';
import { canWin, isTing, detectHandTypes, buildWildTileChecker, HandType } from './handValidator';
import { calculateScore, calculateRoundMultiplier, calculateGameResult, calculateGlobalMultiplier } from './scoring';
import { randomUUID } from 'crypto';
import { saveGameState, loadGameState, loadAllGameStates, deleteGameState } from './gamePersistence';
import { MatchHistoryService } from '../services/matchHistoryService';
import { isBotPlayer, selectDiscardTile, shouldClaimPendingAction } from '../services/botService';

/**
 * In-memory game state manager
 */
class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;
  private isHydrated = false;

  // 互包跟踪: gameId -> Map<playerId, Map<partnerId, count>>
  // 记录每个玩家从另一个玩家吃/碰/杠了多少口
  private mutualBailout: Map<string, Map<string, Map<string, number>>> = new Map();

  // Pending action超时处理（自动推进）
  private pendingActionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Freeze/dealer auto-draw timers（需要在新局开始时清除）
  private freezeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // AI托管模式：玩家ID集合，被标记的玩家由AI自动出牌
  private botModePlayers: Set<string> = new Set();

  /** 获取决策犹豫期（毫秒），默认2000ms */
  private getHesitationWindow(game: GameState): number {
    return game.hesitationWindow ?? 2000;
  }

  setWebSocketManager(manager: any) {
    this.wsManager = manager;
  }

  // ===== AI托管模式控制 =====
  /**
   * 判断玩家是否被AI托管（包括本身是bot玩家，或被手动标记为AI托管）
   */
  private isPlayerBotControlled(player: Player): boolean {
    return isBotPlayer(player) || this.botModePlayers.has(player.id);
  }

  /**
   * 启用AI托管模式
   */
  enableBotMode(gameId: string, playerId: string): void {
    this.botModePlayers.add(playerId);
    // 记录本局被AI接管的玩家（用于结算减半）
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
   * 禁用AI托管模式（玩家回来）
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

  private schedulePendingActionTimeout(gameId: string): void {
    this.clearPendingActionTimer(gameId);

    // 等freeze延迟（1000ms）结束后才开始pending计时
    // 这样human玩家在freeze期间看清UI后，还有完整的1s反应时间
    const timer = setTimeout(async () => {
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (!game.pendingActions.length) return;

        // 自动让所有待响应玩家 PASS，推动流程（包括卡住的bot）
        const pending = [...game.pendingActions];
        for (const pa of pending) {
          const player = game.players.find(p => p.id === pa.playerId);
          if (!player || player.status !== PlayerStatus.PLAYING) continue;
          this.handlePass(game, player);
        }

        // 清除所有 pending（兜底）
        game.pendingActions = [];
        await this.persistGame(game);
        this.broadcastGameState(gameId);
        // 不再调用 moveToNextPlayer — freeze timer 已并行处理下家流转
      } catch (err) {
        console.error('Failed to auto-resolve pending actions:', err);
      } finally {
        this.pendingActionTimers.delete(gameId);
      }
    }, this.games.get(gameId)?.hesitationWindow ?? 2000); // 决策犹豫期（默认2秒）

    this.pendingActionTimers.set(gameId, timer);
  }

  /**
   * 让 bot 处理自己的 pending action（碰/杠/胡/吃/过）
   * 延迟300-600ms模拟"思考时间"，给人类玩家反应窗口
   */


  private countExposedTilesExcludingFlowerMelds(player: Player): number {
    return player.hand.exposedMelds.reduce((sum, m) => {
      if (m.tiles.length === 1 && isFlower(m.tiles[0])) return sum;
      return sum + m.tiles.length;
    }, 0);
  }

  private handleBotPendingActions(gameId: string): void {
    const botThinkMs = 300 + Math.floor(Math.random() * 300); // 300-600ms 思考延迟
    setTimeout(async () => {
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (game.pendingActions.length === 0) return; // 已被人类玩家抢先

        let claimedAction = false;
        let claimedHigherPriority = false; // 碰/杠/胡是否已被执行

        // 保存人类玩家的pending（bot的claim不应清除人类的犹豫窗口）
        const humanPendingActions = game.pendingActions.filter(pa => {
          const p = game.players.find(pl => pl.id === pa.playerId);
          return p && !this.isPlayerBotControlled(p);
        });

        // 第一轮：处理碰/杠/胡（优先级高的先执行）
        for (const pa of [...game.pendingActions]) {
          const player = game.players.find(p => p.id === pa.playerId);
          if (!player || player.status !== PlayerStatus.PLAYING) continue;
          if (!this.isPlayerBotControlled(player)) continue;

          const higherActions = pa.availableActions.filter(
            a => a === ActionType.PENG || a === ActionType.KONG || a === ActionType.HU
          );
          if (higherActions.length === 0) continue;

          const action = shouldClaimPendingAction(player, higherActions, game);
          console.log(`[BotService] ${player.name} priority action: ${action} (from ${higherActions})`);

          if (action === ActionType.PENG) {
            const pengExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
            const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
            if (pengTotalCount - 2 + 3 <= 14) {
              this.handlePeng(game, player);
              claimedAction = true;
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
              claimedAction = true;
              claimedHigherPriority = true;
            } else {
              console.warn(`[BotKong] ${player.name} blocked: would exceed 14 tiles`);
              this.handlePass(game, player);
            }
          } else if (action === ActionType.HU) {
            this.handleHu(game, player);
            claimedAction = true;
            claimedHigherPriority = true;
          }
        }

        // 第二轮：只在没人碰/杠/胡时，处理吃
        if (!claimedHigherPriority) {
          for (const pa of [...game.pendingActions]) {
            const player = game.players.find(p => p.id === pa.playerId);
            if (!player || player.status !== PlayerStatus.PLAYING) continue;
            if (!this.isPlayerBotControlled(player)) continue;

            const chowActions = pa.availableActions.filter(a => a === ActionType.CHOW);
            if (chowActions.length === 0) continue;

            const action = shouldClaimPendingAction(player, chowActions, game);
            console.log(`[BotService] ${player.name} chow action: ${action}`);

            if (action === ActionType.CHOW) {
              const chowExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
              const chowTotalCount = player.hand.concealedTiles.length + chowExposedCount;
              if (chowTotalCount - 2 + 3 <= 14) {
                this.handleChow(game, player);
                // handleChow可能触发审批流（人类有碰/胡），此时chow并未执行
                if (!game.pengChowConflict) {
                  claimedAction = true;
                }
              } else {
                console.warn(`[BotChow] ${player.name} blocked: would exceed 14 tiles`);
                this.handlePass(game, player);
              }
            }
          }
        }

        // 所有 pending 都已处理 → 进入下家（除非有人碰/杠/胡）
        if (!claimedAction) {
          // 没人claim → 恢复人类pending，丢弃bot的
          // 如果审批流已触发（pengChowConflict），保留审批流设置的新pending
          if (game.pengChowConflict) {
            // 审批流已添加新的approval pending，只移除bot的pending
            const botIds = new Set(game.players.filter(p => this.isPlayerBotControlled(p)).map(p => p.id));
            game.pendingActions = game.pendingActions.filter(pa => !botIds.has(pa.playerId));
          } else {
            // 无审批流，直接恢复人类原始pending
            game.pendingActions = humanPendingActions;
          }
        } else {
          // bot成功claim → tile已被吃/碰消耗，恢复已无意义
          // 但需确保人类pending被正确清除（由executeChowDirectly/executePengDirectly处理）
        }
        
        await this.persistGame(game);
        this.broadcastGameState(gameId);

        if (!claimedAction) {
          // 没人碰/杠，进入下家（仅当所有pending都已清除）
          if (game.pendingActions.length === 0) {
            await this.moveToNextPlayer(game);
          }
        } else {
          // 有人碰/杠/吃，其回合已设好 → 调度出牌
          const claimingPlayer = game.players[game.currentPlayerIndex];
          if (claimingPlayer && this.isPlayerBotControlled(claimingPlayer)) {
            this.scheduleBotDiscard(gameId, claimingPlayer.id);
          }
        }
      } catch (err) {
        console.error('[BotService] Pending action error:', err);
      }
    }, 300 + Math.floor(Math.random() * 500)); // bot 响应延迟 0.3~0.8s
  }

  /**
   * 记录吃/碰来源，检测互包关系
   */
  private recordBailoutAction(
    gameId: string, 
    playerId: string, 
    sourcePlayerId: string | undefined,
    meldType: MeldType
  ): void {
    if (!sourcePlayerId) return;
    if (meldType !== MeldType.TRIPLET && meldType !== MeldType.SEQUENCE && meldType !== MeldType.KONG) return;
    
    if (!this.mutualBailout.has(gameId)) {
      this.mutualBailout.set(gameId, new Map());
    }
    const gameBailout = this.mutualBailout.get(gameId)!;
    
    if (!gameBailout.has(playerId)) {
      gameBailout.set(playerId, new Map());
    }
    const playerBailout = gameBailout.get(playerId)!;
    
    const currentCount = playerBailout.get(sourcePlayerId) || 0;
    playerBailout.set(sourcePlayerId, currentCount + 1);
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
        
        // 互包定义：单向三口或四口
        if (countAtoB >= 4 || countBtoA >= 4) {
          relations.push({ player1: playerId, player2: partnerId, type: '四口' });
        } else if (countAtoB >= 3 || countBtoA >= 3) {
          relations.push({ player1: playerId, player2: partnerId, type: '三口' });
        }
      }
    }
    
    return relations;
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
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      if (game.actionHistory[i].type === ActionType.DISCARD) {
        return game.actionHistory[i].playerId;
      }
    }
    return undefined;
  }

  private getPlayerPosition(game: GameState, playerId: string): number {
    return game.players.find(p => p.id === playerId)?.position ?? 0;
  }

  private getLastDiscardPosition(game: GameState): number | undefined {
    const id = this.getLastDiscardPlayerId(game);
    if (!id) return undefined;
    return this.getPlayerPosition(game, id);
  }

  /**
   * 检测杠上开花：自摸且最近的非DRAW动作是杠牌
   * 流程：杠 → 自动补牌(可能补花再DRAW) → 玩家回合胡牌
   */
  private isWinAfterKong(game: GameState, playerId: string): boolean {
    const kongTypes = new Set([
      ActionType.KONG,
      ActionType.CONCEALED_KONG,
      ActionType.EXTENDED_KONG
    ]);

    // 从 actionHistory 末尾向前找，找到该玩家最近的非DRAW动作
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      const action = game.actionHistory[i];
      if (action.playerId !== playerId) continue;
      if (action.type === ActionType.DRAW) continue; // 跳过自动补牌
      // 第一个非DRAW动作
      return kongTypes.has(action.type);
    }
    return false;
  }

  private async hydrateFromDatabase() {
    if (this.isHydrated) return;
    // 不再一次性加载所有游戏，改为按需加载（ensureGameLoaded）
    this.isHydrated = true;
  }

  private async ensureGameLoaded(gameId: string): Promise<GameState | undefined> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }

    try {
      const stored = await loadGameState(gameId);
      if (stored) {
        this.games.set(gameId, stored);
        for (const player of stored.players) {
          this.playerToGame.set(player.id, gameId);
        }
        return stored;
      }
    } catch (err: any) {
      console.warn('⚠️ ensureGameLoaded failed:', err.message);
    }

    return undefined;
  }

  private async persistGame(game: GameState) {
    try {
      await saveGameState(game);
    } catch (error: any) {
      console.warn('⚠️ MongoDB persist failed:', error.message);
    }
  }

  private broadcastGameState(gameId: string) {
    if (!this.wsManager) return;
    const game = this.games.get(gameId);
    if (!game) return;

    this.wsManager.broadcast(gameId, 'gameStateUpdate', {
      gameId,
      phase: game.phase,
      currentPlayerIndex: game.currentPlayerIndex,
      discardPile: game.discardPile,
      wallCount: game.wall.length,
      winnersCount: game.winnersCount,
      _freezeUntil: (game as any)._freezeUntil || 0
    });
  }

  /**
   * Create a new game
   */
  private generateRoomNumber(): string {
    // 生成4位随机房间号，确保不重复（跳过已存在的活跃房间）
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const num = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
      // 检查是否有活跃的游戏用了这个房间号
      let exists = false;
      for (const game of this.games.values()) {
        if (game.roomNumber === num && game.phase !== GamePhase.ENDED) {
          exists = true;
          break;
        }
      }
      if (!exists) return num;
    }
    // Fallback: 使用时间戳最后4位
    return String(Date.now()).slice(-4);
  }

  async createGame(playerName: string, options?: { freezeDurationMs?: number; diceRollCount?: number; firstRoundDouble?: boolean; liangShanThreshold?: number; thinkChances?: number; settlementMultiplier?: number; maxBots?: number; hesitationWindow?: number }): Promise<{ gameId: string; playerId: string }> {
    await this.hydrateFromDatabase();

    const gameId = randomUUID();
    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
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
      roomNumber: this.generateRoomNumber(),
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
      globalMultiplier: undefined,
      inheritedGlobalMultiplier: options?.firstRoundDouble ? 2 : 1,
      rebelEvent: undefined,
      freezeDurationMs: options?.freezeDurationMs ?? 1000,
      diceRollCount: options?.diceRollCount ?? 2,
      liangShanThreshold: options?.liangShanThreshold ?? 1000,
      thinkChances: options?.thinkChances ?? 3,
      settlementMultiplier: options?.settlementMultiplier ?? 10,
      maxBots: options?.maxBots ?? 3,  // 默认允许最多3个AI
      hesitationWindow: options?.hesitationWindow ?? 2000, // 决策犹豫期，默认2秒
      thinkUsage: {}
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    await this.persistGame(game);

    return { gameId, playerId };
  }

  /**
   * Join an existing game
   */
  /**
   * 通过4位房间号查找游戏
   */
  async findGameByRoomNumber(roomNumber: string): Promise<string | null> {
    await this.hydrateFromDatabase();
    for (const [gameId, game] of this.games) {
      if (game.roomNumber === roomNumber && game.phase !== GamePhase.ENDED) {
        return gameId;
      }
    }
    return null;
  }

  async joinGame(gameId: string, playerName: string): Promise<{ playerId: string; position: number }> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.phase !== GamePhase.WAITING) {
      throw new Error('Game already started');
    }

    if (game.players.length >= 4) {
      throw new Error('Game is full');
    }

    // Bot上限检查：建房时的AI玩家上限全程有效
    const isBotJoin = playerName.startsWith('AI-') || playerName.startsWith('电脑');
    if (isBotJoin) {
      const currentBots = game.players.filter(p => p.name.startsWith('AI-') || p.name.startsWith('电脑')).length;
      const maxBots = game.maxBots ?? 3;
      if (currentBots >= maxBots) {
        throw new Error(`AI玩家数量已达上限(${maxBots}个)`);
      }
    }

    const playerId = randomUUID();
    const position = game.players.length;

    const player: Player = {
      id: playerId,
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

    // Auto-start removed. Use manual start.
    // if (game.players.length === 4) {
    //   this.startGame(gameId);
    // }

    // Broadcast update so lobby sees new player
    await this.persistGame(game);
    this.broadcastGameState(gameId);

    return { playerId, position };
  }

  /**
   * Set game to STARTING phase (broadcast to all clients for dice animation)
   * Called when dealer clicks "开始游戏" in waiting room, before actual dealing
   */
  async setStartingPhase(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.WAITING) return;
    if (game.players.length < 2) throw new Error('Need at least 2 players');

    game.phase = GamePhase.STARTING;
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  /**
   * Start the game
   */
  public async startGame(gameId: string, options?: { freezeDurationMs?: number }): Promise<void> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.customScoringMode = null;
    game.freezeDurationMs = options?.freezeDurationMs || 1000; // 默认冻结1秒
    game.thinkUsage = {};  // 每局重置「等我想一想」使用次数
    game.thinkFreezeUntil = undefined;
    game.thinkFreezePlayerId = undefined;
    game.consecutiveDiscards = null;  // 每局重置「谢谢带头大哥」追踪
    game.leadingBrotherEvent = null;  // 每局重置「谢谢带头大哥」事件

    // 清除上一局残留的freeze/dealer auto-draw timer，防止旧timer覆盖新游戏状态
    const oldFreezeTimer = this.freezeTimers.get(gameId);
    if (oldFreezeTimer) {
      clearTimeout(oldFreezeTimer);
      this.freezeTimers.delete(gameId);
      console.log(`[WallDebug] Cleared stale freeze timer for game ${gameId}`);
    }

    // 🔄 换位置请求：每局都可以生效
    this.applySwapRequests(game);

    // 🎲 随机选位置：仅首次开局时随机，后续座位固定（除非换位置）
    const isFirstRound = (game.roundStats || []).length === 0;
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

    // 🎰 选庄家：上局首胡者掷骰（一炮多响则放冲者掷骰）
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
      // 首局或无指定 → 随机
      game.dealerIndex = Math.floor(Math.random() * game.players.length);
    }
    game.players.forEach((p, i) => { p.isDealer = (i === game.dealerIndex); });

    // Create and shuffle deck
    const deck = createDeck();
    console.log(`[WallDebug] createDeck: ${deck.length} tiles`);
    game.wall = shuffleTiles(deck);
    console.log(`[WallDebug] after shuffle: ${game.wall.length} tiles`);

    // 广播 STARTING 阶段（所有客户端显示骰子动画）
    game.phase = GamePhase.STARTING;
    await this.persistGame(game);
    this.broadcastGameState(gameId);

    // 从全部144种牌型中随机选百搭
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
    
    // 花牌百搭: 一组花牌(春夏秋冬或梅兰竹菊)全部为百搭
    if (wildType.suit === TileSuit.FLOWER) {
      if (wildType.value <= 4) {
        // 春夏秋冬组
        game.wildTileGroup = ['1', '2', '3', '4'];
      } else {
        // 梅兰竹菊组
        game.wildTileGroup = ['5', '6', '7', '8'];
      }
    }

    // 发牌（花牌不补花，放到门口等待回合补花）
    for (const player of game.players) {
      player.hand.concealedTiles = [];
      player.hand.exposedMelds = [];
      player.hand.discardedTiles = [];
      for (let i = 0; i < 13; i++) {
        const tile = game.wall.pop()!;
        if (isFlower(tile)) {
          // 花牌放到门口，不补花（等自己回合再补）
          player.hand.exposedMelds.push({
            type: MeldType.TRIPLET,
            tiles: [tile],
            isConcealed: false
          });
        } else {
          player.hand.concealedTiles.push(tile);
        }
      }
      player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
      player.status = PlayerStatus.PLAYING;
      player.score = 0;
    }

    // 庄家摸牌（也处理花牌：放门口不补花）
    {
      const tile = game.wall.pop()!;
      if (isFlower(tile)) {
        game.players[game.dealerIndex].hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [tile],
          isConcealed: false
        });
      } else {
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      }
      game.players[game.dealerIndex].hand.concealedTiles = sortTiles(
        game.players[game.dealerIndex].hand.concealedTiles
      );
    }

    console.log(`[WallDebug] after dealing (13×4+1): wall=${game.wall.length} tiles`);

    for (const player of game.players) {
      player.winOrder = null;
      player.winRound = null;
      player.winTimestamp = null;
      player.wonFan = 0;
      player.score = 0;
    }

    // 掷骰初始化倍数
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    game.dice = [d1, d2];
    game.roundMultiplier = calculateRoundMultiplier(d1, d2);
    // 继承上局全局倍数（或从造反事件继承）
    const prevGlobal = game.inheritedGlobalMultiplier ?? 1;
    if (game.rebelEvent) {
      game.globalMultiplier = calculateGlobalMultiplier(prevGlobal, '造反');
      game.rebelEvent = undefined;
    } else {
      game.globalMultiplier = prevGlobal;
    }
    game.inheritedGlobalMultiplier = undefined;

    // 所有玩家开局自动补花（门口花牌自动替换）
    for (const p of game.players) {
      this.replaceInitialFlowers(game, p);
      // 循环补花直到没有普通花牌或牌墙空
      let flowers = p.hand.exposedMelds.filter(
        m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !this.isWildTile(game, m.tiles[0])
      );
      while (flowers.length > 0 && game.wall.length > 0) {
        this.replaceInitialFlowers(game, p);
        flowers = p.hand.exposedMelds.filter(
          m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !this.isWildTile(game, m.tiles[0])
        );
      }
    }

    game.currentPlayerIndex = game.dealerIndex;
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();

    console.log(`[WallDebug] after flower replacement: wall=${game.wall.length} tiles, PLAYING phase`);
    await this.persistGame(game);
    this.broadcastGameState(gameId);

    // 庄家首轮自动摸牌（模拟 moveToNextPlayer 的 freeze 机制）
    const freezeMs = this.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI
    const dealer = game.players[game.currentPlayerIndex];
    if (dealer) {
      if (this.isPlayerBotControlled(dealer)) {
        // Bot 庄家：freeze 后自动摸+出牌
        const botTimer = setTimeout(async () => {
          try {
            this.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            this.replaceFlowers(freshGame, dealer);
            this.handleDraw(freshGame, dealer);
            this.scheduleBotDiscard(gameId, dealer.id);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error('[start-bot-freeze] Error:', err);
          }
        }, freezeMs);
        this.freezeTimers.set(gameId, botTimer);
      } else {
        // Human 庄家：设置 freeze 让客户端显示冻结进度，到期自动摸
        (game as any)._freezeUntil = Date.now() + freezeMs;
        await this.persistGame(game);
        this.broadcastGameState(gameId);

        const humanTimer = setTimeout(async () => {
          try {
            this.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            if (freshGame.pendingActions.length > 0) return;

            delete (freshGame as any)._freezeUntil;
            const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
              this.replaceFlowers(freshGame, nextPlayer);
              this.handleDraw(freshGame, nextPlayer);
              console.log(`[start-freeze] Auto-draw for dealer ${nextPlayer.name}`);
            }
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error('[start-freeze] Error:', err);
          }
        }, freezeMs);
        this.freezeTimers.set(gameId, humanTimer);
      }
    }
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    // 先检查内存，避免重复MongoDB查询
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

    // 等我想一想冻结：非触发玩家在冻结期间不能操作
    // 返回正常actions，但前端通过 thinkFreezeUntil 判断冻结状态来禁用按钮
    // 不再返回空数组，避免按钮消失
    if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now()) {
      if (game.thinkFreezePlayerId !== playerId) {
        // 冻结期间：返回 pending actions（如果有的话）让前端显示但禁用
        // 不返回 turn actions（摸牌/出牌），因为这些在冻结期间不应该操作
        const pendingAction = game.pendingActions.find(pa => pa.playerId === playerId);
        if (pendingAction) {
          return pendingAction.availableActions; // 前端会因 thinkFreezeActive 禁用这些按钮
        }
        // 没有pending时，返回空（确实没有可操作的）
        return [];
      }
      // 触发者可以继续操作（碰/胡/过等）
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
      // 冷冻期间不响应其他玩家的弃牌（吃/碰/杠/胡），但自摸胡不受影响
      // 自摸胡在玩家自己的回合通过 turn actions 处理
      if (game.freezeRound && game.roundNumber <= game.freezeRound) {
        return [];
      }
      return pendingAction.availableActions;
    }

    // 梁山聚义：前三回合可投票（仅4人全是真人时才开启，只要没投过，且是活跃玩家，且全局倍数未达8倍上限）
    if (game.phase === GamePhase.PLAYING && player.status === PlayerStatus.PLAYING && game.roundNumber <= 3) {
      // 只有4人全是真人玩家时才开启梁山聚义
      const allHuman = game.players.length >= 4 && game.players.every(p => !this.isPlayerBotControlled(p));
      // 全局倍数已达8倍上限时，禁止梁山聚义
      const atMultiplierCap = (game.globalMultiplier ?? 1) >= 8;
      if (allHuman && !atMultiplierCap) {
        const votes = game.liangShanVotes || [];
        if (!votes.includes(playerId)) {
          actions.push(ActionType.LIANG_SHAN);
        }
      }
    }

    // 等我想一想：有胡/碰/杠选项时可用，每局限定次数
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
    // freeze 百搭期间不能出牌/摸牌
    // 其他玩家有 pending claim 时，当前玩家等待（冻结窗口给抢牌机会）
    if (currentPlayer.id === playerId) {
      // 百搭冻结期间：不响应出牌/摸牌
      if (game.freezeRound && game.roundNumber <= game.freezeRound) {
        return [];
      }
      // 有其他玩家在抢牌（pending claim），当前玩家等待决策窗口
      if (game.pendingActions.length > 0) {
        return [];
      }

      // 自动补花：如果门口有未替换的花牌，先补花
      const unreplacedFlowers = player.hand.exposedMelds.filter(
        m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !this.isWildTile(game, m.tiles[0])
      )
      if (unreplacedFlowers.length > 0 && game.wall.length > 0) {
        // 仅在手牌未满14张时允许“摸”(执行 replaceFlowers+handleDraw)
        // 若补花后已到14张，应直接允许出牌，不能继续高亮“摸”
        const exposedTileCount = this.countExposedTilesExcludingFlowerMelds(player);
        const totalTileCount = player.hand.concealedTiles.length + exposedTileCount;
        if (totalTileCount < 14) {
          actions.push(ActionType.DRAW);
          return actions;
        }
      }
      // 检查造反（五毒散）- 仅第一圈有效
      const wildParts = game.customScoringMode?.split('-');
      const wildSuit = wildParts ? wildParts[0] as TileSuit : undefined;
      const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : undefined;
      if (game.roundNumber <= 1 && isFivePoison(player.hand.concealedTiles, wildSuit, wildValue)) {
        actions.push(ActionType.REBEL);
      }

      if (player.hand.concealedTiles.length > 0) {
        actions.push(ActionType.DISCARD);
      }

      // 摸牌：手牌+门口（不含花牌）< 14张时可以摸
      const exposedTileCount = this.countExposedTilesExcludingFlowerMelds(player);
      const totalTileCount = player.hand.concealedTiles.length + exposedTileCount;
      if (totalTileCount < 14 && game.wall.length > 0) {
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
        const winCheck = canWin(player.hand.concealedTiles, player.hand.exposedMelds.length, isWildTile);
        if (winCheck.canWin) {
          const handTypes = detectHandTypes(player.hand.concealedTiles, player.hand.exposedMelds, true, player.hand.flowerTiles.length, null, game.wildTileGroup);
          if (handTypes.length > 0) {
            actions.push(ActionType.HU);
          }
        }
      }
    }

    return actions;
    } catch (err: any) {
      console.warn('⚠️ getAvailableActions failed:', err.message);
      return [];
    }
  }

  /**
   * Execute a game action
   */
  async executeAction(gameId: string, playerId: string, action: ActionType, tileId?: string, tileIds?: string[]): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.PLAYING) {
      throw new Error('Game is not active');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // 玩家已响应，取消当前自动超时推进
    this.clearPendingActionTimer(gameId);
    // 取消超时自动接管（玩家已操作）
    this.clearAutoTakeover(gameId, playerId);

    const gameAction: GameAction = {
      playerId,
      type: action,
      timestamp: Date.now()
    };

    switch (action) {
      case ActionType.DISCARD:
        this.handleDiscard(game, player, tileId!).catch(console.error);
        gameAction.tile = findTileById(player.hand.concealedTiles, tileId!);
        break;

      case ActionType.DRAW:
        // 先处理门口的花牌替换（花牌在门口占坑，需先补到手牌）
        this.replaceInitialFlowers(game, player);
        // 替换后检查手牌+门口是否已满14张
        {
          const exposedCount = player.hand.exposedMelds.reduce((sum, m) => sum + m.tiles.length, 0);
          if (player.hand.concealedTiles.length + exposedCount >= 14) {
            console.warn(`[DRAW] Blocked after flower replace: player ${player.id} has ${player.hand.concealedTiles.length + exposedCount} tiles`);
            break;
          }
        }
        // 正常摸牌（摸到花牌会递归补花）
        this.handleDraw(game, player);
        break;

      case ActionType.PENG:
        // 防止超限：碰牌后手牌不能超过14张
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
        // 防止超限：吃牌后手牌不能超过14张
        {
          const chowExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const chowTotalCount = player.hand.concealedTiles.length + chowExposedCount;
          if (chowTotalCount - 2 + 3 > 14) { // 吃牌从手牌拿2张+弃牌1张组成3张meld
            console.warn(`[CHOW] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handleChow(game, player);
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
        await this.handleHu(game, player);
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

    // Claim 动作（PENG/KONG/HU/CHOW）执行后，claiming player 接管回合
    // Bot需要自动摸牌+出牌；人类手动点击"摸"按钮
    if (action !== ActionType.DISCARD && game.pendingActions.length === 0) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && this.isPlayerBotControlled(currentP) && currentP.status === PlayerStatus.PLAYING) {
        this.replaceFlowers(game, currentP);
        this.handleDraw(game, currentP);
        this.scheduleBotDiscard(gameId, currentP.id);
      }
    }

    // Broadcast game state update
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  private async handleDiscard(game: GameState, player: Player, tileId: string): Promise<void> {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) throw new Error('Tile not found');

    // Remove from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);

    // 谢谢带头大哥：检测连续出同一张牌
    this.checkLeadingBrother(game, tile, player);

    this.updateRoundNumber(game);

    // Check if player is missing one suit after discard
    const missing = isMissingOneSuit(player.hand.concealedTiles);
    if (missing.missing) {
      player.missingSuit = missing.missingSuit;
    }

    // Check for ting status
    const wildForTing = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    player.isTing = isTing(player.hand.concealedTiles, player.hand.exposedMelds.length, wildForTing);

    // 百搭打出 → 触发冷冻（一圈内不能吃/碰/捉冲）
    if (this.isWildTile(game, tile)) {
      game.freezeRound = game.roundNumber;
      game.pendingActions = [];
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);
      await this.moveToNextPlayer(game);
      return;
    }

    // 检查其他玩家是否可以碰/杠/胡/吃
    this.checkPendingActions(game, tile);

    // 无论是否有 pending action，都立即进入下家（并行推进）
    // pending action = 抢牌窗口，freeze timer = 决策窗口，谁先完成谁赢
    await this.persistGame(game);
    this.broadcastGameState(game.gameId);

    if (game.pendingActions.length > 0) {
      this.schedulePendingActionTimeout(game.gameId);
      this.handleBotPendingActions(game.gameId);
    }

    await this.moveToNextPlayer(game);
  }

  /**
   * 谢谢带头大哥：四名玩家连续打出同一张牌（不要求相邻出牌）
   * 第一个打出该牌的玩家，结算时额外赔付其余三家每家10分
   */
  private checkLeadingBrother(game: GameState, tile: Tile, currentPlayer: Player): void {
    const tileKey = `${tile.suit}-${tile.value}`;

    // 初始化或重置追踪（换了一种牌）
    if (!game.consecutiveDiscards || game.consecutiveDiscards.suit !== tile.suit || game.consecutiveDiscards.value !== tile.value) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }

    // 同一牌型继续追加
    const cd = game.consecutiveDiscards;

    // 追加当前玩家（允许同一玩家重复出现，统计4个不同玩家即可）
    cd.playerIds.push(currentPlayer.id);

    // 统计不同玩家数量
    const uniquePlayerIds = new Set(cd.playerIds);

    // 检查是否4个不同玩家都出过同一张牌（不要求连续/相邻）
    // 必须四名玩家都齐全且未胡牌（status === PLAYING）
    const activePlayerIds = new Set(
      game.players.filter(p => p.status === PlayerStatus.PLAYING).map(p => p.id)
    );
    // 只统计仍在游戏中（未胡牌）的玩家
    const activeDiscarders = new Set(cd.playerIds.filter(id => activePlayerIds.has(id)));
    if (activePlayerIds.size >= 4 && activeDiscarders.size >= 4) {
      // 触发！第一个出该牌的玩家是带头大哥
      const firstPlayerId = cd.playerIds.find(id => activePlayerIds.has(id))!;
      game.leadingBrotherEvent = { firstPlayerId, tileKey };

      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      console.log(`[LeadingBrother] ${firstPlayer?.name} 是带头大哥！连续出 ${tileKey}`);

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

  private handleDraw(game: GameState, player: Player): void {
    if (game.wall.length === 0) {
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
      return;
    }

    // 牌数上限检查（不含花牌的门口牌+手牌 < 14 才能摸）
    const nonFlowerExposed = player.hand.exposedMelds.reduce((sum, m) => {
      if (m.tiles.length === 1 && isFlower(m.tiles[0])) return sum;
      return sum + m.tiles.length;
    }, 0);
    if (player.hand.concealedTiles.length + nonFlowerExposed >= 14) {
      console.warn(`[DRAW] Skipped: ${player.name} already has ${player.hand.concealedTiles.length + nonFlowerExposed} tiles (excl flowers)`);
      return;
    }

    let tile = game.wall.pop()!;
    
    // 循环补花：摸到普通花牌就放门口继续摸，直到摸到非花牌
    while (isFlower(tile) && !this.isWildTile(game, tile)) {
      player.hand.exposedMelds.push({
        type: MeldType.TRIPLET,
        tiles: [tile],
        isConcealed: false
      });
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
    player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
  }

  /**
   * 替换门口的初始花牌（发牌时放门口但未补花的）
   */
  private replaceInitialFlowers(game: GameState, player: Player): void {
    const flowerMelds = player.hand.exposedMelds.filter(
      m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !this.isWildTile(game, m.tiles[0])
    );
    if (flowerMelds.length === 0) return;

    console.log(`[WallDebug] replaceInitialFlowers: ${player.name} has ${flowerMelds.length} flowers, wall=${game.wall.length}`);

    // 先从exposedMelds中移除这些花牌
    player.hand.exposedMelds = player.hand.exposedMelds.filter(
      m => !(m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]))
    );

    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      const replacement = game.wall.pop()!;
      console.log(`[WallDebug] flower replace: drew ${replacement.id}, wall now=${game.wall.length}`);
      if (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        // 补到的又是花牌 → 加到门口，递归补
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false
        });
        // 递归
        this.replaceInitialFlowers(game, player);
        return;
      } else if (isFlower(replacement) && this.isWildTile(game, replacement)) {
        // 百搭花牌 → 进手牌
        player.hand.concealedTiles.push(replacement);
        player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
      } else {
        // 普通牌 → 进手牌
        player.hand.concealedTiles.push(replacement);
        player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
      }
    }
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
   * 通用审批流程：检查高优先级玩家
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

      // 检查能否胡（必须有有效牌型）
      const testHand = [...p.hand.concealedTiles, discardedTile];
      const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
      const winCheck = canWin(testHand, p.hand.exposedMelds.length, isWildTile);
      if (winCheck.canWin) {
        const handTypes = detectHandTypes(testHand, p.hand.exposedMelds, false, p.hand.flowerTiles.length, null, game.wildTileGroup);
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
   * 通用审批：给高优先级玩家广播冲突事件并设置pending
   */
  private startApproval(
    game: GameState,
    requesterPlayerId: string,
    requesterAction: 'chow' | 'peng' | 'kong',
    candidates: Array<{ playerId: string; availableActions: string[] }>,
    tile: Tile
  ): void {
    game.pengChowConflict = { requesterId: requesterPlayerId, requesterAction, tile, timestamp: Date.now() };

    const requester = game.players.find(p => p.id === requesterPlayerId);
    if (!requester) return;

    for (const c of candidates) {
      const candPlayer = game.players.find(p => p.id === c.playerId);
      if (!candPlayer || !this.wsManager) continue;

      // 设置pending action（审批窗口，无"过"按钮）
      const existingPending = game.pendingActions.find(pa => pa.playerId === c.playerId);
      if (!existingPending) {
        const label = requesterAction === 'chow' ? '吃' : requesterAction === 'peng' ? '碰' : '杠';
        game.pendingActions.push({
          playerId: c.playerId,
          availableActions: c.availableActions,
          tile,
          expiresAt: Date.now() + 5000
        });
        // 广播
        this.wsManager.broadcast(game.gameId, 'actionApproval', {
          requesterName: requester.name,
          requesterAction: label,
          candidatePlayerId: c.playerId,
          availableActions: c.availableActions,
          tileKey: `${tile.suit}-${tile.value}`
        });
      }
    }

    // 5秒超时 → 允许低优先级动作
    const ts = game.pengChowConflict.timestamp;
    const gid = game.gameId;
    setTimeout(async () => {
      try {
        const fg = await this.getGame(gid);
        if (!fg || !fg.pengChowConflict || fg.pengChowConflict.timestamp !== ts) return;
        fg.pengChowConflict = null;
        for (const c of candidates) fg.pendingActions = fg.pendingActions.filter(pa => pa.playerId !== c.playerId);
        const rp = fg.players.find(p => p.id === requesterPlayerId);
        if (!rp) return;
        if (requesterAction === 'chow') this.executeChowDirectly(fg, rp);
        else if (requesterAction === 'peng') this.executePengDirectly(fg, rp);
        else if (requesterAction === 'kong') this.executeKongDirectly(fg, rp, tile.id);
        await this.persistGame(fg);
        this.broadcastGameState(gid);
      } catch (e) { console.error('[Approval] timeout err:', e); }
    }, 5000);
  }

  private handleChow(game: GameState, player: Player): void {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;

    const discardedTile = pendingAction.tile;

    // 只在决策犹豫期内才需要审批（其他玩家有pending = 还在窗口内）
    const otherPlayersPending = game.pendingActions.filter(pa =>
      pa.playerId !== player.id &&
      pa.availableActions.some(a => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG)
    );

    if (otherPlayersPending.length > 0) {
      // 决策犹豫期内 → 检查高优先级玩家，触发审批
      const { huCandidates, pengCandidates, kongCandidates } = this.checkHighPriorityCandidates(game, player.id, discardedTile);
      if (huCandidates.length > 0 || pengCandidates.length > 0) {
        const candidates: Array<{ playerId: string; availableActions: string[] }> = [];
        for (const pid of huCandidates) candidates.push({ playerId: pid, availableActions: ['hu'] });
        for (const pid of pengCandidates) {
          const existing = candidates.find(c => c.playerId === pid);
          const actions = ['peng'];
          if (kongCandidates.includes(pid)) actions.push('kong');
          if (existing) { existing.availableActions.push(...actions); }
          else { candidates.push({ playerId: pid, availableActions: actions }); }
        }
        this.startApproval(game, player.id, 'chow', candidates, discardedTile);
        return;
      }
    }

    // 决策犹豫期已过 → 碰/杠/胡家已丧失机会，直接吃
    this.executeChowDirectly(game, player);
  }

  /**
   * 直接执行吃牌（不检查碰优先级）
   */
  private executeChowDirectly(game: GameState, player: Player): void {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;

    const discardedTile = pendingAction.tile;
    const prevPlayer = this.getPreviousActivePlayer(game, game.currentPlayerIndex);
    if (!prevPlayer || prevPlayer.id !== player.id) { console.warn('[CHOW] Not previous player'); return; }

    const sequences = this.findChowSequences(player.hand.concealedTiles, discardedTile, game);
    if (sequences.length === 0) { console.warn('[CHOW] No sequence'); return; }

    const sequence = this.selectBestChowSequence(sequences, discardedTile);
    const handTiles = sequence.filter(t => t.id !== discardedTile.id);

    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.SEQUENCE);

    for (const tile of handTiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    const sourcePos = this.getLastDiscardPosition(game);
    const meld: Meld = {
      type: MeldType.SEQUENCE,
      tiles: sequence,
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    };
    player.hand.exposedMelds.push(meld);
    game.discardPile.pop();
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  /**
   * 直接执行碰（不检查胡优先级）
   */
  private executePengDirectly(game: GameState, player: Player): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.TRIPLET);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[0].id);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[1].id);
    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, matchingTiles[0], matchingTiles[1]],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    });
    game.discardPile.pop();
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  /**
   * 直接执行胡（碰吃冲突中，高优先级胡直接执行）
   */
  private async executeWinDirectly(game: GameState, player: Player, winningTile: Tile): Promise<void> {
    // 构造假的pendingAction，让handleHu能获取winningTile
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
   * 直接执行杠（不检查胡优先级）
   */
  private executeKongDirectly(game: GameState, player: Player, tileId: string): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;

    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.QUAD);
    for (const t of matchingTiles) player.hand.concealedTiles = removeTile(player.hand.concealedTiles, t.id);

    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.QUAD,
      tiles: [lastDiscard, ...matchingTiles],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    });

    game.discardPile.pop();
    // 点杠积分：出牌者付2分
    player.windScore += 2;
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
    // 补牌
    this.handleDraw(game, player);
  }

  /**
   * 处理审批回应（碰吃冲突、碰胡冲突等）
   */
  async handleApprovalChoice(gameId: string, playerId: string, choice: 'confirm' | 'pass'): Promise<void> {
    const game = this.games.get(gameId);
    if (!game || !game.pengChowConflict) return;

    const conflict = game.pengChowConflict;
    const requesterId = conflict.requesterId;
    const requesterAction = conflict.requesterAction;
    const tile = conflict.tile;

    // 清除冲突状态和该玩家的pending（保留winner's pending供executeWinDirectly使用）
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
        if (requesterAction === 'chow') this.executeChowDirectly(game, requester);
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

  private handlePeng(game: GameState, player: Player): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // 碰 → 检查其他玩家是否可以胡（审批流程）
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map(pid => ({ playerId: pid, availableActions: ['hu'] }));
      this.startApproval(game, player.id, 'peng', candidates, lastDiscard);
      return;
    }

    this.executePengDirectly(game, player);
  }

  private handleKong(game: GameState, player: Player, tileId: string): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // 杠 → 检查其他玩家是否可以胡（审批流程）
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map(pid => ({ playerId: pid, availableActions: ['hu'] }));
      this.startApproval(game, player.id, 'kong', candidates, lastDiscard);
      return;
    }

    this.executeKongDirectly(game, player, tileId);
  }

  private handleConcealedKong(game: GameState, player: Player, tileIds: string[]): void {
    if (tileIds.length !== 4) return;

    const tiles = tileIds.map(id => findTileById(player.hand.concealedTiles, id)).filter(t => t) as Tile[];
    if (tiles.length !== 4) return;

    // Remove from hand
    for (const tile of tiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // Create concealed kong (still exposed in Sichuan rules)
    const meld: Meld = {
      type: MeldType.CONCEALED_KONG,
      tiles,
      isConcealed: false
    };
    player.hand.exposedMelds.push(meld);

    // Award concealed kong score - each non-winner pays 2
    const nonWinners = game.players.filter(p => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.rainScore += nonWinners.length * 2;

    // Draw supplement tile
    this.handleDraw(game, player);
  }

  private handleExtendedKong(game: GameState, player: Player, tileId: string): void {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) return;

    // Find matching exposed triplet
    const tripletIndex = player.hand.exposedMelds.findIndex(
      m => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;

    // 抢杠检查：仅补杠可被抢
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const robbers: PendingAction[] = [];

    for (const candidate of game.players) {
      if (candidate.id === player.id) continue;
      if (candidate.status !== PlayerStatus.PLAYING) continue;

      const testHand = [...candidate.hand.concealedTiles, tile];
      const winCheck = canWin(testHand, candidate.hand.exposedMelds.length, isWildTile);
      if (!winCheck.canWin) continue;
      // 牌型校验：必须有有效牌型
      const robHandTypes = detectHandTypes(testHand, candidate.hand.exposedMelds, false, candidate.hand.flowerTiles.length, null, game.wildTileGroup);
      if (robHandTypes.length === 0) continue;

      // 规则：若抢杠牌型为碰碰胡/混一色，门口必须有花牌
      const flowerCount = candidate.hand.exposedMelds
        .flatMap(m => m.tiles)
        .filter(t => isFlower(t)).length;
      const handTypes = detectHandTypes(
        testHand,
        candidate.hand.exposedMelds,
        false,
        flowerCount,
        game.customScoringMode || null,
        game.wildTileGroup
      );

      const hasDaDiao = false; // 大吊已移除独立牌型
      const requiresFlowerGate = (handTypes.includes(HandType.ALL_TRIPLETS) || handTypes.includes(HandType.HALF_FLUSH)) && !hasDaDiao;
      const hasFlowerAtDoor = flowerCount > 0;
      if (requiresFlowerGate && !hasFlowerAtDoor) continue;

      robbers.push({
        playerId: candidate.id,
        availableActions: [ActionType.HU, ActionType.PASS],
        tile,
        expiresAt: Date.now() + this.getHesitationWindow(game) // 决策犹豫期
      });
    }

    if (robbers.length > 0) {
      game.pendingKongClaim = { playerId: player.id, tile };
      game.pendingActions = robbers;
      this.schedulePendingActionTimeout(game.gameId);
      return;
    }

    // 无人抢杠，正常补杠
    this.completeExtendedKong(game, player, tile);
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
    this.handleDraw(game, player);
  }

  private resolveRobKongIfNeeded(game: GameState): boolean {
    const pendingClaim = game.pendingKongClaim;
    if (!pendingClaim) return false;

    // 仍有玩家等待响应，先不继续
    if (game.pendingActions.length > 0) return true;

    const kongPlayer = game.players.find(p => p.id === pendingClaim.playerId);
    if (kongPlayer && kongPlayer.status === PlayerStatus.PLAYING) {
      this.completeExtendedKong(game, kongPlayer, pendingClaim.tile);
    }

    game.pendingKongClaim = undefined;
    return true;
  }

  private async handleHu(game: GameState, player: Player): Promise<void> {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    const winningTile = pendingAction?.tile;

    if (winningTile) {
      player.hand.concealedTiles.push(winningTile);
      player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);

      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (lastDiscard && lastDiscard.id === winningTile.id) {
        game.discardPile.pop();
      } else {
        const discardIndex = game.discardPile.findIndex(t => t.id === winningTile.id);
        if (discardIndex !== -1) {
          game.discardPile.splice(discardIndex, 1);
        }
      }
    }

    // Hu resolves current player's pending reaction.
    // 一炮多响仅保留其他“可胡”响应，吃/碰/杠在有人胡牌后无效。
    game.pendingActions = game.pendingActions.filter(pa =>
      pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );

    player.status = PlayerStatus.WON;
    player.winOrder = game.winnersCount + 1;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    game.winnersCount++;

    // 设置下局庄家
    if (!game.nextDealerId) {
      if (player.winOrder === 1) {
        // 首胡者为庄
        game.nextDealerId = player.id;
        // 一炮多响：如果有人因放冲导致多胡，放冲者为庄
        if (!isSelfDrawn) {
          const discarderId = this.getLastDiscardPlayerId(game);
          if (discarderId) {
            game.nextDealerId = discarderId;
            const discarder = game.players.find(p => p.id === discarderId);
            console.log(`[handleHu] 一炮多响，放冲者 ${discarder?.name} 为下局庄家`);
          }
        } else {
          console.log(`[handleHu] 自摸，${player.name} 为下局庄家`);
        }
      }
    }

    const existingMelds = player.hand.exposedMelds.length;
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const winCheck = canWin(player.hand.concealedTiles, existingMelds, isWildTile);
    if (!winCheck.canWin) {
      throw new Error('Invalid Hu declaration');
    }
    // 牌型校验：必须有有效牌型
    const huHandTypes = detectHandTypes(player.hand.concealedTiles, player.hand.exposedMelds, !pendingAction, player.hand.flowerTiles.length, null, game.wildTileGroup);
    if (huHandTypes.length === 0) {
      throw new Error('No valid hand type for Hu');
    }

    const isSelfDrawn = !pendingAction;
    const isKongFlower = this.isWinAfterKong(game, player.id);
    const isRobbingKong = !!pendingAction?.tile && !!game.pendingKongClaim;

    
    // 收集花牌
    const flowerTiles = player.hand.exposedMelds
      .flatMap(m => m.tiles)
      .filter(t => isFlower(t));
    
    // 检测牌型
    const handTypes = detectHandTypes(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      isSelfDrawn,
      flowerTiles.length,
      game.customScoringMode, // 百搭牌标识
      game.wildTileGroup
    );
    
    // 门清检测
    const isMenQing = player.hand.exposedMelds.every(m => 
      m.type !== MeldType.TRIPLET && m.type !== MeldType.SEQUENCE
    );
    
    // 百搭参数
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts && wildParts[0] ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1], 10) : undefined;

    // 计算番数
    const scoreResult = calculateScore({
      handTiles: player.hand.concealedTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles,
      handTypes,
      isSelfDrawn,
      isKongFlower,
      isRobbingKong,
      isMenQing,
      wildTileSuit: wildSuit,
      wildTileValue: wildValue,
      wildTileGroup: game.wildTileGroup,
      roundMultiplier: game.roundMultiplier ?? 1,
      globalMultiplier: game.globalMultiplier ?? 1,
      globalIncludesRound: true
    });

    player.wonFan = scoreResult.baseFan;
    player.winHandType = scoreResult.handTypeName;

    const remainingActive = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    if (remainingActive <= 1) {
      this.endRound(game, GameEndReason.LAST_PLAYER);
      return;
    }

    // 一炮多响 / 抢杠多响：若还有同张牌可胡玩家，等待其继续响应（在清空pending之前检查）
    const hadPendingForMultiHu = !isSelfDrawn && game.pendingActions.some(
      pa => pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );

    // 胡牌后解冻：清除其他家的pending（保留可胡的pending给一炮多响）
    if (!hadPendingForMultiHu) {
      game.pendingActions = [];
      delete (game as any)._freezeUntil;
      this.clearPendingActionTimer(game.gameId);
    } else {
      // 一炮多响：只移除已胡玩家的pending，保留其他人
      game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
    }

    if (hadPendingForMultiHu) {
      return;  // 等待其他可胡玩家响应
    }

    // 抢杠：若有人胡牌则补杠作废；否则恢复补杠
    if (isRobbingKong) {
      game.pendingKongClaim = undefined;
    } else if (this.resolveRobKongIfNeeded(game)) {
      return;
    }

    // Continue playing from next active player
    if (!isSelfDrawn && game.multiHuStarterIndex !== undefined) {
      const starter = game.multiHuStarterIndex;
      game.multiHuStarterIndex = undefined;
      const next = this.getNextActivePlayer(game, starter);
      if (next) {
        game.currentPlayerIndex = game.players.findIndex(p => p.id === next.id);
        this.replaceFlowers(game, next);
        this.handleDraw(game, next);
        return;
      }
    }

    // 从胡牌玩家的下家开始继续
    const winnerIndex = game.players.findIndex(p => p.id === player.id);
    const nextPlayer = this.getNextActivePlayer(game, winnerIndex);
    if (nextPlayer) {
      game.currentPlayerIndex = nextPlayer.position;
      console.log(`[handleHu] ${player.name}胡牌，从${nextPlayer.name}继续牌局`);
    }
    await this.moveToNextPlayer(game);
  }

  /**
   * 造反处理
   * 触发条件: 五毒散（见 isFivePoison）
   * 效果: 本局结束，下局倍数×2，造反者成为庄家
   */
  private handleRebel(game: GameState, player: Player): void {
    // 验证是否满足五毒散
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : undefined;
    
    if (!isFivePoison(player.hand.concealedTiles, wildSuit, wildValue)) {
      throw new Error('Not eligible for rebel (五毒散 condition not met)');
    }

    // 本局直接结束
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.LAST_PLAYER;
    game.endedAt = Date.now();

    // 记录造反事件（下局倍数×2，由 startGame 统一处理）
    game.rebelEvent = {
      playerId: player.id,
      playerName: player.name,
      newDealerIndex: player.position
    };
    // 不在这里翻倍，startGame 会根据 rebelEvent 统一处理
    // inheritedGlobalMultiplier 由上一轮 endRound 的溢出规则计算
    // 本局结束后 startGame 读取 inheritedGlobalMultiplier 再 ×2（rebelEvent）

    // 造反者成为庄家
    game.dealerIndex = player.position;
  }

  /**
   * 梁山聚义：全员投票机制（仅活跃玩家，4人全真人时开启）
   * - 每个活跃玩家可点击一次（之后锁定）
   * - 累积赢分超过被QJ线的玩家：自动视为同意，无否决权
   * - 全部活跃玩家都同意 → 本局结束，下把翻倍
   */
  private handleLiangShan(game: GameState, player: Player): void {
    if (game.phase !== GamePhase.PLAYING) return;
    if (player.status !== PlayerStatus.PLAYING) return;

    // 全局倍数已达8倍上限时，禁止梁山聚义
    if ((game.globalMultiplier ?? 1) >= 8) return;

    // 只有4人全是真人时才允许
    const allHuman = game.players.length >= 4 && game.players.every(p => !this.isPlayerBotControlled(p));
    if (!allHuman) return;

    // 初始化投票列表
    if (!game.liangShanVotes) {
      game.liangShanVotes = [];
    }

    // 已投过票则忽略
    if (game.liangShanVotes.includes(player.id)) return;

    // 记录投票
    game.liangShanVotes.push(player.id);

    // 活跃玩家总数
    const activePlayers = game.players.filter(p => p.status === PlayerStatus.PLAYING);
    
    // 计算有效投票数：手动投票 + 超过被QJ线的玩家自动同意
    // 被QJ线检查：玩家在本房间的累积有效输赢（去掉与AI的战绩）
    const threshold = game.liangShanThreshold ?? 4000;
    let effectiveVoteCount = game.liangShanVotes.length;
    
    for (const ap of activePlayers) {
      // 已经手动投票的跳过
      if (game.liangShanVotes.includes(ap.id)) continue;
      // 检查累积有效输赢是否超过被QJ线（已乘膨胀倍数）
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, ap.id);
      const sm = game.settlementMultiplier ?? 1;
      const effectiveScore = cumulativeScore * sm;
      if (effectiveScore > threshold) {
        // 超过被QJ线 → 自动视为同意，无否决权
        effectiveVoteCount++;
        if (!game.liangShanVotes.includes(ap.id)) {
          game.liangShanVotes.push(ap.id); // 标记为已投票
        }
        console.log(`[LiangShan] ${ap.name} 累积赢分${cumulativeScore}×${sm}=${effectiveScore}超过QJ线${threshold}，自动同意`);
      }
    }

    console.log(`[LiangShan] ${player.name} voted (${effectiveVoteCount}/${activePlayers.length}, threshold: ${threshold})`);

    // 全员投票 → 结束本局，下把翻倍
    if (effectiveVoteCount >= activePlayers.length) {
      console.log(`[LiangShan] All players agreed! Ending round with ×2 multiplier.`);

      // 所有未胡牌玩家标记为输
      for (const p of game.players) {
        if (p.status !== PlayerStatus.WON) {
          p.status = PlayerStatus.LOST;
        }
      }

      // 下局全局倍数 ×2（溢出继承：effective = doubled × roundMultiplier, 超过8倍部分继承）
      const doubled = Math.min((game.globalMultiplier ?? 1) * 2, 8);
      const roundMul = game.roundMultiplier ?? 1;
      const effective = doubled * roundMul;
      // 全局倍数封顶8，溢出部分继承
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : doubled, 8);

      // 结束本局
      game.phase = GamePhase.CHA_JIAO;
      game.endReason = GameEndReason.LAST_PLAYER;
      game.endedAt = Date.now();
      game.lastActionTime = Date.now();

      // 计算最终分数
      const winners = game.players.filter(p => p.status === PlayerStatus.WON);
      const finalScores = calculateGameResult(game.players, winners);
      game.finalScores = finalScores;
      for (const p of game.players) {
        p.score = finalScores[p.id] ?? 0;
      }
    }
    // 未全票 → 游戏正常继续，不结束
  }

  /**
   * 等我想一想：冻结其他玩家8秒，给自己思考时间
   * - 每局限定次数（默认3次）
   * - 只有有胡/碰/杠选项时可用
   * - 冻结期间其他家不能操作
   */
  private handleThink(game: GameState, player: Player): void {
    if (game.phase !== GamePhase.PLAYING) return;

    const maxChances = game.thinkChances ?? 3;
    if (!game.thinkUsage) game.thinkUsage = {};
    const used = game.thinkUsage[player.id] ?? 0;
    if (used >= maxChances) return;

    // 扣减次数
    game.thinkUsage[player.id] = used + 1;
    const remaining = maxChances - used - 1;

    // 冻结8秒
    game.thinkFreezeUntil = Date.now() + 8000;
    game.thinkFreezePlayerId = player.id;

    console.log(`[Think] ${player.name} 使用「等我想一想」，剩余${remaining}次，冻结8秒`);

    // 8秒后自动解冻
    const gameId = game.gameId;
    const expectedPlayerId = player.id;
    setTimeout(async () => {
      try {
        const freshGame = await this.getGame(gameId);
        if (!freshGame) return;
        if (freshGame.thinkFreezePlayerId === expectedPlayerId) {
          freshGame.thinkFreezeUntil = undefined;
          freshGame.thinkFreezePlayerId = undefined;
          await this.persistGame(freshGame);
          this.broadcastGameState(gameId);
          console.log(`[Think] ${player.name} 的思考时间结束`);
        }
      } catch (err) {
        console.error('[Think] Error:', err);
      }
    }, 8000);

    // 广播倒计时
    if (this.wsManager) {
      this.wsManager.broadcast(gameId, 'thinkFreeze', {
        playerName: player.name,
        remaining,
        expiresAt: game.thinkFreezeUntil
      });
    }
  }

  /**
   * 获取玩家在本房间的累积有效输赢（仅计算与真人玩家的对战，去掉AI）
   * 通过 matchHistory 计算
   */
  private getPlayerCumulativeScore(gameId: string, playerId: string): number {
    // 从当前内存中的游戏历史计算
    // 注意：这里简化处理，通过当前游戏的 roundStats 追踪
    // 如果没有 roundStats，返回 0
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
   * 检查各玩家是否突破被聚义QJ线，更新 qjAlerts（每局独立刷新）
   */
  private checkQJThresholdAlerts(game: GameState): void {
    const threshold = game.liangShanThreshold ?? 4000;
    const sm = game.settlementMultiplier ?? 1;
    const alerts: { playerId: string; playerName: string; score: number }[] = [];

    for (const player of game.players) {
      if (this.isPlayerBotControlled(player)) continue; // 跳过AI
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, player.id);
      const effectiveScore = cumulativeScore * sm;
      if (effectiveScore > threshold) {
        alerts.push({ playerId: player.id, playerName: player.name, score: effectiveScore });
      }
    }

    game.qjAlerts = alerts;
    if (alerts.length > 0) {
      console.log(`[QJ Alert] ${alerts.map(a => `${a.playerName}(${a.score})`).join(', ')} 已突破被聚义QJ线${threshold}`);
    }
  }

  /**
   * 计算玩家换位置次数（基于累积输分）
   * 每输一个QJ线距离，获得1次机会
   * 默认QJ线4000：输4000→1次，输8000→2次，输12000→3次
   */
  private computeSwapChances(game: GameState, playerId: string): number {
    const threshold = game.liangShanThreshold ?? 4000;
    const sm = game.settlementMultiplier ?? 1;
    const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, playerId);
    const effectiveScore = cumulativeScore * sm;
    if (effectiveScore >= 0) return 0;
    const absScore = Math.abs(effectiveScore);
    return Math.min(Math.floor(absScore / threshold), 10);
  }

  /**
   * 请求换位置
   */
  public requestSwapPosition(gameId: string, playerId: string, targetId: string): { success: boolean; message: string } {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.ENDED) {
      throw new Error('Can only swap during or after a round');
    }

    // 找到两个玩家
    const player = game.players.find(p => p.id === playerId);
    const target = game.players.find(p => p.id === targetId);
    if (!player || !target) throw new Error('Player not found');

    // 检查是否真人玩家
    if (this.isPlayerBotControlled(player)) throw new Error('AI players cannot swap positions');

    // 计算剩余机会
    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = (game.swapRequests || []).filter(r => r.playerId === playerId).length;
    const remainingChances = totalChances - usedChances;

    if (remainingChances <= 0) {
      throw new Error('没有换位置机会了（积分未达标或已用完）');
    }

    // 检查是否已有待生效的换位请求
    if (!game.swapRequests) game.swapRequests = [];
    const existing = game.swapRequests.find(r => r.playerId === playerId && r.targetId === targetId);
    if (existing) throw new Error('已提交过换位请求，等待生效中');

    // 记录请求
    game.swapRequests.push({
      playerId,
      targetId,
      requestedAt: Date.now()
    });

    console.log(`[Swap] ${player.name} 请求与 ${target.name} 换位置 (剩余${remainingChances - 1}次)`);

    return {
      success: true,
      message: `${player.name} 下一局开始将与 ${target.name} 互换位置`
    };
  }

  /**
   * 应用待生效的换位请求（在startGame中调用）
   */
  private applySwapRequests(game: GameState): void {
    if (!game.swapRequests || game.swapRequests.length === 0) return;

    for (const req of game.swapRequests) {
      const p1Idx = game.players.findIndex(p => p.id === req.playerId);
      const p2Idx = game.players.findIndex(p => p.id === req.targetId);
      if (p1Idx < 0 || p2Idx < 0) continue;

      const p1 = game.players[p1Idx];
      const p2 = game.players[p2Idx];

      // 交换 position
      const tmpPos = p1.position;
      p1.position = p2.position;
      p2.position = tmpPos;

      // 交换在数组中的位置
      game.players[p1Idx] = p2;
      game.players[p2Idx] = p1;

      console.log(`[Swap] ${p1.name} ↔ ${p2.name} 位置已互换`);
    }

    // 清空已生效的请求
    game.swapRequests = [];
  }

  /**
   * 获取玩家剩余换位置次数信息
   */
  public getSwapInfo(gameId: string, playerId: string): { totalChances: number; usedChances: number; remaining: number } {
    const game = this.games.get(gameId);
    if (!game) return { totalChances: 0, usedChances: 0, remaining: 0 };
    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = (game.swapRequests || []).filter(r => r.playerId === playerId).length;
    return { totalChances, usedChances, remaining: totalChances - usedChances };
  }

  private handleCheatHu(game: GameState, player: Player): void {
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
    this.endRound(game, GameEndReason.LAST_PLAYER);
  }

  private handlePass(game: GameState, player: Player): void {
    // Remove player's pending action
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);

    // 抢杠场景：所有候选都过了，补杠继续
    if (game.pendingActions.length === 0 && game.pendingKongClaim) {
      this.resolveRobKongIfNeeded(game);
      return;
    }

    // 一炮多响场景：所有候选响应结束，从首胡玩家右手继续
    if (game.pendingActions.length === 0 && game.multiHuStarterIndex !== undefined) {
      const starter = game.multiHuStarterIndex;
      game.multiHuStarterIndex = undefined;
      const next = this.getNextActivePlayer(game, starter);
      if (next) {
        game.currentPlayerIndex = game.players.findIndex(p => p.id === next.id);
        this.replaceFlowers(game, next);
        this.handleDraw(game, next);
      }
      return;
    }

    // 普通场景 - 不在这里调用 moveToNextPlayer，由调用方统一处理
  }

  private checkPendingActions(game: GameState, discardedTile: Tile): void {
    game.pendingActions = [];

    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);

    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING) continue;
      if (player.id === game.players[game.currentPlayerIndex].id) continue;

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
      const winCheck = canWin(testHand, player.hand.exposedMelds.length, isWildTile);
      if (winCheck.canWin) {
        // 规则：碰碰胡/混一色捉冲需要门口有花；但"大吊"例外，可随时捉冲
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

        const hasDaDiao = false; // 大吊已移除独立牌型
        const requiresFlowerGate = (handTypes.includes(HandType.ALL_TRIPLETS) || handTypes.includes(HandType.HALF_FLUSH)) && !hasDaDiao;
        const hasFlowerAtDoor = flowerCount > 0;

        if (!requiresFlowerGate || hasFlowerAtDoor) {
          actions.push(ActionType.HU);
        }
      }

      if (actions.length > 0) {
        actions.push(ActionType.PASS);
        game.pendingActions.push({
          playerId: player.id,
          availableActions: actions,
          tile: discardedTile,
          expiresAt: Date.now() + this.getHesitationWindow(game) // 决策犹豫期
        });
      }
    }

    // Check for CHOW (吃) - only the next active player (下家) can chow
    // 吃和碰同时进入pending池，碰优先级高于吃
    const chowPlayer = this.getNextActivePlayer(game, game.currentPlayerIndex);
    if (chowPlayer) {
      const sequences = this.findChowSequences(chowPlayer.hand.concealedTiles, discardedTile, game);
      if (sequences.length > 0) {
        // 检查该玩家是否已有碰/杠/胡的pending（如果有，追加吃选项）
        const existing = game.pendingActions.find(pa => pa.playerId === chowPlayer.id);
        if (existing) {
          if (!existing.availableActions.includes(ActionType.CHOW)) {
            existing.availableActions.push(ActionType.CHOW);
          }
        } else {
          game.pendingActions.push({
            playerId: chowPlayer.id,
            availableActions: [ActionType.CHOW, ActionType.PASS],
            tile: discardedTile,
            expiresAt: Date.now() + this.getHesitationWindow(game) // 决策犹豫期
          });
        }
      }
    }

    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
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
  private findChowSequences(hand: Tile[], discardedTile: Tile, game?: GameState): Tile[][] {
    const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    if (!numberSuits.includes(discardedTile.suit)) return [];

    // 如果弃牌本身是百搭，不能被吃
    if (game && this.isWildTile(game, discardedTile)) return [];

    // 过滤掉手牌中的百搭牌（百搭不能参与吃牌）
    const eligibleHand = game 
      ? hand.filter(t => !this.isWildTile(game, t))
      : hand;

    const sequences: Tile[][] = [];
    const v = discardedTile.value;
    const suit = discardedTile.suit;

    // Case 1: discarded tile is the smallest (e.g. 5, need 6+7)
    if (v <= 7) {
      const t2 = eligibleHand.find(t => t.suit === suit && t.value === v + 1);
      const t3 = eligibleHand.find(t => t.suit === suit && t.value === v + 2);
      if (t2 && t3) {
        sequences.push([discardedTile, t2, t3]);
      }
    }

    // Case 2: discarded tile is the middle (e.g. 5, need 4+6)
    if (v >= 2 && v <= 8) {
      const t1 = eligibleHand.find(t => t.suit === suit && t.value === v - 1);
      const t3 = eligibleHand.find(t => t.suit === suit && t.value === v + 1);
      if (t1 && t3) {
        sequences.push([t1, discardedTile, t3]);
      }
    }

    // Case 3: discarded tile is the largest (e.g. 5, need 3+4)
    if (v >= 3) {
      const t1 = eligibleHand.find(t => t.suit === suit && t.value === v - 2);
      const t2 = eligibleHand.find(t => t.suit === suit && t.value === v - 1);
      if (t1 && t2) {
        sequences.push([t1, t2, discardedTile]);
      }
    }

    return sequences;
  }

  /**
   * 对吃牌组合评分，选择最优吃法
   * 评分规则：
   * - 夹张（弃牌在中间）：最高优先，完成搭子
   * - 单边（弃牌在边且手牌是1,2或8,9）：次优先，完成边搭
   * - 两面（弃牌在边且手牌连号）：最低优先，留下灵活搭子
   */
  private scoreChowSequence(sequence: Tile[], discardedTile: Tile): number {
    const sorted = [...sequence].sort((a, b) => a.value - b.value);
    const values = sorted.map(t => t.value);
    const discardIdx = sorted.findIndex(t => t.id === discardedTile.id);

    let score = 0;

    // 夹张：弃牌在中间 [1,2吃3] 不是夹张，[1,3吃2] 是夹张
    if (discardIdx === 1) {
      // 弃牌在中间位置
      const gap = values[2] - values[0];
      if (gap === 2) {
        // 真正的夹张：如 [1,3吃2]，[2,4吃3]
        score += 10;
      }
    }

    // 单边：弃牌在边缘，且剩余牌在边角（1,2 或 8,9）
    if (discardIdx === 0 || discardIdx === 2) {
      const remaining = discardIdx === 0 ? [values[1], values[2]] : [values[0], values[1]];
      if ((remaining[0] === 1 && remaining[1] === 2) || 
          (remaining[0] === 8 && remaining[1] === 9)) {
        // 单边搭子：如 吃3留下1,2 或 吃7留下8,9
        score += 8;
      } else {
        // 两面搭子：如 吃1留下2,3 → 留下灵活搭子，不太想吃
        score += 2;
      }
    }

    // 附加：如果完成的顺子在手牌中形成更大组合（如 1,2,3,4），加分
    const hand = [...sequence].filter(t => t.id !== discardedTile.id);
    if (hand.length === 2 && Math.abs(hand[0].value - hand[1].value) === 1) {
      score += 1; // 手牌本身是连号，吃完后更完整
    }

    return score;
  }

  /**
   * 从多个吃牌组合中选择最优组合
   */
  private selectBestChowSequence(sequences: Tile[][], discardedTile: Tile): Tile[] {
    if (sequences.length === 1) return sequences[0];

    let best = sequences[0];
    let bestScore = this.scoreChowSequence(sequences[0], discardedTile);

    for (let i = 1; i < sequences.length; i++) {
      const score = this.scoreChowSequence(sequences[i], discardedTile);
      if (score > bestScore) {
        bestScore = score;
        best = sequences[i];
      }
    }

    return best;
  }

  private async moveToNextPlayer(game: GameState): Promise<void> {
    if (game.phase !== GamePhase.PLAYING) {
      return;
    }

    // 如果还有 pending actions 未处理，不要推进
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

    const nextPlayer = game.players[game.currentPlayerIndex];
    const freezeMs = this.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI

    console.log(`[moveToNextPlayer] → ${nextPlayer.name} (${this.isPlayerBotControlled(nextPlayer) ? 'BOT' : 'HUMAN'}), freeze: ${freezeMs}ms`);

    this.replaceFlowers(game, nextPlayer);

    if (this.isPlayerBotControlled(nextPlayer)) {
      const freezeBotIndex = game.currentPlayerIndex;
      const botFreezeTimer = setTimeout(async () => {
        try {
          this.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeBotIndex) return; // 已被 claim 接管
          if (freshGame.pendingActions.length > 0) {
            console.log(`[bot-freeze] Pending actions exist, skipping auto-draw for bot ${nextPlayer.name}`);
            return;
          }
          console.log(`[bot-freeze] Freeze expired for ${nextPlayer.name}, drawing...`);
          // 牌墙已空 → 流局
          if (freshGame.wall.length === 0) {
            this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            return;
          }
          this.replaceFlowers(freshGame, nextPlayer);
          this.handleDraw(freshGame, nextPlayer);
          console.log(`[bot-freeze] Draw done, hand: ${nextPlayer.hand.concealedTiles.length} tiles, scheduling discard`);
          this.scheduleBotDiscard(game.gameId, nextPlayer.id);
          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error('[bot-freeze] Error:', err);
        }
      }, freezeMs);
      this.freezeTimers.set(game.gameId, botFreezeTimer);
    } else {
      (game as any)._freezeUntil = Date.now() + freezeMs;
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);

      const freezeCurrentIndex = game.currentPlayerIndex;
      const humanFreezeTimer = setTimeout(async () => {
        try {
          this.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeCurrentIndex) return; // 已被 claim 接管

          delete (freshGame as any)._freezeUntil;

          if (freshGame.pendingActions.length > 0) {
            console.log(`[freeze] Pending actions exist, skipping for ${freshGame.players[freezeCurrentIndex]?.name}`);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            return;
          }

          // 冻结窗口结束 → 人类玩家手动摸牌，AI自动摸牌
          const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
          if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
            // 牌墙已空 → 流局
            if (freshGame.wall.length === 0) {
              this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              return;
            }
            // AI玩家：自动摸牌
            if (this.isPlayerBotControlled(nextPlayer)) {
              this.replaceFlowers(freshGame, nextPlayer);
              this.handleDraw(freshGame, nextPlayer);
              console.log(`[freeze] Auto-draw for bot ${nextPlayer.name}`);
            } else {
              // 人类玩家：不自动摸，清除冻结，广播状态让前端显示"摸"按钮
              console.log(`[freeze] Human ${nextPlayer.name} freeze expired, waiting for manual draw`);
            }

            // 超时自动接管：人类玩家连续2回合未操作 → 自动AI托管
            if (!this.isPlayerBotControlled(nextPlayer)) {
              this.scheduleAutoTakeover(game.gameId, nextPlayer.id, freezeCurrentIndex);
            }
          }

          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error('[freeze] Error clearing freeze:', err);
        }
      }, freezeMs);
      this.freezeTimers.set(game.gameId, humanFreezeTimer);
    }
  }

  /**
   * 超时自动接管：人类玩家连续2回合60秒未操作 → 自动AI托管
   * 仅本局结算减半，玩家回来后下一局恢复正常
   */
  private autoTakeoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // 追踪每个玩家连续超时次数（gameId-playerId → count）
  private consecutiveTimeouts: Map<string, number> = new Map();

  private scheduleAutoTakeover(gameId: string, playerId: string, expectedIndex: number): void {
    const key = `${gameId}-${playerId}`;
    // 清除已有计时器
    const existing = this.autoTakeoverTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.autoTakeoverTimers.delete(key);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        // 检查是否还是该玩家的回合
        if (game.currentPlayerIndex !== expectedIndex) return;
        const player = game.players[game.currentPlayerIndex];
        if (!player || player.id !== playerId) return;
        if (this.isPlayerBotControlled(player)) return; // 已经是AI控制了

        // 累加连续超时次数
        const currentCount = (this.consecutiveTimeouts.get(key) || 0) + 1;
        this.consecutiveTimeouts.set(key, currentCount);

        if (currentCount >= 2) {
          // 连续2回合超时 → 触发AI接管
          console.log(`[AutoTakeover] ${player.name} 连续${currentCount}回合超时60秒，自动AI接管`);
          this.consecutiveTimeouts.delete(key);
          // 启用AI托管模式（会自动加入 botTakeoverPlayers → 本局减半）
          this.enableBotMode(gameId, playerId);
          await this.persistGame(game);
          this.broadcastGameState(gameId);
        } else {
          console.log(`[AutoTakeover] ${player.name} 第${currentCount}次超时60秒（连续2次才接管）`);
        }
      } catch (err) {
        console.error('[AutoTakeover] Error:', err);
      }
    }, 60000); // 60秒超时

    this.autoTakeoverTimers.set(key, timer);
  }

  /**
   * 取消超时自动接管（玩家已操作），重置连续超时计数
   */
  private clearAutoTakeover(gameId: string, playerId: string): void {
    const key = `${gameId}-${playerId}`;
    const timer = this.autoTakeoverTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.autoTakeoverTimers.delete(key);
    }
    // 玩家已操作，重置连续超时计数
    this.consecutiveTimeouts.delete(key);
  }

  /**
   * 调度 bot 玩家延迟出牌
   */
  private botTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private scheduleBotDiscard(gameId: string, playerId: string): void {
    const existing = this.botTimers.get(gameId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.botTimers.delete(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) {
          console.log(`[bot-discard] Game not playing, skipping`);
          return;
        }
        const currentP = game.players[game.currentPlayerIndex];
        if (currentP.id !== playerId) {
          console.log(`[bot-discard] Not ${playerId}'s turn (current: ${currentP.id}), skipping`);
          return;
        }

        const tileId = selectDiscardTile(currentP, game);
        if (tileId) {
          console.log(`[bot-discard] ${currentP.name} discarding tile: ${tileId}`);
          await this.executeAction(gameId, playerId, ActionType.DISCARD, tileId);
        } else {
          console.warn(`[bot-discard] ${currentP.name} has no tile to discard! hand: ${currentP.hand.concealedTiles.length}`);
        }
      } catch (err) {
        console.error('[bot-discard] Error:', err);
      }
    }, this.getHesitationWindow(gameId) + Math.floor(Math.random() * 500));  // 使用配置的犹豫期 + 随机0-500ms

    this.botTimers.set(gameId, timer);
  }

  /**
   * 补花：门口有花牌时，从牌墙补牌到手牌
   */
  private replaceFlowers(game: GameState, player: Player): void {
    // 找到门口的花牌meld（只有1张牌的meld就是花牌）
    const flowerMelds = player.hand.exposedMelds.filter(
      m => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0])
    );

    if (flowerMelds.length === 0) return;

    // 从 exposedMelds 中移除这些花牌 meld
    player.hand.exposedMelds = player.hand.exposedMelds.filter(
      m => !(m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]))
    );

    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;

      let replacement = game.wall.pop()!;

      // 如果补到花牌，花牌留在门口，继续摸（正确麻将规则：花牌不增加总牌数）
      while (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false
        });
        if (game.wall.length === 0) {
          replacement = null as any;
          break;
        }
        replacement = game.wall.pop()!;
      }

      if (replacement) {
        // 补到普通牌，加入手牌（替换原来花牌的位置）
        player.hand.concealedTiles.push(replacement);
      }
    }

    player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);

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

  private endRound(game: GameState, reason: GameEndReason): void {
    this.clearPendingActionTimer(game.gameId);
    game.phase = GamePhase.CHA_JIAO;

    // Calculate final scores
    const winners = game.players.filter(p => p.status === PlayerStatus.WON);
      const winnerIds = new Set(winners.map(w => w.id));
      for (const player of game.players) {
        if (!winnerIds.has(player.id)) {
          player.status = PlayerStatus.LOST;
        }
      }
    let finalScores: Record<string, number>;

    if (game.customScoringMode === 'cheat') {
      finalScores = {};
      for (const player of game.players) {
        const isWinner = winners.some(w => w.id === player.id);
        finalScores[player.id] = isWinner ? 1 : -1;
      }
    } else {
      finalScores = calculateGameResult(game.players, winners);
    }

    game.finalScores = finalScores;
    
    // 谢谢带头大哥：第一个出该牌的玩家赔付其余三家每家10分（在平衡之前）
    if (game.leadingBrotherEvent) {
      const { firstPlayerId } = game.leadingBrotherEvent;
      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      if (firstPlayer) {
        const penalty = 30; // 赔付3家 × 10分
        firstPlayer.score -= penalty;
        finalScores[firstPlayerId] = (finalScores[firstPlayerId] || 0) - penalty;
        for (const p of game.players) {
          if (p.id !== firstPlayerId) {
            p.score += 10;
            finalScores[p.id] = (finalScores[p.id] || 0) + 10;
          }
        }
        game.finalScores = finalScores; // 同步更新
        console.log(`[LeadingBrother] ${firstPlayer.name} 赔付30分（每家10分）`);
      }
      game.leadingBrotherEvent = null;
    }
    
    // AI接管玩家：赢分减半，输分照常
    // 注意：player.score 已包含带头大哥赔付，基于当前值计算
    const botAffected = game.botTakeoverPlayers || [];
    
    for (const player of game.players) {
      if (botAffected.includes(player.id)) {
        if (player.score > 0) {
          const half = Math.floor(player.score / 2);
          console.log(`[BotPenalty] ${player.name}(AI接管) 赢分减半: ${player.score} → ${half}`);
          player.score = half;
        }
        // 输分照常，不减
      }
    }
    
    // 平衡总分：如果AI赢分减半导致总赢≠总输，按比例缩小输家支付
    const totalScore = game.players.reduce((s, p) => s + p.score, 0);
    if (totalScore !== 0) {
      // 有AI赢了且赢分减半 → 总赢 < 总输（totalScore < 0）
      // 需要减少输家的支付来平衡
      const losers = game.players.filter(p => p.score < 0);
      const totalLoss = losers.reduce((s, p) => s + Math.abs(p.score), 0);
      const deficit = Math.abs(totalScore); // 需要减少的总输分
      
      if (totalLoss > 0) {
        for (const loser of losers) {
          const ratio = Math.abs(loser.score) / totalLoss;
          const reduction = Math.floor(deficit * ratio);
          loser.score += reduction; // 少输一点
        }
      }
      
      // 兜底：取整差额加到最大输家
      const finalTotal = game.players.reduce((s, p) => s + p.score, 0);
      if (finalTotal !== 0) {
        const minP = game.players.reduce((a, b) => a.score < b.score ? a : b);
        minP.score -= finalTotal;
      }
    }
    
    // 结算膨胀倍数：所有分数乘以倍数
    const sm = game.settlementMultiplier ?? 1;
    if (sm > 1) {
      for (const p of game.players) {
        p.score = p.score * sm;
      }
      // 重新平衡（乘法不会破坏平衡，但以防万一）
      const smTotal = game.players.reduce((s, p) => s + p.score, 0);
      if (smTotal !== 0) {
        const minP = game.players.reduce((a, b) => a.score < b.score ? a : b);
        minP.score -= smTotal;
      }
      console.log(`[Settlement] 结算膨胀倍数 ×${sm}`);
    }

    // 清除本局AI接管记录
    game.botTakeoverPlayers = [];

    // 记录本局统计
    if (!game.roundStats) game.roundStats = [];
    const roundWinners = game.players.filter(p => p.status === PlayerStatus.WON);
    game.roundStats.push({
      roundNumber: game.roundNumber,
      scores: { ...finalScores },
      winners: roundWinners.map(w => w.id),
      selfDraws: roundWinners
        .filter(w => {
          // 自摸：winTimestamp 附近没有 pendingAction（即自己摸的牌）
          return w.id !== undefined; // 简化标记，详细逻辑可后续完善
        })
        .map(w => w.id)
    });

    // 检查被聚义QJ线（每局刷新）
    this.checkQJThresholdAlerts(game);

    // 倍数继承链：溢出倍数继承（超过8倍封顶的部分传递给下一把）
    // 规则：effective = globalMultiplier × roundMultiplier，封顶8，超出部分 = effective/8 继承给下把
    // 注意：聚义/造反已经自行设置 inheritedGlobalMultiplier，不要覆盖
    if (reason === GameEndReason.WALL_EXHAUSTED) {
      // 流局：先翻倍，再算溢出（但全局倍数封顶8）
      const currentGlobal = game.globalMultiplier ?? 1;
      const roundMul = game.roundMultiplier ?? 1;
      // 先翻倍，封顶8
      const doubled = Math.min(currentGlobal * 2, 8);
      const effective = doubled * roundMul;
      // 全局倍数封顶8，溢出部分继承
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : 1, 8);
    } else if (game.inheritedGlobalMultiplier === undefined) {
      // 正常结算（有人胡了）且没有被聚义/造反提前设置
      const currentGlobal = game.globalMultiplier ?? 1;
      const roundMul = game.roundMultiplier ?? 1;
      const effective = currentGlobal * roundMul;
      // 全局倍数封顶8，溢出部分继承
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : 1, 8);
    }
    // else: inheritedGlobalMultiplier 已被聚义/造反设置，不覆盖

    const endedAt = Date.now();
    game.phase = GamePhase.ENDED;
    game.endReason = reason;
    game.pendingActions = [];
    game.endedAt = endedAt;
    game.lastActionTime = endedAt;
    game.customScoringMode = null;

    MatchHistoryService.recordMatch(game, finalScores, reason).catch((error) => {
      console.error('Failed to persist match history:', error);
    });

    // 处理下局移除/替换请求
    this.applyPendingChanges(game);
  }

  /**
   * 应用出局/替换请求（在每局结束后调用）
   */
  private applyPendingChanges(game: GameState): void {
    // 处理替换请求（优先）
    if (game.pendingReplacements?.length) {
      for (const req of game.pendingReplacements) {
        const aiIdx = game.players.findIndex(p => p.id === req.aiPlayerId);
        if (aiIdx === -1) continue;
        const aiName = game.players[aiIdx].name;
        // 替换 AI 玩家：保留位置，改名+改ID
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

      // 人数不足 → 回到等待状态（麻将需要4人满桌）
      if (game.players.length < 4) {
        game.phase = GamePhase.WAITING;
        // 重置回合相关状态，准备新玩家加入
        game.currentPlayerIndex = 0;
        game.dealerIndex = 0;
        game.pendingActions = [];
        game.actionHistory = [];
        game.discardPile = [];
        game.winnersCount = 0;
        game.roundNumber = 1;
        // 清除所有玩家的游戏中状态，恢复为等待
        for (const p of game.players) {
          p.status = PlayerStatus.WAITING;
          p.hand = { concealedTiles: [], exposedMelds: [], discardedTiles: [] };
          p.isTing = false;
          p.missingSuit = null;
          p.windScore = 0;
          p.rainScore = 0;
          p.wonFan = 0;
          p.winOrder = null;
          p.winRound = null;
          p.winTimestamp = null;
          p.score = 0;
        }
        console.log(`[ApplyChanges] 玩家不足4人(${game.players.length})，回到等待状态`);
      }
    }
  }

  async endGameForEmptyRoom(gameId: string, reason: GameEndReason = GameEndReason.EMPTY_ROOM): Promise<void> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;

    if (game.phase === GamePhase.ENDED) {
      game.endReason = reason;
      await this.persistGame(game);
      return;
    }

    for (const player of game.players) {
      if (player.status !== PlayerStatus.WON) {
        player.status = PlayerStatus.LOST;
      }
      player.isTing = false;
    }

    game.pendingActions = [];
    this.endRound(game, reason);

    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  /**
   * List all active games
   */
  async listGames(): Promise<GameState[]> {
    await this.hydrateFromDatabase();
    return Array.from(this.games.values());
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
