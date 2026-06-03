// ai_v2/pathSelector.ts — V2 路径选择引擎（激进权重 + STRIVE_DRAW）
// 基于 server/ai/route/routeEvaluator.ts，修改关键权重

import { TileSuit, MeldType, type Tile } from '../types/game'
import { groupTiles, isDragon, isHonor, isWind } from '../utils/tiles'
import { detectDecisionPhase } from '../ai/route/phaseDetector'
import type { RouteFeatureSummary, RouteScore, RouteState, RouteKind, DecisionPhase } from './types'

const NUMBER_SUITS: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
const ROUTES: RouteKind[] = ['MENQING_SPEED', 'OPEN_SPEED', 'HALF_FLUSH', 'ALL_PUNGS', 'HONOR_HEAVY', 'STRIVE_DRAW']

function getPolicyValue(policy: any, key: string, fallback = 0): number {
  const raw = Number(policy?.[key] ?? fallback)
  return Number.isFinite(raw) ? raw : fallback
}

function getRouteBucketBoost(policy: any, handQuality: number, isHighMult: boolean, route: RouteKind): number {
  if (handQuality < 5) return 0
  const multPrefix = isHighMult ? 'multHigh' : 'multLow'
  if (route === 'ALL_PUNGS') return getPolicyValue(policy, multPrefix + 'Hand' + handQuality + 'AllPungs')
  if (route === 'HALF_FLUSH') return getPolicyValue(policy, multPrefix + 'Hand' + handQuality + 'HalfFlush')
  return 0
}

function getPureFlushBucketBoost(policy: any, handQuality: number, isHighMult: boolean): number {
  if (handQuality < 6) return 0
  const multPrefix = isHighMult ? 'multHigh' : 'multLow'
  return getPolicyValue(policy, multPrefix + 'Hand' + handQuality + 'PureFlush')
}

function getWildRouteBoost(policy: any, wildCount: number, route: 'meld' | 'flush' | 'honors' | 'allPungs'): number {
  if (wildCount <= 0) return 0
  const bucket = wildCount >= 3 ? 'wild3' : wildCount === 2 ? 'wild2' : 'wild1'
  const suffix = route === 'meld' ? 'RouteMeldPush' : route === 'flush' ? 'RouteFlushBoost' : route === 'honors' ? 'RouteHonorsBoost' : 'RouteAllPungsBoost'
  return getPolicyValue(policy, bucket + suffix)
}

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game?.inheritMultiplier ?? game?.inheritedGlobalMultiplier ?? 1
  const round = game?.roundMultiplier ?? 1
  return Math.min(inherit * round, 8)
}

function countAdjacentPartners(tile: Tile, hand: Tile[]): number {
  if (!NUMBER_SUITS.includes(tile.suit)) return 0
  return hand.filter(c => c.id !== tile.id && c.suit === tile.suit && Math.abs(c.value - tile.value) > 0 && Math.abs(c.value - tile.value) <= 2).length
}

function countRawTiles(hand: Tile[], discardPile: Tile[]): number {
  return hand.filter(tile => {
    const visible = discardPile.filter(d => d.suit === tile.suit && d.value === tile.value).length
    return visible === 0
  }).length
}

export function buildFeatureSummary(input: {
  game: any; player: any; hand: Tile[]; shanten: number; effectiveTiles: number; tableThreat: number; wallRemaining: number
}): RouteFeatureSummary {
  const { game, player, hand } = input
  const suitCounts: Record<string, number> = {}
  const groups = groupTiles(hand)
  let pairCount = 0, tripletCount = 0, isolatedCount = 0, honorCount = 0, honorPairCount = 0, weakHonorPairCount = 0, wildCount = 0

  for (const tile of hand) {
    if (tile.isWild) wildCount++
    if (NUMBER_SUITS.includes(tile.suit)) suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1
    if (isHonor(tile)) honorCount++
  }

  for (const [, tiles] of groups.entries()) {
    if (tiles.length >= 2) pairCount++
    if (tiles.length >= 3) tripletCount++
    const sample = tiles[0]
    if (isHonor(sample) && tiles.length >= 2) honorPairCount++
    if (isHonor(sample) && tiles.length === 2) weakHonorPairCount++
    if (tiles.length === 1 && countAdjacentPartners(sample, hand) === 0) isolatedCount++
  }

  // 已碰/已杠的暴露刻子也算入 tripletCount（碰碰胡路线识别）
  for (const meld of player.hand.exposedMelds) {
    if (meld.type === MeldType.TRIPLET && meld.tiles.length >= 3) {
      tripletCount++
      if (isHonor(meld.tiles[0])) honorPairCount++
    }
  }

  let sequenceLikeCount = 0
  for (const tile of hand) { if (countAdjacentPartners(tile, hand) > 0) sequenceLikeCount++ }

  const orderedSuits = NUMBER_SUITS.map(s => ({ suit: s, count: suitCounts[s] || 0 })).sort((a, b) => b.count - a.count)
  const longestSuit = orderedSuits[0]?.count ? orderedSuits[0].suit : null
  const longestSuitCount = orderedSuits[0]?.count || 0
  const secondSuitCount = orderedSuits[1]?.count || 0
  const shortestSuitEntry = [...orderedSuits].reverse().find(e => e.count > 0) || null

  // upstream analysis
  const upstream = game.players[(player.position + 3) % game.players.length]
  const upstreamDiscards = (upstream?.hand.discardedTiles || []).filter((d: Tile) => NUMBER_SUITS.includes(d.suit))
  const upstreamSuitCounts: Record<string, number> = {}
  for (const d of upstreamDiscards) upstreamSuitCounts[d.suit] = (upstreamSuitCounts[d.suit] || 0) + 1
  const upstreamVoidSuit = NUMBER_SUITS.map(s => ({ suit: s, count: upstreamSuitCounts[s] || 0 })).sort((a, b) => b.count - a.count)[0]
  const upstreamRejectedSuit = NUMBER_SUITS.map(s => ({ suit: s, count: upstreamSuitCounts[s] || 0 })).sort((a, b) => b.count - a.count)[0]

  const allOpponentsAvoidSuit = NUMBER_SUITS.find(s => game.players.filter((c: any) => c.id !== player.id).every((c: any) => (c.hand.discardedTiles || []).some((d: Tile) => d.suit === s))) || null
  const opponents = game.players.filter((c: any) => c.id !== player.id)
  const opponentOpenMelds = opponents.reduce((sum: number, c: any) => sum + (c.hand.exposedMelds?.length || 0), 0)
  const bigOpenOpponentCount = opponents.filter((c: any) => { const m = c.hand.exposedMelds || []; if (m.length >= 3) return true; let hm = 0; const ss = new Set<TileSuit>(); for (const meld of m) { for (const t of meld.tiles || []) { if (isHonor(t)) hm++; if (NUMBER_SUITS.includes(t.suit)) ss.add(t.suit) } } return hm >= 3 || (m.length >= 2 && ss.size === 1) }).length
  const downstream = game.players[(player.position + 1) % game.players.length]
  const downstreamPressure = (downstream?.hand.exposedMelds?.length || 0) * 0.45 + (downstream?.isTing ? 0.9 : 0)
  const oneSuitOpponentCount = opponents.filter((c: any) => { const ns = new Set<TileSuit>(); let nt = 0; for (const m of c.hand.exposedMelds || []) { for (const t of m.tiles || []) { if (!NUMBER_SUITS.includes(t.suit)) continue; ns.add(t.suit); nt++ } } return nt >= 3 && ns.size === 1 }).length
  const fastOpenOpponentCount = opponents.filter((c: any) => (c.hand.exposedMelds?.length || 0) >= 2 || !!c.isTing).length

  let liveHonorCount = 0
  for (const suit of [TileSuit.WIND, TileSuit.DRAGON]) {
    const maxValue = suit === TileSuit.WIND ? 4 : 3
    for (let value = 1; value <= maxValue; value++) {
      const visible = (game.discardPile || []).filter((t: Tile) => t.suit === suit && t.value === value).length
        + game.players.reduce((sum: number, c: any) => sum + c.hand.exposedMelds.reduce((ms: number, m: any) => ms + m.tiles.filter((t: Tile) => t.suit === suit && t.value === value).length, 0), 0)
      if (visible < 3) liveHonorCount++
    }
  }

  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const pureFlushUpgradeReady = longestSuitCount >= 10 && secondSuitCount === 0 && honorPairCount >= 1 && honorCount <= 2 && weakHonorPairCount >= 1 && estimatedRound <= 15 && input.tableThreat <= 0.58 && opponentOpenMelds <= 3 && downstreamPressure <= 0.75 && oneSuitOpponentCount === 0 && effectiveGlobalMultiplier <= 3

  // ★ V2: 生张计数
  const rawTileCount = countRawTiles(hand, game.discardPile || [])

  // ★ V2: 两口关系检测 — 两个对手做同一门清混一色，互相卡死
  const opponentSuitConcentration: Record<string, number> = {}
  for (const c of opponents) {
    const ns = new Set<TileSuit>()
    for (const m of c.hand.exposedMelds || []) {
      for (const t of m.tiles || []) { if (NUMBER_SUITS.includes(t.suit)) ns.add(t.suit) }
    }
    if (ns.size === 1) { const s = [...ns][0]; opponentSuitConcentration[s] = (opponentSuitConcentration[s] || 0) + 1 }
  }
  const blockedSuit = Object.entries(opponentSuitConcentration).find(([, cnt]) => cnt >= 2)?.[0] || null
  const twoPlayerBlocking = Object.values(opponentSuitConcentration).some(cnt => cnt >= 2)

  return {
    longestSuit, longestSuitCount,
    shortestSuit: shortestSuitEntry?.suit || null, shortestSuitCount: shortestSuitEntry?.count || 0,
    secondSuitCount, pairCount, tripletCount, sequenceLikeCount, isolatedCount,
    honorCount, honorPairCount, wildCount,
    upstreamVoidSuit: upstreamVoidSuit && (upstreamVoidSuit.count >= 2) ? upstreamVoidSuit.suit : null,
    upstreamRejectedSuit: upstreamRejectedSuit && upstreamRejectedSuit.count >= 2 ? upstreamRejectedSuit.suit : null,
    allOpponentsAvoidSuit, liveHonorCount, opponentOpenMelds, fastOpenOpponentCount, bigOpenOpponentCount, downstreamPressure, oneSuitOpponentCount,
    pureFlushUpgradeReady, weakHonorPairCount, rawTileCount,
    blockedSuit, twoPlayerBlocking,
  }
}

// ═══════════════════════════════════════════════
// ★ V2 路径评分 — 激进权重版本
// ═══════════════════════════════════════════════
function evaluateSingleRoute(route: RouteKind, input: any, features: RouteFeatureSummary): RouteScore {
  const reasons: string[] = []
  let score = 0
  let targetSuit: TileSuit | null = null
  const policy = input.policy ?? null
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(input.game)
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const handQuality = features.longestSuitCount >= 7 ? 7 : features.longestSuitCount >= 6 ? 6 : features.longestSuitCount >= 5 ? 5 : 0
  const handRouteBias = handQuality >= 7 ? getPolicyValue(policy, 'hand7RouteBias') : handQuality >= 6 ? getPolicyValue(policy, 'hand6RouteBias') : handQuality >= 5 ? getPolicyValue(policy, 'hand5RouteBias') : 0
  const isHighMult = effectiveGlobalMultiplier >= 4
  const routeBucketBoost = getRouteBucketBoost(policy, handQuality, isHighMult, route)
  const pureFlushBucketBoost = getPureFlushBucketBoost(policy, handQuality, isHighMult)
  const earlyPairHeavy = estimatedRound <= 5 && features.pairCount >= 4
  const noWildOpenPush = features.wildCount === 0
  const multiWildMenqingPush = features.wildCount >= 2
  const oneWildLongSuitPivot = features.wildCount === 1 && features.longestSuitCount >= 6
  const suitedPairCount = Math.max(0, features.pairCount - features.honorPairCount)
  const qingPengReady = features.longestSuitCount >= 8 && features.secondSuitCount === 0 && features.honorCount <= 2
  const hunPengReady = features.longestSuitCount >= 6 && features.honorCount >= 2 && features.secondSuitCount <= 1
  const upstreamRejectedLongSuit = !!features.upstreamRejectedSuit && features.longestSuit === features.upstreamRejectedSuit && features.longestSuitCount >= 6

  // ★ V2: 争取流局条件检查
  const shouldStriveDraw = input.wallRemaining <= 20 && input.shanten > 2 && input.tableThreat >= 0.7 && features.rawTileCount >= 3

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
      if (noWildOpenPush) score -= 3.8  // ★ V2.2: 无百搭时门清更难成型，降低概率
      if (oneWildLongSuitPivot) score -= 0.9
      if (upstreamRejectedLongSuit) score -= 2.4
      if (earlyPairHeavy) score -= 3.8
      if (multiWildMenqingPush) score += 2.8
      if (input.player.hand.exposedMelds.length === 0) score += 3
      if (input.shanten <= 2 && features.isolatedCount <= 2) score += 2.5
      if (features.upstreamVoidSuit) { reasons.push('upstream_void_suit'); score += 1.5 }
      score += getPolicyValue(policy, 'wallEarlySpeedPush') * 0.8
      // ★ V2: 如果应该争取流局，门清不再有价值
      if (shouldStriveDraw) score -= 20
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
      if (upstreamRejectedLongSuit) { reasons.push('upstream_rejected_long_suit'); score += 8.0 /* ★ V2: 3.2→8.0 */ }
      if (earlyPairHeavy) { reasons.push('early_pair_heavy_open_push'); score += 2.1 }
      if (multiWildMenqingPush) score -= 1.2
      score -= Math.max(0, features.isolatedCount - 1) * 0.8
      if (input.shanten <= 2) score += 2.4
      if (shouldStriveDraw) score -= 15
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
      // ★ V2.2: （数字门+风箭）对子总共>=4 → 大幅提升混碰概率
      const totalPairsHunPeng = features.pairCount >= 4 && features.longestSuitCount >= 4 && features.secondSuitCount <= 1
      if (hunPengReady || totalPairsHunPeng) score += getPolicyValue(policy, 'hunPengPursuit') * (3.8 + suitedPairCount * 0.35) * (totalPairsHunPeng ? 1.6 : 1)
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (2.4 + pureFlushBucketBoost * 0.6)
      score += getPolicyValue(policy, 'pureFlushPursuit') * Math.max(0, features.longestSuitCount - 6) * 0.8
      if (features.longestSuitCount >= 9) { reasons.push('half_flush_nine_tiles'); score += 16 }
      else if (features.longestSuitCount >= 7) { reasons.push('half_flush_seven_tiles'); score += 10 }
      else if (features.longestSuitCount < 6) score -= 6
      if (features.upstreamVoidSuit && features.upstreamVoidSuit === targetSuit) { reasons.push('upstream_void_target'); score += 3 }
      if (features.upstreamRejectedSuit && features.upstreamRejectedSuit === targetSuit && features.longestSuitCount >= 6) { reasons.push('upstream_rejected_target'); score += 2.4 }
      // ★ V2: 两门长度接近时，上家不做+下家做的门优先
      if (features.secondSuitCount > 0 && Math.abs(features.longestSuitCount - features.secondSuitCount) <= 2) {
        const secondSuit = NUMBER_SUITS.find(s => s !== features.longestSuit && (features as any)[s + 'Count'] === features.secondSuitCount) || null
        if (secondSuit) {
          // 上家不做第二门 → 第二门加分
          if (features.upstreamVoidSuit === secondSuit) { reasons.push('upstream_void_second'); score += 4.5 }
          if (features.upstreamRejectedSuit === secondSuit) { reasons.push('upstream_rejected_second'); score += 3.0 }
          // 下家做第二门 → 第二门加分（下家要的我也做，卡住他）
          const allPlayers = input.game.players || []
          const downstream = allPlayers.find((p: any) => p.position === ((input.player.position || 0) + 1) % 4)
          if (downstream) {
            const downstreamExposed = downstream.hand.exposedMelds || []
            const downstreamSuitCount: Record<string, number> = {}
            for (const m of downstreamExposed) {
              for (const t of m.tiles || []) { if (NUMBER_SUITS.includes(t.suit)) downstreamSuitCount[t.suit] = (downstreamSuitCount[t.suit] || 0) + 1 }
            }
            if ((downstreamSuitCount[secondSuit] || 0) >= 3) { reasons.push('downstream_wants_second'); score += 3.5 }
          }
        }
      }
      // ★ V2: allOpponentsAvoidSuit 权重 2→5
      if (features.allOpponentsAvoidSuit && features.allOpponentsAvoidSuit === targetSuit) { reasons.push('global_void_target'); score += 5 /* was: 2 */ }
      if (features.wildCount === 0) score += 1.1
      score += features.oneSuitOpponentCount * 0.8
      if (features.pureFlushUpgradeReady) {
        reasons.push('pure_flush_upgrade_ready')
        // ★ V2: 动态评分 8.5 → 8.5+(20-round)*0.5
        score += 8.5 + Math.max(0, (20 - estimatedRound) * 0.5)
      }
      if (shouldStriveDraw) score -= 10
      break

    case 'ALL_PUNGS':
      // ★ V2.5: 已破门清不适用纯碰碰胡(需要全刻子),但可走混碰/边张
      // K哥: 1-2 听 3、8-9 听 7 这种边张吃牌仍合法(中间顺子不是冲碰碰胡的)
      // 不再硬性 -30, 仅轻微抑制让 v2 选择 OPEN_SPEED
      const _hasExposedSequence = input.player.hand.exposedMelds.some((m: any) => m.type === 'sequence')
      if (_hasExposedSequence) score -= 8  // 轻抑制,不再是 -30
      const _ap_pursuitVal = getPolicyValue(policy, 'allPungsPursuit')
      const _ap_isAgg = _ap_pursuitVal >= 1.2
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
      // ★ V2: 上家压制 3.2→8.0
      if (upstreamRejectedLongSuit) { reasons.push('upstream_rejected_long_suit_push_to_pungs'); score += 8.0 /* was: 3.2 */ }
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (6.2 + pureFlushBucketBoost * 0.9)
      if (hunPengReady) score += getPolicyValue(policy, 'hunPengPursuit') * (5.4 + features.honorPairCount * 0.8)
      if (features.honorCount >= 6) score += getPolicyValue(policy, 'allHonorsPursuit') * 2.2
      // ★ V2.9 K哥铁律: ALL_PUNGS 路线也有风/箭碰碰 buff
      const _apHonorEarlyRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
      const _apTotalHonor = features.honorCount + (features.tripletCount || 0)
      if (_apHonorEarlyRound <= 1.5 && features.honorCount >= 8) { reasons.push('kge_ap_early_honor'); score += 15 }
      if (_apHonorEarlyRound <= 10 && _apTotalHonor >= 10) { reasons.push('kge_ap_mid_honor'); score += 10 }
      score += getPolicyValue(policy, 'flushVsPungsBalance') * ((qingPengReady ? 2.4 : 0) - (features.secondSuitCount > 0 ? 0.8 : 0))
      if (earlyPairHeavy) { reasons.push('early_four_pairs_push'); score += 8.5 }
      // ★ V2: 4+对子/刻子坚决做碰碰胡（90%概率直接锁定）
      if (features.pairCount >= 4) { reasons.push('four_pairs_commit'); score += 16 }
      if (features.pairCount + features.tripletCount >= 5) { reasons.push('five_pairs_triplets_lock'); score += 10 }
      if (_ap_isAgg && features.pairCount + features.tripletCount >= 3) { reasons.push('aggressive_pungs_commit'); score += 12 }
      if (_ap_isAgg && features.wildCount > 0 && features.pairCount + features.tripletCount >= 2) { reasons.push('wild_pungs_push'); score += 7 }
      if (noWildOpenPush) score += 1.4
      // ★ V2: 高倍数权重 1.6→5.0
      if (effectiveGlobalMultiplier >= 4) { score += 5.0 /* was: 1.6 */; reasons.push('high_mult_pungs') }
      score += getPolicyValue(policy, 'daDiaoPursuit') * Math.max(0, features.tripletCount + features.pairCount + input.player.hand.exposedMelds.length - 4) * 2.8
      if (features.pairCount + features.tripletCount >= 4 && features.wildCount > 0) { reasons.push('pair_stack_with_wild'); score += 10 }
      // ★ V2: 降低碰碰胡门槛，对子<3不扣分
      if (features.pairCount + features.tripletCount < 3) score += 0 /* was: -5 */
      if (shouldStriveDraw) score -= 8
      break

    case 'HONOR_HEAVY':
      score += features.honorCount * 4
      score += features.honorPairCount * 3.5
      score += features.wildCount * 2.6
      // ★ V2: liveHonorCount 权重 0.4→1.2
      score += features.liveHonorCount * 1.2 /* was: 0.4 */
      score += getPolicyValue(policy, 'allHonorsPursuit') * 8.2
      score += getPolicyValue(policy, 'allHonorsPungsPursuit') * (features.tripletCount + features.honorPairCount) * 1.6
      score += getWildRouteBoost(policy, features.wildCount, 'honors') * 4.6
      score += getPolicyValue(policy, 'honorVsSuitedBalance') * 6.0
      score -= (features.longestSuitCount + features.secondSuitCount) * 0.7
      // ★ V2.9 K哥铁律: 1.5巡内手上>=8张风/箭, 或10巡内手上+副露>=10张风/箭 → 提升风一色/风碰倾向
      const _honorEarlyRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
      const _totalHonorTiles = features.honorCount + (features.tripletCount || 0) // 手牌+副露刻子(包含风/箭刻)
      if (_honorEarlyRound <= 1.5 && features.honorCount >= 8) {
        reasons.push('kge_early_honor_stack')
        score += 18
      }
      if (_honorEarlyRound <= 10 && _totalHonorTiles >= 10) {
        reasons.push('kge_mid_honor_heavy')
        score += 12
      }
      if (features.honorCount >= 9) {
        reasons.push('honor_stack_nine_plus')
        score += 10
        const _estRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
        if (features.honorCount + features.wildCount >= 9 && _estRound <= 5) { reasons.push('early_honor_9_plus_commit'); score += 30 }
      // ★ V2: 6-7张中间态 4→10
      } else if (features.honorCount >= 7) { score += 10 /* was: 4 */ }
      else if (features.honorCount < 6) { score -= 11 }
      if (features.longestSuitCount >= 4) { score -= 8 }
      if (features.longestSuitCount + features.honorCount >= 8) score -= 6
      if (features.honorCount >= 6) reasons.push('dense_honors')
      if (shouldStriveDraw) score -= 5
      break

    case 'STRIVE_DRAW':
      // ★ V2: 争取流局 — 牌局后段防守路线
      if (!shouldStriveDraw) { score -= 50; break }
      score += 15 // 基础分
      score += (20 - input.wallRemaining) * 1.5 // 墙越少越倾向流局
      score += (input.shanten - 2) * 2.5 // 离听牌越远越倾向
      score += input.tableThreat * 12 // 威胁越大越倾向
      score += features.rawTileCount * 2.0 // 生张越多越倾向
      score -= features.pairCount * 3 // 对子多有胡牌潜力
      score -= features.tripletCount * 4
      score -= (input.effectiveTiles) * 0.3
      reasons.push('strive_draw_defense')
      break
  }

  if (input.wallRemaining <= 28 && route !== 'MENQING_SPEED') score += 1.5
  if (input.tableThreat >= 0.8 && route === 'OPEN_SPEED') score += 2.5

  return { route, score, targetSuit, reasons }
}

// ═══════════════════════════════════════════════
// ★ V2 主入口
// ═══════════════════════════════════════════════
export function evaluateRouteStateV2(input: {
  game: any; player: any; hand: any[]; shanten: number; effectiveTiles: number; tableThreat: number; wallRemaining: number;
  previousRouteState?: any; policy?: any
}): RouteState {
  const estimatedRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const features = buildFeatureSummary(input)
  const policy = input.policy ?? null
  const phase = detectDecisionPhase({
    estimatedRound, shanten: input.shanten, tableThreat: input.tableThreat, wallRemaining: input.wallRemaining,
    meldCount: input.player.hand.exposedMelds.length, opponentOpenMelds: features.opponentOpenMelds,
    downstreamPressure: features.downstreamPressure, fastOpenOpponentCount: features.fastOpenOpponentCount,
    bigOpenOpponentCount: features.bigOpenOpponentCount,
    wallEarlySpeedPush: getPolicyValue(policy, 'wallEarlySpeedPush'), wallMidBalance: getPolicyValue(policy, 'wallMidBalance'),
    wallLateDefense: getPolicyValue(policy, 'wallLateDefense'), safeTilePriority: getPolicyValue(policy, 'safeTilePriority'),
    defenseRiskAversion: getPolicyValue(policy, 'defenseRiskAversion'), wallTilesImpact: getPolicyValue(policy, 'wallTilesImpact'),
  })

  const routeScores = ROUTES.map(r => evaluateSingleRoute(r, input, features)).sort((a, b) => b.score - a.score)
  const previousRouteState = input.previousRouteState || null

  const HIGH_VALUE_ROUTES: RouteKind[] = ['ALL_PUNGS', 'HALF_FLUSH', 'HONOR_HEAVY']
  const isPostRound10Forced = estimatedRound >= 10
  let postRound10Top: RouteScore | null = null
  const topCandidate = routeScores[0]
  const previousCandidate = previousRouteState ? routeScores.find((c: RouteScore) => c.route === previousRouteState.current) || null : null

  if (isPostRound10Forced) {
    const highValueScores = routeScores.filter(r => HIGH_VALUE_ROUTES.includes(r.route))
    highValueScores.sort((a, b) => b.score - a.score)
    postRound10Top = highValueScores[0] || topCandidate
    if (previousRouteState && HIGH_VALUE_ROUTES.includes(previousRouteState.current as RouteKind)) {
      const prevHigh = highValueScores.find(r => r.route === previousRouteState.current)
      if (prevHigh && prevHigh.score >= (postRound10Top?.score || 0) - 4) postRound10Top = prevHigh
    }
  }

  const evidenceAgainstPrevious = previousRouteState && previousRouteState.current !== topCandidate.route ? (previousRouteState.evidenceCounter || 0) + 1 : 0
  const softLockedPrevious = !!previousRouteState && (previousRouteState.lockLevel > 0 || (previousRouteState.stableTurns || 0) >= 2)

  // ★ V2.1: 方向意识强化 — 10巡内验证，10巡后坚决执行
  // 极端情况检测：两口关系、对手大牌（风一色/清碰/风碰）
  const extremeThreat =
    features.twoPlayerBlocking ||
    features.bigOpenOpponentCount >= 2 ||
    (features.downstreamPressure >= 1.2 && features.fastOpenOpponentCount >= 2) ||
    features.oneSuitOpponentCount >= 2
  // 允许的保守转向：碰碰胡/争取流局（不胡不放冲）
  const conservativeRoutes: RouteKind[] = ['ALL_PUNGS', 'STRIVE_DRAW']
  const isConservativeSwitch = previousRouteState && conservativeRoutes.includes(topCandidate.route as RouteKind) && !conservativeRoutes.includes(previousRouteState.current as RouteKind)

  // 切换门槛：lockLevel越高越难切换
  // lockLevel=2(坚决执行): 90%不摇摆，仅极端情况+保守转向才允许
  // lockLevel=1(锁定): 需要3次反面证据+高出5分才切换
  // 未锁定但稳定2回合: 需要2次反面证据+高出3分才切换
  const requiredEvidenceToFlip = previousRouteState?.lockLevel === 2 ? 5 : previousRouteState?.lockLevel === 1 ? 3 : (previousRouteState?.stableTurns || 0) >= 2 ? 2 : 1
  const flipThreshold = previousRouteState?.lockLevel === 2 ? 7.0 : previousRouteState?.lockLevel === 1 ? 5.0 : (previousRouteState?.stableTurns || 0) >= 2 ? 3.0 : 1.4
  // lockLevel=2时：仅极端情况+保守转向才允许切换
  const locked2CanSwitch = previousRouteState?.lockLevel === 2
    ? (extremeThreat && isConservativeSwitch) || (extremeThreat && topCandidate.score >= previousCandidate!.score + 8)
    : true
  const canHoldPreviousRoute = isPostRound10Forced && previousRouteState && !HIGH_VALUE_ROUTES.includes(previousRouteState.current as RouteKind) ? false : !!previousRouteState && !!previousCandidate && softLockedPrevious && locked2CanSwitch && (previousCandidate.score >= topCandidate.score - flipThreshold || evidenceAgainstPrevious < requiredEvidenceToFlip)

  const current = isPostRound10Forced ? postRound10Top : (canHoldPreviousRoute ? previousCandidate : topCandidate)
  const secondary = routeScores.find(c => c.route !== current.route) || null
  const gap = current && secondary ? current.score - secondary.score : (current?.score || 0)
  const stableOnPrevious = previousRouteState?.current === current?.route
  const stableTurns = stableOnPrevious ? (previousRouteState?.stableTurns || 1) + 1 : 1
  const switchCount = previousRouteState && previousRouteState.current !== current.route ? (previousRouteState.switchCount || 0) + 1 : (previousRouteState?.switchCount || 0)
  const evidenceCounter = canHoldPreviousRoute && previousRouteState && previousRouteState.current !== topCandidate.route ? evidenceAgainstPrevious : 0
  // ★ V2: 4+对子碰碰胡路线直接锁定
  const _apLockByPairs = current?.route === 'ALL_PUNGS' && features.pairCount >= 4
  // ★ V2.1: 10巡后方向确定，压缩摇摆
  // 10巡+稳定2回合 → lockLevel=2（坚决执行）
  // 10巡+有方向 → lockLevel=1（锁定）
  // 5-9巡+稳定3回合+gap大 → lockLevel=1
  // 碰碰胡4+对子 → lockLevel=1
  const lockLevel: 0 | 1 | 2 =
    isPostRound10Forced && stableTurns >= 2 && HIGH_VALUE_ROUTES.includes((current?.route) as RouteKind) ? 2 :
    isPostRound10Forced && HIGH_VALUE_ROUTES.includes((current?.route) as RouteKind) ? 1 :
    stableTurns >= 3 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel === 2 && gap >= 1.4 ? 2 :
    phase === 'RUSH' && gap >= 4 ? 2 :
    _apLockByPairs ? 1 :
    estimatedRound >= 7 && stableTurns >= 2 && gap >= 2.0 ? 1 :
    stableTurns >= 2 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel >= 1 && gap >= 1.1 ? 1 :
    (phase === 'COMMIT' || phase === 'RUSH') && gap >= 2.5 ? 1 : 0

  return {
    policy, phase,
    current: current?.route || 'MENQING_SPEED',
    secondary: secondary?.route || null,
    confidence: gap, lockLevel, stableTurns, switchCount, evidenceCounter,
    targetSuit: current?.targetSuit || null,
    routeScores, features,
  }
}
