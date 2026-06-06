/**
 * tileHelper.ts — 牌面工具函数（从 gameManager 拆分）
 * 纯函数，无状态依赖，可独立测试
 */
import { Tile, Meld, MeldType, TileSuit, GameState, Player, PlayerStatus } from '../types/game';
import { buildWildTileChecker } from './handValidator';
import { isFlower, tilesEqual } from './tiles';

// ==================== 牌面基础 ====================

/** 判断是否为百搭牌 */
export function isWildTile(game: GameState, tile: Tile): boolean {
  const checker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
  return checker(tile);
}

/** 手牌排序：百搭最前，其余按花色→点数 */
export function sortHandWithWildFront(tiles: Tile[], game: GameState): Tile[] {
  if (!tiles || tiles.length === 0) return [];
  const suitOrder: Record<string, number> = {
    dots: 0, wan: 1, tiao: 2, feng: 3, jian: 4, hua: 5
  };
  return [...tiles].sort((a, b) => {
    if (!a || !a.suit || a.value == null) return 1;
    if (!b || !b.suit || b.value == null) return -1;
    const aIsWild = isWildTile(game, a);
    const bIsWild = isWildTile(game, b);
    if (aIsWild && !bIsWild) return -1;
    if (!aIsWild && bIsWild) return 1;
    const aSuit = suitOrder[a.suit] ?? 99;
    const bSuit = suitOrder[b.suit] ?? 99;
    if (aSuit !== bSuit) return aSuit - bSuit;
    return (a.value ?? 0) - (b.value ?? 0);
  });
}

/** 获取花牌数（门口牌中的花牌） */
export function countFlowerTiles(player: Player): number {
  return player.hand.exposedMelds
    .flatMap(meld => meld.tiles)
    .filter(tile => isFlower(tile))
    .length;
}

/** 获取玩家花牌列表 */
export function getPlayerFlowerTiles(player: Player): Tile[] {
  return player.hand.exposedMelds
    .flatMap(meld => meld.tiles)
    .filter(tile => isFlower(tile));
}

/** 是否门清（无吃/碰/明杠，暗杠不破门清） */
export function isPlayerMenQing(player: Player): boolean {
  return !player.hand.exposedMelds.some(meld =>
    meld.type === MeldType.TRIPLET ||
    meld.type === MeldType.SEQUENCE ||
    (meld.type === MeldType.KONG && !meld.isConcealed)
  );
}

// ==================== 牌数计算 ====================

/** 花色最大张数 */
export function getTileMaxCopies(suit: TileSuit): number {
  return suit === TileSuit.FLOWER ? 1 : 4;
}

/** 可打牌数（不含花牌的门口牌+手牌） */
export function getPlayableTileCount(player: Player): number {
  const concealed = player.hand.concealedTiles.filter(t => !isFlower(t));
  // 每个非花牌 meld 固定算3张（碰/吃/杠都是一个meld组=3张牌），避免杠4张导致总数超14
  const exposed = player.hand.exposedMelds.filter(m => !m.tiles.some(t => isFlower(t))).length * 3;
  return concealed.length + exposed;
}

/** 获取隐藏可打手牌（非花牌 或 百搭花牌） */
export function getConcealedPlayableTiles(game: GameState, player: Player): Tile[] {
  const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
  return player.hand.concealedTiles.filter(tile => !isFlower(tile) || wildChecker(tile));
}

/** 门口非花牌牌数 */
export function countExposedTilesExcludingFlowerMelds(player: Player): number {
  return player.hand.exposedMelds.reduce((sum, meld) => {
    if (meld.tiles.some(t => isFlower(t))) return sum;
    return sum + meld.tiles.length;
  }, 0);
}

/** 可见剩余牌数 */
export function getVisibleRemainingCount(game: GameState, player: Player, suit: TileSuit, value: number): number {
  const visibleCount =
    player.hand.concealedTiles.filter(tile => tile.suit === suit && tile.value === value).length +
    game.discardPile.filter(tile => tile.suit === suit && tile.value === value).length +
    game.players.flatMap(p => p.hand.exposedMelds).flatMap(meld => meld.tiles).filter(tile => tile.suit === suit && tile.value === value).length;
  return Math.max(0, getTileMaxCopies(suit) - visibleCount);
}

// ==================== 签名/哈希 ====================

/** 牌面签名（用于缓存key） */
export function buildTileSignature(tiles: Tile[]): string {
  return tiles
    .map(tile => `${tile.suit}:${tile.value}`)
    .sort()
    .join(',');
}

/** 副露签名（用于缓存key） */
export function buildMeldSignature(melds: Meld[]): string {
  return melds
    .map(meld => `${meld.type}:${meld.isConcealed ? '1' : '0'}:${buildTileSignature(meld.tiles)}`)
    .sort()
    .join('|');
}

// ==================== 吃牌组合 ====================

/** 查找所有合法吃牌组合 */
export function findChowSequences(hand: Tile[], discardedTile: Tile, game?: GameState): Tile[][] {
  const sequences: Tile[][] = [];
  const suit = discardedTile.suit;
  const value = discardedTile.value;

  if (suit === TileSuit.WIND || suit === TileSuit.DRAGON || suit === TileSuit.FLOWER) return sequences;

  const suitTiles = hand.filter(t => t.suit === suit && !isFlower(t));
  if (suitTiles.length < 2) return sequences;

  const checker = game ? buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup) : null;

  // v-2, v-1, v
  if (value >= 3) {
    const t1 = suitTiles.find(t => t.value === value - 2 && (!checker || !checker(t)));
    const t2 = suitTiles.find(t => t.value === value - 1 && (!checker || !checker(t)));
    if (t1 && t2) sequences.push([t1, t2, discardedTile]);
  }
  // v-1, v, v+1
  if (value >= 2) {
    const t1 = suitTiles.find(t => t.value === value - 1 && (!checker || !checker(t)));
    const t2 = suitTiles.find(t => t.value === value + 1 && (!checker || !checker(t)));
    if (t1 && t2) sequences.push([t1, t2, discardedTile]);
  }
  // v, v+1, v+2
  if (value <= 7) {
    const t1 = suitTiles.find(t => t.value === value + 1 && (!checker || !checker(t)));
    const t2 = suitTiles.find(t => t.value === value + 2 && (!checker || !checker(t)));
    if (t1 && t2) sequences.push([t1, t2, discardedTile]);
  }

  return sequences;
}

/** 构建吃牌选项ID列表 */
export function buildChowOptionIds(sequences: Tile[][], discardedTile: Tile): string[][] {
  return sequences.map(seq => seq.map(t => t.id));
}

/** 评估吃牌组合分数 */
export function scoreChowSequence(sequence: Tile[], discardedTile: Tile): number {
  let score = 0;
  const values = sequence.map(t => t.value).sort((a, b) => a - b);
  // 顺子紧凑度
  if (values[2] - values[0] === 2) score += 2; // 连顺
  // 边张/夹张
  if (discardedTile.value === values[0] || discardedTile.value === values[2]) score += 1; // 边张
  if (discardedTile.value === values[1]) score += 2; // 夹张
  return score;
}

/** 选择最佳吃牌组合 */
export function selectBestChowSequence(sequences: Tile[][], discardedTile: Tile): Tile[] {
  if (sequences.length === 0) return [];
  if (sequences.length === 1) return sequences[0];
  return sequences.reduce((best, seq) =>
    scoreChowSequence(seq, discardedTile) > scoreChowSequence(best, discardedTile) ? seq : best
  );
}

/** 按ID选择吃牌组合 */
export function selectChowSequence(sequences: Tile[][], discardedTile: Tile, tileIds?: string[]): Tile[] {
  if (!tileIds || tileIds.length === 0) return selectBestChowSequence(sequences, discardedTile);
  return sequences.find(seq => seq.every(t => tileIds.includes(t.id))) || selectBestChowSequence(sequences, discardedTile);
}

// ==================== 大吊预览过滤 ====================

/** 大吊时过滤预览牌（清一色限制） */
export function filterBigDiaoPreviewTiles(
  game: GameState,
  player: Player,
  winningTiles: Array<{
    tile: Tile;
    remainingCount: number;
    bestDiscardOption: any | null;
    bestSelfDrawOption: any | null;
    bestOverallOption: any | null;
  }>
) {
  const playable = getConcealedPlayableTiles(game, player);
  if (playable.length !== 1) return winningTiles;

  const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
  const visibleTiles = [
    ...player.hand.concealedTiles.filter(tile => !wildChecker(tile) && !isFlower(tile)),
    ...player.hand.exposedMelds.flatMap(meld => meld.tiles || []).filter(tile => !wildChecker(tile) && !isFlower(tile))
  ];
  const numberSuits = new Set(visibleTiles
    .filter(tile => tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS)
    .map(tile => tile.suit));
  const hasHonor = visibleTiles.some(tile => tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON);

  if (numberSuits.size !== 1 || hasHonor) return winningTiles;

  const [lockedSuit] = [...numberSuits];
  return winningTiles.filter(entry => entry.tile.suit === lockedSuit);
}
