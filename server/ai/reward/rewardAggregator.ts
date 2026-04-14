/**
 * P2 奖励聚合器
 * 混合阶段奖励 + 最终奖励
 */
import type { RewardBreakdown } from './stageReward'
import { rewardToScalar } from './stageReward'

/** 奖励模式 */
export type RewardMode = 'final' | 'hybrid'

/** 聚合配置 */
export interface RewardConfig {
  alpha: number  // 阶段奖励权重（hybrid模式）
  beta: number   // 最终奖励权重（hybrid模式）
}

/** 默认配置：final-only（兼容现有训练） */
export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  alpha: 0,
  beta: 1,
}

/** Hybrid 配置（可调） */
export const HYBRID_REWARD_CONFIG: RewardConfig = {
  alpha: 0.3,  // 30% 阶段奖励
  beta: 0.7,   // 70% 最终奖励
}

/**
 * 聚合奖励
 * @param mode 奖励模式
 * @param stageRewards 阶段奖励列表（每个决策点）
 * @param finalReward 最终奖励（游戏结束）
 */
export function aggregateReward(
  mode: RewardMode,
  stageRewards: RewardBreakdown[],
  finalReward: number
): number {
  if (mode === 'final') {
    return finalReward
  }

  // Hybrid 模式
  const cfg = mode === 'hybrid' ? HYBRID_REWARD_CONFIG : DEFAULT_REWARD_CONFIG

  // 阶段奖励累计
  const totalStage = stageRewards.reduce((sum, r) => sum + rewardToScalar(r), 0)

  return cfg.alpha * totalStage + cfg.beta * finalReward
}

/**
 * 解析奖励模式（支持环境变量）
 */
export function parseRewardMode(): RewardMode {
  const mode = process.env.REWARD_MODE
  if (mode === 'hybrid') return 'hybrid'
  return 'final'
}
