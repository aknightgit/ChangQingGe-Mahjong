/**
 * BotService — AI Bot that plays for computer players
 * Uses training/best-policy.json heuristic scoring to decide which tile to discard.
 */
import { GameState, Player, Tile, TileSuit, MeldType, PlayerStatus, ActionType } from '../types/game'
import { groupTiles, tilesEqual, isFlower, isHonor, isWind, isDragon } from '../utils/tiles'
import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, ChowPongExclusionState } from '../utils/handValidator'
import fs from 'fs'
import path from 'path'

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
        wildKeepPenalty: 1000,
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
  const routeBiasFactor = isEarlyPhase ? 0.35 : (isMidPhase ? 0.75 : 1.0)

  const groups = groupTiles(hand)
  const tileKey = `${tile.suit}-${tile.value}`
  const sameTypeCount = groups.get(tileKey)?.length || 0

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

  // === 1. Wild tile: very bad to discard (low score) ===
  if (isWildTile(tile, game)) {
    score -= policy.wildKeepPenalty
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
function calculateShanten(
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

/**
 * 计算有效进张数：加入一张后能使向听数下降的牌总剩余张数
 */
function countEffectiveTiles(
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

  // === A. 门清执念 menqingKeepBonus（替代硬编码0.85）===
  //    menqingKeepBonus 越大 → 门清时吃牌惩罚越重
  //    公式：惩罚 = menqingKeepBonus × 0.25，上限 0.7（留 0.3 最低分）
  if (meldCount === 0) {
    const menqingPenalty = Math.min(0.7, (policy.menqingKeepBonus || 0) * 0.25)
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
  const dominantSuit = total > 0
    ? Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0]?.[0] : null
  : null
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
export function shouldClaimPendingAction(
  player: Player,
  availableActions: ActionType[],
  game: GameState
): ActionType {
  const policy = getPolicyForPlayer(player)
  const hand = player.hand.concealedTiles
  const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
  const claimTile = pendingAction?.tile

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
  const exposedCount = player.hand.exposedMelds.length
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
        // 门清时额外惩罚：比 evaluateChowValue 的基础惩罚更强
        if (meldCount === 0 && (policy.menqingKeepBonus || 0) > 0) {
          bestChow.tune -= Math.min(0.3, (policy.menqingKeepBonus || 0) * 0.25)
        }

        // allPungsPursuit：碰碰胡追求 → 抑制吃顺
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

  // 比较：向听 > 有效进张 > 策略参数（tune）
  // 关键：tune 乘以 10 纳入主要比较，而非只在 tie-break 时用
  // tune 乘 10：确保相同 shanten/effective 时，策略参数能扭转结果
  // 修复：PASS 的 effective 不参与比较（摸牌不改变手牌）；
  //       KONG/PENG/CHOW 用"进张收益"(action后effective - current effective)参与比较
  let bestAction = ActionType.PASS
  let best = actionScores.get(ActionType.PASS)!
  const currentShanten = best.shanten // PASS 的 shanten = 当前手牌向听
  const currentEffective = best.effective // PASS 的 effective = 当前手牌进张

  for (const [action, s] of actionScores.entries()) {
    if (action === ActionType.PASS) continue
    // 进张收益：行动后 effective 相比当前增加多少
    const effectiveGain = s.effective - currentEffective
    // 综合分 = shanten优先 + 进张增益 + tune权重放大10倍
    const actionScore = -s.shanten * 1000 + effectiveGain * 10 + s.tune * 10
    // bestScoreVal 必须是完整的评分公式（包含best自己的shanten和effectiveGain）
    const bestEffectiveGain = best.effective - currentEffective
    const bestScoreVal = -best.shanten * 1000 + bestEffectiveGain * 10 + best.tune * 10
    if (actionScore > bestScoreVal) {
      bestAction = action
      best = s
    }
  }

  return bestAction
}
