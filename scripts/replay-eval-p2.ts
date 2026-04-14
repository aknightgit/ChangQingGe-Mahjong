/**
 * P2 离线回放评估脚本
 * 解析训练输出的 stderr trace 数据，计算吃碰后N巡 outcomes
 *
 * 用法:
 *   npx tsx scripts/replay-eval-p2.ts [N=3] < trace.log
 *   npx tsx scripts/replay-eval-p2.ts [N=3] /path/to/trace.log
 *
 * 输出: artifacts/ai-eval/p2/replay-eval-N{X}-YYYYMMDD-HHMMSS.md
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---- trace line types ----
interface DealTrace   { kind: 'DEAL';   player: string; handSize: number; melds: number; wall: number; }
interface DrawTrace    { kind: 'DRAW';   player: string; handSize: number; melds: number; wall: number; drawn: string; }
interface DiscTrace    { kind: 'DISC';   player: string; handSize: number; melds: number; wall: number; discarded: string; }
interface ClaimTrace   { kind: 'CLAIM';  player: string; handSize: number; melds: number; wall: number; tile: string; isChow: boolean; }
interface PengApplyTrace { kind: 'PENG_APPLY'; player: string; handSize: number; melds: number; wall: number; }
interface WinTrace     { kind: 'WIN';    winner: string; mode: string; fan: number; handType: string; discarder: string; round: number; wall: number; }
interface DrawTrace2   { kind: 'DRAW_END'; round: number; wall: number; }
type Trace = DealTrace | DrawTrace | DiscTrace | ClaimTrace | PengApplyTrace | WinTrace | DrawTrace2

// ---- per-game state ----
interface GameSession {
  gameId: number
  players: string[]
  events: Trace[]
  result?: WinTrace
  isDraw: boolean
}

// ---- decision snapshot ----
interface DecisionSnap {
  gameId: number
  player: string
  action: 'CHOW' | 'PENG' | 'DISC'
  round: number
  turnIndex: number
  wall: number
  handSize: number
  meldCount: number
  winInN: boolean | null
  dealInN: boolean | null
  tenpaiAtDraw: boolean | null
}

// ---- evaluation result ----
interface EvalResult {
  action: string
  sampleSize: number
  winRate: number
  dealInRate: number
  tenpaiRate: number
}

function main() {
  const N = parseInt(process.argv[2] || '3')
  let inputPath = process.argv[3]

  let rawInput: string
  if (inputPath) {
    rawInput = fs.readFileSync(path.resolve(inputPath), 'utf-8')
  } else {
    // read from stdin
    rawInput = fs.readFileSync(0, 'utf-8')
  }

  const lines = rawInput.split('\n').filter(l => l.includes('[INV_TRACE]'))

  // ---- parse all traces ----
  const traces = lines.map(parseTrace).filter((t): t is Trace => t !== null)
  console.error(`[ReplayEval] 解析到 ${traces.length} 条 INV_TRACE`)

  // ---- group by game (using wallIdx as game boundary) ----
  const sessions = buildSessions(traces)
  console.error(`[ReplayEval] 识别到 ${sessions.length} 个对局`)

  // ---- collect decision snapshots ----
  const snaps: DecisionSnap[] = []
  for (const sess of sessions) {
    processSession(sess, snaps, N)
  }

  console.error(`[ReplayEval] 共 ${snaps.length} 个决策快照（吃/碰/出牌）`)

  // ---- compute metrics ----
  const results = computeMetrics(snaps)

  // ---- write report ----
  const OUTPUT_DIR = path.join(__dirname, '../artifacts/ai-eval/p2')
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(OUTPUT_DIR, `replay-eval-N${N}-${timestamp}.md`)

  let report = `# P2 离线回放评估报告\n\n`
  report += `> 生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`
  report += `**口径**: 吃/碰/出牌后 N 巡内（当前决策后 N 个玩家行动窗口内）\n\n`
  report += `**N = ${N}**\n\n`
  report += `| 动作 | 样本数 | ${N}巡内和牌率 | ${N}巡内放铳率 | 流局听牌率 |\n`
  report += `|------|--------|--------------|--------------|-----------|\n`

  for (const r of Object.values(results).sort((a, b) => b.sampleSize - a.sampleSize)) {
    report += `| ${r.action} | ${r.sampleSize} | ${(r.winRate * 100).toFixed(1)}% | ${(r.dealInRate * 100).toFixed(1)}% | ${(r.tenpaiRate * 100).toFixed(1)}% |\n`
  }

  report += `\n## 决策详情\n\n`
  report += `| # | 局 | 玩家 | 动作 | 巡 | 牌墙 | 和牌? | 放铳? | 听牌? |\n`
  report += `|---|-----|------|------|----|------|-------|-------|-------|\n`

  for (let i = 0; i < Math.min(snaps.length, 200); i++) {
    const s = snaps[i]
    const win = s.winInN === null ? '-' : s.winInN ? '✅' : '❌'
    const deal = s.dealInN === null ? '-' : s.dealInN ? '❌' : '✅'
    const tenp = s.tenpaiAtDraw === null ? '-' : s.tenpaiAtDraw ? '✅' : '❌'
    report += `| ${i + 1} | ${s.gameId} | ${s.player} | ${s.action} | ${s.round} | ${s.wall} | ${win} | ${deal} | ${tenp} |\n`
  }

  report += `\n## 基准参考\n\n`
  report += `- 对比 legacy（无管线）：吃后${N}巡放铳率应下降 >= 8%\n`
  report += `- 对比 legacy：流局听牌率应提升 >= 5%\n`
  report += `- 总和牌率不应下降（允许 ±1% 波动）\n`

  fs.writeFileSync(outputFile, report, 'utf-8')
  console.error(`[ReplayEval] 报告已写入: ${outputFile}`)
  console.log(report)
}

// ---- parse a single INV_TRACE line ----
function parseTrace(line: string): Trace | null {
  const m = line.match(/\[INV_TRACE\]\s+(\w+)\s+(.*)/)
  if (!m) return null
  const type = m[1], args = m[2]

  // split args but first token might be player name (no =)
  const tokens = args.split(/\s+/)
  const kv: Record<string, string> = {}
  let playerName = ''
  for (const token of tokens) {
    if (token.includes('=')) {
      const [k, v] = token.split('=')
      if (k) kv[k] = v
    } else {
      // first token without = is the player name
      if (!playerName) playerName = token.replace(/_DUP$/, '')
    }
  }

  switch (type) {
    case 'DEAL': {
      return { kind: 'DEAL', player: playerName, handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'] }
    }
    case 'DRAW': {
      return { kind: 'DRAW', player: playerName || kv['player'] || '', handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'], drawn: kv['drawn'] || '' }
    }
    case 'DISC': {
      return { kind: 'DISC', player: kv['DISC'] || playerName, handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'], discarded: kv['discarded'] || '' }
    }
    case 'CLAIM': {
      return { kind: 'CLAIM', player: kv['player'] || playerName, handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'], tile: kv['tile'] || '', isChow: false }
    }
    case 'CHOW_CLAIM': {
      return { kind: 'CLAIM', player: kv['player'] || playerName, handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'], tile: kv['tile'] || '', isChow: true }
    }
    case 'PENG_APPLY': {
      return { kind: 'PENG_APPLY', player: kv['player'] || playerName, handSize: +kv['h'], melds: +kv['m'], wall: +kv['wall'] }
    }
    case 'WIN': {
      return {
        kind: 'WIN',
        winner: kv['winner'] || playerName,
        mode: kv['mode'] || '',
        fan: +kv['fan'],
        handType: kv['handType'] || '',
        discarder: kv['discarder'] || '-',
        round: +kv['round'],
        wall: +kv['wall']
      }
    }
    default:
      return null
  }
}

// ---- group traces into game sessions ----
// Game boundary: 4 DEAL lines with same wall = 1 game
// When we see DEAL with a wall we've seen before (within same session), start new session
function buildSessions(traces: Trace[]): GameSession[] {
  const sessions: GameSession[] = []
  let current: GameSession | null = null
  let gameId = 0
  const seenWalls = new Set<number>()  // walls we've seen in current session

  for (const t of traces) {
    if (t.kind === 'DEAL') {
      if (current && seenWalls.has(t.wall)) {
        // This DEAL's wall repeats within current session → new game starts
        // First, if current session has no result (incomplete), mark as draw
        if (!current.result) current.isDraw = true
        sessions.push(current)
        gameId++
        current = null
        seenWalls.clear()
      }
      if (!current) {
        current = { gameId: gameId || 1, players: [], events: [], isDraw: false }
      }
      if (!current.players.includes(t.player)) current.players.push(t.player)
      seenWalls.add(t.wall)
    }
    if (current) {
      if (t.kind === 'WIN') {
        current.result = t
        current.isDraw = t.mode === '流局'
      }
      current.events.push(t)
    }
  }
  if (current) {
    if (!current.result) current.isDraw = true
    sessions.push(current)
  }
  return sessions
}

// ---- process one game session, populate snapshots ----
function processSession(sess: GameSession, snaps: DecisionSnap[], N: number) {
  const events = sess.events
  const winner = sess.result?.winner
  const isDraw = sess.isDraw
  const discarder = sess.result?.discarder

  let turnIdx = 0
  const aiPlayers = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']

  for (let i = 0; i < events.length; i++) {
    const e = events[i]

    if (e.kind === 'CLAIM' && aiPlayers.includes(e.player)) {
      // count subsequent turns (player's own turns within N)
      let myTurns = 0
      let won = false, dealtIn = false
      for (let j = i + 1; j < events.length && myTurns < N; j++) {
        const ne = events[j]
        if (ne.kind === 'WIN') {
          if (ne.winner === e.player) won = true
          if (ne.winner !== e.player && ne.discarder === e.player) dealtIn = true
          break
        }
        if (ne.kind === 'DRAW' && ne.player === e.player) myTurns++
      }

      snaps.push({
        gameId: sess.gameId,
        player: e.player,
        action: e.isChow ? 'CHOW' : 'PENG',
        round: Math.floor(i / 4),
        turnIndex: turnIdx++,
        wall: e.wall,
        handSize: e.handSize,
        meldCount: e.melds,
        winInN: won ? true : null,
        dealInN: dealtIn ? true : null,
        tenpaiAtDraw: null
      })
    }

    if (e.kind === 'DISC' && aiPlayers.includes(e.player)) {
      let myTurns = 0
      let won = false, dealtIn = false
      for (let j = i + 1; j < events.length && myTurns < N; j++) {
        const ne = events[j]
        if (ne.kind === 'WIN') {
          if (ne.winner === e.player) won = true
          if (ne.winner !== e.player && ne.discarder === e.player) dealtIn = true
          break
        }
        if (ne.kind === 'DRAW' && ne.player === e.player) myTurns++
      }

      snaps.push({
        gameId: sess.gameId,
        player: e.player,
        action: 'DISC',
        round: Math.floor(i / 4),
        turnIndex: turnIdx++,
        wall: e.wall,
        handSize: e.handSize,
        meldCount: e.melds,
        winInN: won ? true : null,
        dealInN: dealtIn ? true : null,
        tenpaiAtDraw: null
      })
    }
  }

  // tenpai at draw: mark last DISC per player before wall exhaustion as tenpai
  if (isDraw) {
    const lastDisc: Record<string, DecisionSnap> = {}
    for (const snap of snaps) {
      if (snap.gameId === sess.gameId && snap.action === 'DISC') {
        lastDisc[snap.player] = snap
      }
    }
    for (const s of Object.values(lastDisc)) {
      s.tenpaiAtDraw = true
    }
  }
}

// ---- aggregate metrics ----
function computeMetrics(snaps: DecisionSnapshot[]): Record<string, EvalResult> {
  const byAction: Record<string, DecisionSnapshot[]> = {}
  for (const s of snaps) {
    if (!byAction[s.action]) byAction[s.action] = []
    byAction[s.action].push(s)
  }

  const results: Record<string, EvalResult> = {}
  for (const [action, list] of Object.entries(byAction)) {
    const validWin = list.filter(s => s.winInN !== null)
    const validDeal = list.filter(s => s.dealInN !== null)
    const validTen = list.filter(s => s.tenpaiAtDraw !== null)
    results[action] = {
      action,
      sampleSize: list.length,
      winRate: validWin.length > 0 ? validWin.filter(s => s.winInN).length / validWin.length : 0,
      dealInRate: validDeal.length > 0 ? validDeal.filter(s => s.dealInN).length / validDeal.length : 0,
      tenpaiRate: validTen.length > 0 ? validTen.filter(s => s.tenpaiAtDraw).length / validTen.length : 0
    }
  }
  return results
}

main()
