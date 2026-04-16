/**
 * BotService — AI Bot that plays for computer players
 * Uses training/best-policy.json heuristic scoring to decide which tile to discard.
 */
import { GameState, Player, Tile, TileSuit, MeldType, PlayerStatus, ActionType } from '../types/game'
import { groupTiles, tilesEqual, isFlower, isHonor, isWind, isDragon } from '../utils/tiles'
import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, ChowPongExclusionState } from '../utils/handValidator'
import { USE_PIPELINE_SCORER, PIPELINE_SHADOW_MODE } from '../ai/config/policyFlags'
import fs from 'fs'
import path from 'path'

// ===== P2: Pipeline Shadow Bridge =====
// 导入新管线（条件导入，避免破坏现有逻辑）
let _pipelineEngine: typeof import('../ai/pipeline/policyEngine') | null = null
// 动态 ESM import（替代 require，实现 CJS/ESM 统一）
async function getPipelineEngine() {
  if (_pipelineEngine !== undefined) return _pipelineEngine
  try {
    _pipelineEngine = await import('../ai/pipeline/policyEngine')
  } catch {
    _pipelineEngine = null
  }
  return _pipelineEngine
}

/**
 * P2 Shadow 评估（新管线 vs legacy 对比日志）
 * 条件：PIPELINE_SHADOW_MODE=true 时启用
 */
async function shadowEvaluate(
  player: Player,
  availableActions: ActionType[],
  game: GameState
): Promise<void> {
  const engine = await getPipelineEngine()
  if (!engine) return
  if (!PIPELINE_SHADOW_MODE) return

  const PIPELINE_LOG_BREAKDOWN = process.env.PIPELINE_LOG_BREAKDOWN === 'true'

  try {
    const ctx = engine.buildActionContext(game, player.id, availableActions, game.turnIndex)
    const ranked = engine.evaluateAllActions(ctx)

    const bestAction = ranked[0]?.action ?? 'PASS'
    const bestScore = ranked[0]?.score ?? 0

    if (PIPELINE_LOG_BREAKDOWN) {
      console.log(
        `[PIPELINE_SHADOW] ${player.name} actions=`,
        ranked.map(r => `${r.action}:${r.score.toFixed(2)}`).join(' | '),
        ` | best=${bestAction}(${bestScore.toFixed(2)})`,
        ` | fv=shanten=${ctx.fv.shanten} eff=${ctx.fv.effectiveTiles} menqing=${ctx.fv.isMenqing} baidaLock=${ctx.fv.baidaLockTurns}`
      )
    } else {
      console.log(`[PIPELINE_SHADOW] ${player.name} best=${bestAction}(${bestScore.toFixed(2)})`)
    }
  } catch (e) {
    // 新管线出错不影响主流程
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PIPELINE_SHADOW] failed:', (e as Error).message)
    }
  }
}

// ===== Soft scoring helpers (P1: sigmoid-based probabilistic decision) =====

/**
 * Sigmoid function: maps raw score to probability [0, 1]
 * temperature < 1: more deterministic; temperature > 1: more random
 */
function sigmoid(x: number, temperature = 1): number {
  return 1 / (1 + Math.exp(-x / temperature))
}

/**
 * Convert baseChance (prior probability) to logit space for sigmoid combination
 * logit = log(p / (1-p)) — higher p means higher prior bias toward this action
 */
function chanceToLogit(chance: number): number {
  const c = Math.min(0.95, Math.max(0.05, chance))
  return Math.log(c / (1 - c))
}

/**
 * P1 软评分决策：比较两个候选，分数差 + 先验概率 → sigmoid 概率采样
 *
 * 公式：P(action > best) = sigmoid( (score_diff + prior_diff) / temperature )
 * - score_diff = s.score - best.score（shanten/effective/tune 的综合分差）
 * - prior_diff  = logit(baseChance) - 0（PASS 的 baseChance 隐式为 0.5，即 logit=0）
 *
 * 当 score_diff=0 时：
 *   - baseChance=0.5 → logit=0 → P=0.5（随机）
 *   - baseChance=0.8 → logit=1.39 → P=sigmoid(1.39)≈0.80（高概率选此动作）
 *   - baseChance=0.2 → logit=-1.39 → P=sigmoid(-1.39)≈0.20（低概率选此动作）
 *
 * 当 baseChance=0.5 时：
 *   - score_diff=0 → P=0.5（随机）
 *   - score_diff>0 → P>0.5（倾向选）
 *   - score_diff<0 → P<0.5（倾向不选）
 */
function softScoreWins(
  s: { shanten: number; effective: number; tune: number },
  best: { shanten: number; effective: number; tune: number },
  baseChance: number,
  temperature = 1
): boolean {
  const currentShanten = 0 // PASS基准线
  const currentEffective = 0 // PASS没有进张增益

  // 分数差（对所有候选统一标准化）
  // 重要：shanten通常吃碰前后相同（都是0），tune是实际区分因素
  // tune权重从0.1提升到1.0，让evaluateChowValue的策略评估真正生效
  const scoreDiff =
    (-s.shanten - 0) * 1 +           // shanten越低越好
    (s.effective - best.effective) * 1 + // effective进张（与tune同等权重）
    (s.tune - best.tune) * 1         // tune策略分（提升权重，真正影响决策）

  // 先验差（PASS的logit=0）
  const priorDiff = chanceToLogit(baseChance)

  // sigmoid概率
  const p = sigmoid(scoreDiff + priorDiff, temperature)
  return Math.random() < p
}

// ===== Policy loading (per-character) =====
let _policies: Record<string, any> = {}

function loadCharacterPolicy(botName: string): any {
  if (_policies[botName]) return _policies[botName]
  
  // Try loading character-specific policy first
  const characterPaths = [
    path.resolve(process.cwd(), `AI_policies/characters/${botName}.json`),
    path.resolve(process.cwd(), `training-output/policies/characters/${botName}.json`),
    path.resolve(process.cwd(), `../../AI_policies/characters/${botName}.json`),
  ]
  
  for (const p of characterPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8')
        const data = JSON.parse(raw)
        _policies[botName] = data.policy || data
        console.log(`[BotService] ✅ Loaded policy for ${botName}:`, _policies[botName].id || 'character')
        return _policies[botName]
      } catch (err: any) {
        console.warn(`[BotService] ⚠️ Failed to parse ${p}:`, err.message)
      }
    }
  }
  
  // Fall back to default/best policy
  if (!_policies['default']) {
    const defaultPaths = [
      path.resolve(process.cwd(), 'AI_policies/best-policy.json'),
      path.resolve(process.cwd(), 'training-output/best-policy.json'),
      path.resolve(process.cwd(), 'training/best-policy.json'),
      path.resolve(process.cwd(), '../../AI_policies/best-policy.json'),
      path.resolve(process.cwd(), '../../training-output/best-policy.json'),
    ]
    
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8')
          const data = JSON.parse(raw)
          _policies['default'] = data.policy || data
          console.log(`[BotService] ✅ Loaded default policy:`, _policies['default'].id || 'best')
          break
        } catch (err: any) {
          console.warn(`[BotService] ⚠️ Failed to parse ${p}:`, err.message)
        }
      }
    }
    
    if (!_policies['default']) {
      // Hardcoded fallback
      _policies['default'] = {
        id: 'fallback',
        selfWinChance: 0.95,
        discardHuChance: 0.7,
        discardHuWildPenalty: 0.3,
        discardHuMenQingPenalty: 0.1,
        pengChance: 0.6,
        kongChance: 0.5,
        chowChance: 0.65,
        chowWildPenalty: 0.05,
        menqingKeepBonus: 0.3,  // 门清执念：降低意愿，AI更愿意吃牌做牌
        allPungsPursuit: 0,     // 碰碰胡追求：越高越不愿吃顺
        pureFlushPursuit: 0,
        halfFlushWeight: 0,
        wildKeepPenalty: 10,
        dominantSuitBonus: 3.0,
        tripletKeepBonus: 1.0,
        pairWeight: 8.0,
        nearWeight: 0.8,
        honorPairBonus: 0,
        honorRushThreshold: 8,
        honorRushBoost: 0.2,
        bailoutHuPenaltyPerMeld: 0.01,
      }
      console.log('[BotService] ⚠️ Using hardcoded fallback policy')
    }
  }
  
  // Use default for this character
  _policies[botName] = _policies['default']
  console.log(`[BotService] policy id for ${botName}: ${_policies[botName]?.id || 'unknown'}`)
  return _policies[botName]
}

function getPolicy(): any {
  // Default policy (backward compatible)
  return loadCharacterPolicy('default')
}

function getPolicyForPlayer(player: Player): any {
  return loadCharacterPolicy(player.name)
}

// Clear policy cache (for testing)
function resetPolicyCache(): void {
  _policies = {}
}

/**
 * Is this player a bot (computer)?
 */
// AI Bot 统一用 AI- 前缀标识
export function isBotPlayer(player: Player): boolean {
  return player.name.startsWith('AI-') || player.name.startsWith('电脑')
}

/**
 * Get the wild tile type from game state
 */
function getWildTileType(game: GameState): { suit: TileSuit; value: number } | null {
  if (!game.customScoringMode) return null
  const parts = game.customScoringMode.split('-')
  if (parts.length < 2) return null
  return { suit: parts[0] as TileSuit, value: parseInt(parts[1]) }
}

/**
 * Check if a tile is a wild tile (百搭)
 */
function isWildTile(tile: Tile, game: GameState): boolean {
  const wildType = getWildTileType(game)
  if (!wildType) return false
  if (tile.suit === wildType.suit && tile.value === wildType.value) return true
  // Flower wild group
  if (tile.suit === TileSuit.FLOWER && wildType.suit === TileSuit.FLOWER && game.wildTileGroup) {
    return game.wildTileGroup.includes(String(tile.value))
  }
  return false
}

/**
 * Score each tile in hand for discard priority.
 * Higher score = MORE likely to discard (worse tile).
 * We want to discard the tile with the HIGHEST score.
 */
function scoreTileForDiscard(tile: Tile, hand: Tile[], game: GameState, player: Player): number {
  const policy = getPolicyForPlayer(player)
  let score = 0

  const phaseTileCount = hand.length
  const isEarlyPhase = phaseTileCount >= 11
  const isMidPhase = phaseTileCount >= 5 && phaseTileCount <= 10
  const isLatePhase = phaseTileCount <= 4

  const nearWeightFactor = isEarlyPhase ? 1.25 : (isMidPhase ? 0.9 : 0.75)
  const pairWeightFactor = isEarlyPhase ? 0.9 : (isMidPhase ? 1.25 : 1.1)
  const tripletWeightFactor = isEarlyPhase ? 0.85 : (isMidPhase ? 1.2 : 1.25)
  // 目标牌型导向：清一色/混一色/风一色 + 碰碰胡路线
  const suitCounts: Record<string, number> = {}
  let honorCount = 0
  for (const t of hand) {
    if (t.suit === TileSuit.FLOWER) continue
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1
    if (isWind(t) || isDragon(t)) honorCount++
  }
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const dominantNumberSuit = numberSuits
    .filter(s => (suitCounts[s] || 0) > 0)
    .sort((a, b) => (suitCounts[b] || 0) - (suitCounts[a] || 0))[0] || null
  const dominantNumberSuitCount = dominantNumberSuit ? (suitCounts[dominantNumberSuit] || 0) : 0
  const honorFocus = honorCount >= 6
  // hand route bias: prefer specific routes when dominant suit count is high
  // hand5~7RouteBias params trained but unused in game server (P0 dead-code fix)
  const handQuality = dominantNumberSuitCount >= 7 ? 7
    : dominantNumberSuitCount >= 6 ? 6
    : dominantNumberSuitCount >= 5 ? 5 : 0
  const handRouteBias = handQuality >= 7 ? (policy.hand7RouteBias || 0.9)
    : handQuality >= 6 ? (policy.hand6RouteBias || 0.6)
    : handQuality >= 5 ? (policy.hand5RouteBias || 0.3)
    : 0
  // Blend phase-based factor with hand-size-based route bias
  const phaseFactor = isEarlyPhase ? 0.35 : (isMidPhase ? 0.75 : 1.0)
  const routeBiasFactor = Math.max(phaseFactor, handRouteBias)

  const groups = groupTiles(hand)
  const tileKey = `${tile.suit}-${tile.value}`
  const sameTypeCount = groups.get(tileKey)?.length || 0

  // === 1. Wild tile: penalize discarding, scaled by wild count (wild0~3Aggression) ===
  if (isWildTile(tile, game)) {
    // Count remaining wilds after discarding this tile
    let remainingWilds = 0
    for (const t of hand) { if (t !== tile && isWildTile(t, game)) remainingWilds++ }
    // remainingWilds: 0=手里无百搭了, 1=剩1张, 2=剩2张, 3+=剩3+张
    // wild0Aggression=0.3 → 手牌已无百搭，拆此百搭几乎无损 → penalty×0.3
    // wild3PlusAggression=0.9 → 手牌多百搭仍拆 → penalty几乎全量
    const wildAggression = remainingWilds === 0 ? (policy.wild0Aggression || 0.3)
      : remainingWilds === 1 ? (policy.wild1Aggression || 0.5)
      : remainingWilds === 2 ? (policy.wild2Aggression || 0.7)
      : (policy.wild3PlusAggression || 0.9)
    // aggress=0.3 → penalty×0.3（无百搭时几乎不心疼）；aggress=0.9 → penalty×1.0（多百搭时全量惩罚）
    const penalty = policy.wildKeepPenalty * (1.3 - wildAggression * 0.5)
    score -= penalty
    return score
  }

  // === 2. Honor tiles (winds/dragons): keep pairs, discard singles ===
  // 使用参数：windEastKeep / windSouthKeep / windWestKeep / windNorthKeep / windGeneralKeep
  //           dragonRedKeep / dragonGreenKeep / dragonWhiteKeep / dragonGeneralKeep
  //           windDragonPairKeepBonus / honorTripletKeepBonus / honorPairBonus / allHonorsPungsPursuit
  if (isHonor(tile)) {
    if (sameTypeCount >= 2) {
      // Honor pair: keep (low score)
      let pairBase = policy.pairWeight * pairWeightFactor * policy.honorPairBonus
      if (isWind(tile)) {
        if (tile.value === 1) pairBase *= (policy.windEastKeep || 1.0)
        else if (tile.value === 2) pairBase *= (policy.windSouthKeep || 1.0)
        else if (tile.value === 3) pairBase *= (policy.windWestKeep || 1.0)
        else if (tile.value === 4) pairBase *= (policy.windNorthKeep || 1.0)
        pairBase *= (policy.windGeneralKeep || 1.0)
        // 风对子额外奖励
        pairBase += (policy.windDragonPairKeepBonus || 0)
      }
      if (isDragon(tile)) {
        if (tile.value === 1) pairBase *= (policy.dragonRedKeep || 1.0)
        else if (tile.value === 2) pairBase *= (policy.dragonGreenKeep || 1.0)
        else if (tile.value === 3) pairBase *= (policy.dragonWhiteKeep || 1.0)
        pairBase *= (policy.dragonGeneralKeep || 1.0)
      }
      // 刻子额外奖励（honorTripletKeepBonus）
      if (sameTypeCount >= 3) {
        pairBase += (policy.honorTripletKeepBonus || 0)
      }
      score -= pairBase
    } else {
      // Single honor: high to discard (good candidate to throw away)
      score += 5
      // allHonorsPungsPursuit：风一色/碰碰胡路线时，单张风箭也要保留
      if (honorFocus && (policy.allHonorsPungsPursuit || 0) > 0) {
        score -= (policy.allHonorsPungsPursuit || 0) * 2.0
      }
    }
    return score
  }

  // === 3. Number tiles: check for pairs, triplets, sequences ===

  // Pair or triplet: keep (low score)
  if (sameTypeCount >= 3) {
    score -= policy.tripletKeepBonus * tripletWeightFactor * 3 // triplet: very valuable, hard to discard
  } else if (sameTypeCount >= 2) {
    score -= policy.pairWeight * pairWeightFactor // pair: keep
  }

  // Near sequence (前后两张): keep for sequence building
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    const value = tile.value
    const suit = tile.suit

    // Check if there are adjacent tiles
    for (const v of [value - 1, value - 2, value + 1, value + 2]) {
      if (v >= 1 && v <= 9) {
        const key = `${suit}-${v}`
        if (groups.has(key)) {
          score -= policy.nearWeight * nearWeightFactor
        }
      }
    }
  }

  // === 4. Dominant suit bonus: keep tiles of the dominant suit ===
  const maxSuitCount = Object.values(suitCounts).length > 0 ? Math.max(...Object.values(suitCounts)) : 0
  const dominantSuit = Object.keys(suitCounts).find(s => suitCounts[s] === maxSuitCount)
  if (dominantSuit && maxSuitCount >= policy.honorRushThreshold) {
    if (tile.suit !== dominantSuit && tile.suit !== TileSuit.FLOWER) {
      // Not in dominant suit: good to discard (boost score)
      score += policy.dominantSuitBonus * routeBiasFactor
    }
  }

  // === 4.1 清一色/混一色导向：某门数牌>=6，优先保留该门 ===
  if (dominantNumberSuit && dominantNumberSuitCount >= 6) {
    if (tile.suit === dominantNumberSuit) score -= 2.0 * routeBiasFactor
    else if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) score += 2.0 * routeBiasFactor
  }

  // === 4.2 风一色导向：风箭多时，保留风箭 ===
  if (honorFocus) {
    if (isWind(tile) || isDragon(tile)) score -= 2.0 * routeBiasFactor
    else if (tile.suit !== TileSuit.FLOWER) score += 2.0 * routeBiasFactor
  }

  // === 4.3 碰碰胡导向：保留对子/刻子，弱化顺子价值 ===
  if (sameTypeCount >= 2) score -= 1.0 * routeBiasFactor
  if (!isHonor(tile) && sameTypeCount < 2) {
    score += 0.6 * routeBiasFactor
  }

  // Late game tie-break: bias toward ready hand speed and safer discards.
  if (isLatePhase) {
    const dangerPenalty = isHonor(tile) ? 0.15 : 0.45
    score += dangerPenalty
  }

  // === 5. Edge tiles (1, 9): penalise with terminalPenalty ===
  // 使用参数：terminalPenalty
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    if (tile.value === 1 || tile.value === 9) {
      score += (policy.terminalPenalty || 0.638)
    }
  }

  // === 6. Phase-based strategy: early/mid/late ===
  // 使用参数：wallEarlySpeedPush / wallMidBalance / wallLateDefense / safeTilePriority / defenseRiskAversion
  if (isEarlyPhase) {
    score += (policy.wallEarlySpeedPush || 0) * 0.5
  }
  if (isMidPhase) {
    score += (policy.wallMidBalance || 0) * 0.5
  }
  if (isLatePhase) {
    // 安全牌优先 + 防守风险厌恶 + 后期防守
    score += (policy.safeTilePriority || 0) * 0.5
    score += (policy.defenseRiskAversion || 0) * 0.3
    score += (policy.wallLateDefense || 0) * 0.4
  }

  // === 7. Score-based strategic modifiers ===
  // 使用参数：scoreBehindRiskBoost / scoreLeadDefenseBoost
  const playerScore = player.score ?? 0
  const dealerScore = (game as any).dealerScore ?? playerScore
  const scoreDiff = playerScore - dealerScore
  if (scoreDiff < -1000 && (policy.scoreBehindRiskBoost ?? 0) > 0) {
    const riskFactor = Math.min(1.0, Math.abs(scoreDiff) / 5000)
    // scoreBehindRiskBoost > 1 时越落后越激进
    score += ((policy.scoreBehindRiskBoost ?? 1.0) - 1.0) * riskFactor * 1.5
  }
  if (scoreDiff > 1000 && (policy.scoreLeadDefenseBoost ?? 0) > 0) {
    const leadFactor = Math.min(1.0, scoreDiff / 5000)
    score += ((policy.scoreLeadDefenseBoost ?? 1.0) - 1.0) * leadFactor * 0.5
  }

  // === 8. Wild defense keep ===
  // 使用参数：wildDefenseKeep
  if (isWildTile(tile, game) && (policy.wildDefenseKeep || 0) > 0) {
    // 防守阶段额外保留百搭
    score -= (policy.wildDefenseKeep || 0) * 0.5
  }

  // === 9. Discard observation: flush/sequence pursuit boost ===
  // 使用参数：discardObsFlushBoost / discardObsWeight
  if ((game as any).discardPile && (policy.discardObsFlushBoost || 0) > 0) {
    const discardPile = (game as any).discardPile as Tile[]
    const discardCounts: Record<string, number> = {}
    for (const d of discardPile) {
      if (d.suit !== TileSuit.FLOWER && d.suit !== TileSuit.WIND && d.suit !== TileSuit.DRAGON) {
        discardCounts[d.suit] = (discardCounts[d.suit] || 0) + 1
      }
    }
    const dominantDiscardSuit = Object.entries(discardCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const dominantDiscardCount = dominantDiscardSuit ? (discardCounts[dominantDiscardSuit] || 0) : 0
    if (dominantDiscardCount >= 5 && dominantDiscardSuit && tile.suit === dominantDiscardSuit) {
      // 弃牌池显示某门大量出现 → 保留该门（清一色路线）
      score -= (policy.discardObsFlushBoost || 0) * (policy.discardObsWeight || 0) * routeBiasFactor
    }
  }

  // === 10. Speed vs Value balance (P1: was dead code, now active) ===
  // speedVsValueBalance > 0.5 = AI prefers speed over hand quality
  // 激进时：孤立张加分（更愿意打），好搭子少扣分（保留）
  if ((policy.speedVsValueBalance ?? 0.5) > 0.5) {
    const speedFactor = (policy.speedVsValueBalance - 0.5) * 2
    const sameSuitTiles = hand.filter(t =>
      t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    )
    const neighbors = sameSuitTiles.filter(t => Math.abs(t.value - tile.value) <= 2)
    if (neighbors.length === 0) score += speedFactor * 3
    else if (neighbors.length >= 2) score += speedFactor * 1
  }

  // === 11. High/Low multiplier speed bias (P1: multHighSpeedBias / multLowSpeedBias were dead code) ===
  // 高倍数场（4+对子）：AI更追求速度，减少做大牌的时间浪费
  // 低倍数场：可以有更多余裕做大牌
  const roundMult = (game as any).roundMultiplier ?? 1
  const inheritMult = (game as any).inheritedGlobalMultiplier ?? 1
  const globalMult = Math.max(roundMult, inheritMult)
  const multHighSpeedBias = policy.multHighSpeedBias ?? 0
  const multLowSpeedBias = policy.multLowSpeedBias ?? 0
  if (globalMult >= 4 && multHighSpeedBias !== 0) {
    // 高倍数：激进加速
    // 孤立张更愿意打（速度优先）
    const sameSuitTiles2 = hand.filter(t =>
      t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    )
    const neighbors2 = sameSuitTiles2.filter(t => Math.abs(t.value - tile.value) <= 2)
    if (neighbors2.length === 0) score += multHighSpeedBias * 2
    else if (neighbors2.length >= 2) score += multHighSpeedBias * 0.5
  } else if (globalMult < 4 && multLowSpeedBias !== 0) {
    // 低倍数：允许一定做大牌的空间，但 speedBias 仍然起作用
    const sameSuitTiles3 = hand.filter(t =>
      t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    )
    const neighbors3 = sameSuitTiles3.filter(t => Math.abs(t.value - tile.value) <= 2)
    if (neighbors3.length === 0) score += multLowSpeedBias * 1
  }

  return score
}

/**
 * 计算向听数（0=听牌，1=一向听，2=二向听...）
 */
// Shanten memoization cache (cleared per discard decision)
let _shantenCache = new Map<string, number>();

function tileKey(tiles: Tile[], exposedCount: number): string {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const k = `${t.suit}-${t.value}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const parts = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`);
  return `${parts.join(',')};e${exposedCount}`;
}

/**
 * 轻量 shanten 估算：基于搭子/对子计数，不调 canWin
 * 用于模拟器快速决策，精度够用
 */
// 对外暴露的计算向听数（供 pipeline/featureExtractor 调用）
export function computeShanten(
  tiles: Tile[],
  exposedCount: number,
  isWildTileChecker: (tile: Tile) => boolean
): number {
  const key = tileKey(tiles, exposedCount);
  if (_shantenCache.has(key)) return _shantenCache.get(key)!;

  const groups = new Map<string, number>();
  let wildCount = 0;
  for (const t of tiles) {
    if (isWildTileChecker(t)) { wildCount++; continue; }
    const k = `${t.suit}-${t.value}`;
    groups.set(k, (groups.get(k) || 0) + 1);
  }

  let pairs = 0, triplets = 0, sequences = 0, isolated = 0;
  const counted = new Set<string>();

  // 先找刻子
  for (const [k, c] of groups) {
    if (c >= 3) { triplets++; counted.add(k); }
  }
  // 再找顺子
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numSuits) {
    for (let v = 1; v <= 7; v++) {
      const k1 = `${suit}-${v}`, k2 = `${suit}-${v + 1}`, k3 = `${suit}-${v + 2}`;
      if (!counted.has(k1) && !counted.has(k2) && !counted.has(k3)) {
        if ((groups.get(k1) || 0) > 0 && (groups.get(k2) || 0) > 0 && (groups.get(k3) || 0) > 0) {
          sequences++;
          counted.add(k1); counted.add(k2); counted.add(k3);
        }
      }
    }
  }
  // 再找对子
  for (const [k, c] of groups) {
    if (!counted.has(k) && c >= 2) { pairs++; counted.add(k); }
  }
  // 孤张
  for (const [k, c] of groups) {
    if (!counted.has(k)) isolated++;
  }

  const melds = triplets + sequences;
  // shanten ≈ 8 - 2*melds - max(0, pairs-1) + isolated_penalty
  let shanten = 8 - 2 * melds - Math.max(0, pairs - 1);
  shanten = Math.max(0, Math.min(8, shanten));

  _shantenCache.set(key, shanten);
  return shanten;
}

// 内部别名，保持 botService.ts 内部调用兼容（必须在 computeShanten 定义之后）
const calculateShanten = computeShanten

/**
 * 计算有效进张数：加入一张后能使向听数下降的牌总剩余张数
 */
export function countEffectiveTiles(
  tiles: Tile[],
  exposedCount: number,
  isWildTileChecker: (tile: Tile) => boolean
): number {
  const currentShanten = calculateShanten(tiles, exposedCount, isWildTileChecker)

  const candidates: Array<{ suit: TileSuit; value: number }> = []
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) {
      candidates.push({ suit, value: v })
    }
  }
  for (let v = 1; v <= 4; v++) candidates.push({ suit: TileSuit.WIND, value: v })
  for (let v = 1; v <= 3; v++) candidates.push({ suit: TileSuit.DRAGON, value: v })

  let total = 0
  for (const c of candidates) {
    const testTile: Tile = { suit: c.suit, value: c.value, id: `eff-${c.suit}-${c.value}` }
    const nextShanten = calculateShanten([...tiles, testTile], exposedCount, isWildTileChecker)
    if (nextShanten < currentShanten) {
      const inHand = tiles.filter(t => t.suit === c.suit && t.value === c.value).length
      total += Math.max(0, 4 - inHand)
    }
  }

  return total
}

/**
 * Select the best tile to discard from the player's hand.
 * Returns the tile ID.
 */
export function selectDiscardTile(player: Player, game: GameState): string {
  // Clear shanten cache per decision
  _shantenCache = new Map<string, number>();
  
  const hand = player.hand.concealedTiles
  if (hand.length === 0) return ''

  const wildChecker = (t: Tile) => isWildTile(t, game)
  const exposedCount = player.hand.exposedMelds.length

  let bestTile = hand[0]
  let bestShanten = Infinity
  let bestEffective = -1
  let bestScore = -Infinity

  for (let i = 0; i < hand.length; i++) {
    const tile = hand[i]
    const remaining = hand.filter((_, idx) => idx !== i)

    const shanten = calculateShanten(remaining, exposedCount, wildChecker)
    const effective = countEffectiveTiles(remaining, exposedCount, wildChecker)
    const score = scoreTileForDiscard(tile, hand, game, player)

    if (
      shanten < bestShanten ||
      (shanten === bestShanten && effective > bestEffective) ||
      (shanten === bestShanten && effective === bestEffective && score > bestScore)
    ) {
      bestShanten = shanten
      bestEffective = effective
      bestScore = score
      bestTile = tile
    }
  }

  return bestTile.id
}

/**
 * Count how many tiles from the remaining wall would complete the hand (听牌总张数).
 * Tests each tile type (4 suits × 9 values + honors) against the player's concealed tiles.
 */
function countWinningTiles(player: Player, game: GameState): number {
  const hand = player.hand.concealedTiles
  const exposed = player.hand.exposedMelds
  if (hand.length === 0) return 0

  const wildChecker = (t: Tile) => isWildTile(t, game)
  let count = 0

  // Test all 34 standard tile types (万/条/筒 1-9 × 3 + 风 4 + 箭 3)
  const suits: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) {
      const testTile: Tile = { suit, value: v, id: `test-${suit}-${v}` }
      const testHand = [...hand, testTile]
      const result = canWin(testHand, exposed.length, wildChecker)
      if (result.canWin) {
        // Estimate remaining count (4 minus what's in hand/visible)
        const inHand = hand.filter(t => t.suit === suit && t.value === v).length
        count += Math.max(0, 4 - inHand)
      }
    }
  }
  // Wind tiles (东南西北)
  for (const w of ['east', 'south', 'west', 'north']) {
    const testTile: Tile = { suit: TileSuit.WIND, value: 0, id: `test-wind-${w}` }
    // WIND tiles use value to distinguish, but canWin checks suit
    const testHand = [...hand, testTile]
    const result = canWin(testHand, exposed.length, wildChecker)
    if (result.canWin) count += 4
  }
  // Dragon tiles (中发白)
  for (let v = 1; v <= 3; v++) {
    const testTile: Tile = { suit: TileSuit.DRAGON, value: v, id: `test-dragon-${v}` }
    const testHand = [...hand, testTile]
    const result = canWin(testHand, exposed.length, wildChecker)
    if (result.canWin) count += 4
  }

  return count
}

/**
 * Check if chowing this tile would actually improve the hand (not create dead hand).
 * Returns true if the chow creates at least one complete sequence from the tiles used.
 * 严格检查：必须能组成完整顺子（三种合法形之一）
 */
function isChowBeneficial(player: Player, game: GameState, chowTile: Tile): boolean {
  const hand = player.hand.concealedTiles
  const v = chowTile.value
  const suit = chowTile.suit
  const groups = groupTiles(hand)

  // 三种合法吃法：必须能组成完整顺子
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`) && groups.has(`${suit}-${v - 1}`);
  const hasLeftRight = groups.has(`${suit}-${v - 1}`) && groups.has(`${suit}-${v + 1}`);
  const hasRightRight = groups.has(`${suit}-${v + 1}`) && groups.has(`${suit}-${v + 2}`);

  return hasLeftLeft || hasLeftRight || hasRightRight;
}

/**
 * Evaluate whether chowing is beneficial based on hand composition.
 * Returns a score 0~1 indicating how desirable the chow is.
 */
/**
 * 评估吃牌价值 — 整合全部策略参数
 *
 * 使用参数：
 *   - chowChance          → 基础吃牌概率
 *   - menqingKeepBonus    → 门清执念（替代硬编码0.85）
 *   - chowWildPenalty     → 吃百搭惩罚（替代硬编码0.5）
 *   - allPungsPursuit    → 碰碰胡追求 → 吃顺子惩罚
 *   - pureFlushPursuit   → 清一色追求 → 异花吃惩罚
 *   - halfFlushWeight    → 混一色权重 → 异花吃容忍
 *   - nearWeight         → 相邻搭子保留价值（加分）
 *   - flushChaseBonus    → 追花奖励
 *   - tripletComboBonus   → 刻子组合奖励
 *
 * 注意：所有惩罚/奖励用加法叠加，设 floor=0.05 防止彻底不吃牌
 */
function evaluateChowValue(
  player: Player,
  game: GameState,
  chowTile: Tile
): number {
  const hand = player.hand.concealedTiles
  const policy = getPolicyForPlayer(player)
  const meldCount = player.hand.exposedMelds.length

  if (player.isTing) return 0

  // === 基础分 ===
  let score = policy.chowChance

  // === A. 门清执念 menqingKeepBonus ===
  //    menqingKeepBonus 越大 → 门清时吃牌惩罚越重 → 越不愿吃
  //    公式：惩罚 = menqingKeepBonus × 0.5，上限 0.6（留 0.4 最低分）
  if (meldCount === 0) {
    const menqingPenalty = Math.min(0.6, (policy.menqingKeepBonus || 0) * 0.5)
    score -= menqingPenalty
  }

  // === B. 面子数硬限制（已有面子数惩罚）===
  if (meldCount >= 3) {
    score -= 0.7 // 已有3+面子，大幅降低吃牌意愿
  } else if (meldCount >= 2) {
    score -= 0.3
  }

  // === C. 死牌检测 ===
  if (!isChowBeneficial(player, game, chowTile)) {
    score -= 0.8 // 吃了也是死牌，大幅惩罚
  }

  // === D. 吃牌类型价值（加法叠加）===
  const v = chowTile.value
  const suit = chowTile.suit
  const groups = groupTiles(hand)

  const hasLeft = groups.has(`${suit}-${v - 1}`)
  const hasRight = groups.has(`${suit}-${v + 1}`)
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`)
  const hasRightRight = groups.has(`${suit}-${v + 2}`)

  if (hasLeft && hasRight) {
    score += 1.0 // 夹张：最有价值
  } else if (hasLeft && hasRightRight) {
    score += 0.6 // 延伸搭子
  } else if (hasRight && hasLeftLeft) {
    score += 0.6
  } else if ((hasLeft && v - 1 === 1) || (hasRight && v + 1 === 9)) {
    score += 0.3 // 单边搭子
  } else if (hasLeft || hasRight) {
    score += 0.0 // 两面：中性
  } else if (hasLeftLeft || hasRightRight) {
    score -= 0.3 // 间隔搭子
  }

  // === E. allPungsPursuit — 碰碰胡追求 → 吃顺子惩罚 ===
  if ((policy.allPungsPursuit || 0) > 0) {
    score -= (policy.allPungsPursuit || 0) * 0.8
  }

  // === F. nearWeight — 相邻搭子保留加分 ===
  //    吃后保留的相邻牌越多 → 加分
  let adjacentKept = 0
  if (hasLeft) adjacentKept++
  if (hasRight) adjacentKept++
  if (hasLeftLeft && !hasLeft) adjacentKept += 0.5
  if (hasRightRight && !hasRight) adjacentKept += 0.5
  score += adjacentKept * (policy.nearWeight || 0) * 0.05

  // === G. 花色惩罚（纯色严惩，混色轻惩）===
  //    统计主花色
  const suitCounts: Record<string, number> = {}
  let total = 0
  for (const t of hand) {
    if (isWildTile(t, game) || isHonor(t) || t.suit === TileSuit.FLOWER) continue
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1
    total++
  }
  const dominantSuit = (() => {
    if (total > 0) {
      const sorted = Object.entries(suitCounts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] ?? null;
    }
    return null;
  })();
  const dominantCount = dominantSuit ? (suitCounts[dominantSuit] || 0) : 0

  if (dominantCount >= 6 && (policy.pureFlushPursuit || 0) > 0) {
    const isSameSuit = dominantSuit === suit
    if (!isSameSuit) {
      // 异花吃：清一色严惩（pureFlushPursuit），混一色轻惩（halfFlushWeight）
      const purePenalty = (policy.pureFlushPursuit || 0) * 0.6
      const halfPenalty = (policy.halfFlushWeight || 0) * 0.3
      score -= Math.max(purePenalty, halfPenalty)
    }
  }

  // === H. flushChaseBonus — 追花奖励 ===
  if (dominantSuit === suit && (policy.flushChaseBonus || 0) > 0) {
    if (dominantCount >= 7) {
      score += (policy.flushChaseBonus || 0) * 0.5
    }
  }

  // === I. tripletComboBonus — 刻子组合奖励 ===
  const chowSuitCount = hand.filter(t => t.suit === suit && !isWildTile(t, game)).length
  if (chowSuitCount >= 2 && (policy.tripletComboBonus || 0) > 0) {
    score += (policy.tripletComboBonus || 0) * 0.1
  }

  // === J. 阶段调整（听牌接近时加分）===
  const tilesNeeded = 14 - hand.length - meldCount * 3
  if (tilesNeeded <= 2) {
    score += 0.3 // 接近听牌，积极吃
  }
  if (hand.length <= 6) {
    const winningCount = countWinningTiles(player, game)
    if (winningCount <= 8) {
      score += 0.4 // 听牌张少，吃牌搏一把
    }
  }

  // === K. chowWildPenalty — 替代硬编码0.5 ===
  if (isWildTile(chowTile, game)) {
    score -= (policy.chowWildPenalty || 0.5)
  }

  return Math.max(0.05, Math.min(1, score))
}

/**
 * Evaluate a specific chow option (which tiles to use for the chow).
 * Some chow options are better than others.
 */
function evaluateChowOption(
  player: Player,
  game: GameState,
  optionTiles: Tile[],
  chowTile: Tile
): number {
  // Prefer chow options that keep better tiles in hand
  const hand = player.hand.concealedTiles
  let score = 0

  for (const t of optionTiles) {
    const key = `${t.suit}-${t.value}`
    const groups = groupTiles(hand)
    const count = groups.get(key)?.length || 0
    if (count >= 2) score -= 2 // 用对子吃牌不好
    if (count >= 3) score -= 5 // 用刻子吃牌很不好

    // 检查这张牌是否与其他牌有搭子
    for (let dv = -2; dv <= 2; dv++) {
      if (dv === 0) continue
      const adjKey = `${t.suit}-${t.value + dv}`
      if (groups.has(adjKey) && adjKey !== `${chowTile.suit}-${chowTile.value}`) {
        score += 1 // 这张牌有其他搭子，吃掉后可能浪费
      }
    }
  }

  return score
}

/**
 * Determine if bot should claim a pending action (PENG/KONG/HU/PASS).
 * Returns the ActionType to execute.
 */
// P2 Pipeline scorer 是否接管决策
export async function shouldClaimPendingAction(
  player: Player,
  availableActions: ActionType[],
  game: GameState
): Promise<ActionType> {
  const policy = getPolicyForPlayer(player)
  const hand = player.hand.concealedTiles
  const exposedCount = player.hand.exposedMelds.length
  const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
  const claimTile = pendingAction?.tile

  // P2 Shadow: 新管线 vs legacy 对比日志（仅在启用管线时运行，避免无用计算）
  if (USE_PIPELINE_SCORER) {
    shadowEvaluate(player, availableActions, game).catch(() => {}) // fire-and-forget
    const engine = await getPipelineEngine()
    if (engine) {
      try {
        const ctx = engine.buildActionContext(game, player.id, availableActions, game.turnIndex)
        const ranked = engine.rankActions(ctx)
        if (ranked[0]?.action === ActionType.HU) return ActionType.HU
        const bestNonHu = ranked.find(r => r.action !== ActionType.HU)
        if (bestNonHu) return bestNonHu.action
        return ActionType.PASS
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PIPELINE] scorer failed, fallback to legacy:', (e as Error).message)
        }
      }
    }
  }

  // HU 决策：用策略参数控制是否胡牌
  // 使用参数：
  //   - selfWinChance         → 自摸意愿
  //   - discardHuWildPenalty → 放冲胡百搭惩罚
  //   - discardHuMenQingPenalty → 放冲胡门清惩罚
  //   - robKongAwareness     → 抢杠意识
  //   - bao2ClaimPenalty     → 二宝捉冲惩罚
  //   - bao3AvoidThreshold   → 三宝避免阈值
  if (availableActions.includes(ActionType.HU)) {
    const isSelfDraw = !(game.pendingActions.some(
      pa => pa.playerId === player.id && pa.type === 'discard'
    ))

    // 自摸：有 selfWinChance 控制意愿
    if (isSelfDraw) {
      const selfWinProb = policy.selfWinChance ?? 0.95
      if (Math.random() < selfWinProb) {
        return ActionType.HU
      }
    }

    // 放冲（捉冲）
    const pendingDiscard = game.pendingActions.find(
      pa => pa.type === 'discard' && pa.playerId !== player.id
    )
    if (pendingDiscard) {
      const discardTile = (pendingDiscard as any).tile as Tile | undefined
      const isWildDiscard = discardTile ? isWildTile(discardTile, game) : false
      const isMenQing = exposedCount === 0

      // 百搭惩罚：放冲胡百搭降低概率
      if (isWildDiscard && (policy.discardHuWildPenalty ?? 0) > 0) {
        const wildProb = Math.max(0, 1.0 - (policy.discardHuWildPenalty ?? 0))
        if (Math.random() >= wildProb) return ActionType.PASS
      }

      // 门清惩罚：门清时放冲胡也降低概率
      if (isMenQing && (policy.discardHuMenQingPenalty ?? 0) > 0) {
        const menqingProb = Math.max(0, 1.0 - (policy.discardHuMenQingPenalty ?? 0))
        if (Math.random() >= menqingProb) return ActionType.PASS
      }

      // 宝牌惩罚：二宝捉冲降低意愿
      const wildCount = hand.filter(t => isWildTile(t, game)).length
      if (wildCount >= 2 && (policy.bao2ClaimPenalty ?? 0) > 0) {
        const penalty = Math.max(0, 1.0 - (policy.bao2ClaimPenalty ?? 0))
        if (Math.random() >= penalty) return ActionType.PASS
      }

      // 三宝避免：wildCount >= 3 时按概率减少冲
      if (wildCount >= 3 && (policy.bao3AvoidThreshold ?? 0) > 0) {
        const avoidProb = Math.min(0.9, (policy.bao3AvoidThreshold ?? 0) * 0.9)
        if (Math.random() < avoidProb) return ActionType.PASS
      }

      return ActionType.HU
    }

    return ActionType.HU
  }

  if (!claimTile) return ActionType.PASS

  const wildChecker = (t: Tile) => isWildTile(t, game)
  const exclusionState = game.chowPongExclusion?.[player.id] || { firstActionSuit: null, firstActionType: null }

  const actionScores = new Map<ActionType, { shanten: number; effective: number; tune: number }>()

  const evaluateResultingHand = (candidateHand: Tile[]): { shanten: number; effective: number } => {
    let bestShanten = Infinity
    let bestEffective = -1

    for (let i = 0; i < candidateHand.length; i++) {
      const remain = candidateHand.filter((_, idx) => idx !== i)
      const shanten = calculateShanten(remain, exposedCount + 1, wildChecker)
      const effective = countEffectiveTiles(remain, exposedCount + 1, wildChecker)
      if (shanten < bestShanten || (shanten === bestShanten && effective > bestEffective)) {
        bestShanten = shanten
        bestEffective = effective
      }
    }

    return { shanten: bestShanten, effective: bestEffective }
  }

  // PASS：不吃碰杠，保持当前手牌（下一步摸牌前的基线质量）
  {
    const shanten = calculateShanten(hand, exposedCount, wildChecker)
    const effective = countEffectiveTiles(hand, exposedCount, wildChecker)
    actionScores.set(ActionType.PASS, { shanten, effective, tune: 0 })
  }

  // PENG
  if (
    availableActions.includes(ActionType.PENG) &&
    checkChowPongExclusion(exclusionState, 'pong', claimTile.suit)
  ) {
    const groups = groupTiles(hand)
    const key = `${claimTile.suit}-${claimTile.value}`
    const sameTiles = groups.get(key) || []
    if (sameTiles.length >= 2) {
      const candidateHand = [...hand]
      let removed = 0
      for (let i = candidateHand.length - 1; i >= 0 && removed < 2; i--) {
        if (candidateHand[i].suit === claimTile.suit && candidateHand[i].value === claimTile.value) {
          candidateHand.splice(i, 1)
          removed++
        }
      }
      if (removed === 2 && candidateHand.length > 0) {
        const { shanten, effective } = evaluateResultingHand(candidateHand)
        let pengTune = policy.pengChance || 0

        // === 百搭碰牌奖励（pengWildBoost > 0 时更积极碰百搭）===
        if (isWildTile(claimTile, game) && (policy.pengWildBoost || 0) > 0) {
          pengTune += (policy.pengWildBoost || 0)
        }

        // === 碰碰胡路线（allPungsPursuit > 0 → 碰牌加分）===
        if ((policy.allPungsPursuit || 0) > 0) {
          pengTune += (policy.allPungsPursuit || 0) * 0.3
        }

        // === 门清碰牌惩罚（比吃牌损失更大）===
        const meldCount = exposedCount
        if (meldCount === 0 && (policy.menqingKeepBonus || 0) > 0) {
          pengTune -= (policy.menqingKeepBonus || 0) * 0.4
        }

        // === 对手听牌检测（oppTingDetection > 0 → 减少碰牌）===
        if ((policy.oppTingDetection || 0) > 0 && (game as any).opponentTingIndicator) {
          pengTune *= Math.max(0, 1.0 - (policy.oppTingDetection || 0) * 0.8)
        }

        pengTune = Math.max(0.05, pengTune)
        actionScores.set(ActionType.PENG, { shanten, effective, tune: pengTune })
      }
    }
  }

  // KONG（明杠）
  if (availableActions.includes(ActionType.KONG)) {
    const groups = groupTiles(hand)
    const key = `${claimTile.suit}-${claimTile.value}`
    const sameTiles = groups.get(key) || []
    if (sameTiles.length >= 3) {
      const candidateHand = [...hand]
      let removed = 0
      for (let i = candidateHand.length - 1; i >= 0 && removed < 3; i--) {
        if (candidateHand[i].suit === claimTile.suit && candidateHand[i].value === claimTile.value) {
          candidateHand.splice(i, 1)
          removed++
        }
      }
      if (removed === 3 && candidateHand.length > 0) {
        const { shanten, effective } = evaluateResultingHand(candidateHand)
        let kongTune = policy.kongChance || 0

        // === 百搭杠奖励（kongWildBoost > 0 时更积极杠百搭）===
        if (isWildTile(claimTile, game) && (policy.kongWildBoost || 0) > 0) {
          kongTune += (policy.kongWildBoost || 0)
        }

        // === 加杠激进（kakanAggression > 0 → 鼓励从碰升级为杠）===
        // 检查该牌是否已有一个碰（暗杠/加杠才有碰可升）
        const existingPong = player.hand.exposedMelds.some(
          m => m.type === 'pong' && m.tile.suit === claimTile.suit && m.tile.value === claimTile.value
        )
        if (existingPong && (policy.kakanAggression || 0) > 0) {
          kongTune += (policy.kakanAggression || 0) * 0.5
        }

        // === 暗杠激进（anKongAggression > 0 → 鼓励暗杠）===
        if ((policy.anKongAggression || 0) > 0 && !pendingAction) {
          // 无待响应动作时可以暗杠，这里只是标记（明杠用 kongWildBoost）
          kongTune += (policy.anKongAggression || 0) * 0.3
        }

        // === 自摸百搭奖励（selfWinWildBoost > 0 → 有百搭时更积极杠）===
        const wildCount = hand.filter(t => isWildTile(t, game)).length
        if (wildCount > 0 && (policy.selfWinWildBoost || 0) > 0) {
          kongTune += (policy.selfWinWildBoost || 0) * Math.min(wildCount, 3) * 0.2
        }

        // === 宝牌风险厌恶（baoRiskAversion > 0 → 减少杠）===
        // baoRiskAversion 越高，杠后损失越多番数的风险越大
        if ((policy.baoRiskAversion || 0) > 0 && wildCount >= (policy.baoThreshold || 4)) {
          kongTune *= Math.max(0, 1.0 - (policy.baoRiskAversion || 0) * 0.5)
        }

        // === 宝自摸谨慎（baoSelfClaimCaution > 0 → 少杠避免被抢）===
        if ((policy.baoSelfClaimCaution || 0) > 0) {
          kongTune *= Math.max(0, 1.0 - (policy.baoSelfClaimCaution || 0) * 0.4)
        }

        kongTune = Math.max(0.05, Math.min(2.0, kongTune)) // 上限 2.0，防止 kongWildBoost 过大导致过度杠牌
        actionScores.set(ActionType.KONG, { shanten, effective, tune: kongTune })
      }
    }
  }

  // CHOW（取最好吃法）
  if (
    availableActions.includes(ActionType.CHOW) &&
    checkChowPongExclusion(exclusionState, 'chow', claimTile.suit) &&
    !isHonor(claimTile)
  ) {
    const v = claimTile.value
    const suit = claimTile.suit

    const chowPatterns: Array<[number, number]> = [
      [v - 2, v - 1],
      [v - 1, v + 1],
      [v + 1, v + 2],
    ]

    let bestChow: { shanten: number; effective: number; tune: number } | null = null

    for (const [a, b] of chowPatterns) {
      if (a < 1 || b > 9) continue

      const idxA = hand.findIndex(t => t.suit === suit && t.value === a)
      const idxB = hand.findIndex((t, i) => i !== idxA && t.suit === suit && t.value === b)
      if (idxA === -1 || idxB === -1) continue

      const candidateHand = hand.filter((_, i) => i !== idxA && i !== idxB)
      if (candidateHand.length === 0) continue

      const { shanten, effective } = evaluateResultingHand(candidateHand)
      const chowTune = evaluateChowValue(player, game, claimTile)
      const candidate = { shanten, effective, tune: chowTune }

      if (
        !bestChow ||
        candidate.shanten < bestChow.shanten ||
        (candidate.shanten === bestChow.shanten && candidate.effective > bestChow.effective) ||
        (candidate.shanten === bestChow.shanten && candidate.effective === bestChow.effective && candidate.tune > bestChow.tune)
      ) {
        bestChow = candidate
      }
    }

    if (bestChow) {
      // ==========================================================
      //  策略参数接入：用这些因子调整 CHOW 最终评分
      //  使用参数：
      //    - menqingKeepBonus       → 门清时吃牌惩罚（已由 evaluateChowValue 处理，此处强化）
      //    - allPungsPursuit        → 碰碰胡追求 → 吃 CHOW 惩罚
      //    - pureFlushPursuit       → 清一色追求 → 异花 CHOW 严惩
      //    - halfFlushWeight        → 混一色权重
      //    - nearWeight             → 最短门惩罚（吃后门数变化）
      // ==========================================================
      {
        // allPungsPursuit：碰碰胡追求 → 抑制吃顺（menqingKeepBonus 惩罚已在 evaluateChowValue 中处理）
        if ((policy.allPungsPursuit || 0) > 0) {
          bestChow.tune -= (policy.allPungsPursuit || 0) * 0.5
        }

        // nearWeight：拆门惩罚 — 吃异花导致门数增加则惩罚
        if (claimTile) {
          const chowSuit = claimTile.suit
          const currentSuits = Object.keys(suitCounts).filter(s => (suitCounts[s] || 0) > 0)
          if (!currentSuits.includes(chowSuit) && currentSuits.length >= 2) {
            // 吃异花：门数增加 × nearWeight
            const doorBreakPenalty = (policy.nearWeight || 0) * 0.02
            bestChow.tune -= Math.min(0.5, doorBreakPenalty)
          }
        }
      }

      bestChow.tune = Math.max(0.05, bestChow.tune)
      actionScores.set(ActionType.CHOW, bestChow)
    }
  }

  // P1 软评分决策：sigmoid 概率采样
  // 替代硬比较：score差 + baseChance先验 → sigmoid概率 → 随机采样
  // baseChance 映射：chowChance/pengChance/kongChance → 先验偏置
  // 当分数差=0时，baseChance 直接决定动作概率
  const baseChances: Record<ActionType, number> = {
    [ActionType.PASS]: 0.5,  // PASS无先验（50/50）
    [ActionType.PENG]: policy.pengChance ?? 0.4,  // P1: 降低碰牌概率
    [ActionType.KONG]: policy.kongChance ?? 0.7,
    [ActionType.CHOW]: policy.chowChance ?? 0.6,  // P1: 提高吃牌概率
    [ActionType.HU]: 1.0,    // 胡牌100%（已在HU分支处理）
  }

  // P0: 强制胡牌训练 —— 手牌只剩 1 张且能胡时，优先自摸胡牌
  const singleTileHand = player.hand.concealedTiles.length === 1
  // 获取刚摸的牌（手牌最后一张）或吃碰杠得到的牌
  const drawnOrClaimedTile = player.hand.concealedTiles.length > 0
    ? player.hand.concealedTiles[player.hand.concealedTiles.length - 1]
    : null

  // 单张手牌能胡时，优先自摸胡牌（不做 canWin 检查，直接胡牌）
  if (singleTileHand && drawnOrClaimedTile) {
    const isWild = isWildTile(drawnOrClaimedTile, game)
    const wildCount = player.hand.exposedMelds.reduce((acc, meld) => acc + meld.tiles.filter(t => isWildTile(t, game)).length, 0)
    const totalWildCount = wildCount + (isWild ? 1 : 0)
    
    // 即使只有 1 张百搭，也要胡牌（胡牌优先于摸牌）
    if (totalWildCount <= 1) {
      bestAction = ActionType.HU
      return bestAction
    }
  }

  // 标准评分流程
  let bestAction = ActionType.PASS
  let best = actionScores.get(ActionType.PASS)!

  for (const [action, s] of actionScores.entries()) {
    if (action === ActionType.PASS) continue
    if (!softScoreWins(s, best, baseChances[action] ?? 0.5, 1.0)) continue
    bestAction = action
    best = s
  }

  return bestAction
}
