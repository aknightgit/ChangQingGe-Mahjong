// Direct test of canWin for a known-valid hand
import { canWin, isTing } from '../server/utils/handValidator.ts'
import { TileSuit } from '../server/types/game.ts'

function make(suit, val) {
  return { suit, value: val, id: `${suit}-${val}`, isFlower: false }
}

// VALID 14-tile hand: 3万顺(9) + 竹1,1,2,3,4(5) = 14
// 组牌: 万123+456+789=3顺; 竹pair(1,1)+seq(2,3,4)=5 → 4melds+1pair=14 ✓
const hand = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]

console.log('=== canWin for VALID 14-tile hand (3万顺+竹pair+seq) ===')
console.log('Tile count:', hand.length)
const r = canWin(hand, 0, null)
console.log('canWin:', r)
console.log('Expected: canWin=true')

console.log('\n=== isTing for 13-tile version (remove one) ===')
// Remove one tile to get 13 tiles
const after = hand.slice(0, 13) // remove last tile (BAMBOOS-4)
console.log('After removing last tile, count:', after.length)
const it = isTing(after, 0, null)
console.log('isTing:', it)
console.log('Expected: true (any tile gives canWin)')

// Try removing each tile and check canWin
console.log('\n=== canWin for each 13-tile variant ===')
for (let i = 0; i < hand.length; i++) {
  const variant = hand.filter((_,j) => j !== i)
  if (variant.length === 13) {
    const cw = canWin(variant, 0, null)
    console.log(`Remove index ${i} (${hand[i].id}): canWin=${cw.canWin}`)
  }
}

// Test 2: A simpler hand - all triplets
console.log('\n=== Test2: All triplets hand (4 triplets + pair = 14) ===')
const hand2 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1),
  make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,2),
  make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,3),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.DOTS,1),make(TileSuit.DOTS,1),
]
console.log('Tile count:', hand2.length)
console.log('canWin:', canWin(hand2, 0, null))

// Test 3: What about the hand from the actual game output?
// From DEBUG: hand=14 wild=wan-7, shanten=3
// This means: hand has 14 tiles, wild=wan-7, shanten=3
// shanten=3 means: (tiles-2)/3 = 4 melds needed, currently 0 melds → shanten = 4-0 = 4? No
// shanten=3 means: needs 3 more tiles to get to winning
// With 14 tiles and 0 melds: shanten = (14-2)/3 = 4 → but returns 3
// This confirms the calcTenpaiDistance bug for 14-tile hands
console.log('\n=== Actual game hand analysis ===')
console.log('DEBUG showed: hand=14, wild=wan-7, shanten=3')
console.log('Expected shanten for 14-tile 0-meld hand: (14-2)/3 = 4')
console.log('But game shows shanten=3 → means it thinks 1 meld is already formed!')
console.log('This confirms: canWin returns false for a 14-tile hand that has 0 melds')
console.log('The hand might have wild tiles allowing partial meld formation')
