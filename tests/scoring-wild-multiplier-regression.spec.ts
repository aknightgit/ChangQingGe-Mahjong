import { calculateScore } from '../server/utils/scoring'
import { HandType } from '../server/utils/handValidator'
import { Meld, MeldType, Tile, TileSuit } from '../server/types/game'

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`)
    failed++
  }
}

function tile(suit: TileSuit, value: number, id: string, isFlower = suit === TileSuit.FLOWER): Tile {
  return { suit, value, id, isFlower }
}

const exposedMelds: Meld[] = [
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: [
      tile(TileSuit.DRAGON, 2, 'dragon-2a'),
      tile(TileSuit.DRAGON, 2, 'dragon-2b'),
      tile(TileSuit.DRAGON, 2, 'dragon-2c'),
    ],
  },
  {
    type: MeldType.SEQUENCE,
    isConcealed: false,
    tiles: [
      tile(TileSuit.BAMBOOS, 6, 'b6'),
      tile(TileSuit.BAMBOOS, 7, 'b7'),
      tile(TileSuit.BAMBOOS, 8, 'b8'),
    ],
  },
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: [tile(TileSuit.FLOWER, 1, 'flower-1', true)],
  } as any,
]

const handTiles: Tile[] = [
  tile(TileSuit.BAMBOOS, 2, 'b2a'),
  tile(TileSuit.BAMBOOS, 2, 'b2b'),
  tile(TileSuit.BAMBOOS, 2, 'b2c'),
  tile(TileSuit.BAMBOOS, 4, 'b4'),
  tile(TileSuit.WIND, 2, 'south-a'),
  tile(TileSuit.WIND, 2, 'south-b'),
  tile(TileSuit.WIND, 2, 'south-c'),
  tile(TileSuit.DOTS, 9, 'wild'),
]

const result = calculateScore({
  handTiles,
  exposedMelds,
  flowerTiles: [tile(TileSuit.FLOWER, 1, 'flower-1', true)],
  handTypes: [HandType.HALF_FLUSH],
  isSelfDrawn: false,
  isKongFlower: false,
  isRobbingKong: false,
  isMenQing: false,
  wildTileSuit: TileSuit.DOTS,
  wildTileValue: 9,
  rawRoundMultiplier: 1,
  rawInheritMultiplier: 1,
  settlementMultiplier: 1,
  globalIncludesRound: true,
})

console.log(result)
ok('hand should not get no-wild doubling when wild is required', result.extraMultipliers === 1, JSON.stringify(result.details))
ok('hand should score 6 fan by formula instead of inflated 8', result.baseFan === 6 && result.finalPoints === 6, JSON.stringify(result.details))

console.log(`Result: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
