import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { canWin, buildWildTileChecker, clearCanWinCache, getCanWinCacheStats, resetIsTingCacheStats } from '../server/utils/handValidator'
import { TileSuit, type Tile } from '../server/types/game'

resetIsTingCacheStats()
clearCanWinCache()

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}`, isFlower: false }
}
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

const deck = buildDeck()
const hand: Tile[] = []
let idx = 0
while (hand.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand.push(tile)
}

const wildId = 'dots-5'
const wt = buildWildTileChecker(wildId)

// 模拟真实游戏场景：连续手牌
const t0 = performance.now()
const NUM = 1000
let handArr = [...hand]
for (let i = 0; i < NUM; i++) {
  // 模拟：摸一张新牌打出一张旧牌 → 手牌变化
  const newTile = deck[(i * 17) % (deck.length - 14)]
  if (!isFlower(newTile)) {
    handArr.push(newTile)
    handArr = handArr.slice(1)
  }
  canWin(handArr, 0, wt)
  // 对手也检查同一手牌
  canWin(handArr, 0, wt)
}
const elapsed = performance.now() - t0

const stats = getCanWinCacheStats()
console.log(`${NUM*2} canWin calls (真实场景: 2次/turn): ${elapsed.toFixed(0)}ms`)
console.log(`canWin缓存: 命中${stats.hits} 未命中${stats.misses} 命中率${stats.hitRate}`)
console.log(`估算每局(~60 turns, 4 players): ${(elapsed/NUM*60).toFixed(0)}ms`)
console.log(`估算1000局: ${(elapsed/NUM*60*1000/1000).toFixed(0)}s`)
