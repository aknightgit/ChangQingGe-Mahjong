import { detectHandTypes } from '../server/utils/handValidator'
import { TileSuit, type Tile, type Meld, MeldType } from '../server/types/game'
import { randomUUID } from 'crypto'

function mkTile(s: TileSuit, v: number): Tile {
  return { suit: s, value: v, id: `${s}-${v}-${randomUUID()}`, isFlower: false }
}

// Test 1: Pure 4 melds + 1 pair, no wild tiles
const h1: Tile[] = [
  // 3 sequences
  mkTile(TileSuit.CHARACTERS, 1), mkTile(TileSuit.CHARACTERS, 2), mkTile(TileSuit.CHARACTERS, 3),
  mkTile(TileSuit.CHARACTERS, 4), mkTile(TileSuit.CHARACTERS, 5), mkTile(TileSuit.CHARACTERS, 6),
  mkTile(TileSuit.CHARACTERS, 7), mkTile(TileSuit.CHARACTERS, 8), mkTile(TileSuit.CHARACTERS, 9),
  // 1 meld
  mkTile(TileSuit.DRAGON, 1),  // red dragon triplet
  mkTile(TileSuit.DRAGON, 1),
  mkTile(TileSuit.DRAGON, 1),
  // pair
  mkTile(TileSuit.CHARACTERS, 2),
  mkTile(TileSuit.CHARACTERS, 2)
]

console.log('Test 1: Standard 4meld+1pair, 14 tiles (3 seq + 1 tri + pair)')
console.log('  Tiles:', h1.length)
const r1 = detectHandTypes(h1, [], true, 0, null)
console.log('  Result:', r1)

// Test 2: 3 melds exposed, 1 meld in hand + pair
const exposed: Meld[] = [
  { type: MeldType.SEQUENCE, tiles: [mkTile(TileSuit.CHARACTERS, 1), mkTile(TileSuit.CHARACTERS, 2), mkTile(TileSuit.CHARACTERS, 3)], isConcealed: false },
  { type: MeldType.SEQUENCE, tiles: [mkTile(TileSuit.BAMBOOS, 1), mkTile(TileSuit.BAMBOOS, 2), mkTile(TileSuit.BAMBOOS, 3)], isConcealed: false },
  { type: MeldType.TRIPLET, tiles: [mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 1)], isConcealed: false }
]
const h2: Tile[] = [
  mkTile(TileSuit.BAMBOOS, 7), mkTile(TileSuit.BAMBOOS, 7), // pair
  mkTile(TileSuit.BAMBOOS, 4), mkTile(TileSuit.BAMBOOS, 5), mkTile(TileSuit.BAMBOOS, 6), // seq
  mkTile(TileSuit.BAMBOOS, 1), // single tile (14th tile just drawn)
]

console.log('\nTest 2: 3 exposed melds + 1 seq + pair in hand')
console.log('  Hand:', h2.length, 'Exposed:', exposed.length)
const r2 = detectHandTypes(h2, exposed, false, 0, null)
console.log('  Result:', r2)

// Test 3: After chow (1 meld exposed), 10 tiles in hand (still needs 3 more melds + pair)
const h3: Tile[] = [
  mkTile(TileSuit.CHARACTERS, 1), mkTile(TileSuit.CHARACTERS, 2), mkTile(TileSuit.CHARACTERS, 3),
  mkTile(TileSuit.CHARACTERS, 4), mkTile(TileSuit.CHARACTERS, 5), mkTile(TileSuit.CHARACTERS, 6),
  mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 2), mkTile(TileSuit.DOTS, 3),
  mkTile(TileSuit.DOTS, 4), // just drew the 10th tile after chow
]
console.log('\nTest 3: After chow (10 tiles = 3 seq in hand, not a win yet)')
console.log('  Hand:', h3.length)
const r3 = detectHandTypes(h3, [], true, 0, null)
console.log('  Result:', r3)

// Test 4: Full win hand after chow (1 meld exposed, 11 tiles = 3 more melds + pair)
// After chow: hand should be 11 tiles (3 melds + pair = 11 tiles = 4*3-3*1-2 = ... 
// Wait: total tiles = 13 initial + 1 draw = 14, after chow take 3-1=2 from hand, add 3 to exposed
// Actually: 13 initial -> draw to 14 -> discard to 13 -> ... 
// Let me just construct a valid 11-tile hand with 3 meld + pair
const h4: Tile[] = [
  mkTile(TileSuit.BAMBOOS, 1), mkTile(TileSuit.BAMBOOS, 2), mkTile(TileSuit.BAMBOOS, 3), // seq1
  mkTile(TileSuit.BAMBOOS, 4), mkTile(TileSuit.BAMBOOS, 5), mkTile(TileSuit.BAMBOOS, 6), // seq2  
  mkTile(TileSuit.DOTS, 7), mkTile(TileSuit.DOTS, 8), mkTile(TileSuit.DOTS, 9), // seq3
  mkTile(TileSuit.CHARACTERS, 5), mkTile(TileSuit.CHARACTERS, 5), // pair
]
console.log('\nTest 4: 11 tiles = 3 seq + pair (valid win, no wild)')
console.log('  Hand:', h4.length)
const r4 = detectHandTypes(h4, [exposed[0]], false, 0, null)
console.log('  Result:', r4)
