import { Tile, Meld, MeldType, WinType, TileSuit } from '../types/game';
import { sortTiles, groupTiles, isSequence, isTriplet, isPair, tilesEqual, 
         isFlower, isWind, isDragon, isHonor, getSuits, isFullFlush,
         getTileKey } from './tiles';

// Hand type enum for ChangQingGe rules
// 只保留有特殊点数的牌型
export enum HandType {
  ALL_TRIPLETS = 'all_triplets',   // 碰碰胡
  HALF_FLUSH = 'half_flush',       // 混一色
  FULL_FLUSH = 'full_flush',       // 清一色
  QING_PENG = 'qing_peng',         // 清碰 (清一色+碰碰胡)
  ALL_WIND = 'all_wind',           // 风一色
  FENG_PENG = 'feng_peng',         // 风碰 (风一色+碰碰胡)
  EIGHT_FLOWERS = 'eight_flowers', // 八花自摸
  FOUR_WILD = 'four_wild'          // 四百搭
}

// Hand type priority (higher = better, checked first)
export const HAND_TYPE_PRIORITY: Record<HandType, number> = {
  [HandType.FENG_PENG]: 100,
  [HandType.ALL_WIND]: 90,
  [HandType.QING_PENG]: 80,
  [HandType.EIGHT_FLOWERS]: 70,
  [HandType.FULL_FLUSH]: 60,
  [HandType.FOUR_WILD]: 50,
  [HandType.HALF_FLUSH]: 40,
  [HandType.ALL_TRIPLETS]: 30
};

/**
 * Detect all hand types for a winning hand
 * Returns array of detected types sorted by priority (highest first)
 * Note: 七对/普通胡 不作为独立牌型，只用于基础胡牌验证
 */
export function detectHandTypes(
  handTiles: Tile[],
  exposedMelds: Meld[],
  isSelfDrawn: boolean,
  flowerCount: number,
  wildTileId: string | null
): HandType[] {
  const types: HandType[] = [];
  
  // Combine hand tiles + exposed meld tiles for analysis
  const allTiles = [
    ...handTiles,
    ...exposedMelds.flatMap(m => m.tiles)
  ];
  const nonFlowerTiles = allTiles.filter(t => !isFlower(t));
  
  // Check if standard win first (4面子1雀头 or 七对)
  const winResult = canWin(handTiles, exposedMelds.length);
  if (!winResult.canWin) return []; // Not a winning hand at all
  
  // Check for all triplets (碰碰胡)
  if (isAllTripletsHand(handTiles, exposedMelds)) {
    types.push(HandType.ALL_TRIPLETS);
  }
  
  // Check for all honor tiles (风一色) — 包括风牌+箭牌+百搭
  // 风碰也基于此检测
  // 风一色: 全是风牌或箭牌
  const isWindOrDragon = isAllWindOrDragon(nonFlowerTiles, wildTileId);
  
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
  }
  
  // Eight flowers (八花自摸)
  if (isSelfDrawn && flowerCount >= 8) {
    types.push(HandType.EIGHT_FLOWERS);
  }
  
  // Four wild tiles (四百搭)
  if (wildTileId && countWildTiles(handTiles, wildTileId) >= 4) {
    types.push(HandType.FOUR_WILD);
  }
  
  // Sort by priority
  return types.sort((a, b) => HAND_TYPE_PRIORITY[b] - HAND_TYPE_PRIORITY[a]);
}

/**
 * Check if hand is all triplets (碰碰胡)
 * All exposed melds must be triplets/kongs, and concealed tiles must form triplets + 1 pair
 */
function isAllTripletsHand(handTiles: Tile[], exposedMelds: Meld[]): boolean {
  // Exposed melds must all be triplets or kongs
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false;
  }
  
  // Hand tiles must form only triplets + 1 pair (no sequences)
  const nonFlowerTiles = handTiles.filter(t => !isFlower(t));
  const groups = groupTiles(nonFlowerTiles);
  
  let tripletCount = 0;
  let pairCount = 0;
  
  for (const [, group] of groups) {
    if (group.length >= 3) tripletCount++;
    else if (group.length === 2) pairCount++;
    else return false;
  }
  
  const expectedTriplets = 4 - exposedMelds.length;
  return tripletCount === expectedTriplets && pairCount === 1;
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
function isAllWindOrDragon(tiles: Tile[], wildTileId: string | null): boolean {
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
    if (t.suit === TileSuit.DRAGON) return true;
    if (wildSuit && t.suit === wildSuit && t.value === wildValue) return true;
    return false;
  });
}

/**
 * Count wild tiles in hand
 */
function countWildTiles(tiles: Tile[], wildTileId: string): number {
  if (!wildTileId) return 0;
  const [suit, value] = wildTileId.split('-');
  return tiles.filter(t => 
    t.suit === suit && t.value === parseInt(value)
  ).length;
}

/**
 * Check if a hand can win with standard pattern (4 melds + 1 pair)
 */
export function canWinStandard(tiles: Tile[], existingMelds = 0): boolean {
  const requiredMelds = Math.max(0, 4 - existingMelds);
  
  // Try each possible pair as the eyes
  const groups = groupTiles(tiles);
  
  for (const [key, groupTiles] of groups) {
    if (groupTiles.length >= 2) {
      // Try using this as the pair
      const remainingTiles = [...tiles];
      const pairTile1 = groupTiles[0];
      const pairTile2 = groupTiles[1];
      
      // Remove the pair
      const idx1 = remainingTiles.findIndex(t => t.id === pairTile1.id);
      remainingTiles.splice(idx1, 1);
      const idx2 = remainingTiles.findIndex(t => t.id === pairTile2.id);
      remainingTiles.splice(idx2, 1);
      
      // Check if remaining 12 tiles form 4 melds
      if (canFormMelds(remainingTiles, requiredMelds)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if tiles can form exactly n melds (sequences or triplets)
 */
function canFormMelds(tiles: Tile[], n: number): boolean {
  if (n === 0) {
    return tiles.length === 0;
  }
  
  if (tiles.length < n * 3) {
    return false;
  }
  
  const sorted = sortTiles(tiles);
  const firstTile = sorted[0];
  
  // Try forming a triplet with the first tile
  const tripletTiles = sorted.filter(t => tilesEqual(t, firstTile));
  if (tripletTiles.length >= 3) {
    const remaining = [...sorted];
    for (let i = 0; i < 3; i++) {
      const idx = remaining.findIndex(t => t.id === tripletTiles[i].id);
      remaining.splice(idx, 1);
    }
    if (canFormMelds(remaining, n - 1)) {
      return true;
    }
  }
  
  // Try forming a sequence with the first tile
  // Sequences only valid for number suits (筒万条), not wind/dragon
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numberSuits.includes(firstTile.suit)) {
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
        
        if (canFormMelds(remaining, n - 1)) {
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
export function canWinSevenPairs(tiles: Tile[], existingMelds = 0): boolean {
  if (existingMelds > 0) return false;
  if (tiles.length !== 14) return false;
  
  const groups = groupTiles(tiles);
  
  // Must have exactly 7 groups, each with exactly 2 tiles
  if (groups.size !== 7) return false;
  
  for (const group of groups.values()) {
    if (group.length !== 2) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if hand can win (either standard or seven pairs)
 */
export function canWin(tiles: Tile[], existingMelds = 0): { canWin: boolean; winType: WinType | null } {
  if (canWinStandard(tiles, existingMelds)) {
    return { canWin: true, winType: WinType.STANDARD };
  }
  
  if (canWinSevenPairs(tiles, existingMelds)) {
    return { canWin: true, winType: WinType.SEVEN_PAIRS };
  }
  
  return { canWin: false, winType: null };
}

/**
 * Get all tiles that would complete a winning hand (listening tiles)
 */
export function getListeningTiles(tiles: Tile[], existingMelds = 0): Tile[] {
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
    
    if (canWin(testHand, existingMelds).canWin) {
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
export function isTing(tiles: Tile[], existingMelds = 0): boolean {
  return getListeningTiles(tiles, existingMelds).length > 0;
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
