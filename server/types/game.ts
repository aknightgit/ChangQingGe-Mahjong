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
  LOST = 'lost'
}

export interface Player {
  id: string;
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
  winOrder: number | null;
  winRound: number | null;
  winTimestamp: number | null;
  score: number;
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
  SEVEN_PAIRS = 'seven_pairs'      // 七对
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
}

export interface RebelEvent {
  playerId: string;
  playerName: string;
  newDealerIndex: number;
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
  actionHistory: GameAction[];
  winnersCount: number;
  roundNumber: number;
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
  // 倍数/继承状态
  dice?: [number, number];
  roundMultiplier?: number;
  globalMultiplier?: number;
  inheritedGlobalMultiplier?: number;
  rebelEvent?: RebelEvent;
  liangShanVotes?: string[];  // 梁山聚义投票者ID列表
  // 可配置参数
  freezeDurationMs?: number;  // 冻结时长（毫秒），默认1000
  diceRollCount?: number;     // 掷骰次数，默认2
}

export interface PendingAction {
  playerId: string;
  availableActions: ActionType[];
  tile?: Tile;
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
