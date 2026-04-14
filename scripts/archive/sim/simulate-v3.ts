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

// ========== Bot Policy (长清阁规则) ==========
interface BotPolicy {
  id: string
  // ====== 胡牌决策 ======
  selfWinChance: number           // 自摸胡牌概率
  discardHuChance: number         // 捉冲胡牌概率
  selfWinWildBoost: number        // 百搭多时自摸加成
  discardHuWildPenalty: number    // 百搭多时捉冲惩罚（百搭在手不想冒险捉冲）
  discardHuMenQingPenalty: number // 门清时捉冲惩罚（门清自摸×2更香）

  // ====== 吃碰杠决策 ======
  pengChance: number              // 碰牌概率
  kongChance: number              // 杠牌概率（明杠/加杠）
  chowChance: number              // 吃牌概率
  anKongChance: number            // 暗杠概率（不破门清，很积极）
  pengWildBoost: number           // 碰百搭加成
  kongWildBoost: number           // 杠百搭加成
  chowWildPenalty: number         // 吃百搭惩罚

  // ====== 门清 vs 副露 ======
  menqingKeepBonus: number        // 门清状态出牌保留加成（门清×2翻倍价值）
  meldPenalty: number             // 每个副露对胡牌决策的惩罚（牺牲翻倍）

  // ====== 牌型路线追求 ======
  allPungsPursuit: number         // 碰碰胡追求度（公式计分，高番潜力）
  pureFlushPursuit: number        // 清一色追求度（固定10点）
  halfFlushWeight: number         // 混一色权重（公式计分）
  sevenPairsPursuit: number       // 七对追求度
  allHonorsPursuit: number        // 风一色追求度（固定20点！）
  allHonorsPungsPursuit: number   // 风碰追求度（固定40点！最高番）
  qingPengPursuit: number         // 清碰追求度（固定20点）
  hunPengPursuit: number          // 混碰追求度（固定10点）

  // ====== 风牌珍惜度（风牌刻子+1点，杠+2点，暗杠+3点） ======
  windEastKeep: number            // 东（自己的风？优先保留）
  windSouthKeep: number           // 南
  windWestKeep: number            // 西
  windNorthKeep: number           // 北
  windGeneralKeep: number         // 风牌通用保留权重

  // ====== 箭牌珍惜度（箭牌刻子+2点，杠+3点，暗杠+4点） ======
  dragonRedKeep: number           // 红中
  dragonGreenKeep: number         // 发财
  dragonWhiteKeep: number         // 白板
  dragonGeneralKeep: number       // 箭牌通用保留权重

  // ====== 出牌评分基础权重 ======
  pairWeight: number              // 对子保留
  nearWeight: number              // 搭子（相邻1-2）保留
  tripletKeepBonus: number        // 刻子保留（3张相同）
  terminalPenalty: number         // 幺九孤立张惩罚

  // ====== 百搭策略（基础） ======
  wildKeepPenalty: number         // 百搭打出惩罚（绝不打出）
  wildBailoutThreshold: number    // 百搭数量达到此值时倾向激进组牌

  // ====== 百搭分级激进度（0/1/2/3+张百搭） ======
  wild0Aggression: number         // 0张百搭：冲无百搭翻倍，偏防守
  wild1Aggression: number         // 1张百搭：平衡进攻
  wild2Aggression: number         // 2张百搭：积极进攻
  wild3PlusAggression: number     // 3+张百搭：非常激进

  // ====== 百搭分级路线选择 ======
  wild1RouteMeldPush: number      // 1百搭时吃碰杠推进（组三口四口）
  wild2RouteMeldPush: number      // 2百搭时吃碰杠推进
  wild3RouteMeldPush: number      // 3百搭时吃碰杠推进（全力组牌型）
  wild1RouteFlushBoost: number    // 1百搭时清一色路线加成
  wild2RouteFlushBoost: number    // 2百搭时清一色路线加成
  wild3RouteFlushBoost: number    // 3百搭时清一色路线加成
  wild1RouteHonorsBoost: number   // 1百搭时风一色/风碰路线加成
  wild2RouteHonorsBoost: number   // 2百搭时风一色/风碰路线加成
  wild3RouteHonorsBoost: number   // 3百搭时风一色/风碰路线加成
  wild1RouteAllPungsBoost: number // 1百搭时碰碰胡路线加成
  wild2RouteAllPungsBoost: number // 2百搭时碰碰胡路线加成
  wild3RouteAllPungsBoost: number // 3百搭时碰碰胡路线加成

  // ====== 百搭×倍数 联合策略 ======
  wildMultLowAggression: number   // 低倍数时百搭进攻（快胡收倍数）
  wildMultMidAggression: number   // 中倍数时百搭进攻（平衡）
  wildMultHighAggression: number  // 高倍数时百搭进攻（做大牌值翻倍）

  // ====== 百搭门清路线 ======
  wild0MenqingKeep: number        // 0百搭：门清保留值高（无百搭×2+门清×2=×4）
  wild1MenqingKeep: number        // 1百搭：门清保留值中
  wild2MenqingKeep: number        // 2百搭：门清保留值低（百搭多不太需要门清）

  // ====== 百搭包三包四路线 ======
  wild1BaoPush: number            // 1百搭时包三包四推进意愿
  wild2BaoPush: number            // 2百搭时包三包四推进意愿
  wild3BaoPush: number            // 3百搭时包三包四推进意愿（百搭多可以豁出去）

  // ====== 倍数×起手牌 联合路线决策 ======
  // 倍数分级策略
  multLowSpeedBias: number        // 低倍数（×1-2）：偏速度，快胡收分
  multHighValueBias: number       // 高倍数（×4-8）：偏大牌，做大牌值翻倍
  // 起手牌质量分级策略
  hand5RouteBias: number          // 起手一门5张：有清一色/混一色基础
  hand6RouteBias: number          // 起手一门6张：强清一色/混一色潜力
  hand7RouteBias: number          // 起手一门7张：极强清一色/混一色潜力
  // 倍数×起手牌联合 → 碰碰胡 vs 混一色选择
  multLowHand5AllPungs: number    // 低倍数+一门5张 → 碰碰胡倾向
  multLowHand5HalfFlush: number   // 低倍数+一门5张 → 混一色倾向
  multHighHand5AllPungs: number   // 高倍数+一门5张 → 碰碰胡倾向
  multHighHand5HalfFlush: number  // 高倍数+一门5张 → 混一色倾向
  multLowHand6AllPungs: number    // 低倍数+一门6张 → 碰碰胡倾向
  multLowHand6HalfFlush: number   // 低倍数+一门6张 → 混一色倾向
  multLowHand6PureFlush: number   // 低倍数+一门6张 → 清一色倾向
  multHighHand6AllPungs: number   // 高倍数+一门6张 → 碰碰胡倾向
  multHighHand6HalfFlush: number  // 高倍数+一门6张 → 混一色倾向
  multHighHand6PureFlush: number  // 高倍数+一门6张 → 清一色倾向（高倍+好牌=冲清一色10点！）
  multLowHand7AllPungs: number    // 低倍数+一门7张 → 碰碰胡倾向
  multLowHand7HalfFlush: number   // 低倍数+一门7张 → 混一色倾向
  multLowHand7PureFlush: number   // 低倍数+一门7张 → 清一色倾向
  multHighHand7AllPungs: number   // 高倍数+一门7张 → 碰碰胡倾向
  multHighHand7HalfFlush: number  // 高倍数+一门7张 → 混一色倾向
  multHighHand7PureFlush: number  // 高倍数+一门7张 → 清一色倾向（极强！）
  // 倍数×起手风箭
  multHighHonorStart: number      // 高倍数+起手风箭多 → 风一色/风碰路线加成

  // ====== 攻防节奏 ======
  speedVsValueBalance: number     // 速度vs大牌权衡（高=快听，低=做大牌）
  defenseRiskAversion: number     // 防守风险规避（剩余牌少时保守）
  wallTilesImpact: number         // 牌墙剩余对策略的影响系数

  // ====== 包三四风险 ======
  baoRiskAversion: number         // 包三/包四风险规避（同家吃碰多了要谨慎）
  baoThreshold: number            // 同家副露数达到此值开始规避

  // ====== 杠策略分化 ======
  anKongAggression: number        // 暗杠激进度（不破门清，可以积极）
  minkanAggression: number        // 明杠激进度（破门清+可被抢杠，要保守）
  kakanAggression: number         // 加杠激进度（可被抢杠）
  robKongAwareness: number        // 抢杠风险意识

  // ====== 翻倍机制意识 ======
  noWildDoubleAwareness: number   // 无百搭×2翻倍意识
  menqingDoubleAwareness: number  // 门清×2翻倍意识

  // ====== 组合牌型取舍 ======
  flushVsPungsBalance: number     // 清一色vs碰碰胡取舍（正=偏清一色）
  honorVsSuitedBalance: number    // 字牌vs数牌取舍（正=偏字牌路线）
  sequenceVsTripletBias: number   // 顺子vs刻子偏好（正=偏刻子，利于碰碰胡）
}

const DEFAULT_POLICY: BotPolicy = {
  id: 'default',
  selfWinChance: 0.8, discardHuChance: 0.8,
  selfWinWildBoost: 0.1, discardHuWildPenalty: 0.4, discardHuMenQingPenalty: 0.14,
  pengChance: 0.79, kongChance: 0.47, chowChance: 0.03, anKongChance: 0.95,
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  menqingKeepBonus: 5.0, meldPenalty: 0.05,
  allPungsPursuit: 0.5, pureFlushPursuit: 0.3, halfFlushWeight: 0.4,
  sevenPairsPursuit: 0.2, allHonorsPursuit: 0.1, allHonorsPungsPursuit: 0.05,
  qingPengPursuit: 0.15, hunPengPursuit: 0.3,
  windEastKeep: 2.0, windSouthKeep: 1.0, windWestKeep: 1.0, windNorthKeep: 1.0,
  windGeneralKeep: 1.5,
  dragonRedKeep: 3.0, dragonGreenKeep: 3.0, dragonWhiteKeep: 2.5, dragonGeneralKeep: 3.0,
  pairWeight: 4.0, nearWeight: 3.6, tripletKeepBonus: 4.7, terminalPenalty: 1.0,
  wildKeepPenalty: 1400, wildBailoutThreshold: 3,
  wild0Aggression: 0.3, wild1Aggression: 0.5, wild2Aggression: 0.7, wild3PlusAggression: 0.9,
  wild1RouteMeldPush: 0.3, wild2RouteMeldPush: 0.6, wild3RouteMeldPush: 0.9,
  wild1RouteFlushBoost: 0.1, wild2RouteFlushBoost: 0.3, wild3RouteFlushBoost: 0.5,
  wild1RouteHonorsBoost: 0.05, wild2RouteHonorsBoost: 0.2, wild3RouteHonorsBoost: 0.4,
  wild1RouteAllPungsBoost: 0.1, wild2RouteAllPungsBoost: 0.3, wild3RouteAllPungsBoost: 0.5,
  wildMultLowAggression: 0.6, wildMultMidAggression: 0.5, wildMultHighAggression: 0.8,
  wild0MenqingKeep: 3.0, wild1MenqingKeep: 2.0, wild2MenqingKeep: 1.0,
  wild1BaoPush: 0.2, wild2BaoPush: 0.5, wild3BaoPush: 0.8,
  // 倍数×起手牌联合
  multLowSpeedBias: 0.6, multHighValueBias: 0.8,
  hand5RouteBias: 0.3, hand6RouteBias: 0.6, hand7RouteBias: 0.9,
  multLowHand5AllPungs: 0.4, multLowHand5HalfFlush: 0.3,
  multHighHand5AllPungs: 0.3, multHighHand5HalfFlush: 0.5,
  multLowHand6AllPungs: 0.3, multLowHand6HalfFlush: 0.4, multLowHand6PureFlush: 0.2,
  multHighHand6AllPungs: 0.2, multHighHand6HalfFlush: 0.5, multHighHand6PureFlush: 0.4,
  multLowHand7AllPungs: 0.2, multLowHand7HalfFlush: 0.4, multLowHand7PureFlush: 0.3,
  multHighHand7AllPungs: 0.1, multHighHand7HalfFlush: 0.4, multHighHand7PureFlush: 0.7,
  multHighHonorStart: 0.5,
  speedVsValueBalance: 0.5, defenseRiskAversion: 0.3, wallTilesImpact: 0.2,
  baoRiskAversion: 0.5, baoThreshold: 2,
  anKongAggression: 0.95, minkanAggression: 0.3, kakanAggression: 0.5, robKongAwareness: 0.6,
  noWildDoubleAwareness: 0.5, menqingDoubleAwareness: 0.5,
  flushVsPungsBalance: 0.0, honorVsSuitedBalance: 0.0, sequenceVsTripletBias: 0.0,
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
  gameMultiplier: number
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

  return { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [], gameMultiplier: nextGameMultiplier() }
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
function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, gameMultiplier: number = 1): number {
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
    roundMultiplier: 1, globalMultiplier: gameMultiplier
  })
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== AI Discard (长清阁规则) ==========
// ========== Multiplier simulation ==========
let prevRoundWasDraw = false
function rollMultiplier(): number {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  if (d1 === d2 && (d1 === 1 || d1 === 4)) return 4
  if (d1 === d2) return 2
  return 1
}
function nextGameMultiplier(): number {
  const diceMult = rollMultiplier()
  const flowMult = prevRoundWasDraw ? 2 : 1
  return Math.min(8, diceMult * flowMult)
}

function aiDiscard(p: BotPlayer, gameMultiplier: number = 1): Tile {
  const policy = p.policy
  const hand = p.hand
  const wildCount = hand.filter(t => isWT(t, p)).length
  const isMenqing = p.exposedMelds.length === 0
  const totalMelds = p.exposedMelds.length

  // Hand analysis
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const suitCounts = suits.map(s => hand.filter(t => t.suit === s).length)
  const maxSuitIdx = suitCounts.indexOf(Math.max(...suitCounts))
  const maxSuitCount = suitCounts[maxSuitIdx]
  const honorCount = hand.filter(t => isHonor(t)).length
  const windCount = hand.filter(t => t.suit === TileSuit.WIND).length
  const dragonCount = hand.filter(t => t.suit === TileSuit.DRAGON).length

  // Pair/triplet counts
  const groups = groupTiles(hand)
  let pairCount = 0, tripletCount = 0, quadCount = 0
  for (const [k, tiles] of groups) {
    if (tiles.length === 2) pairCount++
    if (tiles.length === 3) tripletCount++
    if (tiles.length === 4) quadCount++
  }

  // Route detection: is hand leaning toward a specific hand type?
  const isPureFlushRoute = maxSuitCount >= hand.length * 0.7 && maxSuitCount >= 8
  const isHalfFlushRoute = maxSuitCount >= hand.length * 0.5 && honorCount >= 2
  const isAllHonorsRoute = honorCount >= hand.length * 0.6 && honorCount >= 6
  const isAllPungsRoute = (tripletCount * 3 + quadCount * 4) >= hand.length * 0.6
  const isSevenPairsRoute = pairCount >= 4 && totalMelds === 0

  // ====== 倍数×起手牌质量 联合路线选择 ======
  // 起手牌质量：按当前最长一门花色判断
  const handQuality = maxSuitCount >= 7 ? 7 : maxSuitCount >= 6 ? 6 : maxSuitCount >= 5 ? 5 : 0
  // 倍数策略：用 effectiveMultBias 参数代表"当前倍数倾向"（训练时测试不同值）
  // effectiveMultBias > 0.5 = 高倍数策略，< 0.5 = 低倍数策略
  const isHighMult = policy.multHighValueBias > 0.5

  // 联合路线决策
  let multHandAllPungsBoost = 0
  let multHandHalfFlushBoost = 0
  let multHandPureFlushBoost = 0
  let multHandHonorBoost = 0

  if (handQuality === 5) {
    if (isHighMult) {
      multHandAllPungsBoost = policy.multHighHand5AllPungs
      multHandHalfFlushBoost = policy.multHighHand5HalfFlush
    } else {
      multHandAllPungsBoost = policy.multLowHand5AllPungs
      multHandHalfFlushBoost = policy.multLowHand5HalfFlush
    }
  } else if (handQuality === 6) {
    if (isHighMult) {
      multHandAllPungsBoost = policy.multHighHand6AllPungs
      multHandHalfFlushBoost = policy.multHighHand6HalfFlush
      multHandPureFlushBoost = policy.multHighHand6PureFlush
    } else {
      multHandAllPungsBoost = policy.multLowHand6AllPungs
      multHandHalfFlushBoost = policy.multLowHand6HalfFlush
      multHandPureFlushBoost = policy.multLowHand6PureFlush
    }
  } else if (handQuality >= 7) {
    if (isHighMult) {
      multHandAllPungsBoost = policy.multHighHand7AllPungs
      multHandHalfFlushBoost = policy.multHighHand7HalfFlush
      multHandPureFlushBoost = policy.multHighHand7PureFlush
    } else {
      multHandAllPungsBoost = policy.multLowHand7AllPungs
      multHandHalfFlushBoost = policy.multLowHand7HalfFlush
      multHandPureFlushBoost = policy.multLowHand7PureFlush
    }
  }

  // 起手牌基础加成
  const handQualityBoost = handQuality >= 7 ? policy.hand7RouteBias
    : handQuality >= 6 ? policy.hand6RouteBias
    : handQuality >= 5 ? policy.hand5RouteBias : 0

  // 高倍数+起手风箭多 → 风一色/风碰
  if (isHighMult && honorCount >= 5) {
    multHandHonorBoost = policy.multHighHonorStart
  }

  const candidates: { tile: Tile; keepScore: number }[] = []
  for (const tile of hand) {
    if (isFlower(tile)) continue
    let keepScore = 0
    const count = hand.filter(t => tileEq(t, tile)).length
    const sameSuit = hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))

    // ====== 基础保留: 对子/刻子 ======
    if (count >= 2) keepScore += policy.pairWeight
    if (count >= 3) keepScore += policy.tripletKeepBonus
    if (count >= 4) keepScore += policy.tripletKeepBonus * 2 // 暗杠潜力

    // ====== 搭子保留: 序数牌相邻1-2张 ======
    if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
      const hasLeft = sameSuit.some(t => t.value === tile.value - 1 || t.value === tile.value - 2)
      const hasRight = sameSuit.some(t => t.value === tile.value + 1 || t.value === tile.value + 2)
      if (hasLeft) keepScore += policy.nearWeight
      if (hasRight) keepScore += policy.nearWeight
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      keepScore += neighbors.length * policy.nearWeight * 0.2

      // 顺子vs刻子偏好: 如果偏刻子路线，降低搭子保留
      if (policy.sequenceVsTripletBias > 0 && count >= 2) {
        keepScore += policy.sequenceVsTripletBias * 2 // 有对子的搭子更想留着碰
      }
    }

    // ====== 幺九孤立张惩罚 ======
    if ((tile.value === 1 || tile.value === 9) && !isHonor(tile)) {
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      if (neighbors.length === 0) keepScore -= policy.terminalPenalty
    }

    // ====== 风牌珍惜度（风牌刻子+1点，杠+2点，暗杠+3点） ======
    if (tile.suit === TileSuit.WIND) {
      let windKeep = policy.windGeneralKeep
      // 可以扩展为按座风位置调整
      if (tile.value === 1) windKeep += policy.windEastKeep
      else if (tile.value === 2) windKeep += policy.windSouthKeep
      else if (tile.value === 3) windKeep += policy.windWestKeep
      else if (tile.value === 4) windKeep += policy.windNorthKeep

      if (count >= 2) keepScore += windKeep * policy.pairWeight
      if (count >= 3) keepScore += windKeep * 3  // 风刻=1点+可能翻倍
      if (count >= 4) keepScore += windKeep * 5  // 风暗杠=3点
      if (count === 1) keepScore -= windKeep * 0.5 // 孤立风牌倾向于打出

      // 风一色/风碰路线加成
      if (isAllHonorsRoute) keepScore += policy.allHonorsPursuit * 10 * (count >= 2 ? 2 : 1)
      if (isAllHonorsRoute && isAllPungsRoute) keepScore += policy.allHonorsPungsPursuit * 20
    }

    // ====== 箭牌珍惜度（箭牌刻子+2点，杠+3点，暗杠+4点） ======
    if (tile.suit === TileSuit.DRAGON) {
      let dragonKeep = policy.dragonGeneralKeep
      if (tile.value === 1) dragonKeep += policy.dragonRedKeep   // 红中
      else if (tile.value === 2) dragonKeep += policy.dragonGreenKeep // 发财
      else if (tile.value === 3) dragonKeep += policy.dragonWhiteKeep // 白板

      if (count >= 2) keepScore += dragonKeep * policy.pairWeight
      if (count >= 3) keepScore += dragonKeep * 4  // 箭刻=2点
      if (count >= 4) keepScore += dragonKeep * 6  // 箭暗杠=4点
      if (count === 1) keepScore -= dragonKeep * 0.3 // 孤立箭牌也想留（比风牌更值）

      // 风一色/风碰路线加成
      if (isAllHonorsRoute) keepScore += policy.allHonorsPursuit * 10 * (count >= 2 ? 2 : 1)
      if (isAllHonorsRoute && isAllPungsRoute) keepScore += policy.allHonorsPungsPursuit * 20
    }

    // ====== 清一色路线: 同花色保留加成 ======
    if (policy.pureFlushPursuit > 0 && !isHonor(tile)) {
      if (tile.suit === suits[maxSuitIdx]) {
        keepScore += policy.pureFlushPursuit * 3 * (maxSuitCount / hand.length)
      } else {
        keepScore -= policy.pureFlushPursuit * 2 // 非主花色打出
      }
    }

    // ====== 倍数×起手牌质量 联合路线加成 ======
    if (handQuality >= 5 && !isHonor(tile)) {
      // 主花色保留加成
      if (tile.suit === suits[maxSuitIdx]) {
        // 碰碰胡倾向：有对子/刻子更想留
        if (multHandAllPungsBoost > 0 && count >= 2) {
          keepScore += multHandAllPungsBoost * 5 * handQualityBoost
        }
        // 混一色倾向：主花色整体保留
        if (multHandHalfFlushBoost > 0) {
          keepScore += multHandHalfFlushBoost * 3 * handQualityBoost
        }
        // 清一色倾向：主花色大幅保留，非主花色打出
        if (multHandPureFlushBoost > 0) {
          keepScore += multHandPureFlushBoost * 6 * handQualityBoost
        }
      } else {
        // 非主花色：清一色路线时大幅惩罚
        if (multHandPureFlushBoost > 0.3) {
          keepScore -= multHandPureFlushBoost * 4 * handQualityBoost
        }
      }
    }
    // 高倍数+风箭多 → 风一色/风碰加成
    if (multHandHonorBoost > 0 && isHonor(tile)) {
      keepScore += multHandHonorBoost * 5 * (count >= 2 ? 2 : 1)
    }

    // ====== 混一色路线: 主花色+字牌保留 ======
    if (policy.halfFlushWeight > 0 && isHalfFlushRoute) {
      if (tile.suit === suits[maxSuitIdx] || isHonor(tile)) {
        keepScore += policy.halfFlushWeight * 2
      } else {
        keepScore -= policy.halfFlushWeight * 1.5
      }
    }

    // ====== 碰碰胡路线: 偏好对子/刻子，降低搭子 ======
    if (policy.allPungsPursuit > 0 && isAllPungsRoute) {
      if (count >= 2) keepScore += policy.allPungsPursuit * 5
      if (count === 1 && !isHonor(tile)) {
        // 单张序数牌在碰碰胡路线下不值钱
        keepScore -= policy.allPungsPursuit * 2
      }
    }

    // ====== 七对路线: 偏好对子，不偏好刻子 ======
    if (policy.sevenPairsPursuit > 0 && isSevenPairsRoute) {
      if (count === 2) keepScore += policy.sevenPairsPursuit * 8  // 对子最珍贵
      if (count >= 3) keepScore -= policy.sevenPairsPursuit * 3   // 刻子浪费一张
      if (count === 1) keepScore -= policy.sevenPairsPursuit * 1  // 单张要清
    }

    // ====== 门清×2翻倍意识（按百搭数分级） ======
    if (isMenqing) {
      const menqingVal = wildCount === 0 ? policy.wild0MenqingKeep
        : wildCount === 1 ? policy.wild1MenqingKeep
        : policy.wild2MenqingKeep
      keepScore += menqingVal * policy.menqingDoubleAwareness
    }

    // ====== 无百搭×2翻倍意识 ======
    if (wildCount === 0 && policy.noWildDoubleAwareness > 0) {
      keepScore += policy.noWildDoubleAwareness * 2
    }

    // ====== 百搭分级激进度 & 路线选择 ======
    const aggression = wildCount === 0 ? policy.wild0Aggression
      : wildCount === 1 ? policy.wild1Aggression
      : wildCount === 2 ? policy.wild2Aggression
      : policy.wild3PlusAggression

    // 百搭分级：吃碰杠推进（三口四口路线）
    const meldPush = wildCount <= 0 ? 0
      : wildCount === 1 ? policy.wild1RouteMeldPush
      : wildCount === 2 ? policy.wild2RouteMeldPush
      : policy.wild3RouteMeldPush
    if (meldPush > 0 && (count >= 2 || isHonor(tile))) {
      keepScore += meldPush * 5 * aggression
    }

    // 百搭分级：清一色路线加成
    if (!isHonor(tile) && tile.suit === suits[maxSuitIdx]) {
      const flushBoost = wildCount === 1 ? policy.wild1RouteFlushBoost
        : wildCount === 2 ? policy.wild2RouteFlushBoost
        : wildCount >= 3 ? policy.wild3RouteFlushBoost : 0
      if (flushBoost > 0) keepScore += flushBoost * 4 * aggression
    }

    // 百搭分级：风一色/风碰路线加成
    if (isHonor(tile)) {
      const honorsBoost = wildCount === 1 ? policy.wild1RouteHonorsBoost
        : wildCount === 2 ? policy.wild2RouteHonorsBoost
        : wildCount >= 3 ? policy.wild3RouteHonorsBoost : 0
      if (honorsBoost > 0 && count >= 2) keepScore += honorsBoost * 6 * aggression
    }

    // 百搭分级：碰碰胡路线加成
    if (count >= 2) {
      const pungsBoost = wildCount === 1 ? policy.wild1RouteAllPungsBoost
        : wildCount === 2 ? policy.wild2RouteAllPungsBoost
        : wildCount >= 3 ? policy.wild3RouteAllPungsBoost : 0
      if (pungsBoost > 0) keepScore += pungsBoost * 4 * aggression
    }

    // 百搭分级：包三包四推进意愿
    const baoPush = wildCount === 1 ? policy.wild1BaoPush
      : wildCount === 2 ? policy.wild2BaoPush
      : wildCount >= 3 ? policy.wild3BaoPush : 0
    if (baoPush > 0 && totalMelds >= policy.baoThreshold) {
      // 百搭多时可以不怕包三四风险
      keepScore += baoPush * 4 * aggression
    }

    // ====== 百搭×倍数联合策略 ======
    if (wildCount >= 1) {
      // 低倍数快胡，高倍数做大牌
      const multAggression = aggression
      // 简化：用aggression已经包含了百搭数量的影响
      keepScore += multAggression * 2
    }

    // ====== 速度vs大牌权衡 ======
    if (policy.speedVsValueBalance > 0.5) {
      if (count >= 3) keepScore -= (policy.speedVsValueBalance - 0.5) * 3
      if (!isHonor(tile) && count === 1) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        keepScore += neighbors.length * (policy.speedVsValueBalance - 0.5) * policy.nearWeight * 0.3
      }
    }

    // ====== 包三四风险规避（无百搭加持时） ======
    if (policy.baoRiskAversion > 0 && totalMelds >= policy.baoThreshold && baoPush < 0.3) {
      keepScore += policy.baoRiskAversion * 3
    }

    // ====== 0百搭特殊策略 ======
    if (wildCount === 0) {
      if (count >= 2) keepScore += policy.allPungsPursuit * 3
      if (isMenqing) keepScore -= policy.menqingKeepBonus * 0.5
      if (!isHonor(tile) && count === 1) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        keepScore += neighbors.length * policy.speedVsValueBalance * policy.nearWeight * 0.4
      }
    }

    // ====== 倍数感知：高倍+好牌冲大牌，高倍+烂牌防守 ======
    const hasGoodHand = wildCount >= 2 || maxSuitCount >= 6 || (wildCount >= 1 && maxSuitCount >= 5)
    if (gameMultiplier >= 4 && hasGoodHand) {
      if (count >= 2) keepScore += policy.multHighValueBias * 4
      if (!isHonor(tile) && tile.suit === suits[maxSuitIdx]) {
        keepScore += policy.multHighValueBias * 3 * (maxSuitCount / hand.length)
      }
      if (isMenqing && wildCount >= 1) keepScore += policy.menqingKeepBonus * 0.5
      if (isHonor(tile) && count >= 2) keepScore += policy.multHighValueBias * 2
    } else if (gameMultiplier >= 4 && !hasGoodHand) {
      keepScore += policy.defenseRiskAversion * 2
      if (count >= 2) keepScore += policy.allPungsPursuit * 2
      if (count === 1 && !isHonor(tile)) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        if (neighbors.length === 0) keepScore += policy.defenseRiskAversion * 2
      }
    } else if (gameMultiplier === 1) {
      keepScore -= 0.5
    }

    // ====== 百搭牌 → 绝不打出 ======
    if (isWT(tile, p)) keepScore += policy.wildKeepPenalty

    candidates.push({ tile, keepScore })
  }

  // LOWEST keepScore = least valuable = DISCARDED FIRST
  candidates.sort((a, b) => a.keepScore - b.keepScore)
  return candidates[0]?.tile || hand[0]
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

    // AnKong / JiaGang check (policy-driven)
    for (const ak of canAnKong(player)) {
      if (Math.random() < player.policy.anKongChance) {
        applyAnKong(player, ak)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(player.hand, player.exposedMelds.length, makeWT(player)).canWin) {
            return { winner: curr, huType: 'self_draw', scores: g.players.map(p => p.score) }
          }
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      if (Math.random() < player.policy.kakanAggression) {
        applyJiaGang(player, jg)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(player.hand, player.exposedMelds.length, makeWT(player)).canWin) {
            return { winner: curr, huType: 'self_draw', scores: g.players.map(p => p.score) }
          }
        }
      }
    }

    // Update ting status
    player.isTing = isTing(player.hand, player.exposedMelds.length, makeWT(player))

    // Discard
    const discard = aiDiscard(player, g.gameMultiplier)
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
          const score = calcScore(opp, false, false, g.gameMultiplier)
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
          const pengDiscard = aiDiscard(opp, g.gameMultiplier)
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
      const chowDiscard = aiDiscard(nextP, g.gameMultiplier)
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
      prevRoundWasDraw = false
      // Use internal game scores (reflects actual payment from loser(s) to winner)
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += result.scores[i] * SETTLEMENT_MULT
      }
    } else {
      draws++
      prevRoundWasDraw = true
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
