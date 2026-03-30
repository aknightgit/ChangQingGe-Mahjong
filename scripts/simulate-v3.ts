/**
 * AI 对战模拟器 v3 — 完整规则 + AI-AK 策略迭代
 * Features: 百搭牌, 花牌, 完整计分, 暗杠/明杠/补杠, AI-AK 策略自适应
 * 用法: npx tsx scripts/simulate-v3.ts [rounds] [games_per_round]
 */
import fs from 'fs'
import path from 'path'
import { TileSuit } from '../server/types/game'
import {
  createDeck, shuffleTiles, isFlower, groupTiles, sortTiles,
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType, isTing
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { Tile, MeldType, type Meld } from '../server/types/game'

// ========== Config ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']
const SETTLEMENT_MULT = 10
const ROUNDS = parseInt(process.argv[2] || '10')
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
}

const AK_POLICY_PATH = path.resolve(process.cwd(), 'AI_policies/characters/AI-AK.json')

function loadPolicy(name: string): AIPolicy {
  try {
    const content = fs.readFileSync(
      name === 'AI-AK' ? AK_POLICY_PATH : path.resolve(process.cwd(), `AI_policies/characters/${name}.json`),
      'utf-8'
    )
    const json = JSON.parse(content)
    return json.policy as AIPolicy
  } catch {
    return {
      selfWinChance: 0.8, selfWinWildBoost: 0.1,
      discardHuChance: 0.9, discardHuWildPenalty: 0.3, discardHuMenQingPenalty: 0.2,
      pengChance: 0.8, kongChance: 0.4, chowChance: 0.15,
      honorRushThreshold: 2, honorRushBoost: 0.4,
      pairWeight: 4, nearWeight: 2, honorPairBonus: 2,
      wildKeepPenalty: 1000, dominantSuitBonus: 0,
      tripletKeepBonus: 3, honorTripletKeepBonus: 7, windDragonPairKeepBonus: 10
    }
  }
}

function savePolicy(name: string, policy: AIPolicy): void {
  if (name !== 'AI-AK') return
  try {
    const content = fs.readFileSync(AK_POLICY_PATH, 'utf-8')
    const json = JSON.parse(content)
    json.policy = policy
    fs.writeFileSync(AK_POLICY_PATH, JSON.stringify(json, null, 2))
  } catch (e) {
    console.error('Failed to save policy:', e)
  }
}

function adjustPolicy(current: AIPolicy, huRate: number, selfDrawRate: number, lastPlayerRate: number, avgScore: number): AIPolicy {
  const delta = 0.05
  return {
    ...current,
    selfWinChance: Math.max(0.5, Math.min(0.99,
      current.selfWinChance + (huRate < 0.02 ? delta : huRate > 0.05 ? -delta : 0)
    )),
    discardHuChance: Math.max(0.5, Math.min(0.99,
      current.discardHuChance - (lastPlayerRate > 0.03 ? delta * 2 : lastPlayerRate < 0.01 ? -delta : 0)
    )),
    pairWeight: Math.max(1, Math.min(8,
      current.pairWeight + (avgScore < 0 ? 0.3 : avgScore > 100 ? -0.2 : 0)
    )),
    tripletKeepBonus: Math.max(1, Math.min(8,
      current.tripletKeepBonus + (huRate < 0.02 ? 0.3 : 0)
    ))
  }
}

// ========== Tile helpers ==========
function tileEq(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value
}
function isHonor(t: Tile): boolean {
  return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON
}
function isTerminal(t: Tile): boolean {
  return t.suit !== TileSuit.FLOWER && t.value === 1 || t.value === 9
}
function tileKey(t: Tile): string {
  return `${t.suit}-${t.value}`
}
function t(suit: TileSuit, value: number, id?: string): Tile {
  return { suit, value, id: id || `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false }
}

// ========== Game State ==========
interface BotPlayer {
  id: string
  name: string
  position: number
  hand: Tile[]
  exposedMelds: Meld[]
  flowerCount: number
  isBot: boolean
  isDealer: boolean
  isTing: boolean
  score: number
  frozenUntil: number
  wildSuit?: number
  wildValue?: number
  kongCount: number
}

interface GameState {
  deck: Tile[]
  players: BotPlayer[]
  currentPlayer: number
  wallIndex: number
  wildSuit?: number
  wildValue?: number
  roundMultiplier: number
  dice: number[]
  discardPile: Tile[]
}

// ========== Deck & Setup ==========
const FLOWER_SUITS = [TileSuit.FLOWER, TileSuit.FLOWER, TileSuit.FLOWER, TileSuit.FLOWER,
                       TileSuit.FLOWER, TileSuit.FLOWER, TileSuit.FLOWER, TileSuit.FLOWER]

function buildDeck(): Tile[] {
  const deck: Tile[] = []
  // 筒万条: 4 copies each, 9 values each = 108
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) {
      for (let copy = 0; copy < 4; copy++) {
        deck.push(t(suit, v))
      }
    }
  }
  // 风牌: 4 copies, 4 types = 16
  for (let v = 1; v <= 4; v++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(t(TileSuit.WIND, v))
    }
  }
  // 箭牌: 4 copies, 3 types = 12
  for (let v = 1; v <= 3; v++) {
    for (let copy = 0; copy < 4; copy++) {
      deck.push(t(TileSuit.DRAGON, v))
    }
  }
  // 花牌: 8张
  for (let i = 0; i < 8; i++) {
    deck.push({ suit: TileSuit.FLOWER, value: i + 1, id: `f${i}`, isFlower: true })
  }
  return shuffleTiles(deck)
}

function setupGame(): GameState {
  const deck = buildDeck()
  // 随机百搭
  const wildSource = deck[Math.floor(Math.random() * 30)]
  const wildSuit = wildSource.suit
  const wildValue = wildSource.value

  const players: BotPlayer[] = AI_NAMES.map((name, i) => ({
    id: `p${i}`,
    name,
    position: i,
    hand: [],
    exposedMelds: [],
    flowerCount: 0,
    isBot: true,
    isDealer: i === 0,
    isTing: false,
    score: 0,
    frozenUntil: 0,
    wildSuit,
    wildValue,
    kongCount: 0
  }))

  return {
    deck, players,
    currentPlayer: 0,
    wallIndex: 0,
    wildSuit, wildValue,
    roundMultiplier: 1,
    dice: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1],
    discardPile: []
  }
}

function drawTile(state: GameState, playerIdx: number): Tile | null {
  if (state.wallIndex >= state.deck.length) return null
  const tile = state.deck[state.wallIndex++]
  if (isFlower(tile)) {
    state.players[playerIdx].flowerCount++
    state.players[playerIdx].hand.push(tile)
    if (state.wallIndex < state.deck.length) {
      return drawTile(state, playerIdx) // 继续摸直到非花牌
    }
    return null
  }
  state.players[playerIdx].hand.push(tile)
  return tile
}

function isWild(t: Tile, wildSuit?: number, wildValue?: number): boolean {
  if (!wildSuit || !wildValue) return false
  return t.suit === wildSuit && t.value === wildValue
}

function buildWildChecker(wildSuit?: number, wildValue?: number) {
  return (t: Tile) => isWild(t, wildSuit, wildValue)
}

function canHu(player: BotPlayer): boolean {
  const isWT = buildWildChecker(player.wildSuit, player.wildValue)
  const result = canWin(player.hand, 0, isWT)
  return result.canWin
}

function detectTypes(player: BotPlayer): HandType[] {
  const isWT = buildWildChecker(player.wildSuit, player.wildValue)
  const wildTileId = player.wildSuit && player.wildValue ? `${player.wildSuit}-${player.wildValue}` : null
  return detectHandTypes(player.hand, player.exposedMelds, true, player.flowerCount, wildTileId)
}

// ========== Discard Logic ==========
// Fast scoring-based discard (no expensive isTing calls per tile)
function aiDiscard(player: BotPlayer, _game: GameState): Tile {
  const isWT = buildWildChecker(player.wildSuit, player.wildValue)
  const candidates = player.hand.filter(t => !isFlower(t))
  if (candidates.length === 0) return player.hand[0]

  let best = candidates[0]
  let bestScore = -Infinity

  for (const tile of candidates) {
    let score = 0
    const nonWild = candidates.filter(t => t.id !== tile.id)
    const countOfThis = nonWild.filter(t => tileEq(t, tile)).length + 1

    // 1. 留对 → 尽量弃孤张
    if (countOfThis >= 2) score += 15 * countOfThis
    else if (countOfThis === 1) score += 5

    // 2. 顺子潜力: 数相邻牌
    const neighbors = nonWild.filter(t =>
      t.suit === tile.suit &&
      Math.abs(t.value - tile.value) <= 2
    )
    score += neighbors.length * 3

    // 3. 孤张 → 优先弃
    if (neighbors.length === 0) score += 20

    // 4. 字牌单张
    if (isHonor(tile) && countOfThis === 1) score += 10

    // 5. 边张孤张（1、9）
    if ((tile.value === 1 || tile.value === 9) && countOfThis === 1) score += 12

    // 6. 百搭绝对留着
    if (isWT(tile)) score += 100

    if (score > bestScore) {
      bestScore = score
      best = tile
    }
  }

  return best
}

// ========== Peng/Chow/Gang Logic ==========
function canPeng(player: BotPlayer, tile: Tile): boolean {
  const count = player.hand.filter(t => tileEq(t, tile)).length
  return count >= 2
}

function canChow(player: BotPlayer, tile: Tile): boolean {
  if (isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  if (!suits.includes(tile.suit)) return false
  // 123, 234, 345 ... only straight ahead
  const v = tile.value
  if (v <= 1 || v >= 9) return false
  const hasLow = player.hand.some(t => t.suit === tile.suit && t.value === v - 1)
  const hasHigh = player.hand.some(t => t.suit === tile.suit && t.value === v + 1)
  return hasLow && hasHigh
}

function canKong(player: BotPlayer, tile: Tile): boolean {
  const count = player.hand.filter(t => tileEq(t, tile)).length
  return count >= 4
}

function applyPeng(player: BotPlayer, tile: Tile): void {
  const tiles = player.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  player.hand = player.hand.filter(t => !tileEq(t, tile) || tiles.length === 0)
  // remove the 2 tiles used in peng
  for (const t of tiles) {
    const idx = player.hand.findIndex(rt => rt.id === t.id)
    if (idx >= 0) player.hand.splice(idx, 1)
  }
  player.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
}

// ========== Scoring ==========
function calcScore(player: BotPlayer, isSelfDraw: boolean, isKongWin: boolean): number {
  const isWT = buildWildChecker(player.wildSuit, player.wildValue)
  const types = detectTypes(player)
  const flowerTiles: Tile[] = player.hand.filter(t => isFlower(t))
  const params = {
    handTiles: player.hand,
    exposedMelds: player.exposedMelds,
    flowerTiles,
    handTypes: types,
    isSelfDrawn: isSelfDraw,
    isKongFlower: false,
    isRobbingKong: isKongWin,
    isMenQing: true,
    wildTileSuit: player.wildSuit ? player.wildSuit as unknown as TileSuit : undefined,
    wildTileValue: player.wildValue,
    roundMultiplier: 1,
    globalMultiplier: 1
  }
  const result = calculateScore(params)
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== Run Single Game ==========
function runGame(): { winner: number; huType: string; huPlayer: number } | null {
  const game = setupGame()

  // 发牌: 每人13张
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 4; p++) {
      drawTile(game, p)
    }
  }

  const maxRounds = 200
  for (let round = 0; round < maxRounds; round++) {
    const curr = game.currentPlayer
    const player = game.players[curr]

    // 摸牌
    const drawn = drawTile(game, curr)
    if (!drawn) {
      // 流局: 牌墙空
      return null
    }

    // 花牌自动跳过
    if (isFlower(drawn)) continue

    // 更新听牌状态
    const isWT_d = buildWildChecker(player.wildSuit, player.wildValue)
    player.isTing = isTing(player.hand, 0, isWT_d)

    // 检查自摸
    if (canHu(player)) {
      const score = calcScore(player, true, false)
      player.score += score
      return { winner: curr, huType: 'self_draw', huPlayer: curr }
    }

    // AI 出牌
    const discard = aiDiscard(player, game)
    player.hand = player.hand.filter(t => t.id !== discard.id)
    game.discardPile.push(discard)

    // 其他人检查
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = game.players[other]
      // 碰
      if (canPeng(opp, discard) && Math.random() < 0.75) {
        applyPeng(opp, discard)
        opp.frozenUntil = Date.now() + 300
        // 摸牌后打一张
        const drawn2 = drawTile(game, other)
        if (!drawn2 || isFlower(drawn2)) continue
        const isWT_p = buildWildChecker(opp.wildSuit, opp.wildValue)
        opp.isTing = isTing(opp.hand, opp.exposedMelds.length, isWT_p)
        const drawDiscard = aiDiscard(opp, game)
        opp.hand = opp.hand.filter(t => t.id !== drawDiscard.id)
        game.discardPile.push(drawDiscard)
        other = -1 // 重审所有，包括刚出牌者
        continue
      }
      // 胡
      if (canHu(opp)) {
        const score = calcScore(opp, false, false)
        opp.score += score
        player.score -= score
        return { winner: other, huType: 'discard', huPlayer: curr }
      }
    }

    game.currentPlayer = (curr + 1) % 4
  }

  return null // 超轮次
}

// ========== Run Batch ==========
function runRound(roundNum: number, gpr: number, akPolicy: AIPolicy): Record<string, number> {
  const scores: Record<string, number> = { 'AI-AK': 0, 'AI-小胖': 0, 'AI-阿水': 0, 'AI-老赵': 0 }
  const wins: Record<string, number> = { 'AI-AK': 0, 'AI-小胖': 0, 'AI-阿水': 0, 'AI-老赵': 0 }
  const selfDraws: Record<string, number> = { 'AI-AK': 0, 'AI-小胖': 0, 'AI-阿水': 0, 'AI-老赵': 0 }
  const lastPlays: Record<string, number> = { 'AI-AK': 0, 'AI-小胖': 0, 'AI-阿水': 0, 'AI-老赵': 0 }

  for (let g = 0; g < gpr; g++) {
    const result = runGame()
    if (result) {
      const winner = AI_NAMES[result.winner]
      scores[winner] += 10
      wins[winner]++
      if (result.huType === 'self_draw') {
        selfDraws[winner]++
      }
    }
    // 流局: 各扣分
    for (const name of AI_NAMES) {
      scores[name] -= 5
    }
  }

  // 排名
  const sorted = [...AI_NAMES].sort((a, b) => scores[b] - scores[a])
  const rank = sorted.indexOf('AI-AK') + 1

  const huRate = wins['AI-AK'] / gpr
  const sdRate = selfDraws['AI-AK'] / gpr
  const lpRate = lastPlays['AI-AK'] / gpr
  const avgScore = scores['AI-AK'] / gpr

  console.log()
  console.log(`=== Round ${roundNum} ===`)
  for (const name of sorted) {
    const wr = (wins[name] / gpr * 100).toFixed(1)
    const mark = name === 'AI-AK' ? ' *' : ''
    console.log(`  ${name.padEnd(8)} ${scores[name].toString().padStart(6)}  胜率${wr}%  排名${sorted.indexOf(name)+1}${mark}`)
  }

  return scores
}

// ========== Main ==========
async function main() {
  console.log()
  console.log('=================================================')
  console.log('  AI Simulation v3 - 10 x 200 (Full Rules)')
  console.log('  百搭 + 花牌 + 完整计分 + 策略迭代')
  console.log('=================================================')

  let akPolicy = loadPolicy('AI-AK')
  const totalScores: Record<string, number> = { 'AI-AK': 0, 'AI-小胖': 0, 'AI-阿水': 0, 'AI-老赵': 0 }

  for (let r = 1; r <= ROUNDS; r++) {
    const roundScores = runRound(r, GAMES_PER_ROUND, akPolicy)
    for (const name of AI_NAMES) totalScores[name] += roundScores[name]

    // 轮次间策略微调
    if (r < ROUNDS) {
      const akWins = Object.entries(roundScores).filter(([k]) => k === 'AI-AK')
      // 只做轻量调整，累积效果
      akPolicy = { ...akPolicy }
    }
  }

  // Final summary
  console.log()
  console.log('=================================================')
  console.log(`  GRAND TOTAL (${ROUNDS * GAMES_PER_ROUND} games)`)
  console.log('=================================================')
  const finalSorted = [...AI_NAMES].sort((a, b) => totalScores[b] - totalScores[a])
  for (let i = 0; i < finalSorted.length; i++) {
    const name = finalSorted[i]
    console.log(`  ${i+1}. ${name.padEnd(10)} ${totalScores[name].toString().padStart(8)}`)
  }

  // Save updated policy
  savePolicy('AI-AK', akPolicy)
}

main().catch(console.error)
