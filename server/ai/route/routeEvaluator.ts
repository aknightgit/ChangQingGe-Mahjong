import { TileSuit, type Tile } from '../../types/game'
import { groupTiles, isDragon, isHonor, isWind } from '../../utils/tiles'
import { detectDecisionPhase } from './phaseDetector'
import type {
  RouteEvaluationInput,
  RouteFeatureSummary,
  RouteScore,
  RouteState,
  RouteKind,
} from './types'

const NUMBER_SUITS: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
const ROUTES: RouteKind[] = ['MENQING_SPEED', 'OPEN_SPEED', 'HALF_FLUSH', 'ALL_PUNGS', 'HONOR_HEAVY']

function countAdjacentPartners(tile: Tile, hand: Tile[]): number {
  if (!NUMBER_SUITS.includes(tile.suit)) return 0
  return hand.filter(candidate =>
    candidate.id !== tile.id &&
    candidate.suit === tile.suit &&
    Math.abs(candidate.value - tile.value) > 0 &&
    Math.abs(candidate.value - tile.value) <= 2
  ).length
}

function buildFeatureSummary(input: RouteEvaluationInput): RouteFeatureSummary {
  const { game, player, hand } = input
  const suitCounts: Record<string, number> = {}
  const groups = groupTiles(hand)
  let pairCount = 0
  let tripletCount = 0
  let isolatedCount = 0
  let honorCount = 0
  let honorPairCount = 0
  let wildCount = 0

  for (const tile of hand) {
    if (tile.isWild) wildCount++
    if (NUMBER_SUITS.includes(tile.suit)) {
      suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1
    }
    if (isHonor(tile)) honorCount++
  }

  for (const [key, tiles] of groups.entries()) {
    if (tiles.length >= 2) pairCount++
    if (tiles.length >= 3) tripletCount++
    const sample = tiles[0]
    if (isHonor(sample) && tiles.length >= 2) honorPairCount++
    if (tiles.length === 1 && countAdjacentPartners(sample, hand) === 0) isolatedCount++
  }

  let sequenceLikeCount = 0
  for (const tile of hand) {
    if (countAdjacentPartners(tile, hand) > 0) sequenceLikeCount++
  }

  const orderedSuits = NUMBER_SUITS
    .map(suit => ({ suit, count: suitCounts[suit] || 0 }))
    .sort((a, b) => b.count - a.count)

  const longestSuit = orderedSuits[0]?.count ? orderedSuits[0].suit : null
  const longestSuitCount = orderedSuits[0]?.count || 0
  const secondSuitCount = orderedSuits[1]?.count || 0
  const shortestSuitEntry = [...orderedSuits].reverse().find(entry => entry.count > 0) || null
  const shortestSuit = shortestSuitEntry?.suit || null
  const shortestSuitCount = shortestSuitEntry?.count || 0

  const upstream = game.players[(player.position + 3) % game.players.length]
  const upstreamSuitCounts: Record<string, number> = {}
  for (const discard of upstream?.hand.discardedTiles || []) {
    if (NUMBER_SUITS.includes(discard.suit)) {
      upstreamSuitCounts[discard.suit] = (upstreamSuitCounts[discard.suit] || 0) + 1
    }
  }
  const upstreamVoidSuit = NUMBER_SUITS
    .map(suit => ({ suit, count: upstreamSuitCounts[suit] || 0 }))
    .sort((a, b) => b.count - a.count)[0]
  const allOpponentsAvoidSuit = NUMBER_SUITS.find(suit =>
    game.players
      .filter(candidate => candidate.id !== player.id)
      .every(candidate => (candidate.hand.discardedTiles || []).some(discard => discard.suit === suit))
  ) || null

  let liveHonorCount = 0
  for (const suit of [TileSuit.WIND, TileSuit.DRAGON]) {
    const maxValue = suit === TileSuit.WIND ? 4 : 3
    for (let value = 1; value <= maxValue; value++) {
      const visible = (game.discardPile || []).filter(tile => tile.suit === suit && tile.value === value).length
        + game.players.reduce((sum, candidate) => sum + candidate.hand.exposedMelds.reduce(
          (meldSum, meld) => meldSum + meld.tiles.filter(tile => tile.suit === suit && tile.value === value).length,
          0
        ), 0)
      if (visible < 3) liveHonorCount++
    }
  }

  return {
    longestSuit,
    longestSuitCount,
    shortestSuit,
    shortestSuitCount,
    secondSuitCount,
    pairCount,
    tripletCount,
    sequenceLikeCount,
    isolatedCount,
    honorCount,
    honorPairCount,
    wildCount,
    upstreamVoidSuit: upstreamVoidSuit && upstreamVoidSuit.count >= 2 ? upstreamVoidSuit.suit : null,
    allOpponentsAvoidSuit,
    liveHonorCount,
  }
}

function evaluateSingleRoute(route: RouteKind, input: RouteEvaluationInput, features: RouteFeatureSummary): RouteScore {
  const reasons: string[] = []
  let score = 0
  let targetSuit: TileSuit | null = null

  switch (route) {
    case 'MENQING_SPEED':
      score += 24
      score += Math.max(0, 10 - input.shanten * 3.5)
      score += input.effectiveTiles * 0.28
      score += features.pairCount * 2.4
      score += features.sequenceLikeCount * 0.45
      score -= features.isolatedCount * 1.8
      score -= input.player.hand.exposedMelds.length * 2.5
      if (features.upstreamVoidSuit) {
        reasons.push('upstream_void_suit')
        score += 1.5
      }
      break

    case 'OPEN_SPEED':
      score += 8
      score += Math.max(0, 8 - input.shanten * 2.5)
      score += input.effectiveTiles * 0.18
      score += features.tripletCount * 2.2
      score += features.pairCount * 1.4
      score += input.tableThreat * 7
      score += input.player.hand.exposedMelds.length * 1.6
      score -= Math.max(0, features.isolatedCount - 1) * 0.8
      break

    case 'HALF_FLUSH':
      targetSuit = features.longestSuit
      score += features.longestSuitCount * 3.4
      score += features.honorCount * 1.6
      score += features.honorPairCount * 1.5
      score += features.wildCount * 2.2
      score -= features.secondSuitCount * 1.9
      if (features.upstreamVoidSuit && features.upstreamVoidSuit === targetSuit) {
        reasons.push('upstream_void_target')
        score += 3
      }
      if (features.allOpponentsAvoidSuit && features.allOpponentsAvoidSuit === targetSuit) {
        reasons.push('global_void_target')
        score += 2
      }
      break

    case 'ALL_PUNGS':
      score += features.pairCount * 4.4
      score += features.tripletCount * 5.2
      score += features.honorPairCount * 2.5
      score += features.wildCount * 2.8
      score -= features.sequenceLikeCount * 0.9
      score -= Math.max(0, features.secondSuitCount - 3) * 0.6
      break

    case 'HONOR_HEAVY':
      score += features.honorCount * 4
      score += features.honorPairCount * 3.5
      score += features.wildCount * 2.6
      score += features.liveHonorCount * 0.4
      score -= (features.longestSuitCount + features.secondSuitCount) * 0.7
      if (features.honorCount < 6) {
        score -= 11
      }
      if (features.longestSuitCount >= 4) {
        score -= 8
      }
      if (features.longestSuitCount + features.honorCount >= 8) {
        score -= 6
      }
      if (features.honorCount >= 6) {
        reasons.push('dense_honors')
      }
      break
  }

  if (input.wallRemaining <= 28 && route !== 'MENQING_SPEED') {
    score += 1.5
  }
  if (input.tableThreat >= 0.8 && route === 'OPEN_SPEED') {
    score += 2.5
  }

  return { route, score, targetSuit, reasons }
}

export function evaluateRouteState(input: RouteEvaluationInput): RouteState {
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const phase = detectDecisionPhase({
    estimatedRound,
    shanten: input.shanten,
    tableThreat: input.tableThreat,
    wallRemaining: input.wallRemaining,
    meldCount: input.player.hand.exposedMelds.length,
  })
  const features = buildFeatureSummary(input)
  const routeScores = ROUTES
    .map(route => evaluateSingleRoute(route, input, features))
    .sort((a, b) => b.score - a.score)

  const current = routeScores[0]
  const secondary = routeScores[1] || null
  const gap = current && secondary ? current.score - secondary.score : 0
  const lockLevel: 0 | 1 | 2 =
    phase === 'RUSH' && gap >= 4 ? 2 :
    (phase === 'COMMIT' || phase === 'RUSH') && gap >= 2.5 ? 1 :
    0

  return {
    phase,
    current: current?.route || 'MENQING_SPEED',
    secondary: secondary?.route || null,
    confidence: gap,
    lockLevel,
    targetSuit: current?.targetSuit || null,
    routeScores,
    features,
  }
}
