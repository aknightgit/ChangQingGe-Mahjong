import { canWin, detectHandTypes, isTing, buildWildTileChecker, HandType } from '../server/utils/handValidator';
import { TileSuit, Tile, MeldType, Meld } from '../server/types/game';

function t(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false };
}
function f(value: number): Tile {
  return { suit: TileSuit.FLOWER, value, id: `f-${value}-${Math.random().toString(36).slice(2)}`, isFlower: true };
}

let pass = 0, fail = 0;
function testOK(name: string, cond: boolean) { if (cond) { pass++; } else { fail++; console.log(`❌ ${name}`); } }
function testTypes(name: string, got: string[], exp: string[]) {
  const ok = got.length === exp.length && got.every((v, i) => v === exp[i]);
  if (ok) { pass++; } else { fail++; console.log(`❌ ${name}: got=[${got}], exp=[${exp}]`); }
}

// ============================================================
// 第一层：特殊牌型（无需3n+2，无序）
// ============================================================
console.log('=== 第一层：特殊牌型 ===');

// 八花自摸
testOK('八花自摸可胡', canWin([f(1),f(2),f(3),f(4),f(5),f(6),f(7),f(8)], [], null).canWin);
testOK('八花类型', canWin([f(1),f(2),f(3),f(4),f(5),f(6),f(7),f(8)], [], null).types[0], HandType.EIGHT_FLOWERS);

// 纯风牌（无论3n+2）
const windHand = [
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  t(TileSuit.WIND,2),t(TileSuit.WIND,2),t(TileSuit.WIND,2),
  t(TileSuit.WIND,3),t(TileSuit.WIND,3),t(TileSuit.WIND,3),
  t(TileSuit.WIND,4),t(TileSuit.WIND,4),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
];
const windR = canWin(windHand, [], null);
testOK('风一色(满足3n+2)', windR.canWin);
testOK('风含all_wind', windR.types.includes(HandType.ALL_WIND));

// 纯风牌（不满足3n+2也应通过）
const pureWind = [
  t(TileSuit.WIND,1),t(TileSuit.WIND,2),t(TileSuit.WIND,3),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2),t(TileSuit.WIND,3),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2),t(TileSuit.WIND,3),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
];
testOK('纯风牌(非3n+2)可胡', canWin(pureWind, [], null).canWin);

// ============================================================
// 第二层：满足N*3+2格式的各种牌型
// ============================================================
console.log('\n=== 第二层：3n+2牌型 ===');

// 碰碰胡+混一色+混碰
const pengHand = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)
];
const pengR = canWin(pengHand, [], null);
testOK('碰碰胡可胡', pengR.canWin);
testOK('含all_triplets', pengR.types.includes(HandType.ALL_TRIPLETS));
testOK('含half_flush', pengR.types.includes(HandType.HALF_FLUSH));
testOK('含hun_peng', pengR.types.includes(HandType.HUN_PENG));

// 清一色+清碰
const qingHand = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.DOTS,5),t(TileSuit.DOTS,5)
];
const qingR = canWin(qingHand, [], null);
testOK('清一色碰碰胡可胡', qingR.canWin);
testOK('含qing_peng', qingR.types.includes(HandType.QING_PENG));

// 混一色顺子+对子（4 melds + 1 pair = 14）
const hunHand = [
  // 3个顺子meld
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  // 1个字牌meld
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  // 对子
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,7)
];
testOK('混一色顺子+对子可胡', canWin(hunHand, [], null).canWin);

// 标准顺子胡
const shunziHand = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3)
];
testOK('标准顺子胡牌', canWin(shunziHand, [], null).canWin);

// ============================================================
// 第三层：手牌数限制
// ============================================================
console.log('\n=== 第三层：手牌数限制 ===');

testOK('13张不胡', !canWin([
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1)
], [], null).canWin);

testOK('14杂牌不胡', !canWin([
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
], [], null).canWin);

// ============================================================
// 暴露面子测试
// ============================================================
console.log('\n=== 暴露面子测试 ===');

const meld: Meld = { type: MeldType.TRIPLET, tiles: [
  t(TileSuit.BAMBOOS,9),t(TileSuit.BAMBOOS,9),t(TileSuit.BAMBOOS,9)
], isConcealed: false };

const peng11Hand = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4)
];
const peng11R = canWin(peng11Hand, [meld], null);
testOK('1个碰+11张可胡', peng11R.canWin);

// ============================================================
// 大吊测试（手牌2张 = 摸1张听牌 → 摸来成对胡）
// ============================================================
console.log('\n=== 大吊测试 ===');

const ddMelds = [
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1)], isConcealed: false },
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2)], isConcealed: false },
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3)], isConcealed: false },
];
const ddHand = [t(TileSuit.DOTS,4),t(TileSuit.DOTS,4)];
const ddR = canWin(ddHand, ddMelds as Meld[], null);
testOK('大吊可胡', ddR.canWin);
testOK('大吊类型', ddR.types.includes(HandType.DA_DIAO));

// ============================================================
// 听牌测试：13张牌（未摸牌）听什么
// ============================================================
console.log('\n=== 听牌测试 ===');

const ting13 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)  // 13张，听4/7 dots
];
testOK('13张听4/7万', isTing(ting13, 0, () => false));

// ============================================================
// 总结
// ============================================================
console.log(`\n========== ${pass}/${pass+fail} 通过, ${fail} 失败 ==========`);
process.exit(fail > 0 ? 1 : 0);
