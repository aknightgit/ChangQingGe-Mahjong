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
const wt = buildWildTileChecker(wildId)
const wildTile = hand.find(t => t.suit === TileSuit.DOTS && t.value === 5)
console.log(`Hand: ${hand.length} tiles, wild tile: ${wildTile ? 'found' : 'not found'}`)

// Test 1: canWin with WildTileChecker function
const t0 = performance.now()
const N = 100
for (let i = 0; i < N; i++) {
  canWin(hand, 0, wt)
}
console.log(`canWin (WildTileChecker fn): ${(performance.now()-t0).toFixed(0)}ms / ${N} = ${(performance.now()-t0)/N.toFixed(3)}ms/call`)

// Test 2: canWin with wildId string
const t1 = performance.now()
for (let i = 0; i < N; i++) {
  canWin(hand, 0, wildId)
}
console.log(`canWin (wildId string): ${(performance.now()-t1).toFixed(0)}ms / ${N} = ${(performance.now()-t1)/N.toFixed(3)}ms/call`)

// Test 3: canWin with null (no wild)
const t2 = performance.now()
for (let i = 0; i < N; i++) {
  canWin(hand, 0, null)
}
console.log(`canWin (null): ${(performance.now()-t2).toFixed(0)}ms / ${N} = ${(performance.now()-t2)/N.toFixed(3)}ms/call`)
