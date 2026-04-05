// 测量 evalWildDeployment 真实耗时
import { shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles'
import { detectHandTypes } from '../server/utils/handValidator'
import { TileSuit, MeldType, type Tile } from '../server/types/game'

function t(suit: TileSuit, v: number): Tile {
  return { suit, value: v, id: `${suit}-${v}-${Math.random().toString(36).slice(2,8)}`, isFlower: false }
}
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

const deck = buildDeck()
const hand: Tile[] = []
let idx = 0
while (hand.length < 14) {
  const tile = deck[idx++]
  if (!isFlower(tile)) hand.push(tile)
}

const wildCount = hand.filter(t => t.suit === TileSuit.DOTS && t.value === 5).length  // 假设百搭是5筒

// 测量 detectHandTypes (evalWildDeployment 的核心)
const t0 = performance.now()
const N = 100
for (let i = 0; i < N; i++) {
  const nonWild = hand.filter(t => !isWild(t, TileSuit.DOTS, 5))
  detectHandTypes(nonWild, [], false, 0, null)
}
const elapsed = performance.now() - t0
console.log(`detectHandTypes (14 tiles): ${(elapsed/N).toFixed(3)}ms/call, ${N} calls in ${elapsed.toFixed(0)}ms`)

// 测量 canWin
const { canWin } = await import('../server/utils/handValidator')
const t1 = performance.now()
for (let i = 0; i < N; i++) {
  canWin(hand, 0, 'dots-5')
}
const elapsed2 = performance.now() - t1
console.log(`canWin (14 tiles, wildId=dots-5): ${(elapsed2/N).toFixed(3)}ms/call, ${N} calls in ${elapsed2.toFixed(0)}ms`)
