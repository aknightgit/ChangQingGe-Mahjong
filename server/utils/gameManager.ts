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
import { canWin, isTing, detectHandTypes, buildWildTileChecker, HandType, checkChowPongExclusion, updateChowPongExclusion } from './handValidator';
import { calculateScore, calculateRoundMultiplier, calculateGameResult, calculateGlobalMultiplier, calculateSettlementBreakdownByRules, generateWinOptions, type WinOption } from './scoring';
import { randomUUID } from 'crypto';
import { saveGameState, loadGameState, loadAllGameStates, loadActiveGameStates, deleteGameState } from './gamePersistence';
import { MatchHistoryService } from '../services/matchHistoryService';
import { TrainingRecordService } from '../services/trainingRecordService';
import { isBotPlayer, selectBotChowTileIds, selectDiscardTile, shouldClaimPendingAction } from '../services/botService';
import { formatBeijingTime } from './beijingTime';
import { isConcealedDiscardState, tileLabel } from './gameHelpers';
import { RoomGameBridge } from '../services/roomGameBridge';
import { GameStore } from '../services/gameStore';


/**
 * In-memory game state manager
 */
class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;
  private isHydrated = false;

  // ---- Public accessors for RoomGameBridge ----
  /** @internal */
  getActiveGames(): Map<string, GameState> { return this.games; }
  /** @internal */
  getWsManager(): any { return this.wsManager; }


  get actionEngine(): any {
    if (!this._actionEngine) {
      this._actionEngine = new (require('../services/actionEngine').ActionEngine)(this);
    }
    return this._actionEngine;
  }
  private _actionEngine: any = null;

  private store: GameStore;

  constructor() {
    this.store = new GameStore();
    this.store._inject(this);
  }

  getStore(): GameStore { return this.store; }

  // 互包跟踪: gameId -> Map<playerId, Map<partnerId, count>>
  // 记录每个玩家从另一个玩家吃/碰/杠了多少口
  private tileLabel = tileLabel;

  private broadcastQuickMessage(
    gameId: string,
    text: string,
    type: 'info' | 'special' | 'warning' = 'info',
    actionKind?: string
  ): void {
    if (!this.wsManager) return;
    this.wsManager.broadcast(gameId, 'broadcastMessage', {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      actionKind,
      type,
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }

  private broadcastFlowerReplacement(game: GameState, player: Player): void {
    if (!this.wsManager) {
      console.log(`[broadcast] SKIP flowerReplace for ${player.name}: wsManager not set`);
      return;
    }
    console.log(`[broadcast] flowerReplace: ${player.name} 补花`);
    this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: `🌸 ${player.name}补花`,
      actionKind: 'flowerReplace',
      type: 'special',
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }

  private broadcastKongSupplement(game: GameState, player: Player, kind: 'ming' | 'an' | 'jia'): void {
    if (!this.wsManager) return;
    const label = kind === 'an' ? '暗杠' : kind === 'jia' ? '补杠' : '明杠';
    this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: `🀄 ${player.name}${label}后补牌`,
      actionKind: 'kongSupplement',
      type: 'info',
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }

  private broadcastRoomJoin(game: GameState, player: Player): void {
    RoomGameBridge.broadcastRoomJoin(
      (gid, evt, data) => this.wsManager?.broadcast(gid, evt, data),
      game,
      player
    );
  }

  private isTrainingFastMode(game: GameState): boolean {
    const fastByEnv = String(process.env.TRAINING_FAST_MODE || '').toLowerCase() === 'true';
    return fastByEnv || !!(game as any).allClaimMode;
  }

  /** 获取决策犹豫期(毫秒):训练模式0~30ms,实战默认5000ms */
  private getHesitationWindow(game: GameState): number {
    const raw = game.hesitationWindow ?? 5000;
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, raw));
    }
    return raw;
  }

  /** 获取犹豫等待毫秒数(用于setTimeout等) */
  private getHesitationWaitMs(gameId: string): number {
    const game = this.games.get(gameId);
    if (!game) return 5000;
    return this.getHesitationWindow(game);
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
        for (const player of stored.players) {
          this.playerToGame.set(player.id, gameId);
        }
        // 🔧 恢复重启后丢失的 pending 超时
        if (stored.pendingActions && stored.pendingActions.length > 0) {
          const now = Date.now();
          const hasUnresolved = stored.pendingActions.some(pa =>
            typeof pa.expiresAt === 'number' && pa.expiresAt > now
          );
          if (hasUnresolved) {
            this.schedulePendingActionTimeout(gameId);
            console.log('[Recovery] Restored pending timeout for game', gameId);
          } else {
            // 所有 pending 已过期，立即触发自动解析
            setImmediate(() => this.schedulePendingActionTimeout(gameId));
            console.log('[Recovery] Scheduled immediate resolution for expired pending actions in game', gameId);
          }
        }
        return stored;
      }
    } catch (err: any) {
      console.warn('⚠️ ensureGameLoaded failed:', err.message);
    }

    return undefined;
  }

  public async persistGame(game: GameState): Promise<void> {
    return this.store.persistGame(game);
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
        const raw = options?.hesitationWindow ?? 5000;
        const fastByEnv = String(process.env.TRAINING_FAST_MODE || '').toLowerCase() === 'true';
        const fastMode = fastByEnv || !!options?.allClaimMode;
        return fastMode ? Math.min(30, Math.max(0, raw)) : raw;
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
    const isFull = game.players.length >= 4;
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

    // Auto-start removed. Use manual start.
    // if (game.players.length === 4) {
    //   this.startGame(gameId);
    // }

    // Broadcast update so lobby sees new player
    await this.persistGame(game);
    if (!isBotJoin) {
      this.broadcastRoomJoin(game, player);
    }
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
    if (game.phase !== GamePhase.WAITING && game.phase !== GamePhase.ENDED && game.phase !== GamePhase.CHA_JIAO && game.phase !== GamePhase.STARTING) return;
    if (game.players.length < 4) throw new Error('Need 4 players to start');

    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.phase = GamePhase.STARTING;
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  /**
   * Start the game
   */
  public async startGame(gameId: string, options?: { hesitationWindow?: number; fixedDice?: [number, number] }): Promise<void> {
    const _startGameTimer = Date.now();
    console.log('[timing-startGame] BEGIN');
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;
    console.log('[timing-startGame] ensureGameLoaded:', Date.now() - _startGameTimer, 'ms');

    if (game.players.length < 4) {
      throw new Error('Need 4 players to start');
    }

    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.customScoringMode = null;
    // 清空上一局残留状态
    game.discardPile = [];
    game.pendingActions = [];
    game.drawnThisTurn = false;
    // 统一使用 hesitationWindow（决策犹豫期），所有冻结/等待时间都基于此参数
    if (typeof options?.hesitationWindow === 'number') {
      const fastMode = this.isTrainingFastMode(game);
      game.hesitationWindow = fastMode
        ? Math.min(30, Math.max(0, options.hesitationWindow))
        : Math.max(1000, options.hesitationWindow);
    }
    game.thinkUsage = {};  // 每局重置「等我想一想」使用次数
    game.thinkFreezeUntil = undefined;
    game.thinkFreezePlayerId = undefined;
    game.spectatorMode = null;
    game.spectatorViews = {};
    game.spectatorApprovalRequests = [];
    game.consecutiveDiscards = null;  // 每局重置「谢谢带头大哥」追踪
    game.leadingBrotherEvent = null;  // 每局重置「谢谢带头大哥」事件
    this.mutualBailout.delete(gameId);
    (game as any).bailoutRelations = [];

    // 清除上一局残留的freeze/dealer auto-draw timer,防止旧timer覆盖新游戏状态
    const oldFreezeTimer = this.freezeTimers.get(gameId);
    if (oldFreezeTimer) {
      clearTimeout(oldFreezeTimer);
      this.freezeTimers.delete(gameId);
      console.log(`[WallDebug] Cleared stale freeze timer for game ${gameId}`);
    }
    // 每局重置百搭冷冻状态
    game.freezePlayerId = null;
    game.freezeComplete = false;
    game.freezeRound = undefined;

    // 🔄 换位置请求:每局都可以生效
    this.applySwapRequests(game);

    // 🔄 观赛者替换AI请求:每局生效
    this.applyBotReplacement(game);
    console.log('[timing-startGame] setup+swap+replace:', Date.now() - _startGameTimer, 'ms');

    // 🎲 随机选位置:仅首次开局时随机,后续座位固定(除非换位置)
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
      // 首局或无指定 → 随机
      game.dealerIndex = Math.floor(Math.random() * game.players.length);
    }
    game.players.forEach((p, i) => { p.isDealer = (i === game.dealerIndex); });

    // Create and shuffle deck
    const deck = createDeck();
    console.log(`[WallDebug] createDeck: ${deck.length} tiles`);
    game.wall = shuffleTiles(deck);
    console.log(`[WallDebug] after shuffle: ${game.wall.length} tiles`);

    // 每局重置吃碰排斥状态
    game.chowPongExclusion = {};

    // 此时 phase 已经是 STARTING(由 setStartingPhase 设定)，不再重复广播
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
      player.winningScoreBreakdown = undefined;
      player.score = 0;
    }

    // 掷骰初始化倍数
    const d1 = Math.min(6, Math.max(1, Math.round(options?.fixedDice?.[0] ?? (Math.floor(Math.random() * 6) + 1))));
    const d2 = Math.min(6, Math.max(1, Math.round(options?.fixedDice?.[1] ?? (Math.floor(Math.random() * 6) + 1))));
    game.dice = [d1, d2];

    // 此时骰子已在客户端掷完，不再重新广播 diceRoll
    game.roundMultiplier = calculateRoundMultiplier(d1, d2);
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
    TrainingRecordService.captureRoundStart(game);

    console.log(`[WallDebug] after dealing: wall=${game.wall.length} tiles, PLAYING phase`);
        console.log('[timing-startGame] before persist:', Date.now() - _startGameTimer, 'ms');
    await this.persistGame(game);
    this.broadcastGameState(gameId);

    // 庄家首轮自动摸牌(模拟 moveToNextPlayer 的 freeze 机制)
    const freezeMs = this.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI
    const dealer = game.players[game.currentPlayerIndex];
    if (dealer) {
      if (this.isPlayerBotControlled(dealer)) {
        // Bot 庄家:freeze 后自动摸+出牌
        const botTimer = this.detachTimer(setTimeout(async () => {
          try {
            this.freezeTimers.delete(gameId);
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
        }, this.getBotDrawFreezeMs(game)));
        this.freezeTimers.set(gameId, botTimer);
      } else {
        // Human 庄家:设置 freeze 让客户端显示冻结进度,到期自动摸
        (game as any)._freezeUntil = Date.now() + freezeMs;
        await this.persistGame(game);
        this.broadcastGameState(gameId);

        const humanTimer = this.detachTimer(setTimeout(async () => {
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
        this.freezeTimers.set(gameId, humanTimer);
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

    // 梁山聚义:前三巡(出牌轮次)可投票,仅4人全真人+没投过+活跃+倍数未达8倍上限
    // 巡数 = 出牌次数(DISCARD action)，三巡以内(=0,1,2)可投
    const discardCount = game.actionHistory.filter(a => a.type === ActionType.DISCARD).length;
    if (game.phase === GamePhase.PLAYING && player.status === PlayerStatus.PLAYING && discardCount < 3) {
      // 只有4人全是真人玩家时才开启梁山聚义
      const allHuman = game.players.length >= 4 && game.players.every(p => !this.isPlayerBotControlled(p));
      // 全局倍数已达8倍上限时,禁止梁山聚义
      const atMultiplierCap = (game.inheritMultiplier ?? 1) >= 8;
      if (allHuman && !atMultiplierCap) {
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
      const isDealer = player.position === game.dealerIndex;
      const isFirstTurn = rebellionTurns === 0;
      const hasEatenBefore = player.hand.exposedMelds.some(m => m.type === MeldType.SEQUENCE);
      if (game.roundNumber <= 1 && isDealer && isFirstTurn && !hasEatenBefore) {
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
      const winCheck = this.getCachedWinCheck(game, player);
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
    return this.getCachedWinOptions(game, player, context, {
      isKongFlower: false,
      isRobbingKong: !!pendingAction?.tile && !!game.pendingKongClaim,
      extraTile: pendingAction?.tile
    });
  }

  async getTingPreviewForPlayer(gameId: string, playerId: string): Promise<{
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

    const preview = this.getCachedTingPreview(game, player);
    if (!preview.isTing && !player.isTing) {
      return { isTing: false, winningTiles: [] };
    }
    return preview;
  }

  /**
   * Execute a game action
   */
  async executeAction(gameId: string, playerId: string, action: ActionType, tileId?: string, tileIds?: string[], winOptionLabel?: string): Promise<void> {
    return this.actionEngine.executeAction(gameId, playerId, action, tileId, tileIds, winOptionLabel);
  }

  async handleApprovalChoice(gameId: string, playerId: string, choice: 'confirm' | 'pass'): Promise<void> {
    return this.actionEngine.handleApprovalChoice(gameId, playerId, choice);
  }

  async handlePengChowChoice(gameId: string, playerId: string, choice: 'confirm' | 'pass', tileIds?: string[]): Promise<void> {
    return this.actionEngine.handlePengChowChoice(gameId, playerId, choice, tileIds);
  }

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
      throw new Error('没有换位置机会了(积分未达标或已用完)');
    }

    // 检查是否已有待生效的换位请求
    if (!game.swapRequests) game.swapRequests = [];
    const existing = game.swapRequests.find(r => r.playerId === playerId && r.targetId === targetId);
    if (existing) throw new Error('已提交过换位请求,等待生效中');

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
   * 应用待生效的换位请求(在startGame中调用)
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
   * 观赛者请求下局替换某个AI
   */
  public requestBotReplacement(gameId: string, spectatorId: string, targetBotId: string, playerName: string, userId?: string): void {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    // 验证观赛者在房间中
    const spectator = game.players.find(p => p.id === spectatorId && p.status === PlayerStatus.SPECTATING);
    if (!spectator) throw new Error('Spectator not found');

    // 验证目标玩家是AI且在房间中
    const bot = game.players.find(p => p.id === targetBotId && (p.name.startsWith('AI-') || p.name.startsWith('电脑')));
    if (!bot) throw new Error('Target bot not found');

    if (!game.botReplacementQueue) game.botReplacementQueue = [];
    // 移除该观赛者之前的替换请求(防止重复)
    game.botReplacementQueue = game.botReplacementQueue.filter(r => r.spectatorId !== spectatorId);
    game.botReplacementQueue.push({
      spectatorId,
      spectatorName: playerName,
      targetBotId,
      userId,
      requestedAt: Date.now()
    });

    console.log(`[BotReplace] ${playerName}(观赛) 请求下局替换 ${bot.name}`);
  }

  /**
   * 应用待生效的替换AI请求(在startGame中调用)
   */
  private applyBotReplacement(game: GameState): void {
    if (!game.botReplacementQueue || game.botReplacementQueue.length === 0) return;

    for (const req of game.botReplacementQueue) {
      const botIdx = game.players.findIndex(p => p.id === req.targetBotId);
      if (botIdx < 0) {
        console.warn(`[BotReplace] 目标AI ${req.targetBotId} 已不在房间,跳过`);
        continue;
      }

      const spectatorIdx = game.players.findIndex(p => p.id === req.spectatorId);
      if (spectatorIdx < 0) {
        console.warn(`[BotReplace] 观赛者 ${req.spectatorId} 已不在房间,跳过`);
        continue;
      }

      const bot = game.players[botIdx];
      const oldSpectator = game.players[spectatorIdx];

      // 生成新playerId替换AI
      const newPlayerId = randomUUID();
      const newPlayer: Player = {
        id: newPlayerId,
        userId: req.userId,
        name: req.spectatorName,
        position: bot.position,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PlayerStatus.WAITING,
        isDealer: false,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0,
      };

      game.players[botIdx] = newPlayer;
      // 移除观赛者记录
      game.players.splice(spectatorIdx, 1);

      // 清理观赛者的 spectatorView
      if (game.spectatorViews) {
        delete game.spectatorViews[req.spectatorId];
      }

      console.log(`[BotReplace] ${oldSpectator.name} → 替换 ${bot.name} 成功, 新玩家ID: ${newPlayerId}`);
    }

    game.botReplacementQueue = [];
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

  private async handlePass(game: GameState, player: Player): Promise<void> {
    // Remove player's pending action
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);

    if (game.pengChowConflict?.currentStagePlayerIds?.includes(player.id)) {
      game.pengChowConflict.currentStagePlayerIds = game.pengChowConflict.currentStagePlayerIds.filter(id => id !== player.id);
      await this.advanceApprovalConflict(game);
      if (game.pengChowConflict) {
        return;
      }
    }

    // 抢杠场景:所有候选都过了,补杠继续
    if (game.pendingActions.length === 0 && game.pendingKongClaim && game.multiHuStarterIndex === undefined) {
      this.resolveRobKongIfNeeded(game);
      return;
    }

    // 一炮多响场景:所有候选响应结束,从首胡玩家右手继续
    if (game.pendingActions.length === 0 && game.multiHuStarterIndex !== undefined) {
      const starter = game.multiHuStarterIndex;
      game.multiHuStarterIndex = undefined;
      if (game.pendingKongClaim?.cancelledByHu) {
        game.pendingKongClaim = undefined;
      }
      const next = this.getNextActivePlayer(game, starter);
      if (next) {
        game.currentPlayerIndex = game.players.findIndex(p => p.id === next.id);
        this.replaceFlowers(game, next);
        this.handleDraw(game, next);
        game.drawnThisTurn = true; // 【状态机修复】标记已摸牌
      }
      return;
    }

    // 普通场景 - 不在这里调用 moveToNextPlayer,由调用方统一处理
  }

  private checkPendingActions(game: GameState, discardedTile: Tile): void {
    game.pendingActions = [];
    delete (game as any).hasTriggeredAction;
    const discarderIndex = game.currentPlayerIndex;

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
      // 传实际 melds 对象（非 length），确保 canWin 正确识别包含门口牌的完整牌型
      const wildTileId = typeof game.customScoringMode === 'string' ? game.customScoringMode : null;
      const winCheck = canWin(testHand, player.hand.exposedMelds, wildTileId || (game.wildTileGroup ?? null));
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
          expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, player, actions)
        });
      }
    }

    // Check for CHOW (吃) - only the next active player (下家) can chow
    // 吃和碰同时进入pending池,碰优先级高于吃
    for (const pending of game.pendingActions) {
      if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
      const targetPlayer = game.players.find(player => player.id === pending.playerId);
      if (!targetPlayer) continue;
      this.invalidateWinEvaluationCache(game.gameId, [targetPlayer.id]);
      this.prewarmWinEvaluation(game, targetPlayer, 'discard', pending.tile);
    }

    const chowPlayer = this.getNextActivePlayer(game, discarderIndex);
    if (chowPlayer) {
      const sequences = this.findChowSequences(chowPlayer.hand.concealedTiles, discardedTile, game);
      if (sequences.length > 0) {
        const chowOptions = this.buildChowOptionIds(sequences, discardedTile);
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
            expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, chowPlayer, [ActionType.CHOW, ActionType.PASS])
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
          game.drawnThisTurn = false;
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

    // 如果弃牌本身是百搭,不能被吃
    if (game && this.isWildTile(game, discardedTile)) return [];

    // 过滤掉手牌中的百搭牌(百搭不能参与吃牌)
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

  private buildChowOptionIds(sequences: Tile[][], discardedTile: Tile): string[][] {
    const seen = new Set<string>();
    const options: string[][] = [];
    for (const sequence of sequences) {
      const ids = sequence
        .filter(tile => tile.id !== discardedTile.id)
        .map(tile => tile.id)
        .sort();
      const key = ids.join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      options.push(ids);
    }
    return options;
  }

  /**
   * 对吃牌组合评分,选择最优吃法
   * 评分规则:
   * - 夹张(弃牌在中间):最高优先,完成搭子
   * - 单边(弃牌在边且手牌是1,2或8,9):次优先,完成边搭
   * - 两面(弃牌在边且手牌连号):最低优先,留下灵活搭子
   */
  private scoreChowSequence(sequence: Tile[], discardedTile: Tile): number {
    const sorted = [...sequence].sort((a, b) => a.value - b.value);
    const values = sorted.map(t => t.value);
    const discardIdx = sorted.findIndex(t => t.id === discardedTile.id);

    let score = 0;

    // 夹张:弃牌在中间 [1,2吃3] 不是夹张,[1,3吃2] 是夹张
    if (discardIdx === 1) {
      // 弃牌在中间位置
      const gap = values[2] - values[0];
      if (gap === 2) {
        // 真正的夹张:如 [1,3吃2],[2,4吃3]
        score += 10;
      }
    }

    // 单边:弃牌在边缘,且剩余牌在边角(1,2 或 8,9)
    if (discardIdx === 0 || discardIdx === 2) {
      const remaining = discardIdx === 0 ? [values[1], values[2]] : [values[0], values[1]];
      if ((remaining[0] === 1 && remaining[1] === 2) ||
          (remaining[0] === 8 && remaining[1] === 9)) {
        // 单边搭子:如 吃3留下1,2 或 吃7留下8,9
        score += 8;
      } else {
        // 两面搭子:如 吃1留下2,3 → 留下灵活搭子,不太想吃
        score += 2;
      }
    }

    // 附加:如果完成的顺子在手牌中形成更大组合(如 1,2,3,4),加分
    const hand = [...sequence].filter(t => t.id !== discardedTile.id);
    if (hand.length === 2 && Math.abs(hand[0].value - hand[1].value) === 1) {
      score += 1; // 手牌本身是连号,吃完后更完整
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

  private selectChowSequence(sequences: Tile[][], discardedTile: Tile, tileIds?: string[]): Tile[] {
    if (tileIds?.length) {
      const requested = [...tileIds].sort().join('|');
      const matched = sequences.find(sequence => {
        const ids = sequence
          .filter(tile => tile.id !== discardedTile.id)
          .map(tile => tile.id)
          .sort()
          .join('|');
        return ids === requested;
      });
      if (!matched) {
        throw new Error('Invalid chow selection');
      }
      return matched;
    }
    return this.selectBestChowSequence(sequences, discardedTile);
  }

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

    const freezeMs = this.getHesitationWindow(game);  // 决策犹豫期同时控制人类和AI

    console.log(`[moveToNextPlayer] → ${nextPlayer.name} (${this.isPlayerBotControlled(nextPlayer) ? 'BOT' : 'HUMAN'}), freeze: ${freezeMs}ms`);

    // 【状态机修复】新回合:重置摸牌状态
    // 每次轮到新玩家时重置drawnThisTurn，让该玩家能正常摸牌。
    // 这修复了"在别人回合中声称PENG/KONG后该玩家无法摸牌"的bug。
    game.drawnThisTurn = false;
    game.huSelectionLocks = undefined;

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
          this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
            id: Date.now(),
            text: `🃏 冷冻解除，现在可以正常吃碰捉冲了！`,
            type: 'info',
            timestamp: Date.now(),
            timeLabel: formatBeijingTime()
          });
        }
      }
    }

    this.replaceFlowers(game, nextPlayer);

    if (this.isPlayerBotControlled(nextPlayer)) {
      const freezeBotIndex = game.currentPlayerIndex;
      const botFreezeTimer = this.detachTimer(setTimeout(async () => {
        try {
          this.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeBotIndex) return; // 已被 claim 接管
          const livePlayer = freshGame.players[freshGame.currentPlayerIndex];
          if (!livePlayer || livePlayer.id !== nextPlayer.id || livePlayer.status !== PlayerStatus.PLAYING) return;
          if (freshGame.pendingActions.length > 0) {
            const botLogMsg = (freshGame as any).hasTriggeredAction
              ? '[bot-freeze] hasTriggeredAction=true, retaining all claims'
              : '[bot-freeze] No action triggered, clearing CD claims (B preserved)';
            console.log(`[bot-freeze] Freeze expired for ${livePlayer.name}, ${botLogMsg}`);
            this.clearExpiredClaimsForDecisionWindow(freshGame);
            if (freshGame.pendingActions.length > 0 && !this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              this.schedulePendingActionTimeout(game.gameId);
              return;
            }
            if (this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
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
      }, this.getBotDrawFreezeMs(game)));
      this.freezeTimers.set(game.gameId, botFreezeTimer);
    } else {
      (game as any)._freezeUntil = Date.now() + freezeMs;
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);

      const freezeCurrentIndex = game.currentPlayerIndex;
      const humanFreezeTimer = this.detachTimer(setTimeout(async () => {
        try {
          this.freezeTimers.delete(game.gameId);
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
      this.freezeTimers.set(game.gameId, humanFreezeTimer);
    }
  }

  /**
   * 超时自动接管:人类玩家连续2回合60秒未操作 → 自动AI托管
   * 仅本局结算减半,玩家回来后下一局恢复正常
   */
  private autoTakeoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // 追踪每个玩家连续超时次数(gameId-playerId → count)
  private consecutiveTimeouts: Map<string, number> = new Map();

  private getAutoTakeoverTimeoutMs(): number {
    return 60000;
  }

  private scheduleAutoTakeover(gameId: string, playerId: string, expectedIndex: number): void {
    const key = `${gameId}-${playerId}`;
    // 清除已有计时器
    const existing = this.autoTakeoverTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = this.detachTimer(setTimeout(async () => {
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

        if (!game.pendingActions.length) {
          if (!game.drawnThisTurn && this.canPlayerDrawOnCurrentTurn(game, player)) {
            await this.executeAction(gameId, playerId, ActionType.DRAW, undefined);
          }
          const refreshedGame = await this.getGame(gameId);
          const refreshedPlayer = refreshedGame?.players?.[refreshedGame.currentPlayerIndex];
          if (
            refreshedGame &&
            refreshedGame.phase === GamePhase.PLAYING &&
            refreshedPlayer &&
            refreshedPlayer.id === playerId &&
            refreshedGame.drawnThisTurn &&
            this.isConcealedDiscardState(refreshedPlayer)
          ) {
            const forcedTileId =
              (refreshedPlayer as any).lastDrawnTile?.id ||
              refreshedPlayer.hand.concealedTiles[refreshedPlayer.hand.concealedTiles.length - 1]?.id;
            if (forcedTileId) {
              await this.executeAction(gameId, playerId, ActionType.DISCARD, forcedTileId);
            }
          }
          this.consecutiveTimeouts.set(key, currentCount);
        }

        if (currentCount >= 2) {
          // 连续2回合超时 → 触发AI接管
          console.log(`[AutoTakeover] ${player.name} 连续${currentCount}回合超时60秒,自动AI接管`);
          this.consecutiveTimeouts.delete(key);
          // 启用AI托管模式(会自动加入 botTakeoverPlayers → 本局减半)
          this.enableBotMode(gameId, playerId);
          await this.persistGame(game);
          this.broadcastGameState(gameId);
        } else {
          console.log(`[AutoTakeover] ${player.name} 第${currentCount}次超时60秒(连续2次才接管)`);
        }
      } catch (err) {
        console.error('[AutoTakeover] Error:', err);
      }
    }, 60000)); // 60秒超时

    this.autoTakeoverTimers.set(key, timer);
  }

  /**
   * 取消超时自动接管(玩家已操作),重置连续超时计数
   */
  private clearAutoTakeover(gameId: string, playerId: string): void {
    const key = `${gameId}-${playerId}`;
    const timer = this.autoTakeoverTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.autoTakeoverTimers.delete(key);
    }
    // 玩家已操作,重置连续超时计数
    this.consecutiveTimeouts.delete(key);
  }

  /**
   * 调度 bot 玩家延迟出牌
   */
  private botTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private scheduleBotDiscard(gameId: string, playerId: string): void {
    const existing = this.botTimers.get(gameId);
    if (existing) clearTimeout(existing);

    const timer = this.detachTimer(setTimeout(async () => {
      this.botTimers.delete(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) {
          console.log(`[bot-discard] Game not playing, skipping`);
          return;
        }
        const currentP = game.players[game.currentPlayerIndex];
        if (currentP.id !== playerId) {
          // 当前玩家已更换——可能是审批流执行后 currentPlayerIndex 已更新为碰牌bot
          // 如果当前玩家是另一个bot且没有出牌定时器在跑，重新调度
          if (this.isPlayerBotControlled(currentP) && !this.botTimers.has(gameId)) {
            console.log(`[bot-discard] Current player changed to bot ${currentP.name}, rescheduling`);
            this.scheduleBotDiscard(gameId, currentP.id);
          }
          return;
        }
        if (game.pendingActions.length > 0) {
          const currentPlayerOwnPending = game.pendingActions.every(pa => pa.playerId === currentP.id);
          if (currentPlayerOwnPending) {
            if (game.drawnThisTurn) {
              this.clearCurrentTurnPendingActions(game, currentP.id);
              await this.persistGame(game);
            }
          } else {
          console.log(`[bot-discard] Pending actions still unresolved for ${currentP.name}, delegating to timeout`);
          this.schedulePendingActionTimeout(gameId);
          return;
          }
        }

        // 【Bug修复】机器人托管后，若未摸牌则先摸牌再出牌
        if (!game.drawnThisTurn) {
          console.log(`[bot-discard] ${currentP.name} has not drawn yet, drawing first...`);
          await this.executeAction(gameId, playerId, ActionType.DRAW, undefined);
        }

        const refreshedGame = await this.getGame(gameId);
        if (!refreshedGame || refreshedGame.phase !== GamePhase.PLAYING) return;
        if (refreshedGame.pendingActions.length > 0) {
          console.log(`[bot-discard] Pending actions reappeared for ${playerId}, delegating to timeout`);
          this.schedulePendingActionTimeout(gameId);
          return;
        }
        const refreshedPlayer = refreshedGame.players[refreshedGame.currentPlayerIndex];
        if (!refreshedPlayer || refreshedPlayer.id !== playerId) return;
        const availableActions = await this.getAvailableActions(gameId, playerId);
        if (availableActions.includes(ActionType.HU)) {
          console.log(`[bot-discard] ${refreshedPlayer.name} found self-draw HU before discard`);
          await this.executeAction(gameId, playerId, ActionType.HU);
          return;
        }
        if (!this.isConcealedDiscardState(refreshedPlayer)) {
          console.warn(
            `[bot-discard] ${refreshedPlayer.name} is not in discard state: concealed=${refreshedPlayer.hand.concealedTiles.length}, drawn=${refreshedGame.drawnThisTurn}`
          );
          return;
        }

        const tileId = selectDiscardTile(refreshedPlayer, refreshedGame);
        if (tileId) {
          console.log(`[bot-discard] ${refreshedPlayer.name} discarding tile: ${tileId}`);
          await this.executeAction(gameId, playerId, ActionType.DISCARD, tileId);
        } else {
          console.warn(`[bot-discard] ${refreshedPlayer.name} has no tile to discard! hand: ${refreshedPlayer.hand.concealedTiles.length}`);
        }
      } catch (err) {
        console.error('[bot-discard] Error:', err);
      }
    }, (() => {
      const g = this.games.get(gameId);
      if (!g) return 500;
      return this.getBotDiscardDelayMs(g);
    })()));  // 训练模式极速响应,实战保留随机人性化延迟

    this.botTimers.set(gameId, timer);
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
        this.broadcastFlowerReplacement(game, player);
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
        this.broadcastFlowerReplacement(game, player);
      }
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

  public endRound(game: GameState, reason: GameEndReason): void {
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

      const mutualBailoutRelations = this.getMutualBailoutRelations(game.gameId);
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

        for (const [idx, delta] of breakdown.deltas) {
          const pid = game.players[idx].id;
          finalScores[pid] = (finalScores[pid] ?? 0) + delta;
        }
      }
    }

    game.finalScores = finalScores;
    for (const player of game.players) {
      player.score = finalScores[player.id] ?? 0;
    }

    // 谢谢带头大哥:第一个出该牌的玩家赔付其余三家每家10分(在平衡之前)
    if (game.leadingBrotherEvent) {
      const { firstPlayerId } = game.leadingBrotherEvent;
      const firstPlayer = game.players.find(p => p.id === firstPlayerId);
      if (firstPlayer) {
        const penalty = 30; // 赔付3家 × 10分
        firstPlayer.score -= penalty;
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
            p.score += 10;
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
        game.finalScores = finalScores; // 同步更新
        console.log(`[LeadingBrother] ${firstPlayer.name} 赔付30分(每家10分)`);
      }
      game.leadingBrotherEvent = null;
    }

    // AI接管玩家:赢分减半,输分照常
    // 注意:player.score 已包含带头大哥赔付,基于当前值计算
    const botAffected = game.botTakeoverPlayers || [];

    for (const player of game.players) {
      if (botAffected.includes(player.id)) {
        if (player.score > 0) {
          const half = Math.floor(player.score / 2);
          console.log(`[BotPenalty] ${player.name}(AI接管) 赢分减半: ${player.score} → ${half}`);
          player.score = half;
        }
        // 输分照常,不减
      }
    }

    // 平衡总分:如果AI赢分减半导致总赢≠总输,按比例缩小输家支付
    const totalScore = game.players.reduce((s, p) => s + p.score, 0);
    if (totalScore !== 0) {
      // 有AI赢了且赢分减半 → 总赢 < 总输(totalScore < 0)
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

      // 兜底:取整差额加到最大输家
      const finalTotal = game.players.reduce((s, p) => s + p.score, 0);
      if (finalTotal !== 0) {
        const minP = game.players.reduce((a, b) => a.score < b.score ? a : b);
        minP.score -= finalTotal;
      }
    }

    for (const player of game.players) {
      finalScores[player.id] = player.score;
    }
    game.finalScores = finalScores;

    // 清除本局AI接管记录
    game.botTakeoverPlayers = [];

    // 记录本局统计
    if (!game.roundStats) game.roundStats = [];
    const roundWinners = game.players.filter(p => p.status === PlayerStatus.WON);

    // 检查被聚义QJ线(每局刷新)
    this.checkQJThresholdAlerts(game);

    const finalReason = (reason === GameEndReason.WALL_EXHAUSTED && roundWinners.length > 0)
      ? GameEndReason.LAST_PLAYER
      : reason;

    // 倍数继承链:溢出倍数继承(超过8倍封顶的部分传递给下一把)
    // 规则:effective = inheritMultiplier × roundMultiplier,封顶8,超出部分 = effective/8 继承给下把
    // 注意:聚义/造反已经自行设置 inheritedGlobalMultiplier,不要覆盖
    if (finalReason === GameEndReason.WALL_EXHAUSTED) {
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
      bailoutRelations: this.getMutualBailoutRelations(game.gameId).map(rel => ({
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
        return {
          playerId: winner.id,
          playerName: winner.name,
          handTypeName: winner.winHandType,
          isSelfDrawn: winner.isSelfDrawn ?? false,
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
          flowerCount: this.getPlayerFlowerTiles(winner).length,
          handTiles: concealedTiles,
          exposedTiles,
          exposedMeldGroups: winner.hand.exposedMelds.map(meld => meld.tiles.map(tile => ({ ...tile }))),
          tileFaces: allWinnerTiles.map(tile => this.tileLabel(tile)),
          isMenQing: this.isPlayerMenQing(winner),
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
      this.autoStartNextRound(game.gameId, 2000);
    }
  }

  /**
   * 自动进入下一局（延时后设置STARTING阶段）
   */
  private autoStartNextRound(gameId: string, delayMs: number = 2000): void {
    const timer = this.detachTimer(setTimeout(async () => {
      try {
        await this.setStartingPhase(gameId);
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

