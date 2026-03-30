/**
 * AI 对战模拟器 v3 — 完整规则 + AI-AK 策略迭代
 * 目标：流局率 <30%，胡牌率 >70%
 * 用法: npx tsx scripts/simulate-v3.ts [rounds] [games_per_round]
 */
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

const ROUNDS = parseInt(process.argv[2] || '10')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '200')
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')

// ========== Bot Policy (from character JSON) ==========
interface BotPolicy {
  id: string
  // Win decisions
  selfWinChance: number       // probability to claim self-draw win
  discardHuChance: number     // probability to claim discard win
  selfWinWildBoost: number    // extra chance when wild tiles present
  discardHuWildPenalty: number
  discardHuMenQingPenalty: number
  // Claim decisions
  pengChance: number
  kongChance: number
  chowChance: number
  pengWildBoost: number
  kongWildBoost: number
  chowWildPenalty: number
  // Bailout
  bailoutBuildWildBoost: number
  bailoutHuPenaltyPerMeld: number
  // Honor rush
  honorRushThreshold: number
  honorRushBoost: number
  // Discard scoring
  pairWeight: number
  nearWeight: number
  honorPairBonus: number
  wildKeepPenalty: number
  dominantSuitBonus: number
  tripletKeepBonus: number
  honorTripletKeepBonus: number
  windDragonPairKeepBonus: number
  tripletComboBonus: number
  flushChaseBonus: number
}

const DEFAULT_POLICY: BotPolicy = {
  id: 'default',
  selfWinChance: 0.8, discardHuChance: 0.8,
  selfWinWildBoost: 0.1, discardHuWildPenalty: 0.4, discardHuMenQingPenalty: 0.14,
  pengChance: 0.79, kongChance: 0.47, chowChance: 0.03,
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  bailoutBuildWildBoost: 0.23, bailoutHuPenaltyPerMeld: 0.04,
  honorRushThreshold: 4, honorRushBoost: 0.47,
  pairWeight: 4.0, nearWeight: 3.6, honorPairBonus: 1.34,
  wildKeepPenalty: 1400, dominantSuitBonus: 0,
  tripletKeepBonus: 4.71, honorTripletKeepBonus: 8.94,
  windDragonPairKeepBonus: 11.84, tripletComboBonus: 1.38, flushChaseBonus: 1.94
}

function loadCharacter(name: string): BotPolicy {
  const filePath = path.join(CHAR_DIR, `${name}.json`)
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return { ...DEFAULT_POLICY, ...data.policy, id: data.policy?.id || name }
  } catch (e) {
    console.warn(`[Character] Failed to load ${name}, using default policy`)
    return { ...DEFAULT_POLICY, id: name }
  }
}

function saveCharacter(name: string, policy: BotPolicy, metrics: any): void {
  const filePath = path.join(CHAR_DIR, `${name}.json`)
  const data = {
    savedAt: new Date().toISOString(),
    round: 0,
    metrics,
    policy
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`[Character] Saved ${name} to ${filePath}`)
}

// ========== Tile helpers ==========
function t(suit: TileSuit, v: number, id?: string): Tile {
  return { suit, value: v, id: id || `${suit}-${v}-${Math.random().toString(36).slice(2, 8)}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isWild(t: Tile, ws?: TileSuit, wv?: number): boolean { return ws && wv ? t.suit === ws && t.value === wv : false }
function tKey(t: Tile): string { return `${t.suit}-${t.value}` }

// ========== Config ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']

// ========== Player / Game ==========
interface BotPlayer {
  name: string; pos: number; hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[]
  isBot: boolean; isTing: boolean; score: number
  wildSuit?: TileSuit; wildValue?: number
  kongCount: number
  id: string
  status: 'playing' | 'won'
  winMode?: 'self_draw' | 'discard' | 'kong_draw'
  policy: BotPolicy
}

interface GameState {
  deck: Tile[]; wallIdx: number
  players: BotPlayer[]; current: number
  wildSuit?: TileSuit; wildValue?: number
  discardPile: Tile[]
}

// ========== Build deck (144 tiles: 108 number + 16 wind + 12 dragon + 8 flower) ==========
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

// ========== Setup ==========
function setupGame(): GameState {
  const deck = buildDeck()
  // Pick random wild tile from the deck (non-flower)
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value

  // Load each bot's character policy
  const policies = AI_NAMES.map(name => loadCharacter(name))

  const players = AI_NAMES.map((name, i) => ({
    name, pos: i, hand: [] as Tile[], exposedMelds: [] as Meld[], flowerTiles: [] as Tile[],
    isBot: true, isTing: false, score: 0, wildSuit: ws, wildValue: wv, kongCount: 0, id: `p${i}`,
    status: 'playing' as const,
    policy: policies[i]
  }))

  return { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [] }
}

function drawTile(g: GameState, p: BotPlayer): Tile | null {
  if (g.wallIdx >= g.deck.length) return null
  const tile = g.deck[g.wallIdx++]
  if (isFlower(tile)) {
    p.flowerTiles.push(tile)
    return drawTile(g, p) // auto-draw again
  }
  p.hand.push(tile)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer) { return buildWildTileChecker(p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null) }

// ========== Meld detection ==========
function canPeng(p: BotPlayer, tile: Tile): boolean {
  return p.hand.filter(t => tileEq(t, tile)).length >= 2
}

function canChow(p: BotPlayer, tile: Tile): boolean {
  if (isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const v = tile.value
  if (v < 2 || v > 8) return false
  const low = p.hand.some(t => t.suit === tile.suit && t.value === v - 1)
  const high = p.hand.some(t => t.suit === tile.suit && t.value === v + 1)
  return low && high
}

function canMingKong(p: BotPlayer, tile: Tile): boolean {
  return p.hand.filter(t => tileEq(t, tile)).length >= 3
}

function canAnKong(p: BotPlayer): Tile[] {
  const groups = groupTiles(p.hand)
  const result: Tile[] = []
  for (const [k, tiles] of groups) {
    if (tiles.length === 4) result.push(tiles[0])
  }
  return result
}

function canJiaGang(p: BotPlayer): Tile[] {
  const result: Tile[] = []
  for (const meld of p.exposedMelds) {
    if (meld.type === MeldType.TRIPLET) {
      const have4 = p.hand.find(t => tileEq(t, meld.tiles[0]))
      if (have4) result.push(have4)
    }
  }
  return result
}

// ========== Apply melds ==========
function applyPeng(p: BotPlayer, tile: Tile, sourceIdx?: number): void {
  const matches = p.hand.filter(t => tileEq(t, tile))
  const used = matches.slice(0, 2)
  for (const u of used) {
    const idx = p.hand.findIndex(rt => rt.id === u.id)
    if (idx >= 0) p.hand.splice(idx, 1)
  }
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
}

function applyChow(p: BotPlayer, tile: Tile): void {
  const v = tile.value
  const low = p.hand.find(t => t.suit === tile.suit && t.value === v - 1)!
  const high = p.hand.find(t => t.suit === tile.suit && t.value === v + 1)!
  // Remove from hand
  const idxL = p.hand.findIndex(t => t.id === low.id)
  if (idxL >= 0) p.hand.splice(idxL, 1)
  const idxH = p.hand.findIndex(t => t.id === high.id)
  if (idxH >= 0) p.hand.splice(idxH, 1)
  p.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: [low, tile, high], isConcealed: false })
}

function applyMingKong(p: BotPlayer, tile: Tile): void {
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 3)
  for (const u of matches) {
    const idx = p.hand.findIndex(rt => rt.id === u.id)
    if (idx >= 0) p.hand.splice(idx, 1)
  }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: false })
  p.kongCount++
}

function applyAnKong(p: BotPlayer, tile: Tile): void {
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
  p.kongCount++
}

function applyJiaGang(p: BotPlayer, tile: Tile): void {
  const meld = p.exposedMelds.find(m => m.type === MeldType.TRIPLET && tileEq(m.tiles[0], tile))!
  meld.type = MeldType.KONG
  meld.tiles = [tile, tile, tile, tile]
  meld.isConcealed = false
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  p.kongCount++
}

// ========== Scoring ==========
function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean): number {
  const types = detectHandTypes(p.hand, p.exposedMelds, isSelfDraw, p.flowerTiles.length,
    p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null)
  const result = calculateScore({
    handTiles: p.hand, exposedMelds: p.exposedMelds,
    flowerTiles: p.flowerTiles,
    handTypes: types,
    isSelfDrawn: isSelfDraw,
    isKongFlower: isKongWin,
    isRobbingKong: false,
    isMenQing: p.exposedMelds.length === 0,
    wildTileSuit: p.wildSuit, wildTileValue: p.wildValue,
    roundMultiplier: 1, globalMultiplier: 1
  })
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== AI Discard ==========
// Policy-based discard (inspired by old simulate.ts that achieved 85%+ win rate)
function aiDiscard(p: BotPlayer): Tile {
  const wt = makeWT(p)
  // Use the bot's character policy for discard scoring
  const policy = p.policy

  const candidates: { tile: Tile; keepScore: number }[] = []
  for (const tile of p.hand) {
    if (isFlower(tile)) continue
    let keepScore = 0
    const count = p.hand.filter(t => tileEq(t, tile)).length
    const sameSuit = p.hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))

    // Pairs & triplets → strongly keep (use character weights)
    if (count >= 2) keepScore += policy.pairWeight
    if (count >= 3) keepScore += policy.tripletKeepBonus

    // Sequence potential (neighbors 1-2 away)
    if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
      const hasLeft = sameSuit.some(t => t.value === tile.value - 1 || t.value === tile.value - 2)
      const hasRight = sameSuit.some(t => t.value === tile.value + 1 || t.value === tile.value + 2)
      if (hasLeft) keepScore += policy.nearWeight
      if (hasRight) keepScore += policy.nearWeight
      // Neighbor count
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      keepScore += neighbors.length * policy.nearWeight * 0.2
    }

    // Honor tiles
    if (isHonor(tile)) {
      if (count >= 2) keepScore += policy.honorPairBonus * policy.pairWeight
      else keepScore -= policy.honorPairBonus * 0.5 // honor singles → discard
    }

    // Honor triplet keep bonus
    if (isHonor(tile) && count >= 3) {
      keepScore += policy.honorTripletKeepBonus
    }

    // Wind/Dragon pair keep bonus
    if ((tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON) && count >= 2) {
      keepScore += policy.windDragonPairKeepBonus
    }

    // Terminals
    if (tile.value === 1 || tile.value === 9) {
      // Unless isolated
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      if (neighbors.length === 0) keepScore -= policy.nearWeight
    }

    // Dominant suit bonus
    if (policy.dominantSuitBonus > 0) {
      const suitCount = p.hand.filter(t => t.suit === tile.suit).length
      if (suitCount >= 5) keepScore += policy.dominantSuitBonus
    }

    // Flush chase bonus
    if (policy.flushChaseBonus > 0) {
      const suitTiles = p.hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))
      if (suitTiles.length >= 6) keepScore += policy.flushChaseBonus
    }

    // Wild tile → never discard
    if (isWT(tile, p)) keepScore += policy.wildKeepPenalty

    candidates.push({ tile, keepScore })
  }

  // HIGHEST keepScore = most valuable = KEPT
  // LOWEST keepScore = least valuable = DISCARDED
  candidates.sort((a, b) => a.keepScore - b.keepScore)
  return candidates[0]?.tile || p.hand[0]
}

// ========== Game Loop ==========
function nextPlaying(players: BotPlayer[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length
    if (players[i].status === 'playing') return i
  }
  return from
}

interface GameResult {
  winners: Array<{ index: number; huType: string }>
  scores: number[]
  reason: string
  selfDrawCount: number
  discardCount: number
}
function runGame(): { winner: number; huType: string; scores: number[] } | null {
  const g = setupGame()

  // Deal 13 tiles each
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 4; p++) drawTile(g, g.players[p])
  }

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]

    // Draw
    const drawn = drawTile(g, player)
    if (!drawn) return null // wall empty

    // Auto-draw flower
    if (isFlower(drawn)) continue

    // Check self-draw win (policy-driven)
    if (canWin(player.hand.filter(t => t !== undefined), player.exposedMelds.length, makeWT(player)).canWin) {
      let winChance = player.policy.selfWinChance
      // Boost if wild tiles present (bigger hand)
      const wildCount = player.hand.filter(t => isWT(t, player)).length
      winChance += wildCount * player.policy.selfWinWildBoost
      // Penalty if many exposed melds (bailout)
      winChance -= player.exposedMelds.length * player.policy.bailoutHuPenaltyPerMeld
      if (Math.random() < winChance) {
        return { winner: curr, huType: 'self_draw', scores: g.players.map(p => p.score) }
      }
    }

    // AnKong / JiaGang check
    for (const ak of canAnKong(player)) {
      applyAnKong(player, ak)
      // After kong, draw again
      const extra = drawTile(g, player)
      if (extra && !isFlower(extra)) {
        if (canWin(player.hand, player.exposedMelds.length, makeWT(player)).canWin) {
          return { winner: curr, huType: 'self_draw', scores: g.players.map(p => p.score) } // kong flower win
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      applyJiaGang(player, jg)
      const extra = drawTile(g, player)
      if (extra && !isFlower(extra)) {
        if (canWin(player.hand, player.exposedMelds.length, makeWT(player)).canWin) {
          return { winner: curr, huType: 'self_draw', scores: g.players.map(p => p.score) }
        }
      }
    }

    // Update ting status
    player.isTing = isTing(player.hand, player.exposedMelds.length, makeWT(player))

    // Discard
    const discard = aiDiscard(player)
    player.hand = player.hand.filter(t => t.id !== discard.id)
    g.discardPile.push(discard)

    // Others respond: check chow > check peng > check hu
    // Priority: hu > peng > chow
    // But if multiple players want peng, the first in turn order gets priority
    // If hu is possible, hu always takes priority

    // 1. Check hu for all others
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      // Temporarily add discarded tile to check win
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWin(testHand, opp.exposedMelds.length, makeWT(opp)).canWin) {
        // Policy-driven discard win decision
        let huChance = opp.policy.discardHuChance
        const wildCount = opp.hand.filter(t => isWT(t, opp)).length
        huChance -= wildCount * opp.policy.discardHuWildPenalty
        if (opp.exposedMelds.length === 0) huChance -= opp.policy.discardHuMenQingPenalty
        if (Math.random() < huChance) {
          const score = calcScore(opp, false, false)
          opp.score += score
          player.score -= score
          return { winner: other, huType: 'discard', scores: g.players.map(p => p.score) }
        }
      }
    }

    // 2. Check peng (next player in turn order)
    // Priority: next player > previous player > opposite
    const nextPlayer = (curr + 1) % 4
    const prevPlayer = (curr + 3) % 4
    const oppositePlayer = (curr + 2) % 4

    for (const otherIdx of [nextPlayer, prevPlayer, oppositePlayer]) {
      const opp = g.players[otherIdx]
      if (canPeng(opp, discard)) {
        // Policy-driven peng decision
        let pengChance = opp.policy.pengChance
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue) {
          pengChance += opp.policy.pengWildBoost
        }
        if (Math.random() < pengChance) {
          applyPeng(opp, discard)
          // Draw and discard again (if we're still in game)
          const d = drawTile(g, opp)
          if (!d) return null
          if (canWin(opp.hand, opp.exposedMelds.length, makeWT(opp)).canWin) {
            return { winner: otherIdx, huType: 'self_draw', scores: g.players.map(p => p.score) }
          }
          // AnKong check after draw
          for (const ak of canAnKong(opp)) {
            applyAnKong(opp, ak)
            const extra = drawTile(g, opp)
            if (extra && !isFlower(extra)) {
              if (canWin(opp.hand, opp.exposedMelds.length, makeWT(opp)).canWin) {
                return { winner: otherIdx, huType: 'self_draw', scores: g.players.map(p => p.score) }
              }
            }
          }
          const pengDiscard = aiDiscard(opp)
          opp.hand = opp.hand.filter(t => t.id !== pengDiscard.id)
          g.discardPile.push(pengDiscard)
          // Next turn: the person who just discarded becomes next
          g.current = otherIdx
          continue
        } // end pengChance check
      }
    }

    // 3. Check chow (only next player in turn order) - policy driven
    const nextP = g.players[nextPlayer]
    if (canChow(nextP, discard) && Math.random() < nextP.policy.chowChance) {
      applyChow(nextP, discard)
      // Draw after chow
      const d = drawTile(g, nextP)
      if (!d) return null
      if (canWin(nextP.hand, nextP.exposedMelds.length, makeWT(nextP)).canWin) {
        return { winner: nextPlayer, huType: 'self_draw', scores: g.players.map(p => p.score) }
      }
      // AnKong check
      for (const ak of canAnKong(nextP)) {
        applyAnKong(nextP, ak)
        const extra = drawTile(g, nextP)
        if (extra && !isFlower(extra)) {
          if (canWin(nextP.hand, nextP.exposedMelds.length, makeWT(nextP)).canWin) {
            return { winner: nextPlayer, huType: 'self_draw', scores: g.players.map(p => p.score) }
          }
        }
      }
      const chowDiscard = aiDiscard(nextP)
      nextP.hand = nextP.hand.filter(t => t.id !== chowDiscard.id)
      g.discardPile.push(chowDiscard)
      g.current = nextPlayer
      continue
    }

    // Next player's turn
    g.current = nextPlayer
    consecutiveDraws++
    if (consecutiveDraws > MAX_ROUNDS * 4) return null // safety
  }

  return null
}

// ========== Run Batch ==========
interface RoundResult {
  scores: Record<string, number>
  wins: Record<string, number>
  draws: number
}

function runRound(roundNum: number, gpr: number): RoundResult {
  const scores: Record<string, number> = {}
  const wins: Record<string, number> = {}
  for (const n of AI_NAMES) { scores[n] = 0; wins[n] = 0 }

  let draws = 0

  for (let g = 0; g < gpr; g++) {
    const result = runGame()
    if (result) {
      const winner = AI_NAMES[result.winner]
      wins[winner]++
      // Use internal game scores (reflects actual payment from loser(s) to winner)
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += result.scores[i] * SETTLEMENT_MULT
      }
    } else {
      draws++
      // Draw: no score change (stake returned)
    }
  }

  console.log()
  console.log(`Round ${roundNum}: ` + AI_NAMES.map(n => {
    const wr = (wins[n] / gpr * 100).toFixed(1)
    return `${n.padEnd(8)} ${scores[n].toString().padStart(6)}  wins:${wr}%`
  }).join(' | '))
  console.log(`  Draws: ${draws}/${gpr} (${(draws/gpr*100).toFixed(1)}%)`)

  return { scores, wins, draws }
}

// ========== Main ==========
function main() {
  console.log('===========================================')
  console.log('  AI Simulation v3 - Complete Rules')
  console.log('===========================================')
  console.log(`Config: ${ROUNDS} rounds x ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`)

  const totalScores: Record<string, number> = {}
  const totalWins: Record<string, number> = {}
  for (const n of AI_NAMES) { totalScores[n] = 0; totalWins[n] = 0 }

  for (let r = 1; r <= ROUNDS; r++) {
    const result = runRound(r, GAMES_PER_ROUND)
    for (const n of AI_NAMES) {
      totalScores[n] += result.scores[n]
      totalWins[n] += result.wins[n]
    }
  }

  console.log()
  console.log('===========================================')
  console.log(`  GRAND TOTAL (${ROUNDS * GAMES_PER_ROUND} games)`)
  console.log('===========================================')
  const sorted = [...AI_NAMES].sort((a, b) => totalScores[b] - totalScores[a])
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]
    const wr = (totalWins[n] / (ROUNDS * GAMES_PER_ROUND) * 100).toFixed(1)
    console.log(`  ${i+1}. ${n.padEnd(8)} ${totalScores[n].toString().padStart(8)}  wins:${wr}%`)
  }
}

main()
