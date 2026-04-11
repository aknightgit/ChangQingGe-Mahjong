// Trace canWin with wild tile scenarios
import { canWin, isTing } from '../server/utils/handValidator.ts'
import { TileSuit } from '../server/types/game.ts'

function make(suit, val) { return { suit, value: val, id: `${suit}-${val}`, isFlower: false } }

// Realistic 14-tile hand after drawing wild wan-7:
// 13 tiles before draw, draw wan-7 (wild), hand = 14 tiles
// Natural hand (without wan-7): C1-6(6), C8-9(2), B1-4(5) = 13 tiles
// After drawing wild wan-7: add one more C7 = 14 tiles
const hand_after_draw = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,7), // 2 wild 7s (both wild!)
  make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),
]
// This is WRONG - you can't have 2 wilds. The wild is a designated tile VALUE.
// If wild=wan-7, ALL C7 tiles are wild.
// Hand after draw: C1,2,3,4,5,6,7(wild),7(wild),8,9, B1,1,2,3 = 14 tiles
// But can you have TWO C7 in hand? Yes if the deck has multiple copies!
// Mahjong tiles: each tile has 4 copies. So C7 has 4 copies total.
// If wild=wan-7, all 4 copies of C7 are wild.
// After drawing one wild C7, hand has: natural C7 + wild C7 = 2 C7s total

console.log('=== After drawing wild wan-7: hand has C7(natural)+C7(wild) ===')
console.log('Total tiles:', hand_after_draw.length)
console.log('canWin(wild=wan-7):', canWin(hand_after_draw, 0, 'CHARACTERS-7'))

// But can this hand actually WIN?
// Structure: C123,456(2seq) + C7(nat)+C7(wild),8,9 = waiting for C7 (already have 2!)
// Wait: C7(nat)+C7(wild) = pair+wild, need one more for triplet
// But C7(wild) can complete the seq C7,C8,C9 with wild for C7
// Actually: pair(C7nat, C7wild) + seq(C8,C9,?)
// Hmm let me recount: C1,2,3,4,5,6,7(wild),8,9 = 9 tiles
// C7(wild) pairs with natural C7 = pair ✓ (2 tiles)
// C7(wild) also completes seq C7(wild),C8,C9 = triplet ✓ (3 tiles)  
// But pair uses C7(wild) and seq also uses C7(wild) → CONFLICT!
// You can't use the same wild tile twice!

console.log('\n=== With 1 natural C7 + 1 wild C7 ===')
const hand1wild = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7), // natural C7 (NOT wild - wait, if wild=wan-7 then C7 IS wild!)
  // Actually: if wild=wan-7, then C7 tile IS wild. There are 4 copies of C7 in deck.
// 2 of them are in hand (natural draw + our drawn wild). Both are wild!
  make(TileSuit.CHARACTERS,7), // wild
  make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),
]
// With 2 wild C7s: 
// Option A: pair(C7,C7) + seq(C8,C9,?) missing ? → need 1 more wild
// Option B: triplet(C7,C7,C7) needs 3 C7s → have 2 wild + 0 natural → missing 1
// Wait: natural C7 should count too! natural C7 + wild C7 = 2 tiles toward triplet
// So triplet(C7nat, C7wild, ?) → need 1 more tile → can use wild for that too? No!
// The wild tile is already used in the triplet!

// Actually let me recount the actual tiles in hand AFTER DRAW:
// Before draw: 13 tiles (no C7)
// Draw: C7 (this specific copy is wild because wild=wan-7)
// After draw: C7(wild) added to hand
// Hand: C1,2,3,4,5,6,8,9(eight natural) + C7(wild) + B1,1,2,3(5 naturals) = 14 tiles
// Natural tiles: C1,2,3,4,5,6,8,9, B1,1,2,3 (13 tiles)
// Wild tiles: C7 (1 tile)
// Total: 14 tiles
const real_hand = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9), // C7 NOT in hand yet
  make(TileSuit.CHARACTERS,7), // this IS the wild (drawn)
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]
// Wait, that's 14 tiles: C1-6(6) + C8-9(2) + C7wild(1) + B1,1,2,3,4(5) = 14 ✓
// Natural: C1,2,3,4,5,6,8,9, B1,1,2,3,4 (13 tiles)
// Wild: C7 (1 tile)
// Structure: C123(1seq), C456(1seq), B1234: pair(1,1)+seq(2,3,4)(2melds), C7,8,9(1seq) = 4melds ✓
// Wild C7 can complete C7,C8,C9 sequence!
console.log('\n=== Realistic 14-tile hand after wild draw ===')
console.log('Natural:', real_hand.filter(t=>t.suit!==TileSuit.CHARACTERS||t.value!==7).length)
console.log('Wild:', real_hand.filter(t=>t.suit===TileSuit.CHARACTERS&&t.value===7).length)
console.log('Total:', real_hand.length)
console.log('canWin(wild=wan-7):', canWin(real_hand, 0, 'CHARACTERS-7'))
