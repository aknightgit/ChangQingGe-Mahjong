// Quick debug: test canWin with a simple 14-tile hand
import { canWin, detectHandTypes } from '../server/utils/handValidator';
import { TileSuit } from '../server/types/game';

const WAN = TileSuit.CHARACTERS;
const TIAO = TileSuit.BAMBOOS;
let _id = 0;
function T(suit: TileSuit, value: number) {
  return { suit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
}

// Simple winning hand: 1-2-3万 + 4-5-6万 + 7-8-9万 + 1-1-1万 + 2-2条
// = 1万×4, 2万×1, 3万×1, 4万×1, 5万×1, 6万×1, 7万×1, 8万×1, 9万×1, 2条×2
const hand = [
  T(WAN, 1), T(WAN, 1), T(WAN, 1), T(WAN, 1),  // 1万×4
  T(WAN, 2), T(WAN, 3), T(WAN, 4), T(WAN, 5), T(WAN, 6),
  T(WAN, 7), T(WAN, 8), T(WAN, 9),
  T(TIAO, 2), T(TIAO, 2),
];

console.log('Hand length:', hand.length);
console.log('canWin:', canWin(hand, 0, null));
console.log('detectHandTypes:', detectHandTypes(hand, 0, null));
