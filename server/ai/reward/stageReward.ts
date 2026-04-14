/**
 * P2 阶段奖励模块
 * 训练过程中每个决策点的中间奖励
 */
import type { FeatureVector } from '../pipeline/types'

/** 阶段奖励结构 */
export interface RewardBreakdown {
  total: number
  deltaShanten: number       // 向听改善（负=差，正=好）
  deltaEffective: number    // 有效张变化
  defenseSuccess: number    // 高危巡安全通过
  riskControl: number      // 放铳风险控制
  baidaLockCompliance: number  // 百搭冷冻合规
  other: number            // 其他
}

/**
 * 计算两个特征快照之间的阶段奖励
 * @param prevFv 决策前特征
 * @param nextFv 决策后特征（摸牌后）
 * @param context 额外上下文（动作、结果等）
 */
export function computeStageReward(
  prevFv: FeatureVector,
  nextFv: FeatureVector,
  context: {
    action: string
    survived: boolean  // 本巡是否存活（未被胡）
  }
): RewardBreakdown {
  // 向听改善奖励
  const deltaShanten = prevFv.shanten - nextFv.shanten

  // 有效张变化
  const deltaEffective = nextFv.effectiveTiles - prevFv.effectiveTiles

  // 防守成功（本巡安全通过）
  const defenseSuccess = context.survived ? 0.1 : -0.2

  // 放铳风险控制（如果风险高但没放铳）
  let riskControl = 0
  if (prevFv.dealInRisk > 0.3 && context.survived) {
    riskControl = prevFv.dealInRisk * 0.2
  }

  // 百搭冷冻合规（冷冻期间没有违规动作）
  let baidaLockCompliance = 0
  if (prevFv.baidaLockTurns > 0 && context.action === 'PASS') {
    baidaLockCompliance = 0.05 * prevFv.baidaLockTurns
  }

  // 其他
  const other = 0

  const total = deltaShanten * 0.5 + deltaEffective * 0.3 + defenseSuccess + riskControl + baidaLockCompliance + other

  return {
    total,
    deltaShanten,
    deltaEffective,
    defenseSuccess,
    riskControl,
    baidaLockCompliance,
    other,
  }
}

/**
 * 汇总阶段奖励为标量
 */
export function rewardToScalar(rb: RewardBreakdown): number {
  return rb.total
}
