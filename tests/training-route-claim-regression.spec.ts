import { MeldType, TileSuit, type Tile } from '../server/types/game'
import {
  canAkChowSafely,
  canAkPengSafely,
  shouldAkTakeClaim,
} from '../scripts/train-ai-ak'

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

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: false }
}

function makeAkPlayer(tiles: Tile[]) {
  return {
    name: 'AI-AK',
    pos: 0,
    hand: tiles,
    exposedMelds: [],
    flowerTiles: [],
    isBot: true,
    isTing: false,
    score: 0,
    wildSuit: TileSuit.DOTS,
    wildValue: 9,
    kongCount: 0,
    id: 'ak',
    status: 'playing' as const,
    winMode: undefined,
    policy: {
      pengChance: 1,
      chowChance: 1,
    },
    meldSources: [0, 0, 0, 0],
    discardedTiles: [],
    chowPongExclusion: { firstActionSuit: null, firstActionType: null },
  }
}

console.log('\n=== Regression: training route claim gating ===\n')

{
  const player = makeAkPlayer([
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.BAMBOOS, 2, 't2'),
    tile(TileSuit.BAMBOOS, 3, 't3'),
    tile(TileSuit.BAMBOOS, 4, 't4'),
    tile(TileSuit.CHARACTERS, 6, 'w6'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
  ])
  const passEval = {
    score: 100,
    discard: null,
    shantenLike: 2,
    improvingDraws: 14,
    directWaits: 0,
    readyDraws: 4,
    winDraws: 0,
  }
  const claimEval = {
    score: 101,
    discard: null,
    shantenLike: 2,
    improvingDraws: 14,
    directWaits: 0,
    readyDraws: 4,
    winDraws: 0,
  }

  test(
    'trainer blocks early menqing chow with no clear gain',
    shouldAkTakeClaim(player as any, tile(TileSuit.DOTS, 4, 'claim-d4'), passEval, claimEval, 'chow') === false
  )
}

{
  const player = makeAkPlayer([
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DOTS, 1, 'd1a'),
    tile(TileSuit.DOTS, 1, 'd1b'),
    tile(TileSuit.BAMBOOS, 9, 't9a'),
    tile(TileSuit.BAMBOOS, 9, 't9b'),
    tile(TileSuit.CHARACTERS, 4, 'w4a'),
    tile(TileSuit.CHARACTERS, 4, 'w4b'),
    tile(TileSuit.CHARACTERS, 8, 'w8'),
  ])
  const passEval = {
    score: 80,
    discard: null,
    shantenLike: 3,
    improvingDraws: 8,
    directWaits: 0,
    readyDraws: 2,
    winDraws: 0,
  }
  const claimEval = {
    score: 110,
    discard: null,
    shantenLike: 1,
    improvingDraws: 14,
    directWaits: 2,
    readyDraws: 5,
    winDraws: 1,
  }

  test(
    'trainer still allows peng on all-pungs-like shape',
    shouldAkTakeClaim(player as any, tile(TileSuit.WIND, 1, 'claim-east'), passEval, claimEval, 'peng') === true
  )
}

{
  const claimTile = tile(TileSuit.DOTS, 7, 'claim-d7')
  const player = makeAkPlayer([
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.WIND, 3, 'west-a'),
    tile(TileSuit.WIND, 3, 'west-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DRAGON, 2, 'green-a'),
    tile(TileSuit.DRAGON, 2, 'green-b'),
    tile(TileSuit.DRAGON, 3, 'white-a'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
  ])

  test('trainer blocks number chow on honor-heavy route', canAkChowSafely(player as any, claimTile) === false)
}

{
  const player = makeAkPlayer([
    tile(TileSuit.DOTS, 1, 'h1'),
    tile(TileSuit.DOTS, 2, 'h2'),
    tile(TileSuit.DOTS, 3, 'h3'),
    tile(TileSuit.DOTS, 4, 'h4'),
    tile(TileSuit.DOTS, 5, 'h5'),
    tile(TileSuit.DOTS, 6, 'h6'),
    tile(TileSuit.DOTS, 7, 'h7'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 2, 'green-a'),
    tile(TileSuit.DRAGON, 3, 'white-a'),
    tile(TileSuit.BAMBOOS, 9, 'off-suit'),
  ])
  const passEval = {
    score: 100,
    discard: null,
    shantenLike: 2,
    improvingDraws: 12,
    directWaits: 0,
    readyDraws: 4,
    winDraws: 0,
  }
  const claimEval = {
    score: 120,
    discard: null,
    shantenLike: 2,
    improvingDraws: 16,
    directWaits: 0,
    readyDraws: 5,
    winDraws: 0,
  }

  test(
    'trainer rejects off-route half-flush chow even with shape gain',
    shouldAkTakeClaim(player as any, tile(TileSuit.BAMBOOS, 8, 'claim-b8'), passEval, claimEval, 'chow') === false
  )
}

{
  const player = makeAkPlayer([
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DOTS, 2, 'd2a'),
    tile(TileSuit.DOTS, 2, 'd2b'),
    tile(TileSuit.CHARACTERS, 7, 'w7a'),
    tile(TileSuit.CHARACTERS, 7, 'w7b'),
    tile(TileSuit.BAMBOOS, 5, 't5a'),
    tile(TileSuit.BAMBOOS, 5, 't5b'),
    tile(TileSuit.BAMBOOS, 9, 't9'),
  ])
  player.exposedMelds = [
    {
      type: MeldType.TRIPLET,
      tiles: [tile(TileSuit.WIND, 4, 'north-a'), tile(TileSuit.WIND, 4, 'north-b'), tile(TileSuit.WIND, 4, 'north-c')],
      isConcealed: false,
    },
  ]

  const passEval = {
    score: 80,
    discard: null,
    shantenLike: 2,
    improvingDraws: 8,
    directWaits: 0,
    readyDraws: 3,
    winDraws: 0,
  }
  const claimEval = {
    score: 110,
    discard: null,
    shantenLike: 1,
    improvingDraws: 12,
    directWaits: 2,
    readyDraws: 5,
    winDraws: 1,
  }

  test(
    'trainer allows honor peng on honor-heavy/open route when shape improves',
    shouldAkTakeClaim(player as any, tile(TileSuit.WIND, 3, 'claim-west'), passEval, claimEval, 'peng') === true
  )
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
