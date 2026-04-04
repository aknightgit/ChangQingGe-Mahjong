import { canWin, detectHandTypes, isTing, buildWildTileChecker } from '../server/utils/handValidator';
import { TileSuit, Tile, MeldType, Meld } from '../server/types/game';

function t(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false };
}
function f(value: number): Tile {
  return { suit: TileSuit.FLOWER, value, id: `f-${value}-${Math.random().toString(36).slice(2)}`, isFlower: true };
}

let pass = 0, fail = 0;
function check(name: string, got: boolean, expected: boolean) {
  if (got === expected) { pass++; } else { fail++; console.log(`❌ ${name} → got=${got}, expected=${expected}`); }
}
function checkTypes(name: string, got: string[], expected: string[]) {
  const eq = JSON.stringify(got) === JSON.stringify(expected);
  if (eq) { pass++; } else { fail++; console.log(`❌ ${name} → got=${JSON.stringify(got)}, exp=${JSON.stringify(expected)}`); }
}

// === 1. 基础3n+2格式 ===

// 碰碰胡+混一色+混碰
const hand1 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)
];
const r1 = canWin(hand1, [], null);
check('14张刻子+对子(碰)', r1.canWin, true);
checkTypes('类型', r1.types, ['hun_peng','half_flush','all_triplets']);

// 清一色+清碰+碰碰胡
const hand2 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.DOTS,5),t(TileSuit.DOTS,5)
];
const r2 = canWin(hand2, [], null);
check('清一色刻子+对子', r2.canWin, true);
checkTypes('清一色类型', r2.types, ['qing_peng','full_flush','all_triplets']);

// 顺子胡牌
const hand3 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3)
];
check('14张标准顺子胡', canWin(hand3, [], null).canWin, true);

// 混一色顺子胡
const hand4 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5)
];
check('混一色顺子+对子', canWin(hand4, [], null).canWin, true);

// === 2. 不胡 ===
check('13张不胡', canWin([
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1)
], [], null).canWin, false);

check('14杂牌单张不胡', canWin([
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
], [], null).canWin, false);

// === 3. 特殊牌型 ===
// 风一色+碰碰胡=风碰
const hand5 = [
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  t(TileSuit.WIND,2),t(TileSuit.WIND,2),t(TileSuit.WIND,2),
  t(TileSuit.WIND,3),t(TileSuit.WIND,3),t(TileSuit.WIND,3),
  t(TileSuit.WIND,4),t(TileSuit.WIND,4),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
];
const r5 = canWin(hand5, [], null);
check('风碰', r5.canWin, true);
checkTypes('风碰类型', r5.types, ['feng_peng','all_wind','all_triplets']);

// 八花自摸
const hand6 = [f(1),f(2),f(3),f(4),f(5),f(6),f(7),f(8)];
check('八花自摸', canWin(hand6, [], null).canWin, true);

// 风一色（纯风牌，不满足3n+2）
const hand7 = [
  t(TileSuit.WIND,1),t(TileSuit.WIND,2),t(TileSuit.WIND,3),
  t(TileSuit.WIND,4),t(TileSuit.WIND,1),t(TileSuit.WIND,2),
  t(TileSuit.WIND,3),t(TileSuit.WIND,4),t(TileSuit.WIND,1),
  t(TileSuit.WIND,2),t(TileSuit.WIND,3),t(TileSuit.WIND,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
];
check('纯风牌(非3n+2)', canWin(hand7, [], null).canWin, true);

// === 4. 暴露面子 ===
const meld = { type: MeldType.TRIPLET as MeldType, tiles: [
  t(TileSuit.BAMBOOS,9),t(TileSuit.BAMBOOS,9),t(TileSuit.BAMBOOS,9)
], isConcealed: false };
const hand8 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4)
];
const r8 = canWin(hand8, [meld], null);
check('1个碰+11张(碰胡)', r8.canWin, true);
checkTypes('1碰+11张', r8.types, ['all_triplets']);

// === 5. 大吊 ===
const melds3 = [
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1)], isConcealed: false },
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2)], isConcealed: false },
  { type: MeldType.TRIPLET as MeldType, tiles: [t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3)], isConcealed: false }
];
const hand9 = [t(TileSuit.DOTS,4),t(TileSuit.DOTS,4)];
const r9 = canWin(hand9, melds3 as Meld[], null);
check('大吊', r9.canWin, true);
checkTypes('大吊类型', r9.types.sort(), ['all_triplets','da_diao'].sort());

// === 6. 听牌 ===
const hand10 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5)
];
check('11张听4/7万', isTing(hand10, 0, () => false), true);

console.log(`\n========== 结果: ${pass}/${pass+fail} 通过, ${fail} 失败 ==========`);
process.exit(fail > 0 ? 1 : 0);
