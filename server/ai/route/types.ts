import type { GameState, Player, Tile, TileSuit } from '../../types/game'

export type DecisionPhase = 'OBSERVE' | 'COMMIT' | 'RUSH' | 'DEFENSE'

export type RouteKind =
  | 'MENQING_SPEED'
  | 'OPEN_SPEED'
  | 'HALF_FLUSH'
  | 'ALL_PUNGS'
  | 'HONOR_HEAVY'

export interface RouteFeatureSummary {
  longestSuit: TileSuit | null
  longestSuitCount: number
  shortestSuit: TileSuit | null
  shortestSuitCount: number
  secondSuitCount: number
  pairCount: number
  tripletCount: number
  sequenceLikeCount: number
  isolatedCount: number
  honorCount: number
  honorPairCount: number
  wildCount: number
  upstreamVoidSuit: TileSuit | null
  upstreamRejectedSuit: TileSuit | null
  allOpponentsAvoidSuit: TileSuit | null
  liveHonorCount: number
  opponentOpenMelds: number
  downstreamPressure: number
  oneSuitOpponentCount: number
  fastOpenOpponentCount: number
  bigOpenOpponentCount: number
  pureFlushUpgradeReady: boolean
  weakHonorPairCount: number
}

export interface RouteEvaluationInput {
  game: GameState
  player: Player
  hand: Tile[]
  shanten: number
  effectiveTiles: number
  tableThreat: number
  wallRemaining: number
  previousRouteState?: RouteState | null
  policy?: any
}

export interface RouteScore {
  route: RouteKind
  score: number
  targetSuit: TileSuit | null
  reasons: string[]
}

export interface RouteState {
  policy?: any
  phase: DecisionPhase
  current: RouteKind
  secondary: RouteKind | null
  confidence: number
  lockLevel: 0 | 1 | 2
  stableTurns: number
  switchCount: number
  evidenceCounter: number
  targetSuit: TileSuit | null
  routeScores: RouteScore[]
  features: RouteFeatureSummary
}

export interface RouteDiscardInput {
  tile: Tile
  hand: Tile[]
  player: Player
  game: GameState
  routeState: RouteState
  candidateShanten: number
  candidateEffective: number
  discardDanger: number
  winningTiles: number
  baselineScore: number
  afterRouteState: RouteState
}
