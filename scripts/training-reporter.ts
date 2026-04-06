/**
 * training-reporter.ts
 * 长清阁麻将训练输出标准化模块
 *
 * 设计原则：
 * 1. 每轮独立文件 {roundNum}-{timestamp}.md
 * 2. 统一模板：JSON摘要 + 标准化Markdown
 * 3. 独立模块，可被 train-ai-ak.ts / train-baseline.ts 共用
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
  playerStats: PlayerStats[]
}

// ========== Markdown 模板 ==========

function escapeMd(s: any): string {
  if (s === null || s === undefined) return '—'
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function formatTimestamp(ts: string): string {
  // 2026-04-06T19:00:00.000Z → 2026-04-06 19:00:00
  return ts.replace('T', ' ').replace(/\.\d+Z$/, '')
}

/** 每轮训练报告 Markdown 模板 */
export function formatRoundReport(report: RoundReport): string {
  const lines: string[] = []
  const { round, timestamp, metrics, policy, playerStats, topWins, topLosses, worstLossGames } = report
  const ts = formatTimestamp(timestamp)
  const winRate = ((metrics.winGames / Math.max(1, metrics.totalGames)) * 100).toFixed(2)
  const drawRate = ((metrics.drawGames / Math.max(1, metrics.totalGames)) * 100).toFixed(2)
  const selfDrawRate = metrics.winGames > 0 ? ((metrics.selfDrawGames / metrics.winGames) * 100).toFixed(2) : '0.00'
  const bigWinRate = metrics.winGames > 0 ? ((metrics.bigWinGames / metrics.winGames) * 100).toFixed(2) : '0.00'
  const menqingRate = metrics.winGames > 0 ? ((metrics.menqingWinGames / metrics.winGames) * 100).toFixed(2) : '0.00'

  // ===== 标题块 =====
  lines.push('---')
  lines.push(`Round ${round} 训练报告`)
  lines.push(`时间: ${ts}`)
  lines.push(`局数: ${metrics.totalGames}`)
  lines.push('---')
  lines.push('')

  // ===== 1. 核心指标 =====
  lines.push('## 1. 核心指标')
  lines.push('')
  lines.push('| 指标 | 数值 |')
  lines.push('|------|------|')
  lines.push(`| 总局数 | ${metrics.totalGames} |`)
  lines.push(`| 胡牌局 | ${metrics.winGames} (${winRate}%) |`)
  lines.push(`| 流局 | ${metrics.drawGames} (${drawRate}%) |`)
  lines.push(`| 自摸率 | ${selfDrawRate}% |`)
  lines.push(`| 大牌率 | ${bigWinRate}% |`)
  lines.push(`| 门清率 | ${menqingRate}% |`)
  lines.push(`| Fitness | ${metrics.akScore.toFixed(4)} |`)
  lines.push('')

  // ===== 2. 牌型分布 =====
  lines.push('## 2. 牌型分布')
  lines.push('')
  const sortedTypes = Object.entries(metrics.handTypeDist || {})
    .sort((a, b) => b[1] - a[1])
  if (sortedTypes.length === 0) {
    lines.push('_（无胡牌局）_')
  } else {
    lines.push('| 牌型 | 局数 | 占比 |')
    lines.push('|------|------|------|')
    for (const [type, count] of sortedTypes) {
      const pct = ((count / metrics.winGames) * 100).toFixed(1)
      lines.push(`| ${type} | ${count} | ${pct}% |`)
    }
  }
  lines.push('')

  // ===== 3. 策略参数 =====
  lines.push('## 3. 策略参数')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(policy, null, 2))
  lines.push('```')
  lines.push('')

  // ===== 4. 玩家得分 =====
  lines.push('## 4. 玩家得分')
  lines.push('')
  lines.push('| 玩家 | 总分 | 胜局 |')
  lines.push('|------|------|------|')
  for (const p of playerStats) {
    lines.push(`| ${p.name} | ${p.score} | ${p.wins} |`)
  }
  lines.push('')

  // ===== 5. TOP3 最大盈利 =====
  lines.push('## 5. TOP3 最大盈利')
  lines.push('')
  if (topWins.length === 0) {
    lines.push('_（无盈利局）_')
  } else {
    for (let i = 0; i < Math.min(3, topWins.length); i++) {
      const w = topWins[i]
      lines.push(`**${i + 1}. +${w.akDelta}** (${w.winnerName} ${w.isSelfDraw ? '自摸' : '放炮'})`)
      lines.push(`- 牌型: ${w.handTypes.join(', ')} | 倍率: ×${w.multiplier}`)
      lines.push(`- 手牌: ${w.hand}`)
      lines.push(`- 门口牌: ${Array.isArray(w.melds) ? (w.melds as string[]).join('') : (w.melds || '无')}`)
      lines.push('')
    }
  }

  // ===== 6. TOP3 最大亏损 =====
  lines.push('## 6. TOP3 最大亏损')
  lines.push('')
  if (topLosses.length === 0) {
    lines.push('_（无亏损局）_')
  } else {
    for (let i = 0; i < Math.min(3, topLosses.length); i++) {
      const w = topLosses[i]
      lines.push(`**${i + 1}. ${w.akDelta}** (被 ${w.winnerName} ${w.isSelfDraw ? '自摸' : '放炮'}胡)`)
      lines.push(`- 牌型: ${w.handTypes.join(', ')} | 倍率: ×${w.multiplier}`)
      lines.push(`- 手牌: ${w.hand}`)
      lines.push(`- 门口牌: ${Array.isArray(w.melds) ? (w.melds as string[]).join('') : (w.melds || '无')}`)
      lines.push('')
    }
  }

  // ===== 7. 最大单局亏损明细 =====
  lines.push('## 7. 最大单局亏损明细')
  lines.push('')
  if (worstLossGames.length === 0) {
    lines.push('_（无数据）_')
  } else {
    for (const loss of worstLossGames.slice(0, 3)) {
      const r = loss.result
      lines.push(`**${loss.loser} 输 ${loss.score} 点** (局次${loss.gameIdx} | ×${r.gameMultiplier})`)
      // 结算明细
      if (r.settlementLog && r.settlementLog.length > 0) {
        lines.push('```')
        for (const s of r.settlementLog) {
          const multStr = s.mult ? ` [${s.amount / s.mult}×${s.mult}]` : ''
          lines.push(`[${s.reason}] ${s.from} → ${s.to}: ${s.amount}${multStr}`)
        }
        lines.push('```')
      }
      // 三口关系
      const baoRelations: string[] = []
      for (const snap of r.snapshots || []) {
        for (let ci = 0; ci < 4; ci++) {
          if (snap.meldSources?.[ci] >= 3) {
            const partner = r.snapshots?.[ci]
            if (partner) {
              const level = snap.meldSources[ci] >= 4 ? '四口' : '三口'
              baoRelations.push(`${snap.name} ↔ ${partner.name}: ${level}`)
            }
          }
        }
      }
      if (baoRelations.length > 0) {
        lines.push(`**三口关系**: ${baoRelations.join(' | ')}`)
      }
      lines.push('')
    }
  }

  // ===== 8. 胡牌明细 =====
  lines.push('## 8. 胡牌明细（全）')
  lines.push('')
  if (metrics.winGames === 0) {
    lines.push('_（无胡牌局）_')
  } else {
    lines.push('| 局次 | 玩家 | 方式 | 牌型 | 倍率 | 手牌 | 门口牌 |')
    lines.push('|------|------|------|------|------|------|------|')
    for (const w of report.topWins || []) {
      const melds = Array.isArray(w.melds) ? (w.melds as string[]).join('') : (w.melds || '无')
      lines.push(`| ${w.gameIdx} | ${w.winnerName} | ${w.isSelfDraw ? '自摸' : '放炮'} | ${w.handTypes.join(', ')} | ×${w.multiplier} | ${w.hand} | ${melds} |`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

/** 适配器：将 train-ai-ak.ts 内部 EvalResult 转换为标准化 RoundReport */
export function buildRoundReport(
  round: number,
  internalResult: {
    akScore: number; totalGames: number; winGames: number
    selfDrawGames: number; bigWinGames: number; menqingWinGames: number
    fightToLastGames: number; handTypeDist: Record<string, number>
    winningGames: WinningGameRecord[]; worstSingleLoss: any; scores: Record<string, number>
    winRates: Record<string, number>; akWins: number
  },
  policy: Record<string, number>,
  playerNames: string[]
): RoundReport {
  const topWins = (internalResult.winningGames || [])
    .filter((w: WinningGameRecord) => w.akDelta > 0)
    .sort((a: WinningGameRecord, b: WinningGameRecord) => b.akDelta - a.akDelta)
    .slice(0, 3)

  const topLosses = (internalResult.winningGames || [])
    .filter((w: WinningGameRecord) => w.akDelta < 0)
    .sort((a: WinningGameRecord, b: WinningGameRecord) => a.akDelta - b.akDelta)
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
  }
}

/** 写入每轮独立文件 */
export function writeRoundFile(
  outDir: string,
  report: RoundReport
): string {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `round-${String(report.round).padStart(3, '0')}-${ts}.md`
  const filePath = path.join(outDir, filename)
  const content = formatRoundReport(report)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filename
}

/** 生成 index.md（所有轮次索引） */
export function writeIndexFile(outDir: string, rounds: RoundReport[]): string {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const lines: string[] = []
  const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
  lines.push('# 长清阁训练报告汇总')
  lines.push('')
  lines.push(`> 生成时间: ${ts}`)
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
