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
  if (isHonor(tile)) {
    if (sameTypeCount >= 2) {
      // Honor pair: keep (low score)
      score -= policy.pairWeight * pairWeightFactor * policy.honorPairBonus
    } else {
      // Single honor: high to discard (good candidate to throw away)
      score += 5
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

  // === 5. Edge tiles (1, 9): slightly less valuable than middle ===
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    if (tile.value === 1 || tile.value === 9) {
      score += 0.5
    }
  }

  return score
}

/**
 * 计算向听数（0=听牌，1=一向听，2=二向听...）
 */
function calculateShanten(
  tiles: Tile[],
  exposedCount: number,
  isWildTileChecker: (tile: Tile) => boolean
): number {
  const currentLen = tiles.length
  const expectedWinLen = 14 - exposedCount * 3
  const needDraws = Math.max(0, expectedWinLen - currentLen)

  const maxAdditional = 8
  for (let drawCount = needDraws; drawCount <= maxAdditional; drawCount++) {
    if (drawCount === 0) {
      if (canWin(tiles, exposedCount, isWildTileChecker).canWin) return 0
      continue
    }

    const placeholders: Tile[] = []
    for (let i = 0; i < drawCount; i++) {
      placeholders.push({
        suit: TileSuit.DOTS,
        value: 1,
        id: `shanten-ph-${i}`,
      })
    }

    if (canWin([...tiles, ...placeholders], exposedCount, isWildTileChecker).canWin) {
      return drawCount - 1
    }
  }

  return 8
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
  const pendingAction = game.pendingActions.find(pa => pa.playerId === player.id)
  const claimTile = pendingAction?.tile

  // HU 仍然最高优先级（可胡直接胡）
  if (availableActions.includes(ActionType.HU)) {
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
        actionScores.set(ActionType.PENG, { shanten, effective, tune: policy.pengChance || 0 })
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
        actionScores.set(ActionType.KONG, { shanten, effective, tune: policy.kongChance || 0 })
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
      actionScores.set(ActionType.CHOW, bestChow)
    }
  }

  // 比较：先看向听，再看有效进张，最后用策略概率微调（tie-break）
  let bestAction = ActionType.PASS
  let best = actionScores.get(ActionType.PASS)!

  for (const [action, s] of actionScores.entries()) {
    if (
      s.shanten < best.shanten ||
      (s.shanten === best.shanten && s.effective > best.effective) ||
      (s.shanten === best.shanten && s.effective === best.effective && s.tune > best.tune)
    ) {
      bestAction = action
      best = s
    }
  }

  return bestAction
}
