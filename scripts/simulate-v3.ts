/**
 * AI 对战模拟器 v3 — 完整规则 + AI-AK 策略迭代
 * Features: 百搭牌, 花牌, 完整计分, 暗杠/明杠/补杠, AI-AK 策略自适应
 * 用法: npx tsx scripts/simulate-v3.ts [rounds] [games_per_round]
 */
import fs from 'fs'
import path from 'path'
import {
  createDeck, shuffleTiles, isFlower, groupTiles, sortTiles,
  TileSuit
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { Tile, MeldType, type Meld } from '../server/types/game'

// ========== Config ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']
const SETTLEMENT_MULT = 10
const ROUNDS = parseInt(process.argv[2] || '5')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '200')

// ========== AI Policy ==========
interface AIPolicy {
  selfWinChance: number
  selfWinWildBoost: number
  discardHuChance: number
  discardHuWildPenalty: number
  discardHuMenQingPenalty: number
  pengChance: number
  kongChance: number
  chowChance: number
  pengWildBoost: number
  kongWildBoost: number
  chowWildPenalty: number
  honorRushThreshold: number
  honorRushBoost: number
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

let currentPolicy: AIPolicy = {
  selfWinChance: 0.8355,
  selfWinWildBoost: 0.0957,
  discardHuChance: 0.9387,
  discardHuWildPenalty: 0.3198,
  discardHuMenQingPenalty: 0.2067,
  pengChance: 0.8113,
  kongChance: 0.4367,
  chowChance: 0.1591,
  pengWildBoost: 0,
  kongWildBoost: 0.0693,
  chowWildPenalty: 0.1132,
  honorRushThreshold: 2,
  honorRushBoost: 0.4264,
  pairWeight: 4.1499,
  nearWeight: 2.168,
  honorPairBonus: 2.3602,
  wildKeepPenalty: 1491.66,
  dominantSuitBonus: 0,
  tripletKeepBonus: 3.8235,
  honorTripletKeepBonus: 7,
  windDragonPairKeepBonus: 10.9668,
  tripletComboBonus: 2.7776,
  flushChaseBonus: 1.3572,
}

function loadAKPolicy(): void {
  const cp = path.resolve(process.cwd(), 'AI_policies/characters/AI-AK.json')
  if (fs.existsSync(cp)) {
    const data = JSON.parse(fs.readFileSync(cp, 'utf-8'))
    if (data.policy) Object.assign(currentPolicy, data.policy)
  }
}

function saveAKPolicy(): void {
  const cp = path.resolve(process.cwd(), 'AI_policies/characters/AI-AK.json')
  const data = JSON.parse(fs.readFileSync(cp, 'utf-8'))
  data.policy = { ...currentPolicy }
  data.metrics = {
    huRate: currentMetrics.huRate,
    selfDrawRate: currentMetrics.selfDrawRate,
    lastPlayerRate: currentMetrics.lastPlayerRate,
    avgScore: currentMetrics.avgScore,
  }
  data.savedAt = new Date().toISOString()
  fs.writeFileSync(cp, JSON.stringify(data, null, 2))
}

// ========== Metrics tracking ==========
interface RoundMetrics {
  round: number
  scores: Record<string, number>
  winCounts: Record<string, number>
  selfDrawCounts: Record<string, number>
  huByDiscardCounts: Record<string, number>
  avgScore: Record<string, number>
  ranks: string[]
  adjustments: string[]
}

let currentMetrics = { huRate: 0, selfDrawRate: 0, lastPlayerRate: 0, avgScore: 0, totalGames: 0 }
const metricsHistory: RoundMetrics[] = []

// ========== Tile helpers ==========
function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isTerminal(t: Tile): boolean {
  return t.suit !== TileSuit.FLOWER && !isHonor(t) && (t.value === 1 || t.value === 9)
}
function tileStr(t: Tile): string { return `${t.suit[0]}${t.value}` }
function cloneTile(t: Tile): Tile { return { suit: t.suit, value: t.value, id: t.id + '_c', isFlower: t.isFlower } }

// ========== Wild tile (百搭) ==========
let wildTile: { suit: TileSuit; value: number } | null = null
let wildTileId: string | null = null
let freezeByPlayer = new Map<number, number>()

function setWildTile(deck: Tile[]): void {
  const nonFlowers = deck.filter(t => !isFlower(t))
  if (nonFlowers.length === 0) return
  const idx = Math.floor(Math.random() * Math.min(nonFlowers.length, 20))
  const chosen = nonFlowers[idx]
  wildTile = { suit: chosen.suit, value: chosen.value }
  wildTileId = `${chosen.suit}-${chosen.value}`
}

function isWild(t: Tile): boolean {
  if (!wildTile) return false
  return t.suit === wildTile.suit && t.value === wildTile.value
}

function wildChecker(): (tile: Tile) => boolean {
  return buildWildTileChecker(wildTileId)
}

// ========== Player state ==========
interface SimPlayer {
  name: string
  hand: Tile[]
  melds: Meld[]
  flowers: Tile[]
  position: number
  isMenQing: boolean
  score: number
}

// ========== Kong detection ==========
function canKong(hand: Tile[]): Tile | null {
  const groups = groupTiles(hand.filter(t => !isFlower(t) && !isWild(t)))
  for (const [, tiles] of groups) { if (tiles.length >= 4) return tiles[0] }
  return null
}

function canExtendedKong(hand: Tile[], melds: Meld[]): Tile | null {
  for (const m of melds) {
    if (m.type === MeldType.TRIPLET) {
      if (hand.some(t => !isWild(t) && tilesEqual(t, m.tiles[0]))) return m.tiles[0]
    }
  }
  return null
}

function canConcealedKong(hand: Tile[]): Tile | null {
  const groups = groupTiles(hand.filter(t => !isFlower(t) && !isWild(t)))
  for (const [, tiles] of groups) { if (tiles.length >= 4) return tiles[0] }
  return null
}

function doKong(hand: Tile[], tile: Tile): { hand: Tile[], meld: Meld } {
  const wildsUsed = hand.filter(t => isWild(t) && tilesEqual(t, tile)).length
  const naturalsNeeded = 4 - wildsUsed
  const naturalTiles = hand.filter(t => !isWild(t) && tilesEqual(t, tile)).slice(0, naturalsNeeded)
  const usedWilds = hand.filter(t => isWild(t) && tilesEqual(t, tile))
  const meldTiles: Tile[] = [...naturalTiles, ...usedWilds.map(t => cloneTile(t))]
  while (meldTiles.length < 4) meldTiles.push({ ...tile, id: `k${meldTiles.length}`, suit: tile.suit, value: tile.value })
  const newHand = hand.filter(t => !tilesEqual(t, tile) || isWild(t))
  return { hand: newHand, meld: { type: MeldType.KONG, tiles: meldTiles.slice(0, 4), isConcealed: false } }
}

function doConcealedKong(hand: Tile[], tile: Tile): { hand: Tile[], meld: Meld } {
  const naturalCount = hand.filter(t => !isWild(t) && tilesEqual(t, tile)).length
  const wildsNeeded = 4 - naturalCount
  const wilds = hand.filter(t => isWild(t)).slice(0, wildsNeeded)
  const naturalTiles = hand.filter(t => !isWild(t) && tilesEqual(t, tile))
  const meldTiles: Tile[] = [...naturalTiles, ...wilds.map(t => cloneTile(t))]
  const newHand = hand.filter(t => !tilesEqual(t, tile))
  return { hand: newHand, meld: { type: MeldType.CONCEALED_KONG, tiles: meldTiles.slice(0, 4), isConcealed: true } }
}

function doExtendedKong(hand: Tile[], melds: Meld[], tile: Tile): { hand: Tile[], melds: Meld[] } {
  const newHand = hand.filter(t => !tilesEqual(t, tile))
  const newMelds = melds.map(m => {
    if (m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)) {
      return { type: MeldType.KONG, tiles: [...m.tiles, cloneTile(tile)], isConcealed: false } as Meld
    }
    return m
  })
  return { hand: newHand, melds: newMelds }
}

// ========== Peng ==========
function canPeng(hand: Tile[], discarded: Tile): boolean {
  const count = hand.filter(t => !isWild(t) && tilesEqual(t, discarded)).length
  return count >= 2
}

function doPeng(hand: Tile[], discarded: Tile): { hand: Tile[], meld: Meld } {
  const wilds = hand.filter(t => isWild(t) && tilesEqual(t, discarded))
  const naturals = hand.filter(t => !isWild(t) && tilesEqual(t, discarded)).slice(0, 3 - wilds.length)
  const meldTiles: Tile[] = [...naturals, ...wilds.map(t => cloneTile(t))]
  const newHand = hand.filter(t => !tilesEqual(t, discarded) || isWild(t))
  return { hand: newHand, meld: { type: MeldType.TRIPLET, tiles: meldTiles.slice(0, 3), isConcealed: false } }
}

// ========== Chow ==========
function getChowOptions(hand: Tile[], discarded: Tile): Tile[][] {
  if (isHonor(discarded) || discarded.suit === TileSuit.FLOWER || isWild(discarded)) return []
  const options: Tile[][] = []
  const v = discarded.value
  if (v <= 7) {
    const t1 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v + 1)
    const t2 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v + 2)
    if (t1 && t2 && t1.id !== t2.id) options.push([discarded, t1, t2])
  }
  if (v >= 2 && v <= 8) {
    const t1 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v - 1)
    const t2 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v + 1)
    if (t1 && t2 && t1.id !== t2.id) options.push([t1, discarded, t2])
  }
  if (v >= 3) {
    const t1 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v - 2)
    const t2 = hand.find(t => !isWild(t) && t.suit === discarded.suit && t.value === v - 1)
    if (t1 && t2 && t1.id !== t2.id) options.push([t1, t2, discarded])
  }
  return options
}

function selectBestChow(hand: Tile[], options: Tile[][]): number {
  if (options.length === 0) return -1
  if (options.length === 1) return 0
  let bestIdx = 0; let bestScore = -Infinity
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]
    let score = 0
    const avgVal = opt.reduce((s, t) => s + t.value, 0) / 3
    score -= avgVal * 1.2
    const sameSuitCount = hand.filter(t => !isWild(t) && t.suit === opt[0].suit).length
    score += sameSuitCount * 1.5
    const handCopy = hand.filter(t => !opt.some(o => tilesEqual(o, t)) || isWild(t))
    const pairsAfter = [...groupTiles(handCopy.filter(t => !isWild(t)))].filter(([, g]) => g.length >= 2).length
    score -= pairsAfter * 2.0
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return bestIdx
}

// ========== Discard scoring ==========
function getDiscardScore(tile: Tile, hand: Tile[], player: SimPlayer): number {
  const p = currentPolicy
  let score = 0
  const sameCount = hand.filter(t => !isWild(t) && tilesEqual(t, tile)).length
  if (sameCount >= 2) score -= p.pairWeight
  if (sameCount >= 3) score -= p.tripletKeepBonus
  if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
    const hasLeft = hand.some(t => !isWild(t) && t.suit === tile.suit && (t.value === tile.value - 1 || t.value === tile.value - 2))
    const hasRight = hand.some(t => !isWild(t) && t.suit === tile.suit && (t.value === tile.value + 1 || t.value === tile.value + 2))
    if (hasLeft || hasRight) score -= p.nearWeight
    if (hasLeft && hasRight) score -= p.nearWeight
  }
  if (isHonor(tile)) {
    if (sameCount >= 2) score -= p.honorPairBonus * p.pairWeight
    else score += 0.5
    if (sameCount >= 3) score -= p.honorTripletKeepBonus
  }
  if (isTerminal(tile)) score -= 0.8
  let neighbors = 0
  if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue
      if (hand.some(t => !isWild(t) && t.suit === tile.suit && t.value === tile.value + d)) neighbors++
    }
    score -= neighbors * 0.2
  }
  if (isWild(tile)) score -= p.wildKeepPenalty * 0.01
  const suitCounts = new Map<string, number>()
  for (const t of hand) {
    if (!isWild(t) && !isFlower(t)) suitCounts.set(t.suit, (suitCounts.get(t.suit) || 0) + 1)
  }
  const dominant = [...suitCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (dominant && dominant[0] === tile.suit) score += p.dominantSuitBonus
  return score
}

function botDiscard(hand: Tile[], player: SimPlayer): number {
  const nonWild = hand.filter(t => !isWild(t))
  if (nonWild.length === 0) {
    const wi = hand.findIndex(t => isWild(t))
    return wi >= 0 ? wi : 0
  }
  let bestIdx = -1; let bestScore = -Infinity
  for (let i = 0; i < hand.length; i++) {
    if (isWild(hand[i])) continue
    const s = getDiscardScore(hand[i], hand, player)
    if (s > bestScore) { bestScore = s; bestIdx = i }
  }
  if (bestIdx === -1) {
    const fb = hand.findIndex(t => !isWild(t))
    return fb >= 0 ? fb : 0
  }
  return bestIdx
}

// ========== Should act? ==========
function shouldPeng(player: SimPlayer): boolean {
  return Math.random() < currentPolicy.pengChance
}
function shouldKong(player: SimPlayer): boolean {
  return Math.random() < currentPolicy.kongChance
}
function shouldChow(): boolean {
  return Math.random() < currentPolicy.chowChance
}
function isFrozen(playerIdx: number, turn: number): boolean {
  const fr = freezeByPlayer.get(playerIdx)
  return fr !== undefined && fr > turn
}
function setFrozen(playerIdx: number, turn: number): void {
  freezeByPlayer.set(playerIdx, turn + 1)
}

// ========== Win check ==========
function checkWin(hand: Tile[], melds: Meld[]): { canWin: boolean; winType: string | null } {
  return canWin(hand, melds.length, wildChecker())
}

// ========== Score calculation ==========
function calcScore(player: SimPlayer, isSelfDrawn: boolean, isKongFlower: boolean, discardedTile?: Tile): number {
  const handTypes = detectHandTypes(
    player.hand, player.melds, isSelfDrawn,
    player.flowers.length, wildTileId
  )
  const roundMultiplier = Math.floor(Math.random() * 3) + 1
  const result = calculateScore({
    handTiles: player.hand,
    exposedMelds: player.melds,
    flowerTiles: player.flowers,
    handTypes,
    isSelfDrawn,
    isKongFlower,
    isRobbingKong: false,
    isMenQing: player.isMenQing,
    wildTileSuit: wildTile?.suit,
    wildTileValue: wildTile?.value,
    roundMultiplier,
    globalMultiplier: 1,
  })
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== Game simulation ==========
function simulateGame(players: string[], roundNum: number): {
  winner: string | null; winnerIndex: number; scores: Record<string, number>;
  reason: string; selfDraw: boolean; huByDiscard: boolean; roundNum: number
} {
  let deck = shuffleTiles(createDeck())
  setWildTile(deck)
  freezeByPlayer.clear()

  const simPlayers: SimPlayer[] = players.map((name, i) => ({
    name, hand: [], melds: [], flowers: [], position: i, isMenQing: true, score: 0
  }))

  // Deal 13 tiles each
  let deckIdx = 0
  for (let d = 0; d < 13; d++) {
    for (let i = 0; i < players.length; i++) {
      while (deckIdx < deck.length) {
        let tile = deck[deckIdx++]
        if (isFlower(tile)) { simPlayers[i].flowers.push(tile); continue }
        simPlayers[i].hand.push(tile)
        break
      }
    }
  }

  // Ensure each player has 13 tiles
  for (const p of simPlayers) {
    while (p.hand.length < 13 && deckIdx < deck.length) {
      let tile = deck[deckIdx++]
      if (isFlower(tile)) { p.flowers.push(tile); continue }
      p.hand.push(tile)
    }
  }

  let currentIdx = 0
  let lastDiscarderIdx = -1
  let kongReplacement: Tile | null = null
  let isKongFlower = false

  for (let turn = 0; turn < 200; turn++) {
    const cp = simPlayers[currentIdx]
    const frozen = isFrozen(currentIdx, turn)

    // DRAW
    let drawn: Tile | null = null
    if (kongReplacement) {
      drawn = kongReplacement
      isKongFlower = true
      kongReplacement = null
    } else {
      if (deckIdx >= deck.length) {
        return { winner: null, winnerIndex: -1, scores: Object.fromEntries(players.map(p => [p, 0])), reason: 'wall_exhausted', selfDraw: false, huByDiscard: false, roundNum }
      }
      drawn = deck[deckIdx++]
      if (isFlower(drawn)) {
        cp.flowers.push(drawn)
        if (deckIdx < deck.length) {
          kongReplacement = deck[deckIdx++]
          if (isFlower(kongReplacement)) {
            cp.flowers.push(kongReplacement)
            kongReplacement = deckIdx < deck.length ? deck[deckIdx++] : null
          }
        } else kongReplacement = null
        isKongFlower = true
        drawn = kongReplacement
        kongReplacement = null
        if (!drawn) continue
      }
    }

    cp.hand.push(drawn)

    // SELF-DRAW WIN
    if (checkWin(cp.hand, cp.melds).canWin) {
      const wildCount = cp.hand.filter(t => isWild(t)).length
      const winChance = currentPolicy.selfWinChance + (wildCount > 0 ? currentPolicy.selfWinWildBoost * wildCount : 0)
      if (Math.random() < winChance) {
        const fan = calcScore(cp, true, isKongFlower)
        const scores: Record<string, number> = Object.fromEntries(players.map(p => [p, 0]))
        scores[cp.name] = fan * 3
        for (const other of players) { if (other !== cp.name) scores[other] = -fan }
        return { winner: cp.name, winnerIndex: currentIdx, scores, reason: 'self_draw', selfDraw: true, huByDiscard: false, roundNum }
      }
    }

    // EXTENDED KONG
    const extKong = !frozen ? canExtendedKong(cp.hand, cp.melds) : null
    if (extKong && shouldKong(cp)) {
      const r = doExtendedKong(cp.hand, cp.melds, extKong)
      cp.hand = r.hand; cp.melds = r.melds; cp.isMenQing = false
      if (deckIdx < deck.length) {
        kongReplacement = deck[deckIdx++]
        if (isFlower(kongReplacement)) {
          cp.flowers.push(kongReplacement)
          kongReplacement = deckIdx < deck.length ? deck[deckIdx++] : null
        }
      }
      isKongFlower = true
      continue
    }

    // CONCEALED KONG
    const concKong = !frozen ? canConcealedKong(cp.hand) : null
    if (concKong && shouldKong(cp)) {
      const r = doConcealedKong(cp.hand, concKong)
      cp.hand = r.hand; cp.melds.push(r.meld)
      if (deckIdx < deck.length) {
        kongReplacement = deck[deckIdx++]
        if (isFlower(kongReplacement)) {
          cp.flowers.push(kongReplacement)
          kongReplacement = deckIdx < deck.length ? deck[deckIdx++] : null
        }
      }
      isKongFlower = true
      continue
    }

    // EXPOSED KONG
    const kongTile = !frozen ? canKong(cp.hand) : null
    if (kongTile && shouldKong(cp)) {
      const r = doKong(cp.hand, kongTile)
      cp.hand = r.hand; cp.melds.push(r.meld); cp.isMenQing = false
      if (deckIdx < deck.length) {
        kongReplacement = deck[deckIdx++]
        if (isFlower(kongReplacement)) {
          cp.flowers.push(kongReplacement)
          kongReplacement = deckIdx < deck.length ? deck[deckIdx++] : null
        }
      }
      isKongFlower = true
      continue
    }

    // DISCARD
    const discardIdx = botDiscard(cp.hand, cp)
    const discarded = cp.hand.splice(discardIdx, 1)[0]
    lastDiscarderIdx = currentIdx
    if (isWild(discarded)) setFrozen(currentIdx, turn)

    // RESPONSE PHASE
    let claimed = false
    const others = [1, 2, 3].map(o => (currentIdx + o) % players.length)

    // HU — any player
    for (const ri of others) {
      const rp = simPlayers[ri]
      const testHand = [...rp.hand, discarded]
      if (checkWin(testHand, rp.melds).canWin) {
        const wildCount = testHand.filter(t => isWild(t)).length
        const menQingPenalty = rp.isMenQing ? currentPolicy.discardHuMenQingPenalty : 0
        let huChance = currentPolicy.discardHuChance - menQingPenalty - (wildCount > 0 ? currentPolicy.discardHuWildPenalty : 0)
        huChance = Math.max(0, Math.min(1, huChance))
        if (Math.random() < huChance) {
          const fan = calcScore(rp, false, false, discarded)
          const scores: Record<string, number> = Object.fromEntries(players.map(p => [p, 0]))
          scores[rp.name] = fan * 3
          scores[cp.name] = -fan
          return { winner: rp.name, winnerIndex: ri, scores, reason: 'hu', selfDraw: false, huByDiscard: true, roundNum }
        }
      }
    }

    // PENG — any player
    if (!claimed && !frozen) {
      for (const ri of others) {
        const rp = simPlayers[ri]
        if (canPeng(rp.hand, discarded) && shouldPeng(rp)) {
          const r2 = doPeng(rp.hand, discarded)
          rp.hand = r2.hand; rp.melds.push(r2.meld); rp.isMenQing = false
          currentIdx = ri; claimed = true; break
        }
      }
    }

    // CHOW — only next player (position-wise)
    if (!claimed && !frozen) {
      const ci = (currentIdx + 1) % players.length
      const cp2 = simPlayers[ci]
      if (cp2.position === (cp.position + 1) % players.length) {
        const chowOpts = getChowOptions(cp2.hand, discarded)
        if (chowOpts.length > 0 && shouldChow()) {
          const bestIdx = selectBestChow(cp2.hand, chowOpts)
          if (bestIdx >= 0) {
            const chowTiles = chowOpts[bestIdx]
            for (const tile of chowTiles) {
              if (!tilesEqual(tile, discarded) && !isWild(tile)) {
                const idx = cp2.hand.findIndex(t => tilesEqual(t, tile))
                if (idx >= 0) cp2.hand.splice(idx, 1)
              }
            }
            cp2.melds.push({ type: MeldType.SEQUENCE, tiles: chowTiles.map((t, i) => ({ ...t, id: `c${i}` })), isConcealed: false })
            cp2.isMenQing = false
            currentIdx = ci; claimed = true
          }
        }
      }
    }

    if (!claimed) currentIdx = (currentIdx + 1) % players.length
    isKongFlower = false
  }

  return { winner: null, winnerIndex: -1, scores: Object.fromEntries(players.map(p => [p, 0])), reason: 'max_turns', selfDraw: false, huByDiscard: false, roundNum }
}

// ========== Strategy adjustment ==========
function adjustStrategy(metrics: { huRate: number; selfDrawRate: number; lastPlayerRate: number; avgScore: number }): string[] {
  const adjustments: string[] = []
  const p = currentPolicy

  if (metrics.huRate < 0.03) {
    const old = p.selfWinChance
    p.selfWinChance = Math.min(0.95, p.selfWinChance + 0.02)
    adjustments.push(`↑selfWinChance ${old.toFixed(3)}→${p.selfWinChance.toFixed(3)}`)
  } else if (metrics.huRate > 0.08) {
    const old = p.selfWinChance
    p.selfWinChance = Math.max(0.70, p.selfWinChance - 0.02)
    adjustments.push(`↓selfWinChance ${old.toFixed(3)}→${p.selfWinChance.toFixed(3)}`)
  }

  if (metrics.lastPlayerRate > 0.015) {
    const old = p.discardHuChance
    p.discardHuChance = Math.min(0.99, p.discardHuChance + 0.02)
    adjustments.push(`↑discardHuChance ${old.toFixed(3)}→${p.discardHuChance.toFixed(3)}`)
  } else if (metrics.lastPlayerRate < 0.005) {
    const old = p.discardHuChance
    p.discardHuChance = Math.max(0.70, p.discardHuChance - 0.02)
    adjustments.push(`↓discardHuChance ${old.toFixed(3)}→${p.discardHuChance.toFixed(3)}`)
  }

  if (metrics.avgScore < 50) {
    const old1 = p.pairWeight
    const old2 = p.nearWeight
    p.pairWeight = Math.min(8, p.pairWeight + 0.3)
    p.nearWeight = Math.min(4, p.nearWeight + 0.2)
    adjustments.push(`↑pairWeight ${old1.toFixed(2)}→${p.pairWeight.toFixed(2)}, nearWeight ${old2.toFixed(2)}→${p.nearWeight.toFixed(2)}`)
  } else if (metrics.avgScore > 200) {
    const old1 = p.pairWeight
    const old2 = p.nearWeight
    p.pairWeight = Math.max(2, p.pairWeight - 0.3)
    p.nearWeight = Math.max(1, p.nearWeight - 0.2)
    adjustments.push(`↓pairWeight ${old1.toFixed(2)}→${p.pairWeight.toFixed(2)}, nearWeight ${old2.toFixed(2)}→${p.nearWeight.toFixed(2)}`)
  }

  return adjustments
}

// ========== Main ==========
function runSimulation() {
  console.log(`\n🎴 AI 对战模拟器 v3 — 完整规则 + AI-AK 策略迭代`)
  console.log(`   对战: ${AI_NAMES.join(', ')}`)
  console.log(`   ${ROUNDS} 轮 × ${GAMES_PER_ROUND} 局 = ${ROUNDS * GAMES_PER_ROUND} 总局数`)
  console.log(`   结算倍数: ${SETTLEMENT_MULT}`)
  console.log(`${'═'.repeat(65)}\n`)

  loadAKPolicy()

  let totalScores: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  let totalWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  let totalSelfDraws: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  let totalHuByDiscard: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  let totalGames = 0

  for (let round = 1; round <= ROUNDS; round++) {
    const roundScores: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    const roundWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    const roundSelfDraws: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    const roundHuByDiscard: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    let drawCount = 0

    for (let g = 0; g < GAMES_PER_ROUND; g++) {
      const result = simulateGame(AI_NAMES, round)
      totalGames++

      for (const p of AI_NAMES) {
        const sc = result.scores[p] || 0
        roundScores[p] += sc
        totalScores[p] += sc
      }

      if (result.winner) {
        roundWins[result.winner]++
        totalWins[result.winner]++
        if (result.selfDraw) {
          roundSelfDraws[result.winner]++
          totalSelfDraws[result.winner]++
        }
        if (result.huByDiscard) {
          roundHuByDiscard[result.winner]++
          totalHuByDiscard[result.winner]++
        }
      } else {
        drawCount++
      }
    }

    // Update current metrics
    const akWins = roundWins['AI-AK']
    const akSelfDraws = roundSelfDraws['AI-AK']
    const akHuByDiscard = roundHuByDiscard['AI-AK']
    const akAvgScore = roundScores['AI-AK'] / GAMES_PER_ROUND

    currentMetrics = {
      huRate: akWins / GAMES_PER_ROUND,
      selfDrawRate: akSelfDraws / GAMES_PER_ROUND,
      lastPlayerRate: akHuByDiscard / GAMES_PER_ROUND,
      avgScore: akAvgScore,
      totalGames,
    }

    const adjustments = round > 1 ? adjustStrategy({
      huRate: currentMetrics.huRate,
      selfDrawRate: currentMetrics.selfDrawRate,
      lastPlayerRate: currentMetrics.lastPlayerRate,
      avgScore: currentMetrics.avgScore,
    }) : []

    const sorted = [...AI_NAMES].sort((a, b) => roundScores[b] - roundScores[a])
    const ranks = sorted

    metricsHistory.push({
      round, scores: { ...roundScores }, winCounts: { ...roundWins },
      selfDrawCounts: { ...roundSelfDraws }, huByDiscardCounts: { ...roundHuByDiscard },
      avgScore: Object.fromEntries(AI_NAMES.map(n => [n, Math.round(roundScores[n] / GAMES_PER_ROUND)])),
      ranks, adjustments,
    })

    // Print round summary
    const adjStr = adjustments.length > 0 ? ` (策略调整: ${adjustments.join(', ')})` : ''
    console.log(`=== 轮次 ${round} ${adjStr ? '' : '(基准)'} ===`)
    for (const name of sorted) {
      const sc = roundScores[name]
      const bar = sc >= 0 ? '🟢' : '🔴'
      const winRate = ((roundWins[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const selfRate = ((roundSelfDraws[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const discardRate = ((roundHuByDiscard[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const rank = sorted.indexOf(name) + 1
      console.log(`  ${bar} ${name.padEnd(8)} ${sc >= 0 ? '+' : ''}${String(sc).padStart(6)}  胜率${winRate.padStart(5)}%  自摸${selfRate.padStart(5)}%  放冲${discardRate.padStart(5)}% 排名${rank}`)`
    }
    console.log()
  }

  // Final summary
  console.log(`${'═'.repeat(65)}`)
  console.log(`🏆 总排名 (${ROUNDS * GAMES_PER_ROUND}局)`)
  console.log(`${'═'.repeat(65)}`)
  const finalSorted = [...AI_NAMES].sort((a, b) => totalScores[b] - totalScores[a])
  for (let i = 0; i < finalSorted.length; i++) {
    const n = finalSorted[i]
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i]
    const avg = Math.round(totalScores[n] / ROUNDS)
    const wr = ((totalWins[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    const sr = ((totalSelfDraws[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    const dr = ((totalHuByDiscard[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    console.log(`  ${medal} ${n.padEnd(8)} 总分: ${String(totalScores[n]).padStart(8)} | 均分: ${String(avg).padStart(7)}/轮 | 胜率: ${wr}% | 自摸: ${sr}% | 放冲: ${dr}%`)
  }

  console.log(`\n🔧 最终 AI-AK 策略参数:`)
  console.log(`  selfWinChance: ${currentPolicy.selfWinChance.toFixed(4)}`)
  console.log(`  discardHuChance: ${currentPolicy.discardHuChance.toFixed(4)}`)
  console.log(`  pengChance: ${currentPolicy.pengChance.toFixed(4)}`)
  console.log(`  kongChance: ${currentPolicy.kongChance.toFixed(4)}`)
  console.log(`  chowChance: ${currentPolicy.chowChance.toFixed(4)}`)
  console.log(`  pairWeight: ${currentPolicy.pairWeight.toFixed(4)}`)
  console.log(`  nearWeight: ${currentPolicy.nearWeight.toFixed(4)}`)
  console.log(`  honorPairBonus: ${currentPolicy.honorPairBonus.toFixed(4)}`)
  console.log(`  tripletKeepBonus: ${currentPolicy.tripletKeepBonus.toFixed(4)}`)

  saveAKPolicy()
  console.log(`\n✅ 策略已保存到 AI_policies/characters/AI-AK.json`)

  // Write results to markdown
  let md = `# 麻将AI模拟器 v3 结果\n\n`
  md += `> 生成时间: ${new Date().toISOString()}\n\n`
  md += `## 配置\n- 对战: ${AI_NAMES.join(', ')}\n`
  md += `- 轮数: ${ROUNDS} × ${GAMES_PER_ROUND} = ${ROUNDS * GAMES_PER_ROUND}局\n`
  md += `- 结算倍数: ${SETTLEMENT_MULT}\n\n`
  md += `## 每轮结果\n\n`

  for (const m of metricsHistory) {
    md += `### 轮次 ${m.round}${m.adjustments.length > 0 ? ` (策略调整: ${m.adjustments.join(', ')})` : ' (基准)'}\n\n`
    md += `| 玩家 | 得分 | 胜率 | 自摸率 | 放冲率 | 排名 |\n`
    md += `|------|------|------|--------|--------|------|\n`
    for (const name of m.ranks) {
      const sc = m.scores[name]
      const wr = ((m.winCounts[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const sr = ((m.selfDrawCounts[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const dr = ((m.huByDiscardCounts[name] / GAMES_PER_ROUND) * 100).toFixed(1)
      const rank = m.ranks.indexOf(name) + 1
      md += `| ${name} | ${sc >= 0 ? '+' : ''}${sc} | ${wr}% | ${sr}% | ${dr}% | ${rank} |\n`
    }
    md += `\n`
  }

  md += `## 总排名\n\n`
  md += `| 排名 | 玩家 | 总分 | 均分/轮 | 胜率 | 自摸率 | 放冲率 |\n`
  md += `|------|------|------|---------|------|--------|--------|\n`
  for (let i = 0; i < finalSorted.length; i++) {
    const n = finalSorted[i]
    const avg = Math.round(totalScores[n] / ROUNDS)
    const wr = ((totalWins[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    const sr = ((totalSelfDraws[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    const dr = ((totalHuByDiscard[n] / (ROUNDS * GAMES_PER_ROUND)) * 100).toFixed(1)
    md += `| ${i + 1} | ${n} | ${totalScores[n]} | +${avg} | ${wr}% | ${sr}% | ${dr}% |\n`
  }

  md += `\n## 最终 AI-AK 策略参数\n\n`
  md += `\`\`\`json\n${JSON.stringify(currentPolicy, null, 2)}\n\`\`\`\n`

  fs.writeFileSync(ROUNDS_FILE, md)
  console.log(`📄 结果已写入 scripts/simulate-v3-results.md`)
}

runSimulation()
