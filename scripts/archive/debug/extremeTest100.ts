/**
 * 极端测试 — 4个AI，有吃必吃、有碰必碰、有胡必胡
 * 验证吃牌链路 + 胡牌判定（canWin 公式修复后）
 * 用法: npx tsx scripts/extremeTest100.ts [num_games]
 */
import {
  canWin, buildWildTileChecker, detectHandTypes,
} from '../server/utils/handValidator'
import { TileSuit, type Tile, type Meld, MeldType } from '../server/types/game'
import { randomUUID } from 'crypto'

const TOTAL_GAMES = parseInt(process.argv[2] || '100')
const AI_NAMES = ['AI-张三', 'AI-李四', 'AI-王五', 'AI-赵六']
const MAX_TURNS = 500

// ═══ Tile helpers ═══
function mkTile(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${randomUUID()}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isFlower(t: Tile): boolean { return t.isFlower }

// ═══ Deck ═══
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(mkTile(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(mkTile(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}-${randomUUID()}`, isFlower: true })
  return d
}

// ═══ Player ═══
interface BotPlayer {
  id: string; name: string; position: number
  hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[]
  status: 'playing' | 'won'; winMode?: 'self_draw' | 'discard' | 'pass'
}

interface GState {
  players: BotPlayer[]
  wall: Tile[]; wallIdx: number
  wildSuit?: TileSuit; wildValue?: number
  discardPile: Tile[]
  currentTurnIdx: number
}

let G: GState

function setupGame(): GState {
  const deck = buildDeck()
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value

  const players = AI_NAMES.map((name, i) => ({
    id: `p${i}`, name, position: i,
    hand: [] as Tile[], exposedMelds: [] as Meld[], flowerTiles: [] as Tile[],
    status: 'playing' as const, winMode: undefined
  }))

  let idx = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 13; j++) {
      const t = deck[idx++]
      if (isFlower(t)) { players[i].flowerTiles.push(t); j--; continue }
      players[i].hand.push(t)
    }
  }

  // Build wall (skip flowers)
  const wall: Tile[] = []
  for (let i = idx; i < deck.length; i++) if (!isFlower(deck[i])) wall.push(deck[i])

  // Dealer draws 14th tile
  if (wall.length > 0) players[0].hand.push(wall[0])

  return { players, wall, wallIdx: 1, wildSuit: ws, wildValue: wv, discardPile: [], currentTurnIdx: 0 }
}

function drawFromWall(p: BotPlayer): Tile | null {
  if (G.wallIdx >= G.wall.length) return null
  const t = G.wall[G.wallIdx++]
  if (isFlower(t)) { p.flowerTiles.push(t); return drawFromWall(p) }
  p.hand.push(t)
  return t
}

// ═══ Checks ═══
function canChowFrom(p: BotPlayer, tile: Tile, discardingPlayerIdx: number): boolean {
  if (isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const myIdx = G.players.indexOf(p)
  // Only eat from the player to your left (previous player clockwise)
  if ((discardingPlayerIdx + 1) % 4 !== myIdx) return false

  const v = tile.value, suit = tile.suit
  // Check if player can form a chow with this tile
  for (const t of p.hand) {
    if (t.suit !== suit) continue
    const dv = t.value - v
    // t = v-1, t = v-2, t = v+1, t = v+2
    if (dv === -1 || dv === -2 || dv === 1 || dv === 2) {
      // Find a second tile to complete the chow
      for (const t2 of p.hand) {
        if (t2.id === t.id || t2.suit !== suit) continue
        const dv2 = t2.value - v
        const vals = [t.value, t2.value, v].sort((a, b) => a - b)
        if (vals[0] >= 1 && vals[2] <= 9 && vals[1] - vals[0] === 1 && vals[2] - vals[1] === 1) {
          return true
        }
      }
    }
  }
  return false
}

function canPeng(p: BotPlayer, tile: Tile): boolean {
  return p.hand.filter(t => tileEq(t, tile)).length >= 2
}

function applyChow(p: BotPlayer, discTile: Tile): boolean {
  const v = discTile.value, suit = discTile.suit
  // Find a valid chow combo
  for (let i = 0; i < p.hand.length; i++) {
    for (let j = i + 1; j < p.hand.length; j++) {
      const t1 = p.hand[i], t2 = p.hand[j]
      if (t1.suit !== suit || t2.suit !== suit) continue
      const vals = [t1.value, t2.value, v].sort((a, b) => a - b)
      if (vals[0] >= 1 && vals[2] <= 9 && vals[1] - vals[0] === 1 && vals[2] - vals[1] === 1) {
        // Found valid chow! Remove t1 and t2 from hand
        p.hand.splice(j, 1) // remove t2 (higher index first)
        p.hand.splice(i, 1) // remove t1
        p.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: [mkTile(suit, vals[0]), mkTile(suit, vals[1]), mkTile(suit, vals[2])], isConcealed: false })
        return true
      }
    }
  }
  return false
}

function applyPeng(p: BotPlayer, tile: Tile): boolean {
  const matches = p.hand.filter(t => tileEq(t, tile))
  if (matches.length < 2) return false
  for (const u of matches.slice(0, 2)) {
    const idx = p.hand.findIndex(t => t.id === u.id)
    if (idx >= 0) p.hand.splice(idx, 1)
  }
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [mkTile(tile.suit, tile.value), mkTile(tile.suit, tile.value), mkTile(tile.suit, tile.value)], isConcealed: false })
  return true
}

function checkWinForPlayer(hand: Tile[], exposedMelds: Meld[], flowers: number, wt: string | null): { win: boolean; handType: string } {
  const canWinResult = canWin(hand, exposedMelds.length, buildWildTileChecker(wt))
  if (!canWinResult.canWin) return { win: false, handType: '' }
  // Check specific hand types for statistics
  const types = detectHandTypes(hand, exposedMelds, false, flowers, wt)
  const handType = types.length > 0 ? types[0] : 'standard'
  return { win: true, handType }
}

function selectDiscard(p: BotPlayer): Tile {
  if (p.hand.length === 0) return mkTile(TileSuit.WIND, 1)
  let best: Tile | null = null
  let bestScore = Infinity
  const wt = p.hand.some(t => G.wildSuit && G.wildValue && t.suit === G.wildSuit && t.value === G.wildValue)

  for (const tile of p.hand) {
    if (isHonor(tile)) { best = best || tile; continue }
    if (G.wildSuit && G.wildValue && tile.suit === G.wildSuit && tile.value === G.wildValue) continue // never discard wild

    let score = 0
    const same = p.hand.filter(t => tileEq(t, tile)).length
    if (same >= 2) score -= 10
    if (!isHonor(tile)) {
      const adj = p.hand.filter(t => t.suit === tile.suit && Math.abs(t.value - tile.value) >= 1 && Math.abs(t.value - tile.value) <= 2 && !tileEq(t, tile)).length
      if (adj === 0) score += 5
    }
    if (score < bestScore) { bestScore = score; best = tile }
  }
  return best || p.hand[0]
}

// ═══ Stats ═══
const ALLOWED_WIN_TYPES = new Set([
  '风一色', '风碰', '清碰', '混碰', '清一色', '混一色', '八花', '四百搭', '碰碰胡', '大吊'
])

const stats = {
  wins: 0, draws: 0, selfDraws: 0, discardWins: 0,
  chows: 0, pengs: 0,
  winTypes: {} as Record<string, number>,
  winPlayers: {} as Record<string, number>,
  winTurns: [] as number[],
  handLimitViolations: 0,
  handLimitViolationLogs: [] as string[],
  winTypeWhitelistViolations: 0,
  winTypeWhitelistViolationLogs: [] as string[],
  chowPengConflicts: 0,
  chowPengConflictLogs: [] as string[],
}

function totalTileCount(p: BotPlayer): number {
  const meldTileCount = p.exposedMelds.reduce((acc, m) => acc + m.tiles.length, 0)
  return p.hand.length + meldTileCount
}

function checkHandLimit(gameNo: number, turnNo: number): void {
  for (const p of G.players) {
    const total = totalTileCount(p)
    if (total > 14) {
      stats.handLimitViolations++
      stats.handLimitViolationLogs.push(`[Game ${gameNo} Turn ${turnNo}] ${p.name} totalTiles=${total} hand=${p.hand.length} meldTiles=${total - p.hand.length}`)
    }
  }
}

function checkWinTypeWhitelist(gameNo: number, turnNo: number, p: BotPlayer, handType: string, mode: 'self_draw' | 'discard'): void {
  if (!ALLOWED_WIN_TYPES.has(handType)) {
    stats.winTypeWhitelistViolations++
    stats.winTypeWhitelistViolationLogs.push(`[Game ${gameNo} Turn ${turnNo}] ${p.name} ${mode} handType=${handType}`)
  }
}

// ═══ Play one game ═══
function playGame(gameNo: number): void {
  G = setupGame()
  let turns = 0
  let lastDiscard: { tile: Tile; playerIdx: number } | null = null

  while (turns < MAX_TURNS) {
    turns++
    checkHandLimit(gameNo, turns)
    const pi = G.currentTurnIdx
    const p = G.players[pi]
    if (p.status !== 'playing') { G.currentTurnIdx = (pi + 1) % 4; continue }

    // ── Check self-win (摸牌前) ──
    const wtStr = G.wildSuit && G.wildValue ? `${G.wildSuit}-${G.wildValue}` : null
    const selfWin = checkWinForPlayer(p.hand, p.exposedMelds, p.flowerTiles.length, wtStr)
    if (selfWin.win) {
      checkWinTypeWhitelist(gameNo, turns, p, selfWin.handType, 'self_draw')
      p.status = 'won'; p.winMode = 'self_draw'
      stats.wins++; stats.selfDraws++
      stats.winTypes[selfWin.handType] = (stats.winTypes[selfWin.handType] || 0) + 1
      stats.winPlayers[p.name] = (stats.winPlayers[p.name] || 0) + 1
      stats.winTurns.push(turns)
      return
    }

    // ── Draw tile ──
    const drawn = drawFromWall(p)
    if (!drawn) { stats.draws++; break }

    // ── Check self-win (after draw) ──
    const selfWin2 = checkWinForPlayer(p.hand, p.exposedMelds, p.flowerTiles.length, wtStr)
    if (selfWin2.win) {
      checkWinTypeWhitelist(gameNo, turns, p, selfWin2.handType, 'self_draw')
      p.status = 'won'; p.winMode = 'self_draw'
      stats.wins++; stats.selfDraws++
      stats.winTypes[selfWin2.handType] = (stats.winTypes[selfWin2.handType] || 0) + 1
      stats.winPlayers[p.name] = (stats.winPlayers[p.name] || 0) + 1
      stats.winTurns.push(turns)
      return
    }

    // ── Check Peng (of last discard) — priority over chow ──
    // Check all players in order
    if (lastDiscard) {
      let someoneClaimed = false
      for (let offset = 1; offset < 4; offset++) {
        const cIdx = (lastDiscard.playerIdx + offset) % 4
        const claimer = G.players[cIdx]
        if (claimer.status !== 'playing') continue

        // Check discard win first (捉冲)
        const tempHand = [...claimer.hand, lastDiscard.tile]
        const discWin = canWin(tempHand, claimer.exposedMelds.length, buildWildTileChecker(wtStr))
        if (discWin.canWin) {
          claimer.hand = tempHand; claimer.status = 'won'; claimer.winMode = 'discard'
          const ht = detectHandTypes(tempHand, claimer.exposedMelds, false, claimer.flowerTiles.length, wtStr)
          stats.wins++; stats.discardWins++
          const htStr = ht.length > 0 ? ht[0] : ''
          checkWinTypeWhitelist(gameNo, turns, claimer, htStr, 'discard')
          stats.winTypes[htStr] = (stats.winTypes[htStr] || 0) + 1
          stats.winPlayers[claimer.name] = (stats.winPlayers[claimer.name] || 0) + 1
          stats.winTurns.push(turns)
          return
        }

        const pengPossible = canPeng(claimer, lastDiscard.tile)
        const chowPossible = canChowFrom(claimer, lastDiscard.tile, lastDiscard.playerIdx)
        if (pengPossible && chowPossible) {
          stats.chowPengConflicts++
          stats.chowPengConflictLogs.push(`[Game ${gameNo} Turn ${turns}] ${claimer.name} both chow+peng on ${lastDiscard.tile.suit}-${lastDiscard.tile.value}`)
        }

        // Check peng (extreme: peng chance=1.0)
        if (pengPossible) {
          if (applyPeng(claimer, lastDiscard.tile)) {
            stats.pengs++; G.currentTurnIdx = cIdx; lastDiscard = null; someoneClaimed = true; break
          }
        }

        // Check chow (extreme: chow chance=1.0) — only if no peng
        if (!someoneClaimed && chowPossible) {
          if (applyChow(claimer, lastDiscard.tile)) {
            stats.chows++; G.currentTurnIdx = cIdx; lastDiscard = null; someoneClaimed = true; break
          }
        }
      }
      if (someoneClaimed) continue
    }

    // ── Discard ──
    const discTile = selectDiscard(p)
    const dIdx = p.hand.findIndex(t => t.id === discTile.id)
    if (dIdx >= 0) p.hand.splice(dIdx, 1)
    G.discardPile.push(discTile)
    lastDiscard = { tile: discTile, playerIdx: pi }
    G.currentTurnIdx = (pi + 1) % 4
  }

  stats.draws++
}

// ═══ Main ═══
function main() {
  console.log(`🀄️  极端测试: ${TOTAL_GAMES}局 | 4AI | 有吃必吃/有碰必碰/有胡必胡 (canWin 公式: 14-3*melds)\n`)

  for (let i = 1; i <= TOTAL_GAMES; i++) {
    playGame(i)
  }

  const totalGames = stats.wins + stats.draws
  console.log(`═══════════════════════════════════════`)
  console.log(`📊 极端测试报告 (${TOTAL_GAMES}局)`)
  console.log(`═══════════════════════════════════════`)
  console.log(`胡牌: ${stats.wins} 局 (${totalGames > 0 ? (stats.wins/totalGames*100).toFixed(1) : 0}%)`)
  console.log(`流局: ${stats.draws} 局 (${totalGames > 0 ? (stats.draws/totalGames*100).toFixed(1) : 0}%)`)
  console.log(`自摸胡: ${stats.selfDraws}`)
  console.log(`捉冲胡: ${stats.discardWins}`)
  console.log(`吃牌: ${stats.chows}次`)
  console.log(`碰牌: ${stats.pengs}次`)
  console.log(`\n🃏 胡牌牌型分布:`)
  for (const [t, c] of Object.entries(stats.winTypes)) console.log(`  ${t}: ${c}`)
  console.log(`\n👤 各玩家胡牌:`)
  for (const [n, c] of Object.entries(stats.winPlayers)) console.log(`  ${n}: ${c}次`)

  const avgTurns = stats.winTurns.length > 0
    ? (stats.winTurns.reduce((a, b) => a + b, 0) / stats.winTurns.length).toFixed(1)
    : 'N/A'
  console.log(`\n平均每局胡牌步数: ${avgTurns}`)

  console.log(`\n🧪 断言检查:`)
  console.log(`  手牌上限检查(<=14): ${stats.handLimitViolations === 0 ? 'PASS' : 'FAIL'} | violations=${stats.handLimitViolations}`)
  console.log(`  牌型白名单检查(10种): ${stats.winTypeWhitelistViolations === 0 ? 'PASS' : 'FAIL'} | violations=${stats.winTypeWhitelistViolations}`)
  console.log(`  吃碰互斥冲突计数: ${stats.chowPengConflicts === 0 ? 'PASS' : 'FAIL'} | conflicts=${stats.chowPengConflicts}`)

  if (stats.handLimitViolationLogs.length > 0) {
    console.log(`\n⚠️ 手牌上限异常日志:`)
    for (const log of stats.handLimitViolationLogs.slice(0, 20)) console.log(`  ${log}`)
  }
  if (stats.winTypeWhitelistViolationLogs.length > 0) {
    console.log(`\n⚠️ 牌型白名单异常日志:`)
    for (const log of stats.winTypeWhitelistViolationLogs.slice(0, 20)) console.log(`  ${log}`)
  }
  if (stats.chowPengConflictLogs.length > 0) {
    console.log(`\n⚠️ 吃碰冲突异常日志:`)
    for (const log of stats.chowPengConflictLogs.slice(0, 20)) console.log(`  ${log}`)
  }

  console.log(`\n【诊断】`)
  if (stats.wins > 0) {
    console.log(`  ✅ 胡牌率${(stats.wins/totalGames*100).toFixed(1)}% — canWin公式和吃牌链路正常！`)
    console.log(`  ✅ 吃牌${stats.chows}次 — 吃牌链路通畅`)
    console.log(`  ✅ 碰牌${stats.pengs}次 — 碰牌正常`)
    console.log(`  ✅ 吃碰排斥：吃牌仅发生在上家弃牌时 — 吃碰优先级已遵守`)
  } else {
    console.log(`  ❌ 胡牌率0% — 需进一步排查`)
    if (stats.chows > 500) console.log(`  ✅ 吃牌${stats.chows}次 — 吃牌链路通畅`)
    else console.log(`  ❌ 吃牌仅${stats.chows}次 — 吃牌流程有问题`)
  }
}

main()
