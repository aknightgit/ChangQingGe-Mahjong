/**
 * P2 统一特征管线 - 策略引擎
 * 入口：rankActions() 对所有合法动作评分并排序
 */
import type { ActionContext, ActionScore, ActionType, PolicyWeights } from './types'
import { scoreAction, DEFAULT_WEIGHTS } from './policyScorer'
import { extractFeatures } from './featureExtractor'

/**
 * 对所有合法动作评分并排序
 * @param ctx 动作上下文（包含已抽取的特征）
 * @param weights 策略权重（可选）
 * @returns 按分数降序排列的动作列表
 */
export function rankActions(
  ctx: ActionContext,
  weights: PolicyWeights = DEFAULT_WEIGHTS
): ActionScore[] {
  const scores: ActionScore[] = []

  for (const action of ctx.legalActions) {
    const scored = scoreAction(action, ctx, weights)
    scores.push(scored)
  }

  // 按 score 降序排列
  scores.sort((a, b) => b.score - a.score)

  return scores
}

/**
 * 创建 ActionContext 的便捷函数
 * @param game 游戏状态
 * @param playerId 玩家ID
 * @param legalActions 合法动作列表
 * @param turnIndex 当前轮次（用于巡目计算）
 */
export function buildActionContext(
  game: any,
  playerId: string,
  legalActions: ActionType[],
  turnIndex: number
): ActionContext {
  const fv = extractFeatures(game, playerId)
  return {
    playerId,
    game,
    legalActions,
    fv,
    turnIndex,
  }
}

/**
 * 获取推荐动作（最高分）
 */
export function getBestAction(
  ctx: ActionContext,
  weights: PolicyWeights = DEFAULT_WEIGHTS
): ActionType {
  const ranked = rankActions(ctx, weights)
  return ranked[0]?.action ?? 'PASS'
}

/**
 * 批量评估（用于 shadow 模式）
 * 返回所有动作的评分，不做贪心选择
 */
export function evaluateAllActions(
  ctx: ActionContext,
  weights: PolicyWeights = DEFAULT_WEIGHTS
): ActionScore[] {
  return rankActions(ctx, weights)
}
