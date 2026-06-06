/**
 * ai_v2/riskAssessor.ts — 风险感知系统
 *
 * 三大能力：
 * 1. 对手路线推断（风一色/碰碰胡/清一色等）
 * 2. bailout 风险评估（被包几口 + 下家手牌数）
 * 3. 自身牌力评估（强→压制保守，弱→求安全）
 *
 * 核心原则：不是"完全不打危险牌"，而是根据自身牌力动态平衡。
 */

import { TileSuit, MeldType, type Tile, type Player, type GameState, type Meld } from '../types/game'
import { isHonor, isWind, isDragon, groupTiles } from '../utils/tiles'
import { buildWildTileChecker } from '../utils/handValidator'

function isNumberTile(tile: Tile): boolean {
  return tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS
}

// ===== 对手路线推断 =====

export type OpponentRoute =
  | 'FENG_YI_SE'     // 风一色：全风+箭
  | 'FENG_PENG'      // 风碰：风一色+碰碰胡
  | 'QING_PENG'      // 清碰：清一色+碰碰胡
  | 'QING_YI_SE'     // 清一色：全同门
  | 'HUN_PENG'       // 混碰：混一色+碰碰胡
  | 'PENG_PENG_HU'   // 碰碰胡：全刻子
  | 'HALF_FLUSH'     // 混一色
  | 'UNKNOWN'        // 无法判断

export interface OpponentRiskProfile {
  playerId: string
  playerName: string
  route: OpponentRoute
  routeConfidence: number       // 0-1, 路线判断置信度
  meldCount: number             // 副露数
  handSize: number              // 暗牌数
  isTing: boolean               // 是否听牌
  threatLevel: number           // 0-1, 综合威胁度
  dangerousSuits: Set<string>   // 对该对手危险的门
  bailoutCount: number          // 被我包了几口
}

export interface RiskAssessment {
  opponents: OpponentRiskProfile[]
  maxThreat: number                   // 最高对手威胁度
  dangerousSuits: Map<string, number> // 各门综合危险度 (suit → 0-1)
  selfStrength: number                // 自身牌力 0-1
  shouldPlaySafe: boolean             // 是否应该保守
  riskTolerance: number               // 风险容忍度 0-1 (高=可以冒险)
  nextPlayerDanger: Map<string, number> // 下家各门危险度 (suit → 0-1，下家能吃)
  nextPlayerId: string | null         // 当前下家ID
}

/**
 * 推断对手路线
 */
function inferOpponentRoute(
  opponent: Player,
  game: GameState
): { route: OpponentRoute; confidence: number; dangerousSuits: Set<string> } {
  const melds = opponent.hand.exposedMelds || []
  const discards = opponent.hand.discardedTiles || []
  const dangerousSuits = new Set<string>()

  if (melds.length === 0) {
    // 无副露 → 无法判断路线
    return { route: 'UNKNOWN', confidence: 0, dangerousSuits }
  }

  // 统计副露中的牌
  let honorMeldCount = 0      // 风/箭刻/杠
  let windMeldCount = 0       // 风牌刻/杠
  let dragonMeldCount = 0     // 箭牌刻/杠
  let honorPairCount = 0      // 风/箭对子（从副露单张花牌不算）
  const suitMeldCounts: Record<string, number> = {} // 各门副露数
  const suitTileCounts: Record<string, number> = {} // 各门副露总牌数
  let totalMeldTiles = 0

  for (const meld of melds) {
    if (meld.type === MeldType.TRIPLET && meld.tiles.length === 1) continue // 花牌跳过
    const suit = meld.tiles[0]?.suit
    if (!suit) continue

    const isHonorMeld = suit === 'feng' || suit === 'jian'
    const isTripletOrKong = meld.type === MeldType.TRIPLET || meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG

    if (isHonorMeld && isTripletOrKong) {
      honorMeldCount++
      if (suit === 'feng') windMeldCount++
      if (suit === 'jian') dragonMeldCount++
    }

    if (isNumberTile({ suit } as any)) {
      suitMeldCounts[suit] = (suitMeldCounts[suit] || 0) + 1
      suitTileCounts[suit] = (suitTileCounts[suit] || 0) + meld.tiles.length
    }
    totalMeldTiles += meld.tiles.length
  }

  // 统计弃牌门分布
  const discardSuitCounts: Record<string, number> = {}
  for (const d of discards) {
    if (isNumberTile(d)) {
      discardSuitCounts[d.suit] = (discardSuitCounts[d.suit] || 0) + 1
    }
  }

  // 判断路线
  const numberSuitCount = Object.keys(suitMeldCounts).length
  const allMeldsAreHonor = honorMeldCount === melds.filter(m => m.tiles.length > 1).length
  const hasNumberMelds = numberSuitCount > 0

  // 风一色/风碰：全部副露都是风/箭刻
  if (allMeldsAreHonor && honorMeldCount >= 2) {
    dangerousSuits.add('feng')
    dangerousSuits.add('jian')
    // 所有数字门都危险（对手手里可能有数字对子等自摸）
    dangerousSuits.add(TileSuit.DOTS)
    dangerousSuits.add(TileSuit.CHARACTERS)
    dangerousSuits.add(TileSuit.BAMBOOS)
    // 风碰 = 风一色 + 碰碰胡特征（多刻子）
    if (honorMeldCount >= 3) {
      return { route: 'FENG_PENG', confidence: 0.85, dangerousSuits }
    }
    return { route: 'FENG_YI_SE', confidence: 0.75, dangerousSuits }
  }

  // 清一色/清碰：只有一门数字副露
  if (numberSuitCount === 1 && hasNumberMelds) {
    const theSuit = Object.keys(suitMeldCounts)[0]
    dangerousSuits.add(theSuit)
    // 其他门也可能有对子等待碰
    for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      if (s !== theSuit) dangerousSuits.add(s)
    }
    const suitMelds = suitMeldCounts[theSuit] || 0
    if (suitMelds >= 3) {
      // 清碰：清一色+碰碰胡
      return { route: 'QING_PENG', confidence: 0.8, dangerousSuits }
    }
    return { route: 'QING_YI_SE', confidence: 0.7, dangerousSuits }
  }

  // 混一色/混碰：一门数字 + 风箭
  if (numberSuitCount === 1 && honorMeldCount > 0) {
    const theSuit = Object.keys(suitMeldCounts)[0]
    dangerousSuits.add(theSuit)
    dangerousSuits.add('feng')
    dangerousSuits.add('jian')
    if (honorMeldCount >= 2 && suitMelds(theSuit) >= 2) {
      return { route: 'HUN_PENG', confidence: 0.7, dangerousSuits }
    }
    return { route: 'HALF_FLUSH', confidence: 0.65, dangerousSuits }
  }

  // 碰碰胡：多刻子/杠，无顺子
  const hasChow = melds.some(m => m.type === MeldType.SEQUENCE)
  if (!hasChow && melds.length >= 2) {
    // 所有门都可能危险
    for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      dangerousSuits.add(s)
    }
    return { route: 'PENG_PENG_HU', confidence: 0.5, dangerousSuits }
  }

  return { route: 'UNKNOWN', confidence: 0.2, dangerousSuits }
}

// 辅助：统计某门副露数
function suitMelds(suit: string): number {
  return 0 // placeholder, 实际在 inferOpponentRoute 内部已计算
}

/**
 * 评估自身牌力
 * 返回 0-1：0=烂牌（求安全），1=强牌（可以冒险）
 */
function assessSelfStrength(
  player: Player,
  game: GameState,
  shanten: number,
  effectiveTiles: number,
  routeState: any
): number {
  let strength = 0

  // 向听数：越小越强
  if (shanten <= 0) strength += 0.4        // 听牌
  else if (shanten <= 1) strength += 0.3
  else if (shanten <= 2) strength += 0.2
  else if (shanten <= 3) strength += 0.1

  // 有效张数
  if (effectiveTiles >= 8) strength += 0.2
  else if (effectiveTiles >= 5) strength += 0.15
  else if (effectiveTiles >= 3) strength += 0.1

  // 副露数（已开门 → 进攻姿态）
  const meldCount = player.hand.exposedMelds?.length || 0
  if (meldCount >= 3) strength += 0.15
  else if (meldCount >= 2) strength += 0.1
  else if (meldCount >= 1) strength += 0.05

  // 路线强度（routeState.lockLevel）
  if (routeState?.lockLevel >= 2) strength += 0.1

  return Math.min(1, strength)
}

/**
 * 评估 bailout 风险
 * 返回各门的额外危险度
 */
function assessBailoutRisk(
  player: Player,
  game: GameState
): Map<string, number> {
  const risk = new Map<string, number>()

  // 从 game 获取 bailout 关系
  const bailoutTracker = (game as any)._bailoutTracker
  if (!bailoutTracker) return risk

  const playerIndex = game.players.findIndex(p => p.id === player.id)
  if (playerIndex < 0) return risk

  // 检查每个对手的 bailout 关系
  for (let i = 0; i < game.players.length; i++) {
    if (i === playerIndex) continue
    const opponent = game.players[i]

    // 检查是否有互包关系
    const relations = bailoutTracker.getMutualBailoutRelations?.(game.gameId) || []
    for (const rel of relations) {
      const isInvolved = (rel.player1 === player.id && rel.player2 === opponent.id) ||
                         (rel.player2 === player.id && rel.player1 === opponent.id)
      if (!isInvolved) continue

      // 对手手牌越少，bailout风险越高
      const opponentHandSize = opponent.hand.concealedTiles?.length || 13
      const urgencyFactor = Math.max(0, 1 - opponentHandSize / 13) // 手牌越少越危险

      // 对手弃过的门 → 我再打这门风险更高
      for (const discard of (opponent.hand.discardedTiles || [])) {
        if (isNumberTile(discard)) {
          const current = risk.get(discard.suit) || 0
          risk.set(discard.suit, Math.max(current, urgencyFactor * 0.5))
        }
      }
    }
  }

  return risk
}

/**
 * 主入口：评估全局风险
 */
/**
 * 获取当前玩家的下家（动态：基于 currentPlayerIndex）
 * 下家 = 座位顺序中下一个 PLAYING 状态的玩家
 */
function getNextPlayer(player: Player, game: GameState): Player | null {
  const playerCount = game.players.length
  const playerIndex = game.players.findIndex(p => p.id === player.id)
  if (playerIndex < 0) return null

  // 从当前玩家的下一个位置开始，找第一个 PLAYING 状态的玩家
  for (let offset = 1; offset < playerCount; offset++) {
    const nextIndex = (playerIndex + offset) % playerCount
    const candidate = game.players[nextIndex]
    if (candidate.status === 'PLAYING') {
      return candidate
    }
  }
  return null
}

export function assessRisk(
  player: Player,
  game: GameState,
  shanten: number,
  effectiveTiles: number,
  routeState: any,
  bailoutTracker?: any
): RiskAssessment {
  const opponents: OpponentRiskProfile[] = []
  const suitDanger: Map<string, number> = new Map()
  let maxThreat = 0

  // 设置 bailout tracker 到 game 对象（供内部使用）
  if (bailoutTracker) {
    (game as any)._bailoutTracker = bailoutTracker
  }

  // ★ 动态识别下家
  const nextPlayer = getNextPlayer(player, game)
  const nextPlayerDanger: Map<string, number> = new Map()

  for (const opponent of game.players) {
    if (opponent.id === player.id) continue
    if (opponent.status !== 'PLAYING') continue

    // 路线推断
    const { route, confidence, dangerousSuits } = inferOpponentRoute(opponent, game)

    // 威胁度计算
    const meldCount = opponent.hand.exposedMelds?.length || 0
    const handSize = opponent.hand.concealedTiles?.length || 13
    const isTing = (opponent as any).isTing || false

    let threatLevel = 0
    if (isTing) threatLevel += 0.5
    threatLevel += Math.min(0.3, meldCount * 0.08)
    threatLevel += Math.max(0, (13 - handSize) * 0.02) // 手牌少=威胁高
    threatLevel *= (0.5 + confidence * 0.5) // 路线置信度加权
    threatLevel = Math.min(1, threatLevel)

    // bailout 计数
    let bailoutCount = 0
    if (bailoutTracker) {
      const relations = bailoutTracker.getMutualBailoutRelations?.(game.gameId) || []
      for (const rel of relations) {
        if ((rel.player1 === player.id && rel.player2 === opponent.id) ||
            (rel.player2 === player.id && rel.player1 === opponent.id)) {
          bailoutCount++
        }
      }
    }

    // 累加各门危险度
    for (const suit of dangerousSuits) {
      const current = suitDanger.get(suit) || 0
      suitDanger.set(suit, Math.max(current, threatLevel * confidence))
    }

    // ★ 下家特殊追踪：下家能吃牌，危险度单独记录（权重更高）
    if (nextPlayer && opponent.id === nextPlayer.id) {
      for (const suit of dangerousSuits) {
        const current = nextPlayerDanger.get(suit) || 0
        // 下家危险度 = 威胁度 × 置信度 × 1.5（比其他对手权重更高）
        nextPlayerDanger.set(suit, Math.max(current, threatLevel * confidence * 1.5))
      }
    }

    maxThreat = Math.max(maxThreat, threatLevel)

    opponents.push({
      playerId: opponent.id,
      playerName: opponent.name,
      route,
      routeConfidence: confidence,
      meldCount,
      handSize,
      isTing,
      threatLevel,
      dangerousSuits,
      bailoutCount,
    })
  }

  // 自身牌力
  const selfStrength = assessSelfStrength(player, game, shanten, effectiveTiles, routeState)

  // bailout 额外风险
  const bailoutRisk = assessBailoutRisk(player, game)
  for (const [suit, risk] of bailoutRisk) {
    const current = suitDanger.get(suit) || 0
    suitDanger.set(suit, Math.max(current, risk))
  }

  // 风险容忍度：自身牌力越强，容忍度越高
  // 烂牌(strength=0) → tolerance=0.2 (极度保守)
  // 强牌(strength=1) → tolerance=0.9 (可以冒险)
  const riskTolerance = 0.2 + selfStrength * 0.7

  // 是否保守：威胁度 > 容忍度 且 自身牌力不够强
  const shouldPlaySafe = maxThreat > riskTolerance && selfStrength < 0.5

  return {
    opponents,
    maxThreat,
    dangerousSuits: suitDanger,
    selfStrength,
    shouldPlaySafe,
    riskTolerance,
    nextPlayerDanger,
    nextPlayerId: nextPlayer?.id || null,
  }
}
