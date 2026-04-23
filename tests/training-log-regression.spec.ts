import * as fs from 'fs'
import * as path from 'path'
import { buildRoundReport, formatRoundReport, writeRoundFile, type WinningGameRecord } from '../scripts/training-reporter'
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

const baseWinningGame: WinningGameRecord = {
  gameIdx: 7,
  winnerName: 'AI-老赵',
  isSelfDraw: false,
  akDelta: 200,
  handTypes: ['混一色'],
  hand: '一万 一万 一万 二万 二万 二万 三万 三万 三万 红中 红中 九万',
  melds: ['碰 五万 五万 五万'],
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
    handTypeCounts: { 混一色: 1 },
    winningGames: [baseWinningGame],
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
test('report timestamp uses local non-UTC format', !report.timestamp.endsWith('Z'), `timestamp=${report.timestamp}`)
test('report renders dice points from gameMeta', rendered.includes('骰子点数: 2+5'))
test('report renders dice multiplier from gameMeta', rendered.includes('骰子倍数: ×1'))
test('report renders inherit multiplier from gameMeta', rendered.includes('继承倍数: ×2'))
test('report renders global multiplier from precomputed field', rendered.includes('全局倍数: ×2'))

const diceFallbackWinner: WinningGameRecord = {
  ...baseWinningGame,
  gameIdx: 8,
  multiplier: 0,
  scoreDetails: ['有效倍率 = min(8, 骰子倍数4 × 继承倍数2) = 8'],
  result: {
    settlementLog: [],
    winnerDetails: [
      {
        diceMultiplier: 4,
        inheritMultiplier: 2,
        effectiveMultiplier: 8,
        details: ['有效倍率 = min(8, 骰子倍数4 × 继承倍数2) = 8']
      }
    ]
  }
}

const fallbackReport = buildRoundReport(
  2,
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
    handTypeCounts: { fallback: 1 },
    winningGames: [diceFallbackWinner],
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

const fallbackRendered = formatRoundReport(fallbackReport, false)
test('dice multiplier falls back to winner details when gameMeta is missing', fallbackRendered.includes('骰子倍数: ×4'))
test('inherit multiplier falls back to winner details when gameMeta is missing', fallbackRendered.includes('继承倍数: ×2'))
test('global multiplier falls back to winner details when gameMeta is missing', fallbackRendered.includes('全局倍数: ×8'))
test('dice multiplier no longer renders as question mark when winner details exist', !fallbackRendered.includes('骰子倍数: ×?'))
test('avg rounds falls back from winningGames data when internal metric is missing', fallbackRendered.includes('平均回合 | 11.0'))
test('avg total chips falls back from settlement log when internal metric is missing', fallbackRendered.includes('平均总筹码 | 0.0'))

const multiWinnerGame: WinningGameRecord = {
  ...baseWinningGame,
  gameIdx: 9,
  result: {
    settlementLog: [],
    winnerDetails: [
      { name: 'AI-AK', handType: '混一色' },
      { name: 'AI-小胖', handType: '清一色' },
      { name: 'AI-阿水', handType: '风碰' }
    ]
  }
}

const multiWinnerReport = buildRoundReport(
  4,
  {
    totalGames: 1,
    winGames: 1,
    draws: 0,
    selfDrawGames: 0,
    discardWinGames: 1,
    bigWinGames: 0,
    menqingWinGames: 0,
    fightToLastGames: 1,
    akScore: 0,
    metricsFitness: 0,
    handTypeCounts: {},
    winningGames: [multiWinnerGame],
    scores: {},
    winRates: {},
    multiWinDist: [0, 0, 1, 0],
    turnSnapshots: [],
    highMultGameCount: 0,
  },
  { pengChance: 0.8, chowChance: 0.7 },
  ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'],
  'train-baseline.ts'
)

const multiWinnerRendered = formatRoundReport(multiWinnerReport, false)
test('hand type distribution aggregates winnerDetails for all winners, not just one player', multiWinnerRendered.includes('| 清一色 | 1 |'))
test('hand type distribution includes non-AK winner hand types from winnerDetails', multiWinnerRendered.includes('| 风碰 | 1 |'))

const lowFanHighNet: WinningGameRecord = {
  ...baseWinningGame,
  gameIdx: 10,
  winnerName: 'AI-AK',
  akDelta: 300,
  wonFan: 80,
  result: {
    settlementLog: [
      { from: 'AI-小胖', to: 'AI-AK', amount: 100 },
      { from: 'AI-阿水', to: 'AI-AK', amount: 100 },
      { from: 'AI-老赵', to: 'AI-AK', amount: 100 },
    ]
  }
}

const highFanLowNet: WinningGameRecord = {
  ...baseWinningGame,
  gameIdx: 11,
  winnerName: 'AI-小胖',
  akDelta: 120,
  wonFan: 200,
  result: {
    settlementLog: [
      { from: 'AI-AK', to: 'AI-小胖', amount: 120 },
    ]
  }
}

const maxWinReport = buildRoundReport(
  5,
  {
    totalGames: 2,
    winGames: 2,
    draws: 0,
    selfDrawGames: 1,
    discardWinGames: 1,
    bigWinGames: 0,
    menqingWinGames: 0,
    fightToLastGames: 0,
    akScore: 0,
    metricsFitness: 0,
    handTypeCounts: {},
    winningGames: [lowFanHighNet, highFanLowNet],
    scores: {},
    winRates: {},
    multiWinDist: [2, 0, 0, 0],
    turnSnapshots: [],
    highMultGameCount: 0,
  },
  { pengChance: 0.8, chowChance: 0.7 },
  ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'],
  'train-baseline.ts'
)

test('global max win prefers actual net win over raw wonFan', maxWinReport.globalMaxWin?.gameIdx === 10, `actual=${maxWinReport.globalMaxWin?.gameIdx}`)

const detailReport = buildRoundReport(
  3,
  {
    totalGames: 1,
    winGames: 1,
    draws: 0,
    selfDrawGames: 0,
    discardWinGames: 1,
    bigWinGames: 0,
    menqingWinGames: 0,
    fightToLastGames: 0,
    akScore: 0,
    metricsFitness: 0,
    handTypeCounts: { detail: 1 },
    winningGames: [baseWinningGame],
    scores: {},
    winRates: {},
    multiWinDist: [1, 0, 0, 0],
    turnSnapshots: [
      { drawnTile: 'NEW_GAME', gameIdx: 55 },
      {
        gameIdx: 55,
        drawnTile: '五万',
        discardedTile: '九万',
        actionType: 'turn',
        wallBefore: 20,
        currentPlayer: 0,
        players: [{ name: 'AI-老赵', hand: '一万 二万', handCount: 2, exposed: [] }]
      }
    ],
    highMultGameCount: 0,
  },
  { pengChance: 0.8, chowChance: 0.7 },
  ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'],
  'train-baseline.ts'
)

const tempOutDir = path.resolve(process.cwd(), '.codex-tmp-tests', 'training-log-regression')
fs.mkdirSync(tempOutDir, { recursive: true })
const detailFilename = writeRoundFile(tempOutDir, detailReport, true)
const detailRendered = fs.readFileSync(path.join(tempOutDir, detailFilename.replace('round-', 'detail-round-')), 'utf-8')
test('detail log uses actual game index in title', detailRendered.startsWith('# 第55局完整明细'))

const suppressedByMultiply = 0.8 * 0.05
const blendedClaim = combineClaimChance(0.8, 0.05)
test('claim chance blend no longer collapses to routeProb multiplication', blendedClaim > suppressedByMultiply, `blend=${blendedClaim}, multiply=${suppressedByMultiply}`)
test('claim chance blend preserves meaningful floor from policy', blendedClaim >= 0.28, `actual=${blendedClaim}`)
test('claim chance respects strong route certainty', combineClaimChance(0.4, 0.97) >= 0.97, `actual=${combineClaimChance(0.4, 0.97)}`)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
