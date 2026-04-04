import { canWin, buildWildTileChecker } from '../server/utils/handValidator'
import { TileSuit } from '../server/types/game'
import type { Tile } from '../server/types/game'
import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { randomUUID } from 'crypto'

function mkTile(s: TileSuit, v: number): Tile {
  return { suit: s, value: v, id: `${s}-${v}-${randomUUID()}`, isFlower: false }
}

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(mkTile(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return d
}

const AI_NAMES = ['P0', 'P1', 'P2', 'P3']
const MAX_TURNS = 500

interface BotPlayer {
  id: string; name: string; position: number
  hand: Tile[]; exposedMelds: any[]; flowerTiles: Tile[]
  status: 'playing' | 'won'
  winMode?: string
}

interface GState { players: BotPlayer[]; wall: Tile[]; wallIdx: number; wildSuit?: TileSuit; wildValue?: number; discardPile: Tile[]; currentTurnIdx: number }
let G: GState

function setupGame() {
  const deck = buildDeck()
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value

  const players = AI_NAMES.map((name, i) => ({
    id: `p${i}`, name, position: i,
    hand: [] as Tile[], exposedMelds: [] as any[], flowerTiles: [] as Tile[],
    status: 'playing' as const, winMode: undefined
  }))

  let idx = 0
  for (let p = 0; p < 4; p++) {
    for (let j = 0; j < 13; j++) {
      const t = deck[idx++]
      if (isFlower(t)) { players[p].flowerTiles.push(t); j--; continue }
      players[p].hand.push(t)
    }
  }

  const wall: Tile[] = []
  for (let i = idx; i < deck.length; i++) if (!isFlower(deck[i])) wall.push(deck[i])

  // Dealer draws 14th tile
  if (wall.length > 0) players[0].hand.push(wall[0])

  console.log('Initial hands:', players.map(p => `${p.name}=${p.hand.length}`))
  console.log('Deck remaining:', deck.length - idx, '- wall size:', wall.length)
  
  return { players, wall, wallIdx: 1, wildSuit: ws, wildValue: wv, discardPile: [], currentTurnIdx: 0 }
}

function drawFromWall(p: BotPlayer): Tile | null {
  if (G.wallIdx >= G.wall.length) return null
  const t = G.wall[G.wallIdx++]
  if (isFlower(t)) { p.flowerTiles.push(t); return drawFromWall(p) }
  p.hand.push(t)
  return t
}

function selectDiscard(p: BotPlayer): Tile {
  let bestIdx = 0, bestScore = 999
  const hand = p.hand
  for (let i = 0; i < hand.length; i++) {
    const t = hand[i]
    let score = 0
    for (let j = 0; j < hand.length; j++) {
      if (i === j) continue
      if (t.suit !== TileSuit.FLOWER && t.suit === hand[j].suit && Math.abs(t.value - hand[j].value) <= 2) score++
    }
    if (score < bestScore) { bestScore = score; bestIdx = i }
  }
  return hand[bestIdx]
}

// Simulate 5 games
for (let game = 0; game < 5; game++) {
  G = setupGame()
  let turns = 0
  let won = false
  
  while (turns < MAX_TURNS && !won) {
    turns++
    const pi = G.currentTurnIdx
    const p = G.players[pi]
    if (p.status !== 'playing') { G.currentTurnIdx = (pi + 1) % 4; continue }

    // Check self-win BEFORE draw
    const wtStr = G.wildSuit && G.wildValue ? `${G.wildSuit}-${G.wildValue}` : null
    const cw = canWin(p.hand, 0, buildWildTileChecker(wtStr))
    if (cw.canWin) {
      console.log(`Game ${game+1}: ${p.name} WINS BEFORE DRAW at turn ${turns} (hand=${p.hand.length} tiles)`)
      console.log(`  Hand: ${p.hand.map(t => `${t.suit}-${t.value}`).join(' ')}`)
      won = true
      break
    }

    // Draw
    const drawn = drawFromWall(p)
    if (!drawn) { console.log(`Game ${game+1}: WALL EMPTY at turn ${turns}`); break }
    console.log(`  ${p.name}: ${p.hand.length} tiles after draw`)

    // Check self-win AFTER draw
    const cw2 = canWin(p.hand, 0, buildWildTileChecker(wtStr))
    if (cw2.canWin) {
      console.log(`Game ${game+1}: ${p.name} WINS AFTER DRAW at turn ${turns} (hand=${p.hand.length} tiles)`)
      won = true
      break
    }

    // Discard
    const discTile = selectDiscard(p)
    const dIdx = p.hand.findIndex(t => t.id === discTile.id)
    if (dIdx >= 0) p.hand.splice(dIdx, 1)
    G.discardPile.push(discTile)
    G.currentTurnIdx = (pi + 1) % 4
  }
  
  if (!won) console.log(`Game ${game+1}: no win in ${MAX_TURNS} turns`)
  console.log('---')
}
