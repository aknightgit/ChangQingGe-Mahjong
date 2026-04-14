// 测量真实 aiDiscard 的耗时
import { shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles'
import { detectHandTypes } from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile } from '../server/types/game'

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,8)}`, isFlower: false }
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

// 模拟 evalWildDeployment 的核心操作
function evalWildDeploymentSim(hand: Tile[], meldCount: number, wildCount: number, flowerCount: number): void {
  const nonWild = hand.filter(t => !isWild(t, undefined, undefined))
  const typesNoWild = detectHandTypes(nonWild, [], false, flowerCount, null)
  // 各种评估...
}

// 模拟完整 aiDiscard（包含 evalWildDeployment）
function fullAiDiscardSim(hand: Tile[], meldCount: number, wildCount: number, flowerCount: number): void {
  // evalWildDeployment (expensive)
  evalWildDeploymentSim(hand, meldCount, wildCount, flowerCount)
  
  // tile filter per tile
  for (const tile of hand) {
    if ((tile as any).isFlower) continue
    const count = hand.filter(t => tileEq(t, tile)).length
    const sameSuit = hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))
    const honorCount = hand.filter(t => isHonor(t)).length
    const groups = groupTiles(hand.filter(t => !(t as any).isFlower))
  }
}

// 测量
const deck = buildDeck()
const hand: Tile[] = []
let idx = 0
while (hand.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand.push(tile)
}
const wildCount = Math.floor(Math.random() * 3)
const flowerCount = 0

const t0 = performance.now()
const N = 1000
for (let i = 0; i < N; i++) {
  fullAiDiscardSim(hand, 0, wildCount, flowerCount)
}
const elapsed = performance.now() - t0
console.log(`完整aiDiscard模拟 (14 tiles, wildCount=${wildCount}): ${(elapsed/N).toFixed(3)}ms/call, ${N} calls in ${elapsed.toFixed(0)}ms`)

// 无百搭版本
const handNoWild = hand.filter(t => !isWild(t, undefined, undefined))
const t1 = performance.now()
for (let i = 0; i < N; i++) {
  evalWildDeploymentSim(handNoWild, 0, 0, 0)
}
const elapsed2 = performance.now() - t1
console.log(`evalWildDeployment (无百搭): ${(elapsed2/N*1000).toFixed(3)}ms/call`)

console.log(`\n估算每局 (240 aiDiscard calls): ${(elapsed/N*240).toFixed(0)}ms`)
console.log(`估算1000局: ${(elapsed/N*240*1000/1000).toFixed(0)}s`)
