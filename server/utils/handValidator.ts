import { Tile, Meld, MeldType, WinType, TileSuit } from '../types/game';
import { sortTiles, groupTiles, isSequence, isTriplet, isPair, tilesEqual, 
         isFlower, isWind, isDragon, isHonor, getSuits, isFullFlush,
         getTileKey } from './tiles';

// Hand type enum for ChangQingGe rules
// 只保留有特殊点数的牌型
export enum HandType {
  ALL_TRIPLETS = 'all_triplets',   // 碰碰胡
  HALF_FLUSH = 'half_flush',       // 混一色
  HUN_PENG = 'hun_peng',           // 混碰 (混一色+碰碰胡)
  FULL_FLUSH = 'full_flush',       // 清一色
  QING_PENG = 'qing_peng',         // 清碰 (清一色+碰碰胡)
  ALL_WIND = 'all_wind',           // 风一色
  FENG_PENG = 'feng_peng',         // 风碰 (风一色+碰碰胡)
  EIGHT_FLOWERS = 'eight_flowers', // 八花自摸
  FOUR_WILD = 'four_wild',         // 四百搭
  DA_DIAO = 'da_diao'              // 大吊（手牌仅剩单张听牌）
}

// Hand type priority (higher = better, checked first)
export const HAND_TYPE_PRIORITY: Record<HandType, number> = {
  [HandType.FENG_PENG]: 100,
  [HandType.ALL_WIND]: 90,
  [HandType.QING_PENG]: 80,
  [HandType.HUN_PENG]: 75,
  [HandType.EIGHT_FLOWERS]: 70,
  [HandType.FULL_FLUSH]: 60,
  [HandType.FOUR_WILD]: 50,
  [HandType.DA_DIAO]: 85,   // 大吊优先级：仅低于风碰(100)和风一色(90)
  [HandType.HALF_FLUSH]: 40,
  [HandType.ALL_TRIPLETS]: 30
};

/**
 * Detect all hand types for a winning hand
 * Returns array of detected types sorted by priority (highest first)
 * Note: 普通胡（4面子1雀头）作为基础胡牌验证
 */
export type WildTileChecker = (tile: Tile) => boolean;

export function buildWildTileChecker(wildTileId: string | null, wildTileGroup?: string[]): WildTileChecker {
  if (!wildTileId) return () => false;
  const parts = wildTileId.split('-');
  if (parts.length < 2) return () => false;
  const wildSuit = parts[0] as TileSuit;
  const wildValue = parseInt(parts[1], 10);

  return (tile: Tile) => {
    if (tile.suit === wildSuit && tile.value === wildValue) return true;
    if (wildSuit === TileSuit.FLOWER && tile.suit === TileSuit.FLOWER && wildTileGroup) {
      return wildTileGroup.includes(String(tile.value));
    }
    return false;
  };
}

/**
 * Create a virtual hand with wild tiles replaced by assigned values.
 */
function makeVirtualHand(handTiles: Tile[], wildSuit: string, wildValue: number, assignments: Array<{suit: string, value: number}>): Tile[] {
  const nonWild = handTiles.filter(t => !(t.suit === wildSuit && t.value === wildValue))
  const virtualAssigned = assignments.map((a, i) => ({
    ...handTiles.find(t => t.suit === wildSuit && t.value === wildValue)!,
    id: `wild-virtual-${i}`,
    suit: a.suit as TileSuit,
    value: a.value,
    isWild: false
  }))
  return [...nonWild, ...virtualAssigned]
}

/**
 * Find the best wild tile assignment that maximizes hand type priority.
 * Priority: FENG_PENG > QING_PENG > HUN_PENG > ALL_WIND > FULL_FLUSH > HALF_FLUSH > ALL_TRIPLETS > DA_DIAO
 * Arrow triplets (中发白) get +2 fan, wind triplets get +1 fan.
 */
function findBestWildAssignment(
  handTiles: Tile[],
  exposedMelds: Meld[],
  wildSuit: string,
  wildValue: number,
  isSelfDrawn: boolean,
  flowerCount: number,
  wildTileGroup?: string[]
): { hand: Tile[]; types: HandType[] } {
  const wilds = handTiles.filter(t => t.suit === wildSuit && t.value === wildValue)
  const wildCount = wilds.length
  if (wildCount === 0) {
    return { hand: handTiles, types: detectHandTypesInternal(handTiles, exposedMelds, isSelfDrawn, flowerCount, null, wildTileGroup) }
  }

  const nonWild = handTiles.filter(t => !(t.suit === wildSuit && t.value === wildValue))
  const groups = groupTiles(nonWild)
  const isDragon = (t: Tile) => t.suit === TileSuit.DRAGON
  const isWind = (t: Tile) => t.suit === TileSuit.WIND

  // Generate candidate tiles to assign wilds to (sorted by priority)
  const candidates: Array<{suit: string, value: number, priority: number}> = []
  const seen = new Set<string>()

  for (const [, group] of groups) {
    if (group.length === 0) continue
    const tile = group[0]
    const key = `${tile.suit}-${tile.value}`
    if (seen.has(key)) continue
    seen.add(key)

    if (group.length === 1) {
      // Need 2 wilds for triplet
      const prio = isDragon(tile) ? 100 : isWind(tile) ? 90 : 50
      candidates.push({ suit: tile.suit, value: tile.value, priority: prio })
    } else if (group.length === 2) {
      // Need 1 wild for triplet
      const prio = isDragon(tile) ? 110 : isWind(tile) ? 100 : 60
      candidates.push({ suit: tile.suit, value: tile.value, priority: prio })
    }
    // group.length >= 3: already a triplet, don't assign wild here
  }

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority)

  // Try all valid assignments
  let bestResult = { hand: handTiles, types: [] as HandType[] }
  let bestScore = -1

  function tryAssignments(remaining: number, assignIdx: number, current: Array<{suit: string, value: number}>) {
    if (remaining === 0 || assignIdx >= candidates.length) {
      // Pad remaining with first candidate (duplicate assignment)
      while (current.length < wildCount && candidates.length > 0) {
        current.push({ suit: candidates[0].suit, value: candidates[0].value })
      }
      if (current.length < wildCount) return

      const vHand = makeVirtualHand(handTiles, wildSuit, wildValue, current)
      const types = detectHandTypesInternal(vHand, exposedMelds, isSelfDrawn, flowerCount, null, wildTileGroup)
      const score = scoreHandTypes(types)
      if (score > bestScore) {
        bestScore = score
        bestResult = { hand: vHand, types }
      }
      return
    }

    const c = candidates[assignIdx]
    // How many of this tile do we have in nonWild?
    const count = nonWild.filter(t => t.suit === c.suit && t.value === c.value).length
    const needed = Math.min(3 - count, remaining) // max wilds to assign to this tile

    for (let use = 0; use <= needed; use++) {
      const next = [...current]
      for (let i = 0; i < use; i++) next.push({ suit: c.suit, value: c.value })
      tryAssignments(remaining - use, assignIdx + 1, next)
    }
  }

  tryAssignments(wildCount, 0, [])
  return bestResult
}

function scoreHandTypes(types: HandType[]): number {
  // Higher = better
  const scores: Record<string, number> = {
    'feng_peng': 7,
    'qing_peng': 6,
    'hun_peng': 5,
    'all_wind': 4,
    'full_flush': 3,
    'half_flush': 2,
    'all_triplets': 1,
    'da_diao': 0,
    'eight_flowers': 0,
    'four_wild': 0,
  }
  let max = -1
  for (const t of types) {
    if ((scores[t] ?? -1) > max) max = scores[t] ?? -1
  }
  return max
}

/**
 * Internal detectHandTypes that works on already-substituted virtual hand (no wild tiles).
 */
function detectHandTypesInternal(
  handTiles: Tile[],
  exposedMelds: Meld[],
  isSelfDrawn: boolean,
  flowerCount: number,
  _wildTileId: string | null,
  wildTileGroup?: string[]
): HandType[] {
  const types: HandType[] = []
  const isWildTile = buildWildTileChecker(null, wildTileGroup)

  const allTiles = [
    ...handTiles,
    ...exposedMelds.flatMap(m => m.tiles)
  ]
  const nonFlowerTiles = allTiles.filter(t => !isFlower(t))

  // Check if standard win
  const winResult = canWin(handTiles, exposedMelds.length, isWildTile)
  if (!winResult.canWin) return []

  // All triplets (碰碰胡) - no wild tiles in virtual hand, use simple check
  if (isAllTripletsHandSimple(handTiles, exposedMelds)) {
    types.push(HandType.ALL_TRIPLETS)
  }

  // 风一色
  const isAllWindOrDragonTiles = nonFlowerTiles.every(t => isWind(t) || isDragon(t))
  if (isAllWindOrDragonTiles) {
    types.push(HandType.ALL_WIND)
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.FENG_PENG)
    }
  }

  // 清一色
  if (!types.includes(HandType.ALL_WIND) && isFullFlushHand(nonFlowerTiles)) {
    types.push(HandType.FULL_FLUSH)
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.QING_PENG)
    }
  }

  // 混一色
  if (!types.includes(HandType.FULL_FLUSH) && !types.includes(HandType.ALL_WIND) && isHalfFlushHand(nonFlowerTiles)) {
    types.push(HandType.HALF_FLUSH)
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.HUN_PENG)
    }
  }

  // 八花自摸
  if (isSelfDrawn && flowerCount >= 8) {
    types.push(HandType.EIGHT_FLOWERS)
  }

  // 大吊
  if (isDaDiao(handTiles, exposedMelds)) {
    types.push(HandType.DA_DIAO)
  }

  return types.sort((a, b) => HAND_TYPE_PRIORITY[b] - HAND_TYPE_PRIORITY[a])
}

/**
 * Simple all-triplets check for virtual hand (no wild tiles).
 */
function isAllTripletsHandSimple(handTiles: Tile[], exposedMelds: Meld[]): boolean {
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false
  }
  const nonFlower = handTiles.filter(t => !isFlower(t))
  const groups = groupTiles(nonFlower)
  let triplets = 0
  let pairs = 0
  for (const [, group] of groups) {
    if (group.length >= 3) triplets++
    else if (group.length === 2) pairs++
    else return false // single = not all triplets
  }
  const expectedTriplets = 4 - exposedMelds.length
  return triplets >= expectedTriplets && pairs >= 1
}

/**
 * 主入口：百搭最优替代 → 牌型判定
 */
export function detectHandTypes(
  handTiles: Tile[],
  exposedMelds: Meld[],
  isSelfDrawn: boolean,
  flowerCount: number,
  wildTileId: string | null,
  wildTileGroup?: string[]
): HandType[] {
  if (!wildTileId) {
    // No wild tile, use internal directly
    return detectHandTypesInternal(handTiles, exposedMelds, isSelfDrawn, flowerCount, null, wildTileGroup)
  }

  const [s, v] = wildTileId.split('-')
  if (!s || !v) return detectHandTypesInternal(handTiles, exposedMelds, isSelfDrawn, flowerCount, null, wildTileGroup)

  const wildSuit = s
  const wildValue = parseInt(v, 10)
  const wildCount = handTiles.filter(t => t.suit === wildSuit && t.value === wildValue).length

  if (wildCount === 0) {
    return detectHandTypesInternal(handTiles, exposedMelds, isSelfDrawn, flowerCount, wildTileId, wildTileGroup)
  }

  // Find best wild assignment, then detect types on virtual hand
  const best = findBestWildAssignment(handTiles, exposedMelds, wildSuit, wildValue, isSelfDrawn, flowerCount, wildTileGroup)
  return best.types
}

/**
 * Check if hand is all triplets (碰碰胡)
 * All exposed melds must be triplets/kongs, and concealed tiles must form triplets + 1 pair.
 * Wild tiles (百搭) can substitute for any tile to complete a triplet or pair.
 */
function isAllTripletsHand(handTiles: Tile[], exposedMelds: Meld[], wildSuit?: string, wildValue?: number): boolean {
  // Exposed melds must all be triplets or kongs
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false;
  }

  const nonFlowerTiles = handTiles.filter(t => !isFlower(t));
  const isWild = (t: Tile) => wildSuit !== undefined && t.suit === wildSuit && t.value === wildValue;
  const regularTiles = nonFlowerTiles.filter(t => !isWild(t));
  const wildCount = nonFlowerTiles.filter(t => isWild(t)).length;

  const groups = groupTiles(regularTiles);
  const expectedTriplets = 4 - exposedMelds.length;

  // Count how many natural triplets and pairs we have
  let naturalTriplets = 0;
  let naturalPairs = 0;
  let singles = 0;

  for (const [, group] of groups) {
    if (group.length >= 3) naturalTriplets++;
    else if (group.length === 2) naturalPairs++;
    else singles += group.length; // 1 or 4 (4th is a single for triplets)
  }

  // Try all valid wild allocations and pick the one with most triplets
  // Constraint: must end with exactly expectedTriplets triplets + at least 1 pair
  let bestTriplets = -1;

  // Strategy A: natural pair exists → fill singles with wilds first
  if (naturalPairs >= 1) {
    let w = wildCount;
    const fromSingles = Math.min(Math.floor(w / 2), singles);
    w -= fromSingles * 2;
    const fromWilds = Math.floor(w / 3);
    w -= fromWilds * 3;
    const total = naturalTriplets + fromSingles + fromWilds;
    if (total >= expectedTriplets) bestTriplets = total;
  }

  // Strategy B: no natural pair → try to form pair from leftover wilds
  // Fill singles (needs 2 wilds each), then check pair
  for (let fillCount = 0; fillCount <= Math.min(singles, Math.floor(wildCount / 2)); fillCount++) {
    let w = wildCount - fillCount * 2;
    // Form triplets from remaining wilds
    const fromWilds = Math.floor(w / 3);
    w -= fromWilds * 3;
    const total = naturalTriplets + fillCount + fromWilds;
    // Check if pair exists: natural pair, leftover wilds (>=2), or unfilled single
    const unfilledSingles = singles - fillCount;
    const hasPair = naturalPairs >= 1 || w >= 2 || unfilledSingles >= 1;
    if (total >= expectedTriplets && hasPair && total > bestTriplets) {
      bestTriplets = total;
    }
  }

  return bestTriplets >= expectedTriplets;
}

/**
 * Check if all tiles are same number suit (清一色)
 */
function isFullFlushHand(tiles: Tile[]): boolean {
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  if (nonFlowerTiles.length === 0) return false;
  
  const suits = getSuits(nonFlowerTiles);
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  
  // Must be exactly one number suit
  return suits.size === 1 && numberSuits.includes([...suits][0]);
}

/**
 * Check if tiles are one number suit + honors (混一色)
 * Called on virtual hand (wild tiles already substituted).
 */
function isHalfFlushHand(tiles: Tile[]): boolean {
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  if (nonFlowerTiles.length === 0) return false;

  const suits = getSuits(nonFlowerTiles);
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const honorSuits = [TileSuit.WIND, TileSuit.DRAGON];
  
  let hasNumberSuit = false;
  let numberSuitCount = 0;
  
  for (const suit of suits) {
    if (numberSuits.includes(suit)) {
      hasNumberSuit = true;
      numberSuitCount++;
    } else if (!honorSuits.includes(suit)) {
      return false; // Contains flower or other non-matching suit
    }
  }
  
  return hasNumberSuit && numberSuitCount === 1;
}

/**
 * 风一色: 纯风牌（不含箭牌）
 */
function isAllWindOnly(tiles: Tile[], wildTileId: string | null): boolean {
  let wildSuit: TileSuit | null = null;
  let wildValue: number | null = null;
  if (wildTileId) {
    const parts = wildTileId.split('-');
    if (parts.length >= 2) {
      wildSuit = parts[0] as TileSuit;
      wildValue = parseInt(parts[1]);
    }
  }
  return tiles.every(t => {
    if (t.suit === TileSuit.WIND) return true;
    if (wildSuit && t.suit === wildSuit && t.value === wildValue) return true;
    return false;
  });
}

/**
 * 风碰范围: 风牌+箭牌+百搭
 */
function isAllWindOrDragon(tiles: Tile[], isWildTile: WildTileChecker): boolean {
  return tiles.every(t => {
    if (t.suit === TileSuit.WIND) return true;
    if (t.suit === TileSuit.DRAGON) return true;
    if (isWildTile(t)) return true;
    return false;
  });
}

/**
 * Count wild tiles in hand
 */
function countWildTiles(tiles: Tile[], isWildTile: WildTileChecker): number {
  return tiles.filter(t => isWildTile(t)).length;
}

/**
 * 大吊判断：胡牌时，门口副露数 >= 3，且手牌仅剩2张且恰好是1对
 * （即胡牌前手里只有1张，胡来的那张凑成对 = 单吊胡牌）
 */
function isDaDiao(handTiles: Tile[], exposedMelds: Meld[]): boolean {
  if (exposedMelds.length < 1 || handTiles.length !== 2) return false;
  // 额外校验：2张必须是对子（相同的牌）
  return handTiles[0].suit === handTiles[1].suit && handTiles[0].value === handTiles[1].value;
}

/**
 * Check if a hand can win with standard pattern (4 melds + 1 pair)
 */
export function canWinStandard(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false, kongCount = 0): boolean {
  const requiredMelds = Math.max(0, 4 - existingMelds);
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  // 手牌张数校验（考虑杠牌4张 vs 普通副露3张）
  const normalMelds = existingMelds - kongCount
  const expectedHandSize = 14 - normalMelds * 3 - kongCount * 4
  if (nonFlowerTiles.length !== expectedHandSize) return false

  // Try each possible pair as the eyes (including 1 wild + 1 natural)
  const groups = groupTiles(nonFlowerTiles.filter(t => !isWildTile(t)));
  const wildTiles = nonFlowerTiles.filter(t => isWildTile(t));

  for (const [, candidateGroup] of groups) {
    if (candidateGroup.length >= 2) {
      const remainingTiles = [...nonFlowerTiles];
      const pairTile1 = candidateGroup[0];
      const pairTile2 = candidateGroup[1];

      const idx1 = remainingTiles.findIndex(t => t.id === pairTile1.id);
      if (idx1 >= 0) remainingTiles.splice(idx1, 1);
      const idx2 = remainingTiles.findIndex(t => t.id === pairTile2.id);
      if (idx2 >= 0) remainingTiles.splice(idx2, 1);

      if (canFormMelds(remainingTiles, requiredMelds, isWildTile)) {
        return true;
      }
    }

    // 1 natural + 1 wild as pair
    if (candidateGroup.length >= 1 && wildTiles.length >= 1) {
      const remainingTiles = [...nonFlowerTiles];
      const natural = candidateGroup[0];
      const wild = wildTiles[0];

      const idxN = remainingTiles.findIndex(t => t.id === natural.id);
      if (idxN >= 0) remainingTiles.splice(idxN, 1);
      const idxW = remainingTiles.findIndex(t => t.id === wild.id);
      if (idxW >= 0) remainingTiles.splice(idxW, 1);

      if (canFormMelds(remainingTiles, requiredMelds, isWildTile)) {
        return true;
      }
    }
  }

  // pair entirely from wilds
  if (wildTiles.length >= 2) {
    const remainingTiles = [...nonFlowerTiles];
    const idxW1 = remainingTiles.findIndex(t => t.id === wildTiles[0].id);
    if (idxW1 >= 0) remainingTiles.splice(idxW1, 1);
    const idxW2 = remainingTiles.findIndex(t => t.id === wildTiles[1].id);
    if (idxW2 >= 0) remainingTiles.splice(idxW2, 1);

    if (canFormMelds(remainingTiles, requiredMelds, isWildTile)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if tiles can form exactly n melds (sequences or triplets)
 * Uses value-count approach for correct backtracking
 */
function canFormMelds(tiles: Tile[], n: number, isWildTile: WildTileChecker): boolean {
  if (n === 0) return tiles.length === 0;
  if (tiles.length < n * 3) return false;

  const wildCount = tiles.filter(t => isWildTile(t)).length;
  const nonWild = tiles.filter(t => !isWildTile(t));

  // Build value-count map by suit (sorted by suit then value)
  const countMap = new Map<string, number>();
  for (const t of nonWild) {
    const key = `${t.suit}-${t.value}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }
  // Sort: number suits first (by suit name then value), then honor suits
  const sortedEntries = [...countMap.entries()].sort((a, b) => {
    const [suitA, valA] = [a[0].substring(0, a[0].indexOf('-')), parseInt(a[0].substring(a[0].indexOf('-') + 1))];
    const [suitB, valB] = [b[0].substring(0, b[0].indexOf('-')), parseInt(b[0].substring(b[0].indexOf('-') + 1))];
    const isNumA = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(suitA as TileSuit) ? 0 : 1;
    const isNumB = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(suitB as TileSuit) ? 0 : 1;
    if (isNumA !== isNumB) return isNumA - isNumB;
    if (suitA !== suitB) return suitA.localeCompare(suitB);
    return valA - valB;
  });
  const sortedMap = new Map(sortedEntries);

  function backtrack(remainingN: number, remainingWild: number, map: Map<string, number>): boolean {
    if (remainingN === 0) {
      // All non-wild tiles must be used
      for (const c of map.values()) if (c > 0) return false;
      return remainingWild === 0;
    }

    // Find first non-zero slot
    let minKey: string | null = null;
    let minSuit = '';
    let minValue = 0;
    for (const [k, c] of map) {
      if (c > 0) {
        minKey = k;
        const dashIdx = k.indexOf('-');
        minSuit = k.substring(0, dashIdx);
        minValue = parseInt(k.substring(dashIdx + 1));
        break;
      }
    }

    if (!minKey) {
      // All natural tiles used — remaining melds must come from wilds
      return remainingWild >= remainingN * 3 && backtrack(0, remainingWild - remainingN * 3, map);
    }

    // Option 1: triplet from minKey
    const cnt = map.get(minKey)!;
    const needTriplet = 3 - cnt;
    if (needTriplet <= remainingWild) {
      map.set(minKey, 0);
      if (backtrack(remainingN - 1, remainingWild - needTriplet, map)) return true;
      map.set(minKey, cnt);
    }

    // Option 2: sequence starting from minKey (number suits only)
    const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    if (numberSuits.includes(minSuit as TileSuit) && minValue <= 7) {
      const k2 = `${minSuit}-${minValue + 1}`;
      const k3 = `${minSuit}-${minValue + 2}`;
      const c2 = map.get(k2) || 0;
      const c3 = map.get(k3) || 0;
      const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);

      if (missing <= remainingWild) {
        const orig2 = c2, orig3 = c3;
        map.set(minKey, 0);
        if (c2 > 0) map.set(k2, c2 - 1);
        if (c3 > 0) map.set(k3, c3 - 1);
        if (backtrack(remainingN - 1, remainingWild - missing, map)) return true;
        // Undo
        map.set(minKey, cnt);
        if (c2 > 0) map.set(k2, orig2);
        if (c3 > 0) map.set(k3, orig3);
      }
    }

    // Option 3: use wild tiles for the first position
    // (count-0 slots with remaining wilds already handled above)

    return false;
  }

  return backtrack(n, wildCount, sortedMap);
}

/**
 * Check if hand can win (standard pattern: 4面子 + 1雀头)
 */
export function canWin(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false, kongCount = 0): { canWin: boolean; winType: WinType | null } {
  if (canWinStandard(tiles, existingMelds, isWildTile, kongCount)) {
    return { canWin: true, winType: WinType.STANDARD };
  }

  return { canWin: false, winType: null };
}

/**
 * Get all tiles that would complete a winning hand (listening tiles)
 */
export function getListeningTiles(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false): Tile[] {
  const expectedTileCount = 13 - existingMelds * 3;
  if (tiles.length !== expectedTileCount) return [];
  
  const listeningTiles: Tile[] = [];
  
  // Try adding each possible tile
  const allPossibleTiles: Array<{ suit: TileSuit; value: number }> = [];
  
  // Number suits
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 9; value++) {
      allPossibleTiles.push({ suit, value });
    }
  }
  
  // Wind tiles
  for (let value = 1; value <= 4; value++) {
    allPossibleTiles.push({ suit: TileSuit.WIND, value });
  }
  
  // Dragon tiles
  for (let value = 1; value <= 3; value++) {
    allPossibleTiles.push({ suit: TileSuit.DRAGON, value });
  }
  
  for (const { suit, value } of allPossibleTiles) {
    const testTile: Tile = { suit, value, id: 'test', isFlower: false };
    const testHand = [...tiles, testTile];
    
    if (canWin(testHand, existingMelds, isWildTile).canWin) {
      if (!listeningTiles.some(t => t.suit === suit && t.value === value)) {
        listeningTiles.push(testTile);
      }
    }
  }
  
  return listeningTiles;
}

/**
 * Check if a player is in "Ting" (listening/ready to win)
 */
export function isTing(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false): boolean {
  return getListeningTiles(tiles, existingMelds, isWildTile).length > 0;
}

/**
 * Extract melds from a winning hand (supports wild tiles and backtracking)
 */
export function extractMelds(tiles: Tile[], existingMelds: Meld[] = [], isWildTile: WildTileChecker = () => false): Meld[] | null {
  const nonFlower = tiles.filter(t => !isFlower(t));
  if (nonFlower.length !== 14 && nonFlower.length !== 11 && nonFlower.length !== 8 && nonFlower.length !== 5 && nonFlower.length !== 2) return null;

  // Try standard win
  const groups = groupTiles(nonFlower.filter(t => !isWildTile(t)));
  const wildTiles = nonFlower.filter(t => isWildTile(t));

  for (const [, group] of groups) {
    if (group.length >= 2) {
      const remaining = [...nonFlower];
      const idx1 = remaining.findIndex(t => t.id === group[0].id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === group[1].id);
      remaining.splice(idx2, 1);

      const melds = extractMeldsRecursive(remaining, isWildTile);
      if (melds) {
        return [
          { type: MeldType.PAIR, tiles: [group[0], group[1]], isConcealed: true },
          ...melds
        ];
      }
    }
  }

  // Try wild pair
  if (wildTiles.length >= 2) {
    const remaining = [...nonFlower];
    const idx1 = remaining.findIndex(t => t.id === wildTiles[0].id);
    remaining.splice(idx1, 1);
    const idx2 = remaining.findIndex(t => t.id === wildTiles[1].id);
    remaining.splice(idx2, 1);

    const melds = extractMeldsRecursive(remaining, isWildTile);
    if (melds) {
      return [
        { type: MeldType.PAIR, tiles: [wildTiles[0], wildTiles[1]], isConcealed: true },
        ...melds
      ];
    }
  }

  return null;
}

/**
 * Recursively extract melds from remaining tiles with backtracking
 */
function extractMeldsRecursive(tiles: Tile[], isWildTile: WildTileChecker = () => false): Meld[] | null {
  if (tiles.length === 0) return [];
  if (tiles.length < 3) return null;

  const sorted = sortTiles(tiles);
  const nonWild = sorted.filter(t => !isWildTile(t));
  const wildCount = sorted.filter(t => isWildTile(t)).length;

  if (nonWild.length === 0) return null; // only wilds left — handled by caller

  const firstTile = nonWild[0];

  // Try triplet
  const sameTiles = nonWild.filter(t => tilesEqual(t, firstTile));
  const needTriplet = 3 - sameTiles.length;
  if (needTriplet <= wildCount) {
    const remaining = [...sorted];
    for (const st of sameTiles) {
      const idx = remaining.findIndex(t => t.id === st.id);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    for (let i = 0; i < needTriplet; i++) {
      const idx = remaining.findIndex(t => isWildTile(t));
      if (idx >= 0) remaining.splice(idx, 1);
    }

    const meldTiles = [...sameTiles];
    const meldType = MeldType.TRIPLET;

    const restMelds = extractMeldsRecursive(remaining, isWildTile);
    if (restMelds !== null) {
      return [
        { type: meldType, tiles: meldTiles.slice(0, 3), isConcealed: true },
        ...restMelds
      ];
    }
  }

  // Try sequence (number suits only)
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numberSuits.includes(firstTile.suit) && firstTile.value <= 7) {
    const k2 = firstTile.value + 1;
    const k3 = firstTile.value + 2;
    const secondTile = nonWild.find(t => t.suit === firstTile.suit && t.value === k2);
    const thirdTile = nonWild.find(t => t.suit === firstTile.suit && t.value === k3);
    const missing = (secondTile ? 0 : 1) + (thirdTile ? 0 : 1);

    if (missing <= wildCount) {
      const remaining = [...sorted];
      const idx1 = remaining.findIndex(t => t.id === firstTile.id);
      if (idx1 >= 0) remaining.splice(idx1, 1);
      if (secondTile) {
        const idx2 = remaining.findIndex(t => t.id === secondTile.id);
        if (idx2 >= 0) remaining.splice(idx2, 1);
      }
      if (thirdTile) {
        const idx3 = remaining.findIndex(t => t.id === thirdTile.id);
        if (idx3 >= 0) remaining.splice(idx3, 1);
      }
      for (let i = 0; i < missing; i++) {
        const idxW = remaining.findIndex(t => isWildTile(t));
        if (idxW >= 0) remaining.splice(idxW, 1);
      }

      const meldTiles: Tile[] = [firstTile];
      if (secondTile) meldTiles.push(secondTile);
      if (thirdTile) meldTiles.push(thirdTile);

      const restMelds = extractMeldsRecursive(remaining, isWildTile);
      if (restMelds !== null) {
        return [
          { type: MeldType.SEQUENCE, tiles: meldTiles, isConcealed: true },
          ...restMelds
        ];
      }
    }
  }

  return null;
}

/**
 * Count roots (根) - sets of 4 identical tiles
 */
export function countRoots(tiles: Tile[], exposedMelds: Meld[]): number {
  let roots = 0;
  
  // Check exposed kongs
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG) {
      roots++;
    }
  }
  
  // Check for 4 identical tiles in winning hand
  const groups = groupTiles(tiles);
  for (const group of groups.values()) {
    if (group.length === 4) {
      roots++;
    }
  }
  
  return roots;
}
