/**
 * 回归测试: AI-小猪 房间 1659 第二局番数修复 (2026-06-10)
 *
 * 牌型:
 *   副露(门口): 三花 + 红中刻 + 西风刻
 *   手牌: 百搭 + 4万 + 6万 + 东风对
 *   胡: 东风对
 *
 * K哥铁律: 百搭只能当一张牌用 —— 当五万(归位走顺子)，不能同时又当东风
 * 期望: baseFan = 2 + 3(花) + 3(风刻：红中+西风) = 8 番
 *   - 不享无百搭×2 (因为不是风一色/风碰)
 *   - 东风对作将，不算 comboPoints
 */
import { calculateScore } from '../server/utils/scoring'
import { HandType, canWin } from '../server/utils/handValidator'
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

// 副露：红中刻 + 西风刻 + 三花(门口)
const exposedMelds: Meld[] = [
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: [
      tile(TileSuit.DRAGON, 2, 'red-a'),
      tile(TileSuit.DRAGON, 2, 'red-b'),
      tile(TileSuit.DRAGON, 2, 'red-c'),
    ],
  },
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: [
      tile(TileSuit.WIND, 3, 'west-a'),
      tile(TileSuit.WIND, 3, 'west-b'),
      tile(TileSuit.WIND, 3, 'west-c'),
    ],
  },
]

// 三花(门口) - 用 flowerTiles 字段传，因为是花牌
const flowerTiles: Tile[] = [
  tile(TileSuit.FLOWER, 1, 'flower-1', true),
  tile(TileSuit.FLOWER, 2, 'flower-2', true),
  tile(TileSuit.FLOWER, 3, 'flower-3', true),
]

// 手牌: 百搭 + 4万 + 6万 + 东风对
// 百搭是 DOTS-9（9 筒）作为 wild
const handTiles: Tile[] = [
  tile(TileSuit.DOTS, 9, 'wild'),         // 百搭
  tile(TileSuit.BAMBOOS, 4, 'b4'),        // 4万
  tile(TileSuit.BAMBOOS, 6, 'b6'),        // 6万
  tile(TileSuit.WIND, 1, 'east-a'),       // 东风
  tile(TileSuit.WIND, 1, 'east-b'),       // 东风
]

// 先验证这手牌能胡（百搭当5万，归位走 4-5-6 万顺子 + 东风对作将）
const winCheck = canWin(handTiles, exposedMelds, `${TileSuit.DOTS}-9`)
ok('手牌可胡(百搭归位走顺子+东风对作将)', winCheck.canWin, JSON.stringify(winCheck))

// 计算番数
const result = calculateScore({
  handTiles,
  exposedMelds,
  flowerTiles,
  handTypes: [HandType.HALF_FLUSH],  // 混一色 (万+风)
  isSelfDrawn: false,  // 放冲胡
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

console.log('\n=== 结算明细 ===')
console.log(`baseFan: ${result.baseFan}`)
console.log(`extraMultipliers: ${result.extraMultipliers}`)
console.log(`globalMultiplier: ${result.globalMultiplier}`)
console.log(`finalPoints: ${result.finalPoints}`)
console.log(`handTypeName: ${result.handTypeName}`)
console.log(`details:`)
result.details.forEach(d => console.log(`  - ${d}`))

// 核心断言: baseFan = 8 (K哥算法)
ok('baseFan 应为 8 (K哥 铁律: 百搭归位走 4-5-6 万顺子+东风对作将)',
  result.baseFan === 8,
  `actual=${result.baseFan}`)

// 不享无百搭×2 (混一色不是风一色/风碰)
ok('不享无百搭×2 (混一色,非风一色/风碰)',
  result.extraMultipliers === 1,
  `actual extraMultipliers=${result.extraMultipliers}`)

// 牌型应是混一色
ok('牌型应为混一色',
  result.handTypeName.includes('混一色'),
  `actual=${result.handTypeName}`)

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===`)
if (failed > 0) {
  process.exit(1)
}
console.log('AI-小猪 房间 1659 第二局番数回归通过')
