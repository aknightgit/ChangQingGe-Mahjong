/**
 * Quick benchmark: measure time per game in train-ai-ak.ts
 */
import {
  shuffleTiles, isFlower, groupTiles
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker, isTing
} from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile, type Meld } from '../server/types/game'

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random()}`, isFlower: false }
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

// Benchmark canWin
const deck = buildDeck()
const nonFlower = deck.filter(t => !isFlower(t))
const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
const wildId = `${w.suit}-${w.value}`
const wt = buildWildTileChecker(wildId)

// Simulate a typical 14-tile hand
const hand14: Tile[] = []
let idx = 0
while (hand14.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand14.push(tile)
}

const start = performance.now()
const N = 5000
for (let i = 0; i < N; i++) {
  canWin(hand14, 0, wt)
}
const elapsed = performance.now() - start
console.log(`canWin (14 tiles, 0 melds): ${(elapsed/N).toFixed(3)}ms per call, ${N} calls in ${elapsed.toFixed(0)}ms`)

// Benchmark isTing (13 tiles)
const hand13 = hand14.slice(0, 13)
const start2 = performance.now()
const N2 = 500
for (let i = 0; i < N2; i++) {
  isTing(hand13, 0, wt)
}
const elapsed2 = performance.now() - start2
console.log(`isTing (13 tiles, 0 melds): ${(elapsed2/N2).toFixed(3)}ms per call, ${N2} calls in ${elapsed2.toFixed(0)}ms`)

// Benchmark canWin with melds (11 tiles, 1 meld)
const hand11 = hand14.slice(0, 11)
const start3 = performance.now()
const N3 = 5000
for (let i = 0; i < N3; i++) {
  canWin(hand11, 1, wt)
}
const elapsed3 = performance.now() - start3
console.log(`canWin (11 tiles, 1 meld): ${(elapsed3/N3).toFixed(3)}ms per call, ${N3} calls in ${elapsed3.toFixed(0)}ms`)

// Benchmark isTing with melds
const start4 = performance.now()
const N4 = 500
for (let i = 0; i < N4; i++) {
  isTing(hand11, 1, wt)
}
const elapsed4 = performance.now() - start4
console.log(`isTing (11 tiles, 1 meld): ${(elapsed4/N4).toFixed(3)}ms per call, ${N4} calls in ${elapsed4.toFixed(0)}ms`)

// Estimate: typical game has ~60 turns, each turn: 1 canWin + 1 isTing + 3 opponent canWin checks
const perTurnCanWin = elapsed / N
const perTurnIsTing = elapsed2 / N2
const perTurnOppChecks = 3 * (elapsed / N)
const perTurnTotal = perTurnCanWin + perTurnIsTing + perTurnOppChecks
console.log(`\nEstimated per-turn cost: ${perTurnTotal.toFixed(3)}ms`)
console.log(`Estimated per-game cost (~60 turns): ${(perTurnTotal * 60).toFixed(0)}ms`)
console.log(`Estimated 1000 games: ${(perTurnTotal * 60 * 1000 / 1000).toFixed(0)}s`)
