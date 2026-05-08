import { canWin, clearCanWinCache, HandType } from '../server/utils/handValidator'
import { MeldType, TileSuit } from '../server/types/game'

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

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value, isFlower: false }
}

const concealed = [
  tile('f1', TileSuit.DRAGON, 2),
  tile('f2', TileSuit.DRAGON, 2),
  tile('f3', TileSuit.DRAGON, 2),
  tile('b1', TileSuit.DRAGON, 3),
  tile('b2', TileSuit.DRAGON, 3),
]

const allHonorExposed = [
  { type: MeldType.TRIPLET, tiles: [tile('e1', TileSuit.WIND, 1), tile('e2', TileSuit.WIND, 1), tile('e3', TileSuit.WIND, 1)] },
  { type: MeldType.TRIPLET, tiles: [tile('s1', TileSuit.WIND, 2), tile('s2', TileSuit.WIND, 2), tile('s3', TileSuit.WIND, 2)] },
  { type: MeldType.TRIPLET, tiles: [tile('w1', TileSuit.WIND, 3), tile('w2', TileSuit.WIND, 3), tile('w3', TileSuit.WIND, 3)] },
] as any

const characterExposed = [
  { type: MeldType.SEQUENCE, tiles: [tile('c1', TileSuit.CHARACTERS, 1), tile('c2', TileSuit.CHARACTERS, 2), tile('c3', TileSuit.CHARACTERS, 3)] },
  { type: MeldType.SEQUENCE, tiles: [tile('c4', TileSuit.CHARACTERS, 4), tile('c5', TileSuit.CHARACTERS, 5), tile('c6', TileSuit.CHARACTERS, 6)] },
  { type: MeldType.SEQUENCE, tiles: [tile('c7', TileSuit.CHARACTERS, 7), tile('c8', TileSuit.CHARACTERS, 8), tile('c9', TileSuit.CHARACTERS, 9)] },
] as any

console.log('\n=== Regression: exposed meld content must affect canWin cache ===\n')

clearCanWinCache()

const allHonorResult = canWin(concealed, allHonorExposed, null)
test('all-honor exposed melds identify all-wind hand', allHonorResult.canWin && allHonorResult.types.includes(HandType.ALL_WIND), `types=${allHonorResult.types.join(',')}`)

const halfFlushResult = canWin(concealed, characterExposed, null)
test('character exposed melds identify half-flush instead of all-wind', halfFlushResult.canWin && halfFlushResult.types.includes(HandType.HALF_FLUSH), `types=${halfFlushResult.types.join(',')}`)
test('character exposed melds must not inherit all-wind from cache', !halfFlushResult.types.includes(HandType.ALL_WIND), `types=${halfFlushResult.types.join(',')}`)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
