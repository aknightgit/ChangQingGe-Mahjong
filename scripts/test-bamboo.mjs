// Targeted test: bamboo cnt=2 case
import { canWin } from '../server/utils/handValidator.ts'
import { TileSuit } from '../server/types/game.ts'

function make(suit, val) { return { suit, value: val, id: `${suit}-${val}`, isFlower: false } }

// 直接测试竹子 {B1:2, B2:1, B3:1, B4:1} 的4+1手牌
// C1-9(each 1x, 9tiles) + B1:2,B2:1,B3:1,B4:1(5tiles) = 14tiles
const hand = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]
console.log('No wild test:')
console.log('canWin(null):', canWin(hand, 0, null))
console.log('Expected: true')

// Now test with wild=wan-7
console.log('\nWith wild=wan-7:')
console.log('canWin(wan-7):', canWin(hand, 0, 'wan-7'))
console.log('Expected: true')

// Also test with wild=wan-1 (different wild)
console.log('\nWith wild=wan-1:')
console.log('canWin(wan-1):', canWin(hand, 0, 'wan-1'))

// Test the simpler case: {B1:2, B2:1, B3:1} only (should form pair+seq=3tiles)
// With 11 other tiles = 14 total
const hand2 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1), // pair
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3), // seq (needs wild or B4 for 3 tiles)
]
console.log('\nHand2 (11 chars + B1,1,B2,B3 = 14):')
console.log('canWin(null):', canWin(hand2, 0, null))
// B1,1 pair + seq B2,B3,? missing B4 → needs wild for B4 → but wild is CHARACTERS not BAMBOOS
// So canWin(null) = false! Need wild BAMBOOS for this hand

// What if we have wild=bamboo-4?
console.log('\nHand2 with wild=bamboo-4:')
// B1:2, B2:1, B3:1, B4(wild):1
const hand3 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]
// With wild=bamboo-4, the naturals are C1-9 + B1:2,B2:1,B3:1 (12 tiles)
// wildCount=1 (B4 is wild)
// Virtual hand options: wild assigned to... B4 (natural) = B1:2,B2:1,B3:1,B4(virtual)
// Or wild assigned to some CHARACTERS tile...
// Best: wild=B4 → pair(B1,B1) + seq(B2,B3,B4) = 4melds ✓
// But wait, wildCount=1 means we have 1 copy of B4 that IS wild
// So we have: C1-9(9), B1:2, B2:1, B3:1, B4(wild):1 = 13 naturals + 1 wild = 14
// After assign wild→B4: pair(B1,B1)=melds[0], seq(B2,B3,B4)=melds[1]
// Remaining: C1-9 = 3seqs = melds[2,3,4] ✓ → 5melds = 15tiles... no wait
// C1-9 = 9tiles → 3seqs
// B1:2,B2:1,B3:1,B4(wild):1 = pair(B1,B1)+seq(B2,B3,B4) = 5tiles → 2melds
// Total = 5melds → 5×3+2=17... not 14
// Oh! With wild=bamboo-4, we have 14 tiles total. But how to form?
// C123,456,789 = 3seqs = 9tiles
// B1,1,2,3,4(wild) = pair(B1,B1)+seq(B2,B3,B4) = 5tiles
// Total 14tiles, 4melds, 1pair... but we have 3seqs+2melds = 5melds ≠ 4
// OR: B1,1 + seq(2,3,4) = 2melds, and one CHARACTERS seq uses wild
// Actually: C123,C456,C7(wild),C8,C9 = 3seqs
// But wild=B4 not C7... so this doesn't work
console.log('canWin(bamboo-4):', canWin(hand3, 0, 'bamboo-4'))
