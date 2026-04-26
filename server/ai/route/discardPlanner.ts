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

function scoreByRoute(input: RouteDiscardInput): number {
  const { routeState, tile } = input
  const count = sameTypeCount(input)
  const nearby = adjacentCount(input)
  const longestSuit = routeState.features.longestSuit
  const shortestSuit = routeState.features.shortestSuit

  switch (routeState.current) {
    case 'MENQING_SPEED':
      return (
        (shortestSuit && tile.suit === shortestSuit ? 2.4 : 0) +
        (count === 1 ? 1.2 : -2.6) +
        (nearby === 0 ? 1.4 : -0.8 * nearby) +
        (isHonor(tile) && count === 1 ? 1.8 : 0)
      )

    case 'OPEN_SPEED':
      return (
        (count === 1 ? 1.8 : -1.4) +
        (nearby === 0 ? 1.2 : -0.35 * nearby) +
        (isHonor(tile) && count === 1 ? 0.8 : 0)
      )

    case 'HALF_FLUSH':
      if (tile.suit === routeState.targetSuit) {
        return (count >= 2 ? -3.4 : -1.8) + (nearby > 0 ? -1.2 : 0.2)
      }
      if (isHonor(tile)) {
        return count === 1 ? 0.5 : -1.2
      }
      return 4.6 + (tile.suit === shortestSuit ? 0.8 : 0)

    case 'ALL_PUNGS':
      return (
        (count >= 2 ? -3.8 : 2.3) +
        (nearby > 0 && count === 1 ? 0.9 : 0) +
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

  return routeBias + preservePrimary + targetSuitBonus + routeStrengthDelta * 0.18 + dangerAdjustment + tingBonus
}
