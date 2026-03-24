/**
 * 长清阁麻将 - 番数计算系统
 * 
 * 两种计算方式:
 * 1. 固定番数牌型（优先级最高，直接使用固定值）
 * 2. 公式计算牌型（碰碰胡/混一色）
 */

import { Tile, Meld, MeldType, TileSuit, Player } from '../types/game';
import { isFlower, isWind, isDragon, groupTiles, tilesEqual } from './tiles';
import { HandType, HAND_TYPE_PRIORITY } from './handValidator';

// ===== 固定番数牌型 =====
const FIXED_FAN: Record<string, number> = {
  '风碰': 40,      // 风一色 + 碰碰胡
  '风一色': 20,    // 全部风牌
  '清碰': 20,      // 清一色 + 碰碰胡
  '混碰': 10,      // 混一色 + 碰碰胡
  '清一色': 10,    // 全部一门花色
  '无花自摸': 10,  // 碰碰胡/混一色，门口无花，自摸
  '杠开': 10,      // 杠牌/杠花后补牌自摸
  '八花自摸': 10,  // 手牌+副露共8花，自摸
  '四百搭': 10     // 手牌有4张百搭
};

// 番数上限（仅用于公式计算）
const MAX_FORMULA_FAN = 10;

// ===== 主计算函数 =====

export interface ScoreResult {
  baseFan: number;           // 基础番数
  extraMultipliers: number;  // 额外翻倍（无百搭×2 + 门清×2）
  roundMultiplier: number;   // 回合倍数（骰子决定）
  globalMultiplier: number;  // 全局倍数（流局/造反叠加）
  finalPoints: number;       // 最终点数
  handTypeName: string;      // 牌型名称
  details: string[];         // 计算明细
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
  wildTileSuit?: TileSuit;     // 百搭牌的花色
  wildTileValue?: number;      // 百搭牌的数值
  wildTileGroup?: string[];    // 花牌百搭组
  roundMultiplier: number;     // 回合倍数（骰子）
  globalMultiplier: number;    // 全局倍数（流局/造反继承）
  globalIncludesRound?: boolean; // 是否把回合倍数并入全局倍数（默认true）
}): ScoreResult {
  const {
    handTiles, exposedMelds, flowerTiles, handTypes,
    isSelfDrawn, isKongFlower, isRobbingKong, isMenQing,
    wildTileSuit, wildTileValue, wildTileGroup, roundMultiplier, globalMultiplier,
    globalIncludesRound = true
  } = params;

  const details: string[] = [];
  let handTypeName = '普通胡';
  let baseFan = 0;

  // 1. 确定最高优先级牌型
  if (handTypes.length > 0) {
    const topType = handTypes[0];
    handTypeName = getHandTypeDisplayName(topType);

    // 检查是否为固定番数牌型
    const fixedName = getFixedFanName(topType, isSelfDrawn, isKongFlower);
    if (fixedName && FIXED_FAN[fixedName]) {
      baseFan = FIXED_FAN[fixedName];
      details.push(`${fixedName} = ${baseFan}番`);
    }
  }

  // 2. 如果没有固定番数，用公式计算（碰碰胡/混一色）
  if (baseFan === 0) {
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }

  // 3. 检查无花自摸（碰碰胡/混一色 + 自摸 + 门口无花 + 无风向刻杠）
  if (baseFan === 0 || baseFan < 10) {
    if (isSelfDrawn && !isKongFlower) {
      const hasNoFlowers = flowerTiles.length === 0 && 
        exposedMelds.every(m => m.tiles.every(t => !isFlower(t)));
      const hasNoWindMelds = !hasWindMelds(exposedMelds, handTiles);
      
      if (hasNoFlowers && hasNoWindMelds) {
        const isPengOrHun = handTypes.includes(HandType.ALL_TRIPLETS) || 
                            handTypes.includes(HandType.HALF_FLUSH);
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
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }

  // 7. 番数上限（仅公式计算受上限，固定番数不受限）
  // baseFan 可能 > 10（如风碰=40），这是允许的

  // 8. 额外翻倍
  let extraMultipliers = 1;
  
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
    } else if (isWindOrDragonWild && isWindHand) {
      // 百搭是风/箭 + 风一色/风碰 → 可算无百搭
      // 风碰还需验证: 去掉百搭功能后牌面仍满足碰碰胡
      if (handTypes.includes(HandType.FENG_PENG)) {
        // 风碰: 检查去掉百搭后是否仍满足碰碰胡
        if (checkAllTripletsWithoutWild(handTiles, exposedMelds, wildTileSuit, wildTileValue)) {
          extraMultipliers *= 2;
          details.push('无百搭(风碰,百搭归位) ×2');
        }
      } else {
        // 风一色: 直接算无百搭
        extraMultipliers *= 2;
        details.push('无百搭(风一色,百搭归位) ×2');
      }
    }
  }

  // 门清翻倍
  if (isMenQing) {
    extraMultipliers *= 2;
    details.push('门清 ×2');
  }

  // 9. 最终点数
  const effectiveRoundMultiplier = Math.max(1, roundMultiplier);
  const baseGlobal = Math.max(1, globalMultiplier);

  // 新口径：若全局已包含回合倍数，则综合倍数= min(8, 回合 × 全局)
  // 否则沿用旧口径（回合倍数与全局倍数分乘）
  const effectiveGlobalMultiplier = globalIncludesRound
    ? Math.max(1, Math.min(baseGlobal * effectiveRoundMultiplier, 8))
    : Math.max(1, Math.min(baseGlobal, 8));

  const finalPoints = globalIncludesRound
    ? baseFan * extraMultipliers * effectiveGlobalMultiplier
    : baseFan * extraMultipliers * effectiveRoundMultiplier * effectiveGlobalMultiplier;

  if (globalIncludesRound) {
    details.push(`综合倍数 = min(8, 回合${effectiveRoundMultiplier} × 全局${baseGlobal}) = ${effectiveGlobalMultiplier}`);
    details.push(`最终 = ${baseFan} × ${extraMultipliers} × ${effectiveGlobalMultiplier} = ${finalPoints}`);
  } else {
    details.push(`最终 = ${baseFan} × ${extraMultipliers} × ${effectiveRoundMultiplier} × ${effectiveGlobalMultiplier} = ${finalPoints}`);
  }

  return {
    baseFan,
    extraMultipliers,
    roundMultiplier: effectiveRoundMultiplier,
    globalMultiplier: effectiveGlobalMultiplier,
    finalPoints,
    handTypeName,
    details
  };
}

// ===== 公式计算（碰碰胡/混一色）=====

interface FormulaResult {
  fan: number;
  details: string[];
}

function calculateFormulaFan(
  handTiles: Tile[],
  exposedMelds: Meld[],
  flowerTiles: Tile[]
): FormulaResult {
  const details: string[] = [];
  let comboPoints = 0;

  // 花牌数
  const flowerCount = flowerTiles.length;

  // 计算组合牌点数
  const allMelds = [...exposedMelds];
  
  // 从手牌中提取暗杠
  const groups = groupTiles(handTiles);
  for (const [, group] of groups) {
    if (group.length === 4) {
      allMelds.push({
        type: MeldType.CONCEALED_KONG,
        tiles: group,
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

  return { fan, details };
}

// ===== 辅助函数 =====

function getHandTypeDisplayName(type: HandType): string {
  const names: Record<HandType, string> = {
    [HandType.FENG_PENG]: '风碰',
    [HandType.ALL_WIND]: '风一色',
    [HandType.QING_PENG]: '清碰',
    [HandType.HUN_PENG]: '混碰',
    [HandType.EIGHT_FLOWERS]: '八花自摸',
    [HandType.FULL_FLUSH]: '清一色',
    [HandType.FOUR_WILD]: '四百搭',
    [HandType.HALF_FLUSH]: '混一色',
    [HandType.ALL_TRIPLETS]: '碰碰胡'
  };
  return names[type] || '普通胡';
}

function getFixedFanName(type: HandType, isSelfDrawn: boolean, isKongFlower: boolean): string | null {
  switch (type) {
    case HandType.FENG_PENG: return '风碰';
    case HandType.ALL_WIND: return '风一色';
    case HandType.QING_PENG: return '清碰';
    case HandType.HUN_PENG: return '混碰';
    case HandType.FULL_FLUSH: return '清一色';
    case HandType.EIGHT_FLOWERS: return isSelfDrawn ? '八花自摸' : null;
    case HandType.FOUR_WILD: return '四百搭';
    default: return null;
  }
}

function hasWindMelds(exposedMelds: Meld[], handTiles: Tile[]): boolean {
  // 检查门口是否有风牌刻子/杠
  for (const meld of exposedMelds) {
    if (meld.tiles.length > 0 && isWind(meld.tiles[0])) {
      return true;
    }
  }
  // 检查手牌中的风牌刻子
  const groups = groupTiles(handTiles);
  for (const [key, group] of groups) {
    if (group.length >= 3 && isWind(group[0])) {
      return true;
    }
  }
  return false;
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
  // 将百搭标记移除（当作普通牌）
  const normalizedTiles = handTiles.map(t => {
    if (t.suit === wildSuit && t.value === wildValue) {
      return { ...t, isWild: false };
    }
    return t;
  });
  
  // 检查是否仍是碰碰胡
  // 手牌中只有刻子+对子（不含顺子）
  const groups = groupTiles(normalizedTiles);
  let tripletCount = 0;
  let pairCount = 0;
  
  for (const [, group] of groups) {
    if (group.length >= 3) tripletCount++;
    else if (group.length === 2) pairCount++;
    else return false; // 有单牌
  }
  
  // 门口不能有顺子
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false;
  }
  
  const expectedTriplets = 4 - exposedMelds.length;
  return tripletCount === expectedTriplets && pairCount === 1;
}

// ===== 结算函数 =====

/**
 * 计算最终结算
 * @param winnerScore 赢家得分
 * @param isSelfDrawn 是否自摸
 * @param winnerIndex 赢家位置
 * @param allPlayerIndices 所有存活玩家位置
 * @param mutualBailout 互包关系 Map<playerIndex, {partnerIndex, type: '三口'|'四口'}>
 */
export function calculateSettlement(
  winnerScore: number,
  isSelfDrawn: boolean,
  winnerIndex: number,
  allPlayerIndices: number[],
  mutualBailout?: Map<number, { partnerIndex: number; type: '三口' | '四口' }>
): Map<number, number> {
  const deltas = new Map<number, number>();
  
  // 初始化所有玩家为0
  for (const idx of allPlayerIndices) {
    deltas.set(idx, 0);
  }

  if (isSelfDrawn) {
    // 自摸：每个未胡玩家向赢家赔付
    for (const idx of allPlayerIndices) {
      if (idx === winnerIndex) continue;
      
      let multiplier = 1;
      
      // 检查互包
      const bailout = mutualBailout?.get(idx);
      if (bailout && bailout.partnerIndex === winnerIndex) {
        multiplier = bailout.type === '四口' ? 5 : 3;
      }
      
      const pay = winnerScore * multiplier;
      deltas.set(idx, (deltas.get(idx) || 0) - pay);
      deltas.set(winnerIndex, (deltas.get(winnerIndex) || 0) + pay);
    }
  } else {
    // 放冲：放冲者全额赔付，互包方也赔付
    // 需要外部指定谁放冲
    // 这里简化为所有未胡玩家均分
    for (const idx of allPlayerIndices) {
      if (idx === winnerIndex) continue;
      
      let multiplier = 1;
      
      const bailout = mutualBailout?.get(idx);
      if (bailout && bailout.partnerIndex === winnerIndex) {
        // 互包双方互相放冲 = ×2
        multiplier = 2;
      }
      
      const pay = winnerScore * multiplier;
      deltas.set(idx, (deltas.get(idx) || 0) - pay);
      deltas.set(winnerIndex, (deltas.get(winnerIndex) || 0) + pay);
    }
  }

  return deltas;
}

/**
 * 计算回合倍数
 */
export function calculateRoundMultiplier(dice1: number, dice2: number): number {
  const sum = dice1 + dice2;
  const isDouble = dice1 === dice2;

  if (isDouble) {
    if (dice1 === 1 || dice1 === 4) return 4; // 1+1=×4, 4+4=×4
    return 2; // 其他对子=×2
  }
  return 1; // 非对子=×1
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
