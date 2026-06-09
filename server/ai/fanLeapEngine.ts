/**
 * 番数跃迁引擎 (FanLeapEngine)
 * 
 * 只在收口阶段（接近听牌/胡牌）触发，评估"现在胡 vs 继续等"的期望收益。
 * 
 * 触发条件：摸牌后能自摸，但当前番数 < minFanThreshold（默认5番）
 * 搜索深度：3手（摸3张牌内能否听高番）
 * 
 * 核心逻辑：
 *   1. 当前手牌能胡 → 算出 baseFan
 *   2. 如果 baseFan < 5 → 搜索"不胡，继续打"的期望收益
 *   3. 枚举出牌选择 → 对每个选择，模拟从牌墙摸牌 → 评估新听牌的番数
 *   4. 期望收益 = Σ(各出牌选择的 best outcome)
 *   5. 期望收益 > 当前 baseFan → 建议"不胡，继续等"
 */

import { Tile, TileSuit, Meld, MeldType, GameState, Player } from '../types/game'
import { isFlower, isWind, isDragon } from '../utils/tiles'
import { canWin, findBestHandTypes, HandType } from '../utils/handValidator'
// import { calculateScore } from '../utils/scoring' // 未使用，走快速估算

// 固定番数表（与 scoring.ts 保持一致）
const FIXED_FAN: Record<string, number> = {
  '风碰': 40, '风一色': 20, '清碰': 20, '混碰': 10,
  '大吊碰碰胡': 10, '大吊混一色': 10, '大吊清一色': 10, '大吊清碰': 20, '大吊风一色': 20, '大吊风碰': 40,
  '大吊': 10, '清一色': 10, '无花自摸': 10, '杠开': 10, '八花自摸': 20, '四百搭': 10,
}

// ===== 番数跃迁配置 =====
export const FAN_LEAP_CONFIG = {
  // 低于此番数时触发跃迁评估
  minFanThreshold: 5,
  // 跃迁目标番数（10番 = 大吊/杠开/无花自摸/混碰/清一色等）
  targetFan: 10,
  // 最大搜索深度（手数）
  maxDepth: 3,
  // 跃迁概率阈值：低于此概率不值得等
  minLeapProbability: 0.20,
  // 期望收益系数：期望番数必须超过当前番数 × 此系数
  expectedFanMultiplier: 1.8,
  // 牌墙剩余张数太少时不搜索
  minWallRemaining: 8,
}

// ===== 类型定义 =====
export interface FanLeapResult {
  /** 当前能胡的番数 */
  currentFan: number
  /** 跃迁到 targetFan 的概率 */
  leapProbability: number
  /** 期望番数（加权平均） */
  expectedFan: number
  /** 期望收益差 = expectedFan - currentFan */
  expectedGain: number
  /** 建议：true=不胡继续等，false=现在胡 */
  shouldDecline: boolean
  /** 搜索详情 */
  details: string[]
  /** 出牌建议（如果 shouldDecline=true） */
  recommendedDiscard?: string
}

interface TenpaiEval {
  /** 听牌列表：每张听牌的番数和剩余张数 */
  tingEntries: { tile: Tile; fan: number; remaining: number; handTypes: HandType[] }[]
  /** 最高可听番数 */
  maxFan: number
  /** 加权期望番数 */
  weightedFan: number
  /** 总听牌张数 */
  totalTingCount: number
}

// ===== 工具函数 =====

function tileKey(t: Tile): string {
  return `${t.suit}-${t.value}`
}

function isWildTile(tile: Tile, game: GameState): boolean {
  const wildId = game.customScoringMode
  if (!wildId) return false
  const parts = wildId.split('-')
  if (parts.length < 2) return false
  const wildSuit = parts[0] as TileSuit
  const wildValue = parseInt(parts[1])
  return tile.suit === wildSuit && tile.value === wildValue
}

function countVisibleCopies(target: Tile, game: GameState, excludeHand?: Tile[]): number {
  let count = 0
  // 弃牌堆
  if (game.discardPile) {
    for (const t of game.discardPile) {
      if (t.suit === target.suit && t.value === target.value) count++
    }
  }
  // 所有玩家暴露的牌
  for (const p of game.players) {
    for (const m of p.hand.exposedMelds) {
      for (const t of m.tiles) {
        if (t.suit === target.suit && t.value === target.value) count++
      }
    }
  }
  // 排除自己手牌中的（因为这些在"出牌后"已经不在手里了）
  if (excludeHand) {
    for (const t of excludeHand) {
      if (t.suit === target.suit && t.value === target.value) count++
    }
  }
  return count
}

/**
 * 估算牌墙中每种牌的剩余张数
 */
function estimateRemainingTiles(game: GameState, selfHand: Tile[]): Map<string, number> {
  const remaining = new Map<string, number>()
  
  // 初始化：每种标准牌4张
  const suits: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) {
      remaining.set(`${suit}-${v}`, 4)
    }
  }
  // 风牌
  for (let v = 1; v <= 4; v++) remaining.set(`${TileSuit.WIND}-${v}`, 4)
  // 箭牌
  for (let v = 1; v <= 3; v++) remaining.set(`${TileSuit.DRAGON}-${v}`, 4)

  // 减去已见牌：弃牌堆 + 所有玩家暴露牌 + 所有玩家手牌（估算）
  const subtractTile = (t: Tile) => {
    const key = tileKey(t)
    remaining.set(key, Math.max(0, (remaining.get(key) || 0) - 1))
  }

  if (game.discardPile) {
    for (const t of game.discardPile) subtractTile(t)
  }
  for (const p of game.players) {
    for (const m of p.hand.exposedMelds) {
      for (const t of m.tiles) subtractTile(t)
    }
  }
  // 自己手牌
  for (const t of selfHand) subtractTile(t)

  return remaining
}

/**
 * 给定手牌+暴露牌，枚举所有听牌及其番数
 */
function enumerateTenpaiFan(
  hand: Tile[],
  exposedMelds: Meld[],
  game: GameState,
  wildTileId: string | null
): TenpaiEval {
  const results: TenpaiEval['tingEntries'] = []
  const exposedCount = exposedMelds.length
  const remaining = estimateRemainingTiles(game, hand)

  // 枚举所有可能的胡牌
  const allTileKeys: { suit: TileSuit; value: number }[] = []
  const suits: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) allTileKeys.push({ suit, value: v })
  }
  for (let v = 1; v <= 4; v++) allTileKeys.push({ suit: TileSuit.WIND, value: v })
  for (let v = 1; v <= 3; v++) allTileKeys.push({ suit: TileSuit.DRAGON, value: v })

  for (const { suit, value } of allTileKeys) {
    const testTile: Tile = { suit, value, id: `test-${suit}-${value}` }
    const testHand = [...hand, testTile]
    const winResult = canWin(testHand, exposedCount, wildTileId)
    if (!winResult.canWin) continue

    // 计算胡这张牌的番数
    const handTypes = findBestHandTypes(testHand, exposedMelds, wildTileId)
    // 简化版番数估算（不走完整 calculateScore，太重）
    const fan = estimateHandFan(handTypes, exposedMelds, hand, game)

    const key = tileKey(testTile)
    const inHand = hand.filter(t => t.suit === suit && t.value === value).length
    const rem = Math.max(0, (remaining.get(key) || 0))

    if (rem > 0) {
      results.push({ tile: testTile, fan, remaining: rem, handTypes })
    }
  }

  // 汇总
  const totalTingCount = results.reduce((s, e) => s + e.remaining, 0)
  const maxFan = results.length > 0 ? Math.max(...results.map(e => e.fan)) : 0
  const weightedFan = totalTingCount > 0
    ? results.reduce((s, e) => s + e.fan * e.remaining, 0) / totalTingCount
    : 0

  return { tingEntries: results, maxFan, weightedFan, totalTingCount }
}

/**
 * 快速番数估算（不走完整 scoring 流程）
 * 基于牌型查 FIXED_FAN 或公式估算
 */
function estimateHandFan(
  handTypes: HandType[],
  exposedMelds: Meld[],
  hand: Tile[],
  game: GameState
): number {
  if (handTypes.length === 0) return 0

  const hasType = (t: HandType) => handTypes.includes(t)
  // ★ 门清判断:花牌不算门口牌
  const isMenQing = !exposedMelds.some(m => {
    if (m.tiles?.length === 1 && isFlower(m.tiles[0])) return false;
    return m.type === MeldType.TRIPLET || m.type === MeldType.SEQUENCE || (m.type === MeldType.KONG && !m.isConcealed);
  })
  const wildId = game.customScoringMode || null
  const wildCount = wildId ? hand.filter(t => isWildTile(t, game)).length : 0
  const flowerCount = hand.filter(t => isFlower(t)).length +
    exposedMelds.filter(m => m.tiles?.length === 1 && isFlower(m.tiles[0])).length

  // 固定番牌型（优先级从高到低）
  if (hasType(HandType.ALL_WIND) && hasType(HandType.ALL_TRIPLETS)) return FIXED_FAN['风碰'] || 40
  if (hasType(HandType.ALL_WIND)) return FIXED_FAN['风一色'] || 20
  if (hasType(HandType.FULL_FLUSH) && hasType(HandType.ALL_TRIPLETS)) return FIXED_FAN['清碰'] || 20
  if (hasType(HandType.HALF_FLUSH) && hasType(HandType.ALL_TRIPLETS)) return FIXED_FAN['混碰'] || 10
  if (hasType(HandType.FULL_FLUSH)) return FIXED_FAN['清一色'] || 10
  if (hasType(HandType.HALF_FLUSH)) return FIXED_FAN['混一色'] || 10
  if (hasType(HandType.EIGHT_FLOWERS)) return FIXED_FAN['八花自摸'] || 20
  if (wildCount >= 4) return FIXED_FAN['四百搭'] || 10
  if (hasType(HandType.DA_DIAO)) return FIXED_FAN['大吊'] || 10
  if (hasType(HandType.FOUR_WILD)) return FIXED_FAN['四百搭'] || 10

  // 杠开/无花自摸在收口阶段由外部判断，此处不单独计算

  // 公式计算牌型（碰碰胡/混一色）
  if (hasType(HandType.ALL_TRIPLETS) || hasType(HandType.HALF_FLUSH)) {
    // 公式: min(2 + 花牌数 + 组合牌点数, 10)
    // 组合牌点数简化估算：副露中风箭刻贡献
    let comboPoints = 0
    for (const m of exposedMelds) {
      if (m.type === MeldType.TRIPLET || m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG) {
        const t = m.tiles[0]
        if (isWind(t)) comboPoints += 4
        else if (isDragon(t)) comboPoints += 6
      }
    }
    // 无花自摸
    if (flowerCount === 0) return Math.max(10, Math.min(2 + flowerCount + comboPoints, 10))
    return Math.min(2 + flowerCount + comboPoints, 10)
  }

  // 兜底
  return 2
}

/**
 * 番数跃迁搜索：当前手牌 → 出牌后 → 摸牌 → 评估新听牌的番数
 * 
 * 核心逻辑：
 *   当前手牌（14张）能胡但番数低 →
 *   枚举出哪张牌（13张）→
 *   对每个出牌选择，估算摸到好牌后的听牌质量 →
 *   返回最佳出牌选择的期望收益
 */
export function evaluateFanLeap(
  player: Player,
  game: GameState,
  currentFan: number
): FanLeapResult {
  const hand = player.hand.concealedTiles
  const exposedMelds = player.hand.exposedMelds
  const wildTileId = game.customScoringMode || null
  const wallRemaining = game.wall?.length || 0

  const details: string[] = []
  details.push(`当前番数: ${currentFan}，牌墙剩余: ${wallRemaining}`)

  // 前置检查
  if (wallRemaining < FAN_LEAP_CONFIG.minWallRemaining) {
    details.push('牌墙不足，不搜索')
    return { currentFan, leapProbability: 0, expectedFan: currentFan, expectedGain: 0, shouldDecline: false, details }
  }

  // 不含百搭的手牌（出牌时优先考虑非百搭）
  const nonWildHand = hand.filter(t => !isWildTile(t, game))
  const discardCandidates = nonWildHand.length > 0 ? nonWildHand : hand

  let bestOverallExpectedFan = currentFan
  let bestDiscardTile: string | undefined
  let bestLeapProb = 0
  const allPaths: { discard: string; expectedFan: number; leapProb: number }[] = []

  // 枚举出牌选择
  for (const discardTile of discardCandidates) {
    // 出牌后的13张手牌
    const remainingHand = hand.filter(t => t.id !== discardTile.id)
    const remainingCount = remainingHand.length

    // 评估出牌后摸到每种牌的期望
    const remainingTiles = estimateRemainingTiles(game, hand)
    // 出牌后这张牌也回到"可用池"（虽然是弃牌，但计算剩余张时不算自己手里的）
    const discardKey = tileKey(discardTile)
    remainingTiles.set(discardKey, Math.max(0, (remainingTiles.get(discardKey) || 0)))

    // 搜索深度1：摸1张牌后能听什么
    let pathExpectedFan = 0
    let pathLeapProb = 0
    let totalWeight = 0

    // 枚举所有可能摸到的牌（只算牌墙中剩余的）
    for (const [key, count] of remainingTiles.entries()) {
      if (count <= 0) continue
      const [suitStr, valueStr] = key.split('-')
      const suit = suitStr as TileSuit
      const value = parseInt(valueStr)
      if (!suit || isNaN(value)) continue

      const drawTile: Tile = { suit, value, id: `draw-${key}` }
      const newHand = [...remainingHand, drawTile]

      // 摸到这张牌后，评估听牌质量
      // 检查是否能胡（自摸）
      const canSelfDraw = canWin(newHand, exposedMelds.length, wildTileId)
      if (canSelfDraw.canWin) {
        const handTypes = findBestHandTypes(newHand, exposedMelds, wildTileId)
        const fan = estimateHandFan(handTypes, exposedMelds, newHand, game)
        pathExpectedFan += fan * count
        if (fan >= FAN_LEAP_CONFIG.targetFan) pathLeapProb += count
        totalWeight += count
      } else {
        // 不能自摸，评估听牌质量
        const tenpai = enumerateTenpaiFan(newHand, exposedMelds, game, wildTileId)
        pathExpectedFan += tenpai.weightedFan * count
        if (tenpai.maxFan >= FAN_LEAP_CONFIG.targetFan) {
          // 有听高番的可能，按听牌张数加权
          const highFanTing = tenpai.tingEntries.filter(e => e.fan >= FAN_LEAP_CONFIG.targetFan)
          const highFanCount = highFanTing.reduce((s, e) => s + e.remaining, 0)
          if (tenpai.totalTingCount > 0) {
            pathLeapProb += (highFanCount / tenpai.totalTingCount) * count
          }
        }
        totalWeight += count
      }
    }

    if (totalWeight > 0) {
      pathExpectedFan /= totalWeight
      pathLeapProb /= totalWeight
    }

    allPaths.push({
      discard: `${discardTile.suit}-${discardTile.value}`,
      expectedFan: pathExpectedFan,
      leapProb: pathLeapProb,
    })

    if (pathExpectedFan > bestOverallExpectedFan) {
      bestOverallExpectedFan = pathExpectedFan
      bestDiscardTile = `${discardTile.suit}-${discardTile.value}`
      bestLeapProb = pathLeapProb
    }
  }

  // 汇总结果
  const expectedGain = bestOverallExpectedFan - currentFan
  const shouldDecline =
    bestOverallExpectedFan >= currentFan * FAN_LEAP_CONFIG.expectedFanMultiplier &&
    bestLeapProb >= FAN_LEAP_CONFIG.minLeapProbability

  details.push(`最佳出牌: ${bestDiscardTile || '无'}，期望番数: ${bestOverallExpectedFan.toFixed(1)}`)
  details.push(`跃迁概率: ${(bestLeapProb * 100).toFixed(1)}%，收益差: +${expectedGain.toFixed(1)}`)

  // 打印 top 3 路径
  allPaths.sort((a, b) => b.expectedFan - a.expectedFan)
  for (let i = 0; i < Math.min(3, allPaths.length); i++) {
    const p = allPaths[i]
    details.push(`  路径${i + 1}: 打${p.discard} → 期望${p.expectedFan.toFixed(1)}番，跃迁${(p.leapProb * 100).toFixed(1)}%`)
  }

  return {
    currentFan,
    leapProbability: bestLeapProb,
    expectedFan: bestOverallExpectedFan,
    expectedGain,
    shouldDecline,
    details,
    recommendedDiscard: bestDiscardTile,
  }
}
