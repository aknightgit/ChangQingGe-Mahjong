import { TileSuit, Tile, Meld } from '../server/types/game';
import { groupTiles, isFlower } from '../server/utils/tiles';

function t(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false };
}

const hand1: Tile[] = [
  t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),t(TileSuit.DOTS,1),
  t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),t(TileSuit.DOTS,2),
  t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),t(TileSuit.DOTS,3),
  t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),t(TileSuit.DOTS,4),
  t(TileSuit.WIND,1),t(TileSuit.WIND,1)
];

// Trace canFormMelds manually
const tiles = hand1.filter(t => !t.isFlower);
const wildCount = 0;
const n = 4; // 14 = 4*3 + 2, so 4 melds needed from hand (excluding pair)

const countMap = new Map<string, number>();
for (const tile of tiles) {
  const k = `${tile.suit}-${tile.value}`;
  countMap.set(k, (countMap.get(k) || 0) + 1);
}

console.log('countMap:');
for (const [k, c] of countMap) console.log(' ', k, c);

function backtrack(remaining: number, wildLeft: number, map: Map<string, number>): boolean {
  if (remaining === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }
  let firstKey: string | null = null;
  for (const k of map.keys()) {
    if ((map.get(k) || 0) > 0) { firstKey = k; break; }
  }
  if (!firstKey) return wildLeft >= remaining * 3;
  
  const [suit, valStr] = firstKey.split('-');
  const val = parseInt(valStr);
  const cnt = map.get(firstKey)!;
  
  // Triplet
  const needForTriplet = 3 - cnt;
  if (needForTriplet <= wildLeft) {
    map.set(firstKey, 0);
    if (backtrack(remaining - 1, wildLeft - needForTriplet, map)) return true;
    map.set(firstKey, cnt);
  }
  
  // Sequence
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numSuits.includes(suit as TileSuit) && val <= 7) {
    const k2 = `${suit}-${val + 1}`;
    const k3 = `${suit}-${val + 2}`;
    const c2 = map.get(k2) || 0;
    const c3 = map.get(k3) || 0;
    const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);
    if (missing <= wildLeft) {
      const orig2 = c2, orig3 = c3;
      map.set(firstKey, 0);
      if (c2 > 0) map.set(k2, c2 - 1);
      if (c3 > 0) map.set(k3, c3 - 1);
      if (backtrack(remaining - 1, wildLeft - missing, map)) return true;
      map.set(firstKey, cnt);
      if (c2 > 0) map.set(k2, orig2);
      if (c3 > 0) map.set(k3, orig3);
    }
  }
  return false;
}

const result = backtrack(n, wildCount, countMap);
console.log('canFormMelds(14tiles, n=4, wild=0) =', result);
