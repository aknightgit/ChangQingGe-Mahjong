/**
 * 长清阁麻将 - 核心逻辑测试
 * 直接测试牌组、牌型检测、番数计算
 */

import { createDeck, sortTiles, isFlower, isWind, isDragon, isSequence, 
         getTileDisplayName, isAllWind, isHalfFlush, isFullFlush,
         groupTiles, tilesEqual } from './server/utils/tiles';
import { canWin, canWinStandard, canWinSevenPairs, detectHandTypes, HandType } from './server/utils/handValidator';
import { calculateScore, calculateRoundMultiplier } from './server/utils/scoring';
import { Tile, TileSuit, Meld, MeldType } from './server/types/game';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

function makeTile(suit: TileSuit, value: number, id?: string): Tile {
  return { suit, value, id: id || `${suit}-${value}-${Math.random()}`, isFlower: false };
}

// ===== 测试1: 牌组 =====
console.log('\n=== 牌组测试 ===');
const deck = createDeck();
test('牌组144张', deck.length === 144);
test('筒子36张', deck.filter(t => t.suit === TileSuit.DOTS).length === 36);
test('万子36张', deck.filter(t => t.suit === TileSuit.CHARACTERS).length === 36);
test('条子36张', deck.filter(t => t.suit === TileSuit.BAMBOOS).length === 36);
test('风牌16张', deck.filter(t => t.suit === TileSuit.WIND).length === 16);
test('箭牌12张', deck.filter(t => t.suit === TileSuit.DRAGON).length === 12);
test('花牌8张', deck.filter(t => t.suit === TileSuit.FLOWER).length === 8);
test('花牌标记', deck.filter(t => t.suit === TileSuit.FLOWER).every(t => t.isFlower === true));

// 测试牌名
test('一万显示名', getTileDisplayName(makeTile(TileSuit.CHARACTERS, 1)) === '一万');
test('东风显示名', getTileDisplayName(makeTile(TileSuit.WIND, 1)) === '东');
test('红中显示名', getTileDisplayName(makeTile(TileSuit.DRAGON, 1)) === '中');
test('春显示名', getTileDisplayName(makeTile(TileSuit.FLOWER, 1)) === '春');

// ===== 测试2: 胡牌判断 =====
console.log('\n=== 胡牌判断测试 ===');

// 标准胡: 123万 456万 789万 222筒 55万
const standardWin: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
  makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
  makeTile(TileSuit.CHARACTERS, 7), makeTile(TileSuit.CHARACTERS, 8), makeTile(TileSuit.CHARACTERS, 9),
  makeTile(TileSuit.DOTS, 2), makeTile(TileSuit.DOTS, 2), makeTile(TileSuit.DOTS, 2),
  makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 5),
];
test('标准胡(4面子1雀头)', canWinStandard(standardWin));

// 不是胡牌
const notWin: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 4),
  makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6), makeTile(TileSuit.CHARACTERS, 7),
  makeTile(TileSuit.CHARACTERS, 8), makeTile(TileSuit.CHARACTERS, 9), makeTile(TileSuit.DOTS, 1),
  makeTile(TileSuit.DOTS, 2), makeTile(TileSuit.DOTS, 3), makeTile(TileSuit.DOTS, 4),
  makeTile(TileSuit.DOTS, 5), makeTile(TileSuit.DOTS, 6),
];
test('不是胡牌', !canWinStandard(notWin));

// ===== 测试3: 牌型检测 =====
console.log('\n=== 牌型检测测试 ===');

// 碰碰胡: 111万 222万 333万 444筒 55万 (13张)
const pengPengHu: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 1),
  makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2),
  makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3),
  makeTile(TileSuit.DOTS, 4), makeTile(TileSuit.DOTS, 4), makeTile(TileSuit.DOTS, 4),
  makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 5),
];
const pengTypes = detectHandTypes(pengPengHu, [], true, 0, null);
test('碰碰胡检测', pengTypes.includes(HandType.ALL_TRIPLETS));

// 清一色: 123万 456万 789万 223万 (14张=13+摸1)
const qingYiSe: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
  makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
  makeTile(TileSuit.CHARACTERS, 7), makeTile(TileSuit.CHARACTERS, 8), makeTile(TileSuit.CHARACTERS, 9),
  makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2),
  makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3),
];
const qingTypes = detectHandTypes(qingYiSe, [], true, 0, null);
test('清一色检测', qingTypes.includes(HandType.FULL_FLUSH));

// 清碰: 111万 222万 333万 444万 55万
const qingPeng: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 1),
  makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2),
  makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3),
  makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 4),
  makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 5),
];
const qingPengTypes = detectHandTypes(qingPeng, [], true, 0, null);
test('清碰检测', qingPengTypes.includes(HandType.QING_PENG));
test('清碰含清一色', qingPengTypes.includes(HandType.FULL_FLUSH));
test('清碰含碰碰胡', qingPengTypes.includes(HandType.ALL_TRIPLETS));

// 风一色: 东东东 南南南 西西西 北北 北北 (14张: 4个刻子+1对子，但这样只有12+2=14不够)
// 正确: 东东东 南南南 西西 西北 北北 (东3+南3+西2+西1+北2+北2=13，不对)
// 正确: 东东东 南南南 西西西 北北 北 (东3+南3+西3+北2+北1=12，不对)
// 正确14张: 东东东 南南南 西西西 北北北 北 (东3+南3+西3+北3+北1=13，但北1不是对子)
// 正确: 东东东 南南南 西西西 北 北北 (东3+南3+西3+北1+北2=12...)
// 最简单: 东东东 南南南 西西西 北北北 北北 = 3+3+3+3+2=14
// 风一色: 纯风牌14张（检测"全是风牌"条件，不要求能胡）
// 注意: 4种风牌×3+1张 = 13张不够14张，4种风牌×4 = 16张超了
// 用门口牌配合: 手牌11张 + 门口3张 = 14张
const fengExposedMeld2: Meld = {
  type: MeldType.TRIPLET,
  tiles: [makeTile(TileSuit.WIND, 4), makeTile(TileSuit.WIND, 4), makeTile(TileSuit.WIND, 4)],
  isConcealed: false
};
const fengYiSe: Tile[] = [
  makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
  makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2),
  makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3),
  makeTile(TileSuit.WIND, 4), makeTile(TileSuit.WIND, 4),
];
const fengTypes = detectHandTypes(fengYiSe, [fengExposedMeld2], true, 0, null);
test('风一色检测(含门口牌)', fengTypes.includes(HandType.ALL_WIND));

// 风一色含箭牌: 纯箭牌也算风一色
const allDragon: Tile[] = [
  makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 1),
  makeTile(TileSuit.DRAGON, 2), makeTile(TileSuit.DRAGON, 2), makeTile(TileSuit.DRAGON, 2),
  makeTile(TileSuit.DRAGON, 3), makeTile(TileSuit.DRAGON, 3), makeTile(TileSuit.DRAGON, 3),
  makeTile(TileSuit.WIND, 4), makeTile(TileSuit.WIND, 4),
];
const allDragonTypes = detectHandTypes(allDragon, [fengExposedMeld2], true, 0, null);
test('纯箭牌算风一色', allDragonTypes.includes(HandType.ALL_WIND));

// 风碰: 风牌+箭牌 + 碰碰胡
// 东东东 南南南 西西西 中中中 北北 = 3+3+3+3+2=14 ✅
const fengPengHand: Tile[] = [
  makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
  makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2),
  makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3),
  makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 1), // 中中中(箭牌暗杠)
  makeTile(TileSuit.WIND, 4), makeTile(TileSuit.WIND, 4),
];
const fengPengTypes = detectHandTypes(fengPengHand, [], true, 0, null);
test('风碰检测(风+箭)', fengPengTypes.includes(HandType.FENG_PENG));
test('风碰含碰碰胡', fengPengTypes.includes(HandType.ALL_TRIPLETS));
test('风碰含风一色', fengPengTypes.includes(HandType.ALL_WIND));

// 混一色: 123万 456万 东东东 22333万 (14张)
const hunYiSe: Tile[] = [
  makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
  makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
  makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
  makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 2),
  makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3), makeTile(TileSuit.CHARACTERS, 3),
];
const hunTypes = detectHandTypes(hunYiSe, [], true, 0, null);
test('混一色检测', hunTypes.includes(HandType.HALF_FLUSH));

// ===== 测试4: 番数计算 =====
console.log('\n=== 番数计算测试 ===');

// 风碰 = 40番 (直接传入牌型)
const fengPengScore = calculateScore({
  handTiles: fengYiSe, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.FENG_PENG, HandType.ALL_WIND, HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: false,
  roundMultiplier: 1, globalMultiplier: 1
});
test('风碰=40番(直接)', fengPengScore.baseFan === 40);

// 清一色 = 10番
const qingScore = calculateScore({
  handTiles: qingYiSe, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.FULL_FLUSH],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: false,
  roundMultiplier: 1, globalMultiplier: 1
});
test('清一色=10番', qingScore.baseFan === 10);

// 碰碰胡(公式) = 2，但无花自摸=10会覆盖
const pengScore = calculateScore({
  handTiles: pengPengHu, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: false,
  roundMultiplier: 1, globalMultiplier: 1
});
test('碰碰胡+无花自摸=10番', pengScore.baseFan === 10);

// 无百搭翻倍
const pengScoreNoWild = calculateScore({
  handTiles: pengPengHu, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: false,
  wildTileSuit: TileSuit.DOTS, wildTileValue: 9,
  roundMultiplier: 1, globalMultiplier: 1
});
test('无百搭×2', pengScoreNoWild.extraMultipliers === 2);

// 门清翻倍
const pengScoreMenQing = calculateScore({
  handTiles: pengPengHu, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: true,
  roundMultiplier: 1, globalMultiplier: 1
});
test('门清×2', pengScoreMenQing.extraMultipliers === 2);

// 无百搭+门清=×4
const pengScoreBoth = calculateScore({
  handTiles: pengPengHu, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: true,
  wildTileSuit: TileSuit.DOTS, wildTileValue: 9,
  roundMultiplier: 1, globalMultiplier: 1
});
test('无百搭+门清=×4', pengScoreBoth.extraMultipliers === 4);

// 百搭是风牌+风碰=可算无百搭 (纯风牌+门口牌)
const windWithWildScore = calculateScore({
  handTiles: fengPengHand, exposedMelds: [], flowerTiles: [],
  handTypes: [HandType.FENG_PENG, HandType.ALL_WIND, HandType.ALL_TRIPLETS],
  isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: false,
  wildTileSuit: TileSuit.WIND, wildTileValue: 1, // 百搭=东(风牌)
  roundMultiplier: 1, globalMultiplier: 1
});
test('百搭是风牌+风碰=无百搭×2', windWithWildScore.extraMultipliers === 2);

// ===== 测试5: 回合倍数 =====
console.log('\n=== 回合倍数测试 ===');
test('1+1=×4', calculateRoundMultiplier(1, 1) === 4);
test('4+4=×4', calculateRoundMultiplier(4, 4) === 4);
test('2+2=×2', calculateRoundMultiplier(2, 2) === 2);
test('1+2=×1', calculateRoundMultiplier(1, 2) === 1);
test('3+5=×1', calculateRoundMultiplier(3, 5) === 1);

// ===== 测试6: 顺子限制 =====
console.log('\n=== 顺子限制测试 ===');
const windSeq = [makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 3)];
test('风牌不能组顺子', !isSequence(windSeq));

const dragonSeq = [makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 2), makeTile(TileSuit.DRAGON, 3)];
test('箭牌不能组顺子', !isSequence(dragonSeq));

const wanSeq = [makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3)];
test('万子可以组顺子', isSequence(wanSeq));

// ===== 测试7: 牌数约束 =====
console.log('\n=== 牌数约束测试 ===');
test('每种牌最多4张', deck.every(t => {
  const count = deck.filter(d => d.suit === t.suit && d.value === t.value).length;
  return count <= 4;
}));
// 验证测试数据中没有超过4张的牌
const allTestHands = [standardWin, notWin, pengPengHu, qingYiSe, hunYiSe, fengYiSe];
for (const hand of allTestHands) {
  const groups = groupTiles(hand);
  for (const [key, group] of groups) {
    test(`${key}不超过4张(手牌)`, group.length <= 4);
  }
}

// ===== 结果 =====
console.log(`\n=============================`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`=============================`);

process.exit(failed > 0 ? 1 : 0);
