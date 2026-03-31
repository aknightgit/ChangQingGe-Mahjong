import {
  shuffleTiles, isFlower, groupTiles, sortTiles, tilesEqual
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType, isTing
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { TileSuit, MeldType, WinType, type Tile, type Meld } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const GAMES = 200
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const DEFAULT_POLICY = JSON.parse(fs.readFileSync(`${CHAR_DIR}/AI-AK.json`, 'utf-8')).policy

// Load AK policy for all 4
function loadPolicy() { return { ...DEFAULT_POLICY } }

function t2(suit: TileSuit, v: number, id?: string): Tile {
  return { suit, value: v, id: id || `${suit}-${v}-${Math.random().toString(36).slice(2, 8)}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { if (!a || !b) return false; return a.suit === b.suit && a.value === b.value }
function isWild(t: Tile, ws?: TileSuit, wv?: number): boolean { return ws && wv ? t.suit === ws && t.value === wv : false }

const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t2(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t2(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t2(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

// Simple game runner - just check draw rate, win rate
let totalGames = 0, totalWins = 0, totalDraws = 0
let selfDraws = 0, discardWins = 0
let bloodBattles = 0 // games where >1 player won
let bigHands = 0
let closedWins = 0

for (let g = 0; g < GAMES; g++) {
  const deck = buildDeck()
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value

  const policy = loadPolicy()
  const players = AI_NAMES.map((name, i) => ({
    name, pos: i, hand: [] as Tile[], exposedMelds: [] as Meld[], flowerTiles: [] as Tile[],
    isBot: true, isTing: false, score: 0, wildSuit: ws, wildValue: wv, kongCount: 0, id: `p${i}`,
    status: 'playing' as const, policy,
    meldSources: [0, 0, 0, 0], discardedTiles: [] as Tile[]
  }))

  let wallIdx = 0
  let current = 0
  let gameMultiplier = 1 + Math.floor(Math.random() * 8)
  let winners: any[] = []
  let round = 0
  const MAX_ROUNDS = 200

  function drawTile2(p: typeof players[0]): Tile | null {
    if (wallIdx >= deck.length) return null
    const tile = deck[wallIdx++]
    if (!tile) return drawTile2(p)
    if (tile.isFlower) { p.flowerTiles.push(tile); return drawTile2(p) }
    p.hand.push(tile)
    return tile
  }

  // Deal
  for (let d = 0; d < 13; d++) {
    for (let p = 0; p < 4; p++) {
      drawTile2(players[p])
    }
  }

  // Play
  while (winners.length < 3 && wallIdx < deck.length - 14 && round < MAX_ROUNDS) {
    const p = players[current]
    if (p.status === 'won') { current = (current + 1) % 4; round++; continue }

    const drawn = drawTile2(p)
    if (!drawn) break

    // Check self-win
    const wildStr = `${ws}-${wv}`
    const wc = buildWildTileChecker(wildStr)
    const winResult = canWin(p.hand, p.exposedMelds.length, p.kongCount, wc)
    if (winResult.canWin && Math.random() < p.policy.selfWinChance) {
      p.status = 'won'
      p.winMode = 'self_draw'
      winners.push(p)
      selfDraws++
      // Simple scoring
      totalWins++
      // Check if big hand
      try {
        const types = detectHandTypes(p.hand, p.exposedMelds, ws, wv)
        if (types.some(t => t === HandType.ALL_PUNGS || t === HandType.PURE_STRAIGHT || 
            t === HandType.ALL_HONORS || t === HandType.HONOR_PUNGS)) {
          bigHands++
        }
        if (p.exposedMelds.length === 0) closedWins++
      } catch(e) {}
      current = (current + 1) % 4
      round++
      continue
    }

    // Discard
    if (p.hand.length > 0) {
      const discardIdx = Math.floor(Math.random() * p.hand.length)
      const discarded = p.hand.splice(discardIdx, 1)[0]
      p.discardedTiles.push(discarded)

      // Check if other players can win on this discard
      for (let oi = 1; oi < 4; oi++) {
        const opp = players[(current + oi) % 4]
        if (opp.status === 'won') continue
        const owc = buildWildTileChecker(wildStr)
        const owr = canWin([...opp.hand, discarded], opp.exposedMelds.length, opp.kongCount, owc)
        if (owr.canWin && Math.random() < opp.policy.discardHuChance) {
          opp.status = 'won'
          opp.winMode = 'discard'
          winners.push(opp)
          discardWins++
          totalWins++
          try {
            const types = detectHandTypes([...opp.hand, discarded], opp.exposedMelds, ws, wv)
            if (types.some(t => t === HandType.ALL_PUNGS || t === HandType.PURE_STRAIGHT || 
                t === HandType.ALL_HONORS || t === HandType.HONOR_PUNGS)) {
              bigHands++
            }
            if (opp.exposedMelds.length === 0) closedWins++
          } catch(e) {}
          break
        }
      }
    }

    current = (current + 1) % 4
    round++
  }

  totalGames++
  if (winners.length === 0) totalDraws++
  if (winners.length > 1) bloodBattles++
}

const winRate = ((totalWins / totalGames) * 100).toFixed(1)
const drawRate = ((totalDraws / totalGames) * 100).toFixed(1)
const selfDrawRate = totalWins > 0 ? ((selfDraws / totalWins) * 100).toFixed(1) : '0'
const discardRate = totalWins > 0 ? ((discardWins / totalWins) * 100).toFixed(1) : '0'
const bloodRate = totalWins > 0 ? ((bloodBattles / totalWins) * 100).toFixed(1) : '0'
const bigHandRate = totalWins > 0 ? ((bigHands / totalWins) * 100).toFixed(1) : '0'
const closedRate = totalWins > 0 ? ((closedWins / totalWins) * 100).toFixed(1) : '0'

console.log(`=== ${GAMES}局基线评估 (4人共用AK策略) ===`)
console.log(`总局数: ${totalGames}`)
console.log(`胡牌局: ${totalWins} (${winRate}%) [目标: >=90%]`)
console.log(`流局: ${totalDraws} (${drawRate}%) [目标: <10%]`)
console.log(`自摸: ${selfDraws} (${selfDrawRate}%) [目标: 40-60%]`)
console.log(`捉冲: ${discardWins} (${discardRate}%) [目标: 40-60%]`)
console.log(`血战: ${bloodBattles} (${bloodRate}%) [目标: >80%]`)
console.log(`大牌: ${bigHands} (${bigHandRate}%) [目标: 3-8%]`)
console.log(`门清: ${closedWins} (${closedRate}%) [目标: 7-12%]`)
