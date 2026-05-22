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

function getPolicyValue(policy: any, key: string, fallback = 0): number {
  const raw = Number(policy?.[key] ?? fallback)
  return Number.isFinite(raw) ? raw : fallback
}

function getRouteBucketBoost(policy: any, handQuality: number, isHighMult: boolean, route: RouteKind): number {
  if (handQuality < 5) return 0
  const multPrefix = isHighMult ? 'multHigh' : 'multLow'
  if (route === 'ALL_PUNGS') {
    return getPolicyValue(policy, `${multPrefix}Hand${handQuality}AllPungs`)
  }
  if (route === 'HALF_FLUSH') {
    return getPolicyValue(policy, `${multPrefix}Hand${handQuality}HalfFlush`)
  }
  if (route === 'HALF_FLUSH') return 0
  return 0
}

function getPureFlushBucketBoost(policy: any, handQuality: number, isHighMult: boolean): number {
  if (handQuality < 6) return 0
  const multPrefix = isHighMult ? 'multHigh' : 'multLow'
  return getPolicyValue(policy, `${multPrefix}Hand${handQuality}PureFlush`)
}

function getWildRouteBoost(policy: any, wildCount: number, route: 'meld' | 'flush' | 'honors' | 'allPungs'): number {
  if (wildCount <= 0) return 0
  const bucket = wildCount >= 3 ? 'wild3' : wildCount === 2 ? 'wild2' : 'wild1'
  const suffix =
    route === 'meld' ? 'RouteMeldPush' :
    route === 'flush' ? 'RouteFlushBoost' :
    route === 'honors' ? 'RouteHonorsBoost' :
    'RouteAllPungsBoost'
  return getPolicyValue(policy, `${bucket}${suffix}`)
}

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game?.inheritMultiplier ?? game?.inheritedGlobalMultiplier ?? 1
  const round = game?.roundMultiplier ?? 1
  return Math.min(inherit * round, 8)
}

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
  let weakHonorPairCount = 0
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
    if (isHonor(sample) && tiles.length === 2) weakHonorPairCount++
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
  const downstream = game.players[(player.position + 1) % game.players.length]
  const upstreamDiscards = (upstream?.hand.discardedTiles || []).filter(discard => NUMBER_SUITS.includes(discard.suit))
  const upstreamSuitCounts: Record<string, number> = {}
  const upstreamConsecutiveSuitCounts: Record<string, number> = {}
  for (const discard of upstreamDiscards) {
    upstreamSuitCounts[discard.suit] = (upstreamSuitCounts[discard.suit] || 0) + 1
  }
  for (let index = 0; index < upstreamDiscards.length - 1; index++) {
    const current = upstreamDiscards[index]
    const next = upstreamDiscards[index + 1]
    if (!current || !next || current.suit !== next.suit) continue
    upstreamConsecutiveSuitCounts[current.suit] = (upstreamConsecutiveSuitCounts[current.suit] || 0) + 1
  }
  const upstreamVoidSuit = NUMBER_SUITS
    .map(suit => ({
      suit,
      count: upstreamSuitCounts[suit] || 0,
      consecutive: upstreamDiscards.some((discard, index) =>
        discard.suit === suit &&
        upstreamDiscards[index + 1]?.suit === suit
      )
    }))
    .sort((a, b) => (Number(b.consecutive) - Number(a.consecutive)) || (b.count - a.count))[0]
  const upstreamRejectedSuit = NUMBER_SUITS
    .map(suit => ({
      suit,
      runCount: upstreamConsecutiveSuitCounts[suit] || 0,
      count: upstreamSuitCounts[suit] || 0,
    }))
    .sort((a, b) => b.runCount - a.runCount || b.count - a.count)[0]
  const allOpponentsAvoidSuit = NUMBER_SUITS.find(suit =>
    game.players
      .filter(candidate => candidate.id !== player.id)
      .every(candidate => (candidate.hand.discardedTiles || []).some(discard => discard.suit === suit))
  ) || null
  const opponents = game.players.filter(candidate => candidate.id !== player.id)
  const opponentOpenMelds = opponents.reduce((sum, candidate) => sum + (candidate.hand.exposedMelds?.length || 0), 0)
  const fastOpenOpponentCount = opponents.filter(candidate =>
    (candidate.hand.exposedMelds?.length || 0) >= 2 || !!candidate.isTing
  ).length
  const bigOpenOpponentCount = opponents.filter(candidate => {
    const melds = candidate.hand.exposedMelds || []
    if (melds.length >= 3) return true
    let honorMelds = 0
    const suitSet = new Set<TileSuit>()
    for (const meld of melds) {
      for (const tile of meld.tiles || []) {
        if (isHonor(tile)) honorMelds++
        if (NUMBER_SUITS.includes(tile.suit)) suitSet.add(tile.suit)
      }
    }
    return honorMelds >= 3 || (melds.length >= 2 && suitSet.size === 1)
  }).length
  const downstreamPressure =
    (downstream?.hand.exposedMelds?.length || 0) * 0.45 +
    (downstream?.isTing ? 0.9 : 0)
  const oneSuitOpponentCount = opponents.filter(candidate => {
    const numberSuits = new Set<TileSuit>()
    let numberedTiles = 0
    for (const meld of candidate.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (!NUMBER_SUITS.includes(tile.suit)) continue
        numberSuits.add(tile.suit)
        numberedTiles++
      }
    }
    return numberedTiles >= 3 && numberSuits.size === 1
  }).length

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

  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const pureFlushUpgradeReady =
    longestSuitCount >= 10 &&
    secondSuitCount === 0 &&
    honorPairCount >= 1 &&
    honorCount <= 2 &&
    weakHonorPairCount >= 1 &&
    estimatedRound <= 15 &&
    input.tableThreat <= 0.58 &&
    opponentOpenMelds <= 3 &&
    downstreamPressure <= 0.75 &&
    oneSuitOpponentCount === 0 &&
    effectiveGlobalMultiplier <= 3

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
    upstreamVoidSuit: upstreamVoidSuit && (upstreamVoidSuit.consecutive || upstreamVoidSuit.count >= 2) ? upstreamVoidSuit.suit : null,
    upstreamRejectedSuit: upstreamRejectedSuit && upstreamRejectedSuit.runCount >= 1 ? upstreamRejectedSuit.suit : null,
    allOpponentsAvoidSuit,
    liveHonorCount,
    opponentOpenMelds,
    fastOpenOpponentCount,
    bigOpenOpponentCount,
    downstreamPressure,
    oneSuitOpponentCount,
    pureFlushUpgradeReady,
    weakHonorPairCount,
  }
}

function evaluateSingleRoute(route: RouteKind, input: RouteEvaluationInput, features: RouteFeatureSummary): RouteScore {
  const reasons: string[] = []
  let score = 0
  let targetSuit: TileSuit | null = null
  const policy = input.policy ?? input.previousRouteState?.policy ?? null
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(input.game)
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const handQuality = features.longestSuitCount >= 7 ? 7 : features.longestSuitCount >= 6 ? 6 : features.longestSuitCount >= 5 ? 5 : 0
  const handRouteBias =
    handQuality >= 7 ? getPolicyValue(policy, 'hand7RouteBias') :
    handQuality >= 6 ? getPolicyValue(policy, 'hand6RouteBias') :
    handQuality >= 5 ? getPolicyValue(policy, 'hand5RouteBias') :
    0
  const isHighMult = effectiveGlobalMultiplier >= 4
  const routeBucketBoost = getRouteBucketBoost(policy, handQuality, isHighMult, route)
  const pureFlushBucketBoost = getPureFlushBucketBoost(policy, handQuality, isHighMult)
  const earlyPairHeavy = estimatedRound <= 5 && features.pairCount >= 4
  const noWildOpenPush = features.wildCount === 0
  const multiWildMenqingPush = features.wildCount >= 2
  const oneWildLongSuitPivot = features.wildCount === 1 && features.longestSuitCount >= 6
  const suitedPairCount = Math.max(0, features.pairCount - features.honorPairCount)
  const qingPengReady =
    features.longestSuitCount >= 8 &&
    features.secondSuitCount === 0 &&
    features.honorCount <= 2
  const hunPengReady =
    features.longestSuitCount >= 6 &&
    features.honorCount >= 2 &&
    features.secondSuitCount <= 1
  const upstreamRejectedLongSuit =
    !!features.upstreamRejectedSuit &&
    features.longestSuit === features.upstreamRejectedSuit &&
    features.longestSuitCount >= 6

  switch (route) {
    case 'MENQING_SPEED':
      score += 9
      score += Math.max(0, 10 - input.shanten * 3.5)
      score += input.effectiveTiles * 0.28
      score += features.pairCount * 2.4
      score += features.sequenceLikeCount * 0.45
      score += Math.max(0, features.longestSuitCount - 4) * 0.7
      score -= features.isolatedCount * 1.8
      score -= input.player.hand.exposedMelds.length * 3.2
      score -= Math.max(0, features.longestSuitCount - 6) * 1.1
      score -= Math.max(0, features.pairCount - 3) * 1.3
      score -= input.tableThreat * 4
      score -= features.opponentOpenMelds * 1.35
      score -= features.downstreamPressure * 2.2
      score -= Math.max(0, effectiveGlobalMultiplier - 1) * 1.9
      if (noWildOpenPush) score -= 2.6
      if (oneWildLongSuitPivot) score -= 0.9
      if (upstreamRejectedLongSuit) score -= 2.4
      if (earlyPairHeavy) score -= 3.8
      if (multiWildMenqingPush) score += 2.8
      if (input.player.hand.exposedMelds.length === 0) score += 3
      if (input.shanten <= 2 && features.isolatedCount <= 2) score += 2.5
      if (features.upstreamVoidSuit) {
        reasons.push('upstream_void_suit')
        score += 1.5
      }
      score += getPolicyValue(policy, 'wallEarlySpeedPush') * 0.8
      break

    case 'OPEN_SPEED':
      score += 8
      score += Math.max(0, 8 - input.shanten * 2.5)
      score += input.effectiveTiles * 0.22
      score += features.tripletCount * 2.2
      score += features.pairCount * 1.4
      score += Math.max(0, features.longestSuitCount - features.secondSuitCount) * 0.7
      score += input.tableThreat * 8
      score += features.downstreamPressure * 4.2
      score += features.opponentOpenMelds * 1.4
      score += input.player.hand.exposedMelds.length * 1.6
      score += getWildRouteBoost(policy, features.wildCount, 'meld') * 3.5
      score += getPolicyValue(policy, 'wallEarlySpeedPush') * 1.1
      score += getPolicyValue(policy, 'wallMidBalance') * 0.8
      score += Math.max(0, effectiveGlobalMultiplier - 1) * 2.1
      if (noWildOpenPush) score += 2.4
      if (oneWildLongSuitPivot) score += 1.2
      if (upstreamRejectedLongSuit) {
        reasons.push('upstream_rejected_long_suit')
        score += 3.2
      }
      if (earlyPairHeavy) {
        reasons.push('early_pair_heavy_open_push')
        score += 2.1
      }
      if (multiWildMenqingPush) score -= 1.2
      score -= Math.max(0, features.isolatedCount - 1) * 0.8
      if (input.shanten <= 2) score += 2.4
      break

    case 'HALF_FLUSH':
      targetSuit = features.longestSuit
      score += features.longestSuitCount * 4.1
      score += features.honorCount * 1.6
      score += features.honorPairCount * 1.5
      score += features.wildCount * 2.2
      score += getPolicyValue(policy, 'halfFlushWeight') * 4.5
      score += getWildRouteBoost(policy, features.wildCount, 'flush') * 4.2
      score += routeBucketBoost * (2.6 + handRouteBias)
      score += pureFlushBucketBoost * (features.secondSuitCount === 0 ? 2.2 : 1.1)
      score -= features.secondSuitCount * 2.5
      if (hunPengReady) score += getPolicyValue(policy, 'hunPengPursuit') * (3.8 + suitedPairCount * 0.35)
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (2.4 + pureFlushBucketBoost * 0.6)
      score += getPolicyValue(policy, 'pureFlushPursuit') * Math.max(0, features.longestSuitCount - 6) * 0.8
      if (features.longestSuitCount >= 9) {
        reasons.push('half_flush_nine_tiles')
        score += 16
      } else if (features.longestSuitCount >= 7) {
        reasons.push('half_flush_seven_tiles')
        score += 10
      } else if (features.longestSuitCount < 6) {
        score -= 6
      }
      if (features.upstreamVoidSuit && features.upstreamVoidSuit === targetSuit) {
        reasons.push('upstream_void_target')
        score += 3
      }
      if (features.upstreamRejectedSuit && features.upstreamRejectedSuit === targetSuit && features.longestSuitCount >= 6) {
        reasons.push('upstream_rejected_target')
        score += 2.4
      }
      if (features.allOpponentsAvoidSuit && features.allOpponentsAvoidSuit === targetSuit) {
        reasons.push('global_void_target')
        score += 2
      }
      if (features.wildCount === 0) score += 1.1
      score += features.oneSuitOpponentCount * 0.8
      if (features.pureFlushUpgradeReady) {
        reasons.push('pure_flush_upgrade_ready')
        score += 8.5
      }
      break

    case 'ALL_PUNGS':
      const _ap_pursuitVal = getPolicyValue(policy, 'allPungsPursuit')
      const _ap_isAgg = _ap_pursuitVal >= 1.2  // 高意愿→更激进
      score += features.pairCount * (5.2 + (_ap_isAgg ? 4.0 : 0))
      score += features.tripletCount * (5.8 + (_ap_isAgg ? 3.5 : 0))
      score += features.honorPairCount * (2.5 + (_ap_isAgg ? 3.0 : 0))
      score += features.wildCount * (2.8 + (_ap_isAgg ? 3.5 : 0))
      score += _ap_pursuitVal * 8.5
      score += getWildRouteBoost(policy, features.wildCount, 'allPungs') * 4.8
      score += routeBucketBoost * (3.0 + handRouteBias)
      score += getPolicyValue(policy, 'sequenceVsTripletBias') * Math.max(0, features.tripletCount - features.sequenceLikeCount * 0.25) * 1.2
      score -= features.sequenceLikeCount * 1.8
      score -= Math.max(0, features.secondSuitCount - 3) * 0.6
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (6.2 + pureFlushBucketBoost * 0.9)
      if (hunPengReady) score += getPolicyValue(policy, 'hunPengPursuit') * (5.4 + features.honorPairCount * 0.8)
      if (features.honorCount >= 6) score += getPolicyValue(policy, 'allHonorsPursuit') * 2.2
      score += getPolicyValue(policy, 'flushVsPungsBalance') * ((qingPengReady ? 2.4 : 0) - (features.secondSuitCount > 0 ? 0.8 : 0))
      if (earlyPairHeavy) {
        reasons.push('early_four_pairs_push')
        score += 8.5
      }
      // 高意愿+足够对子→提前决定性commit
      if (_ap_isAgg && features.pairCount + features.tripletCount >= 3) {
        reasons.push('aggressive_pungs_commit')
        score += 12
      }
      if (_ap_isAgg && features.wildCount > 0 && features.pairCount + features.tripletCount >= 2) {
        reasons.push('wild_pungs_push')
        score += 7
      }
      if (noWildOpenPush) score += 1.4
      if (effectiveGlobalMultiplier >= 4) score += 1.6
      score += getPolicyValue(policy, 'daDiaoPursuit') * Math.max(
        0,
        features.tripletCount + features.pairCount + input.player.hand.exposedMelds.length - 4
      ) * 2.8
      if (features.pairCount + features.tripletCount >= 4 && features.wildCount > 0) {
        reasons.push('pair_stack_with_wild')
        score += 10
      } else if (features.pairCount + features.tripletCount < 3) {
        score -= 5
      }
      break

    case 'HONOR_HEAVY':
      score += features.honorCount * 4
      score += features.honorPairCount * 3.5
      score += features.wildCount * 2.6
      score += features.liveHonorCount * 0.4
      score += getPolicyValue(policy, 'allHonorsPursuit') * 8.2
      score += getPolicyValue(policy, 'allHonorsPungsPursuit') * (features.tripletCount + features.honorPairCount) * 1.6
      score += getWildRouteBoost(policy, features.wildCount, 'honors') * 4.6
      score += getPolicyValue(policy, 'honorVsSuitedBalance') * 6.0
      score -= (features.longestSuitCount + features.secondSuitCount) * 0.7
      if (features.honorCount >= 9) {
        reasons.push('honor_stack_nine_plus')
        score += 10
        // P0: 前5回合摸到9+风牌（含箭牌+百搭）时，强推风一色
        const _estRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
        if (features.honorCount + features.wildCount >= 9 && _estRound <= 5) {
          reasons.push('early_honor_9_plus_commit')
          score += 30
        }
      } else if (features.honorCount >= 7) {
        score += 4
      } else if (features.honorCount < 6) {
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
  const features = buildFeatureSummary(input)
  const policy = input.policy ?? input.previousRouteState?.policy ?? null
  const phase = detectDecisionPhase({
    estimatedRound,
    shanten: input.shanten,
    tableThreat: input.tableThreat,
    wallRemaining: input.wallRemaining,
    meldCount: input.player.hand.exposedMelds.length,
    opponentOpenMelds: features.opponentOpenMelds,
    downstreamPressure: features.downstreamPressure,
    fastOpenOpponentCount: features.fastOpenOpponentCount,
    bigOpenOpponentCount: features.bigOpenOpponentCount,
    wallEarlySpeedPush: getPolicyValue(policy, 'wallEarlySpeedPush'),
    wallMidBalance: getPolicyValue(policy, 'wallMidBalance'),
    wallLateDefense: getPolicyValue(policy, 'wallLateDefense'),
    safeTilePriority: getPolicyValue(policy, 'safeTilePriority'),
    defenseRiskAversion: getPolicyValue(policy, 'defenseRiskAversion'),
    wallTilesImpact: getPolicyValue(policy, 'wallTilesImpact'),
  })
  const routeScores = ROUTES
    .map(route => evaluateSingleRoute(route, input, features))
    .sort((a, b) => b.score - a.score)

  const previousRouteState = input.previousRouteState || null

  const HIGH_VALUE_ROUTES: RouteKind[] = ["ALL_PUNGS", "HALF_FLUSH", "HONOR_HEAVY"]
  const isPostRound10Forced = estimatedRound >= 10
  let postRound10Top: RouteScore | null = null
  const topCandidate = routeScores[0]
  const previousCandidate = previousRouteState
    ? routeScores.find(candidate => candidate.route === previousRouteState.current) || null
    : null
    if (isPostRound10Forced) {
    const highValueScores = routeScores.filter(r => HIGH_VALUE_ROUTES.includes(r.route))
    highValueScores.sort((a, b) => b.score - a.score)
    const bestHighValue = highValueScores[0]
    postRound10Top = bestHighValue || topCandidate
    if (previousRouteState && HIGH_VALUE_ROUTES.includes(previousRouteState.current as RouteKind)) {
      const prevHigh = highValueScores.find(r => r.route === previousRouteState.current)
      if (prevHigh && prevHigh.score >= (postRound10Top?.score || 0) - 4) {
        postRound10Top = prevHigh
      }
    }
  }

  const evidenceAgainstPrevious =
    previousRouteState && previousRouteState.current !== topCandidate.route
      ? (previousRouteState.evidenceCounter || 0) + 1
      : 0
  const softLockedPrevious =
    !!previousRouteState &&
    (previousRouteState.lockLevel > 0 || (previousRouteState.stableTurns || 0) >= 2)
  const requiredEvidenceToFlip =
    previousRouteState?.lockLevel === 2 ? 3 :
    previousRouteState?.lockLevel === 1 ? 2 :
    (previousRouteState?.stableTurns || 0) >= 2 ? 2 : 1
  const canHoldPreviousRoute =
    isPostRound10Forced && previousRouteState && !HIGH_VALUE_ROUTES.includes(previousRouteState.current as RouteKind)
      ? false
      :
    !!previousRouteState &&
    !!previousCandidate &&
    softLockedPrevious &&
    (
      previousCandidate.score >= topCandidate.score - (previousRouteState.lockLevel === 2 ? 3.6 : previousRouteState.lockLevel === 1 ? 2.2 : 1.4) ||
      evidenceAgainstPrevious < requiredEvidenceToFlip
    )

  const current = isPostRound10Forced ? postRound10Top : (canHoldPreviousRoute ? previousCandidate : topCandidate)
  const secondary = routeScores.find(candidate => candidate.route !== current.route) || null
  const gap = current && secondary ? current.score - secondary.score : (current?.score || 0)
  const stableOnPrevious = previousRouteState?.current === current?.route
  const stableTurns = stableOnPrevious ? (previousRouteState?.stableTurns || 1) + 1 : 1
  const switchCount =
    previousRouteState && previousRouteState.current !== current.route
      ? (previousRouteState.switchCount || 0) + 1
      : (previousRouteState?.switchCount || 0)
  const evidenceCounter =
    canHoldPreviousRoute && previousRouteState && previousRouteState.current !== topCandidate.route
      ? evidenceAgainstPrevious
      : 0
  const lockLevel: 0 | 1 | 2 =
    isPostRound10Forced && HIGH_VALUE_ROUTES.includes((postRound10Top?.route || current?.route) as RouteKind) ? 2 :
    stableTurns >= 3 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel === 2 && gap >= 1.4 ? 2 :
    phase === 'RUSH' && gap >= 4 ? 2 :
    stableTurns >= 2 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel >= 1 && gap >= 1.1 ? 1 :
    (phase === 'COMMIT' || phase === 'RUSH') && gap >= 2.5 ? 1 :
    0

  return {
    policy,
    phase,
    current: current?.route || 'MENQING_SPEED',
    secondary: secondary?.route || null,
    confidence: gap,
    lockLevel,
    stableTurns,
    switchCount,
    evidenceCounter,
    targetSuit: current?.targetSuit || null,
    routeScores,
    features,
  }
}
