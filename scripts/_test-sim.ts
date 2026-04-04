import { canWin, buildWildTileChecker } from '../server/utils/handValidator'
import { TileSuit } from '../server/types/game'
import type { Tile } from '../server/types/game'
import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { randomUUID } from 'crypto'

function mkTile(s: TileSuit, v: number): Tile {
  return { suit: s, value: v, id: `${s}-${v}-${randomUUID()}`, isFlower: false }
}

const wt = buildWildTileChecker(null)

// Build 144 tiles
const deck: Tile[] = []
for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
  for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(s, v))
for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(TileSuit.WIND, v))
for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) deck.push(mkTile(TileSuit.DRAGON, v))
for (let i = 0; i < 8; i++) deck.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })

const shuffled = shuffleTiles(deck)

// Deal 13 to each (skip flowers)
const hands: Tile[][] = [[], [], [], []]
let wallIdx = 0
for (let p = 0; p < 4; p++) {
  for (let i = 0; i < 13; i++) {
    while (isFlower(shuffled[wallIdx])) wallIdx++
    hands[p].push(shuffled[wallIdx++])
  }
}
// Dealer gets 14th
while (isFlower(shuffled[wallIdx])) wallIdx++
hands[0].push(shuffled[wallIdx++])

console.log('Deal: P0='+hands[0].length, 'P1='+hands[1].length, 'P2='+hands[2].length, 'P3='+hands[3].length)

// Build wall
const wall: Tile[] = []
for (let i = wallIdx; i < shuffled.length; i++) if (!isFlower(shuffled[i])) wall.push(shuffled[i])

// Simulate 20 rounds normal play
let lastDiscard: Tile | null = null
for (let rnd = 1; rnd <= 20; rnd++) {
  for (let p = 0; p < 4; p++) {
    const hand = hands[p]
    // Check self-win
    const result = canWin(hand, 0, wt)
    if (result.canWin) {
      console.log(`R${rnd} P${p} HU self-draw! hand=${hand.length} tiles`)
      process.exit(0)
    }
    // Discard tile with no neighbors
    let bestIdx = 0, bestScore = 999
    for (let i = 0; i < hand.length; i++) {
      let count = 0
      for (let j = 0; j < hand.length; j++) {
        if (i === j) continue
        if (hand[i].suit !== TileSuit.FLOWER && hand[i].suit === hand[j].suit && Math.abs(hand[i].value - hand[j].value) <= 2) count++
      }
      if (count < bestScore) { bestScore = count; bestIdx = i }
    }
    lastDiscard = hand.splice(bestIdx, 1)[0]
    // Draw
    if (wall.length > 0) hand.push(wall.shift()!)
  }
}
console.log('No hu in 20 rounds (normal behavior)')
// Check hand sizes
console.log('Final hand sizes:', hands.map(h => h.length))
