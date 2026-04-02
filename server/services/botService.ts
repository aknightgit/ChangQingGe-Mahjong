/**
 * BotService — AI Bot that plays for computer players
 * Uses training/best-policy.json heuristic scoring to decide which tile to discard.
 */
import { GameState, Player, Tile, TileSuit, MeldType, PlayerStatus, ActionType } from '../types/game'
import { groupTiles, tilesEqual, isFlower, isHonor, isWind, isDragon } from '../utils/tiles'
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
        chowChance: 0.4,
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
  const suitCounts: Record<string, number> = {}
  for (const t of hand) {
    if (t.suit === TileSuit.FLOWER) continue
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts))
  const dominantSuit = Object.keys(suitCounts).find(s => suitCounts[s] === maxSuitCount)
  if (dominantSuit && maxSuitCount >= policy.honorRushThreshold) {
    if (tile.suit !== dominantSuit && tile.suit !== TileSuit.FLOWER) {
      // Not in dominant suit: good to discard (boost score)
      score += policy.dominantSuitBonus
    }
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
  let score = policy.chowChance // Start with base policy chance

  // 1. 面子数惩罚：吃的越多，门清越差，胡牌难度越大
  const meldCount = player.hand.exposedMelds.length
  if (meldCount >= 3) {
    score *= 0.4 // 已有3+面子，再吃风险大
  } else if (meldCount >= 2) {
    score *= 0.7 // 2个面子，适度降低
  }
  if (meldCount === 0 && policy.bailoutHuPenaltyPerMeld > 0.05) {
    // 门清玩家，保守型不太想吃
    score *= (1 - policy.bailoutHuPenaltyPerMeld * 3)
  }

  // 2. 判断吃牌类型：夹张 > 单边 > 两面
  const v = chowTile.value
  const suit = chowTile.suit
  const groups = groupTiles(hand)

  const hasLeft = groups.has(`${suit}-${v - 1}`)
  const hasRight = groups.has(`${suit}-${v + 1}`)
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`)
  const hasRightRight = groups.has(`${suit}-${v + 2}`)

  if (hasLeft && hasRight) {
    // 夹张：手里有1+3，吃2 → 填补缺口，最有价值
    score *= 1.8
  } else if ((hasLeft && v - 1 === 1) || (hasRight && v + 1 === 9)) {
    // 单边：手里有1+2吃3，或7+8吃9 → 完成边搭，优先吃
    score *= 1.5
  } else if (hasLeft || hasRight) {
    // 两面：手里有2+3吃1或4 → 留下灵活搭子，不太想吃
    score *= 0.9
  } else if (hasLeftLeft || hasRightRight) {
    // 间隔搭子：价值较低
    score *= 0.7
  }

  // 3. 吃的牌是否是百搭
  if (isWildTile(chowTile, game)) {
    score *= (1 - (policy.chowWildPenalty || 0.1))
  }

  // 4. 做大牌风格：尽量不吃（保持门清）
  if (policy.chowChance < 0.1) {
    score *= 0.3 // 阿水型：极度不想吃
  }

  // 5. 进攻型风格：积极吃牌构建手牌
  if (policy.chowChance > 0.5) {
    score *= 1.3 // 老赵型：愿意吃
  }

  // 6. 如果已经听牌，不再吃
  if (player.isTing) {
    score = 0
  }

  return Math.max(0, Math.min(1, score))
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

  // Always take HU if available
  if (availableActions.includes(ActionType.HU)) return ActionType.HU

  // KONG: usually take (good for scoring)
  if (availableActions.includes(ActionType.KONG) && Math.random() < policy.kongChance) {
    return ActionType.KONG
  }

  // PENG: take based on policy
  if (availableActions.includes(ActionType.PENG) && Math.random() < policy.pengChance) {
    return ActionType.PENG
  }

  // CHOW: smart evaluation based on hand composition
  if (availableActions.includes(ActionType.CHOW)) {
    const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
    if (pendingAction?.tile) {
      const chowValue = evaluateChowValue(player, game, pendingAction.tile)
      if (Math.random() < chowValue) {
        return ActionType.CHOW
      }
    }
  }

  // Default: PASS
  return ActionType.PASS
}
