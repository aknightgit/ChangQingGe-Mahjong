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
// RULES.md 优先级: 风碰(40点) > 风一色(20点) > 清碰(20点) > 混碰(10点) > 八花 > 四百搭 > 清一色 > 混一色 > 碰碰胡 > 普通胡
// 大吊固定10点，优先级仅高于普通胡
// 注意：数值越大优先级越高，用于降序排序
// RULES.md说明：大吊优先级低于风碰/风一色/清碰，与混碰/八花/四百搭/清一色/混一色/碰碰胡按实际番数比较
// 由于大吊是"固定10点"，它只在无其他特殊牌型时才作为主要牌型
// ===== 牌型优先级声明式配置 =====
// 清晰展示牌型层级，便于理解和维护
// 优先级: 数值越大越优先被选中为最优牌型

export const HAND_TYPE_TIER = {
  // TIER_1: 顶级固定番数牌型
  TIER_1: {
    [HandType.FENG_PENG]:     100,  // 风碰 = 40点
    [HandType.ALL_WIND]:       90,  // 风一色 = 20点
    [HandType.QING_PENG]:      80,  // 清碰 = 20点
  },
  // TIER_2: 次级固定番数牌型
  TIER_2: {
    [HandType.HUN_PENG]:       70,  // 混碰 = 10点
    [HandType.EIGHT_FLOWERS]:  60,  // 八花自摸 = 10点
    [HandType.FOUR_WILD]:      55,  // 四百搭 = 10点
    [HandType.FULL_FLUSH]:     50,  // 清一色 = 10点
  },
  // TIER_3: 公式计算牌型（需根据花牌/组合计算番数）
  TIER_3: {
    [HandType.HALF_FLUSH]:     40,  // 混一色（公式计算）
    [HandType.ALL_TRIPLETS]:   30,  // 碰碰胡（公式计算）
  },
  // TIER_4: 特殊独立牌型
  TIER_4: {
    [HandType.DA_DIAO]:       45,  // 大吊 = 10点固定（高于混一色/碰碰胡，确保独立大吊被识别）
    [HandType.STANDARD]:        10,  // 普通胡（最低优先级兜底）
  },
} as const;

// 扁平化为 Record<HandType, number>，供排序使用
type HandTypeTuple = {
  [K in keyof typeof HAND_TYPE_TIER]: keyof (typeof HAND_TYPE_TIER)[K]
}[keyof typeof HAND_TYPE_TIER];

export const HAND_TYPE_PRIORITY: Record<HandType, number> = (() => {
  const priority: Partial<Record<HandType, number>> = {};
  for (const tier of Object.values(HAND_TYPE_TIER)) {
    for (const [type, value] of Object.entries(tier)) {
      priority[type as HandType] = value as number;
    }
  }
  return priority as Record<HandType, number>;
})();

export type WildTileChecker = (tile: Tile) => boolean;

// 全局统一入口：将任意 suit 别名标准化为 canonical 值
// bamba → tiao（只认 tiao 为 canonical，bamboo 是图片/配置别名）
export function normalizeSuitAlias(suit: string): string {
  const s = suit.toLowerCase()
  if (s === 'bamboo') return 'tiao'   // 配置/图片别名 → canonical
  if (s === 'tong') return 'dots'      // 旧别名
  if (s === 'wan') return 'wan'         // already canonical
  if (s === 'tiao') return 'tiao'      // already canonical
  if (s === 'dots') return 'dots'      // already canonical
  return s  // unknown: let normalizeTileSuit handle error
}

// 【P0-9修复】wildTileGroup 参数已启用，支持花牌值组（如 customScoringMode=null 时按 wildTileGroup 判断）
export function buildWildTileChecker(wildTileId: string | null, wildTileGroup?: string[]): WildTileChecker {
  // 花牌值组兜底：customScoringMode 为空时，用 wildTileGroup 判断哪些花牌是万能
  if (!wildTileId || typeof wildTileId !== 'string') {
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t: Tile) => t.suit === TileSuit.FLOWER && (wildTileGroup as string[]).includes(String(t.value));
    }
    return () => false;
  }
  const parts = wildTileId.split('-');
  if (parts.length < 2) {
    // parts.length < 2 时也尝试 wildTileGroup 兜底
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t: Tile) => t.suit === TileSuit.FLOWER && (wildTileGroup as string[]).includes(String(t.value));
    }
    return () => false;
  }
  const canonicalSuit = normalizeSuitAlias(parts[0]);  // bamboo → tiao before enum lookup
  const normalizedSuit = normalizeTileSuit(canonicalSuit);
  if (!normalizedSuit) {
    // 花牌suit无法识别时也尝试 wildTileGroup 兜底
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t: Tile) => t.suit === TileSuit.FLOWER && (wildTileGroup as string[]).includes(String(t.value));
    }
    return () => false;
  }
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
    case 'bamboo':
      // 外部配置使用 bamboo 别名，转换为 canonical tiao
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
    // 兼容历史命名（避免重复case，已在上面处理）
    case 'WAN':
    case 'TIAO':
    case 'DOTS':
      return null;  // 这些全大写形式不应出现在TileSuit中，保持null
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
  // 策略：优先尝试"消耗百搭最少"的对子，这样保留更多百搭给面子组合
  const pairCandidates: Array<{key: string; cnt: number; isWild: boolean}> = [];

  // 候选1：自然对子（cnt>=2，消耗0百搭）——按cnt升序（cnt=2优先），让"刻3张剩1张"尽早失败
  const natPairs: Array<{key: string; cnt: number; isWild: boolean}> = [];
  for (const [k, cnt] of countMap) {
    if (cnt >= 2) natPairs.push({ key: k, cnt, isWild: false });
  }
  natPairs.sort((a, b) => a.cnt - b.cnt); // cnt=2优先（剩1张→容易失败回溯；cnt=4剩2张→有灵活性）

  // 候选2：1自然+1百搭（消耗1百搭）——按cnt降序（cnt多的优先），因为cnt多意味着该花色tile多，自然配对概率高
  const wildOne: Array<{key: string; cnt: number; isWild: boolean}> = [];
  if (wilds.length >= 1) {
    for (const [k, cnt] of countMap) {
      wildOne.push({ key: k, cnt, isWild: true });
    }
  }
  wildOne.sort((a, b) => b.cnt - a.cnt); // cnt多优先（自然牌多，wild配对后剩余的仍可组面子）

  // 候选3：2百搭（消耗2百搭）
  if (wilds.length >= 2) {
    pairCandidates.push({ key: '__wild_pair__', cnt: 2, isWild: true });
  }

  pairCandidates.push(...wildOne);
  pairCandidates.push(...natPairs);

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
  // 八花统计范围：concealed（手牌）+ exposed（门口/副露区）合计
  // 优化：只有 concealed 里 >=6 花才统计 exposed
  const concealedFlowerCount = concealed.filter(t => isFlower(t)).length;
  const flowerCount = concealedFlowerCount >= 6
    ? concealedFlowerCount + exposed.flatMap(m => m.tiles).filter(t => isFlower(t)).length
    : concealedFlowerCount;

  // ---- 第一层：特殊牌型（必须在 isValidHandSize 之前检测！）----
  // 8花自摸：无论手里有多少废牌，8花都直接胡（不能被 isValidHandSize(0) 拦掉）
  if (flowerCount >= 8) types.push(HandType.EIGHT_FLOWERS);

  // 手牌数校验（8花特殊牌型已处理，跳过花牌后手牌数）
  // 允许1张手牌：大吊等待状态（与8花一样，不需要常规手牌数校验）
  if (types.length === 0 && !isValidHandSize(concealedNonFlower.length) && concealedNonFlower.length !== 1) return [];

  const allWind = concealedNonFlower.length > 0 &&
    concealedNonFlower.every(t => isWind(t) || isDragon(t));
  if (allWind) types.push(HandType.ALL_WIND);

  // ---- 从手牌张数推导需要的面子数 ----
  // 3n+2 格式：concealed = 3*remainingMelds + 2
  // 14张→4面子, 11张→3面子, 8张→2面子, 5张→1面子, 2张→0面子
  // 特殊：1张手牌 → 大吊等待状态（4+组副露 + 1单张），可胡
  let remainingMelds: number;
  if (concealedNonFlower.length === 1) {
    remainingMelds = 0; // 大吊：1张手牌不参与组面子
  } else {
    remainingMelds = (concealedNonFlower.length - 2) / 3;
    if (!Number.isInteger(remainingMelds) || remainingMelds < 0) return [];
  }

  // ---- 统计已暴露面子 ----
  const hasExposedSequence = exposed.some(m => m.type === MeldType.SEQUENCE);

  // ---- 3n+2 格式检测 ----
  // 大吊（1张手牌）不需要检测satisfiesFormat，直接跳过
  const satisfiesFormat = concealedNonFlower.length === 1
    ? true
    : canFormMelds(concealedNonFlower, remainingMelds, () => false);

  // 碰碰胡：所有面子都是刻子/杠子（门口+手牌都不能有顺子）
  const canFormOnlyTriplets = concealedNonFlower.length === 1
    ? false // 大吊不做碰碰胡判断
    : canFormOnlyTripletsFrom(concealedNonFlower, remainingMelds, () => false);
  if (!hasExposedSequence && canFormOnlyTriplets) {
    types.push(HandType.ALL_TRIPLETS);
  }

  // ---- 大吊时碰碰胡检测 ----
  // 大吊（1张手牌）：门口4组面子全为刻子/杠时，算碰碰胡
  if (concealedNonFlower.length === 1) {
    const exposedAllTriplets = exposed.every(m =>
      m.type === MeldType.TRIPLET ||
      m.type === MeldType.KONG ||
      m.type === MeldType.CONCEALED_KONG
    );
    if (!hasExposedSequence && exposedAllTriplets) {
      types.push(HandType.ALL_TRIPLETS);
    }
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

  // 大吊：不做为胡牌前置判断，只在算分阶段检测（见calcScore）
  // 大吊 = 手牌剩1张时自摸或捉冲，胡牌判断按正常牌型走

  // ---- 垃圾胡过滤（K哥规则）----
  // 规则：多门(>=2门) + 含顺子（不能全刻子）= 禁止的普通3n+2，直接判不能胡
  // 注意：清一色/混一色/碰碰胡/风一色 等特殊牌型已在上方单独处理，不受影响
  // 判断逻辑：hand spans >= 2 suits AND canFormOnlyTriplets = false（即必须用顺子）
  function isGarbageMultiSuitsWithSequence(concealedTiles: Tile[]): boolean {
    const suits = getSuits(concealedTiles);
    if (suits.length < 2) return false;  // 单门（清一色/风一色）不是垃圾胡
    // 检查是否能全用刻子组成（顺子牌型需要wild配合才成立）
    // 用 canFormOnlyTripletsFrom 检验：不用顺子能否满足 3n+2
    const nonFlower = concealedTiles.filter(t => !isFlower(t));
    const m = (nonFlower.length - 2) / 3;
    if (!Number.isInteger(m) || m < 0) return false;
    // 如果只用刻子就能满足3n+2，说明手牌不需要顺子（全是刻子+对子）→ 不是垃圾胡
    if (canFormOnlyTripletsFrom(nonFlower, m, () => false)) return false;
    // 不能全刻子 → 必须用顺子 → 多门+顺子 → 垃圾胡
    return true;
  }

  // 基础胡牌：满足 3n+2 格式且没有更高优先级特殊牌型，且不是垃圾胡
  if (types.length === 0 && satisfiesFormat) {
    if (!isGarbageMultiSuitsWithSequence(concealedNonFlower)) {
      types.push(HandType.STANDARD);
    }
    // 垃圾胡：types.length 仍然为 0，不会胡
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
  // 【P0-1修复】放宽限制+增加fallback，防止启发式截断导致漏胡
  const ITERATION_LIMIT = 30000;

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
    // 【P0-1修复】放宽topK + 增加fallback，防止"启发式截断=漏胡"
    const TOP_K = Math.max(48, scoredCandidates.length); // wildCount>2时至少取48
    const topCandidates = scoredCandidates.slice(0, TOP_K);

    let hitLimit = false;
    function enumerateTop(
      wildIdx: number,
      currentAlloc: Array<{suit: string; value: number}>
    ) {
      if (wildIdx === wildCount) {
        iterations++;
        if (iterations > ITERATION_LIMIT) { hitLimit = true; return; }
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
        if (iterations >= ITERATION_LIMIT) { hitLimit = true; break; }
        currentAlloc.push(tt);
        enumerateTop(wildIdx + 1, currentAlloc);
        currentAlloc.pop();
      }
    }
    enumerateTop(0, []);

    // 【P0-1 fallback】命中迭代上限后，对剩余候选做低成本可行性扫描，避免截断漏解
    if (hitLimit && scoredCandidates.length > TOP_K) {
      const remaining = scoredCandidates.slice(TOP_K);
      for (const tt of remaining) {
        const testAlloc = [tt];
        const virtualHand = [...naturals];
        virtualHand.push({ suit: tt.suit as TileSuit, value: tt.value, id: `v-${Math.random()}`, isFlower: false });
        const types = detectTypes(virtualHand, exposed);
        if (types.length > 0) {
          const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
          if (primaryScore > bestScore) {
            bestScore = primaryScore;
            bestTypes = [...types];
          }
        }
      }
    }
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
  const result = findBestAssignmentHeuristic(tiles, exposed, wildTileId ?? '');
  // 结果已按优先级排序
  return result;
}

// ============================================================
// 主入口：canWin
// ============================================================
function findBestAssignmentHeuristic(
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
  const allCandidates: Array<{ suit: string; value: number }> = [];
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numSuits) {
    for (let value = 1; value <= 9; value++) {
      allCandidates.push({ suit, value });
    }
  }
  for (let value = 1; value <= 4; value++) {
    allCandidates.push({ suit: TileSuit.WIND, value });
  }
  for (let value = 1; value <= 3; value++) {
    allCandidates.push({ suit: TileSuit.DRAGON, value });
  }

  if (naturals.length === 0) {
    const virtualHand: Tile[] = [];
    for (let i = 0; i < wildCount; i++) {
      virtualHand.push({ suit: wildSuit as TileSuit, value: parseInt(wildVal, 10), id: `vh-${i}`, isFlower: false });
    }
    return detectTypes(virtualHand, exposed);
  }

  let bestTypes: HandType[] = [];
  let bestScore = -1;
  let iterations = 0;
  const ITERATION_LIMIT = 30000;

  const baselineTypes = detectTypes(concealed, exposed);
  if (baselineTypes.length > 0) {
    bestScore = HAND_TYPE_PRIORITY[baselineTypes[0]] ?? 0;
    bestTypes = [...baselineTypes];
  }

  const naturalCountByKey = new Map<string, number>();
  const suitLoad = new Map<string, number>();
  for (const tile of naturals) {
    const key = `${tile.suit}-${tile.value}`;
    naturalCountByKey.set(key, (naturalCountByKey.get(key) || 0) + 1);
    suitLoad.set(tile.suit, (suitLoad.get(tile.suit) || 0) + 1);
  }

  const materializeTypes = (alloc: Array<{ suit: string; value: number }>) => {
    const virtualHand = [...naturals];
    for (let i = 0; i < alloc.length; i++) {
      const tile = alloc[i];
      virtualHand.push({ suit: tile.suit as TileSuit, value: tile.value, id: `vh-${i}`, isFlower: false });
    }
    return detectTypes(virtualHand, exposed);
  };

  if (wildCount <= 2) {
    const enumerateAll = (wildIdx: number, alloc: Array<{ suit: string; value: number }>) => {
      if (wildIdx === wildCount) {
        iterations++;
        if (iterations > ITERATION_LIMIT) return;
        const types = materializeTypes(alloc);
        if (types.length > 0) {
          const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
          if (primaryScore > bestScore) {
            bestScore = primaryScore;
            bestTypes = [...types];
          }
        }
        return;
      }

      for (const candidate of allCandidates) {
        if (iterations >= ITERATION_LIMIT) break;
        alloc.push(candidate);
        enumerateAll(wildIdx + 1, alloc);
        alloc.pop();
      }
    };

    enumerateAll(0, []);
    return bestTypes;
  }

  const scoreCandidate = (candidate: { suit: string; value: number }): number => {
    const key = `${candidate.suit}-${candidate.value}`;
    const sameCount = naturalCountByKey.get(key) || 0;
    let score = sameCount * 42;

    if (candidate.suit === TileSuit.DRAGON) score += 96;
    else if (candidate.suit === TileSuit.WIND) score += 76;
    else score += 36 + (suitLoad.get(candidate.suit) || 0) * 4;

    if (sameCount >= 2) score += 36;

    if (candidate.suit === TileSuit.DOTS || candidate.suit === TileSuit.CHARACTERS || candidate.suit === TileSuit.BAMBOOS) {
      const left1 = naturalCountByKey.get(`${candidate.suit}-${candidate.value - 1}`) || 0;
      const right1 = naturalCountByKey.get(`${candidate.suit}-${candidate.value + 1}`) || 0;
      const left2 = naturalCountByKey.get(`${candidate.suit}-${candidate.value - 2}`) || 0;
      const right2 = naturalCountByKey.get(`${candidate.suit}-${candidate.value + 2}`) || 0;
      score += (left1 + right1) * 12;
      score += (left2 + right2) * 6;
      if (left1 > 0 && right1 > 0) score += 18;
    }

    return score;
  };

  const scoreState = (alloc: Array<{ suit: string; value: number }>): number => {
    const allocCounts = new Map<string, number>();
    for (const tile of alloc) {
      const key = `${tile.suit}-${tile.value}`;
      allocCounts.set(key, (allocCounts.get(key) || 0) + 1);
    }

    let total = 0;
    for (const [key, count] of allocCounts) {
      const naturalCount = naturalCountByKey.get(key) || 0;
      total += naturalCount * count * 24;
      if (naturalCount + count >= 3) total += 32;
      else if (naturalCount + count === 2) total += 14;
    }

    const suitSet = new Set(
      [...naturals.map(tile => tile.suit), ...alloc.map(tile => tile.suit)]
        .filter(suit => suit === TileSuit.DOTS || suit === TileSuit.CHARACTERS || suit === TileSuit.BAMBOOS)
    );
    if (suitSet.size === 1) total += 20;

    return total;
  };

  const topCandidates = allCandidates
    .map(candidate => ({ ...candidate, score: scoreCandidate(candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(18, allCandidates.length));

  const beamWidth = wildCount >= 5 ? 10 : 14;
  let states: Array<{ alloc: Array<{ suit: string; value: number }>; heuristic: number }> = [
    { alloc: [], heuristic: 0 }
  ];

  for (let depth = 0; depth < wildCount && iterations < ITERATION_LIMIT; depth++) {
    const expanded: Array<{ alloc: Array<{ suit: string; value: number }>; heuristic: number }> = [];
    for (const state of states) {
      for (const candidate of topCandidates) {
        const nextAlloc = [...state.alloc, { suit: candidate.suit, value: candidate.value }];
        expanded.push({
          alloc: nextAlloc,
          heuristic: state.heuristic + candidate.score + scoreState(nextAlloc)
        });
      }
    }

    const deduped = new Map<string, { alloc: Array<{ suit: string; value: number }>; heuristic: number }>();
    for (const state of expanded.sort((a, b) => b.heuristic - a.heuristic)) {
      const signature = state.alloc
        .map(tile => `${tile.suit}-${tile.value}`)
        .sort()
        .join(',');
      if (!deduped.has(signature)) {
        deduped.set(signature, state);
      }
      if (deduped.size >= beamWidth) break;
    }

    states = Array.from(deduped.values());
  }

  for (const state of states) {
    iterations++;
    if (iterations > ITERATION_LIMIT) break;
    const types = materializeTypes(state.alloc);
    if (types.length > 0) {
      const primaryScore = HAND_TYPE_PRIORITY[types[0]] ?? 0;
      if (primaryScore > bestScore) {
        bestScore = primaryScore;
        bestTypes = [...types];
      }
    }
  }

  return bestTypes;
}

export function canWin(
  handTiles: Tile[],
  exposedOrCount: Meld[] | number,
  wildTileIdOrChecker: string | null | WildTileChecker,
  _skipWildAssignment?: boolean  // 跳过 findBestAssignment DFS（用于 baseline 训练提速）
): { canWin: boolean; types: HandType[] } {
  const isOldSig = typeof exposedOrCount === 'number';
  const exposed: Meld[] = isOldSig ? [] : exposedOrCount;
  const wildTileId: string | null = isOldSig
    ? (typeof wildTileIdOrChecker === 'string' ? wildTileIdOrChecker : null)
    : (typeof wildTileIdOrChecker === 'string' ? wildTileIdOrChecker : null);

  // [TEMP DISABLED] 防御性检查临时禁用——阻止了正确的胡牌判定
  // const totalExposedTiles = exposed.reduce(
  //   (sum, m) => sum + (m.type === MeldType.KONG ? 3 : m.tiles.length), 0
  // );
  // const expectedConcealed = 14 - totalExposedTiles;
  // const minExpected = expectedConcealed - 1;
  // const maxExpected = expectedConcealed + 3;
  // if (handTiles.length < minExpected || handTiles.length > maxExpected) {
  //   return { canWin: false, types: [] };
  // }

  // [TEMP DISABLED] 重复 tile ID 检查临时禁用
  // const seenIds = new Set<string>();
  // for (const t of handTiles) {
  //   if (seenIds.has(t.id)) {
  //     return { canWin: false, types: [] };
  //   }
  //   seenIds.add(t.id);
  // }

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
  // 八花统计范围：concealed（手牌）+ exposed（门口/副露区）合计
  const concealedFlowers = concealed.filter(t => isFlower(t));
  const concealedNonFlower = concealed.filter(t => !isFlower(t));
  // 八花优化：只有 concealed 里 >=6 花才需要统计 exposed（节省遍历开销）
  const flowerCount = concealedFlowers.length >= 6
    ? concealedFlowers.length + exposed.flatMap(m => m.tiles).filter(t => isFlower(t)).length
    : concealedFlowers.length;

  // 四百搭（只能靠concealed自摸，exposed不可能有百搭）
  let isFourWild = false;
  if (wildTileId) {
    const wildTileFn = buildWildTileChecker(wildTileId);
    const wildCount = concealed.filter(t => wildTileFn(t)).length;
    isFourWild = wildCount >= 4 && exposed.length === 0 && isValidHandSize(concealedNonFlower.length);
  }
  if (isFourWild) {
    return { canWin: true, types: [HandType.FOUR_WILD] };
  }

  // 手牌数校验
  // 有 wildTile 时：花=百搭，计入手牌数 → 用 concealed.length
  // 无 wildTile 时：花=普通牌，不参与组牌 → 用 concealedNonFlower.length
  if (wildTileId) {
    // 花做百搭：花参与手牌数计算，但普通花牌（不是万能花）不占手牌位
    // 过滤掉普通花牌，只保留万能花牌+非花牌参与手牌数校验
    const concealedNonFlower = concealed.filter(t => !isFlower(t));
    if (!isValidHandSize(concealedNonFlower.length)) {
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

  // 第二层：标准 3n+2 / 特殊牌型检测
  // _skipWildAssignment 时跳过 findBestAssignment DFS，直接用 detectTypes（用于 baseline 提速）
  const types = (wildTileId && !_skipWildAssignment)
    ? findBestAssignmentHeuristic(concealed, exposed, wildTileId)
    : detectTypes(concealed, exposed);

  const validTypes = types;
  if (types.length === 0) {
  } else {
  }

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
        // 标准化 suit 别名（bamboo → tiao）
        const [suit, ...rest] = src.customScoringMode.split('-')
        resolvedWild = normalizeSuitAlias(suit) + '-' + rest.join('-')
      } else if (typeof src.wildTileId === 'string') {
        // 标准化 suit 别名
        const parts = src.wildTileId.split('-')
        resolvedWild = parts.length >= 2 ? normalizeSuitAlias(parts[0]) + '-' + parts.slice(1).join('-') : src.wildTileId
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
  // 非万能花牌不占手牌位，过滤后再校验
  const nonFlower = tiles.filter(t => !isFlower(t) || isWildTile(t));
  const expected = 14 - 3 * existingMelds;
  if (nonFlower.length !== expected) {
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
