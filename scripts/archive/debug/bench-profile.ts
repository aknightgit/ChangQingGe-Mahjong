/**
 * 性能分析：训练脚本各函数耗时占比
 */
import {
  shuffleTiles, isFlower, groupTiles
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker, isTing, clearIsTingCache
} from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile, type Meld } from '../server/types/game'

// 计时器
const timers: Record<string, { total: number; count: number }> = {}
function tic(name: string) { return performance.now() }
function toc(name: string, start: number) {
  if (!timers[name]) timers[name] = { total: 0, count: 0 }
  timers[name].total += performance.now() - start
  timers[name].count++
}

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random()}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isWild(t: Tile, ws?: TileSuit, wv?: number): boolean { return ws && wv ? t.suit === ws && t.value === wv : false }

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

// Simulate a game loop
const deck = buildDeck()
const nonFlower = deck.filter(t => !isFlower(t))
const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
const wildId = `${w.suit}-${w.value}`
const wt = buildWildTileChecker(wildId)

// Simulate 100 "turns"
const NUM_TURNS = 100
for (let turn = 0; turn < NUM_TURNS; turn++) {
  // Build a random hand
  const hand: Tile[] = []
  let idx = turn * 14 % (deck.length - 14)
  while (hand.length < 13) {
    const tile = deck[idx++]
    if (!isFlower(tile)) hand.push(tile)
  }
  
  // Simulate aiDiscard-like operations (the heavy part)
  const t0 = tic('aiDiscard')
  for (const tile of hand) {
    if (isFlower(tile)) continue
    // These are the expensive operations in aiDiscard:
    const count = hand.filter(t => tileEq(t, tile)).length  // expensive!
    const sameSuit = hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))
    const isH = isHonor(tile)
    const isW = isWild(tile, w.suit as TileSuit, w.value)
  }
  toc('aiDiscard', t0)
  
  // canWin check
  const t1 = tic('canWin')
  canWin(hand, 0, wt)
  toc('canWin', t1)
  
  // isTing check
  const t2 = tic('isTing')
  isTing(hand, 0, wt)
  toc('isTing', t2)
  
  // Opponent canWin checks (3 opponents)
  const t3 = tic('oppCanWin')
  for (let i = 0; i < 3; i++) {
    const testHand = [...hand.slice(0, 12)]
    canWin(testHand, 0, wt)
  }
  toc('oppCanWin', t3)
}

// Print results
console.log('\n=== 性能分析结果 ===')
const total = Object.values(timers).reduce((s, t) => s + t.total, 0)
for (const [name, data] of Object.entries(timers).sort((a, b) => b[1].total - a[1].total)) {
  const pct = (data.total / total * 100).toFixed(1)
  console.log(`${name.padEnd(15)}: ${data.total.toFixed(0)}ms (${pct}%)  ${data.count} calls  ${data.count > 0 ? (data.total/data.count).toFixed(3) : 0}ms/call`)
}
console.log(`Total: ${total.toFixed(0)}ms for ${NUM_TURNS} turns`)
console.log(`Estimated per-game (60 turns): ${(total/NUM_TURNS*60).toFixed(0)}ms`)
console.log(`Estimated 1000 games: ${(total/NUM_TURNS*60*1000/1000).toFixed(0)}s`)
