import { canWin, detectHandTypes, HandType } from '../server/utils/handValidator';
import { TileSuit, MeldType, Meld } from '../server/types/game';

function t(suit: TileSuit, value: number) {
  return { suit, value, id: `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false };
}

// 混一色顺子+对子
const hunHand = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,2),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,5),t(TileSuit.DOTS,6),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1),t(TileSuit.WIND,1),
  t(TileSuit.DOTS,7),t(TileSuit.DOTS,7)
];

console.log('混一色手牌数:', hunHand.length);
const result = canWin(hunHand, [], null);
console.log('canWin:', result.canWin);
console.log('types:', result.types);
console.log('检测类型:', detectHandTypes(hunHand, [], null));
