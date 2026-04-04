import { canWin, buildWildTileChecker, detectHandTypes } from './server/utils/handValidator'
import { TileSuit, type Tile } from './server/types/game'
import { randomUUID } from './server/utils/tiles'
import { shuffleTiles, isFlower } from './server/utils/tiles'

function mkTile(s: TileSuit, v: number): Tile {
  return { suit: s, value: v, id: `${s}-${v}-${randomUUID()}`, isFlower: false }
}

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(mkTile(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return d
}

// Simulate ONE game with detailed debug
const deck = shuffleTiles(buildDeck())
let wallIdx = 0

const hands: Tile[][] = [[], [], [], []]
for (let p = 0; p < 4; p++) {
  for (let i = 0; i < 13; i++) {
    while (isFlower(deck[wallIdx])) wallIdx++
    hands[p].push(deck[wallIdx++])
  }
}
// Dealer draws 14th
while (isFlower(deck[wallIdx])) wallIdx++
hands[0].push(deck[wallIdx++])

console.log('=== Deal check ===')
for (let p = 0; p < 4; p++) {
  const cw = canWin(hands[p], 0, buildWildTileChecker(null))
  console.log(`P${p}: ${hands[p].length} tiles, canWin:`, cw.canWin)
}

// Simulate rounds
let lastDiscard: Tile | null = null
let maxRounds = 20
for (let round = 1; round <= maxRounds; round++) {
  for (let p = 0; p < 4; p++) {
    const cw = canWin(hands[p], 0, buildWildTileChecker(null))
    if (cw.canWin) {
      console.log(`Round ${round}, P${p}: ${hands[p].length} tiles → WIN!`)
      console.log('  Type:', detectHandTypes(hands[p], [], false, 0, null) || 'standard')
    process.exit(0)
    }
    // Check claim
    if (lastDiscard) {
      const tempHand = [...hands[p], lastDiscard]
      const cw2 = canWin(tempHand, 0, buildWildTileChecker(null))
      if (cw2.canWin) {
        console.log(`Round ${round}, P${p} claims discards → WIN!`)
        process.exit(0)
      }
    }
    // Discard (simple: discard tile with no neighbors)
    const hand = hands[p]
    let bestIdx = 0, bestScore = -Infinity
    for (let i = 0; i < hand.length; i++) {
      const t = hand[i]
      let adj = 0
      for (let j = 0; j < hand.length; j++) {
        if (i === j || t.suit !== hand[j].suit) continue
        if (Math.abs(t.value - hand[j].value) <= 2) adj++
      }
      if (adj > bestScore) { bestScore = adj; bestIdx = i }
    }
    const discarded = hand.splice(bestIdx, 1)[0]
    lastDiscard = discarded
    console.log(`R${round} P${p}: ${hands[p].length} tiles → discards ${discarded.suit}-${discarded.value}`)
  }
}
console.log('No win after', maxRounds, 'rounds')
for (let p = 0; p < 4; p++) {
  console.log(`P${p}: ${hands[p].length} tiles remaining`)
}
