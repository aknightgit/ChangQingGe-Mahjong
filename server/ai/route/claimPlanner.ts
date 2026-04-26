import { ActionType, TileSuit, type GameState, type Player, type Tile } from '../../types/game'
import { isHonor } from '../../utils/tiles'
import { evaluateRouteState } from './routeEvaluator'
import type { RouteState } from './types'

export interface RouteClaimInput {
  action: ActionType
  player: Player
  game: GameState
  claimTile: Tile
  routeState: RouteState
  candidateHand: Tile[]
  candidateShanten: number
  candidateEffective: number
  passShanten: number
  passEffective: number
  tableThreat: number
  wallRemaining: number
}

export interface RouteClaimDecision {
  allowed: boolean
  tuneDelta: number
  reason: string
}

function isNumberSuit(suit: TileSuit): boolean {
  return suit === TileSuit.DOTS || suit === TileSuit.CHARACTERS || suit === TileSuit.BAMBOOS
}

export function evaluateRouteClaim(input: RouteClaimInput): RouteClaimDecision {
  const {
    action,
    player,
    game,
    claimTile,
    routeState,
    candidateHand,
    candidateShanten,
    candidateEffective,
    passShanten,
    passEffective,
    tableThreat,
    wallRemaining,
  } = input

  const afterRouteState = evaluateRouteState({
    game,
    player,
    hand: candidateHand,
    shanten: candidateShanten,
    effectiveTiles: candidateEffective,
    tableThreat,
    wallRemaining,
  })
  const routeGain = afterRouteState.routeScores[0].score - routeState.routeScores[0].score
  const speedGain = (passShanten - candidateShanten) * 3 + (candidateEffective - passEffective) * 0.08
  const isTargetSuit = !!routeState.targetSuit && claimTile.suit === routeState.targetSuit
  const isHonorTile = isHonor(claimTile)
  const phase = routeState.phase

  switch (routeState.current) {
    case 'MENQING_SPEED': {
      const canBreakForSpeed =
        candidateShanten < passShanten ||
        (phase === 'RUSH' && candidateShanten <= passShanten && candidateEffective >= passEffective - 1) ||
        (tableThreat >= 0.82 && candidateShanten <= passShanten && speedGain >= 0)

      if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0 && !canBreakForSpeed) {
        return { allowed: false, tuneDelta: -1.5, reason: 'menqing_hold_chow' }
      }
      if ((action === ActionType.PENG || action === ActionType.KONG) && player.hand.exposedMelds.length === 0 && !canBreakForSpeed) {
        return { allowed: false, tuneDelta: -1.2, reason: 'menqing_hold_pung' }
      }
      return { allowed: true, tuneDelta: canBreakForSpeed ? 0.15 + routeGain * 0.03 : -0.25, reason: 'menqing_speed' }
    }

    case 'OPEN_SPEED':
      return {
        allowed: true,
        tuneDelta: 0.35 + Math.max(0, speedGain) * 0.08 + (action === ActionType.CHOW ? 0.08 : 0.12),
        reason: 'open_speed_push',
      }

    case 'HALF_FLUSH':
      if (!isHonorTile && routeState.targetSuit && claimTile.suit !== routeState.targetSuit) {
        return { allowed: false, tuneDelta: -1.6, reason: 'off_route_half_flush' }
      }
      return {
        allowed: true,
        tuneDelta: (isTargetSuit ? 0.5 : 0.18) + routeGain * 0.05,
        reason: isTargetSuit ? 'target_suit_claim' : 'honor_support_claim',
      }

    case 'ALL_PUNGS':
      if (action === ActionType.CHOW) {
        return { allowed: false, tuneDelta: -2, reason: 'all_pungs_blocks_chow' }
      }
      return {
        allowed: true,
        tuneDelta: 0.55 + (action === ActionType.KONG ? 0.18 : 0.12) + routeGain * 0.04,
        reason: 'all_pungs_claim',
      }

    case 'HONOR_HEAVY':
      if (action === ActionType.CHOW) {
        return { allowed: false, tuneDelta: -2, reason: 'honor_heavy_blocks_chow' }
      }
      if (!isHonorTile) {
        return { allowed: false, tuneDelta: -1.4, reason: 'number_claim_breaks_honor_heavy' }
      }
      return {
        allowed: true,
        tuneDelta: 0.7 + routeGain * 0.05,
        reason: 'honor_claim_push',
      }
  }

  if (isNumberSuit(claimTile.suit)) {
    return { allowed: true, tuneDelta: routeGain * 0.03, reason: 'default_number_claim' }
  }
  return { allowed: true, tuneDelta: routeGain * 0.02, reason: 'default_claim' }
}
