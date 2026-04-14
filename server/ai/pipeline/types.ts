/**
 * P2 统一特征管线 - 类型定义
 * GameState -> FeatureVector -> ActionScore
 */

import type { GameState, Player, Tile, TileSuit } from '../../types/game'

/** 特征向量：所有决策输入的固定长度向量 */
export interface FeatureVector {
  // === 基础牌力 ===
  shanten: number              // 向听数（越小越好）
  effectiveTiles: number       // 有效进张数
  handSize: number             // 手牌数（不含门口）

  // === 牌型状态 ===
  meldCount: number            // 副露数（吃/碰/杠次数）
  isMenqing: boolean           // 是否门清（无副露）
  hasBaida: boolean            // 手牌是否含百搭

  // === 百搭冷冻 ===
  baidaLockTurns: number      // 百搭打出后冷冻剩余圈数（0=已解冻）
  baidaDiscardTurnSeq: number | null  // 触发冷冻的回合seq（用于判断是否轮到己）

  // === 安全/风险 ===
  dealInRisk: number           // 0~1 放铳风险（基于弃牌区分析）
  dangerToOthers: number       // 0~1 对其他家危险度
  opponentTingCount: number     // 已听牌对手数（估算）

  // === 巡目/位置 ===
  roundNumber: number          // 当前巡目（从1开始）
  isDealer: boolean           // 是否庄家
  seatIndex: number            // 座位索引（0~3）

  // === 得分状态 ===
  scoreGap: number             // 与第一名分差（负数=落后）
  gameMultiplier: number       // 当前全局倍数

  // === 特殊状态 ===
  isFirstRound: boolean       // 是否首轮（造反窗口期）
  lastDiscard: Tile | null     // 上家打出的牌（吃牌决策时）
}

/** 动作上下文：单次决策的完整输入 */
export interface ActionContext {
  playerId: string
  game: GameState
  legalActions: ActionType[]
  fv: FeatureVector           // 已抽取的特征
  turnIndex: number           // 当前是第几轮（影响tempo权重）
}

/** 动作类型枚举 */
export type ActionType = 'PASS' | 'CHOW' | 'PENG' | 'KONG' | 'HU'

/** 单个动作评分结果 */
export interface ActionScore {
  action: ActionType
  score: number               // 综合评分
  breakdown: {
    shantenScore: number     // 向听贡献
    effectiveScore: number    // 有效张贡献
    tuneScore: number         // 策略参数贡献
    riskScore: number         // 风险惩罚
    bonusScore: number        // 规则奖励
  }
  // 用于 shadow 对比的详细日志
  debug?: Record<string, number>
}

/** 特征提取配置 */
export interface FeatureConfig {
  enableBaidaLock: boolean    // 百搭冷冻计算
  enableRiskAssessment: boolean // 放铳风险评估
  enableTempoTracking: boolean // 巡目追踪
  riskLookBack: number        // 风险分析回溯回合数
}
