import { Tile, TileSuit, WindValue, DragonValue, FlowerValue } from '../types/game';

/**
 * Create a full deck of ChangQingGe Mahjong tiles (144 tiles)
 * - 3 suits × 9 values × 4 copies = 108 tiles
 * - Wind tiles: 4 winds × 4 copies = 16 tiles
 * - Dragon tiles: 3 dragons × 4 copies = 12 tiles
 * - Flower tiles: 8 flowers × 1 copy = 8 tiles
 * Total: 144 tiles
 */
export function createDeck(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  // Number suits: 筒万条
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numberSuits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          suit,
          value,
          id: `${suit}-${value}-${copy}`,
          isFlower: false
        });
        id++;
      }
    }
  }

  // Wind tiles: 东南西北
  const windNames = ['dong', 'nan', 'xi', 'bei'];
  for (let w = 1; w <= 4; w++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        suit: TileSuit.WIND,
        value: w,
        id: `feng-${windNames[w - 1]}-${copy}`,
        isFlower: false
      });
      id++;
    }
  }

  // Dragon tiles: 中发白
  const dragonNames = ['zhong', 'fa', 'bai'];
  for (let d = 1; d <= 3; d++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        suit: TileSuit.DRAGON,
        value: d,
        id: `jian-${dragonNames[d - 1]}-${copy}`,
        isFlower: false
      });
      id++;
    }
  }

  // Flower tiles: 春夏秋冬梅兰竹菊
  const flowerNames = ['chun', 'xia', 'qiu', 'dong', 'mei', 'lan', 'zhu', 'ju'];
  for (let f = 1; f <= 8; f++) {
    tiles.push({
      suit: TileSuit.FLOWER,
      value: f,
      id: `hua-${flowerNames[f - 1]}`,
      isFlower: true
    });
    id++;
  }

  return tiles;
}

/**
 * Shuffle tiles using Fisher-Yates algorithm
 */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Compare two tiles (ignoring id, just suit and value)
 */
export function tilesEqual(tile1: Tile, tile2: Tile): boolean {
  return tile1.suit === tile2.suit && tile1.value === tile2.value;
}

/**
 * Find tile by id
 */
export function findTileById(tiles: Tile[], tileId: string): Tile | undefined {
  return tiles.find(t => t.id === tileId);
}

/**
 * Remove tile from array
 */
export function removeTile(tiles: Tile[], tileId: string): Tile[] {
  return tiles.filter(t => t.id !== tileId);
}

/**
 * Sort tiles by suit and value
 * Order: 筒 < 万 < 条 < 风 < 箭 < 花
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<TileSuit, number> = {
    [TileSuit.DOTS]: 0,
    [TileSuit.CHARACTERS]: 1,
    [TileSuit.BAMBOOS]: 2,
    [TileSuit.WIND]: 3,
    [TileSuit.DRAGON]: 4,
    [TileSuit.FLOWER]: 5
  };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

/**
 * Group tiles by suit and value
 */
export function groupTiles(tiles: Tile[]): Map<string, Tile[]> {
  const groups = new Map<string, Tile[]>();
  
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tile);
  }
  
  return groups;
}

/**
 * Check which suits are present in tiles
 */
export function getSuits(tiles: Tile[]): Set<TileSuit> {
  return new Set(tiles.map(t => t.suit));
}

/**
 * Check if hand is missing one suit (缺门)
 */
export function isMissingOneSuit(tiles: Tile[]): { missing: boolean; missingSuit: TileSuit | null } {
  const suits = getSuits(tiles);
  
  if (suits.size === 2) {
    // Find the missing suit
    const allSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    const missingSuit = allSuits.find(s => !suits.has(s)) || null;
    return { missing: true, missingSuit };
  }
  
  return { missing: false, missingSuit: null };
}

/**
 * Check if tile is a wind tile
 */
export function isWind(tile: Tile): boolean {
  return tile.suit === TileSuit.WIND;
}

/**
 * Check if tile is a dragon tile
 */
export function isDragon(tile: Tile): boolean {
  return tile.suit === TileSuit.DRAGON;
}

/**
 * Check if tile is a flower tile
 */
export function isFlower(tile: Tile): boolean {
  return !!tile && (tile.suit === TileSuit.FLOWER || tile.isFlower === true);
}

/**
 * Check if tile is a honor tile (wind or dragon)
 */
export function isHonor(tile: Tile): boolean {
  return tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON;
}

/**
 * Check if all tiles are from one suit (清一色)
 * Honor tiles count as separate suits
 */
export function isFullFlush(tiles: Tile[]): boolean {
  const suits = getSuits(tiles);
  return suits.size === 1;
}

/**
 * Check if tiles are mixed one suit (混一色)
 * One number suit + honors only
 */
export function isHalfFlush(tiles: Tile[]): boolean {
  const suits = getSuits(tiles);
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const honorSuits = [TileSuit.WIND, TileSuit.DRAGON];
  
  // Filter out flowers
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  const nonFlowerSuits = getSuits(nonFlowerTiles);
  
  // Must have exactly one number suit and possibly honors
  let hasNumberSuit = false;
  let hasHonor = false;
  
  for (const suit of nonFlowerSuits) {
    if (numberSuits.includes(suit)) {
      if (hasNumberSuit) return false; // More than one number suit
      hasNumberSuit = true;
    } else if (honorSuits.includes(suit)) {
      hasHonor = true;
    } else {
      return false; // Flower suit shouldn't be here after filtering
    }
  }
  
  return hasNumberSuit && hasHonor;
}

/**
 * Check if all tiles are wind tiles (风一色)
 */
export function isAllWind(tiles: Tile[]): boolean {
  return tiles.every(t => t.suit === TileSuit.WIND || isFlower(t));
}

/**
 * Check if hand is all triplets/pairs (碰碰胡)
 */
export function isAllTriplets(tiles: Tile[], meldCount: number = 0): boolean {
  // This is a simplified check - full check is in handValidator
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  const groups = groupTiles(nonFlowerTiles);
  
  let tripletCount = 0;
  let pairCount = 0;
  
  for (const [, group] of groups) {
    if (group.length === 3) tripletCount++;
    else if (group.length === 2) pairCount++;
    else if (group.length === 4) tripletCount++; // Kong counts as triplet
    else return false; // Can't form all triplets with 1 of a kind
  }
  
  return tripletCount + meldCount === 4 && pairCount === 1;
}

/**
 * Get wind name in Chinese
 */
export function getWindName(value: number): string {
  const names = ['东', '南', '西', '北'];
  return names[value - 1] || '?';
}

/**
 * Get dragon name in Chinese
 */
export function getDragonName(value: number): string {
  const names = ['中', '发', '白'];
  return names[value - 1] || '?';
}

/**
 * Get flower name in Chinese
 */
export function getFlowerName(value: number): string {
  const names = ['春', '夏', '秋', '冬', '梅', '兰', '竹', '菊'];
  return names[value - 1] || '?';
}

/**
 * 检查是否满足五毒散（造反条件）
 * 
 * 五毒散 = 手牌同时满足:
 * - 筒子、万子、条子 三门都有（每门≥1张）
 * - 有风牌
 * - 有箭牌
 * - 无花牌
 * - 无百搭
 * - 无对子或刻子（全是搭子/散牌）
 */
export function isFivePoison(
  tiles: Tile[],
  wildTileSuit?: TileSuit,
  wildTileValue?: number,
  exposedTiles: Tile[] = []
): boolean {
  // 过滤花牌
  const nonFlowerTiles = tiles.filter(t => !isFlower(t));
  if (nonFlowerTiles.length !== tiles.length) return false; // 有花牌
  if (exposedTiles.some(t => isFlower(t))) return false;
  
  // 检查三门花色都有
  const suits = getSuits(nonFlowerTiles);
  const hasDots = suits.has(TileSuit.DOTS);
  const hasWan = suits.has(TileSuit.CHARACTERS);
  const hasTiao = suits.has(TileSuit.BAMBOOS);
  if (!hasDots || !hasWan || !hasTiao) return false;
  
  // 检查有风牌
  const hasWind = nonFlowerTiles.some(t => t.suit === TileSuit.WIND);
  if (!hasWind) return false;
  
  // 检查有箭牌
  const hasDragon = nonFlowerTiles.some(t => t.suit === TileSuit.DRAGON);
  if (!hasDragon) return false;
  
  // 检查无百搭
  if (wildTileSuit !== undefined && wildTileValue !== undefined) {
    const hasWild = nonFlowerTiles.some(t => t.suit === wildTileSuit && t.value === wildTileValue);
    if (hasWild) return false;
  }
  
  // 检查无对子或刻子（全是搭子/散牌）
  const groups = groupTiles(nonFlowerTiles);
  for (const [, group] of groups) {
    if (group.length >= 2) return false; // 有对子或刻子
  }
  
  return true;
}

/**
 * 验证手牌合法性：每种牌最多4张
 * @throws Error 如果发现超过4张相同的牌
 */
export function validateHand(tiles: Tile[]): void {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    const count = (counts.get(key) || 0) + 1;
    if (count > 4) {
      throw new Error(`非法手牌: ${getTileDisplayName(tile)} 出现 ${count} 次（最多4张）`);
    }
    counts.set(key, count);
  }
}

/**
 * Get tile display name in Chinese
 */
export function getTileDisplayName(tile: Tile): string {
  if (tile.suit === TileSuit.WIND) return getWindName(tile.value);
  if (tile.suit === TileSuit.DRAGON) return getDragonName(tile.value);
  if (tile.suit === TileSuit.FLOWER) return getFlowerName(tile.value);
  
  const suitNames: Record<string, string> = {
    [TileSuit.DOTS]: '筒',
    [TileSuit.CHARACTERS]: '万',
    [TileSuit.BAMBOOS]: '条'
  };
  
  const numNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return `${numNames[tile.value - 1]}${suitNames[tile.suit]}`;
}

/**
 * Check if tile is terminal (1 or 9)
 */
export function isTerminal(tile: Tile): boolean {
  return tile.value === 1 || tile.value === 9;
}

/**
 * Check if tile is a special value (2, 5, or 8) for Jiang
 */
export function isJiangValue(tile: Tile): boolean {
  return tile.value === 2 || tile.value === 5 || tile.value === 8;
}

/**
 * Count occurrences of each tile type
 */
export function countTiles(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  return counts;
}

/**
 * Get tile key for grouping
 */
export function getTileKey(tile: Tile): string {
  return `${tile.suit}-${tile.value}`;
}

/**
 * Check if three tiles form a sequence (顺子)
 * Only valid for number suits (筒万条), not wind/dragon/flower
 */
export function isSequence(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  
  // Sequences only valid for number suits
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (!numberSuits.includes(tiles[0].suit)) return false;
  
  const sorted = sortTiles(tiles);
  return sorted[0].suit === sorted[1].suit &&
         sorted[1].suit === sorted[2].suit &&
         sorted[0].value + 1 === sorted[1].value &&
         sorted[1].value + 1 === sorted[2].value;
}

/**
 * Check if tiles form a triplet
 */
export function isTriplet(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  return tilesEqual(tiles[0], tiles[1]) && tilesEqual(tiles[1], tiles[2]);
}

/**
 * Check if tiles form a pair
 */
export function isPair(tiles: Tile[]): boolean {
  return tiles.length === 2 && tilesEqual(tiles[0], tiles[1]);
}

/**
 * Check if tiles form a kong (4 identical)
 */
export function isKong(tiles: Tile[]): boolean {
  if (tiles.length !== 4) return false;
  return tilesEqual(tiles[0], tiles[1]) &&
         tilesEqual(tiles[1], tiles[2]) &&
         tilesEqual(tiles[2], tiles[3]);
}

/** 过滤 undefined + 花牌，返回有效手牌（K哥铁律用） */
export function normalizeHand(hand: Tile[]): Tile[] {
  return hand.filter(t => t && !isFlower(t));
}
