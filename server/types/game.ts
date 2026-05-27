// Tile definitions
export enum TileSuit {
  DOTS = 'dots',      // 筒
  CHARACTERS = 'wan', // 万
  BAMBOOS = 'tiao',   // 条
  WIND = 'feng',      // 风牌
  DRAGON = 'jian',    // 箭牌
  FLOWER = 'hua'      // 花牌
}

// Wind tile values
export enum WindValue {
  EAST = 1,   // 东
  SOUTH = 2,  // 南
  WEST = 3,   // 西
  NORTH = 4   // 北
}

// Dragon tile values
export enum DragonValue {
  RED = 1,    // 红中
  GREEN = 2,  // 发财
  WHITE = 3   // 白板
}

// Flower tile values
export enum FlowerValue {
  SPRING = 1,  // 春
  SUMMER = 2,  // 夏
  AUTUMN = 3,  // 秋
  WINTER = 4,  // 冬
  PLUM = 5,    // 梅
  ORCHID = 6,  // 兰
  BAMBOO_F = 7, // 竹 (花牌)
  CHRYSANTHEMUM = 8 // 菊
}

export interface Tile {
  suit: TileSuit;
  value: number; // 1-9 for suits, WindValue/DragonValue/FlowerValue for others
  id: string; // Unique identifier for each physical tile
  isFlower?: boolean; // 花牌标记
  isWild?: boolean;   // 百搭标记 (runtime set)
}

// Meld types
export enum MeldType {
  SEQUENCE = 'sequence',    // 顺子
  TRIPLET = 'triplet',      // 坎
  KONG = 'kong',            // 杠
  CONCEALED_KONG = 'concealed_kong', // 暗杠
  PAIR = 'pair'             // 对子
}

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  isConcealed: boolean;
  sourceTileId?: string;
  sourcePosition?: number; // 0-3: 来源玩家位置（吃碰杠自谁）
}

// Player hand
export interface PlayerHand {
  concealedTiles: Tile[];
  exposedMelds: Meld[];
  discardedTiles: Tile[];
}

// Player state
export enum PlayerStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
  SPECTATING = 'spectating'
}

export interface Player {
  id: string;
  userId?: string;
  name: string;
  position: number; // 0-3
  hand: PlayerHand;
  status: PlayerStatus;
  isDealer: boolean;
  isTing: boolean; // Listening/ready to win
  missingSuit: TileSuit | null; // Which suit is missing (缺门)
  windScore: number; // Kong scores (刮风)
  rainScore: number; // Concealed kong scores (下雨)
  wonFan: number; // Fan count when won
  winHandType?: string; // 胡牌牌型名称（如"普通胡"、"碰碰胡"、"清一色"等）
  winOrder: number | null;
  winRound: number | null;
  winTimestamp: number | null;
  isSelfDrawn?: boolean; // 是否自摸
  discarderId?: string; // 捉冲时放冲者ID
  winningScoreBreakdown?: WinningScoreBreakdown;
  score: number;
}

export interface WinningScoreBreakdown {
  baseFan: number;
  extraMultipliers: number;
  diceMultiplier: number;
  inheritMultiplier: number;
  effectiveMultiplier: number;
  settlementMultiplier: number;
  finalPoints: number;
  details: string[];
}

// Game actions
export enum ActionType {
  DRAW = 'draw',
  DISCARD = 'discard',
  CHOW = 'chow',     // 吃牌
  PENG = 'peng',
  KONG = 'kong',
  EXTENDED_KONG = 'extended_kong', // 续杠
  CONCEALED_KONG = 'concealed_kong',
  HU = 'hu',
  PASS = 'pass',
  CHEAT_HU = 'cheat_hu',
  REBEL = 'rebel',  // 造反
  LIANG_SHAN = 'liang_shan',  // 梁山聚义（投票）
  THINK = 'think',  // 等我想一想
}

export interface GameAction {
  playerId: string;
  type: ActionType;
  tile?: Tile;
  tiles?: Tile[];
  timestamp: number;
}

// Winning hand types
export enum WinType {
  STANDARD = 'standard',           // 4 melds + 1 pair
}

// Fan types
export interface FanCalculation {
  baseFan: number;
  additionalFans: string[]; // Names of additional fans
  handTypeFan: string | null;
  totalFan: number;
  fanName: string;
}

// Game state
export enum GamePhase {
  WAITING = 'waiting',     // Waiting for players
  STARTING = 'starting',   // Initializing game
  PLAYING = 'playing',     // Active game
  REVEAL = 'reveal',       // Revealing winning hands (5s)
  CHA_JIAO = 'cha_jiao',  // Checking ting
  ENDED = 'ended'
}

export enum GameEndReason {
  WALL_EXHAUSTED = 'wall_exhausted',
  LAST_PLAYER = 'last_player',
  OWNER_LEFT = 'owner_left',
  EMPTY_ROOM = 'empty_room'
}

export interface PendingKongClaim {
  playerId: string;
  tile: Tile;
  cancelledByHu?: boolean;
}

export interface RebelEvent {
  playerId: string;
  playerName: string;
  newDealerIndex: number;
}

export interface RoundStat {
  roundNumber: number;
  scores: Record<string, number>;  // playerId → 本局得分
  winners: string[];  // 胡牌玩家ID
  selfDraws: string[];  // 自摸玩家ID
  diceMultiplier: number;
  inheritMultiplier: number;
  effectiveMultiplier: number;
  settlementMultiplier: number;
  overflowCarryMultiplierNextRound: number;
  transfers: Array<{
    fromPlayerId: string;
    fromPlayerName: string;
    toPlayerId: string;
    toPlayerName: string;
    amount: number;
    reason: string;
  }>;
  specialEvents?: Array<{
    type: 'leading_brother';
    fromPlayerId: string;
    fromPlayerName: string;
    totalAmount: number;
    amountPerPlayer: number;
  }>;
}

export type SpectatorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SpectatorViewState {
  viewingPlayerId: string | null;
  approvedHumanPlayerId?: string | null;
  pendingHumanPlayerId?: string | null;
  roundNumber: number;
  updatedAt: number;
}

export interface SpectatorApprovalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  roundNumber: number;
  status: SpectatorApprovalStatus;
  requestedAt: number;
  resolvedAt?: number;
}

export interface GameState {
  gameId: string;
  roomNumber?: string; // 4位随机房间号
  phase: GamePhase;
  endReason: GameEndReason | null;
  players: Player[];
  wall: Tile[];
  currentPlayerIndex: number;
  dealerIndex: number;
  discardPile: Tile[];
  lastDiscardPlayerId?: string;
  lastDiscardPosition?: number;
  actionHistory: GameAction[];
  winnersCount: number;
  roundNumber: number;
  currentRound?: number;
  createdAt: number;
  lastActionTime: number;
  endedAt?: number;
  finalScores?: Record<string, number>;
  pendingActions: PendingAction[];
  pendingKongClaim?: PendingKongClaim;
  multiHuStarterIndex?: number;
  customScoringMode?: string;
  wildTileGroup?: string[];
  freezeRound?: number;
  /** 百搭冷冻：打出百搭的玩家ID，一圈后解除 */
  freezePlayerId?: string | null;
  /** 百搭冷冻一圈完成标记（用于跨回合追踪） */
  freezeComplete?: boolean;
  // 倍数/继承状态
  dice?: [number, number];
  roundMultiplier?: number;
  inheritMultiplier?: number;
  inheritedGlobalMultiplier?: number;
  globalMultiplier?: number;
  rebelEvent?: RebelEvent;
  liangShanVotes?: string[];  // 梁山聚义投票者ID列表
  pendingRemovals?: string[];  // 下局要移除的AI玩家ID
  pendingReplacements?: { spectatorId: string; aiPlayerId: string; spectatorName?: string }[];  // 下局替换AI的请求
  settleRequested?: boolean;  // 是否已请求退房结算
  botTakeoverPlayers?: string[];  // 本局被AI接管的玩家ID
  // 每局统计追踪
  roundStats?: RoundStat[];
  // 可配置参数
  hesitationWindow?: number;    // 决策犹豫期（毫秒），默认5000。统一控制：出牌后抢牌窗口、AI摸牌前冻结、人类摸牌前冻结
  diceRollCount?: number;     // 掷骰次数，默认2
  liangShanThreshold?: number;  // 梁山聚义被QJ线（累积赢分阈值），默认4000
  thinkChances?: number;      // 等我想一想机会次数，默认3
  settlementMultiplier?: number;  // 结算膨胀倍数，默认10
  maxBots?: number;             // 最大AI玩家数，默认3（0=禁止AI加入）
  minPlayers?: number;          // 最少开局人数，默认4
  thinkUsage?: Record<string, number>;  // 每位玩家本局已使用「等」次数
  thinkFreezeUntil?: number;  // 等我想一想冻结结束时间戳
  thinkFreezePlayerId?: string;  // 触发等我想一想的玩家ID
  // 谢谢带头大哥追踪
  consecutiveDiscards?: { suit: string; value: number; playerIds: string[] } | null;
  leadingBrotherEvent?: { firstPlayerId: string; tileKey: string } | null;
  /** 通用审批流程：低优先级玩家请求，高优先级玩家确认 */
  pengChowConflict?: {
    requesterId: string;
    requesterAction: 'chow' | 'peng' | 'kong';
    tile: Tile;
    requesterTileIds?: string[];
    timestamp: number;
    approvalQueue?: Array<{ playerId: string; availableActions: ActionType[] }>;
    currentStagePlayerIds?: string[];
    expiresAt?: number;
  } | null;
  // 下局庄家（上局首胡者或一炮多响放冲者）
  nextDealerId?: string | null;
  // 被聚义QJ线突破提醒（每局刷新）
  qjAlerts?: { playerId: string; playerName: string; score: number }[];
  // 互包关系（三口/四口）
  // 输家换位置
  swapRequests?: { playerId: string; targetId: string; requestedAt: number }[];  // 待生效换位请求
  swapChances?: Record<string, number>;  // 每位玩家剩余换位次数
  // 胜者观战模式
  spectatorMode?: { playerId: string; viewingPlayerId: string } | null;
  spectatorViews?: Record<string, SpectatorViewState>;
  spectatorApprovalRequests?: SpectatorApprovalRequest[];
  // 观赛者替换AI请求队列（每局 startGame 时处理）
  botReplacementQueue?: { spectatorId: string; spectatorName: string; targetBotId: string; userId?: string; requestedAt: number }[];
  huSelectionLocks?: Record<string, number>;
  trainingRoundStartSnapshot?: any;
  // 吃碰排斥规则状态（每局重置）
  chowPongExclusion?: Record<string, { firstActionSuit: string | null; firstActionType: 'chow' | 'pong' | null }>;
  /** 本回合是否已摸牌（防同回合连续摸牌） */
  drawnThisTurn?: boolean;
}

export interface PendingAction {
  playerId: string;
  availableActions: ActionType[];
  tile?: Tile;
  chowOptions?: string[][];
  selectedChowTileIds?: string[];
  expiresAt: number;
}

// Scoring
export interface WinResult {
  playerId: string;
  winType: WinType;
  fan: FanCalculation;
  isSelfDrawn: boolean;
  isKongFlower: boolean; // 杠上开花
  isRobbingKong: boolean; // 抢杠
  score: number;
}

export interface GameResult {
  winners: WinResult[];
  scores: Record<string, number>; // playerId -> final score
  kongScores: Record<string, number>; // Kong earnings
  chaJiaoPenalties: Record<string, number>; // Penalties from cha jiao
  flowerPigs: string[]; // Players who are flower pigs
  nonTingPlayers: string[]; // Players not in ting
}

// API request/response types
export interface CreateGameRequest {
  playerName: string;
}

export interface CreateGameResponse {
  gameId: string;
  playerId: string;
}

export interface JoinGameRequest {
  gameId: string;
  playerName: string;
}

export interface JoinGameResponse {
  playerId: string;
  position: number;
}

export interface GameActionRequest {
  gameId: string;
  playerId: string;
  action: ActionType;
  tileId?: string;
  tileIds?: string[];
}

export interface GameStateResponse {
  game: GameState;
  playerView: PlayerHand; // Current player's view
  availableActions: ActionType[];
}
