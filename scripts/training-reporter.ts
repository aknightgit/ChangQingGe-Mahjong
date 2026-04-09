/**
 * training-reporter.ts
 * 长清阁麻将训练输出标准化模块（严格按 training-output-template.md 模板）
 *
 * 模板规范：
 * - 每轮独立文件 round-XXX-{timestamp}.md
 * - 统一模板：训练指标 Summary + 胡牌牌型分布 + 策略参数 + 最大赢输局明细
 */
import * as fs from 'fs'
import * as path from 'path'

export interface PlayerStats {
  name: string
  score: number
  wins: number
  deltas: number[]
}

export interface RoundMetrics {
  totalGames: number
  winGames: number
  drawGames: number
  selfDrawGames: number
  bigWinGames: number
  menqingWinGames: number
  fightToLastGames: number
  akScore: number
  handTypeDist: Record<string, number>
}

export interface WinningGameRecord {
  gameIdx: number
  winnerName: string
  isSelfDraw: boolean
  akDelta: number
  handTypes: string[]
  hand: string
  melds: string | string[]
  multiplier: number
  roundNum: number
  wonFan?: number
  winHandType?: string
  result: any
}

export interface RoundReport {
  round: number
  timestamp: string
  metrics: RoundMetrics
  policy: Record<string, number>
  playerStats: PlayerStats[]
  topWins: WinningGameRecord[]
  topLosses: WinningGameRecord[]
  worstLossGames: any[]
  multiWinDist: number[]
  allWinningGames: WinningGameRecord[]
  // 单局详细分析用：保存最重要的那局的每回合快照
  turnSnapshots?: any[]
}

export interface EvalResult {
  totalGames: number
  winGames: number
  selfDrawGames: number
  bigWinGames: number
  menqingWinGames: number
  fightToLastGames: number
  akScore: number
  handTypeDist: Record<string, number>
  winningGames: WinningGameRecord[]
  worstSingleLoss: any
  scores: Record<string, number>
  winRates: Record<string, number>
  akWins: number
  playerStats: PlayerStats[]
  multiWinDist: number[]
}

// ========== 工具函数 ==========

const SUIT_CN: Record<string, string> = {
  WAN: '万', BAM: '筒', STR: '条', WIND: '风', DRAGON: '字',
  FLOWER: '花', SEASON: '季', DOT: '点'
}
const NUM_CN: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' }
const WIND_CN: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' }
const DRAGON_CN: Record<number, string> = { 1: '中', 2: '发', 3: '白' }
const FLOWER_CN: Record<number, string> = { 1: '梅', 2: '兰', 3: '竹', 4: '菊', 5: '春', 6: '夏', 7: '秋', 8: '冬' }

function wildTileToName(wildTile: string): string {
  // wildTile format: "wan-9" or "bamboo-1" or "dot-5" etc.
  if (!wildTile || wildTile === 'unknown') return '无百搭'
  const [suitPart, valPart] = wildTile.split('-')
  const value = parseInt(valPart)
  if (isNaN(value)) return wildTile
  const suitMap: Record<string, string> = { wan: '万', bamboo: '筒', dot: '筒', wind: '风', dragon: '字' }
  const numPart = NUM_CN[value] || value
  return `${numPart}${suitMap[suitPart] || suitPart}`
}

function formatTimestamp(ts: string): string {
  return ts.replace('T', ' ').replace(/\.\d+Z$/, '')
}

function checkTarget(actual: number, target: string, lowBetter = false): string {
  const targetNum = parseFloat(target.replace(/[^.\d]/g, ''))
  if (isNaN(targetNum)) return '—'
  const ok = lowBetter ? actual < targetNum : actual >= targetNum
  return ok ? '✅' : '❌'
}

// ========== 模板（严格按 training-output-template.md） ==========

export function formatRoundReport(report: RoundReport): string {
  const lines: string[] = []
  const { round, timestamp, metrics, policy, playerStats, topWins, topLosses, worstLossGames, multiWinDist, allWinningGames } = report
  const ts = formatTimestamp(timestamp)
  const winRate = parseFloat((metrics.winGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const drawRate = parseFloat((metrics.drawGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const selfDrawRate = metrics.winGames > 0 ? parseFloat((metrics.selfDrawGames / metrics.winGames * 100).toFixed(1)) : 0
  const bigWinRate = metrics.winGames > 0 ? parseFloat((metrics.bigWinGames / metrics.winGames * 100).toFixed(1)) : 0
  const menqingRate = metrics.winGames > 0 ? parseFloat((metrics.menqingWinGames / metrics.winGames * 100).toFixed(1)) : 0

  // ===== 标题块 =====
  lines.push('---')
  lines.push(`创建时间: ${timestamp}`)
  lines.push(`训练脚本: train-ai-ak.ts`)
  lines.push(`Config: 1 rounds × ${metrics.totalGames} games = ${metrics.totalGames} total`)
  lines.push('---')
  lines.push('')

  // ===== Section: Round X 训练报告 =====
  lines.push(`## Round ${round} (${ts})`)
  lines.push('')

  // ===== 训练指标 Summary（带K哥目标） =====
  const fightToLastRate = metrics.winGames > 0 ? parseFloat(((metrics.fightToLastGames / metrics.winGames) * 100).toFixed(1)) : 0
  lines.push('### 📊 训练指标 Summary')
  lines.push('')
  lines.push('| 指标 | 值 | K哥目标 | 达标 |')
  lines.push('|------|-----|---------|------|')
  lines.push(`| 胡牌率 | ${winRate}% | ≥90% | ${checkTarget(winRate, '90')} |`)
  lines.push(`| 流局率 | ${drawRate}% | <10% | ${checkTarget(drawRate, '10', true)} |`)
  lines.push(`| 自摸率 | ${selfDrawRate}% | 40-60% | ${checkTarget(selfDrawRate, '40')} |`)
  lines.push(`| 捉冲率 | — | 40-60% | — |`)
  lines.push(`| 血战率 | ${fightToLastRate}% | >80% | ${checkTarget(fightToLastRate, '80')} |`)
  lines.push(`| 大牌率 | ${bigWinRate}% | 3-8% | ${checkTarget(bigWinRate, '3')} |`)
  lines.push(`| 门清率 | ${menqingRate}% | 7-12% | ${checkTarget(menqingRate, '7')} |`)
  lines.push(`| Fitness | ${metrics.akScore.toFixed(1)} | ↑ | — |`)
  lines.push('')
  // 每局获胜人数分布
  const mw = multiWinDist || [0, 0, 0, 0]
  const mwTotal = mw.reduce((a: number, b: number) => a + b, 0)
  lines.push('**每局获胜人数分布**（本轮所有胡牌局）')
  lines.push(`- 单人胡牌: ${mw[0]}局 | 双人胡牌: ${mw[1]}局 | 三人胡牌: ${mw[2]}局 | 四人胡牌: ${mw[3]}局`)
  lines.push(`- 多人胡牌率: ${mwTotal > 0 ? ((mw[1] + mw[2] + mw[3]) / mwTotal * 100).toFixed(1) : 0}%（目标>80%时血战才有意义）`)
  lines.push('')

  // ===== 胡牌牌型分布（固定9种） =====
  lines.push('### 🀄 胡牌牌型分布')
  lines.push('')
  lines.push('| 牌型 | 局数 | 占比 | K哥目标 |')
  lines.push('|------|------|------|---------|')
  const dist = metrics.handTypeDist || {}
  const totalWins = metrics.winGames
  const TYPES = [
    ['混一色', '≥40%'],
    ['碰碰胡', '>25%'],
    ['清一色', '>20%'],
    ['清碰', '~5%'],
    ['风一色', '~5%'],
    ['风碰', '~1%'],
    ['混碰', '—'],
    ['八花', '—'],
    ['四百搭', '—'],
  ] as [string, string][]
  for (const [type, target] of TYPES) {
    const cnt = dist[type] ?? 0
    const pct = totalWins > 0 ? ((cnt / totalWins) * 100).toFixed(1) : '0.0'
    lines.push(`| ${type} | ${cnt} | ${pct}% | ${target} |`)
  }
  lines.push('')

  // ===== 训练明细 =====
  lines.push('### 训练明细')
  lines.push('')
  lines.push(`- Games: ${metrics.totalGames}`)
  lines.push(`- 胡牌局: ${metrics.winGames} (${winRate}%)`)
  lines.push(`- 流局: ${metrics.drawGames} (${drawRate}%)`)
  lines.push(`- 血战到最后一人: ${metrics.fightToLastGames} (${fightToLastRate}%)`)
  lines.push(`- 平均回合: —`)
  lines.push(`- 平均总筹码: —`)
  lines.push(`- 自摸率(胡牌中): ${selfDrawRate}%`)
  lines.push(`- 大牌率(胡牌中): ${bigWinRate}%`)
  lines.push(`- 门清胡牌率(胡牌中): ${menqingRate}%`)
  lines.push(`- Fitness: ${metrics.akScore.toFixed(4)}`)
  lines.push('')

  // ===== 所有胡牌局明细（所有玩家） =====
  if (allWinningGames && allWinningGames.length > 0) {
    lines.push('### 所有胡牌局明细（所有玩家）')
    lines.push('')
    let lastGameIdx = -1
    for (const w of allWinningGames) {
      const r = w.result || {}
      if (w.gameIdx !== lastGameIdx) {
        lines.push(`**局次${w.gameIdx}**（${w.isSelfDraw ? '自摸' : '放冲'} · ×${w.multiplier || '?'}）`)
        lastGameIdx = w.gameIdx
      }
      lines.push(`  - ${w.winnerName}: ${w.handTypes.join(', ') || '普通'} · ${w.hand} · ${w.melds?.join('; ') || '(无副露)'} ${w.wonFan ? `→ ${w.wonFan}点` : ''}`)
    }
    lines.push('')
  }

  // ===== 本轮最佳策略参数 =====
  lines.push('### 本轮最佳策略参数')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(policy, null, 2))
  lines.push('```')
  lines.push('')

  // ===== 最大输赢局明细 =====
  lines.push('### 最大输赢局明细（本轮）')
  lines.push('')

  // 最大赢局
  lines.push('#### 最大赢局')
  if (topWins.length === 0) {
    lines.push('- 无盈利局')
  } else {
    const w = topWins[0]
    const r = w.result || {}
    const winnerSnap = r.snapshots?.[r.winner]
    const loserSnap = r.snapshots?.find((p: any) => p.name !== w.winnerName)
    lines.push(`- 最大赢利: ${w.winnerName} +${w.akDelta} 点（绝对值 ${Math.abs(w.akDelta)}）`)
    lines.push(`- 局号: ${w.gameIdx}`)
    lines.push(`- 回合: ${w.roundNum || '—'}`)
    lines.push(`- 总筹码: ${Math.abs(w.akDelta)}`)
    lines.push(`- 百搭: ${wildTileToName(winnerSnap?.wildTile || '')}（${winnerSnap?.wildCount ?? 0}张）`)
    lines.push(`- 回合/全局倍数信息:`)
    lines.push(`  - 骰子点数: —`)
    lines.push(`  - 骰子倍数: ×${r.multiplier || '—'}`)
    lines.push(`  - 全局倍数: ×${r.multiplier || '—'}`)
    lines.push('')
    lines.push('**胡牌玩家明细：**')
    if (winnerSnap) {
      lines.push(`  - 玩家: ${winnerSnap.name}`)
      lines.push(`    - 胡牌方式: ${w.isSelfDraw ? '自摸' : '放冲'}`)
      lines.push(`    - 牌型/基础番/最终点: ${w.handTypes.join(', ') || '—'} / ${w.wonFan ? Math.round(w.wonFan / 10) : '—'} / ${w.wonFan ?? '—'}`)
      lines.push(`    - 手牌牌面: ${winnerSnap.hand || '—'}`)
      lines.push(`    - 门口牌（吃/碰/杠）: ${winnerSnap.melds?.join(' ; ') || '(无)'}`)
      lines.push(`    - 花牌: ${winnerSnap.flowers?.join(' ') || '(无)'}`)
    }
    // 三口/四口关系
    const baoRelations: string[] = []
    if (r.snapshots) {
      for (let si = 0; si < r.snapshots.length; si++) {
        const snap = r.snapshots[si]
        for (let ci = 0; ci < 4; ci++) {
          const cnt = snap.meldSources?.[ci]
          if (cnt >= 3) {
            const partner = r.snapshots[ci]
            if (partner) {
              const level = cnt >= 4 ? '四口' : '三口'
              baoRelations.push(`  - ${snap.name} <-> ${partner.name}: ${level} (A->B:${cnt}, B->A:${partner.meldSources?.[si] || 0})`)
            }
          }
        }
      }
    }
    if (baoRelations.length > 0) {
      lines.push('**三口/四口关系：**')
      lines.push(...baoRelations)
    }
    // 结算逐笔
    if (r.settlementLog?.length > 0) {
      lines.push('**结算逐笔明细：**')
      for (const s of r.settlementLog) {
        // amount = basePoints * SETTLEMENT_MULT(=10) * gameMultiplier
        const basePoints = s.mult ? Math.round(s.amount / s.mult / 10) : s.amount
        const mult = s.mult || 1
        const multStr = ` (${basePoints}×10×${mult})`
        lines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
      }
    }
  }
  lines.push('')

  // 最大输局
  lines.push('#### 最大输局')
  if (topLosses.length === 0) {
    lines.push('- 无亏损局')
  } else {
    const w = topLosses[0]
    const r = w.result || {}
    const winnerSnap = r.snapshots?.[r.winner]
    lines.push(`- 最大亏损: ${w.winnerName} -${Math.abs(w.akDelta)} 点（绝对值 ${Math.abs(w.akDelta)}）`)
    lines.push(`- 局号: ${w.gameIdx}`)
    lines.push(`- 回合: ${w.roundNum || '—'}`)
    lines.push(`- 总筹码: ${Math.abs(w.akDelta)}`)
    lines.push(`- 百搭: ${wildTileToName(winnerSnap?.wildTile || '')}（${winnerSnap?.wildCount ?? 0}张）`)
    lines.push(`- 回合/全局倍数: ×${r.multiplier || '—'} / ×${r.multiplier || '—'}`)
    lines.push('')
    lines.push('**胡牌玩家明细：**')
    if (winnerSnap) {
      lines.push(`  - 玩家: ${winnerSnap.name}`)
      lines.push(`    - 胡牌方式: ${w.isSelfDraw ? '自摸' : '放冲'}`)
      lines.push(`    - 牌型/基础番/最终点: ${w.handTypes.join(', ') || '—'} / ${w.wonFan ? Math.round(w.wonFan / 10) : '—'} / ${w.wonFan ?? '—'}`)
      lines.push(`    - 手牌牌面: ${winnerSnap.hand || '—'}`)
      lines.push(`    - 门口牌（吃/碰/杠）: ${winnerSnap.melds?.join(' ; ') || '(无)'}`)
      lines.push(`    - 花牌: ${winnerSnap.flowers?.join(' ') || '(无)'}`)
    }
    if (r.settlementLog?.length > 0) {
      lines.push('**结算逐笔明细：**')
      for (const s of r.settlementLog) {
        // amount = basePoints * SETTLEMENT_MULT(=10) * gameMultiplier
        const basePoints = s.mult ? Math.round(s.amount / s.mult / 10) : s.amount
        const mult = s.mult || 1
        const multStr = ` (${basePoints}×10×${mult})`
        lines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
      }
    }
  }
  lines.push('')
  lines.push(`- 高倍数局数(骰子>=2): —`)
  lines.push('')

  // ===== 每回合详细快照（单局测试时有效） =====
  if (report.turnSnapshots && report.turnSnapshots.length > 0) {
    lines.push('### 🔍 每回合详细快照')
    lines.push('')
    const playerNames = report.playerStats?.map(p => p.name) || ['P0', 'P1', 'P2', 'P3']
    for (const snap of report.turnSnapshots) {
      const currName = playerNames[snap.currentPlayer] || `P${snap.currentPlayer}`
      lines.push(`**回合 ${snap.turn}** \`${currName}\``)
      lines.push('')
      lines.push(`| 项目 | 信息 |`)
      lines.push(`|------|------|`)
      lines.push(`| 摸牌 | ${snap.drawnTile} |`)
      lines.push(`| 出牌 | ${snap.discardedTile} |`)
      lines.push(`| 最近出牌 | ${snap.lastDiscard} (by P${snap.lastDiscardBy ?? '?'}) |`)
      lines.push(`| 百搭 | ${snap.wildTile} |`)
      lines.push(`| 局倍数 | ×${snap.gameMultiplier} |`)
      lines.push('')
      lines.push('| 玩家 | 手牌 | 副露 | 牌数 |')
      lines.push('|------|------|------|------|')
      for (const p of (snap.players || [])) {
        const handShort = p.hand.length > 20 ? p.hand.slice(0, 20) + '...' : p.hand
        const exposedStr = p.exposed?.join(' | ') || '无'
        lines.push(`| ${p.name} | ${handShort} | ${exposedStr} | ${p.handCount} |`)
      }
      lines.push('')
    }
  }

  lines.push('---')

  return lines.join('\n')
}

// ========== 构建 RoundReport ==========

export function buildRoundReport(
  round: number,
  internalResult: any,
  policy: Record<string, number>,
  playerNames: string[]
): RoundReport {
  const topWins = (internalResult.winningGames || [])
    .filter((w: any) => w.akDelta > 0)
    .sort((a: any, b: any) => b.akDelta - a.akDelta)
    .slice(0, 3)

  const topLosses = (internalResult.winningGames || [])
    .filter((w: any) => w.akDelta < 0)
    .sort((a: any, b: any) => a.akDelta - b.akDelta)
    .slice(0, 3)

  const playerStats: PlayerStats[] = playerNames.map(name => ({
    name,
    score: internalResult.scores?.[name] ?? 0,
    wins: 0,
    deltas: [],
  }))

  return {
    round,
    timestamp: new Date().toISOString(),
    metrics: {
      totalGames: internalResult.totalGames,
      winGames: internalResult.winGames,
      drawGames: internalResult.totalGames - internalResult.winGames,
      selfDrawGames: internalResult.selfDrawGames,
      bigWinGames: internalResult.bigWinGames,
      menqingWinGames: internalResult.menqingWinGames,
      fightToLastGames: internalResult.fightToLastGames,
      akScore: internalResult.akScore,
      handTypeDist: internalResult.handTypeDist || {},
    },
    policy,
    playerStats,
    topWins,
    topLosses,
    worstLossGames: internalResult.worstSingleLoss ? [internalResult.worstSingleLoss] : [],
    multiWinDist: internalResult.multiWinDist || [0, 0, 0, 0],
    allWinningGames: (internalResult.winningGames || []).sort((a: any, b: any) => a.gameIdx - b.gameIdx),
    turnSnapshots: internalResult.turnSnapshots || [],
  }
}

// ========== 写入文件 ==========

export function writeRoundFile(outDir: string, report: RoundReport): string {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `round-${String(report.round).padStart(3, '0')}-${ts}.md`
  const filePath = path.join(outDir, filename)
  fs.writeFileSync(filePath, formatRoundReport(report), 'utf-8')
  return filename
}

export function writeIndexFile(outDir: string, rounds: RoundReport[]): string {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const lines: string[] = []
  lines.push('# 长清阁训练报告汇总')
  lines.push(`> 生成时间: ${new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')}`)
  lines.push('')
  lines.push('| Round | 时间 | 总局数 | 胡牌率 | Fitness |')
  lines.push('|-------|------|--------|--------|---------|')
  for (const r of rounds) {
    const winRate = ((r.metrics.winGames / Math.max(1, r.metrics.totalGames)) * 100).toFixed(1)
    const t = r.timestamp.replace('T', ' ').replace(/\.\d+Z$/, '').slice(0, 19)
    lines.push(`| Round ${r.round} | ${t} | ${r.metrics.totalGames} | ${winRate}% | ${r.metrics.akScore.toFixed(4)} |`)
  }
  lines.push('')
  const indexPath = path.join(outDir, 'index.md')
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
  return indexPath
}
