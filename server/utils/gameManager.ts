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

  setWebSocketManager(manager: any) {
    this.wsManager = manager;
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

    const timer = setTimeout(async () => {
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (!game.pendingActions.length) return;

        // 自动让所有待响应玩家 PASS，推动流程
        const pending = [...game.pendingActions];
        for (const pa of pending) {
          const player = game.players.find(p => p.id === pa.playerId);
          if (!player || player.status !== PlayerStatus.PLAYING) continue;
          // Bot 已在 checkPendingActions 的 setTimeout 中处理过，跳过
          if (isBotPlayer(player)) continue;
          this.handlePass(game, player);
        }

        await this.persistGame(game);
        this.broadcastGameState(gameId);
      } catch (err) {
        console.error('Failed to auto-resolve pending actions:', err);
      } finally {
        this.pendingActionTimers.delete(gameId);
      }
    }, 1000); // 1秒窗口

    this.pendingActionTimers.set(gameId, timer);
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
    try {
      const persistedGames = await loadAllGameStates();
      for (const game of persistedGames) {
        this.games.set(game.gameId, game);
        for (const player of game.players) {
          this.playerToGame.set(player.id, game.gameId);
        }
      }
      console.log(`✅ Hydrated ${persistedGames.length} games from MongoDB`);
    } catch (error: any) {
      console.warn('⚠️ MongoDB hydrate failed (will use in-memory only):', error.message);
    }
    this.isHydrated = true; // 标记为已处理，防止重复重试
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
      winnersCount: game.winnersCount
    });
  }

  /**
   * Create a new game
   */
  async createGame(playerName: string, options?: { freezeDurationMs?: number; diceRollCount?: number }): Promise<{ gameId: string; playerId: string }> {
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
      inheritedGlobalMultiplier: undefined,
      rebelEvent: undefined,
      freezeDurationMs: options?.freezeDurationMs ?? 1000,
      diceRollCount: options?.diceRollCount ?? 2
    };

    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);

    await this.persistGame(game);

    return { gameId, playerId };
  }

  /**
   * Join an existing game
   */
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
   * Start the game
   */
  public async startGame(gameId: string): Promise<void> {
    await this.hydrateFromDatabase();

    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    game.phase = GamePhase.STARTING;
    game.endReason = null;
    game.endedAt = undefined;
    game.finalScores = undefined;
    game.customScoringMode = null;

    // Create and shuffle deck
    const deck = createDeck();
    game.wall = shuffleTiles(deck);

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

    game.currentPlayerIndex = game.dealerIndex;
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();

    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<GameState | undefined> {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    return game;
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
      const game = await this.ensureGameLoaded(gameId);
      if (!game || game.phase !== GamePhase.PLAYING) return [];

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.status !== PlayerStatus.PLAYING) return [];

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

    // If it's the player's turn and no one else has pending reactions, allow turn actions
    // Note: freeze does NOT block the player's own draw+discard cycle
    if (currentPlayer.id === playerId && game.pendingActions.length === 0) {
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

      const exposedTileCount = player.hand.exposedMelds.reduce((sum, meld) => sum + meld.tiles.length, 0);
      const totalTileCount = player.hand.concealedTiles.length + exposedTileCount;

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

        // Check if can win
        const winCheck = canWin(player.hand.concealedTiles, player.hand.exposedMelds.length, isWildTile);
        if (winCheck.canWin) {
          actions.push(ActionType.HU);
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

    const gameAction: GameAction = {
      playerId,
      type: action,
      timestamp: Date.now()
    };

    switch (action) {
      case ActionType.DISCARD:
        this.handleDiscard(game, player, tileId!);
        gameAction.tile = findTileById(player.hand.concealedTiles, tileId!);
        break;

      case ActionType.DRAW:
        this.handleDraw(game, player);
        break;

      case ActionType.PENG:
        this.handlePeng(game, player);
        break;

      case ActionType.CHOW:
        this.handleChow(game, player);
        break;

      case ActionType.KONG:
        this.handleKong(game, player, tileId!);
        break;

      case ActionType.CONCEALED_KONG:
        this.handleConcealedKong(game, player, tileIds!);
        break;

      case ActionType.EXTENDED_KONG:
        this.handleExtendedKong(game, player, tileId!);
        break;

      case ActionType.HU:
        this.handleHu(game, player);
        break;

      case ActionType.CHEAT_HU:
        this.handleCheatHu(game, player);
        break;

      case ActionType.REBEL:
        this.handleRebel(game, player);
        break;

      case ActionType.PASS:
        this.handlePass(game, player);
        break;
    }

    game.actionHistory.push(gameAction);
    game.lastActionTime = Date.now();

    // Broadcast game state update
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }

  private handleDiscard(game: GameState, player: Player, tileId: string): void {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) throw new Error('Tile not found');

    // Remove from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);

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
      game.pendingActions = []; // 清空所有待响应
      this.moveToNextPlayer(game);
      return;
    }

    // 新弃牌产生新的响应窗口，重置一炮多响起点（由首个HU时再设置）
    game.multiHuStarterIndex = undefined;

    // Check if other players can peng, kong, or hu
    this.checkPendingActions(game, tile);

    // If no pending actions, move to next player
    if (game.pendingActions.length === 0) {
      this.moveToNextPlayer(game);
    }
  }

  private handleDraw(game: GameState, player: Player): void {
    if (game.wall.length === 0) {
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
      return;
    }

    const tile = game.wall.pop()!;
    
    // 花牌处理
    if (isFlower(tile)) {
      // 检查是否是百搭花牌
      const isWildFlower = this.isWildTile(game, tile);
      
      if (isWildFlower) {
        // 百搭花牌 → 进入手牌，不补花
        player.hand.concealedTiles.push(tile);
        player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
      } else {
        // 普通花牌 → 放门口，递归补花
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [tile],
          isConcealed: false
        });
        this.handleDraw(game, player); // 递归补花
      }
      return;
    }
    
    player.hand.concealedTiles.push(tile);
    player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
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

  private handleChow(game: GameState, player: Player): void {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;

    const discardedTile = pendingAction.tile;

    // Verify the discarder is the previous active player (上家)
    const prevPlayer = this.getPreviousActivePlayer(game, game.currentPlayerIndex);
    if (!prevPlayer || prevPlayer.id !== player.id) {
      throw new Error('Can only chow from the previous player (上家)');
    }

    // Find all possible sequences
    const sequences = this.findChowSequences(player.hand.concealedTiles, discardedTile);
    if (sequences.length === 0) {
      throw new Error('No valid sequence found for chow');
    }

    // Use the first valid sequence (client can specify which one via tileIds in future)
    const sequence = sequences[0];
    const handTiles = sequence.filter(t => t.id !== discardedTile.id);

    // Record bailout action
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.SEQUENCE);

    // Remove tiles from hand
    for (const tile of handTiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }

    // Create exposed meld
    const sourcePos = this.getLastDiscardPosition(game);
    const meld: Meld = {
      type: MeldType.SEQUENCE,
      tiles: sequence,
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    };
    player.hand.exposedMelds.push(meld);

    // Remove from discard pile
    game.discardPile.pop();

    // Clear pending actions
    game.pendingActions = [];

    // Set current player to the chow player - they must discard
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  private handlePeng(game: GameState, player: Player): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // Find matching tiles in hand
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;

    // 记录互包来源（碰的是谁的牌）
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.TRIPLET);

    // Remove tiles from hand
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[0].id);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[1].id);

    // Create exposed meld
    const sourcePos = this.getLastDiscardPosition(game);
    const meld: Meld = {
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, matchingTiles[0], matchingTiles[1]],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    };
    player.hand.exposedMelds.push(meld);

    // Remove from discard pile
    game.discardPile.pop();

    // Clear pending actions
    game.pendingActions = [];

    // Player must discard
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
  }

  private handleKong(game: GameState, player: Player, tileId: string): void {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // Find matching tiles in hand
    const matchingTiles = player.hand.concealedTiles.filter(t => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;

    // 记录互包来源（杠的是谁的牌）
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.KONG);

    // Remove tiles from hand
    for (let i = 0; i < 3; i++) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[i].id);
    }

    // Create exposed kong
    const sourcePos = this.getLastDiscardPosition(game);
    const meld: Meld = {
      type: MeldType.KONG,
      tiles: [lastDiscard, ...matchingTiles.slice(0, 3)],
      isConcealed: false,
      ...(sourcePos !== undefined && { sourcePosition: sourcePos })
    };
    player.hand.exposedMelds.push(meld);

    // Remove from discard pile
    game.discardPile.pop();

    // Award direct kong score (点杠) - discarder pays 2
    const discarderIndex = (game.currentPlayerIndex - 1 + game.players.length) % game.players.length;
    player.windScore += 2;

    // Clear pending actions
    game.pendingActions = [];

    // Draw supplement tile
    this.handleDraw(game, player);

    // Player must discard
    game.currentPlayerIndex = game.players.findIndex(p => p.id === player.id);
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

      const hasDaDiao = handTypes.includes(HandType.DA_DIAO);
      const requiresFlowerGate = (handTypes.includes(HandType.ALL_TRIPLETS) || handTypes.includes(HandType.HALF_FLUSH)) && !hasDaDiao;
      const hasFlowerAtDoor = flowerCount > 0;
      if (requiresFlowerGate && !hasFlowerAtDoor) continue;

      robbers.push({
        playerId: candidate.id,
        availableActions: [ActionType.HU, ActionType.PASS],
        tile,
        expiresAt: Date.now() + 1000
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

  private handleHu(game: GameState, player: Player): void {
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

    const existingMelds = player.hand.exposedMelds.length;
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const winCheck = canWin(player.hand.concealedTiles, existingMelds, isWildTile);
    if (!winCheck.canWin) {
      throw new Error('Invalid Hu declaration');
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

    const remainingActive = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    if (remainingActive <= 1) {
      this.endRound(game, GameEndReason.LAST_PLAYER);
      return;
    }

    // 一炮多响 / 抢杠多响：若还有同张牌可胡玩家，等待其继续响应
    if (!isSelfDrawn && game.pendingActions.length > 0) {
      return;
    }

    // 抢杠：若有人胡牌则补杠作废；否则恢复补杠
    if (isRobbingKong) {
      game.pendingKongClaim = undefined;
    } else if (this.resolveRobKongIfNeeded(game)) {
      return;
    }

    // Continue playing
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

    this.moveToNextPlayer(game);
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

    // 记录造反事件（下局倍数×2）
    game.rebelEvent = {
      playerId: player.id,
      playerName: player.name,
      newDealerIndex: player.position
    };
    // 造反：下局全局倍数 ×2（由 startGame 消费）
    const currentGlobal = game.globalMultiplier ?? 1;
    game.inheritedGlobalMultiplier = calculateGlobalMultiplier(currentGlobal, '造反');

    // 造反者成为庄家
    game.dealerIndex = player.position;
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

    // 普通场景
    if (game.pendingActions.length === 0) {
      this.moveToNextPlayer(game);
    }
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

        const hasDaDiao = handTypes.includes(HandType.DA_DIAO);
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
          expiresAt: Date.now() + 1000 // 1 second response window
        });
      }
    }

    // Check for CHOW (吃) - only the next active player (下家) can chow
    // Chow has lowest priority: only check if no one else claimed the discard
    if (game.pendingActions.length === 0) {
      const chowPlayer = this.getNextActivePlayer(game, game.currentPlayerIndex);
      if (chowPlayer) {
        const sequences = this.findChowSequences(chowPlayer.hand.concealedTiles, discardedTile);
        if (sequences.length > 0) {
          game.pendingActions.push({
            playerId: chowPlayer.id,
            availableActions: [ActionType.CHOW, ActionType.PASS],
            tile: discardedTile,
            expiresAt: Date.now() + 1000
          });
        }
      }
    }

    if (game.pendingActions.length > 0) {
      this.schedulePendingActionTimeout(game.gameId);

      // 调度 bot 玩家的自动响应（优先于1秒超时）
      for (const pa of game.pendingActions) {
        const player = game.players.find(p => p.id === pa.playerId);
        if (player && isBotPlayer(player)) {
          const delay = 300 + Math.floor(Math.random() * 400); // 300-700ms 随机延迟
          setTimeout(() => {
            // 重新检查是否还有这个玩家的 pending action
            const currentPa = game.pendingActions.find(p => p.playerId === player.id);
            if (!currentPa) return; // 已经被处理过了

            const action = shouldClaimPendingAction(player, currentPa.availableActions, game);
            if (action !== ActionType.PASS) {
              // Bot 决定要碰/杠/胡 → 执行动作
              this.executeAction(game.gameId, player.id, action)
                .catch(err => console.error('[BotService] Pending action error:', err));
            } else {
              // PASS
              this.handlePass(game, player);
              this.persistGame(game);
              this.broadcastGameState(game.gameId);
            }
          }, delay);
        }
      }
    } else {
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
   */
  private findChowSequences(hand: Tile[], discardedTile: Tile): Tile[][] {
    const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    if (!numberSuits.includes(discardedTile.suit)) return [];

    const sequences: Tile[][] = [];
    const v = discardedTile.value;
    const suit = discardedTile.suit;

    // Case 1: discarded tile is the smallest (e.g. 5, need 6+7)
    if (v <= 7) {
      const t2 = hand.find(t => t.suit === suit && t.value === v + 1);
      const t3 = hand.find(t => t.suit === suit && t.value === v + 2);
      if (t2 && t3) {
        sequences.push([discardedTile, t2, t3]);
      }
    }

    // Case 2: discarded tile is the middle (e.g. 5, need 4+6)
    if (v >= 2 && v <= 8) {
      const t1 = hand.find(t => t.suit === suit && t.value === v - 1);
      const t3 = hand.find(t => t.suit === suit && t.value === v + 1);
      if (t1 && t3) {
        sequences.push([t1, discardedTile, t3]);
      }
    }

    // Case 3: discarded tile is the largest (e.g. 5, need 3+4)
    if (v >= 3) {
      const t1 = hand.find(t => t.suit === suit && t.value === v - 2);
      const t2 = hand.find(t => t.suit === suit && t.value === v - 1);
      if (t1 && t2) {
        sequences.push([t1, t2, discardedTile]);
      }
    }

    return sequences;
  }

  private moveToNextPlayer(game: GameState): void {
    if (game.phase !== GamePhase.PLAYING) {
      return;
    }

    if (game.players.length === 0) {
      throw new Error('No players available to take a turn');
    }

    let rotations = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      rotations++;
      if (rotations > game.players.length) {
        throw new Error('No active players remaining in the round');
      }
    } while (game.players[game.currentPlayerIndex].status !== PlayerStatus.PLAYING);

    const nextPlayer = game.players[game.currentPlayerIndex];
    
    // 回合开始时补花：门口有花牌就从牌墙补牌
    this.replaceFlowers(game, nextPlayer);
    
    // 然后正常摸牌
    this.handleDraw(game, nextPlayer);

    // 如果是 bot 玩家，延迟后自动出牌（给客户端留出动画时间）
    if (isBotPlayer(nextPlayer)) {
      this.scheduleBotDiscard(game.gameId, nextPlayer.id);
    }
  }

  /**
   * 调度 bot 玩家延迟出牌
   */
  private botTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private scheduleBotDiscard(gameId: string, playerId: string): void {
    // 清除旧的 timer
    const existing = this.botTimers.get(gameId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.botTimers.delete(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (game.players[game.currentPlayerIndex].id !== playerId) return; // 不是当前玩家
        if (game.pendingActions.length > 0) {
          // 有待响应的动作（别人打出的牌），bot 处理碰/杠/胡/过
          const botAction = shouldClaimPendingAction(
            game.players[game.currentPlayerIndex],
            game.pendingActions.find(pa => pa.playerId === playerId)?.availableActions || [],
            game
          );
          await this.executeAction(gameId, playerId, botAction as ActionType);
        } else {
          // 正常出牌
          const tileId = selectDiscardTile(game.players[game.currentPlayerIndex], game);
          if (tileId) {
            await this.executeAction(gameId, playerId, ActionType.DISCARD, tileId);
          }
        }
      } catch (err) {
        console.error('[BotService] Bot discard error:', err);
      }
    }, 800); // 800ms 延迟，让客户端看到摸牌

    this.botTimers.set(gameId, timer);
  }

  /**
   * 补花：门口有花牌时，从牌墙补牌到手牌
   */
  private replaceFlowers(game: GameState, player: Player): void {
    // 找到门口的花牌meld（只有1张牌的meld就是花牌）
    const flowerMelds = player.hand.exposedMelds.filter(
      m => m.tiles.length === 1 && isFlower(m.tiles[0])
    );
    
    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      
      // 从牌墙补一张牌
      const replacement = game.wall.pop()!;
      
      if (isFlower(replacement)) {
        // 补到的还是花牌，加到门口继续补
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false
        });
      } else {
        // 补到普通牌，加入手牌
        player.hand.concealedTiles.push(replacement);
      }
    }
    
    player.hand.concealedTiles = sortTiles(player.hand.concealedTiles);
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
    for (const player of game.players) {
      player.score = finalScores[player.id] ?? 0;
    }

    // 倍数继承链：流局/造反 → ×2 → 下局; 正常结局 → 重置×1
    if (reason === GameEndReason.WALL_EXHAUSTED) {
      // 流局：下局全局倍数 ×2，封顶 8
      const currentGlobal = game.globalMultiplier ?? 1;
      game.inheritedGlobalMultiplier = calculateGlobalMultiplier(currentGlobal, '流局');
    } else {
      // 正常结算（有人胡了）或 OWNER_LEFT：倍数重置
      game.inheritedGlobalMultiplier = 1;
    }

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
