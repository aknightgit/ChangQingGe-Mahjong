import { isTing, buildWildTileChecker, clearIsTingCache, resetIsTingCacheStats, getIsTingCacheStats } from '../server/utils/handValidator'
import { TileSuit } from '../server/types/game'
import { shuffleTiles } from '../server/utils/tiles'

resetIsTingCacheStats()
clearIsTingCache()

// 测试：同一手牌调用两次
const deck: any[] = []
for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
  for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) deck.push({ suit: s, value: v, id: `${s}-${v}-${c}`, isFlower: false })
for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) deck.push({ suit: TileSuit.WIND, value: v, id: `w${v}-${c}`, isFlower: false })
for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) deck.push({ suit: TileSuit.DRAGON, value: v, id: `d${v}-${c}`, isFlower: false })

const shuffled = shuffleTiles(deck as any)
const hand = shuffled.slice(0, 13)
const wt = buildWildTileChecker('dots-5')

console.log('Before:', getIsTingCacheStats())
const r1 = isTing(hand as any, 0, wt)
console.log(`isTing #1 = ${r1}, stats:`, getIsTingCacheStats())
const r2 = isTing(hand as any, 0, wt)
console.log(`isTing #2 = ${r2}, stats:`, getIsTingCacheStats())
