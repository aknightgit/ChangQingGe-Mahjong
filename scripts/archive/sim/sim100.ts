import { canWin, buildWildTileChecker, detectHandTypes, HandType } from '../server/utils/handValidator'
import { TileSuit, type Tile, type Meld, MeldType } from '../server/types/game'
import { shuffleTiles, isFlower } from '../server/utils/tiles'
import { randomUUID } from 'crypto'

const TOTAL_GAMES = parseInt(process.argv[2] || '100')
const AI_NAMES = ['AI-张三', 'AI-李四', 'AI-王五', 'AI-赵六']
const MAX_TURNS = 500

function mkTile(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${randomUUID()}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(mkTile(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}-${randomUUID()}`, isFlower: true })
  return d
}

interface Player {
  id: string; name: string
  hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[]
  won: boolean
}

interface Game {
  players: Player[]; wall: Tile[]; wallIdx: number
  wildSuit: TileSuit; wildValue: number
  currentTurn: number; lastDiscard: Tile | null; lastDiscardFrom: number
  turnCount: number; drawBeforeDiscard: boolean
}

function initGame(): Game {
  const deck = buildDeck()
  const players: Player[] = AI_NAMES.map((name, i) => ({
    id: `p${i}`, name, hand: [], exposedMelds: [], flowerTiles: [], won: false
  }))
  let idx = 0
  for (let p = 0; p < 4; p++) {
    for (let j = 0; j < 13; j++) {
      while (isFlower(deck[idx])) idx++
      players[p].hand.push(deck[idx++])
    }
  }
  while (isFlower(deck[idx])) idx++
  players[0].hand.push(deck[idx++])

  const wall: Tile[] = []
  for (let i = idx; i < deck.length; i++) {
    if (!isFlower(deck[i])) wall.push(deck[i])
  }

  // Find wild tile
  const nonFlower = deck.filter(t => !isFlower(t))
  // Use a random wild tile for testing (but for canWin we test with null wild)
  const wf = nonFlower[Math.floor(Math.random() * nonFlower.length) % nonFlower.length]

  return {
    players, wall, wallIdx: 0,
    wildSuit: wf.suit as TileSuit, wildValue: wf.value,
    currentTurn: 0, lastDiscard: null, lastDiscardFrom: -1,
    turnCount: 0, drawBeforeDiscard: true
  }
}

function drawTile(game: Game, player: Player): Tile | null {
  if (game.wallIdx >= game.wall.length) return null
  const t = game.wall[game.wallIdx++]
  if (isFlower(t)) { player.flowerTiles.push(t); return drawTile(game, player) }
  player.hand.push(t)
  return t
}

function checkWin(hand: Tile[], exposedMelds: Meld[], meldCount: number): boolean {
  return canWin(hand, meldCount, buildWildTileChecker(null)).canWin
}

function canChowWith(player: Player, tile: Tile, discardFromIdx: number): [number, number] | null {
  // Must be from upper player (player position = discard position + 1 mod 4)
  if (!(player.position === (discardFromIdx + 1) % 4)) return null
  if (isHonor(tile)) return null

  const v = tile.value, suit = tile.suit
  for (let i = 0; i < player.hand.length; i++) {
    for (let j = i + 1; j < player.hand.length; j++) {
      const t1 = player.hand[i], t2 = player.hand[j]
      if (t1.suit !== suit || t2.suit !== suit) continue
      const vals = [t1.value, t2.value, v].sort((a, b) => a - b)
      if (vals[0] === vals[1] - 1 && vals[1] === vals[2] - 1 && vals[0] >= 1 && vals[2] <= 9) {
        return [i, j]
      }
    }
  }
  return null
}

function canPengWith(player: Player, tile: Tile): [number, number] | null {
  let indices: number[] = []
  for (let i = 0; i < player.hand.length && indices.length < 2; i++) {
    if (tileEq(player.hand[i], tile)) indices.push(i)
  }
  return indices.length === 2 ? [indices[0], indices[1]] as [number, number] : null
}

// ═══ Play one game with proper state management ═══
function playGame(): { winner: string | null; handType: string; turns: number; chows: number; pungs: number } {
  const game = initGame()
  let chows = 0, pungs = 0
  // drawBeforeDiscard=true for all players (normal flow)

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    game.turnCount = turn + 1
    const pi = game.currentTurn
    const p = game.players[pi]
    if (p.won) break

    // ── Draw ──
    const drawn = drawTile(game, p)
    if (!drawn) return { winner: null, handType: 'wall_exhausted', turns: turn, chows, pungs }

    // ── Check self-win ──
    const meldCount = p.exposedMelds.length
    if (checkWin(p.hand, p.exposedMelds, meldCount)) {
      const types = detectHandTypes(p.hand, p.exposedMelds, true, p.flowerTiles.length, null, [])
      return { winner: p.name, handType: types.length > 0 ? types[0] : 'standard', turns: turn + 1, chows, pungs }
    }

    // ── Discard ──
    // Simple strategy: discard isolated tile
    let bestIdx = 0, bestScore = 999
    for (let i = 0; i < p.hand.length; i++) {
      const t = p.hand[i]
      let adj = 0
      for (let j = 0; j < p.hand.length; j++) {
        if (i === j) continue
        if (t.suit !== TileSuit.FLOWER && t.suit === p.hand[j].suit && Math.abs(t.value - p.hand[j].value) <= 2) adj++
      }
      if (adj < bestScore) { bestScore = adj; bestIdx = i }
    }
    game.lastDiscard = p.hand.splice(bestIdx, 1)[0]
    game.lastDiscardFrom = pi

    // ── Check claim (for next players: peng > chow > discard win) ──
    let claimed = false
    for (let offset = 1; offset < 4; offset++) {
      const claimIdx = (pi + offset) % 4
      const claimer = game.players[claimIdx]
      if (claimer.won) continue

      // Check discard win (捉冲) - all players can claim
      if (checkWin([...claimer.hand, game.lastDiscard], claimer.exposedMelds, claimer.exposedMelds.length)) {
        claimer.hand.push(game.lastDiscard)
        const types = detectHandTypes(claimer.hand, claimer.exposedMelds, false, claimer.flowerTiles.length, null, [])
        return { winner: claimer.name, handType: types.length > 0 ? types[0] : 'standard', turns: turn + 1, chows, pungs }
      }

      // Check peng
      const pengIdx = canPengWith(claimer, game.lastDiscard)
      if (pengIdx) {
        claimer.hand.splice(pengIdx[1], 1)
        claimer.hand.splice(pengIdx[0], 1)
        claimer.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [mkTile(game.lastDiscard.suit, game.lastDiscard.value), mkTile(game.lastDiscard.suit, game.lastDiscard.value), mkTile(game.lastDiscard.suit, game.lastDiscard.value)],
          isConcealed: false
        })
        claimed = true
        game.currentTurn = claimIdx
        break
      }

      // Check chow (only from upper player)
      const chowIdx = canChowWith(claimer, game.lastDiscard, pi)
      if (chowIdx) {
        claimer.hand.splice(chowIdx[1], 1)
        claimer.hand.splice(chowIdx[0], 1)
        claimer.exposedMelds.push({
          type: MeldType.SEQUENCE,
          tiles: [game.lastDiscard],
          isConcealed: false
        })
        chows++
        claimed = true
        game.currentTurn = claimIdx
        break
      }
    }

    if (claimed) continue

    // ── Next player ──
    game.currentTurn = (pi + 1) % 4
  }

  return { winner: null, handType: 'exhausted', turns: MAX_TURNS, chows, pungs }
}

// ═══ Run games ═══
const winCount: Record<string, number> = {}
const typeCount: Record<string, number> = {}
let totalWins = 0, totalDraws = 0, totalChows = 0, totalPungs = 0
const turnList: number[] = []

for (let i = 0; i < TOTAL_GAMES; i++) {
  const result = playGame()
  if (result.winner) {
    totalWins++
    winCount[result.winner] = (winCount[result.winner] || 0) + 1
    typeCount[result.handType] = (typeCount[result.handType] || 0) + 1
    turnList.push(result.turns)
  } else {
    totalDraws++
  }
  totalChows += result.chows
  totalPungs += result.pungs
}

console.log(`🀄️ 模拟测试: ${TOTAL_GAMES}局 | 4AI`)
console.log(`═════════════════════════════════`)
console.log(`胡牌率: ${totalWins}/${TOTAL_GAMES} (${(totalWins/TOTAL_GAMES*100).toFixed(1)}%)`)
console.log(`流局: ${totalDraws}`)
console.log(`总吃牌: ${totalChows}次 | 总碰牌: ${totalPungs}次`)
console.log()
console.log('🃏 胡牌牌型:')
for (const [t, c] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${c}`)
}
console.log()
console.log('👤 各玩家:')
for (const [n, c] of Object.entries(winCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}: ${c}次`)
}
const avgTurn = turnList.length > 0 ? (turnList.reduce((a, b) => a + b, 0) / turnList.length).toFixed(1) : 'N/A'
console.log(`\n平均胡牌步数: ${avgTurn}`)
