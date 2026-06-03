import { ActionType, TileSuit, type GameState, type Player, type Tile } from '../types/game'
import { groupTiles, isHonor } from '../utils/tiles'
import { evaluateRouteStateV2 } from './pathSelector'
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

/** 统计某张牌在弃牌区+暴露副露中的可见数量（不含手牌） */
function countVisibleCopies(game: any, tile: Tile): number {
  let visible = 0
  for (const t of game.discardPile || []) {
    if (t.suit === tile.suit && t.value === tile.value) visible++
  }
  for (const player of game.players || []) {
    for (const meld of player.hand?.exposedMelds || []) {
      for (const t of meld.tiles || []) {
        if (t.suit === tile.suit && t.value === tile.value) visible++
      }
    }
  }
  return visible
}

/** 判断是否为绝张（4张中已有3张可见） */
function isDeadTile(game: any, tile: Tile): boolean {
  return countVisibleCopies(game, tile) >= 3
}

function getBestNumberSuit(hand: Tile[], routeState: RouteState): TileSuit | null {
  if (routeState.targetSuit && isNumberSuit(routeState.targetSuit)) return routeState.targetSuit

  const ranked = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
    .map(suit => ({ suit, count: getNumberSuitCount(hand, suit) }))
    .sort((a, b) => b.count - a.count)

  return ranked[0]?.count ? ranked[0].suit : null
}

function isGapChow(hand: Tile[], claimTile: Tile): boolean {
  if (!isNumberSuit(claimTile.suit)) return false
  const vals = hand.filter(t => t.suit === claimTile.suit).map(t => t.value)
  const cv = claimTile.value
  return vals.includes(cv - 1) && vals.includes(cv + 1)
}

function isEdgeChow(hand: Tile[], claimTile: Tile): boolean {
  if (!isNumberSuit(claimTile.suit)) return false
  const vals = hand.filter(t => t.suit === claimTile.suit).map(t => t.value)
  const cv = claimTile.value
  // ★ 边张吃牌(K哥铁律): 吃完后形成单边顺, 进张唯一
  // 1+2 吃 3 → 1 2 3, 听 4 (单边)
  // 8+9 吃 7 → 7 8 9, 听 7 (单边)
  if (cv === 3 && vals.includes(1) && vals.includes(2)) return true
  if (cv === 7 && vals.includes(8) && vals.includes(9)) return true
  if (cv === 1 && vals.includes(2) && vals.includes(3)) return true  // 2+3 吃 1 → 1 2 3 听 4
  if (cv === 9 && vals.includes(7) && vals.includes(8)) return true  // 7+8 吃 9 → 7 8 9 听 7
  return false
}

/** 坎张吃牌: 1+3 吃 2, 2+4 吃 3, 6+8 吃 7, 7+9 吃 8 */
function isKantChow(hand: Tile[], claimTile: Tile): boolean {
  if (!isNumberSuit(claimTile.suit)) return false
  const vals = hand.filter(t => t.suit === claimTile.suit).map(t => t.value)
  const cv = claimTile.value
  if (cv === 2 && vals.includes(1) && vals.includes(3)) return true
  if (cv === 3 && vals.includes(2) && vals.includes(4)) return true
  if (cv === 7 && vals.includes(6) && vals.includes(8)) return true
  if (cv === 8 && vals.includes(7) && vals.includes(9)) return true
  return false
}

/** 强吃牌检测: 边张必吃 > 坎张高概率吃 > 普通坎张 */
function isStrongChow(hand: Tile[], claimTile: Tile): 'edge' | 'kant' | 'gap' | null {
  if (isEdgeChow(hand, claimTile)) return 'edge'
  if (isKantChow(hand, claimTile)) return 'kant'
  if (isGapChow(hand, claimTile)) return 'gap'
  return null
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

  const afterRouteState = evaluateRouteStateV2({
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
  const exposedMeldCount = player.hand.exposedMelds.length
  const discardSourceId = game.lastDiscardPlayerId
  const sameOpponentMeldCount = discardSourceId
    ? player.hand.exposedMelds.filter((m: any) => m.fromPlayerId === discardSourceId).length
    : 0
  const wildCount = routeState.features.wildCount
  const wildBaoStartPush = sameOpponentMeldCount === 0 && wildCount >= 2
    ? Math.min(0.45, (wildCount - 1) * 0.20)
    : 0
  const mutualBaoBuildPush = sameOpponentMeldCount === 1 && wildCount > 0
    ? Math.min(1.3, wildCount * 0.48)
    : 0
  const mutualBaoFinalPush = sameOpponentMeldCount >= 2
    ? Math.min(1.6, wildCount * 0.42)
    : 0
  const chowGapEdgeBoost = action === ActionType.CHOW && exposedMeldCount > 0 && wildCount <= 2 && isNumberSuit(claimTile.suit)
    ? (isGapChow(player.hand.concealedTiles, claimTile) ? 0.35 :
       isEdgeChow(player.hand.concealedTiles, claimTile) ? 0.30 : 0)
    : 0
  const openingMenqing = player.hand.exposedMelds.length === 0 && player.hand.concealedTiles.length >= 11
  const committedOpenSuit = getCommittedOpenNumberSuit(player)
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const pairHeavyPungsPush = estimatedRound <= 8 && routeState.features.pairCount >= 3
  // ★ V2.2: 绝张碰牌 — 最后一张，不碰就没了
  const isDeadTilePung = action === ActionType.PENG && isDeadTile(game, claimTile)
  const deadTilePungBonus = isDeadTilePung ? 0.8 : 0
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
    (
      isHonorTile ||
      routeState.features.tripletCount >= 1
    ) &&
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

  if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0) {
    const bestSuit = getBestNumberSuit(player.hand.concealedTiles, routeState)
    const bestSuitCount = bestSuit ? getNumberSuitCount(player.hand.concealedTiles, bestSuit) : 0
    const claimSuitCount = isNumberSuit(claimTile.suit) ? getNumberSuitCount(player.hand.concealedTiles, claimTile.suit) : 0
    const pairCount = countPairs(player.hand.concealedTiles)
    const canRelaxFirstChowGate =
      noWildOpenPush ||
      effectiveGlobalMultiplier >= 4 ||
      upstreamRejectedOpenPush ||
      (wildCount === 1 && bestSuit !== null && claimTile.suit === bestSuit && bestSuitCount >= 6)
    const requiredBestSuitTiles = multiWildMenqingPush ? 6 : (canRelaxFirstChowGate ? 4 : 5)

    if (!bestSuit || bestSuitCount < requiredBestSuitTiles) {
      return { allowed: false, tuneDelta: -1.3, reason: 'first_chow_requires_five_tiles' }
    }
    // ★ V2.7 K哥铁律: 第一口吃, claim 该门也必须 >= 5 张(防止跟进门牌过杂)
    if (claimSuitCount < 5) {
      return { allowed: false, tuneDelta: -1.5, reason: 'first_chow_claim_suit_too_few' }
    }
    if (claimTile.suit !== bestSuit) {
      return { allowed: false, tuneDelta: -1.7, reason: 'first_chow_must_follow_best_suit' }
    }
    if (!pairHeavyPungsPush && pairCount >= 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 2) {
      return { allowed: false, tuneDelta: -2, reason: 'first_chow_breaks_pair_heavy_shape' }
    }
    if (!upstreamRejectedOpenPush && bestSuitCount >= claimSuitCount + 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 1) {
      return { allowed: false, tuneDelta: -1.9, reason: 'first_chow_abandons_long_suit' }
    }
    if (!canRelaxFirstChowGate && breaksCoreStructure(player.hand.concealedTiles, candidateHand)) {
      return { allowed: false, tuneDelta: -1.9, reason: 'first_chow_breaks_core_structure' }
    }
  }

  // ★ V2.5: 强力碰碰胡潜质检测 — 4+副露+多对子时碰牌几乎必碰
  // K哥铁律: 4 副露+4 对子明显做碰碰胡, 别人出对子必碰
  const allExposedMeldCount = player.hand.exposedMelds.length
  const handPairCount2 = countPairs(player.hand.concealedTiles)
  if (action === ActionType.PENG && allExposedMeldCount + handPairCount2 >= 4) {
    return { allowed: true, tuneDelta: 2.0, reason: 'strong_pung_potential' }
  }

  // ★ V2.8 K哥铁律: 成型混碰强碰buff (优先于 V2.7 第一口碰限制)
  // 牌型: 已有 1+ 副露(已破门清) + 数字门对子 >= 2 + 至少 1 个风/箭刻/对
  // 典型场景: 已碰 jian-2 刻 + tiao 2对 + 别人打 4万 → 碰 4万 凑混碰
  if (action === ActionType.PENG && !isHonor(claimTile) && player.hand.exposedMelds.length >= 1) {
    const claimSuitCount = getNumberSuitCount(player.hand.concealedTiles, claimTile.suit)
    const handPairs = countPairs(player.hand.concealedTiles)
    const hasHonorTripletOrPair = (() => {
      const groups = groupTiles(player.hand.concealedTiles)
      for (const [key, tiles] of groups.entries()) {
        if ((key.startsWith('feng-') || key.startsWith('jian-')) && tiles.length >= 2) return true
      }
      for (const m of player.hand.exposedMelds) {
        if (m.tiles?.some((t: any) => t.suit === 'feng' || t.suit === 'jian')) return true
      }
      return false
    })()
    const hunPengReady = claimSuitCount >= 2 && handPairs >= 2 && hasHonorTripletOrPair
    if (hunPengReady) {
      return { allowed: true, tuneDelta: 1.5, reason: 'hun_peng_potential_boost' }
    }
  }

  // ★ V2.7 K哥铁律: 第一口碰严格限制(原话恢复)
  // 数字门: 该门 >= 4 张 OR 手牌 >= 3 对子
  // 风/箭牌: 无限制
  if (action === ActionType.PENG && player.hand.exposedMelds.length === 0) {
    const isHonorClaim = isHonor(claimTile)
    if (!isHonorClaim) {
      const claimSuitCount = getNumberSuitCount(player.hand.concealedTiles, claimTile.suit)
      const handPairs = countPairs(player.hand.concealedTiles)
      const eligibleByCount = claimSuitCount >= 4
      const eligibleByPairs = handPairs >= 3
      if (!eligibleByCount && !eligibleByPairs) {
        return { allowed: false, tuneDelta: -1.4, reason: 'first_peng_requires_four_tiles_or_three_pairs' }
      }
    }
  }

  // ★ V2.6: 强吃牌(边张/坎张/两面)硬保证 — K哥铁律: 重复副露允许, 必吃
  // 1+2吃3, 2+3吃1, 7+8吃9, 8+9吃7, 1+3吃2, 2+4吃3 等
  if (action === ActionType.CHOW) {
    const strongChowHard = isStrongChow(player.hand.concealedTiles, claimTile)
    if (strongChowHard) {
      const boost = strongChowHard === 'edge' ? 3.0 : strongChowHard === 'kant' ? 2.8 : 1.5
      return { allowed: true, tuneDelta: boost, reason: 'strong_chow_hard_override' }
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
        return { allowed: true, tuneDelta: 0.65 + routeGain * 0.05 + wildBaoStartPush + mutualBaoBuildPush + mutualBaoFinalPush, reason: 'honor_peng_push' }
      }

      const canBreakForSpeed =
        candidateShanten < passShanten ||
        (phase === 'RUSH' && candidateShanten <= passShanten && candidateEffective >= passEffective - 1) ||
        (tableThreat >= 0.82 && candidateShanten <= passShanten && speedGain >= 0) ||
        (effectiveGlobalMultiplier >= 4 && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective) ||
        (noWildOpenPush && candidateShanten <= passShanten && candidateEffective + (action === ActionType.CHOW ? 1 : 0) >= passEffective) ||
        (upstreamRejectedOpenPush && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective) ||
        (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG))

      const openingBreakNeeds =
        candidateShanten < passShanten ||
        candidateEffective >= passEffective + (action === ActionType.CHOW ? 3 : 6) ||
        speedGain >= (action === ActionType.CHOW ? 0.8 : 1.5) ||
        routeGain >= (isHonorTile ? 1.0 : 0.65) ||
        effectiveGlobalMultiplier >= 4 ||
        (noWildOpenPush && (action === ActionType.PENG || candidateEffective >= passEffective + 1)) ||
        upstreamRejectedOpenPush ||
        (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG))

      const canBreakOpeningMenqing = openingMenqing
        ? (multiWildMenqingPush ? openingBreakNeeds && effectiveGlobalMultiplier >= 4 : openingBreakNeeds)
        : canBreakForSpeed

      if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing) {
        return { allowed: false, tuneDelta: -1.5, reason: 'menqing_hold_chow' }
      }
      // ★ 对手威胁高（2+副露）且AI有3+对子 → 允许碰牌转碰碰胡
      const opponentExposedMelds = game.players.filter((p: any) => p.id !== player.id)
        .reduce((sum: number, p: any) => sum + (p.hand?.exposedMelds?.length || 0), 0)
      const highOpponentThreat = opponentExposedMelds >= 4  // 至少一家有2+副露
      const pengForPungsTransition = highOpponentThreat && routeState.features.pairCount >= 3 && action === ActionType.PENG
      if ((action === ActionType.PENG || action === ActionType.KONG) && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing && !pengForPungsTransition) {
        return { allowed: false, tuneDelta: -1.2, reason: 'menqing_hold_pung' }
      }
      // ★ V2.11 K哥铁律: 已破门清后, 基础 tuneDelta 大幅提升
      // 破门清 = 已经没有退路, 应该更积极吃碰, 不再保守
      let tuneDelta = canBreakOpeningMenqing ? 0.35 + routeGain * 0.04 : -0.15
      // ★ V2.11: 已破门清(exposedMelds >= 1)时, 基础分从 -0.15 提升到 +0.3
      if (exposedMeldCount >= 1 && !canBreakOpeningMenqing) {
        tuneDelta = 0.3  // 破门清后不再保守, 积极吃碰
      }
      if (effectiveGlobalMultiplier >= 4) tuneDelta += 0.4 + (effectiveGlobalMultiplier - 4) * 0.08
      if (noWildOpenPush) tuneDelta += 0.28
      if (upstreamRejectedOpenPush) tuneDelta += 0.32
      if (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG)) tuneDelta += 0.5
      if (multiWildMenqingPush && openingMenqing) tuneDelta -= 0.18
      // ★ V2.11 K哥铁律: 清混一色方向, 已吃碰该门, 第二口吃碰大幅积极
      // committedOpenSuit = 已副露的数字门(清混一色方向)
      if (committedOpenSuit && claimTile.suit === committedOpenSuit && exposedMeldCount >= 1) {
        // 已吃碰该门 + 第二口同门 → 大幅加分
        if (action === ActionType.CHOW) {
          tuneDelta += 1.2  // 吃同门: 大幅积极
        } else if (action === ActionType.PENG) {
          // ★ K哥铁律: 已吃该门, 第二口碰 → 小幅提升(考虑碰断顺子)
          // 检查: 是否有该门顺子副露(碰可能断顺子)
          const hasExposedSequence = player.hand.exposedMelds.some(
            (m: any) => m.type === 'sequence' && m.tiles?.some((t: any) => t.suit === claimTile.suit)
          )
          if (hasExposedSequence) {
            // 已有该门顺子副露, 碰可能断顺子 → 小幅提升
            tuneDelta += 0.6
          } else {
            // 已有该门刻子副露, 碰不会断顺子 → 大幅提升
            tuneDelta += 1.0
          }
        }
      }
      // ★ V2.3: 非门清/清一色路线下，大幅增加碰风箭对子意愿
      const isHonorPung = action === ActionType.PENG && isHonorTile
      const isNonFlushRoute = routeState.current !== 'HALF_FLUSH' && routeState.current !== 'PURE_FLUSH'
      if (isHonorPung && isNonFlushRoute) {
        tuneDelta += 0.6
      }
      tuneDelta += wildBaoStartPush + mutualBaoBuildPush + mutualBaoFinalPush + deadTilePungBonus
      // ★ V2.4: 单边张/强吃牌加权(已破门清仍生效,一二筒吃三筒几乎必吃)
      if (action === ActionType.CHOW) {
        const strongChow = isStrongChow(player.hand.concealedTiles, claimTile)
        if (strongChow === 'edge') tuneDelta += 1.5  // 边张(1-2吃3,8-9吃7等),必吃
        else if (strongChow === 'kant') tuneDelta += 1.2  // 两面(2-3吃1,5-6吃4等),必吃
        else if (strongChow === 'gap') tuneDelta += 0.8  // 坎张(2-4吃3),高概率吃
      }
      return { allowed: true, tuneDelta, reason: 'menqing_speed' }
    }

    case 'OPEN_SPEED':
      // ★ V2.5: 多对子+多副露时碰牌强力 buff (K哥铁律: 适合碰碰胡的牌必碰)
      const exposedTripletCount = player.hand.exposedMelds.filter((m: any) => m.type === 'triplet' || m.type === 'kong').length
      const handPairCount = countPairs(player.hand.concealedTiles)
      const pungsPotential = (exposedTripletCount + handPairCount) >= 4
      return {
        allowed: true,
        tuneDelta:
          0.48 +
          Math.max(0, speedGain) * 0.1 +
          (action === ActionType.CHOW ? 0.2 : 0.12) +
          (action === ActionType.PENG && pungsPotential ? 1.5 : 0) +  // 多副露+多对子必碰
          (committedOpenSuit && claimTile.suit === committedOpenSuit ? 0.35 : 0) +
          wildBaoStartPush + mutualBaoBuildPush + mutualBaoFinalPush +
          chowGapEdgeBoost +
          (action === ActionType.CHOW ? (
            isStrongChow(player.hand.concealedTiles, claimTile) === 'edge' ? 1.5 :
            isStrongChow(player.hand.concealedTiles, claimTile) === 'kant' ? 1.2 :
            isStrongChow(player.hand.concealedTiles, claimTile) === 'gap' ? 0.8 : 0
          ) : 0) +
          (action === ActionType.CHOW && exposedMeldCount >= 1 ? 0.4 : 0),
        reason: 'open_speed_push',
      }

    case 'HALF_FLUSH':
      if (!isHonorTile && routeState.targetSuit && claimTile.suit !== routeState.targetSuit) {
        return { allowed: false, tuneDelta: -1.6, reason: 'off_route_half_flush' }
      }
      // ★ V2.2: 绝张碰牌在混一色路线下也有价值
      if (isDeadTilePung && isHonorTile) {
        return { allowed: true, tuneDelta: 0.9 + routeGain * 0.06 + deadTilePungBonus, reason: 'half_flush_dead_tile_honor_peng' }
      }
      // ★ V2.14 K哥铁律(K哥2446): 混一色路线 + 别家出风/箭牌 + 手牌有该风/箭对子
      // → 碰成风/箭刻 = 混碰牌型(高分) → 强力碰
      // 前提: 不能是 pureFlushUpgradeReady 压制(转清一色冲突)
      const hasHonorPairForClaim = isHonorTile && routeState.features.honorPairCount >= 1
      // ★ V2.14 K哥铁律: 碰了 shanten 降低 → 大幅提升碰牌概率
      // 原条件太严(candidateShanten===0), 改为 shanten 任何降低都触发
      const isShantenImproved = candidateShanten < passShanten
      if (isShantenImproved && !routeState.features.pureFlushUpgradeReady) {
        const tingDelta = (passShanten - candidateShanten) * 0.8 // shanten 每降 1 级 +0.8
        return {
          allowed: true,
          tuneDelta:
            1.8 + // 基础: 强力碰
            tingDelta + // shanten 降幅越大越碰
            routeGain * 0.15 +
            deadTilePungBonus,
          reason: candidateShanten === 0 ? 'half_flush_direct_ting_must_claim' : 'half_flush_shanten_improved',
        }
      }
      if (hasHonorPairForClaim && !routeState.features.pureFlushUpgradeReady) {
        return {
          allowed: true,
          tuneDelta:
            1.5 + // 基础: 强力碰(K哥铁律: 混碰是高分, 必碰)
            routeGain * 0.1 +
            (routeState.features.honorPairCount >= 2 ? 0.6 : 0) + // 多个风对额外加分
            deadTilePungBonus,
          reason: 'half_flush_hun_peng_must_claim',
        }
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
      // ★ V2.5: 纯碰碰胡要求全部是刻子,已破门清(有顺子副露)不适用此路线
      // K哥铁律: 既然已吃过一口,路线就不可能是碰碰胡,ALL_PUNGS 拒绝逻辑不适用
      const hasExposedSequence = player.hand.exposedMelds.some((m: any) => m.type === 'sequence')
      if (action === ActionType.CHOW && hasExposedSequence) {
        // 已有顺子副露 → 不应走 ALL_PUNGS 拒绝路径
        // 跳出该 case, 走到下面的 default 吃牌处理
        break
      }
      // ★ V2: 碰碰胡路线下允许有价值的吃牌（有顺子能更快碰碰胡时）
      // 硬拒绝所有CHOW太严格 → 改为评估CHOW是否真正提升碰碰胡路线
      if (action === ActionType.CHOW) {
        // ★ V2.4: 单边张/两面吃牌豁免碰碰胡拒绝(一二筒吃三筒几乎必吃)
        const strongChowAllPungs = isStrongChow(player.hand.concealedTiles, claimTile)
        if (strongChowAllPungs) {
          const boost = strongChowAllPungs === 'edge' ? 1.5 : strongChowAllPungs === 'kant' ? 1.2 : 0.8
          return { allowed: true, tuneDelta: 0.3 + boost, reason: 'all_pungs_strong_chow_override' }
        }
        // 吃后能减少向听 → 允许
        if (candidateShanten < passShanten) {
          return { allowed: true, tuneDelta: 0.3, reason: 'all_pungs_chow_shanten_gain' }
        }
        // 吃后进张不减少太多 → 允许但减分
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
          (_apAgg && routeState.features.wildCount > 0 ? 0.35 : 0) +
          deadTilePungBonus,
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
          (policy?.allHonorsPungsPursuit || 0) * 0.12 +
          deadTilePungBonus,
        reason: 'honor_claim_push',
      }


    case 'STRIVE_DRAW':
      // ★ V2: 争取流局 → 不吃不碰，保防守
      return { allowed: false, tuneDelta: -3, reason: 'strive_draw_block_all_claims' }
  }

  if (isNumberSuit(claimTile.suit)) {
    return { allowed: true, tuneDelta: routeGain * 0.03, reason: 'default_number_claim' }
  }
  return { allowed: true, tuneDelta: routeGain * 0.02, reason: 'default_claim' }
}
