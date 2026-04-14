/**
 * P2 统一特征管线 - 策略评分器
 * 基于特征向量 + 权重计算动作得分
 */
import type { FeatureVector, ActionContext, ActionScore, ActionType } from './types'

/** 策略权重（可配置） */
export interface PolicyWeights {
  // 基础权重
  shantenWeight: number
  effectiveWeight: number
  tuneWeight: number
  riskWeight: number

  // 番型权重
  menqingBonus: number       // 门清奖励
  baidaBonus: number        // 百搭存在奖励（手上）
  baidaLockPenalty: number  // 百搭冷冻惩罚

  // 风险权重
  dealInRiskPenalty: number  // 放铳风险惩罚
  dangerToOthersBonus: number // 对其他家危险奖励

  // 巡目权重
  earlyRoundBonus: number   // 早巡效率优先
  lateRoundBonus: number    // 晚巡和牌率优先

  // 特殊情况
  isFirstRoundBonus: number // 首轮探索奖励
  scoreGapBonus: number     // 落后时激进
}

/** 默认权重（从现有 botService.ts 参数反推） */
export const DEFAULT_WEIGHTS: PolicyWeights = {
  shantenWeight: 1.0,
  effectiveWeight: 0.35,
  tuneWeight: 0.55,
  riskWeight: 0.25,

  menqingBonus: 0.15,        // 对应门清×2 = +15%策略分
  baidaBonus: 0.1,           // 手牌百搭存在
  baidaLockPenalty: -0.5,    // 百搭冷冻期间大幅降低动作意愿

  dealInRiskPenalty: -0.3,   // 放铳风险惩罚
  dangerToOthersBonus: 0.15,  // 能胡别人时奖励

  earlyRoundBonus: 0.1,       // 早巡（<5）效率优先
  lateRoundBonus: 0.2,        // 晚巡（>=10）和牌率优先

  isFirstRoundBonus: 0.05,    // 首轮轻微探索
  scoreGapBonus: 0.05,         // 落后时更激进
}

/**
 * 对单个动作评分
 */
export function scoreAction(
  action: ActionType,
  ctx: ActionContext,
  weights: PolicyWeights = DEFAULT_WEIGHTS
): ActionScore {
  const fv = ctx.fv
  const isHu = action === 'HU'
  const isPass = action === 'PASS'

  if (isHu) {
    return {
      action,
      score: 9999, // 胡牌最高优先级
      breakdown: { shantenScore: 0, effectiveScore: 0, tuneScore: 9999, riskScore: 0, bonusScore: 0 },
    }
  }

  if (isPass) {
    return {
      action,
      score: 0,
      breakdown: { shantenScore: 0, effectiveScore: 0, tuneScore: 0, riskScore: 0, bonusScore: 0 },
    }
  }

  // === 向听分 ===
  const shantenScore = -fv.shanten * weights.shantenWeight * 10

  // === 有效张分 ===
  const effectiveScore = fv.effectiveTiles * weights.effectiveWeight

  // === 策略参数分（tune）===
  // 来自旧 evaluateChowValue/pengTune/kongTune 的逻辑
  let tuneScore = 0
  if (action === 'CHOW') {
    tuneScore = weights.tuneWeight * 0.3
    if (!fv.isMenqing) tuneScore -= 0.15 // 门清惩罚（原-15%）
  }
  if (action === 'PENG') {
    tuneScore = weights.tuneWeight * 0.6
    if (!fv.isMenqing) tuneScore -= 0.3  // 碰门清惩罚更大
  }
  if (action === 'KONG') {
    tuneScore = weights.tuneWeight * 0.7
  }

  // === 风险惩罚 ===
  let riskScore = 0
  if (fv.baidaLockTurns > 0 && action !== 'HU') {
    riskScore += weights.baidaLockPenalty * fv.baidaLockTurns
  }
  riskScore += fv.dealInRisk * weights.dealInRiskPenalty

  // === 规则奖励 ===
  let bonusScore = 0
  if (fv.isMenqing) bonusScore += weights.menqingBonus
  if (fv.hasBaida) bonusScore += weights.baidaBonus

  // 巡目调整
  if (fv.roundNumber < 5) {
    bonusScore += weights.earlyRoundBonus
  } else if (fv.roundNumber >= 10) {
    bonusScore += weights.lateRoundBonus
  }

  // 首轮探索
  if (fv.isFirstRound) bonusScore += weights.isFirstRoundBonus

  // 落后激进
  if (fv.scoreGap < -5000) bonusScore += weights.scoreGapBonus

  const totalScore = shantenScore + effectiveScore + tuneScore + riskScore + bonusScore

  return {
    action,
    score: totalScore,
    breakdown: {
      shantenScore,
      effectiveScore,
      tuneScore,
      riskScore,
      bonusScore,
    },
  }
}
