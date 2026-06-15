// ai_v2/pathSelector.ts — V2 路径选择引擎（激进权重 + STRIVE_DRAW）
// 基于 server/ai/route/routeEvaluator.ts，修改关键权重

import { TileSuit, MeldType, type Tile } from '../types/game'
import { groupTiles, isDragon, isHonor, isWind } from '../utils/tiles'
import { buildWildTileChecker } from '../utils/handValidator'
import { detectDecisionPhase } from '../ai/route/phaseDetector'
import type { RouteFeatureSummary, RouteScore, RouteState, RouteKind, DecisionPhase, SpeedMode } from './types'

const NUMBER_SUITS: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
const ROUTES: RouteKind[] = ['HALF_FLUSH', 'ALL_PUNGS', 'HONOR_HEAVY', 'STRIVE_DRAW']

function getPolicyValue(policy: any, key: string, fallback = 0): number {
  const raw = Number(policy?.[key] ?? fallback)
  return Number.isFinite(raw) ? raw : fallback
}

function isWildTile(tile: Tile, game: any): boolean {
  const checker = buildWildTileChecker(game?.customScoringMode || null, game?.wildTileGroup)
  return checker(tile)
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

/** 统计玩家门口(已暴露)风/箭牌数 */
function playerExposedHonorCount(player: any): number {
  if (!player?.hand?.exposedMelds) return 0
  let count = 0
  for (const meld of player.hand.exposedMelds) {
    for (const tile of meld.tiles || []) {
      if (tile.suit === 'feng' || tile.suit === 'jian') count++
    }
  }
  return count
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
  // ★ V2.14 BUG修复: Tile.isWild 从未被设置(只在 handValidator 内部用 isWild=true 的临时结构)
  // 改用 buildWildTileChecker 动态判断(支持花牌百搭 + wildTileGroup)
  const isWildTileFn = buildWildTileChecker(game?.customScoringMode || null, game?.wildTileGroup)

  for (const tile of hand) {
    if (isWildTileFn(tile)) wildCount++
    if (NUMBER_SUITS.includes(tile.suit)) suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1
    if (isHonor(tile)) honorCount++
  }
  // ★ V2.12: 门口副露牌也计入 suitCounts，避免暗牌少时误判长门
  // 例：门口有 tiao-4,5,6 + tiao-6,7,8(6张条子)，暗牌条子少时会误判万子为长门
  for (const meld of player.hand.exposedMelds || []) {
    for (const tile of meld.tiles || []) {
      if (NUMBER_SUITS.includes(tile.suit)) suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1
    }
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
  // ★ V2.13: 碰碰胡潜质检测 (供 discardDecider 多路线感知使用)
  // V2.9: 收紧 hunPengReady 条件 (longestSuit 7→8, honor 3→4) → 减少混碰 → 砍<10%
  const hunPengReady = longestSuitCount >= 8 && honorCount >= 4 && secondSuitCount <= 1
  const qingPengReady = longestSuitCount >= 8 && secondSuitCount === 0 && honorCount <= 2

  // upstream analysis
  const upstream = game.players[(player.position + 3) % game.players.length]
  const upstreamDiscards = (upstream?.hand.discardedTiles || []).filter((d: Tile) => NUMBER_SUITS.includes(d.suit))
  const upstreamSuitCounts: Record<string, number> = {}
  for (const d of upstreamDiscards) upstreamSuitCounts[d.suit] = (upstreamSuitCounts[d.suit] || 0) + 1
  const upstreamVoidSuit = NUMBER_SUITS.map(s => ({ suit: s, count: upstreamSuitCounts[s] || 0 })).sort((a, b) => b.count - a.count)[0]
  const upstreamRejectedSuit = NUMBER_SUITS.map(s => ({ suit: s, count: upstreamSuitCounts[s] || 0 })).sort((a, b) => b.count - a.count)[0]
  // ★ 上家吃过的门：检查上家吃过的顺子里包含的数牌门（3+张该门就是明确吃过）
  const upstreamEatenSuits = new Set<string>()
  if (upstream) {
    for (const meld of upstream.hand.exposedMelds || []) {
      if (meld.type === 'sequence' && NUMBER_SUITS.includes(meld.tiles[0]?.suit)) {
        upstreamEatenSuits.add(meld.tiles[0].suit)
      }
    }
  }

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
  // ★ V2.2: 混一色转清一色 — 结合动态形势判断
  // 放宽条件：只要打掉1对风向就能升级(weakHonorPairCount <= 1)
  // 但需要考虑：
  // 1. 牌局是否尚早（越早越值得升级）
  // 2. 手牌是否有百搭（百搭越多越容易升级）
  // 3. 其他玩家是否快胡牌（快胡时不要升级，赶紧胡）
  // 4. 是否有三口关系（有的话赶紧胡，不升级）
  const doorFlowerCount = (input.player.hand.exposedMelds || []).reduce(
    (cnt: number, m: any) => cnt + (m.tiles || []).filter((t: any) => t.suit === 'hua' || t.isFlower).length, 0)
  // 对手快胡检测：有对手副露>=3（用已计算的 opponentOpenMelds）
  const opponentCloseToWin = opponentOpenMelds >= 3
  // 三口关系检测（互包）
  const hasMutualBailout = (input.player.hand.meldSources || []).some((v: number) => v >= 3)
  // ★ V2.7 Phase 1: 百搭可替代弱风牌对子，有百搭时条件放宽
  // 百搭当数牌补位 → 弱风牌对子可通过百搭消化
  const hasWildWild = wildCount >= 1
  // ★ V2.7 Phase 1.1: 门口副露单门检测 — 真正的清一色识别要算上门口已吃碰的数牌
  // 例：门口吃 123万+456万+789万（9张万子），手牌 0张万子 → 已是清一色雏形
  let exposedNumberSuit: string | null = null
  let exposedNumberSuitSingleDoor = true
  const exposedMelds = input.player.hand.exposedMelds || []
  for (const meld of exposedMelds) {
    const mTiles = meld.tiles || []
    if (mTiles.length === 0) continue
    const mSuit = mTiles[0].suit
    if (!NUMBER_SUITS.includes(mSuit)) continue  // 风箭不计
    if (exposedNumberSuit === null) {
      exposedNumberSuit = mSuit
    } else if (exposedNumberSuit !== mSuit) {
      exposedNumberSuitSingleDoor = false
      break
    }
  }
  // 门口副露单门数牌 = exposedMelds 中只有 1 个 NUMBER_SUIT
  // 这是清一色最强信号
  const isExposedSingleSuit = exposedNumberSuitSingleDoor && exposedNumberSuit !== null
  // 有效长门：手牌长门 + 门口已碰/吃的数牌
  const effectiveLongestSuit = exposedNumberSuit && exposedNumberSuit === longestSuit
    ? longestSuitCount
    : (isExposedSingleSuit ? (suitCounts[exposedNumberSuit!] || 0) : longestSuitCount)
  const _hasHonorPairOrWild = honorPairCount >= 1 || (hasWildWild && wildCount >= 1)
  const _honorPairOk = honorPairCount >= 1 || (hasWildWild && honorCount <= 2)
  // ★ V2.7: 升级条件放宽 - 门口已是单门 OR 手牌长门够强
  // 关键：已吃碰2-3口且都一个花色 → 应该积极转清一色
  // V2.9: 放宽 honorCount 限制(2/3→4/5张), 4张风向也可升级清一色
  // V2.13: 放宽 pureFlushUpgradeReady 条件 → 更容易触发清一色升级
  const pureFlushUpgradeReady = (
    // 条件A：门口副露已单门+门口吃了2口以上 (风向放宽到6)
    (isExposedSingleSuit && exposedMelds.length >= 2 && honorCount <= 6) ||
    // 条件B：手牌长门够强（6张以上）(风向放宽到6)
    (effectiveLongestSuit >= 6 && secondSuitCount <= 2 && honorCount <= 6)
  )
    && (honorPairCount <= 3 || (hasWildWild && honorCount <= 5))
    && honorCount <= 8
    && estimatedRound <= 20
  // ★ V2.7: 百搭+少风牌（<2对）时强力清一色倾向
  // V2.9: 进一步放宽 - 门口已单门+长门>=6即可积极转清一色
  // V2.10: 关键 - 百搭≥2时放宽, 但不要太激进
  const _has2PlusWild = wildCount >= 2
  const wildPureFlushReady =
    (isExposedSingleSuit && effectiveLongestSuit >= 6) ||
    (_has2PlusWild && effectiveLongestSuit >= 6 && honorCount <= 5 && honorPairCount <= 2) ||
    (hasWildWild && honorPairCount <= 2 && effectiveLongestSuit >= 7 && honorCount <= 4)
  // 百搭≥2时, 额外加成条件: 短门或门口单门
  const wild2PlusFlushBonus = _has2PlusWild && effectiveLongestSuit >= 7 && secondSuitCount <= 2

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
    upstreamEatenSuits: Array.from(upstreamEatenSuits),
    allOpponentsAvoidSuit, liveHonorCount, opponentOpenMelds, fastOpenOpponentCount, bigOpenOpponentCount, downstreamPressure, oneSuitOpponentCount,
    pureFlushUpgradeReady, weakHonorPairCount, rawTileCount,
    blockedSuit, twoPlayerBlocking,
    hunPengReady, qingPengReady,
    isExposedSingleSuit, effectiveLongestSuit, wildPureFlushReady,
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
    case 'HALF_FLUSH':
      targetSuit = features.longestSuit
      // ★ K哥铁律(2026-06-06): 4+对子/刻子时碰碰胡绝对优先,混一色拆对子损失巨大
      // room4472 场景: 5个对子/刻子(1刻子+4对子) AI却去混一色,反向PUNISH
      // V2.2: -60不够，混一色加分后仍可反超，改为-90确保碰碰胡胜出
      // V2.2: 3对子也惩罚，防止混一色抢走碰碰胡路线
      // V2.9: 4对子惩罚降低 (-90→-65), 让清一色在某些情况下能胜出
      if (features.pairCount + features.tripletCount >= 4) {
        reasons.push('kge_pungs_priority_halfflush_punish')
        score -= 65  // 降低对混一色的强惩罚, 让清一色有机会胜出
      } else if (features.pairCount + features.tripletCount >= 3) {
        // 3对子也明显倾向碰碰胡
        score -= 25  // 从-35降到-25
      }
      // V2.13: 恢复longestSuitCount系数(3.0), 改用风牌惩罚区分混一色和清一色
      score += features.longestSuitCount * 3.0
      // V2.14: 降低honorCount系数(1.2→0.8) + honorPairCount(1.0→0.5) → 混一色→50%
      score += features.honorCount * 0.8
      score += features.honorPairCount * 0.5
      score += features.wildCount * 3.0
      // V2.13: 有风牌→扣分(混一色扣分,但清一色不扣) → 混一色→50%
      // 无风牌→加分(纯清一色加分) → 清一色→20%
      if (features.honorCount >= 1) {
        score -= features.honorCount * 2.0  // 每张风牌扣2.0分(更激进)
      }
      // ★ V2.13: 门清bonus — 无副露时鼓励门清
      const _exposedCount = (input.player.hand.exposedMelds || []).length
      if (_exposedCount === 0 && features.longestSuitCount >= 6) {
        score += 10.0  // 门清大加分
        reasons.push('menqing_flush_bonus')
      }
      score += getPolicyValue(policy, 'halfFlushWeight') * 4.5
      score += getWildRouteBoost(policy, features.wildCount, 'flush') * 4.2
      score += routeBucketBoost * (2.6 + handRouteBias)
      score += pureFlushBucketBoost * (features.secondSuitCount === 0 ? 2.2 : 1.1)
      score -= features.secondSuitCount * 2.5
      // ★ V2.2: （数字门+风箭）对子总共>=4 → 大幅提升混碰概率
      // V2.13: 降低混碰加分(0.8→0.4) → 混碰砍到<10%
      const totalPairsHunPeng = features.pairCount >= 4 && features.longestSuitCount >= 4 && features.secondSuitCount <= 1
      if (hunPengReady || totalPairsHunPeng) score += getPolicyValue(policy, 'hunPengPursuit') * (0.4 + suitedPairCount * 0.05) * (totalPairsHunPeng ? 0.6 : 1)
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (2.4 + pureFlushBucketBoost * 0.6)
      score += getPolicyValue(policy, 'pureFlushPursuit') * Math.max(0, features.longestSuitCount - 6) * 0.8
      if (features.longestSuitCount >= 9) { reasons.push('half_flush_nine_tiles'); score += 16 }
      else if (features.longestSuitCount >= 7) { reasons.push('half_flush_seven_tiles'); score += 10 }
      else if (features.longestSuitCount < 6) score -= 6
      if (features.upstreamVoidSuit && features.upstreamVoidSuit === targetSuit) { reasons.push('upstream_void_target'); score += 3 }
      // ★ K哥铁律(2026-06-05): 上家不要长门(打了2+张) + 自己长门够强(>=4张) → 允许同门
      if (features.upstreamRejectedSuit && features.upstreamRejectedSuit === targetSuit && features.longestSuitCount >= 4) { reasons.push('upstream_rejected_target'); score += 3.0 }
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
        // ★ V2.13: 升级评分大幅提高 → 清一色目标20%
        score += 32.0 + Math.max(0, (20 - estimatedRound) * 1.0)
      }
      // ★ V2.7: 百搭+少风牌 → 强力清一色倾向（即使升级条件未满）
      // V2.10: 百搭≥2时适度加分, 不要过分推
      if ((features as any).wildPureFlushReady && features.longestSuitCount >= 6) {
        reasons.push('wild_pure_flush_ready')
        // 基础分(16+4*dec) + 百搭≥2时温和加成(8→5)
        const _wildCount = features.wildCount || 0
        const _wildBonus = _wildCount >= 2 ? 5.0 : (_wildCount === 1 ? 2.5 : 0)
        score += 16.0 + Math.max(0, (2 - (features.honorPairCount || 0)) * 4.0) + _wildBonus
      }
      // ★ V2.10: 百搭≥2时额外清一色加成(独立于wildPureFlushReady)
      if ((features as any).wild2PlusFlushBonus) {
        reasons.push('wild2plus_flush_bonus')
        score += 6.0  // 从10降到6, 避免过激
      }
      // ★ V2.7 Phase 1.1: 门口副露已单门 → 强力清一色倾向
      // 关键洞察：吃碰2-3口后门口已是一个花色，手牌里其它花色必须坚决打掉
      if ((features as any).isExposedSingleSuit) {
        reasons.push('exposed_single_suit_flush_ready')
        // V2.9: 强力加分(15+5*melds → 18+6*melds)→ 大幅拉清一色
        const exposedMeldsCount = (input.player.hand.exposedMelds || []).length
        score += 18.0 + exposedMeldsCount * 6.0
      }
      if (shouldStriveDraw) score -= 10
      break

    case 'ALL_PUNGS':
      // ★ K哥铁律(2026-06-08): ALL_PUNGS 也要设 targetSuit,否则弃牌时不知道保留哪门
      targetSuit = features.longestSuit
      // ★ V2.5: 已破门清不适用纯碰碰胡(需要全刻子),但可走混碰/边张
      // K哥: 1-2 听 3、8-9 听 7 这种边张吃牌仍合法(中间顺子不是冲碰碰胡的)
      // 不再硬性 -30, 仅轻微抑制让 v2 选择 OPEN_SPEED
      const _hasExposedSequence = input.player.hand.exposedMelds.some((m: any) => m.type === 'sequence')
      if (_hasExposedSequence) score -= 8  // 轻抑制,不再是 -30
      const _ap_pursuitVal = getPolicyValue(policy, 'allPungsPursuit')
      const _ap_isAgg = _ap_pursuitVal >= 1.2
      score += features.pairCount * (5.2 + (_ap_isAgg ? 4.0 : 0))
      score += features.tripletCount * (5.8 + (_ap_isAgg ? 3.5 : 0))
      // V2.7: 降低风牌对子加分 → 减少混碰 → 转向清/混一色
      // V2.14: 进一步降权(1.2+1.8=3.0 → 0.5+0.5=1.0 per pair)
      score += features.honorPairCount * (0.5 + (_ap_isAgg ? 0.5 : 0))
      score += features.wildCount * (2.8 + (_ap_isAgg ? 3.5 : 0))
      score += _ap_pursuitVal * 8.5
      score += getWildRouteBoost(policy, features.wildCount, 'allPungs') * 4.8
      score += routeBucketBoost * (3.0 + handRouteBias)
      score += getPolicyValue(policy, 'sequenceVsTripletBias') * Math.max(0, features.tripletCount - features.sequenceLikeCount * 0.25) * 1.2
      score -= features.sequenceLikeCount * 1.8
      score -= Math.max(0, features.secondSuitCount - 3) * 0.6
      // ★ V2: 上家压制 3.2→8.0
      if (upstreamRejectedLongSuit) { reasons.push('upstream_rejected_long_suit_push_to_pungs'); score += 8.0 /* was: 3.2 */ }
      // ★ K哥铁律(2026-06-08): 风箭牌少于2对+碰过 → 考虑转清一色
      // 仅剩≤2对风箭牌且已碰过(有3+组)→ 锁定ALL_PUNGS，反之增强清一色
      const _honorPairs = (input.player.hand.exposedMelds || []).filter((m: any) =>
        m.tiles?.length === 3 && (m.tiles[0].suit === 'wind' || m.tiles[0].suit === 'dragon')
      ).length
      if (_honorPairs >= 2) {
        // 2对+风箭牌已碰 → 锁碰碰胡
        score += 10
        reasons.push('ap_2plus_honor_pairs_locked')
      } else {
        // ≤1对风箭牌 → 增强清一色动力
        if (qingPengReady) score += 4
        score += (2 - _honorPairs) * 2  // 0对+8, 1对+4
      }
      if (qingPengReady) score += getPolicyValue(policy, 'qingPengPursuit') * (6.2 + pureFlushBucketBoost * 0.9)
      // ★ V2.2: 清碰额外加分 — 当可以做清碰时，大幅提高ALL_PUNGS路线竞争力
      // 清碰是清一色+全刻子，番数高但难做，给足够激励
      if (qingPengReady && features.honorCount <= 1) {
        score += 12  // 几乎纯数字门+全刻子 → 清碰路线
        reasons.push('qing_peng_push')
      }
      // V2.9: ALL_PUNGS 路线继续降权(2.5+0.3 → 1.2+0.2) → 减少混碰
      // V2.13: ALL_PUNGS hunPeng继续降权 → 混碰<10%
      if (hunPengReady) score += getPolicyValue(policy, 'hunPengPursuit') * (0.8 + features.honorPairCount * 0.15)
      if (features.honorCount >= 6) score += getPolicyValue(policy, 'allHonorsPursuit') * 2.2
      // ★ V2.10 K哥铁律: ALL_PUNGS 路线(风碰) buff(与HONOR_HEAVY同一逻辑)
      const _apRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
      const _apExposedHonor = (playerExposedHonorCount(input.player) || 0)
      if (_apRound <= 5 && features.honorCount >= 8) { reasons.push('kge_ap_round5'); score += 8 }
      if (_apRound <= 7 && (features.honorCount + features.wildCount) >= 9) { reasons.push('kge_ap_round7'); score += 12 }
      if (_apRound <= 10 && (features.honorCount + _apExposedHonor + features.wildCount) >= 10) { reasons.push('kge_ap_round10'); score += 15 }
      score += getPolicyValue(policy, 'flushVsPungsBalance') * ((qingPengReady ? 2.4 : 0) - (features.secondSuitCount > 0 ? 0.8 : 0))
      if (earlyPairHeavy) { reasons.push('early_four_pairs_push'); score += 8.5 }

      // ★ K哥铁律(2026-06-08): 开局早期三门数牌都有对子 → 大幅加碰碰胡概率
      // 检查 concealed tiles 里三种数牌是否都有对子
      const _concealedNonFlower = input.player.hand.concealedTiles.filter((t: any) => t.suit !== 'flower' && !isWildTile(t, input.game))
      const _suitPairMap = new Map<string, number>()
      for (const t of _concealedNonFlower) {
        if (t.suit === 'wind' || t.suit === 'dragon') continue
        const key = `${t.suit}-${t.value}`
        _suitPairMap.set(key, (_suitPairMap.get(key) || 0) + 1)
      }
      const _suitsWithPairs = new Set<string>()
      for (const [key, cnt] of _suitPairMap) {
        if (cnt >= 2) _suitsWithPairs.add(key.split('-')[0])
      }
      const _threeSuitPairs = _suitsWithPairs.size >= 3
      if (_threeSuitPairs && _apRound <= 8) {
        reasons.push('three_suit_pairs_early'); score += 15
      }

      // ★ V2: 4+对子/刻子坚决做碰碰胡（90%概率直接锁定）
      // 碰了一对到门口后 pairCount 降但 tripletCount 升，总数仍算
      if (features.pairCount >= 4 || features.pairCount + features.tripletCount >= 4) { reasons.push('four_pairs_commit'); score += 25 }
      // ★ K哥铁律(2026-06-06): 5+对子/刻子(含门口刻子)绝对锁定碰碰胡 40→60
      if (features.pairCount + features.tripletCount >= 5) { reasons.push('five_pairs_triplets_lock'); score += 60 }
      // ★ V2.2: 放宽碰碰胡准入门槛 — 3对子+无明显优势门 → 坚决碰碰胡
      // 场景：手牌3对子但没有一门明显多(最长门<=5)，不做混一色，做碰碰胡
      if (features.pairCount + features.tripletCount >= 3 && features.longestSuitCount <= 5 && !_hasExposedSequence) {
        reasons.push('three_pairs_no_flush_advantage')
        score += 18  // 从中等强度提升到强锁定
      }
      // ★ V2.2: 3对子+有风牌对子 → 碰碰胡(风牌碰后直接成型)
      if (features.pairCount + features.tripletCount >= 3 && features.honorPairCount >= 1) {
        reasons.push('three_pairs_with_honor')
        score += 14
      }
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
      // ★ K哥铁律(2026-06-05): 百搭越少概率越高
      // 百搭0 走不了溜 × 额外加分；百搭1 微加分；百搭≥2 略微加分
      score += features.wildCount * 0.8
      if (features.wildCount === 0) score += 5
      else if (features.wildCount === 1) score += 2
      // ★ K哥铁律(2026-06-05): 百搭 0 且有风箭对子 → 加速碰对子 buff（防止补词已0但还能碰）
      if (features.wildCount === 0 && features.honorPairCount >= 1) {
        reasons.push('kge_honor_pair_no_wild_speedup')
        score += features.honorPairCount * 2.5
      }
      // ★ V2: liveHonorCount 权重 0.4→1.2
      score += features.liveHonorCount * 1.2 /* was: 0.4 */
      // ★ V2.2: honorCount=6-7时给额外加分，让风一色路线更有竞争力
      // 让AI更愿意尝试风一色，而不是只在honorCount>=8时才考虑
      if (features.honorCount >= 6 && features.honorCount <= 7) {
        score += 20  // 强加分，让HONOR_HEAVY能竞争过HALF_FLUSH
        reasons.push('honor_count_6_7_push')
      }
      // ★ V2.2: honorCount>=8时额外强加分，确保风一色路线被选中
      if (features.honorCount >= 8) {
        score += 10  // 已经很强了，再加一点确保
        reasons.push('honor_count_8_plus_push')
      }
      score += getPolicyValue(policy, 'allHonorsPursuit') * 8.2
      score += getPolicyValue(policy, 'allHonorsPungsPursuit') * (features.tripletCount + features.honorPairCount) * 1.6
      score += getWildRouteBoost(policy, features.wildCount, 'honors') * 4.6
      score += getPolicyValue(policy, 'honorVsSuitedBalance') * 6.0
      score -= (features.longestSuitCount + features.secondSuitCount) * 0.7
      // ★ V2.10 K哥铁律: 调整 wind一色/风碰倾向 buff
      // 5巡(含)内 honorCount >= 8 → +10
      // 7巡(含)内 honorCount+百搭 >= 9 → +15
      // 10巡(含)内 honor(含门口 + 百搭) >= 10 → +18
      const _honorRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
      const _exposedHonorCount = (playerExposedHonorCount(input.player) || 0) // 门口风/箭牌数
      const _totalHonorWithWild = features.honorCount + features.wildCount
      if (_honorRound <= 5 && features.honorCount >= 8) {
        reasons.push('kge_round5_honor_8')
        score += 10
      }
      if (_honorRound <= 7 && _totalHonorWithWild >= 9) {
        reasons.push('kge_round7_honor_with_wild_9')
        score += 15
      }
      if (_honorRound <= 10 && (features.honorCount + _exposedHonorCount + features.wildCount) >= 10) {
        reasons.push('kge_round10_total_honor_10')
        score += 18
      }
      if (features.honorCount >= 9) {
        reasons.push('honor_stack_nine_plus')
        score += 10
        const _estRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
        if (features.honorCount + features.wildCount >= 9 && _estRound <= 5) { reasons.push('early_honor_9_plus_commit'); score += 30 }
        // ★ K哥铁律(2026-06-05): 5巡内≥8风/箭，百搭≤1（99%做风一色/风碰）
        if (_estRound <= 5 && features.honorCount >= 8 && features.wildCount <= 1) {
          reasons.push('kge_early_honor_8_no_wild_80pct')
          score += 20
        }
        // 10巡内≥9风/箭，百搭≤2（同样加当）
        if (_estRound <= 10 && features.honorCount >= 9 && features.wildCount <= 2) {
          reasons.push('kge_round10_honor_9_low_wild')
          score += 15
        }
      // ★ V2: 6-7张中间态 4→10
      } else if (features.honorCount >= 7) { score += 10 /* was: 4 */ }
      else if (features.honorCount < 6) { score -= 11 }
      // ★ K哥铁律: 长门<5时才-8（不肯定不是做风一色）；长门>=5 与风一色不冲突
      if (features.longestSuitCount >= 5) { score -= 5 }
      else if (features.longestSuitCount >= 4) { score -= 3 }
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

  return { route, score, targetSuit, reasons }
}

// ═══════════════════════════════════════════════
// ★ speedMode 评估 — 独立于 route 的速度维度
// ═══════════════════════════════════════════════
function evaluateSpeedMode(input: any, features: RouteFeatureSummary): { speedMode: SpeedMode; score: number } {
  const policy = input.policy ?? null
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(input.game)
  const noWildOpenPush = features.wildCount === 0
  const multiWildMenqingPush = features.wildCount >= 2
  const oneWildLongSuitPivot = features.wildCount === 1 && features.longestSuitCount >= 6
  const earlyPairHeavy = estimatedRoundOf(input) <= 5 && features.pairCount >= 4

  // MENQING 评分：保持门清（不吃不碰）
  let menqingScore = 0
  menqingScore += 9
  menqingScore += Math.max(0, 10 - input.shanten * 3.5)
  menqingScore += input.effectiveTiles * 0.28
  menqingScore += features.pairCount * 2.4
  menqingScore += features.sequenceLikeCount * 0.45
  menqingScore += Math.max(0, features.longestSuitCount - 4) * 0.7
  menqingScore -= features.isolatedCount * 1.8
  menqingScore -= input.player.hand.exposedMelds.length * 3.2
  menqingScore -= Math.max(0, features.longestSuitCount - 6) * 1.1
  menqingScore -= Math.max(0, features.pairCount - 3) * 1.3
  menqingScore -= input.tableThreat * 4
  menqingScore -= features.opponentOpenMelds * 1.35
  menqingScore -= features.downstreamPressure * 2.2
  menqingScore -= Math.max(0, effectiveGlobalMultiplier - 1) * 1.9
  if (noWildOpenPush) menqingScore -= 3.8
  if (oneWildLongSuitPivot) menqingScore -= 0.9
  if (earlyPairHeavy) menqingScore -= 3.8
  if (multiWildMenqingPush) menqingScore += 2.8
  if (input.player.hand.exposedMelds.length === 0) menqingScore += 3
  if (input.shanten <= 2 && features.isolatedCount <= 2) menqingScore += 2.5
  if (features.upstreamVoidSuit) menqingScore += 1.5
  menqingScore += getPolicyValue(policy, 'wallEarlySpeedPush') * 0.8
  const shouldStriveDraw = input.wallRemaining <= 20 && input.shanten > 2 && input.tableThreat >= 0.7 && features.rawTileCount >= 3
  if (shouldStriveDraw) menqingScore -= 20

  // OPEN 评分：积极吃碰（开放打法）
  let openScore = 0
  openScore += 8
  openScore += Math.max(0, 8 - input.shanten * 2.5)
  openScore += input.effectiveTiles * 0.22
  openScore += features.tripletCount * 2.2
  openScore += features.pairCount * 1.4
  openScore += Math.max(0, features.longestSuitCount - features.secondSuitCount) * 0.7
  openScore += input.tableThreat * 8
  openScore += features.downstreamPressure * 4.2
  openScore += features.opponentOpenMelds * 1.4
  openScore += input.player.hand.exposedMelds.length * 1.6
  if (features.pairCount + features.tripletCount >= 4) openScore -= 35
  openScore += getWildRouteBoost(policy, features.wildCount, 'meld') * 3.5
  openScore += getPolicyValue(policy, 'wallEarlySpeedPush') * 1.1
  openScore += getPolicyValue(policy, 'wallMidBalance') * 0.8
  openScore += Math.max(0, effectiveGlobalMultiplier - 1) * 2.1
  if (noWildOpenPush) openScore += 2.4
  if (oneWildLongSuitPivot) openScore += 1.2
  const upstreamRejectedLongSuit = !!features.upstreamRejectedSuit && features.longestSuit === features.upstreamRejectedSuit && features.longestSuitCount >= 6
  if (upstreamRejectedLongSuit) openScore += 8.0
  if (earlyPairHeavy) openScore += 2.1
  if (multiWildMenqingPush) openScore -= 1.2
  openScore -= Math.max(0, features.isolatedCount - 1) * 0.8
  if (input.shanten <= 2) openScore += 2.4
  if (shouldStriveDraw) openScore -= 15

  // AUTO 评分：中立，由 route 逻辑自行决定
  const autoScore = (menqingScore + openScore) / 2

  if (menqingScore >= openScore && menqingScore >= autoScore) return { speedMode: 'MENQING', score: menqingScore }
  if (openScore >= menqingScore && openScore >= autoScore) return { speedMode: 'OPEN', score: openScore }
  return { speedMode: 'AUTO', score: autoScore }
}

function estimatedRoundOf(input: any): number {
  return Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
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

  // ★ V2.2: 风牌积累够了 → 给HONOR_HEAVY额外加分，让它能竞争过HALF_FLUSH
  // 当前路线是HALF_FLUSH + 风牌数>=4(含对子和单张) → HONOR_HEAVY加分
  const _currentIsHalfFlush = previousRouteState?.current === 'HALF_FLUSH'
  const _honorReadyForSwitch = features.honorCount >= 4  // 风牌总数>=4就考虑转风一色
  if (_currentIsHalfFlush && _honorReadyForSwitch) {
    const honorHeavyScore = routeScores.find(r => r.route === 'HONOR_HEAVY')
    if (honorHeavyScore) {
      // 风牌越多加分越大：4张+10, 5张+15, 6张+20, 7张+25, 8张+30
      const honorBonus = Math.min(30, 10 + (features.honorCount - 4) * 5)
      honorHeavyScore.score += honorBonus
      routeScores.sort((a, b) => b.score - a.score)
    }
  }

  // ★ V2.16 风险感知：对手威胁高时，加速路线加分
  // 对手快胡了（多副露/听牌） → 碰碰胡速度加分，慢路线扣分
  if (input.tableThreat > 0.6) {
    const threatBoost = input.tableThreat * 6 // 最高 6 分加成
    for (const rs of routeScores) {
      if (rs.route === 'ALL_PUNGS') rs.score += threatBoost * 0.8        // 碰碰胡：快成型
      if (rs.route === 'STRIVE_DRAW') rs.score += threatBoost * 0.4      // 搏命：倍数高时搏一把
      if (rs.route === 'HALF_FLUSH') rs.score -= threatBoost * 0.3       // 混一色：慢
      if (rs.route === 'HONOR_HEAVY') rs.score -= threatBoost * 0.2      // 风箭重：中等
    }
    routeScores.sort((a, b) => b.score - a.score)
  }

  const HIGH_VALUE_ROUTES: RouteKind[] = ['ALL_PUNGS', 'HALF_FLUSH', 'HONOR_HEAVY']
  const isPostRound10Forced = estimatedRound >= 10
  let postRound10Top: RouteScore | null = null
  let topCandidate = routeScores[0]
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

  // ★ V2.2: 碰后惯性 — 碰前路线已锁定时，给前一路线加分，防止手牌微变导致路线切换
  // 场景：碰前 ALL_PUNGS lockLevel=2，碰后 pairCount-1 但仍支持碰碰胡 → 保持路线
  if (previousRouteState && previousRouteState.lockLevel >= 1 && previousRouteState.current) {
    const prevRouteInScores = routeScores.find(c => c.route === previousRouteState.current)
    if (prevRouteInScores) {
      // 碰后惯性加分：lockLevel=2 加 8 分，lockLevel=1 加 5 分
      const inertiaBonus = previousRouteState.lockLevel >= 2 ? 8.0 : 5.0
      prevRouteInScores.score += inertiaBonus
      routeScores.sort((a, b) => b.score - a.score)
      // 重新确定 topCandidate
      topCandidate = routeScores[0]
    }
  }

  // ★ V2.1: 方向意识强化 — 10巡内验证，10巡后坚决执行
  // 极端情况检测：两口关系、对手大牌（风一色/清碰/风碰）
  const extremeThreat =
    features.twoPlayerBlocking ||
    features.bigOpenOpponentCount >= 2 ||
    (features.downstreamPressure >= 1.2 && features.fastOpenOpponentCount >= 2) ||
    features.oneSuitOpponentCount >= 2
  // ★ V2.2: 风牌积累够时允许从HALF_FLUSH切换到HONOR_HEAVY
  // 场景：混一色阶段保留风牌，风牌积累到4+张时转风一色
  const honorReadyForSwitch = previousRouteState?.current === 'HALF_FLUSH' && features.honorCount >= 4
  // ★ V2.7 Phase 3: 升级检测（混一色→清一色/风一色，碰碰胡→混碰/清碰）
  // 升级条件：手牌已经形成目标牌型的关键特征，允许在 lockLevel=2 时切换
  const pureFlushUpgradeReadyNow = features.pureFlushUpgradeReady
  const wildPureFlushUpgradeReady = (features as any).wildPureFlushReady
  const hunPengUpgradeReady = previousRouteState?.current === 'ALL_PUNGS' && features.honorPairCount >= 2 && features.honorCount >= 4
  const qingPengUpgradeReady = previousRouteState?.current === 'ALL_PUNGS' && features.pairCount + features.tripletCount >= 4 && features.secondSuitCount === 0 && features.honorCount === 0
  // ★ V2.8 Phase 4: 风一色/风碰升级（ALL_PUNGS/HALF_FLUSH → HONOR_HEAVY）
  // 条件：风向牌够多（8+） + 牌墙<20 → 应转风一色/风碰
  const _exposedHonorCount = (playerExposedHonorCount(input.player) || 0)
  const _totalHonorWithWild = features.honorCount + features.wildCount
  const _honorWithExposed = features.honorCount + _exposedHonorCount + features.wildCount
  const fengYiSeUpgradeReady =
    (previousRouteState?.current === 'HALF_FLUSH' || previousRouteState?.current === 'ALL_PUNGS') &&
    _honorWithExposed >= 8 && _totalHonorWithWild >= 8
  const upgradeTarget = pureFlushUpgradeReadyNow ? 'HALF_FLUSH' :
                        fengYiSeUpgradeReady ? 'HONOR_HEAVY' :
                        qingPengUpgradeReady ? 'ALL_PUNGS' :
                        hunPengUpgradeReady ? 'ALL_PUNGS' :
                        null
  // 百搭清一色升级目标：当前路线不是 HALF_FLUSH 时也可作为升级目标
  const upgradeTargetWild = wildPureFlushUpgradeReady && previousRouteState?.current !== 'HALF_FLUSH' ? 'HALF_FLUSH' : null
  // 升级豁免：当前路线不在升级目标，但 topCandidate 是升级目标 → 允许切换
  const upgradeExempt = upgradeTarget && previousRouteState && previousRouteState.current !== upgradeTarget && topCandidate?.route === upgradeTarget
  // 百搭升级豁免：仅当严格条件不满足但百搭条件满足
  const wildUpgradeExempt = upgradeTargetWild && !upgradeExempt && topCandidate?.route === 'HALF_FLUSH'
  // 允许的保守转向：碰碰胡/争取流局（不胡不放冲）
  const conservativeRoutes: RouteKind[] = ['ALL_PUNGS', 'STRIVE_DRAW']
  const isConservativeSwitch = previousRouteState && conservativeRoutes.includes(topCandidate.route as RouteKind) && !conservativeRoutes.includes(previousRouteState.current as RouteKind)

  // 切换门槛：lockLevel越高越难切换
  // lockLevel=2(坚决执行): 90%不摇摆，仅极端情况+保守转向才允许
  // lockLevel=1(锁定): 需要3次反面证据+高出5分才切换
  // 未锁定但稳定2回合: 需要2次反面证据+高出3分才切换
  // ★ K哥铁律(2026-06-08): 提高路线切换门槛，AI不轻易换方向
  const requiredEvidenceToFlip = previousRouteState?.lockLevel === 2 ? 8 : previousRouteState?.lockLevel === 1 ? 5 : (previousRouteState?.stableTurns || 0) >= 2 ? 3 : 2
  // ★ 路线清晰度加成：方向越明确，切换门槛越高
  // 清晰度 = top score - second score，越大说明方向越明确
  const routeClarity = previousCandidate && topCandidate ? Math.abs(topCandidate.score - (routeScores[1]?.score ?? 0)) : 0
  const clarityBoost = routeClarity > 5 ? 2.0 : routeClarity > 3 ? 1.2 : 0
  const flipThreshold = (previousRouteState?.lockLevel === 2 ? 10.0 : previousRouteState?.lockLevel === 1 ? 7.0 : (previousRouteState?.stableTurns || 0) >= 2 ? 4.5 : 2.0) + clarityBoost
  // ★ V2.7 Phase 3: 升级豁免时降低切换门槛
  // V2.8: 风一色升级也用更低的门槛(3.0)
  const effectiveFlipThreshold = upgradeExempt ? Math.min(flipThreshold, 3.0) : (fengYiSeUpgradeReady ? Math.min(flipThreshold, 4.0) : (wildUpgradeExempt ? Math.min(flipThreshold, 5.0) : flipThreshold))
  // lockLevel=2时：仅极端情况+保守转向才允许切换，或风牌积累够时允许切换到风一色
  // ★ V2.2: HONOR_HEAVY分数远高于当前路线时，也允许切换（解决风一色绝迹问题）
  // ★ V2.7: 升级豁免（混一色→清一色，碰碰胡→混碰/清碰）允许直接切换
  const locked2CanSwitch = previousRouteState?.lockLevel === 2
    ? (extremeThreat && isConservativeSwitch) || (extremeThreat && topCandidate.score >= previousCandidate!.score + 8) || honorReadyForSwitch || upgradeExempt || wildUpgradeExempt || (topCandidate.route === 'HONOR_HEAVY' && previousCandidate && topCandidate.score >= previousCandidate.score + 15)
    : true
  const canHoldPreviousRoute = isPostRound10Forced && previousRouteState && !HIGH_VALUE_ROUTES.includes(previousRouteState.current as RouteKind) ? false : !!previousRouteState && !!previousCandidate && softLockedPrevious && locked2CanSwitch && (previousCandidate.score >= topCandidate.score - effectiveFlipThreshold || evidenceAgainstPrevious < requiredEvidenceToFlip)

  let current = isPostRound10Forced ? postRound10Top : (canHoldPreviousRoute ? previousCandidate : topCandidate)

  // ★ V2.2: 4+对子/刻子时强制ALL_PUNGS，无论当前路线是什么
  // 场景：手牌有4+对子/刻子，但HALF_FLUSH评分更高 → 强制ALL_PUNGS
  if (features.pairCount + features.tripletCount >= 4 && current?.route !== 'ALL_PUNGS') {
    const forcedAllPungs = routeScores.find(c => c.route === 'ALL_PUNGS')
    if (forcedAllPungs && forcedAllPungs.score > -20) {  // 只要不是太差就强制
      if (forcedAllPungs.reasons) forcedAllPungs.reasons.push('force_all_pungs_by_pairs')
      current = forcedAllPungs
    }
  }

  // ★ K哥铁律(2026-06-07): 碰碰胡路线一旦决定，不可转混一色，只能升级为混碰
  // 如果之前是ALL_PUNGS且lockLevel>=1，绝不允许切到HALF_FLUSH
  if (previousRouteState?.current === 'ALL_PUNGS' && (previousRouteState.lockLevel >= 1 || (previousRouteState.stableTurns || 0) >= 2)) {
    if (current?.route === 'HALF_FLUSH') {
      // 强制保持ALL_PUNGS，不可转混一色
      const allPungsCandidate = routeScores.find(c => c.route === 'ALL_PUNGS')
      if (allPungsCandidate) {
        current = allPungsCandidate
      }
    }
  }
  // ★ K哥铁律(2026-06-09): lockLevel=2 时，ALL_PUNGS 得分加成，确保不被 HALF_FLUSH 超越
  if (previousRouteState?.current === 'ALL_PUNGS' && previousRouteState.lockLevel >= 2) {
    const allPungsInScores = routeScores.find(c => c.route === 'ALL_PUNGS')
    if (allPungsInScores) {
      allPungsInScores.score += 15  // 强加成，确保 ALL_PUNGS 稳居第一
      routeScores.sort((a, b) => b.score - a.score)
      current = routeScores[0]  // 重新选最高分
    }
  }
  const secondary = routeScores.find(c => c.route !== current.route) || null
  const gap = current && secondary ? current.score - secondary.score : (current?.score || 0)
  const stableOnPrevious = previousRouteState?.current === current?.route
  const stableTurns = stableOnPrevious ? (previousRouteState?.stableTurns || 1) + 1 : 1
  const switchCount = previousRouteState && previousRouteState.current !== current.route ? (previousRouteState.switchCount || 0) + 1 : (previousRouteState?.switchCount || 0)
  const evidenceCounter = canHoldPreviousRoute && previousRouteState && previousRouteState.current !== topCandidate.route ? evidenceAgainstPrevious : 0
  // ★ V2: 4+对子/刻子碰碰胡路线直接锁定（含门口碰/杠的刻子）
  const _apLockByPairs = current?.route === 'ALL_PUNGS' && (features.pairCount + features.tripletCount) >= 4
  // ★ V2.2: 3对子+无明显优势门 → 也锁定碰碰胡
  const _apLockBy3Pairs = current?.route === 'ALL_PUNGS' && (features.pairCount + features.tripletCount) >= 3 && features.longestSuitCount <= 5
  // ★ V2.1: 10巡后方向确定，压缩摇摆
  // 10巡+稳定2回合 → lockLevel=2（坚决执行）
  // 10巡+有方向 → lockLevel=1（锁定）
  // 5-9巡+稳定3回合+gap大 → lockLevel=1
  // ★ 风一色/风碰 锁定: 5巡内 honorCount>=8 (含百搭) → lockLevel=1
  // 5巡内 honorCount+wildCount>=9 → lockLevel=2
  const _honorRound = Math.max(1, Math.floor((input.game.discardPile?.length || 0) / 4) + 1)
  const _honorWithWild = features.honorCount + features.wildCount
  const _honorLock2 = _honorRound <= 5 && _honorWithWild >= 9
  const _honorLock1 = _honorRound <= 5 && features.honorCount >= 8

  // 碰碰胡4+对子 → lockLevel=1
  const lockLevel: 0 | 1 | 2 =
    isPostRound10Forced && stableTurns >= 2 && HIGH_VALUE_ROUTES.includes((current?.route) as RouteKind) ? 2 :
    isPostRound10Forced && HIGH_VALUE_ROUTES.includes((current?.route) as RouteKind) ? 1 :
    stableTurns >= 3 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel === 2 && gap >= 1.4 ? 2 :
    phase === 'RUSH' && gap >= 4 ? 2 :
    _honorLock2 ? 2 :
    _honorLock1 ? 1 :
    _apLockByPairs ? 2 :  // ★ K哥铁律(2026-06-08): 4+对子/刻子 → lockLevel=2 坚决锁死碰碰胡
    _apLockBy3Pairs ? 1 :  // ★ V2.2: 3对子+无优势门 → lockLevel=1 锁定碰碰胡
    // ★ V2.2: 碰后惯性 — 碰前路线已锁定时，碰后保持路线稳定
    // 场景：碰前 ALL_PUNGS lockLevel=2，碰后 pairCount 减1 但路线仍支持 → 保持 lockLevel=2
    (previousRouteState && previousRouteState.lockLevel >= 2 && stableOnPrevious && gap >= -2.0) ? 2 :
    (previousRouteState && previousRouteState.lockLevel >= 1 && stableOnPrevious && gap >= -1.5) ? 1 :
    estimatedRound >= 7 && stableTurns >= 2 && gap >= 2.0 ? 1 :
    stableTurns >= 2 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel >= 1 && gap >= 1.1 ? 1 :
    (phase === 'COMMIT' || phase === 'RUSH') && gap >= 2.5 ? 1 : 0

  // 评估 speedMode（独立于 route 的速度维度）
  const speedModeResult = evaluateSpeedMode(input, features)

  // ★ V2.2 调试：输出HONOR_HEAVY路线得分
  if (features.honorCount >= 5) {
    const honorHeavyScore = routeScores.find(r => r.route === 'HONOR_HEAVY')
    const halfFlushScore = routeScores.find(r => r.route === 'HALF_FLUSH')
    console.error(`[ROUTE-DIAG] honorCount=${features.honorCount} honorPairCount=${features.honorPairCount} wildCount=${features.wildCount} HONOR_HEAVY=${honorHeavyScore?.score?.toFixed(1)} HALF_FLUSH=${halfFlushScore?.score?.toFixed(1)} current=${current?.route}`)
  }

  return {
    policy, phase,
    current: current?.route || 'HALF_FLUSH',
    speedMode: speedModeResult.speedMode,
    secondary: secondary?.route || null,
    confidence: gap, lockLevel, stableTurns, switchCount, evidenceCounter,
    targetSuit: current?.targetSuit || null,
    routeScores, features,
  }
}

// ═══════════════════════════════════════════════
// ★ V2.15 性能优化: evaluateRouteStateV2 LRU 缓存
// 训练脚本中每张弃牌都调一次 evaluateRouteStateV2, 缓存避免重复 buildFeatureSummary
// 缓存 key = hand签名 + wildGroup + shanten + tableThreat + wallRemaining
// previousRouteState 不入 key(引用类型 + 是输入侧状态)
// 生产环境也可受益(同一玩家同状态多次评估)
// ═══════════════════════════════════════════════
const _routeStateV2Cache = new Map<string, { value: any; ts: number }>()
const _ROUTE_STATE_V2_CACHE_MAX = 5000
const _ROUTE_STATE_V2_CACHE_TTL = 60000
let _routeStateV2CacheHits = 0
let _routeStateV2CacheMisses = 0

export function getRouteStateV2CacheStats() {
  const total = _routeStateV2CacheHits + _routeStateV2CacheMisses
  return {
    hits: _routeStateV2CacheHits,
    misses: _routeStateV2CacheMisses,
    hitRate: total > 0 ? (_routeStateV2CacheHits / total * 100).toFixed(1) + '%' : '0%',
    size: _routeStateV2Cache.size
  }
}

export function clearRouteStateV2Cache() {
  _routeStateV2Cache.clear()
  _routeStateV2CacheHits = 0
  _routeStateV2CacheMisses = 0
}

// 包装函数: 优先查 cache, miss 才走完整逻辑
export function evaluateRouteStateV2Cached(input: {
  game: any; player: any; hand: any[]; shanten: number; effectiveTiles: number; tableThreat: number; wallRemaining: number;
  previousRouteState?: any; policy?: any
}): RouteState {
  const handLen = input.hand.length
  const handParts: string[] = new Array(handLen)
  for (let i = 0; i < handLen; i++) {
    const t = input.hand[i]
    handParts[i] = (t.isFlower || t.suit === 'hua' ? 'f' : t.suit[0]) + t.value
  }
  handParts.sort()
  const wildGroupKey = (input.game?.wildTileGroup || []).join(',')
  const cacheKey = handParts.join(',') + '|' + wildGroupKey + '|' + input.shanten + '|' + input.tableThreat.toFixed(2) + '|' + input.wallRemaining
  const cached = _routeStateV2Cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < _ROUTE_STATE_V2_CACHE_TTL) {
    _routeStateV2CacheHits++
    return cached.value
  }
  _routeStateV2CacheMisses++
  const result = evaluateRouteStateV2(input)
  if (_routeStateV2Cache.size >= _ROUTE_STATE_V2_CACHE_MAX) {
    const toDelete = Math.floor(_ROUTE_STATE_V2_CACHE_MAX / 4)
    const iter = _routeStateV2Cache.keys()
    for (let i = 0; i < toDelete; i++) {
      const k = iter.next().value
      if (k) _routeStateV2Cache.delete(k)
    }
  }
  _routeStateV2Cache.set(cacheKey, { value: result, ts: Date.now() })
  return result
}
