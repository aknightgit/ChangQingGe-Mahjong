import { Tile, Meld, MeldType, WinType, TileSuit } from '../types/game';
import { groupTiles, isFlower, isWind, isDragon,
         getSuits } from './tiles';

// ============================================================
// 牌型枚举（按优先级排序）
// ============================================================
export enum HandType {
  FENG_PENG     = 'feng_peng',     // 风碰 = 风一色 + 碰碰胡
  ALL_WIND      = 'all_wind',      // 风一色（全风牌）
  QING_PENG     = 'qing_peng',     // 清碰 = 清一色 + 碰碰胡
  HUN_PENG      = 'hun_peng',      // 混碰 = 混一色 + 碰碰胡
  EIGHT_FLOWERS = 'eight_flowers', // 八花自摸
  FULL_FLUSH    = 'full_flush',    // 清一色（一种数牌）
  HALF_FLUSH    = 'half_flush',    // 混一色（一种数牌 + 字牌）
  FOUR_WILD     = 'four_wild',     // 四百搭
  ALL_TRIPLETS  = 'all_triplets',  // 碰碰胡
  DA_DIAO       = 'da_diao',       // 大吊
}

// 优先级（越高越好）
export const HAND_TYPE_PRIORITY: Record<HandType, number> = {
  [HandType.FENG_PENG]:     100,
  [HandType.ALL_WIND]:       90,
  [HandType.QING_PENG]:      80,
  [HandType.HUN_PENG]:       75,
  [HandType.EIGHT_FLOWERS]:  70,
  [HandType.FULL_FLUSH]:     60,
  [HandType.HALF_FLUSH]:     40,
  [HandType.FOUR_WILD]:      50,
  [HandType.ALL_TRIPLETS]:    30,
  [HandType.DA_DIAO]:        85,
};

export type WildTileChecker = (tile: Tile) => boolean;

export function buildWildTileChecker(wildTileId: string | null): WildTileChecker {
  if (!wildTileId || typeof wildTileId !== 'string') return () => false;
  const parts = wildTileId.split('-');
  if (parts.length < 2) return () => false;
  return (t: Tile) => t.suit === parts[0] && String(t.value) === parts[1];
}

// ============================================================
// 手牌数校验（摸牌后必须是 2/5/8/11/14）
// ============================================================
// ✅ 修复：移除 13（13张是未摸牌状态，胡牌时必须 2/5/8/11/14）
function isValidHandSize(count: number): boolean {
  return [2, 5, 8, 11, 14].includes(count);
}

// ============================================================
// 核心：检查 tiles 能否组成 n 个面子（3n+2 格式中的 n）
// 先选对子（eyes）再检查剩余能否成面子
// ============================================================
function canFormMelds(
  tiles: Tile[],
  n: number,
  isWildTile: WildTileChecker
): boolean {
  // n=0 时不留牌
  if (n === 0) return tiles.length === 0;

  const wilds = tiles.filter(t => isWildTile(t));
  const naturals = tiles.filter(t => !isWildTile(t));

  // 构建计数表
  const countMap = new Map<string, number>();
  for (const t of naturals) {
    const k = `${t.suit}-${t.value}`;
    countMap.set(k, (countMap.get(k) || 0) + 1);
  }

  // ---- 找候选对子 ----
  const pairCandidates: Array<{key: string; cnt: number; isWild: boolean}> = [];

  // 候选1：自然对子
  for (const [k, cnt] of countMap) {
    if (cnt >= 2) pairCandidates.push({ key: k, cnt, isWild: false });
  }
  // 候选2：1自然+1百搭
  if (wilds.length >= 1) {
    for (const [k] of countMap) {
      pairCandidates.push({ key: k, cnt: 1, isWild: true });
    }
  }
  // 候选3：2百搭
  if (wilds.length >= 2) {
    pairCandidates.push({ key: '__wild_pair__', cnt: 2, isWild: true });
  }

  // 遍历每个候选对子
  for (const pair of pairCandidates) {
    // 分配对子后剩余的计数表和百搭数
    const map2 = new Map(countMap);
    let wildLeft = wilds.length;

    if (!pair.isWild) {
      // 自然对子：消耗 2 张该牌
      const prev = map2.get(pair.key)!;
      if (prev < 2) continue;
      map2.set(pair.key, prev - 2);
    } else if (pair.key === '__wild_pair__') {
      // 双百搭对子
      wildLeft -= 2;
    } else {
      // 1自然+1百搭
      const prev = map2.get(pair.key)!;
      map2.set(pair.key, prev - 1);
      wildLeft -= 1;
    }

    if (wildLeft < 0) continue;

    // 检查剩余能否组成 n 个面子
    if (tryFormMelds(n, wildLeft, map2)) return true;
  }

  return false;
}

// 尝试用剩余牌组成 n 个面子（不回溯配对）
function tryFormMelds(n: number, wildLeft: number, map: Map<string, number>): boolean {
  if (n === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }

  // 找第一个还有牌的色值
  let firstKey: string | null = null;
  for (const k of map.keys()) {
    if ((map.get(k) || 0) > 0) { firstKey = k; break; }
  }

  if (!firstKey) return wildLeft >= n * 3; // 全靠百搭补

  const [suit, valStr] = firstKey.split('-');
  const val = parseInt(valStr);
  const cnt = map.get(firstKey)!;

  // --- 刻子 ---
  const needTriplet = 3 - cnt;
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, 0);
    if (tryFormMelds(n - 1, wildLeft - needTriplet, map)) return true;
    map.set(firstKey, saved);
  }

  // --- 顺子（数字牌 1-7）---
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numSuits.includes(suit as TileSuit) && val <= 7) {
    const k2 = `${suit}-${val + 1}`;
    const k3 = `${suit}-${val + 2}`;
    const c2 = map.get(k2) || 0;
    const c3 = map.get(k3) || 0;
    const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);
    if (missing <= wildLeft) {
      const s2 = c2, s3 = c3;
      const saved = cnt;
      map.set(firstKey, 0);
      if (c2 > 0) map.set(k2, c2 - 1);
      if (c3 > 0) map.set(k3, c3 - 1);
      if (tryFormMelds(n - 1, wildLeft - missing, map)) return true;
      map.set(firstKey, saved);
      if (s2 > 0) map.set(k2, s2);
      if (s3 > 0) map.set(k3, s3);
    }
  }

  return false;
}

// ============================================================
// 核心牌型检测（无百搭版本）
// ============================================================
function detectTypes(
  concealed: Tile[],
  exposed: Meld[]
): HandType[] {
  const types: HandType[] = [];

  const concealedNonFlower = concealed.filter(t => !isFlower(t));
  const flowerCount = concealed.filter(t => isFlower(t)).length;

  // 手牌数校验
  if (!isValidHandSize(concealedNonFlower.length)) return [];

  // ---- 第一层：特殊牌型 ----
  if (flowerCount >= 8) types.push(HandType.EIGHT_FLOWERS);

  const allWind = concealedNonFlower.length > 0 &&
    concealedNonFlower.every(t => isWind(t));
  if (allWind) types.push(HandType.ALL_WIND);

  // ---- 统计已暴露面子 ----
  const hasSequence = exposed.some(m => m.type === MeldType.SEQUENCE);
  const exposedTripletCount = exposed.filter(m =>
    m.type === MeldType.TRIPLET || m.type === MeldType.KONG
  ).length;
  const remainingMelds = 4 - exposedTripletCount;

  // ---- 3n+2 格式检测 ----
  const satisfiesFormat = remainingMelds >= 0 &&
    canFormMelds(concealedNonFlower, remainingMelds, () => false);

  // 碰碰胡：所有面子都是刻子/杠子
  if (!hasSequence && satisfiesFormat) {
    types.push(HandType.ALL_TRIPLETS);
  }

  // ---- 花色构成 ----
  const allExposedNonFlower = exposed.flatMap(m => m.tiles).filter(t => !isFlower(t));
  const allNonFlower = [...concealedNonFlower, ...allExposedNonFlower];
  const suits = getSuits(allNonFlower);
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const windSuits = [TileSuit.WIND];

  let numSuitCount = 0, windCount = 0;
  for (const s of suits) {
    if (numSuits.includes(s)) numSuitCount++;
    else if (windSuits.includes(s) || s === TileSuit.DRAGON) windCount++;
  }

  const isFullFlushHand = numSuitCount === 1 && windCount === 0;
  const isHalfFlushHand = numSuitCount === 1 && windCount >= 1;

  if (isFullFlushHand && satisfiesFormat) {
    types.push(HandType.FULL_FLUSH);
    if (types.includes(HandType.ALL_TRIPLETS)) types.push(HandType.QING_PENG);
  }
  if (isHalfFlushHand && satisfiesFormat) {
    types.push(HandType.HALF_FLUSH);
    if (types.includes(HandType.ALL_TRIPLETS)) types.push(HandType.HUN_PENG);
  }

  if (types.includes(HandType.ALL_WIND) && types.includes(HandType.ALL_TRIPLETS)) {
    types.push(HandType.FENG_PENG);
  }

  // 大吊
  if (concealedNonFlower.length === 2 && exposed.length >= 1) {
    types.push(HandType.DA_DIAO);
  }

  return types.sort((a, b) => (HAND_TYPE_PRIORITY[b] ?? 0) - (HAND_TYPE_PRIORITY[a] ?? 0));
}

// ============================================================
// 百搭最优分配 → 找最高牌型
// ============================================================
function findBestAssignment(
  concealed: Tile[],
  exposed: Meld[],
  wildTileId: string
): HandType[] {
  if (!wildTileId || typeof wildTileId !== 'string') return detectTypes(concealed, exposed);
  const parts = wildTileId.split('-');
  if (parts.length < 2) return detectTypes(concealed, exposed);
  const [wildSuit, wildVal] = parts;
  const isWild = (t: Tile) => t.suit === wildSuit && String(t.value) === wildVal;

  const wildCount = concealed.filter(t => isWild(t)).length;
  if (wildCount === 0) return detectTypes(concealed, exposed);

  const naturals = concealed.filter(t => !isWild(t));
  const groups = groupTiles(naturals);
  const candidates: Array<{suit: string; value: number; score: number}> = [];

  for (const [, group] of groups) {
    if (group.length === 0) continue;
    const tile = group[0];
    let score = 50;
    if (isDragon(tile)) score = 110;
    else if (isWind(tile)) score = 100;
    if (!candidates.some(c => c.suit === tile.suit && c.value === tile.value)) {
      candidates.push({ suit: tile.suit, value: tile.value, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return detectTypes(concealed, exposed);

  let bestTypes: HandType[] = [];
  let bestScore = -1;

  for (let i = 0; i <= wildCount; i++) {
    const alloc = candidates.slice(0, Math.min(i, candidates.length));
    while (alloc.length < wildCount) alloc.push(candidates[0]);

    const virtualHand = [...naturals];
    for (const a of alloc) {
      virtualHand.push({ suit: a.suit as TileSuit, value: a.value, id: `v-${Math.random()}`, isFlower: false });
    }

    const types = detectTypes(virtualHand, exposed);
    if (types.length > 0) {
      const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
      if (primaryScore > bestScore) {
        bestScore = primaryScore;
        bestTypes = types;
      }
    }
  }

  return bestTypes;
}

// ============================================================
// 主入口：canWin
// ============================================================
export function canWin(
  handTiles: Tile[],
  exposedOrCount: Meld[] | number,
  wildTileIdOrChecker: string | null | WildTileChecker
): { canWin: boolean; types: HandType[] } {
  const isOldSig = typeof exposedOrCount === 'number';
  const exposed: Meld[] = isOldSig ? [] : exposedOrCount;
  const wildTileId: string | null = isOldSig
    ? (typeof wildTileIdOrChecker === 'string' ? wildTileIdOrChecker : null)
    : (typeof wildTileIdOrChecker === 'string' ? wildTileIdOrChecker : null);

  const concealed = handTiles;
  const flowerCount = concealed.filter(t => isFlower(t)).length;
  const concealedNonFlower = concealed.filter(t => !isFlower(t));

  // 第一层：特殊牌型（无需3n+2，无需手牌数校验）
  // 八花自摸优先
  if (flowerCount >= 8 && concealedNonFlower.length === 0) {
    return { canWin: true, types: [HandType.EIGHT_FLOWERS] };
  }

  // 四百搭
  if (wildTileId) {
    const wildTileFn = buildWildTileChecker(wildTileId);
    const wildCount = concealed.filter(t => wildTileFn(t)).length;
    if (wildCount >= 4 && concealedNonFlower.length === 0) {
      return { canWin: true, types: [HandType.FOUR_WILD] };
    }
  }

  // 手牌数校验（特殊牌型已处理过）
  if (!isValidHandSize(concealedNonFlower.length)) {
    return { canWin: false, types: [] };
  }

  const isWildTileFn = buildWildTileChecker(wildTileId);

  // 第一层：特殊牌型（无需3n+2）
  if (wildTileId) {
    const wildCount = concealed.filter(t => isWildTileFn(t)).length;
    if (wildCount >= 4) return { canWin: true, types: [HandType.FOUR_WILD] };
  }
  if (flowerCount >= 8) return { canWin: true, types: [HandType.EIGHT_FLOWERS] };

  const allWind = concealedNonFlower.length > 0 &&
    concealedNonFlower.every(t => isWind(t) || isWildTileFn(t));
  if (allWind) {
    const types: HandType[] = [HandType.ALL_WIND];
    const stdResult = wildTileId
      ? findBestAssignment(concealed, exposed, wildTileId)
      : detectTypes(concealed, exposed);
    if (stdResult.includes(HandType.ALL_TRIPLETS)) types.push(HandType.FENG_PENG);
    return { canWin: true, types };
  }

  // 第二层：标准3n+2
  const types = wildTileId
    ? findBestAssignment(concealed, exposed, wildTileId)
    : detectTypes(concealed, exposed);

  return { canWin: types.length > 0, types };
}

// ============================================================
export function detectHandTypes(
  handTiles: Tile[],
  exposedOrCount: Meld[] | number,
  wildTileIdOrChecker: string | null | WildTileChecker
): HandType[] {
  return canWin(handTiles, exposedOrCount as any, wildTileIdOrChecker as any).types;
}

// ============================================================
// 听牌检测
// ============================================================
export function isTing(
  tiles: Tile[],
  existingMelds: number,
  isWildTile: WildTileChecker = () => false
): boolean {
  // 摸牌后手牌数 = 13 - 3*existingMelds（每有一个面子，手牌少3张）
  const expected = 13 - 3 * existingMelds;
  if (tiles.length !== expected) return false;

  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const honorSuits = [TileSuit.WIND, TileSuit.DRAGON];
  const candidates: Tile[] = [];
  for (const s of [...numSuits, ...honorSuits])
    for (let v = 1; v <= 9; v++)
      candidates.push({ suit: s, value: v, id: `t-${s}-${v}`, isFlower: false });

  for (const t of candidates) {
    if (canWin([...tiles, t], existingMelds, isWildTile).canWin) return true;
  }
  return false;
}

// ============================================================
// 新增：吃碰排斥规则
// 规则：吃A门后禁止吃碰BC门；碰A门后禁止吃BC门
// ============================================================
export interface ChowPongExclusionState {
  firstActionSuit: string | null;
  firstActionType: 'chow' | 'pong' | null;
}

export function checkChowPongExclusion(
  state: ChowPongExclusionState,
  actionType: 'chow' | 'pong',
  tileSuit: string
): boolean {
  if (!state.firstActionSuit || !state.firstActionType) return true;
  if (tileSuit === state.firstActionSuit) return true;
  // 吃A门后 → 禁止吃/碰BC门
  if (state.firstActionType === 'chow') return false;
  // 碰A门后 → 禁止吃BC门（允许碰BC门）
  if (state.firstActionType === 'pong' && actionType === 'chow') return false;
  return true;
}

export function updateChowPongExclusion(
  state: ChowPongExclusionState,
  actionType: 'chow' | 'pong',
  tileSuit: string
): ChowPongExclusionState {
  if (!state.firstActionSuit) {
    return { firstActionSuit: tileSuit, firstActionType: actionType };
  }
  return state;
}

// ============================================================
// 新增：听牌最大化弃牌策略
// 对 14/11/8/5/2 张牌，枚举打哪张能听最多牌
// ============================================================
export interface TingAnalysis {
  discardTile: { suit: string; value: number; id: string } | null;
  winningTiles: Array<{ suit: string; value: number; count: number }>;
  totalWinningCount: number;
  isTing: boolean;
}

export function findBestDiscardForTing(
  tiles: Tile[],
  existingMelds: number,
  isWildTile: WildTileChecker = () => false
): TingAnalysis {
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const honorSuits = [TileSuit.WIND, TileSuit.DRAGON];
  const allTileTypes: Array<{ suit: string; value: number }> = [];
  for (const s of [...numSuits, ...honorSuits])
    for (let v = 1; v <= 9; v++)
      allTileTypes.push({ suit: s, value: v });

  let bestResult: TingAnalysis = {
    discardTile: null,
    winningTiles: [],
    totalWinningCount: 0,
    isTing: false,
  };

  for (let i = 0; i < tiles.length; i++) {
    const discard = tiles[i];
    const remaining = tiles.filter((_, j) => j !== i);

    const tingTiles: Array<{ suit: string; value: number; count: number }> = [];
    let totalCount = 0;

    for (const tt of allTileTypes) {
      const testTile: Tile = { suit: tt.suit as TileSuit, value: tt.value, id: `test-${tt.suit}-${tt.value}`, isFlower: false };
      const testHand = [...remaining, testTile];
      const result = canWin(testHand, existingMelds, isWildTile);
      if (result.canWin) {
        const inRemaining = remaining.filter(t => t.suit === tt.suit && t.value === tt.value).length;
        const count = Math.max(0, 4 - inRemaining);
        if (count > 0) {
          tingTiles.push({ suit: tt.suit, value: tt.value, count });
          totalCount += count;
        }
      }
    }

    if (totalCount > bestResult.totalWinningCount) {
      bestResult = {
        discardTile: { suit: discard.suit, value: discard.value, id: discard.id },
        winningTiles: tingTiles,
        totalWinningCount: totalCount,
        isTing: totalCount > 0,
      };
    }
  }

  return bestResult;
}
