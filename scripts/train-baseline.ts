/**
 * AI-AK 策略迭代训练器
 * 4个bot: AI-AK(优化目标), AI-小胖, AI-阿水, AI-老赵(固定)
 * 运行 10 rounds × 500 games
 * 每轮只调AI-AK参数，目标: 最高盈利总分
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
import { TileSuit, MeldType, WinType, type Tile, type Meld } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { evaluateAllRoutes, selectDiscard as routeSelectDiscard, shouldClaim as routeShouldClaim, determinePhase, Phase, Route, PARAMS, calcTenpaiDistance as tenpaiDist } from './route-evaluator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUNDS = parseInt(process.argv[2] || '10')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000')
const BASELINE_MODE = process.argv[4] === '--baseline'  // 基线训练：优化指标而非得分
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const OUT_DIR = path.resolve(__dirname, '..', 'training-output')

// ========== MariaDB 备份 ==========
const DB_CONFIG = { host: '192.168.3.241', port: 33061, user: 'openclaw', password: '0penC1aw', database: 'changqingge' }
const RUN_TAG = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

async function saveRoundToMariaDB(roundNo: number, evalResult: EvalResult, policy: BotPolicy): Promise<void> {
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
  bao2ClaimPenalty: number        // 同家2口后的吃碰惩罚（即将触发包三）
  bao3AvoidThreshold: number      // 同家3口后的吃碰完全规避阈值
  baoSelfClaimCaution: number     // 自己被别人吃的口数对策略的影响

  // ====== 牌墙剩余 ======
  wallEarlySpeedPush: number      // 牌墙早期（>80张）：可以慢做牌
  wallMidBalance: number          // 牌墙中期（40-80张）：平衡
  wallLateDefense: number         // 牌墙晚期（<40张）：防守优先

  // ====== 对手听牌/出牌分析 ======
  oppTingDetection: number        // 对手听牌检测敏感度
  safeTilePriority: number        // 安全牌优先级（对手听牌时打安全牌）
  terminalDiscardTingSignal: number // 对手打出幺九→可能已听牌的信号权重
  wildDiaoKeepBonus: number         // 百搭大吊保留奖励（留百搭做最后1张→听所有牌）
  wildDiaoFlushBoost: number        // 百搭大吊+混一色路线加成
  wildDiaoPungBoost: number         // 百搭大吊+碰碰胡路线加成
  // ====== 积分榜动态策略 ======
  scoreBehindRiskBoost: number      // 积分落后时的冒险意愿增强（越落后越激进）
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
  selfWinChance: 1.0, discardHuChance: 1.0,
  selfWinWildBoost: 0.1, discardHuWildPenalty: 0.2, discardHuMenQingPenalty: 0.05,
  pengChance: 1.0, kongChance: 0.9, chowChance: 0.8, anKongChance: 0.95,
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  menqingKeepBonus: 0.0, meldPenalty: 0.00,
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
  'wildMultLowAggression', 'wildMultMidAggression', 'wildMultHighAggression',
  'wild0MenqingKeep', 'wild1MenqingKeep', 'wild2MenqingKeep',
  'wild1BaoPush', 'wild2BaoPush', 'wild3BaoPush',
  'multLowSpeedBias', 'multHighValueBias',
  'discardObsFlushBoost', 'discardObsWeight',
  'bao2ClaimPenalty', 'bao3AvoidThreshold', 'baoSelfClaimCaution',
  'wallEarlySpeedPush', 'wallMidBalance', 'wallLateDefense',
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
  'flushVsPungsBalance', 'honorVsSuitedBalance', 'sequenceVsTripletBias',
]

const PARAM_RANGES: Record<string, { min: number; max: number; step: number }> = {
  selfWinChance:              { min: 0.8,  max: 1.0,  step: 0.02 },
  discardHuChance:            { min: 0.8,  max: 1.0,  step: 0.02 },
  selfWinWildBoost:           { min: 0.0,  max: 0.3,  step: 0.02 },
  discardHuWildPenalty:       { min: 0.0,  max: 0.8,  step: 0.03 },
  discardHuMenQingPenalty:    { min: 0.0,  max: 0.4,  step: 0.02 },
  pengChance:                 { min: 0.7,  max: 1.0,  step: 0.03 },
  kongChance:                 { min: 0.5,  max: 1.0,  step: 0.05 },
  chowChance:                 { min: 0.4,  max: 1.0,  step: 0.05 },
  anKongChance:               { min: 0.5,  max: 1.0,  step: 0.05 },
  pengWildBoost:              { min: 0.0,  max: 0.3,  step: 0.02 },
  kongWildBoost:              { min: 0.0,  max: 0.4,  step: 0.02 },
  chowWildPenalty:            { min: 0.0,  max: 0.5,  step: 0.02 },
  menqingKeepBonus:           { min: 0.0,  max: 15.0, step: 0.5 },
  meldPenalty:                { min: 0.0,  max: 0.3,  step: 0.02 },
  allPungsPursuit:            { min: 0.0,  max: 2.0,  step: 0.1 },
  pureFlushPursuit:           { min: 0.0,  max: 2.0,  step: 0.1 },
  halfFlushWeight:            { min: 0.0,  max: 2.0,  step: 0.1 },
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
  const data = { savedAt: new Date().toISOString(), round: 0, metrics, policy }
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
// suit枚举值→中文（注意TileSuit枚举值是 'wan' 不是 'characters'，'tiao' 不是 'bamboos'）
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
  // 互包追踪：每个对手被我吃了几口（index=对手pos）
  meldSources: number[]
  // 我打过的牌（用于安全牌分析）
  discardedTiles: Tile[]
  // 吃碰排斥状态（K哥铁律）
  chowPongExclusion: ChowPongExclusionState
}

interface GameState {
  deck: Tile[]; wallIdx: number
  players: BotPlayer[]; current: number
  wildSuit?: TileSuit; wildValue?: number
  discardPile: Tile[]
  gameMultiplier: number
  // 每个玩家的出牌记录（用于对手分析）
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
    chowPongExclusion: { eatenSuits: [] as string[], pongedSuits: [] as string[] }
  }))

  const gameMultiplier = nextGameMultiplier()

  return { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [],
    gameMultiplier, playerDiscards: [[], [], [], []] }
}

function drawTile(g: GameState, p: BotPlayer): Tile | null {
  if (g.wallIdx >= g.deck.length) return null
  const tile = g.deck[g.wallIdx++]
  if (!tile) return drawTile(g, p)
  if (isFlower(tile)) { p.flowerTiles.push(tile); return drawTile(g, p) }
  p.hand.push(tile)
  // 诊断：追踪手牌，摸牌后手牌长度
  // const kongC = p.exposedMelds.filter(m => m.type === MeldType.KONG).length
  // const exp = 14 - (p.exposedMelds.length - kongC) * 3 - kongC * 4
  // if (p.hand.length !== exp) // console.error(`DRAW: ${p.name} hand=${p.hand.length} expected=${exp} melds=${p.exposedMelds.length} kongs=${kongC}`)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer) { return buildWildTileChecker(p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null) }

// ========== Meld detection ==========
function canPeng(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  p.hand = normalizeHand(p.hand)  // K哥铁律：过滤undefined+花牌
  return p.hand.filter(t => tileEq(t, tile)).length >= 2
}
function canChow(p: BotPlayer, tile: Tile): boolean {
  if (!tile || isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  p.hand = normalizeHand(p.hand)  // K哥铁律：过滤undefined+花牌
  const v = tile.value
  // 三种吃牌方式：
  // 1) 中间牌：需要 v-1 和 v+1（如 3+5 吃 4），v范围2-8
  // 2) 最低牌（tile是最大的）：需要 v-1 和 v-2（如 3+4 吃 5），v范围3-9
  // 3) 最高牌（tile是最小的）：需要 v+1 和 v+2（如 4+5 吃 3），v范围1-7
  const has = (val: number) => p.hand.some(t => t.suit === tile.suit && t.value === val)
  // 中间牌
  if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) return true
  // 最低牌：tile是被吃序列中最大的
  if (v >= 3 && has(v - 1) && has(v - 2)) return true
  // 最高牌：tile是被吃序列中最小的
  if (v <= 7 && has(v + 1) && has(v + 2)) return true
  return false
}

// ========== 防死牌：第一次吃决定方向 ==========
// 核心规则：
// - 吃：第一次吃决定方向（此门=目标门），之后只能继续吃同一门
// - 碰：任何门都可以碰（但不是零散门碰）
// - 风箭碰永远允许
// - 防止死牌：如果吃过一门，其他门绝对不让吃不让碰
//   （除非其他门已吃过碰过同门——则自动转碰碰胡路线）
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
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 3  // K哥铁律：统一normalize
}
function canAnKong(p: BotPlayer): Tile[] {
  const hand = normalizeHand(p.hand)  // K哥铁律：统一normalize过滤花牌+undefined
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
  p.hand = normalizeHand(p.hand)  // K哥铁律：apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const expected = before === 13 - 3 * meldCount  // K哥铁律：吃碰前手牌=13-3*melds
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
  p.hand = normalizeHand(p.hand)  // K哥铁律：apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const validBefore = before === 13 - 3 * meldCount  // K哥铁律：吃碰前手牌=13-3*melds
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

// ========== Scoring (with multiplier simulation) ==========
// 长清阁倍数：骰子对子(1+1/4+4=×4, 其他对子=×2, 其他=×1)
// 加上流局/造反继承倍数
function rollMultiplier(): number {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  const isPair = d1 === d2
  const isBigPair = isPair && (d1 === 1 || d1 === 4)
  if (isBigPair) return 4  // 1+1 or 4+4 = ×4
  if (isPair) return 2     // other doubles = ×2
  return 1
}

// 模拟全局倍数（流局/造反继承）
let prevRoundWasDraw = false
function nextGameMultiplier(): number {
  const diceMult = rollMultiplier()
  const flowMult = prevRoundWasDraw ? 2 : 1
  // 全局倍数 = min(8, 骰子 × 流局)
  const globalMult = Math.min(8, diceMult * flowMult)
  return globalMult
}

function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, gameMultiplier: number): number {
  const wildTileId = p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null
  const types = detectHandTypes(p.hand, p.exposedMelds, wildTileId, isSelfDraw, p.flowerTiles.length)
  const result = calculateScore({
    handTiles: p.hand, exposedMelds: p.exposedMelds,
    flowerTiles: p.flowerTiles, handTypes: types,
    isSelfDrawn: isSelfDraw, isKongFlower: isKongWin,
    isRobbingKong: false, isMenQing: p.exposedMelds.length === 0,
    wildTileSuit: p.wildSuit, wildTileValue: p.wildValue,
    roundMultiplier: 1, globalMultiplier: gameMultiplier
  })
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== 互包结算 ==========
// ========== 互包结算 ==========
// 包三：同一家吃了/碰了/杠了≥3口 → 当"目标玩家"胡牌时，包家替所有人赔付
// 包四：同一家≥4口 → 包家赔付加倍（×2）
//
// 真实规则：
//   自摸：包家赔全部（3倍base），其他2家不赔不赚
//   放炮：包家赔全部（3倍base），放炮者不赔不赚
//   放炮者就是包家：正常赔付（已经赔了）
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
    const baoPay = baseScore * 3 * mult  // 包家赔付总额（覆盖所有输家）

    if (isSelfDraw) {
      // 自摸：包家赔全部3倍base，其他2家退回
      for (let i = 0; i < 4; i++) {
        if (i === winnerIdx) continue
        if (i === ci) {
          g.players[i].score += baseScore  // 退回之前的1倍
          g.players[i].score -= baoPay     // 赔付3倍（包四时6倍）
        } else {
          g.players[i].score += baseScore  // 退回之前的1倍，不赔了
        }
      }
    } else {
      // 放炮
      if (discarderIdx !== null && discarderIdx !== ci) {
        // 放炮者不是包家 → 包家替放炮者赔付
        g.players[discarderIdx].score += baseScore  // 退回放炮者已扣的
        g.players[ci].score -= baoPay               // 包家赔付全部3倍
      }
      // 放炮者就是包家 → 不变（已经赔了，但赔的是1倍 → 修正为3倍）
      if (discarderIdx === ci) {
        g.players[ci].score += baseScore  // 退回1倍
        g.players[ci].score -= baoPay     // 赔付3倍
      }
    }
  }
}

// ========== 百搭最优利用：全局评分 ==========
// 根据手牌评估不同百搭使用方式的得分，选择最高分
// 长清阁牌型固定/公式得分：
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
    return { bestType: types[0] || '基础胡', bestScore: final, keepWildScore: final }
  }

  const nonWild = hand.filter(t => !isWild(t, undefined, undefined))

  // 评估1：保留百搭不使用（无百搭翻倍×2）
  const typesNoWild = detectHandTypes(nonWild, [], null, false, flowerCount)
  const baseNoWild = typesNoWild.length > 0 ? (typeScore[typesNoWild[0]] || 0) : 0
  const keepWildScore = baseNoWild * 2

  // 评估2：百搭做清一色（最长花色+百搭>=13张）
  let flushScore = 0
  if (meldCount === 0) {
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      const suitTiles = nonWild.filter(t => t.suit === suit)
      const wilds = hand.filter(t => isWild(t, undefined, undefined))
      if (suitTiles.length + wilds.length >= 13) { flushScore = 10; break }
    }
  }

  // 评估3：百搭做风碰/箭碰（固定高分40）
  const honorCount = nonWild.filter(t => isHonor(t)).length
  let fengPengScore = 0
  if (honorCount + wildCount >= 13) fengPengScore = 40  // 风碰=40

  // 评估4：百搭做碰碰胡
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
// 新出牌策略：K哥机械规则（弃最短门单张→风箭→对子）

// ========== 听牌优化器（支持任意张数） ==========
// 摸牌后手牌N张时，找到让"待胡池"最大的弃牌
function findTingPaiDiscard(p: BotPlayer, isWT: (t: Tile, p: BotPlayer) => boolean): Tile | null {
  const hand = p.hand
  const nonFlower = hand.filter(t => !isFlower(t))
  if (nonFlower.length < 2) return null

  const nonWild = nonFlower.filter(t => !isWT(t, p))
  const wildCount = nonFlower.filter(t => isWT(t, p)).length

  // 27种牌（万/筒/条各1-9）
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
      const result = canWin(testHand, p.exposedMelds.length, (t: Tile) => isWT(t, p))
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

// ====== 课程学习：阶段+听牌距离双门控 ======
// 策略：选路线→验证→决策→推进，不是一锤子买卖
// - 前 N 回合：机械规则（最短门→风箭→对子），纯快速搭牌
// - N+ 回合：无论远近都跑 route evaluator，持续选路线+验证+推进
// - 听牌阶段（distance ≤ 2）：精收口，选最优弃牌最大化待胡池
const EARLY_ROUNDS = process.env.EARLY_ROUNDS ? parseInt(process.env.EARLY_ROUNDS) : 3
const TENPAI_THRESHOLD = process.env.TENPAI_THRESHOLD ? parseInt(process.env.TENPAI_THRESHOLD) : 2

function aiDiscard(p: BotPlayer, gameMultiplier: number = 1, discardPile: Tile[] = [],
  wallIdx: number = 0, deckLen: number = 144, allPlayers: BotPlayer[] = [], myPos: number = 0): Tile {
  const hand = p.hand
  const wilds = hand.filter(t => isWT(t, p))
  const nonWild = hand.filter(t => !isWT(t, p))

  // 百搭永远不打
  if (nonWild.length === 0 && wilds.length > 0) return wilds[0]

  // 当前回合：墙剩余 → 推算第几回合
  const myRound = Math.floor((wallIdx / 4) + 0.5)  // 每4张牌≈1回合（每人1张）
  const isEarly = myRound <= EARLY_ROUNDS

  // 阶段1：前N回合 → 纯机械规则（快速搭牌）
  if (isEarly) {
    return mechanicalDiscard(p, discardPile)
  }

  // 阶段2：N+回合 → shanten优先 + route evaluator tie-break
  const phase = determinePhase(hand.length, p.exposedMelds.length, deckLen - wallIdx)
  const tenpaiDistance = tenpaiDist(hand, p.exposedMelds, p.wildSuit, p.wildValue)

  let bestTile = nonWild[0]
  let bestShanten = Infinity
  let bestRouteScore = -Infinity

  for (const t of nonWild) {
    const remaining = hand.filter(x => x.id !== t.id)
    const shanten = tenpaiDist(remaining, p.exposedMelds, p.wildSuit, p.wildValue)
    const remainingPhase = determinePhase(remaining.length, p.exposedMelds.length, deckLen - wallIdx)
    const newRoutes = evaluateAllRoutes(remaining, p.exposedMelds, wilds.length, remainingPhase, deckLen - wallIdx, gameMultiplier >= 4 ? 'trailing' : 'mid', p.wildSuit, p.wildValue)
    const routeScore = newRoutes.reduce((s, r) => s + r.score, 0)

    // shanten 优先（越小越好），route score 做 tie-break（越大越好）
    if (shanten < bestShanten || (shanten === bestShanten && routeScore > bestRouteScore)) {
      bestShanten = shanten
      bestRouteScore = routeScore
      bestTile = t
    }
  }
  return bestTile
}

/** 机械弃牌规则（K哥：最短门单张→风箭→对子）- 仅用于前N回合快速搭牌 */
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

  // 评分：弃牌价值（越低越应该打）
  type DiscardCandidate = { tile: Tile, score: number }
  const candidates: DiscardCandidate[] = []
  const suitNames = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]

  for (const t of mNonWild) {
    let score = 50 // 基础分

    // 风向箭牌：已出现 >2 → 优先打
    if (isHonor(t)) {
      const appeared = discardCount[`${t.suit}-${t.value}`] || 0
      score -= appeared >= 3 ? 30 : appeared >= 2 ? 20 : appeared >= 1 ? 10 : -5
    }

    // 单张（同花色无相邻）
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

  // 按评分排序，选最低分的打
  candidates.sort((a, b) => a.score - b.score)
  return candidates[0].tile
}
// ========== 游戏明细记录 ==========
interface GameEvent { turn: number; player: string; action: string; detail: string }
interface SettlementEntry { from: string; to: string; amount: number; reason: string; mult?: number }
interface PlayerSnapshot { name: string; hand: string; melds: string[]; flowers: string[]; meldSources: number[] }
interface GameResult {
  winner: number; scores: number[]; events: GameEvent[]; multiplier: number
  settlementLog: SettlementEntry[]; snapshots: PlayerSnapshot[]; roundNum: number
  wildTile: string; wildSuit?: TileSuit; wildValue?: number
  dice1: number; dice2: number; diceMultiplier: number
  totalPot: number
  // 每个赢家的详细信息
  winnerDetails: Array<{
    name: string; winMode: string; handType: string; baseFan: number; finalPoints: number
    handTiles: string; melds: string[]; flowers: string[]; isMenQing: boolean; from?: string
  }>
}

// ========== 手牌规范化（胡牌前必调） ==========
function normalizeHand(hand: Tile[]): Tile[] {
  return hand.filter(t => t && !isFlower(t))
}

// ========== 血战到最后一人 ==========
// 每局有人胡牌后，记录赢家，剩余玩家继续开新局，直到最后1人
// 注意：每局都是完整4人局（runGame不改），通过记录哪些玩家已赢来模拟"退出"
function runGameWithFightToLast(policy: BotPolicy): {
  winners: { idx: number; selfDraw: boolean; score: number; snapshot: PlayerSnapshot; handType: string; wonFan: number; winHandType: string }[]
  totalSubGames: number
  allEvents: GameEvent[]
  drawCount: number
} {
  const winners: { idx: number; selfDraw: boolean; score: number; snapshot: PlayerSnapshot; handType: string; wonFan: number; winHandType: string }[] = []
  const allEvents: GameEvent[] = []
  let drawCount = 0
  // 已赢的玩家：在后续局中"不积极"（但仍参与，因为runGame固定4人）
  // 简化：4人同策略，每局赢的人都记录，最多3局（3个赢家+1个输家）
  for (let subGame = 0; subGame < 3; subGame++) {
    const result = runGame(policy, [policy, policy, policy])
    if (!result) {
      drawCount++
      continue
    }
    const winnerIdx = result.winner
    const winEvents = result.events.filter(e => e.action.includes('自摸'))
    const isSelfDraw = winEvents.length > 0
    const snapshot = result.snapshots?.[winnerIdx] || { name: AI_NAMES[winnerIdx], hand: '', melds: [], flowers: [], meldSources: [0,0,0,0] }
    // winnerDetails[0].handType 已有 getWinInfo 计算好的正确值
    const winHandType = result.winnerDetails?.[0]?.handType || '未知'
    const wonFan = result.winnerDetails?.[0]?.finalPoints || 0
    winners.push({ idx: winnerIdx, selfDraw: isSelfDraw, score: result.scores[winnerIdx], snapshot, handType: winHandType, wonFan, winHandType })
    allEvents.push(...result.events)
    // 如果已经产生3个赢家（血战到最后一人），结束
    if (winners.length >= 3) break
  }
  return { winners, totalSubGames: winners.length + drawCount, allEvents, drawCount }
}

// ========== Game Loop ==========
function runGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[]): GameResult | null {
  const g = setupGame(akPolicy, otherPolicies)
  const events: GameEvent[] = []
  const settlementLog: SettlementEntry[] = []
  let turn = 0

  // 骰子
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const isPair = dice1 === dice2
  const isBigPair = isPair && (dice1 === 1 || dice1 === 4)
  const diceMultiplier = isBigPair ? 4 : isPair ? 2 : 1
  const wildTileStr = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : 'unknown'

  const recordPayment = (from: string, to: string, amount: number, reason: string, mult?: number) => {
    settlementLog.push({ from, to, amount, reason, mult })
  }
  const recordSnapshots = (): PlayerSnapshot[] => {
    return g.players.map(p => ({
      name: p.name, hand: p.hand.map(t => tileStr(t)).join(' '),
      melds: p.exposedMelds.map(m => `${m.type===MeldType.TRIPLET?'碰':m.type===MeldType.SEQUENCE?'吃':m.type===MeldType.KONG?'杠':'?'}:${m.tiles.map(t=>tileStr(t)).join(' ')}`),
      flowers: p.flowerTiles.map(t => tileStr(t)),
      meldSources: [...p.meldSources]
    }))
  }

  // 构建完整 GameResult 的辅助函数
  const buildResult = (winnerIdx: number, winMode: string, winPoints: number, winHandType: string, winBaseFan: number, from?: string): GameResult => {
    // console.error(`[BUILD_DEBUG] winner=${AI_NAMES[winnerIdx]} mode=${winMode} handType="${winHandType}"`)
    const snapshots = recordSnapshots()
    const wSnap = snapshots[winnerIdx]
    const wPlayer = g.players[winnerIdx]
    const isMenQing = wPlayer.exposedMelds.length === 0
    const winnerDetails = [{
      name: wSnap.name, winMode, handType: winHandType, baseFan: winBaseFan, finalPoints: winPoints,
      handTiles: wSnap.hand, melds: wSnap.melds, flowers: wSnap.flowers, isMenQing, from
    }]
    const totalPot = g.players.reduce((s, p) => s + Math.abs(p.score), 0)
    return {
      winner: winnerIdx, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier,
      settlementLog, snapshots, roundNum: turn, wildTile: wildTileStr, wildSuit: g.wildSuit, wildValue: g.wildValue,
      dice1, dice2, diceMultiplier, totalPot, winnerDetails
    }
  }

  // 生成赢家牌型信息
  const getWinInfo = (player: BotPlayer, isSelfDraw: boolean, isKongWin: boolean): { handType: string; baseFan: number; finalPoints: number } => {
    try {
      // reconstruct hand: concealed tiles ARE the current hand, exposed melds are separate
      // tiles from exposed melds were ALREADY consumed from the hand (副露出去) — do NOT add back
      const wsVal = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
      const tilesWithWild = player.hand  // use concealed tiles as-is
      const types = detectHandTypes(tilesWithWild, player.exposedMelds, wsVal)
      // canWin also check to compare
      const canWinResult = canWin(tilesWithWild, player.exposedMelds, wsVal ? (t => !!(t.suit === g.wildSuit && t.value === g.wildValue)) : () => false)
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
        roundMultiplier: 1, globalMultiplier: g.gameMultiplier
      })
      const finalTypes = validTypes.length > 0 ? validTypes : types
      return { handType: result.handTypeName || finalTypes[0] || '基础胡', baseFan: result.baseFan || 0, finalPoints: result.finalPoints || 0 }
    } catch (e) {
      return { handType: '基础胡', baseFan: 0, finalPoints: 0 }
    }
  }

  // 胡牌检测：K哥铁律过滤STANDARD + 详细诊断
  const canWinWithType = (tiles: Tile[], p: BotPlayer, makeWT: (p: BotPlayer) => WildTileChecker, kongCount = 0): boolean => {
    const win = canWin(tiles, p.exposedMelds.length, makeWT(p), kongCount)
    if (!win.canWin) {
      // 诊断：哪些无效手牌在尝试胡
      const wsVal = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
      // console.error(`[WIN_BLOCKED] ${p.name} concealed=${tiles.length} exposed=${p.exposedMelds.length} kongCount=${kongCount} canWin=${win.canWin} types=[${win.types.join(',')}] ws=${wsVal}`)
      return false
    }
    const validTypes = win.types.filter(t => t !== HandType.STANDARD)
    if (validTypes.length === 0) {
      const wsVal = g.wildSuit && g.wildValue ? `${g.wildSuit}-${g.wildValue}` : null
      // console.error(`[WIN_BLOCKED_STD] ${p.name} concealed=${tiles.length} exposed=${p.exposedMelds.length} types=[${win.types.join(',')}] ws=${wsVal}`)
      return false
    }
    return true
  }

  const log = (player: string, action: string, detail: string) => { events.push({ turn, player, action, detail }) }

  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]
    turn = round
    const drawn = drawTile(g, player)
    if (!drawn) { return null }
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); continue }
    log(player.name, '摸牌', tileStr(drawn))

    // Self-draw win check
    const normalizedHand = normalizeHand(player.hand)
    const kongCount = player.exposedMelds.filter(m => m.type === MeldType.KONG).length
    const expectedLen = 14 - (player.exposedMelds.length - kongCount) * 3 - kongCount * 4
    if (normalizedHand.length !== expectedLen) {
      // console.error(`⚠️ 手牌长度异常: ${player.name} round=${round} hand=${normalizedHand.length} expected=${expectedLen} melds=${player.exposedMelds.length} kongs=${kongCount} wall=${g.deck.length - g.wallIdx}`)
    }
    const winCheck = canWinWithType(normalizedHand, player, makeWT, kongCount)
    if (winCheck) {
      // 普通胡也可以自摸（不需要特殊牌型）
      let winChance = player.policy.selfWinChance
      const wildCount = player.hand.filter(t => isWT(t, player)).length
      winChance += wildCount * player.policy.selfWinWildBoost
      winChance -= player.exposedMelds.length * player.policy.meldPenalty
      if (Math.random() < winChance) {
        const baseScore = calcScore(player, true, false, g.gameMultiplier)
        // 自摸：每人赔baseScore，赢家得3倍
        player.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
        // 互包结算
        applyBaoSettlement(g, curr, true, null, baseScore)
        for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '自摸') }
        log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}] [手牌${normalizedHand.length}张+副露${player.exposedMelds.length}]`)
        const winInfo = getWinInfo(player, true, false)
        return buildResult(curr, '自摸', winInfo.finalPoints, winInfo.handType, winInfo.baseFan)
      }
    }

    // AnKong / JiaGang (policy-driven)
    for (const ak of canAnKong(player)) {
      if (Math.random() < player.policy.anKongChance) {
        applyAnKong(player, ak)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWinWithType(normalizeHand(player.hand), player, makeWT, player.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            const winInfo = getWinInfo(player, true, true)
            return buildResult(curr, '杠上自摸', winInfo.finalPoints, winInfo.handType, winInfo.baseFan)
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
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            const winInfo1 = getWinInfo(player, true, true)
            return buildResult(curr, '杠上自摸', winInfo1.finalPoints, winInfo1.handType, winInfo1.baseFan)
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

    // Others check hu
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWinWithType(testHand, opp, makeWT, opp.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
        let huChance = opp.policy.discardHuChance
        const wildCount = opp.hand.filter(t => isWT(t, opp)).length
        huChance -= wildCount * opp.policy.discardHuWildPenalty
        if (opp.exposedMelds.length === 0) huChance -= opp.policy.discardHuMenQingPenalty
        if (Math.random() < huChance) {
          opp.hand = normalizeHand(testHand)
          const score = calcScore(opp, false, false, g.gameMultiplier)
          opp.score += score; player.score -= score
          // 互包结算：如果有人对opp有包三，且放炮者不是包家
          applyBaoSettlement(g, other, false, curr, score)
          recordPayment(player.name, opp.name, score, '放炮')
          const winInfo2 = getWinInfo(opp, false, false)
          return buildResult(other, '放冲', winInfo2.finalPoints, winInfo2.handType, winInfo2.baseFan, player.name)
        }
      }
    }

    // Check peng
    const nextPlayer = (curr + 1) % 4
    const prevPlayer = (curr + 3) % 4
    const oppositePlayer = (curr + 2) % 4

    let meldTaken = false
    for (const otherIdx of [nextPlayer, prevPlayer, oppositePlayer]) {
      const opp = g.players[otherIdx]
      if (opp.exposedMelds.length >= 4) continue  // 最多4组牌
      if (canPeng(opp, discard) && !checkChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)) {
        const pengRouteProb = routeShouldClaim('peng', opp.hand, opp.exposedMelds, opp.hand.filter(t=>isWT(t,opp)).length, determinePhase(opp.hand.length, opp.exposedMelds.length, g.deck.length - g.wallIdx), g.deck.length - g.wallIdx, g.gameMultiplier >= 4 ? 'trailing' : 'mid', opp.exposedMelds.length === 0, opp.wildSuit, opp.wildValue)
        let pengChance = opp.policy.pengChance * pengRouteProb
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue)
          pengChance += opp.policy.pengWildBoost
        if (Math.random() < pengChance) {
          if (!applyPeng(opp, discard, curr)) continue
          opp.chowPongExclusion = updateChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)
          const handAfterPeng = normalizeHand(opp.hand)
          if (canWinWithType(handAfterPeng, opp, makeWT, opp.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const huChance = opp.policy.discardHuChance
            if (Math.random() < huChance) {
              const score = calcScore(opp, false, false, g.gameMultiplier)
              opp.score += score; g.players[curr].score -= score
              applyBaoSettlement(g, otherIdx, false, curr, score)
              recordPayment(g.players[curr].name, opp.name, score, '碰后放炮')
              const winInfo3 = getWinInfo(opp, false, false)
              return buildResult(otherIdx, '放冲', winInfo3.finalPoints, winInfo3.handType, winInfo3.baseFan, g.players[curr].name)
            }
          }
          const d = drawTile(g, opp)
          if (!d) return null
          for (const ak of canAnKong(opp)) {
            applyAnKong(opp, ak)
            const extra = drawTile(g, opp)
            if (extra && !isFlower(extra)) {
              if (canWinWithType(normalizeHand(opp.hand), opp, makeWT, opp.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
                const kongBaseScore = calcScore(opp, true, true, g.gameMultiplier)
                opp.score += kongBaseScore * 3
                for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
                applyBaoSettlement(g, otherIdx, true, null, kongBaseScore)
                const winInfo5 = getWinInfo(opp, true, true)
                return buildResult(otherIdx, '杠上自摸', winInfo5.finalPoints, winInfo5.handType, winInfo5.baseFan)
              }
            }
          }
          const pengDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== pengDiscard.id)
          g.discardPile.push(pengDiscard)
          g.current = otherIdx
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // Check chow (only next player)
    const nextP = g.players[nextPlayer]
    // 路线评分计算吃概率（返回 0-1）
    // 课程学习：前N回合不压制吃牌，让AI自由搭牌
    // 吃牌=方向锁定，必须全程 route evaluator 评分（参考防死牌四大准则）
    const chowRouteProb = routeShouldClaim('chow', nextP.hand, nextP.exposedMelds, nextP.hand.filter(t=>isWT(t,nextP)).length, determinePhase(nextP.hand.length, nextP.exposedMelds.length, g.deck.length - g.wallIdx), g.deck.length - g.wallIdx, g.gameMultiplier >= 4 ? 'trailing' : 'mid', nextP.exposedMelds.length === 0, nextP.wildSuit, nextP.wildValue)
    if (canChow(nextP, discard) && !checkChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit) && Math.random() < nextP.policy.chowChance * chowRouteProb) {
      if (!applyChow(nextP, discard, curr)) continue
      nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)
      const handAfterChow = normalizeHand(nextP.hand)
      if (canWinWithType(handAfterChow, nextP, makeWT, nextP.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
        const huChance = nextP.policy.discardHuChance
        if (Math.random() < huChance) {
          const score = calcScore(nextP, false, false, g.gameMultiplier)
          nextP.score += score; g.players[curr].score -= score
          applyBaoSettlement(g, nextPlayer, false, curr, score)
          recordPayment(g.players[curr].name, nextP.name, score, '吃后放炮')
          const winInfo6 = getWinInfo(nextP, false, false)
          return buildResult(nextPlayer, '放冲', winInfo6.finalPoints, winInfo6.handType, winInfo6.baseFan, g.players[curr].name)
        }
      }
      const d = drawTile(g, nextP)
      if (!d) return null
      for (const ak of canAnKong(nextP)) {
        applyAnKong(nextP, ak)
        const extra = drawTile(g, nextP)
        if (extra && !isFlower(extra)) {
          if (canWinWithType(normalizeHand(nextP.hand), nextP, makeWT, nextP.exposedMelds.filter(m => m.type === MeldType.KONG).length)) {
            const kongBaseScore = calcScore(nextP, true, true, g.gameMultiplier)
            nextP.score += kongBaseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== nextPlayer) g.players[i].score -= kongBaseScore }
            applyBaoSettlement(g, nextPlayer, true, null, kongBaseScore)
            const winInfo8 = getWinInfo(nextP, true, true)
            return buildResult(nextPlayer, '杠上自摸', winInfo8.finalPoints, winInfo8.handType, winInfo8.baseFan)
          }
        }
      }
      const chowDiscard = aiDiscard(nextP, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, nextPlayer)
      nextP.hand = nextP.hand.filter(t => t.id !== chowDiscard.id)
      g.discardPile.push(chowDiscard)
      g.current = nextPlayer
      continue
    }

    g.current = nextPlayer
    consecutiveDraws++
    if (consecutiveDraws > MAX_ROUNDS * 4) return null
  }
  return null
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
  fightToLastGames: number  // 血战到最后一人（多赢家局）
  bigWinGames: number       // 大牌局数（清碰/风一色/风碰/门清清一色）
  menqingWinGames: number  // 门清胡牌局数
  metricsFitness: number    // 指标导向fitness（用于基线训练）
  worstSingleLoss: { loser: string; score: number; gameIdx: number; result: GameResult } | null
  biggestSingleWin: { winner: string; score: number; gameIdx: number; result: GameResult } | null
  avgRounds: number; avgPot: number; avgWinnerPoints: number
  highMultGameCount: number  // 骰子>=2的局数
  handTypeCounts: Record<string, number>  // 手牌类型分布统计
}

function formatRoundMarkdown(roundNo: number, evalResult: EvalResult, bestPolicy: BotPolicy): string {
  const ts = new Date().toISOString()
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
  lines.push(`| Fitness | ${evalResult.metricsFitness.toFixed(1)} | ↑ | — |`)
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
    { name: '混碰', count: tc['混碰'] || 0, target: '—' },
    { name: '八花', count: tc['八花'] || 0, target: '—' },
    { name: '四百搭', count: tc['四百搭'] || 0, target: '—' },
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
    gLines.push(`- ${label.includes('赢') ? '最大赢利' : '最大亏损'}: ${playerName} ${score} 点（绝对值 ${Math.abs(score)}）`)
    gLines.push(`- 局号: ${gameIdx}`)
    gLines.push(`- 回合: ${r.roundNum}`)
    gLines.push(`- 总筹码: ${totalPot}`)
    gLines.push(`- 百搭: ${wildTileStrToName(r.wildTile || 'unknown')}`)
    gLines.push(`- 回合/全局倍数信息:`)
    gLines.push(`  - 骰子点数: ${r.dice1 || '?'} + ${r.dice2 || '?'}`)
    gLines.push(`  - 骰子倍数（清晰明了）: x${r.diceMultiplier || '?'}`)
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
        gLines.push(`    - 门口牌（吃/碰/杠）: ${w.melds.length > 0 ? w.melds.join(' ; ') : '(无)'}`)
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
    gLines.push('- 结算逐笔明细（谁付给谁、倍率和金额）')
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
  lines.push('### 最大输赢局明细（本轮）')
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

// 检测大牌类型（清碰/风一色/风碰/混碰）
function isBigHand(result: GameResult, winnerIdx: number): boolean {
  try {
    const snap = result.snapshots?.[winnerIdx]
    if (!snap) return false
    const ws = `${g_wildSuit}-${g_wildValue}`
    const types = detectHandTypes(
      // 从snapshot重建手牌有困难，改用events判断
      [], [], false, 0, null
    )
    // 备选方案：从结算倍数判断（大牌倍数通常很高）
    return result.multiplier >= 4  // 简化判断：高倍局视为大牌
  } catch { return false }
}

function evaluatePolicy(policy: BotPolicy, games: number): EvalResult {
  const scores: Record<string, number> = {}
  const wins: Record<string, number> = {}
  for (const n of AI_NAMES) { scores[n] = 0; wins[n] = 0 }
  let draws = 0
  let winGames = 0
  let selfDrawGames = 0
  let discardWinGames = 0
  let fightToLastGames = 0
  let bigWinGames = 0
  let menqingWinGames = 0
  const handTypeCounts: Record<string, number> = {}
  let bigWin: EvalResult['bigWin'] = null
  let bigLoss: EvalResult['bigLoss'] = null
  let worstSingleLoss: EvalResult['worstSingleLoss'] = null
  let biggestSingleWin: EvalResult['biggestSingleWin'] = null
  let totalRounds = 0
  let totalPot = 0
  let totalWinnerPoints = 0
  let winnerPointCount = 0
  let highMultGameCount = 0
  prevRoundWasDraw = false

  for (let g = 0; g < games; g++) {
    const bloodResult = runGameWithFightToLast(policy)

    // 全流局
    if (bloodResult.winners.length === 0) {
      draws++
      prevRoundWasDraw = true
      continue
    }
    prevRoundWasDraw = false

    // 血战到最后一人（≥2个赢家）
    if (bloodResult.winners.length >= 2) {
      fightToLastGames++
    }

    // 每个赢家都算一局胡牌
    for (const w of bloodResult.winners) {
      winGames++
      wins[AI_NAMES[w.idx]] = (wins[AI_NAMES[w.idx]] || 0) + 1

      // 自摸 vs 捉冲
      if (w.selfDraw) {
        selfDrawGames++
      } else {
        discardWinGames++
      }

      // 门清检查（snapshot中melds为空 → 门清胡牌）
      if (w.snapshot && w.snapshot.melds.length === 0) {
        menqingWinGames++
      }

      // 大牌检查（从最后一个子局的events中找赢家的手牌类型）
      // 简化：高倍局(≥4)视为大牌
      if (bloodResult.allEvents.length > 0) {
        const lastResult = bloodResult.winners.length  // 用赢家得分判断
        if (Math.abs(w.score) >= 2000) {  // 高分视为大牌（约4倍以上）
          bigWinGames++
        }
      }

      // 手牌类型统计（K哥目标分布）
      const ht = w.handType || '未知'
      // console.error(`[HT_DEBUG] winner handType="${ht}" score=${w.score}`)
      handTypeCounts[ht] = (handTypeCounts[ht] || 0) + 1
    }

    // 用最后一个子局的result来做输赢明细
    // 重新跑一局拿完整的GameResult（用于snapshot和settlement明细）
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
      const maxScore = Math.max(...detailResult.scores.map(Math.abs))
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

  // 计算指标导向fitness（核心目标：压低流局率，提升进攻与胡牌）
  const drawRate = draws / games
  const huRate = 1 - drawRate
  const readyRate = games > 0 ? fightToLastGames / games : 0
  const avgRounds = games > 0 ? totalRounds / games : 0
  const selfDrawRate = winGames > 0 ? selfDrawGames / winGames : 0
  const discardWinRate = winGames > 0 ? discardWinGames / winGames : 0
  const fightToLastRate = winGames > 0 ? fightToLastGames / Math.max(1, games - draws) : 0
  const bigHandRate = winGames > 0 ? bigWinGames / winGames : 0
  const menqingWinRate = winGames > 0 ? menqingWinGames / winGames : 0

  let mf = 0

  // 1) 流局率重罚：>10% 后每+1% 扣 500；>50% 额外加倍
  const drawExcess = Math.max(0, drawRate - 0.10)
  let drawPenalty = drawExcess * 50000
  if (drawRate > 0.50) drawPenalty *= 2
  mf -= drawPenalty

  // 2) 胡牌率重奖：每+1% 奖 500（以 50% 为基线）
  mf += Math.max(0, huRate - 0.50) * 50000

  // 3) 听牌率（readyRate）激励：<50% 惩罚，>80% 奖励
  if (readyRate < 0.50) mf -= (0.50 - readyRate) * 20000
  if (readyRate > 0.80) mf += (readyRate - 0.80) * 15000

  // 4) 速度奖励：<30 回合奖励，>80 回合惩罚
  if (avgRounds < 30) mf += (30 - avgRounds) * 400
  if (avgRounds > 80) mf -= (avgRounds - 80) * 500

  // 5) 自摸/捉冲平衡（低优先级，维持 40%-60%）
  mf -= Math.max(0, Math.abs(selfDrawRate - 0.50) - 0.10) * 250
  mf -= Math.max(0, Math.abs(discardWinRate - 0.50) - 0.10) * 250

  // 血战率（保留轻量约束）
  mf -= Math.max(0, 0.80 - fightToLastRate) * 300

  // 6) 大牌率（目标 3%-8%）：当胡牌率<50% 时不奖励大牌，避免为大牌牺牲胡牌
  if (huRate >= 0.50) {
    if (bigHandRate < 0.03) mf -= (0.03 - bigHandRate) * 300
    if (bigHandRate > 0.08) mf -= (bigHandRate - 0.08) * 300
  }

  // 门清胡牌率（保留但弱化）
  if (menqingWinRate < 0.07) mf -= (0.07 - menqingWinRate) * 200
  if (menqingWinRate > 0.12) mf -= (menqingWinRate - 0.12) * 200

  // 手牌类型分布（K哥目标：混一色40% 碰碰胡25% 清一色20% 清碰/风一色5% 风碰1%）
  if (winGames > 10) {
    const total = winGames
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

  return {
    akScore: scores['AI-AK'] || 0, akWins: wins['AI-AK'] || 0, winRates, scores, draws,
    bigWin, bigLoss, totalGames: games, winGames, selfDrawGames, discardWinGames,
    fightToLastGames, bigWinGames, menqingWinGames, metricsFitness: mf, worstSingleLoss, biggestSingleWin,
    avgRounds: games > 0 ? totalRounds / games : 0,
    avgPot: games > 0 ? totalPot / games : 0,
    avgWinnerPoints: winnerPointCount > 0 ? totalWinnerPoints / winnerPointCount : 0,
    highMultGameCount,
    handTypeCounts
  }
}

// ========== Main Training Loop (全员收敛) ==========
async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const mdFile = path.join(OUT_DIR, `baseline-training-${timestamp}.md`)
  const policyFile = path.join(OUT_DIR, `best-policy-baseline-${timestamp}.json`)
  const policyLatest = path.join(OUT_DIR, 'best-policy.json')

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // 4人共用同一个策略
  let bestPolicy = loadCharacter('AI-AK')
  let bestScore = -Infinity
  let logLines: string[] = []

  const header = [
    '# 长清阁麻将 全员基线收敛训练日志',
    '',
    `- 创建时间: ${new Date().toISOString()}`,
    `- 训练脚本: train-baseline.ts`,
    `- Config: ${ROUNDS} rounds × ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`,
    `- 模式: 4人共用同一策略，血战到最后一人`,
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
  console.log('\n## 基线成绩（第0轮）')
  logLines.push('\n## 基线成绩（第0轮）')
  const baseline = evaluatePolicy(bestPolicy, GAMES_PER_ROUND)
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

  const scoreHistory: number[] = [bestScore]
  let plateauCount = 0

  for (let round = 1; round <= ROUNDS; round++) {
    let intensity = 1.0
    if (plateauCount >= 2) intensity = 1.8
    if (plateauCount >= 4) intensity = 2.5

    const candidates: BotPolicy[] = []
    for (let i = 0; i < 4; i++) {
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
      const result = evaluatePolicy(candidates[c], GAMES_PER_ROUND)
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

    if (bestEvalResult) {
      logLines.push('', formatRoundMarkdown(round, bestEvalResult, roundBestPolicy), '')
      // 每轮结束立刻写入文件，方便实时跟踪进度
      fs.writeFileSync(mdFile, logLines.join('\n'), 'utf-8')
      // MariaDB 备份
      await saveRoundToMariaDB(round, bestEvalResult, roundBestPolicy)
    }
  }

  // Final evaluation
  console.log('\n--- 最终评估 ---')
  logLines.push('\n--- 最终评估 ---')

  const finalEval = evaluatePolicy(bestPolicy, 1000)
  const finalLines = [
    `| 指标 | 值 | 目标 | 达标 |`,
    `|------|-----|------|------|`,
    `| 胡牌率 | ${((1-finalEval.draws/1000)*100).toFixed(1)}% | ≥90% | ${((1-finalEval.draws/1000)>=0.9?'✅':'❌')} |`,
    `| 流局率 | ${(finalEval.draws/1000*100).toFixed(1)}% | <10% | ${(finalEval.draws/1000<0.1?'✅':'❌')} |`,
    `| 自摸率 | ${(finalEval.selfDrawGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 40-60% | ${(finalEval.selfDrawGames/Math.max(1,finalEval.winGames)>=0.4&&finalEval.selfDrawGames/Math.max(1,finalEval.winGames)<=0.6?'✅':'❌')} |`,
    `| 捉冲率 | ${(finalEval.discardWinGames/Math.max(1,finalEval.winGames)*100).toFixed(1)}% | 40-60% | ${(finalEval.discardWinGames/Math.max(1,finalEval.winGames)>=0.4&&finalEval.discardWinGames/Math.max(1,finalEval.winGames)<=0.6?'✅':'❌')} |`,
    `| 血战率 | ${(finalEval.fightToLastGames/Math.max(1,1000-finalEval.draws)*100).toFixed(1)}% | >80% | ${(finalEval.fightToLastGames/Math.max(1,1000-finalEval.draws)>0.8?'✅':'❌')} |`,
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

  // 最大输赢局明细（只显示胡牌事件，不显示每回合操作）
  const winActions = ['自摸', '放炮胡', '杠上自摸', '碰后放炮胡', '碰后自摸', '碰杠后自摸', '吃后放炮胡', '吃后自摸', '吃杠后自摸']
  if (finalEval.bigWin) {
    const evs = finalEval.bigWin.result.events.filter(e => winActions.some(a => e.action.includes(a)))
    finalLines.push(`\n  【最大赢局】+${finalEval.bigWin.score} (倍×${finalEval.bigWin.result.multiplier})`)
    for (const e of evs) finalLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
  }
  if (finalEval.bigLoss) {
    const evs = finalEval.bigLoss.result.events.filter(e => winActions.some(a => e.action.includes(a)))
    finalLines.push(`\n  【最大输局】${finalEval.bigLoss.score} (倍×${finalEval.bigLoss.result.multiplier})`)
    for (const e of evs) finalLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
  }

  console.log(finalLines.join('\n'))
  logLines.push(...finalLines)

  // 最终评估也写MariaDB
  await saveRoundToMariaDB(ROUNDS + 1, finalEval, bestPolicy)

  // Save all 4 AIs with same policy
  const metrics = {
    fitness: finalEval.metricsFitness,
    huRate: 1 - finalEval.draws / 1000,
    drawRate: finalEval.draws / 1000,
    selfDrawRate: finalEval.selfDrawGames / Math.max(1, finalEval.winGames),
    discardWinRate: finalEval.discardWinGames / Math.max(1, finalEval.winGames),
    fightToLastRate: finalEval.fightToLastGames / Math.max(1, 1000 - finalEval.draws),
    bigHandRate: finalEval.bigWinGames / Math.max(1, finalEval.winGames),
    menqingWinRate: finalEval.menqingWinGames / Math.max(1, finalEval.winGames),
    totalGames: ROUNDS * GAMES_PER_ROUND,
    note: `Baseline convergence - ${ROUNDS}x${GAMES_PER_ROUND}`
  }

  for (const name of AI_NAMES) {
    saveCharacter(name, { ...bestPolicy, id: name }, metrics)
  }
  console.log(`\nAll 4 AIs saved: ${AI_NAMES.join(', ')}`)

  fs.writeFileSync(mdFile, logLines.join('\n'), 'utf-8')
  fs.writeFileSync(policyFile, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  fs.writeFileSync(policyLatest, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')

  console.log(`\nLog: ${mdFile}`)
  console.log(`Policy: ${policyFile}`)
}

main()
