import { Tile, TileSuit } from '../server/types/game';
import { canWin, buildWildTileChecker } from '../server/utils/handValidator';

let _id = 0;
function T(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
}

const hand = [T('wan', 1), T('wan', 1), T('wan', 1), T('wan', 1)];
console.log('Hand:', hand.map(t => `${t.suit}-${t.value}-${t.id}`).join(', '));
console.log('Hand length:', hand.length);

const checker = buildWildTileChecker('wan-1');
console.log('Checker test:', hand.map(t => checker(t)));

const wildCount = hand.filter(t => checker(t)).length;
console.log('Wild count:', wildCount);

const result = canWin(hand, [], 'wan-1');
console.log('canWin:', result.canWin);
console.log('types:', result.types);
