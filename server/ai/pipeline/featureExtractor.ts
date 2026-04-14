/**
 * P2 统一特征管线 - 特征提取器
 * 从 GameState 抽取固定长度 FeatureVector
 */
import type { GameState, Player, Tile } from '../../types/game'
import type { FeatureVector, FeatureConfig } from './types'

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
  const shanten = calculateShanten(hand, player.hand.exposedMelds.length, wildChecker)
  const effectiveTiles = countEffectiveTiles(hand, player.hand.exposedMelds.length, wildChecker)

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

function calculateShanten(hand: Tile[], melds: number, wildChecker: (t: Tile) => boolean): number {
  // 简化版向听计算：14 - 3*meldCount - hand.length
  // 实际应以 tileAnaly.ts 的 calculateShanten 为准，此处为管线占位
  const expectedLen = 14 - 3 * melds
  const diff = hand.length - expectedLen
  // diff > 0 多牌, diff < 0 少牌, diff=0 正常
  // 向听数 = 差牌数
  return Math.abs(diff)
}

function countEffectiveTiles(hand: Tile[], melds: number, wildChecker: (t: Tile) => boolean): number {
  // 简化版：估算有效张
  // 实际应以 tileAnaly.ts 的 countEffectiveTiles 为准，此处为管线占位
  return Math.max(0, 14 - hand.length)
}

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

function assessDangerToOthers(hand: Tile[], discardPile: Tile[]): number {
  // 评估打出某张牌对其他家的危险度
  if (hand.length === 0) return 0
  // 简化：统计孤张/边张比例
  return 0.3 // 占位
}

function estimateOpponentTingCount(game: GameState, selfId: string): number {
  // 估算已听牌对手数（简化版）
  // 实际需要跟踪对手的手牌变化
  return 0 // 占位
}
