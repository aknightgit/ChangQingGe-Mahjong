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
  // ★ V2.5 (K哥铁律): 4+ 对子/刻子(手牌+副露) = 强碰碰胡潜质, 坚定执行
  const exposedTripletCount = input.player.hand.exposedMelds.filter((m: any) => m.type === 'triplet' || m.type === 'kong').length
  const handPairTripletCount = (() => {
    let c = 0
    for (const tiles of groupTiles(input.hand).values()) if (tiles.length >= 2) c++
    return c
  })()
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
  // ★ K哥铁律(2026-06-05): 短门顺子是垃圾!一律加大打掉力度,不保留任何短门顺子。
  // 短门邻接张(含顺子潜力)统统给负分
  // 熟张 ≥ 1 + gap >= 3 → -5.0 强打
  // 邻接张 ≥ 1 (任意 gap) → -2.0 保持打掉
  const shortestSeenConnector =
    shortestSuit &&
    input.tile.suit === shortestSuit &&
    nearby > 0 &&
    visibleCopies >= 1 &&
    shortSuitGap >= 3
      ? -5.0  // 短门邻接熟张+gap大:强打
      : shortestSuit &&
        input.tile.suit === shortestSuit &&
        nearby > 0
        ? -2.0  // 短门邻接张(任意gap):打掉
        : 0
  // ★ K哥铁律(2026-06-06): 熟张风箭(visibleCopies>=1)提高打掉意愿
  // 外面>=2时大幅拉开(13 + visibleCopies*4), 外面==1时适度(11 + 1)
  const seenHonorWaste =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies >= 1 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH'
      ? (visibleCopies >= 2
          ? 13 + visibleCopies * 4   // >=2: 13/17/21 (大幅提高)
          : 12)                       // ==1: 12 (略提, 11→12)
      : 0
  // ★ V2.15 K哥铁律: 多张风牌待打时,优先打熟张(出现过的)
  // visibleCopies >= 1 的风牌比未出现的优先打
  const honorSeenPreference =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies >= 1 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH' &&
    input.routeState.current !== 'ALL_PUNGS'
      ? 1.5 + visibleCopies * 0.8
      : 0
  // ★ 风箭单张低可见度 → 保留(负分=不打)
  const honorSingletonKeep =
    isHonor(input.tile) &&
    isSingleton &&
    visibleCopies <= 0 &&
    input.routeState.current !== 'HONOR_HEAVY' &&
    input.routeState.current !== 'HALF_FLUSH' &&
    input.routeState.current !== 'ALL_PUNGS'
      ? -1.0  // ★ K哥铁律(2026-06-08): 生张风箭危险评估从-2.5降为-1.0, 目标门和风箭生张之间, 风箭生张微弱胜出
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
    honorSeenPreference || 0,
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
  // ★ K哥规则:短门的单张和顺子极不值钱,优先打掉!
  // 正分=打掉,负分=保留。短门单张/顺子给高正分,强制丢弃
  const shortestSuitSequenceBreakBias =
    isShortestSuitTile && count === 1 && nearby > 0
      ? (10.0 + Math.max(0, suitGap - 1) * 1.6)  // 短门顺子单张:极高正分,必打
      : isShortestSuitTile && count === 1 && nearby === 0
        ? (8.0 + Math.max(0, suitGap - 1) * 1.2)  // 短门孤张:高正分,优先打
        : 0
  // 短门对子保护:短门有对子时不要轻易拆(负分=保留)
  const shortestSuitPairReserveBias =
    isShortestSuitTile && count >= 2 && suitGap >= 3
      ? (4.0 + Math.max(0, suitGap - 1) * 0.8)
      : 0
  // 全局对子保护:4+对子时,对子不可拆(不管走哪条路线)
  const globalPairProtection =
    count >= 2 && (routeState.features.pairCount + (routeState.features.tripletCount || 0)) >= 4
      ? 5.0
      : 0
  const longestSuitSingletonKeepBias =
    isLongestSuitTile && count === 1
      ? 1.2 + nearby * 0.5 + Math.max(0, suitGap - 1) * 0.35
      : 0

  // ★ V2.12 K哥铁律: 非长门(包括短门/次短门) 坬张/顺子搭子优先打
  // 对子根据路线动态调整:
  // - 碰碰胡方向(hunPengReady/qingPengReady/pairCount>=3): 保留对子观察
  // - 明确清/混一色(HALF_FLUSH + secondSuitCount===0): 压制对子
  // - 其他情况: 轻微打破
  const isSecondSuit = input.routeState.features.secondSuit && tile.suit === input.routeState.features.secondSuit
  const isShortSuitFamily = isShortestSuitTile || isSecondSuit
  const shortSuitSequenceBreakBias =
    isShortSuitFamily && !isLongestSuitTile && count === 1
      ? 6.0 + (nearby > 0 ? 2.0 : 0) + (visibleCopies >= 1 ? Math.min(3, visibleCopies) * 1.2 : 0)
      : 0

  // ★ V2.13 保守方案: 多路线感知 - top2 路线差距影响对子打破强度
  // 路线近距离(gap小): 保守,保留对子观察
  // 路线远距离(gap大): 明确路线, 果断打破/保留
  const _routeScores = input.routeState.routeScores || []
  const _topRoute = _routeScores[0]
  const _secondRoute = _routeScores[1]
  const _topScore = _topRoute?.score || 0
  const _secondScore = _secondRoute?.score || 0
  const _routeGap = _topScore - _secondScore
  const _secondRouteName = _secondRoute?.route || null
  // 次路线是碰碰胡/清混一色 都需考虑
  const _secondIsPungs = _secondRouteName === 'ALL_PUNGS'
  const _secondIsFlush = _secondRouteName === 'HALF_FLUSH'

  const _hunPengReady = input.routeState.features.hunPengReady
  const _qingPengReady = input.routeState.features.qingPengReady
  const _pairCount = input.routeState.features.pairCount
  const _hasPungPotential = _hunPengReady || _qingPengReady || _pairCount >= 3
  const _flushLocked = input.routeState.current === 'HALF_FLUSH' && input.routeState.features.secondSuitCount === 0
  // 短门/次短门 对子 处理:
  // 1. 主路线锁定清混 + 场次路线明显较低 → 强打破 (+4.5)
  // 2. 有碰碰胡潜质 且 (次路线是碰碰胡 或 路线未定) → 保留对子 (0)
  // 3. 其他情况 → 轻微打破 (+1.5)
  // 多路线加权: 路线越明确, 打破越强
  let shortSuitFamilyPairBreak = 0
  if (isShortSuitFamily && !isLongestSuitTile && count >= 2) {
    // ★ V2.16: ALL_PUNGS 路线 + lockLevel>=1 → 短门对子也保留(碰碰胡坚定执行)
    const _allPungsLocked = input.routeState.current === 'ALL_PUNGS' && (input.routeState.lockLevel ?? 0) >= 1
    // ★ K哥铁律(2026-06-05): HONOR_HEAVY 路线 + lockLevel>=1 → 风箭对子也保留(风一色坚定执行)
    const _honorLocked = input.routeState.current === 'HONOR_HEAVY' && (input.routeState.lockLevel ?? 0) >= 1
    if (_flushLocked && _routeGap >= 3) {
      // 明确清混一色 + 路线锁定 → 强打破
      shortSuitFamilyPairBreak = 4.5
    } else if (_hasPungPotential || _allPungsLocked || _honorLocked) {
      // 有碰碰胡潜质 或 碰碰胡已锁定 或 风一色已锁定 → 保留对子
      shortSuitFamilyPairBreak = 0
    } else {
      // 其他情况: 路线越近越保守
      const _commitFactor = Math.min(1, _routeGap / 6)
      shortSuitFamilyPairBreak = 1.5 * (0.4 + _commitFactor * 0.6)
    }
  }

  // ★ speedMode 分支（独立于 route）
  if (routeState.speedMode === 'MENQING') {
      return (
        (isShortestSuitTile ? 5.1 + suitGap * 0.6 : 0) +
        shortestSuitSequenceBreakBias +
        shortSuitSequenceBreakBias +
        shortSuitFamilyPairBreak +
        (isShortestSuitTile && count >= 2 ? -shortestSuitPairReserveBias : 0) +
        (count === 1 ? 1.2 : -2.6) +
        // ★ V2.12: 长门坬张 保留, 非长门坬张 打掉
        (isLongestSuitTile && count === 1 ? -1.8 : 0) +
        (isLongestSuitTile && count === 1 && nearby > 0 ? -1.2 : 0) +
        (isLongestSuitTile ? -longestSuitSingletonKeepBias : 0) +
        (isHonor(tile) && count === 1 ? (isOfficialOpening ? -2.4 : 1.2) : 0) +
        (count >= 2 ? -globalPairProtection : 0) +
        pungsPriorityScore(input)
      )
  }

  if (routeState.speedMode === 'OPEN') {
      return (
        (count === 1 ? 2.2 : -1.6) +
        (longestSuit && tile.suit !== longestSuit && !isHonor(tile) ? 2.2 : 0) +
        (isShortestSuitTile ? 2.4 + shortestSuitSequenceBreakBias : 0) +
        shortSuitSequenceBreakBias +
        shortSuitFamilyPairBreak +
        (isShortestSuitTile && count >= 2 ? -Math.max(1.4, shortestSuitPairReserveBias * 0.6) : 0) +
        (isLongestSuitTile ? -Math.max(0.8, longestSuitSingletonKeepBias * 0.85) : 0) +
        (routeState.targetSuit && tile.suit !== routeState.targetSuit && !isHonor(tile) ? 4.8 : 0) +
        (routeState.targetSuit && tile.suit === routeState.targetSuit && !isHonor(tile) ? -2.6 : 0) +
        (isHonor(tile) && count === 1 ? 0.4 : 0) +
        (count >= 2 ? -globalPairProtection : 0) +
        pungsPriorityScore(input)
      )
  }

  switch (routeState.current) {
    case 'HALF_FLUSH':
      // ★ V2.6 K哥铁律(真正版): 做清/混一色时
      // - 优先保留 targetSuit 数字牌(核心资源, 凑清一色)
      // - ★ V2.2: 保留风牌(等风牌积累够了转风一色)
      if (tile.suit === routeState.targetSuit) {
        // targetSuit 数字牌: 强保留, 包括单张(凑清一色)
        return (count >= 2 ? -4.4 : -2.5) + (nearby > 0 ? -1.2 : 0) + (count >= 2 ? -globalPairProtection : 0)
      }
      if (isHonor(tile)) {
        // ★ V2.7 Phase 1: 已接近清一色(可升级), 坚决打掉风/箭
        if (routeState.features.pureFlushUpgradeReady) {
          const _isExposedSingleSuit = (routeState.features as any).isExposedSingleSuit === true
          if (_isExposedSingleSuit) return count >= 2 ? 9.0 : 7.5
          return count >= 2 ? 7.0 : 5.5
        }
        // ★ V2.14: 长门>=7 + 风牌对子<=1 → 打风牌转清一色(温和)
        const _longestSuit = routeState.features.longestSuitCount || 0
        const _honorPairCount = routeState.features.honorPairCount || 0
        const _secondSuit = routeState.features.secondSuitCount || 0
        const _isExposedSingleSuit = (routeState.features as any).isExposedSingleSuit === true
        if (_longestSuit >= 8 && _honorPairCount <= 1 && _secondSuit <= 1) {
          return count >= 2 ? 3.5 : 2.5
        }
        if (_isExposedSingleSuit) {
          return count >= 2 ? 3.0 : 2.0
        }
        // ★ V2.15: 有百搭(>=1)→清一色动力,风牌坚决打掉
        // 牌局未过半(牌墙>50%)时更激进
        const wildCount = input.routeState?.features?.wildCount ?? 0
        const wallRemaining = input.game?.wall?.length || 0
        const isEarlyGame = wallRemaining > 50  // 牌墙>50=未过半
        if (wildCount >= 1) {
          if (isEarlyGame) return count >= 2 ? 7.5 : 6.5  // 早期+百搭→风牌坚决打
          return count >= 2 ? 5.5 : 4.5  // 中后期→温和打风牌
        }
        if (count >= 2) return -3.0
        return -1.0
      }
      // ★ V2.7 Phase 1.1: 门口已单门时，非 targetSuit 数牌要更坚决打掉
      if ((routeState.features as any).isExposedSingleSuit === true && tile.suit !== routeState.targetSuit && tile.suit !== 'hua') {
        // 门口已单门 → 非清一色花色的数牌坚决打掉 (+9.0 远超普通 +5.8)
        return 9.0 + (tile.suit === shortestSuit ? 1.5 : 0)
      }
      return 5.8 + (tile.suit === shortestSuit ? 1.1 : 0)

    case 'ALL_PUNGS': {
      // ★ 碰碰胡坚决执行:4+对子时单张一律高正分打掉
      const _pairTripletTotal = routeState.features.pairCount + routeState.features.tripletCount
      const _firmCommit = _pairTripletTotal >= 4
      const _discardScore = count >= 2 ? -4.4 : (_firmCommit ? 5.5 : 3.5)
      // 单张在短门且有熟张 → 最高优先打
      const _shortSuit_seen_single =
        count === 1 && isShortestSuitTile && visibleCopies >= 1 ? (_firmCommit ? 7.0 : 5.0) : 0
      // 单张在短门 → 优先打
      const _shortSuit_single =
        count === 1 && isShortestSuitTile ? (_firmCommit ? 5.0 : 3.2) : 0
      // 单张有邻牌(潜在的顺子)→ 拆了不影响对子
      const _adjacent_single =
        count === 1 && nearby > 0 ? (_firmCommit ? 3.5 : 2.2) : 0
      // 对子在短门 → 额外保留
      const _shortSuit_pair =
        count >= 2 && isShortestSuitTile ? -2.2 : 0
      // 对子所属花色短门缺口大 → 更应保留
      const _gap_pair =
        count >= 2 && isShortestSuitTile && suitGap >= 3 ? -1.6 : 0
      // ★ V2.2: 风箭单张坚决打(碰碰胡不需要风牌单张)
      const _honor_single_keep =
        count === 1 && isHonor(tile) ? (_firmCommit ? 2.5 : 1.0) : 0
      // ★ V2.2: 熟张额外加分(碰碰胡优先打熟张,降低放炮风险)
      const _seen_bonus =
        count === 1 && visibleCopies >= 1 ? (_firmCommit ? 3.5 : 2.0) : 0
      // ★ V2.2: 多人做的数字门单张 → 坚决打(别留)
      const _others_doing_single =
        count === 1 && !isHonor(tile) && visibleCopies >= 2 ? 2.0 : 0
      return (
        _discardScore +
        _shortSuit_seen_single +
        _shortSuit_single +
        _adjacent_single +
        _shortSuit_pair +
        _gap_pair +
        _honor_single_keep +
        _seen_bonus +
        _others_doing_single +
        (isHonor(tile) && count >= 2 ? -1 : 0)
      )
    }

    case 'HONOR_HEAVY':
      if (isHonor(tile)) {
        return count >= 2 ? -4.2 : -1.4
      }
      // ★ V2.2: 风一色路线坚决打数牌，分数越高越积极
      // 数牌单张: 10.0 (最高优先), 数牌对子: 7.0 (仍鼓励打)
      return (count >= 2 ? 7.0 : 10.0) + (longestSuit && tile.suit !== longestSuit ? 1.5 : 0)

    case 'STRIVE_DRAW':
      // ★ V2: 争取流局 → 打熟张优先,留安全牌
      if (visibleCopies >= 2) return 8.5 + visibleCopies  // 熟张优先打
      if (count >= 2) return -3.5  // 留对子防点炮
      if (isHonor(tile)) return -1.2  // 留风箭当安全牌
      return 3.2 + (visibleCopies >= 1 ? 2.5 : -1.5)  // 有熟张打熟张,生张慎打
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
        // ★ K哥铁律(2026-06-05): 短门单张 → 无论如何优先打
        // 熟张(家门口/弃牌区可见) → 最低分，绝对优先打
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && sameTypeCount(input) === 1
          ? (countVisibleCopies(input) >= 1 ? 6.0 : 3.5) : 0) +
        (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && adjacentCount(input) > 0 ? -3.0 : 0) +  // 短门邻接张:打掉,不留
        (input.routeState.features.shortestSuitCount > 0 &&
          input.routeState.features.longestSuitCount - input.routeState.features.shortestSuitCount >= 4 &&
          input.routeState.features.shortestSuit &&
          input.tile.suit === input.routeState.features.shortestSuit &&
          sameTypeCount(input) >= 2 ? -2.6 : 0) +
        (input.routeState.features.upstreamVoidSuit && input.tile.suit === input.routeState.features.upstreamVoidSuit && sameTypeCount(input) === 1 ? 1.5 : 0) +
        // ★ K哥铁律(2026-06-05): 上家吃过该门数牌 → 才加大打掉
        // 但长门>=次短门+3 → 绝不拆长门避上游（长门太强，卡上游更重要）
        (input.routeState.features.upstreamEatenSuits?.includes(input.tile.suit) &&
          sameTypeCount(input) === 1 &&
          !(input.tile.suit === input.routeState.features.longestSuit &&
            (input.routeState.features.longestSuitCount || 0) >= 3 &&
            (input.routeState.features.longestSuitCount || 0) - (input.routeState.features.secondSuitCount || 0) >= 3) &&
          (input.routeState.features.longestSuit !== input.tile.suit || (input.routeState.features.longestSuitCount || 0) < 3)
            ? 3.0 : 0) +
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
  // ★ V2.2: 听牌精度优化 — 提高ting权重，让AI更积极听牌
  // shanten=0: 听牌多→强烈保留（自摸概率高），危险牌惩罚适度降低
  // shanten=1: 向听推进→中等奖励（差1步到听牌）
  // shanten=2: 结构优化→小奖励（保留对子/刻子）
  const tingBonus =
    input.candidateShanten === 0
      ? input.winningTiles * 0.35 - input.discardDanger * 1.5
      : input.candidateShanten === 1
        ? input.candidateEffective * 0.12 + 0.8
        : input.candidateShanten === 2
          ? (input.routeState.features.pairCount + input.routeState.features.tripletCount) * 0.15
          : 0
  // ★ V2.2: 混一色转清一色 — 结合动态形势
  // 打掉一对风向可以升级清一色
  // 动态调整：早局+有百搭+对手不快 → 更积极升级
  let pureFlushUpgradeBonus = 0
  if (
    input.routeState.current === 'HALF_FLUSH' &&
    input.routeState.features.pureFlushUpgradeReady &&
    isHonor(input.tile) &&
    sameTypeCount(input) >= 2
  ) {
    const doorFlowers = (input.player.hand.exposedMelds || []).reduce(
      (cnt: number, m: any) => cnt + (m.tiles || []).filter((t: any) => t.suit === 'hua' || t.isFlower).length, 0)
    const exposedMeldCount = (input.player.hand.exposedMelds || []).length
    // 基础bonus：打掉一对风向升级清一色
    pureFlushUpgradeBonus = 10.0
    // 百搭越多 → 越值得升级（百搭可以补风向的空缺）
    if (input.routeState.features.wildCount >= 2) pureFlushUpgradeBonus += 3.0
    else if (input.routeState.features.wildCount >= 1) pureFlushUpgradeBonus += 1.5
    // 门口花越多,已有番数越高,转清一色越不值
    pureFlushUpgradeBonus -= doorFlowers * 1.0
    pureFlushUpgradeBonus -= exposedMeldCount * 0.2
    pureFlushUpgradeBonus = Math.max(pureFlushUpgradeBonus, 0)
  }

  // ★ V2.13 保守方案: 多路线感知 - top2 路线差距调整对子/坬张
  // - 路线未定(gap小): 保留对子(观察)
  // - 主路线是 ALL_PUNGS(碰碰胡) 且 gap 大: 保留对子, 拆坬张
  // - 主路线是 HALF_FLUSH 且 gap 大: 打破对子
  // - 主路线是 HONOR_HEAVY(风一色) 且 gap 大: 数牌坬张必打
  // - 次路线是 ALL_PUNGS/碰碰胡候选: 额外保留对子(防万一)
  let multiRouteTuneDelta = 0
  const _topRoute = (input.routeState.routeScores || [])[0]
  const _secondRoute = (input.routeState.routeScores || [])[1]
  const _topName = _topRoute?.route || null
  const _secondName = _secondRoute?.route || null
  const _topScore2 = _topRoute?.score || 0
  const _secondScore2 = _secondRoute?.score || 0
  const _gap2 = _topScore2 - _secondScore2
  const _tileCount = sameTypeCount(input)
  // ── 对子专用 (count >= 2) ─────────────────────────────────
  if (_tileCount >= 2) {
    // 路线未定(差距 < 4)→ 保留对子
    if (_gap2 < 4) multiRouteTuneDelta -= 0.8
    // 主路线碰碰胡 → 保留对子
    if (_topName === 'ALL_PUNGS' && _gap2 >= 2) multiRouteTuneDelta -= 1.2
    // 次路线碰碰胡 → 保留对子(防万一转)
    if (_secondName === 'ALL_PUNGS' && _gap2 < 5) multiRouteTuneDelta -= 0.6
    // 主路线清混一色 + 路线锁定 → 轻微打破对子 (+0.5, 避免与 shortSuitFamilyPairBreak 重复)
    if (_topName === 'HALF_FLUSH' && _gap2 >= 4) multiRouteTuneDelta += 0.5
    // 次路线风一色 → 保留风箭对子(防万一转)
    if (_secondName === 'HONOR_HEAVY' && _gap2 < 5 && isHonor(input.tile)) multiRouteTuneDelta -= 0.4
  }
  // ── 坬张专用 (count === 1) ─────────────────────────────────
  if (_tileCount === 1) {
    // 次路线风一色 + 主路线不是风一色: 数牌坬张必打 (转向风一色机会)
    if (_secondName === 'HONOR_HEAVY' && _topName !== 'HONOR_HEAVY' && _gap2 < 6 && !isHonor(input.tile)) {
      multiRouteTuneDelta += 2.0
    }
    // 主路线风一色 + 路线锁定: 数牌坬张必打
    if (_topName === 'HONOR_HEAVY' && _gap2 >= 3 && !isHonor(input.tile)) {
      multiRouteTuneDelta += 1.5
    }
  }

  // ★ 风险感知：根据对手路线和自身牌力动态调整
  let riskPenalty = 0
  const risk = input.riskAssessment
  if (risk) {
    const tileDanger = risk.dangerousSuits.get(input.tile.suit) || 0
    if (tileDanger > 0) {
      // 基础危险度惩罚：该门越危险，打这张的惩罚越大
      riskPenalty = -tileDanger * 8 // 最高 -8 分
      // 自身牌力压制：牌越强，惩罚越小（可以冒险）
      riskPenalty *= (1 - risk.selfStrength * 0.8) // strength=1 → 惩罚×0.2
      // 风险容忍度调节
      riskPenalty *= (1 - risk.riskTolerance * 0.5) // tolerance=1 → 惩罚×0.5
    }

    // ★ 下家额外危险惩罚：下家能吃牌，动态识别
    const nextPlayerDanger = risk.nextPlayerDanger.get(input.tile.suit) || 0
    if (nextPlayerDanger > 0) {
      let nextPenalty = -nextPlayerDanger * 6 // 最高 -9 分（×1.5权重后）
      nextPenalty *= (1 - risk.selfStrength * 0.8)
      nextPenalty *= (1 - risk.riskTolerance * 0.5)
      riskPenalty += nextPenalty
    }

    // 听牌状态下危险牌额外惩罚（对手快胡了，自己还没胡）
    if (risk.maxThreat > 0.7 && input.candidateShanten > 0) {
      riskPenalty -= 2.0
    }
  }

  return routeBias + residuePressure + preservePrimary + targetSuitBonus + observeOrdering + routeStrengthDelta * 0.18 + dangerAdjustment + tingBonus + pureFlushUpgradeBonus + multiRouteTuneDelta + riskPenalty
}
