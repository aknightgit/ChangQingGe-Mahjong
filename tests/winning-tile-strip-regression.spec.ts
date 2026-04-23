import { TileSuit, type Tile } from '../server/types/game'
import { stripWinningTileFromConcealedHand } from '../scripts/train-ai-ak'

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

function tile(id: string, suit: TileSuit, value: number): Tile {
  return { id, suit, value, isFlower: false }
}

console.log('\n=== Regression: winning tile strip uses tile id, not tile face ===\n')

const originalHand = [
  tile('dot-4-a', TileSuit.BAMBOOS, 4),
  tile('dot-4-b', TileSuit.BAMBOOS, 4),
  tile('dot-5-a', TileSuit.BAMBOOS, 5),
  tile('dot-6-a', TileSuit.BAMBOOS, 6),
]

const stripped = stripWinningTileFromConcealedHand(originalHand, originalHand[1])

test('removes exactly one tile', stripped.length === 3, `actual=${stripped.length}`)
test('removes the requested tile id', !stripped.some(tile => tile.id === 'dot-4-b'))
test('keeps same-face duplicates with different ids', stripped.some(tile => tile.id === 'dot-4-a'))
test('preserves other tiles', stripped.some(tile => tile.id === 'dot-5-a') && stripped.some(tile => tile.id === 'dot-6-a'))

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
