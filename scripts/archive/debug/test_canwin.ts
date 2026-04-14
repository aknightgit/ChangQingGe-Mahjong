import { canWin } from '../server/utils/handValidator';
import { TileSuit } from '../server/types/game';

function t(suit: TileSuit, value: number) {
  return { suit, value, id: `${suit}-${value}`, isFlower: false };
}

// 14张刻子+对子 = 碰碰胡
const hand1 = [t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)];
console.log('14 triplets+pair (pengpeng):', JSON.stringify(canWin(hand1, [], null)));

// 14张杂牌单张
const hand2 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1),t(TileSuit.WIND,2)
];
console.log('14 mixed singles (should fail):', JSON.stringify(canWin(hand2, [], null)));

// 13张（不应胡）
const hand3 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,8),t(TileSuit.DOTS,9),
  t(TileSuit.CHARACTERS,1),t(TileSuit.CHARACTERS,2),t(TileSuit.CHARACTERS,3),
  t(TileSuit.WIND,1)
];
console.log('13 tiles (should fail):', JSON.stringify(canWin(hand3, [], null)));

// 14张清一色碰碰胡
const hand4 = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.DOTS,5),t(TileSuit.DOTS,5),
];
console.log('14 DOTS-only triplets+pair (qingpeng):', JSON.stringify(canWin(hand4, [], null)));
