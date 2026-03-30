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
 * Note: 七对/普通胡 不作为独立牌型，只用于基础胡牌验证
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

export function detectHandTypes(
  handTiles: Tile[],
  exposedMelds: Meld[],
  isSelfDrawn: boolean,
  flowerCount: number,
  wildTileId: string | null,
  wildTileGroup?: string[]
): HandType[] {
  const types: HandType[] = [];
  const isWildTile = buildWildTileChecker(wildTileId, wildTileGroup);

  // Combine hand tiles + exposed meld tiles for analysis
  const allTiles = [
    ...handTiles,
    ...exposedMelds.flatMap(m => m.tiles)
  ];
  const nonFlowerTiles = allTiles.filter(t => !isFlower(t));

  // Check if standard win first (4面子1雀头 or 七对)
  const winResult = canWin(handTiles, exposedMelds.length, isWildTile);
  if (!winResult.canWin) return []; // Not a winning hand at all

  // Check for all triplets (碰碰胡)
  // Pass wild tile info so 百搭 can substitute for missing tiles
  let wildSuit: string | undefined;
  let wildValue: number | undefined;
  if (wildTileId) {
    const [s, v] = wildTileId.split('-');
    if (s && v) {
      wildSuit = s;
      wildValue = parseInt(v, 10);
    }
  }
  if (isAllTripletsHand(handTiles, exposedMelds, wildSuit, wildValue)) {
    types.push(HandType.ALL_TRIPLETS);
  }

  // Check for all honor tiles (风一色) — 包括风牌+箭牌+百搭
  const isWindOrDragon = isAllWindOrDragon(nonFlowerTiles, isWildTile);

  if (isWindOrDragon) {
    types.push(HandType.ALL_WIND);
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.FENG_PENG);
    }
  }

  // Check for full flush (清一色) - all same number suit
  if (!types.includes(HandType.ALL_WIND) && isFullFlushHand(nonFlowerTiles)) {
    types.push(HandType.FULL_FLUSH);

    // 清碰 = 清一色 + 碰碰胡
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.QING_PENG);
    }
  }

  // Check for half flush (混一色)
  if (!types.includes(HandType.FULL_FLUSH) && !types.includes(HandType.ALL_WIND) && isHalfFlushHand(nonFlowerTiles)) {
    types.push(HandType.HALF_FLUSH);

    // 混碰 = 混一色 + 碰碰胡
    if (types.includes(HandType.ALL_TRIPLETS)) {
      types.push(HandType.HUN_PENG);
    }
  }

  // Eight flowers (八花自摸)
  if (isSelfDrawn && flowerCount >= 8) {
    types.push(HandType.EIGHT_FLOWERS);
  }

  // Four wild tiles (四百搭)
  if (wildTileId && countWildTiles(handTiles, isWildTile) >= 4) {
    types.push(HandType.FOUR_WILD);
  }

  // 大吊：手牌（不含门口）仅剩单张听牌
  // 即 concealedTiles 在胡牌后为 14 张（4面子+1雀头=13张 + 胡牌1张=14张），
  // 但胡牌前手牌只有 2 张（1张单听 + 1张胡来的牌），
  // 更准确的判断：门口副露占了 3 组面子，手牌只剩 2 张（听牌+胡牌）= 大吊
  // 或者：门口副露占了 4 组面子，手牌只剩 2 张（雀头，但只听其中一张）
  if (isDaDiao(handTiles, exposedMelds)) {
    types.push(HandType.DA_DIAO);
  }

  // Sort by priority
  return types.sort((a, b) => HAND_TYPE_PRIORITY[b] - HAND_TYPE_PRIORITY[a]);
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
  
  // Use wilds optimally:
  // Priority 1: Complete singles to triplets (need 2 wilds each)
  // Priority 2: Complete a pair (need 0 wilds, already counted)
  // Priority 3: Make triplets from remaining wilds (need 3 each)
  // Priority 4: Make extra pair from remaining wilds (need 2 wilds)
  
  let wildsLeft = wildCount;
  
  // Fill singles to triplets
  const tripletsFromSingles = Math.min(Math.floor(wildsLeft / 2), singles);
  wildsLeft -= tripletsFromSingles * 2;
  const totalTriplets = naturalTriplets + tripletsFromSingles;
  
  // Make more triplets from remaining wilds (3 wilds = 1 triplet)
  const tripletsFromWilds = Math.floor(wildsLeft / 3);
  wildsLeft -= tripletsFromWilds * 3;
  const finalTriplets = totalTriplets + tripletsFromWilds;
  
  // Need exactly expectedTriplets triplets + 1 pair
  // Pair can be: natural pair, or leftover wilds (2+), or leftover singles (should be 0 if we filled them all)
  const hasPair = naturalPairs >= 1 || wildsLeft >= 2 || singles > tripletsFromSingles;
  
  return finalTriplets >= expectedTriplets && hasPair;
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
export function canWinStandard(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false): boolean {
  const requiredMelds = Math.max(0, 4 - existingMelds);
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));

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
 */
function canFormMelds(tiles: Tile[], n: number, isWildTile: WildTileChecker): boolean {
  if (n === 0) {
    return tiles.length === 0;
  }

  if (tiles.length < n * 3) {
    return false;
  }

  const sorted = sortTiles(tiles);
  const wildTiles = sorted.filter(t => isWildTile(t));
  const nonWildTiles = sorted.filter(t => !isWildTile(t));

  // 如果剩下的全部是百搭，必然可组成面子
  if (nonWildTiles.length === 0) {
    return wildTiles.length === n * 3;
  }

  const firstTile = nonWildTiles[0];

  // Try forming a triplet with first tile + wildcards
  const sameTiles = nonWildTiles.filter(t => tilesEqual(t, firstTile));
  const needForTriplet = 3 - sameTiles.length;
  if (needForTriplet <= wildTiles.length) {
    const remaining = [...sorted];

    // remove natural same tiles (up to 3)
    for (let i = 0; i < Math.min(3, sameTiles.length); i++) {
      const idx = remaining.findIndex(t => t.id === sameTiles[i].id);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    // remove wild tiles to fill
    for (let i = 0; i < Math.max(0, needForTriplet); i++) {
      const idx = remaining.findIndex(t => isWildTile(t));
      if (idx >= 0) remaining.splice(idx, 1);
    }

    if (canFormMelds(remaining, n - 1, isWildTile)) {
      return true;
    }
  }

  // Try forming a sequence with first tile + wildcards (only number suits)
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numberSuits.includes(firstTile.suit)) {
    const neededValues = [firstTile.value + 1, firstTile.value + 2];
    if (neededValues[1] <= 9) {
      const secondTile = nonWildTiles.find(t => t.suit === firstTile.suit && t.value === neededValues[0]);
      const thirdTile = nonWildTiles.find(t => t.suit === firstTile.suit && t.value === neededValues[1]);

      const missing = [secondTile, thirdTile].filter(t => !t).length;
      if (missing <= wildTiles.length) {
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

        if (canFormMelds(remaining, n - 1, isWildTile)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a hand can win with seven pairs (七对)
 */
export function canWinSevenPairs(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false): boolean {
  if (existingMelds > 0) return false;
  if (tiles.length !== 14) return false;

  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  const wildCount = nonFlowerTiles.filter(t => isWildTile(t)).length;
  const normalTiles = nonFlowerTiles.filter(t => !isWildTile(t));

  const groups = groupTiles(normalTiles);
  let pairs = 0;
  let singles = 0;

  for (const group of groups.values()) {
    pairs += Math.floor(group.length / 2);
    singles += group.length % 2;
  }

  // singles each need one wild to pair
  if (singles > wildCount) return false;
  let remainingWild = wildCount - singles;

  pairs += singles;
  pairs += Math.floor(remainingWild / 2);

  return pairs >= 7;
}

/**
 * Check if hand can win (either standard or seven pairs)
 */
export function canWin(tiles: Tile[], existingMelds = 0, isWildTile: WildTileChecker = () => false): { canWin: boolean; winType: WinType | null } {
  if (canWinStandard(tiles, existingMelds, isWildTile)) {
    return { canWin: true, winType: WinType.STANDARD };
  }

  if (canWinSevenPairs(tiles, existingMelds, isWildTile)) {
    return { canWin: true, winType: WinType.SEVEN_PAIRS };
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
 * Extract melds from a winning hand
 */
export function extractMelds(tiles: Tile[]): Meld[] | null {
  if (tiles.length !== 14) return null;
  
  // Try standard win
  const groups = groupTiles(tiles);
  
  for (const [key, groupTiles] of groups) {
    if (groupTiles.length >= 2) {
      const remainingTiles = [...tiles];
      const pairTile1 = groupTiles[0];
      const pairTile2 = groupTiles[1];
      
      const idx1 = remainingTiles.findIndex(t => t.id === pairTile1.id);
      remainingTiles.splice(idx1, 1);
      const idx2 = remainingTiles.findIndex(t => t.id === pairTile2.id);
      remainingTiles.splice(idx2, 1);
      
      const melds = extractMeldsRecursive(remainingTiles);
      if (melds) {
        return [
          { type: MeldType.PAIR, tiles: [pairTile1, pairTile2], isConcealed: true },
          ...melds
        ];
      }
    }
  }
  
  // Try seven pairs
  if (canWinSevenPairs(tiles)) {
    const melds: Meld[] = [];
    const groups = groupTiles(tiles);
    for (const group of groups.values()) {
      melds.push({ type: MeldType.PAIR, tiles: group, isConcealed: true });
    }
    return melds;
  }
  
  return null;
}

function extractMeldsRecursive(tiles: Tile[]): Meld[] | null {
  if (tiles.length === 0) {
    return [];
  }
  
  if (tiles.length < 3) {
    return null;
  }
  
  const sorted = sortTiles(tiles);
  const firstTile = sorted[0];
  
  // Try triplet
  const tripletTiles = sorted.filter(t => tilesEqual(t, firstTile));
  if (tripletTiles.length >= 3) {
    const remaining = [...sorted];
    for (let i = 0; i < 3; i++) {
      const idx = remaining.findIndex(t => t.id === tripletTiles[i].id);
      remaining.splice(idx, 1);
    }
    
    const restMelds = extractMeldsRecursive(remaining);
    if (restMelds) {
      return [
        { type: MeldType.TRIPLET, tiles: tripletTiles.slice(0, 3), isConcealed: true },
        ...restMelds
      ];
    }
  }
  
  // Try sequence
  const nextValue = firstTile.value + 1;
  const nextNextValue = firstTile.value + 2;
  
  if (nextValue <= 9 && nextNextValue <= 9) {
    const secondTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextValue);
    const thirdTile = sorted.find(t => t.suit === firstTile.suit && t.value === nextNextValue);
    
    if (secondTile && thirdTile) {
      const remaining = [...sorted];
      const idx1 = remaining.findIndex(t => t.id === firstTile.id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === secondTile.id);
      remaining.splice(idx2, 1);
      const idx3 = remaining.findIndex(t => t.id === thirdTile.id);
      remaining.splice(idx3, 1);
      
      const restMelds = extractMeldsRecursive(remaining);
      if (restMelds) {
        return [
          { type: MeldType.SEQUENCE, tiles: [firstTile, secondTile, thirdTile], isConcealed: true },
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
