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


/**
 * In-memory game state manager
 */
class GameManager {
  private games: Map<string, GameState> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private wsManager: any = null;
  private isHydrated = false;    // Reset chow/pong exclusion for the new round.
    game.chowPongExclusion = {};
    // Broadcast STARTING so clients can play the opening dice animation.
    game.phase = GamePhase.STARTING;
    await this.persistGame(game);
    this.broadcastGameState(gameId);
    // Randomly choose the wild tile type from the full tile type set.
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

    // 姝ゆ椂楠板瓙宸插湪瀹㈡埛绔幏瀹岋紝涓嶅啀閲嶆柊骞挎挱 diceRoll
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
        console.warn('?? getAvailableActions: game not found:', gameId);
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
      console.warn('?? getAvailableActions failed:', err.message);
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
    // 鍙鏌ユ湰灞�鍐呮槸鍚︽湁纰?鏉犲姩浣滐紙涓嶆槸浠庤繙鍙や粖妫�娴嬶級
    const currentRoundActions = (game.actionHistory || []).filter(a => {
      // roundNumber 鍦?action 涓婅褰?
      return (a as any).roundNumber === game.roundNumber || (a as any).roundNumber === undefined;
    });
    const hadPengOrKongThisRound = currentRoundActions.some(a =>
      a.type === 'peng' || a.type === 'kong'
    );
    const context: 'self_draw' | 'discard' = pendingAction?.tile
      ? 'discard'
      : hadPengOrKongThisRound ? 'discard' : 'self_draw';
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

  private async handleDiscard(game: GameState, player: Player, tileId: string): Promise<void> {
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
          text: `?? ${player.name}打出了百搭，本轮不能吃碰捉冲！`,
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
      await this.handleBotPendingActions(game.gameId);
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

  private async advanceApprovalConflict(game: GameState): Promise<void> {
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
        text: `?? ${player.name}吃牌`,
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
        text: `? ${player.name}碰牌`,
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
        text: `? ${player.name}${label}`,
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
      if (!candPlayer || !pending) return;

      this.clearPendingActionTimer(gameId);
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
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // 碰 → 检查其他玩家是否可以胡(审批流程)
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map(pid => ({ playerId: pid, availableActions: ['hu'] }));
      await this.startApproval(game, player.id, 'peng', candidates, lastDiscard);
      return;
    }

    this.executePengDirectly(game, player);
  }

  private async handleKong(game: GameState, player: Player, tileId: string): Promise<void> {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;

    // 杠 → 检查其他玩家是否可以胡(审批流程)
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map(pid => ({ playerId: pid, availableActions: ['hu'] }));
      await this.startApproval(game, player.id, 'kong', candidates, lastDiscard);
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
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, 'an');
  }

  private handleExtendedKong(game: GameState, player: Player, tileId: string): void {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) return;

    // Find matching exposed triplet
    const tripletIndex = player.hand.exposedMelds.findIndex(
      m => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;

    // 抢杠检查:仅补杠可被抢
    const robbers: PendingAction[] = [];

    for (const candidate of game.players) {
      if (candidate.id === player.id) continue;
      if (candidate.status !== PlayerStatus.PLAYING) continue;

      const testHand = [...candidate.hand.concealedTiles, tile];
      const robWildId = typeof game.customScoringMode === 'string' ? game.customScoringMode : null;
      const winCheck = canWin(testHand, candidate.hand.exposedMelds, robWildId || (game.wildTileGroup ?? null));
      if (!winCheck.canWin) continue;
      const flowerCount = this.countFlowerTiles(candidate);
      // 规则:门口无花不能抢杠(所有非豁免牌型)
      const robHandTypes = detectHandTypes(
        testHand,
        candidate.hand.exposedMelds,
        false,
        flowerCount,
        game.customScoringMode || null,
        game.wildTileGroup
      );
      if (robHandTypes.length === 0) continue;

      // 获取最高优先级牌型
      const concealedNonFlower = candidate.hand.concealedTiles.filter(t => !isFlower(t));
      const isDaDiao = concealedNonFlower.length === 1;
      const hasTenPointExemption = this.hasTenPointClaimExemption(robHandTypes, isDaDiao);
      
      // 需要检查门口条件的牌型：碰碰胡(ALL_TRIPLETS) 或 混一色(HALF_FLUSH)
      // 其他更大牌型(风碰/清碰/风一色等)不需要检查，直接允许抢
      // 规则：门口无花不能抢杠（对所有非豁免牌型生效）
      // 豁免：风碰/风一色/清碰/混碰/八花/四百搭/清一色/大吊
      if (!hasTenPointExemption) {
        const hasFlowerAtDoor = candidate.hand.exposedMelds.some(m => 
          m.tiles.some(t => t.suit === TileSuit.FLOWER)
        );
        const hasWindDragonTriplet = candidate.hand.exposedMelds.some(m => 
          (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) &&
          m.tiles[0] && (m.tiles[0].suit === TileSuit.WIND || m.tiles[0].suit === TileSuit.DRAGON)
        );
        const hasAnyKong = candidate.hand.exposedMelds.some(m => 
          m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG
        );
        if (!hasFlowerAtDoor && !hasWindDragonTriplet && !hasAnyKong) {
          continue;  // 门口无花不能抢杠
        }
      }

      robbers.push({
        playerId: candidate.id,
        availableActions: [ActionType.HU, ActionType.PASS],
        tile,
        expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, candidate, [ActionType.HU, ActionType.PASS])
      });
    }

    if (robbers.length > 0) {
      game.pendingKongClaim = { playerId: player.id, tile };
      game.pendingActions = robbers;
      this.schedulePendingActionTimeout(game.gameId);
      return;
    }

    // 无人抢杠,正常补杠
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
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, 'jia');
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
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id);
    const winningTile = pendingAction?.tile;

    if (winningTile) {
      player.hand.concealedTiles.push(winningTile);
      player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);

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
    // 一炮多响仅保留其他"可胡"响应,吃/碰/杠在有人胡牌后无效。
    game.pendingActions = game.pendingActions.filter(pa =>
      pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );

    const isSelfDrawn = !pendingAction;
    const projectedWinOrder = game.winnersCount + 1;

    // 设置下局庄家
    if (!game.nextDealerId) {
      if (projectedWinOrder === 1) {
        // 首胡者为庄
        game.nextDealerId = player.id;
        // 一炮多响:如果有人因放冲导致多胡,放冲者为庄
        if (!isSelfDrawn) {
          const discarderId = this.getLastDiscardPlayerId(game);
          if (discarderId) {
            game.nextDealerId = discarderId;
            const discarder = game.players.find(p => p.id === discarderId);
            console.log(`[handleHu] 一炮多响,放冲者 ${discarder?.name} 为下局庄家`);
          }
        } else {
          console.log(`[handleHu] 自摸,${player.name} 为下局庄家`);
        }
      }
    }

    // 【P0-7修复】canWin当exposedOrCount为number时，第三个参数必须是wildTileId字符串而非函数
    const winCheck = this.getCachedWinCheck(game, player);
    if (!winCheck.canWin) {
      throw new Error('Invalid Hu declaration');
    }
    const isKongFlower = this.isWinAfterKong(game, player.id);
    const isRobbingKong = !!pendingAction?.tile && !!game.pendingKongClaim;
    const preferredWinType = isSelfDrawn ? 'self_draw' : 'discard';
    const filteredWinOptions = this.getCachedWinOptions(game, player, preferredWinType, {
      isKongFlower,
      isRobbingKong
    });
    const selectedWinOption = selectedWinOptionLabel
      ? filteredWinOptions.find(option => option.label === selectedWinOptionLabel)
      : filteredWinOptions[0];

    // 牌型校验: 优先用即时检测, 若空结果则回退到可胡缓存/结算候选, 避免自动结算链被误中断。
    const huHandTypes = detectHandTypes(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      isSelfDrawn,
      this.countFlowerTiles(player),
      game.customScoringMode,
      game.wildTileGroup
    );
    const resolvedHuHandTypes = huHandTypes.length
      ? huHandTypes
      : (selectedWinOption?.handTypes?.length ? selectedWinOption.handTypes : winCheck.types);
    if (!resolvedHuHandTypes.length) {
      throw new Error('No valid hand type for Hu');
    }

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

    // 门清检测：没有吃/碰/明杠。暗杠不破门清
    const isMenQing = !player.hand.exposedMelds.some(m =>
      m.type === MeldType.TRIPLET ||
      m.type === MeldType.SEQUENCE ||
      (m.type === MeldType.KONG && !m.isConcealed)
    );

    // 百搭参数
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts && wildParts[0] ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1], 10) : undefined;

    // 大吊检测：手牌（非花牌）剩1张
    const concealedNonFlower = player.hand.concealedTiles.filter(t => !isFlower(t));
    const isDaDiao = concealedNonFlower.length === 1;
    // 计算番数
    const scoreResult = calculateScore({
      handTiles: player.hand.concealedTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles,
      handTypes: selectedWinOption?.handTypes?.length ? selectedWinOption.handTypes : (handTypes.length ? handTypes : resolvedHuHandTypes),
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

    // wonFan 存最终点数（baseFan × extraMultipliers × globalMultiplier）
    // 用于所有结算：正常赔付 + 互包赔付 × 3/5/2
    player.status = PlayerStatus.WON;
    player.winOrder = projectedWinOrder;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    game.winnersCount++;
    player.wonFan = selectedWinOption?.score ?? scoreResult.finalPoints;
    player.winHandType = selectedWinOption?.handTypeName ?? scoreResult.handTypeName;
    player.isSelfDrawn = isSelfDrawn;
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
    if (!isSelfDrawn) {
      player.discarderId = this.getLastDiscardPlayerId(game) ?? undefined;
    }

    const remainingActive = game.players.filter(p => p.status === PlayerStatus.PLAYING).length;
    const hadPendingForMultiHu = !isSelfDrawn && game.pendingActions.some(
      pa => pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );

    if (remainingActive <= 1) {
      this.endRound(game, GameEndReason.LAST_PLAYER);
      return;
    }

    // 胡牌后解冻:清除其他家的pending(保留可胡的pending给一炮多响)
    game.pendingActions = game.pendingActions.filter(pa => pa.playerId !== player.id);
    if (game.multiHuStarterIndex === undefined) {
      game.multiHuStarterIndex = game.players.findIndex(p => p.id === player.id);
    }
    if (isRobbingKong && game.pendingKongClaim) {
      game.pendingKongClaim.cancelledByHu = true;
    }
    if (!hadPendingForMultiHu) {
      game.pendingActions = [];
    }
    return;  // 等待其他可胡玩家响应
  }

  /**
   * 造反处理
   * 触发条件: 五毒散(见 isFivePoison)
   * 效果: 本局结束,下局倍数×2,造反者成为庄家
   */
  private handleRebel(game: GameState, player: Player): void {
    // 验证是否满足五毒散
    const wildParts = game.customScoringMode?.split('-');
    const wildSuit = wildParts ? wildParts[0] as TileSuit : undefined;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : undefined;

    if (!isFivePoison(
      player.hand.concealedTiles,
      wildSuit,
      wildValue,
      player.hand.exposedMelds.flatMap(meld => meld.tiles || [])
    )) {
      throw new Error('Not eligible for rebel (五毒散 condition not met)');
    }

    // 本局直接结束
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.LAST_PLAYER;
    game.endedAt = Date.now();

    // 记录造反事件(下局倍数×2,由 startGame 统一处理)
    game.rebelEvent = {
      playerId: player.id,
      playerName: player.name,
      newDealerIndex: player.position
    };
    // 不在这里翻倍,startGame 会根据 rebelEvent 统一处理
    // inheritedGlobalMultiplier 由上一轮 endRound 的溢出规则计算
    // 本局结束后 startGame 读取 inheritedGlobalMultiplier 再 ×2(rebelEvent)

    // 造反者成为庄家
    game.dealerIndex = player.position;

    // 广播造反成功
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
        id: Date.now(),
        text: `?? ${player.name}造反成功！下把翻倍！`,
        type: 'special',
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
  }

  /**
   * 梁山聚义:全员投票机制(仅活跃玩家,4人全真人时开启)
   * - 每个活跃玩家可点击一次(之后锁定)
   * - 累积赢分超过被QJ线的玩家:自动视为同意,无否决权
   * - 全部活跃玩家都同意 → 本局结束,下把翻倍
   */
  private handleLiangShan(game: GameState, player: Player): void {
    if (game.phase !== GamePhase.PLAYING) return;
    if (player.status !== PlayerStatus.PLAYING) return;

    // 全局倍数已达8倍上限时,禁止梁山聚义
    if ((game.inheritMultiplier ?? 1) >= 8) return;

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
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
        id: Date.now(),
        text: `?? ${player.name}发起了梁山聚义！`,
        type: 'special',
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }

    // 活跃玩家总数
    const activePlayers = game.players.filter(p => p.status === PlayerStatus.PLAYING);

    // 计算有效投票数:手动投票 + 超过被QJ线的玩家自动同意
    // 被QJ线检查:玩家在本房间的累积有效输赢(去掉与AI的战绩)
    const threshold = game.liangShanThreshold ?? 4000;
    let effectiveVoteCount = game.liangShanVotes.length;

    for (const ap of activePlayers) {
      // 已经手动投票的跳过
      if (game.liangShanVotes.includes(ap.id)) continue;
      // 检查累积有效输赢是否超过被QJ线
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, ap.id);
      if (cumulativeScore > threshold) {
        // 超过被QJ线 → 自动视为同意,无否决权
        effectiveVoteCount++;
        if (!game.liangShanVotes.includes(ap.id)) {
          game.liangShanVotes.push(ap.id); // 标记为已投票
          if (this.wsManager) {
            this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
              id: Date.now() + effectiveVoteCount,
              text: `?? ${ap.name}响应了${player.name}的梁山聚义！`,
              type: 'special',
              timestamp: Date.now(),
              timeLabel: formatBeijingTime()
            });
          }
        }
        console.log(`[LiangShan] ${ap.name} 累积赢分${cumulativeScore}超过QJ线${threshold},自动同意`);
      }
    }

    console.log(`[LiangShan] ${player.name} voted (${effectiveVoteCount}/${activePlayers.length}, threshold: ${threshold})`);

    // 全员投票 → 结束本局,下把翻倍
    if (effectiveVoteCount >= activePlayers.length) {
      console.log(`[LiangShan] All players agreed! Ending round with ×2 multiplier.`);

      // 所有未胡牌玩家标记为输
      for (const p of game.players) {
        if (p.status !== PlayerStatus.WON) {
          p.status = PlayerStatus.LOST;
        }
      }

      // 下局全局倍数 ×2(溢出继承:effective = doubled × roundMultiplier, 超过8倍部分继承)
      const doubled = Math.min((game.inheritMultiplier ?? 1) * 2, 8);
      const roundMul = game.roundMultiplier ?? 1;
      const effective = doubled * roundMul;
      // 全局倍数封顶8,溢出部分继承
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
    // 未全票 → 游戏正常继续,不结束
  }

  /**
   * 等我想一想:冻结其他玩家8秒,给自己思考时间
   * - 每局限定次数(默认3次)
   * - 只有有胡/碰/杠选项时可用
   * - 冻结期间其他家不能操作
   */
  private handleThink(game: GameState, player: Player): void {
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
      // 只有主动点击"想一想"才扣减次数
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
    const freezeTimer = this.freezeTimers.get(game.gameId);
    if (freezeTimer) {
      clearTimeout(freezeTimer);
      this.freezeTimers.delete(game.gameId);
    }
    const botTimer = this.botTimers.get(game.gameId);
    if (botTimer) {
      clearTimeout(botTimer);
      this.botTimers.delete(game.gameId);
    }

    for (const pending of game.pendingActions) {
      pending.expiresAt = Math.max(pending.expiresAt ?? 0, game.thinkFreezeUntil);
    }
    if (game.pengChowConflict) {
      game.pengChowConflict.expiresAt = Math.max(game.pengChowConflict.expiresAt ?? 0, game.thinkFreezeUntil);
    }
    if (game.pendingActions.length > 0 || game.pengChowConflict) {
      this.schedulePendingActionTimeout(game.gameId);
    }

    console.log(`[Think] ${player.name} 使用「等我想一想」,剩余${remaining}次,冻结8秒`);

    // 8秒后自动解冻
    const gameId = game.gameId;
    const expectedPlayerId = player.id;
    this.detachTimer(setTimeout(async () => {
      try {
        const freshGame = await this.getGame(gameId);
        if (!freshGame) return;
        if (freshGame.thinkFreezePlayerId === expectedPlayerId) {
          freshGame.thinkFreezeUntil = undefined;
          freshGame.thinkFreezePlayerId = undefined;
          if (freshGame.pendingActions.length > 0 || freshGame.pengChowConflict) {
            this.schedulePendingActionTimeout(gameId);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
            console.log(`[Think] ${player.name} ????�?è�??—?é—′??“???`);
            return;
          }

          // 【修复】等我想一想超时后:清除触发者自己已过期的pending(胡/碰/杠/过)
          // 让下家(或当前玩家)能正常摸牌,不会因为pending残留而卡住
          const triggerPending = freshGame.pendingActions.find(pa => pa.playerId === expectedPlayerId);
          if (triggerPending && triggerPending.expiresAt && triggerPending.expiresAt < Date.now()) {
            const triggerPlayer = freshGame.players.find(p => p.id === expectedPlayerId);
            if (triggerPlayer) {
              console.log(`[Think] ${triggerPlayer.name} 的思考时间结束,自动过(PASS)过期pending`);
              this.handlePass(freshGame, triggerPlayer);
            }
          }

          if (freshGame.pendingActions.length > 0 || freshGame.pengChowConflict) {
            this.schedulePendingActionTimeout(gameId);
          } else {
            const currentPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (currentPlayer && currentPlayer.status === PlayerStatus.PLAYING) {
              if (this.isPlayerBotControlled(currentPlayer)) {
                this.scheduleBotDiscard(gameId, currentPlayer.id);
              } else {
                // 【修复】人类玩家冻结结束后:主动触发moveToNextPlayer让下家摸牌
                // 否则人类玩家丢牌等待永远没人帮TA"过"
                if (currentPlayer.id === expectedPlayerId) {
                  // 触发者(自己)已经pass了pending,此时无pending → 移到下家摸牌
                  if (!freshGame.pendingActions.length) {
                    await this.moveToNextPlayer(freshGame);
                    await this.persistGame(freshGame);
                    this.broadcastGameState(gameId);
                  }
                }
              }
            }
          }
          await this.persistGame(freshGame);
          this.broadcastGameState(gameId);
          console.log(`[Think] ${player.name} 的思考时间结束`);
        }
      } catch (err) {
        console.error('[Think] Error:', err);
      }
    }, 8000));

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
  private computeSwapChances(game: GameState, playerId: string): number {
    const threshold = game.liangShanThreshold ?? 4000;
    const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, playerId);
    if (cumulativeScore >= 0) return 0;
    const absScore = Math.abs(cumulativeScore);
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

      console.log(`[Swap] ${p1.name} ? ${p2.name} 位置已互换`);
    }

    // 清空已生效的请求
    game.swapRequests = [];
  }

  /**
   * 观赛者请求下局替换某个AI
   */
  public async requestBotReplacement(gameId: string, spectatorId: string, targetBotId: string, playerName: string, userId?: string): Promise<void> {
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
      userId: userId || spectator.userId,
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
      const seatedPlayerId = oldSpectator.id;
      const newPlayer: Player = {
        id: seatedPlayerId,
        userId: req.userId || oldSpectator.userId,
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

      console.log(`[BotReplace] ${oldSpectator.name} → 替换 ${bot.name} 成功, 新玩家ID: ${seatedPlayerId}`);
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
            text: `?? 冷冻解除，现在可以正常吃碰捉冲了！`,
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
              // ?? 修复：bot freeze到期后还有pending残留 → 视为bot没反应 → auto-pass
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

    // ?? 自动进入下一局（正常结束/流局）
    // 延迟一小段时间让客户端展示结算画面，然后自动进入掷骰子阶段
    if (
      finalReason === GameEndReason.LAST_PLAYER
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
    // 浠?MongoDB 鍙姞杞芥湭缁撴潫鐨勬父鎴忥紙鎯版�у姞杞戒笉鍔犺浇鎵�鏈夋父鎴忓埌鍐呭瓨锛?
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

