/**
 * 长清阁麻将 - 路线评分系统
 * 三层架构：路线评分 × 阶段调制 × 态势修正
 */
import { Tile, TileSuit, Meld, MeldType } from '../server/types/game'
import { isHonor, isWind, isDragon, isFlower, groupTiles } from '../server/utils/tiles'
import { isTing } from '../server/utils/handValidator'
import { buildWildTileChecker } from '../server/utils/handValidator'

// ===== 路线定义 =====
export enum Route {
  PURE_FLUSH = 'pure_flush',     // 清一色
  ALL_PUNGS = 'all_pungs',       // 碰碰胡
  HALF_FLUSH = 'half_flush',     // 混一色
  ALL_WIND = 'all_wind',         // 风一色
  QING_PENG = 'qing_peng',      // 清碰
  FENG_PENG = 'feng_peng',      // 风碰
}

export enum Phase { EARLY = 'early', MID = 'mid', LATE = 'late' }

// ===== 参数定义 =====
export const PARAMS = {
  // 花色集中度 (每条路线 × 每个集中率区间)
  suitConcentration: {
    [Route.PURE_FLUSH]:  { high: 30, mid: 22, low: 12, vlow: 3 },
    [Route.ALL_PUNGS]:   { high: 10, mid: 8, low: 6, vlow: 4 },
    [Route.HALF_FLUSH]:  { high: 25, mid: 18, low: 10, vlow: 3 },
    [Route.ALL_WIND]:    { high: 30, mid: 22, low: 12, vlow: 3 },
    [Route.QING_PENG]:   { high: 30, mid: 22, low: 12, vlow: 3 },
    [Route.FENG_PENG]:   { high: 30, mid: 22, low: 12, vlow: 3 },
  } as Record<Route, Record<string, number>>,

  // 结构匹配权重
  structWeights: {
    [Route.ALL_PUNGS]:  { triplet: 10, pair: 5, sequence: -3, honorPairBonus: 3 },
    [Route.PURE_FLUSH]: { sequence: 8, triplet: 8, pair: 4, mixedPenalty: -2 },
    [Route.HALF_FLUSH]: { sequence: 6, triplet: 6, pair: 3, honorBonus: 2 },
    [Route.ALL_WIND]:   { triplet: 10, pair: 5, sequence: -10, honorPairBonus: 5 },
    [Route.QING_PENG]:  { triplet: 10, pair: 5, sequence: -5, mixedPenalty: -3 },
    [Route.FENG_PENG]:  { triplet: 12, pair: 6, sequence: -10, honorPairBonus: 5 },
  } as Record<Route, Record<string, number>>,

  // 百搭利用率
  wildUtilization: {
    [Route.ALL_PUNGS]:  { perTriplet: 10, perPair: 5, excess: -3 },
    [Route.PURE_FLUSH]: { perSuit: 8, perTriplet: 6, perPair: 3, excess: -2 },
    [Route.HALF_FLUSH]: { perSuit: 5, perTriplet: 5, perPair: 2, excess: -2 },
    [Route.ALL_WIND]:   { perTriplet: 8, perPair: 4, excess: -5 },
    [Route.QING_PENG]:  { perTriplet: 12, perPair: 6, excess: -3 },
    [Route.FENG_PENG]:  { perTriplet: 10, perPair: 5, excess: -5 },
  } as Record<Route, Record<string, number>>,

  // 阶段调制 (路线 × 阶段)
  phaseModifiers: {
    [Route.PURE_FLUSH]:  { early: 0.8, mid: 1.2, late: 1.0 },
    [Route.ALL_PUNGS]:   { early: 1.0, mid: 1.0, late: 1.3 },
    [Route.HALF_FLUSH]:  { early: 1.0, mid: 1.0, late: 1.1 },
    [Route.ALL_WIND]:    { early: 1.3, mid: 0.8, late: 0.5 },
    [Route.QING_PENG]:   { early: 0.6, mid: 1.3, late: 1.0 },
    [Route.FENG_PENG]:   { early: 1.2, mid: 0.7, late: 0.4 },
  } as Record<Route, Record<string, number>>,

  // 百搭态势修正 (路线倾向 × 百搭数)
  wildSituationMod: {
    aggressive: { 0: 0.5, 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5 },
    balanced:   { 0: 1.0, 1: 1.0, 2: 1.0, 3: 0.8, 4: 0.6 },
    fast:       { 0: 1.2, 1: 1.0, 2: 0.8, 3: 0.6, 4: 0.5 },
  } as Record<string, Record<number, number>>,

  // 积分态势修正
  scoreSituationMod: {
    leading:  { aggressive: 0.7, defensive: 1.3, balanced: 1.0 },
    mid:      { aggressive: 1.0, defensive: 1.0, balanced: 1.0 },
    trailing: { aggressive: 1.5, defensive: 0.6, balanced: 0.9 },
  } as Record<string, Record<string, number>>,

  // 牌墙态势修正
  wallSituationMod: {
    early: { aggressive: 1.2, fast: 0.9 },
    mid:   { aggressive: 1.0, fast: 1.0 },
    late:  { aggressive: 0.7, fast: 1.3 },
  } as Record<string, Record<string, number>>,

  // 阶段行为参数
  phaseBehavior: {
    early: { meldCaution: 0.7, pairPreservation: 2.0, wildAccumulate: 0.9 },
    mid:   { meldCaution: 0.3, pairPreservation: 1.0, wildAccumulate: 0.5 },
    late:  { meldCaution: 0.1, pairPreservation: 0.5, wildAccumulate: 0.1 },
  } as Record<string, Record<string, number>>,
}

// ===== 核心函数 =====

/** 判定当前阶段 */
export function determinePhase(concealedCount: number, meldCount: number, wallRemaining: number): Phase {
  if (concealedCount <= 7 || meldCount >= 3 || wallRemaining <= 40) return Phase.LATE
  if (concealedCount <= 9 || meldCount >= 2 || wallRemaining <= 60) return Phase.MID
  return Phase.EARLY
}

/** 路线倾向分类 */
function routeTendency(route: Route): string {
  switch (route) {
    case Route.PURE_FLUSH: case Route.ALL_WIND: case Route.QING_PENG: case Route.FENG_PENG:
      return 'aggressive'
    case Route.HALF_FLUSH:
      return 'balanced'
    case Route.ALL_PUNGS:
      return 'fast'
  }
}

/** 花色集中度评分 */
function suitScore(route: Route, hand: Tile[], exposedMelds: M[]): number {
  const allTiles = [...hand, ...exposedMelds.flatMap(m => m.tiles)]
  const nonFlower = allTiles.filter(t => !isFlower(t))
  if (nonFlower.length === 0) return 0

  const p = PARAMS.suitConcentration[route]

  if (route === Route.ALL_WIND || route === Route.FENG_PENG) {
    const honorRatio = nonFlower.filter(t => isHonor(t)).length / nonFlower.length
    return honorRatio >= 0.8 ? p.high : honorRatio >= 0.6 ? p.mid : honorRatio >= 0.4 ? p.low : p.vlow
  }

  const suits: Record<string, number> = {}
  for (const t of nonFlower) {
    if (!isHonor(t)) suits[t.suit] = (suits[t.suit] || 0) + 1
  }
  const maxSuit = Math.max(0, ...Object.values(suits))
  const ratio = maxSuit / nonFlower.length

  if (route === Route.ALL_PUNGS) return ratio >= 0.4 ? p.mid : p.vlow

  return ratio >= 0.8 ? p.high : ratio >= 0.6 ? p.mid : ratio >= 0.4 ? p.low : p.vlow
}

/** 结构匹配评分 */
function structScore(route: Route, hand: Tile[], exposedMelds: M[]): number {
  const p = PARAMS.structWeights[route]
  let score = 0
  const groups = groupTiles(hand)

  // 数对子和刻子潜力
  let pairCount = 0, tripletPotential = 0, sequencePotential = 0
  for (const [, tiles] of groups) {
    if (tiles.length >= 2) pairCount++
    if (tiles.length >= 3) tripletPotential++
  }

  // 数已有面子
  let exposedTriplets = 0, exposedSequences = 0
  for (const m of exposedMelds) {
    if (m.type === MeldType.TRIPLET) exposedTriplets++
    if (m.type === MeldType.SEQUENCE) exposedSequences++
  }

  // 顺子潜力（相邻牌）
  const suitGroups: Record<string, number[]> = {}
  for (const t of hand.filter(t => !isHonor(t) && !isFlower(t))) {
    if (!suitGroups[t.suit]) suitGroups[t.suit] = []
    suitGroups[t.suit].push(t.value)
  }
  for (const vals of Object.values(suitGroups)) {
    vals.sort((a, b) => a - b)
    for (let i = 0; i < vals.length - 1; i++) {
      if (vals[i + 1] - vals[i] <= 2) sequencePotential++
    }
  }

  // 路线特化评分
  if (route === Route.ALL_PUNGS || route === Route.QING_PENG || route === Route.FENG_PENG) {
    score += (pairCount + tripletPotential) * p.pair
    score += exposedTriplets * p.triplet
    score += (exposedSequences + sequencePotential) * p.sequence
    // 风箭对子加分
    const honorPairs = hand.filter(t => isHonor(t)).reduce((acc, t) => {
      const key = `${t.suit}-${t.value}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    for (const cnt of Object.values(honorPairs)) {
      if (cnt >= 2) score += p.honorPairBonus
    }
  } else {
    // 清一色/混一色：顺子和刻子都加分
    score += (pairCount + tripletPotential) * p.pair
    score += exposedTriplets * p.triplet
    score += sequencePotential * p.sequence
    if (exposedSequences > 0) score += exposedSequences * p.sequence
  }

  return Math.max(0, Math.min(30, score))
}

/** 百搭利用率评分 */
function wildScore(route: Route, hand: Tile[], wildCount: number, wildSuit?: TileSuit, wildValue?: number): number {
  if (wildCount === 0) return 0
  const p = PARAMS.wildUtilization[route]
  const groups = groupTiles(hand.filter(t => !isWildTile(t, wildSuit, wildValue)))
  let score = 0
  let used = 0

  // 优先补刻子
  for (const [, tiles] of groups) {
    if (tiles.length === 2 && used < wildCount) {
      score += p.perTriplet
      used++
    }
  }
  // 补对子
  for (const [, tiles] of groups) {
    if (tiles.length === 1 && used < wildCount) {
      score += p.perPair
      used++
    }
  }
  // 剩余百搭
  const remaining = wildCount - used
  score += remaining * p.excess

  return Math.max(0, Math.min(20, score))
}

function isWildTile(t: Tile, ws?: TileSuit, wv?: number): boolean { return !!(ws && wv && t.suit === ws && t.value === wv) }

/** 成型进度评分 */
function progressScore(route: Route, hand: Tile[], exposedMelds: M[]): number {
  const totalNeeded = 5 // 4面子+1对
  const groups = groupTiles(hand)
  let pairs = 0, triplets = 0
  for (const [, tiles] of groups) {
    if (tiles.length >= 3) triplets++
    else if (tiles.length >= 2) pairs++
  }
  const melds = exposedMelds.length + triplets
  const progress = (melds + pairs * 0.5) / totalNeeded
  return Math.round(progress * 20)
}

/** 路线评分（核心函数） */
export function routeScore(route: Route, hand: Tile[], exposedMelds: M[], wildCount: number, phase: Phase, wallRemaining: number, scorePosition: string, wildSuit?: TileSuit, wildValue?: number): number {
  const handMatch = suitScore(route, hand, exposedMelds)
    + structScore(route, hand, exposedMelds)
    + wildScore(route, hand, wildCount, wildSuit, wildValue)
    + progressScore(route, hand, exposedMelds)

  const phaseMod = PARAMS.phaseModifiers[route][phase]
  const tendency = routeTendency(route)

  const wildKey = Math.min(4, Math.max(0, wildCount)) as 0|1|2|3|4
  const wildMod = PARAMS.wildSituationMod[tendency][wildKey]
  const wallPhase = wallRemaining > 60 ? 'early' : wallRemaining > 30 ? 'mid' : 'late'
  const wallMod = PARAMS.wallSituationMod[wallPhase][tendency === 'balanced' ? 'fast' : tendency]
  const scoreMod = PARAMS.scoreSituationMod[scorePosition]?.[tendency] ?? 1.0

  return handMatch * phaseMod * wildMod * wallMod * scoreMod
}

/** 评估所有路线 */
export function evaluateAllRoutes(hand: Tile[], exposedMelds: M[], wildCount: number, phase: Phase, wallRemaining: number, scorePosition: string, wildSuit?: TileSuit, wildValue?: number): Array<{ route: Route, score: number }> {
  return Object.values(Route).map(route => ({
    route,
    score: routeScore(route, hand, exposedMelds, wildCount, phase, wallRemaining, scorePosition, wildSuit, wildValue)
  })).sort((a, b) => b.score - a.score)
}

/**
 * 计算距离听牌差几张有效牌
 * distance=0: 已经听牌
 * distance=1: 弃1张即听
 * distance=2: 弃2张即听
 * distance≥3: 还远
 * 支持有百搭的情况
 */
export function calcTenpaiDistance(hand: Tile[], exposedMelds: Meld[], wildSuit?: TileSuit, wildValue?: number): number {
  const nonFlower = hand.filter(t => t && !isFlower(t))
  if (nonFlower.length < 2) return 99

  const meldCount = exposedMelds.length
  let kongCount = 0
  for (const m of exposedMelds) {
    if (m.tiles && m.tiles.length >= 4) kongCount++
  }
  const expectedLen = 14 - (meldCount - kongCount) * 3 - kongCount * 4

  if (nonFlower.length !== expectedLen && nonFlower.length !== expectedLen + 1) return 99

  // 辅助函数：检查弃掉指定牌后是否听牌
  const checkTenpai = (remaining: Tile[]): boolean => {
    if (remaining.length !== expectedLen) return false
    try {
      const wsVal = wildSuit && wildValue ? `${wildSuit}-${wildValue}` : null
      return isTing(remaining, exposedMelds.length, buildWildTileChecker(wsVal))
    } catch { return false }
  }

  // 已经听牌
  if (checkTenpai(nonFlower)) return 0

  // 弃1张即听
  for (let i = 0; i < nonFlower.length; i++) {
    const after = nonFlower.filter((_, j) => j !== i)
    if (checkTenpai(after)) return 1
  }

  // 弃2张即听
  if (nonFlower.length > expectedLen - 1) {
    for (let i = 0; i < nonFlower.length; i++) {
      for (let j = i + 1; j < nonFlower.length; j++) {
        const after = nonFlower.filter((_, k) => k !== i && k !== j)
        if (checkTenpai(after)) return 2
      }
    }
  }

  return 3
}

/** 出牌决策：选价值最低的牌打出 */
export function selectDiscard(hand: Tile[], exposedMelds: M[], wildCount: number, phase: Phase, wallRemaining: number, scorePosition: string, wildSuit?: TileSuit, wildValue?: number): string | null {
  if (hand.length === 0) return null
  const routes = evaluateAllRoutes(hand, exposedMelds, wildCount, phase, wallRemaining, scorePosition, wildSuit, wildValue)

  let worstTile = hand[0]
  let worstScore = Infinity

  for (const tile of hand) {
    // 模拟打出这张牌后的路线评分
    const remaining = hand.filter(t => t.id !== tile.id)
    const newRoutes = evaluateAllRoutes(remaining, exposedMelds, wildCount, phase, wallRemaining, scorePosition, wildSuit, wildValue)
    const totalScore = newRoutes.reduce((s, r) => s + r.score, 0)

    // 百搭绝对不打
    if (isWildTile(tile, wildSuit, wildValue)) continue

    if (totalScore < worstScore) {
      worstScore = totalScore
      worstTile = tile
    }
  }

  return worstTile.id
}

/** 吃碰决策 */
/**
 * 吃碰概率计算（返回 0-1）
 * 核心原则：接近听牌时强制吃碰，加快听牌速度
 * 距离≤2：100%吃碰
 * 距离=3：高概率吃碰（80%）
 * 其他：按K哥规则计算
 */
export function shouldClaim(action: string, hand: Tile[], exposedMelds: M[], wildCount: number, phase: Phase, wallRemaining: number, scorePosition: string, isMenqing: boolean, wildSuit?: TileSuit, wildValue?: number): number {
  // ===== 近听优先：distance ≤ 2 强制吃碰 =====
  const tenpaiDist = calcTenpaiDistance(hand, exposedMelds, wildSuit, wildValue)
  if (tenpaiDist <= 2) return 1.0     // 距离≤2：必吃碰
  if (tenpaiDist === 3) return 0.8     // 距离=3：高概率吃碰

  const routes = evaluateAllRoutes(hand, exposedMelds, wildCount, phase, wallRemaining, scorePosition, wildSuit, wildValue)
  const bestScore = routes[0]?.score ?? 0
  const bestRoute = routes[0]?.route

  // 计算同色长度（不含百搭）
  const suits: Record<string, number> = {}
  for (const t of hand.filter(t => !isWildTile(t, wildSuit, wildValue))) {
    suits[t.suit] = (suits[t.suit] || 0) + 1
  }
  const maxSuitCount = Math.max(0, ...Object.values(suits))

  // 基础概率：路线得分越高，越倾向吃碰
  let prob = Math.min(bestScore / 50, 1.0)

  // *** K哥核心规则（完整版）***
  // 同色≥7 + 有百搭 → 门清最优路径，压制吃碰意愿（断崖式下降）
  if (maxSuitCount >= 7 && wildCount >= 1) {
    prob = 0.1 + prob * 0.1  // 极低：保门清靠自摸
  } else if (maxSuitCount >= 7 && wildCount === 0) {
    // 同色≥7 + 无百搭 → 必须靠吃碰凑牌，大幅提升意愿
    if (action === 'chow') prob = Math.min(prob + 0.35, 0.85)
    if (action === 'peng') prob = Math.min(prob + 0.25, 0.9)
  } else {
    // 其他情况：百搭越多，越积极
    if (wildCount >= 3) prob = Math.min(prob + 0.2, 1.0)
    else if (wildCount >= 2) prob = Math.min(prob + 0.15, 1.0)
    else if (wildCount >= 1) prob = Math.min(prob + 0.08, 1.0)
  }

  // 门清折扣：门清状态吃碰损失更大（叠加K哥规则）
  if (isMenqing) prob *= 0.7

  // 阶段折扣：后期更积极
  if (phase === Phase.LATE) prob = Math.min(prob + 0.15, 1.0)
  else if (phase === Phase.MID) prob = Math.min(prob + 0.05, 1.0)

  // 吃 vs 碰：碰优先级更高
  if (action === 'chow') {
    // 碰碰胡/风一色不需要顺子，吃牌收益低
    if (bestRoute === 'all_pungs' || bestRoute === 'all_wind') {
      prob *= 0.5
    }
  }

  return Math.max(0, Math.min(1, prob))
}

type M = Meld
