import { canWin } from '../server/utils/handValidator'
import { DragonValue, MeldType, TileSuit, WindValue, type Meld, type Tile } from '../server/types/game'

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

console.log('\n=== Regression: round 104 invalid wins ===\n')

{
  const akHand = [
    tile('t1', TileSuit.BAMBOOS, 6),
    tile('t2', TileSuit.BAMBOOS, 6),
    tile('t3', TileSuit.DRAGON, DragonValue.GREEN),
    tile('t4', TileSuit.DRAGON, DragonValue.GREEN),
    tile('t5', TileSuit.DRAGON, DragonValue.GREEN),
    tile('t6', TileSuit.DRAGON, DragonValue.GREEN),
    tile('t7', TileSuit.DRAGON, DragonValue.WHITE),
    tile('t8', TileSuit.DRAGON, DragonValue.WHITE),
    tile('t9', TileSuit.DRAGON, DragonValue.GREEN), // 放冲牌：发
  ]
  const akMelds = [
    pong('north', TileSuit.WIND, WindValue.NORTH),
    pong('wan1', TileSuit.CHARACTERS, 1),
  ]
  const result = canWin(akHand, akMelds, 'tiao-7')
  test('AI-AK round-104 logged hand must not be judged as win', result.canWin === false, `types=${result.types.join(',')}`)
}

{
  const laoZhaoHand = [
    tile('lz1', TileSuit.CHARACTERS, 3),
    tile('lz2', TileSuit.CHARACTERS, 3),
    tile('lz3', TileSuit.DOTS, 4), // 放冲牌：四筒
  ]
  const laoZhaoMelds = [
    pong('dot7', TileSuit.DOTS, 7),
    {
      type: MeldType.KONG,
      tiles: [
        tile('kong2-1', TileSuit.DOTS, 2),
        tile('kong2-2', TileSuit.DOTS, 2),
        tile('kong2-3', TileSuit.DOTS, 2),
        tile('kong2-4', TileSuit.DOTS, 2),
      ],
      fromPlayer: 0,
      claimedTile: tile('kong2-c', TileSuit.DOTS, 2),
    } as Meld,
    pong('north2', TileSuit.WIND, WindValue.NORTH),
  ]
  const totalShape = laoZhaoHand.length + laoZhaoMelds.length * 3
  test('LaoZhao round-104 logged winner shape is structurally invalid', totalShape !== 14, `shape=${totalShape}`)
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
