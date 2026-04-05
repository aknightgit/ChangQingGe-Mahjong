import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { canWin, buildWildTileChecker } from '../server/utils/handValidator'
import { TileSuit, type Tile } from '../server/types/game'

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}`, isFlower: false }
}
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

const deck = buildDeck()
const hand: Tile[] = []
let idx = 0
while (hand.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand.push(tile)
}

const wildId = 'dots-5'
const wtFn = buildWildTileChecker(wildId)
console.log(`WildTileChecker fn test: ${wtFn({ suit: TileSuit.DOTS, value: 5, id: 'test', isFlower: false })}`)

// Test 1: canWin(hand, 0, fn)  ← old sig with WildTileChecker fn
const r1 = canWin(hand, 0, wtFn)
console.log(`canWin(hand, 0, fn): canWin=${r1.canWin} types=${r1.types.join(',')}`)

// Test 2: canWin(hand, 0, 'dots-5')  ← old sig with string
const r2 = canWin(hand, 0, wildId)
console.log(`canWin(hand, 0, 'dots-5'): canWin=${r2.canWin} types=${r2.types.join(',')}`)

// Test 3: canWin(hand, [], 'dots-5')  ← new sig with Meld[] + string
const r3 = canWin(hand, [], wildId)
console.log(`canWin(hand, [], 'dots-5'): canWin=${r3.canWin} types=${r3.types.join(',')}`)

// Now time them
const N = 50
let t0 = performance.now()
for (let i = 0; i < N; i++) canWin(hand, 0, wtFn)
console.log(`\ncanWin(hand, 0, fn): ${(performance.now()-t0).toFixed(0)}ms / ${N} = ${(performance.now()-t0)/N}ms`)

t0 = performance.now()
for (let i = 0; i < N; i++) canWin(hand, 0, wildId)
console.log(`canWin(hand, 0, 'dots-5'): ${(performance.now()-t0).toFixed(0)}ms / ${N} = ${(performance.now()-t0)/N}ms`)

t0 = performance.now()
for (let i = 0; i < N; i++) canWin(hand, [], wildId)
console.log(`canWin(hand, [], 'dots-5'): ${(performance.now()-t0).toFixed(0)}ms / ${N} = ${(performance.now()-t0)/N}ms`)
