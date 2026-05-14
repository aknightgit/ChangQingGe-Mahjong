/**
 * BotService — AI Bot that plays for computer players
 * Uses training/best-policy.json heuristic scoring to decide which tile to discard.
 */
import { GameState, Player, Tile, TileSuit, MeldType, PlayerStatus, ActionType } from '../types/game'
import { groupTiles, tilesEqual, isFlower, isHonor, isWind, isDragon } from '../utils/tiles'
import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, ChowPongExclusionState } from '../utils/handValidator'
import {
  DISABLE_LEGACY_BOT_PATH,
  PIPELINE_SHADOW_MODE,
  USE_OFFICIAL_ROUTE_BOT_PATH,
  USE_PIPELINE_SCORER
} from '../ai/config/policyFlags'
import { evaluateRouteState } from '../ai/route/routeEvaluator'
import { scoreRouteDiscardCandidate } from '../ai/route/discardPlanner'
import { evaluateRouteClaim } from '../ai/route/claimPlanner'
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
  s = { ...s, shanten: (s.shanten - best.shanten) * 1.2 };
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
let _policySources: Record<string, { path: string; mtimeMs: number }> = {}
function usesOfficialRouteStrategy(_botName: string): boolean {
  return USE_OFFICIAL_ROUTE_BOT_PATH
}

function resolvePolicyBotName(botName: string): string {
  return botName
}

function getPlayerRouteMemory(player: Player): any | null {
  return (player as any).__routeStateMemory || null
}

function setPlayerRouteMemory(player: Player, routeState: any): void {
  ;(player as any).__routeStateMemory = routeState
}

function getLiveRouteMetricPolicy(policy: any): {
  menqingHoldTurns: number
  forcedOpenRate: number
  deadHandRate: number
  tingQuality: number
} {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  return {
    menqingHoldTurns: clamp(Number(policy?.menqingHoldTurns ?? 4), 2, 8),
    forcedOpenRate: clamp(Number(policy?.forcedOpenRate ?? 0.28), 0.05, 0.7),
    deadHandRate: clamp(Number(policy?.deadHandRate ?? 0.2), 0.05, 0.7),
    tingQuality: clamp(Number(policy?.tingQuality ?? 4), 1, 8),
  }
}

function getEffectiveGlobalMultiplier(game: any): number {
  return Math.min(
    ((game as any)?.inheritMultiplier ?? (game as any)?.inheritedGlobalMultiplier ?? 1) *
    ((game as any)?.roundMultiplier ?? 1),
    8
  )
}

function shouldDeclineLowValueHu(game: GameState, player: Player): boolean {
  const pendingDiscard =
    game.pendingActions.find(pa => pa.type === 'discard' && pa.playerId === player.id) ||
    game.pendingActions.find(pa => pa.type === 'discard' && pa.playerId !== player.id)
  const discardTile = (pendingDiscard as any)?.tile as Tile | undefined
  if (!discardTile) return false

  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const huTableThreat = estimateTableThreat(game, player.id)
  const topOpponentScore = Math.max(...game.players.filter(p => p.id !== player.id).map(p => p.score ?? 0), 0)
  const scoreLead = (player.score ?? 0) - topOpponentScore
  const wildCount = player.hand.concealedTiles.filter(t => isWildTile(t, game)).length
  const isWildDiscard = isWildTile(discardTile, game)
  const isMenQing = player.hand.exposedMelds.length === 0
  const likelyLowValueHu =
    !isMenQing &&
    !isWildDiscard &&
    effectiveGlobalMultiplier <= 2 &&
    wildCount <= 1

  return huTableThreat >= 0.9 && scoreLead >= 800 && likelyLowValueHu
}

function estimateRouteExpectedFan(routeState: any, player: Player, game: GameState, winningTiles: number): number {
  const policy = routeState?.policy ?? getPolicyForPlayer(player)
  const exposedCount = player.hand.exposedMelds.length
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game)
  const longestSuitCount = routeState?.features?.longestSuitCount || 0
  const secondSuitCount = routeState?.features?.secondSuitCount || 0
  const honorCount = routeState?.features?.honorCount || 0
  const honorPairCount = routeState?.features?.honorPairCount || 0
  const tripletCount = routeState?.features?.tripletCount || 0
  const wildCount = routeState?.features?.wildCount || 0
  const handQuality = longestSuitCount >= 7 ? 7 : longestSuitCount >= 6 ? 6 : longestSuitCount >= 5 ? 5 : 0
  const multPrefix = effectiveGlobalMultiplier >= 4 ? 'multHigh' : 'multLow'
  const multPureFlushBoost = handQuality >= 6 ? Number(policy?.[`${multPrefix}Hand${handQuality}PureFlush`] ?? 0) : 0
  const multHalfFlushBoost = handQuality >= 5 ? Number(policy?.[`${multPrefix}Hand${handQuality}HalfFlush`] ?? 0) : 0
  const multAllPungsBoost = handQuality >= 5 ? Number(policy?.[`${multPrefix}Hand${handQuality}AllPungs`] ?? 0) : 0
  const qingPengReady = longestSuitCount >= 8 && secondSuitCount === 0 && honorCount <= 2
  const hunPengReady = longestSuitCount >= 6 && honorCount >= 2 && secondSuitCount <= 1
  let fan = exposedCount === 0 ? 2.2 : 0.8

  switch (routeState?.current) {
    case 'HALF_FLUSH':
      fan += routeState?.features?.pureFlushUpgradeReady ? 8.5 : 4.8
      fan += (policy?.halfFlushWeight || 0) * 1.8
      fan += (policy?.pureFlushPursuit || 0) * Math.max(0, longestSuitCount - 6) * 0.3
      fan += multHalfFlushBoost * 2.2 + multPureFlushBoost * (routeState?.features?.pureFlushUpgradeReady ? 2.4 : 0.8)
      fan += (policy?.hunPengPursuit || 0) * (hunPengReady ? 1.8 : 0)
      fan += (policy?.qingPengPursuit || 0) * (qingPengReady ? 1.4 : 0)
      break
    case 'ALL_PUNGS':
      fan += 4.2 + Math.max(0, (routeState?.features?.tripletCount || 0) - 1) * 0.35
      fan += (policy?.allPungsPursuit || 0) * 1.8
      fan += multAllPungsBoost * 2.4
      fan += (policy?.qingPengPursuit || 0) * (qingPengReady ? 2.1 : 0)
      fan += (policy?.hunPengPursuit || 0) * (hunPengReady ? 2.0 : 0)
      break
    case 'HONOR_HEAVY':
      fan += 4.6 + Math.max(0, honorPairCount - 1) * 0.45
      fan += (policy?.allHonorsPursuit || 0) * 2.8
      fan += (policy?.allHonorsPungsPursuit || 0) * Math.max(1, honorPairCount + tripletCount * 0.6)
      break
    case 'OPEN_SPEED':
      fan += 1.4
      break
    default:
      fan += 1.8
      break
  }

  if ((routeState?.features?.wildCount || 0) === 0) fan += 0.6
  if (wildCount === 1) fan += (policy?.wild1RouteFlushBoost || 0) * (routeState?.current === 'HALF_FLUSH' ? 0.8 : 0.2)
  if (wildCount === 2) fan += (policy?.wild2RouteFlushBoost || 0) * (routeState?.current === 'HALF_FLUSH' ? 1.1 : 0.2)
  if (wildCount >= 3) fan += (policy?.wild3RouteFlushBoost || 0) * (routeState?.current === 'HALF_FLUSH' ? 1.2 : 0.25)
  if (winningTiles >= 12) fan += 0.5
  else if (winningTiles <= 5) fan -= 0.4
  fan += Math.max(0, effectiveGlobalMultiplier - 1) * 0.45

  return Math.max(1, fan)
}

function estimateTingDecisionValue(input: {
  routeState: any
  player: Player
  game: GameState
  winningTiles: number
  discardDanger: number
  tableThreat: number
  scoreLead: number
}): number {
  const { routeState, player, game, winningTiles, discardDanger, tableThreat, scoreLead } = input
  const policy = routeState?.policy ?? getPolicyForPlayer(player)
  const expectedFan = estimateRouteExpectedFan(routeState, player, game, winningTiles)
  const tsumoValue = expectedFan * (player.hand.exposedMelds.length === 0 ? 1.45 : 1.1) + winningTiles * 0.08
  const ronValue = expectedFan * (routeState?.current === 'HALF_FLUSH' ? 1.3 : 1.05) + winningTiles * 0.04
  const safetyPreference = (policy?.safeTilePriority || 0) + (policy?.wallLateDefense || 0) * 0.6
  const defensePreference = (policy?.defenseRiskAversion || 0) + (policy?.oppTingDetection || 0) * 0.4
  const riskCost =
    discardDanger *
    (
      1.4 +
      tableThreat * (scoreLead > 1000 ? 6.4 : 4.2) +
      safetyPreference * 1.8 +
      defensePreference * 2.1 +
      (scoreLead < -800 ? 0.4 : 0)
    )

  return tsumoValue + ronValue - riskCost
}

function estimateNearTingDecisionValue(input: {
  routeState: any
  player: Player
  game: GameState
  shanten: number
  effective: number
  winningTiles: number
  tableThreat: number
  scoreLead: number
}): number {
  const { routeState, player, game, shanten, effective, winningTiles, tableThreat, scoreLead } = input
  const policy = routeState?.policy ?? getPolicyForPlayer(player)
  const expectedFan = estimateRouteExpectedFan(routeState, player, game, Math.max(winningTiles, Math.floor(effective / 2)))
  if (shanten === 0) {
    return estimateTingDecisionValue({
      routeState,
      player,
      game,
      winningTiles,
      discardDanger: tableThreat * 0.35,
      tableThreat,
      scoreLead,
    })
  }
  return (
    expectedFan * (1.1 + (policy?.speedVsValueBalance || 0) * 0.12) +
    effective * 0.08 -
    tableThreat * ((scoreLead > 1000 ? 2.1 : 1.5) + (policy?.safeTilePriority || 0) * 0.7 + (policy?.defenseRiskAversion || 0) * 0.8)
  )
}

function tuneLiveClaimPolicy(policy: any): any {
  const tuned = { ...(policy || {}) }
  const raise = (key: string, value: number) => {
    tuned[key] = Math.max(Number(tuned[key] ?? 0), value)
  }
  const lower = (key: string, value: number) => {
    tuned[key] = Math.min(Number(tuned[key] ?? value), value)
  }

  raise('pengChance', 0.9)
  raise('chowChance', 0.92)
  raise('kongChance', 0.72)
  raise('minkanAggression', 0.75)
  raise('speedVsValueBalance', 0.78)
  raise('wallEarlySpeedPush', 0.82)
  raise('wallMidBalance', 0.72)
  raise('wild0Aggression', 0.55)
  raise('wild1Aggression', 0.62)
  raise('wild2Aggression', 0.75)
  raise('menqingHoldTurns', 4)
  raise('forcedOpenRate', 0.28)
  raise('deadHandRate', 0.2)
  raise('tingQuality', 4)

  lower('menqingKeepBonus', 0.35)
  lower('defenseRiskAversion', 0.16)
  lower('wallLateDefense', 0.25)
  lower('safeTilePriority', 0.24)
  lower('oppTingDetection', 0.18)
  lower('bao2ClaimPenalty', 0.25)
  lower('bao3AvoidThreshold', 0.35)
  lower('baoRiskAversion', 0.3)
  lower('baoSelfClaimCaution', 0.18)
  lower('allPungsPursuit', 0.35)
  lower('pureFlushPursuit', 0.45)
  lower('halfFlushWeight', 0.45)

  return tuned
}

function loadPolicyFile(cacheKey: string, filePath: string, logLabel: string): any {
  const stat = fs.statSync(filePath)
  const cachedSource = _policySources[cacheKey]
  if (
    _policies[cacheKey]
    && cachedSource
    && cachedSource.path === filePath
    && cachedSource.mtimeMs === stat.mtimeMs
  ) {
    return _policies[cacheKey]
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  const policy = data.policy || data
  _policies[cacheKey] = policy
  _policySources[cacheKey] = { path: filePath, mtimeMs: stat.mtimeMs }
  console.log(`[BotService] Loaded policy for ${logLabel}:`, policy.id || 'character')
  return policy
}

function loadCharacterPolicy(botName: string): any {
  const resolvedBotName = resolvePolicyBotName(botName)
  // Try loading character-specific policy first
  const characterPaths = [
    path.resolve(process.cwd(), `AI_policies/characters/${resolvedBotName}.json`),
    path.resolve(process.cwd(), `training-output/policies/characters/${resolvedBotName}.json`),
    path.resolve(process.cwd(), `../../AI_policies/characters/${resolvedBotName}.json`),
  ]
  
  for (const p of characterPaths) {
    if (fs.existsSync(p)) {
      try {
        const policy = loadPolicyFile(resolvedBotName, p, resolvedBotName)
        _policies[botName] = policy
        _policySources[botName] = _policySources[resolvedBotName]
        return policy
      } catch (err: any) {
        console.warn(`[BotService] Failed to parse ${p}:`, err.message)
      }
      try {
        const raw = fs.readFileSync(p, 'utf-8')
        const data = JSON.parse(raw)
        _policies[resolvedBotName] = data.policy || data
        _policies[botName] = _policies[resolvedBotName]
        console.log(`[BotService] ✅ Loaded policy for ${resolvedBotName}:`, _policies[resolvedBotName].id || 'character')
        return _policies[botName]
      } catch (err: any) {
        console.warn(`[BotService] ⚠️ Failed to parse ${p}:`, err.message)
      }
    }
  }
  
  // Fall back to default/best policy
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
        loadPolicyFile('default', p, 'default')
        break
      } catch (err: any) {
        console.warn(`[BotService] Failed to parse ${p}:`, err.message)
      }
    }
  }

  if (!_policies['default']) {
    
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
        wildKeepPenalty: 0,
        dominantSuitBonus: 3.0,
        tripletKeepBonus: 1.0,
        pairWeight: 8.0,
        nearWeight: 0.8,
        honorPairBonus: 0,
        honorRushThreshold: 8,
        honorRushBoost: 0.2,
        bailoutHuPenaltyPerMeld: 0.01,
      }
      _policies['default'] = tuneLiveClaimPolicy(_policies['default'])
      console.log('[BotService] ⚠️ Using hardcoded fallback policy')
    }
  }
  
  // Use default for this character
  _policies[resolvedBotName] = _policies['default']
  _policySources[resolvedBotName] = _policySources['default']
  _policies[botName] = _policies['default']
  _policySources[botName] = _policySources['default']
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
  _policySources = {}
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

function isNumberTile(tile: Tile): boolean {
  return tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS
}

function countNearbySameSuitTiles(tile: Tile, hand: Tile[]): number {
  if (!isNumberTile(tile)) return 0
  return hand.filter(candidate =>
    candidate.id !== tile.id &&
    candidate.suit === tile.suit &&
    Math.abs(candidate.value - tile.value) > 0 &&
    Math.abs(candidate.value - tile.value) <= 2
  ).length
}

function tilesMatch(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value
}

function countVisibleCopies(target: Tile, game: GameState): number {
  let visible = 0

  for (const tile of game.discardPile || []) {
    if (tilesMatch(tile, target)) visible++
  }

  for (const player of game.players || []) {
    for (const meld of player.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (tilesMatch(tile, target)) visible++
      }
    }
  }

  return visible
}

function hasWeakNumberWasteCandidate(hand: Tile[], excludeTileId?: string): boolean {
  const groups = groupTiles(hand)
  return hand.some(candidate => {
    if (candidate.id === excludeTileId || isHonor(candidate) || candidate.suit === TileSuit.FLOWER) return false
    const candidateCount = groups.get(`${candidate.suit}-${candidate.value}`)?.length || 0
    if (candidateCount >= 2) return false
    return !hand.some(other =>
      other.id !== candidate.id &&
      other.suit === candidate.suit &&
      Math.abs(other.value - candidate.value) > 0 &&
      Math.abs(other.value - candidate.value) <= 2
    )
  })
}

function countPairs(hand: Tile[]): number {
  let pairs = 0
  for (const tiles of groupTiles(hand).values()) {
    if (tiles.length >= 2) pairs++
  }
  return pairs
}

function getCommittedOpenNumberSuit(player: Player): TileSuit | null {
  const suits = new Set<TileSuit>()
  let numberedTileCount = 0

  for (const meld of player.hand.exposedMelds || []) {
    for (const tile of meld.tiles || []) {
      if (!isNumberTile(tile)) continue
      suits.add(tile.suit)
      numberedTileCount++
    }
  }

  if (numberedTileCount < 3 || suits.size !== 1) return null
  return [...suits][0] || null
}

function getNumberSuitCounts(hand: Tile[]): Array<{ suit: TileSuit; count: number }> {
  return [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
    .map(suit => ({
      suit,
      count: hand.filter(tile => tile.suit === suit).length
    }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count)
}

function hasOffSuitNumberWaste(hand: Tile[], committedSuit: TileSuit, excludeTileId?: string): boolean {
  return hand.some(tile => {
    if (tile.id === excludeTileId || tile.suit === committedSuit || !isNumberTile(tile)) return false
    const sameTileCount = hand.filter(other => other.suit === tile.suit && other.value === tile.value).length
    if (sameTileCount >= 2) return false
    return !hand.some(other =>
      other.id !== tile.id &&
      other.suit === tile.suit &&
      Math.abs(other.value - tile.value) > 0 &&
      Math.abs(other.value - tile.value) <= 2
    )
  })
}

function countHonorSingletons(hand: Tile[], excludeTileId?: string): number {
  const groups = groupTiles(hand)
  return hand.filter(tile => {
    if (tile.id === excludeTileId || !isHonor(tile)) return false
    return (groups.get(`${tile.suit}-${tile.value}`)?.length || 0) === 1
  }).length
}

function estimateOpponentThreat(opponent: Player, game: GameState): number {
  if (opponent.status !== PlayerStatus.PLAYING) return 0

  let threat = 0
  const discardCount = opponent.hand.discardedTiles?.length || 0
  const exposedCount = opponent.hand.exposedMelds?.length || 0

  if (opponent.isTing) threat += 1
  if (exposedCount > 0) threat += Math.min(0.45, exposedCount * 0.16)
  if (discardCount >= 9) threat += 0.15
  if (discardCount >= 13) threat += 0.1
  if ((game.discardPile?.length || 0) >= 28) threat += 0.08

  return Math.min(1, threat)
}

function estimateTableThreat(game: GameState, selfId: string): number {
  let threat = 0
  for (const opponent of game.players || []) {
    if (opponent.id === selfId) continue
    threat = Math.max(threat, estimateOpponentThreat(opponent, game))
  }
  return threat
}

function getDiscardDangerScore(tile: Tile, game: GameState, player: Player): number {
  if (isFlower(tile)) return 0

  const visibleCopies = countVisibleCopies(tile, game)
  let baseDanger = 0.55

  if (isHonor(tile)) baseDanger = 0.42
  else if (tile.value === 1 || tile.value === 9) baseDanger = 0.3
  else if (tile.value === 2 || tile.value === 8) baseDanger = 0.48
  else baseDanger = 0.68

  baseDanger *= Math.max(0.12, 1 - visibleCopies * 0.18)

  let danger = 0
  for (const opponent of game.players || []) {
    if (opponent.id === player.id) continue

    const threat = estimateOpponentThreat(opponent, game)
    if (threat <= 0) continue

    const opponentDiscards = opponent.hand.discardedTiles || []
    if (opponentDiscards.some(discard => tilesMatch(discard, tile))) {
      danger += 0.04 * threat
      continue
    }

    let opponentFactor = 1
    if (isHonor(tile) && opponentDiscards.length > 0) opponentFactor -= 0.1
    if (isNumberTile(tile)) {
      const sameSuitDiscards = opponentDiscards.filter(discard => discard.suit === tile.suit)
      if (sameSuitDiscards.some(discard => Math.abs(discard.value - tile.value) >= 3)) {
        opponentFactor -= 0.08
      }
    }

    danger += baseDanger * Math.max(0.2, opponentFactor) * threat
  }

  return Math.max(0, Math.min(1, danger))
}

/**
 * Score each tile in hand for discard priority.
 * Higher score = MORE likely to discard (worse tile).
 * We want to discard the tile with the HIGHEST score.
 */
function scoreTileForDiscard(
  tile: Tile,
  hand: Tile[],
  game: GameState,
  player: Player,
  postDiscardShanten?: number,
  postDiscardEffective?: number
): number {
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
  const isOfficialOpening = usesOfficialRouteStrategy(player.name) && isEarlyPhase
  const tableThreat = estimateTableThreat(game, player.id)
  const discardDanger = getDiscardDangerScore(tile, game, player)

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
    // 百搭默认强保留：除非已非常接近终局，否则不应开局就随手打掉百搭
    const hardKeepFloor = remainingWilds === 0 ? 140 : 220 + remainingWilds * 40
    score -= Math.max(penalty, hardKeepFloor)
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
      if (isOfficialOpening) {
        const hasWeakNumberWaste = hasWeakNumberWasteCandidate(hand, tile.id)
        score += hasWeakNumberWaste ? -7.2 : -0.8
      }
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

  const threatScale = Math.max(
    isLatePhase ? 0.7 : 0.25,
    tableThreat * ((policy.oppTingDetection || 0) * 0.9 + (policy.wallLateDefense || 0) * 0.4 + 0.35)
  )
  const safetyBonus = (1 - discardDanger) * ((policy.safeTilePriority || 0) * 1.8 + (policy.wallLateDefense || 0) * 0.8)
  const threatPenalty = discardDanger * ((policy.defenseRiskAversion || 0) * 3.2 + (policy.oppTingDetection || 0) * 2.2 + 0.4)
  score += safetyBonus * threatScale
  score -= threatPenalty * threatScale

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
  if (scoreDiff < -1000 && tableThreat < 0.6) {
    const chaseBoost = Math.min(1, Math.abs(scoreDiff) / 6000)
    score += chaseBoost * Math.max(0, 0.75 - discardDanger) * 0.8
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
  const inheritMult = (game as any).inheritMultiplier ?? 1
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

  if (postDiscardShanten === 0) {
    score += 1.2
    score += Math.max(0, (postDiscardEffective ?? 0) - 4) * 0.08
  } else if (postDiscardShanten === 1) {
    score += Math.max(0, (postDiscardEffective ?? 0) - 6) * 0.04
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

function countPlayableTilesForBot(player: Player): number {
  const concealed = player.hand.concealedTiles.length
  const exposed = player.hand.exposedMelds.reduce((sum, meld) => {
    if (meld.tiles.length === 1 && isFlower(meld.tiles[0])) return sum
    return sum + meld.tiles.length
  }, 0)
  return concealed + exposed
}

function validateBotDiscardState(player: Player, context: string): void {
  const concealed = player.hand.concealedTiles.length
  const exposedMelds = player.hand.exposedMelds.length
  const playable = countPlayableTilesForBot(player)
  const validPlayableCounts = new Set([2, 5, 8, 11, 14])
  const concealedLooksDiscardable = concealed >= 2 && concealed % 3 === 2

  if (!concealedLooksDiscardable || !validPlayableCounts.has(playable)) {
    console.warn(
      `[BotHandInvariant] ${player.name} invalid discard state @${context}: concealed=${concealed} exposedMelds=${exposedMelds} playable=${playable}`
    )
  }
}

/**
 * Select the best tile to discard from the player's hand.
 * Returns the tile ID.
 */
export function selectDiscardTile(player: Player, game: GameState): string {
  // Clear shanten cache per decision
  _shantenCache = new Map<string, number>();
  validateBotDiscardState(player, 'selectDiscardTile')
  
  const hand = player.hand.concealedTiles
  if (hand.length === 0) return ''
  const nonWildHand = hand.filter(tile => !isWildTile(tile, game))
  const discardCandidates = nonWildHand.length > 0 ? nonWildHand : hand
  const openingHasWeakNumberWaste = usesOfficialRouteStrategy(player.name) && hand.length >= 11 && hasWeakNumberWasteCandidate(hand)

  const exposedCount = player.hand.exposedMelds.length
  const wildChecker = (tile: Tile) => isWildTile(tile, game)
  const wallRemaining = game.wall?.length || 0
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const currentShanten = calculateShanten(hand, exposedCount, wildChecker)
  const currentEffective = countEffectiveTiles(hand, exposedCount, wildChecker)
  const tableThreat = estimateTableThreat(game, player.id)
  const topOpponentScore = Math.max(...game.players.filter(p => p.id !== player.id).map(p => p.score ?? 0), 0)
  const scoreLead = (player.score ?? 0) - topOpponentScore
  const useRoutePlanner = usesOfficialRouteStrategy(player.name)
  const legacyDiscardPathDisabled = DISABLE_LEGACY_BOT_PATH
  const committedOpenSuit = useRoutePlanner ? getCommittedOpenNumberSuit(player) : null
  const hasCommittedOpenOffSuitNumberCandidate = !!committedOpenSuit && discardCandidates.some(tile =>
    isNumberTile(tile) && tile.suit !== committedOpenSuit
  )
  const hasCommittedOpenOffSuitNumberWaste = !!committedOpenSuit && hasOffSuitNumberWaste(hand, committedOpenSuit)
  const numberSuitCounts = useRoutePlanner ? getNumberSuitCounts(hand) : []
  const dominantTwoSuitGap = numberSuitCounts.length === 2
    ? numberSuitCounts[0].count - numberSuitCounts[1].count
    : 0
  const routeMetricPolicy = getLiveRouteMetricPolicy(getPolicyForPlayer(player))
  const routeState = useRoutePlanner
    ? evaluateRouteState({
        game,
        player,
        hand,
        shanten: currentShanten,
        effectiveTiles: currentEffective,
        tableThreat,
        wallRemaining,
        previousRouteState: getPlayerRouteMemory(player),
        policy: getPolicyForPlayer(player),
      })
    : null

  let bestTile = discardCandidates[0]
  let bestShanten = Infinity
  let bestEffective = -1
  let bestScore = -Infinity
  let bestTingValue = -Infinity
  let bestComposite = -Infinity

  for (let i = 0; i < discardCandidates.length; i++) {
    const tile = discardCandidates[i]
    if (committedOpenSuit && hasCommittedOpenOffSuitNumberCandidate && tile.suit === committedOpenSuit) {
      continue
    }
    if (committedOpenSuit && hasCommittedOpenOffSuitNumberWaste && isHonor(tile)) {
      continue
    }
    let removed = false
    const remaining = hand.filter(candidate => {
      if (!removed && candidate.id === tile.id) {
        removed = true
        return false
      }
      return true
    })

    const shanten = calculateShanten(remaining, exposedCount, wildChecker)
    const effective = countEffectiveTiles(remaining, exposedCount, wildChecker)
    let score = scoreTileForDiscard(tile, hand, game, player, shanten, effective)
    const discardDanger = getDiscardDangerScore(tile, game, player)
    const winningTiles = shanten === 0 ? countWinningTilesForHand(remaining, exposedCount, game) : 0
    const waitWeight = scoreLead < -1000 ? 1.15 : 1
    const safetyWeight = tableThreat * (scoreLead > 1000 ? 5.5 : 3.2)
    const timingValue = shanten === 0
      ? winningTiles * waitWeight - discardDanger * safetyWeight
      : -Infinity
    let composite = -shanten * 100 + effective * 2.5 + score
    const tilePairCount = hand.filter(other => tilesMatch(other, tile)).length

    if (openingHasWeakNumberWaste && isHonor(tile) && !hand.some(other => other.id !== tile.id && tilesMatch(other, tile))) {
      composite -= 10
    }

    if (committedOpenSuit) {
      const hasOtherNumberSuitTiles = hand.some(other =>
        other.id !== tile.id &&
        isNumberTile(other) &&
        other.suit !== committedOpenSuit
      )
      const offSuitWasteExists = hasOffSuitNumberWaste(hand, committedOpenSuit, tile.id)
      if (tile.suit === committedOpenSuit) {
        composite -= hasOtherNumberSuitTiles ? 40 : offSuitWasteExists ? 30 : 16
      } else if (isHonor(tile)) {
        composite += tilePairCount >= 2 ? -1.2 : 1.2
      } else {
        composite += hasOtherNumberSuitTiles ? 34 : offSuitWasteExists ? 28 : 18
      }
    }

    if (committedOpenSuit && isHonor(tile)) {
      const visibleCopies = countVisibleCopies(tile, game)
      const honorSingletons = countHonorSingletons(hand, tile.id)
      const exposedMeldCount = player.hand.exposedMelds.length
      const routeWantsCommittedSuit =
        !!routeState &&
        (
          routeState.targetSuit === committedOpenSuit ||
          routeState.current === 'OPEN_SPEED' ||
          routeState.current === 'HALF_FLUSH'
        )

      if (tilePairCount <= 1 && exposedMeldCount >= 2 && routeWantsCommittedSuit) {
        composite += 12 + visibleCopies * 6 + honorSingletons * 2.5
      } else if (tilePairCount <= 1 && routeWantsCommittedSuit) {
        composite += 5 + visibleCopies * 3
      }
    }

    if (useRoutePlanner && dominantTwoSuitGap >= 3 && isNumberTile(tile)) {
      const dominantSuit = numberSuitCounts[0]?.suit || null
      const minoritySuit = numberSuitCounts[1]?.suit || null
      const dominantSuitCount = numberSuitCounts[0]?.count || 0
      const minoritySuitCount = numberSuitCounts[1]?.count || 0
      const nearbySameSuit = countNearbySameSuitTiles(tile, hand)
      if (tile.suit === dominantSuit) {
        composite -= 12 + dominantTwoSuitGap
      } else if (tile.suit === minoritySuit) {
        composite += 8 + dominantTwoSuitGap
        if (nearbySameSuit > 0 && dominantSuitCount >= 6 && minoritySuitCount <= 3) {
          composite += 36 + nearbySameSuit * 4 + dominantTwoSuitGap * 2
        } else if (nearbySameSuit > 0) {
          composite += 14 + nearbySameSuit * 2 + dominantTwoSuitGap
        }
      }
    }

    if (useRoutePlanner && routeState) {
      const afterRouteState = evaluateRouteState({
        game,
        player,
        hand: remaining,
        shanten,
        effectiveTiles: effective,
        tableThreat,
        wallRemaining,
        previousRouteState: routeState,
        policy: getPolicyForPlayer(player),
      })
      const routeScore = scoreRouteDiscardCandidate({
        tile,
        hand,
        player,
        game,
        routeState,
        candidateShanten: shanten,
        candidateEffective: effective,
        discardDanger,
        winningTiles,
        baselineScore: score,
        afterRouteState,
      })
      const expectedFan = shanten === 0 ? estimateRouteExpectedFan(afterRouteState, player, game, winningTiles) : 0
      const tingDecisionValue = shanten === 0
        ? estimateTingDecisionValue({
            routeState: afterRouteState,
            player,
            game,
            winningTiles,
            discardDanger,
            tableThreat,
            scoreLead,
          })
        : 0
      score += routeScore
      composite += routeScore * 2
      const visibleCopies = countVisibleCopies(tile, game)
      const overdueMenqingHold =
        exposedCount === 0 &&
        estimatedRound > routeMetricPolicy.menqingHoldTurns &&
        routeState.current === 'MENQING_SPEED'
      const deadHandPressure =
        routeState.current === 'MENQING_SPEED' &&
        currentShanten >= 2 &&
        routeState.features.isolatedCount >= 3
      const weakObserveTile =
        routeState.phase === 'OBSERVE' &&
        (
          (routeState.features.shortestSuit && tile.suit === routeState.features.shortestSuit && tilePairCount === 1) ||
          (isHonor(tile) && tilePairCount === 1 && visibleCopies >= 2)
        )
      if (overdueMenqingHold && weakObserveTile) {
        composite += 8 + routeMetricPolicy.forcedOpenRate * 18
      }
      if (deadHandPressure && weakObserveTile) {
        composite += 6 + routeMetricPolicy.deadHandRate * 20
      }
      if (shanten === 0) {
        composite += timingValue * (3.2 + routeMetricPolicy.tingQuality * 0.2)
        composite += tingDecisionValue * (1.15 + routeMetricPolicy.tingQuality * 0.08)
        composite += expectedFan * 1.4
      } else if (routeState.phase === 'OBSERVE' && routeState.current === 'MENQING_SPEED') {
        composite += (effective - currentEffective) * 0.4
      } else if (shanten === 1) {
        composite += effective * (routeMetricPolicy.tingQuality * 0.03)
        composite += estimateRouteExpectedFan(afterRouteState, player, game, Math.max(4, effective / 2)) * 0.9
      }
    }

    if (useRoutePlanner) {
      if (
        composite > bestComposite + 0.001 ||
        (Math.abs(composite - bestComposite) <= 0.001 && shanten < bestShanten) ||
        (Math.abs(composite - bestComposite) <= 0.001 && shanten === bestShanten && effective > bestEffective)
      ) {
        bestComposite = composite
        bestShanten = shanten
        bestEffective = effective
        bestScore = score
        bestTingValue = timingValue
        bestTile = tile
      }
    } else if (!legacyDiscardPathDisabled && (
      shanten < bestShanten ||
      (shanten === 0 && bestShanten === 0 && timingValue > bestTingValue + 0.001) ||
      (shanten === bestShanten && effective > bestEffective) ||
      (shanten === bestShanten && effective === bestEffective && score > bestScore)
    )) {
      bestShanten = shanten
      bestEffective = effective
      bestScore = score
      bestTingValue = timingValue
      bestTile = tile
    }
  }

  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState)
  }

  return bestTile.id
}

export function selectBotChowTileIds(
  player: Player,
  game: GameState,
  claimTile: Tile,
  chowOptions?: string[][]
): string[] | undefined {
  if (!chowOptions?.length) return undefined

  const hand = player.hand.concealedTiles
  const exposedCount = player.hand.exposedMelds.length
  const wildChecker = (tile: Tile) => isWildTile(tile, game)
  const wallRemaining = game.wall?.length || 0
  const tableThreat = estimateTableThreat(game, player.id)
  const useRoutePlanner = usesOfficialRouteStrategy(player.name)

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

  const passShanten = calculateShanten(hand, exposedCount, wildChecker)
  const passEffective = countEffectiveTiles(hand, exposedCount, wildChecker)
  const routeState = useRoutePlanner
    ? evaluateRouteState({
        game,
        player,
        hand,
        shanten: passShanten,
        effectiveTiles: passEffective,
        tableThreat,
        wallRemaining,
        previousRouteState: getPlayerRouteMemory(player),
      })
    : null

  let best: { tileIds: string[]; shanten: number; effective: number; tune: number } | null = null

  for (const option of chowOptions) {
    const optionIds = option.filter(id => id !== claimTile.id)
    const removeIds = [...optionIds]
    const candidateHand = hand.filter(tile => {
      const idx = removeIds.indexOf(tile.id)
      if (idx === -1) return true
      removeIds.splice(idx, 1)
      return false
    })
    if (candidateHand.length === 0) continue

    const { shanten, effective } = evaluateResultingHand(candidateHand)
    let tune = evaluateChowValue(player, game, claimTile)

    if (useRoutePlanner && routeState) {
      const routeDecision = evaluateRouteClaim({
        action: ActionType.CHOW,
        player,
        game,
        claimTile,
        routeState,
        candidateHand,
        candidateShanten: shanten,
        candidateEffective: effective,
        passShanten,
        passEffective,
        tableThreat,
        wallRemaining,
      })
      if (!routeDecision.allowed) continue
      tune += routeDecision.tuneDelta
    }

    if (
      !best ||
      shanten < best.shanten ||
      (shanten === best.shanten && effective > best.effective) ||
      (shanten === best.shanten && effective === best.effective && tune > best.tune)
    ) {
      best = { tileIds: optionIds, shanten, effective, tune }
    }
  }

  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState)
  }

  return best?.tileIds
}

/**
 * Count how many tiles from the remaining wall would complete the hand (听牌总张数).
 * Tests each tile type (4 suits × 9 values + honors) against the player's concealed tiles.
 */
function countWinningTilesForHand(hand: Tile[], exposedCount: number, game: GameState): number {
  if (hand.length === 0) return 0

  const wildTileId = game.customScoringMode || null
  let count = 0

  // Test all 34 standard tile types (万/条/筒 1-9 × 3 + 风 4 + 箭 3)
  const suits: TileSuit[] = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) {
      const testTile: Tile = { suit, value: v, id: `test-${suit}-${v}` }
      const testHand = [...hand, testTile]
      const result = canWin(testHand, exposedCount, wildTileId)
      if (result.canWin) {
        const inHand = hand.filter(t => t.suit === suit && t.value === v).length
        const visible = countVisibleCopies(testTile, game)
        count += Math.max(0, 4 - inHand - visible)
      }
    }
  }
  // Wind tiles (东南西北)
  for (let v = 1; v <= 4; v++) {
    const testTile: Tile = { suit: TileSuit.WIND, value: v, id: `test-wind-${v}` }
    const testHand = [...hand, testTile]
    const result = canWin(testHand, exposedCount, wildTileId)
    if (result.canWin) {
      const inHand = hand.filter(t => t.suit === TileSuit.WIND && t.value === v).length
      count += Math.max(0, 4 - inHand - countVisibleCopies(testTile, game))
    }
  }
  // Dragon tiles (中发白)
  for (let v = 1; v <= 3; v++) {
    const testTile: Tile = { suit: TileSuit.DRAGON, value: v, id: `test-dragon-${v}` }
    const testHand = [...hand, testTile]
    const result = canWin(testHand, exposedCount, wildTileId)
    if (result.canWin) {
      const inHand = hand.filter(t => t.suit === TileSuit.DRAGON && t.value === v).length
      count += Math.max(0, 4 - inHand - countVisibleCopies(testTile, game))
    }
  }

  if (wildTileId?.startsWith(`${TileSuit.FLOWER}-`) && Array.isArray(game.wildTileGroup)) {
    for (const valueText of game.wildTileGroup) {
      const v = parseInt(valueText, 10)
      if (Number.isNaN(v) || v < 1 || v > 8) continue
      const testTile: Tile = { suit: TileSuit.FLOWER, value: v, id: `test-flower-${v}`, isFlower: true }
      const testHand = [...hand, testTile]
      const result = canWin(testHand, exposedCount, wildTileId)
      if (result.canWin) {
        const inHand = hand.filter(t => t.suit === TileSuit.FLOWER && t.value === v).length
        count += Math.max(0, 1 - inHand - countVisibleCopies(testTile, game))
      }
    }
  }

  return count
}

function countWinningTiles(player: Player, game: GameState): number {
  return countWinningTilesForHand(player.hand.concealedTiles, player.hand.exposedMelds.length, game)
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
  const routeMetricPolicy = getLiveRouteMetricPolicy(policy)
  const meldCount = player.hand.exposedMelds.length
  const effectiveGlobalMultiplier = Math.min(
    ((game as any).inheritMultiplier ?? (game as any).inheritedGlobalMultiplier ?? 1) *
    ((game as any).roundMultiplier ?? 1),
    8
  )
  const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
  const wildCount = hand.filter(t => isWildTile(t, game)).length
  const numberSuitCounts = getNumberSuitCounts(hand)
  const longestSuitEntry = numberSuitCounts[0] || null
  const shortestSuitEntry = numberSuitCounts[numberSuitCounts.length - 1] || null

  if (player.isTing) return 0

  // === 基础分 ===
  let score = policy.chowChance

  // === A. 门清执念 menqingKeepBonus ===
  //    menqingKeepBonus 越大 → 门清时吃牌惩罚越重 → 越不愿吃
  //    公式：惩罚 = menqingKeepBonus × 0.5，上限 0.6（留 0.4 最低分）
  if (meldCount === 0) {
    const menqingPenalty = Math.min(0.6, (policy.menqingKeepBonus || 0) * 0.5)
    const multiplierPush = effectiveGlobalMultiplier >= 4 ? 0.22 + (effectiveGlobalMultiplier - 4) * 0.04 : 0
    const noWildPush = wildCount === 0 ? 0.18 : 0
    const multiWildHold = wildCount >= 2 ? 0.16 : 0
    score -= Math.max(0.12, menqingPenalty - multiplierPush - noWildPush + multiWildHold)
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
  const visibleCopies = countVisibleCopies(chowTile, game)
  const remainingClaimCopies = Math.max(0, 4 - visibleCopies)
  const isShortestSuit = shortestSuitEntry?.suit === suit
  const suitGap = Math.max(0, (longestSuitEntry?.count || 0) - (shortestSuitEntry?.count || 0))
  const shortSuitGapTrap = isShortestSuit && suitGap >= 4 && (longestSuitEntry?.count || 0) >= 6
  const strongMenqingHold = meldCount === 0 && wildCount >= 2
  const pairHeavyPungsHold = estimatedRound <= 5 && countPairs(hand) >= 4
  const middleWaitShape = hasLeft && hasRight
  const overdueMenqingHold =
    meldCount === 0 &&
    estimatedRound > routeMetricPolicy.menqingHoldTurns &&
    wildCount <= 1

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
  if (shortSuitGapTrap) {
    score -= pairHeavyPungsHold ? 0.35 : 0.7
    if (middleWaitShape) score -= 0.25
  } else if (middleWaitShape && !strongMenqingHold) {
    score += 0.28
    if (remainingClaimCopies <= 1) score += 0.18
  }

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
  const upstream = game.players[(player.position + 3) % game.players.length]
  const upstreamDiscards = (upstream?.hand.discardedTiles || []).filter(discard => discard.suit === suit)
  const upstreamRejectedSuit = upstreamDiscards.some((discard, index) =>
    discard.suit === suit && upstreamDiscards[index + 1]?.suit === suit
  )

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

  if (wildCount === 0) {
    score += 0.18
  } else if (wildCount >= 2) {
    score -= 0.12
  } else if (wildCount === 1 && dominantSuit === suit && dominantCount >= 6) {
    score += 0.12
  }

  if (effectiveGlobalMultiplier >= 4) {
    score += 0.18 + (effectiveGlobalMultiplier - 4) * 0.05
  }

  if (remainingClaimCopies <= 1 && !strongMenqingHold && !shortSuitGapTrap) {
    score += 0.16
  }

  if (overdueMenqingHold && !shortSuitGapTrap) {
    score += 0.12 + routeMetricPolicy.forcedOpenRate * 0.2
  }

  if (upstreamRejectedSuit && dominantCount >= 6) {
    score += 0.22
  }

  if (estimatedRound <= 5 && countPairs(hand) >= 4) {
    score -= 0.16
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
  const routeMetricPolicy = getLiveRouteMetricPolicy(policy)
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
        if (ranked[0]?.action === ActionType.HU) {
          return shouldDeclineLowValueHu(game, player) ? ActionType.PASS : ActionType.HU
        }
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
    const isSelfDraw = !claimTile

    // 自摸：有 selfWinChance 控制意愿
    if (isSelfDraw) {
      const selfWinProb = policy.selfWinChance ?? 0.95
      if (Math.random() < selfWinProb) {
        return ActionType.HU
      }
    }

    // 放冲（捉冲）
    const pendingDiscard =
      game.pendingActions.find(pa => pa.type === 'discard' && pa.playerId === player.id) ||
      game.pendingActions.find(pa => pa.type === 'discard' && pa.playerId !== player.id)
    if (pendingDiscard) {
      const discardTile = (pendingDiscard as any).tile as Tile | undefined
      const isWildDiscard = discardTile ? isWildTile(discardTile, game) : false
      const isMenQing = exposedCount === 0
      const wildCount = hand.filter(t => isWildTile(t, game)).length
      if (shouldDeclineLowValueHu(game, player)) {
        return ActionType.PASS
      }

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
      if (wildCount >= 2 && (policy.bao2ClaimPenalty ?? 0) > 0) {
        const penalty = Math.max(0, 1.0 - (policy.bao2ClaimPenalty ?? 0))
        if (Math.random() >= penalty) return ActionType.PASS
      }

      // 三宝避免：wildCount >= 3 时按概率减少冲
      if (wildCount >= 3 && (policy.bao3AvoidThreshold ?? 0) > 0) {
        const avoidProb = Math.min(0.9, (policy.bao3AvoidThreshold ?? 0) * 0.9)
        if (Math.random() < avoidProb) return ActionType.PASS
      }

      const discardHuProb = Math.max(0, Math.min(1, policy.discardHuChance ?? 1))
      return Math.random() < discardHuProb ? ActionType.HU : ActionType.PASS
    }

    return ActionType.HU
  }

  if (!claimTile) return ActionType.PASS

  const wildChecker = (t: Tile) => isWildTile(t, game)
  const exclusionState = game.chowPongExclusion?.[player.id] || { firstActionSuit: null, firstActionType: null }
  const useRoutePlanner = usesOfficialRouteStrategy(player.name)
  const wallRemaining = game.wall?.length || 0
  const tableThreat = estimateTableThreat(game, player.id)
  const suitCounts: Record<string, number> = {}
  for (const tile of hand) {
    if (tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS) {
      suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1
    }
  }

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

  const passEval = actionScores.get(ActionType.PASS)!
  const routeState = useRoutePlanner
    ? evaluateRouteState({
        game,
        player,
        hand,
        shanten: passEval.shanten,
        effectiveTiles: passEval.effective,
        tableThreat,
        wallRemaining,
        previousRouteState: getPlayerRouteMemory(player),
        policy,
      })
    : null

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
        const candidateRouteState = useRoutePlanner
          ? evaluateRouteState({
              game,
              player,
              hand: candidateHand,
              shanten,
              effectiveTiles: effective,
              tableThreat,
              wallRemaining,
              previousRouteState: routeState,
              policy,
            })
          : routeState
        let pengTune = policy.pengChance || 0
        const pairCount = countPairs(hand)
        const wildCount = hand.filter(t => isWildTile(t, game)).length
        const effectiveGlobalMultiplier = Math.min(
          ((game as any).inheritMultiplier ?? (game as any).inheritedGlobalMultiplier ?? 1) *
          ((game as any).roundMultiplier ?? 1),
          8
        )
        const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)
        const longestSuitEntry = getNumberSuitCounts(hand)[0] || null
        const upstream = game.players[(player.position + 3) % game.players.length]
        const upstreamDiscardedSameSuit = isNumberTile(claimTile)
          ? (upstream?.hand.discardedTiles || []).filter(discard => discard.suit === claimTile.suit)
          : []
        const visibleCopies = countVisibleCopies(claimTile, game)
        const remainingClaimCopies = Math.max(0, 4 - visibleCopies - sameTiles.length)
        const upstreamRejectedSuit =
          isNumberTile(claimTile) &&
          upstreamDiscardedSameSuit.some((discard, index) => discard.suit === claimTile.suit && upstreamDiscardedSameSuit[index + 1]?.suit === claimTile.suit)
        const pairHeavyOpenPush = estimatedRound <= 5 && pairCount >= 4
        const strongMenqingHold =
          exposedCount === 0 &&
          wildCount >= 2 &&
          passEval.shanten <= 2 &&
          passEval.effective >= 14
        const overdueMenqingHold =
          exposedCount === 0 &&
          estimatedRound > routeMetricPolicy.menqingHoldTurns &&
          wildCount <= 1
        const deadHandPressure =
          passEval.shanten >= 2 &&
          passEval.effective <= 10 &&
          pairCount + (longestSuitEntry?.count || 0) <= 9

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

        if (wildCount === 0) {
          pengTune += 0.2
        } else if (wildCount >= 2 && meldCount === 0) {
          pengTune -= 0.08
        }

        if (effectiveGlobalMultiplier >= 4) {
          pengTune += 0.18 + (effectiveGlobalMultiplier - 4) * 0.06
        }

        if (
          upstreamRejectedSuit &&
          longestSuitEntry &&
          longestSuitEntry.suit === claimTile.suit &&
          longestSuitEntry.count >= 6
        ) {
          pengTune += 0.24
        }

        if (pairHeavyOpenPush) {
          pengTune += 0.55
        }

        if (remainingClaimCopies <= 1 && !strongMenqingHold) {
          pengTune += 0.72 + (pairHeavyOpenPush ? 0.2 : 0)
        }

        if (overdueMenqingHold) {
          pengTune += 0.16 + routeMetricPolicy.forcedOpenRate * 0.35
        }

        if (deadHandPressure) {
          pengTune += 0.12 + routeMetricPolicy.deadHandRate * 0.3
        }

        // === 对手听牌检测（oppTingDetection > 0 → 减少碰牌）===
        if (shanten <= 1 && candidateRouteState) {
          const winningTilesAfterClaim = shanten === 0
            ? countWinningTilesForHand(candidateHand, exposedCount + 1, game)
            : 0
          pengTune += estimateNearTingDecisionValue({
            routeState: candidateRouteState,
            player,
            game,
            shanten,
            effective,
            winningTiles: winningTilesAfterClaim,
            tableThreat,
            scoreLead,
          }) * (0.06 + routeMetricPolicy.tingQuality * 0.006)
        }

        if ((policy.oppTingDetection || 0) > 0 && (game as any).opponentTingIndicator) {
          pengTune *= Math.max(0, 1.0 - (policy.oppTingDetection || 0) * 0.8)
        }

        let pengBlockedByRoute = false
        if (useRoutePlanner && routeState) {
          const routeDecision = evaluateRouteClaim({
            action: ActionType.PENG,
            player,
            game,
            claimTile,
            routeState,
            candidateHand,
            candidateShanten: shanten,
            candidateEffective: effective,
            passShanten: passEval.shanten,
            passEffective: passEval.effective,
            tableThreat,
            wallRemaining,
          })
          pengBlockedByRoute = !routeDecision.allowed
          pengTune = routeDecision.allowed ? pengTune + routeDecision.tuneDelta : 0.01
        }

        if (!pengBlockedByRoute) {
          pengTune = Math.max(0.05, pengTune)
          actionScores.set(ActionType.PENG, { shanten, effective, tune: pengTune })
        }
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
        let kongTune = policy.minkanAggression ?? policy.kongChance ?? 0

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
        let kongBlockedByRoute = false
        if (useRoutePlanner && routeState) {
          const routeDecision = evaluateRouteClaim({
            action: ActionType.KONG,
            player,
            game,
            claimTile,
            routeState,
            candidateHand,
            candidateShanten: shanten,
            candidateEffective: effective,
            passShanten: passEval.shanten,
            passEffective: passEval.effective,
            tableThreat,
            wallRemaining,
          })
          kongBlockedByRoute = !routeDecision.allowed
          kongTune = routeDecision.allowed ? kongTune + routeDecision.tuneDelta : 0.01
        }

        if (!kongBlockedByRoute) {
          kongTune = Math.max(0.05, Math.min(2.0, kongTune))
          actionScores.set(ActionType.KONG, { shanten, effective, tune: kongTune })
        }
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

    let bestChow: { shanten: number; effective: number; tune: number; candidateHand: Tile[] } | null = null

    for (const [a, b] of chowPatterns) {
      if (a < 1 || b > 9) continue

      const idxA = hand.findIndex(t => t.suit === suit && t.value === a)
      const idxB = hand.findIndex((t, i) => i !== idxA && t.suit === suit && t.value === b)
      if (idxA === -1 || idxB === -1) continue

      const candidateHand = hand.filter((_, i) => i !== idxA && i !== idxB)
      if (candidateHand.length === 0) continue

      const { shanten, effective } = evaluateResultingHand(candidateHand)
      const chowTune = evaluateChowValue(player, game, claimTile)
      const candidate = { shanten, effective, tune: chowTune, candidateHand }

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
      const candidateRouteState = useRoutePlanner
        ? evaluateRouteState({
            game,
            player,
            hand: bestChow.candidateHand,
            shanten: bestChow.shanten,
            effectiveTiles: bestChow.effective,
            tableThreat,
            wallRemaining,
            previousRouteState: routeState,
            policy,
          })
        : routeState
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

      let chowBlockedByRoute = false
      if (useRoutePlanner && routeState) {
        const routeDecision = evaluateRouteClaim({
          action: ActionType.CHOW,
          player,
          game,
          claimTile,
          routeState,
          candidateHand: bestChow.candidateHand,
          candidateShanten: bestChow.shanten,
          candidateEffective: bestChow.effective,
          passShanten: passEval.shanten,
          passEffective: passEval.effective,
          tableThreat,
          wallRemaining,
        })
        chowBlockedByRoute = !routeDecision.allowed
        bestChow.tune = routeDecision.allowed ? bestChow.tune + routeDecision.tuneDelta : 0.01
      }

      if (!chowBlockedByRoute) {
        if (bestChow.shanten <= 1 && candidateRouteState) {
          const winningTilesAfterClaim = bestChow.shanten === 0
            ? countWinningTilesForHand(bestChow.candidateHand, exposedCount + 1, game)
            : 0
          bestChow.tune += estimateNearTingDecisionValue({
            routeState: candidateRouteState,
            player,
            game,
            shanten: bestChow.shanten,
            effective: bestChow.effective,
            winningTiles: winningTilesAfterClaim,
            tableThreat,
            scoreLead,
          }) * (0.055 + routeMetricPolicy.tingQuality * 0.005)
        }
        bestChow.tune = Math.max(0.05, bestChow.tune)
        actionScores.set(ActionType.CHOW, {
          shanten: bestChow.shanten,
          effective: bestChow.effective,
          tune: bestChow.tune,
        })
      }
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
    if (!softScoreWins(s, best, baseChances[action] ?? 0.5, 0.75)) continue
    bestAction = action
    best = s
  }

  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState)
  }

  return bestAction
}
