/**
 * Debug test - isolate the AI win issue
 */
import {
  shuffleTiles, isFlower, groupTiles, normalizeHand
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType, isTing
} from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile, type Meld } from '../server/types/game'

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,8)}`, isFlower: false }
}

// Build a standard winning hand: 3 melds + 1 pair
// Example: 万1,2,3 × 2, 万4,5,6, 万7,8,9 × 2, 东风对子
function buildStandardWinHand(): Tile[] {
  return [
    t(TileSuit.CHARACTERS, 1), t(TileSuit.CHARACTERS, 1),
    t(TileSuit.CHARACTERS, 2), t(TileSuit.CHARACTERS, 2),
    t(TileSuit.CHARACTERS, 3), t(TileSuit.CHARACTERS, 3),
    t(TileSuit.CHARACTERS, 4), t(TileSuit.CHARACTERS, 5), t(TileSuit.CHARACTERS, 6),
    t(TileSuit.CHARACTERS, 7), t(TileSuit.CHARACTERS, 7),
    t(TileSuit.CHARACTERS, 8), t(TileSuit.CHARACTERS, 8),
    t(TileSuit.CHARACTERS, 9),  // single as test
  ]
}

function buildAnotherHand(): Tile[] {
  return [
    t(TileSuit.DOTS, 1), t(TileSuit.DOTS, 1),
    t(TileSuit.DOTS, 2), t(TileSuit.DOTS, 2),
    t(TileSuit.DOTS, 3), t(TileSuit.DOTS, 3),
    t(TileSuit.DOTS, 4), t(TileSuit.DOTS, 5), t(TileSuit.DOTS, 6),
    t(TileSuit.DOTS, 7), t(TileSuit.DOTS, 8), t(TileSuit.DOTS, 9),
    t(TileSuit.WIND, 1), t(TileSuit.WIND, 1), // East wind pair
  ]
}

console.log('=== canWin basic test ===')

// Test 1: Standard winning hand (no wild)
const hand1 = buildAnotherHand()
const wc1 = canWin(hand1, [], null)
console.log('Standard hand canWin:', wc1)
console.log('  hand size:', hand1.length)

// Test 2: Same hand with wild tile set (wild=万1)
const wildTileId = 'characters-1'
const wc2 = canWin(hand1, [], wildTileId)
console.log('\nSame hand with wildTile=万1:', wc2)

// Test 3: Test with wild tiles in hand
const handWithWild = [
  t(TileSuit.CHARACTERS, 1), t(TileSuit.CHARACTERS, 1), t(TileSuit.CHARACTERS, 1), // 3×万1 (wild)
  t(TileSuit.CHARACTERS, 4), t(TileSuit.CHARACTERS, 5), t(TileSuit.CHARACTERS, 6),
  t(TileSuit.CHARACTERS, 7), t(TileSuit.CHARACTERS, 8), t(TileSuit.CHARACTERS, 9),
  t(TileSuit.WIND, 1), t(TileSuit.WIND, 1),
  t(TileSuit.CHARACTERS, 2), t(TileSuit.CHARACTERS, 3),
  t(TileSuit.CHARACTERS, 4), // extra
]
const wc3 = canWin(handWithWild, [], wildTileId)
console.log('\nHand with wild tiles (3 wild):', wc3)

// Test 4: What does detectTypes say about standard hand?
const wc4 = detectHandTypes(hand1, [])
console.log('\ndetectHandTypes(standard hand):', wc4)

// Test 5: Simulate canWinWithType filter
function canWinWithType_AI(hand: Tile[], exposed: Meld[], wildTileId: string | null) {
  const kongCount = 0
  const win = canWin(hand, exposed.length, wildTileId)
  if (!win.canWin) return false
  const validTypes = win.types.filter(t => t !== HandType.STANDARD)
  console.log(`  canWin says: canWin=${win.canWin}, types=[${win.types.join(',')}], after filter=[${validTypes.join(',')}]`)
  return validTypes.length > 0
}

console.log('\n=== canWinWithType filter test ===')
const r1 = canWinWithType_AI(hand1, [], null)
console.log('Standard hand -> canWinWithType:', r1)

const r2 = canWinWithType_AI(hand1, [], wildTileId)
console.log('With wildTile -> canWinWithType:', r2)

// Test 6: Now test with a HALF_FLUSH type hand
const halfFlushHand: Tile[] = []
// 万1-9 all in same suit (9 tiles), + pair of dots
for (let v = 1; v <= 9; v++) halfFlushHand.push(t(TileSuit.CHARACTERS, v))
halfFlushHand.push(t(TileSuit.DOTS, 1), t(TileSuit.DOTS, 1), t(TileSuit.DOTS, 1))
halfFlushHand.push(t(TileSuit.DOTS, 2), t(TileSuit.DOTS, 2))
const wc5 = canWin(halfFlushHand, [], null)
console.log('\nHalf-flush-ish hand canWin:', wc5)

// Test 7: Real game simulation - deal 13 tiles and check
console.log('\n=== Real game deal test ===')
const deck: Tile[] = []
for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
  for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) deck.push(t(s, v))
for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) deck.push(t(TileSuit.WIND, v))
for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) deck.push(t(TileSuit.DRAGON, v))
const shuffled = shuffleTiles(deck)

const testHand = shuffled.slice(0, 14)
console.log('Dealt hand (14):', testHand.map(t => `${t.suit[0]}${t.value}`).join(' '))
const norm = normalizeHand(testHand)
console.log('Normalized (no flowers):', norm.length, 'tiles')
const wildId = 'characters-5' // pretend 5万 is wild
const wc6 = canWin(norm, [], wildId)
console.log('canWin result:', wc6)
const validTypes = wc6.types.filter(t => t !== HandType.STANDARD)
console.log('canWinWithType would return:', validTypes.length > 0, '(valid types after filter:', validTypes.join(','), ')')

// Test 8: Simulate multiple games
console.log('\n=== 20 random hands test ===')
let winCount = 0
let canWinWithTypeCount = 0
for (let g = 0; g < 20; g++) {
  const d = shuffleTiles([...deck])
  const h = normalizeHand(d.slice(0, 14))
  const wid = `${d[14]?.suit}-${d[14]?.value}` || null
  const wc = canWin(h, [], wid)
  const vTypes = wc.types.filter(t => t !== HandType.STANDARD)
  if (wc.canWin) winCount++
  if (vTypes.length > 0) canWinWithTypeCount++
}
console.log(`20 random 14-tile hands:`)
console.log(`  canWin=true: ${winCount}/20`)
console.log(`  canWinWithType=true: ${canWinWithTypeCount}/20`)
