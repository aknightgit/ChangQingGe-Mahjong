/**
 * Debug test v2 - proper winning hand
 */
import {
  shuffleTiles, isFlower, normalizeHand
} from '../server/utils/tiles'
import {
  canWin, detectHandTypes, HandType
} from '../server/utils/handValidator'
import { TileSuit, type Tile } from '../server/types/game'

function mkTile(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,6)}`, isFlower: false }
}

// Standard winning hand: 4 melds (sequences) + 1 pair
// 万1,2,3 × 2 (2 sequences), 万4,5,6 × 1 (1 sequence), 万7,8,9 × 1 (1 sequence), pair: 万9 × 2
// Total: 6+3+3+2 = 14 ✓
function buildProperStandardHand(): Tile[] {
  return [
    mkTile(TileSuit.CHARACTERS, 1), mkTile(TileSuit.CHARACTERS, 2), mkTile(TileSuit.CHARACTERS, 3),
    mkTile(TileSuit.CHARACTERS, 1), mkTile(TileSuit.CHARACTERS, 2), mkTile(TileSuit.CHARACTERS, 3),
    mkTile(TileSuit.CHARACTERS, 4), mkTile(TileSuit.CHARACTERS, 5), mkTile(TileSuit.CHARACTERS, 6),
    mkTile(TileSuit.CHARACTERS, 7), mkTile(TileSuit.CHARACTERS, 8), mkTile(TileSuit.CHARACTERS, 9),
    mkTile(TileSuit.CHARACTERS, 9), // pair
  ]
}

// Alternative: 3 sequences + 1 triplet + 1 pair
// 筒1,2,3 × 2 (2 sequences), 筒4,5,6 × 1 (1 sequence), 筒7,7,7 (triplet), 筒1,1 (pair)
function buildTripletHand(): Tile[] {
  return [
    mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 2), mkTile(TileSuit.DOTS, 3),
    mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 2), mkTile(TileSuit.DOTS, 3),
    mkTile(TileSuit.DOTS, 4), mkTile(TileSuit.DOTS, 5), mkTile(TileSuit.DOTS, 6),
    mkTile(TileSuit.DOTS, 7), mkTile(TileSuit.DOTS, 7), mkTile(TileSuit.DOTS, 7),
    mkTile(TileSuit.DOTS, 1), mkTile(TileSuit.DOTS, 1),
  ]
}

console.log('=== Test 1: Standard sequence hand ===')
const h1 = buildProperStandardHand()
console.log('Hand size:', h1.length)
const d1 = detectHandTypes(h1, [])
console.log('detectHandTypes:', d1)
const c1 = canWin(h1, [], null)
console.log('canWin:', c1)

console.log('\n=== Test 2: Triplet hand ===')
const h2 = buildTripletHand()
console.log('Hand size:', h2.length)
const d2 = detectHandTypes(h2, [])
console.log('detectHandTypes:', d2)
const c2 = canWin(h2, [], null)
console.log('canWin:', c2)

// Test 3: with wild tile
console.log('\n=== Test 3: Same hand with wild tile set ===')
const wildTileId = 'characters-5'
const c3 = canWin(h1, [], wildTileId)
console.log('canWin with wildTile=5万:', c3)

// Test 4: What HAND_TYPE_PRIORITY says about STANDARD
console.log('\n=== Test 4: Hand type priority check ===')
import { HAND_TYPE_PRIORITY } from '../server/utils/handValidator'
console.log('HAND_TYPE_PRIORITY keys:', Object.keys(HAND_TYPE_PRIORITY))
console.log('STANDARD priority:', HAND_TYPE_PRIORITY['STANDARD'])

// Test 5: Skip canFormMelds

// Test 6: Full 144 tile deck, deal 14 tiles, test canWin
console.log('\n=== Test 6: 100 random deals ===')
const deck: Tile[] = []
for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
  for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(s, v))
for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(TileSuit.WIND, v))
for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(TileSuit.DRAGON, v))

let canWinTrue = 0
let canWinWithTypeTrue = 0
let totalTypes: HandType[] = []
for (let i = 0; i < 100; i++) {
  const shuffled = shuffleTiles([...deck])
  const hand = normalizeHand(shuffled.slice(0, 14))
  const wild = shuffled[14] ? `${shuffled[14].suit}-${shuffled[14].value}` : null
  const wc = canWin(hand, [], wild)
  if (wc.canWin) canWinTrue++
  const vt = wc.types.filter(t => t !== HandType.STANDARD)
  if (vt.length > 0) canWinWithTypeTrue++
  totalTypes.push(...wc.types)
}
console.log(`100 random 14-tile hands:`)
console.log(`  canWin=true: ${canWinTrue}/100`)
console.log(`  canWinWithType (no STANDARD filter): ${canWinWithTypeTrue}/100`)
console.log(`  Most common types:`, Object.entries(
  totalTypes.reduce((acc: Record<string,number>, t) => { acc[t] = (acc[t]||0)+1; return acc }, {})
).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0,5))
