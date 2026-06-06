/**
 * AI 竞技对战脚本（ai-arena.ts）
 *
 * 目标：让 4 个 AI（从 6 个候选中随机抽取 4 个，随机分配座位）打麻将，
 *       跑大量对局后输出详细的分析报告。
 *
 * 关键设计：
 * 1. 复用 train-ai-ak.ts 导出的 runGame() 与 loadCharacter() 作为游戏引擎。
 * 2. runGame 内部硬编码 AI_NAMES = ['AI-AK','AI-小胖','AI-阿水','AI-老赵']，
 *    位置 0 被特殊处理为 "AK"。本脚本绕开这个限制的方式：
 *    - 仍然调用 runGame()（它自己负责出牌/吃碰杠/胡/算分）
 *    - 候选 6 个 AI 随机抽 4 个，把策略塞进 runGame 的 4 个位置
 *    - 报告层维护 "座位 → 实际 AI 名" 的映射，最终报告用真实名字呈现
 * 3. 真实结算：完全沿用引擎内的 calculateScore() 路径，
 *    SETTLEMENT_MULT = 10。
 * 4. 跳过冷冻时间：不等待 hes，冷启动直接开打。
 *
 * 用法：
 *   npx tsx scripts/ai-arena.ts                    # 默认 100 局
 *   npx tsx scripts/ai-arena.ts --games 500        # 指定局数
 *   npx tsx scripts/ai-arena.ts --top 10           # 只看榜上前 10
 *   npx tsx scripts/ai-arena.ts --no-detail        # 关闭逐局明细
 *
 * 报告：
 *   写入 arena-output/YYYY-MM-DD_HHMMSS/：
 *     - summary.md           总览榜 + 排名
 *     - games.csv            每局一行（座位/赢家/番数/事件数）
 *     - detailed/<gameId>.md 逐局明细（默认开启，最多 30 局）
 *     - meta.json            运行参数与元数据
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { runGame, loadCharacter } from './train-ai-ak'

// ========== 本地类型定义（与 train-ai-ak.ts 保持一致；该文件未导出这些类型） ==========
interface GameEvent { turn: number; player: string; action: string; detail: string }
interface SettlementEntry { from: string; to: string; amount: number; reason: string; fan?: number; mult?: number }
interface PlayerSnapshot {
  name: string; hand: string; melds: string[]; flowers: string[]; meldSources: number[]
  wildCount: number; wildTile: string; wonFan?: number; winHandType?: string; status: string
}
interface WinnerInfo {
  playerIndex: number; name: string; hand: string; melds: string[]; flowers: string[]
  isSelfDraw: boolean; wonFan: number; baseFan: number; winHandType: string; roundNum: number
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
  winnerPlayer?: unknown; winnersThisGame: WinnerInfo[]
  turnSnapshots: TurnSnapshot[]; diagnostics: unknown; gameMeta?: unknown
}
type RunGameResult = GameResult | null

// ========== 参数解析 ==========
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ARGS = process.argv.slice(2)
function argValue(flag: string, fallback: number): number {
  const i = ARGS.indexOf(flag)
  if (i < 0) return fallback
  const v = parseInt(ARGS[i + 1] || '', 10)
  return Number.isFinite(v) ? v : fallback
}
function argFlag(flag: string): boolean {
  return ARGS.includes(flag)
}

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

// SEED 控制（可选）：--seed 12345 固定随机种子以便复现
if (SEED !== null) {
  // 简单的 mulberry32 种子化
  let s = SEED >>> 0
  const rng = () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // @ts-ignore
  Math.random = rng
}

const SETTLEMENT_MULT = 10

// 6 个候选 AI（必须与 AI_policies/characters/ 下的 JSON 文件名一致）
const CANDIDATES = ['AI-AK', 'AI-小猪', 'AI-小胖', 'AI-老蒋', 'AI-老赵', 'AI-阿水'] as const
type AIName = (typeof CANDIDATES)[number]

// ========== 类型 ==========
interface SeatAssignment {
  /** 引擎内部座位 0..3，对应 runGame 的 AI_NAMES[i] */
  enginePos: number
  /** 实际选中的 AI 名（来自 CANDIDATES） */
  aiName: AIName
  /** 该 AI 实际坐在引擎的哪个位置（'AI-AK' / 'AI-小胖' / 'AI-阿水' / 'AI-老赵'） */
  engineName: string
}

interface GameRecord {
  gameId: number
  seats: SeatAssignment[]   // 4 个座位的真实 AI 分配
  winner: number             // 引擎记录的赢家 pos（-1 = 流局）
  winnerAiName: AIName | null
  scores: number[]           // 4 个引擎座位的得分（实际× SETTLEMENT_MULT）
  netScores: number[]        // 与 0 起始点的差值
  scoresByAi: Record<AIName, number>  // 按真实 AI 名汇总
  totalPot: number           // 本局总输赢（绝对值合计 / 2）
  multiplier: number
  settlementCount: number
  winnerName?: string
  handTypeName?: string
  wonFan?: number
  selfDraw?: boolean
  isDraw: boolean
  roundNum: number
  eventCount: number
  durationMs: number
  settlements: SettlementEntry[]
  events: GameEvent[]
  snapshots: PlayerSnapshot[]
  turnSnapshots: TurnSnapshot[]
}

// ========== 工具函数 ==========
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickFour(candidates: readonly AIName[]): AIName[] {
  return shuffle([...candidates]).slice(0, 4)
}

/** 引擎的 4 个固定名字（与 runGame 中 AI_NAMES 一致） */
const ENGINE_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'] as const

/**
 * 给 4 个选中的 AI 随机分配到 4 个引擎位置。
 * 返回 4 条 SeatAssignment（按引擎 pos 升序），报告里用真实 AI 名。
 */
function assignSeats(picked: AIName[]): SeatAssignment[] {
  const shuffled = shuffle(picked)
  return shuffled.map((aiName, enginePos) => ({
    enginePos,
    aiName,
    engineName: ENGINE_NAMES[enginePos],
  }))
}

/** 计算本局总输赢（绝对值合计 / 2） */
function computeTotalPot(scores: number[]): number {
  const total = scores.reduce((s, v) => s + Math.abs(v), 0)
  return total / 2
}

/** 把游戏结果转换成对外报告用的 GameRecord */
function toGameRecord(
  gameId: number,
  seats: SeatAssignment[],
  result: RunGameResult | null,
  durationMs: number
): GameRecord {
  if (!result) {
    // 流局
    const scoresByAi: Record<string, number> = {}
    for (const s of seats) scoresByAi[s.aiName] = 0
    return {
      gameId,
      seats,
      winner: -1,
      winnerAiName: null,
      scores: [0, 0, 0, 0],
      netScores: [0, 0, 0, 0],
      scoresByAi: scoresByAi as Record<AIName, number>,
      totalPot: 0,
      multiplier: 1,
      settlementCount: 0,
      isDraw: true,
      roundNum: 0,
      eventCount: 0,
      durationMs,
      settlements: [],
      events: [],
      snapshots: [],
      turnSnapshots: [],
    }
  }
  const scoresByAi: Record<string, number> = {}
  for (const s of seats) {
    // 引擎得分已经包含 SETTLEMENT_MULT（runGame 内部就是用这个值）
    scoresByAi[s.aiName] = result.scores[s.enginePos]
  }
  // 引擎的 result.winner 可能是 -1（已知 bug：流局也走非零分数路径）
  // 我们用 scores 与 winnersThisGame 共同推断赢家
  let effectiveWinner = result.winner
  const primaryWinner = (result.winnersThisGame && result.winnersThisGame[0]) || null
  if (effectiveWinner < 0 && primaryWinner) {
    effectiveWinner = primaryWinner.playerIndex
  }
  if (effectiveWinner < 0) {
    // 用分数推断：最高分座位
    let maxScore = -Infinity, maxIdx = -1
    for (let i = 0; i < result.scores.length; i++) {
      if (result.scores[i] > maxScore) { maxScore = result.scores[i]; maxIdx = i }
    }
    if (maxScore > 0) effectiveWinner = maxIdx
  }
  const winnerSeat = effectiveWinner >= 0 ? seats.find(s => s.enginePos === effectiveWinner) : undefined
  return {
    gameId,
    seats,
    winner: effectiveWinner,
    winnerAiName: winnerSeat?.aiName ?? null,
    scores: result.scores.slice(),
    netScores: result.scores.slice(),
    scoresByAi: scoresByAi as Record<AIName, number>,
    totalPot: computeTotalPot(result.scores),
    multiplier: result.multiplier,
    settlementCount: result.settlementLog.length,
    winnerName: winnerSeat?.aiName,
    handTypeName: primaryWinner?.winHandType,
    wonFan: primaryWinner?.wonFan,
    selfDraw: primaryWinner?.isSelfDraw,
    isDraw: false,
    roundNum: result.roundNum,
    eventCount: result.events.length,
    durationMs,
    settlements: result.settlementLog,
    events: result.events,
    snapshots: result.snapshots,
    turnSnapshots: result.turnSnapshots,
  }
}

// ========== 报告生成 ==========
function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((sorted.length - 1) * p)
  return sorted[idx]
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length === 0) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

interface AiStats {
  aiName: AIName
  games: number
  wins: number        // 第一赢家次数
  winRate: number
  totalScore: number
  avgScore: number
  stdScore: number
  bestScore: number
  worstScore: number
  selfDrawWins: number
  discardWins: number
  top1Finishes: number
  top2Finishes: number
  bottomFinishes: number
  /** 作为座位被随机抽中的次数 */
  seatAppearances: number
  /** 与其他 AI 同局次数 */
  coOccurrence: Record<AIName, number>
}

function buildStats(records: GameRecord[]): Map<AIName, AiStats> {
  const stats = new Map<AIName, AiStats>()
  for (const c of CANDIDATES) {
    stats.set(c, {
      aiName: c,
      games: 0,
      wins: 0,
      winRate: 0,
      totalScore: 0,
      avgScore: 0,
      stdScore: 0,
      bestScore: -Infinity,
      worstScore: Infinity,
      selfDrawWins: 0,
      discardWins: 0,
      top1Finishes: 0,
      top2Finishes: 0,
      bottomFinishes: 0,
      seatAppearances: 0,
      coOccurrence: {} as Record<AIName, number>,
    })
  }

  for (const rec of records) {
    const aiInGame = rec.seats.map(s => s.aiName)
    for (const ai of aiInGame) {
      const st = stats.get(ai)!
      st.games++
      st.seatAppearances++
    }
    // 同局共现
    for (let i = 0; i < aiInGame.length; i++) {
      for (let j = 0; j < aiInGame.length; j++) {
        if (i === j) continue
        const a = aiInGame[i], b = aiInGame[j]
        const st = stats.get(a)!
        st.coOccurrence[b] = (st.coOccurrence[b] || 0) + 1
      }
    }

    if (rec.isDraw) continue

    // 排名（按 scoresByAi 降序，相同则视为并列）
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

    if (rec.winnerAiName) {
      const st = stats.get(rec.winnerAiName)!
      st.wins++
      if (rec.selfDraw) st.selfDrawWins++
      else st.discardWins++
    }
  }

  for (const st of stats.values()) {
    if (st.games === 0) {
      st.bestScore = 0
      st.worstScore = 0
      continue
    }
    st.avgScore = st.totalScore / st.games
    st.winRate = st.wins / st.games
    // 重新计算 stddev（按局分数）
    const scores: number[] = []
    for (const rec of records) {
      if (rec.isDraw) continue
      for (const s of rec.seats) {
        if (s.aiName === st.aiName) scores.push(rec.scoresByAi[s.aiName])
      }
    }
    st.stdScore = stddev(scores)
  }

  return stats
}

function formatSummary(stats: Map<AIName, AiStats>, records: GameRecord[]): string {
  const lines: string[] = []
  const arr = [...stats.values()]
  const totalGames = records.length
  const drawGames = records.filter(r => r.isDraw).length
  const winGames = totalGames - drawGames
  const totalPot = records.reduce((s, r) => s + r.totalPot, 0)

  lines.push(`# AI 竞技对战总览\n`)
  lines.push(`- 总局数: **${totalGames}**`)
  lines.push(`- 有效局（有赢家）: **${winGames}**`)
  lines.push(`- 流局: **${drawGames}** (${(drawGames / Math.max(1, totalGames) * 100).toFixed(1)}%)`)
  lines.push(`- 总输赢（绝对值合计）: **${totalPot}**`)
  lines.push(`- SETTLEMENT_MULT: **${SETTLEMENT_MULT}**`)
  lines.push('')

  // 排名榜（按平均得分降序）
  const ranked = arr
    .filter(s => s.games > 0)
    .sort((a, b) => b.avgScore - a.avgScore)
  lines.push(`## 🏆 排名榜（按平均得分）\n`)
  lines.push(`| 排名 | AI | 局数 | 胜率 | 平均得分 | 总得分 | 标准差 | 最佳局 | 最差局 | 自摸胜 | 放炮胜 | 登顶 | 垫底 |`)
  lines.push(`|------|----|------|------|----------|--------|--------|--------|--------|--------|--------|------|------|`)
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i]
    lines.push(
      `| ${i + 1} | **${s.aiName}** | ${s.games} | ${(s.winRate * 100).toFixed(1)}% | ${fmtSigned(s.avgScore.toFixed(1))} | ${fmtSigned(s.totalScore)} | ${s.stdScore.toFixed(1)} | ${fmtSigned(s.bestScore)} | ${fmtSigned(s.worstScore)} | ${s.selfDrawWins} | ${s.discardWins} | ${s.top1Finishes} | ${s.bottomFinishes} |`
    )
  }
  lines.push('')

  // 胜场榜
  const winsRanked = [...arr].sort((a, b) => b.wins - a.wins)
  lines.push(`## 🎯 胜场榜（按胜场数）\n`)
  lines.push(`| AI | 胜场 | 胜率 | 自摸胜 | 放炮胜 |`)
  lines.push(`|----|------|------|--------|--------|`)
  for (const s of winsRanked) {
    if (s.games === 0) continue
    lines.push(`| ${s.aiName} | ${s.wins} | ${(s.winRate * 100).toFixed(1)}% | ${s.selfDrawWins} | ${s.discardWins} |`)
  }
  lines.push('')

  // 共现矩阵（谁和谁常一起打）
  const present = arr.filter(s => s.seatAppearances > 0)
  if (present.length > 0) {
    lines.push(`## 🤝 同局共现矩阵（共同打过的局数）\n`)
    const header = ['AI', ...present.map(s => s.aiName)]
    lines.push(`| ${header.join(' | ')} |`)
    lines.push(`|${header.map(() => '------').join('|')}|`)
    for (const row of present) {
      const cells = [row.aiName]
      for (const col of present) {
        const v = row.coOccurrence[col.aiName] || 0
        cells.push(v === 0 ? '-' : String(v))
      }
      lines.push(`| ${cells.join(' | ')} |`)
    }
    lines.push('')
  }

  // 出现率（候选中随机抽中的频率）
  lines.push(`## 🎲 抽选分布\n`)
  lines.push(`| AI | 抽中局数 | 抽中率 |`)
  lines.push(`|----|----------|--------|`)
  for (const s of arr.sort((a, b) => b.seatAppearances - a.seatAppearances)) {
    const rate = (s.seatAppearances / Math.max(1, totalGames) * 100).toFixed(1)
    lines.push(`| ${s.aiName} | ${s.seatAppearances} | ${rate}% |`)
  }
  lines.push('')

  // 番种榜
  const handTypes: Record<string, number> = {}
  for (const rec of records) {
    if (rec.isDraw || !rec.handTypeName) continue
    for (const t of rec.handTypeName.split(',').map(s => s.trim()).filter(Boolean)) {
      handTypes[t] = (handTypes[t] || 0) + 1
    }
  }
  const handTypeEntries = Object.entries(handTypes).sort((a, b) => b[1] - a[1])
  if (handTypeEntries.length > 0) {
    lines.push(`## 🀄 番种分布\n`)
    lines.push(`| 番种 | 次数 | 占比 |`)
    lines.push(`|------|------|------|`)
    for (const [name, count] of handTypeEntries) {
      const pct = (count / Math.max(1, winGames) * 100).toFixed(1)
      lines.push(`| ${name} | ${count} | ${pct}% |`)
    }
    lines.push('')
  }

  // 速度统计
  const durations = records.map(r => r.durationMs)
  const roundNums = records.filter(r => !r.isDraw).map(r => r.roundNum)
  if (durations.length > 0) {
    lines.push(`## ⏱️ 速度统计\n`)
    lines.push(`- 单局耗时：均值 ${mean(durations).toFixed(0)}ms，中位 ${percentile(durations, 0.5).toFixed(0)}ms，P95 ${percentile(durations, 0.95).toFixed(0)}ms`)
    if (roundNums.length > 0) {
      lines.push(`- 单局回合数：均值 ${mean(roundNums).toFixed(1)}，中位 ${percentile(roundNums, 0.5)}，P95 ${percentile(roundNums, 0.95)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatGameDetail(rec: GameRecord): string {
  const lines: string[] = []
  const seatStr = rec.seats.map(s => `${s.engineName}→${s.aiName}`).join(' | ')
  lines.push(`# 第 ${rec.gameId} 局\n`)
  lines.push(`- 座位分配: ${seatStr}`)
  lines.push(`- 倍数: ${rec.multiplier}`)
  lines.push(`- 回合数: ${rec.roundNum}`)
  lines.push(`- 耗时: ${rec.durationMs}ms`)
  lines.push('')

  if (rec.isDraw) {
    lines.push(`## 🌊 流局\n`)
    return lines.join('\n')
  }

  lines.push(`## 🏁 结果\n`)
  lines.push(`| 座位 | 引擎名 | 实际AI | 得分 |`)
  lines.push(`|------|--------|--------|------|`)
  for (const s of rec.seats) {
    lines.push(`| ${s.enginePos} | ${s.engineName} | **${s.aiName}** | ${fmtSigned(rec.scores[s.enginePos])} |`)
  }
  lines.push('')

  if (rec.winnerAiName) {
    const winType = rec.selfDraw ? '自摸' : '放炮'
    lines.push(`- 赢家: **${rec.winnerAiName}** (${winType})`)
    lines.push(`- 番数: ${rec.wonFan}`)
    lines.push(`- 牌型: ${rec.handTypeName || '(未知)'}`)
    lines.push('')
  }

  if (rec.settlements.length > 0) {
    lines.push(`## 💰 结算明细 (${rec.settlementCount} 条)\n`)
    lines.push(`| 付款方 | 收款方 | 金额 | 原因 | 番 | 倍数 |`)
    lines.push(`|--------|--------|------|------|----|------|`)
    for (const s of rec.settlements) {
      lines.push(`| ${s.from} | ${s.to} | ${s.amount} | ${s.reason} | ${s.fan ?? '-'} | ${s.mult ?? '-'} |`)
    }
    lines.push('')
  }

  if (rec.snapshots && rec.snapshots.length > 0) {
    lines.push(`## 🃏 终局手牌快照\n`)
    for (const snap of rec.snapshots) {
      const meldStr = (snap.melds && snap.melds.length > 0) ? `\n  - 副露: ${snap.melds.join(' / ')}` : ''
      const flowerStr = (snap.flowers && snap.flowers.length > 0) ? `\n  - 花牌: ${snap.flowers.join(' ')}` : ''
      const status = snap.status === 'won' ? ' 🏆胡' : ''
      lines.push(`- **${snap.name}**${status} (百搭: ${snap.wildTile}, 手牌${snap.wildCount}张百搭)${meldStr}${flowerStr}`)
      lines.push(`  - 隐藏手: ${snap.hand || '(空)'}`)
    }
    lines.push('')
  }

  if (rec.events && rec.events.length > 0) {
    lines.push(`## 📜 关键事件 (${rec.events.length} 条)\n`)
    lines.push(`<details><summary>展开全部</summary>\n`)
    for (const e of rec.events) {
      lines.push(`- [T${e.turn}] ${e.player} · ${e.action}: ${e.detail}`)
    }
    lines.push(`\n</details>\n`)
  }

  return lines.join('\n')
}

function formatGamesCsv(records: GameRecord[]): string {
  const lines: string[] = []
  lines.push('game_id,seat0_ai,seat1_ai,seat2_ai,seat3_ai,winner_ai,win_type,hand_type,fan,multiplier,rounds,total_pot,score_s0,score_s1,score_s2,score_s3,duration_ms,is_draw')
  for (const rec of records) {
    const seats = rec.seats
    const s = (i: number) => seats[i]?.aiName || '-'
    const winner = rec.winnerAiName || (rec.isDraw ? '流局' : '-')
    const winType = rec.selfDraw === undefined ? '-' : (rec.selfDraw ? '自摸' : '放炮')
    const scores = [0, 1, 2, 3].map(i => rec.scores[i] ?? 0).join(',')
    lines.push([
      rec.gameId,
      s(0), s(1), s(2), s(3),
      winner,
      winType,
      rec.handTypeName || '-',
      rec.wonFan ?? '-',
      rec.multiplier,
      rec.roundNum,
      rec.totalPot,
      scores,
      rec.durationMs,
      rec.isDraw ? '1' : '0',
    ].join(','))
  }
  return lines.join('\n')
}

// ========== 主流程 ==========
async function main() {
  const startTime = Date.now()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = path.resolve(__dirname, '..', 'arena-output', stamp)
  const detailDir = path.join(outDir, 'detailed')
  fs.mkdirSync(outDir, { recursive: true })
  if (DETAIL) fs.mkdirSync(detailDir, { recursive: true })

  // 预加载所有 6 个 AI 的策略
  const allPolicies = new Map<AIName, ReturnType<typeof loadCharacter>>()
  for (const name of CANDIDATES) {
    allPolicies.set(name, loadCharacter(name))
  }
  console.error(`[ARENA] 已加载 ${allPolicies.size} 个 AI 策略`)

  const records: GameRecord[] = []
  let lastReport = 0

  for (let g = 0; g < GAMES; g++) {
    const t0 = Date.now()
    // 1) 随机抽 4 个 AI
    const picked = pickFour(CANDIDATES)
    // 2) 随机分配座位
    const seats = assignSeats(picked)
    // 3) 构造 4 个策略（按引擎座位顺序）
    const policies: [ReturnType<typeof loadCharacter>, ReturnType<typeof loadCharacter>, ReturnType<typeof loadCharacter>, ReturnType<typeof loadCharacter>] = [
      allPolicies.get(seats[0].aiName)!,
      allPolicies.get(seats[1].aiName)!,
      allPolicies.get(seats[2].aiName)!,
      allPolicies.get(seats[3].aiName)!,
    ]
    // 4) 调用 runGame（它使用自己的内部 AI_NAMES 标识 4 个位置）
    let result: RunGameResult | null = null
    try {
      result = runGame(policies[0], [policies[1], policies[2], policies[3]], g)
    } catch (e) {
      console.error(`[ARENA] game=${g} crashed:`, e)
      continue
    }
    const durationMs = Date.now() - t0
    const rec = toGameRecord(g, seats, result, durationMs)
    records.push(rec)

    // 进度日志
    if (g < 5 || g % 10 === 0 || g === GAMES - 1) {
      const winnerLabel = rec.winnerAiName || '流局'
      const seatStr = rec.seats.map(s => s.aiName).join('|')
      console.error(
        `[ARENA] game=${g + 1}/${GAMES} 座位=[${seatStr}] 赢家=${winnerLabel} 局时长=${durationMs}ms 回合=${rec.roundNum}`
      )
    }

    // 详细报告（默认最多 30 局，避免 IO 爆炸）
    if (DETAIL && g < DETAIL_MAX) {
      const md = formatGameDetail(rec)
      fs.writeFileSync(path.join(detailDir, `game-${String(g).padStart(4, '0')}.md`), md, 'utf-8')
    }

    // 增量保存（每 50 局）
    if (g - lastReport >= 49 || g === GAMES - 1) {
      lastReport = g
      const stats = buildStats(records)
      const summary = formatSummary(stats, records)
      fs.writeFileSync(path.join(outDir, 'summary.partial.md'), summary, 'utf-8')
      console.error(`[ARENA] 增量报告已保存 (${g + 1}/${GAMES})`)
    }
  }

  // ========== 最终报告 ==========
  const stats = buildStats(records)
  const summary = formatSummary(stats, records)
  fs.writeFileSync(path.join(outDir, 'summary.md'), summary, 'utf-8')

  // CSV
  const csv = formatGamesCsv(records)
  fs.writeFileSync(path.join(outDir, 'games.csv'), csv, 'utf-8')

  // JSON 全量（备用）
  const jsonl = records.map(r => ({
    gameId: r.gameId,
    seats: r.seats,
    winner: r.winner,
    winnerAiName: r.winnerAiName,
    scores: r.scores,
    scoresByAi: r.scoresByAi,
    totalPot: r.totalPot,
    multiplier: r.multiplier,
    handTypeName: r.handTypeName,
    wonFan: r.wonFan,
    selfDraw: r.selfDraw,
    isDraw: r.isDraw,
    roundNum: r.roundNum,
    durationMs: r.durationMs,
  }))
  fs.writeFileSync(path.join(outDir, 'games.jsonl'), jsonl.map(o => JSON.stringify(o)).join('\n'), 'utf-8')

  // Meta
  const meta = {
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date().toISOString(),
    totalMs: Date.now() - startTime,
    games: GAMES,
    settlementMult: SETTLEMENT_MULT,
    candidates: CANDIDATES,
    detail: DETAIL,
    detailMax: DETAIL_MAX,
    seed: SEED,
    topN: TOP_N,
  }
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')

  // 控制台摘要
  console.log('\n' + '='.repeat(60))
  console.log('AI 竞技对战完成')
  console.log('='.repeat(60))
  console.log(`总局数: ${GAMES}, 用时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.log(`报告目录: ${outDir}`)
  console.log('排名榜（按平均得分）:')
  const ranked = [...stats.values()].filter(s => s.games > 0).sort((a, b) => b.avgScore - a.avgScore)
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i]
    console.log(`  ${i + 1}. ${s.aiName.padEnd(8)} 局数=${String(s.games).padStart(3)} 胜率=${(s.winRate * 100).toFixed(1).padStart(5)}% 均分=${fmtSigned(s.avgScore.toFixed(1)).padStart(7)} 胜场=${s.wins}`)
  }
  console.log('')
  console.log(`详细报告: ${outDir}/summary.md`)
  console.log(`逐局CSV:  ${outDir}/games.csv`)
  if (DETAIL) console.log(`逐局MD:   ${outDir}/detailed/`)
}

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('[ARENA_CRASH] uncaughtException:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[ARENA_CRASH] unhandledRejection:', reason)
  process.exit(1)
})

main().catch(e => {
  console.error('[ARENA_CRASH]', e)
  process.exit(1)
})
