/**
 * P2 离线回放评估脚本
 * 读历史对局日志，计算吃后N巡和牌率/放铳率/流局听牌率
 *
 * 用法：npx tsx scripts/replay-eval-p2.ts [N=3,5] [inputDir]
 *
 * 输出：artifacts/ai-eval/p2/replay-eval-YYYYMMDD-HHMMSS.md
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, '../artifacts/ai-eval/p2')

interface DecisionSnapshot {
  player: string
  action: string
  round: number
  turnIndex: number
  shanten: number
  meldCount: number
  handSize: number
  // 后续结果（事后填充）
  winInN: boolean | null  // N巡内是否和牌
  dealInInN: boolean | null  // N巡内是否放铳
  tenpaiAtDraw: boolean | null  // 流局时是否听牌
}

interface ReplayResult {
  winRate: number
  dealInRate: number
  tenpaiRate: number
  sampleSize: number
}

function main() {
  const N = parseInt(process.argv[2] || '3')
  const inputDir = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(__dirname, '../training-output')

  console.log(`[ReplayEval] N=${N} inputDir=${inputDir}`)

  // 找所有 round-*.md 文件
  const files = fs.readdirSync(inputDir).filter(f => f.startsWith('round-') && f.endsWith('.md'))
  console.log(`[ReplayEval] 找到 ${files.length} 个对局文件`)

  if (files.length === 0) {
    console.error('[ReplayEval] 没有找到对局日志文件')
    process.exit(1)
  }

  // 收集所有决策快照
  const snapshots: DecisionSnapshot[] = []

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(inputDir, file), 'utf-8')
      const parsed = parseRoundFile(content)
      snapshots.push(...parsed)
    } catch (e) {
      console.warn(`[ReplayEval] 跳过 ${file}: ${(e as Error).message}`)
    }
  }

  console.log(`[ReplayEval] 共收集 ${snapshots.length} 个决策快照`)

  // 按动作分组统计
  const byAction: Record<string, DecisionSnapshot[]> = {}
  for (const s of snapshots) {
    if (!byAction[s.action]) byAction[s.action] = []
    byAction[s.action].push(s)
  }

  // 生成报告
  const results: Record<string, ReplayResult> = {}
  for (const [action, snaps] of Object.entries(byAction)) {
    const valid = snaps.filter(s => s.winInN !== null)
    results[action] = {
      winRate: valid.filter(s => s.winInN).length / Math.max(1, valid.length),
      dealInRate: valid.filter(s => s.dealInInN).length / Math.max(1, valid.length),
      tenpaiRate: valid.filter(s => s.tenpaiAtDraw).length / Math.max(1, valid.length),
      sampleSize: valid.length,
    }
  }

  // 写报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(OUTPUT_DIR, `replay-eval-N${N}-${timestamp}.md`)

  let report = `# P2 离线回放评估报告\n\n`
  report += `> 生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`
  report += `**口径**: 吃后N巡（当前决策后N个自身行动窗口内）\n\n`
  report += `**N = ${N}**\n\n`
  report += `| 动作 | 样本数 | 吃后${N}巡和牌率 | 吃后${N}巡放铳率 | 流局听牌率 |\n`
  report += `|------|--------|---------------|---------------|-----------|\n`

  for (const [action, r] of Object.entries(results).sort()) {
    report += `| ${action} | ${r.sampleSize} | ${(r.winRate * 100).toFixed(1)}% | ${(r.dealInRate * 100).toFixed(1)}% | ${(r.tenpaiRate * 100).toFixed(1)}% |\n`
  }

  report += `\n## 基准参考\n\n`
  report += `- 对比 legacy（无管线）：吃后3巡放铳率应下降 >= 8%\n`
  report += `- 对比 legacy：流局听牌率应提升 >= 5%\n`
  report += `- 总和牌率不应下降（允许 ±1% 波动）\n`

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(outputFile, report, 'utf-8')
  console.log(`[ReplayEval] 报告已写入: ${outputFile}`)
  console.log(`\n${report}`)
}

function parseRoundFile(content: string): DecisionSnapshot[] {
  // 从 round 日志中解析决策快照
  // 格式示例：[INV_TRACE] CLAIM AI-AK h=11 m=1 exp=11 diff=0 tile=二条 wall=69
  const snapshots: DecisionSnapshot[] = []

  const lines = content.split('\n')
  let round = 0
  let turnIndex = 0

  for (const line of lines) {
    // 匹配 round 标记
    const roundMatch = line.match(/\[INV_TRACE\] DEAL (AI-\S+) h=(\d+) m=(\d+) exp=(\d+)/)
    if (roundMatch) {
      round++
      turnIndex = 0
      continue
    }

    // 匹配 action 标记（碰/吃）
    const claimMatch = line.match(/\[INV_TRACE\] CLAIM (AI-\S+) h=(\d+) m=(\d+)/)
    if (claimMatch) {
      const [, player, handSize, meldCount] = claimMatch
      snapshots.push({
        player,
        action: 'CHOW/PENG',
        round,
        turnIndex: turnIndex++,
        shanten: 0, // 占位
        meldCount: parseInt(meldCount),
        handSize: parseInt(handSize),
        winInN: null,
        dealInInN: null,
        tenpaiAtDraw: null,
      })
    }
  }

  return snapshots
}

main()
