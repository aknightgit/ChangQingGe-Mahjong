/**
 * BotService — AI Bot that plays for computer players
 * Uses training/best-policy.json heuristic scoring to decide which tile to discard.
 */
import { GameState, Player, Tile, TileSuit, MeldType, PlayerStatus, ActionType } from '../types/game'
import { groupTiles, tilesEqual, isFlower, isHonor, isWind, isDragon } from '../utils/tiles'

// ===== Policy loading =====
let _policy: any = null

function getPolicy(): any {
  if (_policy) return _policy
  try {
    // Try loading from training directory
    const fs = require('fs')
    const path = require('path')
    const policyPath = path.resolve(__dirname, '../../training/best-policy.json')
    const raw = fs.readFileSync(policyPath, 'utf-8')
    const data = JSON.parse(raw)
    _policy = data.policy || data
    console.log('[BotService] Loaded policy:', _policy.id || 'unknown')
  } catch (err) {
    console.warn('[BotService] Failed to load policy, using defaults')
    _policy = {
      id: 'default',
      selfWinChance: 0.95,
      discardHuChance: 0.7,
      discardHuWildPenalty: 0.3,
      discardHuMenQingPenalty: 0.1,
      pengChance: 0.6,
      kongChance: 0.5,
      chowChance: 0.6,
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
  }
  return _policy
}

/**
 * Is this player a bot (computer)?
 */
// AI Bot 名单（PvE 模式自动加入的机器人）
const BOT_NAMES = ['小胖', '老赵', '阿水', '电脑']

export function isBotPlayer(player: Player): boolean {
  return BOT_NAMES.some(botName => player.name.startsWith(botName))
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
function scoreTileForDiscard(tile: Tile, hand: Tile[], game: GameState): number {
  const policy = getPolicy()
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
    const score = scoreTileForDiscard(tile, hand, game)
    if (score > bestScore) {
      bestScore = score
      bestTile = tile
    }
  }

  return bestTile.id
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
  const policy = getPolicy()

  // Always take HU if available
  if (availableActions.includes(ActionType.HU)) return ActionType.HU

  // KONG: usually take
  if (availableActions.includes(ActionType.KONG) && Math.random() < policy.kongChance) {
    return ActionType.KONG
  }

  // PENG: take based on policy
  if (availableActions.includes(ActionType.PENG) && Math.random() < policy.pengChance) {
    return ActionType.PENG
  }

  // CHOW: take based on policy
  if (availableActions.includes(ActionType.CHOW) && Math.random() < policy.chowChance) {
    return ActionType.CHOW
  }

  // Default: PASS
  return ActionType.PASS
}
