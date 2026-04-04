import { TileSuit, Tile } from '../server/types/game';
import { groupTiles } from '../server/utils/tiles';

function t(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}`, isFlower: false };
}

// Test canFormMelds directly
const hand1 = [t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)];

console.log('hand1 tiles:', hand1.length);

// Manually trace canFormMelds
const isWild = () => false;
const tiles = hand1.filter(t => !t.isFlower);
console.log('non-flower tiles:', tiles.length);

const groups = groupTiles(tiles);
console.log('groups:');
for (const [k, v] of groups) {
  console.log(' ', k, '->', v.length, 'tiles');
}

// Check if 14 tiles = 4*3 + 2: 4 triplets + 1 pair
// canFormMelds with n=4, no wilds
// Expected: true (4 triplets)

const wilds: Tile[] = [];
const naturals = tiles;
const countMap = new Map<string, number>();
for (const tile of naturals) {
  const k = `${tile.suit}-${tile.value}`;
  countMap.set(k, (countMap.get(k) || 0) + 1);
}
console.log('countMap:');
for (const [k, c] of countMap) {
  console.log(' ', k, '->', c);
}

