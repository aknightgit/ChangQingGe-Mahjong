// 快速性能分析：测量训练脚本各阶段耗时
import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { canWin, buildWildTileChecker, isTing, clearIsTingCache, resetIsTingCacheStats, getIsTingCacheStats } from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile } from '../server/types/game'

resetIsTingCacheStats()

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,8)}`, isFlower: false }
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

function buildHand(deck: Tile[]): { hand: Tile[]; wildId: string } {
  const hand: Tile[] = []
  let idx = 0
  while (hand.length < 13) {
    const tile = deck[idx++]
    if (!isFlower(tile)) hand.push(tile)
  }
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  return { hand, wildId: `${w.suit}-${w.value}` }
}

// 模拟连续turns，模拟真实游戏：每回合手牌变化
const deck = buildDeck()
const { hand: initialHand, wildId } = buildHand(deck)
const wt = buildWildTileChecker(wildId)

console.log(`Wild: ${wildId}, Initial hand: ${initialHand.length} tiles`)

// 模拟连续turns
const t0 = performance.now()
const NUM_TURNS = 500
let hand = [...initialHand]

for (let turn = 0; turn < NUM_TURNS; turn++) {
  // 模拟：摸一张新牌（从deck取），打出一张旧牌（移除手牌第一张）
  const newTile = deck[(turn * 17) % (deck.length - 14)]
  if (!isFlower(newTile)) {
    hand.push(newTile)
    hand = hand.slice(1)  // 移除第一张（简化：总是移除最早的）
  }
  
  if (hand.length === 13) {
    isTing(hand, 0, wt)
  }
  
  // 对手检查：canWin
  const testHand = [...hand.slice(0, 12)]
  canWin(testHand, 0, wt)
}

const elapsed = performance.now() - t0
const stats = getIsTingCacheStats()

console.log(`\n=== 连续手牌场景 (模拟真实游戏 ${NUM_TURNS} turns) ===`)
console.log(`isTing缓存统计: 命中${stats.hits} 未命中${stats.misses} 命中率${stats.hitRate}`)
console.log(`总耗时: ${elapsed.toFixed(0)}ms`)
console.log(`估算每局(~60 turns): ${(elapsed/NUM_TURNS*60).toFixed(0)}ms`)
console.log(`估算1000局: ${(elapsed/NUM_TURNS*60*1000/1000).toFixed(0)}s`)
