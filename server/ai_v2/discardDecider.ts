import { TileSuit } from '../types/game'
import { groupTiles, isHonor } from '../utils/tiles'
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

function isPungsPotential(input: RouteDiscardInput): boolean {
  // ★ V2.5 (K哥铁律): 手上有 4 个异门对子/刻子 = 碰碰胡潜质明显
  // 注意: 不是 4 副露, 是手牌+副露里(对子+刻子)累计有 4 个不同门
  // 门口花多 = 额外加分(可以多凑刻子)
  const exposedTripletCount = input.player.hand.exposedMelds.filter((m: any) => m.type === 'triplet' || m.type === 'kong').length
  const handPairTripletCount = (() => {
    let c = 0
    for (const tiles of groupTiles(input.hand).values()) if (tiles.length >= 2) c++
    return c
  })()
  const flowerCount = (input.hand || []).filter((t: any) => t.isFlower || t.suit === 'hua').length
  // 核心: 手牌+副露里对子+刻子总>=4 → 碰碰胡潜质
  // 门口花>=2 → 额外加成(更倾向)
  return exposedTripletCount + handPairTripletCount >= 4
}

function pungsPriorityScore(input: RouteDiscardInput): number {
  // ★ V2.5: 碰碰胡潜质优先级
  // 门口花越多越加分(可以凑刻/做八花等)
  const flowerCount = (input.hand || []).filter((t: any) => t.isFlower || t.suit === 'hua').length
  const isHonor = input.tile.suit === 'feng' || input.tile.suit === 'jian'
  if (!isPungsPotential(input)) return 0
  // 碰碰胡潜质时: 风向单张优先出, 越多花越狠
  if (isHonor && input.tile.suit === 'feng' && sameTypeCount(input) === 1) {
    return 2.5 + Math.min(flowerCount, 4) * 0.5  // 风单张 0花: +2.5, 4花: +4.5
  }
  if (isHonor && sameTypeCount(input) === 1) {
    return 1.8 + Math.min(flowerCount, 4) * 0.4  // 箭单张
  }
  return 0
}

function getObserveBucketScore(input: RouteDiscardInput): number {
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const isSingleton = sameTypeCount(input) === 1
  const isPair = sameTypeCount(input) >= 2
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
  // ★ K哥规则：短门的邻接张（含顺子潜力）一律优先打，不留
  // 原来 +10~+16 是错的 → 短门留顺子等于留垃圾，改成不给分或给负分
  const shortestSeenConnector =
    shortestSuit &&
    input.tile.suit === shortestSuit &&
    nearby > 0 &&
    visibleCopies >= 1 &&
    shortSuitGap >= 4
      ? -3.0  // 短门邻接熟张：打掉，不留
      : 0
  const seenHonorWaste =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies >= 2 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH'
      ? 11 + visibleCopies
      : 0
  // ★ 风箭单张低可见度 → 保留（负分=不打）
  const honorSingletonKeep =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies <= 1 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH' &&
    input.routeState.current !== 'ALL_PUNGS'
      ? -2.5
      : 0
  const exhaustedHonorPair =
    isHonor(input.tile) &&
    isPair &&
    visibleCopies >= 2 &&
    estimatedRound >= 5 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH'
      ? 8 + visibleCopies
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
  const secondSuitSeenWaste =
    secondSuit &&
    input.tile.suit === secondSuit &&
    input.tile.suit !== longestSuit &&
    isSingleton &&
    nearby <= 1 &&
    !isHonor(input.tile) &&
    visibleCopies >= 1
      ? 9 + Math.min(3, visibleCopies)
      : 0

  return Math.max(
    weakUpstreamSuit || 0,
    shortestSeenSingleton || 0,
    shortestSingleton || 0,
    shortestSeenConnector || 0,
    seenHonorWaste || 0,
    exhaustedHonorPair || 0,
    secondSuitWaste || 0,
    secondSuitSeenWaste || 0
  )
}

function getMinorSuitResiduePressure(input: RouteDiscardInput): number {
  const targetSuit = input.routeState.targetSuit || input.afterRouteState.targetSuit || input.routeState.features.longestSuit
  if (!targetSuit) return 0
  if (isHonor(input.tile) || input.tile.suit === targetSuit) return 0
  if (![TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(input.tile.suit)) return 0

  const longestSuitCount = input.routeState.features.longestSuitCount
  const secondSuitCount = input.routeState.features.secondSuitCount
  const honorCount = input.routeState.features.honorCount
  const routeIsSuitConcentrating =
    input.routeState.current === 'HALF_FLUSH' ||
    input.afterRouteState.current === 'HALF_FLUSH' ||
    (longestSuitCount >= 6 && honorCount >= 3)
  const notPungsRoute =
    input.routeState.current !== 'ALL_PUNGS' &&
    input.afterRouteState.current !== 'ALL_PUNGS'
  const lowDiscardRisk = input.discardDanger <= 0.38

  if (!routeIsSuitConcentrating || !notPungsRoute || !lowDiscardRisk) return 0
  if (longestSuitCount < 6 || honorCount < 3 || secondSuitCount === 0 || secondSuitCount > 3) return 0

  const count = sameTypeCount(input)
  const nearby = adjacentCount(input)
  const visibleCopies = countVisibleCopies(input)
  const residueTightness = 4 - secondSuitCount
  const targetAdvantage = Math.max(0, longestSuitCount - secondSuitCount)

  return (
    10.5 +
    residueTightness * 2.8 +
    Math.min(4, count) * 2.2 +
    Math.min(2, nearby) * 1.5 +
    Math.min(5, targetAdvantage) * 0.9 +
    Math.min(2, visibleCopies) * 0.8
  )
}

function scoreByRoute(input: RouteDiscardInput): number {
  const { routeState, tile } = input
  const count = sameTypeCount(input)
  const nearby = adjacentCount(input)
  const visibleCopies = countVisibleCopies(input)
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
  // ★ K哥规则：短门的单张和顺子极不值钱，优先打掉！
  // 正分=打掉，负分=保留。短门单张/顺子给高正分，强制丢弃
  const shortestSuitSequenceBreakBias =
    isShortestSuitTile && count === 1 && nearby > 0
      ? (10.0 + Math.max(0, suitGap - 1) * 1.6)  // 短门顺子单张：极高正分，必打
      : isShortestSuitTile && count === 1 && nearby === 0
        ? (8.0 + Math.max(0, suitGap - 1) * 1.2)  // 短门孤张：高正分，优先打
        : 0
  // 短门对子保护：短门有对子时不要轻易拆（负分=保留）
  const shortestSuitPairReserveBias =
    isShortestSuitTile && count >= 2 && suitGap >= 3
      ? (4.0 + Math.max(0, suitGap - 1) * 0.8)
      : 0
  // 全局对子保护：4+对子时，对子不可拆（不管走哪条路线）
  const globalPairProtection =
    count >= 2 && (routeState.features.pairCount + (routeState.features.tripletCount || 0)) >= 4
      ? 5.0
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
        (isHonor(tile) && count === 1 ? (isOfficialOpening ? -2.4 : 1.2) : 0) +
        (count >= 2 ? -globalPairProtection : 0) +
        pungsPriorityScore(input)
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
        (isHonor(tile) && count === 1 ? 0.4 : 0) +
        (count >= 2 ? -globalPairProtection : 0) +
        pungsPriorityScore(input)
      )

    case 'HALF_FLUSH':
      if (tile.suit === routeState.targetSuit) {
        return (count >= 2 ? -4.4 : -3.2) + (nearby > 0 ? -1.6 : -0.3) + (count >= 2 ? -globalPairProtection : 0)
      }
      if (isHonor(tile)) {
        if (routeState.features.pureFlushUpgradeReady) {
          return count >= 2 ? 5.6 : 3.4
        }
        // ★ 风箭单张保留力度加强（从-0.1改为-1.5），确保短门单张先打
        return count === 1 ? -1.5 : -2.2
      }
      return 5.8 + (tile.suit === shortestSuit ? 1.1 : 0)

    case 'ALL_PUNGS': {
      // ★ 碰碰胡坚决执行：4+对子时单张一律高正分打掉
      const _pairTripletTotal = routeState.features.pairCount + routeState.features.tripletCount
      const _firmCommit = _pairTripletTotal >= 4
      const _discardScore = count >= 2 ? -4.4 : (_firmCommit ? 4.5 : 2.8)
      // 单张在短门且有熟张 → 最高优先打
      const _shortSuit_seen_single =
        count === 1 && isShortestSuitTile && visibleCopies >= 1 ? (_firmCommit ? 6.0 : 4.0) : 0
      // 单张在短门 → 优先打
      const _shortSuit_single =
        count === 1 && isShortestSuitTile ? (_firmCommit ? 4.0 : 2.4) : 0
      // 单张有邻牌（潜在的顺子）→ 拆了不影响对子
      const _adjacent_single =
        count === 1 && nearby > 0 ? (_firmCommit ? 3.0 : 1.8) : 0
      // 对子在短门 → 额外保留
      const _shortSuit_pair =
        count >= 2 && isShortestSuitTile ? -2.2 : 0
      // 对子所属花色短门缺口大 → 更应保留
      const _gap_pair =
        count >= 2 && isShortestSuitTile && suitGap >= 3 ? -1.6 : 0
      // 风箭单张：坚定执行时也要打（不再保留）
      const _honor_single_keep =
        count === 1 && isHonor(tile) ? (_firmCommit ? 1.5 : -1.2) : 0
      // 熟张额外加分（坚决执行时优先打熟张）
      const _seen_bonus =
        count === 1 && visibleCopies >= 2 && _firmCommit ? 2.5 : 0
      return (
        _discardScore +
        _shortSuit_seen_single +
        _shortSuit_single +
        _adjacent_single +
        _shortSuit_pair +
        _gap_pair +
        _honor_single_keep +
        _seen_bonus +
        (isHonor(tile) && count >= 2 ? -1 : 0)
      )
    }

    case 'HONOR_HEAVY':
      if (isHonor(tile)) {
        return count >= 2 ? -4.2 : -1.4
      }
      return 3.8 + (longestSuit && tile.suit !== longestSuit ? 0.6 : 0) + (count >= 2 ? -globalPairProtection : 0)

    case 'STRIVE_DRAW':
      // ★ V2: 争取流局 → 打熟张优先，留安全牌
      if (visibleCopies >= 2) return 8.5 + visibleCopies  // 熟张优先打
      if (count >= 2) return -3.5  // 留对子防点炮
      if (isHonor(tile)) return -1.2  // 留风箭当安全牌
      return 3.2 + (visibleCopies >= 1 ? 2.5 : -1.5)  // 有熟张打熟张，生张慎打
  }
}

export function scoreRouteDiscardCandidate(input: RouteDiscardInput): number {
  const routeBias = scoreByRoute(input)
  const residuePressure = getMinorSuitResiduePressure(input)
  const preservePrimary = input.afterRouteState.current === input.routeState.current ? 1.2 : -1.1
  const targetSuitBonus =
    input.routeState.targetSuit && input.afterRouteState.targetSuit === input.routeState.targetSuit ? 0.6 : 0
  const routeStrengthDelta =
    input.afterRouteState.routeScores[0].score - input.routeState.routeScores[0].score
  const _obsHonorSingletonKeep =
    isHonor(input.tile) && sameTypeCount(input) === 1 && countVisibleCopies(input) <= 1 ? -2.5 : 0
  const observeOrdering =
    input.routeState.phase === 'OBSERVE'
      ? (
        getObserveBucketScore(input) +
        _obsHonorSingletonKeep +
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && sameTypeCount(input) === 1 ? 2.3 : 0) +
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && adjacentCount(input) > 0 ? -3.0 : 0) +  // 短门邻接张：打掉，不留
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
  const pureFlushUpgradeBonus =
    input.routeState.current === 'HALF_FLUSH' &&
    input.routeState.features.pureFlushUpgradeReady &&
    isHonor(input.tile) &&
    sameTypeCount(input) >= 2
      ? 7.5
      : 0

  return routeBias + residuePressure + preservePrimary + targetSuitBonus + observeOrdering + routeStrengthDelta * 0.18 + dangerAdjustment + tingBonus + pureFlushUpgradeBonus
}
