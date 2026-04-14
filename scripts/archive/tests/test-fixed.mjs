// Verify the cnt=2 fix works for genuinely winning hands
import { canWin } from '../server/utils/handValidator.ts'
import { TileSuit } from '../server/types/game.ts'

function make(suit, val) { return { suit, value: val, id: `${suit}-${val}`, isFlower: false } }

// Test 1: No-wild winning hand (baseline)
const hand1 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]
console.log('Test1 (no wild):', canWin(hand1, 0, null).canWin, '(expect true)')

// Test 2: Winning hand with wild that fills a REAL GAP
// C1-6,C8-9 (8 naturals, missing C7) + wild wan-7 = 9 C tiles (complete)
// B1:2,B2:1,B3:1,B4:1 (5 naturals, no wild in B)
// C: 3seqs ✓, B: pair(B1,B1)+seq(B2,B3,?needs wild!) → but wild is C7 not B4!
// B: B1:2,B2:1,B3:1,B4:1 → cnt(1)=2, can form pair(B1,B1)+seq(B2,B3,B4) naturally
// Total: 3seqs(C) + 2melds(B) = 5melds > 4 → INVALID
// Hmm still invalid!

// Test 3: Let's make B need wild too (B1:2,B2:1,B3:1 only = 4tiles, missing B4)
// C1-6,C8-9(8) + B1:2,B2:1,B3:1(4) = 12 nats + wild(wan-7) = 13 nats + 1 wild... no wait
// wild='wan-7' means only C7 is wild. B tiles are all natural.
// For B: B1:2,B2:1,B3:1(4tiles) → need seq(B1,B2,B3) + pair(B1,B1) → 5tiles needed, have 4
// B needs 1 wild for seq(B1,B2,B3) → wild is C7 not usable → B can't complete
// So hand3 invalid too

// Test 4: C missing 1 (C7), B has 4 nats + 1 wild in B → wild helps B
// To have wild in B, wild must be wan-7... so wild is always C7
// This means B tiles are ALL natural (no wild in B)!
//
// REAL winning hand with wild='wan-7':
// C: C1-6,C8-9 (8 tiles, missing C7) → wild fills C7 gap → 3seqs ✓
// B: B1:2,B2:1,B3:1,B4:1 (5 tiles) → pair(B1,B1)+seq(B2,B3,B4) naturally ✓
// Total melds = 3(Cseqs) + 2(Bmelds) = 5melds > 4... still too many!
//
// To get exactly 4 melds: C needs 3seqs(9tiles) + B needs 1pair+1seq(5tiles) = 5melds
// OR: C needs 3seqs(9tiles) + B needs 2seqs(6tiles) but only have 5 B tiles
// 9+5=14=4melds+1pair ✓ BUT 5 B tiles = pair+2seq = 3melds, not 2!
// B1:2,B2:1,B3:1,B4:1,B5(wild? but wild is wan-7 not tiao-5)... can't add wild to B
//
// Conclusion: with wild='wan-7', the hand {C1-9 + B1:2,B2:1,B3:1,B4:1} 
// can form 5melds but not 4melds. Not a valid winning hand for this wild.
// The algorithm is CORRECT to return false!

// Let's find a hand that IS winning with wild='wan-7':
// Need: C(3seqs=9) + B(pair+seq=5) = 4melds+1pair but B needs pair+seq=5tiles
// With wild='wan-7': C1-6,C8-9 = 8nats + wildC7 = 1tile → 9 C tiles for 3seqs ✓
// B: B1:2,B2:1,B3:1,B4:1(5nats) → can pair+seq without wild ✓
// Total: 5melds... still too many!
//
// Wait: the formula is 3n+2 = 14 → n=4. 4 melds = 12tiles, 1pair = 2tiles. 12+2=14 ✓
// 4melds means: 4 groups of 3tiles
// With C: 3seqs = 3melds (9tiles), B: 2melds = 6tiles, total 15tiles > 14 ✗
// OR: C: 2seqs(6) + C: 1pair(2) + B: 2seqs(6) = 5melds... or C: 2seqs(6) + B: 2melds(6) + 2pairs?? no
// Actually 4melds+1pair = 4×3+2 = 14 ✓
// C: need to contribute some of these melds
// If C forms 3seqs(9): 3melds, B needs 1more meld(3) + pair(2) = 5 B tiles → B1:2,B2:1,B3:1,B4:1 = 5 ✓
// But this is 3(Cseqs) + 1(Btriplet?) + 1(Bpair) = 5melds... no
// Cseq(1,2,3) = meld1, Cseq(4,5,6) = meld2, Cseq(7,8,9) = meld3, Bpair = meld4, Bseq(?,?,?)... need 3 B tiles for Bseq
// B1:2,B2:1,B3:1,B4:1 = 5 tiles. pair(B1,B1)=2, seq(B2,B3,B4)=3 → 5tiles = 2melds. C=3melds. Total=5melds.
// For 4melds: C=3melds(9tiles), B=1meld(3tiles), pair=2tiles → B needs 5tiles = 1meld+1pair
// B1:2,B2:1,B3:1,B4:1 = pair(B1,B1)(2) + seq(B2,B3,?)missing1... wild? No wild in B!
// B1:2,B2:1,B3:1 = pair(B1,B1)(2) + seq(B1,B2,B3)missing1... no
// So with wild='wan-7', B tiles have NO wild, so B needs 5natural tiles for pair+seq.
// B1:2,B2:1,B3:1,B4:1 = 5nats → pair(B1,B1)+seq(B2,B3,B4) = 2melds! That's 2 melds from B.
// C: 3seqs = 3melds. Total = 5melds = 15tiles > 14 ✗
//
// Conclusion: For wild='wan-7', the hand {C1-9 + B1:2,B2:1,B3:1,B4:1} is NOT a winning hand.
// Because C forms 3melds(9tiles) + B forms 2melds(5tiles) = 5melds = 15tiles > 14.
// The algorithm is CORRECT!

// What hand IS winning with wild='wan-7'?
// Need: total 4melds from 14tiles. C=some, B=some, total=4.
// C naturally has 9tiles: can form 3seqs=3melds. Then B needs 1meld(3)+pair(2)=5tiles.
// With wild='wan-7', wild tiles are C7 only. B has NO wild.
// B1:2,B2:1,B3:1,B4:1(5nats) → pair(B1,B1)+seq(B2,B3,B4)=2melds. Total=5melds>4 ✗
// Reduce C by 1 tile (use wild for it): C1-6,C8-9(8)+wildC7(1)=9tiles for C.
// C needs 3seqs but only 9tiles (all used for 3seqs) → no tile for pair → 3melds from C.
// Then B needs 1meld(3)+pair(2)=5tiles, but we only have 14-9=5tiles for B.
// B1:2,B2:1,B3:1,B4:1 = 5tiles → pair+seq = 2melds. Total=5melds>4 ✗
//
// Reduce C by 2 tiles: C1-6,C8-9 -1tile(8) + wildC7(1) = 8tiles for C.
// C: 8tiles → 2seqs=6 + pair=2 → 3melds. wild fills gap in sequence.
// B: 14-9=5tiles → pair+seq=2melds. Total=5melds>4 ✗
//
// Reduce C by 3 tiles: C1-6,C8-9-2tiles(7)+wildC7(1)=8tiles for C.
// C: 8tiles → 2seqs(6)+pair(2) or wild+2seqs... still 3melds. Total=5melds>4 ✗
//
// Reduce C by 4 tiles: C1-6,C8-9-3tiles(6)+wildC7(1)=7tiles for C.
// C: 7tiles → 2seqs(6)+pair(1)=but pair needs 2! or seqs+wild... still 3melds. Total=5melds>4 ✗
//
// Hmm. It seems impossible to get 4melds with wild='wan-7' from C1-9 + B1:2,B2:1,B3:1,B4:1!
// Because C always needs 3melds(minimum, with wild filling gaps), and B always needs 2melds(pair+seq).
// 3+2=5melds > 4!

// Let me try a DIFFERENT C structure: C has fewer than 9 tiles
// C: C1-6(6nats) + wildC7(1) = 7tiles → 2seqs(6)+pair(2)... no pair(2) needs 2, have 1tile left
// C: C1-6(6) + wildC7(1) = 7tiles → 2seqs(6)+1tile... 2melds, not 3!
// Total: 2(Cmelds) + 2(Bmelds) = 4melds ✓ → 2×3+2=8... no, 4melds+1pair=4×3+2=14 ✓
// C: 2seqs(6)+pair(need2)... but only 1 C7 left after using for seq
// Wait: C1-6(6) + wildC7(1) = 7tiles. If C7 is wild, it can complete seq C1,2,3 with C1,C2,C4,C5,C6 available...
// C1:1,C2:1,C3:0(used),C4:1,C5:1,C6:1,C7(wild):1
// C naturally complete: seq(C1,C2,?)=need1wild, seq(C4,C5,C6)=OK, pair(C?,?)
// It's getting complicated. Let me just find ONE working hand.
//
// Working hand: C1-9(9nats, no wild) + wild='wan-7' means wild=C7(1copy)
// C1-9 = 3seqs(9), B1:2,B2:1,B3:1,B4:1 = pair+seq(5) → 5melds(15) >4 ✗
//
// Remove 1 B tile: B1:2,B2:1,B3:1(4tiles) → pair+seq(4)... no pair+seq needs 5!
// B1:2,B2:1,B3:1(4tiles) → seq(B1,B2,B3) with B1:1,B2:0,B3:0 → triplet needs 3, not possible
// OR: pair(B1,B1) + seq(?,?,?)... B2,B3 only 2tiles, need 1 more wild (but wild is C7!)
// So B needs wild but wild is C → can't help B!
//
// Working hand with wild='wan-7': C must have <9 tiles so B can use the wild
// But wild='wan-7' means wild is C, not B! So wild can't help B.
// Therefore: For wild='wan-7', B must NOT need wild. 
// B without wild: need 5natural tiles for pair+seq. But we only have 14-9=5 for B if C has 9.
// With C having 9tiles, B has 5. B1:2,B2:1,B3:1,B4:1 = 5 → pair+seq = 2melds. C = 3melds. Total=5melds ✗
// With C having 8tiles (use wild for 1): C7nats, wildC7 → 8+1=9tiles. B=5tiles. Same issue.
// With C having 7tiles (use wild for 2): C7nats, wildC7(1), wildC7(1?)... no, only 1 wild!
// With C having 8tiles but different structure: C1:2,C2:1,C3:1,C4:1,C5:1,C6:1,C7(wild):1,C8:1 = 8+1=9
// C1:2 is pair, rest can form sequences...
// This is getting too complex. Let me just find a working example empirically.

console.log('\nSearching for a valid winning hand with wild=wan-7...')
// Try: C1:2,C2:1,C3:1,C4:1,C5:1,C6:1,C7(wild):1,C8:1,C9:1 = C1pair+5seqs? 
// C1pair(2), C2,3,4,5,6,7,8,9 = seqs(2,3,4), (4,5,6), (7,8,9) = 3seqs. Total C=4melds.
// B needs... but we only have 14-10=4 tiles for B. 4tiles can't form 2melds(pair+seq=5needed).
// So B would need wild but wild is C.
// This hand not winnable with wild='wan-7'.

// Actually the REAL question: is there ANY hand that IS winnable with wild='wan-7'?
// Answer: Yes! When C naturally forms 3seqs AND B has pair+seq naturally (5nats).
// But that gives 5melds > 4!
// Unless... C doesn't need all 9 tiles for 3seqs.
// With wild='wan-7': if C has 8nats + wildC7 = 9tiles for C.
// C8nats: to form 3seqs(9tiles) → all 8nats must be perfectly placed.
// C7 is wild, so C has: some combination of C1-6,C8,C9 totaling 8tiles.
// For C to form 3seqs with 8nats + 1wild: the 8nats must be 8 of the 9 values.
// And the 1 missing value must be fillable by wild.
// Example: C1-6,C8,C9 (8nats) → wild fills C7 → C1-9 → 3seqs ✓
// C7 is wild (1tile). B: B1:2,B2:1,B3:1,B4:1 = 5nats → pair+seq = 2melds. Total=5melds>4 ✗
//
// With C having 7nats + 1wild: C has 8tiles.
// C: 7nats + 1wildC7 → form 2seqs(6) + 1pair(2) = 3melds ✓
// B: 14-8=6tiles → pair(2)+2seqs(6)=3melds. Total=6melds>4 ✗
//
// With C having 6nats + 1wild: C has 7tiles.
// C: 6nats + 1wild → 2seqs(6) = 2melds. Pair needs 2same... wild can't be pair alone.
// C: 2seqs(6)+1pair(?)=3melds, wild fills gap in one seq.
// B: 14-7=7tiles → pair(2)+2seqs(6)... 8tiles needed >7. Not possible.
//
// So for wild='wan-7', the MINIMUM C contribution is 3melds (when C has 9tiles).
// And B minimum is 2melds (pair+seq with 5nats).
// 3+2=5melds > 4! 
// Therefore: NO winning hand exists with wild='wan-7' and tile distribution C1-9 + B1:2,B2:1,B3:1,B4:1!
// 
// This means: when wild='wan-7', most hands will have 5melds total, NOT 4melds.
// For 4melds to be possible, either C must contribute <3melds or B must contribute <2melds.
// B contributing <2melds means: B has only 3-4 tiles → pair+seq not possible with natural tiles.
// If B has 4nats: seq(3)+pair(2)... no 4<5. Needs wild! But wild is C7.
// So B can't form pair+seq without wild in B suit.
// OR: B has 3nats: triplet(3) = 1meld. Then C must contribute 3melds. Total=4 ✓
// B triplet naturally: B1:3,B2:1,B3:1,B4:1 = 6tiles → triplet(B1,B1,B1)=1meld. Remaining B2,B3,B4(3)=seq=1meld. 2melds from B. Still >4.
//
// B triplet with wild: B1:2,B2:1,B3:1(4tiles) → triplet needs 1wild(but wild is C7!) → can't.
// 
// CONCLUSION: With wild='wan-7', the hand {C1-9 + B1:2,B2:1,B3:1,B4:1} can NOT win.
// The algorithm correctly returns false. The AI's 84-turn stall is NOT because of canWin bug!

// BUT: the AI SHOULD eventually get dealt a WINNING hand. 
// With 4 players × 13tiles = 52tiles drawn initially, plus 84×4=336 more draws...
// Total 388 draws from 144tile wall... the wall runs out and draw is called.
// Before running out, the AI should sometimes draw into a winning hand.
// Unless: canWin is ALSO broken for OTHER hands!

console.log('\n=== Testing canWin for hands KNOWN to be winning (no wild) ===')
console.log('All triplets hand (4triplets+pair):', canWin(hand1, 0, null).canWin, '(expect true)')

// Test with a winning hand that has cnt=2 in the greedy-pathological configuration
const hand_cnt2 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1), // triplet
  make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,2), // triplet
  make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,3), // triplet
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,4), // triplet
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1), // pair
]
console.log('4triplets+pair:', canWin(hand_cnt2, 0, null).canWin, '(expect true)')

// Test the case where greedy without cnt=2 fix would fail:
// {B1:2, B2:1, B3:1, B4:1} + chars forming 3seqs
// The B part: with cnt=2 greedy TRIES triplet first (consumes 1 wild) → remaining can't form seq
// With cnt=2 fix (pair+seq for cnt=2 with both neighbors): pair(B1,B1) → seq(B2,B3,B4) = 2melds ✓
console.log('\n=== B cnt=2 greedy fix test ===')
const chars3seq = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),
  make(TileSuit.CHARACTERS,4),make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),
  make(TileSuit.CHARACTERS,7),make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),make(TileSuit.BAMBOOS,4),
]
console.log('chars3seq+bamboo-cnt2: canWin=', canWin(chars3seq, 0, null).canWin, '(expect true)')
// C: 3seqs=3melds, B: cnt2(B1) → old greedy would try triplet(B1,B1,B1) first, fail, then seq(B1,B2,B3)
// With fix: pair(B1,B1) + seq(B2,B3,B4) = 2melds ✓ → total 5melds... still >4!
// Hmm still not working. The issue is the hand structure gives 5melds total.

// Let me try a hand that gives exactly 4melds:
// C: 3seqs=9tiles, B: pair=2tiles, total=11tiles, need 1more meld(3tiles)... no 9+2=11<14
// C: 2seqs(6)+pair(2)=3melds, B: seq(3)=1meld, total=4melds ✓, 6+2+3=11tiles, need 3more...
// Hmm getting complex.

console.log('\n=== Direct tryFormMelds simulation (no export, use detectTypes) ===')
// Can we find a hand where the cnt=2 fix MATTERS?
// The fix helps when: cnt=2 with both neighbors exists, greedy fails, but pair+seq succeeds.
// Hand: {C1:2, C2:1, C3:1, C4:1, C5:1, C6:1, C7:1, C8:1, C9:1} + Bpair = 14tiles
// C: C1:2, C2-9:1 (9tiles) → cnt2=C1 with neighbors C2,C3
// Old greedy: C1 cnt=2, try triplet → need 1wild → skip; try seq(C1,C2,C3) → C1:0,C2:0,C3:0; n=3
//   C4: seq(C4,C5,C6) → C4:0,C5:0,C6:0; n=2
//   C7: seq(C7,C8,C9) → C7:0,C8:0,C9:0; n=1
//   No tiles left but n=1 → FAIL
// New fix: C1 cnt=2, try pair+seq → C1:1,C2:0,C3:0; n=3
//   C1: seq(C1,C2,C3) → C1:0,C2:0,C3:0; n=2
//   C4: seq(C4,C5,C6) → C4:0,C5:0,C6:0; n=1
//   C7: seq(C7,C8,C9) → C7:0,C8:0,C9:0; n=0 ✓ SUCCESS!
const hand_fix_test = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1), // cnt=2 of C1
  make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,4),
  make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),make(TileSuit.CHARACTERS,7),
  make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1), // pair
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3), // need 1 more for seq... but only 13 tiles!
// Add 1 more tile
  make(TileSuit.BAMBOOS,4),
]
// C: C1:2,C2-9:1 (9tiles) → 3seqs with cnt2pair+seq fix
// B: B1:2,B2:1,B3:1,B4:1 (5tiles) → pair+seq
// Total: 3+2=5melds... hmm
// For 4melds: C needs 3seqs(9), B needs pair+1seq(5)=6tiles → 9+6=15>14
// Let me remove 1 B
const hand_fix_test2 = [
  make(TileSuit.CHARACTERS,1),make(TileSuit.CHARACTERS,1), // cnt=2
  make(TileSuit.CHARACTERS,2),make(TileSuit.CHARACTERS,3),make(TileSuit.CHARACTERS,4),
  make(TileSuit.CHARACTERS,5),make(TileSuit.CHARACTERS,6),make(TileSuit.CHARACTERS,7),
  make(TileSuit.CHARACTERS,8),make(TileSuit.CHARACTERS,9),
  make(TileSuit.BAMBOOS,1),make(TileSuit.BAMBOOS,1),
  make(TileSuit.BAMBOOS,2),make(TileSuit.BAMBOOS,3),
]
// C: 9tiles=3seqs, B: 4tiles=pair(B1,B1)+seq(B2,B3,?)missingB4... no wild
// Total: 3seqs+1pair+1seq=5melds=15tiles... still >14
console.log('fix_test2 (14 tiles):', hand_fix_test2.length)
console.log('fix_test2 canWin:', canWin(hand_fix_test2, 0, null).canWin)
