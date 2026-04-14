// 测量 aiDiscard 的实际耗时
import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { TileSuit, MeldType, type Tile } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 加载 aiDiscard 代码（从 train-ai-ak.ts 提取关键部分）
function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,8)}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

// 模拟 aiDiscard 的核心操作
function aiDiscardSim(hand: Tile[]): void {
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const tile of hand) {
    if ((tile as any).isFlower) continue
    // 这些是 aiDiscard 中的昂贵操作
    const count = hand.filter(t => tileEq(t, tile)).length
    const sameSuit = hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))
    const honorCount = hand.filter(t => isHonor(t)).length
    const groups = new Map<string, Tile[]>()
    for (const t2 of hand) {
      if ((t2 as any).isFlower) continue
      const key = `${t2.suit}-${t2.value}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t2)
    }
  }
}

// 测量 aiDiscardSim 的耗时
const deck = buildDeck()
const hand: Tile[] = []
let idx = 0
while (hand.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand.push(tile)
}

const t0 = performance.now()
const N = 5000
for (let i = 0; i < N; i++) {
  aiDiscardSim(hand)
}
const elapsed = performance.now() - t0
console.log(`aiDiscard核心 (14 tiles): ${(elapsed/N).toFixed(3)}ms/call, ${N} calls in ${elapsed.toFixed(0)}ms`)

// 测量 13 tiles (摸牌后)
const hand13 = hand.slice(0, 13)
const t1 = performance.now()
for (let i = 0; i < N; i++) {
  aiDiscardSim(hand13)
}
const elapsed13 = performance.now() - t1
console.log(`aiDiscard核心 (13 tiles): ${(elapsed13/N).toFixed(3)}ms/call, ${N} calls in ${elapsed13.toFixed(0)}ms`)

// 估算每局开销：每回合每个玩家调用一次 aiDiscard
// 每局约60 turns × 4 players = 240 次
// 每局 aiDiscard 时间: 240 × 0.018ms = 4.3ms
console.log(`\n估算每局 aiDiscard: 240 calls × ${(elapsed13/N).toFixed(3)}ms = ${(240 * elapsed13/N).toFixed(0)}ms`)
