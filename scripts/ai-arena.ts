/**
 * AI 竞技对战脚本（ai-arena.ts）
 *
 * 使用服务端真实决策逻辑模拟对战：
 * - 弃牌使用服务端 selectDiscardTile()（botService.ts）
 * - 吃碰杠使用服务端 shouldClaimPendingAction()（botService.ts）
 * - 暗杠/加杠使用服务端 evaluateSelfKong()（botController.ts）
 * - 胜负检测/算分与服务端完全一致（canWin + calculateScore + calculateSettlementBreakdownByRules）
 *
 * 用法：
 *   npx tsx scripts/ai-arena.ts                    # 默认 100 局
 *   npx tsx scripts/ai-arena.ts --games 5          # 指定局数
 *   npx tsx scripts/ai-arena.ts --no-detail        # 关闭逐局明细
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ========== 服务端核心逻辑 ==========
import { TileSuit, MeldType, ActionType, GamePhase, PlayerStatus } from '../server/types/game'
import type { Tile, Meld, Player, GameState, PendingAction } from '../server/types/game'
import { shuffleTiles, isFlower, isHonor, groupTiles, tilesEqual } from '../server/utils/tiles'
import { canWin, detectHandTypes, buildWildTileChecker } from '../server/utils/handValidator'
import { calculateScore, calculateSettlementBreakdownByRules } from '../server/utils/scoring'
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService'
import { evaluateSelfKong } from '../server/utils/botController'

// ========== 训练脚本（仅用于 loadCharacter） ==========
import { loadCharacter } from './train-ai-ak'

// ========== 常量 ==========
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const SETTLEMENT_MULT = 10

// 6 个候选 AI
const CANDIDATES = ['AI-AK', 'AI-小猪', 'AI-小胖', 'AI-老蒋', 'AI-老赵', 'AI-阿水'] as const
type AIName = (typeof CANDIDATES)[number]

// ========== 参数解析 ==========
const ARGS = process.argv.slice(2)
function argValue(flag: string, fallback: number): number {
  const i = ARGS.indexOf(flag)
  if (i < 0) return fallback
  const v = parseInt(ARGS[i + 1] || '', 10)
  return Number.isFinite(v) ? v : fallback
}
function argFlag(flag: string): boolean { return ARGS.includes(flag) }

const GAMES = argValue('--games', 100)
const TOP_N = argValue('--top', 6)
const DETAIL = !argFlag('--no-detail')
const DETAIL_MAX = argValue('--detail-max', 30)
const SEED = (() => {
  const i = ARGS.indexOf('--seed')
  if (i < 0) return null
  const v = parseInt(ARGS[i + 1] || '', 10)
  return Number.isFinite(v) ? v : null
})()

if (SEED !== null) {
  let s = SEED >>> 0
  const rng = () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  Math.random = rng
}

// ========== 牌面工具 ==========
const SUIT_CN: Record<string, string> = { dots: '筒', wan: '万', tiao: '条', feng: '风', jian: '箭', hua: '花' }
const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const WIND_CN: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' }
const DRAGON_CN: Record<number, string> = { 1: '中', 2: '发', 3: '白' }
const FLOWER_CN: Record<number, string> = { 1: '春', 2: '夏', 3: '秋', 4: '冬', 5: '梅', 6: '兰', 7: '竹', 8: '菊' }

function t(suit: TileSuit, v: number, id?: string): Tile {
  return { suit, value: v, id: id || `${suit}-${v}-${Math.random().toString(36).slice(2, 8)}`, isFlower: false }
}

function tileEq(a: Tile, b: Tile): boolean {
  if (!a || !b) return false
  return a.suit === b.suit && a.value === b.value
}

function isWild(t: Tile, ws?: TileSuit, wv?: number): boolean {
  return ws && wv ? t.suit === ws && t.value === wv : false
}

function tileStr(t: Tile): string {
  if (!t) return '??'
  if (t.suit === TileSuit.FLOWER) return FLOWER_CN[t.value] || `花${t.value}`
  if (t.suit === TileSuit.WIND) return WIND_CN[t.value] || `风${t.value}`
  if (t.suit === TileSuit.DRAGON) return DRAGON_CN[t.value] || `箭${t.value}`
  const s = SUIT_CN[t.suit] || t.suit
  return `${NUM_CN[t.value] || t.value}${s}`
}

function normalizeHand(hand: Tile[]): Tile[] {
  return hand.filter(t => t !== undefined && t !== null)
}

function tileStrWithId(t: Tile): string { return `${tileStr(t)}#${t.id.slice(-4)}` }

const HAND_TYPE_NAMES: Record<string, string> = {
  feng_peng: '风碰', all_wind: '风一色', qing_peng: '清碰',
  hun_peng: '混碰', eight_flowers: '八花', full_flush: '清一色',
  half_flush: '混一色', four_wild: '四百搭', all_triplets: '碰碰胡',
  da_diao: '大吊'
}

// ========== 内部游戏状态（与 train-ai-ak.ts 的 BotPlayer 一致） ==========
interface BotPlayer {
  name: string; pos: number; hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[]
  isBot: boolean; isTing: boolean; score: number
  wildSuit?: TileSuit; wildValue?: number
  kongCount: number; id: string; status: 'playing' | 'won'
  policy: any
  meldSources: number[]
  discardedTiles: Tile[]
  wonFan?: number; winHandType?: string
}

interface GameEvent { turn: number; player: string; action: string; detail: string }
interface SettlementEntry { from: string; to: string; amount: number; reason: string; fan?: number; mult?: number }
interface PlayerSnapshot {
  name: string; hand: string; melds: string[]; flowers: string[]; meldSources: number[]
  wildCount: number; wildTile: string; wonFan?: number; winHandType?: string; status: string
}
interface WinnerInfo {
  playerIndex: number; name: string; hand: string; melds: string[]; flowers: string[]
  isSelfDraw: boolean; wonFan: number; baseFan: number; winHandType: string; winForm: string; roundNum: number
  wildTile: string; wildTileValue?: number; isMenQing: boolean; winningTile?: string
  winningFrom?: string; handTypes: string[]
}
interface TurnSnapshot {
  turn: number; currentPlayer: number; drawnTile: string; discardedTile: string
  lastDiscardBy: number; lastDiscard: string
  players: Array<{
    name: string; hand: string; exposed: string[]; meldSources: number[]
    handCount: number; flowers: string[]
  }>
  wildTile: string; gameMultiplier: number; gameIdx: number; wallIdx: number
}
interface GameResult {
  winner: number; scores: number[]; events: GameEvent[]; multiplier: number
  settlementLog: SettlementEntry[]; snapshots: PlayerSnapshot[]; roundNum: number
  winnersThisGame: WinnerInfo[]
  turnSnapshots: TurnSnapshot[]
}

// ========== 适配层：BotPlayer → 服务端 Player ==========
function toServerPlayer(bp: BotPlayer, policy: any): Player {
  return {
    id: bp.id,
    userId: bp.id,
    name: bp.name,
    position: bp.pos,
    hand: {
      concealedTiles: [...bp.hand],
      exposedMelds: bp.exposedMelds.map(m => ({ ...m, tiles: [...m.tiles] })),
      discardedTiles: [...bp.discardedTiles],
    },
    status: bp.status === 'won' ? PlayerStatus.WON : PlayerStatus.PLAYING,
    isDealer: bp.pos === 0,
    isTing: bp.isTing,
    missingSuit: null,
    score: bp.score,
    windScore: 0,
    rainScore: 0,
    wonFan: bp.wonFan ?? 0,
    winHandType: bp.winHandType,
    winOrder: null,
    winRound: null,
    winTimestamp: null,
    isSelfDrawn: undefined,
    discarderId: undefined,
    winningScoreBreakdown: undefined,
    __trainingPolicy: policy,
  } as any
}

function toServerGame(g: GameState): any {
  return {
    gameId: 'arena-real',
    roomNumber: 'arena',
    phase: GamePhase.PLAYING,
    endReason: null,
    players: g.players.map(bp => toServerPlayer(bp, bp.policy)),
    wall: new Array(Math.max(0, (g.deck?.length || 0) - (g.wallIdx || 0))),
    currentPlayerIndex: g.current,
    dealerIndex: 0,
    discardPile: [...g.discardPile],
    actionHistory: [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    customScoringMode: g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null,
    wildTileGroup: g.wildSuit && g.wildValue ? [`${g.wildSuit}-${g.wildValue}`] : undefined,
    dice: [1, 1] as [number, number],
    roundMultiplier: 1,
    inheritMultiplier: g.gameMultiplier,
    inheritedGlobalMultiplier: g.gameMultiplier,
    hesitationWindow: 0,
    settlementMultiplier: SETTLEMENT_MULT,
    roundStats: [],
    chowPongExclusion: {},
  }
}

function makePendingAction(playerId: string, tile: Tile, availableActions: ActionType[]): PendingAction {
  return { playerId, availableActions, tile, expiresAt: Date.now() + 5000 } as PendingAction
}

function makeClaimGame(g: GameState, tile: Tile, playerId: string, actions: ActionType[]): any {
  const sg = toServerGame(g)
  sg.pendingActions = [makePendingAction(playerId, tile, actions)]
  return sg
}

// ========== 游戏辅助 ==========
function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i + 1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

function drawTile(g: GameState, p: BotPlayer): Tile | null {
  if (g.wallIdx >= g.deck.length) return null
  const tile = g.deck[g.wallIdx++]
  if (!tile) return drawTile(g, p)
  if (isFlower(tile)) { p.flowerTiles.push(tile); return drawTile(g, p) }
  p.hand.push(tile)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer): string | null { return p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null }

function canPeng(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 2
}

function canChow(p: BotPlayer, tile: Tile): boolean {
  if (!tile || isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const v = tile.value
  const h = normalizeHand(p.hand)
  const has = (val: number) => h.some(t => t.suit === tile.suit && t.value === val)
  if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) return true
  if (v >= 3 && has(v - 1) && has(v - 2)) return true
  if (v <= 7 && has(v + 1) && has(v + 2)) return true
  return false
}

function canMingKong(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 3
}

function canAnKong(p: BotPlayer): Tile[] {
  const hand = normalizeHand(p.hand)
  const groups = groupTiles(hand)
  const result: Tile[] = []
  for (const [, tiles] of groups) { if (tiles.length === 4 && tiles[0]) result.push(tiles[0]) }
  return result
}

function canJiaGang(p: BotPlayer): Tile[] {
  const result: Tile[] = []
  for (const meld of p.exposedMelds) {
    if (meld.type === MeldType.TRIPLET) {
      const found = p.hand.find(t => tileEq(t, meld.tiles[0]))
      if (found) result.push(found)
    }
  }
  return result
}

function applyPeng(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  if (matches.length < 2) return
  for (const m of matches) {
    const idx = p.hand.findIndex(rt => rt.id === m.id)
    if (idx >= 0) p.hand.splice(idx, 1)
  }
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}

function applyMingKong(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 3)
  if (matches.length < 3) return
  for (const m of matches) {
    const idx = p.hand.findIndex(rt => rt.id === m.id)
    if (idx >= 0) p.hand.splice(idx, 1)
  }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: false })
  p.kongCount++
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}

function applyAnKong(p: BotPlayer, tile: Tile): void {
  p.hand = normalizeHand(p.hand)
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 4) return
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  p.exposedMelds.push({ type: MeldType.CONCEALED_KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
  p.kongCount++
}

function applyJiaGang(p: BotPlayer, tile: Tile): void {
  p.hand = normalizeHand(p.hand)
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 1) return
  const meld = p.exposedMelds.find(m => m.type === MeldType.TRIPLET && tileEq(m.tiles[0], tile))
  if (!meld) return
  meld.type = MeldType.KONG; meld.tiles = [tile, tile, tile, tile]; meld.isConcealed = false
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  p.kongCount++
}

// ========== 算分与结算（与服务端完全一致） ==========
const SETTLEMENT_CACHE = new Map<string, any>()

function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, gameMultiplier: number): { finalPoints: number; baseFan: number; handTypeName: string } {
  const wildTileId = p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null
  const types = detectHandTypes(p.hand, p.exposedMelds, isSelfDraw, p.flowerTiles.length, wildTileId)
  const result = calculateScore({
    handTiles: p.hand, exposedMelds: p.exposedMelds,
    flowerTiles: p.flowerTiles, handTypes: types,
    isSelfDrawn: isSelfDraw, isKongFlower: isKongWin,
    isRobbingKong: false, isMenQing: p.exposedMelds.filter(m => !m.isConcealed).length === 0,
    wildTileSuit: p.wildSuit, wildTileValue: p.wildValue,
    rawRoundMultiplier: 1, rawInheritMultiplier: gameMultiplier,
    settlementMultiplier: SETTLEMENT_MULT
  })
  return { finalPoints: result.finalPoints, baseFan: result.baseFan, handTypeName: result.handTypeName }
}

function applyEngineSettlement(g: GameState, winnerIdx: number, isSelfDraw: boolean, wonFan: number, discarderIdx: number | null): void {
  const eligiblePlayerIndices: number[] = []
  for (let i = 0; i < g.players.length; i++) {
    if (i === winnerIdx) { eligiblePlayerIndices.push(i); continue }
    if (g.players[i].status !== 'won') eligiblePlayerIndices.push(i)
  }
  const mutualBailout = new Map<number, Array<{ partnerIndex: number; type: '三口' | '四口' }>>()
  for (let ci = 0; ci < 4; ci++) {
    if (ci === winnerIdx) continue
    const meldCount = g.players[ci].meldSources[winnerIdx]
    if (meldCount >= 3) {
      const type = meldCount >= 4 ? '四口' : '三口'
      mutualBailout.set(ci, [{ partnerIndex: winnerIdx, type }])
    }
  }
  const breakdown = calculateSettlementBreakdownByRules(
    wonFan, isSelfDraw, winnerIdx, eligiblePlayerIndices, mutualBailout, discarderIdx ?? undefined
  )
  breakdown.deltas.forEach((delta, idx) => { g.players[idx].score += delta })
}

// ========== 骰子 / 倍数（与训练引擎一致） ==========
let prevRoundWasDraw = false

function rollMultiplier(): number {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  const isPair = d1 === d2
  const isBigPair = isPair && (d1 === 1 || d1 === 4)
  if (isBigPair) return 4
  if (isPair) return 2
  return 1
}

interface GameState {
  deck: Tile[]; wallIdx: number
  players: BotPlayer[]; current: number
  wildSuit?: TileSuit; wildValue?: number
  discardPile: Tile[]
  gameMultiplier: number
  playerDiscards: Tile[][]
}

// ========== 核心游戏循环（使用服务端真实决策） ==========
async function runRealGame(policies: any[], gameIdx: number = 0): Promise<GameResult | null> {
  const deck = buildDeck()
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value
  const gameMultiplier = rollMultiplier()

  const players: BotPlayer[] = policies.map((policy, i) => ({
    name: policy.id || `P${i}`, pos: i, hand: [] as Tile[], exposedMelds: [] as Meld[],
    flowerTiles: [] as Tile[], isBot: true, isTing: false, score: 0,
    wildSuit: ws, wildValue: wv, kongCount: 0, id: `p${i}`, status: 'playing' as const,
    policy, meldSources: [0, 0, 0, 0], discardedTiles: [] as Tile[],
  }))

  const g: GameState = { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [], gameMultiplier, playerDiscards: [[], [], [], []] }
  const events: GameEvent[] = []
  const settlementLog: SettlementEntry[] = []
  const winnersThisGame: WinnerInfo[] = []
  const finishedPlayers = new Set<number>()
  const turnSnapshots: TurnSnapshot[] = []
  let turn = 0

  // 发牌 13 张
  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }

  const nextActivePlayer = (from: number): number | null => {
    for (let offset = 1; offset <= 4; offset++) {
      const idx = (from + offset) % 4
      const c = g.players[idx]
      if (!finishedPlayers.has(idx) && c.status !== 'won') return idx
    }
    return null
  }

  const buildResult = (primaryWinner: number, winMode: string, baseScore: number, handType: string, fanScore: number, discarder: number | undefined): GameResult => ({
    winner: primaryWinner,
    scores: g.players.map(p => p.score),
    events,
    multiplier: g.gameMultiplier,
    settlementLog,
    snapshots: g.players.map(p => {
      const wtStr = (p.wildSuit && p.wildValue) ? `${p.wildSuit}-${p.wildValue}` : null
      const concealed = normalizeHand(p.hand).filter(t => !isFlower(t))
      return {
        name: p.name,
        hand: [...concealed].sort((a, b) => a.suit.localeCompare(b.suit) || a.value - b.value).map(t => isWT(t, p) ? tileStr(t) + '*' : tileStr(t)).join(' '),
        melds: p.exposedMelds.map(m => `${m.type === MeldType.TRIPLET ? '碰' : m.type === MeldType.SEQUENCE ? '吃' : '杠'}:${m.tiles.map(t => tileStr(t)).join(' ')}`),
        flowers: p.flowerTiles.map(t => tileStr(t)),
        meldSources: [...p.meldSources],
        wildCount: p.hand.filter(t => isWT(t, p)).length,
        wildTile: wtStr ? tileStr({ suit: ws, value: wv, id: '' } as Tile) : '(无百搭)',
        wonFan: p.wonFan,
        winHandType: p.winHandType,
        status: p.status,
      }
    }),
    roundNum: turn,
    winnersThisGame: [...winnersThisGame],
    turnSnapshots,
  })

  const recordPayment = (from: string, to: string, amount: number, reason: string, fan?: number, mult?: number) => {
    settlementLog.push({ from, to, amount, reason, fan, mult })
  }

  const formatMelds = (melds: Meld[]): string[] => {
    if (melds.length === 0) return []
    const sorted = [...melds].sort((a, b) => {
      if (a.tiles[0].suit !== b.tiles[0].suit) return a.tiles[0].suit.localeCompare(b.tiles[0].suit)
      const order = (m: Meld) => m.type === MeldType.TRIPLET ? 0 : m.type === MeldType.SEQUENCE ? 1 : 2
      return order(a) - order(b)
    })
    const groups: string[] = []
    let curSuit: string | null = null, curType: MeldType | null = null, grp: Tile[] = []
    for (const m of sorted) {
      const s = m.tiles[0].suit
      if (s !== curSuit || m.type !== curType) {
        if (grp.length > 0 && curSuit !== null) groups.push(`${curType === MeldType.TRIPLET ? '碰' : curType === MeldType.SEQUENCE ? '顺' : '杠'}:${grp.map(t => tileStr(t)).join(' ')}`)
        curSuit = s; curType = m.type; grp = [...m.tiles]
      } else { grp.push(...m.tiles) }
    }
    if (grp.length > 0 && curSuit !== null) groups.push(`${curType === MeldType.TRIPLET ? '碰' : curType === MeldType.SEQUENCE ? '顺' : '杠'}:${grp.map(t => tileStr(t)).join(' ')}`)
    return groups
  }

  const recordWinner = (p: BotPlayer, idx: number, isSelfDraw: boolean, wonFan: number, baseFan: number, roundNum: number, winningTile?: Tile, winningFrom?: string) => {
    const isWT2 = (t: Tile) => isWT(t, p)
    const concealed = normalizeHand(p.hand).filter(t => !isFlower(t))
    const normal = concealed.filter(t => !isWT2(t))
    const wilds = concealed.filter(t => isWT2(t))
    const suitGroups: string[] = []
    for (const suit of ['wan', 'tiao', 'dots'] as TileSuit[]) {
      const parts = [...normal.filter(t => t.suit === suit).map(t => tileStr(t)), ...wilds.filter(t => t.suit === suit).map(t => tileStr(t) + '(*)')]
      if (parts.length > 0) suitGroups.push(parts.join(' '))
    }
    // winHandType 现在是纯牌型名（碰碰胡/混一色等），winForm 是胡牌形式（大吊/杠开/无花）
    const typeNames = p.winHandType && p.winHandType !== 'standard' ? [HAND_TYPE_NAMES[p.winHandType] || p.winHandType] : []
    winnersThisGame.push({
      playerIndex: idx, name: p.name, hand: suitGroups.join(' ; '),
      melds: formatMelds(p.exposedMelds), flowers: p.flowerTiles.map(t => tileStr(t)),
      isSelfDraw, wonFan, baseFan, winHandType: p.winHandType || '', winForm: p.winForm || '', roundNum,
      wildTile: tileStr({ suit: ws, value: wv, id: '' } as Tile),
      wildTileValue: wv, isMenQing: p.exposedMelds.length === 0,
      winningTile: winningTile ? tileStr(winningTile) : undefined,
      winningFrom, handTypes: typeNames,
    })
  }

  const log = (player: string, action: string, detail: string) => { events.push({ turn, player, action, detail }) }

  // ========== 主循环 ==========
  const MAX_ROUNDS = 200

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (finishedPlayers.has(g.current) || g.players[g.current]?.status === 'won') {
      const nextIdx = nextActivePlayer(g.current)
      if (nextIdx == null) return buildResult(-1, '', 0, '', 0, undefined)
      g.current = nextIdx
    }
    const curr = g.current
    const player = g.players[curr]
    turn = round

    // === 摸牌 ===
    const drawn = drawTile(g, player)
    if (!drawn) { prevRoundWasDraw = true; return buildResult(-1, '', 0, '', 0, undefined) }
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); continue }
    log(player.name, '摸牌', tileStr(drawn))

    // === 自摸检测 ===
    const wtId = makeWT(player)
    const normalizedHand = normalizeHand(player.hand)
    const winCheck = canWin(normalizedHand, player.exposedMelds, wtId)
    if (winCheck.canWin) {
      const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, false, g.gameMultiplier)
      applyEngineSettlement(g, curr, true, baseScore, null)
      for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '自摸', baseFan, g.gameMultiplier) }
      log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3]`)
      player.wonFan = baseScore; player.winHandType = handTypeName || '普通自摸'
      player.status = 'won'; finishedPlayers.add(curr)
      recordWinner(player, curr, true, baseScore, baseFan, turn)
      if (finishedPlayers.size >= 3) return buildResult(curr, '自摸', baseScore, player.winHandType, baseScore, undefined)
      g.current = nextActivePlayer(curr) ?? ((curr + 1) % 4)
      continue
    }

    // === 暗杠/加杠（使用服务端 evaluateSelfKong） ===
    for (const ak of canAnKong(player)) {
      const serverPlayer = toServerPlayer(player, player.policy)
      const serverGame = toServerGame(g)
      const kongResult = evaluateSelfKong(serverPlayer, serverGame, [ActionType.CONCEALED_KONG])
      if (kongResult.shouldKong) {
        applyAnKong(player, ak)
        log(player.name, '暗杠', tileStr(ak))
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          const wc2 = canWin(normalizeHand(player.hand), player.exposedMelds, wtId)
          if (wc2.canWin) {
            const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, true, g.gameMultiplier)
            applyEngineSettlement(g, curr, true, baseScore, null)
            for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '杠上自摸', baseFan, g.gameMultiplier) }
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3]`)
            player.wonFan = baseScore; player.winHandType = handTypeName || '杠上自摸'
            player.status = 'won'; finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, baseFan, turn)
            if (finishedPlayers.size >= 3) return buildResult(curr, '杠上自摸', baseScore, player.winHandType, baseScore, undefined)
            g.current = nextActivePlayer(curr) ?? ((curr + 1) % 4)
            continue
          }
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      const serverPlayer = toServerPlayer(player, player.policy)
      const serverGame = toServerGame(g)
      const kongResult = evaluateSelfKong(serverPlayer, serverGame, [ActionType.EXTENDED_KONG])
      if (kongResult.shouldKong) {
        applyJiaGang(player, jg)
        log(player.name, '加杠', tileStr(jg))
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          const wc2 = canWin(normalizeHand(player.hand), player.exposedMelds, wtId)
          if (wc2.canWin) {
            const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, true, g.gameMultiplier)
            applyEngineSettlement(g, curr, true, baseScore, null)
            for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '杠上自摸', baseFan, g.gameMultiplier) }
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3]`)
            player.wonFan = baseScore; player.winHandType = handTypeName || '杠上自摸'
            player.status = 'won'; finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, baseFan, turn)
            if (finishedPlayers.size >= 3) return buildResult(curr, '加杠自摸', baseScore, player.winHandType, baseScore, undefined)
            g.current = nextActivePlayer(curr) ?? ((curr + 1) % 4)
            continue
          }
        }
      }
    }

    // === 出牌（使用服务端 selectDiscardTile） ===
    const serverPlayer = toServerPlayer(player, player.policy)
    const serverGame = toServerGame(g)
    const discardId = selectDiscardTile(serverPlayer as any, serverGame)
    const discardIdx = player.hand.findIndex(t => t && t.id === discardId)
    let discard: Tile
    if (discardIdx >= 0) {
      discard = player.hand[discardIdx]
      player.hand.splice(discardIdx, 1)
    } else {
      // Fallback: 选第一张非百搭牌
      const fallback = player.hand.find(t => !isWT(t, player)) || player.hand[0]
      if (!fallback) continue
      const fi = player.hand.findIndex(t => t.id === fallback.id)
      player.hand.splice(fi, 1)
      discard = fallback
    }
    player.discardedTiles.push(discard)
    g.discardPile.push(discard)
    g.playerDiscards[curr].push(discard)

    const actualWaits = normalizeHand(player.hand).filter(t => !isFlower(t)).length
    const wasTing = player.isTing
    const tingCheck = canWin(normalizeHand(player.hand), player.exposedMelds, wtId)
    player.isTing = tingCheck.canWin
    log(player.name, '出牌', `${tileStr(discard)} [手牌: ${normalizeHand(player.hand).map(t => tileStr(t)).join(' ')}]`)

    // === 其他玩家抢牌检测 ===
    let meldTaken = false

    // 1. 检查胡（最高优先级）
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      if (opp.status === 'won') continue
      const testHand = [...normalizeHand(opp.hand), discard]
      const oppWinCheck = canWin(testHand, opp.exposedMelds, makeWT(opp))
      if (oppWinCheck.canWin) {
        const claimGame = makeClaimGame(g, discard, opp.id, [ActionType.HU, ActionType.PASS])
        const decision = await shouldClaimPendingAction(
          toServerPlayer(opp, opp.policy) as any,
          [ActionType.HU, ActionType.PASS],
          claimGame
        )
        if (decision === ActionType.HU) {
          opp.hand = normalizeHand(testHand)
          const { finalPoints: score, baseFan, handTypeName } = calcScore(opp, false, false, g.gameMultiplier)
          applyEngineSettlement(g, other, false, score, curr)
          recordPayment(player.name, opp.name, score, '放炮', baseFan, g.gameMultiplier)
          log(opp.name, '放炮胡', `${player.name}出${tileStr(discard)}→${opp.hand.map(t => tileStr(t)).join(' ')} [${score}]`)
          opp.wonFan = score; opp.winHandType = handTypeName || '普通放冲'
          opp.status = 'won'; finishedPlayers.add(other)
          recordWinner(opp, other, false, score, baseFan, turn, discard, player.name)
          if (finishedPlayers.size >= 3) return buildResult(other, '放冲', score, opp.winHandType, score, curr)
          g.current = nextActivePlayer(other) ?? ((other + 1) % 4)
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // 2. 检查碰/杠（中优先级）
    const nextPlayer = (curr + 1) % 4
    const prevPlayer = (curr + 3) % 4
    const oppositePlayer = (curr + 2) % 4

    for (const otherIdx of [nextPlayer, prevPlayer, oppositePlayer]) {
      const opp = g.players[otherIdx]
      if (opp.status === 'won' || opp.exposedMelds.length >= 4) continue

      // 明杠优先检测
      if (canMingKong(opp, discard)) {
        const actions: ActionType[] = [ActionType.KONG, ActionType.PASS]
        const claimGame = makeClaimGame(g, discard, opp.id, actions)
        const decision = await shouldClaimPendingAction(
          toServerPlayer(opp, opp.policy) as any, actions, claimGame
        )
        if (decision === ActionType.KONG) {
          applyMingKong(opp, discard, curr)
          log(opp.name, '明杠', `${tileStr(discard)}（来自${player.name}）`)
          const extra = drawTile(g, opp)
          if (!extra) { prevRoundWasDraw = true; return buildResult(-1, '', 0, '', 0, undefined) }
          if (extra && !isFlower(extra)) {
            const wc3 = canWin(normalizeHand(opp.hand), opp.exposedMelds, makeWT(opp))
            if (wc3.canWin) {
              const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(opp, true, true, g.gameMultiplier)
              applyEngineSettlement(g, otherIdx, true, baseScore, null)
              for (let i = 0; i < 4; i++) { if (i !== otherIdx) recordPayment(g.players[i].name, opp.name, baseScore, '明杠自摸', baseFan, g.gameMultiplier) }
              log(opp.name, '明杠自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3]`)
              opp.wonFan = baseScore; opp.winHandType = handTypeName || '明杠自摸'
              opp.status = 'won'; finishedPlayers.add(otherIdx)
              recordWinner(opp, otherIdx, true, baseScore, baseFan, turn)
              if (finishedPlayers.size >= 3) return buildResult(otherIdx, '明杠自摸', baseScore, opp.winHandType, baseScore, undefined)
              g.current = nextActivePlayer(otherIdx) ?? ((otherIdx + 1) % 4)
              meldTaken = true
              break
            }
          }
          // 杠后不是自摸，选牌打
          const serverOpp = toServerPlayer(opp, opp.policy)
          const serverGameAfterKong = toServerGame(g)
          const kongDiscardId = selectDiscardTile(serverOpp as any, serverGameAfterKong)
          const kongDiscardIdx = opp.hand.findIndex(t => t.id === kongDiscardId)
          let kongDiscard: Tile
          if (kongDiscardIdx >= 0) { kongDiscard = opp.hand[kongDiscardIdx]; opp.hand.splice(kongDiscardIdx, 1) }
          else { const fb = opp.hand.find(t => !isWT(t, opp)) || opp.hand[0]; const fi = opp.hand.findIndex(t => t.id === fb.id); opp.hand.splice(fi, 1); kongDiscard = fb }
          g.discardPile.push(kongDiscard)
          g.playerDiscards[otherIdx].push(kongDiscard)
          opp.discardedTiles.push(kongDiscard)
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }

      // 碰检测
      if (canPeng(opp, discard)) {
        const actions: ActionType[] = [ActionType.PENG, ActionType.PASS]
        const claimGame = makeClaimGame(g, discard, opp.id, actions)
        const decision = await shouldClaimPendingAction(
          toServerPlayer(opp, opp.policy) as any, actions, claimGame
        )
        if (decision === ActionType.PENG) {
          applyPeng(opp, discard, curr)
          log(opp.name, '碰', `${tileStr(discard)}（来自${player.name}）`)
          // 碰后选牌打
          const serverOpp = toServerPlayer(opp, opp.policy)
          const serverGameAfterPeng = toServerGame(g)
          const pengDiscardId = selectDiscardTile(serverOpp as any, serverGameAfterPeng)
          const pengDiscardIdx = opp.hand.findIndex(t => t.id === pengDiscardId)
          let pengDiscard: Tile
          if (pengDiscardIdx >= 0) { pengDiscard = opp.hand[pengDiscardIdx]; opp.hand.splice(pengDiscardIdx, 1) }
          else { const fb = opp.hand.find(t => !isWT(t, opp)) || opp.hand[0]; const fi = opp.hand.findIndex(t => t.id === fb.id); opp.hand.splice(fi, 1); pengDiscard = fb }
          g.discardPile.push(pengDiscard)
          g.playerDiscards[otherIdx].push(pengDiscard)
          opp.discardedTiles.push(pengDiscard)
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // 3. 检查吃（仅下家，最低优先级）
    {
      const opp = g.players[nextPlayer]
      if (opp.status !== 'won' && opp.exposedMelds.length < 4 && canChow(opp, discard)) {
        const actions: ActionType[] = [ActionType.CHOW, ActionType.PASS]
        const claimGame = makeClaimGame(g, discard, opp.id, actions)
        const decision = await shouldClaimPendingAction(
          toServerPlayer(opp, opp.policy) as any, actions, claimGame
        )
        if (decision === ActionType.CHOW) {
          // 吃牌：找到顺子组合
          const v = discard.value
          const h = normalizeHand(opp.hand)
          const findTile = (suit: TileSuit, val: number) => h.find(t => t.suit === suit && t.value === val)
          const removeTileFromHand = (t: Tile) => { const idx = opp.hand.findIndex(h => h.id === t.id); if (idx >= 0) opp.hand.splice(idx, 1) }

          let t1: Tile | undefined, t2: Tile | undefined
          if (v >= 2 && v <= 8) { t1 = findTile(discard.suit, v - 1); t2 = findTile(discard.suit, v + 1) }
          if ((!t1 || !t2) && v >= 3) { t1 = findTile(discard.suit, v - 1); t2 = findTile(discard.suit, v - 2) }
          if ((!t1 || !t2) && v <= 7) { t1 = findTile(discard.suit, v + 1); t2 = findTile(discard.suit, v + 2) }

          if (t1 && t2 && t1.id !== t2.id) {
            removeTileFromHand(t1)
            removeTileFromHand(t2)
            const meldTiles = [t1, discard, t2].sort((a, b) => a.value - b.value)
            opp.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: meldTiles, isConcealed: false })
            if (curr !== opp.pos) opp.meldSources[curr]++
            log(opp.name, '吃', `${tileStr(discard)}（来自${player.name}）→ ${meldTiles.map(t => tileStr(t)).join(' ')}`)
            // 吃后选牌打
            const serverOpp = toServerPlayer(opp, opp.policy)
            const serverGameAfterChow = toServerGame(g)
            const chowDiscardId = selectDiscardTile(serverOpp as any, serverGameAfterChow)
            const chowDiscardIdx = opp.hand.findIndex(t => t.id === chowDiscardId)
            let chowDiscard: Tile
            if (chowDiscardIdx >= 0) { chowDiscard = opp.hand[chowDiscardIdx]; opp.hand.splice(chowDiscardIdx, 1) }
            else { const fb = opp.hand.find(t => !isWT(t, opp)) || opp.hand[0]; const fi = opp.hand.findIndex(t => t.id === fb.id); opp.hand.splice(fi, 1); chowDiscard = fb }
            g.discardPile.push(chowDiscard)
            g.playerDiscards[nextPlayer].push(chowDiscard)
            opp.discardedTiles.push(chowDiscard)
            g.current = (nextPlayer + 1) % 4
            meldTaken = true
          }
        }
      }
    }
    if (meldTaken) continue

    // 无人抢牌，轮到下一位
    g.current = (curr + 1) % 4
  }

  prevRoundWasDraw = true
  return buildResult(-1, '', 0, '', 0, undefined)
}

// ========== Arena 报告类型 ==========
const ENGINE_NAMES = ['P0', 'P1', 'P2', 'P3'] as const
interface SeatAssignment { enginePos: number; aiName: AIName; engineName: string }
interface GameRecord {
  gameId: number; seats: SeatAssignment[]; winner: number; winnerAiName: AIName | null
  scores: number[]; netScores: number[]; scoresByAi: Record<AIName, number>
  totalPot: number; multiplier: number; settlementCount: number
  winnerName?: string; handTypeName?: string; wonFan?: number; selfDraw?: boolean
  isDraw: boolean; roundNum: number; eventCount: number; durationMs: number
  settlements: SettlementEntry[]; events: GameEvent[]; snapshots: PlayerSnapshot[]
  turnSnapshots: TurnSnapshot[]
  winCount: number; winners: WinnerInfo[]
}

interface AiStats {
  aiName: AIName; games: number; wins: number; winRate: number
  totalScore: number; avgScore: number; stdScore: number; bestScore: number; worstScore: number
  selfDrawWins: number; discardWins: number; top1Finishes: number; top2Finishes: number; bottomFinishes: number
  seatAppearances: number; coOccurrence: Record<AIName, number>
}

// ========== Arena 工具函数 ==========
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function pickFour(candidates: readonly AIName[]): AIName[] { return shuffle([...candidates]).slice(0, 4) }

function assignSeats(picked: AIName[]): SeatAssignment[] {
  const shuffled = shuffle(picked)
  return shuffled.map((aiName, enginePos) => ({ enginePos, aiName, engineName: ENGINE_NAMES[enginePos] }))
}

function computeTotalPot(scores: number[]): number { return scores.reduce((s, v) => s + Math.abs(v), 0) / 2 }

function toGameRecord(gameId: number, seats: SeatAssignment[], result: GameResult | null, durationMs: number): GameRecord {
  if (!result) {
    const scoresByAi: Record<string, number> = {}
    for (const s of seats) scoresByAi[s.aiName] = 0
    return { gameId, seats, winner: -1, winnerAiName: null, scores: [0, 0, 0, 0], netScores: [0, 0, 0, 0], scoresByAi: scoresByAi as Record<AIName, number>, totalPot: 0, multiplier: 1, settlementCount: 0, isDraw: true, roundNum: 0, eventCount: 0, durationMs, settlements: [], events: [], snapshots: [], turnSnapshots: [], winCount: 0, winners: [] }
  }
  const scoresByAi: Record<string, number> = {}
  for (const s of seats) scoresByAi[s.aiName] = result.scores[s.enginePos]
  let effectiveWinner = result.winner
  const primaryWinner = result.winnersThisGame[0] || null
  if (effectiveWinner < 0 && primaryWinner) effectiveWinner = primaryWinner.playerIndex
  if (effectiveWinner < 0) {
    let maxScore = -Infinity, maxIdx = -1
    for (let i = 0; i < result.scores.length; i++) { if (result.scores[i] > maxScore) { maxScore = result.scores[i]; maxIdx = i } }
    if (maxScore > 0) effectiveWinner = maxIdx
  }
  // 检测流局：没有赢家且所有分数为0
  const isDraw = effectiveWinner < 0 && result.winnersThisGame.length === 0
  const winnerSeat = effectiveWinner >= 0 ? seats.find(s => s.enginePos === effectiveWinner) : undefined
  return {
    gameId, seats, winner: effectiveWinner, winnerAiName: winnerSeat?.aiName ?? null,
    scores: result.scores.slice(), netScores: result.scores.slice(),
    scoresByAi: scoresByAi as Record<AIName, number>, totalPot: computeTotalPot(result.scores),
    multiplier: result.multiplier, settlementCount: result.settlementLog.length,
    winnerName: winnerSeat?.aiName, handTypeName: primaryWinner?.winHandType,
    wonFan: primaryWinner?.wonFan, selfDraw: primaryWinner?.isSelfDraw,
    isDraw, roundNum: result.roundNum, eventCount: result.events.length, durationMs,
    settlements: result.settlementLog, events: result.events, snapshots: result.snapshots,
    turnSnapshots: result.turnSnapshots,
    winCount: result.winnersThisGame.length,
    winners: result.winnersThisGame,
  }
}

// ========== 报告生成 ==========
function fmtSigned(n: number): string { return n >= 0 ? `+${n}` : `${n}` }
function percentile(arr: number[], p: number): number { if (arr.length === 0) return 0; return [...arr].sort((a, b) => a - b)[Math.floor((arr.length - 1) * p)] }
function mean(arr: number[]): number { return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length }
function stddev(arr: number[]): number { if (arr.length === 0) return 0; const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) }

function buildStats(records: GameRecord[]): Map<AIName, AiStats> {
  const stats = new Map<AIName, AiStats>()
  for (const c of CANDIDATES) {
    stats.set(c, { aiName: c, games: 0, wins: 0, winRate: 0, totalScore: 0, avgScore: 0, stdScore: 0, bestScore: -Infinity, worstScore: Infinity, selfDrawWins: 0, discardWins: 0, top1Finishes: 0, top2Finishes: 0, bottomFinishes: 0, seatAppearances: 0, coOccurrence: {} as Record<AIName, number> })
  }
  for (const rec of records) {
    const aiInGame = rec.seats.map(s => s.aiName)
    for (const ai of aiInGame) { const st = stats.get(ai)!; st.games++; st.seatAppearances++ }
    for (let i = 0; i < aiInGame.length; i++) { for (let j = 0; j < aiInGame.length; j++) { if (i === j) continue; const a = aiInGame[i], b = aiInGame[j]; stats.get(a)!.coOccurrence[b] = (stats.get(a)!.coOccurrence[b] || 0) + 1 } }
    if (rec.isDraw) continue
    const ranked = [...aiInGame].sort((x, y) => rec.scoresByAi[y] - rec.scoresByAi[x])
    for (let i = 0; i < ranked.length; i++) {
      const st = stats.get(ranked[i])!
      st.totalScore += rec.scoresByAi[ranked[i]]
      const sc = rec.scoresByAi[ranked[i]]
      if (sc > st.bestScore) st.bestScore = sc
      if (sc < st.worstScore) st.worstScore = sc
      if (i === 0) st.top1Finishes++
      if (i === 1) st.top2Finishes++
      if (i === ranked.length - 1) st.bottomFinishes++
    }
    // 统计所有赢家（血战到底模式）
    if (rec.winners.length > 0) {
      for (const w of rec.winners) {
        const aiName = w.aiName || w.name
        const st = stats.get(aiName)
        if (!st) continue
        st.wins++
        if (w.isSelfDraw) st.selfDrawWins++
        else st.discardWins++
      }
    } else if (rec.winnerAiName) {
      const st = stats.get(rec.winnerAiName)!
      st.wins++
      if (rec.selfDraw) st.selfDrawWins++
      else st.discardWins++
    }
  }
  for (const st of stats.values()) {
    if (st.games === 0) { st.bestScore = 0; st.worstScore = 0; continue }
    st.avgScore = st.totalScore / st.games; st.winRate = st.wins / st.games
    const scores: number[] = []
    for (const rec of records) { if (rec.isDraw) continue; for (const s of rec.seats) { if (s.aiName === st.aiName) scores.push(rec.scoresByAi[s.aiName]) } }
    st.stdScore = stddev(scores)
  }
  return stats
}

function formatSummary(stats: Map<AIName, AiStats>, records: GameRecord[]): string {
  const lines: string[] = []
  const arr = [...stats.values()]
  const totalGames = records.length; const drawGames = records.filter(r => r.isDraw).length; const winGames = totalGames - drawGames; const totalPot = records.reduce((s, r) => s + r.totalPot, 0)
  const totalWinnerHands = records.reduce((s, r) => s + r.winCount, 0)
  const bloodWarGames = records.filter(r => r.winCount > 1).length
  lines.push(`# AI 竞技对战总览（真实服务端逻辑版）\n`)
  lines.push(`- 总局数: **${totalGames}**`); lines.push(`- 有效局: **${winGames}**`); lines.push(`- 流局: **${drawGames}** (${(drawGames / Math.max(1, totalGames) * 100).toFixed(1)}%)`)
  lines.push(`- 血战到底（多赢家局）: **${bloodWarGames}** (${(bloodWarGames / Math.max(1, winGames) * 100).toFixed(1)}%)`)
  lines.push(`- 总赢家数: **${totalWinnerHands}**（平均每局 ${winGames > 0 ? (totalWinnerHands / winGames).toFixed(1) : '0'} 名赢家）`)
  lines.push(`- 总输赢: **${totalPot}**`); lines.push(`- 结算倍数: 与服务端一致`); lines.push('')
  const ranked = arr.filter(s => s.games > 0).sort((a, b) => b.avgScore - a.avgScore)
  lines.push(`## 🏆 排名榜（按平均得分）\n`)
  lines.push(`| 排名 | AI | 局数 | 胜率 | 平均得分 | 总得分 | 标准差 | 最佳局 | 最差局 | 自摸胜 | 放炮胜 | 登顶 | 垫底 |`)
  lines.push(`|------|----|------|------|----------|--------|--------|--------|--------|--------|--------|------|------|`)
  for (let i = 0; i < ranked.length; i++) { const s = ranked[i]; lines.push(`| ${i + 1} | **${s.aiName}** | ${s.games} | ${(s.winRate * 100).toFixed(1)}% | ${fmtSigned(s.avgScore.toFixed(1))} | ${fmtSigned(s.totalScore)} | ${s.stdScore.toFixed(1)} | ${fmtSigned(s.bestScore)} | ${fmtSigned(s.worstScore)} | ${s.selfDrawWins} | ${s.discardWins} | ${s.top1Finishes} | ${s.bottomFinishes} |`) }
  lines.push('')
  const winsRanked = [...arr].sort((a, b) => b.wins - a.wins)
  lines.push(`## 🎯 胜场榜\n`)
  lines.push(`| AI | 胜场 | 胜率 | 自摸胜 | 放炮胜 |`)
  lines.push(`|----|------|------|--------|--------|`)
  for (const s of winsRanked) { if (s.games === 0) continue; lines.push(`| ${s.aiName} | ${s.wins} | ${(s.winRate * 100).toFixed(1)}% | ${s.selfDrawWins} | ${s.discardWins} |`) }
  lines.push('')
  const present = arr.filter(s => s.seatAppearances > 0)
  if (present.length > 0) {
    lines.push(`## 🤝 同局共现矩阵\n`)
    const header = ['AI', ...present.map(s => s.aiName)]
    lines.push(`| ${header.join(' | ')} |`); lines.push(`|${header.map(() => '------').join('|')}|`)
    for (const row of present) { const cells = [row.aiName]; for (const col of present) { const v = row.coOccurrence[col.aiName] || 0; cells.push(v === 0 ? '-' : String(v)) }; lines.push(`| ${cells.join(' | ')} |`) }
    lines.push('')
  }
  const handTypes: Record<string, number> = {}
  for (const rec of records) {
    if (rec.isDraw) continue
    // 统计所有赢家的牌型（血战到底模式）
    if (rec.winners.length > 0) {
      for (const w of rec.winners) {
        if (w.winHandType) {
          handTypes[w.winHandType] = (handTypes[w.winHandType] || 0) + 1
        }
      }
    } else if (rec.handTypeName) {
      handTypes[rec.handTypeName] = (handTypes[rec.handTypeName] || 0) + 1
    }
  }
  const hte = Object.entries(handTypes).sort((a, b) => b[1] - a[1])
  if (hte.length > 0) {
    const totalHandTypeCount = Object.values(handTypes).reduce((s, v) => s + v, 0)
    lines.push(`## 🀄 番种分布（基于 ${totalHandTypeCount} 次胡牌）\n`); lines.push(`| 番种 | 次数 | 占比 |`); lines.push(`|------|------|------|`)
    for (const [name, count] of hte) { lines.push(`| ${name} | ${count} | ${(count / Math.max(1, totalHandTypeCount) * 100).toFixed(1)}% |`) }
    lines.push('')
  }
  const durations = records.map(r => r.durationMs); const roundNums = records.filter(r => !r.isDraw).map(r => r.roundNum)
  if (durations.length > 0) {
    lines.push(`## ⏱️ 速度统计\n`)
    lines.push(`- 单局耗时：均值 ${mean(durations).toFixed(0)}ms，中位 ${percentile(durations, 0.5).toFixed(0)}ms，P95 ${percentile(durations, 0.95).toFixed(0)}ms`)
    if (roundNums.length > 0) lines.push(`- 回合数：均值 ${mean(roundNums).toFixed(1)}，中位 ${percentile(roundNums, 0.5)}`)
    lines.push('')
  }
  return lines.join('\n')
}

function formatGameDetail(rec: GameRecord): string {
  const lines: string[] = []
  const seatStr = rec.seats.map(s => `${s.engineName}→${s.aiName}`).join(' | ')
  lines.push(`# 第 ${rec.gameId} 局\n`); lines.push(`- 座位: ${seatStr}`); lines.push(`- 倍数: ${rec.multiplier}`); lines.push(`- 回合: ${rec.roundNum}`); lines.push(`- 耗时: ${rec.durationMs}ms\n`)
  if (rec.isDraw) { lines.push(`## 🌊 流局\n`); return lines.join('\n') }
  lines.push(`## 🏁 结果\n`); lines.push(`| 座位 | 实际AI | 得分 |`); lines.push(`|------|--------|------|`)
  for (const s of rec.seats) { lines.push(`| ${s.enginePos} | **${s.aiName}** | ${fmtSigned(rec.scores[s.enginePos])} |`) }
  lines.push('')
  if (rec.winnerAiName) { const winType = rec.selfDraw ? '自摸' : '放炮'; lines.push(`- 赢家: **${rec.winnerAiName}** (${winType})`); lines.push(`- 番数: ${rec.wonFan}`); lines.push(`- 牌型: ${rec.handTypeName || '(未知)'}\n`) }
  if (rec.settlements.length > 0) {
    lines.push(`## 💰 结算明细 (${rec.settlementCount} 条)\n`); lines.push(`| 付款方 | 收款方 | 金额 | 原因 | 番 | 倍数 |`); lines.push(`|--------|--------|------|------|----|------|`)
    for (const s of rec.settlements) { lines.push(`| ${s.from} | ${s.to} | ${s.amount} | ${s.reason} | ${s.fan ?? '-'} | ${s.mult ?? '-'} |`) }
    lines.push('')
  }
  if (rec.snapshots && rec.snapshots.length > 0) {
    lines.push(`## 🃏 终局手牌\n`)
    for (const snap of rec.snapshots) {
      const meldStr = snap.melds?.length > 0 ? `\n  - 副露: ${snap.melds.join(' / ')}` : ''
      const flowerStr = snap.flowers?.length > 0 ? `\n  - 花牌: ${snap.flowers.join(' ')}` : ''
      const status = snap.status === 'won' ? ' 🏆胡' : ''
      lines.push(`- **${snap.name}**${status} (百搭: ${snap.wildTile}, 手牌${snap.wildCount}张百搭)${meldStr}${flowerStr}`)
      lines.push(`  - 隐藏手: ${snap.hand || '(空)'}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function formatGamesCsv(records: GameRecord[]): string {
  const lines: string[] = []
  lines.push('game_id,seat0_ai,seat1_ai,seat2_ai,seat3_ai,winner_ai,win_count,win_type,hand_type,fan,multiplier,rounds,total_pot,score_s0,score_s1,score_s2,score_s3,duration_ms,is_draw,is_menqing')
  for (const rec of records) {
    const s = (i: number) => rec.seats[i]?.aiName || '-'
    const winner = rec.winnerAiName || (rec.isDraw ? '流局' : '-')
    const winType = rec.selfDraw === undefined ? '-' : (rec.selfDraw ? '自摸' : '放炮')
    const scores = [0, 1, 2, 3].map(i => rec.scores[i] ?? 0).join(',')
    const isMenQing = rec.winners && rec.winners[0]?.isMenQing ? '1' : '0'
    lines.push([rec.gameId, s(0), s(1), s(2), s(3), winner, rec.winCount, winType, rec.handTypeName || '-', rec.wonFan ?? '-', rec.multiplier, rec.roundNum, rec.totalPot, scores, rec.durationMs, rec.isDraw ? '1' : '0', isMenQing].join(','))
  }
  return lines.join('\n')
}

// ========== 主流程 ==========
async function main() {
  const startTime = Date.now()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = path.resolve(__dirname, '..', 'arena-output', `real-${stamp}`)
  const detailDir = path.join(outDir, 'detailed')
  fs.mkdirSync(outDir, { recursive: true })
  if (DETAIL) fs.mkdirSync(detailDir, { recursive: true })

  // 预加载所有 AI 策略
  const allPolicies = new Map<AIName, ReturnType<typeof loadCharacter>>()
  for (const name of CANDIDATES) { allPolicies.set(name, loadCharacter(name)) }
  console.error(`[ARENA-REAL] 已加载 ${allPolicies.size} 个 AI 策略`)

  const records: GameRecord[] = []
  let lastReport = 0

  for (let g = 0; g < GAMES; g++) {
    const t0 = Date.now()
    const picked = pickFour(CANDIDATES)
    const seats = assignSeats(picked)
    const policies = [
      allPolicies.get(seats[0].aiName)!,
      allPolicies.get(seats[1].aiName)!,
      allPolicies.get(seats[2].aiName)!,
      allPolicies.get(seats[3].aiName)!,
    ]

    let result: GameResult | null = null
    try { result = await runRealGame(policies, g) } catch (e) { console.error(`[ARENA-REAL] game=${g} crashed:`, e); continue }
    const durationMs = Date.now() - t0
    const rec = toGameRecord(g, seats, result, durationMs)
    records.push(rec)

    if (g < 5 || g % 10 === 0 || g === GAMES - 1) {
      const winnerLabel = rec.winnerAiName || '流局'
      console.error(`[ARENA-REAL] game=${g + 1}/${GAMES} 赢家=${winnerLabel} 时长=${durationMs}ms 回合=${rec.roundNum}`)
    }
    if (DETAIL && g < DETAIL_MAX) {
      const md = formatGameDetail(rec)
      fs.writeFileSync(path.join(detailDir, `game-${String(g).padStart(4, '0')}.md`), md, 'utf-8')
    }
    if (g - lastReport >= 49 || g === GAMES - 1) {
      lastReport = g
      const stats = buildStats(records)
      const summary = formatSummary(stats, records)
      fs.writeFileSync(path.join(outDir, 'summary.partial.md'), summary, 'utf-8')
      console.error(`[ARENA-REAL] 增量报告已保存 (${g + 1}/${GAMES})`)
    }
  }

  // 最终报告
  const stats = buildStats(records)
  const summary = formatSummary(stats, records)
  fs.writeFileSync(path.join(outDir, 'summary.md'), summary, 'utf-8')
  const csv = formatGamesCsv(records)
  fs.writeFileSync(path.join(outDir, 'games.csv'), csv, 'utf-8')
  const jsonl = records.map(r => ({ gameId: r.gameId, seats: r.seats, winner: r.winner, winnerAiName: r.winnerAiName, scores: r.scores, scoresByAi: r.scoresByAi, totalPot: r.totalPot, multiplier: r.multiplier, handTypeName: r.handTypeName, wonFan: r.wonFan, selfDraw: r.selfDraw, isDraw: r.isDraw, roundNum: r.roundNum, durationMs: r.durationMs }))
  fs.writeFileSync(path.join(outDir, 'games.jsonl'), jsonl.map(o => JSON.stringify(o)).join('\n'), 'utf-8')
  const meta = { startedAt: new Date(startTime).toISOString(), endedAt: new Date().toISOString(), totalMs: Date.now() - startTime, games: GAMES, settlementMult: SETTLEMENT_MULT, candidates: CANDIDATES, detail: DETAIL, detailMax: DETAIL_MAX, seed: SEED, topN: TOP_N, mode: 'real-server-logic' }
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')

  console.log('\n' + '='.repeat(60))
  console.log('AI 竞技对战完成（真实服务端逻辑版）')
  console.log('='.repeat(60))
  console.log(`总局数: ${GAMES}, 用时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.log(`报告目录: ${outDir}`)
  const ranked = [...stats.values()].filter(s => s.games > 0).sort((a, b) => b.avgScore - a.avgScore)
  for (let i = 0; i < ranked.length; i++) { const s = ranked[i]; console.log(`  ${i + 1}. ${s.aiName.padEnd(8)} 局数=${String(s.games).padStart(3)} 胜率=${(s.winRate * 100).toFixed(1).padStart(5)}% 均分=${fmtSigned(s.avgScore.toFixed(1)).padStart(7)} 胜场=${s.wins}`) }
  console.log(`\n详细报告: ${outDir}/summary.md`)
}

process.on('uncaughtException', (err) => { console.error('[ARENA_REAL_CRASH] uncaughtException:', err); process.exit(1) })
process.on('unhandledRejection', (reason) => { console.error('[ARENA_REAL_CRASH] unhandledRejection:', reason); process.exit(1) })

main().catch(e => { console.error('[ARENA_REAL_CRASH]', e); process.exit(1) })
