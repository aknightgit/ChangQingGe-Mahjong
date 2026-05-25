// ai_v2/engineEntry.ts — V2 引擎统一入口
// 替代 ai/pipeline/policyEngine，调用 V2 的三大决策器

import type { GameState, Player, Tile } from '../types/game'
import { ActionType } from '../types/game'
import { evaluateRouteStateV2, buildFeatureSummary } from './pathSelector'
import { evaluateRouteClaim } from './claimDecider'
import { scoreRouteDiscardCandidate } from './discardDecider'
import type { RouteState } from './types'

export interface V2Decision {
  routeState: RouteState
  discardScores: Array<{ tile: Tile; score: number }>
  claimDecisions: Array<{ action: ActionType; tile: Tile; allowed: boolean; tuneDelta: number; reason: string }>
}

/**
 * V2 引擎主入口 — 返回完整的路径+弃牌+吃碰决策
 */
export function runV2Engine(args: {
  game: GameState
  player: Player
  hand: Tile[]
  shanten: number
  effectiveTiles: number
  tableThreat: number
  wallRemaining: number
  previousRouteState?: RouteState | null
  policy?: any
  pendingClaims?: Array<{ action: ActionType; tile: Tile }>
  winningTiles?: number
}): V2Decision {
  const { game, player, hand, shanten, effectiveTiles, tableThreat, wallRemaining, previousRouteState, policy, pendingClaims, winningTiles } = args

  // 1. 路径选择
  const routeState = evaluateRouteStateV2({
    game, player, hand, shanten, effectiveTiles, tableThreat, wallRemaining,
    previousRouteState, policy,
  })

  // 2. 弃牌评分
  const discardScores = hand.map(tile => {
    // Simulate removing this tile
    const afterHand = hand.filter(t => t.id !== tile.id)
    const afterRouteState = evaluateRouteStateV2({
      game, player, hand: afterHand,
      shanten, effectiveTiles, tableThreat, wallRemaining,
      previousRouteState: routeState, policy,
    })
    const score = scoreRouteDiscardCandidate({
      tile, hand, player, game, routeState,
      candidateShanten: shanten,
      candidateEffective: effectiveTiles,
      discardDanger: 0.3,
      winningTiles: winningTiles ?? 0,
      baselineScore: 0,
      afterRouteState,
    })
    return { tile, score }
  }).sort((a, b) => b.score - a.score)

  // 3. 吃碰决策
  const claimDecisions = (pendingClaims || []).map(({ action, tile }) => {
    const decision = evaluateRouteClaim({
      action, player, game, claimTile: tile, routeState,
      candidateHand: hand,
      candidateShanten: shanten,
      candidateEffective: effectiveTiles,
      passShanten: shanten,
      passEffective: effectiveTiles,
      tableThreat, wallRemaining,
    })
    return { action, tile, allowed: decision.allowed, tuneDelta: decision.tuneDelta, reason: decision.reason }
  })

  return { routeState, discardScores, claimDecisions }
}
