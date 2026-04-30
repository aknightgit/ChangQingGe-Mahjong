/**
 * AI-AK 策略迭代训练器
 * 4个bot: AI-AK(优化目标), AI-小胖, AI-阿水, AI-老赵(固定)
 * 运行 10 rounds × 500 games
 * 每轮只调AI-AK参数,目标: 最高盈利总分
 * 输出到 training-output/
 */
import {
  shuffleTiles, isFlower, groupTiles, sortTiles, tilesEqual, normalizeHand
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType, isTing,
  checkChowPongExclusion, updateChowPongExclusion, ChowPongExclusionState
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { ActionType, TileSuit, MeldType, WinType, type Tile, type Meld } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { evaluateRouteState } from '../server/ai/route/routeEvaluator'
import { scoreRouteDiscardCandidate } from '../server/ai/route/discardPlanner'
import { evaluateRouteClaim } from '../server/ai/route/claimPlanner'
import { writeRoundFile, buildRoundReport, formatRoundReport, writeIndexFile, prepareTrainingOutputDir } from './training-reporter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUNDS = parseInt(process.argv[2] || '10')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000')
const BASELINE_MODE = process.argv[4] === '--baseline'  // 基线训练:优化指标而非得分
const DETAIL_MODE = process.argv.includes('--detail')  // 每圈明细开关,默认关闭
const TRAINING_CANDIDATES = process.env.TRAINING_CANDIDATES ? parseInt(process.env.TRAINING_CANDIDATES) : 2
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const OUT_DIR = path.resolve(__dirname, '..', 'training-output')
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function toBeijingISOString(date: Date = new Date()): string {
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 19)
}

function toBeijingDisplay(date: Date = new Date()): string {
  return toBeijingISOString(date).replace('T', ' ')
}

function toTimestampSlug(date: Date = new Date()): string {
  return toBeijingISOString(date).replace(/:/g, '-')
}

// ========== MariaDB 备份 ==========
const DB_CONFIG = { host: '192.168.3.241', port: 33061, user: 'openclaw', password: '0penC1aw', database: 'changqingge' }
const RUN_TAG = toTimestampSlug()

async function saveRoundToMariaDB(roundNo: number, evalResult: EvalResult, policy: BotPolicy): Promise<void> {
  if (process.env.TRAINING_MARIADB_ENABLED !== 'true') return
  try {
    const conn = await mysql.createConnection(DB_CONFIG)
    const worstGame = evalResult.worstSingleLoss
    const worstGameJson = worstGame ? JSON.stringify({
      loser: worstGame.loser, score: worstGame.score, gameIdx: worstGame.gameIdx,
      wildTile: worstGame.result.wildTile,
      dice1: worstGame.result.dice1, dice2: worstGame.result.dice2,
      diceMultiplier: worstGame.result.diceMultiplier,
      multiplier: worstGame.result.multiplier,
      winnerDetails: worstGame.result.winnerDetails,
      settlementLog: worstGame.result.settlementLog,
      snapshots: worstGame.result.snapshots?.map(s => ({ name: s.name, hand: s.hand, melds: s.melds, flowers: s.flowers, meldSources: s.meldSources }))
    }) : null

    await conn.execute(
      `INSERT INTO training_results (run_tag, round_no, script, games, hu_rate, draw_rate, self_draw_rate, discard_win_rate, fight_to_last_rate, big_hand_rate, menqing_rate, fitness, avg_rounds, avg_pot, avg_winner_points, policy_json, worst_game_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        RUN_TAG, roundNo, 'train-baseline', evalResult.totalGames,
        ((1 - evalResult.draws / Math.max(1, evalResult.totalGames)) * 100).toFixed(2),
        (evalResult.draws / Math.max(1, evalResult.totalGames) * 100).toFixed(2),
        (evalResult.selfDrawGames / Math.max(1, evalResult.winGames) * 100).toFixed(2),
        (evalResult.discardWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2),
        (evalResult.fightToLastGames / Math.max(1, evalResult.totalGames - evalResult.draws) * 100).toFixed(2),
        (evalResult.bigWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2),
        (evalResult.menqingWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2),
        evalResult.metricsFitness.toFixed(2),
        evalResult.avgRounds.toFixed(2),
        evalResult.avgPot.toFixed(2),
        evalResult.avgWinnerPoints.toFixed(2),
        JSON.stringify(policy),
        worstGameJson
      ]
    )
    await conn.end()
    console.log(`  📦 MariaDB: round ${roundNo} saved (run_tag=${RUN_TAG})`)
  } catch (e: any) {
    console.error(`  ⚠️ MariaDB save failed: ${e.message}`)
  }
}

// ========== Bot Policy (长清阁规则) ==========
interface BotPolicy {
  id: string
  selfWinChance: number; discardHuChance: number
  selfWinWildBoost: number; discardHuWildPenalty: number; discardHuMenQingPenalty: number
  pengChance: number; kongChance: number; chowChance: number; anKongChance: number
  pengWildBoost: number; kongWildBoost: number; chowWildPenalty: number
  menqingKeepBonus: number; meldPenalty: number
  allPungsPursuit: number; pureFlushPursuit: number; halfFlushWeight: number
  sevenPairsPursuit: number; allHonorsPursuit: number; allHonorsPungsPursuit: number
  qingPengPursuit: number; hunPengPursuit: number
  windEastKeep: number; windSouthKeep: number; windWestKeep: number; windNorthKeep: number
  windGeneralKeep: number
  dragonRedKeep: number; dragonGreenKeep: number; dragonWhiteKeep: number; dragonGeneralKeep: number
  pairWeight: number; nearWeight: number; tripletKeepBonus: number; terminalPenalty: number
  wildKeepPenalty: number; wildBailoutThreshold: number
  wild0Aggression: number; wild1Aggression: number; wild2Aggression: number; wild3PlusAggression: number
  wild1RouteMeldPush: number; wild2RouteMeldPush: number; wild3RouteMeldPush: number
  wild1RouteFlushBoost: number; wild2RouteFlushBoost: number; wild3RouteFlushBoost: number
  wild1RouteHonorsBoost: number; wild2RouteHonorsBoost: number; wild3RouteHonorsBoost: number
  wild1RouteAllPungsBoost: number; wild2RouteAllPungsBoost: number; wild3RouteAllPungsBoost: number
  wildMultLowAggression: number; wildMultMidAggression: number; wildMultHighAggression: number
  wild0MenqingKeep: number; wild1MenqingKeep: number; wild2MenqingKeep: number
  wild1BaoPush: number; wild2BaoPush: number; wild3BaoPush: number
  multLowSpeedBias: number; multHighValueBias: number
  discardObsFlushBoost: number; discardObsWeight: number

  // ====== 互包追踪 ======
  bao2ClaimPenalty: number        // 同家2口后的吃碰惩罚(即将触发包三)
  bao3AvoidThreshold: number      // 同家3口后的吃碰完全规避阈值
  baoSelfClaimCaution: number     // 自己被别人吃的口数对策略的影响

  // ====== 牌墙剩余 ======
  wallEarlySpeedPush: number      // 牌墙早期(>80张):可以慢做牌
  wallMidBalance: number          // 牌墙中期(40-80张):平衡
  wallLateDefense: number         // 牌墙晚期(<40张):防守优先

  // ====== 对手听牌/出牌分析 ======
  oppTingDetection: number        // 对手听牌检测敏感度
  safeTilePriority: number        // 安全牌优先级(对手听牌时打安全牌)
  terminalDiscardTingSignal: number // 对手打出幺九→可能已听牌的信号权重
  wildDiaoKeepBonus: number         // 百搭大吊保留奖励(留百搭做最后1张→听所有牌)
  wildDiaoFlushBoost: number        // 百搭大吊+混一色路线加成
  wildDiaoPungBoost: number         // 百搭大吊+碰碰胡路线加成
  // ====== 积分榜动态策略 ======
  scoreBehindRiskBoost: number      // 积分落后时的冒险意愿增强(越落后越激进)
  scoreLeadDefenseBoost: number     // 积分领先时的防守意识增强
  hand5RouteBias: number; hand6RouteBias: number; hand7RouteBias: number
  multLowHand5AllPungs: number; multLowHand5HalfFlush: number
  multHighHand5AllPungs: number; multHighHand5HalfFlush: number
  multLowHand6AllPungs: number; multLowHand6HalfFlush: number; multLowHand6PureFlush: number
  multHighHand6AllPungs: number; multHighHand6HalfFlush: number; multHighHand6PureFlush: number
  multLowHand7AllPungs: number; multLowHand7HalfFlush: number; multLowHand7PureFlush: number
  multHighHand7AllPungs: number; multHighHand7HalfFlush: number; multHighHand7PureFlush: number
  multHighHonorStart: number
  speedVsValueBalance: number; defenseRiskAversion: number; wallTilesImpact: number
  baoRiskAversion: number; baoThreshold: number
  anKongAggression: number; minkanAggression: number; kakanAggression: number; robKongAwareness: number
  noWildDoubleAwareness: number; menqingDoubleAwareness: number
  flushVsPungsBalance: number; honorVsSuitedBalance: number; sequenceVsTripletBias: number
}

const DEFAULT_POLICY: BotPolicy = {
  id: 'default',
  selfWinChance: 0.4, discardHuChance: 0.9,
  selfWinWildBoost: 0.05, discardHuWildPenalty: 0.10, discardHuMenQingPenalty: 0.05,
  pengChance: 1.0, kongChance: 0.9, chowChance: 0.8, anKongChance: 0.95,
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  menqingKeepBonus: 2.8, meldPenalty: 0.00,
  allPungsPursuit: 0.7, pureFlushPursuit: 0.5, halfFlushWeight: 0.6,
  sevenPairsPursuit: 0.4, allHonorsPursuit: 0.6, allHonorsPungsPursuit: 0.4,
  qingPengPursuit: 0.3, hunPengPursuit: 0.5,
  windEastKeep: 3.0, windSouthKeep: 2.0, windWestKeep: 2.0, windNorthKeep: 2.0,
  windGeneralKeep: 2.5,
  dragonRedKeep: 4.0, dragonGreenKeep: 4.0, dragonWhiteKeep: 3.5, dragonGeneralKeep: 4.0,
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
  multLowSpeedBias: 0.6, multHighValueBias: 0.8,
  discardObsFlushBoost: 0.5, discardObsWeight: 0.3,
  bao2ClaimPenalty: 0.5, bao3AvoidThreshold: 0.8, baoSelfClaimCaution: 0.3,
  wallEarlySpeedPush: 0.3, wallMidBalance: 0.5, wallLateDefense: 0.8,
  oppTingDetection: 0.5, safeTilePriority: 0.7, terminalDiscardTingSignal: 0.3,
  wildDiaoKeepBonus: 3.0, wildDiaoFlushBoost: 2.0, wildDiaoPungBoost: 2.0,
  scoreBehindRiskBoost: 1.5, scoreLeadDefenseBoost: 1.0,
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

// ========== Mutatable parameters for AI-AK (长清阁规则) ==========
const MUTATE_KEYS: (keyof BotPolicy)[] = [
  'selfWinChance', 'discardHuChance',
  'selfWinWildBoost', 'discardHuWildPenalty', 'discardHuMenQingPenalty',
  'pengChance', 'kongChance', 'chowChance', 'anKongChance',
  'pengWildBoost', 'kongWildBoost', 'chowWildPenalty',
  'menqingKeepBonus', 'meldPenalty',
  'allPungsPursuit', 'pureFlushPursuit', 'halfFlushWeight',
  'sevenPairsPursuit', 'allHonorsPursuit', 'allHonorsPungsPursuit',
  'qingPengPursuit', 'hunPengPursuit',
  'windEastKeep', 'windSouthKeep', 'windWestKeep', 'windNorthKeep', 'windGeneralKeep',
  'dragonRedKeep', 'dragonGreenKeep', 'dragonWhiteKeep', 'dragonGeneralKeep',
  'pairWeight', 'nearWeight', 'tripletKeepBonus', 'terminalPenalty',
  'wildKeepPenalty', 'wildBailoutThreshold',
  'wild0Aggression', 'wild1Aggression', 'wild2Aggression', 'wild3PlusAggression',
  'wild1RouteMeldPush', 'wild2RouteMeldPush', 'wild3RouteMeldPush',
  'wild1RouteFlushBoost', 'wild2RouteFlushBoost', 'wild3RouteFlushBoost',
  'wild1RouteHonorsBoost', 'wild2RouteHonorsBoost', 'wild3RouteHonorsBoost',
  'wild1RouteAllPungsBoost', 'wild2RouteAllPungsBoost', 'wild3RouteAllPungsBoost',
  'wild0MenqingKeep', 'wild1MenqingKeep', 'wild2MenqingKeep',
  'wild1BaoPush', 'wild2BaoPush', 'wild3BaoPush',
  'multHighValueBias',
  'discardObsFlushBoost', 'discardObsWeight',
  'bao2ClaimPenalty', 'bao3AvoidThreshold',
  'wallEarlySpeedPush', 'wallLateDefense',
  'oppTingDetection', 'safeTilePriority', 'terminalDiscardTingSignal',
  'wildDiaoKeepBonus', 'wildDiaoFlushBoost', 'wildDiaoPungBoost',
  'scoreBehindRiskBoost', 'scoreLeadDefenseBoost',
  'hand5RouteBias', 'hand6RouteBias', 'hand7RouteBias',
  'multLowHand5AllPungs', 'multLowHand5HalfFlush',
  'multHighHand5AllPungs', 'multHighHand5HalfFlush',
  'multLowHand6AllPungs', 'multLowHand6HalfFlush', 'multLowHand6PureFlush',
  'multHighHand6AllPungs', 'multHighHand6HalfFlush', 'multHighHand6PureFlush',
  'multLowHand7AllPungs', 'multLowHand7HalfFlush', 'multLowHand7PureFlush',
  'multHighHand7AllPungs', 'multHighHand7HalfFlush', 'multHighHand7PureFlush',
  'multHighHonorStart',
  'speedVsValueBalance', 'defenseRiskAversion', 'wallTilesImpact',
  'baoRiskAversion', 'baoThreshold',
  'anKongAggression', 'minkanAggression', 'kakanAggression', 'robKongAwareness',
  'noWildDoubleAwareness', 'menqingDoubleAwareness',
  'sequenceVsTripletBias',
]

const PARAM_RANGES: Record<string, { min: number; max: number; step: number }> = {
  selfWinChance:              { min: 0.3,  max: 0.5,  step: 0.02 },
  discardHuChance:            { min: 0.85, max: 1.0,  step: 0.02 },
  selfWinWildBoost:           { min: 0.02, max: 0.08, step: 0.01 },
  discardHuWildPenalty:       { min: 0.05, max: 0.15, step: 0.01 },
  discardHuMenQingPenalty:    { min: 0.0,  max: 0.4,  step: 0.02 },
  pengChance:                 { min: 0.7,  max: 1.0,  step: 0.03 },
  kongChance:                 { min: 0.5,  max: 1.0,  step: 0.05 },
  chowChance:                 { min: 0.4,  max: 1.0,  step: 0.05 },
  anKongChance:               { min: 0.5,  max: 1.0,  step: 0.05 },
  pengWildBoost:              { min: 0.0,  max: 0.3,  step: 0.02 },
  kongWildBoost:              { min: 0.0,  max: 0.4,  step: 0.02 },
  chowWildPenalty:            { min: 0.0,  max: 0.5,  step: 0.02 },
  menqingKeepBonus:           { min: 0.0,  max: 3.0,  step: 0.5 },
  meldPenalty:                { min: 0.0,  max: 0.3,  step: 0.02 },
  allPungsPursuit:            { min: 0.3,  max: 1.5,  step: 0.1 },
  pureFlushPursuit:           { min: 0.2,  max: 1.0,  step: 0.1 },
  halfFlushWeight:            { min: 0.4,  max: 1.2,  step: 0.1 },
  sevenPairsPursuit:          { min: 0.0,  max: 2.0,  step: 0.1 },
  allHonorsPursuit:           { min: 0.0,  max: 2.0,  step: 0.1 },
  allHonorsPungsPursuit:      { min: 0.0,  max: 2.0,  step: 0.1 },
  qingPengPursuit:            { min: 0.0,  max: 2.0,  step: 0.1 },
  hunPengPursuit:             { min: 0.0,  max: 2.0,  step: 0.1 },
  windEastKeep:               { min: 0.0,  max: 5.0,  step: 0.3 },
  windSouthKeep:              { min: 0.0,  max: 5.0,  step: 0.3 },
  windWestKeep:               { min: 0.0,  max: 5.0,  step: 0.3 },
  windNorthKeep:              { min: 0.0,  max: 5.0,  step: 0.3 },
  windGeneralKeep:            { min: 0.0,  max: 5.0,  step: 0.3 },
  dragonRedKeep:              { min: 0.0,  max: 8.0,  step: 0.3 },
  dragonGreenKeep:            { min: 0.0,  max: 8.0,  step: 0.3 },
  dragonWhiteKeep:            { min: 0.0,  max: 8.0,  step: 0.3 },
  dragonGeneralKeep:          { min: 0.0,  max: 8.0,  step: 0.3 },
  pairWeight:                 { min: 1.0,  max: 10.0, step: 0.3 },
  nearWeight:                 { min: 1.0,  max: 8.0,  step: 0.2 },
  tripletKeepBonus:           { min: 1.0,  max: 12.0, step: 0.3 },
  terminalPenalty:            { min: 0.0,  max: 4.0,  step: 0.2 },
  wildKeepPenalty:            { min: 500,  max: 3000, step: 100 },
  wildBailoutThreshold:       { min: 1,    max: 5,    step: 1 },
  wild0Aggression:            { min: 0.0,  max: 1.0,  step: 0.05 },
  wild1Aggression:            { min: 0.0,  max: 1.0,  step: 0.05 },
  wild2Aggression:            { min: 0.0,  max: 1.0,  step: 0.05 },
  wild3PlusAggression:        { min: 0.0,  max: 1.0,  step: 0.05 },
  wild1RouteMeldPush:         { min: 0.0,  max: 1.0,  step: 0.05 },
  wild2RouteMeldPush:         { min: 0.0,  max: 1.0,  step: 0.05 },
  wild3RouteMeldPush:         { min: 0.0,  max: 1.0,  step: 0.05 },
  wild1RouteFlushBoost:       { min: 0.0,  max: 1.0,  step: 0.05 },
  wild2RouteFlushBoost:       { min: 0.0,  max: 1.0,  step: 0.05 },
  wild3RouteFlushBoost:       { min: 0.0,  max: 1.0,  step: 0.05 },
  wild1RouteHonorsBoost:      { min: 0.0,  max: 1.0,  step: 0.05 },
  wild2RouteHonorsBoost:      { min: 0.0,  max: 1.0,  step: 0.05 },
  wild3RouteHonorsBoost:      { min: 0.0,  max: 1.0,  step: 0.05 },
  wild1RouteAllPungsBoost:    { min: 0.0,  max: 1.0,  step: 0.05 },
  wild2RouteAllPungsBoost:    { min: 0.0,  max: 1.0,  step: 0.05 },
  wild3RouteAllPungsBoost:    { min: 0.0,  max: 1.0,  step: 0.05 },
  wildMultLowAggression:      { min: 0.0,  max: 1.0,  step: 0.05 },
  wildMultMidAggression:      { min: 0.0,  max: 1.0,  step: 0.05 },
  wildMultHighAggression:     { min: 0.0,  max: 1.0,  step: 0.05 },
  wild0MenqingKeep:           { min: 0.0,  max: 8.0,  step: 0.3 },
  wild1MenqingKeep:           { min: 0.0,  max: 8.0,  step: 0.3 },
  wild2MenqingKeep:           { min: 0.0,  max: 8.0,  step: 0.3 },
  wild1BaoPush:               { min: 0.0,  max: 2.0,  step: 0.1 },
  wild2BaoPush:               { min: 0.0,  max: 2.0,  step: 0.1 },
  wild3BaoPush:               { min: 0.0,  max: 2.0,  step: 0.1 },
  multLowSpeedBias:           { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighValueBias:          { min: 0.0,  max: 1.0,  step: 0.05 },
  discardObsFlushBoost:       { min: 0.0,  max: 2.0,  step: 0.1 },
  discardObsWeight:           { min: 0.0,  max: 1.0,  step: 0.05 },
  bao2ClaimPenalty:           { min: 0.0,  max: 2.0,  step: 0.1 },
  bao3AvoidThreshold:         { min: 0.0,  max: 1.0,  step: 0.05 },
  baoSelfClaimCaution:        { min: 0.0,  max: 1.0,  step: 0.05 },
  wallEarlySpeedPush:         { min: 0.0,  max: 1.0,  step: 0.05 },
  wallMidBalance:             { min: 0.0,  max: 1.0,  step: 0.05 },
  wallLateDefense:            { min: 0.0,  max: 1.0,  step: 0.05 },
  oppTingDetection:           { min: 0.0,  max: 1.0,  step: 0.05 },
  safeTilePriority:           { min: 0.0,  max: 1.0,  step: 0.05 },
  terminalDiscardTingSignal:  { min: 0.0,  max: 1.0,  step: 0.05 },
  wildDiaoKeepBonus:          { min: 0.0,  max: 10.0, step: 0.5 },
  wildDiaoFlushBoost:         { min: 0.0,  max: 5.0,  step: 0.25 },
  wildDiaoPungBoost:          { min: 0.0,  max: 5.0,  step: 0.25 },
  scoreBehindRiskBoost:       { min: 0.0,  max: 5.0,  step: 0.25 },
  scoreLeadDefenseBoost:      { min: 0.0,  max: 3.0,  step: 0.25 },
  hand5RouteBias:             { min: 0.0,  max: 1.0,  step: 0.05 },
  hand6RouteBias:             { min: 0.0,  max: 1.0,  step: 0.05 },
  hand7RouteBias:             { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand5AllPungs:       { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand5HalfFlush:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand5AllPungs:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand5HalfFlush:     { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand6AllPungs:       { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand6HalfFlush:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand6PureFlush:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand6AllPungs:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand6HalfFlush:     { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand6PureFlush:     { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand7AllPungs:       { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand7HalfFlush:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multLowHand7PureFlush:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand7AllPungs:      { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand7HalfFlush:     { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHand7PureFlush:     { min: 0.0,  max: 1.0,  step: 0.05 },
  multHighHonorStart:         { min: 0.0,  max: 2.0,  step: 0.1 },
  speedVsValueBalance:        { min: 0.0,  max: 1.0,  step: 0.05 },
  defenseRiskAversion:        { min: 0.0,  max: 1.0,  step: 0.05 },
  wallTilesImpact:            { min: 0.0,  max: 1.0,  step: 0.05 },
  baoRiskAversion:            { min: 0.0,  max: 2.0,  step: 0.1 },
  baoThreshold:               { min: 1,    max: 4,    step: 1 },
  anKongAggression:           { min: 0.5,  max: 1.0,  step: 0.05 },
  minkanAggression:           { min: 0.0,  max: 1.0,  step: 0.05 },
  kakanAggression:            { min: 0.0,  max: 1.0,  step: 0.05 },
  robKongAwareness:           { min: 0.0,  max: 1.0,  step: 0.05 },
  noWildDoubleAwareness:      { min: 0.0,  max: 2.0,  step: 0.1 },
  menqingDoubleAwareness:     { min: 0.0,  max: 2.0,  step: 0.1 },
  flushVsPungsBalance:        { min: -2.0, max: 2.0,  step: 0.1 },
  honorVsSuitedBalance:       { min: -2.0, max: 2.0,  step: 0.1 },
  sequenceVsTripletBias:      { min: -2.0, max: 2.0,  step: 0.1 },
}

function loadCharacter(name: string): BotPolicy {
  const filePath = path.join(CHAR_DIR, `${name}.json`)
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return { ...DEFAULT_POLICY, ...data.policy, id: data.policy?.id || name }
  } catch (e) {
    console.warn(`[Character] Failed to load ${name}, using default`)
    return { ...DEFAULT_POLICY, id: name }
  }
}

function saveCharacter(name: string, policy: BotPolicy, metrics: any): void {
  const filePath = path.join(CHAR_DIR, `${name}.json`)
  const data = { savedAt: toBeijingISOString(), round: 0, metrics, policy }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ========== Mutate AI-AK policy ==========
function mutatePolicy(base: BotPolicy, intensity: number = 1.0): BotPolicy {
  const mutated = { ...base }
  // Mutate 3-6 random parameters each round
  const numChanges = 3 + Math.floor(Math.random() * 4)
  const keys = [...MUTATE_KEYS].sort(() => Math.random() - 0.5).slice(0, numChanges)

  for (const key of keys) {
    const range = PARAM_RANGES[key]
    if (!range) { continue }
    const rMin = Number(range.min)
    const rMax = Number(range.max)
    if (!Number.isFinite(rMin) || !Number.isFinite(rMax)) {
      // console.error('[DEBUG] BAD min/max for', key, ':', range)
      continue
    }
    const current = Number(base[key])
    if (!Number.isFinite(current)) { continue }
    const delta = (Math.random() * 2 - 1) * range.step * intensity * (1 + Math.random())
    let newVal = current + delta
    if (newVal > rMax) {
      newVal = rMax
    }
    if (newVal < rMin) {
      newVal = rMin
    }
    (mutated as any)[key] = newVal
  }
  return mutated
}

function crossoverPolicy(a: BotPolicy, b: BotPolicy): BotPolicy {
  const child = { ...a }
  for (const key of MUTATE_KEYS) {
    if (Math.random() < 0.5) {
      (child as any)[key] = (b as any)[key]
    }
    // Slight noise
    if (Math.random() < 0.15) {
      const range = PARAM_RANGES[key]
      if (range) {
        const rMin = Number(range.min)
        const rMax = Number(range.max)
        if (Number.isFinite(rMin) && Number.isFinite(rMax)) {
          const noise = (Math.random() * 2 - 1) * range.step * 0.5
          let noisy = Number((child as any)[key]) + noise
          noisy = Math.min(rMax, Math.max(rMin, noisy))
          ;(child as any)[key] = noisy
        }
      }
    }
  }
  return child
}

// ========== Tile helpers ==========
function t(suit: TileSuit, v: number, id?: string): Tile {
  return { suit, value: v, id: id || `${suit}-${v}-${Math.random().toString(36).slice(2, 8)}`, isFlower: false }
}
function tileEq(a: Tile, b: Tile): boolean { if (!a || !b) return false; return a.suit === b.suit && a.value === b.value }
// 数字→中文
const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
// suit枚举值→中文(注意TileSuit枚举值是 'wan' 不是 'characters','tiao' 不是 'bamboos')
const SUIT_CN: Record<string, string> = { dots: '筒', wan: '万', tiao: '条', feng: '风', jian: '箭', hua: '花' }
const WIND_CN: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' }
const DRAGON_CN: Record<number, string> = { 1: '中', 2: '发', 3: '白' }
const FLOWER_CN: Record<number, string> = { 1: '春', 2: '夏', 3: '秋', 4: '冬', 5: '梅', 6: '兰', 7: '竹', 8: '菊' }

function tileStr(t: Tile): string {
  if (!t) return '??'
  if (t.suit === TileSuit.FLOWER) return FLOWER_CN[t.value] || `花${t.value}`
  if (t.suit === TileSuit.WIND) return WIND_CN[t.value] || '?'
  if (t.suit === TileSuit.DRAGON) return DRAGON_CN[t.value] || '?'
  return `${NUM_CN[t.value] || t.value}${SUIT_CN[t.suit] || t.suit}`
}
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON }
function isWild(t: Tile, ws?: TileSuit, wv?: number): boolean { return ws && wv ? t.suit === ws && t.value === wv : false }
function wildTileStrToName(wildTileStr: string): string {
  if (!wildTileStr || wildTileStr === 'unknown') return '无百搭'
  const [suitPart, valPart] = wildTileStr.split('-')
  const value = parseInt(valPart)
  if (isNaN(value)) return wildTileStr
  const suitMap: Record<string, string> = { wan: '万', dots: '筒', tiao: '条', feng: '风', jian: '字' }
  return `${NUM_CN[value] || value}${suitMap[suitPart] || suitPart}`
}

// ========== Config ==========
const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']
const AK_IDX = 0

// ========== Player / Game ==========
interface BotPlayer {
  name: string; pos: number; hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[]
  isBot: boolean; isTing: boolean; score: number
  wildSuit?: TileSuit; wildValue?: number
  kongCount: number; id: string; status: 'playing' | 'won'
  winMode?: 'self_draw' | 'discard' | 'kong_draw'
  policy: BotPolicy
  // 互包追踪:每个对手被我吃了几口(index=对手pos)
  meldSources: number[]
  // 我打过的牌(用于安全牌分析)
  discardedTiles: Tile[]
  // 吃碰排斥状态(K哥铁律)
  chowPongExclusion: ChowPongExclusionState
}

interface GameState {
  deck: Tile[]; wallIdx: number
  players: BotPlayer[]; current: number
  wildSuit?: TileSuit; wildValue?: number
  discardPile: Tile[]
  gameMultiplier: number
  dice1: number
  dice2: number
  diceMultiplier: number
  inheritanceMultiplier: number
  // 每个玩家的出牌记录(用于对手分析)
  playerDiscards: Tile[][]
}

function buildDeck(): Tile[] {
  const d: Tile[] = []
  for (const s of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS])
    for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) d.push(t(s, v))
  for (let v = 1; v <= 4; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.WIND, v))
  for (let v = 1; v <= 3; v++) for (let c = 0; c < 4; c++) d.push(t(TileSuit.DRAGON, v))
  for (let i = 0; i < 8; i++) d.push({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })
  return shuffleTiles(d)
}

function setupGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[]): GameState {
  const deck = buildDeck()
  const nonFlower = deck.filter(t => !isFlower(t))
  const w = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const ws = w.suit as TileSuit, wv = w.value


  const policies = [akPolicy, otherPolicies[0], otherPolicies[1], otherPolicies[2]]

  const players = AI_NAMES.map((name, i) => ({
    name, pos: i, hand: [] as Tile[], exposedMelds: [] as Meld[], flowerTiles: [] as Tile[],
    isBot: true, isTing: false, score: 0, wildSuit: ws, wildValue: wv, kongCount: 0, id: `p${i}`,
    status: 'playing' as const, policy: policies[i],
    meldSources: [0, 0, 0, 0], discardedTiles: [] as Tile[],
    chowPongExclusion: { firstActionSuit: null, firstActionType: null }
  }))

  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const isPair = dice1 === dice2
  const isBigPair = isPair && (dice1 === 1 || dice1 === 4)
  const diceMultiplier = isBigPair ? 4 : isPair ? 2 : 1
  const inheritanceMultiplier = prevRoundWasDraw ? 2 : 1
  const gameMultiplier = Math.min(8, diceMultiplier * inheritanceMultiplier)

  return { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [],
    gameMultiplier, dice1, dice2, diceMultiplier, inheritanceMultiplier, playerDiscards: [[], [], [], []] }
}

function drawTile(g: GameState, p: BotPlayer): Tile | null {
  if (g.wallIdx >= g.deck.length) return null
  const tile = g.deck[g.wallIdx++]
  if (!tile) return drawTile(g, p)
  if (isFlower(tile)) { p.flowerTiles.push(tile); return drawTile(g, p) }
  p.hand.push(tile)
  // 诊断:追踪手牌,摸牌后手牌长度
  // const kongC = p.exposedMelds.filter(m => m.type === MeldType.KONG).length
  // const exp = 14 - (p.exposedMelds.length - kongC) * 3 - kongC * 4
  // if (p.hand.length !== exp) // console.error(`DRAW: ${p.name} hand=${p.hand.length} expected=${exp} melds=${p.exposedMelds.length} kongs=${kongC}`)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer) { return buildWildTileChecker(p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null) }

let trainingShantenCache = new Map<string, number>()

function trainingTileKey(tiles: Tile[], exposedCount: number): string {
  const counts = new Map<string, number>()
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return `${[...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join(',')};e${exposedCount}`
}

function computeShanten(
  tiles: Tile[],
  exposedCount: number,
  isWildTileChecker: (tile: Tile) => boolean
): number {
  const key = trainingTileKey(tiles, exposedCount)
  const cached = trainingShantenCache.get(key)
  if (cached !== undefined) return cached

  const groups = new Map<string, number>()
  for (const tile of tiles) {
    if (isWildTileChecker(tile)) continue
    const groupKey = `${tile.suit}-${tile.value}`
    groups.set(groupKey, (groups.get(groupKey) || 0) + 1)
  }

  let pairs = 0
  let triplets = 0
  let sequences = 0
  const counted = new Set<string>()

  for (const [groupKey, count] of groups) {
    if (count >= 3) {
      triplets++
      counted.add(groupKey)
    }
  }

  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 7; value++) {
      const k1 = `${suit}-${value}`
      const k2 = `${suit}-${value + 1}`
      const k3 = `${suit}-${value + 2}`
      if (counted.has(k1) || counted.has(k2) || counted.has(k3)) continue
      if ((groups.get(k1) || 0) > 0 && (groups.get(k2) || 0) > 0 && (groups.get(k3) || 0) > 0) {
        sequences++
        counted.add(k1)
        counted.add(k2)
        counted.add(k3)
      }
    }
  }

  for (const [groupKey, count] of groups) {
    if (!counted.has(groupKey) && count >= 2) {
      pairs++
      counted.add(groupKey)
    }
  }

  const melds = triplets + sequences
  const shanten = Math.max(0, Math.min(8, 8 - 2 * melds - Math.max(0, pairs - 1)))
  trainingShantenCache.set(key, shanten)
  if (trainingShantenCache.size > 20000) {
    trainingShantenCache = new Map()
  }
  return shanten
}

function countEffectiveTiles(
  tiles: Tile[],
  exposedCount: number,
  isWildTileChecker: (tile: Tile) => boolean
): number {
  const currentShanten = computeShanten(tiles, exposedCount, isWildTileChecker)
  let total = 0
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 9; value++) {
      const testTile: Tile = { suit, value, id: `eff-${suit}-${value}` }
      if (computeShanten([...tiles, testTile], exposedCount, isWildTileChecker) < currentShanten) {
        total += Math.max(0, 4 - tiles.filter(tile => tile.suit === suit && tile.value === value).length)
      }
    }
  }
  for (let value = 1; value <= 4; value++) {
    const testTile: Tile = { suit: TileSuit.WIND, value, id: `eff-wind-${value}` }
    if (computeShanten([...tiles, testTile], exposedCount, isWildTileChecker) < currentShanten) {
      total += Math.max(0, 4 - tiles.filter(tile => tile.suit === TileSuit.WIND && tile.value === value).length)
    }
  }
  for (let value = 1; value <= 3; value++) {
    const testTile: Tile = { suit: TileSuit.DRAGON, value, id: `eff-dragon-${value}` }
    if (computeShanten([...tiles, testTile], exposedCount, isWildTileChecker) < currentShanten) {
      total += Math.max(0, 4 - tiles.filter(tile => tile.suit === TileSuit.DRAGON && tile.value === value).length)
    }
  }
  return total
}

function markWild(tile: Tile, isWildTile: (t: Tile) => boolean): Tile {
  return { ...tile, isWild: isWildTile(tile) }
}

function toRoutePlayerView(player: BotPlayer) {
  const wildChecker = makeWT(player)
  return {
    id: player.id,
    name: player.name,
    position: player.pos,
    score: player.score,
    isTing: player.isTing,
    hand: {
      concealedTiles: player.hand.map(tile => markWild(tile, wildChecker)),
      exposedMelds: player.exposedMelds.map(meld => ({
        ...meld,
        tiles: meld.tiles.map(tile => markWild(tile, wildChecker))
      })),
      discardedTiles: player.discardedTiles.map(tile => markWild(tile, wildChecker))
    }
  }
}

function toRouteGameView(g: GameState) {
  return {
    discardPile: g.discardPile.map(tile => ({ ...tile })),
    players: g.players.map(toRoutePlayerView),
    currentPlayerIndex: g.current,
    wall: g.deck.slice(g.wallIdx),
  }
}

function estimateTrainingTableThreat(g: GameState, myPos: number): number {
  const opponents = g.players.filter((_, idx) => idx !== myPos)
  let threat = 0
  for (const opp of opponents) {
    if (opp.isTing) threat += 0.42
    threat += Math.min(0.32, opp.exposedMelds.length * 0.08)
  }
  return Math.min(1, threat)
}

function countTrainingWinningTiles(tiles: Tile[], player: BotPlayer): number {
  const isWildTile = makeWT(player)
  const exposedCount = player.exposedMelds.length
  const candidates: Array<{ suit: TileSuit; value: number; maxCopies: number }> = []
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 9; value++) {
      candidates.push({ suit, value, maxCopies: 4 })
    }
  }
  for (let value = 1; value <= 4; value++) candidates.push({ suit: TileSuit.WIND, value, maxCopies: 4 })
  for (let value = 1; value <= 3; value++) candidates.push({ suit: TileSuit.DRAGON, value, maxCopies: 4 })

  let total = 0
  for (const candidate of candidates) {
    const testTile: Tile = {
      id: `wait-${candidate.suit}-${candidate.value}`,
      suit: candidate.suit,
      value: candidate.value,
      isFlower: false
    }
    if (!canWin([...tiles, testTile], exposedCount, isWildTile, true).canWin) continue
    const inHand = tiles.filter(t => t.suit === candidate.suit && t.value === candidate.value).length
    total += Math.max(0, candidate.maxCopies - inHand)
  }
  return total
}

// ========== Meld detection ==========
function canPeng(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  p.hand = normalizeHand(p.hand)  // K哥铁律:过滤undefined+花牌
  return p.hand.filter(t => tileEq(t, tile)).length >= 2
}
function canChow(p: BotPlayer, tile: Tile): boolean {
  if (!tile || isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  p.hand = normalizeHand(p.hand)  // K哥铁律:过滤undefined+花牌
  const v = tile.value
  // 三种吃牌方式:
  // 1) 中间牌:需要 v-1 和 v+1(如 3+5 吃 4),v范围2-8
  // 2) 最低牌(tile是最大的):需要 v-1 和 v-2(如 3+4 吃 5),v范围3-9
  // 3) 最高牌(tile是最小的):需要 v+1 和 v+2(如 4+5 吃 3),v范围1-7
  const has = (val: number) => p.hand.some(t => t.suit === tile.suit && t.value === val)
  // 中间牌
  if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) return true
  // 最低牌:tile是被吃序列中最大的
  if (v >= 3 && has(v - 1) && has(v - 2)) return true
  // 最高牌:tile是被吃序列中最小的
  if (v <= 7 && has(v + 1) && has(v + 2)) return true
  return false
}

// ========== 防死牌:第一次吃决定方向 ==========
// 核心规则:
// - 吃:第一次吃决定方向(此门=目标门),之后只能继续吃同一门
// - 碰:任何门都可以碰(但不是零散门碰)
// - 风箭碰永远允许
// - 防止死牌:如果吃过一门,其他门绝对不让吃不让碰
//   (除非其他门已吃过碰过同门--则自动转碰碰胡路线)
function isClaimSuitAllowed(p: BotPlayer, tile: Tile, action: 'chow' | 'peng' = 'chow'): boolean {
  if (!tile) return false
  // 风箭碰 → 永远允许
  if (isHonor(tile)) return true
  if (tile.suit === TileSuit.FLOWER) return false

  // 【K哥4条铁律】
  // 1. 吃过一门 → 不能吃其他门
  // 2. 吃过一门 → 不能碰其他门
  // 3. 碰过1门 → 不能吃其他门
  // 4. 碰过2门 → 不能吃任何一门
  const chowedSuits = new Set<string>()
  const pongedSuits = new Set<string>()
  for (const meld of p.exposedMelds) {
    if (meld.tiles?.[0] && meld.tiles[0].suit !== TileSuit.WIND && meld.tiles[0].suit !== TileSuit.DRAGON) {
      if (meld.type === MeldType.SEQUENCE) chowedSuits.add(meld.tiles[0].suit)
      if (meld.type === MeldType.PONG || meld.type === MeldType.KONG) pongedSuits.add(meld.tiles[0].suit)
    }
  }

  // 风箭碰 → 永远允许
  if (isHonor(tile)) return true

  // 铁律1: 吃过一门 → 不能吃碰其他门
  if (chowedSuits.size > 0) return chowedSuits.has(tile.suit)

  // 铁律2+3: 碰过1门+ → 不能吃其他门
  if (action === 'chow' && pongedSuits.size >= 1) return pongedSuits.has(tile.suit)

  // 铁律4: 碰过2门+ → 不能吃任何一门
  if (action === 'chow' && pongedSuits.size >= 2) return false

  return true
}

function canMingKong(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 3  // K哥铁律:统一normalize
}
function canAnKong(p: BotPlayer): Tile[] {
  const hand = normalizeHand(p.hand)  // K哥铁律:统一normalize过滤花牌+undefined
  const groups = groupTiles(hand)
  const result: Tile[] = []
  for (const [k, tiles] of groups) { if (tiles.length === 4 && tiles[0]) result.push(tiles[0]) }
  return result
}
function canJiaGang(p: BotPlayer): Tile[] {
  const result: Tile[] = []
  for (const meld of p.exposedMelds) {
    if (meld.type === MeldType.TRIPLET) {
      const found = p.hand.find(t => t && tileEq(t, meld.tiles[0]))
      if (found) result.push(found)
    }
  }
  return result
}

// ========== Apply melds ==========
function applyPeng(p: BotPlayer, tile: Tile, sourcePos?: number): boolean {
  p.hand = normalizeHand(p.hand)  // K哥铁律:apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const expected = before === 13 - 3 * meldCount || before === 14 - 3 * meldCount
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  if (!expected || matches.length < 2) {
    console.error(`BUG applyPeng: ${p.name} before=${before} melds=${meldCount} valid=${expected} matches=${matches.length}`)
    return false
  }
  for (const u of matches) { const idx = p.hand.findIndex(rt => rt.id === u.id); if (idx >= 0) p.hand.splice(idx, 1) }
  const after = p.hand.length
  if (after !== before - 2) { console.error(`BUG applyPeng: ${p.name} before=${before} after=${after}`); return false }
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
  return true
}
function applyChow(p: BotPlayer, tile: Tile, sourcePos?: number): boolean {
  p.hand = normalizeHand(p.hand)  // K哥铁律:apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const validBefore = before === 13 - 3 * meldCount || before === 14 - 3 * meldCount
  const v = tile.value
  const findTile = (suit: TileSuit, val: number) => p.hand.find(t => t.suit === suit && t.value === val)
  const removeTile = (t: Tile) => { const idx = p.hand.findIndex(h => h.id === t.id); if (idx >= 0) p.hand.splice(idx, 1) }

  let t1: Tile | undefined, t2: Tile | undefined
  if (v >= 2 && v <= 8) { t1 = findTile(tile.suit, v - 1); t2 = findTile(tile.suit, v + 1) }
  if ((!t1 || !t2) && v >= 3) { t1 = findTile(tile.suit, v - 1); t2 = findTile(tile.suit, v - 2) }
  if ((!t1 || !t2) && v <= 7) { t1 = findTile(tile.suit, v + 1); t2 = findTile(tile.suit, v + 2) }

  if (!validBefore || !t1 || !t2) {
    console.error(`BUG applyChow: ${p.name} before=${before} melds=${meldCount} valid=${validBefore} t1=${t1?.id} t2=${t2?.id}`)
    return false
  }
  if (t1.id === t2.id) { return false }
  removeTile(t1); removeTile(t2)
  const after = p.hand.length
  if (after !== before - 2) { console.error(`BUG applyChow: ${p.name} before=${before} after=${after}`); return false }
  const meldTiles = [t1, tile, t2].sort((a, b) => a.value - b.value)
  p.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: meldTiles, isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
  return true
}
function applyMingKong(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 3) { console.error(`BUG applyMingKong: ${p.name} tileCount=${tileCount} < 3`); return }
  const before = p.hand.length
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 3)
  for (const u of matches) { const idx = p.hand.findIndex(rt => rt.id === u.id); if (idx >= 0) p.hand.splice(idx, 1) }
  const after = p.hand.length
  if (after !== before - 3) { console.error(`BUG applyMingKong: ${p.name} before=${before} after=${after}`); return }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: false })
  p.kongCount++
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyAnKong(p: BotPlayer, tile: Tile): void {
  p.hand = normalizeHand(p.hand)
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 4) { console.error(`BUG applyAnKong: ${p.name} tileCount=${tileCount} < 4`); return }
  const before = p.hand.length
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  const after = p.hand.length
  if (after !== before - 4) { console.error(`BUG applyAnKong: ${p.name} before=${before} after=${after}`); return }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
  p.kongCount++
}
function applyJiaGang(p: BotPlayer, tile: Tile): void {
  const meld = p.exposedMelds.find(m => m.type === MeldType.TRIPLET && tileEq(m.tiles[0], tile))
  if (!meld) return
  meld.type = MeldType.KONG; meld.tiles = [tile, tile, tile, tile]; meld.isConcealed = false
  p.hand = p.hand.filter(t => t && !tileEq(t, tile)); p.kongCount++
}

let prevRoundWasDraw = false

function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, roundMultiplier: number, inheritMultiplier: number): number {
  const wildTileId = p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null
  const types = detectHandTypes(p.hand, p.exposedMelds, wildTileId, isSelfDraw, p.flowerTiles.length)
  const result = calculateScore({
    handTiles: p.hand, exposedMelds: p.exposedMelds,
    flowerTiles: p.flowerTiles, handTypes: types,
    isSelfDrawn: isSelfDraw, isKongFlower: isKongWin,
    isRobbingKong: false, isMenQing: p.exposedMelds.length === 0,
    wildTileSuit: p.wildSuit, wildTileValue: p.wildValue,
    rawRoundMultiplier: roundMultiplier,
    rawInheritMultiplier: inheritMultiplier,
    settlementMultiplier: SETTLEMENT_MULT
  })
  return result.finalPoints
}

function hasTenPointClaimExemption(handTypes: HandType[], isDaDiao: boolean): boolean {
  if (isDaDiao) return true
  return handTypes.some(type => [
    HandType.FENG_PENG,
    HandType.ALL_WIND,
    HandType.QING_PENG,
    HandType.HUN_PENG,
    HandType.EIGHT_FLOWERS,
    HandType.FOUR_WILD,
    HandType.FULL_FLUSH
  ].includes(type))
}

function canDiscardWinByProjectRules(
  handTiles: Tile[],
  exposedMelds: Meld[],
  handTypes: HandType[],
  flowerTiles: Tile[]
): boolean {
  const concealedNonFlower = handTiles.filter(t => !isFlower(t))
  const isDaDiao = concealedNonFlower.length === 1
  if (hasTenPointClaimExemption(handTypes, isDaDiao)) return true

  const hasFlowerAtDoor = flowerTiles.length > 0
  const hasWindDragonTriplet = exposedMelds.some(m =>
    (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) &&
    m.tiles[0] && (m.tiles[0].suit === TileSuit.WIND || m.tiles[0].suit === TileSuit.DRAGON)
  )
  const hasAnyKong = exposedMelds.some(m => m.type === MeldType.KONG)
  return hasFlowerAtDoor || hasWindDragonTriplet || hasAnyKong
}

export function combineClaimChance(policyChance: number, routeProb: number): number {
  if (routeProb <= 0) return 0
  if (routeProb >= 0.95) return Math.max(policyChance, routeProb)
  return Math.max(Math.min(1, policyChance * 0.7 + routeProb * 0.6), policyChance * 0.35)
}

function toRouteClaimProbability(
  routeAllowed: boolean,
  tuneDelta: number,
  passShanten: number,
  candidateShanten: number,
  passEffective: number,
  candidateEffective: number
): number {
  if (!routeAllowed) return 0
  const speedDelta = (passShanten - candidateShanten) * 0.16
  const effectiveDelta = (candidateEffective - passEffective) * 0.012
  return Math.max(0.02, Math.min(0.98, 0.5 + tuneDelta * 0.18 + speedDelta + effectiveDelta))
}

function evaluateClaimResultingHand(hand: Tile[], exposedCount: number, wildChecker: (tile: Tile) => boolean): { shanten: number; effective: number } {
  let bestShanten = Infinity
  let bestEffective = -1
  for (let i = 0; i < hand.length; i++) {
    const remain = hand.filter((_, idx) => idx !== i)
    const shanten = computeShanten(remain, exposedCount, wildChecker)
    const effective = countEffectiveTiles(remain, exposedCount, wildChecker)
    if (shanten < bestShanten || (shanten === bestShanten && effective > bestEffective)) {
      bestShanten = shanten
      bestEffective = effective
    }
  }
  return { shanten: bestShanten, effective: bestEffective }
}

function getTrainingChowOptionIds(hand: Tile[], claimTile: Tile): string[][] {
  if (claimTile.suit === TileSuit.WIND || claimTile.suit === TileSuit.DRAGON || claimTile.suit === TileSuit.FLOWER) {
    return []
  }
  const patterns: Array<[number, number]> = [
    [claimTile.value - 2, claimTile.value - 1],
    [claimTile.value - 1, claimTile.value + 1],
    [claimTile.value + 1, claimTile.value + 2]
  ]
  const options: string[][] = []
  for (const [a, b] of patterns) {
    if (a < 1 || b > 9) continue
    const first = hand.find(tile => tile.suit === claimTile.suit && tile.value === a)
    if (!first) continue
    const second = hand.find(tile => tile.id !== first.id && tile.suit === claimTile.suit && tile.value === b)
    if (!second) continue
    options.push([first.id, claimTile.id, second.id])
  }
  return options
}

// ========== 互包结算 ==========
// ========== 互包结算 ==========
// 包三:同一家吃了/碰了/杠了≥3口 → 当"目标玩家"胡牌时,包家替所有人赔付
// 包四:同一家≥4口 → 包家赔付加倍(×2)
//
// 真实规则:
//   自摸:包家赔全部(3倍base),其他2家不赔不赚
//   放炮:包家赔全部(3倍base),放炮者不赔不赚
//   放炮者就是包家:正常赔付(已经赔了)
function applyBaoSettlement(
  g: GameState, winnerIdx: number, isSelfDraw: boolean,
  discarderIdx: number | null, baseScore: number
): void {
  const winner = g.players[winnerIdx]

  for (let ci = 0; ci < 4; ci++) {
    if (ci === winnerIdx) continue
    const meldCount = winner.meldSources[ci]
    if (meldCount < 3) continue

    const isBao4 = meldCount >= 4
    const mult = isBao4 ? 2 : 1
    const baoPay = baseScore * 3 * mult  // 包家赔付总额(覆盖所有输家)

    if (isSelfDraw) {
      // 自摸:包家赔全部3倍base,其他2家退回
      for (let i = 0; i < 4; i++) {
        if (i === winnerIdx) continue
        if (i === ci) {
          g.players[i].score += baseScore  // 退回之前的1倍
          g.players[i].score -= baoPay     // 赔付3倍(包四时6倍)
        } else {
          g.players[i].score += baseScore  // 退回之前的1倍,不赔了
        }
      }
    } else {
      // 放炮
      if (discarderIdx !== null && discarderIdx !== ci) {
        // 放炮者不是包家 → 包家替放炮者赔付
        g.players[discarderIdx].score += baseScore  // 退回放炮者已扣的
        g.players[ci].score -= baoPay               // 包家赔付全部3倍
      }
      // 放炮者就是包家 → 不变(已经赔了,但赔的是1倍 → 修正为3倍)
      if (discarderIdx === ci) {
        g.players[ci].score += baseScore  // 退回1倍
        g.players[ci].score -= baoPay     // 赔付3倍
      }
    }
  }
}

// ========== 百搭最优利用:全局评分 ==========
// 根据手牌评估不同百搭使用方式的得分,选择最高分
// 长清阁牌型固定/公式得分:
//   清一色=10, 风一色=20, 风碰=40, 清碰=20, 混碰=公式, 碰碰胡=公式(max10), 混一色=公式
//   无百搭×2, 门清×2
function evalWildDeployment(hand: Tile[], meldCount: number, wildCount: number,
  flowerCount: number): { bestType: string; bestScore: number; keepWildScore: number } {

  // 牌型基础分查找
  const typeScore: Record<string, number> = {
    '清一色': 10, '风一色': 20, '风碰': 40, '清碰': 20,
    '混碰': Math.min(10, 2 + flowerCount), '碰碰胡': Math.min(10, 2 + flowerCount),
    '混一色': Math.min(10, 2 + flowerCount),
  }

  if (wildCount === 0) {
    const types = detectHandTypes(hand, [], null, false, flowerCount)
    const base = types.length > 0 ? (typeScore[types[0]] || 0) : 0
    const final = base * 2  // 无百搭×2
    return { bestType: types[0] || '未知牌型', bestScore: final, keepWildScore: final }
  }

  const nonWild = hand.filter(t => !isWild(t, undefined, undefined))

  // 评估1:保留百搭不使用(无百搭翻倍×2)
  const typesNoWild = detectHandTypes(nonWild, [], null, false, flowerCount)
  const baseNoWild = typesNoWild.length > 0 ? (typeScore[typesNoWild[0]] || 0) : 0
  const keepWildScore = baseNoWild * 2

  // 评估2:百搭做清一色(最长花色+百搭>=13张)
  let flushScore = 0
  if (meldCount === 0) {
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      const suitTiles = nonWild.filter(t => t.suit === suit)
      const wilds = hand.filter(t => isWild(t, undefined, undefined))
      if (suitTiles.length + wilds.length >= 13) { flushScore = 10; break }
    }
  }

  // 评估3:百搭做风碰/箭碰(固定高分40)
  const honorCount = nonWild.filter(t => isHonor(t)).length
  let fengPengScore = 0
  if (honorCount + wildCount >= 13) fengPengScore = 40  // 风碰=40

  // 评估4:百搭做碰碰胡
  const groups = groupTiles(nonWild)
  let pairPotential = 0
  for (const [, tiles] of groups) { if (tiles.length >= 2) pairPotential++ }
  const pungScore = (pairPotential + wildCount >= 4) ? Math.min(10, 2 + flowerCount) : 0

  // 取最高分
  const options = [
    { type: '保留百搭', score: keepWildScore },
    { type: '清一色', score: flushScore },
    { type: '风碰', score: fengPengScore },
    { type: '碰碰胡', score: pungScore }
  ]
  options.sort((a, b) => b.score - a.score)

  return { bestType: options[0].type, bestScore: options[0].score, keepWildScore }
}

// ========== AI Discard (长清阁规则) ==========
// 新出牌策略:K哥机械规则(弃最短门单张→风箭→对子)

// ========== 听牌优化器(支持任意张数) ==========
// 摸牌后手牌N张时,找到让"待胡池"最大的弃牌
function findTingPaiDiscard(p: BotPlayer, isWT: (t: Tile, p: BotPlayer) => boolean): Tile | null {
  const hand = p.hand
  const nonFlower = hand.filter(t => !isFlower(t))
  if (nonFlower.length < 2) return null

  const nonWild = nonFlower.filter(t => !isWT(t, p))
  const wildCount = nonFlower.filter(t => isWT(t, p)).length

  // 27种牌(万/筒/条各1-9)
  const ALL: [TileSuit, number][] = []
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) ALL.push([suit, v])
  }

  // 枚举弃牌 → 数待胡池
  let bestTile: Tile | null = null
  let bestCount = -1

  for (const discard of nonWild) {
    const after = nonWild.filter(t => t.id !== discard.id)
    let waitingCount = 0

    for (const [suit, value] of ALL) {
      const testTile: Tile = { id: `tp-${suit}-${value}`, suit, value }
      const testHand = [...after, testTile, ...nonFlower.filter(t => isWT(t, p))]
      const result = canWin(testHand, p.exposedMelds.length, p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null)
      if (result.canWin) {
        waitingCount++
      }
    }

    if (waitingCount > bestCount) {
      bestCount = waitingCount
      bestTile = discard
    }
  }

  // 至少听2张才算有意义的优化
  return bestCount >= 2 ? bestTile : null
}

// ====== 课程学习:阶段+听牌距离双门控 ======
// 策略:选路线→验证→决策→推进,不是一锤子买卖
// - 前 N 回合:机械规则(最短门→风箭→对子),纯快速搭牌
// - N+ 回合:无论远近都跑 route evaluator,持续选路线+验证+推进
// - 听牌阶段(distance ≤ 2):精收口,选最优弃牌最大化待胡池
const EARLY_ROUNDS = process.env.EARLY_ROUNDS ? parseInt(process.env.EARLY_ROUNDS) : 2
const TENPAI_THRESHOLD = process.env.TENPAI_THRESHOLD ? parseInt(process.env.TENPAI_THRESHOLD) : 2

function aiDiscard(p: BotPlayer, gameMultiplier: number = 1, discardPile: Tile[] = [],
  wallIdx: number = 0, deckLen: number = 144, allPlayers: BotPlayer[] = [], myPos: number = 0): Tile {
  const hand = p.hand
  const wilds = hand.filter(t => isWT(t, p))
  const nonWild = hand.filter(t => !isWT(t, p))

  // 百搭永远不打
  if (nonWild.length === 0 && wilds.length > 0) return wilds[0]

  // 当前回合:从发牌后(52)开始计数,每4张=1回合
  const myRound = Math.floor((wallIdx - 52) / 4)
  const isEarly = myRound < EARLY_ROUNDS

  // 前N回合:机械规则(更稳,不乱拆对子)
  if (isEarly) {
    return mechanicalDiscard(p, discardPile)
  }

  const routeGame = toRouteGameView({
    deck: Array.from({ length: deckLen }, (_, idx) => ({ id: `wall-${idx}`, suit: TileSuit.DOTS, value: 1 })),
    wallIdx,
    players: allPlayers,
    current: myPos,
    wildSuit: p.wildSuit,
    wildValue: p.wildValue,
    discardPile,
    gameMultiplier,
    dice1: 1,
    dice2: 1,
    diceMultiplier: gameMultiplier,
    inheritanceMultiplier: 1,
    playerDiscards: [[], [], [], []]
  })
  const routePlayer = routeGame.players[myPos]
  const wildChecker = makeWT(p)
  const exposedCount = p.exposedMelds.length
  const wallRemaining = Math.max(0, deckLen - wallIdx)
  const tableThreat = estimateTrainingTableThreat({
    deck: [],
    wallIdx,
    players: allPlayers,
    current: myPos,
    wildSuit: p.wildSuit,
    wildValue: p.wildValue,
    discardPile,
    gameMultiplier,
    dice1: 1,
    dice2: 1,
    diceMultiplier: gameMultiplier,
    inheritanceMultiplier: 1,
    playerDiscards: [[], [], [], []]
  }, myPos)
  const currentShanten = computeShanten(routePlayer.hand.concealedTiles, exposedCount, wildChecker)
  const currentEffective = countEffectiveTiles(routePlayer.hand.concealedTiles, exposedCount, wildChecker)
  const routeState = evaluateRouteState({
    game: routeGame as any,
    player: routePlayer as any,
    hand: routePlayer.hand.concealedTiles,
    shanten: currentShanten,
    effectiveTiles: currentEffective,
    tableThreat,
    wallRemaining,
    previousRouteState: (p as any).__routeStateMemory || null
  })

  let bestTile = nonWild[0]
  let bestShanten = Infinity
  let bestComposite = -Infinity

  for (const t of nonWild) {
    let removed = false
    const remaining = routePlayer.hand.concealedTiles.filter(tile => {
      if (!removed && tile.id === t.id) {
        removed = true
        return false
      }
      return true
    })
    const shanten = computeShanten(remaining, exposedCount, wildChecker)
    const effective = countEffectiveTiles(remaining, exposedCount, wildChecker)
    const winningTiles = shanten <= TENPAI_THRESHOLD ? countTrainingWinningTiles(remaining, p) : 0
    const discardDanger = Math.min(1, discardPile.filter(tile => tile.suit === t.suit && tile.value === t.value).length * 0.18)
    const afterRouteState = evaluateRouteState({
      game: routeGame as any,
      player: routePlayer as any,
      hand: remaining,
      shanten,
      effectiveTiles: effective,
      tableThreat,
      wallRemaining,
      previousRouteState: routeState
    })
    const routeScore = scoreRouteDiscardCandidate({
      tile: markWild(t, wildChecker),
      hand: routePlayer.hand.concealedTiles,
      player: routePlayer as any,
      game: routeGame as any,
      routeState,
      candidateShanten: shanten,
      candidateEffective: effective,
      discardDanger,
      winningTiles,
      baselineScore: 0,
      afterRouteState
    })
    const composite =
      -shanten * 100 +
      effective * 2.4 +
      routeScore * 2 +
      winningTiles * (shanten <= TENPAI_THRESHOLD ? 0.75 : 0)

    if (composite > bestComposite || (composite === bestComposite && shanten < bestShanten)) {
      bestShanten = shanten
      bestComposite = composite
      bestTile = t
    }
  }
  ;(p as any).__routeStateMemory = routeState
  return bestTile
}

/**
 * 机械弃牌规则 v2(K哥铁律)
 * 默认方向:混一色/清一色(保最长门)
 * 例外:对子多→碰碰胡,风向多→风一色
 */
function mechanicalDiscard(p: BotPlayer, discardPile: Tile[] = []): Tile {
  const mHand = p.hand
  const mNonWild = mHand.filter(t => !isWT(t, p))

  // 花色统计
  const suitTiles: Record<string, Tile[]> = {}
  for (const t of mNonWild) {
    if (!suitTiles[t.suit]) suitTiles[t.suit] = []
    suitTiles[t.suit].push(t)
  }
  const mainSuitList = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const suitCounts = mainSuitList.map(s => suitTiles[s]?.length || 0)
  const minSuitIdx = suitCounts.indexOf(Math.min(...suitCounts.filter(c => c > 0)))

  // 弃牌区计数
  const discardCount: Record<string, number> = {}
  for (const t of discardPile) {
    discardCount[`${t.suit}-${t.value}`] = (discardCount[`${t.suit}-${t.value}`] || 0) + 1
  }

  // 评分:弃牌价值(越低越应该打)
  type DiscardCandidate = { tile: Tile, score: number }
  const candidates: DiscardCandidate[] = []
  const suitNames = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]

  for (const t of mNonWild) {
    let score = 50 // 基础分

    // 风向箭牌:已出现 >2 → 优先打
    if (isHonor(t)) {
      const appeared = discardCount[`${t.suit}-${t.value}`] || 0
      score -= appeared >= 3 ? 30 : appeared >= 2 ? 20 : appeared >= 1 ? 10 : -5
    }

    // 单张(同花色无相邻)
    const suitGroup = suitTiles[t.suit] || []
    const isSingle = !suitGroup.some(o => o.id !== t.id && (o.value === t.value - 1 || o.value === t.value + 1))
    if (isSingle && !isHonor(t)) score -= 15

    // 最短门单张 → 优先打
    if (t.suit === suitNames[minSuitIdx] && isSingle) {
      const appeared = discardCount[`${t.suit}-${t.value}`] || 0
      score -= appeared >= 2 ? 25 : appeared >= 1 ? 15 : 5
    }

    // 最短门对子 → 第4优先
    if (t.suit === suitNames[minSuitIdx] && !isSingle) {
      score -= 5
    }

    // 幺九牌 → 加分打
    if (t.value === 1 || t.value === 9) score -= 8

    candidates.push({ tile: t, score })
  }

  // 按评分排序,选最低分的打
  candidates.sort((a, b) => a.score - b.score)
  return candidates[0].tile
}
// ========== 游戏明细记录 ==========
interface GameEvent { turn: number; player: string; action: string; detail: string }
interface SettlementEntry { from: string; to: string; amount: number; reason: string; mult?: number }
interface PlayerSnapshot { name: string; hand: string; melds: string[]; flowers: string[]; meldSources: number[]; wildTile: string }

// 每回合快照:记录一回合内所有4个玩家的完整状态
interface TurnSnapshot {
  turn: number
  currentPlayer: number        // 当前行动的玩家索引
  drawnTile: string            // 当前玩家摸的牌(花牌填-,另用 flowerDrawn)
  flowerDrawn: string | null  // 本回合摸到的花牌(若无则null)
  discardedTile: string        // 当前玩家本回合打出的牌(若无则为-)
  lastDiscardBy: number         // 最近一次出牌者索引(供捉冲用)
  lastDiscard: string          // 最近打出的牌
  players: Array<{
    name: string
    hand: string               // 手牌(concealed tiles)
    exposed: string[]           // 门口副露(面子)描述
    meldSources: number[]       // 互包关系
    handCount: number           // 手牌数
  }>
  wildTile: string             // 百搭信息
  gameMultiplier: number        // 本局倍数
  wallIdx: number               // 牌墙当前位置
}

interface GameResult {
  winner: number; scores: number[]; events: GameEvent[]; multiplier: number
  settlementLog: SettlementEntry[]; snapshots: PlayerSnapshot[]; roundNum: number
  wildTile: string; wildSuit?: TileSuit; wildValue?: number
  dice1: number; dice2: number; diceMultiplier: number
  totalPot: number
  turnSnapshots: TurnSnapshot[]  // 每回合快照(用于单局详细分析)
  isDraw?: boolean
  // 游戏全局上下文（用于报告渲染）
  gameMeta: {
    dicePoints: number[]; diceMultiplier: number; inheritanceMultiplier: number; globalMultiplier: number
    flowMultiplier: number; prevRoundWasDraw: boolean; prevRoundWasRebel: boolean
  }
  // 每个赢家的详细信息
  winnerDetails: Array<{
    name: string; winMode: string; handType: string; baseFan: number; finalPoints: number
    handTiles: string; melds: string[]; flowers: string[]; isMenQing: boolean; from?: string; winningTile?: string
    extraMultipliers: number; settlementMultiplier: number; globalMultiplier: number; scoreDetails: string[]
  }>
}

// ========== 血战到最后一人 ==========
// 每局有人胡牌后,记录赢家,剩余玩家继续开新局,直到最后1人
// 注意:每局都是完整4人局(runGame不改),通过记录哪些玩家已赢来模拟"退出"
function runGameWithFightToLast(policy: BotPolicy, gameIdxBase: number = 0): {
  winners: Array<{
    idx: number; selfDraw: boolean; score: number; snapshot: PlayerSnapshot
    handType: string; wonFan: number; winHandType: string
    dicePoints: number[]; diceMultiplier: number; wildTile: string; roundNum: number
    gameMeta: { dicePoints: number[]; diceMultiplier: number; inheritanceMultiplier: number; globalMultiplier: number; flowMultiplier: number; prevRoundWasDraw: boolean; prevRoundWasRebel: boolean }
    winnerDetails: Array<{ name: string; winMode: string; handType: string; baseFan: number; finalPoints: number; handTiles: string; melds: string[]; flowers: string[]; isMenQing: boolean; from?: string; winningTile?: string; extraMultipliers: number; settlementMultiplier: number; globalMultiplier: number; scoreDetails: string[] }>
  }>
  totalSubGames: number
  allEvents: GameEvent[]
  drawCount: number
  turnSnapshots: any[]
} {
  const winners: Array<{
    idx: number; selfDraw: boolean; score: number; snapshot: PlayerSnapshot
    handType: string; wonFan: number; winHandType: string
    dicePoints: number[]; diceMultiplier: number; wildTile: string; roundNum: number
    gameMeta: { dicePoints: number[]; diceMultiplier: number; inheritanceMultiplier: number; globalMultiplier: number; flowMultiplier: number; prevRoundWasDraw: boolean; prevRoundWasRebel: boolean }
    winnerDetails: Array<{ name: string; winMode: string; handType: string; baseFan: number; finalPoints: number; handTiles: string; melds: string[]; flowers: string[]; isMenQing: boolean; from?: string; winningTile?: string; extraMultipliers: number; settlementMultiplier: number; globalMultiplier: number; scoreDetails: string[] }>
  }> = []
  const allEvents: GameEvent[] = []
  const turnSnapshots: any[] = []
  let drawCount = 0
  const _sg0 = Date.now()
  // 已赢的玩家:在后续局中"不积极"(但仍参与,因为runGame固定4人)
  // 简化:4人同策略,每局赢的人都记录,最多3局(3个赢家+1个输家)
  for (let subGame = 0; subGame < 3; subGame++) {
    const _g0 = Date.now()
    const result = runGame(policy, [policy, policy, policy], gameIdxBase + subGame)
    const _g1 = Date.now()
    if (!result || result.winner == null || result.winner < 0) {
      drawCount++
      continue
    }
    if (result.turnSnapshots && result.turnSnapshots.length > 0) {
      turnSnapshots.push(...result.turnSnapshots)
    }
    const winnerIdx = result.winner
    const winEvents = result.events.filter(e => e.action.includes('自摸'))
    const isSelfDraw = winEvents.length > 0
    const snapshot = result.snapshots?.[winnerIdx] || { name: AI_NAMES[winnerIdx], hand: '', melds: [], flowers: [], meldSources: [0,0,0,0], wildTile: '' }
    // winnerDetails[0].handType 已有 getWinInfo 计算好的正确值
    const winHandType = result.winnerDetails?.[0]?.handType || '未知'
    const wonFan = result.winnerDetails?.[0]?.finalPoints || 0
    // 把 result.gameMeta (骰子/继承信息) 和 winnerDetails (花牌/门清等) 都合并进 winners
    winners.push({
      idx: winnerIdx,
      selfDraw: isSelfDraw,
      score: result.scores[winnerIdx],
      snapshot,
      handType: winHandType,
      wonFan,
      winHandType,
      // 新增字段
      dicePoints: [result.dice1, result.dice2],
      diceMultiplier: result.diceMultiplier,
      wildTile: result.wildTile || '无百搭',
      roundNum: result.roundNum,
      gameMeta: result.gameMeta,
      // winnerDetails 里已有 flowers / isMenQing / baseFan / from
      winnerDetails: result.winnerDetails || [],
    })
    allEvents.push(...result.events)
    // 如果已经产生3个赢家(血战到最后一人),结束
    if (winners.length >= 3) break
  }
  const _sg1 = Date.now()
  if (_sg1 - _sg0 > 50) console.error(`[PROFILE] runGameWithFightToLast ${winners.length + drawCount}子局耗时${_sg1 - _sg0}ms`)
  return { winners, totalSubGames: winners.length + drawCount, allEvents, drawCount, turnSnapshots }
}

// ========== Game Loop ==========
function runGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[], gameIdx: number = 0): GameResult | null {
  const g = setupGame(akPolicy, otherPolicies)
  if (!g) return null
  const events: GameEvent[] = []
  const settlementLog: SettlementEntry[] = []
  let turn = 0
  const wildTileStr = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : 'unknown'

  const recordPayment = (from: string, to: string, amount: number, reason: string, mult?: number) => {
    settlementLog.push({ from, to, amount, reason, mult })
  }
  const recordSnapshots = (): PlayerSnapshot[] => {
    return g.players.map(p => {
      const wildTileName = (g.wildSuit && g.wildValue) ? tileStr({suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }) : '无百搭'
      const concealedTiles = normalizeHand(p.hand).filter(t => !isFlower(t))
      const sortedHand = sortTiles(concealedTiles)
      const handWithWildMark = sortedHand.map(t => {
        const base = tileStr(t)
        return (g.wildSuit && g.wildValue && t.suit === g.wildSuit && t.value === g.wildValue) ? base + '*' : base
      }).join(' ')
      return {
        name: p.name, hand: handWithWildMark,
        melds: p.exposedMelds.map(m => `${m.type===MeldType.TRIPLET?'碰':m.type===MeldType.SEQUENCE?'吃':m.type===MeldType.KONG?'杠':'?'}:${m.tiles.map(t=>tileStr(t)).join(' ')}`),
        flowers: p.flowerTiles.map(t => tileStr(t)),
        meldSources: [...p.meldSources],
        wildTile: wildTileName
      }
    })
  }

  // 构建完整 GameResult 的辅助函数
  const buildResult = (winnerIdx: number, winInfo: ReturnType<typeof getWinInfo>, from?: string, winningTile?: string): GameResult => {
    // console.error(`[BUILD_DEBUG] winner=${AI_NAMES[winnerIdx]} mode=${winMode} handType="${winHandType}"`)
    const snapshots = recordSnapshots()
    const wSnap = snapshots[winnerIdx]
    const wPlayer = g.players[winnerIdx]
    const isMenQing = wPlayer.exposedMelds.length === 0
    const winnerDetails = [{
      name: wSnap.name, winMode: winInfo.winMode, handType: winInfo.handType, baseFan: winInfo.baseFan, finalPoints: winInfo.finalPoints,
      handTiles: winInfo.displayHand, melds: wSnap.melds, flowers: wSnap.flowers, isMenQing, from, winningTile,
      extraMultipliers: winInfo.extraMultipliers, settlementMultiplier: winInfo.settlementMultiplier, globalMultiplier: winInfo.globalMultiplier, scoreDetails: winInfo.scoreDetails
    }]
    const totalPot = g.players.reduce((s, p) => s + Math.abs(p.score), 0)
    return {
      winner: winnerIdx, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier,
      settlementLog, snapshots, roundNum: turn, wildTile: tileStr({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }), wildSuit: g.wildSuit, wildValue: g.wildValue,
      dice1: g.dice1, dice2: g.dice2, diceMultiplier: g.diceMultiplier, totalPot, winnerDetails, turnSnapshots,
      gameMeta: { dicePoints: [g.dice1, g.dice2], diceMultiplier: g.diceMultiplier, inheritanceMultiplier: g.inheritanceMultiplier, globalMultiplier: g.gameMultiplier, flowMultiplier: g.inheritanceMultiplier, prevRoundWasDraw, prevRoundWasRebel: false }
    }
  }

  const buildDrawResult = (): GameResult => {
    const snapshots = recordSnapshots()
    const totalPot = g.players.reduce((s, p) => s + Math.abs(p.score), 0)
    return {
      winner: -1, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier,
      settlementLog, snapshots, roundNum: turn, wildTile: tileStr({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }), wildSuit: g.wildSuit, wildValue: g.wildValue,
      dice1: g.dice1, dice2: g.dice2, diceMultiplier: g.diceMultiplier, totalPot, winnerDetails: [], turnSnapshots, isDraw: true,
      gameMeta: { dicePoints: [g.dice1, g.dice2], diceMultiplier: g.diceMultiplier, inheritanceMultiplier: g.inheritanceMultiplier, globalMultiplier: g.gameMultiplier, flowMultiplier: g.inheritanceMultiplier, prevRoundWasDraw, prevRoundWasRebel: false }
    }
  }

  // 生成赢家牌型信息
  const getWinInfo = (player: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, winMode: string, winningTile?: Tile): { handType: string; baseFan: number; finalPoints: number; extraMultipliers: number; settlementMultiplier: number; globalMultiplier: number; scoreDetails: string[]; displayHand: string; winMode: string } => {
    try {
      // reconstruct hand: concealed tiles ARE the current hand, exposed melds are separate
      // tiles from exposed melds were ALREADY consumed from the hand (副露出去) - do NOT add back
      const wsVal = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
      const tilesWithWild = player.hand  // use concealed tiles as-is
      const scorePreview = calculateScore({
        handTiles: tilesWithWild, exposedMelds: player.exposedMelds,
        flowerTiles: player.flowerTiles, handTypes: [],
        isSelfDrawn: isSelfDraw, isKongFlower: isKongWin,
        isRobbingKong: false, isMenQing: player.exposedMelds.length === 0,
        wildTileSuit: g.wildSuit, wildTileValue: g.wildValue,
        rawRoundMultiplier: g.diceMultiplier,
        rawInheritMultiplier: g.inheritanceMultiplier,
        settlementMultiplier: SETTLEMENT_MULT
      })
      const scoreTypeName = scorePreview.handTypeName || ''
      const scoreTypeList = scoreTypeName.split(',').map(t => t.trim()).filter(Boolean)
      const types = scoreTypeList.length > 0 ? scoreTypeList as HandType[] : detectHandTypes(tilesWithWild, player.exposedMelds, wsVal)
      // canWin also check to compare
      const canWinResult = canWin(tilesWithWild, player.exposedMelds, wsVal)
      const validTypes = types.filter(t => t !== HandType.STANDARD)
      // 诊断
      if (validTypes.length === 0) {
        // console.error(`[无效诊断] ${player.name} concealed=${player.hand.length} exposed=${player.exposedMelds.length} total=${tilesWithWild.length} canWin=${canWinResult.canWin} types=[${types.join(',')}] canWinTypes=[${canWinResult.types.join(',')}] ws=${wsVal}`)
      }
      const result = calculateScore({
        handTiles: tilesWithWild, exposedMelds: player.exposedMelds,
        flowerTiles: player.flowerTiles, handTypes: validTypes.length > 0 ? validTypes : types,
        isSelfDrawn: isSelfDraw, isKongFlower: isKongWin,
        isRobbingKong: false, isMenQing: player.exposedMelds.length === 0,
        wildTileSuit: g.wildSuit, wildTileValue: g.wildValue,
        rawRoundMultiplier: g.diceMultiplier,
        rawInheritMultiplier: g.inheritanceMultiplier,
        settlementMultiplier: SETTLEMENT_MULT
      })
      const finalTypes = validTypes.length > 0 ? validTypes : types
      const concealedTiles = !isSelfDraw && winningTile
        ? normalizeHand(player.hand).filter(t => !(t.id === winningTile.id))
        : normalizeHand(player.hand)
      const displayHand = sortTiles([...concealedTiles]).map(t => {
        const base = tileStr(t)
        return (g.wildSuit && g.wildValue && t.suit === g.wildSuit && t.value === g.wildValue) ? `${base}*` : base
      }).join(' ')
      return {
        handType: result.handTypeName || finalTypes[0] || '未知牌型',
        baseFan: result.baseFan || 0,
        finalPoints: result.finalPoints || 0,
        extraMultipliers: result.extraMultipliers || 1,
        settlementMultiplier: result.settlementMultiplier || SETTLEMENT_MULT,
        globalMultiplier: result.globalMultiplier || g.gameMultiplier,
        scoreDetails: result.details || [],
        displayHand,
        winMode
      }
    } catch (e) {
      return { handType: '未知牌型', baseFan: 0, finalPoints: 0, extraMultipliers: 1, settlementMultiplier: SETTLEMENT_MULT, globalMultiplier: g.gameMultiplier, scoreDetails: [], displayHand: '', winMode }
    }
  }

  const getValidatedWinInfo = (
    player: BotPlayer,
    isSelfDraw: boolean,
    isKongWin: boolean,
    winMode: string,
    winningTile?: Tile
  ): ReturnType<typeof getWinInfo> | null => {
    const winInfo = getWinInfo(player, isSelfDraw, isKongWin, winMode, winningTile)
    if (!Number.isFinite(winInfo.baseFan) || winInfo.baseFan <= 0) return null
    if (winInfo.handType.includes('未知牌型') || winInfo.handType.includes('无效牌型')) return null

    const wildTileId = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
    const detectedTypes = detectHandTypes(player.hand, player.exposedMelds, wildTileId, isSelfDraw, player.flowerTiles.length)
      .filter(type => type !== HandType.STANDARD)
    if (detectedTypes.length === 0) return null

    if (!isSelfDraw && !canDiscardWinByProjectRules(player.hand, player.exposedMelds, detectedTypes, player.flowerTiles)) {
      return null
    }

    return winInfo
  }

  // 垃圾胡检测:3n+2 + 数牌≥2门 + 至少一个顺子(不是碰碰胡)
  const isGarbageHand = (tiles: Tile[], isWildTile: WildTileChecker): boolean => {
    const nonFlower = tiles.filter(t => !isFlower(t))
    const nonHonor = nonFlower.filter(t => t.suit === TileSuit.DOTS || t.suit === TileSuit.CHARACTERS || t.suit === TileSuit.BAMBOOS)
    const suitCount = new Set(nonHonor.map(t => t.suit)).size
    if (suitCount < 2) return false
    // 检查是否存在顺子(3张连续同花色)
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      const vals = nonHonor.filter(t => t.suit === suit).map(t => t.value).sort((a, b) => a - b)
      const uniqueVals = [...new Set(vals)]
      for (let i = 0; i < uniqueVals.length - 2; i++) {
        if (uniqueVals[i + 2] - uniqueVals[i] === 2) {
          const needed = [uniqueVals[i], uniqueVals[i] + 1, uniqueVals[i] + 2]
          const wildCount = needed.filter(v => isWildTile({ suit, value: v })).length
          const naturalCount = needed.filter(v => vals.includes(v)).length
          if (naturalCount + wildCount >= 3) return true
        }
      }
    }
    return false
  }

  // 胡牌检测：baseline 用简化版本，跳过 findBestAssignment 的昂贵 DFS
  // 只用 detectTypes 快速判断，避免 34^wildCount 的搜索爆炸
  const canWinWithType = (tiles: Tile[], p: BotPlayer, makeWT: (p: BotPlayer) => WildTileChecker, kongCount = 0): boolean => {
    const wildTileId = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
    const fastWin = canWin(tiles, p.exposedMelds, wildTileId, true)
    if (!fastWin.canWin) return false
    const verifiedWin = canWin(tiles, p.exposedMelds, wildTileId)
    if (!verifiedWin.canWin) return false

    const handTypes = detectHandTypes(tiles, p.exposedMelds, wildTileId, true, p.flowerTiles.length)
      .filter(type => type !== HandType.STANDARD)
    if (handTypes.length === 0) return false

    const scoreResult = calculateScore({
      handTiles: tiles,
      exposedMelds: p.exposedMelds,
      flowerTiles: p.flowerTiles,
      handTypes,
      isSelfDrawn: true,
      isKongFlower: kongCount > 0,
      isRobbingKong: false,
      isMenQing: p.exposedMelds.length === 0,
      wildTileSuit: g.wildSuit,
      wildTileValue: g.wildValue,
      settlementMultiplier: SETTLEMENT_MULT
    })

    if (!Number.isFinite(scoreResult.baseFan) || scoreResult.baseFan <= 0) return false
    if (scoreResult.handTypeName === '无效牌型' || scoreResult.handTypeName.startsWith('未知牌型')) return false
    return true
  }

  const log = (player: string, action: string, detail: string) => { events.push({ turn, player, action, detail }) }

  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  // 每回合快照追踪
  const turnSnapshots: TurnSnapshot[] = []
  let prevDrawn: Tile | null = null
  let prevFlower: Tile | null = null
  let prevDiscard: Tile | null = null

  turnSnapshots.push({
    turn: -1, currentPlayer: -1, drawnTile: 'NEW_GAME', discardedTile: String(gameIdx),
    lastDiscardBy: -1, lastDiscard: '-',
    players: [],
    wildTile: g.wildSuit && g.wildValue ? tileStr({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }) : '无百搭',
    gameMultiplier: g.gameMultiplier,
    gameIdx,
    wallIdx: g.wallIdx
  } as any)

  const recordTurnSnapshot = (curr: number, extras?: {
    actionType?: string
    claimTile?: string
    claimFrom?: string
    flowerTile?: string
    winType?: string
    winTile?: string
    wallBefore?: number
  }) => {
    const lastDiscard = g.discardPile[g.discardPile.length - 1] || null
    turnSnapshots.push({
      turn,
      currentPlayer: curr,
      drawnTile: prevDrawn ? tileStr(prevDrawn) : '-',
      discardedTile: prevDiscard ? tileStr(prevDiscard) : '-',
      actionType: extras?.actionType || 'turn',
      claimTile: extras?.claimTile || '-',
      claimFrom: extras?.claimFrom || '-',
      flowerTile: extras?.flowerTile || (prevFlower ? tileStr(prevFlower) : '-'),
      winType: extras?.winType || '-',
      winTile: extras?.winTile || '-',
      wallBefore: typeof extras?.wallBefore === 'number' ? extras.wallBefore : g.wallIdx,
      lastDiscardBy: lastDiscard ? (g.playerDiscards[0].findIndex(d => d.id === lastDiscard.id) >= 0 ? 0 :
        g.playerDiscards[1].findIndex(d => d.id === lastDiscard.id) >= 0 ? 1 :
        g.playerDiscards[2].findIndex(d => d.id === lastDiscard.id) >= 0 ? 2 : 3) : -1,
      lastDiscard: lastDiscard ? tileStr(lastDiscard) : '-',
      players: g.players.map(p => ({
        name: p.name,
        hand: sortTiles([...p.hand]).map(t => {
          const base = tileStr(t)
          return isWT(t, p) ? base + '*' : base
        }).join(' '),
        exposed: p.exposedMelds.map(m =>
          `${m.type === MeldType.TRIPLET ? '碰' : m.type === MeldType.SEQUENCE ? '吃' : m.type === MeldType.KONG ? '明杠' : m.type === MeldType.CONCEALED_KONG ? '暗杠' : '?'}:${sortTiles([...m.tiles]).map(t => tileStr(t)).join(' ')}`
        ),
        meldSources: [...p.meldSources],
        handCount: p.hand.length,
        flowers: p.flowerTiles.map(t => tileStr(t))
      })),
      wildTile: g.wildSuit && g.wildValue ? tileStr({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }) : '无百搭',
      gameMultiplier: g.gameMultiplier,
      gameIdx,
      wallIdx: g.wallIdx
    } as any)
  }
  recordTurnSnapshot(g.current)

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]
    turn = round
    const drawn = drawTile(g, player)
    if (!drawn) return buildDrawResult()
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); prevFlower = drawn; prevDrawn = null; prevDiscard = null as Tile | null; recordTurnSnapshot(curr, { actionType: 'flower', flowerTile: tileStr(drawn) }); continue }
    log(player.name, '摸牌', tileStr(drawn))
    prevDrawn = drawn
    prevFlower = null

    // Self-draw win check
    // 注意:用player.hand(原始,含花牌)而不是normalizeHand--canWin内部会处理花牌
    const kongCount = player.exposedMelds.filter(m => m.type === MeldType.KONG).length
    const winCheck = canWinWithType(player.hand, player, makeWT, kongCount)
    // [DEBUG] 临时记录每次winCheck的结果
    // if (round % 4 === 0) { const sh = tenpaiDist(player.hand, player.exposedMelds, g.wildSuit, g.wildValue); console.error(`[DEBUG] round=${round} player=${player.name} hand=${player.hand.length} wild=${g.wildSuit}-${g.wildValue} shanten=${sh} winCheck=${winCheck}`) }
    if (winCheck) {
      // 普通胡也可以自摸(不需要特殊牌型)
      let winChance = player.policy.selfWinChance
      const wildCount = player.hand.filter(t => isWT(t, player)).length
      winChance += wildCount * player.policy.selfWinWildBoost
      winChance -= player.exposedMelds.length * player.policy.meldPenalty
      if (Math.random() < winChance) {
        const validatedSelfWinInfo = getValidatedWinInfo(player, true, false, '自摸')
        if (!validatedSelfWinInfo) continue
        const baseScore = calcScore(player, true, false, g.diceMultiplier, g.inheritanceMultiplier)
        // 自摸:每人赔baseScore,赢家得3倍
        player.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
        // 互包结算
        applyBaoSettlement(g, curr, true, null, baseScore)
        for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '自摸') }
        log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}] [手牌${player.hand.length}张+副露${player.exposedMelds.length}]`)
        const winInfo = getWinInfo(player, true, false, '自摸')
        recordTurnSnapshot(curr)
        return buildResult(curr, validatedSelfWinInfo)
      }
    }

    // AnKong / JiaGang (policy-driven)
    for (const ak of canAnKong(player)) {
      if (Math.random() < player.policy.anKongChance) {
        applyAnKong(player, ak)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWinWithType(normalizeHand(player.hand), player, makeWT, player.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const validatedKongWinInfo = getValidatedWinInfo(player, true, true, '杠上自摸')
            if (!validatedKongWinInfo) continue
            const baseScore = calcScore(player, true, true, g.diceMultiplier, g.inheritanceMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            const winInfo = getWinInfo(player, true, true, '杠上自摸')
            recordTurnSnapshot(curr)
            return buildResult(curr, validatedKongWinInfo)
          }
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      if (Math.random() < player.policy.kakanAggression) {
        applyJiaGang(player, jg)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWinWithType(normalizeHand(player.hand), player, makeWT, player.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const validatedJiaKongWinInfo = getValidatedWinInfo(player, true, true, '杠上自摸')
            if (!validatedJiaKongWinInfo) continue
            const baseScore = calcScore(player, true, true, g.diceMultiplier, g.inheritanceMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            const winInfo1 = getWinInfo(player, true, true, '杠上自摸')
            recordTurnSnapshot(curr)
            return buildResult(curr, validatedJiaKongWinInfo)
          }
        }
      }
    }

    player.isTing = isTing(player.hand, player.exposedMelds.length, makeWT(player))

    const discard = aiDiscard(player, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, curr)
    player.hand = player.hand.filter(t => t && t.id !== discard.id)
    player.discardedTiles.push(discard)
    g.discardPile.push(discard)
    g.playerDiscards[curr].push(discard)
    log(player.name, '出牌', `${tileStr(discard)} [手牌: ${player.hand.map(t => tileStr(t)).join(' ')}]`)
    prevDiscard = discard

    // Others check hu
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWinWithType(testHand, opp, makeWT, opp.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
        opp.hand = normalizeHand(testHand)
        const validatedDiscardWinInfo = getValidatedWinInfo(opp, false, false, '放冲', discard)
        if (!validatedDiscardWinInfo) {
          opp.hand = opp.hand.filter(t => t.id !== discard.id)
          continue
        }
        let huChance = opp.policy.discardHuChance
        const wildCount = opp.hand.filter(t => isWT(t, opp)).length
        huChance -= wildCount * opp.policy.discardHuWildPenalty
        if (opp.exposedMelds.length === 0) huChance -= opp.policy.discardHuMenQingPenalty
        if (Math.random() < huChance) {
          const score = calcScore(opp, false, false, g.diceMultiplier, g.inheritanceMultiplier)
          opp.score += score; player.score -= score
          // 互包结算:如果有人对opp有包三,且放炮者不是包家
          applyBaoSettlement(g, other, false, curr, score)
          recordPayment(player.name, opp.name, score, '放炮')
          const winInfo2 = getWinInfo(opp, false, false, '放冲', discard)
          recordTurnSnapshot(curr)
          return buildResult(other, validatedDiscardWinInfo, player.name, tileStr(discard))
        }
        opp.hand = opp.hand.filter(t => t.id !== discard.id)
      }
    }

    // Check peng
    const nextPlayer = (curr + 1) % 4
    const prevPlayer = (curr + 3) % 4
    const oppositePlayer = (curr + 2) % 4

    const claimRouteGame = toRouteGameView(g)
    const wallRemaining = Math.max(0, g.deck.length - g.wallIdx)
    let meldTaken = false
    for (const otherIdx of [nextPlayer, prevPlayer, oppositePlayer]) {
      const opp = g.players[otherIdx]
      if (opp.exposedMelds.length >= 4) continue  // 最多4组牌
      const routePlayer = claimRouteGame.players[otherIdx]
      const wildChecker = makeWT(opp)
      const passShanten = computeShanten(routePlayer.hand.concealedTiles, opp.exposedMelds.length, wildChecker)
      const passEffective = countEffectiveTiles(routePlayer.hand.concealedTiles, opp.exposedMelds.length, wildChecker)
      const tableThreat = estimateTrainingTableThreat(g, otherIdx)
      const routeState = evaluateRouteState({
        game: claimRouteGame as any,
        player: routePlayer as any,
        hand: routePlayer.hand.concealedTiles,
        shanten: passShanten,
        effectiveTiles: passEffective,
        tableThreat,
        wallRemaining,
        previousRouteState: (opp as any).__routeStateMemory || null
      })

      if (canMingKong(opp, discard) && checkChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)) {
        const candidateHand = routePlayer.hand.concealedTiles.filter((tile, idx, arr) => {
          if (tile.suit !== discard.suit || tile.value !== discard.value) return true
          const priorMatches = arr.slice(0, idx).filter(other => other.suit === discard.suit && other.value === discard.value).length
          return priorMatches >= 3
        })
        const { shanten, effective } = evaluateClaimResultingHand(candidateHand, opp.exposedMelds.length + 1, wildChecker)
        const routeDecision = evaluateRouteClaim({
          action: ActionType.KONG,
          player: routePlayer as any,
          game: claimRouteGame as any,
          claimTile: markWild(discard, wildChecker),
          routeState,
          candidateHand,
          candidateShanten: shanten,
          candidateEffective: effective,
          passShanten,
          passEffective,
          tableThreat,
          wallRemaining,
        })
        let kongChance = combineClaimChance(
          opp.policy.minkanAggression ?? opp.policy.kongChance,
          toRouteClaimProbability(routeDecision.allowed, routeDecision.tuneDelta, passShanten, shanten, passEffective, effective)
        )
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue) {
          kongChance += opp.policy.kongWildBoost
        }
        if (Math.random() < kongChance) {
          applyMingKong(opp, discard, curr)
          const extra = drawTile(g, opp)
          if (extra && !isFlower(extra) && canWinWithType(normalizeHand(opp.hand), opp, makeWT, opp.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const validatedMingKongWinInfo = getValidatedWinInfo(opp, true, true, '杠上自摸')
            if (!validatedMingKongWinInfo) {
            } else {
            const baseScore = calcScore(opp, true, true, g.diceMultiplier, g.inheritanceMultiplier)
            opp.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= baseScore }
            applyBaoSettlement(g, otherIdx, true, null, baseScore)
            const kongWinInfo = getWinInfo(opp, true, true, '杠上自摸')
            recordTurnSnapshot(otherIdx)
            return buildResult(otherIdx, validatedMingKongWinInfo)
            }
          }
          const kongDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== kongDiscard.id)
          opp.discardedTiles.push(kongDiscard)
          g.discardPile.push(kongDiscard)
          g.playerDiscards[otherIdx].push(kongDiscard)
          prevDiscard = kongDiscard
          ;(opp as any).__routeStateMemory = routeState
          recordTurnSnapshot(otherIdx)
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }

      if (canPeng(opp, discard) && checkChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)) {
        const candidateHand = routePlayer.hand.concealedTiles.filter((tile, idx, arr) => {
          if (tile.suit !== discard.suit || tile.value !== discard.value) return true
          const priorMatches = arr.slice(0, idx).filter(other => other.suit === discard.suit && other.value === discard.value).length
          return priorMatches >= 2
        })
        const { shanten, effective } = evaluateClaimResultingHand(candidateHand, opp.exposedMelds.length + 1, wildChecker)
        const routeDecision = evaluateRouteClaim({
          action: ActionType.PENG,
          player: routePlayer as any,
          game: claimRouteGame as any,
          claimTile: markWild(discard, wildChecker),
          routeState,
          candidateHand,
          candidateShanten: shanten,
          candidateEffective: effective,
          passShanten,
          passEffective,
          tableThreat,
          wallRemaining,
        })
        let pengChance = combineClaimChance(
          opp.policy.pengChance,
          toRouteClaimProbability(routeDecision.allowed, routeDecision.tuneDelta, passShanten, shanten, passEffective, effective)
        )
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue) {
          pengChance += opp.policy.pengWildBoost
        }
        if (Math.random() < pengChance) {
          if (!applyPeng(opp, discard, curr)) continue
          opp.chowPongExclusion = updateChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)
          const pengDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== pengDiscard.id)
          opp.discardedTiles.push(pengDiscard)
          g.discardPile.push(pengDiscard)
          g.playerDiscards[otherIdx].push(pengDiscard)
          prevDiscard = pengDiscard
          ;(opp as any).__routeStateMemory = routeState
          recordTurnSnapshot(otherIdx)
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // Check chow (only next player)
    const nextP = g.players[nextPlayer]
    if (canChow(nextP, discard) && checkChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)) {
      const routePlayer = claimRouteGame.players[nextPlayer]
      const wildChecker = makeWT(nextP)
      const passShanten = computeShanten(routePlayer.hand.concealedTiles, nextP.exposedMelds.length, wildChecker)
      const passEffective = countEffectiveTiles(routePlayer.hand.concealedTiles, nextP.exposedMelds.length, wildChecker)
      const tableThreat = estimateTrainingTableThreat(g, nextPlayer)
      const routeState = evaluateRouteState({
        game: claimRouteGame as any,
        player: routePlayer as any,
        hand: routePlayer.hand.concealedTiles,
        shanten: passShanten,
        effectiveTiles: passEffective,
        tableThreat,
        wallRemaining,
        previousRouteState: (nextP as any).__routeStateMemory || null
      })
      const chowOptions = getTrainingChowOptionIds(nextP.hand, discard)
      let bestRouteProb = 0
      for (const option of chowOptions) {
        const removeIds = option.filter(id => id !== discard.id)
        const candidateHand = routePlayer.hand.concealedTiles.filter(tile => !removeIds.includes(tile.id))
        const { shanten, effective } = evaluateClaimResultingHand(candidateHand, nextP.exposedMelds.length + 1, wildChecker)
        const routeDecision = evaluateRouteClaim({
          action: ActionType.CHOW,
          player: routePlayer as any,
          game: claimRouteGame as any,
          claimTile: markWild(discard, wildChecker),
          routeState,
          candidateHand,
          candidateShanten: shanten,
          candidateEffective: effective,
          passShanten,
          passEffective,
          tableThreat,
          wallRemaining,
        })
        bestRouteProb = Math.max(
          bestRouteProb,
          toRouteClaimProbability(routeDecision.allowed, routeDecision.tuneDelta, passShanten, shanten, passEffective, effective)
        )
      }
      if (Math.random() < combineClaimChance(nextP.policy.chowChance, bestRouteProb)) {
      if (!applyChow(nextP, discard, curr)) continue
      nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)
      const chowDiscard = aiDiscard(nextP, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, nextPlayer)
      nextP.hand = nextP.hand.filter(t => t.id !== chowDiscard.id)
      nextP.discardedTiles.push(chowDiscard)
      g.discardPile.push(chowDiscard)
      g.playerDiscards[nextPlayer].push(chowDiscard)
      prevDiscard = chowDiscard
      recordTurnSnapshot(nextPlayer)
      g.current = (nextPlayer + 1) % 4
      continue
      }
    }

    g.current = nextPlayer
    recordTurnSnapshot(curr)
    consecutiveDraws++
    if (consecutiveDraws > MAX_ROUNDS * 4) return buildDrawResult()
  }
  return buildDrawResult()
}

// ========== Batch Evaluation ==========
interface EvalResult {
  akScore: number; akWins: number
  winRates: Record<string, number>; scores: Record<string, number>
  draws: number
  bigWin: { gameIdx: number; result: GameResult; score: number } | null
  bigLoss: { gameIdx: number; result: GameResult; score: number } | null
  // 模板输出用
  totalGames: number; winGames: number; selfDrawGames: number; discardWinGames: number
  fightToLastGames: number  // 血战到最后一人(多赢家局)
  bigWinGames: number       // 大牌局数(清碰/风一色/风碰/门清清一色)
  menqingWinGames: number  // 门清胡牌局数
  metricsFitness: number    // 指标导向fitness(用于基线训练)
  worstSingleLoss: { loser: string; score: number; gameIdx: number; result: GameResult } | null
  biggestSingleWin: { winner: string; score: number; gameIdx: number; result: GameResult } | null
  avgRounds: number; avgPot: number; avgWinnerPoints: number
  highMultGameCount: number  // 骰子>=2的局数
  handTypeCounts: Record<string, number>  // 手牌类型分布统计
}

function formatRoundMarkdown(roundNo: number, evalResult: EvalResult, bestPolicy: BotPolicy): string {
  const ts = toBeijingDisplay()
  const drawGames = evalResult.draws
  const nonDrawGames = evalResult.totalGames - drawGames
  const loss = evalResult.worstSingleLoss
  const lines: string[] = []

  lines.push(`## Round ${roundNo} (${ts})`)
  lines.push('')

  // === Summary 表格 ===
  const tc = evalResult.handTypeCounts || {}
  const tw = Math.max(1, evalResult.winGames)
  const huRate = ((nonDrawGames / Math.max(1, evalResult.totalGames)) * 100).toFixed(1)
  const liuRate = ((drawGames / Math.max(1, evalResult.totalGames)) * 100).toFixed(1)
  const selfR = evalResult.winGames > 0 ? ((evalResult.selfDrawGames / evalResult.winGames) * 100).toFixed(1) : '0.0'
  const disR = evalResult.winGames > 0 ? ((evalResult.discardWinGames / evalResult.winGames) * 100).toFixed(1) : '0.0'
  const fighR = nonDrawGames > 0 ? ((evalResult.fightToLastGames / nonDrawGames) * 100).toFixed(1) : '0.0'
  const bigR = evalResult.winGames > 0 ? ((evalResult.bigWinGames / evalResult.winGames) * 100).toFixed(1) : '0.0'
  const menR = evalResult.winGames > 0 ? ((evalResult.menqingWinGames / evalResult.winGames) * 100).toFixed(1) : '0.0'

  lines.push('### 📊 训练指标 Summary')
  lines.push('')
  lines.push('| 指标 | 值 | K哥目标 | 达标 |')
  lines.push('|------|-----|---------|------|')
  lines.push(`| 胡牌率 | ${huRate}% | ≥90% | ${parseFloat(huRate) >= 90 ? '✅' : '❌'} |`)
  lines.push(`| 流局率 | ${liuRate}% | <10% | ${parseFloat(liuRate) < 10 ? '✅' : '❌'} |`)
  lines.push(`| 自摸率 | ${selfR}% | 40-60% | ${parseFloat(selfR) >= 40 && parseFloat(selfR) <= 60 ? '✅' : '❌'} |`)
  lines.push(`| 捉冲率 | ${disR}% | 40-60% | ${parseFloat(disR) >= 40 && parseFloat(disR) <= 60 ? '✅' : '❌'} |`)
  lines.push(`| 血战率 | ${fighR}% | >80% | ${parseFloat(fighR) > 80 ? '✅' : '❌'} |`)
  lines.push(`| 大牌率 | ${bigR}% | 3-8% | ${parseFloat(bigR) >= 3 && parseFloat(bigR) <= 8 ? '✅' : '❌'} |`)
  lines.push(`| 门清率 | ${menR}% | 7-12% | ${parseFloat(menR) >= 7 && parseFloat(menR) <= 12 ? '✅' : '❌'} |`)
  lines.push(`| Fitness | ${evalResult.metricsFitness.toFixed(1)} | ↑ | - |`)
  lines.push('')

  // === 胡牌牌型分布表格 ===
  lines.push('### 🀄 胡牌牌型分布')
  lines.push('')
  lines.push('| 牌型 | 局数 | 占比 | K哥目标 |')
  lines.push('|------|------|------|---------|')
  const handTypes = [
    { name: '混一色', count: tc['混一色'] || 0, target: '≥40%' },
    { name: '碰碰胡', count: tc['碰碰胡'] || 0, target: '>25%' },
    { name: '清一色', count: tc['清一色'] || 0, target: '>20%' },
    { name: '清碰', count: tc['清碰'] || 0, target: '~5%' },
    { name: '风一色', count: tc['风一色'] || 0, target: '~5%' },
    { name: '风碰', count: tc['风碰'] || 0, target: '~1%' },
    { name: '混碰', count: tc['混碰'] || 0, target: '-' },
    { name: '八花', count: tc['八花'] || 0, target: '-' },
    { name: '四百搭', count: tc['四百搭'] || 0, target: '-' },
  ]
  for (const ht of handTypes) {
    lines.push(`| ${ht.name} | ${ht.count} | ${(ht.count / tw * 100).toFixed(1)}% | ${ht.target} |`)
  }
  lines.push('')

  // === 详细指标 ===
  lines.push('### 训练明细')
  lines.push(`- Games: ${evalResult.totalGames}`)
  lines.push(`- 胡牌局: ${nonDrawGames} (${huRate}%)`)
  lines.push(`- 流局: ${drawGames} (${liuRate}%)`)
  const fightRate = nonDrawGames > 0 ? (evalResult.fightToLastGames / nonDrawGames * 100).toFixed(2) : '0.00'
  lines.push(`- 血战到最后一人: ${evalResult.fightToLastGames} (${fightRate}%)`)
  lines.push(`- 平均回合: ${evalResult.avgRounds.toFixed(2)}`)
  lines.push(`- 平均总筹码: ${evalResult.avgPot.toFixed(2)}`)
  lines.push(`- 自摸率(胡牌中): ${(evalResult.selfDrawGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- 大牌率(胡牌中): ${(evalResult.bigWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- 门清胡牌率(胡牌中): ${(evalResult.menqingWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- 胜者平均最终点: ${evalResult.avgWinnerPoints.toFixed(2)}`)
  lines.push(`- Fitness: ${evalResult.metricsFitness.toFixed(4)}`)

  lines.push('')
  lines.push('### 本轮最佳策略参数')
  lines.push('```json')
  lines.push(JSON.stringify(bestPolicy, null, 2))
  lines.push('```')

  // 格式化单局明细的辅助函数
  const formatGameDetail = (gameResult: GameResult, gameIdx: number, label: string, playerName: string, score: number): string[] => {
    const gLines: string[] = []
    const r = gameResult
    const gm = r.multiplier
    const totalPot = r.totalPot || r.scores.reduce((s, sc) => s + Math.abs(sc), 0)
    gLines.push(`#### ${label}`)
    gLines.push(`- ${label.includes('赢') ? '最大赢利' : '最大亏损'}: ${playerName} ${score} 点(绝对值 ${Math.abs(score)})`)
    gLines.push(`- 局号: ${gameIdx}`)
    gLines.push(`- 回合: ${r.roundNum}`)
    gLines.push(`- 总筹码: ${totalPot}`)
    gLines.push(`- 百搭: ${r.wildTile || '无百搭'}`)
    gLines.push(`- 回合/全局倍数信息:`)
    gLines.push(`  - 骰子点数: ${r.dice1 || '?'} + ${r.dice2 || '?'}`)
    gLines.push(`  - 骰子倍数(清晰明了): x${r.diceMultiplier || '?'}`)
    gLines.push(`  - 全局倍数: x${gm}`)

    // 胡牌玩家明细
    gLines.push('')
    gLines.push('- 输出该局所有胡牌玩家明细')
    if (r.winnerDetails && r.winnerDetails.length > 0) {
      for (const w of r.winnerDetails) {
        gLines.push(`  - 玩家: ${w.name}`)
        gLines.push(`    - 胡牌方式: ${w.winMode}${w.from ? ` (来自 ${w.from})` : ''}`)
        gLines.push(`    - 牌型/基础番/最终点: ${w.handType} / ${w.baseFan} / ${w.finalPoints}`)
        gLines.push(`    - 手牌牌面: ${w.handTiles || '(空)'}`)
        gLines.push(`    - 门口牌(吃/碰/杠): ${w.melds.length > 0 ? w.melds.join(' ; ') : '(无)'}`)
        gLines.push(`    - 花牌: ${w.flowers.length > 0 ? w.flowers.join(' ') : '(无)'}`)
      }
    } else {
      gLines.push('  - (无胡牌玩家)')
    }

    // 三口/四口关系
    const baoRelations: string[] = []
    for (const snap of r.snapshots || []) {
      for (let ci = 0; ci < 4; ci++) {
        if (snap.meldSources[ci] >= 3) {
          const partner = r.snapshots?.[ci]
          if (partner) {
            const level = snap.meldSources[ci] >= 4 ? '四口' : '三口'
            baoRelations.push(`  - ${snap.name} <-> ${partner.name}: ${level} (A->B:${snap.meldSources[ci]}, B->A:${partner.meldSources?.[r.snapshots.indexOf(snap)] || 0})`)
          }
        }
      }
    }
    if (baoRelations.length > 0) {
      gLines.push('')
      gLines.push('- 三口/四口关系')
      gLines.push(...baoRelations)
    }

    // 结算逐笔明细
    gLines.push('')
    gLines.push('- 结算逐笔明细(谁付给谁、倍率和金额)')
    if (r.settlementLog && r.settlementLog.length > 0) {
      for (const s of r.settlementLog) {
        const multStr = s.mult ? ` (${s.amount / s.mult}x${s.mult})` : ''
        gLines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
      }
    } else {
      gLines.push('  - (无)')
    }
    return gLines
  }

  lines.push('')
  lines.push('### 最大输赢局明细(本轮)')
  if (!loss && !evalResult.biggestSingleWin) {
    lines.push('- 本轮无有效对局数据')
    return lines.join('\n')
  }

  // 最大赢局
  if (evalResult.biggestSingleWin) {
    const win = evalResult.biggestSingleWin
    lines.push(...formatGameDetail(win.result, win.gameIdx, '最大赢局', win.winner, win.score))
  }

  // 最大输局
  if (loss) {
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(...formatGameDetail(loss.result, loss.gameIdx, '最大输局', loss.loser, loss.score))
  }

  // 高倍数统计
  lines.push('')
  lines.push(`- 高倍数局数(骰子>=2): ${evalResult.highMultGameCount}`)

  return lines.join('\n')
}

// 检测大牌类型(清碰/风一色/风碰/混碰)
function isBigHand(result: GameResult, winnerIdx: number): boolean {
  try {
    const snap = result.snapshots?.[winnerIdx]
    if (!snap) return false
    const ws = `${g_wildSuit}-${g_wildValue}`
    const types = detectHandTypes(
      // 从snapshot重建手牌有困难,改用events判断
      [], [], false, 0, null
    )
    // 备选方案:从结算倍数判断(大牌倍数通常很高)
    return result.multiplier >= 4  // 简化判断:高倍局视为大牌
  } catch { return false }
}

function evaluatePolicy(policy: BotPolicy, games: number): EvalResult {
  const scores: Record<string, number> = {}
  const wins: Record<string, number> = {}
  for (const n of AI_NAMES) { scores[n] = 0; wins[n] = 0 }
  let draws = 0
  let winGames = 0
  let winnerInstances = 0
  let selfDrawGames = 0
  let discardWinGames = 0
  let fightToLastGames = 0
  let bigWinGames = 0
  let menqingWinGames = 0
  const handTypeCounts: Record<string, number> = {}
  const winningGames: any[] = []
  const multiWinDist = [0, 0, 0, 0]
  let bigWin: EvalResult['bigWin'] = null
  let bigLoss: EvalResult['bigLoss'] = null
  let worstSingleLoss: EvalResult['worstSingleLoss'] = null
  let biggestSingleWin: EvalResult['biggestSingleWin'] = null
  let totalRounds = 0
  let totalPot = 0
  let totalWinnerPoints = 0
  let winnerPointCount = 0
  let highMultGameCount = 0
  const allTurnSnapshots: any[] = []
  prevRoundWasDraw = false
  const _t0 = Date.now()
  let _gameTimes: number[] = []

  for (let g = 0; g < games; g++) {
    const _g0 = Date.now()
    const bloodResult = runGameWithFightToLast(policy, g * 10)
    const _g1 = Date.now()
    if (games <= 10 || g % 10 === 9) _gameTimes.push(_g1 - _g0)
    if (bloodResult.turnSnapshots && bloodResult.turnSnapshots.length > 0) {
      allTurnSnapshots.push(...bloodResult.turnSnapshots)
    }

    // 全流局
    if (bloodResult.winners.length === 0) {
      draws++
      prevRoundWasDraw = true
      continue
    }
    prevRoundWasDraw = false

    // 血战到最后一人(≥2个赢家)
    if (bloodResult.winners.length >= 2) {
      fightToLastGames++
    }
    if (bloodResult.winners.length >= 1 && bloodResult.winners.length <= 4) {
      multiWinDist[bloodResult.winners.length - 1]++
    }

    // 本总局发生胡牌
    winGames++

    // 每个赢家都算一个胡牌实例
    for (const w of bloodResult.winners) {
      winnerInstances++
      wins[AI_NAMES[w.idx]] = (wins[AI_NAMES[w.idx]] || 0) + 1

      if (w.selfDraw) selfDrawGames++
      else discardWinGames++

      if (w.snapshot && w.snapshot.melds.length === 0) {
        menqingWinGames++
      }

      if (Math.abs(w.score) >= 2000) {
        bigWinGames++
      }

      const ht = w.handType || '普通'
      handTypeCounts[ht] = (handTypeCounts[ht] || 0) + 1
      winningGames.push({
        gameIdx: g,
        winnerName: AI_NAMES[w.idx],
        isSelfDraw: w.selfDraw,
        akDelta: w.score,
        handTypes: ht && ht !== '未知' ? [ht] : ['普通'],
        wonFan: w.wonFan || 0,  // 用于 globalMaxWin 排序
        hand: w.winnerDetails?.[0]?.handTiles || w.snapshot?.hand || '',
        melds: w.snapshot?.melds || [],
        flowers: w.winnerDetails?.[0]?.flowers || [],
        baseFan: w.winnerDetails?.[0]?.baseFan ?? '?',
        isMenQing: w.winnerDetails?.[0]?.isMenQing ?? ((w.snapshot?.melds || []).length === 0),
        extraMultipliers: w.winnerDetails?.[0]?.extraMultipliers ?? 1,
        settlementMultiplier: w.winnerDetails?.[0]?.settlementMultiplier ?? SETTLEMENT_MULT,
        scoreDetails: w.winnerDetails?.[0]?.scoreDetails || [],
        multiplier: w.gameMeta?.globalMultiplier ?? (w.gameMeta ? Math.min(8, w.gameMeta.diceMultiplier * w.gameMeta.inheritanceMultiplier) : (w.diceMultiplier || 1)),
        roundNum: w.roundNum || 1,
        wildTile: w.wildTile || '无百搭',
        gameMeta: w.gameMeta || {
          dicePoints: w.dicePoints ? `${w.dicePoints[0]}+${w.dicePoints[1]}` : '?',
          diceMultiplier: w.diceMultiplier ?? '?',
          inheritanceMultiplier: 1,
          globalMultiplier: w.diceMultiplier ?? 1,
          prevRoundWasDraw: false,
          prevRoundWasRebel: false,
          flowMultiplier: 1,
        },
        // winnerDetails 里每个赢家的详细信息
        winnerDetails: w.winnerDetails || [],
        // 放冲牌与来源
        winningTile: w.winnerDetails?.[0]?.winningTile || '',
        winningFrom: w.winnerDetails?.[0]?.from || '',
        result: {
          winner: w.idx,
          snapshots: [w.snapshot],
          multiplier: w.gameMeta?.globalMultiplier ?? (w.diceMultiplier || 1),
          scores: [0,0,0,0],
          wildTile: w.wildTile || '无百搭',
          gameMeta: w.gameMeta || { dicePoints: w.dicePoints || [0,0], diceMultiplier: w.diceMultiplier || 1, inheritanceMultiplier: 1, globalMultiplier: w.diceMultiplier || 1, prevRoundWasDraw: false, prevRoundWasRebel: false, flowMultiplier: 1 },
          winnerDetails: w.winnerDetails || [],
        }
      })
    }

    // 用最后一个子局的result来做输赢明细
    const detailResult = runGame(policy, [policy, policy, policy])

    if (detailResult) {
      totalRounds += detailResult.roundNum
      const pot = detailResult.scores.reduce((s, sc) => s + Math.abs(sc), 0)
      totalPot += pot
      if (detailResult.diceMultiplier >= 2) highMultGameCount++
      if (detailResult.winnerDetails) {
        for (const wd of detailResult.winnerDetails) {
          totalWinnerPoints += wd.finalPoints
          winnerPointCount++
        }
      }
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += detailResult.scores[i] * SETTLEMENT_MULT
      }
      const maxIdx = detailResult.scores.indexOf(Math.max(...detailResult.scores))
      const minIdx = detailResult.scores.indexOf(Math.min(...detailResult.scores))

      if (!bigWin || detailResult.scores[maxIdx] * SETTLEMENT_MULT > bigWin.score) {
        bigWin = { gameIdx: g, result: detailResult, score: detailResult.scores[maxIdx] * SETTLEMENT_MULT }
      }
      if (!bigLoss || detailResult.scores[minIdx] * SETTLEMENT_MULT < bigLoss.score) {
        bigLoss = { gameIdx: g, result: detailResult, score: detailResult.scores[minIdx] * SETTLEMENT_MULT }
      }
      for (let i = 0; i < 4; i++) {
        const delta = detailResult.scores[i] * SETTLEMENT_MULT
        if (!worstSingleLoss || delta < worstSingleLoss.score) {
          worstSingleLoss = { loser: AI_NAMES[i], score: delta, gameIdx: g, result: detailResult }
        }
        if (!biggestSingleWin || delta > biggestSingleWin.score) {
          biggestSingleWin = { winner: AI_NAMES[i], score: delta, gameIdx: g, result: detailResult }
        }
      }
    }
  }

  const winRates: Record<string, number> = {}
  for (const n of AI_NAMES) winRates[n] = (wins[n] || 0) / games

  // 计算指标导向fitness(核心目标:压低流局率,提升进攻与胡牌)
  const drawRate = draws / games
  const huRate = 1 - drawRate
  const readyRate = games > 0 ? fightToLastGames / games : 0
  const avgRounds = games > 0 ? totalRounds / games : 0
  const selfDrawRate = winnerInstances > 0 ? selfDrawGames / winnerInstances : 0
  const discardWinRate = winnerInstances > 0 ? discardWinGames / winnerInstances : 0
  const fightToLastRate = (games - draws) > 0 ? fightToLastGames / Math.max(1, games - draws) : 0
  const bigHandRate = winnerInstances > 0 ? bigWinGames / winnerInstances : 0
  const menqingWinRate = winnerInstances > 0 ? menqingWinGames / winnerInstances : 0

  let mf = 0

  // 1) 流局率重罚:>10% 后每+1% 扣 500;>50% 额外加倍
  const drawExcess = Math.max(0, drawRate - 0.10)
  let drawPenalty = drawExcess * 100000
  if (drawRate > 0.50) drawPenalty *= 2
  mf -= drawPenalty

  // 2) 胡牌率重奖:每+1% 奖 500(以 50% 为基线)
  mf += Math.max(0, huRate - 0.50) * 50000

  // 3) 听牌率(readyRate)激励:<50% 惩罚,>80% 奖励
  if (readyRate < 0.50) mf -= (0.50 - readyRate) * 20000
  if (readyRate > 0.80) mf += (readyRate - 0.80) * 15000

  // 4) 速度奖励:<30 回合奖励,>80 回合惩罚
  if (avgRounds < 30) mf += (30 - avgRounds) * 400
  if (avgRounds > 80) mf -= (avgRounds - 80) * 500

  // 5) 自摸/捉冲平衡(低优先级,维持 40%-60%)
  mf -= Math.max(0, Math.abs(selfDrawRate - 0.50) - 0.10) * 250
  mf -= Math.max(0, Math.abs(discardWinRate - 0.50) - 0.10) * 250

  // 血战率(保留轻量约束)
  mf -= Math.max(0, 0.80 - fightToLastRate) * 300

  // 6) 大牌率(目标 3%-8%):当胡牌率<50% 时不奖励大牌,避免为大牌牺牲胡牌
  if (huRate >= 0.50) {
    if (bigHandRate < 0.03) mf -= (0.03 - bigHandRate) * 300
    if (bigHandRate > 0.08) mf -= (bigHandRate - 0.08) * 300
  }

  // 门清胡牌率(保留但弱化)
  if (menqingWinRate < 0.07) mf -= (0.07 - menqingWinRate) * 200
  if (menqingWinRate > 0.12) mf -= (menqingWinRate - 0.12) * 200

  // 手牌类型分布(K哥目标:混一色40% 碰碰胡25% 清一色20% 清碰/风一色5% 风碰1%)
  if (winnerInstances > 10) {
    const total = winnerInstances
    const dist = {
      halfFlush: (handTypeCounts['混一色'] || 0) / total,
      allPungs: (handTypeCounts['碰碰胡'] || 0) / total,
      fullFlush: (handTypeCounts['清一色'] || 0) / total,
      qingPeng: ((handTypeCounts['清碰'] || 0) + (handTypeCounts['风一色'] || 0)) / total,
      fengPeng: (handTypeCounts['风碰'] || 0) / total,
    }
    mf += Math.min(dist.halfFlush, 0.45) * 300
    mf += Math.min(dist.allPungs, 0.30) * 250
    mf += Math.min(dist.fullFlush, 0.25) * 200
    mf += Math.min(dist.qingPeng, 0.10) * 100
    if (dist.fengPeng < 0.005) mf -= 50
  }

  const _t1 = Date.now()
  const _elapsed = _t1 - _t0
  const _avgGame = _gameTimes.length > 0 ? (_gameTimes.reduce((a, b) => a + b, 0) / _gameTimes.length) : (_elapsed / games)
  if (games > 1) console.error(`[PROFILE] ${games}局耗时${_elapsed}ms,平均${_avgGame.toFixed(0)}ms/局`)
  return {
    akScore: scores['AI-AK'] || 0, akWins: wins['AI-AK'] || 0, winRates, scores, draws,
    bigWin, bigLoss, totalGames: games, winGames, winnerInstances, selfDrawGames, discardWinGames,
    fightToLastGames, bigWinGames, menqingWinGames, metricsFitness: mf, worstSingleLoss, biggestSingleWin,
    avgRounds: games > 0 ? totalRounds / games : 0,
    avgPot: games > 0 ? totalPot / games : 0,
    avgWinnerPoints: winnerPointCount > 0 ? totalWinnerPoints / winnerPointCount : 0,
    highMultGameCount,
    handTypeCounts,
    winningGames,
    multiWinDist,
    turnSnapshots: allTurnSnapshots
  }
}

// ========== Main Training Loop (全员收敛) ==========
async function main() {
  const timestamp = toTimestampSlug()
  const mdFile = path.join(OUT_DIR, `baseline-training-${timestamp}.md`)
  const policyFile = path.join(OUT_DIR, `best-policy-baseline-${timestamp}.json`)
  const policyLatest = path.join(OUT_DIR, 'best-policy.json')

  prepareTrainingOutputDir(OUT_DIR)

  // 4人共用同一个策略
  let bestPolicy = loadCharacter('AI-AK')
  let bestScore = -Infinity
  let logLines: string[] = []
  const roundReports: any[] = []

  const header = [
    '# 长清阁麻将 全员基线收敛训练日志',
    '',
    `- 创建时间: ${toBeijingDisplay()} (北京时间)`,
    `- 训练脚本: train-baseline.ts`,
    `- Config: ${ROUNDS} rounds × ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`,
    `- 模式: 4人共用同一策略,血战到最后一人`,
    `- 目标指标:`,
    `  - 胡牌率 ≥90% (流局 <10%)`,
    `  - 血战率 >80%`,
    `  - 自摸率 40-60%`,
    `  - 捉冲率 40-60%`,
    `  - 大牌率 3-8%`,
    `  - 门清胡牌率 7-12%`,
    '',
    '> 每轮记录训练指标 + 策略参数 + 最大输赢局明细 + 结算逐笔',
  ]
  console.log(header.join('\n'))
  logLines.push(...header)

  // Round 0: baseline evaluation
  console.log('\n## 基线成绩(第0轮)')
  logLines.push('\n## 基线成绩(第0轮)')
  process.stdout.write(`  [${toBeijingDisplay()}] 开始评估基准线 (${GAMES_PER_ROUND}局)...\n`)
  const baseline = evaluatePolicy(bestPolicy, GAMES_PER_ROUND)
  process.stdout.write(`  [${toBeijingDisplay()}] 基准线完成\n`)
  bestScore = baseline.metricsFitness
  const baseLine = [
    `| 指标 | 值 | 目标 |`,
    `|------|-----|------|`,
    `| 胡牌率 | ${((1-baseline.draws/GAMES_PER_ROUND)*100).toFixed(1)}% | ≥90% |`,
    `| 流局率 | ${(baseline.draws/GAMES_PER_ROUND*100).toFixed(1)}% | <10% |`,
    `| 自摸率 | ${(baseline.selfDrawGames/Math.max(1,baseline.winGames)*100).toFixed(1)}% | 40-60% |`,
    `| 捉冲率 | ${(baseline.discardWinGames/Math.max(1,baseline.winGames)*100).toFixed(1)}% | 40-60% |`,
    `| 血战率 | ${(baseline.fightToLastGames/Math.max(1,GAMES_PER_ROUND-baseline.draws)*100).toFixed(1)}% | >80% |`,
    `| 大牌率 | ${(baseline.bigWinGames/Math.max(1,baseline.winGames)*100).toFixed(1)}% | 3-8% |`,
    `| 门清率 | ${(baseline.menqingWinGames/Math.max(1,baseline.winGames)*100).toFixed(1)}% | 7-12% |`,
    `| Fitness | ${baseline.metricsFitness.toFixed(1)} | ↑ |`,
  ].join('\n')
  console.log(baseLine)
  logLines.push(baseLine)
  roundReports.push(buildRoundReport(0, baseline, bestPolicy, AI_NAMES, 'train-baseline.ts'))

  const scoreHistory: number[] = [bestScore]
  let plateauCount = 0

  for (let round = 1; round <= ROUNDS; round++) {
    let intensity = 1.0
    if (plateauCount >= 2) intensity = 1.8
    if (plateauCount >= 4) intensity = 2.5

    const candidates: BotPolicy[] = []
    for (let i = 0; i < TRAINING_CANDIDATES; i++) {
      candidates.push(mutatePolicy(bestPolicy, intensity))
    }
    // 轻度变异保底
    candidates.push(mutatePolicy(bestPolicy, intensity * 0.3))

    let roundBestScore = -Infinity
    let roundBestPolicy = bestPolicy
    let roundBigWin: EvalResult['bigWin'] = null
    let roundBigLoss: EvalResult['bigLoss'] = null
    let roundWorstLoss: EvalResult['worstSingleLoss'] = null
    let bestEvalResult: EvalResult | null = null

    const roundLines: string[] = []
    roundLines.push(`\n### 第${round}轮 (强度=${intensity.toFixed(1)}, 停滞=${plateauCount})`)

    for (let c = 0; c < candidates.length; c++) {
      process.stdout.write(`  [${toBeijingDisplay()}] C${c+1}/${candidates.length} 评估中 (${GAMES_PER_ROUND}局)...\n`)
      const result = evaluatePolicy(candidates[c], GAMES_PER_ROUND)
      process.stdout.write(`  [${toBeijingDisplay()}] C${c+1}/${candidates.length} 完成\n`)
      const score = result.metricsFitness
      const huRate = ((1 - result.draws / GAMES_PER_ROUND) * 100).toFixed(0)
      const selfDR = result.winGames > 0 ? (result.selfDrawGames/result.winGames*100).toFixed(0) : '0'
      const discardR = result.winGames > 0 ? (result.discardWinGames/result.winGames*100).toFixed(0) : '0'
      roundLines.push(`  C${c+1}: fitness=${score.toFixed(0)} hu=${huRate}% self=${selfDR}% disc=${discardR}% draws=${result.draws}`)

      if (score > roundBestScore) {
        roundBestScore = score
        roundBestPolicy = candidates[c]
        roundBigWin = result.bigWin
        roundBigLoss = result.bigLoss
        roundWorstLoss = result.worstSingleLoss
        bestEvalResult = result
      }
    }

    let improved = false
    if (roundBestScore > bestScore) {
      bestScore = roundBestScore
      bestPolicy = { ...roundBestPolicy }
      improved = true
      plateauCount = 0
    } else {
      plateauCount++
    }

    scoreHistory.push(roundBestScore)
    if (scoreHistory.length > 10) scoreHistory.shift()

    const statusLine = improved
      ? `  ★ NEW BEST! fitness=${bestScore.toFixed(0)}`
      : `  Best: ${roundBestScore.toFixed(0)} (overall: ${bestScore.toFixed(0)}) [plateau: ${plateauCount}]`
    roundLines.push(statusLine)

    if (bestEvalResult) {
      const dr = bestEvalResult.draws / GAMES_PER_ROUND
      roundLines.push(`  指标: hu=${((1-dr)*100).toFixed(0)}% self=${(bestEvalResult.selfDrawGames/Math.max(1,bestEvalResult.winGames)*100).toFixed(0)}% disc=${(bestEvalResult.discardWinGames/Math.max(1,bestEvalResult.winGames)*100).toFixed(0)}% big=${(bestEvalResult.bigWinGames/Math.max(1,bestEvalResult.winGames)*100).toFixed(0)}% mq=${(bestEvalResult.menqingWinGames/Math.max(1,bestEvalResult.winGames)*100).toFixed(0)}%`)
    }

    console.log(roundLines.join('\n'))
    logLines.push(...roundLines)

    // 收集轮次报告(用于主日志 formatRoundReport)
    if (bestEvalResult) {
      await saveRoundToMariaDB(round, bestEvalResult, roundBestPolicy)
      const report = buildRoundReport(round, bestEvalResult, roundBestPolicy, AI_NAMES, 'train-baseline.ts')
      roundReports.push(report)
      const filename = writeRoundFile(OUT_DIR, report, DETAIL_MODE)
      console.log(`  → 轮次详情已保存: ${filename}`)
    }
  }

  // Final evaluation: 1×1 模式跳过;否则跑 GAMES_PER_ROUND 局(无需跑1000局,够快)
  const finalEvalGames = (ROUNDS === 1 && GAMES_PER_ROUND === 1) ? 0 : Math.max(GAMES_PER_ROUND, 100)
  let finalEval: any = null
  let metrics: any = null
  if (finalEvalGames > 0) {
    console.log('\n--- 最终评估 ---')
    logLines.push('\n--- 最终评估 ---')
    process.stdout.write(`[${toBeijingDisplay()}] 最终评估开始 (${finalEvalGames}局)...\n`)
    finalEval = evaluatePolicy(bestPolicy, finalEvalGames)
    process.stdout.write(`[${toBeijingDisplay()}] 最终评估完成\n`)
    const finalLines = [
      `| 指标 | 值 | 目标 | 达标 |`,
      `|------|-----|------|------|`,
      `| 胡牌率 | ${((1-finalEval.draws/finalEvalGames)*100).toFixed(1)}% | ≥90% | ${((1-finalEval.draws/finalEvalGames)>=0.9?'✅':'❌')} |`,
      `| 流局率 | ${(finalEval.draws/finalEvalGames*100).toFixed(1)}% | <10% | ${(finalEval.draws/finalEvalGames<0.1?'✅':'❌')} |`,
      `| 自摸率 | ${(finalEval.selfDrawGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 40-60% | ${(finalEval.selfDrawGames/Math.max(1,finalEval.winGames)>=0.4&&finalEval.selfDrawGames/Math.max(1,finalEval.winGames)<=0.6?'✅':'❌')} |`,
      `| 捉冲率 | ${(finalEval.discardWinGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 40-60% | ${(finalEval.discardWinGames/Math.max(1,finalEval.winGames)>=0.4&&finalEval.discardWinGames/Math.max(1,finalEval.winGames)<=0.6?'✅':'❌')} |`,
      `| 血战率 | ${(finalEval.fightToLastGames/Math.max(1,finalEvalGames-finalEval.draws)*100).toFixed(1)}% | >80% | ${(finalEval.fightToLastGames/Math.max(1,finalEvalGames-finalEval.draws)>0.8?'✅':'❌')} |`,
      `| 大牌率 | ${(finalEval.bigWinGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 3-8% | ${((finalEval.bigWinGames/Math.max(1,finalEval.winGames))>=0.03&&(finalEval.bigWinGames/Math.max(1,finalEval.winGames))<=0.08?'✅':'❌')} |`,
      `| 门清率 | ${(finalEval.menqingWinGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 7-12% | ${((finalEval.menqingWinGames/Math.max(1,finalEval.winGames))>=0.07&&(finalEval.menqingWinGames/Math.max(1,finalEval.winGames))<=0.12?'✅':'❌')} |`,
      ``,
      `Fitness: ${finalEval.metricsFitness.toFixed(0)}`,
    ]
    finalLines.push(`\n  最佳策略参数 (关键):`)
    const keyParams: (keyof BotPolicy)[] = [
      'selfWinChance', 'discardHuChance', 'pengChance', 'chowChance', 'anKongChance',
      'allPungsPursuit', 'pureFlushPursuit', 'halfFlushWeight', 'sevenPairsPursuit',
      'menqingKeepBonus', 'noWildDoubleAwareness',
      'wild0Aggression', 'wild1Aggression', 'wild2Aggression', 'wild3PlusAggression',
      'wild0MenqingKeep', 'wild1MenqingKeep', 'wild2MenqingKeep',
      'multHighValueBias', 'wallLateDefense', 'safeTilePriority',
    ]
    for (const k of keyParams) {
      const val = (bestPolicy as any)[k]
      finalLines.push(`    ${k}: ${typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4)) : val}`)
    }
    console.log(finalLines.join('\n'))
    logLines.push(...finalLines)
    await saveRoundToMariaDB(ROUNDS + 1, finalEval, bestPolicy)
    metrics = {
      fitness: finalEval.metricsFitness,
      huRate: 1 - finalEval.draws / finalEvalGames,
      drawRate: finalEval.draws / finalEvalGames,
      selfDrawRate: finalEval.selfDrawGames / Math.max(1, finalEval.winGames),
      discardWinRate: finalEval.discardWinGames / Math.max(1, finalEval.winGames),
      fightToLastRate: finalEval.fightToLastGames / Math.max(1, finalEvalGames - finalEval.draws),
      bigHandRate: finalEval.bigWinGames / Math.max(1, finalEval.winGames),
      menqingWinRate: finalEval.menqingWinGames / Math.max(1, finalEval.winGames),
      totalGames: ROUNDS * GAMES_PER_ROUND,
      note: `Baseline convergence - ${ROUNDS}x${GAMES_PER_ROUND}`
    }
  } else {
    // 1×1 模式:用最后一轮的评估结果作为 metrics
    if (roundReports.length > 0) {
      const last = roundReports[roundReports.length - 1]
      metrics = {
        fitness: last.metrics.fitness,
        huRate: last.metrics.winGames / Math.max(1, last.metrics.totalGames),
        drawRate: last.metrics.drawGames / Math.max(1, last.metrics.totalGames),
        selfDrawRate: last.metrics.selfDrawGames / Math.max(1, last.metrics.winGames),
        discardWinRate: last.metrics.discardWinGames / Math.max(1, last.metrics.winGames),
        fightToLastRate: last.metrics.fightToLastGames / Math.max(1, last.metrics.totalGames - last.metrics.drawGames),
        bigHandRate: last.metrics.bigWinGames / Math.max(1, last.metrics.winGames),
        menqingWinRate: last.metrics.menqingWinGames / Math.max(1, last.metrics.winGames),
        totalGames: last.metrics.totalGames,
        note: `Baseline quick test - ${ROUNDS}x${GAMES_PER_ROUND}`
      }
    }
  }

  // Save all 4 AIs with same policy
  if (metrics) {
    for (const name of AI_NAMES) {
      saveCharacter(name, { ...bestPolicy, id: name }, metrics)
    }
    console.log(`\nAll 4 AIs saved: ${AI_NAMES.join(', ')}`)
  }

  // 主日志:用 formatRoundReport 统一格式(Summary + 每圈明细 when DETAIL_MODE)
  const mainOut: string[] = [...logLines]
  for (const r of roundReports) {
    if (r.round === 0) continue
    mainOut.push(formatRoundReport(r, false))
  }
  fs.writeFileSync(mdFile, mainOut.join('\n'), 'utf-8')
  fs.writeFileSync(policyFile, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  fs.writeFileSync(policyLatest, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  const indexFile = writeIndexFile(OUT_DIR, roundReports)

  console.log(`\nLog: ${mdFile}`)
  console.log(`Policy: ${policyFile}`)
  console.log(`Index: ${indexFile}`)
  process.exit(0)
}

// ========== 单局测试:强制进攻,打印每回合完整明细 ==========
function testOneGame() {
  // 优先用 GA 优化过的 policy(best-policy.json),fallback 到默认参数
  let policy: BotPolicy | null = null
  try {
    const policyPath = path.join(__dirname, '..', 'training-output', 'best-policy.json')
    if (fs.existsSync(policyPath)) {
      const saved = JSON.parse(fs.readFileSync(policyPath, 'utf-8'))
      if (saved.policy) { policy = saved.policy; console.error(`[TEST] 使用 GA 优化过的 policy`) }
    }
  } catch (e) { /* ignore */ }
  if (!policy) {
    policy = {
      selfWinChance: 1.0, discardHuChance: 1.0,
      anKongChance: 0.8, kakanAggression: 0.8,
      menqingKeepBonus: 2.5, wildPairBonus: 0.2, adjacentBonus: 0.15,
      selfWinWildBoost: 0.05, discardHuWildPenalty: 0.05, discardHuMenQingPenalty: 0.0,
      pengChance: 0.9, pengWildBoost: 0.1, meldPenalty: 0.0,
      chowChance: 0.5, routeThreshold: 0.3,
      safeDrawThreshold: 0.4, riskySafeThreshold: 0.6,
      flowermeldsToKeep: 1,
    }
  }

  console.error('[TEST] 启动单局测试,强制胡牌模式...')
  const result = runGame(policy, [policy, policy, policy])

  const winnerDetail = result.winnerDetails?.[0]
  if (result.isDraw) {
    console.error(`[TEST] 结果: 流局(${result.roundNum}回合)`)
  } else {
    console.error(`[TEST] 结果: ${winnerDetail?.name || result.winner} 通过 ${winnerDetail?.winMode || '?'} 获胜`)
    console.error(`[TEST] 牌型: ${winnerDetail?.handType || '?'} 番数: ${winnerDetail?.baseFan || 0} 最终得分: ${winnerDetail?.finalPoints || 0}`)
    console.error(`[TEST] 手牌: ${winnerDetail?.handTiles || '?'}`)
    console.error(`[TEST] 副露: ${(winnerDetail?.melds || []).join(' | ') || '无'}`)
    console.error(`[TEST] 花牌: ${(winnerDetail?.flowers || []).join(' ')}`)
    console.error(`[TEST] 门清: ${winnerDetail?.isMenQing ? '是' : '否'}`)
  }
  console.error(`[TEST] 总回合数: ${result.roundNum}`)
  console.error(`[TEST] 百搭: ${result.wildTile || '无'}`)

  // 打印每回合快照(合并格式:一圈=4人各摸打一次,有吃碰/杠则断开重开)
  // --detail 开关:控制是否输出每圈明细到控制台
  if (DETAIL_MODE && result.turnSnapshots && result.turnSnapshots.length > 0) {
    console.error('\n========== 每回合明细 ==========')
    let circleCount = 0
    let prevExposed: string[] = []   // 4家上次的副露字符串(检测吃碰)
    let circleStart = 0               // 当前圈的第一个快照索引
    let snapIdx = 0
    while (snapIdx < result.turnSnapshots.length) {
      const snap = result.turnSnapshots[snapIdx]
      const currExposed = snap.players.map(p => p.exposed.join('|'))
      // 检测吃碰/杠:4家任一副露变化 → 开新圈
      const hadMeld = prevExposed.length > 0 && currExposed.some((ex, i) => ex !== prevExposed[i])
      // 新圈条件:(1)首快照 (2)有吃碰 (3)回到起始玩家(完整4人了一圈)
      const backToStart = snapIdx > 0 && snap.currentPlayer === result.turnSnapshots[circleStart].currentPlayer
      if (snapIdx === 0 || hadMeld || backToStart) {
        if (snapIdx > 0 && !backToStart && !hadMeld) {
          // 正常一圈结束但不足4人(游戏结束),跳过
        }
        if (snapIdx > 0) circleCount++
        circleStart = snapIdx
        console.error(`\n【第${circleCount}圈】百搭${snap.wildTile}|×${snap.gameMultiplier}`)
        // 打印4家手牌(整理后)
        for (const pp of snap.players) {
          console.error(`  ${pp.name}:${pp.hand || '(无)'}|副露:${pp.exposed.join('|') || '无'}|${pp.handCount}张`)
        }
      }
      // 打印当前人摸打
      const p = snap.players[snap.currentPlayer]
      console.error(`  ▶ ${p?.name || 'P' + snap.currentPlayer}:摸${snap.drawnTile} → 打${snap.discardedTile}`)
      prevExposed = currExposed
      snapIdx++
    }
  } else if (DETAIL_MODE) {
    console.error('[TEST] 无回合快照(游戏未正常结束)')
  }

  // --detail 开关:控制是否输出每圈明细和 round 文件
  if (DETAIL_MODE) {
    const outDir = path.join(__dirname, '..', 'training-output', 'test')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const testReport = buildRoundReport(-1, {
      totalGames: 1,
      winGames: result.isDraw ? 0 : 1,
      drawGames: result.isDraw ? 1 : 0,
      selfDrawGames: winnerDetail?.winMode === '自摸' ? 1 : 0,
      bigWinGames: (winnerDetail?.finalPoints || 0) > 2000 ? 1 : 0,
      menqingWinGames: winnerDetail?.isMenQing ? 1 : 0,
      fightToLastGames: 0, akScore: 0,
      handTypeDist: winnerDetail ? { [winnerDetail.handType]: 1 } : {},
      winningGames: [],
      turnSnapshots: result.turnSnapshots,
      scores: Object.fromEntries(result.scores.map((s, i) => [i, s])),
    }, policy, AI_NAMES)
    const fname = writeRoundFile(outDir, testReport)
    console.error(`[TEST] 详细报告已写入: ${fname}`)
  }
}

// 入口:统一走主训练流程，detail 只控制是否额外输出单局明细日志
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(e => { console.error('[MAIN ERROR]', e); process.exit(1) })
}
