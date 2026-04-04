import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, detectTypes, HandType } from '../server/utils/handValidator';

function T(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${Math.random()}`, isFlower: false };
}
function Ts(suit: string, vals: number[]): Tile[] {
  return vals.map(v => T(suit, v));
}

// 测试1: 123 456 789 11万 (14张，有顺子)
const hand1 = [...Ts('wan', [1,2,3,4,5,6,7,8,9,1,1,2,3,4])];
const result1 = canWin(hand1, [], null);
console.log('测试1 (123 456 789 1234万, 14张):');
console.log('  canWin:', result1.canWin);
console.log('  types:', result1.types.join(', '));
console.log('  有all_triplets?', result1.types.includes(HandType.ALL_TRIPLETS));

// 测试2: 111 222 333 44万 (14张，纯刻子)
const hand2 = [...Ts('wan', [1,1,1,2,2,2,3,3,3,4,4,5,5,6])];
const result2 = canWin(hand2, [], null);
console.log('\n测试2 (111 222 333 44556万, 14张):');
console.log('  canWin:', result2.canWin);
console.log('  types:', result2.types.join(', '));
console.log('  有all_triplets?', result2.types.includes(HandType.ALL_TRIPLETS));

// 测试3: 111 222 333 44万 (14张，纯刻子+对子)
const hand3 = [...Ts('wan', [1,1,1,2,2,2,3,3,3,4,4,4,5,5])];
const result3 = canWin(hand3, [], null);
console.log('\n测试3 (111 222 333 444 55万, 14张):');
console.log('  canWin:', result3.canWin);
console.log('  types:', result3.types.join(', '));
console.log('  有all_triplets?', result3.types.includes(HandType.ALL_TRIPLETS));

// 测试4: 123 234 345 456 77万 (14张，纯顺子)
const hand4 = [...Ts('wan', [1,2,3,2,3,4,3,4,5,4,5,6,7,7])];
const result4 = canWin(hand4, [], null);
console.log('\n测试4 (123 234 345 456 77万, 14张):');
console.log('  canWin:', result4.canWin);
console.log('  types:', result4.types.join(', '));
console.log('  有all_triplets?', result4.types.includes(HandType.ALL_TRIPLETS));

// 测试5: 门口有顺子
const hand5 = [...Ts('wan', [1,1,2,2,3,3,4,4,5,5,6,6,7,7])];
const exposed5: Meld[] = [
  { type: MeldType.SEQUENCE, tiles: Ts('wan', [1,2,3]), isConcealed: false },
];
const result5 = canWin(hand5, exposed5, null);
console.log('\n测试5 (手牌11223344556677万 + 门口123顺子):');
console.log('  canWin:', result5.canWin);
console.log('  types:', result5.types.join(', '));
console.log('  有all_triplets?', result5.types.includes(HandType.ALL_TRIPLETS));

// 测试6: 门口有刻子，手牌纯刻子
const hand6 = [...Ts('wan', [1,1,1,2,2,2,3,3,3,4,4,4,5,5])];
const exposed6: Meld[] = [
  { type: MeldType.TRIPLET, tiles: Ts('wan', [6,6,6]), isConcealed: false },
];
const result6 = canWin(hand6, exposed6, null);
console.log('\n测试6 (手牌111 222 333 444 55万 + 门口666刻子):');
console.log('  canWin:', result6.canWin);
console.log('  types:', result6.types.join(', '));
console.log('  有all_triplets?', result6.types.includes(HandType.ALL_TRIPLETS));
