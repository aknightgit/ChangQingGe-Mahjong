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

function checkTarget(actual: number, target: string, lowBetter = false): string {
  const targetNum = parseFloat(target.replace(/[^.\d]/g, ''))
  if (isNaN(targetNum)) return '—'
  const ok = lowBetter ? actual < targetNum : actual >= targetNum
  return ok ? '✅' : '❌'
}

// ========== 模板（严格按 training-output-template.md） ==========

export function formatRoundReport(report: RoundReport, showDetail = true, roundLabel?: string): string {
  const lines: string[] = []
  const { round, timestamp, metrics, policy, topWins, topLosses, multiWinDist, allWinningGames } = report
  const ts = formatTimestamp(timestamp)
  const winRate = parseFloat((metrics.winGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const drawRate = parseFloat((metrics.drawGames / Math.max(1, metrics.totalGames) * 100).toFixed(1))
  const winnerInstances = metrics.winnerInstances ?? allWinningGames?.length ?? metrics.winGames
  const selfDrawRate = winnerInstances > 0 ? parseFloat((metrics.selfDrawGames / winnerInstances * 100).toFixed(1)) : 0
  const discardWinRate = winnerInstances > 0 ? parseFloat((((metrics.discardWinGames || 0) / winnerInstances) * 100).toFixed(1)) : 0
  const bigWinRate = winnerInstances > 0 ? parseFloat((metrics.bigWinGames / winnerInstances * 100).toFixed(1)) : 0
  const menqingRate = winnerInstances > 0 ? parseFloat((metrics.menqingWinGames / winnerInstances * 100).toFixed(1)) : 0
  const nonDrawGames = Math.max(0, metrics.totalGames - metrics.drawGames)
  const fightToLastRate = nonDrawGames > 0 ? parseFloat(((metrics.fightToLastGames / nonDrawGames) * 100).toFixed(1)) : 0

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
  lines.push(`| 血战到最后一人 | ${metrics.fightToLastGames} (${fightToLastRate}%) | >80% | ${checkTarget(fightToLastRate, '80')} |`)
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
  const mw = multiWinDist || [0, 0, 0, 0]
  const mwTotal = mw.reduce((a: number, b: number) => a + b, 0)
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
  lines.push('| 牌型 | 局数 | 占比 | K哥目标 |')
  lines.push('|------|------|------|---------|')
  const dist: Record<string, number> = {}
  // 计算按 gameIdx 去重后的真实胡牌局数（多人胡同一局只算1局）
  const winningGameIndices = new Set<number>()
  if (allWinningGames && allWinningGames.length > 0) {
    for (const w of allWinningGames) {
      winningGameIndices.add(w.gameIdx)
      const types = w.handTypes && w.handTypes.length > 0 ? w.handTypes : []
      for (const t of types) dist[t] = (dist[t] || 0) + 1
    }
  } else if (metrics.handTypeDist) {
    for (const [k, v] of Object.entries(metrics.handTypeDist)) dist[k] = (dist[k] || 0) + (v || 0)
  }
  // winnerInstances = 真实胡牌局数（按gameIdx去重）
  const realWinnerInstances = winningGameIndices.size
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
    const multiplier = w.multiplier || 1
    const wonFan = w.wonFan || 0
    const gameIdx = w.gameIdx
    const meta = result?.gameMeta || {}

    const dicePoints = meta.dicePoints ? `${meta.dicePoints[0]}+${meta.dicePoints[1]}` : '?'
    const diceMult = meta.diceMultiplier ?? '?'
    const flowMult = meta.flowMultiplier ?? '?'
    const inheritMult = meta.inheritanceMultiplier ?? '?'
    const prevDraw = meta.prevRoundWasDraw ? '是' : '否'
    const prevRebel = meta.prevRoundWasRebel ? '是' : '否'

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
        if (ms[ci] > 0) {
          const fromName = lastSnap.players[ci]?.name || `玩家${ci}`
          const level = ms[ci] >= 4 ? '四口' : '三口'
          relLines.push(`  ${fromName} <-> ${name}: ${level} (${fromName}->${name}:${ms[ci]}, ${name}->${fromName}:?)`)
        }
      }
    }

    // 同一局所有赢家
    const sameGameWins = topWins.filter((t: any) => t.gameIdx === gameIdx)
    for (const win of sameGameWins) {
      const snapHand = snapPlayers[win.winnerName]?.hand || ''
      let handStr = (win.hand && win.hand.length > 0) ? win.hand : (snapHand || '—')
      // 捉冲时：显示对方放冲的那张牌
      if (!win.isSelfDraw) {
        const snapDiscard = (win as any).winningTile || ''  // 捉冲时对方放冲的牌（直接从WinnerInfo获取）
        if (snapDiscard && !handStr.includes(snapDiscard)) handStr += ' + ' + snapDiscard + '（捉冲）'
      }
      const meldsStr = Array.isArray(win.melds) ? win.melds.join(' / ') : (win.melds || '无')
      const handTypesStr = win.handTypes?.join(', ') || '—'
      const flowersArr: string[] = (win as any).flowers || []
      const flowersStr = flowersArr.length > 0 ? flowersArr.join(', ') : '无'
      const menqingStr = win.isMenQing ? '是' : '否'
      const displayBaseFan = win.baseFan ?? (wonFan > 0 && multiplier > 0 ? Math.round(wonFan / multiplier) : '?')
      lines.push(`  - 牌型/基础番/最终点: ${handTypesStr} / ${displayBaseFan} / ${wonFan || '?'}`)
      lines.push(`  - 手牌牌面: ${handStr}`)
      lines.push(`  - 门口牌(吃/碰/杠): ${meldsStr !== '无' ? meldsStr : '无'}`)
      lines.push(`  - 花牌: ${flowersStr}`)
      lines.push(`  - 是否门清: ${menqingStr}`)
      lines.push(`  - 是否算无百搭: *（待追踪）*`)
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
      lines.push('**结算逐笔明细:**')
      for (const s of settlementLog) {
        const amt = Math.abs(s.amount || 0)
        const fan = s.fan ?? '?'
        const basePoints = (fan !== '?' && fan > 0) ? Math.round(amt / fan) : '?'
        lines.push(`  [${s.reason || '结算'}] ${s.from} -> ${s.to}: ${amt} (${fan}×${basePoints}=${amt})`)
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

  // 每圈详细快照（仅 round 文件需要；主文件 showDetail=false 时不输出）
  if (showDetail && report.turnSnapshots && report.turnSnapshots.length > 0) {
    lines.push('### 🔍 每圈明细（血战到底）')
    lines.push('')
    const snaps = report.turnSnapshots
    let circleCount = 0
    let prevExposed: string[] = []
    let circleStart = 0
    let lastFlushedCircleStart = -1
    // 追踪当前圈每人是否已摸打
    const drawnThisCircle: Record<string, {drawn: string, discarded: string}> = {}

    for (let i = 0; i < snaps.length; i++) {
      const snap = snaps[i]
      const players = snap.players || []

      // 跳过 NEW_GAME sentinel（没有玩家数据）
      if (snap.drawnTile === 'NEW_GAME') {
        prevExposed = []
        circleStart = i
        circleCount = 0
        lastFlushedCircleStart = -1
        continue
      }

      const currExposed = players.map((p: any) => (p.exposed || []).join('|'))
      const circleStartIsSentinel = snaps[circleStart]?.drawnTile === 'NEW_GAME'
      const hadMeld = !circleStartIsSentinel && prevExposed.length > 0 &&
        currExposed.some((ex: string, idx: number) => ex !== prevExposed[idx])
      const backToStart = i > 0 && snap.currentPlayer === snaps[circleStart].currentPlayer && snap.turn > 0

      // 新圈开始：打印上一圈结果（如有）
      if ((i === 0 || hadMeld || backToStart) && i > 0) {
        circleCount++
        // 打印上一圈所有人摸打（合并到同行）
        for (const pp of snaps[circleStart].players) {
          const d = drawnThisCircle[pp.name] || { drawn: '-', discarded: '-' }
          const drawStr = d.drawn !== '-' ? `｜摸${d.drawn}` : ''
          const discardStr = d.discarded !== '-' ? `｜ → 打${d.discarded}` : ''
          lines.push(`  - ${pp.name}：${formatGroupedHand(pp.hand, snap.wildTile)}｜副露:${formatExposed(pp.exposed)}｜${pp.handCount}张${drawStr}${discardStr}`)
        }
        lines.push('')
        circleStart = i
        lastFlushedCircleStart = circleStart
        // 重置
        for (const pp of players) drawnThisCircle[pp.name] = { drawn: '-', discarded: '-' }
      }

      // 初始化当前圈（第一张快照）
      if (i === 0 || (i > 0 && (hadMeld || backToStart))) {
        lines.push(`**【第${circleCount + 1}圈】百搭${snap.wildTile}｜×${snap.gameMultiplier}**`)
      }

      // 记录当前人摸打
      const currP = players[snap.currentPlayer]
      if (currP) {
        drawnThisCircle[currP.name] = {
          drawn: snap.drawnTile || '-',
          discarded: snap.discardedTile || '-'
        }
      }

      if (hadMeld) {
        prevExposed = currExposed
        continue
      }
      prevExposed = currExposed
    }

    // 打印最后一圈（仅当尚未flush）
    if (lastFlushedCircleStart !== circleStart && snaps[circleStart]?.players?.length > 0) {
      circleCount++
      const lastSnap = snaps[circleStart]
      for (const pp of lastSnap.players) {
        const d = drawnThisCircle[pp.name] || { drawn: '-', discarded: '-' }
        const drawStr = d.drawn !== '-' ? `｜摸${d.drawn}` : ''
        const discardStr = d.discarded !== '-' ? `｜ → 打${d.discarded}` : ''
        lines.push(`  - ${pp.name}：${formatGroupedHand(pp.hand, lastSnap.wildTile)}｜副露:${formatExposed(pp.exposed)}｜${pp.handCount}张${drawStr}${discardStr}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * 只输出每圈明细（用于 round 文件，--detail 时写入）
 *
 * 格式规则：
 * - 每局从摸牌后开始，以4个玩家的回合为一圈
 * - 回到起始玩家（currentPlayer=0）时结束当前圈，开始新圈
 * - 用 === 第N局 === 分隔不同游戏
 * - 每行格式：玩家名｜摸X｜ → 打Y｜副露:xxx｜剩余手牌
 */
export function formatCircleDetailsOnly(report: RoundReport): string {
  const lines: string[] = []
  if (!report.turnSnapshots || report.turnSnapshots.length === 0) {
    lines.push('(无每圈明细)')
    return lines.join('\n')
  }
  lines.push('### 🔍 每圈明细（血战到底）')

  const snaps = report.turnSnapshots
  const deckLen = 144  // 牌墙总张数固定144

  let circleCount = 0
  let circleStartIdx = 0
  let gameCount = 0
  let prevTurn = -1
  let prevExposed: string[] = []
  let lastFlushedCircleStartIdx = -1  // 防止最后一圈重复flush

  // 记录每个玩家本圈摸打的 {drawn, discarded}
  const circleActions: Record<string, {drawn: string, discarded: string, newFlowers: string[]}> = {}

  // 初始化时重置所有玩家动作为空
  for (const p of snaps[0]?.players || []) {
    circleActions[p.name] = { drawn: '-', discarded: '-', newFlowers: [] }
  }

  const formatExposed = (exposed: string[]): string => {
    if (!exposed || exposed.length === 0) return '无'
    return exposed.join('|')
  }

  // flushCircle: 输出上一圈结果，heading使用"牌墙剩N张"
  const flushCircle = (startIdx: number, wallRemaining: number) => {
    const snap = snaps[startIdx]
    if (!snap) return
    lines.push(`**牌墙剩${wallRemaining}张 百搭${snap.wildTile}｜×${snap.gameMultiplier}**`)
    for (const pp of snap.players) {
      const act = circleActions[pp.name] || { drawn: '-', discarded: '-', newFlowers: [] }
      // 动作序列（按K哥格式）
      const flowerStr = act.newFlowers.length > 0 ? `补${len(act.newFlowers)}花 ` : ''
      const drawStr = act.drawn !== '-' ? `摸${act.drawn} ` : ''
      const discardStr = act.discarded !== '-' ? `打${act.discarded}` : ''
      const actionSeq = flowerStr + drawStr + discardStr
      // 最终手牌
      const exposedStr = formatExposed(pp.exposed || [])
      const handStr = pp.hand || ''
      const handNum = pp.handCount ?? 0
      lines.push(`  ${pp.name}：${actionSeq}→ 手牌:${handStr}｜副露:${exposedStr}｜${handNum}张`)
    }
    lines.push('')
  }

  const resetActions = () => {
    for (const p of snaps[0]?.players || []) {
      circleActions[p.name] = { drawn: '-', discarded: '-', newFlowers: [] }
    }
  }

  for (let i = 0; i < snaps.length; i++) {
    const snap = snaps[i]
    const players = snap.players || []

    // 检测新一局（两种方式：1) NEW_GAME sentinel  2) turn 重置兜底）
    const isNewGameSentinel = snap.drawnTile === 'NEW_GAME'
    const isTurnReset = snap.turn !== undefined && prevTurn !== -1 && snap.turn < prevTurn
    if (isNewGameSentinel || isTurnReset) {
      if (isNewGameSentinel) {
        gameCount = parseInt(snap.discardedTile || '0', 10) + 1
      } else {
        gameCount++
      }
      // 上一局最后一圈也要 flush
      if (circleStartIdx < i) {
        const wallRem = deckLen - (snaps[circleStartIdx]?.wallIdx || 0)
        flushCircle(circleStartIdx, wallRem)
      }
      circleCount = 0
      circleStartIdx = i
      resetActions()
      lines.push(`=== 第${gameCount}局 ===`)
      lines.push('')
      if (isNewGameSentinel) {
        prevTurn = -1
        prevExposed = []
        if (snap.turn !== undefined) prevTurn = snap.turn
        continue
      }
    }

    // 圈切分逻辑
    const currExposed = players.map((p: any) => (p.exposed || []).join('|'))
    const circleStartIsSentinel = snaps[circleStartIdx]?.drawnTile === 'NEW_GAME'
    const hadMeld = !circleStartIsSentinel && prevExposed.length > 0 &&
      currExposed.some((ex: string, idx: number) => ex !== prevExposed[idx])
    const backToStart = i > 0 && snap.currentPlayer === snaps[circleStartIdx].currentPlayer && snap.turn > 0
    const firstRealSnapshot = circleStartIsSentinel && i === circleStartIdx + 1

    // 新圈开始：打印上一圈结果
    if ((i === 0 || hadMeld || backToStart || firstRealSnapshot) && i > 0) {
      const isCircleStartEmpty = snaps[circleStartIdx]?.drawnTile === 'NEW_GAME'
      if (!isCircleStartEmpty) {
        circleCount++
        const wallRem = deckLen - (snaps[circleStartIdx]?.wallIdx || 0)
        flushCircle(circleStartIdx, wallRem)
        lastFlushedCircleStartIdx = circleStartIdx
      } else {
        circleCount = 0
      }
      circleStartIdx = i
      resetActions()
    }

    // 记录当前玩家本回合的摸打
    const currP = players[snap.currentPlayer]
    if (currP && snap.drawnTile && snap.drawnTile !== 'NEW_GAME') {
      const existing = circleActions[currP.name]
      const newFlowers = (snap.players[snap.currentPlayer] as any)?.flowers || []
      circleActions[currP.name] = {
        drawn: snap.drawnTile,
        discarded: snap.discardedTile || '-',
        newFlowers: newFlowers
      }
    }

    if (snap.turn !== undefined) prevTurn = snap.turn
    prevExposed = currExposed
  }

  // 打印最后一圈
  const lastCircleIsEmpty = snaps[circleStartIdx]?.drawnTile === 'NEW_GAME'
  if (snaps.length > 0 && lastFlushedCircleStartIdx !== circleStartIdx && !lastCircleIsEmpty) {
    circleCount++
    const wallRem = deckLen - (snaps[circleStartIdx]?.wallIdx || 0)
    flushCircle(circleStartIdx, wallRem)
  }
  lines.push('---')
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
  // topWins: AK's biggest wins (用于每轮展示)
  const topWins = winningGames
    .filter((w: any) => (w.akDelta ?? 0) > 0)
    .sort((a: any, b: any) => (b.akDelta ?? 0) - (a.akDelta ?? 0))
    .slice(0, 3)
  // globalMaxWin: 全局最大赢局（跨所有玩家，单局净赢分最高的那一局）
  const sortedByScore = [...winningGames].sort((a: any, b: any) => {
    const scoreA = (a.wonFan ?? 0) * (a.multiplier ?? 1)
    const scoreB = (b.wonFan ?? 0) * (b.multiplier ?? 1)
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
    timestamp: new Date().toISOString(),
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
      avgRounds: internalResult.avgRounds,
      avgPot: internalResult.avgPot,
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
  // round 文件只输出每圈明细（showDetail 控制是否写文件）
  const content = showDetail ? formatCircleDetailsOnly(report) : ''
  if (content) fs.writeFileSync(filePath, content, 'utf-8')
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
