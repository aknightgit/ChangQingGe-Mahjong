import { ActionType, TileSuit, type GameState, type Player, type Tile } from '../../types/game'
import { groupTiles, isHonor, isFlower } from '../../utils/tiles'
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

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game?.inheritMultiplier ?? game?.inheritedGlobalMultiplier ?? 1
  const round = game?.roundMultiplier ?? 1
  return Math.min(inherit * round, 8)
}

function getCommittedOpenNumberSuit(player: Player): TileSuit | null {
  const suits = new Set<TileSuit>()
  let numberedTileCount = 0
  for (const meld of player.hand.exposedMelds || []) {
    for (const tile of meld.tiles || []) {
      if (!isNumberSuit(tile.suit)) continue
      suits.add(tile.suit)
      numberedTileCount++
    }
  }
  if (numberedTileCount < 3 || suits.size !== 1) return null
  return [...suits][0] || null
}

function getNumberSuitCount(hand: Tile[], suit: TileSuit): number {
  return hand.filter(tile => tile.suit === suit).length
}

function countPairs(hand: Tile[]): number {
  let pairs = 0
  for (const tiles of groupTiles(hand).values()) {
    if (tiles.length >= 2) pairs++
  }
  return pairs
}

function getBestNumberSuit(hand: Tile[], routeState: RouteState): TileSuit | null {
  if (routeState.targetSuit && isNumberSuit(routeState.targetSuit)) return routeState.targetSuit

  const ranked = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
    .map(suit => ({ suit, count: getNumberSuitCount(hand, suit) }))
    .sort((a, b) => b.count - a.count)

  return ranked[0]?.count ? ranked[0].suit : null
}

function breaksCoreStructure(beforeHand: Tile[], afterHand: Tile[]): boolean {
  const beforeGroups = groupTiles(beforeHand)
  const afterGroups = groupTiles(afterHand)

  for (const [key, tiles] of beforeGroups.entries()) {
    if (tiles.length < 2) continue
    const afterCount = afterGroups.get(key)?.length || 0
    if (afterCount < Math.min(tiles.length, 2)) return true
  }

  return false
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
  const policy = routeState.policy || null

  const afterRouteState = evaluateRouteState({
    game,
    player,
    hand: candidateHand,
    shanten: candidateShanten,
    effectiveTiles: candidateEffective,
    tableThreat,
    wallRemaining,
    previousRouteState: routeState,
  })
  const routeGain = afterRouteState.routeScores[0].score - routeState.routeScores[0].score
  const speedGain = (passShanten - candidateShanten) * 3 + (candidateEffective - passEffective) * 0.08
  const isTargetSuit = !!routeState.targetSuit && claimTile.suit === routeState.targetSuit
  const isHonorTile = isHonor(claimTile)
  const phase = routeState.phase
  const openingMenqing = player.hand.exposedMelds.length === 0 && player.hand.concealedTiles.length >= 11
  const committedOpenSuit = getCommittedOpenNumberSuit(player)
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const wildCount = routeState.features.wildCount
  const pairHeavyPungsPush = estimatedRound <= 5 && routeState.features.pairCount >= 4
  const veryPairHeavy = routeState.features.pairCount >= 5 && routeState.features.sequenceLikeCount <= 3
  const upstreamRejectedSuit = routeState.features.upstreamRejectedSuit
  const upstreamSuitCount = upstreamRejectedSuit ? getNumberSuitCount(player.hand.concealedTiles, upstreamRejectedSuit) : 0
  const upstreamRejectedOpenPush =
    !!upstreamRejectedSuit &&
    upstreamSuitCount >= 6 &&
    isNumberSuit(claimTile.suit) &&
    claimTile.suit === upstreamRejectedSuit
  const noWildOpenPush = wildCount === 0
  const multiWildMenqingPush = wildCount >= 2
  const suitGap = Math.max(0, routeState.features.longestSuitCount - routeState.features.shortestSuitCount)
  const honorPengPush =
    action === ActionType.PENG &&
    isHonorTile &&
    (
      routeState.current === 'ALL_PUNGS' ||
      routeState.current === 'HONOR_HEAVY' ||
      routeState.features.honorPairCount >= 1 ||
      routeState.features.tripletCount >= 1
    )
  const shortestSuitChow =
    action === ActionType.CHOW &&
    !!routeState.features.shortestSuit &&
    claimTile.suit === routeState.features.shortestSuit
  const shortSuitGapTrap =
    shortestSuitChow &&
    suitGap >= 4 &&
    routeState.features.longestSuitCount >= 6

  if (
    shortSuitGapTrap &&
    (
      candidateShanten >= passShanten ||
      candidateEffective <= passEffective + 2 ||
      (!noWildOpenPush && effectiveGlobalMultiplier < 4)
    )
  ) {
    return { allowed: false, tuneDelta: -2.2, reason: 'shortest_suit_gap_chow_blocked' }
  }

  if (
    shortestSuitChow &&
    candidateShanten >= passShanten &&
    candidateEffective <= passEffective
  ) {
    return { allowed: false, tuneDelta: -1.9, reason: 'shortest_suit_chow_blocked' }
  }

  if (committedOpenSuit && action === ActionType.CHOW && claimTile.suit !== committedOpenSuit) {
    return { allowed: false, tuneDelta: -1.6, reason: 'off_route_open_suit_chow' }
  }

  // ★ 花牌碰不算"已开门"：只有非花牌门口才算第一口判断
  const nonFlowerExposed = player.hand.exposedMelds.filter(m => !m.tiles?.some(t => isFlower(t))).length;
  if (action === ActionType.CHOW && nonFlowerExposed === 0) {
    const bestSuit = getBestNumberSuit(player.hand.concealedTiles, routeState)
    const bestSuitCount = bestSuit ? getNumberSuitCount(player.hand.concealedTiles, bestSuit) : 0
    const claimSuitCount = isNumberSuit(claimTile.suit) ? getNumberSuitCount(player.hand.concealedTiles, claimTile.suit) : 0
    const pairCount = countPairs(player.hand.concealedTiles)
    const canRelaxFirstChowGate =
      effectiveGlobalMultiplier >= 4 ||
      upstreamRejectedOpenPush ||
      (wildCount === 1 && bestSuit !== null && claimTile.suit === bestSuit && bestSuitCount >= 6)
    // ★ K哥铁律: 第一口吃必须5张(无百搭也不能放松)
    const requiredBestSuitTiles = multiWildMenqingPush ? 6 : 5

    if (!bestSuit || bestSuitCount < requiredBestSuitTiles) {
      return { allowed: false, tuneDelta: -1.3, reason: 'first_chow_requires_five_tiles' }
    }
    // ★ 吃的这门也要检查: 吃的门必须是长门
    if (claimTile.suit !== bestSuit) {
      return { allowed: false, tuneDelta: -1.7, reason: 'first_chow_must_follow_best_suit' }
    }
    // ★ 4+对子坚决不吃（无论是否 pairHeavyPungsPush，pairHeavyPungsPush 只影响碰/杠，不应放行吃）
    if (pairCount >= 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 2) {
      return { allowed: false, tuneDelta: -2, reason: 'first_chow_breaks_pair_heavy_shape' }
    }
    if (!upstreamRejectedOpenPush && bestSuitCount >= claimSuitCount + 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 1) {
      return { allowed: false, tuneDelta: -1.9, reason: 'first_chow_abandons_long_suit' }
    }
    if (!canRelaxFirstChowGate && breaksCoreStructure(player.hand.concealedTiles, candidateHand)) {
      return { allowed: false, tuneDelta: -1.9, reason: 'first_chow_breaks_core_structure' }
    }
  }

  const bestSuit = getBestNumberSuit(player.hand.concealedTiles, routeState)
  const bestSuitCount = bestSuit ? getNumberSuitCount(player.hand.concealedTiles, bestSuit) : 0
  if (
    action === ActionType.CHOW &&
    bestSuit &&
    isNumberSuit(claimTile.suit) &&
    claimTile.suit !== bestSuit &&
    bestSuitCount >= 7 &&
    candidateShanten >= passShanten &&
    candidateEffective <= passEffective + 1
  ) {
    return { allowed: false, tuneDelta: -1.7, reason: 'off_route_chow_from_long_suit_hand' }
  }

  switch (routeState.current) {
    case 'MENQING_SPEED': {
      if (
        honorPengPush &&
        candidateShanten <= passShanten &&
        candidateEffective + 2 >= passEffective
      ) {
        return { allowed: true, tuneDelta: 0.65 + routeGain * 0.05, reason: 'honor_peng_push' }
      }

      const canBreakForSpeed =
        candidateShanten < passShanten ||
        (phase === 'RUSH' && candidateShanten <= passShanten && candidateEffective >= passEffective - 1) ||
        (tableThreat >= 0.82 && candidateShanten <= passShanten && speedGain >= 0) ||
        (effectiveGlobalMultiplier >= 4 && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective) ||
        (noWildOpenPush && candidateShanten <= passShanten && candidateEffective + (action === ActionType.CHOW ? 1 : 0) >= passEffective) ||
        (upstreamRejectedOpenPush && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective) ||
        (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG)) ||
        (veryPairHeavy && action === ActionType.PENG)  // 5+对子无长门，坚决碰

      const openingBreakNeeds =
        candidateShanten < passShanten ||
        candidateEffective >= passEffective + (action === ActionType.CHOW ? 3 : 6) ||
        speedGain >= (action === ActionType.CHOW ? 0.8 : 1.5) ||
        routeGain >= (isHonorTile ? 1.0 : 0.65) ||
        effectiveGlobalMultiplier >= 4 ||
        (noWildOpenPush && (action === ActionType.PENG || candidateEffective >= passEffective + 1)) ||
        upstreamRejectedOpenPush ||
        (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG)) ||
        (veryPairHeavy && action === ActionType.PENG)  // 5+对子无长门，坚决碰

      const canBreakOpeningMenqing = openingMenqing
        ? (multiWildMenqingPush ? openingBreakNeeds && effectiveGlobalMultiplier >= 4 : openingBreakNeeds)
        : canBreakForSpeed

      if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing) {
        return { allowed: false, tuneDelta: -1.5, reason: 'menqing_hold_chow' }
      }
      if ((action === ActionType.PENG || action === ActionType.KONG) && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing) {
        return { allowed: false, tuneDelta: -1.2, reason: 'menqing_hold_pung' }
      }
      let tuneDelta = canBreakOpeningMenqing ? 0.35 + routeGain * 0.04 : -0.15
      if (effectiveGlobalMultiplier >= 4) tuneDelta += 0.4 + (effectiveGlobalMultiplier - 4) * 0.08
      if (noWildOpenPush) tuneDelta += 0.28
      if (upstreamRejectedOpenPush) tuneDelta += 0.32
      if (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG)) tuneDelta += 0.5
      if (multiWildMenqingPush && openingMenqing) tuneDelta -= 0.18
      return { allowed: true, tuneDelta, reason: 'menqing_speed' }
    }

    case 'OPEN_SPEED':
      return {
        allowed: true,
        tuneDelta:
          0.48 +
          Math.max(0, speedGain) * 0.1 +
          (action === ActionType.CHOW ? 0.2 : 0.12) +
          (committedOpenSuit && claimTile.suit === committedOpenSuit ? 0.35 : 0),
        reason: 'open_speed_push',
      }

    case 'HALF_FLUSH':
      if (!isHonorTile && routeState.targetSuit && claimTile.suit !== routeState.targetSuit) {
        return { allowed: false, tuneDelta: -1.6, reason: 'off_route_half_flush' }
      }
      if (
        isHonorTile &&
        routeState.features.pureFlushUpgradeReady &&
        routeState.features.weakHonorPairCount >= 1 &&
        candidateShanten >= passShanten &&
        candidateEffective <= passEffective + 1
      ) {
        return { allowed: false, tuneDelta: -1.5, reason: 'pure_flush_upgrade_blocks_honor_claim' }
      }
      return {
        allowed: true,
        tuneDelta:
          (isTargetSuit ? 0.72 : 0.28) +
          routeGain * 0.06 +
          (routeState.features.pureFlushUpgradeReady && isTargetSuit ? 0.42 : 0) +
          ((policy?.hunPengPursuit || 0) * (routeState.features.honorPairCount >= 1 && isTargetSuit ? 0.18 : 0)) +
          ((policy?.qingPengPursuit || 0) * (routeState.features.secondSuitCount === 0 && isTargetSuit ? 0.12 : 0)),
        reason: isTargetSuit
          ? (routeState.features.pureFlushUpgradeReady ? 'pure_flush_upgrade_target_claim' : 'target_suit_claim')
          : 'honor_support_claim',
      }

    case 'ALL_PUNGS':
      // ★ V2: 碰碰胡路线下允许有价值的吃牌（有顺子能更快碰碰胡时）
      if (action === ActionType.CHOW) {
        if (candidateShanten < passShanten) {
          return { allowed: true, tuneDelta: 0.3, reason: 'all_pungs_chow_shanten_gain' }
        }
        if (candidateEffective >= passEffective - 2) {
          return { allowed: true, tuneDelta: -0.8, reason: 'all_pungs_chow_marginal' }
        }
        return { allowed: false, tuneDelta: -2, reason: 'all_pungs_blocks_chow' }
      }
      const _apPursuit = (policy?.allPungsPursuit || 0)
      const _apAgg = _apPursuit >= 1.2
      return {
        allowed: true,
        tuneDelta:
          (_apAgg ? 1.2 : 0.55) +
          (action === ActionType.KONG ? 0.25 : 0.15) +
          routeGain * 0.05 +
          ((policy?.qingPengPursuit || 0) * (routeState.features.secondSuitCount === 0 ? 0.18 : 0)) +
          ((policy?.hunPengPursuit || 0) * (routeState.features.honorPairCount >= 1 ? 0.20 : 0)) +
          (_apAgg && isHonorTile && routeState.features.honorPairCount >= 1 ? 0.4 : 0) +
          (_apAgg && routeState.features.wildCount > 0 ? 0.35 : 0),
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
        tuneDelta:
          0.7 +
          routeGain * 0.05 +
          (policy?.allHonorsPursuit || 0) * 0.18 +
          (policy?.allHonorsPungsPursuit || 0) * 0.12,
        reason: 'honor_claim_push',
      }
  }

  if (isNumberSuit(claimTile.suit)) {
    return { allowed: true, tuneDelta: routeGain * 0.03, reason: 'default_number_claim' }
  }
  return { allowed: true, tuneDelta: routeGain * 0.02, reason: 'default_claim' }
}
