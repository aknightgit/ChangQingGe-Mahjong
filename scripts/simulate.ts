/**
 * AI 对战模拟器 v2（完整规则：碰/吃/杠/胡）
 * 用法: npx tsx scripts/simulate.ts [batches] [games_per_batch]
 * 每轮之间调优吃牌选牌策略
 */
import fs from 'fs'
import path from 'path'
import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles'
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game'

// ========== Config ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']
const SETTLEMENT_MULT = 10

// ========== Policy loading ==========
const policies: Record<string, any> = {}
function loadPolicy(botName: string): any {
  if (policies[botName]) return policies[botName]
  const cp = path.resolve(process.cwd(), `AI_policies/characters/${botName}.json`)
  if (fs.existsSync(cp)) { policies[botName] = JSON.parse(fs.readFileSync(cp, 'utf-8')); return policies[botName] }
  const bp = path.resolve(process.cwd(), 'AI_policies/best-policy.json')
  if (fs.existsSync(bp)) { policies[botName] = JSON.parse(fs.readFileSync(bp, 'utf-8')); return policies[botName] }
  policies[botName] = { id:'fallback', pairWeight:2, tripletKeepBonus:3, sequencePotential:1.5, honorPairBonus:1.5, wildKeepPenalty:2, terminalWeight:0.8, connectivityWeight:1, discardSafety:0.5 }
  return policies[botName]
}

// ========== Chow strategy params (adaptable) ==========
interface ChowStrategy {
  // How much to prefer certain chow combinations (higher = more likely to chow)
  preferLowSequences: number; // prefer sequences with lower values
  preferSameSuit: number;     // prefer chow that matches existing suit
  avoidBreakingPairs: number; // avoid chowing if it breaks a pair
}
let chowStrategy: ChowStrategy = { preferLowSequences: 1.2, preferSameSuit: 1.5, avoidBreakingPairs: 2.0 }

// ========== Tile helpers ==========
function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isTerminal(t: Tile): boolean { return t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON && t.suit !== TileSuit.FLOWER && (t.value === 1 || t.value === 9) }
function tileStr(t: Tile): string { return `${t.suit[0]}${t.value}` }

// ========== Win detection ==========
function canWin(tiles: Tile[]): boolean {
  if (tiles.length === 14) { if (canWinSevenPairs(tiles)) return true }
  return canWinStandard(tiles)
}
function canWinSevenPairs(tiles: Tile[]): boolean {
  const validTiles = tiles.filter(t => t && t.suit)
  if (validTiles.length !== 14) return false
  const s = [...validTiles].sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)
  for (let i = 0; i < 14; i += 2) { if (!tilesEqual(s[i], s[i+1])) return false }
  return true
}
function canWinStandard(tiles: Tile[]): boolean {
  const validTiles = tiles.filter(t => t && t.suit)
  if (validTiles.length % 3 !== 2) return false
  const s = [...validTiles].sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)
  // Try each potential pair
  for (let i = 0; i < s.length - 1; i++) {
    if (tilesEqual(s[i], s[i+1])) {
      const rest = [...s]; rest.splice(i, 2)
      if (tryMelds(rest)) return true
    }
  }
  return false
}
function tryMelds(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true
  if (tiles.length % 3 !== 0) return false
  const t = tiles[0]
  // Triplet
  let tc = 0; for (const x of tiles) { if (tilesEqual(x, t)) tc++ }
  if (tc >= 3) {
    const r = [...tiles]; let rem = 0
    for (let i = r.length - 1; i >= 0 && rem < 3; i--) { if (tilesEqual(r[i], t)) { r.splice(i, 1); rem++ } }
    if (tryMelds(r)) return true
  }
  // Sequence
  if (!isHonor(t) && t.suit !== TileSuit.FLOWER) {
    const s1 = tiles.findIndex((x, i) => i > 0 && x.suit === t.suit && x.value === t.value + 1)
    if (s1 >= 0) {
      const s2 = tiles.findIndex((x, i) => i > 0 && x.suit === t.suit && x.value === t.value + 2)
      if (s2 >= 0 && s2 !== s1) {
        const r = [...tiles]; [s1, s2, 0].sort((a, b) => b - a).forEach(i => r.splice(i, 1))
        if (tryMelds(r)) return true
      }
    }
  }
  return false
}

// ========== Peng detection ==========
function canPeng(hand: Tile[], discarded: Tile): boolean {
  let count = 0; for (const t of hand) { if (tilesEqual(t, discarded)) count++ }
  return count >= 2
}
function doPeng(hand: Tile[], discarded: Tile): { hand: Tile[], meld: Meld } {
  const newHand = [...hand]; let removed = 0
  for (let i = newHand.length - 1; i >= 0 && removed < 2; i--) {
    if (tilesEqual(newHand[i], discarded)) { newHand.splice(i, 1); removed++ }
  }
  const meld: Meld = { type: MeldType.TRIPLET, tiles: [{...discarded, id: 'p1'}, {...discarded, id: 'p2'}, {...discarded, id: 'p3'}], isConcealed: false }
  return { hand: newHand, meld }
}

// ========== Kong detection ==========
function canKong(hand: Tile[]): Tile | null {
  const g = groupTiles(hand)
  for (const [key, tiles] of g) { if (tiles.length === 4) return tiles[0] }
  return null
}
function canExtendedKong(hand: Tile[], melds: Meld[]): Tile | null {
  for (const m of melds) {
    if (m.type === MeldType.TRIPLET) {
      if (hand.some(t => tilesEqual(t, m.tiles[0]))) return m.tiles[0]
    }
  }
  return null
}
function doKong(hand: Tile[], tile: Tile): { hand: Tile[], meld: Meld } {
  const newHand = [...hand]; let removed = 0
  for (let i = newHand.length - 1; i >= 0 && removed < 4; i--) {
    if (tilesEqual(newHand[i], tile)) { newHand.splice(i, 1); removed++ }
  }
  const meld: Meld = { type: MeldType.KONG, tiles: [{...tile, id:'k1'}, {...tile, id:'k2'}, {...tile, id:'k3'}, {...tile, id:'k4'}], isConcealed: false }
  return { hand: newHand, meld }
}
function doExtendedKong(hand: Tile[], melds: Meld[], tile: Tile): { hand: Tile[], melds: Meld[] } {
  const newHand = [...hand]; let removed = false
  for (let i = newHand.length - 1; i >= 0 && !removed; i--) {
    if (tilesEqual(newHand[i], tile)) { newHand.splice(i, 1); removed = true }
  }
  const newMelds = melds.map(m => {
    if (m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)) {
      return { type: MeldType.KONG, tiles: [...m.tiles, {...tile, id: `k${m.tiles.length}`}], isConcealed: false } as Meld
    }
    return m
  })
  return { hand: newHand, melds: newMelds }
}

// ========== Chow detection ==========
function getChowOptions(hand: Tile[], discarded: Tile): Tile[][] {
  if (isHonor(discarded) || discarded.suit === TileSuit.FLOWER) return []
  const options: Tile[][] = []
  const v = discarded.value
  // discarded as lowest: need v+1, v+2
  if (v <= 7) {
    const t1 = hand.find(t => t.suit === discarded.suit && t.value === v + 1)
    const t2 = hand.find(t => t.suit === discarded.suit && t.value === v + 2)
    if (t1 && t2 && !tilesEqual(t1, t2)) options.push([discarded, t1, t2])
  }
  // discarded as middle: need v-1, v+1
  if (v >= 2 && v <= 8) {
    const t1 = hand.find(t => t.suit === discarded.suit && t.value === v - 1)
    const t2 = hand.find(t => t.suit === discarded.suit && t.value === v + 1)
    if (t1 && t2 && !tilesEqual(t1, t2)) options.push([t1, discarded, t2])
  }
  // discarded as highest: need v-2, v-1
  if (v >= 3) {
    const t1 = hand.find(t => t.suit === discarded.suit && t.value === v - 2)
    const t2 = hand.find(t => t.suit === discarded.suit && t.value === v - 1)
    if (t1 && t2 && !tilesEqual(t1, t2)) options.push([t1, t2, discarded])
  }
  return options
}
function selectBestChow(hand: Tile[], options: Tile[][]): number {
  if (options.length === 0) return -1
  if (options.length === 1) return 0
  // Score each option
  let bestIdx = 0; let bestScore = -Infinity
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]
    let score = 0
    // Check what tiles to remove from hand
    const toRemove = opt.filter(t => !tilesEqual(t, opt[0]) || t.id !== opt[0].id).length // tiles from hand (not discarded)
    // Prefer low sequences
    const avgVal = opt.reduce((s, t) => s + t.value, 0) / 3
    score -= avgVal * chowStrategy.preferLowSequences
    // Prefer same suit as existing hand
    const sameSuitCount = hand.filter(t => t.suit === opt[0].suit).length
    score += sameSuitCount * chowStrategy.preferSameSuit
    // Avoid breaking pairs
    const handWithout = [...hand]
    for (const tile of opt) {
      if (!tilesEqual(tile, opt[0])) { // not discarded
        const idx = handWithout.findIndex(t => tilesEqual(t, tile))
        if (idx >= 0) handWithout.splice(idx, 1)
      }
    }
    const pairsAfter = groupTiles(handWithout)
    let pairCount = 0
    for (const [, g] of pairsAfter) { if (g.length >= 2) pairCount++ }
    score -= pairCount * chowStrategy.avoidBreakingPairs
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return bestIdx
}

// ========== Discard scoring ==========
function getDiscardScore(tile: Tile, hand: Tile[], policy: any): number {
  let score = 0
  const sameCount = hand.filter(t => tilesEqual(t, tile)).length
  if (sameCount >= 2) score -= policy.pairWeight
  if (sameCount >= 3) score -= policy.tripletKeepBonus
  if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
    const hasLeft = hand.some(t => t.suit === tile.suit && (t.value === tile.value - 1 || t.value === tile.value - 2))
    const hasRight = hand.some(t => t.suit === tile.suit && (t.value === tile.value + 1 || t.value === tile.value + 2))
    if (hasLeft || hasRight) score -= policy.sequencePotential
    if (hasLeft && hasRight) score -= policy.sequencePotential
  }
  if (isHonor(tile)) {
    if (sameCount >= 2) score -= policy.honorPairBonus * policy.pairWeight
    else score += 0.5
  }
  if (isTerminal(tile)) score -= policy.terminalWeight
  let neighbors = 0
  if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
    for (let d = -2; d <= 2; d++) { if (d === 0) continue; if (hand.some(t => t.suit === tile.suit && t.value === tile.value + d)) neighbors++ }
    score -= neighbors * policy.connectivityWeight * 0.2
  }
  if (isHonor(tile) && sameCount === 1) score -= 1.5
  if (isTerminal(tile) && neighbors === 0) score -= 1.5
  return score
}
function botDiscard(hand: Tile[], botName: string): number {
  const policy = loadPolicy(botName)
  let bestIdx = 0; let bestScore = -Infinity
  for (let i = 0; i < hand.length; i++) {
    const score = getDiscardScore(hand[i], hand, policy)
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return bestIdx
}

// ========== Should peng? ==========
function shouldPeng(hand: Tile[], discarded: Tile): boolean {
  // Always peng if possible (pairs are valuable, peng builds melds)
  // But don't peng if it would break a sequence
  const hasPair = hand.filter(t => tilesEqual(t, discarded)).length >= 2
  return hasPair
}

// ========== Scoring ==========
function calcScore(winnerHand: Tile[], melds: Meld[], isSelfDrawn: boolean): number {
  const allTiles = [...winnerHand, ...melds.flatMap(m => m.tiles)]
  let fan = 1
  if (canWinSevenPairs(winnerHand)) { fan = 4; if (isSelfDrawn) fan *= 2; return fan }
  const groups = groupTiles(allTiles)
  let tripletCount = 0
  for (const [, g] of groups) { if (g.length >= 3) tripletCount++ }
  if (tripletCount >= 4) fan = 4
  else if (tripletCount >= 3) fan = 2
  const suits = new Set(allTiles.filter(t => !isHonor(t) && t.suit !== TileSuit.FLOWER).map(t => t.suit))
  if (suits.size === 1 && allTiles.length > 0) fan = Math.max(fan, 6)
  if (isSelfDrawn) fan *= 2
  return fan
}

// ========== Game simulation ==========
interface PlayerState {
  name: string
  hand: Tile[]
  melds: Meld[]
  position: number
}

function simulateGame(players: string[]): { winner: string | null; scores: Record<string, number>; reason: string } {
  let deck = shuffleTiles(createDeck())
  const ps: PlayerState[] = players.map((name, i) => ({ name, hand: [], melds: [], position: i }))

  // Deal 13 tiles each
  let deckIdx = 0; let dealt = 0
  while (dealt < 13 * players.length && deckIdx < deck.length) {
    for (let i = 0; i < players.length && dealt < 13 * players.length; i++) {
      if (deckIdx >= deck.length) break
      const tile = deck[deckIdx++]
      if (isFlower(tile)) { if (deckIdx < deck.length) { ps[i].hand.push(deck[deckIdx++]); dealt++ } }
      else { ps[i].hand.push(tile); dealt++ }
    }
  }

  let currentIdx = 0
  let lastDiscarder = -1
  const maxDraws = deck.length - deckIdx + players.length

  for (let turn = 0; turn < maxDraws; turn++) {
    const cp = ps[currentIdx]

    // Draw
    if (deckIdx >= deck.length) return { winner: null, scores: Object.fromEntries(players.map(p => [p, 0])), reason: 'wall_exhausted' }
    let drawn = deck[deckIdx++]
    if (isFlower(drawn)) { if (deckIdx < deck.length) drawn = deck[deckIdx++]; else continue }
    cp.hand.push(drawn)

    // Check kong
    const kongTile = canKong(cp.hand)
    if (kongTile) {
      const r = doKong(cp.hand, kongTile)
      cp.hand = r.hand; cp.melds.push(r.meld)
      // Draw replacement
      if (deckIdx < deck.length) { let rep = deck[deckIdx++]; if (isFlower(rep) && deckIdx < deck.length) rep = deck[deckIdx++]; cp.hand.push(rep) }
      continue
    }
    // Check extended kong
    const extKongTile = canExtendedKong(cp.hand, cp.melds)
    if (extKongTile) {
      const r = doExtendedKong(cp.hand, cp.melds, extKongTile)
      cp.hand = r.hand; cp.melds = r.melds
      if (deckIdx < deck.length) { let rep = deck[deckIdx++]; if (isFlower(rep) && deckIdx < deck.length) rep = deck[deckIdx++]; cp.hand.push(rep) }
      continue
    }

    // Check self-draw win
    if (canWin(cp.hand)) {
      const fan = calcScore(cp.hand, cp.melds, true)
      return { winner: cp.name, scores: Object.fromEntries(players.map(p => [p, p === cp.name ? fan * 3 : -fan])), reason: 'self_draw' }
    }

    // Discard
    const discardIdx = botDiscard(cp.hand, cp.name)
    const discarded = cp.hand.splice(discardIdx, 1)[0]
    lastDiscarder = currentIdx

    // Check other players' responses (hu > peng > chow)
    let claimed = false

    // Hu check (any player)
    for (let off = 1; off < players.length; off++) {
      const ri = (currentIdx + off) % players.length
      if (canWin([...ps[ri].hand, discarded])) {
        const fan = calcScore([...ps[ri].hand, discarded], ps[ri].melds, false)
        return { winner: ps[ri].name, scores: Object.fromEntries(players.map(p => [p, p === ps[ri].name ? fan * 3 : -fan])), reason: 'hu' }
      }
    }

    // Peng check (any player, skip chow player)
    for (let off = 1; off < players.length; off++) {
      const ri = (currentIdx + off) % players.length
      if (canPeng(ps[ri].hand, discarded) && shouldPeng(ps[ri].hand, discarded)) {
        const r = doPeng(ps[ri].hand, discarded)
        ps[ri].hand = r.hand; ps[ri].melds.push(r.meld)
        currentIdx = ri // peng takes turn
        claimed = true
        break
      }
    }

    // Chow check (only next player)
    if (!claimed) {
      const ci = (currentIdx + 1) % players.length
      const chowOpts = getChowOptions(ps[ci].hand, discarded)
      if (chowOpts.length > 0) {
        const bestIdx = selectBestChow(ps[ci].hand, chowOpts)
        if (bestIdx >= 0) {
          const chowTiles = chowOpts[bestIdx]
          // Remove tiles from hand
          for (const tile of chowTiles) {
            if (!tilesEqual(tile, discarded)) {
              const idx = ps[ci].hand.findIndex(t => tilesEqual(t, tile))
              if (idx >= 0) ps[ci].hand.splice(idx, 1)
            }
          }
          const meld: Meld = { type: MeldType.SEQUENCE, tiles: chowTiles.map((t, i) => ({...t, id: `c${i}`})), isConcealed: false }
          ps[ci].melds.push(meld)
          currentIdx = ci // chow takes turn
          claimed = true
        }
      }
    }

    if (!claimed) {
      currentIdx = (currentIdx + 1) % players.length
    }
  }

  return { winner: null, scores: Object.fromEntries(players.map(p => [p, 0])), reason: 'wall_exhausted' }
}

// ========== Optimize chow strategy between rounds ==========
function optimizeStrategy(batchWins: Record<string, number>, batchScores: Record<string, number>) {
  // Simple optimization: if overall win rate is low (<15%), make AI more aggressive with chow
  const totalWins = Object.values(batchWins).reduce((a, b) => a + b, 0)
  const winRate = totalWins / 200
  if (winRate < 0.15) {
    // Increase chow aggression
    chowStrategy.preferLowSequences *= 1.1
    chowStrategy.preferSameSuit *= 1.1
    chowStrategy.avoidBreakingPairs *= 0.9 // less penalty for breaking pairs
  } else if (winRate > 0.25) {
    // Decrease chow aggression (too many melds may hurt)
    chowStrategy.avoidBreakingPairs *= 1.1
  }
  // Normalize
  chowStrategy.preferLowSequences = Math.min(3, Math.max(0.5, chowStrategy.preferLowSequences))
  chowStrategy.preferSameSuit = Math.min(3, Math.max(0.5, chowStrategy.preferSameSuit))
  chowStrategy.avoidBreakingPairs = Math.min(4, Math.max(0.5, chowStrategy.avoidBreakingPairs))
}

// ========== Main ==========
function runSimulation(batches: number, gamesPerBatch: number) {
  console.log(`\n🎮 AI 对战模拟器 v2（完整规则：碰/吃/杠/胡）`)
  console.log(`   对战: ${AI_NAMES.join(', ')}`)
  console.log(`   ${batches} × ${gamesPerBatch} = ${batches * gamesPerBatch} 局`)
  console.log(`   结算膨胀倍数: ${SETTLEMENT_MULT}`)
  console.log(`${'='.repeat(60)}\n`)

  const allBatchResults: Record<string, number>[] = []
  const allWinCounts: Record<string, number[]> = {}
  for (const n of AI_NAMES) allWinCounts[n] = []

  for (let batch = 0; batch < batches; batch++) {
    const batchScores: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    const batchWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    let drawCount = 0; let selfDrawCount = 0; let huCount = 0

    for (let g = 0; g < gamesPerBatch; g++) {
      const rotated = [...AI_NAMES.slice(g % 4), ...AI_NAMES.slice(0, g % 4)]
      const result = simulateGame(rotated)
      for (const p of AI_NAMES) { batchScores[p] += (result.scores[p] || 0) * SETTLEMENT_MULT }
      if (result.winner) { batchWins[result.winner]++; if (result.reason === 'self_draw') selfDrawCount++; else huCount++ }
      else drawCount++
    }

    allBatchResults.push(batchScores)
    for (const n of AI_NAMES) allWinCounts[n].push(batchWins[n])

    // Optimize strategy
    optimizeStrategy(batchWins, batchScores)

    const sorted = [...AI_NAMES].sort((a, b) => batchScores[b] - batchScores[a])
    console.log(`📊 第 ${batch + 1} 批 (${gamesPerBatch}局) | 流局${drawCount} 自摸${selfDrawCount} 捉冲${huCount}`)
    console.log(`${'─'.repeat(55)}`)
    for (const name of sorted) {
      const sc = batchScores[name]
      const bar = sc >= 0 ? '🟢' : '🔴'
      console.log(`  ${bar} ${name.padEnd(8)} ${sc >= 0 ? '+' : ''}${String(sc).padStart(7)} | 胜:${String(batchWins[name]).padStart(3)}`)
    }
    console.log(`  策略: chow-低序=${chowStrategy.preferLowSequences.toFixed(2)} 同花=${chowStrategy.preferSameSuit.toFixed(2)} 避破对=${chowStrategy.avoidBreakingPairs.toFixed(2)}`)
    console.log()
  }

  // Overall
  console.log(`${'='.repeat(60)}`)
  console.log(`🏆 总排名 (${batches * gamesPerBatch}局)`)
  console.log(`${'='.repeat(60)}`)
  const total: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  const totalWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  for (const batch of allBatchResults) { for (const n of AI_NAMES) total[n] += batch[n] }
  for (const n of AI_NAMES) { totalWins[n] = allWinCounts[n].reduce((a, b) => a + b, 0) }

  const sorted = [...AI_NAMES].sort((a, b) => total[b] - total[a])
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i]
    const avg = Math.round(total[n] / batches)
    const wr = ((totalWins[n] / (batches * gamesPerBatch)) * 100).toFixed(1)
    console.log(`  ${medal} ${n.padEnd(8)} 总分: ${String(total[n]).padStart(8)} | 均分: ${String(avg).padStart(7)}/批 | 胜率: ${wr}%`)
  }

  console.log(`\n📈 各批排名稳定性:`)
  for (const n of AI_NAMES) {
    const ranks = allBatchResults.map(b => {
      const s = [...AI_NAMES].sort((a, bk) => b[bk] - b[a]); return s.indexOf(n) + 1
    })
    const avgRank = (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2)
    console.log(`  ${n.padEnd(8)} [${ranks.join(', ')}] | 均排名: ${avgRank}`)
  }

  console.log(`\n🎯 胜局分布:`)
  for (const n of sorted) {
    const wins = totalWins[n]
    const perBatch = allWinCounts[n].map(String).join(', ')
    console.log(`  ${n.padEnd(8)} ${wins}胜 [${perBatch}]`)
  }

  console.log(`\n🔧 最终策略参数:`)
  console.log(`  preferLowSequences: ${chowStrategy.preferLowSequences.toFixed(3)}`)
  console.log(`  preferSameSuit: ${chowStrategy.preferSameSuit.toFixed(3)}`)
  console.log(`  avoidBreakingPairs: ${chowStrategy.avoidBreakingPairs.toFixed(3)}`)
}

const batches = parseInt(process.argv[2] || '10')
const gamesPerBatch = parseInt(process.argv[3] || '200')
runSimulation(batches, gamesPerBatch)
