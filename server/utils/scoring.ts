/**
 * 长清阁麻将 - 番数计算系统
 * 
 * 两种计算方式:
 * 1. 固定番数牌型（优先级最高，直接使用固定值）
 * 2. 公式计算牌型（碰碰胡/混一色）
 */

import { Tile, Meld, MeldType, TileSuit, Player } from '../types/game';
import { isFlower, isWind, isDragon, groupTiles, tilesEqual, getTileDisplayName } from './tiles';
import { HandType, HAND_TYPE_PRIORITY, canWin } from './handValidator';

// ===== 固定番数牌型 =====
// RULES.md 固定番数规则:
// 风碰=40, 风一色=20, 清碰=20, 混碰=10, 清一色=10
// 无花自摸=10, 杠开=10, 八花自摸=10, 四百搭=10, 大吊=10
// 大吊组合: 碰碰胡/混一色/清一色/清碰/风一色/风碰 各有对应固定番数
const FIXED_FAN: Record<string, number> = {
  '风碰': 40,         // 风一色 + 碰碰胡
  '风一色': 20,       // 全部风牌
  '清碰': 20,         // 清一色 + 碰碰胡
  '混碰': 10,         // 混一色 + 碰碰胡
  '大吊碰碰胡': 10,    // 碰碰胡 + 大吊
  '大吊混一色': 10,    // 混一色 + 大吊
  '大吊清一色': 10,    // 清一色 + 大吊
  '大吊清碰': 20,      // 清碰 + 大吊
  '大吊风一色': 20,    // 风一色 + 大吊
  '大吊风碰': 40,      // 风碰 + 大吊
  '大吊': 10,         // 独立大吊（无其他特殊牌型时）固定10点
  '清一色': 10,       // 全部一门花色
  '无花自摸': 10,     // 碰碰胡/混一色，门口无花，自摸
  '杠开': 10,         // 杠牌/杠花后补牌自摸
  '八花自摸': 20,     // 手牌+副露共8花，自摸
  '四百搭': 10        // 手牌有4张百搭
};

// 番数上限（仅用于公式计算）
const MAX_FORMULA_FAN = 10;

// ===== 主计算函数 =====

export interface ScoreResult {
  baseFan: number;           // 基础番数
  extraMultipliers: number;  // 额外翻倍（无百搭×2 + 门清×2）
  roundMultiplier: number;   // 回合倍数（骰子决定）
  inheritMultiplier: number; // 继承倍数（包含上局溢出继承）
  globalMultiplier: number;  // 综合全局倍数（继承倍数×回合倍数，封顶8）
  settlementMultiplier: number; // 结算膨胀倍数
  finalPoints: number;       // 最终点数
  handTypeName: string;      // 牌型名称
  details: string[];         // 计算明细
}

export interface SettlementTransfer {
  fromIndex: number;
  toIndex: number;
  amount: number;
  reason: string;
}

export interface SettlementBreakdown {
  deltas: Map<number, number>;
  transfers: SettlementTransfer[];
}

/**
 * 计算胡牌点数
 */
export function calculateScore(params: {
  handTiles: Tile[];           // 手牌（胡牌时）
  exposedMelds: Meld[];        // 门口牌（吃/碰/杠）
  flowerTiles: Tile[];         // 花牌
  handTypes: HandType[];       // 检测到的牌型
  isSelfDrawn: boolean;        // 是否自摸
  isKongFlower: boolean;       // 是否杠上花
  isRobbingKong: boolean;      // 是否抢杠
  isMenQing: boolean;          // 是否门清
  isDaDiao?: boolean;          // 是否大吊（手牌剩1张胡牌）
  wildTileSuit?: TileSuit;     // 百搭牌的花色
  wildTileValue?: number;      // 百搭牌的数值
  wildTileGroup?: string[];    // 花牌百搭组
  rawRoundMultiplier?: number;     // 回合倍数（骰子）
  rawInheritMultiplier?: number;    // 全局倍数（流局/造反继承）
  globalIncludesRound?: boolean; // 是否把回合倍数并入全局倍数（默认true）
  settlementMultiplier?: number; // 结算膨胀倍数（默认1，即不膨胀）
}): ScoreResult {
  const {
    handTiles, exposedMelds, flowerTiles, handTypes,
    isSelfDrawn, isKongFlower, isRobbingKong, isMenQing,
    isDaDiao = false,
    wildTileSuit, wildTileValue, wildTileGroup, rawRoundMultiplier, rawInheritMultiplier,
    globalIncludesRound = true,
    settlementMultiplier = 1
  } = params;

  const details: string[] = [];
  let handTypeName = '普通胡';
  let baseFan = 0;
  let extraMultipliers = 1;

  // 牌型校验：必须有有效牌型（不允许"普通胡"）
  if (handTypes.length === 0) {
    return {
      baseFan: 0,
      finalPoints: 0,
      handTypeName: '无效牌型',
      details: ['无有效牌型'],
      roundMultiplier: 0,
      inheritMultiplier: 0,
      globalMultiplier: 0,
      settlementMultiplier,
      extraMultipliers: 0
    }
  }

  // 1. 确定最高优先级牌型
  if (handTypes.length > 0) {
    const topType = handTypes[0];
    handTypeName = getHandTypeDisplayName(topType);

    // 检查是否为固定番数牌型
    const fixedName = getFixedFanName(topType, isSelfDrawn, isKongFlower, handTypes, isDaDiao);
    if (fixedName && FIXED_FAN[fixedName]) {
      baseFan = FIXED_FAN[fixedName];
      details.push(`${fixedName} = ${baseFan}番`);
    }
  }

  // 2. 如果没有固定番数，用公式计算（碰碰胡/混一色）
  if (baseFan === 0) {
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles, wildTileSuit, wildTileValue, wildTileGroup);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }

  // 3. 检查无花自摸（碰碰胡/混一色 + 自摸 + 门口无花 + 无风向刻杠）
  //    特殊规则：如果百搭牌是花牌，本局不触发"无花自摸"，用普通公式结算
  // 无花自摸（碰碰胡/混一色 + 自摸 + 门前无花/无风刻/无箭刻/无杠）
  // 与杠开后自摸互斥（baseFan >= 10 时走杠开逻辑，不走无花自摸）
  if (baseFan < 10 && isSelfDrawn) {
    const isWildFlower = wildTileGroup && wildTileGroup.length > 0;
    if (!isWildFlower) {
      const hasNoFlowers = flowerTiles.length === 0 &&
        exposedMelds.every(m => m.tiles.every(t => !isFlower(t)));
      // hasWindMelds：检查风刻/风杠；新增三个函数分别检查：明杠、暗杠、箭刻
      const hasNoBlocks = !hasWindMelds(exposedMelds, handTiles) &&
        hasNoArrowMelds(exposedMelds) &&
        hasNoMingKong(exposedMelds) &&
        hasNoAnKong(exposedMelds);

      if (hasNoFlowers && hasNoBlocks) {
        // 只对当前主牌型检查，不用 handTypes.includes（避免混碰分解误触发）
        const isPengOrHun = topType === HandType.ALL_TRIPLETS ||
                            topType === HandType.HALF_FLUSH;
        if (isPengOrHun) {
          baseFan = Math.max(baseFan, 10);
          details.push('无花自摸 = 10番');
        }
      }
    }
  }

  // 4. 杠开（杠牌/杠花后补牌自摸）
  if (isSelfDrawn && isKongFlower) {
    baseFan = Math.max(baseFan, 10);
    details.push('杠开 = 10番');
  }

  // 5. 四百搭
  if (wildTileSuit !== undefined && wildTileValue !== undefined) {
    const wildCount = countWildTiles(handTiles, wildTileSuit, wildTileValue, wildTileGroup);
    if (wildCount >= 4) {
      baseFan = Math.max(baseFan, 10);
      details.push('四百搭 = 10番');
    }
  }

  // 6. 如果仍然是0（无特殊牌型），使用基础公式
  if (baseFan === 0) {
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles, wildTileSuit, wildTileValue, wildTileGroup);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }

  // 7. 番数上限（仅公式计算受上限，固定番数不受限）
  // baseFan 可能 > 10（如风碰=40），这是允许的

  // 8. 额外翻倍（上面第 85 行已声明 extraMultipliers = 1）
  
  // 无百搭翻倍
  if (wildTileSuit !== undefined && wildTileValue !== undefined) {
    const wildCount = countWildTiles(handTiles, wildTileSuit, wildTileValue, wildTileGroup);
    
    // 特殊规则: 百搭是风牌/箭牌时，风一色/风碰可算无百搭
    const isWindOrDragonWild = wildTileSuit === TileSuit.WIND || wildTileSuit === TileSuit.DRAGON;
    const isWindHand = handTypes.includes(HandType.ALL_WIND) || handTypes.includes(HandType.FENG_PENG);
    
    if (wildCount === 0) {
      // 手牌无百搭
      extraMultipliers *= 2;
      details.push('无百搭 ×2');
    } else {
      // 手上有百搭，但百搭当原牌仍能胡 → 也算无百搭
      const noWildCheck = canWin(handTiles, exposedMelds, () => false);
      if (noWildCheck.canWin) {
        extraMultipliers *= 2;
        details.push('无百搭(百搭归位) ×2');
      } else if (isWindOrDragonWild && isWindHand) {
        // 百搭是风/箭 + 风一色/风碰 → 可算无百搭
        if (handTypes.includes(HandType.FENG_PENG)) {
          if (checkAllTripletsWithoutWild(handTiles, exposedMelds, wildTileSuit, wildTileValue)) {
            extraMultipliers *= 2;
            details.push('无百搭(风碰,百搭归位) ×2');
          }
        } else {
          extraMultipliers *= 2;
          details.push('无百搭(风一色,百搭归位) ×2');
        }
      }
    }
  }

  // 门清翻倍
  if (isMenQing) {
    extraMultipliers *= 2;
    details.push('门清 ×2');
  }

  // 9. 最终点数
  const roundMultiplier = Math.max(1, rawRoundMultiplier ?? 1);
  const baseGlobal = Math.max(1, rawInheritMultiplier ?? 1);

  // 新口径：若全局已包含回合倍数，则全局倍数 = min(8, 回合 × 全局)
  // 否则沿用旧口径（回合倍数与全局倍数分乘）
  const globalMultiplier = globalIncludesRound
    ? Math.max(1, Math.min(baseGlobal * roundMultiplier, 8))
    : Math.max(1, Math.min(baseGlobal, 8));

  const finalPoints = (globalIncludesRound
    ? baseFan * extraMultipliers * globalMultiplier
    : baseFan * extraMultipliers * roundMultiplier * globalMultiplier) * settlementMultiplier;

  const sm = settlementMultiplier > 1 ? ` × ${settlementMultiplier}` : '';
  if (globalIncludesRound) {
    details.push(`有效倍率 = min(8, 骰子倍数${roundMultiplier} × 继承倍数${baseGlobal}) = ${globalMultiplier}`);
    details.push(`最终 = ${baseFan} × ${extraMultipliers} × ${globalMultiplier}${sm} = ${finalPoints}`);
  } else {
    details.push(`最终 = ${baseFan} × ${extraMultipliers} × ${roundMultiplier} × ${globalMultiplier}${sm} = ${finalPoints}`);
  }

  return {
    baseFan,
    extraMultipliers,
    roundMultiplier,
    inheritMultiplier: baseGlobal,
    globalMultiplier,
    settlementMultiplier,
    finalPoints,
    handTypeName,
    details
  };
}

// ===== 胡牌可选牌型生成 =====

export interface WinOption {
  label: string;
  score: number;
  details: string[];
  type: 'self_draw' | 'discard';
  handTypeName?: string;
  handTypes?: HandType[];
  summary?: Pick<
    ScoreResult,
    'baseFan' | 'extraMultipliers' | 'roundMultiplier' | 'globalMultiplier' | 'settlementMultiplier' | 'finalPoints'
  >;
  _decompKey?: string; // 内部字段，标记该选项来自哪个牌型分解
}

/**
 * 生成所有可能的胡牌方案（按最大番数倒序排列）
 * 枚举所有手牌分解方案（不同对子/面子组合 → 不同牌型）
 * 返回 [{label: "碰碰胡·自摸", score: 80, details: [...]}]
 */
export function generateWinOptions(params: {
  handTiles: Tile[];
  exposedMelds: Meld[];
  flowerTiles: Tile[];
  handTypes: HandType[];
  isKongFlower: boolean;
  isRobbingKong: boolean;
  isMenQing: boolean;
  isDaDiao?: boolean;
  wildTileSuit?: TileSuit;
  wildTileValue?: number;
  wildTileGroup?: string[];
  rawRoundMultiplier?: number;
  rawInheritMultiplier?: number;
  settlementMultiplier?: number;
}): WinOption[] {
  const options: WinOption[] = [];
  const baseParams = { ...params };

  // ===== 枚举所有手牌分解方案 =====
  // 同一手牌可能有多种分解方式，产生不同牌型
  // 例如：11122233344万 可以分解为 碰碰胡 或 清一色
  const allDecompositions = enumerateHandDecompositions(
    params.handTiles,
    params.exposedMelds,
    params.wildTileSuit,
    params.wildTileValue
  );

  // 对每种分解方案计算自摸和捉冲
  for (const decomp of allDecompositions) {
    // 自摸
    const selfDrawResult = calculateScore({
      ...baseParams,
      handTypes: decomp.types,
      isSelfDrawn: true,
      isDaDiao: baseParams.isDaDiao,
      globalIncludesRound: true,
    });
    if (selfDrawResult.finalPoints > 0) {
      const label = `${selfDrawResult.handTypeName}·自摸`;
      // 同 label 保留 score 最大者（核心分解签名用 handTypes 区分）
      const decompKey = `self_draw|${label}|${(decomp.types || []).sort().join(',')}`;
      const existing = options.find(o => o.label === label);
      if (!existing) {
        options.push({
          label,
          score: selfDrawResult.finalPoints,
          details: [...selfDrawResult.details],
          type: 'self_draw',
          handTypeName: selfDrawResult.handTypeName,
          handTypes: [...decomp.types],
          summary: {
            baseFan: selfDrawResult.baseFan,
            extraMultipliers: selfDrawResult.extraMultipliers,
            roundMultiplier: selfDrawResult.roundMultiplier,
            globalMultiplier: selfDrawResult.globalMultiplier,
            settlementMultiplier: selfDrawResult.settlementMultiplier,
            finalPoints: selfDrawResult.finalPoints
          },
          _decompKey: decompKey
        });
      } else if (selfDrawResult.finalPoints > existing.score) {
        existing.score = selfDrawResult.finalPoints;
        existing.details = [...selfDrawResult.details];
        existing.handTypeName = selfDrawResult.handTypeName;
        existing.handTypes = [...decomp.types];
        existing.summary = {
          baseFan: selfDrawResult.baseFan,
          extraMultipliers: selfDrawResult.extraMultipliers,
          roundMultiplier: selfDrawResult.roundMultiplier,
          globalMultiplier: selfDrawResult.globalMultiplier,
          settlementMultiplier: selfDrawResult.settlementMultiplier,
          finalPoints: selfDrawResult.finalPoints
        };
        existing._decompKey = decompKey;
      }
    }

    // 捉冲
    const discardResult = calculateScore({
      ...baseParams,
      handTypes: decomp.types,
      isSelfDrawn: false,
      isDaDiao: baseParams.isDaDiao,
      globalIncludesRound: true,
    });
    if (discardResult.finalPoints > 0) {
      const label = `${discardResult.handTypeName}·捉冲`;
      const decompKey = `discard|${label}|${(decomp.types || []).sort().join(',')}`;
      const existing = options.find(o => o.label === label);
      if (!existing) {
        options.push({
          label,
          score: discardResult.finalPoints,
          details: [...discardResult.details],
          type: 'discard',
          handTypeName: discardResult.handTypeName,
          handTypes: [...decomp.types],
          summary: {
            baseFan: discardResult.baseFan,
            extraMultipliers: discardResult.extraMultipliers,
            roundMultiplier: discardResult.roundMultiplier,
            globalMultiplier: discardResult.globalMultiplier,
            settlementMultiplier: discardResult.settlementMultiplier,
            finalPoints: discardResult.finalPoints
          },
          _decompKey: decompKey
        });
      } else if (discardResult.finalPoints > existing.score) {
        existing.score = discardResult.finalPoints;
        existing.details = [...discardResult.details];
        existing.handTypeName = discardResult.handTypeName;
        existing.handTypes = [...decomp.types];
        existing.summary = {
          baseFan: discardResult.baseFan,
          extraMultipliers: discardResult.extraMultipliers,
          roundMultiplier: discardResult.roundMultiplier,
          globalMultiplier: discardResult.globalMultiplier,
          settlementMultiplier: discardResult.settlementMultiplier,
          finalPoints: discardResult.finalPoints
        };
        existing._decompKey = decompKey;
      }
    }
  }

  // ===== 百搭归位（无百搭翻倍） =====
  // 注：花牌做百搭时不做无百搭归位——花牌本身有原始数值，
  // 禁用百搭后用花牌原值检测胡牌会产生误判（花牌可能正好凑成面子）
  if (params.wildTileSuit !== undefined && params.wildTileValue !== undefined && params.wildTileSuit !== TileSuit.FLOWER) {
    const wildCount = countWildTiles(params.handTiles, params.wildTileSuit, params.wildTileValue, params.wildTileGroup);
    if (wildCount > 0) {
      const noWildCheck = canWin(params.handTiles, params.exposedMelds, () => false);
      if (noWildCheck.canWin) {
        const noWildTypes = noWildCheck.types;
        // 自摸版
        const noWildResult = calculateScore({
          ...baseParams,
          handTypes: noWildTypes,
          wildTileSuit: undefined,
          wildTileValue: undefined,
          isSelfDrawn: true,
          globalIncludesRound: true,
        });
        const doubledPoints = noWildResult.finalPoints * 2;
        const noWildLabel = `${noWildResult.handTypeName}·自摸(无百搭×2)`;
        const existingNoWild = options.find(o => o.label === noWildLabel);
        if (!existingNoWild) {
          options.push({
            label: noWildLabel,
            score: doubledPoints,
            details: [...noWildResult.details, `无百搭翻倍 ×2 = ${doubledPoints}点`],
            type: 'self_draw',
            handTypeName: noWildResult.handTypeName,
            handTypes: [...noWildTypes],
            summary: {
              baseFan: noWildResult.baseFan,
              extraMultipliers: noWildResult.extraMultipliers * 2,
              roundMultiplier: noWildResult.roundMultiplier,
              globalMultiplier: noWildResult.globalMultiplier,
              settlementMultiplier: noWildResult.settlementMultiplier,
              finalPoints: doubledPoints
            }
          });
        } else if (doubledPoints > existingNoWild.score) {
          existingNoWild.score = doubledPoints;
          existingNoWild.handTypeName = noWildResult.handTypeName;
          existingNoWild.handTypes = [...noWildTypes];
          existingNoWild.details = [...noWildResult.details, `无百搭翻倍 ×2 = ${doubledPoints}点`];
          existingNoWild.summary = {
            baseFan: noWildResult.baseFan,
            extraMultipliers: noWildResult.extraMultipliers * 2,
            roundMultiplier: noWildResult.roundMultiplier,
            globalMultiplier: noWildResult.globalMultiplier,
            settlementMultiplier: noWildResult.settlementMultiplier,
            finalPoints: doubledPoints
          };
        }

        // 捉冲版
        const noWildDiscard = calculateScore({
          ...baseParams,
          handTypes: noWildTypes,
          wildTileSuit: undefined,
          wildTileValue: undefined,
          isSelfDrawn: false,
          globalIncludesRound: true,
        });
        const doubledDiscard = noWildDiscard.finalPoints * 2;
        const noWildDiscardLabel = `${noWildDiscard.handTypeName}·捉冲(无百搭×2)`;
        const existingNoWildDiscard = options.find(o => o.label === noWildDiscardLabel);
        if (!existingNoWildDiscard) {
          options.push({
            label: noWildDiscardLabel,
            score: doubledDiscard,
            details: [...noWildDiscard.details, `无百搭翻倍 ×2 = ${doubledDiscard}点`],
            type: 'discard',
            handTypeName: noWildDiscard.handTypeName,
            handTypes: [...noWildTypes],
            summary: {
              baseFan: noWildDiscard.baseFan,
              extraMultipliers: noWildDiscard.extraMultipliers * 2,
              roundMultiplier: noWildDiscard.roundMultiplier,
              globalMultiplier: noWildDiscard.globalMultiplier,
              settlementMultiplier: noWildDiscard.settlementMultiplier,
              finalPoints: doubledDiscard
            }
          });
        } else if (doubledDiscard > existingNoWildDiscard.score) {
          existingNoWildDiscard.score = doubledDiscard;
          existingNoWildDiscard.handTypeName = noWildDiscard.handTypeName;
          existingNoWildDiscard.handTypes = [...noWildTypes];
          existingNoWildDiscard.details = [...noWildDiscard.details, `无百搭翻倍 ×2 = ${doubledDiscard}点`];
          existingNoWildDiscard.summary = {
            baseFan: noWildDiscard.baseFan,
            extraMultipliers: noWildDiscard.extraMultipliers * 2,
            roundMultiplier: noWildDiscard.roundMultiplier,
            globalMultiplier: noWildDiscard.globalMultiplier,
            settlementMultiplier: noWildDiscard.settlementMultiplier,
            finalPoints: doubledDiscard
          };
        }
      }
    }
  }

  // 去重（按 label + 实际牌型组合，保留 score 最大者） + 按分数倒序
  const labelBest = new Map<string, WinOption>();
  for (const opt of options) {
    const key = `${opt.label}|${(opt.handTypes || []).slice().sort().join(',')}`;
    const existing = labelBest.get(key);
    if (!existing || opt.score > existing.score) {
      labelBest.set(key, opt);
    }
  }
  let uniqueOptions = Array.from(labelBest.values()).sort((a, b) => b.score - a.score);

  // 当固定点数选项和公式选项同时存在时，去除公式选项和子集选项
  // 如：清碰=20点存在时，去掉清一色=10点（子集）和碰碰胡公式=3番（公式）
  // 检查是否有任何选项使用了固定点数
  const hasFixedPointOption = uniqueOptions.some(opt =>
    opt.handTypes?.some(type => {
      const name = getFixedFanName(type, opt.type === 'self_draw', false, opt.handTypes, params.isDaDiao);
      return !!name && !!FIXED_FAN[name];
    })
  );
  if (hasFixedPointOption) {
    // 提取所有固定点数选项
    const fixedOptions = uniqueOptions.filter(opt =>
      opt.handTypes?.some(type => {
        const name = getFixedFanName(type, opt.type === 'self_draw', false, opt.handTypes, params.isDaDiao);
        return !!name && !!FIXED_FAN[name];
      })
    );
    const maxFixedScore = Math.max(...fixedOptions.map(o => o.score), 0);

    uniqueOptions = uniqueOptions.filter(opt => {
      const hasFixed = opt.handTypes?.some(type => {
        const name = getFixedFanName(type, opt.type === 'self_draw', false, opt.handTypes, params.isDaDiao);
        return !!name && !!FIXED_FAN[name];
      });

      if (hasFixed) {
        // 固定点数选项：检查是否被其他复合固定点数选项覆盖（严格子集 + 更低分数）
        // 如：清一色[FULL_FLUSH] 是 清碰[QING_PENG,FULL_FLUSH,ALL_TRIPLETS] 的子集
        for (const other of fixedOptions) {
          if (other === opt) continue;
          if (other.score <= opt.score) continue;
          if (!opt.handTypes || !other.handTypes) continue;
          if (opt.handTypes.length < other.handTypes.length &&
              opt.handTypes.every(t => other.handTypes!.includes(t))) {
            return false; // 移除被复合类型覆盖的子集选项
          }
        }
        return true;
      }

      // 公式选项：仅保留分数 >= 最高固定分选项（可能骰子倍数翻更高）
      return opt.score >= maxFixedScore;
    });
  }

  return uniqueOptions;
}

/**
 * 枚举手牌所有可能的分解方案（不同对子/面子组合 → 不同牌型）
 * 返回去重后的牌型列表
 */
function enumerateHandDecompositions(
  handTiles: Tile[],
  exposedMelds: Meld[],
  wildTileSuit?: TileSuit,
  wildTileValue?: number
): Array<{ types: HandType[] }> {
  const results: Array<{ types: HandType[] }> = [];
  const seen = new Set<string>();

  const wildTileId = (wildTileSuit !== undefined && wildTileValue !== undefined)
    ? `${wildTileSuit}-${wildTileValue}`
    : null;

  // canWin 内部已调用 findBestAssignment 穷举所有百搭分配
  // 这里直接获取最优牌型即可
  const result = canWin(handTiles, exposedMelds, wildTileId);
  if (result.canWin && result.types.length > 0) {
    const candidates: HandType[][] = [];
    candidates.push([...result.types]);

    for (const type of result.types) {
      if (type === HandType.STANDARD && result.types.length > 1) continue;
      if (type === HandType.DA_DIAO) continue;
      candidates.push([type]);
      if (result.types.includes(HandType.DA_DIAO)) {
        candidates.push([HandType.DA_DIAO, type]);
      }
    }

    if (result.types.includes(HandType.DA_DIAO)) {
      candidates.push([HandType.DA_DIAO]);
    }

    for (const candidate of candidates) {
      const normalized = [...candidate].sort((a, b) => (HAND_TYPE_PRIORITY[b] ?? 0) - (HAND_TYPE_PRIORITY[a] ?? 0));
      const key = normalized.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ types: normalized });
    }
  }

  return results;
}

// ===== 公式计算（碰碰胡/混一色）=====

interface FormulaResult {
  fan: number;
  details: string[];
}

function calculateFormulaFan(
  handTiles: Tile[],
  exposedMelds: Meld[],
  flowerTiles: Tile[],
  wildTileSuit?: TileSuit,
  wildTileValue?: number,
  wildTileGroup?: string[]
): FormulaResult {
  const details: string[] = [];
  let comboPoints = 0;

  // 花牌数
  const flowerCount = flowerTiles.length;

  // 百搭虚拟分配：找最优组合（利益最大化）
  // 优先级：箭牌刻子(+2) > 风牌刻子(+1) > 其他
  // 支持：3张百搭→刻子, 2百搭+1牌→刻子, 1百搭+2牌→刻子
  let virtualHand = [...handTiles];
  if (wildTileSuit !== undefined && wildTileValue !== undefined) {
    const wildTiles = handTiles.filter(t => t.suit === wildTileSuit && t.value === wildTileValue);
    if (wildTiles.length > 0) {
      const nonWildTiles = handTiles.filter(t => !(t.suit === wildTileSuit && t.value === wildTileValue));
      let remainingWilds = wildTiles.length;
      const virtualParts: Tile[] = [...nonWildTiles];

      // 1. 优先配箭牌刻子（中发白 triplet = +2）
      // 去重：每种箭牌只处理一次
      const seenDragons = new Set<string>();
      for (const dragon of nonWildTiles) {
        if (!isDragon(dragon)) continue;
        const dk = `${dragon.suit}-${dragon.value}`;
        if (seenDragons.has(dk)) continue;
        seenDragons.add(dk);

        const dragonCount = nonWildTiles.filter(t => t.suit === dragon.suit && t.value === dragon.value).length;
        if (remainingWilds >= 3) {
          // 3百搭 → 箭牌刻子
          for (let i = 0; i < 3; i++) {
            virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
          }
          remainingWilds -= 3;
          details.push(`百搭×3→${getTileDisplayName(dragon)}(箭牌刻子) +2`);
        } else if (dragonCount >= 2 && remainingWilds >= 1) {
          // 2箭牌+1百搭 → 箭牌刻子
          virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds].id, isWild: false });
          remainingWilds -= 1;
          details.push(`百搭→${getTileDisplayName(dragon)}(箭牌刻子) +2`);
        } else if (dragonCount >= 1 && remainingWilds >= 2) {
          // 1箭牌+2百搭 → 箭牌刻子
          for (let i = 0; i < 2; i++) {
            virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
          }
          remainingWilds -= 2;
          details.push(`百搭×2→${getTileDisplayName(dragon)}(箭牌刻子) +2`);
        }
        if (remainingWilds <= 0) break;
      }

      // 2. 配风牌刻子（东南西北 triplet = +1）
      if (remainingWilds > 0) {
        const seenWinds = new Set<string>();
        for (const wind of nonWildTiles) {
          if (!isWind(wind)) continue;
          const wk = `${wind.suit}-${wind.value}`;
          if (seenWinds.has(wk)) continue;
          seenWinds.add(wk);

          const windCount = nonWildTiles.filter(t => t.suit === wind.suit && t.value === wind.value).length;
          if (remainingWilds >= 3) {
            for (let i = 0; i < 3; i++) {
              virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
            }
            remainingWilds -= 3;
            details.push(`百搭×3→${getTileDisplayName(wind)}(风牌刻子) +1`);
          } else if (windCount >= 2 && remainingWilds >= 1) {
            virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds].id, isWild: false });
            remainingWilds -= 1;
            details.push(`百搭→${getTileDisplayName(wind)}(风牌刻子) +1`);
          } else if (windCount >= 1 && remainingWilds >= 2) {
            for (let i = 0; i < 2; i++) {
              virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
            }
            remainingWilds -= 2;
            details.push(`百搭×2→${getTileDisplayName(wind)}(风牌刻子) +1`);
          }
          if (remainingWilds <= 0) break;
        }
      }

      virtualHand = virtualParts;
    }
  }

  // 计算组合牌点数（使用虚拟分配后的手牌）
  // 真正的暗杠/加杠已在 exposedMelds 中
  const allMelds = [...exposedMelds];
  const concealedGroups = groupTiles(virtualHand);
  // 手牌中的刻子（3张同牌）也要算组合牌点
  for (const [, group] of concealedGroups) {
    if (group.length >= 3) {
      allMelds.push({
        type: MeldType.TRIPLET,
        tiles: group.slice(0, 3),
        isConcealed: true
      });
    }
  }

  for (const meld of allMelds) {
    const isKong = meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG;
    const isConcealed = meld.type === MeldType.CONCEALED_KONG;
    const firstTile = meld.tiles[0];

    if (isWind(firstTile)) {
      if (isKong) {
        let points = 2;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`风牌杠${isConcealed ? '(暗)' : ''} = ${points}点`);
      } else if (meld.type === MeldType.TRIPLET) {
        comboPoints += 1;
        details.push('风牌刻子 = 1点');
      }
    } else if (isDragon(firstTile)) {
      if (isKong) {
        let points = 3;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`箭牌杠${isConcealed ? '(暗)' : ''} = ${points}点`);
      } else if (meld.type === MeldType.TRIPLET) {
        comboPoints += 2;
        details.push('箭牌刻子 = 2点');
      }
    } else {
      // 其他牌杠
      if (isKong) {
        let points = 1;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`其他牌杠${isConcealed ? '(暗)' : ''} = ${points}点`);
      }
    }
  }

  // 基础番数 = 2 + 花牌数 + 组合牌点数
  let fan = 2 + flowerCount + comboPoints;
  
  // 上限10
  fan = Math.min(fan, MAX_FORMULA_FAN);

  details.unshift(`公式: 2 + ${flowerCount}花 + ${comboPoints}组合 = ${fan}番`);
  console.log(`[Scoring] calculateFormulaFan: flowers=${flowerCount} comboPoints=${comboPoints} fan=${fan} allMelds=${allMelds.length} details=${details.join('; ')}`);

  return { fan, details };
}

// ===== 辅助函数 =====

function getHandTypeDisplayName(type: HandType): string {
  const names: Record<HandType, string> = {
    [HandType.STANDARD]: '',
    [HandType.FENG_PENG]: '风碰',
    [HandType.ALL_WIND]: '风一色',
    [HandType.QING_PENG]: '清碰',
    [HandType.HUN_PENG]: '混碰',
    [HandType.EIGHT_FLOWERS]: '八花自摸',
    [HandType.FULL_FLUSH]: '清一色',
    [HandType.FOUR_WILD]: '四百搭',
    [HandType.DA_DIAO]: '大吊',
    [HandType.HALF_FLUSH]: '混一色',
    [HandType.ALL_TRIPLETS]: '碰碰胡'
  };
  if (!(type in names)) return `未知牌型[${type}]`;
  return names[type];
}

function getFixedFanName(type: HandType, isSelfDrawn: boolean, isKongFlower: boolean, handTypes?: HandType[], isDaDiao?: boolean): string | null {
  // 大吊组合：优先级最高，直接返回对应固定番
  if (isDaDiao) {
    if (handTypes) {
      if (handTypes.includes(HandType.FENG_PENG)) return '大吊风碰';
      if (handTypes.includes(HandType.ALL_WIND)) return '大吊风一色';
      if (handTypes.includes(HandType.QING_PENG)) return '大吊清碰';
      if (handTypes.includes(HandType.ALL_TRIPLETS)) return '大吊碰碰胡';
      if (handTypes.includes(HandType.HALF_FLUSH)) return '大吊混一色';
      if (handTypes.includes(HandType.FULL_FLUSH)) return '大吊清一色';
    }
    // Standalone大吊 (no other special types) = 固定10点
    return '大吊';
  }
  switch (type) {
    case HandType.FENG_PENG: return '风碰';
    case HandType.ALL_WIND: return '风一色';
    case HandType.QING_PENG: return '清碰';
    case HandType.HUN_PENG: return '混碰';
    case HandType.FULL_FLUSH: return '清一色';
    case HandType.EIGHT_FLOWERS: return isSelfDrawn ? '八花自摸' : null;
    case HandType.FOUR_WILD: return '四百搭';
    case HandType.DA_DIAO: return '大吊';
    default: return null;
  }
}

function hasWindMelds(exposedMelds: Meld[], handTiles: Tile[]): boolean {
  // 检查门口（exposedMelds）是否有阻挡物：无花自摸要求门前无花、无风刻、无箭刻、无杠牌
  for (const meld of exposedMelds) {
    if (meld.tiles.length === 0) continue;
    const lead = meld.tiles[0];
    // 风刻/风杠
    if (isWind(lead)) return true;
    // 箭刻/箭杠（发财/红中/白板）
    if (isDragon(lead)) return true;
    // 任意杠（明杠/暗杠/加杠）
    if (meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG) return true;
  }
  // 检查手牌中的风牌刻子（不影响门前判断，但影响牌型本身）
  const groups = groupTiles(handTiles);
  for (const [key, group] of groups) {
    if (group.length >= 3 && isWind(group[0])) {
      return true;
    }
  }
  return false;
}

// 无花自摸专用：检查门口无明杠
function hasNoMingKong(exposedMelds: Meld[]): boolean {
  return !exposedMelds.some(m => m.type === MeldType.KONG && !m.isConcealed);
}

// 无花自摸专用：检查门口无暗杠
function hasNoAnKong(exposedMelds: Meld[]): boolean {
  return !exposedMelds.some(m => m.type === MeldType.CONCEALED_KONG);
}

// 无花自摸专用：检查门口无箭刻/箭杠（发财/红中/白板）
function hasNoArrowMelds(exposedMelds: Meld[]): boolean {
  return !exposedMelds.some(m => {
    if (m.tiles.length === 0) return false;
    return isDragon(m.tiles[0]);
  });
}

function countWildTiles(tiles: Tile[], wildSuit: TileSuit, wildValue: number, wildGroup?: string[]): number {
  return tiles.filter(t => {
    if (t.suit === wildSuit && t.value === wildValue) return true;
    // 花牌百搭组
    if (wildSuit === TileSuit.FLOWER && t.suit === TileSuit.FLOWER && wildGroup) {
      return wildGroup.includes(String(t.value));
    }
    return false;
  }).length;
}

/**
 * 检查去掉百搭功能后，牌面是否仍满足碰碰胡
 * 百搭当作普通牌参与牌型判断
 */
function checkAllTripletsWithoutWild(
  handTiles: Tile[],
  exposedMelds: Meld[],
  wildSuit: TileSuit,
  wildValue: number
): boolean {
  // 门口不能有顺子
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false;
  }

  const expectedTriplets = 4 - exposedMelds.length;
  const counts = new Map<string, number>();
  let wildCount = 0;

  for (const t of handTiles) {
    const isWild = t.suit === wildSuit && t.value === wildValue;
    if (isWild) {
      wildCount++;
      continue;
    }
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const values = Array.from(counts.values());

  // 穷举“将对”位置（可由普通对子、单牌+1百搭、2百搭组成）
  const tryWithPair = (pairKey: string | null, pairNeedWild: number): boolean => {
    if (pairNeedWild > wildCount) return false;
    let remainingWild = wildCount - pairNeedWild;
    let triplets = 0;

    for (let i = 0; i < values.length; i++) {
      let c = values[i];
      if (pairKey && Array.from(counts.keys())[i] === pairKey) {
        c -= 2;
      }
      if (c < 0) return false;
      const need = (3 - (c % 3)) % 3;
      remainingWild -= need;
      if (remainingWild < 0) return false;
      triplets += Math.floor((c + need) / 3);
    }

    // 余下百搭只能按3张补成刻子
    triplets += Math.floor(remainingWild / 3);
    return triplets === expectedTriplets;
  };

  // 1) 普通对子
  for (const [k, c] of counts) {
    if (c >= 2 && tryWithPair(k, 0)) return true;
  }
  // 2) 单牌 + 1百搭作将
  for (const [k, c] of counts) {
    if (c >= 1 && tryWithPair(k, 1)) return true;
  }
  // 3) 2百搭作将
  if (tryWithPair(null, 2)) return true;

  return false;
}

// ===== 结算函数 =====

/**
 * 计算最终结算
 * @param baseFan 基础番数（用于互包赔付计算）
 * @param winnerFinalPoints 赢家最终点数（已含 baseFan × extraMultipliers × globalMultiplier）
 * @param isSelfDrawn 是否自摸
 * @param winnerIndex 赢家位置
 * @param allPlayerIndices 所有存活玩家位置
 * @param mutualBailout 互包关系 Map<playerIndex, {partnerIndex, type: '三口'|'四口'}>
 * @param discarderId 放冲者ID（捉冲时传入，自摸时忽略）
 */
export function calculateSettlement(
  winnerFinalPoints: number,
  isSelfDrawn: boolean,
  winnerIndex: number,
  allPlayerIndices: number[],
  mutualBailout?: Map<number, { partnerIndex: number; type: '三口' | '四口' }>,
  discarderId?: number
): Map<number, number> {
  const deltas = new Map<number, number>();
  
  // 初始化所有玩家为0
  for (const idx of allPlayerIndices) {
    deltas.set(idx, 0);
  }

  const addDelta = (idx: number, delta: number) => {
    deltas.set(idx, (deltas.get(idx) || 0) + delta);
  };

  if (isSelfDrawn) {
    // 自摸：每个未胡玩家向赢家赔付
    for (const idx of allPlayerIndices) {
      if (idx === winnerIndex) continue;
      
      // 检查互包：互包赔付使用 baseFan × 互包倍数
      // RULES.md: 赔付结算（settlementLog.fan = baseFan，不是finalPoints）
      const bailout = mutualBailout?.get(idx);
      let pay: number;
      
      if (bailout && bailout.partnerIndex === winnerIndex) {
        // 互包自摸：输家支付 finalPoints × 互包倍数（三口×3，四口×5）
        const multiplier = bailout.type === '四口' ? 5 : 3;
        pay = winnerFinalPoints * multiplier;
      } else {
        // 正常自摸：输家支付 finalPoints（已含 extraMultipliers × globalMultiplier）
        pay = winnerFinalPoints;
      }
      
      deltas.set(idx, (deltas.get(idx) || 0) - pay);
      deltas.set(winnerIndex, (deltas.get(winnerIndex) || 0) + pay);
    }
  } else {
    // 捉冲（放冲）：只有放冲者全额赔付
    if (discarderId !== undefined && allPlayerIndices.includes(discarderId)) {
      // 有指定放冲者：仅放冲者赔付
      const bailout = mutualBailout?.get(discarderId);
      let pay: number;
      
      if (bailout && bailout.partnerIndex === winnerIndex) {
        // 互包捉冲：输家支付 finalPoints × 2
        pay = winnerFinalPoints * 2;
      } else {
        // 正常捉冲：放冲者支付 finalPoints
        pay = winnerFinalPoints;
      }
      
      deltas.set(discarderId, (deltas.get(discarderId) || 0) - pay);
      deltas.set(winnerIndex, (deltas.get(winnerIndex) || 0) + pay);
    } else {
      // 兼容旧调用：未传入 discarderId，沿用所有非赢家均摊
      for (const idx of allPlayerIndices) {
        if (idx === winnerIndex) continue;
        
        const bailout = mutualBailout?.get(idx);
        let pay: number;
        
        if (bailout && bailout.partnerIndex === winnerIndex) {
          // 互包捉冲 ×2
          pay = winnerFinalPoints * 2;
        } else {
          pay = winnerFinalPoints;
        }
        
        deltas.set(idx, (deltas.get(idx) || 0) - pay);
        deltas.set(winnerIndex, (deltas.get(winnerIndex) || 0) + pay);
      }
    }
  }

  return deltas;
}

export function calculateSettlementBreakdownByRules(
  winnerFinalPoints: number,
  isSelfDrawn: boolean,
  winnerIndex: number,
  allPlayerIndices: number[],
  mutualBailout?: Map<number, { partnerIndex: number; type: '三口' | '四口' }>,
  discarderId?: number
): SettlementBreakdown {
  const deltas = new Map<number, number>();
  const transfers: SettlementTransfer[] = [];
  for (const idx of allPlayerIndices) {
    deltas.set(idx, 0);
  }

  const addDelta = (idx: number, delta: number) => {
    deltas.set(idx, (deltas.get(idx) || 0) + delta);
  };
  const addTransfer = (
    fromIndex: number,
    toIndex: number,
    amount: number,
    reason: string,
  ) => {
    if (amount <= 0) return;
    addDelta(fromIndex, -amount);
    addDelta(toIndex, amount);
  };

  if (isSelfDrawn) {
    const bailoutLoser = allPlayerIndices.find(idx => {
      if (idx === winnerIndex) return false;
      const bailout = mutualBailout?.get(idx);
      return bailout?.partnerIndex === winnerIndex;
    });
    console.log(`[SETTLEMENT-BREAKDOWN] isSelfDrawn winnerIdx=${winnerIndex} all=${JSON.stringify(allPlayerIndices)} bailoutLoser=${bailoutLoser} mutualBailout=${JSON.stringify([...mutualBailout?.entries() || []].map(([k,v]) => ({key:k, partnerIndex:v.partnerIndex, type:v.type})))}`);

    if (bailoutLoser !== undefined) {
      const bailout = mutualBailout!.get(bailoutLoser)!;
      const bailoutMultiplier = bailout.type === '四口' ? 5 : 3;
      const otherMultiplier = bailout.type === '四口' ? 0 : 1;

      for (const idx of allPlayerIndices) {
        if (idx === winnerIndex) continue;
        const pay = idx === bailoutLoser
          ? winnerFinalPoints * bailoutMultiplier
          : winnerFinalPoints * otherMultiplier;
        if (pay === 0) continue;
        addTransfer(
          idx,
          winnerIndex,
          pay,
          idx === bailoutLoser ? `自摸互包赔付×${bailoutMultiplier}` : '自摸赔付',
          idx === bailoutLoser ? bailout.type : undefined
        );
      }

      return { deltas, transfers };
    }

    for (const idx of allPlayerIndices) {
      if (idx === winnerIndex) continue;
      addTransfer(idx, winnerIndex, winnerFinalPoints, '自摸赔付');
    }
    return { deltas, transfers };
  }

  if (discarderId !== undefined && allPlayerIndices.includes(discarderId)) {
    // 先检查放冲者本身是否是互包伙伴
    const discarderBailout = mutualBailout?.get(discarderId);
    if (discarderBailout && discarderBailout.partnerIndex === winnerIndex) {
      const bType = discarderBailout.type || '三口';
      addTransfer(discarderId, winnerIndex, winnerFinalPoints * 2, '互包捉冲×2', bType);
      return { deltas, transfers };
    }

    // 再检查其他玩家是否有互包关系（第三方互包补赔）
    // 规则：第三方放冲 → 放冲者赔1倍 + 互包输家补赔1倍
    const bailoutLoser = allPlayerIndices.find(idx => {
      if (idx === winnerIndex || idx === discarderId) return false;
      const bailout = mutualBailout?.get(idx);
      return bailout?.partnerIndex === winnerIndex;
    });

    if (bailoutLoser !== undefined) {
      const bailoutInfo = mutualBailout!.get(bailoutLoser)!;
      addTransfer(discarderId, winnerIndex, winnerFinalPoints, '放冲赔付');
      addTransfer(bailoutLoser, winnerIndex, winnerFinalPoints, '互包补赔×1', bailoutInfo.type);
      return { deltas, transfers };
    }

    addTransfer(discarderId, winnerIndex, winnerFinalPoints, '放冲赔付');
    return { deltas, transfers };
  }

  for (const idx of allPlayerIndices) {
    if (idx === winnerIndex) continue;
    const bailout = mutualBailout?.get(idx);
    const pay = bailout && bailout.partnerIndex === winnerIndex
      ? winnerFinalPoints * 2
      : winnerFinalPoints;
    addTransfer(
      idx,
      winnerIndex,
      pay,
      bailout && bailout.partnerIndex === winnerIndex ? '互包赔付×2' : '赔付',
      bailout && bailout.partnerIndex === winnerIndex ? bailout.type : undefined
    );
  }

  return { deltas, transfers };
}

export function calculateSettlementByRules(
  winnerFinalPoints: number,
  isSelfDrawn: boolean,
  winnerIndex: number,
  allPlayerIndices: number[],
  mutualBailout?: Map<number, { partnerIndex: number; type: '三口' | '四口' }>,
  discarderId?: number
): Map<number, number> {
  return calculateSettlementBreakdownByRules(
    winnerFinalPoints,
    isSelfDrawn,
    winnerIndex,
    allPlayerIndices,
    mutualBailout,
    discarderId
  ).deltas;
}

/**
 * 计算回合倍数
 */
export function calculateRoundMultiplier(dice1: number, dice2: number, dice3?: number, dice4?: number): number {
  // 单次掷骰子规则
  const isDouble = dice1 === dice2;
  const isOneFourCombo = (dice1 === 1 && dice2 === 4) || (dice1 === 4 && dice2 === 1);

  let singleMultiplier = 1;
  if (isDouble) {
    singleMultiplier = (dice1 === 1 || dice1 === 4) ? 4 : 2;
  } else if (isOneFourCombo) {
    singleMultiplier = 2;
  }

  // 两次掷骰子：比较两次结果
  if (dice3 !== undefined && dice4 !== undefined) {
    const sum1 = dice1 + dice2;
    const sum2 = dice3 + dice4;
    const combo1 = [Math.min(dice1, dice2), Math.max(dice1, dice2)];
    const combo2 = [Math.min(dice3, dice4), Math.max(dice3, dice4)];

    // 完全相同组合（顺序无关）→ ×4
    if (combo1[0] === combo2[0] && combo1[1] === combo2[1]) {
      return Math.max(singleMultiplier, 4);
    }
    // 点数之和相同 → ×2
    if (sum1 === sum2) {
      return Math.max(singleMultiplier, 2);
    }
  }

  return singleMultiplier;
}

/**
 * 计算全局倍数（流局/造反叠加）
 */
export function calculateGlobalMultiplier(
  currentMultiplier: number,
  event: '流局' | '造反'
): number {
  const newMultiplier = currentMultiplier * 2;
  return Math.min(newMultiplier, 8); // 上限×8
}

/**
 * 计算整局分数（简化版）
 * - 每个赢家按 wonFan 向所有非赢家收分
 * - 支持一炮多响（多个赢家独立结算）
 */
export function calculateGameResult(players: Player[], winners: Player[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const p of players) {
    scores[p.id] = 0;
  }

  if (!winners.length) {
    return scores;
  }

  const winnerIds = new Set(winners.map(w => w.id));
  const losers = players.filter(p => !winnerIds.has(p.id));

  for (const winner of winners) {
    const winFan = Math.max(1, winner.wonFan || 1);
    for (const loser of losers) {
      scores[loser.id] -= winFan;
      scores[winner.id] += winFan;
    }
  }

  return scores;
}
