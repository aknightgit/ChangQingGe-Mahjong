/**
 * GameStore — GameState 存储层
 * 纯搬运自 gameManager.ts，不改逻辑
 * 处理：GameState 的存储/持久化/CRUD
 */

import { randomUUID } from 'crypto';
import { saveGameState, deleteGameState } from '../utils/gamePersistence';
import type { GameState, Player, PlayerStatus } from '../types/game';
import { GamePhase } from '../types/game';
import { GameEndReason } from '../types/game';

export class GameStore {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;

  private isHydrated = false;

  /** @internal */
  getGames(): Map<string, GameState> { return this.games; }
  /** @internal */
  getPlayerToGame(): Map<string, string> { return this.playerToGame; }
  /** @internal */
  getWsManager(): any { return this.wsManager; }
  /** @internal */
  setWsManager(ws: any): void { this.wsManager = ws; }

  /** @internal Bind to GameManager (syncs maps/wsManager) */
  _inject(gm: any): void {
    const self = this;
    Object.defineProperty(self, 'getGames', { value: () => gm.games, configurable: true });
    Object.defineProperty(self, 'getPlayerToGame', { value: () => gm.playerToGame, configurable: true });
    Object.defineProperty(self, 'getWsManager', {
      get: () => gm.wsManager,
      set: (v: any) => { gm.wsManager = v; },
      configurable: true
    });
  }

  /** @internal Called by GameManager to restore pending timeouts on load */
  onGameLoaded: ((gameId: string, game: GameState) => void) | null = null;

  // ─── Persistence ────────────────────────────

  async hydrateFromDatabase(): Promise<void> {
    if (this.isHydrated) return;
    this.isHydrated = true;
  }

  async ensureGameLoaded(gameId: string): Promise<GameState | undefined> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }
    try {
      const stored = await import('../utils/gamePersistence').then(m => m.loadGameState(gameId));
      if (stored) {
        this.games.set(gameId, stored);
        for (const player of stored.players) {
          this.playerToGame.set(player.id, gameId);
        }
        this.onGameLoaded?.(gameId, stored);
        return stored;
      }
    } catch (err: any) {
      console.warn('loadGameState failed:', err.message);
    }
    return undefined;
  }

  // 异步批量写入：标记脏数据，定期刷盘，关键节点立即刷
  private dirtyGames: Map<string, GameState> = new Map()
  private flushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private readonly FLUSH_INTERVAL_MS = 3000

  async persistGame(game: GameState): Promise<void> {
    // 仅标记脏数据，定期批量刷盘
    this.dirtyGames.set(game.gameId, game)
    if (!this.flushTimers.has(game.gameId)) {
      this.flushTimers.set(game.gameId, setTimeout(() => {
        this.flushGameNow(game.gameId)
      }, this.FLUSH_INTERVAL_MS))
    }
  }

  /** 立即持久化（不走延迟队列），用于创建房间等需要即时可见的场景 */
  async persistGameImmediate(game: GameState): Promise<void> {
    this.dirtyGames.set(game.gameId, game)
    await this.flushGameNow(game.gameId)
  }

  /** 关键节点立即刷盘（回合结束/退房/断连） */
  async flushGameNow(gameId: string): Promise<void> {
    const timer = this.flushTimers.get(gameId)
    if (timer) { clearTimeout(timer); this.flushTimers.delete(gameId) }
    const game = this.dirtyGames.get(gameId)
    if (!game) return
    try {
      await saveGameState(game)
      this.dirtyGames.delete(gameId)
    } catch (error: any) {
      console.warn('MongoDB persist failed:', error.message)
    }
  }

  /** 服务关闭前刷所有脏数据 */
  async flushAll(): Promise<void> {
    for (const [id] of this.flushTimers) {
      const timer = this.flushTimers.get(id)
      if (timer) { clearTimeout(timer); this.flushTimers.delete(id) }
    }
    const promises = [...this.dirtyGames.values()].map(g => 
      saveGameState(g).catch((e: any) => console.warn('MongoDB flushAll failed:', e.message))
    )
    this.dirtyGames.clear()
    await Promise.all(promises)
  }

  broadcastGameState(gameId: string): void {
    if (!this.wsManager) return;
    const game = this.games.get(gameId);
    if (!game) return;
    const payload: any = {
      gameId,
      phase: game.phase,
      currentPlayerIndex: game.currentPlayerIndex,
      discardPile: game.discardPile,
      wallCount: game.wall.length,
      winnersCount: game.winnersCount,
      _freezeUntil: (game as any)._freezeUntil || 0,
      liangShanSuccess: game.liangShanSuccess,
      liangShanVotes: game.liangShanVotes
    };
    // REVEAL/ENDED 阶段：发送完整 players 数据（含手牌），前端需要展示亮牌
    if (game.phase === GamePhase.REVEAL || game.phase === GamePhase.ENDED) {
      payload.players = game.players;
      payload.endReason = game.endReason;
      payload.roundStats = game.roundStats;
    }
    this.wsManager.broadcast(gameId, 'gameStateUpdate', payload);
  }

  // ─── Query ──────────────────────────────────

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getGameByPlayer(playerId: string): GameState | undefined {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  hasGame(gameId: string): boolean {
    return this.games.has(gameId);
  }

  async findGameByRoomNumber(roomNumber: string): Promise<string | null> {
    await this.hydrateFromDatabase();
    for (const [gameId, game] of this.games) {
      if (game.roomNumber === roomNumber && game.phase !== GamePhase.ENDED) {
        return gameId;
      }
    }
    return null;
  }

  // ─── CRUD ───────────────────────────────────

  async createGame(
    playerName: string,
    options?: {
      userId?: string;
      roomNumber?: string;
      diceRollCount?: number;
      firstRoundDouble?: boolean;
      liangShanThreshold?: number;
      thinkChances?: number;
      settlementMultiplier?: number;
      maxBots?: number;
      minPlayers?: number;
      hesitationWindow?: number;
      allClaimMode?: boolean;
      selectedBots?: string[];
    }
  ): Promise<{ gameId: string; playerId: string }> {
    const { GamePhase: GP, PlayerStatus: PS } = await import('../types/game');

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
      status: PS.WAITING as any,
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
      phase: GP.WAITING as any,
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
      diceRolls: undefined,
      roundMultiplier: undefined,
      inheritMultiplier: undefined,
      inheritedGlobalMultiplier: options?.firstRoundDouble ? 2 : 1,
      rebelEvent: undefined,
      diceRollCount: options?.diceRollCount ?? 2,
      liangShanThreshold: options?.liangShanThreshold ?? 4000,
      thinkChances: options?.thinkChances ?? 3,
      settlementMultiplier: options?.settlementMultiplier ?? 10,
      maxBots: options?.maxBots ?? 3,
      minPlayers: options?.minPlayers ?? 4,
      hesitationWindow: (() => {
        const raw = options?.hesitationWindow;
        const fastByEnv = String(process.env.TRAINING_FAST_MODE || '').toLowerCase() === 'true';
        const fastMode = fastByEnv || !!options?.allClaimMode;
        return fastMode ? Math.min(30, Math.max(0, raw ?? 0)) : (raw ?? 0);
      })(),
      thinkUsage: {},
      allClaimMode: options?.allClaimMode,
      spectatorMode: null,
      spectatorViews: {},
      spectatorApprovalRequests: []
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    const aiBots = options?.selectedBots ?? [];
    for (const botName of aiBots) {
      if (game.players.length >= 4) break;
      const botId = randomUUID();
      const botPlayer: any = {
        id: botId,
        name: botName,
        position: game.players.length,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PS.WAITING,
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

  async joinGame(
    gameId: string,
    playerName: string,
    options?: { userId?: string }
  ): Promise<{ playerId: string; position: number; isSpectator?: boolean }> {
    const { PlayerStatus: PS } = await import('../types/game');
    const game = await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const exist = game.players.find(p => p.name === playerName);
    if (exist && exist.status !== PS.LEFT && exist.status !== (PS as any).SPECTATING) {
      return { playerId: exist.id, position: exist.position, isSpectator: false };
    }

    if (exist) {
      exist.status = PS.WAITING as any;
      return { playerId: exist.id, position: exist.position, isSpectator: false };
    }

    const playerId = randomUUID();
    const isSpectator = game.players.length >= 4;

    const player = {
      id: playerId,
      userId: options?.userId,
      name: playerName,
      position: isSpectator ? -1 : game.players.length,
      hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
      status: isSpectator ? (PS as any).SPECTATING : PS.WAITING,
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

    game.players.push(player);
    if (!isSpectator) {
      this.playerToGame.set(playerId, gameId);
    }
    return { playerId, position: isSpectator ? -1 : game.players.length - 1, isSpectator };
  }

  async deleteGame(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (game) {
      for (const player of game.players) {
        this.playerToGame.delete(player.id);
      }
      this.games.delete(gameId);
    }
    await deleteGameState(gameId);
  }

  // ─── Internal helpers ───────────────────────

  private generateRoomNumber(): string {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const num = String(Math.floor(1000 + Math.random() * 9000));
      let exists = false;
      for (const game of this.games.values()) {
        if (game.roomNumber === num && game.phase !== GamePhase.ENDED) {
          exists = true;
          break;
        }
      }
      if (!exists) return num;
    }
    return String(Date.now()).slice(-4);
  }

  // ─── 旧房间清理 ───────────────────────

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /** 启动定期清理（每10分钟） */
  startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredGames().catch(e =>
        console.warn('[GameStore] cleanup error:', e.message)
      );
    }, 10 * 60 * 1000);
    // 启动后立即执行一次
    this.cleanupExpiredGames().catch(() => {});
    console.log('[GameStore] Cleanup scheduler started (every 10min)');
  }

  /** 清理过期房间 */
  private async cleanupExpiredGames(): Promise<void> {
    const now = Date.now();
    const ENDED_MEMORY_TTL = 2 * 60 * 60 * 1000;   // 内存：结束超过2小时清除
    const ENDED_DB_TTL = 24 * 60 * 60 * 1000;       // MongoDB：结束超过24小时清除
    const IDLE_TTL = 6 * 60 * 60 * 1000;             // 闲置超过6小时的非活跃房间清除

    let memoryCleaned = 0;
    let dbCleaned = 0;
    const dbDeleteIds: string[] = [];

    for (const [gameId, game] of this.games) {
      const endedAt = game.endedAt || 0;
      const lastAction = game.lastActionTime || 0;
      const isEnded = game.phase === GamePhase.ENDED;
      
      // 已结束超过2小时 → 从内存移除
      if (isEnded && endedAt && now - endedAt > ENDED_MEMORY_TTL) {
        for (const p of game.players) this.playerToGame.delete(p.id);
        this.games.delete(gameId);
        memoryCleaned++;
        if (now - endedAt > ENDED_DB_TTL) dbDeleteIds.push(gameId);
        continue;
      }
       
      // 闲置超过6小时的 waiting/starting 房间 → 清除
      if (!isEnded && (game.phase === 'waiting' || game.phase === 'starting') && lastAction && now - lastAction > IDLE_TTL) {
        for (const p of game.players) this.playerToGame.delete(p.id);
        this.games.delete(gameId);
        dbDeleteIds.push(gameId);
        memoryCleaned++;
      }
    }

    // 批量删除 MongoDB 中过期的记录
    if (dbDeleteIds.length > 0) {
      try {
        const { getCollection } = await import('../utils/mongo');
        const col = await getCollection('mahjongGames');
        if (col) {
          await col.deleteMany({ gameId: { $in: dbDeleteIds } });
          dbCleaned = dbDeleteIds.length;
        }
      } catch (e: any) {
        console.warn('[GameStore] MongoDB cleanup failed:', e.message);
      }
    }

    if (memoryCleaned > 0 || dbCleaned > 0) {
      console.log(`[GameStore] Cleanup: memory=${memoryCleaned}, db=${dbCleaned}, remaining=${this.games.size}`);
    }
  }
}
