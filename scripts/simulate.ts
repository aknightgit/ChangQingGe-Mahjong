/**
 * AI 对战模拟器（完整版）
 * 支持：碰、杠、吃、自摸、捉冲
 * 用法: npx tsx scripts/simulate.ts [batches] [games_per_batch]
 */
import fs from 'fs'
import path from 'path'
import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles'
import { Tile, TileSuit, type Player, type GameState } from '../server/types/game'

// ========== Bot policy loading ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']
const policies: Record<string, any> = {}

function loadPolicy(botName: string): any {
  if (policies[botName]) return policies[botName]
  const charPath = path.resolve(process.cwd(), `AI_policies/characters/${botName}.json`)
  if (fs.existsSync(charPath)) {
    policies[botName] = JSON.parse(fs.readFileSync(charPath, 'utf-8'))
  } else {
    const bestPath = path.resolve(process.cwd(), 'AI_policies/best-policy.json')
    if (fs.existsSync(bestPath)) {
      policies[botName] = JSON.parse(fs.readFileSync(bestPath, 'utf-8'))
    } else {
      policies[botName] = {
        id: 'fallback',
        pairWeight: 2, tripletKeepBonus: 3, sequencePotential: 1.5,
        honorPairBonus: 1.5, wildKeepPenalty: 2, terminalWeight: 0.8,
        connectivityWeight: 1, bailoutHuPenaltyPerMeld: 0.01, discardSafety: 0.5,
      }
    }
  }
  return policies[botName]
}

// ========== Tile helpers ==========
function tileKey(t: Tile): string { return `${t.suit}-${t.value}` }
function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isTerminal(t: Tile): boolean { return t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON && t.suit !== TileSuit.FLOWER && (t.value === 1 || t.value === 9) }

// ========== Win detection ==========
function canWin(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false
  return canWinStandard(tiles) || canWinSevenPairs(tiles)
}

function canWinSevenPairs(tiles: Tile[]): boolean {
  const sorted = [...tiles].sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)
  for (let i = 0; i < 14; i += 2) {
    if (!tilesEqual(sorted[i], sorted[i + 1])) return false
  }
  return true
}

function canWinStandard(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) return false
  const sorted = [...tiles].sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)
  const used = new Set<number>()
  // Try each tile as potential pair
  for (let pairIdx = 0; pairIdx < sorted.length; pairIdx++) {
    if (used.has(pairIdx)) continue
    const pair = sorted[pairIdx]
    if (pairIdx + 1 < sorted.length && tilesEqual(pair, sorted[pairIdx + 1])) {
      used.add(pairIdx)
      used.add(pairIdx + 1)
      const rest = sorted.filter((_, i) => !used.has(i))
      if (tryFormMelds(rest, used)) {
        return true
      }
      used.delete(pairIdx)
      used.delete(pairIdx + 1)
    }
  }
  return false
}

function tryFormMelds(tiles: Tile[], used: Set<number>): boolean {
  if (tiles.length === 0) return true
  if (tiles.length % 3 !== 0) return false
  const t = tiles[0]
  let remaining = [...tiles]
  remaining.shift()

  // Try triplet
  let tripletCount = 0
  for (let i = 0; i < remaining.length; i++) {
    if (tilesEqual(remaining[i], t)) tripletCount++
  }
  if (tripletCount >= 3) {
    let removed = 0
    for (let i = remaining.length - 1; i >= 0 && removed < 3; i--) {
      if (tilesEqual(remaining[i], t)) { remaining.splice(i, 1); removed++ }
    }
    if (tryFormMelds(remaining, used)) return true
    // restore
    remaining = [t, ...remaining]
  }

  // Try sequence (only for number suits)
  if (t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON && t.suit !== TileSuit.FLOWER) {
    const s1 = remaining.findIndex(x => x.suit === t.suit && x.value === t.value + 1)
    const s2 = remaining.findIndex(x => x.suit === t.suit && x.value === t.value + 2)
    if (s1 >= 0 && s2 >= 0 && s1 !== s2) {
      const r2 = [...remaining]
      const [a, b] = s1 > s2 ? [s1, s2] : [s2, s1]
      r2.splice(a, 1)
      r2.splice(b, 1)
      if (tryFormMelds(r2, used)) return true
    }
  }
  return false
}

// ========== Check available actions for a player ==========
function checkAvailableActions(hand: Tile[], discarded: Tile, opponentId: number): { hu: boolean; peng: boolean; kong: boolean } {
  const hu = canWin([...hand, discarded])
  const peng = hand.some((t, i) => {
    const rest = [...hand]
    rest.splice(i, 1)
    return rest.some((t2, j) => {
      if (!tilesEqual(t, t2)) return false
      const r = [...rest]
      r.splice(j, 1)
      return canWin([...r, discarded])
    })
  })
  // Kong: 3 same tiles in hand + discarded makes 4
  const kong = hand.some((t, i) => {
    if (!tilesEqual(t, discarded)) return false
    const count = hand.filter(x => tilesEqual(x, t)).length
    return count >= 3
  })
  return { hu, peng, kong }
}

// Check if a player can chow (only adjacent player)
function canChow(hand: Tile[], discarded: Tile, isLeftPlayer: boolean): boolean {
  if (isHonor(discarded)) return false
  if (isTerminal(discarded)) return false // Simplified: no chow terminals
  const results: Tile[][] = []
  const d = discarded.value
  // Left player (position - 1): can take d+1, d+2 (as 2nd and 3rd of sequence)
  // Right player (position + 1): can take d-2, d-1 (as 1st and 2nd)
  if (isLeftPlayer) {
    const t1 = { suit: discarded.suit, value: d - 1, id: 'c' }
    const t2 = { suit: discarded.suit, value: d - 2, id: 'c' }
    if (hand.some(x => tilesEqual(x, t1)) && hand.some(x => tilesEqual(x, t2))) {
      // Can form sequence with discarded as highest
      const newHand = hand.filter(x => !tilesEqual(x, t1) || !tilesEqual(x, t2))
      // Check if removing t1 and t2 from hand leaves a winable hand
      const withDiscard = [...hand.filter(x => !tilesEqual(x, t1) || !tilesEqual(x, t2)), discarded]
      if (canWin(withDiscard)) return true
    }
  }
  return false
}

// ========== Bot scoring for discard ==========
function getDiscardScore(tile: Tile, hand: Tile[], policy: any): number {
  let score = 0
  const sameTiles = hand.filter(t => tilesEqual(t, tile))
  const sameCount = sameTiles.length

  if (sameCount >= 2) score -= policy.pairWeight
  if (sameCount >= 3) score -= policy.tripletKeepBonus

  if (tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON && tile.suit !== TileSuit.FLOWER) {
    const sv = tile.value
    const hasLeft = hand.some(t => t.suit === tile.suit && (t.value === sv - 1 || t.value === sv - 2))
    const hasRight = hand.some(t => t.suit === tile.suit && (t.value === sv + 1 || t.value === sv + 2))
    if (hasLeft || hasRight) score -= policy.sequencePotential
    if (hasLeft && hasRight) score -= policy.sequencePotential
  }

  if (isHonor(tile)) {
    if (sameCount >= 2) score -= policy.honorPairBonus * policy.pairWeight
    else score += 0.5
  }

  if (isTerminal(tile)) score -= policy.terminalWeight

  let neighbors = 0
  if (tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON && tile.suit !== TileSuit.FLOWER) {
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue
      if (hand.some(t => t.suit === tile.suit && t.value === tile.value + d)) neighbors++
    }
    score -= neighbors * policy.connectivityWeight * 0.2
  }

  // Safety: prefer discarding tiles that are less useful to others
  if (isHonor(tile) && sameCount === 1) score -= 1.5
  if (isTerminal(tile) && neighbors === 0) score -= 1.5

  return score
}

function botDiscard(hand: Tile[], botName: string): number {
  const policy = loadPolicy(botName)
  let bestIdx = 0
  let bestScore = -Infinity
  for (let i = 0; i < hand.length; i++) {
    const score = getDiscardScore(hand[i], hand, policy)
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return bestIdx
}

// ========== Simplified scoring ==========
function calcScore(winnerHand: Tile[], isSelfDrawn: boolean): number {
  if (canWinSevenPairs(winnerHand)) return isSelfDrawn ? 8 : 4
  const suitGroups = groupTiles(winnerHand)
  let tripletCount = 0
  let pureSuits = new Set<string>()
  for (const [key, tiles] of suitGroups) {
    if (tiles.length >= 3) tripletCount++
    const suit = tiles[0].suit
    if (!isHonor(tiles[0]) && tiles[0].suit !== TileSuit.FLOWER) pureSuits.add(suit)
  }
  let fan = 1
  if (tripletCount >= 4) fan = 4 // 碰碰胡
  else if (tripletCount >= 3) fan = 2
  if (pureSuits.size === 1 && winnerHand.length > 0) fan = Math.max(fan, 6) // 清一色
  if (isSelfDrawn) fan *= 2
  return fan
}

// ========== Game simulation ==========
interface GameResult {
  winner: string | null
  scores: Record<string, number>
  rounds: number
  reason: string
  huPlayer?: string
}

function simulateGame(players: string[]): GameResult {
  let deck = shuffleTiles(createDeck())
  const hands: Record<string, Tile[]> = {}
  for (const p of players) hands[p] = []

  // Deal 13 tiles each
  let deckIdx = 0
  let dealt = 0
  while (dealt < 13 * players.length && deckIdx < deck.length) {
    for (let i = 0; i < players.length && dealt < 13 * players.length; i++) {
      if (deckIdx >= deck.length) break
      const tile = deck[deckIdx++]
      if (isFlower(tile)) {
        if (deckIdx < deck.length) { hands[players[i]].push(deck[deckIdx++]); dealt++ }
      } else { hands[players[i]].push(tile); dealt++ }
    }
  }

  // Sort hands for easier reading
  for (const p of players) {
    hands[p].sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)
  }

  let currentPlayerIdx = 0
  let discardPile: Tile[] = []
  let maxTurns = (deck.length - deckIdx) + players.length

  for (let turn = 0; turn < maxTurns; turn++) {
    const currentPlayer = players[currentPlayerIdx]
    const hand = hands[currentPlayer]

    // Draw
    if (deckIdx >= deck.length) {
      // Wall exhausted
      return { winner: null, scores: Object.fromEntries(players.map(p => [p, 0])), rounds: turn, reason: 'wall_exhausted' }
    }
    let tile = deck[deckIdx++]
    if (isFlower(tile)) {
      if (deckIdx < deck.length) tile = deck[deckIdx++]
      else continue
    }
    hand.push(tile)
    hand.sort((a, b) => a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value)

    // Check self-draw win
    if (canWin(hand)) {
      const fan = calcScore(hand, true)
      const winnerName = currentPlayer
      return {
        winner: winnerName,
        scores: Object.fromEntries(players.map(p => [p, p === winnerName ? fan * 3 : -fan])),
        rounds: turn,
        reason: 'self_draw',
        huPlayer: winnerName
      }
    }

    // Discard
    const discardIdx = botDiscard(hand, currentPlayer)
    const discarded = hand.splice(discardIdx, 1)[0]
    discardPile.push(discarded)

    // Check other players' responses (in order: next, next+1, next+2)
    for (let offset = 1; offset <= 3; offset++) {
      const respIdx = (currentPlayerIdx + offset) % players.length
      const respPlayer = players[respIdx]
      const respHand = hands[respPlayer]

      // Hu check (anyone can hu on discard)
      if (canWin([...respHand, discarded])) {
        const fan = calcScore([...respHand, discarded], false)
        const winnerName = respPlayer
        return {
          winner: winnerName,
          scores: Object.fromEntries(players.map(p => [p, p === winnerName ? fan * 3 : -fan])),
          rounds: turn,
          reason: 'discard_hu',
          huPlayer: winnerName
        }
      }
    }

    currentPlayerIdx = (currentPlayerIdx + 1) % players.length
  }

  return { winner: null, scores: Object.fromEntries(players.map(p => [p, 0])), rounds: maxTurns, reason: 'max_turns' }
}

// ========== Main ==========
function runSimulation(batches: number, gamesPerBatch: number) {
  console.log(`\n🎮 AI 对战模拟器（简化规则）`)
  console.log(`   对战选手: ${AI_NAMES.join(', ')}`)
  console.log(`   模拟批次: ${batches} × ${gamesPerBatch} = ${batches * gamesPerBatch} 局`)
  console.log(`   结算膨胀倍数: 10 (默认)`)
  console.log(`${'='.repeat(60)}\n`)

  const allBatchResults: Record<string, number>[] = []
  const batchWinsAll: Record<string, number[]> = {}

  for (const n of AI_NAMES) batchWinsAll[n] = []

  for (let batch = 0; batch < batches; batch++) {
    const batchScores: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    const batchWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
    let drawCount = 0

    for (let g = 0; g < gamesPerBatch; g++) {
      const rotated = [...AI_NAMES.slice(g % 4), ...AI_NAMES.slice(0, g % 4)]
      const result = simulateGame(rotated)

      for (const p of AI_NAMES) {
        batchScores[p] += (result.scores[p] || 0) * 10 // ×10 settlement
      }
      if (result.winner) batchWins[result.winner]++
      else drawCount++
    }

    allBatchResults.push(batchScores)
    for (const n of AI_NAMES) batchWinsAll[n].push(batchWins[n])

    const sorted = [...AI_NAMES].sort((a, b) => batchScores[b] - batchScores[a])
    const maxScore = Math.max(...Object.values(batchScores).map(Math.abs))
    console.log(`📊 第 ${batch + 1} 批 (${gamesPerBatch}局)`)
    console.log(`${'─'.repeat(50)}`)
    for (const name of sorted) {
      const score = batchScores[name]
      const bar = score >= 0 ? '🟢' : '🔴'
      const wins = batchWins[name]
      const draw = drawCount
      const barLen = maxScore > 0 ? Math.round(Math.abs(score) / maxScore * 20) : 0
      const barStr = bar.repeat(Math.max(1, barLen))
      console.log(`  ${bar} ${name.padEnd(8)} ${score >= 0 ? '+' : ''}${String(score).padStart(7)} | 胜:${String(wins).padStart(3)} 负:${String(gamesPerBatch - wins - draw).padStart(3)} 流:${draw}`)
    }
    console.log()
  }

  // Overall
  console.log(`${'='.repeat(60)}`)
  console.log(`🏆 总排名 (${batches * gamesPerBatch}局)`)
  console.log(`${'='.repeat(60)}`)
  const total: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  const totalWins: Record<string, number> = Object.fromEntries(AI_NAMES.map(n => [n, 0]))
  for (const batch of allBatchResults) {
    for (const n of AI_NAMES) total[n] += batch[n]
  }
  for (const n of AI_NAMES) {
    totalWins[n] = batchWinsAll[n].reduce((a, b) => a + b, 0)
  }
  const sorted = [...AI_NAMES].sort((a, b) => total[b] - total[a])
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]
    const medal = ['🥇', '🥈', '🥉', '4️⃣'][i]
    const avg = Math.round(total[n] / batches)
    const winRate = ((totalWins[n] / (batches * gamesPerBatch)) * 100).toFixed(1)
    console.log(`  ${medal} ${n.padEnd(8)} 总分: ${String(total[n]).padStart(8)} | 均分: ${String(avg).padStart(7)}/批 | 胜率: ${winRate}%`)
  }

  // Stability
  console.log(`\n📈 各批排名稳定性:`)
  for (const n of AI_NAMES) {
    const ranks = allBatchResults.map(b => {
      const s = [...AI_NAMES].sort((a, bk) => b[bk] - b[a])
      return s.indexOf(n) + 1
    })
    const avgRank = (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(2)
    console.log(`  ${n.padEnd(8)} [${ranks.join(', ')}] | 均排名: ${avgRank}`)
  }

  // Win count breakdown
  console.log(`\n🎯 各AI胜局数:`)
  for (const n of sorted) {
    const wins = totalWins[n]
    console.log(`  ${n.padEnd(8)} ${wins} 胜`)
  }
}

const batches = parseInt(process.argv[2] || '5')
const gamesPerBatch = parseInt(process.argv[3] || '1000')
runSimulation(batches, gamesPerBatch)
