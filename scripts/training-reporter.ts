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

export function prepareTrainingOutputDir(outDir: string): void {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const saveDir = path.join(outDir, 'save')
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true })

  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (entry.name === 'save') continue
    const fullPath = path.join(outDir, entry.name)
    fs.rmSync(fullPath, { recursive: true, force: true })
  }
}

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
  winnerInstances?: number
  selfDrawGames: number
  discardWinGames?: number
  bigWinGames: number
  menqingWinGames: number
  fightToLastGames: number
  akScore: number
  fitness?: number
  handTypeDist: Record<string, number>
  avgRounds?: number
  avgPot?: number
  avgWinnerPoints?: number
  highMultGameCount?: number
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
  extraMultipliers?: number
  settlementMultiplier?: number
  scoreDetails?: string[]
  winningFrom?: string
  baseFan?: number  // 真实基础番（不含任何倍数）
  winHandType?: string
  isMenQing?: boolean
  winningTile?: string  // 捉冲时对方放冲的牌
  result: any
}

export interface RoundReport {
  round: number
  timestamp: string
  scriptName?: string
  metrics: RoundMetrics
  policy: Record<string, number>
  playerStats: PlayerStats[]
  topWins: WinningGameRecord[]
  globalMaxWin?: WinningGameRecord
  worstLossGames: any[]
  multiWinDist: number[]
  allWinningGames: WinningGameRecord[]
  // 单局详细分析用：保存最重要的那局的每回合快照
  turnSnapshots?: any[]
}

export interface DetailLogOptions {
  forceSingleGame?: boolean
}

export interface EvalResult {
  totalGames: number
  winGames: number
  winnerInstances?: number
  selfDrawGames: number
  discardWinGames?: number
  bigWinGames: number
  menqingWinGames: number
  fightToLastGames: number
  akScore: number
  metricsFitness?: number
  handTypeDist?: Record<string, number>
  handTypeCounts?: Record<string, number>
  winningGames?: WinningGameRecord[]
  worstSingleLoss: any
  biggestSingleWin?: any
  scores: Record<string, number>
  winRates: Record<string, number>
  akWins: number
  playerStats?: PlayerStats[]
  multiWinDist?: number[]
  draws?: number
  avgRounds?: number
  avgPot?: number
  avgWinnerPoints?: number
  highMultGameCount?: number
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

/** 把单张牌名解析为 { suit, value, isWild } */
function parseTileName(name: string): { suit: string; value: number; isWild: boolean } {
  const isWild = name.endsWith('*')
  const tile = isWild ? name.slice(0, -1) : name
  // tile格式: "二万", "五筒", "八条", "东风", "红中", "梅花"
  const suitMap: Record<string, string> = { '万': 'wan', '筒': 'bam', '条': 'str', '风': 'wind', '字': 'drg', '花': 'flw' }
  const numMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '东': 1, '南': 2, '西': 3, '北': 4, '中': 1, '发': 2, '白': 3 }
  const suitChar = tile.slice(-1)
  const suit = suitMap[suitChar] || suitChar
  const valueStr = tile.slice(0, -1)
  const value = numMap[valueStr] || parseInt(valueStr) || 0
  return { suit, value, isWild }
}

function parseMultiplierFromScoreDetails(details: string[] | undefined, label: '骰子倍数' | '继承倍数'): number | undefined {
  if (!Array.isArray(details)) return undefined
  const pattern = new RegExp(`${label}(\\d+)`)
  for (const line of details) {
    const match = line.match(pattern)
    if (match) return Number(match[1])
  }
  return undefined
}

/**
 * 格式化一组牌（分组排序，百搭自动加*）
 * wildTile: 牌面值如 "八条"，匹配到的牌加 * 后缀
 */
function formatTiles(tileStr: string, wildTile: string): string {
  if (!tileStr) return ''
  const tiles = tileStr.split(' ').filter(t => t.length > 0)
  const w = parseTileName(wildTile)
  const wKey = w.value > 0 ? `${w.suit}-${w.value}` : ''

  const groups: Record<string, string[]> = {}
  for (const tile of tiles) {
    const { suit, value } = parseTileName(tile)
    const key = `${suit}-${value}`
    if (!groups[key]) groups[key] = []
    // 【修复】tile 可能已含 *（来自 recordTurnSnapshot），避免重复标记为 **
    groups[key].push((key === wKey) ? (tile.endsWith('*') ? tile : tile + '*') : tile)
  }
  const suitOrder = ['wan', 'bam', 'str', 'wind', 'drg', 'flw']
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [suitA, valA] = a.split('-'), [suitB, valB] = b.split('-')
    const idxA = suitOrder.indexOf(suitA), idxB = suitOrder.indexOf(suitB)
    if (idxA !== idxB) return idxA - idxB
    return parseInt(valA) - parseInt(valB)
  })
  return sortedKeys.map(key => groups[key].join('')).join(' ')
}

function formatGroupedHand(handStr: string, wildTile: string): string {
  return formatTiles(handStr, wildTile) || '(空)'
}

/** 格式化副露（碰:三万 三万 三万 → 碰:三万三万三万） */
/** 格式化副露（碰:三万 三万 三万 → 碰:三万三万三万），百搭不在副露里，不加* */
function formatExposed(melds: string[]): string {
  if (!melds || melds.length === 0) return '无'
  return melds.map(m => {
    const colonIdx = m.indexOf(':')
    if (colonIdx < 0) return m
    const type = m.slice(0, colonIdx + 1)
    const tiles = m.slice(colonIdx + 1).trim().split(' ').filter(t => t).join('')
    return type + tiles
  }).join('｜')
}

/** 格式化副露字符串 */
function formatMelds(meldStr: string | string[] | undefined): string {
  if (!meldStr) return '(无副露)'
  const melds = Array.isArray(meldStr) ? meldStr : [meldStr]
  if (melds.length === 0 || melds.every(m => !m)) return '(无副露)'
  return melds.filter(m => m).join(' ')
}

function formatTimestamp(ts: string): string {
  return ts.replace('T', ' ').replace(/\.\d+Z$/, '')
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function beijingISOString(date: Date = new Date()): string {
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 19)
}

function formatBeijingTimestamp(ts: string): string {
  return ts.replace('T', ' ').slice(0, 19)
}

function checkTarget(actual: number, target: string, lowBetter = false): string {
  const targetNum = parseFloat(target.replace(/[^.\d]/g, ''))
  if (isNaN(targetNum)) return '—'
  const ok = lowBetter ? actual < targetNum : actual >= targetNum
  return ok ? '✅' : '❌'
}

// ========== 模板（严格按 training-output-template.md） ==========

export function formatRoundReport(report: RoundReport, showDetail = true, roundLabel?: string): string {
  const lines: string[] = []
  const { round, timestamp, metrics, policy, topWins, worstLossGames, multiWinDist, allWinningGames } = report
  const ts = formatBeijingTimestamp(timestamp)
  const winRate = parseFloat((metrics.winGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const drawRate = parseFloat((metrics.drawGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const winnerInstances = metrics.winnerInstances ?? allWinningGames?.length ?? metrics.winGames
  const selfDrawRate = winnerInstances > 0 ? parseFloat((metrics.selfDrawGames / winnerInstances * 100).toFixed(1)) : 0
  const discardWinRate = winnerInstances > 0 ? parseFloat((((metrics.discardWinGames || 0) / winnerInstances) * 100).toFixed(1)) : 0
  const bigWinRate = winnerInstances > 0 ? parseFloat((metrics.bigWinGames / winnerInstances * 100).toFixed(1)) : 0
  const menqingRate = winnerInstances > 0 ? parseFloat((metrics.menqingWinGames / winnerInstances * 100).toFixed(1)) : 0
  const nonDrawGames = Math.max(0, metrics.totalGames - metrics.drawGames)
  const fightToLastRate = nonDrawGames > 0 ? parseFloat(((metrics.fightToLastGames / nonDrawGames) * 100).toFixed(1)) : 0
  const mw = multiWinDist || [0, 0, 0, 0]
  const mwTotal = mw.reduce((a: number, b: number) => a + b, 0)
  const fightToLastCount = mw[2] || 0
  const fightToLastRateFromDist = mwTotal > 0 ? parseFloat(((fightToLastCount / mwTotal) * 100).toFixed(1)) : 0

  const heading = roundLabel ?? `Round ${round}`
  lines.push(`## ${heading} (${ts})`)
  lines.push('')

  // Summary
  lines.push('### 📊 训练指标 Summary')
  lines.push('')
  lines.push('| 指标 | 值 | K哥目标 | 达标 |')
  lines.push('|------|-----|---------|------|')
  lines.push(`| Games | ${metrics.totalGames} | — | — |`)
  lines.push(`| 胡牌局 | ${metrics.winGames} (${winRate}%) | ≥90% | ${checkTarget(winRate, '90')} |`)
  lines.push(`| 流局 | ${metrics.drawGames} (${drawRate}%) | <10% | ${checkTarget(drawRate, '10', true)} |`)
  lines.push(`| 血战到最后一人 | ${fightToLastCount} (${fightToLastRateFromDist}%) | >80% | ${checkTarget(fightToLastRateFromDist, '80')} |`)
  lines.push(`| 平均回合 | ${metrics.avgRounds != null ? metrics.avgRounds.toFixed(1) : '—'} | — | — |`)
  lines.push(`| 平均总筹码 | ${metrics.avgPot != null ? metrics.avgPot.toFixed(1) : '—'} | — | — |`)
  lines.push(`| 胡牌实例 | ${winnerInstances} | — | — |`)
  lines.push(`| 自摸率(胡牌中) | ${selfDrawRate}% | 40-60% | ${checkTarget(selfDrawRate, '40')} |`)
  lines.push(`| 捉冲率(胡牌中) | ${discardWinRate}% | 40-60% | ${checkTarget(discardWinRate, '40')} |`)
  lines.push(`| 大牌率(胡牌中) | ${bigWinRate}% | 3-8% | ${checkTarget(bigWinRate, '3')} |`)
  lines.push(`| 门清胡牌率(胡牌中) | ${menqingRate}% | 7-12% | ${checkTarget(menqingRate, '7')} |`)
  lines.push(`| 高倍数局数(骰子>=2) | ${metrics.highMultGameCount ?? 0} | — | — |`)
  lines.push(`| Fitness | ${(metrics.fitness ?? metrics.akScore).toFixed(1)} | ↑ | — |`)
  lines.push('')

  // 每局获胜人数分布
  lines.push('### 👥 每局获胜人数分布')
  lines.push('')
  lines.push('| 类型 | 局数 | 占比 |')
  lines.push('|------|------|------|')
  lines.push(`| 单人胡牌 | ${mw[0]} | ${mwTotal > 0 ? ((mw[0] / mwTotal) * 100).toFixed(1) : '0.0'}% |`)
  lines.push(`| 双人胡牌 | ${mw[1]} | ${mwTotal > 0 ? ((mw[1] / mwTotal) * 100).toFixed(1) : '0.0'}% |`)
  lines.push(`| 三人胡牌 | ${mw[2]} | ${mwTotal > 0 ? ((mw[2] / mwTotal) * 100).toFixed(1) : '0.0'}% |`)
  lines.push(`| 四人胡牌 | ${mw[3]} | ${mwTotal > 0 ? ((mw[3] / mwTotal) * 100).toFixed(1) : '0.0'}% |`)
  lines.push(`| 多人胡牌率 | ${mwTotal > 0 ? (((mw[1] + mw[2] + mw[3]) / mwTotal) * 100).toFixed(1) : '0.0'}% | 目标>80% |`)
  lines.push('')

  // 胡牌牌型分布
  lines.push('### 🀄 胡牌牌型分布')
  lines.push('')
  lines.push('| 牌型 | 胡牌实例 | 占比 | K哥目标 |')
  lines.push('|------|----------|------|---------|')
  const dist = buildHandTypeDistribution(allWinningGames, metrics.handTypeDist)
  const realWinnerInstances = winnerInstances
  const TYPES: [string, string][] = [
    ['混一色', '≥40%'],
    ['碰碰胡', '>25%'],
    ['清一色', '>20%'],
    ['清碰', '~5%'],
    ['风一色', '~5%'],
    ['风碰', '~1%'],
    ['混碰', '—'],
    ['八花', '—'],
    ['四百搭', '—'],
  ]
  for (const [type, target] of TYPES) {
    const cnt = dist[type] || 0
    const pct = realWinnerInstances > 0 ? ((cnt / realWinnerInstances) * 100).toFixed(1) : '0.0'
    lines.push(`| ${type} | ${cnt} | ${pct}% | ${target} |`)
  }
  lines.push('')

    // ========== Section 5: 最大赢/输局明细（只输出AK赢分最高和输分最多各一局）==========
  const maxWin = report.globalMaxWin || null

  // 通用渲染函数
  const renderGame = (w: any, label: string) => {
    const result = w.result as any
    const settlementLog: any[] = result?.settlementLog || []
    const totalChips = settlementLog.reduce((sum: number, s: any) => sum + Math.abs(s.amount || 0), 0)
    // 全局倍数：优先用 w.multiplier（已计算好），fallback 到 gameMeta 反算
    const wonFan = w.wonFan || 0
    const gameIdx = w.gameIdx
    // 骰子/继承/流局信息：优先从 w.gameMeta（直接来自 runGame），fallback 到 result.gameMeta
    const gm = w.gameMeta || result?.gameMeta || {}
    const winnerDetail = Array.isArray(result?.winnerDetails) && result.winnerDetails.length > 0
      ? result.winnerDetails[0]
      : null
    const detailLines = (w.scoreDetails || winnerDetail?.details || []) as string[]

    const dicePoints = gm.dicePoints ? `${gm.dicePoints[0]}+${gm.dicePoints[1]}` : '?'
    const diceMult = gm.diceMultiplier
      ?? winnerDetail?.diceMultiplier
      ?? parseMultiplierFromScoreDetails(detailLines, '骰子倍数')
      ?? '?'
    const flowMult = gm.flowMultiplier ?? '?'
    const inheritMult = gm.inheritanceMultiplier
      ?? winnerDetail?.inheritMultiplier
      ?? parseMultiplierFromScoreDetails(detailLines, '继承倍数')
      ?? '?'
    const prevDraw = gm.prevRoundWasDraw ? '是' : '否'
    const prevRebel = gm.prevRoundWasRebel ? '是' : '否'

    const multiplier = w.multiplier
      || winnerDetail?.effectiveMultiplier
      || gm.globalMultiplier
      || ((diceMult !== '?' && inheritMult !== '?') ? Math.min(8, Number(diceMult) * Number(inheritMult)) : 1)
    const winnerCount = (allWinningGames || []).filter((g: any) => g.gameIdx === gameIdx).length
    lines.push(`**${label}局号: ${gameIdx}**`)
    lines.push(`**结果: ${winnerCount}人胡牌**`)
    lines.push(`**回合: ${w.roundNum || 0}**`)
    lines.push(`**总筹码: ${totalChips}**`)
    if (w.wildTile) lines.push(`**百搭: ${w.wildTile}**`)
    lines.push('')
    lines.push(`**全局倍数 = min(8, 骰子倍数 × 继承倍数)**`)
    lines.push(`- 骰子点数: ${dicePoints}`)
    lines.push(`- 骰子倍数: ×${diceMult}`)
    lines.push(`- 继承倍数: ×${inheritMult}`)
    lines.push(`- 上一局是否流局: ${prevDraw}`)
    lines.push(`- 上一局是否造反: ${prevRebel}`)
    lines.push(`- 全局倍数: ×${multiplier}`)
    lines.push('')

    // 从 turnSnapshots 重建手牌
    const gameSnaps = (report.turnSnapshots || []).filter((s: any) => s.gameIdx === gameIdx)
    const lastSnap = gameSnaps[gameSnaps.length - 1]
    const snapPlayers: Record<string, any> = {}
    if (lastSnap?.players) {
      for (const p of lastSnap.players) snapPlayers[p.name] = p
    }

    // 三口/四口关系
    const relLines: string[] = []
    for (const name of Object.keys(snapPlayers)) {
      const ms: number[] = snapPlayers[name].meldSources || []
      for (let ci = 0; ci < ms.length; ci++) {
        if (ms[ci] >= 3) {  // 【修复】单向≥3口才算三口，≥4口算四口（之前误判为>0）
          const fromName = lastSnap.players[ci]?.name || `玩家${ci}`
          const level = ms[ci] >= 4 ? '四口' : '三口'
          relLines.push(`  ${fromName} <-> ${name}: ${level} (${fromName}->${name}:${ms[ci]}, ${name}->${fromName}:?)`)
        }
      }
    }

    // 同一局所有赢家
    const sameGameWins = (allWinningGames || []).filter((t: any) => t.gameIdx === gameIdx)
      .sort((a: any, b: any) => {
        if ((a.roundNum ?? 0) !== (b.roundNum ?? 0)) return (a.roundNum ?? 0) - (b.roundNum ?? 0)
        return (a.isSelfDraw === b.isSelfDraw) ? 0 : (a.isSelfDraw ? -1 : 1)
      })
    for (const win of sameGameWins) {
      lines.push(`**玩家: ${win.winnerName}**`)
      const snapHand = snapPlayers[win.winnerName]?.hand || ''
      const handStr = (win.hand && win.hand.length > 0) ? win.hand : (snapHand || '(空)')
      const handTypesStr = win.handTypes?.length ? win.handTypes.join(', ') : '未知'
      const flowersArr: string[] = (win as any).flowers || []
      const flowersStr = flowersArr.length > 0 ? flowersArr.join(', ') : '无'
      const menqingStr = win.isMenQing ? '是' : '否'
      const displayBaseFan = win.baseFan ?? '?'
      const extraMult = (win as any).extraMultipliers ?? 1
      const settlementMult = (win as any).settlementMultiplier ?? 10
      const globalMultStr = multiplier != null ? multiplier.toString() : '?'
      const finalPoints = (win.wonFan != null ? win.wonFan : wonFan)
      const wonFanDisplay = finalPoints != null ? finalPoints.toString() : '?'
      const winningTile = (win as any).winningTile || ''
      const winningFrom = (win as any).winningFrom || ''
      const handSuffix = !win.isSelfDraw && (winningTile || winningFrom)
        ? ` (${[winningTile ? `放冲牌: ${winningTile}` : '', winningFrom ? `来源: ${winningFrom}` : ''].filter(Boolean).join('，')})`
        : ''
      const scoreDetails: string[] = (win as any).scoreDetails || []
      const noWildDetail = scoreDetails.find((detail: string) => detail.includes('无百搭'))
      lines.push(`  - 胡牌牌型: ${handTypesStr}`)
      lines.push(`  - 胡牌方式: ${win.isSelfDraw ? '自摸' : '放冲'}`)
      lines.push(`  - 总点数: ${wonFanDisplay}`)
      lines.push(`  - 公式分解: 基础番${displayBaseFan} × 结算倍数${settlementMult} × 额外倍数${extraMult} × 全局倍数${globalMultStr} = 最终点${wonFanDisplay}`)
      lines.push(`  - 手牌: ${handStr || '(空)'}${handSuffix}`)
      lines.push(`  - 门口牌: ${formatMelds((win as any).melds)}`)
      lines.push(`  - 花牌: ${flowersStr}`)
      lines.push(`  - 是否门清: ${menqingStr}`)
      lines.push(`  - 是否算无百搭: ${noWildDetail ? `是（${noWildDetail}）` : '否'}`)
      lines.push('')
    }

    lines.push('**三口/四口关系:**')
    if (relLines.length > 0) {
      for (const r of relLines) lines.push(r)
    } else {
      lines.push('  无')
    }
    lines.push('')


    if (settlementLog.length > 0) {
      const SETTLEMENT_MULT = 10  // 建房参数，结算时固定乘数
      lines.push('**支付信息（按结算先后顺序）:**')
      for (const s of settlementLog) {
        const amt = Math.abs(s.amount || 0)
        const fan = s.fan ?? '?'
        const gm = s.mult ?? multiplier ?? '?'
        const fanStr = fan !== '?' ? fan : '?'
        const gmStr = gm !== '?' ? gm : '?'
        const reason = s.reason || '结算'
        const mode = reason.includes('自摸') ? '自摸' : (reason.includes('放炮') || reason.includes('放冲') ? '捉冲' : '结算')
        lines.push(`  ${s.from} -> ${s.to}: ${amt} [${mode} / ${reason}] (${fanStr}×${SETTLEMENT_MULT}×${gmStr}=${amt})`)
      }
      lines.push('')
    }
  }

  lines.push('### 💰 最大赢局明细')
  if (maxWin) {
    lines.push('')
    renderGame(maxWin, '赢')
  } else {
    lines.push('')
    lines.push('*本轮无胡牌局，无最大赢局明细*')
  }
  // （最大输局明细已删除，K哥 2026-04-13 确认）

  return lines.join('\n')
}

function buildGameBuckets(turnSnapshots: any[]): any[][] {
  const buckets: any[][] = []
  let currentGameIdx: number | null = null
  let current: any[] = []
  for (const snap of turnSnapshots || []) {
    if (snap.drawnTile === 'NEW_GAME') {
      if (current.length > 0) buckets.push(current)
      current = []
      currentGameIdx = typeof snap.gameIdx === 'number' ? snap.gameIdx : Number(snap.discardedTile || 0)
      continue
    }
    const snapGameIdx = typeof snap.gameIdx === 'number' ? snap.gameIdx : currentGameIdx
    if (currentGameIdx !== null && snapGameIdx !== currentGameIdx) {
      if (current.length > 0) buckets.push(current)
      current = []
      currentGameIdx = snapGameIdx
    }
    current.push(snap)
  }
  if (current.length > 0) buckets.push(current)
  return buckets.filter(bucket => bucket.some(s => s.drawnTile !== 'NEW_GAME'))
}

function computeFallbackAverages(winningGames: WinningGameRecord[]): { avgRounds?: number; avgPot?: number } {
  const byGame = new Map<number, { roundNum: number; totalChips: number }>()

  for (const game of winningGames || []) {
    const gameIdx = typeof game.gameIdx === 'number' ? game.gameIdx : NaN
    if (!Number.isFinite(gameIdx) || byGame.has(gameIdx)) continue

    const settlementLog: any[] = game?.result?.settlementLog || []
    const totalChips = settlementLog.reduce((sum: number, entry: any) => sum + Math.abs(entry?.amount || 0), 0)
    byGame.set(gameIdx, {
      roundNum: typeof game.roundNum === 'number' ? game.roundNum : 0,
      totalChips
    })
  }

  if (byGame.size === 0) return {}

  const games = Array.from(byGame.values())
  return {
    avgRounds: games.reduce((sum, entry) => sum + entry.roundNum, 0) / games.length,
    avgPot: games.reduce((sum, entry) => sum + entry.totalChips, 0) / games.length
  }
}

function buildHandTypeDistribution(allWinningGames: WinningGameRecord[] | undefined, fallbackDist?: Record<string, number>): Record<string, number> {
  const dist: Record<string, number> = {}
  const seenWinnerDetails = new Set<string>()

  for (const game of allWinningGames || []) {
    const winnerDetails = Array.isArray(game?.result?.winnerDetails) ? game.result.winnerDetails : []
    if (winnerDetails.length > 0) {
      for (const detail of winnerDetails) {
        const winnerKey = `${game.gameIdx}|${detail?.name || detail?.playerName || 'unknown'}|${detail?.handType || detail?.handTypeName || 'unknown'}`
        if (seenWinnerDetails.has(winnerKey)) continue
        seenWinnerDetails.add(winnerKey)

        const handType = detail?.handType || detail?.handTypeName
        if (handType) dist[handType] = (dist[handType] || 0) + 1
      }
      continue
    }

    const types = Array.isArray(game?.handTypes) ? game.handTypes : []
    for (const type of types) {
      dist[type] = (dist[type] || 0) + 1
    }
  }

  if (Object.keys(dist).length === 0 && fallbackDist) {
    for (const [key, value] of Object.entries(fallbackDist)) {
      dist[key] = (dist[key] || 0) + (value || 0)
    }
  }

  return dist
}

function resolveNetWinAmount(game: WinningGameRecord): number {
  const settlementLog: any[] = game?.result?.settlementLog || []
  if (settlementLog.length > 0 && game?.winnerName) {
    const net = settlementLog.reduce((sum: number, entry: any) => {
      const amount = Number(entry?.amount || 0)
      if ((entry?.to || '') === game.winnerName) return sum + amount
      if ((entry?.from || '') === game.winnerName) return sum - amount
      return sum
    }, 0)
    if (net !== 0) return net
  }

  if (typeof game.akDelta === 'number' && game.akDelta !== 0) return game.akDelta
  return Number(game.wonFan || 0)
}

function formatDetailHand(hand: string = '', handCount?: number): string {
  const content = hand || '(空)'
  const count = typeof handCount === 'number' ? handCount : (hand ? hand.split(/\s+/).filter(Boolean).length : 0)
  return `${content}（${count}张）`
}

function formatDetailExposed(exposed: string[] = []): string {
  if (!exposed || exposed.length === 0) return '无'
  return exposed.join('｜')
}

function formatDetailAction(snap: any, player: any): string {
  const parts: string[] = []
  const actionType = snap.actionType || 'turn'
  if (actionType === 'flower' && snap.flowerTile && snap.flowerTile !== '-') {
    parts.push(`补花${snap.flowerTile}`)
  }
  if ((actionType === 'peng-discard' || actionType === 'chow-discard' || actionType === 'ming-gang-discard') && snap.claimTile && snap.claimTile !== '-') {
    parts.push(`吃碰${snap.claimTile}`)
  }
  if (snap.drawnTile && snap.drawnTile !== '-') {
    parts.push(`摸牌${snap.drawnTile}`)
  }
  if (snap.discardedTile && snap.discardedTile !== '-') {
    parts.push(`出牌${snap.discardedTile}`)
  }
  if (actionType === 'discard-win' && snap.winTile && snap.winTile !== '-') {
    parts.push(`（捉${snap.winTile}冲）`)
  }
  return parts.join('-') || '无动作'
}

export function formatSingleGameDetailLog(report: RoundReport, options: DetailLogOptions = {}): string {
  const lines: string[] = []
  const gameBuckets = buildGameBuckets(report.turnSnapshots || [])
  if (gameBuckets.length === 0) return '(无明细日志)'
  const targetGame = gameBuckets[0].filter((snap: any) => !(snap.drawnTile === '-' && snap.discardedTile === '-' && (snap.actionType === 'turn' || !snap.actionType)))
  lines.push('# 第1局完整明细')
  lines.push('')
  for (const snap of targetGame) {
    if (snap.drawnTile === 'NEW_GAME') continue
    const wallBefore = typeof snap.wallBefore === 'number' ? snap.wallBefore : (snap.wallIdx || 0)
    const wallRemaining = Math.max(0, 144 - wallBefore)
    const currentPlayer = snap.players?.[snap.currentPlayer]
    const currentName = currentPlayer?.name
    for (const player of snap.players || []) {
      if (player.name !== currentName) continue
      const action = formatDetailAction(snap, player)
      lines.push(`[牌墙${wallRemaining}] ${player.name}｜${action}｜手牌:${formatDetailHand(player.hand, player.handCount)}｜门口牌:${formatDetailExposed(player.exposed)}`)
    }
  }
  return lines.join('\n')
}

// ========== 构建 RoundReport ==========

export function buildRoundReport(
  round: number,
  internalResult: any,
  policy: Record<string, number>,
  playerNames: string[],
  scriptName?: string
): RoundReport {
  const winningGames = (internalResult.winningGames || []).sort((a: any, b: any) => a.gameIdx - b.gameIdx)
  const fallbackAverages = computeFallbackAverages(winningGames)
  // topWins: AK's biggest wins (用于每轮展示)
  const topWins = winningGames
    .slice()
    .sort((a: any, b: any) => {
      if ((a.gameIdx ?? 0) !== (b.gameIdx ?? 0)) return (a.gameIdx ?? 0) - (b.gameIdx ?? 0)
      if ((a.roundNum ?? 0) !== (b.roundNum ?? 0)) return (a.roundNum ?? 0) - (b.roundNum ?? 0)
      return (a.isSelfDraw === b.isSelfDraw) ? 0 : (a.isSelfDraw ? -1 : 1)
    })
  // globalMaxWin: 全局最大赢局（跨所有玩家，单局净赢分最高的那一局）
  const sortedByScore = [...winningGames].sort((a: any, b: any) => {
    const scoreA = resolveNetWinAmount(a)
    const scoreB = resolveNetWinAmount(b)
    return scoreB - scoreA
  })
  const globalMaxWin = sortedByScore.length > 0 ? sortedByScore[0] : null

  const playerStats: PlayerStats[] = playerNames.map(name => ({
    name,
    score: internalResult.scores?.[name] ?? 0,
    wins: internalResult.winRates?.[name] && internalResult.totalGames ? Math.round(internalResult.winRates[name] * internalResult.totalGames) : 0,
    deltas: [],
  }))

  const handTypeDist = internalResult.handTypeDist || internalResult.handTypeCounts || {}
  const drawGames = typeof internalResult.draws === 'number'
    ? internalResult.draws
    : Math.max(0, (internalResult.totalGames || 0) - (internalResult.winGames || 0))

  return {
    round,
    timestamp: beijingISOString(),
    scriptName,
    metrics: {
      totalGames: internalResult.totalGames || 0,
      winGames: internalResult.winGames || 0,
      drawGames,
      selfDrawGames: internalResult.selfDrawGames || 0,
      discardWinGames: internalResult.discardWinGames || 0,
      bigWinGames: internalResult.bigWinGames || 0,
      menqingWinGames: internalResult.menqingWinGames || 0,
      fightToLastGames: internalResult.fightToLastGames || 0,
      akScore: internalResult.akScore || 0,
      fitness: internalResult.metricsFitness,
      handTypeDist,
      winnerInstances: internalResult.winnerInstances || winningGames.length,
      avgRounds: internalResult.avgRounds ?? fallbackAverages.avgRounds,
      avgPot: internalResult.avgPot ?? fallbackAverages.avgPot,
      avgWinnerPoints: internalResult.avgWinnerPoints,
      highMultGameCount: internalResult.highMultGameCount,
    },
    policy,
    playerStats,
    topWins,
    globalMaxWin: globalMaxWin || undefined,
    worstLossGames: internalResult.worstSingleLoss ? [internalResult.worstSingleLoss] : [],
    multiWinDist: internalResult.multiWinDist || [0, 0, 0, 0],
    allWinningGames: winningGames,
    turnSnapshots: internalResult.turnSnapshots || [],
  }
}

// ========== 写入文件 ==========

export function writeRoundFile(outDir: string, report: RoundReport, showDetail = true): string {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19)
  const filename = `round-${String(report.round).padStart(3, '0')}-${ts}.md`
  const filePath = path.join(outDir, filename)
  const content = formatRoundReport(report, false)
  fs.writeFileSync(filePath, content, 'utf-8')

  if (showDetail && report.turnSnapshots && report.turnSnapshots.length > 0) {
    const detailFilename = `detail-round-${String(report.round).padStart(3, '0')}-${ts}.md`
    const detailPath = path.join(outDir, detailFilename)
    const detailGameIdx = (report.turnSnapshots || []).find((snap: any) => typeof snap.gameIdx === 'number')?.gameIdx
    let detailContent = formatSingleGameDetailLog(report, { forceSingleGame: true })
    if (detailGameIdx != null) {
      detailContent = detailContent.replace(/^# .+$/m, `# 第${detailGameIdx}局完整明细`)
    }
    fs.writeFileSync(detailPath, detailContent, 'utf-8')
  }

  return filename
}

export function writeIndexFile(outDir: string, rounds: RoundReport[]): string {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const lines: string[] = []
  lines.push('# 长清阁训练报告汇总')
  lines.push(`> 生成时间: ${formatBeijingTimestamp(beijingISOString())}`)
  lines.push('')
  lines.push('| Round | 时间 | 总局数 | 胡牌率 | Fitness |')
  lines.push('|-------|------|--------|--------|---------|')
  for (const r of rounds) {
    const winRate = ((r.metrics.winGames / Math.max(1, r.metrics.totalGames)) * 100).toFixed(1)
    const t = formatBeijingTimestamp(r.timestamp)
    lines.push(`| Round ${r.round} | ${t} | ${r.metrics.totalGames} | ${winRate}% | ${(r.metrics.fitness ?? r.metrics.akScore).toFixed(4)} |`)
  }
  lines.push('')
  const indexPath = path.join(outDir, 'index.md')
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8')
  return indexPath
}
