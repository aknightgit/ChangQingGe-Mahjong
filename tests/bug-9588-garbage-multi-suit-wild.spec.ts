/**
 * bug:9588 垃圾胡 v3 - 百搭分配后绕过垃圾胡检查
 *
 * 根因: isGarbageHand 只检查数字门 >= 2, 漏判"风+箭+筒 3 门"垃圾胡
 * 另: materializeTypes 检查 virtualHand(已分配百搭) 而非 naturals,百搭可补成同门绕过
 */
import { canWin } from '../server/utils/handValidator'
import {
  Meld,
  MeldType,
  Tile,
  TileSuit,
} from '../server/types/game'

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

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: suit === TileSuit.FLOWER }
}

function kong(suit: TileSuit, value: number, prefix: string): Meld {
  return {
    type: MeldType.KONG,
    tiles: [
      tile(suit, value, `${prefix}-${value}-0`),
      tile(suit, value, `${prefix}-${value}-1`),
      tile(suit, value, `${prefix}-${value}-2`),
      tile(suit, value, `${prefix}-${value}-3`),
    ],
    isConcealed: false,
    fromPlayerId: 'p1'
  }
}

function triplet(suit: TileSuit, value: number, prefix: string): Meld {
  return {
    type: MeldType.TRIPLET,
    tiles: [
      tile(suit, value, `${prefix}-${value}-0`),
      tile(suit, value, `${prefix}-${value}-1`),
      tile(suit, value, `${prefix}-${value}-2`),
    ],
    isConcealed: false,
    fromPlayerId: 'p1'
  }
}

console.log('=== bug:9588 垃圾胡 v3 (风+箭+多门数牌) ===')

// 1. 老蒋的牌型 - 应该不胡
{
  // exposed: 二万杠 + 六条刻
  // concealed: 北风对 + 发财对 + 一筒 + 二筒 + 百搭(wan-1) + 百搭(wan-1) + 1张捉冲
  // 完整手牌: 万(2+2=4) + 条(3) + 风(2) + 箭(2) + 筒(2) + 百搭×2(1+1) + 捉冲(1) = 15?
  // K哥说: 门口二万杠+六条刻, 手牌北风对+发财对+一二筒+百搭+百搭, 这是 13 张
  // 加上 1 张捉冲 = 14 张
  const exposed: Meld[] = [
    kong(TileSuit.CHARACTERS, 2, 'm1'),  // 二万杠
    triplet(TileSuit.BAMBOOS, 6, 'm2'), // 六条刻
  ]
  const concealed: Tile[] = [
    tile(TileSuit.WIND, 4, 'c1'), tile(TileSuit.WIND, 4, 'c2'),   // 北风对
    tile(TileSuit.DRAGON, 2, 'c3'), tile(TileSuit.DRAGON, 2, 'c4'), // 发财对
    tile(TileSuit.DOTS, 1, 'c5'), tile(TileSuit.DOTS, 2, 'c6'),     // 一筒+二筒
    tile(TileSuit.CHARACTERS, 1, 'w1'), tile(TileSuit.CHARACTERS, 1, 'w2'), // 百搭 ×2
    tile(TileSuit.CHARACTERS, 3, 'claim'), // 捉冲的牌(假设是三万)
  ]
  const result = canWin(concealed, exposed, 'wan-1', undefined, [])
  ok(
    '老蒋手牌(风+箭+筒+百搭)不可胡(垃圾胡)',
    result.canWin === false,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

// 2. 边界: 单门+字牌(风碰碰胡, 应该是合法的混碰)
{
  // exposed: 风刻×2 + 万刻(3面子)
  // concealed: 万5张+百搭×1 = 凑成1面子+1对 = 14 张
  // 万+风 2门, exposed 全是刻子, 是混碰
  const exposed: Meld[] = [
    triplet(TileSuit.WIND, 1, 'm1'), // 东风刻
    triplet(TileSuit.WIND, 2, 'm2'), // 南风刻
    triplet(TileSuit.CHARACTERS, 5, 'm3'), // 五万刻
  ]
  const concealed: Tile[] = [
    tile(TileSuit.CHARACTERS, 9, 'c1'),
    tile(TileSuit.CHARACTERS, 9, 'c2'),
    tile(TileSuit.CHARACTERS, 9, 'c3'),
    tile(TileSuit.CHARACTERS, 9, 'c4'),
    tile(TileSuit.CHARACTERS, 1, 'w1'), // 百搭
  ]
  // 完整: 4 刻子 + 1 对(9万) = 碰碰胡 - 万+风 2门
  const result = canWin(concealed, exposed, 'wan-1', undefined, [])
  ok(
    '风碰混碰(2风刻+1万刻+9万对+百搭)应可胡',
    result.canWin === true,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

console.log(`\n=== Total: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
