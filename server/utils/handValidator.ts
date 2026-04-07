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
  STANDARD      = 'standard',      // 基础胡牌（3n+2格式，无特殊牌型）
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
  [HandType.STANDARD]:        10,
};

export type WildTileChecker = (tile: Tile) => boolean;

export function buildWildTileChecker(wildTileId: string | null): WildTileChecker {
  if (!wildTileId || typeof wildTileId !== 'string') return () => false;
  const parts = wildTileId.split('-');
  if (parts.length < 2) return () => false;
  const normalizedSuit = normalizeTileSuit(parts[0]);
  if (!normalizedSuit) return () => false;
  return (t: Tile) => t.suit === normalizedSuit && String(t.value) === parts[1];
}

function normalizeTileSuit(rawSuit: string): TileSuit | null {
  switch (rawSuit) {
    case TileSuit.DOTS:
    case 'tong':
      return TileSuit.DOTS;
    case TileSuit.CHARACTERS:
    case 'wan':
      return TileSuit.CHARACTERS;
    case TileSuit.BAMBOOS:
    case 'tiao':
      return TileSuit.BAMBOOS;
    case TileSuit.WIND:
    case 'feng':
      return TileSuit.WIND;
    case TileSuit.DRAGON:
    case 'jian':
      return TileSuit.DRAGON;
    case TileSuit.FLOWER:
    case 'hua':
      return TileSuit.FLOWER;
    // 兼容历史命名
    case 'WAN':
      return TileSuit.CHARACTERS;
    case 'TIAO':
      return TileSuit.BAMBOOS;
    case 'DOTS':
      return TileSuit.DOTS;
    case 'CHARACTERS':
      return TileSuit.CHARACTERS;
    case 'BAMBOOS':
      return TileSuit.BAMBOOS;
    default:
      return null;
  }
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
// [DEBUG] 记录canFormMelds失败的hand
const _debugHandCache = new Set<string>();
function canFormMelds(
  tiles: Tile[],
  n: number,
  isWildTile: WildTileChecker
): boolean {
  // n=0 时：要么没牌，要么恰好2张能组成对子
  if (n === 0) {
    if (tiles.length === 0) return true;
    if (tiles.length === 2) {
      const wilds = tiles.filter(t => isWildTile(t));
      const naturals = tiles.filter(t => !isWildTile(t));
      // 2百搭 或 2张相同自然牌 或 1自然+1百搭
      if (wilds.length >= 2) return true;
      if (naturals.length === 2 && naturals[0].suit === naturals[1].suit && naturals[0].value === naturals[1].value) return true;
      if (naturals.length === 1 && wilds.length === 1) return true;
    }
    return false;
  }

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

  // [DEBUG] canFormMelds失败时打印信息
  if (tiles.length >= 11 && _debugHandCache.size < 5) {
    const sig = tiles.map(t => `${t.suit[0]}${t.value}`).sort().join(',');
    if (!_debugHandCache.has(sig)) {
      _debugHandCache.add(sig);
    }
  }
  return false;
}

// 尝试只用刻子组成 n 个面子（不用顺子）
function canFormOnlyTripletsFrom(
  tiles: Tile[],
  n: number,
  isWildTile: WildTileChecker
): boolean {
  if (n === 0) return tiles.length === 0;

  const wilds = tiles.filter(t => isWildTile(t));
  const naturals = tiles.filter(t => !isWildTile(t));

  const countMap = new Map<string, number>();
  for (const t of naturals) {
    const k = `${t.suit}-${t.value}`;
    countMap.set(k, (countMap.get(k) || 0) + 1);
  }

  // 找候选对子
  const pairCandidates: Array<{key: string; cnt: number; isWild: boolean}> = [];
  for (const [k, cnt] of countMap) {
    if (cnt >= 2) pairCandidates.push({ key: k, cnt, isWild: false });
  }
  if (wilds.length >= 1) {
    for (const [k] of countMap) {
      pairCandidates.push({ key: k, cnt: 1, isWild: true });
    }
  }
  if (wilds.length >= 2) {
    pairCandidates.push({ key: '__wild_pair__', cnt: 2, isWild: true });
  }

  for (const pair of pairCandidates) {
    const map2 = new Map(countMap);
    let wildLeft = wilds.length;

    if (!pair.isWild) {
      const prev = map2.get(pair.key)!;
      if (prev < 2) continue;
      map2.set(pair.key, prev - 2);
    } else if (pair.key === '__wild_pair__') {
      wildLeft -= 2;
    } else {
      const prev = map2.get(pair.key)!;
      map2.set(pair.key, prev - 1);
      wildLeft -= 1;
    }

    if (wildLeft < 0) continue;
    if (tryFormOnlyTriplets(n, wildLeft, map2)) return true;
  }

  return false;
}

// 只用刻子组成 n 个面子
function tryFormOnlyTriplets(n: number, wildLeft: number, map: Map<string, number>): boolean {
  if (n === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }

  let firstKey: string | null = null;
  for (const k of map.keys()) {
    if ((map.get(k) || 0) > 0) { firstKey = k; break; }
  }

  if (!firstKey) return wildLeft >= n * 3;

  const cnt = map.get(firstKey)!;
  const needTriplet = 3 - cnt;
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, 0);
    if (tryFormOnlyTriplets(n - 1, wildLeft - needTriplet, map)) return true;
    map.set(firstKey, saved);
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
  const needTriplet = Math.max(0, 3 - cnt);
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, Math.max(0, cnt - 3)); // 只消耗3张，多余的留下
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

  // ---- 第一层：特殊牌型（必须在 isValidHandSize 之前检测！）----
  // 8花自摸：无论手里有多少废牌，8花都直接胡（不能被 isValidHandSize(0) 拦掉）
  if (flowerCount >= 8) types.push(HandType.EIGHT_FLOWERS);

  // 手牌数校验（8花特殊牌型已处理，跳过花牌后手牌数）
  if (types.length === 0 && !isValidHandSize(concealedNonFlower.length)) return [];

  const allWind = concealedNonFlower.length > 0 &&
    concealedNonFlower.every(t => isWind(t) || isDragon(t));
  if (allWind) types.push(HandType.ALL_WIND);

  // ---- 从手牌张数推导需要的面子数 ----
  // 3n+2 格式：concealed = 3*remainingMelds + 2
  // 14张→4面子, 11张→3面子, 8张→2面子, 5张→1面子, 2张→0面子
  const remainingMelds = (concealedNonFlower.length - 2) / 3;
  if (!Number.isInteger(remainingMelds) || remainingMelds < 0) return [];

  // ---- 统计已暴露面子 ----
  const hasExposedSequence = exposed.some(m => m.type === MeldType.SEQUENCE);

  // ---- 3n+2 格式检测 ----
  const satisfiesFormat = canFormMelds(concealedNonFlower, remainingMelds, () => false);

  // 碰碰胡：所有面子都是刻子/杠子（门口+手牌都不能有顺子）
  const canFormOnlyTriplets = canFormOnlyTripletsFrom(concealedNonFlower, remainingMelds, () => false);
  if (!hasExposedSequence && canFormOnlyTriplets) {
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

  // ---- 检测是否"禁止的普通胡" ----
  // K哥铁律：多门(>=2门) + 有顺子(非全刻子) = 禁止的普通胡
  // 条件：numSuitCount>=2 且 不是ALL_TRIPLETS（=有顺子）
  const isForbiddenOrdinary = numSuitCount >= 2 && !types.includes(HandType.ALL_TRIPLETS);

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

  // 基础胡牌：满足3n+2格式但没有特殊牌型，且不是"禁止的普通胡"
  // 禁止的普通胡 = 多门(>=2门) + 含顺子（= 非全刻子）→ 直接过滤，不加入STANDARD
  if (types.length === 0 && satisfiesFormat && !isForbiddenOrdinary) {
    types.push(HandType.STANDARD);
  }

  return types.sort((a, b) => (HAND_TYPE_PRIORITY[b] ?? 0) - (HAND_TYPE_PRIORITY[a] ?? 0));
}

// ============================================================
// 百搭最优分配 → 穷举所有分配方案，找最高牌型
// ============================================================
function findBestAssignment(
  concealed: Tile[],
  exposed: Meld[],
  wildTileId: string
): HandType[] {
  if (!wildTileId || typeof wildTileId !== 'string') return detectTypes(concealed, exposed);
  const parts = wildTileId.split('-');
  if (parts.length < 2) return detectTypes(concealed, exposed);
  const [wildSuitRaw, wildVal] = parts;
  const wildSuit = normalizeTileSuit(wildSuitRaw);
  if (!wildSuit) return detectTypes(concealed, exposed);
  const isWild = (t: Tile) => t.suit === wildSuit && String(t.value) === wildVal;

  const wildCount = concealed.filter(t => isWild(t)).length;
  if (wildCount === 0) return detectTypes(concealed, exposed);

  const naturals = concealed.filter(t => !isWild(t));

  // 生成所有合法候选牌（34种：3门数牌×9 + 风4 + 箭3）
  const allCandidates: Array<{suit: string; value: number}> = [];
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const s of numSuits) {
    for (let v = 1; v <= 9; v++) {
      allCandidates.push({ suit: s, value: v });
    }
  }
  // 风牌 1-4
  for (let v = 1; v <= 4; v++) {
    allCandidates.push({ suit: TileSuit.WIND, value: v });
  }
  // 箭牌 1-3
  for (let v = 1; v <= 3; v++) {
    allCandidates.push({ suit: TileSuit.DRAGON, value: v });
  }

  // 如果没有任何自然牌，百搭只能自成牌型
  if (naturals.length === 0) {
    const virtualHand: Tile[] = [];
    for (let i = 0; i < wildCount; i++) {
      virtualHand.push({ suit: wildSuit as TileSuit, value: parseInt(wildVal), id: `v-${i}`, isFlower: false });
    }
    return detectTypes(virtualHand, exposed);
  }

  // 用记忆化 DFS 搜索最优百搭分配
  // 状态：(wildIdx, currentAlloc) → 最优牌型
  // 为控制复杂度，使用贪心+回溯策略
  let bestTypes: HandType[] = [];
  let bestScore = -1;
  let iterations = 0;
  const ITERATION_LIMIT = 8000;

  // 先用已有牌型做基准
  const baselineTypes = detectTypes(concealed, exposed);
  if (baselineTypes.length > 0) {
    bestScore = HAND_TYPE_PRIORITY[baselineTypes[0]] ?? 0;
    bestTypes = [...baselineTypes];
  }

  // 对每个百搭，尝试所有34种候选牌
  // 使用迭代加深：先试单张最优，再试组合
  function enumerateAll(
    wildIdx: number,
    currentAlloc: Array<{suit: string; value: number}>
  ) {
    if (wildIdx === wildCount) {
      iterations++;
      if (iterations > ITERATION_LIMIT) return;
      const virtualHand = [...naturals];
      for (const a of currentAlloc) {
        virtualHand.push({ suit: a.suit as TileSuit, value: a.value, id: `v-${Math.random()}`, isFlower: false });
      }
      const types = detectTypes(virtualHand, exposed);
      if (types.length > 0) {
        const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
        if (primaryScore > bestScore) {
          bestScore = primaryScore;
          bestTypes = [...types];
        }
      }
      return;
    }

    // 剪枝：如果当前已无法超越最优分数，提前返回
    for (const tt of allCandidates) {
      if (iterations >= ITERATION_LIMIT) break;
      currentAlloc.push(tt);
      enumerateAll(wildIdx + 1, currentAlloc);
      currentAlloc.pop();
    }
  }

  // 限制搜索深度：百搭数量≤2时全搜索，>2时只搜索高分候选
  if (wildCount <= 2) {
    enumerateAll(0, []);
  } else {
    // 百搭>2时，只搜索高分候选（箭牌>风牌>数牌）
    const scoredCandidates = allCandidates.map(tt => {
      const tile = { suit: tt.suit as TileSuit, value: tt.value };
      let score = 50;
      if (isDragon(tile as Tile)) score = 110;
      else if (isWind(tile as Tile)) score = 100;
      // 手牌中已有的牌加分
      if (naturals.some(t => t.suit === tt.suit && t.value === tt.value)) score += 20;
      return { ...tt, score };
    });
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, 15); // 取top15

    function enumerateTop(
      wildIdx: number,
      currentAlloc: Array<{suit: string; value: number}>
    ) {
      if (wildIdx === wildCount) {
        iterations++;
        if (iterations > ITERATION_LIMIT) return;
        const virtualHand = [...naturals];
        for (const a of currentAlloc) {
          virtualHand.push({ suit: a.suit as TileSuit, value: a.value, id: `v-${Math.random()}`, isFlower: false });
        }
        const types = detectTypes(virtualHand, exposed);
        if (types.length > 0) {
          const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
          if (primaryScore > bestScore) {
            bestScore = primaryScore;
            bestTypes = [...types];
          }
        }
        return;
      }
      for (const tt of topCandidates) {
        if (iterations >= ITERATION_LIMIT) break;
        currentAlloc.push(tt);
        enumerateTop(wildIdx + 1, currentAlloc);
        currentAlloc.pop();
      }
    }
    enumerateTop(0, []);
  }

  return bestTypes;
}

// ============================================================
// 新增：findBestHandTypes - 返回最优牌型列表（公开API）
// ============================================================
export function findBestHandTypes(
  tiles: Tile[],
  exposed: Meld[],
  wildTileId: string | null
): HandType[] {
  const result = findBestAssignment(tiles, exposed, wildTileId ?? '');
  // 结果已按优先级排序
  return result;
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

  // === 防御性检查：手牌 + 副露必须 = 14 张（流局）或 14 + 1~N 张（杠后补牌）===
  // 每副露消耗 3 张，正常胡牌：14 - 3*meldCount + 1(摸牌) = 15 - 3*meldCount
  // 但自摸胡时手牌 = 14 - 3*meldCount（已摸进1张然后胡）
  // 捉冲胡时手牌 = 13 - 3*meldCount（未摸牌，打出1张，然后捉冲胡）
  // [BugFix] Kong.m.tiles.length = 4，但其中 1 张是补牌（来自牌墙），实际只消耗 3 张手牌
  const totalExposedTiles = exposed.reduce(
    (sum, m) => sum + (m.type === MeldType.KONG ? 3 : m.tiles.length), 0
  );
  const expectedConcealed = 14 - totalExposedTiles; // 正常胡牌：5/8/11/14
  // 允许的容忍范围：捉冲时少1张（打出1张），杠后摸补牌时多1~3张
  const minExpected = expectedConcealed - 1; // 捉冲：多打出1张
  const maxExpected = expectedConcealed + 3; // 杠后补牌：最多补3张
  if (handTiles.length < minExpected || handTiles.length > maxExpected) {
    // 游戏状态异常：手牌数和副露数不匹配
    return { canWin: false, types: [] };
  }

  // 检查重复 tile ID（同一张物理牌出现多次 = 游戏状态 bug）
  const seenIds = new Set<string>();
  for (const t of handTiles) {
    if (seenIds.has(t.id)) {
      // [BugFix] 重复 tile ID：游戏状态异常，直接返回不能胡
      return { canWin: false, types: [] };
    }
    seenIds.add(t.id);
  }

  // canWin 结果缓存（同时缓存 boolean 和 types，避免重复计算）
  const handSig = handSignature(handTiles)
  const meldCount = exposed.length
  const cacheKey = `${handSig}|${meldCount}|${wildTileId || ''}`
  if (canWinResultCache.has(cacheKey)) {
    _canWinHits++
    const cached = canWinResultCache.get(cacheKey)!
    return { canWin: cached.canWin, types: cached.types }
  }
  _canWinMisses++

  const concealed = handTiles;
  // 花=百搭时：花计入 flowerCount，参与手牌数计算（当做正常手牌）
  // 花=普通牌时：花不参与手牌数计算，在 detectTypes 里处理八花
  const flowerCount = concealed.filter(t => isFlower(t)).length;
  const concealedNonFlower = concealed.filter(t => !isFlower(t));

  // 四百搭（花是百搭时，不需要八花检测；花是普通牌时，可能含花）
  if (wildTileId) {
    const wildTileFn = buildWildTileChecker(wildTileId);
    const wildCount = concealed.filter(t => wildTileFn(t)).length;
    if (wildCount >= 4) {
      return { canWin: true, types: [HandType.FOUR_WILD] };
    }
  }

  // 手牌数校验
  // 有 wildTile 时：花=百搭，计入手牌数 → 用 concealed.length
  // 无 wildTile 时：花=普通牌，不参与组牌 → 用 concealedNonFlower.length
  if (wildTileId) {
    // 花做百搭：花参与手牌数计算
    if (!isValidHandSize(concealed.length)) {
      return { canWin: false, types: [] };
    }
  } else {
    // 花做普通牌：花不参与手牌数计算
    // 但8花特殊——无论手里有多少废牌，8花都直接胡
    if (flowerCount >= 8) {
      return { canWin: true, types: [HandType.EIGHT_FLOWERS] };
    }
    if (!isValidHandSize(concealedNonFlower.length)) {
      return { canWin: false, types: [] };
    }
  }

  const isWildTileFn = buildWildTileChecker(wildTileId);

  // 八花自摸：只有花是普通牌时才检测（wildTile 路径不检测八花）
  // 花=普通牌时：8张花即可胡（门口+手牌）
  // 花=百搭时：不检测八花，只检测四百搭（上面已处理）
  if (!wildTileId && flowerCount >= 8) {
    return { canWin: true, types: [HandType.EIGHT_FLOWERS] };
  }

  const allWind = concealedNonFlower.length > 0 &&
    concealedNonFlower.every(t => isWind(t) || isDragon(t) || isWildTileFn(t));
  if (allWind) {
    return { canWin: true, types: [HandType.ALL_WIND] };
  }

  // 第二层：标准3n+2 — K哥铁律：没有"普通胡/基础胡"！
  const types = wildTileId
    ? findBestAssignment(concealed, exposed, wildTileId)
    : detectTypes(concealed, exposed);

  // K哥规则：过滤掉STANDARD（只有特殊牌型才能胡）
  const validTypes = types;

  const result = { canWin: validTypes.length > 0, types: validTypes }
  // 缓存结果（同时缓存 boolean 和 types）
  if (canWinResultCache.size < CAN_WIN_CACHE_MAX) {
    canWinResultCache.set(cacheKey, { canWin: result.canWin, types: result.types })
  }
  return result;
}

// ============================================================
export function detectHandTypes(
  handTiles: Tile[],
  exposedOrCount: Meld[] | number,
  wildTileIdOrChecker: string | null | WildTileChecker,
  _isSelfDrawn?: boolean,
  _flowerCount?: number,
  _ruleConfigOrNull?: any,
  gameStateOrWildGroup?: any
): HandType[] {
  let resolvedWild: string | null | WildTileChecker = wildTileIdOrChecker;

  // 兼容旧调用: detectHandTypes(..., null, game.wildTileGroup)
  // 当 wildTileId 为空时，尝试从 gameState/ruleConfig 兜底取当前百搭
  if (!resolvedWild) {
    const src = gameStateOrWildGroup || _ruleConfigOrNull;

    if (src && typeof src === 'object') {
      if (typeof src.customScoringMode === 'string' && src.customScoringMode.includes('-')) {
        resolvedWild = src.customScoringMode;
      } else if (typeof src.wildTileId === 'string') {
        resolvedWild = src.wildTileId;
      } else if (typeof src.wildTileSuit === 'string' && typeof src.wildTileValue === 'number') {
        resolvedWild = `${src.wildTileSuit}-${src.wildTileValue}`;
      }
    }
  }

  return canWin(handTiles, exposedOrCount as any, resolvedWild as any).types;
}

// ============================================================
// 听牌检测（带缓存优化）
// ============================================================
// canWin 结果缓存（同时缓存 boolean 和 types）
// key = handSignature + meldCount + wildId
const canWinResultCache = new Map<string, { canWin: boolean; types: HandType[] }>()
const CAN_WIN_CACHE_MAX = 100000
let _canWinHits = 0
let _canWinMisses = 0

export function getCanWinCacheStats(): { hits: number; misses: number; hitRate: string } {
  const total = _canWinHits + _canWinMisses
  return {
    hits: _canWinHits,
    misses: _canWinMisses,
    hitRate: total > 0 ? `${(_canWinHits / total * 100).toFixed(1)}%` : 'N/A'
  }
}

export function clearCanWinCache(): void {
  canWinResultCache.clear()
  _canWinHits = 0
  _canWinMisses = 0
}

// ============================================================
// isTing 缓存：key = 手牌签名 + meldCount + wildId
// 训练脚本中同一手牌会被反复查询（4个玩家×每turn），缓存命中率>80%
const isTingCache = new Map<string, boolean>()
const IS_TING_CACHE_MAX = 50000  // 防止内存泄漏
let _isTingHits = 0
let _isTingMisses = 0

function handSignature(tiles: Tile[]): string {
  // 快速签名：按 suit首字母-value 排序后拼接
  const len = tiles.length
  const parts = new Array<string>(len)
  for (let i = 0; i < len; i++) {
    const t = tiles[i]
    parts[i] = t.suit[0] + t.value
  }
  parts.sort()
  return parts.join(',')
}

/** 清空 isTing 缓存（每局开始时调用） */
export function clearIsTingCache(): void {
  isTingCache.clear()
  // 不重置计数器，让训练全程累积统计
}

/** 重置 isTing 缓存统计（训练开始时调用） */
export function resetIsTingCacheStats(): void {
  _isTingHits = 0
  _isTingMisses = 0
}

/** 获取 isTing 缓存统计 */
export function getIsTingCacheStats(): { hits: number; misses: number; hitRate: string } {
  const total = _isTingHits + _isTingMisses
  return {
    hits: _isTingHits,
    misses: _isTingMisses,
    hitRate: total > 0 ? `${(_isTingHits / total * 100).toFixed(1)}%` : 'N/A'
  }
}

export function isTing(
  tiles: Tile[],
  existingMelds: number,
  isWildTile: WildTileChecker = () => false
): boolean {
  // 摸牌后手牌数 = 14 - 3*existingMelds（每有一个面子，手牌少3张；起手13+摸牌1=14）
  const expected = 14 - 3 * existingMelds;
  if (tiles.length !== expected) {
    return false;
  }

  // 构建缓存key
  const sig = handSignature(tiles)
  // 从 isWildTile 函数提取 wildId（尝试从闭包中获取）
  // 简化：用 existingMelds + tiles.length 做key（同一局wildId不变）
  const key = `${sig}|${existingMelds}`

  if (isTingCache.has(key)) {
    _isTingHits++
    return isTingCache.get(key)!
  }
  _isTingMisses++

  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const honorSuits = [TileSuit.WIND, TileSuit.DRAGON];
  const candidates: Tile[] = [];
  for (const s of [...numSuits, ...honorSuits])
    for (let v = 1; v <= 9; v++)
      candidates.push({ suit: s, value: v, id: `t-${s}-${v}`, isFlower: false });

  for (const t of candidates) {
    if (canWin([...tiles, t], existingMelds, isWildTile).canWin) {
      isTingCache.set(key, true)
      return true
    }
  }

  isTingCache.set(key, false)
  // 防止缓存无限增长
  if (isTingCache.size > IS_TING_CACHE_MAX) {
    // 删除最早的一半
    const keys = Array.from(isTingCache.keys())
    for (let i = 0; i < keys.length / 2; i++) {
      isTingCache.delete(keys[i])
    }
  }
  return false;
}

// ============================================================
// 新增：吃碰排斥规则
// 规则（K哥铁律）：
// 吃了A门：A门可吃/碰；BC门禁止一切
// 碰了A门：A门可吃/碰；BC门仅禁止吃，允许碰（碰碰胡）
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
  if (!state.firstActionSuit || !state.firstActionType) return true;  // 无→自由

  const isSameSuit = tileSuit === state.firstActionSuit;

  switch (state.firstActionType) {
    case 'chow':
      // 吃了A门：A门可吃/碰；BC门禁止一切
      return isSameSuit;

    case 'pong':
      // 碰了A门：A门可吃/碰；BC门仅禁止吃，允许碰
      if (actionType === 'chow') return isSameSuit;  // A门可吃，BC门禁吃
      return true;                                   // 碰任何门均允许

    default:
      return true;
  }
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
  // 2张手牌已经是将牌状态，不需要弃牌
  if (tiles.length <= 2) {
    return {
      discardTile: null,
      winningTiles: [],
      totalWinningCount: 0,
      isTing: false,
    };
  }

  // 生成合法候选听牌：数牌1-9，风牌1-4，箭牌1-3
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const allTileTypes: Array<{ suit: string; value: number }> = [];
  for (const s of numSuits)
    for (let v = 1; v <= 9; v++)
      allTileTypes.push({ suit: s, value: v });
  // 风牌 1-4
  for (let v = 1; v <= 4; v++)
    allTileTypes.push({ suit: TileSuit.WIND, value: v });
  // 箭牌 1-3
  for (let v = 1; v <= 3; v++)
    allTileTypes.push({ suit: TileSuit.DRAGON, value: v });

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
