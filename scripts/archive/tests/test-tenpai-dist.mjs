// Debug: find a hand that canWin=true
import { canWin, isTing } from './server/utils/handValidator.ts'
import { TileSuit } from './server/types/game.ts'

function make(id, suit, val) { return { id, suit, value: val } }

// 万1-9全1 + 竹1-3各1 + 竹1,1 = 14张
// 竹: 1,1,1,2,3,4 = cnt(1)=4 → 可以刻子
// 万: 1-9各1 → cnt(1)=1 each
const hand1 = [
  make('c1','CHARACTERS',1),make('c2','CHARACTERS',2),make('c3','CHARACTERS',3),
  make('c4','CHARACTERS',4),make('c5','CHARACTERS',5),make('c6','CHARACTERS',6),
  make('c7','CHARACTERS',7),make('c8','CHARACTERS',8),make('c9','CHARACTERS',9),
  make('b1','BAMBOOS',1),make('b2','BAMBOOS',2),make('b3','BAMBOOS',3),
  make('b4','BAMBOOS',1),make('b5','BAMBOOS',1),
]
// 竹cnt(1)=4, cnt(2)=1, cnt(3)=1
// 万cnt(1-9)=1 each
// 组1: BAMBOOS刻子(1,1,1) cnt4→1triplet, remaining BAMBOOS: 1,2,3 → sequence(1,2,3), remaining: 0 BAMBOOS
// 组2: 万123 → remaining 万4-9
// 组3: 万456 → remaining 万7-9
// 组4: 万789 → remaining 万0? → 4 sequences but 3 tiles left (万7,8,9) = 1 sequence → total 4 sequences ✓
// 4 sequences = 12 tiles, need 2 more for pair... but BAMBOOS刻子 used 1+1+1=3tiles from cnt4, remaining BAMBOOS: 1tile
// 万7,8,9=3tiles: need 3 sequences? No → 4 melds = 3×4=12tiles

// Let me recount: 万1-9=9, 竹1,1,1,2,3,4=6 → total 15... too many
// Remove b4,b5: 万1-9=9, 竹1,1,2,3=5 → total 14 ✓
// BAMBOOS: 1,1,2,3,4 = cnt(1)=2, cnt(2)=1, cnt(3)=1, cnt(4)=1
// Pair(1,1) + sequence(2,3,4) = 2+3=5 tiles → 5tiles for 1pair+1sequence = 2 melds
// Remaining: 万1-9 = 9 tiles → 3 sequences ✓
// Total: 2+3=5 melds = 5×3=15... no wait: pair=2tiles, 4sequences=12tiles → total=14 ✓

const hand2 = [
  make('c1','CHARACTERS',1),make('c2','CHARACTERS',2),make('c3','CHARACTERS',3),
  make('c4','CHARACTERS',4),make('c5','CHARACTERS',5),make('c6','CHARACTERS',6),
  make('c7','CHARACTERS',7),make('c8','CHARACTERS',8),make('c9','CHARACTERS',9),
  make('b1','BAMBOOS',1),make('b2','BAMBOOS',1), // pair 1,1
  make('b3','BAMBOOS',2),make('b4','BAMBOOS',3),make('b5','BAMBOOS',4), // sequence 2,3,4
]
console.log('hand2 size:', hand2.length, '(expect 14)')
console.log('canWin:', canWin(hand2, 0, null))
// 组1: BAMBOOS pair(1,1) - cnt(1)=2 → pair found
// After pair: BAMBOOS: cnt(2)=1, cnt(3)=1, cnt(4)=1
// 组2: sequence 2,3,4 - cnt(2)=1, cnt(3)=1, cnt(4)=1 → sequence found
// Remaining: 万1-9 = 9 tiles, 9=3×3 → 3 sequences found
// Total: 4 melds ✓

// Now test with 3n+2 structure that has cnt=3 in one suit (the bug case)
console.log('\n=== 测试: cnt=3 suit with no wild (the bug trigger) ===')
// 万1-9 = 9 tiles (cnt=1 each)
// 竹1,1,1,2,3 = 5 tiles → cnt(1)=3, cnt(2)=1, cnt(3)=1
// 组1: 竹 triplet(1,1,1) = 1 triplet → cnt(1)→0
// 组2: 竹 sequence(1,2,3) = but cnt(1)=0 after triplet... 
// OR: 竹 sequence(1,2,3) first: uses 1,2,3 → remaining 竹1,1 → pair(1,1)
// Both ways work! But greedy algorithm fails!
const hand3 = [
  make('c1','CHARACTERS',1),make('c2','CHARACTERS',2),make('c3','CHARACTERS',3),
  make('c4','CHARACTERS',4),make('c5','CHARACTERS',5),make('c6','CHARACTERS',6),
  make('c7','CHARACTERS',7),make('c8','CHARACTERS',8),make('c9','CHARACTERS',9),
  make('b1','BAMBOOS',1),make('b2','BAMBOOS',1),make('b3','BAMBOOS',1), // triplet
  make('b4','BAMBOOS',2),make('b5','BAMBOOS',3), // sequence (2,3,4) missing 4
]
// DOTS missing! Add DOTS for pair
const hand4 = [
  make('c1','CHARACTERS',1),make('c2','CHARACTERS',2),make('c3','CHARACTERS',3),
  make('c4','CHARACTERS',4),make('c5','CHARACTERS',5),make('c6','CHARACTERS',6),
  make('c7','CHARACTERS',7),make('c8','CHARACTERS',8),make('c9','CHARACTERS',9),
  make('b1','BAMBOOS',1),make('b2','BAMBOOS',1),make('b3','BAMBOOS',1), // triplet
  make('b4','BAMBOOS',2),make('b5','BAMBOOS',3),
  make('d1','DOTS',1),make('d2','DOTS',1), // pair
]
console.log('hand4 size:', hand4.length, '(expect 14)')
console.log('canWin:', canWin(hand4, 0, null))

console.log('\n=== 验证hand4结构 ===')
// 万9tiles → 3 sequences ✓
// 竹: triplet(1,1,1) + sequence(2,3,4 missing 4) → with cnt(1)=3 after triplet: 0,1,1 → sequence needs 2 from cnt<2
// Actually: 竹triplet(1,1,1) uses 3×1 → cnt(1)=0, cnt(2)=1, cnt(3)=1 → no valid sequence
// 竹sequence(1,2,3): uses 1,2,3 → cnt(1)=2, cnt(2)=0, cnt(3)=0 → remaining 1 → cnt(1)=2 → second triplet ✓
// So sequence FIRST → 2 triplets ✓
// But greedy algorithm tries triplet first → fails

console.log('\n=== 直接看canFormMelds内部: hand4 ===')
// hand4 = 3万sequences + 竹triplet(1,1,1) + 竹sequence(1,2,3) + DOTSpair(1,1)
// countMap: C-1..9=1, B-1=3, B-2=1, B-3=1, D-1=2
// Pair candidates: D-1(cnt=2), B-1(cnt=3)
// If pair=D-1: BAMBOOS: triplet(1,1,1) → cnt(1)=0, cnt(2)=1, cnt(3)=1 → 2 sequences possible
// 3 sequences from 万: 万123,456,789 ✓
// Total: 1pair(D-1) + 4sequences = 5 melds? No, 4 melds needed
// 4 melds: pair(D-1) + 3sequences(万) = 2+9=11tiles, remaining 3tiles(竹1,2,3) → sequence ✓
// OR: pair(B-1) + 4sequences(万) + sequence(竹2,3,4 missing 4) = 2+9+2=13... no
