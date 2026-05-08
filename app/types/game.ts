// Tile definitions
export enum TileSuit {
  DOTS = 'dots',      // 筒
  CHARACTERS = 'wan', // 万
  BAMBOOS = 'tiao',   // 条
  WIND = 'feng',      // 风牌
  DRAGON = 'jian',    // 箭牌
  FLOWER = 'hua'      // 花牌
}

export interface Tile {
  suit: TileSuit;
  value: number; // 1-9 for suits, wind/dragon/flower values
  id: string; // Unique identifier for each physical tile
  isFlower?: boolean; // 花牌标记
  isWild?: boolean;   // 百搭标记
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
  LOST = 'lost'
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
  winOrder: number | null;
  winRound: number | null;
  winTimestamp: number | null;
  score: number;
}

// Game actions
export enum ActionType {
  DRAW = 'draw',
  DISCARD = 'discard',
  CHOW = 'chow',
  PENG = 'peng',
  KONG = 'kong',
  EXTENDED_KONG = 'extended_kong', // 续杠
  CONCEALED_KONG = 'concealed_kong',
  HU = 'hu',
  PASS = 'pass',
  CHEAT_HU = 'cheat_hu',
  REBEL = 'rebel',  // 造反
  LIANG_SHAN = 'liang_shan',  // 梁山聚义
  THINK = 'think'  // 等我想一想
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

export type SpectatorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface SpectatorViewState {
  viewingPlayerId: string | null
  approvedHumanPlayerId?: string | null
  pendingHumanPlayerId?: string | null
  roundNumber: number
  updatedAt: number
}

export interface SpectatorApprovalRequest {
  id: string
  requesterId: string
  requesterName: string
  targetId: string
  targetName: string
  roundNumber: number
  status: SpectatorApprovalStatus
  requestedAt: number
  resolvedAt?: number
}

export interface GameState {
  gameId: string;
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
  spectatorMode?: { playerId: string; viewingPlayerId: string } | null;
  spectatorViews?: Record<string, SpectatorViewState>;
  spectatorApprovalRequests?: SpectatorApprovalRequest[];
  customScoringMode?: string; // 百搭牌标识
  wildTileGroup?: string[];   // 花牌百搭组
  freezeRound?: number;       // 冷冻回合数
}

export interface PendingAction {
  playerId: string;
  availableActions: ActionType[];
  tile?: Tile;
  chowOptions?: string[][];
  selectedChowTileIds?: string[];
  expiresAt: number;
}
