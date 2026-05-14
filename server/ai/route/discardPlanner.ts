import { TileSuit } from '../../types/game'
import { groupTiles, isHonor } from '../../utils/tiles'
import type { RouteDiscardInput } from './types'

function sameTypeCount(input: RouteDiscardInput): number {
  return groupTiles(input.hand).get(`${input.tile.suit}-${input.tile.value}`)?.length || 0
}

function adjacentCount(input: RouteDiscardInput): number {
  if (![TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(input.tile.suit)) return 0
  return input.hand.filter(tile =>
    tile.id !== input.tile.id &&
    tile.suit === input.tile.suit &&
    Math.abs(tile.value - input.tile.value) > 0 &&
    Math.abs(tile.value - input.tile.value) <= 2
  ).length
}

function countVisibleCopies(input: RouteDiscardInput): number {
  let visible = 0
  for (const tile of input.game.discardPile || []) {
    if (tile.suit === input.tile.suit && tile.value === input.tile.value) visible++
  }
  for (const player of input.game.players || []) {
    for (const meld of player.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (tile.suit === input.tile.suit && tile.value === input.tile.value) visible++
      }
    }
  }
  return visible
}

function getSecondSuit(input: RouteDiscardInput): TileSuit | null {
  const ordered = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
    .map(suit => ({ suit, count: input.hand.filter(tile => tile.suit === suit).length }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count)
  return ordered[1]?.suit || null
}

function getObserveBucketScore(input: RouteDiscardInput): number {
  const isSingleton = sameTypeCount(input) === 1
  const nearby = adjacentCount(input)
  const visibleCopies = countVisibleCopies(input)
  const shortestSuit = input.routeState.features.shortestSuit
  const longestSuit = input.routeState.features.longestSuit
  const secondSuit = getSecondSuit(input)
  const shortSuitGap =
    input.routeState.features.longestSuitCount - input.routeState.features.shortestSuitCount
  const weakUpstreamSuit =
    input.routeState.features.upstreamRejectedSuit &&
    input.tile.suit === input.routeState.features.upstreamRejectedSuit &&
    input.tile.suit !== longestSuit &&
    !isHonor(input.tile)
      ? 18 + (isSingleton ? 4 : 0)
      : 0
  const shortestSeenSingleton =
    shortestSuit &&
    input.tile.suit === shortestSuit &&
    isSingleton &&
    nearby === 0 &&
    visibleCopies >= 1
      ? 16 + Math.min(4, visibleCopies * 2)
      : 0
  const shortestSingleton =
    shortestSuit &&
    input.tile.suit === shortestSuit &&
    isSingleton &&
    nearby === 0
      ? 12 + Math.max(0, shortSuitGap - 1)
      : 0
  const seenHonorWaste =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies >= 3 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH'
      ? 11 + visibleCopies
      : 0
  const secondSuitWaste =
    secondSuit &&
    input.tile.suit === secondSuit &&
    input.tile.suit !== longestSuit &&
    isSingleton &&
    nearby === 0 &&
    !isHonor(input.tile)
      ? 8
      : 0

  return Math.max(weakUpstreamSuit || 0, shortestSeenSingleton || 0, shortestSingleton || 0, seenHonorWaste || 0, secondSuitWaste || 0)
}

function scoreByRoute(input: RouteDiscardInput): number {
  const { routeState, tile } = input
  const count = sameTypeCount(input)
  const nearby = adjacentCount(input)
  const isOfficialOpening = input.hand.length >= 11
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const longestSuit = routeState.features.longestSuit
  const shortestSuit = routeState.features.shortestSuit
  const longestSuitCount = routeState.features.longestSuitCount
  const shortestSuitCount = routeState.features.shortestSuitCount
  const isShortestSuitTile = !!shortestSuit && tile.suit === shortestSuit
  const isLongestSuitTile = !!longestSuit && tile.suit === longestSuit
  const suitGap = Math.max(0, longestSuitCount - shortestSuitCount)
  const shortSuitGapTrap = isShortestSuitTile && suitGap >= 4
  const shortestSuitSequenceBreakBias =
    isShortestSuitTile && nearby > 0
      ? 6.4 + Math.max(0, suitGap - 1) * 1.2 + (shortSuitGapTrap && count === 1 ? 3.6 : 0)
      : 0
  const shortestSuitPairReserveBias =
    shortSuitGapTrap && count >= 2 && estimatedRound <= 6
      ? 3.2 + Math.max(0, 6 - estimatedRound) * 0.25
      : 0
  const longestSuitSingletonKeepBias =
    isLongestSuitTile && count === 1
      ? 1.2 + nearby * 0.5 + Math.max(0, suitGap - 1) * 0.35
      : 0

  switch (routeState.current) {
    case 'MENQING_SPEED':
      return (
        (isShortestSuitTile ? 5.1 + suitGap * 0.6 : 0) +
        shortestSuitSequenceBreakBias +
        (isShortestSuitTile && count >= 2 ? -shortestSuitPairReserveBias : 0) +
        (count === 1 ? 1.2 : -2.6) +
        (nearby === 0 ? 1.8 : -0.65 * nearby) +
        (isLongestSuitTile ? -longestSuitSingletonKeepBias : 0) +
        (isHonor(tile) && count === 1 ? (isOfficialOpening ? -2.4 : 1.2) : 0)
      )

    case 'OPEN_SPEED':
      return (
        (count === 1 ? 2.2 : -1.6) +
        (nearby === 0 ? 1.6 : -0.15 * nearby) +
        (longestSuit && tile.suit !== longestSuit && !isHonor(tile) ? 2.2 : 0) +
        (isShortestSuitTile ? 2.4 + shortestSuitSequenceBreakBias : 0) +
        (isShortestSuitTile && count >= 2 ? -Math.max(1.4, shortestSuitPairReserveBias * 0.6) : 0) +
        (isLongestSuitTile ? -Math.max(0.8, longestSuitSingletonKeepBias * 0.85) : 0) +
        (routeState.targetSuit && tile.suit !== routeState.targetSuit && !isHonor(tile) ? 4.8 : 0) +
        (routeState.targetSuit && tile.suit === routeState.targetSuit && !isHonor(tile) ? -2.6 : 0) +
        (isHonor(tile) && count === 1 ? 0.4 : 0)
      )

    case 'HALF_FLUSH':
      if (tile.suit === routeState.targetSuit) {
        return (count >= 2 ? -4.4 : -3.2) + (nearby > 0 ? -1.6 : -0.3)
      }
      if (isHonor(tile)) {
        return count === 1 ? -0.1 : -1.8
      }
      return 5.8 + (tile.suit === shortestSuit ? 1.1 : 0)

    case 'ALL_PUNGS':
      return (
        (count >= 2 ? -4.4 : 2.8) +
        (nearby > 0 && count === 1 ? 1.6 : 0) +
        (isHonor(tile) && count >= 2 ? -1 : 0)
      )

    case 'HONOR_HEAVY':
      if (isHonor(tile)) {
        return count >= 2 ? -4.2 : -1.4
      }
      return 3.8 + (longestSuit && tile.suit !== longestSuit ? 0.6 : 0)
  }
}

export function scoreRouteDiscardCandidate(input: RouteDiscardInput): number {
  const routeBias = scoreByRoute(input)
  const preservePrimary = input.afterRouteState.current === input.routeState.current ? 1.2 : -1.1
  const targetSuitBonus =
    input.routeState.targetSuit && input.afterRouteState.targetSuit === input.routeState.targetSuit ? 0.6 : 0
  const routeStrengthDelta =
    input.afterRouteState.routeScores[0].score - input.routeState.routeScores[0].score
  const observeOrdering =
    input.routeState.phase === 'OBSERVE'
      ? (
        getObserveBucketScore(input) +
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && sameTypeCount(input) === 1 ? 2.3 : 0) +
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && adjacentCount(input) > 0 ? 5.4 : 0) +
        (input.routeState.features.shortestSuitCount > 0 &&
          input.routeState.features.longestSuitCount - input.routeState.features.shortestSuitCount >= 4 &&
          input.routeState.features.shortestSuit &&
          input.tile.suit === input.routeState.features.shortestSuit &&
          sameTypeCount(input) >= 2 ? -2.6 : 0) +
        (input.routeState.features.upstreamVoidSuit && input.tile.suit === input.routeState.features.upstreamVoidSuit && sameTypeCount(input) === 1 ? 1.5 : 0) +
        (input.routeState.features.longestSuit && input.tile.suit === input.routeState.features.longestSuit && sameTypeCount(input) >= 2 ? -1.2 : 0) +
        (input.routeState.features.longestSuit && input.tile.suit === input.routeState.features.longestSuit && sameTypeCount(input) === 1 ? -1.8 : 0) +
        (input.routeState.features.longestSuit && input.routeState.features.longestSuitCount >= 6 && input.tile.suit === input.routeState.features.longestSuit ? -3.2 : 0) +
        (input.routeState.features.longestSuitCount - input.routeState.features.secondSuitCount >= 3 &&
          input.routeState.features.longestSuit &&
          input.tile.suit === input.routeState.features.longestSuit ? -2.4 : 0)
      )
      : 0
  const dangerAdjustment = (0.65 - input.discardDanger) * (
    input.routeState.phase === 'DEFENSE' ? 4 :
    input.routeState.phase === 'RUSH' ? 2 :
    1
  )
  const tingBonus =
    input.candidateShanten === 0
      ? input.winningTiles * 0.18 - input.discardDanger * 2
      : input.candidateShanten === 1
        ? input.candidateEffective * 0.04
        : 0

  return routeBias + preservePrimary + targetSuitBonus + observeOrdering + routeStrengthDelta * 0.18 + dangerAdjustment + tingBonus
}
