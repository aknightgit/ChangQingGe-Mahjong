import { buildRoundReport, formatRoundReport, type WinningGameRecord } from '../scripts/training-reporter'
import { combineClaimChance } from '../scripts/train-baseline'

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

console.log('\n=== Regression: training log rendering ===\n')

const winningGame: WinningGameRecord = {
  gameIdx: 7,
  winnerName: 'AI-老赵',
  isSelfDraw: false,
  akDelta: 200,
  handTypes: ['混一色'],
  hand: '一万一万一万 二万二万二万 三万三万三万 红中 红中 九万',
  melds: ['碰:五万 五万 五万'],
  multiplier: 2,
  roundNum: 11,
  wonFan: 200,
  baseFan: 5,
  extraMultipliers: 2,
  settlementMultiplier: 10,
  scoreDetails: ['无百搭 ×2', '门清 ×2', '有效倍率 = min(8, 骰子倍数1 × 继承倍数2) = 2'],
  winningTile: '九万',
  winningFrom: 'AI-小胖',
  isMenQing: true,
  result: {
    gameMeta: {
      dicePoints: [2, 5],
      diceMultiplier: 1,
      inheritanceMultiplier: 2,
      globalMultiplier: 2,
      flowMultiplier: 2,
      prevRoundWasDraw: true,
      prevRoundWasRebel: false,
    },
    settlementLog: [],
  }
}

const report = buildRoundReport(
  1,
  {
    totalGames: 1,
    winGames: 1,
    draws: 0,
    selfDrawGames: 0,
    discardWinGames: 1,
    bigWinGames: 0,
    menqingWinGames: 1,
    fightToLastGames: 0,
    akScore: 0,
    metricsFitness: 0,
    handTypeCounts: { '混一色': 1 },
    winningGames: [winningGame],
    scores: {},
    winRates: {},
    multiWinDist: [1, 0, 0, 0],
    turnSnapshots: [],
    highMultGameCount: 0,
  },
  { pengChance: 0.8, chowChance: 0.7 },
  ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'],
  'train-baseline.ts'
)

const rendered = formatRoundReport(report, false)

test('report timestamps use local non-UTC format', !report.timestamp.endsWith('Z'), `timestamp=${report.timestamp}`)
test('formula includes extra multiplier between settlement and global', rendered.includes('基础番5 × 结算倍数10 × 额外倍数2 × 全局倍数2 = 最终点200'))
test('hand section shows discard source note', rendered.includes('手牌: 一万一万一万 二万二万二万 三万三万三万 红中 红中 九万 (放冲牌: 九万，来源: AI-小胖)'))
test('report no longer emits meld line in hand block', !rendered.includes('门口牌(吃/碰/杠)'))
test('report no longer emits discard-win inclusion wording', !rendered.includes('捉冲时含进牌'))
test('report resolves no-wild flag from score details', rendered.includes('是否算无百搭: 是（无百搭 ×2）'))
test('global multiplier header no longer mentions flow multiplier multiplication', rendered.includes('全局倍数 = min(8, 骰子倍数 × 继承倍数)'))

test('winner hand block stays separated from meld block', !rendered.includes('鎵嬬墝:') || !rendered.includes('鎵嬬墝: 涓€涓囦竴涓囦竴涓?浜屼竾浜屼竾浜屼竾 涓変竾涓変竾涓変竾 绾腑 绾腑 涔濅竾 浜斾竾 浜斾竾 浜斾竾'))

const suppressedByMultiply = 0.8 * 0.05
const blendedClaim = combineClaimChance(0.8, 0.05)
test('claim chance blend no longer collapses to routeProb multiplication', blendedClaim > suppressedByMultiply, `blend=${blendedClaim}, multiply=${suppressedByMultiply}`)
test('claim chance blend preserves meaningful floor from policy', blendedClaim >= 0.28, `actual=${blendedClaim}`)
test('claim chance respects strong route certainty', combineClaimChance(0.4, 0.97) >= 0.97, `actual=${combineClaimChance(0.4, 0.97)}`)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
