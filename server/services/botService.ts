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
  const numberSuits = [TileSuit.WAN, TileSuit.TIAO, TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
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
  if (isHonor(tile)) {
    if (sameTypeCount >= 2) {
      // Honor pair: keep (low score)
      score -= policy.pairWeight * policy.honorPairBonus
    } else {
      // Single honor: high to discard (good candidate to throw away)
      score += 5
    }
    return score
  }

  // === 3. Number tiles: check for pairs, triplets, sequences ===

  // Pair or triplet: keep (low score)
  if (sameTypeCount >= 3) {
    score -= policy.tripletKeepBonus * 3 // triplet: very valuable, hard to discard
  } else if (sameTypeCount >= 2) {
    score -= policy.pairWeight // pair: keep
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
          score -= policy.nearWeight
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
      score += policy.dominantSuitBonus
    }
  }

  // === 4.1 清一色/混一色导向：某门数牌>=6，优先保留该门 ===
  if (dominantNumberSuit && dominantNumberSuitCount >= 6) {
    if (tile.suit === dominantNumberSuit) score -= 2.0
    else if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) score += 2.0
  }

  // === 4.2 风一色导向：风箭多时，保留风箭 ===
  if (honorFocus) {
    if (isWind(tile) || isDragon(tile)) score -= 2.0
    else if (tile.suit !== TileSuit.FLOWER) score += 2.0
  }

  // === 4.3 碰碰胡导向：保留对子/刻子，弱化顺子价值 ===
  if (sameTypeCount >= 2) score -= 1.0
  if (!isHonor(tile) && sameTypeCount < 2) {
    score += 0.6
  }

  // === 5. Edge tiles (1, 9): slightly less valuable than middle ===
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    if (tile.value === 1 || tile.value === 9) {
      score += 0.5
    }
  }

  return score
}

/**
 * Select the best tile to discard from the player's hand.
 * Returns the tile ID.
 */
export function selectDiscardTile(player: Player, game: GameState): string {
  const hand = player.hand.concealedTiles
  if (hand.length === 0) return ''

  const wildChecker = (t: Tile) => isWildTile(t, game)
  const exposedCount = player.hand.exposedMelds.length

  // ✅ 听牌最大化弃牌：当手牌是 14/11/8/5/2 张时，优先用精确分析
  const tingValidSizes = [14, 11, 8, 5, 2];
  if (tingValidSizes.includes(hand.length)) {
    const tingResult = findBestDiscardForTing(hand, exposedCount, wildChecker);
    if (tingResult.isTing && tingResult.discardTile) {
      // console.log(`[TingDiscard] ${player.name} 听牌最大化: 打 ${tingResult.discardTile.suit}-${tingResult.discardTile.value}, 听 ${tingResult.totalWinningCount} 张`);
      return tingResult.discardTile.id;
    }
  }

  // 回退到启发式打分
  let bestTile = hand[0]
  let bestScore = -Infinity

  for (const tile of hand) {
    const score = scoreTileForDiscard(tile, hand, game, player)
    if (score > bestScore) {
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
  const suits: TileSuit[] = [TileSuit.WAN, TileSuit.TIAO, TileSuit.DOTS]
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
function evaluateChowValue(
  player: Player,
  game: GameState,
  chowTile: Tile
): number {
  const hand = player.hand.concealedTiles
  const policy = getPolicyForPlayer(player)
  const meldCount = player.hand.exposedMelds.length

  // 已经听牌不再吃
  if (player.isTing) return 0

  // === 基础分：使用 policy 原始值 ===
  let score = policy.chowChance

  // === 门清意愿 ===
  if (meldCount === 0) {
    score *= 0.85
  }

  // === 面子数管理：限制瞎吃 ===
  if (meldCount >= 3) {
    score *= 0.3 // 已有3+面子，强烈不建议再吃（容易死牌）
  } else if (meldCount >= 2) {
    score *= 0.7
  }
  // meldCount 0-1: 不惩罚，鼓励吃

  // === 死牌检测：如果吃后手里只剩孤张，不吃 ===
  if (!isChowBeneficial(player, game, chowTile)) {
    score *= 0.2 // 吃了也是死牌，大幅降低
  }

  // === 吃牌类型价值排序 ===
  const v = chowTile.value
  const suit = chowTile.suit
  const groups = groupTiles(hand)

  const hasLeft = groups.has(`${suit}-${v - 1}`)
  const hasRight = groups.has(`${suit}-${v + 1}`)
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`)
  const hasRightRight = groups.has(`${suit}-${v + 2}`)

  if (hasLeft && hasRight) {
    // 夹张：手里有1+3，吃2 → 最有价值，直接完成面子
    score *= 2.0
  } else if (hasLeft && hasRightRight) {
    // 延伸搭子：手里有3+5，吃4 → 完成一个面子+保留延伸
    score *= 1.6
  } else if (hasRight && hasLeftLeft) {
    // 延伸搭子：手里有4+6，吃5
    score *= 1.6
  } else if ((hasLeft && v - 1 === 1) || (hasRight && v + 1 === 9)) {
    // 单边搭子：1+2吃3或7+8吃9
    score *= 1.3
  } else if (hasLeft || hasRight) {
    // 两面：手里有2+3吃1或4 → 保留灵活搭子
    score *= 1.0
  } else if (hasLeftLeft || hasRightRight) {
    // 间隔搭子：价值较低
    score *= 0.7
  }

  // === 百搭牌被吃了可惜 ===
  if (isWildTile(chowTile, game)) {
    score *= 0.5
  }

  // === 接近胡牌阶段：更积极吃 ===
  const tilesNeeded = 14 - hand.length - meldCount * 3 // 还差几张到14张
  if (tilesNeeded <= 2) {
    score *= 1.3 // 接近胡牌，积极吃牌加速
  }

  // === 听牌总张数不多 → 更积极吃牌冲胡 ===
  if (hand.length <= 6) {
    const winningCount = countWinningTiles(player, game)
    if (winningCount <= 8) {
      score *= 1.4 // 听牌张数少，吃牌搏一把
    }
  }

  return Math.max(0, Math.min(1, score))
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

  // === HU: 根据听牌张数决定是否强制胡 ===
  if (availableActions.includes(ActionType.HU)) {
    // 听牌总张数不多时，强制胡牌
    if (hand.length <= 7) {
      const winningCount = countWinningTiles(player, game)
      if (winningCount <= 12) {
        // 听牌张数少，不犹豫直接胡
        return ActionType.HU
      }
    }
    // 正常胡牌概率
    if (Math.random() < policy.selfWinChance) {
      return ActionType.HU
    }
  }

  // === KONG: 通常杠（加分） ===
  if (availableActions.includes(ActionType.KONG) && Math.random() < policy.kongChance) {
    return ActionType.KONG
  }

  // === PENG: 基于策略决定 ===
  if (availableActions.includes(ActionType.PENG)) {
    // 硬校验：吃碰排斥规则
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
    const exclusionState = game.chowPongExclusion?.[player.id] || { firstActionSuit: null, firstActionType: null }
    if (pendingAction?.tile) {
      if (!checkChowPongExclusion(exclusionState, 'pong', pendingAction.tile.suit)) {
        // 吃碰排斥：禁止碰
      } else if (hand.length <= 7 && Math.random() < policy.pengChance * 1.2) {
        return ActionType.PENG
      } else if (Math.random() < policy.pengChance) {
        return ActionType.PENG
      }
    }
  }

  // === CHOW: 智能评估 ===
  if (availableActions.includes(ActionType.CHOW)) {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
    // 硬校验：吃碰排斥规则
    const exclusionState = game.chowPongExclusion?.[player.id] || { firstActionSuit: null, firstActionType: null }
    if (pendingAction?.tile) {
      if (!checkChowPongExclusion(exclusionState, 'chow', pendingAction.tile.suit)) {
        // 吃碰排斥：禁止吃
      } else {
        const chowValue = evaluateChowValue(player, game, pendingAction.tile)
        // 改为概率决策：chowValue 越高越可能吃
        if (Math.random() < chowValue) {
          return ActionType.CHOW
        }
      }
    }
  }

  // Default: PASS
  return ActionType.PASS
}
