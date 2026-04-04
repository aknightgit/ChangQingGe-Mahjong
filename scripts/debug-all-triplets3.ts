import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, HandType } from '../server/utils/handValidator';

function T(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${Math.random()}`, isFlower: false };
}
function Ts(suit: string, vals: number[]): Tile[] {
  return vals.map(v => T(suit, v));
}

// 测试1: 门口有顺子，手牌11张 (14-3=11)
const hand1 = [...Ts('wan', [1,1,2,2,3,3,4,4,5,5,6])];
const exposed1: Meld[] = [
  { type: MeldType.SEQUENCE, tiles: Ts('wan', [7,8,9]), isConcealed: false },
];
const result1 = canWin(hand1, exposed1, null);
console.log('测试1 (手牌11张 + 门口789顺子):');
console.log('  canWin:', result1.canWin);
console.log('  types:', result1.types.join(', '));
console.log('  有all_triplets?', result1.types.includes(HandType.ALL_TRIPLETS));

// 测试2: 门口有刻子，手牌11张 (14-3=11)
const hand2 = [...Ts('wan', [1,1,1,2,2,2,3,3,3,4,4])];
const exposed2: Meld[] = [
  { type: MeldType.TRIPLET, tiles: Ts('wan', [5,5,5]), isConcealed: false },
];
const result2 = canWin(hand2, exposed2, null);
console.log('\n测试2 (手牌111 222 333 44万 + 门口555刻子):');
console.log('  canWin:', result2.canWin);
console.log('  types:', result2.types.join(', '));
console.log('  有all_triplets?', result2.types.includes(HandType.ALL_TRIPLETS));

// 测试3: 门口有顺子，手牌有顺子
const hand3 = [...Ts('wan', [1,2,3,4,5,6,7,8,9,1,1])];
const exposed3: Meld[] = [
  { type: MeldType.SEQUENCE, tiles: Ts('wan', [2,3,4]), isConcealed: false },
];
const result3 = canWin(hand3, exposed3, null);
console.log('\n测试3 (手牌123 456 789 11万 + 门口234顺子):');
console.log('  canWin:', result3.canWin);
console.log('  types:', result3.types.join(', '));
console.log('  有all_triplets?', result3.types.includes(HandType.ALL_TRIPLETS));

// 测试4: 门口有刻子，手牌有顺子
const hand4 = [...Ts('wan', [1,2,3,4,5,6,7,8,9,1,1])];
const exposed4: Meld[] = [
  { type: MeldType.TRIPLET, tiles: Ts('wan', [2,2,2]), isConcealed: false },
];
const result4 = canWin(hand4, exposed4, null);
console.log('\n测试4 (手牌123 456 789 11万 + 门口222刻子):');
console.log('  canWin:', result4.canWin);
console.log('  types:', result4.types.join(', '));
console.log('  有all_triplets?', result4.types.includes(HandType.ALL_TRIPLETS));

// 测试5: 门口有刻子，手牌纯刻子
const hand5 = [...Ts('wan', [1,1,1,2,2,2,3,3,3,4,4])];
const exposed5: Meld[] = [
  { type: MeldType.TRIPLET, tiles: Ts('wan', [5,5,5]), isConcealed: false },
];
const result5 = canWin(hand5, exposed5, null);
console.log('\n测试5 (手牌111 222 333 44万 + 门口555刻子):');
console.log('  canWin:', result5.canWin);
console.log('  types:', result5.types.join(', '));
console.log('  有all_triplets?', result5.types.includes(HandType.ALL_TRIPLETS));
