import { canWin } from '../server/utils/handValidator'
import { MeldType, TileSuit, type Meld, type Tile } from '../server/types/game'

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

function pong(baseId: string, suit: TileSuit, value: number): Meld {
  return {
    type: MeldType.TRIPLET,
    tiles: [
      tile(`${baseId}-1`, suit, value),
      tile(`${baseId}-2`, suit, value),
      tile(`${baseId}-3`, suit, value),
    ],
    fromPlayer: 0,
    claimedTile: tile(`${baseId}-c`, suit, value),
  } as Meld
}

const exposedMelds = [
  pong('meld-batiao', TileSuit.BAMBOOS, 8),
  pong('meld-south', TileSuit.WIND, 2),
]

console.log('\n=== Regression: AI-AK endgame canWin ===\n')

// 来自主训练日志的一手真实残局：
// [INV_TRACE] DISC AI-AK ... hand=[四筒 六筒 八筒 五万 六万 五条 五条]
// melds=[碰:八条 八条 八条 | 碰:南 南 南]
{
  const realEndgameHand = [
    tile('gc84', TileSuit.DOTS, 4),
    tile('ubww', TileSuit.DOTS, 6),
    tile('uyfn', TileSuit.DOTS, 8),
    tile('d6rl', TileSuit.CHARACTERS, 5),
    tile('814e', TileSuit.CHARACTERS, 6),
    tile('eu26', TileSuit.BAMBOOS, 5),
    tile('mk4s', TileSuit.BAMBOOS, 5),
  ]

  const winningTiles: string[] = []
  for (const [suit, max] of [
    [TileSuit.DOTS, 9],
    [TileSuit.CHARACTERS, 9],
    [TileSuit.BAMBOOS, 9],
    [TileSuit.WIND, 4],
    [TileSuit.DRAGON, 3],
  ] as const) {
    for (let value = 1; value <= max; value++) {
      const result = canWin(
        [...realEndgameHand, tile(`draw-${suit}-${value}`, suit, value)],
        exposedMelds,
        null
      )
      if (result.canWin) winningTiles.push(`${suit}-${value}:${result.types.join(',')}`)
    }
  }

  test('real AI-AK 7-tile endgame has no winning draw', winningTiles.length === 0, `wins=${winningTiles.join(' | ')}`)
  test('real AI-AK 7-tile endgame itself is not a winning hand', canWin(realEndgameHand, exposedMelds, null).canWin === false)
}

// 对照正例：同样是 2 副露结构，但使用规则允许的混一色成胡，避免触发“多门顺子垃圾胡”
{
  const validWinningHand = [
    tile('b3', TileSuit.BAMBOOS, 3),
    tile('b4', TileSuit.BAMBOOS, 4),
    tile('b5a', TileSuit.BAMBOOS, 5),
    tile('b5b', TileSuit.BAMBOOS, 5),
    tile('b6', TileSuit.BAMBOOS, 6),
    tile('b7', TileSuit.BAMBOOS, 7),
    tile('b8', TileSuit.BAMBOOS, 8),
    tile('b5c', TileSuit.BAMBOOS, 5),
  ]

  const result = canWin(validWinningHand, exposedMelds, null)
  test('two exposed pungs plus legal half-flush shape still wins normally', result.canWin === true, `types=${result.types.join(',')}`)
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
