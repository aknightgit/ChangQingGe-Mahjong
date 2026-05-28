/**
 * gameLifecycle.ts — 游戏生命周期管理（从 gameManager 拆分）
 * 负责：创建/加入/开始/结束/持久化/恢复/清理
 */
import { randomUUID } from 'crypto';
import { GameState, Player, GamePhase, PlayerStatus, GameEndReason, Tile, TileSuit } from '../types/game';
import { createDeck, shuffleTiles } from '../utils/tiles';
import { RoomGameBridge } from '../services/roomGameBridge';
import { GameStore } from '../services/gameStore';
import { loadGameState, loadActiveGameStates } from '../db/mongo';

export interface GameLifecycleDeps {
  games: Map<string, GameState>;
  playerToGame: Map<string, string>;
  timerManager: any;
  store: GameStore;
  isPlayerBotControlled(player: Player): boolean;
  schedulePendingActionTimeout(gameId: string): void;
  scheduleBotDiscard(gameId: string, playerId: string): void;
  broadcastGameState(gameId: string): void;
  broadcastQuickMessage(gameId: string, text: string, type?: string, actionKind?: string): void;
  endRound(game: GameState, reason: GameEndReason): void;
  handleDraw(game: GameState, player: Player, options?: { allowFullHand?: boolean }): void;
  replaceFlowers(game: GameState, player: Player): void;
  getPlayableTileCount(player: Player): number;
  persistGame(game: GameState): Promise<void>;
  getGame(gameId: string): Promise<GameState | undefined>;
  getMutualBailoutRelations(gameId: string): any[];
}

export class GameLifecycle {
  private deps: GameLifecycleDeps;

  constructor(deps: GameLifecycleDeps) {
    this.deps = deps;
  }

  /**
   * 从数据库恢复游戏状态
   */
  async hydrateFromDatabase(): Promise<void> {
    return this.deps.store.hydrateFromDatabase();
  }

  /**
   * 确保游戏已加载到内存
   */
  async ensureGameLoaded(gameId: string): Promise<GameState | undefined> {
    const { games, playerToGame, timerManager, isPlayerBotControlled, schedulePendingActionTimeout, scheduleBotDiscard, endRound, replaceFlowers, handleDraw, getPlayableTileCount, persistGame, broadcastGameState } = this.deps;

    if (games.has(gameId)) {
      return games.get(gameId);
    }

    try {
      const stored = await loadGameState(gameId);
      if (stored) {
        games.set(gameId, stored);
        // 修复恢复时 player.id 为空
        for (const player of stored.players) {
          const oldId = player.id;
          if (!player.id && player.userId) {
            player.id = player.userId;
          } else if (!player.id && !player.userId) {
            player.id = 'recovered-' + randomUUID();
          }
          if (player.id) {
            playerToGame.set(player.id, gameId);
            if (oldId !== player.id) {
              console.log('[Recovery] Fixed player.id for', player.name, ':', oldId, '->', player.id);
            }
          }
        }
        // 恢复重启后丢失的 pending 超时和 freeze timer
        if (stored.phase === 'playing') {
          const currentPlayer = stored.players[stored.currentPlayerIndex];
          const hasPending = stored.pendingActions && stored.pendingActions.length > 0;
          
          if (hasPending) {
            const now = Date.now();
            const hasUnresolved = stored.pendingActions.some(pa =>
              typeof pa.expiresAt === 'number' && pa.expiresAt > now
            );
            if (hasUnresolved) {
              schedulePendingActionTimeout(gameId);
              console.log('[Recovery] Restored pending timeout for game', gameId);
            } else {
              setImmediate(() => schedulePendingActionTimeout(gameId));
              console.log('[Recovery] Scheduled immediate resolution for expired pending in game', gameId);
            }
          } else if (currentPlayer && isPlayerBotControlled(currentPlayer)) {
            const freezeMs = timerManager.getHesitationWindow(stored);
            console.log('[Recovery] Restoring bot freeze timer for', currentPlayer.name, 'delay:', freezeMs);
            const botFreezeTimer = timerManager.detachTimer(setTimeout(async () => {
              try {
                timerManager.freezeTimers.delete(gameId);
                const freshGame = await this.deps.getGame(gameId);
                if (!freshGame || freshGame.phase !== 'playing') return;
                if (freshGame.currentPlayerIndex !== stored.currentPlayerIndex) return;
                const livePlayer = freshGame.players[freshGame.currentPlayerIndex];
                if (!livePlayer || livePlayer.status !== 'playing') return;
                console.log('[Recovery] Bot freeze expired for', livePlayer.name, 'drawing...');
                if (freshGame.wall.length === 0) {
                  endRound(freshGame, 'wall_exhausted');
                  return;
                }
                replaceFlowers(freshGame, livePlayer);
                if (getPlayableTileCount(livePlayer) >= 14) {
                  freshGame.drawnThisTurn = true;
                } else {
                  handleDraw(freshGame, livePlayer);
                  freshGame.drawnThisTurn = true;
                }
                scheduleBotDiscard(gameId, livePlayer.id);
                await persistGame(freshGame);
                broadcastGameState(gameId);
              } catch (err) {
                console.warn('[Recovery] Bot freeze handler error:', err);
              }
            }, freezeMs));
            timerManager.freezeTimers.set(gameId, botFreezeTimer);
          } else if (currentPlayer) {
            schedulePendingActionTimeout(gameId);
            console.log('[Recovery] Scheduled pending timeout for human player', currentPlayer.name);
          }
        }
        return stored;
      }
    } catch (err: any) {
      console.warn('⚠️ ensureGameLoaded failed:', err.message);
    }

    return undefined;
  }

  /**
   * 创建新游戏
   */
  async createGame(playerName: string, options?: {
    userId?: string; roomNumber?: string; diceRollCount?: number;
    firstRoundDouble?: boolean; liangShanThreshold?: number;
    thinkChances?: number; settlementMultiplier?: number;
    maxBots?: number; minPlayers?: number; hesitationWindow?: number;
    allClaimMode?: boolean; selectedBots?: string[];
  }): Promise<{ gameId: string; playerId: string }> {
    await this.hydrateFromDatabase();

    const gameId = randomUUID();
    const playerId = randomUUID();

    const player: Player = {
      id: playerId,
      userId: options?.userId,
      name: playerName,
      position: 0,
      hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
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
      roomNumber: options?.roomNumber || String(Math.floor(1000 + Math.random() * 9000)),
      phase: GamePhase.WAITING,
      players: [player],
      wall: [],
      discardPile: [],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      roundNumber: 1,
      turnCount: 0,
      pendingActions: [],
      actionHistory: [],
      winnersCount: 0,
      createdAt: Date.now(),
      lastActionTime: Date.now(),
      drawnThisTurn: false,
      diceRollCount: options?.diceRollCount ?? 2,
      firstRoundDouble: options?.firstRoundDouble ?? false,
      liangShanThreshold: options?.liangShanThreshold ?? 4000,
      thinkChances: options?.thinkChances ?? 3,
      settlementMultiplier: options?.settlementMultiplier ?? 1,
      maxBots: options?.maxBots ?? 3,
      minPlayers: options?.minPlayers ?? 4,
      hesitationWindow: options?.hesitationWindow ?? 5000,
      allClaimMode: options?.allClaimMode ?? false,
      selectedBots: options?.selectedBots ?? []
    };

    this.deps.games.set(gameId, game);
    this.deps.playerToGame.set(playerId, gameId);
    await this.deps.persistGame(game);
    this.deps.broadcastGameState(gameId);

    return { gameId, playerId };
  }

  /**
   * 加入游戏
   */
  async joinGame(gameId: string, playerName: string, options?: { userId?: string }): Promise<{ playerId: string; position: number; isSpectator?: boolean }> {
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error('Game not found');

    if (game.phase === GamePhase.PLAYING) {
      // 游戏进行中，作为观众加入
      const spectatorId = randomUUID();
      const spectator: Player = {
        id: spectatorId,
        userId: options?.userId,
        name: playerName,
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
        score: 0
      };
      game.players.push(spectator);
      this.deps.playerToGame.set(spectatorId, gameId);
      await this.deps.persistGame(game);
      this.deps.broadcastGameState(gameId);
      return { playerId: spectatorId, position: spectator.position, isSpectator: true };
    }

    // 游戏未开始，作为玩家加入
    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      userId: options?.userId,
      name: playerName,
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
      score: 0
    };

    game.players.push(player);
    this.deps.playerToGame.set(playerId, gameId);
    await this.deps.persistGame(game);
    this.deps.broadcastGameState(gameId);

    return { playerId, position: player.position };
  }

  /**
   * 设置开始阶段
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

    // 预热：后台创建牌墙+选百搭
    const preheatWall = shuffleTiles(createDeck());
    console.log(`[WallDebug] preheated deck: ${preheatWall.length} tiles`);

    const allTileTypes: Array<{ suit: TileSuit; value: number }> = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let v = 1; v <= 9; v++) allTileTypes.push({ suit, value: v });
    }
    for (let v = 1; v <= 4; v++) allTileTypes.push({ suit: TileSuit.WIND, value: v });
    for (let v = 1; v <= 3; v++) allTileTypes.push({ suit: TileSuit.DRAGON, value: v });
    for (let v = 1; v <= 8; v++) allTileTypes.push({ suit: TileSuit.FLOWER, value: v });
    const wildIndex = Math.floor(Math.random() * allTileTypes.length);
    const wildType = allTileTypes[wildIndex];

    (game as any)._preheatedWall = preheatWall;
    (game as any)._preheatedWild = wildType;
    console.log(`[WallDebug] preheated wild: suit=${wildType.suit} value=${wildType.value}`);

    await this.deps.persistGame(game);
    this.deps.broadcastGameState(gameId);
  }

  /**
   * 开始游戏
   */
  async startGame(gameId: string, options?: { hesitationWindow?: number; fixedDice?: [number, number] }): Promise<void> {
    const _startGameTimer = Date.now();
    console.log('[timing-startGame] BEGIN');
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;

    if (game.players.length < 4) {
      console.warn('[startGame] Not enough players');
      return;
    }

    // 重置游戏状态
    game.phase = GamePhase.PLAYING;
    game.turnCount = 0;
    game.winnersCount = 0;
    game.pendingActions = [];
    game.actionHistory = [];
    game.discardPile = [];
    game.drawnThisTurn = false;
    game.lastActionTime = Date.now();

    // 重置玩家状态
    for (const player of game.players) {
      player.status = PlayerStatus.PLAYING;
      player.hand = { concealedTiles: [], exposedMelds: [], discardedTiles: [] };
      player.isTing = false;
      player.missingSuit = null;
      player.windScore = 0;
      player.rainScore = 0;
      player.wonFan = 0;
      player.winHandType = undefined;
      player.winOrder = null;
      player.winRound = null;
      player.winTimestamp = null;
      player.isSelfDrawn = undefined;
      (player as any).winningTileName = undefined;
      player.discarderId = undefined;
      player.winningScoreBreakdown = undefined;
      player.score = 0;
    }

    // 掷骰子
    const dice1 = options?.fixedDice?.[0] ?? Math.floor(Math.random() * 6) + 1;
    const dice2 = options?.fixedDice?.[1] ?? Math.floor(Math.random() * 6) + 1;
    game.dice = [dice1, dice2];

    // 使用预热的牌墙或创建新的
    const wall = (game as any)._preheatedWall || shuffleTiles(createDeck());
    delete (game as any)._preheatedWall;

    // 设置百搭
    const wildType = (game as any)._preheatedWild || (() => {
      const allTileTypes: Array<{ suit: TileSuit; value: number }> = [];
      for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
        for (let v = 1; v <= 9; v++) allTileTypes.push({ suit, value: v });
      }
      for (let v = 1; v <= 4; v++) allTileTypes.push({ suit: TileSuit.WIND, value: v });
      for (let v = 1; v <= 3; v++) allTileTypes.push({ suit: TileSuit.DRAGON, value: v });
      for (let v = 1; v <= 8; v++) allTileTypes.push({ suit: TileSuit.FLOWER, value: v });
      const wildIndex = Math.floor(Math.random() * allTileTypes.length);
      return allTileTypes[wildIndex];
    })();
    delete (game as any)._preheatedWild;

    game.wildTileGroup = wildType;
    game.wall = wall;

    // 发牌
    for (let i = 0; i < 13; i++) {
      for (const player of game.players) {
        if (game.wall.length > 0) {
          const tile = game.wall.pop()!;
          player.hand.concealedTiles.push(tile);
        }
      }
    }

    // 庄家多摸一张
    const dealer = game.players[game.dealerIndex];
    if (game.wall.length > 0) {
      const tile = game.wall.pop()!;
      dealer.hand.concealedTiles.push(tile);
    }

    console.log(`[timing-startGame] total: ${Date.now() - _startGameTimer}ms`);
    await this.deps.persistGame(game);
    this.deps.broadcastGameState(gameId);
  }

  /**
   * 自动开始下一局
   */
  autoStartNextRound(gameId: string, delayMs: number = 2000): void {
    const timer = this.deps.timerManager.detachTimer(setTimeout(async () => {
      try {
        await this.setStartingPhase(gameId);
      } catch (err) {
        console.error('[autoStartNextRound] Error:', err);
      }
    }, delayMs));
  }

  /**
   * 应用出局/替换请求
   */
  applyPendingChanges(game: GameState): void {
    // 处理替换请求
    if (game.pendingReplacements?.length) {
      for (const req of game.pendingReplacements) {
        const aiIdx = game.players.findIndex(p => p.id === req.aiPlayerId);
        if (aiIdx === -1) continue;
        const aiName = game.players[aiIdx].name;
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
        game.players.forEach((p, i) => { p.position = i; });
        console.log(`[ApplyChanges] ${name} 已移除`);
      }
      game.pendingRemovals = [];

      // 人数不足 → 回到等待状态
      if (game.players.length < 4) {
        game.phase = GamePhase.WAITING;
        game.currentPlayerIndex = 0;
        game.dealerIndex = 0;
        game.pendingActions = [];
        game.actionHistory = [];
        game.discardPile = [];
        game.winnersCount = 0;
        game.roundNumber = 1;
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

  /**
   * 空房间结束游戏
   */
  async endGameForEmptyRoom(gameId: string, reason: GameEndReason = GameEndReason.EMPTY_ROOM): Promise<void> {
    await RoomGameBridge.endGameForEmptyRoom(
      () => this.hydrateFromDatabase(),
      (id) => this.ensureGameLoaded(id),
      (g) => this.deps.persistGame(g),
      (g, r) => this.deps.endRound(g, r),
      (id) => this.deps.broadcastGameState(id),
      gameId,
      reason
    );
  }

  /**
   * 列出所有活跃游戏
   */
  async listGames(): Promise<GameState[]> {
    const allGames = await loadActiveGameStates();
    return Array.from(allGames);
  }
}
