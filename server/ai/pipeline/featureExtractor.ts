/**
 * P2 统一特征管线 - 特征提取器
 * 从 GameState 抽取固定长度 FeatureVector
 */
import { GameState, Player, Tile, TileSuit } from '../../types/game'
import type { FeatureVector, FeatureConfig } from './types'
import { countEffectiveTiles as realCountEff, computeShanten } from '../../services/botService'

const DEFAULT_CONFIG: FeatureConfig = {
  enableBaidaLock: true,
  enableRiskAssessment: true,
  enableTempoTracking: true,
  riskLookBack: 5,
}

/**
 * 从游戏状态提取玩家特征向量
 */
export function extractFeatures(
  game: GameState,
  playerId: string,
  config: Partial<FeatureConfig> = {}
): FeatureVector {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const player = game.players.find(p => p.id === playerId)
  if (!player) {
    throw new Error(`Player ${playerId} not found in game`)
  }

  const hand = player.hand.concealedTiles
  const wildTile = player.wildTile
  const wildChecker = (t: Tile) =>
    wildTile ? t.suit === wildTile.suit && t.value === wildTile.value : false

  // === 基础牌力 ===
  const shanten = computeShanten(hand, player.hand.exposedMelds.length, wildChecker)
  const effectiveTiles = realCountEff(hand, player.hand.exposedMelds.length, wildChecker)

  // === 牌型状态 ===
  const meldCount = player.hand.exposedMelds.length
  const isMenqing = meldCount === 0
  const hasBaida = hand.some(wildChecker)

  // === 百搭冷冻 ===
  let baidaLockTurns = 0
  let baidaDiscardTurnSeq: number | null = null
  if (cfg.enableBaidaLock) {
    const lock = (game as any).baidaDiscardLock
    if (lock && lock.turnSeq != null) {
      // 解冻条件：4个玩家各出一张后解冻 = 当前轮次 - 触发轮次 >= 4
      const turnsElapsed = game.turnIndex - lock.turnSeq
      baidaLockTurns = Math.max(0, 4 - turnsElapsed)
      baidaDiscardTurnSeq = lock.turnSeq
    }
  }

  // === 安全/风险 ===
  const dealInRisk = cfg.enableRiskAssessment
    ? assessDealInRisk(game, player, hand)
    : 0
  const dangerToOthers = assessDangerToOthers(hand, game.discardPile)
  const opponentTingCount = estimateOpponentTingCount(game, playerId)

  // === 巡目/位置 ===
  const roundNumber = Math.floor(game.turnIndex / 4) + 1
  const isDealer = game.dealerIndex === game.players.indexOf(player)
  const seatIndex = game.players.indexOf(player)

  // === 得分状态 ===
  const scores = game.players.map(p => p.score)
  const maxScore = Math.max(...scores)
  const scoreGap = (player.score - maxScore)

  // === 特殊状态 ===
  const isFirstRound = game.turnIndex < 4

  // 上家打出的牌（pendingAction 中的 discard）
  const lastDiscard: Tile | null =
    (game.pendingActions.find(pa => pa.type === 'discard') as any)?.tile ?? null

  return {
    shanten,
    effectiveTiles,
    handSize: hand.length,
    meldCount,
    isMenqing,
    hasBaida,
    baidaLockTurns,
    baidaDiscardTurnSeq,
    dealInRisk,
    dangerToOthers,
    opponentTingCount,
    roundNumber,
    isDealer,
    seatIndex,
    scoreGap,
    gameMultiplier: game.gameMultiplier ?? 1,
    isFirstRound,
    lastDiscard,
  }
}

// === 辅助函数 ===

function assessDealInRisk(game: GameState, player: Player, hand: Tile[]): number {
  // 基于弃牌区分析放铳风险
  const recentDiscards = game.discardPile.slice(-9) // 最近9张
  if (recentDiscards.length === 0) return 0

  const playerTiles = new Set(hand.map(t => `${t.suit}-${t.value}`))
  let riskCount = 0
  for (const t of recentDiscards) {
    const key = `${t.suit}-${t.value}`
    // 如果玩家手牌有这张的相邻牌，有一定风险
    // 简化：直接看弃牌中有多少在hand中
    if (playerTiles.has(key)) riskCount++
  }
  return Math.min(1, riskCount / 3)
}

/**
 * 评估当前手牌的平均危险程度
 * 用于特征工程：高分=手牌多为他人需要的安全牌
 * 算法：统计已现张比例，已现越多=越安全
 */
function assessDangerToOthers(hand: Tile[], discardPile: Tile[]): number {
  if (hand.length === 0) return 0
  // 建立已现牌 Set
  const appeared = new Set<string>()
  for (const t of discardPile) {
    appeared.add(`${t.suit}-${t.value}`)
  }
  // 每张手牌的危险度 = 已现比例（已现越多越安全）
  let totalDanger = 0
  for (const t of hand) {
    const key = `${t.suit}-${t.value}`
    if (appeared.has(key)) {
      // 该张已有人打出，完全安全
      totalDanger += 0
    } else {
      // 该张未现，计算其周边牌的已现比例
      const related = getRelatedTileKeys(t)
      let appearedCount = 0
      for (const r of related) {
        if (appeared.has(r)) appearedCount++
      }
      const safeRatio = related.length > 0 ? appearedCount / related.length : 0
      // 危险度 = 1 - safeRatio（周边都未现=危险，周边都已现=安全）
      totalDanger += (1 - safeRatio) * getBaseDanger(t)
    }
  }
  return Math.min(1, totalDanger / hand.length)
}

function getRelatedTileKeys(t: Tile): string[] {
  const { suit, value } = t
  const keys: string[] = []
  // 同花色相邻牌（顺子相关）
  if (suit === TileSuit.DOTS || suit === TileSuit.CHARACTERS || suit === TileSuit.BAMBOOS) {
    if (value > 1) keys.push(`${suit}-${value - 1}`)
    if (value < 9) keys.push(`${suit}-${value + 1}`)
    if (value > 2) keys.push(`${suit}-${value - 2}`)
    if (value < 8) keys.push(`${suit}-${value + 2}`)
  }
  // 同value（刻子相关）
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    if (s !== suit) keys.push(`${s}-${value}`)
  }
  return keys
}

function getBaseDanger(t: Tile): number {
  // 幺九牌（1/9）和字牌更难被需要，危险度较低
  const { suit, value } = t
  if (suit === TileSuit.WIND || suit === TileSuit.DRAGON) return 0.6
  if (value === 1 || value === 9) return 0.5
  return 0.8 // 中张牌最容易被需要
}

/**
 * 估算已听牌（tenpai）对手数量
 * 算法：基于副露数+巡目推断
 * - 副露≥3个：极可能已听（快到终点）
 * - 副露2个+晚巡（>15轮）：可能已听
 * - 其他：低概率
 */
function estimateOpponentTingCount(game: GameState, selfId: string): number {
  const roundNumber = Math.floor(game.turnIndex / 4) + 1
  let tingCount = 0
  for (const p of game.players) {
    if (p.id === selfId) continue
    const meldCount = p.hand.exposedMelds.length
    // 副露>=3 → 高概率已听
    if (meldCount >= 3) {
      tingCount += 0.85
    }
    // 副露2个 + 晚巡（>15轮）→ 中等概率
    else if (meldCount === 2 && roundNumber > 15) {
      tingCount += 0.4
    }
    // 副露1个 + 很晚巡（>20轮）→ 较低概率
    else if (meldCount === 1 && roundNumber > 20) {
      tingCount += 0.2
    }
    // 0副露：基于巡目保守估计
    else if (meldCount === 0 && roundNumber > 25) {
      tingCount += 0.1
    }
  }
  return Math.min(3, tingCount)
}
