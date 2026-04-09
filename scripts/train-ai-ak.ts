/**
 * AI-AK 策略迭代训练器
 * 4个bot: AI-AK(优化目标), AI-小胖, AI-阿水, AI-老赵(固定)
 * 运行 10 rounds × 500 games
 * 每轮只调AI-AK参数，目标: 最高盈利总分
 * 输出到 training-output/
 */
import {
  shuffleTiles, isFlower, groupTiles, sortTiles, tilesEqual
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType, isTing, clearIsTingCache, clearCanWinCache,
  getIsTingCacheStats, getCanWinCacheStats, resetIsTingCacheStats,
  checkChowPongExclusion, updateChowPongExclusion,
  type ChowPongExclusionState
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { TileSuit, MeldType, WinType, type Tile, type Meld } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { writeRoundFile, buildRoundReport, writeIndexFile } from './training-reporter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUNDS = parseInt(process.argv[2] || '10')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000')
const BASELINE_MODE = process.argv[4] === '--baseline'  // 基线训练：优化指标而非得分
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const OUT_DIR = path.resolve(__dirname, '..', 'training-output')

// ========== Bot Policy (长清阁规则) ==========
const HAND_TYPE_NAMES: Record<string, string> = {
  [HandType.FENG_PENG]: '风碰', [HandType.ALL_WIND]: '风一色', [HandType.QING_PENG]: '清碰',
  [HandType.HUN_PENG]: '混碰', [HandType.EIGHT_FLOWERS]: '八花', [HandType.FULL_FLUSH]: '清一色',
  [HandType.HALF_FLUSH]: '混一色', [HandType.FOUR_WILD]: '四百搭', [HandType.ALL_TRIPLETS]: '碰碰胡',
  [HandType.DA_DIAO]: '大吊'
}

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
  selfWinChance: 0.8, discardHuChance: 0.8,
  selfWinWildBoost: 0.1, discardHuWildPenalty: 0.4, discardHuMenQingPenalty: 0.14,
  pengChance: 0.79, kongChance: 0.47, chowChance: 0.03, anKongChance: 0.95,
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  menqingKeepBonus: 5.0, meldPenalty: 0.05,
  allPungsPursuit: 1.5, pureFlushPursuit: 1.5, halfFlushWeight: 1.0,
  sevenPairsPursuit: 1.0, allHonorsPursuit: 1.0, allHonorsPungsPursuit: 1.0,
  qingPengPursuit: 1.5, hunPengPursuit: 1.5,
  windEastKeep: 2.0, windSouthKeep: 1.0, windWestKeep: 1.0, windNorthKeep: 1.0,
  windGeneralKeep: 1.5,
  dragonRedKeep: 3.0, dragonGreenKeep: 3.0, dragonWhiteKeep: 2.5, dragonGeneralKeep: 3.0,
  pairWeight: 4.0, nearWeight: 3.6, tripletKeepBonus: 4.7, terminalPenalty: 1.0,
  wildKeepPenalty: 3000, wildBailoutThreshold: 3,  // K哥: 只有极少情况才打百搭，调到最大惩罚
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
  selfWinChance:              { min: 0.3,  max: 1.0,  step: 0.05 },
  discardHuChance:            { min: 0.3,  max: 1.0,  step: 0.05 },
  selfWinWildBoost:           { min: 0.0,  max: 0.3,  step: 0.02 },
  discardHuWildPenalty:       { min: 0.0,  max: 0.8,  step: 0.03 },
  discardHuMenQingPenalty:    { min: 0.0,  max: 0.4,  step: 0.02 },
  pengChance:                 { min: 0.3,  max: 1.0,  step: 0.05 },
  kongChance:                 { min: 0.1,  max: 1.0,  step: 0.05 },
  chowChance:                 { min: 0.0,  max: 0.5,  step: 0.02 },
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
    if (!range) { console.error('[DEBUG] key not in PARAM_RANGES:', key); continue }
    const rMin = Number(range.min)
    const rMax = Number(range.max)
    if (!Number.isFinite(rMin) || !Number.isFinite(rMax)) {
      console.error('[DEBUG] BAD min/max for', key, ':', range)
      continue
    }
    const current = Number(base[key])
    if (!Number.isFinite(current)) { console.error('[DEBUG] base[key] not finite:', key, '=', current); continue }
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
  // 调试追踪
  _lastPhase?: string
  _lastHand?: number
  // 胡牌得分信息
  wonFan?: number
  winHandType?: string
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
    chowPongExclusion: { firstActionSuit: null, firstActionType: null }
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
  // if (p.hand.length !== exp) console.error(`DRAW: ${p.name} hand=${p.hand.length} expected=${exp} melds=${p.exposedMelds.length} kongs=${kongC}`)
  if (process.env.DEBUG_DISCARD === '1') console.error(`[DISCARD_RET] ${p.name} returns=${tileStr(tile)} hand_before=${p.hand.length}`)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer): string | null { return p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null }

// ========== Meld detection ==========
function canPeng(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 2  // K哥铁律：统一normalize
}
function canChow(p: BotPlayer, tile: Tile): boolean {
  if (!tile || isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const v = tile.value
  // 三种吃牌方式：
  // 1) 中间牌：需要 v-1 和 v+1（如 3+5 吃 4），v范围2-8
  // 2) 最低牌（tile是最大的）：需要 v-1 和 v-2（如 3+4 吃 5），v范围3-9
  // 3) 最高牌（tile是最小的）：需要 v+1 和 v+2（如 4+5 吃 3），v范围1-7
  const normalized = normalizeHand(p.hand)  // K哥铁律：统一normalize
  const has = (val: number) => normalized.some(t => t.suit === tile.suit && t.value === val)
  // 中间牌
  if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) return true
  // 最低牌：tile是被吃序列中最大的
  if (v >= 3 && has(v - 1) && has(v - 2)) return true
  // 最高牌：tile是被吃序列中最小的
  if (v <= 7 && has(v + 1) && has(v + 2)) return true
  return false
}
function canMingKong(p: BotPlayer, tile: Tile): boolean {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 3  // K哥铁律：统一normalize
}
function canAnKong(p: BotPlayer): Tile[] {
  const hand = normalizeHand(p.hand)  // K哥铁律：统一用normalize过的hand
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

// ========== 手牌铁律验证（K哥铁律）==========
// 核心：每吃/碰/杠一口，净减3张手牌（类型无关）
// hand = 14 - 3*meldCount（摸牌后）
// hand = 13 - 3*meldCount（出牌后）
// hand = 11 - 3*meldCount（吃碰后，不摸牌）
// hand = 10 - 3*meldCount（吃碰后出牌）
// 注意：杠也是一口，扣3张（暗杠4张-补1=净3；jiaKong/明杠：碰的3张不变，只补1打1=净3）
function checkHandInvariant(p: BotPlayer, phase: 'draw' | 'discard' | 'claim' | 'claim_discard'): boolean {
  const len = normalizeHand(p.hand).length
  const meldCount = p.exposedMelds.length  // 所有面子（顺/刻/杠）都算1口
  let base: number
  switch (phase) {
    case 'draw':          base = 14; break  // 摸牌后（出牌前）
    case 'discard':       base = 13; break  // 出牌后
    case 'claim':         base = 14; break  // 吃碰后（不摸牌，按口数净减）
    case 'claim_discard': base = 13; break  // 吃碰后再出牌
  }
  const expected = base - 3 * meldCount
  if (len !== expected) {
    const prevPhase = p._lastPhase || '?'
    const prevHand = p._lastHand || '?'
    console.error(`[铁律违规] ${p.name} phase=${phase} hand=${len} melds=${meldCount} expected=${expected} prevPhase=${prevPhase} prevHand=${prevHand}`)
    p._lastPhase = phase
    p._lastHand = len
    return false
  }
  p._lastPhase = phase
  p._lastHand = len
  return true
}

// ========== Apply melds ==========
function applyPeng(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)  // 铁律：apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const validBefore = before === 13 - 3 * meldCount  // K哥铁律：只看口数
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  // validBefore检查已被其他bug破坏的手牌守恒，移除此防御性拒绝，只检查匹配数
  if (matches.length < 2) {
    console.error(`BUG applyPeng: ${p.name} before=${before} melds=${meldCount} matches=${matches.length} tile=${tileStr(tile)} hand=${p.hand.map(t=>tileStr(t)).join(',')}`)
    return
  }
  // 小胖专诊：追踪pong后hand
  if (p.name === 'AI-小胖' && before === 4 && meldCount === 3) {
    console.error(`[小胖_PONG] before=${before} melds=${meldCount} matches=${matches.map(t=>tileStr(t)).join(',')} tile=${tileStr(tile)}`)
  }
  for (const u of matches) { const idx = p.hand.findIndex(rt => rt.id === u.id); if (idx >= 0) p.hand.splice(idx, 1) }
  const after = p.hand.length
  if (p.name === 'AI-小胖' && after === 3 && meldCount === 3) {
    console.error(`[小胖_PONG_AFTER] before=${before} after=${after} melds=${meldCount} newMeld=${tileStr(tile)}`)
  }
  if (after !== before - 2) console.error(`BUG applyPeng: ${p.name} before=${before} matches=${matches.length} after=${after}`)
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyChow(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)  // 铁律：apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const validBefore = before === 13 - 3 * meldCount  // K哥铁律：只看口数
  const v = tile.value
  const findTile = (suit: TileSuit, val: number) => p.hand.find(t => t.suit === suit && t.value === val)
  const removeTile = (t: Tile) => { const idx = p.hand.findIndex(h => h.id === t.id); if (idx >= 0) p.hand.splice(idx, 1) }

  // 三种吃牌模式，与canChow一致
  let t1: Tile | undefined, t2: Tile | undefined
  // 1) 中间牌：tile是中间，需要v-1和v+1，v范围2-8
  if (v >= 2 && v <= 8) {
    t1 = findTile(tile.suit, v - 1)
    t2 = findTile(tile.suit, v + 1)
  }
  // 2) 最低牌：tile是最大的，需要v-1和v-2，v范围3-9
  if ((!t1 || !t2) && v >= 3) {
    t1 = findTile(tile.suit, v - 1)
    t2 = findTile(tile.suit, v - 2)
  }
  // 3) 最高牌：tile是最小的，需要v+1和v+2，v范围1-7
  if ((!t1 || !t2) && v <= 7) {
    t1 = findTile(tile.suit, v + 1)
    t2 = findTile(tile.suit, v + 2)
  }

  if (!validBefore || !t1 || !t2) {
    console.error(`BUG applyChow: ${p.name} before=${before} melds=${meldCount} valid=${validBefore} t1=${t1?.id} t2=${t2?.id} tile=${tileStr(tile)}`)
    if (!validBefore) return
  }
  if (t1.id === t2.id) { console.error(`BUG applyChow: same tile! ${p.name} tile=${tileStr(tile)} t1=t2=${t1.id}`); return }
  removeTile(t1); removeTile(t2)
  const after = p.hand.length
  if (after !== before - 2) console.error(`BUG applyChow: ${p.name} before=${before} after=${after} (expected ${before-2}) tile=${tileStr(tile)} t1=${t1.id} t2=${t2.id}`)
  // 排序tiles为从小到大
  const meldTiles = [t1, tile, t2].sort((a, b) => a.value - b.value)
  p.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: meldTiles, isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyMingKong(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  p.hand = normalizeHand(p.hand)  // 铁律：先normalize
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 3) {
    console.error(`BUG applyMingKong: ${p.name} tileCount=${tileCount} < 3 tile=${tileStr(tile)}`)
    return
  }
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
  p.hand = normalizeHand(p.hand)  // 铁律：先normalize
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 4) {
    console.error(`BUG applyAnKong: ${p.name} tileCount=${tileCount} < 4 tile=${tileStr(tile)} hand=${p.hand.map(t=>tileStr(t)).join(',')}`)
    return
  }
  const before = p.hand.length
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  const after = p.hand.length
  if (after !== before - 4) { console.error(`BUG applyAnKong: ${p.name} before=${before} after=${after} (expected ${before-4})`); return }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
  p.kongCount++
}
function applyJiaGang(p: BotPlayer, tile: Tile): void {
  p.hand = normalizeHand(p.hand)  // 铁律：先normalize
  const tileCount = p.hand.filter(t => tileEq(t, tile)).length
  if (tileCount < 1) {
    console.error(`BUG applyJiaGang: ${p.name} tileCount=${tileCount} < 1 tile=${tileStr(tile)}`)
    return
  }
  const meld = p.exposedMelds.find(m => m.type === MeldType.TRIPLET && tileEq(m.tiles[0], tile))
  if (!meld) return
  meld.type = MeldType.KONG; meld.tiles = [tile, tile, tile, tile]; meld.isConcealed = false
  const before = p.hand.length
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  const after = p.hand.length
  if (after !== before - 1) { console.error(`BUG applyJiaGang: ${p.name} before=${before} after=${after}`); return }
  p.kongCount++
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
    isRobbingKong: false, isMenQing: p.exposedMelds.filter(m => !m.isConcealed).length === 0,
    wildTileSuit: p.wildSuit, wildTileValue: p.wildValue,
    roundMultiplier: 1, globalMultiplier: gameMultiplier
  })
  return result.finalPoints * SETTLEMENT_MULT
}

// ========== 互包结算 ==========
// 包三：某玩家吃了/碰了/杠了≥3口 → 当"目标玩家"胡牌时，包家替所有人赔付
// 包四：≥4口 → 赔付×2
//
// 真实规则：
//   自摸：包家赔全部3×base×mult，其他2家不赔不赚
//   放炮：包家赔全部3×base×mult，放炮者不赔不赚
//   放炮者就是包家：正常赔付（已赔1倍）→ 修正为3倍
//
// 关键：meldSources[winner] = 该玩家从赢家吃了多少次
//   赢家被 ci 吃了 ≥3 次 → ci 成为包家
function applyBaoSettlement(
  g: GameState, winnerIdx: number, isSelfDraw: boolean,
  discarderIdx: number | null, baseScore: number, mult: number = 1
): void {
  const winner = g.players[winnerIdx]

  for (let ci = 0; ci < 4; ci++) {
    if (ci === winnerIdx) continue
    // 关键修复：meldSources[winner] = ci 从 winner 吃了多少次（方向反转）
    const meldCount = g.players[ci].meldSources[winnerIdx]
    if (meldCount < 3) continue

    const isBao4 = meldCount >= 4
    const baoMult = isBao4 ? 2 : 1
    const baoPay = baseScore * 3 * baoMult * mult  // 修正：乘以全局mult

    if (isSelfDraw) {
      // 自摸：赢家已收3家各1×base（加base×3），包家赔付baoPay，其他退回
      for (let i = 0; i < 4; i++) {
        if (i === winnerIdx) continue
        if (i === ci) {
          g.players[i].score -= baoPay - baseScore  // 包家额外赔（baoPay已含自己的1×base）
        } else {
          // 其他2家：已扣1×base，不变（因为赢家已收3×base，含他们那份）
        }
      }
    } else {
      // 放炮：赢家已收1×base（从放炮者），包家赔付baoPay-1×base（替放炮者+额外）
      if (discarderIdx !== null && discarderIdx !== ci) {
        // 放炮者不是包家 → 放炮者已扣1×base，包家额外赔baoPay-1×base
        g.players[ci].score -= baoPay - baseScore  // 包家替放炮者赔
      }
      // 放炮者就是包家 → 已赔1×base，修正为baoPay
      if (discarderIdx === ci) {
        g.players[ci].score -= baoPay - baseScore  // 包家补差到baoPay
      }
    }
  }
}

// ========== 百搭最优利用：全局评分 ==========
// 根据手牌评估不同百搭使用方式的得分，选择最高分
// 长清阁得分公式：
//   最终点数 = 牌型基础分 × extraMultipliers(无百搭×2, 门清×2) × globalMultiplier
//
// extraMultipliers 说明：
//   - 无百搭：手牌不含百搭 → ×2
//   - 门清：没有吃过牌、碰过牌、明杠 → ×2
//   - 两者可叠加（最高×4）
// globalMultiplier：骰子倍数 × 流局继承（封顶8）
//
// 牌型基础分：清一色=10, 风一色=20, 风碰=40, 清碰=20, 混碰=公式(2+花数+面子分,上限10),
//             碰碰胡=公式, 混一色=公式
function evalWildDeployment(hand: Tile[], meldCount: number, wildCount: number,
  flowerCount: number, globalMult: number = 1): { bestType: string; bestScore: number; keepWildScore: number } {

  // 门清：没有吃过牌、碰过牌、明杠即为门清；暗杠不破门清（暗杠是手牌暗搓搓的杠，不算副露）
  const isMenqing = meldCount === 0  // meldCount 已由调用方过滤为非暗杠副露数，此处直接用

  // extraMultipliers 辅助计算
  const calcExtra = (hasWild: boolean, menqing: boolean): number => {
    let m = 1
    if (!hasWild) m *= 2   // 无百搭×2
    if (menqing) m *= 2    // 门清×2
    return m
  }

  // 牌型基础分（HandType 枚举值 = 字符串键）
  // HandType.FULL_FLUSH = 'full_flush', HandType.ALL_TRIPLETS = 'all_triplets', etc.
  const typeBaseScore: Record<string, number> = {
    [HandType.FENG_PENG]: 40,  // 风碰=40（最高固定番）
    [HandType.ALL_WIND]: 20,   // 风一色=20
    [HandType.QING_PENG]: 20,  // 清碰=20
    [HandType.FULL_FLUSH]: 10, // 清一色=10
    [HandType.HUN_PENG]: 10,   // 混碰=10
    [HandType.ALL_TRIPLETS]: 10, // 碰碰胡=10（公式上限）
    [HandType.HALF_FLUSH]: 10,  // 混一色=10（公式上限）
    [HandType.FOUR_WILD]: 10,  // 四百搭=10
    [HandType.DA_DIAO]: 10,    // 大吊=10
    [HandType.EIGHT_FLOWERS]: 10, // 八花=10
  }

  if (wildCount === 0) {
    // 无百搭时：手牌本身即无百搭，肯定有×2
    const types = detectHandTypes(hand, [], null, false, flowerCount)
    const base = types.length > 0 ? (typeBaseScore[types[0]] || 0) : 0
    // 无百搭×2 × globalMult（门清由调用方另外判断，这里只处理无百搭）
    const final = base * 2 * globalMult
    const typeName = types.length > 0 ? HAND_TYPE_NAMES[types[0]] || types[0] : '基础胡'
    return { bestType: typeName, bestScore: final, keepWildScore: final }
  }

  const nonWild = hand.filter(t => !isWild(t, undefined, undefined))

  // 评估1：保留百搭不使用 → 无百搭×2；门清存在时再×2
  const typesNoWild = detectHandTypes(nonWild, [], null, false, flowerCount)
  const baseNoWild = typesNoWild.length > 0 ? (typeBaseScore[typesNoWild[0]] || 0) : 0
  const keepWildScore = baseNoWild * calcExtra(false, isMenqing) * globalMult

  // 评估2：百搭做清一色（最长花色+百搭>=13张）
  let flushScore = 0
  if (meldCount === 0) {
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      const suitTiles = nonWild.filter(t => t.suit === suit)
      if (suitTiles.length + wildCount >= 13) { flushScore = 10; break }
    }
  }

  // 评估3：百搭做风碰/箭碰（固定高分40）
  const honorCount = nonWild.filter(t => isHonor(t)).length
  let fengPengScore = 0
  if (honorCount + wildCount >= 13) fengPengScore = 40  // 风碰=40

  // 评估4：百搭做碰碰胡（公式：2 + 花数 + 面子分，上限10）
  const groups = groupTiles(nonWild)
  let pairPotential = 0
  for (const [, tiles] of groups) { if (tiles.length >= 2) pairPotential++ }
  // 面子分估算：pairPotential≥4 → 约4组面子 ≈ 面子分≈4
  const pungScore = (pairPotential + wildCount >= 4)
    ? Math.min(10, 2 + flowerCount + Math.max(0, pairPotential - 1))
    : 0

  // 使用百搭时：无百搭×2不成立；是否门清取决于meldCount
  const useWildExtra = isMenqing ? 2 : 1
  const flushFinal = flushScore * useWildExtra * globalMult
  const fengPengFinal = fengPengScore * useWildExtra * globalMult
  const pungFinal = pungScore * useWildExtra * globalMult

  // 取最高分
  const options = [
    { type: '保留百搭', score: keepWildScore },
    { type: '清一色', score: flushFinal },
    { type: '风碰', score: fengPengFinal },
    { type: '碰碰胡', score: pungFinal }
  ]
  options.sort((a, b) => b.score - a.score)

  return { bestType: options[0].type, bestScore: options[0].score, keepWildScore }
}

// ========== AI Discard (长清阁规则) ==========
function aiDiscard(p: BotPlayer, gameMultiplier: number = 1, discardPile: Tile[] = [],
  wallIdx: number = 0, deckLen: number = 144, allPlayers: BotPlayer[] = [], myPos: number = 0): Tile {
  // 铁律：hand可能含undefined，在计算前先normalize
  p.hand = normalizeHand(p.hand)
  const policy = p.policy
  const hand = p.hand
  if (process.env.DEBUG_DISCARD === '1') console.error(`[DISCARD] ${p.name} hand_before=${p.hand.length} pos=${p.pos}`)
  const wildCount = hand.filter(t => isWT(t, p)).length
  const isMenqing = p.exposedMelds.filter(m => !m.isConcealed).length === 0
  // 暗杠不破门清：统计副露时排除暗杠（暗杠属于手牌，不算门口副露）
  const totalMelds = p.exposedMelds.filter(m => !m.isConcealed).length
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const suitCounts = suits.map(s => hand.filter(t => t.suit === s).length)
  const maxSuitIdx = suitCounts.indexOf(Math.max(...suitCounts))
  const maxSuitCount = suitCounts[maxSuitIdx]
  const honorCount = hand.filter(t => isHonor(t)).length

  // 百搭全局最优评估
  const wildEval = wildCount > 0 ? evalWildDeployment(hand, totalMelds, wildCount, p.flowerTiles.length, gameMultiplier) : null
  const wildIsOptimal = wildEval && wildEval.bestType !== '保留百搭' && wildEval.bestScore > wildEval.keepWildScore

  // ====== 对手出牌观察：前N轮别人打的牌 ======
  // 统计对手打出的各花色数量（排除自己的出牌近似处理）
  const oppDiscardBySuit: Record<string, number> = { [TileSuit.DOTS]: 0, [TileSuit.CHARACTERS]: 0, [TileSuit.BAMBOOS]: 0 }
  // 取最近的出牌（约前20张 = 前5轮）
  const recentDiscards = discardPile.slice(-Math.min(20, discardPile.length))
  for (const t of recentDiscards) {
    if (t.suit === TileSuit.DOTS || t.suit === TileSuit.CHARACTERS || t.suit === TileSuit.BAMBOOS) {
      oppDiscardBySuit[t.suit]++
    }
  }
  // 对手都不要的花色 → 我做这一门更容易
  const discardObsBoost: Record<string, number> = {}
  for (const s of suits) {
    const othersDiscard = oppDiscardBySuit[s]
    // 如果其他三家都大量打某一门，说明没人要做这一门 → 我做这一门概率更高
    discardObsBoost[s] = othersDiscard >= 6 ? policy.discardObsFlushBoost * (othersDiscard / 10) * policy.discardObsWeight : 0
  }

  // ====== 互包追踪：同家被吃几口 ======
  const maxMeldFromOnePlayer = Math.max(...p.meldSources)
  const isNearBao3 = maxMeldFromOnePlayer >= 2  // 即将触发包三
  const isBao3 = maxMeldFromOnePlayer >= 3       // 已触发包三

  // ====== 牌墙剩余感知 ======
  const wallRemaining = deckLen - wallIdx
  const wallPhase = wallRemaining > 80 ? 'early' : wallRemaining > 40 ? 'mid' : 'late'

  // ====== 对手听牌/出牌分析 ======
  // 简化：对手打出幺九牌越多 → 可能在清理手牌 → 更可能已听牌
  let oppTingSignal = 0
  if (allPlayers.length > 0) {
    for (let i = 0; i < allPlayers.length; i++) {
      if (i === myPos) continue
      const opp = allPlayers[i]
      // 对手副露多（3+）→ 可能快听
      if (opp.exposedMelds.length >= 3) oppTingSignal += 0.3
      // 对手出过幺九 → 可能在清理 → 可能已听
      const termDiscards = opp.discardedTiles.filter(t =>
        !isHonor(t) && (t.value === 1 || t.value === 9)).length
      oppTingSignal += termDiscards * policy.terminalDiscardTingSignal * 0.1
    }
  }
  const oppLikelyTing = oppTingSignal > 0.5
  const groups = groupTiles(hand)
  let pairCount = 0, tripletCount = 0, quadCount = 0
  for (const [k, tiles] of groups) {
    if (tiles.length === 2) pairCount++
    if (tiles.length === 3) tripletCount++
    if (tiles.length === 4) quadCount++
  }
  const isPureFlushRoute = maxSuitCount >= hand.length * 0.7 && maxSuitCount >= 8
  const isHalfFlushRoute = maxSuitCount >= hand.length * 0.5 && honorCount >= 2
  const isAllHonorsRoute = honorCount >= hand.length * 0.6 && honorCount >= 6
  const isAllPungsRoute = (tripletCount * 3 + quadCount * 4) >= hand.length * 0.6
  const isSevenPairsRoute = pairCount >= 4 && totalMelds === 0

  // 倍数×起手牌质量联合路线
  const handQuality = maxSuitCount >= 7 ? 7 : maxSuitCount >= 6 ? 6 : maxSuitCount >= 5 ? 5 : 0
  // 使用实际游戏倍数（≥4为高倍数）
  const isHighMult = gameMultiplier >= 4
  const isMidMult = gameMultiplier >= 2
  let mHA = 0, mHH = 0, mHP = 0, mHHo = 0
  if (handQuality === 5) {
    mHA = isHighMult ? policy.multHighHand5AllPungs : policy.multLowHand5AllPungs
    mHH = isHighMult ? policy.multHighHand5HalfFlush : policy.multLowHand5HalfFlush
  } else if (handQuality === 6) {
    mHA = isHighMult ? policy.multHighHand6AllPungs : policy.multLowHand6AllPungs
    mHH = isHighMult ? policy.multHighHand6HalfFlush : policy.multLowHand6HalfFlush
    mHP = isHighMult ? policy.multHighHand6PureFlush : policy.multLowHand6PureFlush
  } else if (handQuality >= 7) {
    mHA = isHighMult ? policy.multHighHand7AllPungs : policy.multLowHand7AllPungs
    mHH = isHighMult ? policy.multHighHand7HalfFlush : policy.multLowHand7HalfFlush
    mHP = isHighMult ? policy.multHighHand7PureFlush : policy.multLowHand7PureFlush
  }
  const hQB = handQuality >= 7 ? policy.hand7RouteBias : handQuality >= 6 ? policy.hand6RouteBias : handQuality >= 5 ? policy.hand5RouteBias : 0
  if (isHighMult && honorCount >= 5) mHHo = policy.multHighHonorStart

  // ====== 积分榜动态策略 ======
  let scorePosition = 0  // 0=中游, >0=领先, <0=落后
  let isLoser = false
  let isBigLeader = false
  if (allPlayers.length > 0) {
    const myScore = p.score
    const allScores = allPlayers.map(ap => ap.score)
    const maxScore = Math.max(...allScores)
    const minScore = Math.min(...allScores)
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length
    scorePosition = myScore - avgScore  // 正=领先，负=落后
    const gap = maxScore - minScore
    // 排名倒数第一/第二 → 冒险意愿增强
    isLoser = myScore <= allScores.sort((a, b) => a - b)[1]  // 倒数前二
    // 大幅领先 → 降低进攻，增强防守
    isBigLeader = myScore > avgScore + gap * 0.5  // 领先超过差距一半
  }

  const candidates: { tile: Tile; keepScore: number }[] = []
  for (const tile of hand) {
    if (isFlower(tile)) continue
    let keepScore = 0
    const count = hand.filter(t => tileEq(t, tile)).length
    const sameSuit = hand.filter(t => t.suit === tile.suit && !tileEq(t, tile))

    if (count >= 2) keepScore += policy.pairWeight
    if (count >= 3) keepScore += policy.tripletKeepBonus
    if (count >= 4) keepScore += policy.tripletKeepBonus * 2

    if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) {
      const hasLeft = sameSuit.some(t => t.value === tile.value - 1 || t.value === tile.value - 2)
      const hasRight = sameSuit.some(t => t.value === tile.value + 1 || t.value === tile.value + 2)
      if (hasLeft) keepScore += policy.nearWeight
      if (hasRight) keepScore += policy.nearWeight
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      keepScore += neighbors.length * policy.nearWeight * 0.2
      if (policy.sequenceVsTripletBias > 0 && count >= 2)
        keepScore += policy.sequenceVsTripletBias * 2
    }

    if ((tile.value === 1 || tile.value === 9) && !isHonor(tile)) {
      const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
      if (neighbors.length === 0) keepScore -= policy.terminalPenalty
    }

    if (tile.suit === TileSuit.WIND) {
      let wk = policy.windGeneralKeep
      if (tile.value === 1) wk += policy.windEastKeep
      else if (tile.value === 2) wk += policy.windSouthKeep
      else if (tile.value === 3) wk += policy.windWestKeep
      else if (tile.value === 4) wk += policy.windNorthKeep
      if (count >= 2) keepScore += wk * policy.pairWeight
      if (count >= 3) keepScore += wk * 3
      if (count >= 4) keepScore += wk * 5
      if (count === 1) keepScore -= wk * 0.5
      if (isAllHonorsRoute) keepScore += policy.allHonorsPursuit * 10 * (count >= 2 ? 2 : 1)
      if (isAllHonorsRoute && isAllPungsRoute) keepScore += policy.allHonorsPungsPursuit * 20
    }

    if (tile.suit === TileSuit.DRAGON) {
      let dk = policy.dragonGeneralKeep
      if (tile.value === 1) dk += policy.dragonRedKeep
      else if (tile.value === 2) dk += policy.dragonGreenKeep
      else if (tile.value === 3) dk += policy.dragonWhiteKeep
      if (count >= 2) keepScore += dk * policy.pairWeight
      if (count >= 3) keepScore += dk * 4
      if (count >= 4) keepScore += dk * 6
      if (count === 1) keepScore -= dk * 0.3
      if (isAllHonorsRoute) keepScore += policy.allHonorsPursuit * 10 * (count >= 2 ? 2 : 1)
      if (isAllHonorsRoute && isAllPungsRoute) keepScore += policy.allHonorsPungsPursuit * 20
    }

    if (policy.pureFlushPursuit > 0 && !isHonor(tile)) {
      if (tile.suit === suits[maxSuitIdx]) keepScore += policy.pureFlushPursuit * 3 * (maxSuitCount / hand.length)
      else keepScore -= policy.pureFlushPursuit * 2
    }

    // ====== 对手出牌观察：对手都不要的花色 → 我做这一门更容易 ======
    if (!isHonor(tile)) {
      const obsBoost = discardObsBoost[tile.suit] || 0
      if (obsBoost > 0) keepScore += obsBoost * 5
      // 如果我正在做的花色就是对手都不要的，额外加分
      if (tile.suit === suits[maxSuitIdx] && obsBoost > 0) keepScore += obsBoost * 3
    }

    // 倍数×起手牌质量联合加成
    if (handQuality >= 5 && !isHonor(tile)) {
      if (tile.suit === suits[maxSuitIdx]) {
        if (mHA > 0 && count >= 2) keepScore += mHA * 5 * hQB
        if (mHH > 0) keepScore += mHH * 3 * hQB
        if (mHP > 0) keepScore += mHP * 6 * hQB
      } else {
        if (mHP > 0.3) keepScore -= mHP * 4 * hQB
      }
    }
    if (mHHo > 0 && isHonor(tile)) keepScore += mHHo * 5 * (count >= 2 ? 2 : 1)

    if (policy.halfFlushWeight > 0 && isHalfFlushRoute) {
      if (tile.suit === suits[maxSuitIdx] || isHonor(tile)) keepScore += policy.halfFlushWeight * 2
      else keepScore -= policy.halfFlushWeight * 1.5
    }
    if (policy.allPungsPursuit > 0 && isAllPungsRoute) {
      if (count >= 2) keepScore += policy.allPungsPursuit * 5
      if (count === 1 && !isHonor(tile)) keepScore -= policy.allPungsPursuit * 2
    }
    if (policy.sevenPairsPursuit > 0 && isSevenPairsRoute) {
      if (count === 2) keepScore += policy.sevenPairsPursuit * 8
      if (count >= 3) keepScore -= policy.sevenPairsPursuit * 3
      if (count === 1) keepScore -= policy.sevenPairsPursuit * 1
    }

    if (isMenqing) {
      const mv = wildCount === 0 ? policy.wild0MenqingKeep : wildCount === 1 ? policy.wild1MenqingKeep : policy.wild2MenqingKeep
      keepScore += mv * policy.menqingDoubleAwareness
    }
    if (wildCount === 0 && policy.noWildDoubleAwareness > 0) keepScore += policy.noWildDoubleAwareness * 2

    // 百搭全局最优部署影响
    if (wildIsOptimal && wildEval) {
      // 最优部署说用百搭比保留更赚 → 增强对应牌型的出牌保留
      if (wildEval.bestType === '风碰' && isHonor(tile)) keepScore += 8  // 保留风/箭牌
      if (wildEval.bestType === '清一色' && !isHonor(tile) && tile.suit === suits[maxSuitIdx]) keepScore += 6
      if (wildEval.bestType === '碰碰胡' && count >= 2) keepScore += 5
    }
    if (wildEval && !wildIsOptimal && wildCount > 0) {
      // 最优部署是保留百搭 → 不使用百搭更赚（×2）
      if (isWT(tile, p)) keepScore += 10  // 百搭绝对不打
    }

    // ====== 百搭大吊：留百搭做最后1张 → 听所有牌 ======
    // hand.length ≈ 需要胡的牌数 → 接近胡牌时，百搭做最后1张价值极高
    const meldsNeeded = 4 - totalMelds
    const tilesNeeded = meldsNeeded * 3 + 2  // 还需要多少张牌
    if (wildCount >= 1 && tilesNeeded <= 3 && policy.wildDiaoKeepBonus > 0) {
      // 接近胡牌（只差1-2张），百搭做最后1张 → 听全部牌
      if (isWT(tile, p)) keepScore += policy.wildDiaoKeepBonus * 5  // 百搭绝不打
      // 碰碰胡路线 + 百搭大吊
      if (count >= 2 && policy.wildDiaoPungBoost > 0) keepScore += policy.wildDiaoPungBoost * 3
      // 混一色路线 + 百搭大吊（风箭+主花色都能胡）
      if (!isHonor(tile) && tile.suit === suits[maxSuitIdx] && policy.wildDiaoFlushBoost > 0)
        keepScore += policy.wildDiaoFlushBoost * 3
    }

    // 百搭分级激进度
    const aggression = wildCount === 0 ? policy.wild0Aggression
      : wildCount === 1 ? policy.wild1Aggression
      : wildCount === 2 ? policy.wild2Aggression : policy.wild3PlusAggression

    // 百搭分级：三口四口推进
    const meldPush = wildCount <= 0 ? 0 : wildCount === 1 ? policy.wild1RouteMeldPush
      : wildCount === 2 ? policy.wild2RouteMeldPush : policy.wild3RouteMeldPush
    if (meldPush > 0 && (count >= 2 || isHonor(tile))) keepScore += meldPush * 5 * aggression

    // 百搭分级：清一色路线
    if (!isHonor(tile) && tile.suit === suits[maxSuitIdx]) {
      const fb = wildCount === 1 ? policy.wild1RouteFlushBoost : wildCount === 2 ? policy.wild2RouteFlushBoost : wildCount >= 3 ? policy.wild3RouteFlushBoost : 0
      if (fb > 0) keepScore += fb * 4 * aggression
    }

    // 百搭分级：风一色/风碰
    if (isHonor(tile)) {
      const hb = wildCount === 1 ? policy.wild1RouteHonorsBoost : wildCount === 2 ? policy.wild2RouteHonorsBoost : wildCount >= 3 ? policy.wild3RouteHonorsBoost : 0
      if (hb > 0 && count >= 2) keepScore += hb * 6 * aggression
    }

    // 百搭分级：碰碰胡
    if (count >= 2) {
      const pb = wildCount === 1 ? policy.wild1RouteAllPungsBoost : wildCount === 2 ? policy.wild2RouteAllPungsBoost : wildCount >= 3 ? policy.wild3RouteAllPungsBoost : 0
      if (pb > 0) keepScore += pb * 4 * aggression
    }

    // 百搭分级：包三包四推进
    const baoPush = wildCount === 1 ? policy.wild1BaoPush : wildCount === 2 ? policy.wild2BaoPush : wildCount >= 3 ? policy.wild3BaoPush : 0
    if (baoPush > 0 && totalMelds >= policy.baoThreshold) keepScore += baoPush * 4 * aggression
    if (wildCount >= 1) keepScore += aggression * 2

    // 速度vs大牌
    if (policy.speedVsValueBalance > 0.5) {
      if (count >= 3) keepScore -= (policy.speedVsValueBalance - 0.5) * 3
      if (!isHonor(tile) && count === 1) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        keepScore += neighbors.length * (policy.speedVsValueBalance - 0.5) * policy.nearWeight * 0.3
      }
    }

    // 包三四风险（无百搭加持时更保守）
    if (policy.baoRiskAversion > 0 && totalMelds >= policy.baoThreshold && baoPush < 0.3)
      keepScore += policy.baoRiskAversion * 3

    // ====== 0百搭特殊策略 ======
    if (wildCount === 0) {
      // 无百搭×2翻倍 → 碰碰胡更快成型更有价值
      if (count >= 2) keepScore += policy.allPungsPursuit * 3
      // 更低的门清意愿：无百搭已经×2了，门清额外×2收益相对变小，不如快成型
      if (isMenqing) keepScore -= policy.menqingKeepBonus * 0.5
      // 速度优先：快听牌收无百搭翻倍
      if (!isHonor(tile) && count === 1) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        keepScore += neighbors.length * policy.speedVsValueBalance * policy.nearWeight * 0.4
      }
    }

    // ====== 倍数感知：高倍数+好牌才做大牌，高倍数+烂牌要防守 ======
    const hasGoodHand = wildCount >= 2 || maxSuitCount >= 6 || (wildCount >= 1 && maxSuitCount >= 5)

    if (isHighMult && hasGoodHand) {
      // 高倍+好牌 → 冲大牌！清一色/混一色/清碰更积极
      if (count >= 2) keepScore += policy.multHighValueBias * 4
      if (!isHonor(tile) && tile.suit === suits[maxSuitIdx]) {
        keepScore += policy.multHighValueBias * 3 * (maxSuitCount / hand.length)
      }
      // 门清保持：清碰/清一色需要门清翻倍
      if (isMenqing && wildCount >= 1) keepScore += policy.menqingKeepBonus * 0.5
      // 风箭也想留（冲风一色/风碰）
      if (isHonor(tile) && count >= 2) keepScore += policy.multHighValueBias * 2
    } else if (isHighMult && !hasGoodHand) {
      // 高倍+烂牌 → 严密防守！不要给对手机会
      // 降低吃碰意愿（减少损失面）
      keepScore += policy.defenseRiskAversion * 2
      // 碰碰胡路线优先（快速成型，减少被大牌击败的风险）
      if (count >= 2) keepScore += policy.allPungsPursuit * 2
      // 打安全牌
      if (count === 1 && !isHonor(tile)) {
        const neighbors = sameSuit.filter(t => Math.abs(t.value - tile.value) <= 2)
        if (neighbors.length === 0) keepScore += policy.defenseRiskAversion * 2
      }
    } else if (!isMidMult) {
      // ×1局 → 偏速度，快胡
      keepScore -= 0.5
    }

    if (isWT(tile, p)) keepScore += policy.wildKeepPenalty

    // ====== 互包追踪：同家快触发包三 → 慎重吃碰 ======
    if (isNearBao3 && !isBao3) {
      keepScore += policy.bao2ClaimPenalty * 3  // 降低吃碰意愿
    }
    if (isBao3) {
      keepScore += policy.bao3AvoidThreshold * 10  // 强烈避免再吃碰同家
    }

    // ====== 牌墙剩余感知 ======
    if (wallPhase === 'early') {
      // 牌墙早期：可以慢做牌，追求大牌
      keepScore += policy.wallEarlySpeedPush * 2
    } else if (wallPhase === 'late') {
      // 牌墙晚期：防守优先，降低大牌追求
      keepScore += policy.wallLateDefense * 3
      if (count === 1 && !isHonor(tile)) keepScore += policy.wallLateDefense * 2 // 打出孤立牌
    }

    // ====== 对手听牌时的安全牌优先 ======
    if (oppLikelyTing && policy.safeTilePriority > 0) {
      // 对手可能在听牌 → 优先打安全牌（已出过的牌更安全）
      const inDiscardPile = discardPile.some(d => tileEq(d, tile))
      if (inDiscardPile) keepScore += policy.safeTilePriority * 5  // 已出过的牌很安全
      else keepScore -= policy.safeTilePriority * 2  // 未出过的牌有风险
    }

    // ====== 积分榜动态调整 ======
    if (isLoser && policy.scoreBehindRiskBoost > 0) {
      // 落后→冒险！百搭更值钱，大牌更值得冲
      if (isWT(tile, p)) keepScore += policy.scoreBehindRiskBoost * 3  // 百搭绝对保留
      if (count >= 2) keepScore += policy.scoreBehindRiskBoost * 2     // 保留对子做碰碰胡
      if (!isHonor(tile) && tile.suit === suits[maxSuitIdx]) keepScore += policy.scoreBehindRiskBoost * 1.5  // 保留主花色做清一色
    }
    if (isBigLeader && policy.scoreLeadDefenseBoost > 0) {
      // 大幅领先→防守！降低大牌追求，快胡收分
      if (count <= 1 && !isHonor(tile)) keepScore += policy.scoreLeadDefenseBoost * 2  // 打孤立牌
      keepScore -= policy.scoreLeadDefenseBoost  // 整体降低保留度
    }

    candidates.push({ tile, keepScore })
  }
  candidates.sort((a, b) => a.keepScore - b.keepScore)
  const validTile = candidates[0]?.tile || hand.find(t => t) || hand[0]
  if (!validTile) {
    // Emergency fallback: return any tile from deck
    const allTiles = Object.values(TileSuit).flatMap(s => 
      s === TileSuit.FLOWER ? [] : Array.from({length: 9}, (_, i) => ({ suit: s, value: i + 1, id: `fallback-${s}-${i+1}` }))
    )
    return allTiles[0]
  }
  return validTile
}

// ========== 游戏明细记录 ==========
interface GameEvent { turn: number; player: string; action: string; detail: string }
interface SettlementEntry { from: string; to: string; amount: number; reason: string; mult?: number }
interface PlayerSnapshot { name: string; hand: string; melds: string[]; flowers: string[]; meldSources: number[]; wildCount: number; wildTile: string; wonFan?: number; winHandType?: string; status: string }
interface WinnerInfo { playerIndex: number; name: string; hand: string; melds: string[]; flowers: string[]; isSelfDraw: boolean; wonFan: number; winHandType: string; roundNum: number; wildTile: string; wildTileValue?: number }
interface WinningGameRecord {
  gameIdx: number; winnerName: string; hand: string; melds: string[]; handTypes: string[];
  isSelfDraw: boolean; score: number; multiplier: number; roundNum: number;
  akDelta: number;  // AK的分数变化（正=赢，负=输）
  wonFan?: number;   // 最终点数（baseFan × all multipliers）
  winHandType?: string;  // 牌型名称
  wildTile?: string;     // 百搭牌描述
  wildTileValue?: number; // 百搭数值（百搭所在位置）
  result?: any  // GameResult，用于settlementLog
}
interface GameResult {
  winner: number; scores: number[]; events: GameEvent[]; multiplier: number
  settlementLog: SettlementEntry[]; snapshots: PlayerSnapshot[]; roundNum: number
  winnerPlayer?: BotPlayer  // 用于detectHandTypes
  winnersThisGame: WinnerInfo[]  // runGame 内所有赢家的追踪
}

// ========== 手牌规范化（胡牌前必调） ==========
function normalizeHand(hand: Tile[]): Tile[] {
  return hand.filter(t => t && !isFlower(t))
}

// ========== 血战到最后一人 ==========
// 每局有人胡牌后，已胡玩家退出，剩余玩家继续打，直到最后1人
function runGameWithFightToLast(akPolicy: BotPolicy, otherPolicies: BotPolicy[]): {
  winners: { idx: number; selfDraw: boolean; score: number }[]
  finalScores: number[]
  totalGames: number  // 实际打了几局（含血战续局）
  events: GameEvent[]
} | null {
  // 简化实现：每局结束后，赢家退出，剩余玩家重开新局
  // （真实血战应延续牌局，但重开局也能近似模拟）
  const activePolicies = AI_NAMES.map((_, i) => i === 0 ? akPolicy : otherPolicies[i-1])
  const winners: { idx: number; selfDraw: boolean; score: number }[] = []
  const active = [0, 1, 2, 3]  // 还在打的玩家
  const allEvents: GameEvent[] = []
  let gameNum = 0

  while (active.length > 1 && gameNum < 4) {
    // 用活跃玩家的策略建局
    const policies = active.map(i => activePolicies[i])
    // 映射原始pos到新的0-based pos
    const posMap: Record<number, number> = {}
    active.forEach((orig, newP) => posMap[orig] = newP)

    const g = setupGame(policies[0], policies.slice(1))
    // ... 这里需要完整运行一局游戏
    // 简化：直接调用runGame，然后处理赢家
    const result = runGame(policies[0], policies.slice(1))
    if (!result) {
      // 流局，所有人还在
      console.error(`[runGameWithFightToLast] game=${gameNum} result=null active=${active.length} players`)
      gameNum++
      if (gameNum >= 3) break  // 防止无限循环
      continue
    }
    // 有人赢了
    const winnerOrigPos = active[result.winner]
    const winEvents = result.events.filter(e => e.action.includes('自摸') || e.action.includes('放炮胡') || e.action.includes('吃后自摸') || e.action.includes('碰后自摸') || e.action.includes('杠上自摸'))
    const isSelfDraw = winEvents.some(e => e.action.includes('自摸'))
    winners.push({ idx: winnerOrigPos, selfDraw: isSelfDraw, score: result.scores[0] })
    allEvents.push(...result.events)
    // 赢家退出
    active.splice(active.indexOf(winnerOrigPos), 1)
    gameNum++
  }
  // 最后1人自动算输
  if (active.length === 1) {
    winners.push({ idx: active[0], selfDraw: false, score: 0 })
  }

  return { winners, finalScores: [0, 0, 0, 0], totalGames: gameNum, events: allEvents }
}

// ========== Game Loop ==========
// 血战到底模式：有人胡牌后继续打，直到流局或只剩1人
// 所有赢家都记录到 winnersThisGame，最后一起 return
export function runGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[]): GameResult | null {
  const runGameStart = performance.now()
  // 每局开始时清空 isTing 缓存（不同局wild牌不同）
  clearIsTingCache()
  clearCanWinCache()
  const gameStart = performance.now()
  const g = setupGame(akPolicy, otherPolicies)
  const events: GameEvent[] = []
  const settlementLog: SettlementEntry[] = []
  const winnersThisGame: WinnerInfo[] = []  // 追踪本局所有赢家（血战到底）
  const finishedPlayers = new Set<number>()  // 已胡牌退出的玩家（血战）
  let turn = 0

  // buildResult: 血战模式统一出口，构造 GameResult
  const buildResult = (
    primaryWinner: number, winMode: string, baseScore: number,
    handType: string, fanScore: number, discarder: number | undefined
  ): GameResult => {
    const winnerPlayer = g.players[primaryWinner]
    return {
      winner: primaryWinner,
      scores: g.players.map(p => p.score),
      events,
      multiplier: g.gameMultiplier,
      settlementLog,
      snapshots: recordSnapshots(),
      winnerPlayer,
      roundNum: turn,
      winnersThisGame
    }
  }

  const recordPayment = (from: string, to: string, amount: number, reason: string, mult?: number) => {
    settlementLog.push({ from, to, amount, reason, mult })
  }
  // 记录赢家到winnersThisGame（每个winner return前调用）
  // 格式化面子：按花色分组，同花色内刻→顺→杠，用分号分隔
  const formatMelds = (melds: Meld[], wildCount: number): string[] => {
    if (melds.length === 0) return []
    // 排序：先花色，再类型（碰>顺>杠）
    const sorted = [...melds].sort((a, b) => {
      if (a.tiles[0].suit !== b.tiles[0].suit) return a.tiles[0].suit.localeCompare(b.tiles[0].suit)
      const order = (t: Meld) => t.type === MeldType.TRIPLET ? 0 : t.type === MeldType.SEQUENCE ? 1 : 2
      return order(a) - order(b)
    })
    // 按花色分组
    const groups: string[] = []
    let currentSuit: string | null = null
    let currentType: MeldType | null = null
    let groupTiles: Tile[] = []
    for (const m of sorted) {
      const suit = m.tiles[0].suit
      if (suit !== currentSuit || m.type !== currentType) {
        if (groupTiles.length > 0 && currentSuit !== null) {
          const typeStr = currentType === MeldType.TRIPLET ? '碰' : currentType === MeldType.SEQUENCE ? '顺' : '杠'
          groups.push(`${typeStr}:${groupTiles.map(t => tileStr(t)).join(' ')}`)
        }
        currentSuit = suit
        currentType = m.type
        groupTiles = [...m.tiles]
      } else {
        groupTiles.push(...m.tiles)
      }
    }
    if (groupTiles.length > 0 && currentSuit !== null) {
      const typeStr = currentType === MeldType.TRIPLET ? '碰' : currentType === MeldType.SEQUENCE ? '顺' : '杠'
      groups.push(`${typeStr}:${groupTiles.map(t => tileStr(t)).join(' ')}`)
    }
    return groups
  }
  const recordWinner = (p: BotPlayer, idx: number, isSelfDraw: boolean, wonFan: number, roundNum: number) => {
    // 手牌分组：按花色分组，普通牌在前，百搭在后并加(*)
    const wildSuit = p.wildSuit, wildVal = p.wildValue
    const isWT2 = (t: Tile) => wildSuit && wildVal ? t.suit === wildSuit && t.value === wildVal : false
    const normalTiles = p.hand.filter(t => !isFlower(t) && !isWT2(t))
    const wildTiles = p.hand.filter(t => !isFlower(t) && isWT2(t))
    const suitGroups: string[] = []
    for (const suit of ['Wan','Tong','Tiao'] as TileSuit[]) {
      const normal = normalTiles.filter(t => t.suit === suit)
      const wild = wildTiles.filter(t => t.suit === suit)
      const parts: string[] = [...normal.map(t => tileStr(t)), ...wild.map(t => tileStr(t) + '(*)')]
      if (parts.length > 0) suitGroups.push(parts.join(' '))
    }
    const handStr = suitGroups.join(' ; ')
    // 门口牌分组（百搭不在这里重复显示，手牌里已标(*)）
    const meldStrs = formatMelds(p.exposedMelds, wildTiles.length)
    winnersThisGame.push({
      playerIndex: idx, name: p.name,
      hand: handStr,
      melds: meldStrs,
      flowers: p.flowerTiles.map(t => tileStr(t)),
      isSelfDraw, wonFan, winHandType: p.winHandType || '', roundNum,
      wildTile: wildTiles.length > 0 ? tileStr({suit: wildSuit, value: wildVal, id: '' }) : '(无百搭)', wildTileValue: wildVal ?? 0
    })
  }
  // 快照：只记录字符串化数据，避免引用悬浮
  const recordSnapshots = (): PlayerSnapshot[] => {
    return g.players.map(p => {
      const wildSuit = p.wildSuit, wildVal = p.wildValue
      const wildTileStr = (wildSuit && wildVal) ? `${wildSuit}-${wildVal}` : null
      const wildTileName = wildTileStr ? tileStr({suit: wildSuit as TileSuit, value: wildVal, id: '' }) : '(无百搭)'
      // 完整手牌 = 手牌 + 所有面子里的牌（都算作手牌）
      const fullHandTiles = [...p.hand, ...p.exposedMelds.flatMap(m => m.tiles)]
      return {
        name: p.name, hand: fullHandTiles.map(t => tileStr(t)).join(' '),
        melds: p.exposedMelds.map(m => `${m.type===MeldType.TRIPLET?'碰':m.type===MeldType.SEQUENCE?'吃':m.type===MeldType.KONG?'杠':'?'}:${m.tiles.map(t=>tileStr(t)).join(' ')}`),
        flowers: p.flowerTiles.map(t => tileStr(t)),
        meldSources: [...p.meldSources],
        wildCount: p.hand.filter(t => isWT(t, p)).length,
        wildTile: wildTileName,
        wonFan: p.wonFan,
        winHandType: p.winHandType,
        status: p.status
      }
    })
  }
  const log = (player: string, action: string, detail: string) => { events.push({ turn, player, action, detail }) }

  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }
  // 发牌后每人13张（摸牌后=14）
  for (const p of g.players) {
    if (p.name === 'AI-小胖' && p.hand.length !== 13) {
      console.error(`初始手牌错误: ${p.name} hand=${p.hand.length} expected=13`)
    }
  }
  // 发牌完成日志
  for (const p of g.players) log(p.name, '发牌', p.hand.map(t => tileStr(t)).join(' '))

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]
    turn = round
    const drawn = drawTile(g, player)
    if (!drawn) { console.error(`⚠️ 流局: 牌墙耗尽 round=${round} wallIdx=${g.wallIdx}/${g.deck.length}`); return null }
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); continue }
    log(player.name, '摸牌', tileStr(drawn))
    checkHandInvariant(player, 'draw')  // 摸牌后铁律：14/11/8/5/2张

    // Self-draw win check
    const normalizedHand = normalizeHand(player.hand)
    // [DEBUG] 追踪canWin诊断
    const numPungs = player.exposedMelds.filter(m => m.type === MeldType.TRIPLET || m.type === MeldType.SEQUENCE).length
    const winCheck = canWin(normalizedHand, player.exposedMelds, makeWT(player))
    if (round < 3 || winCheck.canWin) {
      console.error(`[DEBUG round=${round} curr=${curr} ${player.name}] drawn=${tileStr(drawn)} hand=${normalizedHand.length} exposed=${player.exposedMelds.length} wild=${makeWT(player)} canWin=${winCheck.canWin} types=${winCheck.types.join(',')}`)
    }
    if (winCheck.canWin) {
      // [DEBUG FORCE SELF-DRAW] 强制100%自摸，验证AI能否正常做成特殊牌型
      const winChance = 1.0
      if (Math.random() < winChance) {
        console.error(`[SELF-WIN! round=${round} curr=${curr} ${player.name}] hand=${normalizedHand.length} exposed=${player.exposedMelds.length} canWin=${winCheck.canWin}`)
        const baseScore = calcScore(player, true, false, g.gameMultiplier)
        // 自摸：每人赔baseScore，赢家得3倍
        player.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
        // 互包结算
        applyBaoSettlement(g, curr, true, null, baseScore, 1)
        for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore * g.gameMultiplier, '自摸', g.gameMultiplier) }
        log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3×${g.gameMultiplier}=${baseScore*3*g.gameMultiplier}] [手牌${normalizedHand.length}张+副露${player.exposedMelds.length}]`)
        // 记录赢家得分信息（供evaluatePolicy统计使用）
        player.wonFan = baseScore
        const wt = detectHandTypes(player.hand, player.exposedMelds, player.wildSuit && player.wildValue ? `${player.wildSuit}-${player.wildValue}` : null, true, player.flowerTiles.length)
        player.winHandType = wt.map(t => String(t)).join(',')
        player.status = 'won'
        finishedPlayers.add(curr)
        recordWinner(player, curr, true, baseScore, turn)
        log(player.name, '胡牌(血战)', `自摸 ${player.winHandType || '自摸'} [${baseScore}×3]`)
        if (finishedPlayers.size >= 3) {
          return buildResult(curr, '自摸', baseScore, player.winHandType || '自摸', baseScore, undefined)
        }
        g.current = (curr + 1) % 4
        continue
      } else {
      }
    }

    // AnKong / JiaGang (policy-driven)
    for (const ak of canAnKong(player)) {
      if (Math.random() < player.policy.anKongChance) {
        applyAnKong(player, ak)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(normalizeHand(player.hand), player.exposedMelds, makeWT(player)).canWin) {
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore, 1)
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            player.wonFan = baseScore
            const wt_aK = detectHandTypes(player.hand, player.exposedMelds, player.wildSuit && player.wildValue ? `${player.wildSuit}-${player.wildValue}` : null, true, player.flowerTiles.length)
            player.winHandType = wt_aK.map(t => String(t)).join(',')
            player.status = 'won'
            finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, turn)
            log(player.name, '胡牌(血战)', `暗杠自摸 [${baseScore}×3]`)
            if (finishedPlayers.size >= 3) {
              return buildResult(curr, '杠上自摸', baseScore, player.winHandType || '杠上自摸', baseScore, undefined)
            }
            g.current = (curr + 1) % 4
            continue
          }
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      if (Math.random() < player.policy.kakanAggression) {
        applyJiaGang(player, jg)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(normalizeHand(player.hand), player.exposedMelds, makeWT(player)).canWin) {
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore, 1)
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            player.wonFan = baseScore
            const wt_jg = detectHandTypes(player.hand, player.exposedMelds, player.wildSuit && player.wildValue ? `${player.wildSuit}-${player.wildValue}` : null, true, player.flowerTiles.length)
            player.winHandType = wt_jg.map(t => String(t)).join(',')
            player.status = 'won'
            finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, turn)
            log(player.name, '胡牌(血战)', `加杠自摸 [${baseScore}×3]`)
            if (finishedPlayers.size >= 3) {
              return buildResult(curr, '杠上自摸', baseScore, player.winHandType || '杠上自摸', baseScore, undefined)
            }
            g.current = (curr + 1) % 4
            continue
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
    checkHandInvariant(player, 'discard')  // 出牌后铁律：13/10/7/4/1张

    // Others check hu
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWin(testHand, opp.exposedMelds, makeWT(opp), false).canWin) {
        // [DEBUG FORCE HU] 强制100%捉冲，只要能胡就必胡
        const huChance = 1.0
        if (Math.random() < huChance) {
          opp.hand = normalizeHand(testHand)
          const score = calcScore(opp, false, false, g.gameMultiplier)
          opp.score += score; player.score -= score
          // 互包结算：如果有人对opp有包三，且放炮者不是包家
          applyBaoSettlement(g, other, false, curr, score, 1)
          recordPayment(player.name, opp.name, score * g.gameMultiplier, '放炮', g.gameMultiplier)
          log(opp.name, '放炮胡', `${player.name}出${tileStr(discard)}→${opp.hand.map(t => tileStr(t)).join(' ')} [${score}]`)
          opp.wonFan = score
          const wt_d = detectHandTypes(opp.hand, opp.exposedMelds, opp.wildSuit && opp.wildValue ? `${opp.wildSuit}-${opp.wildValue}` : null, false, opp.flowerTiles.length)
          opp.winHandType = wt_d.map(t => String(t)).join(',')
          opp.status = 'won'
          finishedPlayers.add(other)
          recordWinner(opp, other, false, score, turn)
          log(opp.name, '胡牌(血战)', `放冲 [${score}]`)
          if (finishedPlayers.size >= 3) {
            return buildResult(other, '放冲', score, opp.winHandType || '放冲', score, curr)
          }
          g.current = (other + 1) % 4
          continue
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
      // 碰之前先检查明杠：已有3张碰了，打出的第4张可以直接明杠（优先级高于碰）
      if (canMingKong(opp, discard)) {
        if (Math.random() < opp.policy.kongChance) {
          applyMingKong(opp, discard, curr)
          const extra = drawTile(g, opp)
          if (!extra) return null
          checkHandInvariant(opp, 'draw')  // 杠后摸牌
          if (extra && !isFlower(extra)) {
            if (canWin(normalizeHand(opp.hand), opp.exposedMelds, makeWT(opp)).canWin) {
              const kongBaseScore = calcScore(opp, true, true, g.gameMultiplier)
              opp.score += kongBaseScore * 3
              for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
              applyBaoSettlement(g, otherIdx, true, null, kongBaseScore, 1)
              log(opp.name, '明杠自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3]（杠开）`)
              opp.wonFan = kongBaseScore
              const wt = detectHandTypes(opp.hand, opp.exposedMelds, opp.wildSuit && opp.wildValue ? `${opp.wildSuit}-${opp.wildValue}` : null, true, opp.flowerTiles.length)
              opp.winHandType = wt.map(t => String(t)).join(',')
              opp.status = 'won'
              finishedPlayers.add(otherIdx)
              recordWinner(opp, otherIdx, true, kongBaseScore, turn)
              log(opp.name, '胡牌(血战)', `明杠自摸 [${kongBaseScore}×3]`)
              if (finishedPlayers.size >= 3) {
                return buildResult(otherIdx, '杠上自摸', kongBaseScore, opp.winHandType || '明杠自摸', kongBaseScore, undefined)
              }
              g.current = (otherIdx + 1) % 4
              continue
            }
          }
          // 明杠后补摸，非自摸则打出
          const kongDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== kongDiscard.id)
          g.discardPile.push(kongDiscard)
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }
      if (canPeng(opp, discard)) {
        if (!checkChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)) continue;  // K哥铁律：吃碰排斥
        let pengChance = opp.policy.pengChance
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue)
          pengChance += opp.policy.pengWildBoost
        if (Math.random() < pengChance) {
          const meldCountBefore = opp.exposedMelds.length
          applyPeng(opp, discard, curr)  // 内部已normalize，失败则不push meld
          if (opp.exposedMelds.length === meldCountBefore) continue  // apply失败，跳过pong（不设置meldTaken）
          meldTaken = true
          opp.chowPongExclusion = updateChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)  // K哥铁律：记录碰行动
          checkHandInvariant(opp, 'claim')  // claim后（11/8/5/2张）
          // 碰后自摸：必须先摸牌，删掉这里的错误判断
          for (const ak of canAnKong(opp)) {
            applyAnKong(opp, ak)
            const extra = drawTile(g, opp)
            if (!extra) return null
            checkHandInvariant(opp, 'draw')  // 杠后摸牌（正常摸牌规则）
            if (extra && !isFlower(extra)) {
              if (canWin(normalizeHand(opp.hand), opp.exposedMelds, makeWT(opp)).canWin) {
                const kongBaseScore = calcScore(opp, true, true, g.gameMultiplier)
                opp.score += kongBaseScore * 3
                for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
                applyBaoSettlement(g, otherIdx, true, null, kongBaseScore, 1)
                log(opp.name, '碰杠后自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
                opp.wonFan = kongBaseScore
                const wt_pgs = detectHandTypes(opp.hand, opp.exposedMelds, opp.wildSuit && opp.wildValue ? `${opp.wildSuit}-${opp.wildValue}` : null, true, opp.flowerTiles.length)
                opp.winHandType = wt_pgs.map(t => String(t)).join(',')
                opp.status = 'won'
                finishedPlayers.add(otherIdx)
                recordWinner(opp, otherIdx, true, kongBaseScore, turn)
                log(opp.name, '胡牌(血战)', `碰杠后自摸 [${kongBaseScore}×3]`)
                if (finishedPlayers.size >= 3) {
                  return buildResult(otherIdx, '杠上自摸', kongBaseScore, opp.winHandType || '杠上自摸', kongBaseScore, undefined)
                }
                g.current = (otherIdx + 1) % 4
                continue
              }
            }
          }
          const pengDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== pengDiscard.id)
          g.discardPile.push(pengDiscard)
          g.current = (otherIdx + 1) % 4  // K哥铁律：碰后下家摸牌，不是碰家继续
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // Check chow (only next player)
    const nextP = g.players[nextPlayer]
    if (canChow(nextP, discard) && Math.random() < nextP.policy.chowChance) {
      if (!checkChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)) continue;  // K哥铁律：吃碰排斥
      const beforeChowMelds = nextP.exposedMelds.length
      applyChow(nextP, discard, curr)  // 内部已normalize，失败则不push meld
      if (nextP.exposedMelds.length === beforeChowMelds) continue  // apply失败，跳过chow
      nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)  // K哥铁律：记录吃行动
      checkHandInvariant(nextP, 'claim')  // 吃后（未出牌）铁律
      // 放炮胡检查（claim后draw前，手牌=expectedLen）
      const handAfterChow = normalizeHand(nextP.hand)
      if (canWin(handAfterChow, nextP.exposedMelds, makeWT(nextP), false).canWin) {
        // [DEBUG FORCE HU] 强制100%捉冲
        const huChance = 1.0
        if (Math.random() < huChance) {
          const score = calcScore(nextP, false, false, g.gameMultiplier)
          nextP.score += score; g.players[curr].score -= score
          applyBaoSettlement(g, nextPlayer, false, curr, score, 1)
          recordPayment(g.players[curr].name, nextP.name, score * g.gameMultiplier, '吃后放炮', g.gameMultiplier)
          log(nextP.name, '吃后放炮胡', `${tileStr(discard)} [${score}]`)
          nextP.wonFan = score
          const wt_np_d = detectHandTypes(nextP.hand, nextP.exposedMelds, nextP.wildSuit && nextP.wildValue ? `${nextP.wildSuit}-${nextP.wildValue}` : null, false, nextP.flowerTiles.length)
          nextP.winHandType = wt_np_d.map(t => String(t)).join(',')
          nextP.status = 'won'
          finishedPlayers.add(nextPlayer)
          recordWinner(nextP, nextPlayer, false, score, turn)
          log(nextP.name, '胡牌(血战)', `吃后放冲 [${score}]`)
          if (finishedPlayers.size >= 3) {
            return buildResult(nextPlayer, '放冲', score, nextP.winHandType || '放冲', score, curr)
          }
          g.current = (nextPlayer + 1) % 4
          continue
        }
      }
      // 吃后自摸：必须先摸牌，删掉这里的错误判断
      for (const ak of canAnKong(nextP)) {
        applyAnKong(nextP, ak)
        const extra = drawTile(g, nextP)
        if (!extra) return null
        checkHandInvariant(nextP, 'draw')  // 吃后加杠仍可摸牌（杠不在禁止范围内）
        if (extra && !isFlower(extra)) {
          if (canWin(normalizeHand(nextP.hand), nextP.exposedMelds, makeWT(nextP)).canWin) {
            const kongBaseScore = calcScore(nextP, true, true, g.gameMultiplier)
            nextP.score += kongBaseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== nextPlayer) g.players[i].score -= kongBaseScore }
            applyBaoSettlement(g, nextPlayer, true, null, kongBaseScore, 1)
            log(nextP.name, '吃杠后自摸', `${nextP.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
            nextP.wonFan = kongBaseScore
            const wt_np_k = detectHandTypes(nextP.hand, nextP.exposedMelds, nextP.wildSuit && nextP.wildValue ? `${nextP.wildSuit}-${nextP.wildValue}` : null, true, nextP.flowerTiles.length)
            nextP.winHandType = wt_np_k.map(t => String(t)).join(',')
            nextP.status = 'won'
            finishedPlayers.add(nextPlayer)
            recordWinner(nextP, nextPlayer, true, kongBaseScore, turn)
            log(nextP.name, '胡牌(血战)', `吃杠后自摸 [${kongBaseScore}×3]`)
            if (finishedPlayers.size >= 3) {
              return buildResult(nextPlayer, '杠上自摸', kongBaseScore, nextP.winHandType || '杠上自摸', kongBaseScore, undefined)
            }
            g.current = (nextPlayer + 1) % 4
            continue
          }
        }
      }
      const chowDiscard = aiDiscard(nextP, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, nextPlayer)
      nextP.hand = nextP.hand.filter(t => t.id !== chowDiscard.id)
      g.discardPile.push(chowDiscard)
      g.current = (nextPlayer + 1) % 4  // K哥铁律：吃后下家摸牌，不是吃家继续
      continue
    }

    g.current = nextPlayer
    consecutiveDraws++
    if (consecutiveDraws > MAX_ROUNDS * 4) {
      // 流局：返回已有赢家（如果有的话）
      if (winnersThisGame.length > 0) {
        return buildResult(winnersThisGame[0].playerIndex, '流局', 0, '流局', 0, undefined)
      }
      return null
    }
  }
  // 牌墙耗尽：同上
  if (winnersThisGame.length > 0) {
    return buildResult(winnersThisGame[0].playerIndex, '流局', 0, '流局', 0, undefined)
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
  totalGames: number; winGames: number; selfDrawGames: number
  fightToLastGames: number  // 血战到最后一人（多赢家局）
  bigWinGames: number       // 大牌局数（清碰/风一色/风碰/门清清一色）
  menqingWinGames: number  // 门清胡牌局数
  metricsFitness: number    // 指标导向fitness（用于基线训练）
  worstSingleLoss: { loser: string; score: number; gameIdx: number; result: GameResult } | null
  // 新增：每轮详情
  winningGames: WinningGameRecord[]  // 所有胡牌局明细
  multiWinDist: number[]  // [n1,n2,n3,n4] = n玩家同时胡牌的局数分布
  handTypeDist: Record<string, number>  // 牌型分布计数
  // 玩家得分统计（用于报告）
  playerStats: { name: string; score: number; wins: number; deltas: number[] }[]
}

function formatRoundMarkdown(roundNo: number, evalResult: EvalResult, bestPolicy: BotPolicy): string {
  const ts = new Date().toISOString()
  const drawGames = evalResult.totalGames - evalResult.winGames
  const loss = evalResult.worstSingleLoss
  const lines: string[] = []

  lines.push(`## Round ${roundNo} (${ts})`)
  lines.push('')
  lines.push('### 训练指标')
  lines.push(`- Games: ${evalResult.totalGames}`)
  lines.push(`- 胡牌局: ${evalResult.winGames} (${(evalResult.winGames / Math.max(1, evalResult.totalGames) * 100).toFixed(2)}%)`)
  lines.push(`- 流局: ${drawGames} (${(drawGames / Math.max(1, evalResult.totalGames) * 100).toFixed(2)}%)`)
  const fightRate = evalResult.winGames > 0 ? (evalResult.fightToLastGames / evalResult.winGames * 100).toFixed(2) : '0.00'
  lines.push(`- 血战到最后一人: ${evalResult.fightToLastGames} (${fightRate}%)`)
  lines.push(`- 自摸率(胡牌中): ${(evalResult.selfDrawGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- 大牌率(胡牌中): ${(evalResult.bigWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- 门清胡牌率(胡牌中): ${(evalResult.menqingWinGames / Math.max(1, evalResult.winGames) * 100).toFixed(2)}%`)
  lines.push(`- Fitness: ${evalResult.akScore.toFixed(4)}`)
  lines.push('')

  lines.push('### 本轮最佳策略参数')
  lines.push('```json')
  lines.push(JSON.stringify(bestPolicy, null, 2))
  lines.push('```')
  lines.push('')

  lines.push('### 最大单人亏损局明细（本轮）')
  if (!loss) {
    lines.push('- 本轮无有效对局数据')
    return lines.join('\n')
  }

  const r = loss.result
  const gm = r.gameMultiplier
  lines.push(`- 最大亏损: ${loss.loser} ${loss.score} 点（绝对值 ${Math.abs(loss.score)}）`)
  lines.push(`- 局号: ${loss.gameIdx}`)
  lines.push(`- 回合: ${r.roundNum}`)
  lines.push(`- 总筹码: ${Math.abs(loss.score)}`)
  const firstSnap = r.snapshots?.[0]
  lines.push(`- 百搭: ${firstSnap?.wildTile ?? '未知'}（手牌含${firstSnap?.wildCount ?? 0}张）`)
  lines.push(`- 回合/全局倍数信息:`)
  lines.push(`  - 全局倍数: x${gm}`)
  // 显示所有玩家的百搭信息
  if (r.snapshots) {
    for (const snap of r.snapshots) {
      if (snap.wildCount > 0) {
        lines.push(`  - ${snap.name}: 百搭${snap.wildTile}，手牌含${snap.wildCount}张`)
      }
    }
  }

  // 胡牌玩家明细
  lines.push('')
  lines.push('- 输出该局所有胡牌玩家明细')
  const winnerSnap = r.snapshots?.[r.winner]
  if (winnerSnap) {
    lines.push(`  - 玩家: ${winnerSnap.name}`)
    // 从events推断胡牌方式
    const winEvent = r.events.find(e => e.action.includes('自摸') || e.action.includes('放炮胡') || e.action.includes('胡'))
    const winType = winEvent?.action?.includes('自摸') ? '自摸' : winEvent?.action?.includes('放炮') ? '放冲' : '胡牌'
    lines.push(`    - 胡牌方式: ${winType}`)
    lines.push(`    - 百搭牌: ${winnerSnap.wildTile || '(无百搭)'}`)
    lines.push(`    - 手牌牌面: ${winnerSnap.hand || '(空)'}`)
    lines.push(`    - 门口牌（吃/碰/杠）: ${winnerSnap.melds.length > 0 ? winnerSnap.melds.join(' ; ') : '(无)'}`)
    lines.push(`    - 花牌: ${winnerSnap.flowers.length > 0 ? winnerSnap.flowers.join(' ') : '(无)'}`)
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
    lines.push('')
    lines.push('- 三口/四口关系')
    lines.push(...baoRelations)
  }

  // 结算逐笔明细
  lines.push('')
  lines.push('- 结算逐笔明细（谁付给谁、倍率和金额）')
  if (r.settlementLog && r.settlementLog.length > 0) {
    for (const s of r.settlementLog) {
      const multStr = s.mult ? ` (${s.amount / s.mult}x${s.mult})` : ''
      lines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
    }
  } else {
    lines.push('  - (无)')
  }

  return lines.join('\n')
}

function evaluatePolicy(akPolicy: BotPolicy, otherPolicies: BotPolicy[], games: number): EvalResult {
  const scores: Record<string, number> = {}
  const wins: Record<string, number> = {}
  for (const n of AI_NAMES) { scores[n] = 0; wins[n] = 0 }
  let draws = 0
  let winGames = 0
  let selfDrawGames = 0
  let fightToLastGames = 0
  let bigWinGames = 0
  let menqingWinGames = 0
  let bigWin: EvalResult['bigWin'] = null
  let bigLoss: EvalResult['bigLoss'] = null
  let worstSingleLoss: EvalResult['worstSingleLoss'] = null
  const winningGames: WinningGameRecord[] = []
  const multiWinDist = [0, 0, 0, 0]  // [单人赢,双人赢,三人赢,四人赢] 局数
  const handTypeDist: Record<string, number> = {}
  prevRoundWasDraw = false

  for (let g = 0; g < games; g++) {
    const result = runGame(akPolicy, otherPolicies)
    if (result) {
      const winner = AI_NAMES[result.winner]
      wins[winner]++
      winGames++
      prevRoundWasDraw = false

      // 判断是否自摸
      const winEvents = result.events.filter(e => e.action.includes('自摸'))
      if (winEvents.length > 0) selfDrawGames++

      const akDelta = result.scores[0] * SETTLEMENT_MULT
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += result.scores[i] * SETTLEMENT_MULT
      }
      if (akDelta > 0 && (!bigWin || akDelta > bigWin.score)) bigWin = { gameIdx: g, result, score: akDelta }
      if (akDelta < 0 && (!bigLoss || akDelta < bigLoss.score)) bigLoss = { gameIdx: g, result, score: akDelta }

      // === 用 winnersThisGame（runGame 里每个赢家直接 push 的）统计 ===
      const gameWinners = result.winnersThisGame || []
      const winnerCount = gameWinners.length
      if (winnerCount > 0) {
        if (winnerCount >= 2) fightToLastGames++
        if (winnerCount >= 1 && winnerCount <= 4) multiWinDist[winnerCount - 1]++
        for (const w of gameWinners) {
          const typeNums = w.winHandType ? w.winHandType.split(',').map(Number).filter(n => !isNaN(n)) : []
          const typeNames = typeNums.filter(n => n !== HandType.STANDARD).map(n => HAND_TYPE_NAMES[n] || String(n))
          // K哥铁律：不存在普通胡/基础胡；detectHandTypes返回空时跳过（不是错误）
          const bigTypes = [HandType.FENG_PENG, HandType.ALL_WIND, HandType.QING_PENG]
          if (typeNums.some(n => bigTypes.includes(n))) bigWinGames++
          if (w.melds.length === 0 && typeNums.length > 0) menqingWinGames++
          for (const t of typeNames) handTypeDist[t] = (handTypeDist[t] || 0) + 1
          const akIsWinner = w.name === 'AI-AK'
          const winnerScore = result.scores[w.playerIndex] || 0
          const akDeltaForWinner = akIsWinner ? winnerScore * SETTLEMENT_MULT : 0
          winningGames.push({
            gameIdx: g, winnerName: w.name, hand: w.hand,
            melds: w.melds, handTypes: typeNames,
            isSelfDraw: w.isSelfDraw, score: winnerScore,
            multiplier: result.multiplier, roundNum: w.roundNum,
            akDelta: akDeltaForWinner, result,
            wonFan: w.wonFan, winHandType: w.winHandType,
            wildTile: w.wildTile, wildTileValue: w.wildTileValue
          })
        }
      }

      // 找全局最大单人亏损
      for (let i = 0; i < 4; i++) {
        const delta = result.scores[i] * SETTLEMENT_MULT
        if (!worstSingleLoss || delta < worstSingleLoss.score) {
          worstSingleLoss = { loser: AI_NAMES[i], score: delta, gameIdx: g, result }
        }
      }
    } else {
      draws++
      prevRoundWasDraw = true
    }
  }

  const winRates: Record<string, number> = {}
  for (const n of AI_NAMES) winRates[n] = wins[n] / games

  // 计算指标导向fitness
  const drawRate = draws / games
  const selfDrawRate = winGames > 0 ? selfDrawGames / winGames : 0
  const discardWinRate = winGames > 0 ? (winGames - selfDrawGames) / winGames : 0
  const fightToLastRate = winGames > 0 ? fightToLastGames / winGames : 0  // TODO: 血战需要多赢家支持
  const bigHandRate = winGames > 0 ? bigWinGames / winGames : 0  // TODO: 大牌率需要手牌分析
  const menqingWinRate = winGames > 0 ? menqingWinGames / winGames : 0  // TODO: 门清需要判定

  let mf = 0
  mf -= Math.max(0, drawRate - 0.10) * 1000  // 流局率惩罚（目标<10%）
  mf += Math.max(0, (1 - drawRate) - 0.90) * 500  // 胡牌率奖励（目标>=90%）
  mf -= Math.abs(selfDrawRate - 0.50) * 200    // 自摸率偏差（目标50%）
  mf -= Math.abs(discardWinRate - 0.50) * 200  // 捉冲率偏差（目标50%）
  // 血战率（目标>80%）
  mf += Math.max(0, fightToLastRate - 0.80) * 300
  mf -= Math.max(0, 0.80 - fightToLastRate) * 500
  // 大牌率（目标3-8%）
  if (bigHandRate < 0.03) mf -= (0.03 - bigHandRate) * 500
  if (bigHandRate > 0.08) mf -= (bigHandRate - 0.08) * 500
  // 门清胡牌率（目标7-12%）
  if (menqingWinRate < 0.07) mf -= (0.07 - menqingWinRate) * 400
  if (menqingWinRate > 0.12) mf -= (menqingWinRate - 0.12) * 400

  return {
    akScore: scores['AI-AK'], akWins: wins['AI-AK'], winRates, scores, draws,
    bigWin, bigLoss, totalGames: games, winGames, selfDrawGames,
    fightToLastGames, bigWinGames, menqingWinGames, metricsFitness: mf, worstSingleLoss,
    winningGames, handTypeDist, multiWinDist,
    playerStats: AI_NAMES.map(name => ({ name, score: scores[name] || 0, wins: wins[name] || 0, deltas: [] })),
  }
}

// ========== Main Training Loop ==========
function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const mdFile = path.join(OUT_DIR, `ai-ak-training-${timestamp}.md`)
  const policyFile = path.join(OUT_DIR, `best-policy-ai-ak-${timestamp}.json`)
  const policyLatest = path.join(OUT_DIR, 'best-policy.json')

  // Ensure output dir
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // 重置 isTing 缓存统计
  resetIsTingCacheStats()
  // 重置 canWin 缓存统计（通过 clearCanWinCache）
  // 注：clearCanWinCache 已由每局 setupGame 调用

  // Load fixed opponent policies
  const fixedPolicies = [
    loadCharacter('AI-小胖'),
    loadCharacter('AI-阿水'),
    loadCharacter('AI-老赵')
  ]

  // Load current AI-AK as starting point
  let bestPolicy = loadCharacter('AI-AK')
  let bestScore = -Infinity
  let logLines: string[] = []

  const header = [
    '# 长清阁麻将 AI-AK 训练日志',
    '',
    `- 创建时间: ${new Date().toISOString()}`,
    `- 训练脚本: train-ai-ak.ts`,
    `- Config: ${ROUNDS} rounds × ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`,
    `- 对手: AI-小胖, AI-阿水, AI-老赵 (固定)`,
    `- 目标: 最高盈利总分`,
    '',
    '> 每轮记录训练指标 + 策略参数 + 最大单人亏损局明细 + 结算逐笔',
  ]
  console.log(header.join('\n'))
  logLines.push(...header)

  // Round 0: baseline evaluation
  console.log('\n## 基线成绩（第0轮）')
  logLines.push('\n## 基线成绩（第0轮）')
  const baseline = evaluatePolicy(bestPolicy, fixedPolicies, GAMES_PER_ROUND)
  bestScore = BASELINE_MODE ? baseline.metricsFitness : baseline.akScore
  const selfDRate = baseline.winGames > 0 ? (baseline.selfDrawGames/baseline.winGames*100).toFixed(1) : '0'
  const baseLine = BASELINE_MODE
    ? `| Bot | 总分 | 胜率 | 排名 |\n|-----|------|------|------|\n` + AI_NAMES.map(n => `| ${n} | ${baseline.scores[n]} | ${(baseline.winRates[n]*100).toFixed(1)}% | - |`).join('\n') + `\n| 流局率 | ${(baseline.draws/GAMES_PER_ROUND*100).toFixed(1)}% | | |`
    : `AI-AK baseline: score=${baseline.akScore}  wins=${baseline.akWins}/${GAMES_PER_ROUND}  draws=${baseline.draws}`
  console.log(baseLine)
  logLines.push(baseLine)

  // Track history for adaptive mutation
  const scoreHistory: number[] = [baseline.akScore]
  let plateauCount = 0
  const roundReports: ReturnType<typeof buildRoundReport>[] = []

  // Training rounds
  for (let round = 1; round <= ROUNDS; round++) {
    // Adaptive mutation intensity
    let intensity = 1.0
    if (plateauCount >= 2) intensity = 1.8  // more aggressive when stuck
    if (plateauCount >= 4) intensity = 2.5  // very aggressive

    // Generate candidate policies
    const candidates: BotPolicy[] = []

    // 3 mutated versions of best
    for (let i = 0; i < 3; i++) {
      candidates.push(mutatePolicy(bestPolicy, intensity))
    }

    // 1 from historical best (top 2 from score history) if we have enough history
    if (scoreHistory.length >= 3) {
      candidates.push(mutatePolicy(bestPolicy, intensity * 0.5))
    }

    // 1 crossover with fixed opponents (mix in opponent traits)
    const crossPartner = fixedPolicies[Math.floor(Math.random() * fixedPolicies.length)]
    candidates.push(crossoverPolicy(bestPolicy, crossPartner))

    // Evaluate each candidate
    let roundBestScore = -Infinity
    let roundBestPolicy = bestPolicy
    let roundBigWin: EvalResult['bigWin'] = null
    let roundBigLoss: EvalResult['bigLoss'] = null
    let roundWorstLoss: EvalResult['worstSingleLoss'] = null

    const roundLines: string[] = []
    roundLines.push(`### 第${round}轮 (强度=${intensity.toFixed(1)}, 停滞=${plateauCount})`)

    let bestEvalResult: EvalResult | null = null

    for (let c = 0; c < candidates.length; c++) {
      const result = evaluatePolicy(candidates[c], fixedPolicies, GAMES_PER_ROUND)
      const score = BASELINE_MODE ? result.metricsFitness : result.akScore
      const selfDR = result.winGames > 0 ? (result.selfDrawGames/result.winGames*100).toFixed(0) : '0'
      const line = BASELINE_MODE
        ? `  Candidate ${c+1}: fitness=${score.toFixed(1)}  draws=${result.draws}(${(result.draws/GAMES_PER_ROUND*100).toFixed(0)}%)  selfDraw=${selfDR}%`
        : `  Candidate ${c+1}: score=${result.akScore}  wins=${result.akWins}/${GAMES_PER_ROUND} (${(result.winRates['AI-AK']*100).toFixed(1)}%)  draws=${result.draws}`
      roundLines.push(line)

      if (score > roundBestScore) {
        roundBestScore = score
        roundBestPolicy = candidates[c]
        roundBigWin = result.bigWin
        roundBigLoss = result.bigLoss
        roundWorstLoss = result.worstSingleLoss
        bestEvalResult = result
      }
    }

    // Is this better than overall best?
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
    // Keep history manageable
    if (scoreHistory.length > 10) scoreHistory.shift()

    const statusLine = improved
      ? `  ★ NEW BEST! AI-AK score=${bestScore}`
      : `  Best this round: ${roundBestScore}  (overall best: ${bestScore})  [plateau: ${plateauCount}]`
    roundLines.push(statusLine)

    // Print opponent summary
    const evalResult = evaluatePolicy(bestPolicy, fixedPolicies, GAMES_PER_ROUND)
    const summaryLine = `  Current standings: ` + AI_NAMES.map(n =>
      `${n}:${evalResult.scores[n]}(${(evalResult.winRates[n]*100).toFixed(0)}%)`
    ).join('  ')
    roundLines.push(summaryLine)

    // 每轮最大赢/输明细
    if (roundBigWin) {
      const evs = roundBigWin.result.events
      const winner = AI_NAMES[roundBigWin.result.winner]
      roundLines.push(`\n**本轮AK最大赢局** +${roundBigWin.score} (局次${roundBigWin.gameIdx}, 倍×${roundBigWin.result.multiplier})`)
      for (const e of evs.slice(-8)) roundLines.push(`- ${e.player} ${e.action}: ${e.detail}`)
    }
    if (roundBigLoss) {
      const evs = roundBigLoss.result.events
      roundLines.push(`\n**本轮AK最大输局** ${roundBigLoss.score} (局次${roundBigLoss.gameIdx}, 倍×${roundBigLoss.result.multiplier})`)
      for (const e of evs.slice(-8)) roundLines.push(`- ${e.player} ${e.action}: ${e.detail}`)
    }

    console.log(roundLines.join('\n'))
    logLines.push(...roundLines)

    // 每轮单独输出文件（使用标准化reporter）
    if (bestEvalResult) {
      const report = buildRoundReport(round, bestEvalResult, roundBestPolicy as any, AI_NAMES)
      roundReports.push(report)
      const filename = writeRoundFile(OUT_DIR, report)
      console.log(`  → 轮次详情已保存: ${filename}`)
      logLines.push('', formatRoundMarkdown(round, bestEvalResult, roundBestPolicy), '')
    }
  }  // End round loop

  // Print cache stats
  const tingStats = getIsTingCacheStats()
  const canWinStats = getCanWinCacheStats()
  console.log(`\n[性能] isTing缓存: 命中${tingStats.hits} 未命中${tingStats.misses} 命中率${tingStats.hitRate}`)
  console.log(`[性能] canWin缓存: 命中${canWinStats.hits} 未命中${canWinStats.misses} 命中率${canWinStats.hitRate}`)
  logLines.push(`\n[性能] isTing缓存: 命中${tingStats.hits} 未命中${tingStats.misses} 命中率${tingStats.hitRate}`)
  logLines.push(`[性能] canWin缓存: 命中${canWinStats.hits} 未命中${canWinStats.misses} 命中率${canWinStats.hitRate}`)

  // Final evaluation
  console.log('\n--- 最终评估 (1000局) ---')
  logLines.push('\n--- 最终评估 (1000局) ---')

  const finalEval = evaluatePolicy(bestPolicy, fixedPolicies, 1000)
  const finalLines = AI_NAMES.map((n, i) => {
    const rank = i === 0 ? '★' : ' '
    return `  ${rank} ${n.padEnd(8)}  score:${finalEval.scores[n].toString().padStart(8)}  wins:${finalEval.winRates[n].toFixed(3)}`
  })
  finalLines.push(`  Draws: ${finalEval.draws}/1000`)
  finalLines.push(`\n  AI-AK optimal policy parameters:`)

  // Print all key parameters
  const keyParams: (keyof BotPolicy)[] = [
    'selfWinChance', 'discardHuChance', 'pengChance', 'chowChance', 'anKongChance',
    'allPungsPursuit', 'pureFlushPursuit', 'halfFlushWeight', 'sevenPairsPursuit',
    'menqingKeepBonus', 'noWildDoubleAwareness',
    'wild0Aggression', 'wild1Aggression', 'wild2Aggression', 'wild3PlusAggression',
    'wild1RouteMeldPush', 'wild2RouteMeldPush', 'wild3RouteMeldPush',
    'wild0MenqingKeep', 'wild1MenqingKeep', 'wild2MenqingKeep',
    'wild1BaoPush', 'wild2BaoPush', 'wild3BaoPush',
    'multHighValueBias', 'hand7RouteBias',
    'discardObsFlushBoost', 'discardObsWeight',
    'bao2ClaimPenalty', 'bao3AvoidThreshold',
    'wallLateDefense', 'safeTilePriority',
    'oppTingDetection',
    'multHighHand6PureFlush', 'multHighHand7PureFlush',
    'multLowHand6AllPungs', 'multHighHand5HalfFlush',
    'multHighHonorStart',
  ]
  for (const k of keyParams) {
    const val = (bestPolicy as any)[k]
    finalLines.push(`    ${k}: ${typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4)) : val}`)
  }

  // 最终评估最大赢/输明细
  if (finalEval.bigWin) {
    const evs = finalEval.bigWin.result.events
    const winner = AI_NAMES[finalEval.bigWin.result.winner]
    finalLines.push(`\n  【最终评估AK最大赢局】+${finalEval.bigWin.score} (倍×${finalEval.bigWin.result.multiplier})`)
    for (const e of evs) finalLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
  }
  if (finalEval.bigLoss) {
    const evs = finalEval.bigLoss.result.events
    finalLines.push(`\n  【最终评估AK最大输局】${finalEval.bigLoss.score} (倍×${finalEval.bigLoss.result.multiplier})`)
    for (const e of evs) finalLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
  }

  console.log(finalLines.join('\n'))
  logLines.push(...finalLines)

  if (finalEval.worstSingleLoss) {
    const gl = finalEval.worstSingleLoss
    logLines.push('')
    logLines.push('## 全局最大单人亏损局（跨所有轮次）')
    logLines.push(`- 最大亏损: ${gl.loser} ${gl.score} 点（绝对值 ${Math.abs(gl.score)}）`)
    logLines.push(`- 局号: ${gl.gameIdx}`)
    logLines.push(`- 倍数: ×${gl.result.multiplier}`)

    // 胡牌玩家明细
    logLines.push('')
    logLines.push('- 输出该局所有胡牌玩家明细')
    const gWinnerSnap = gl.result.snapshots?.[gl.result.winner]
    if (gWinnerSnap) {
      const gWinEvent = gl.result.events.find(e => e.action.includes('自摸') || e.action.includes('放炮胡') || e.action.includes('胡'))
      const gWinType = gWinEvent?.action?.includes('自摸') ? '自摸' : gWinEvent?.action?.includes('放冲') ? '放冲' : '胡牌'
      logLines.push(`  - 玩家: ${gWinnerSnap.name}`)
      logLines.push(`    - 胡牌方式: ${gWinType}`)
      logLines.push(`    - 手牌牌面: ${gWinnerSnap.hand || '(空)'}`)
      logLines.push(`    - 门口牌（吃/碰/杠）: ${gWinnerSnap.melds.length > 0 ? gWinnerSnap.melds.join(' ; ') : '(无)'}`)
      logLines.push(`    - 花牌: ${gWinnerSnap.flowers.length > 0 ? gWinnerSnap.flowers.join(' ') : '(无)'}`)
    }

    // 三口/四口
    const gBao: string[] = []
    for (const snap of gl.result.snapshots || []) {
      for (let ci = 0; ci < 4; ci++) {
        if (snap.meldSources[ci] >= 3) {
          const partner = gl.result.snapshots?.[ci]
          if (partner) {
            const level = snap.meldSources[ci] >= 4 ? '四口' : '三口'
            gBao.push(`  - ${snap.name} <-> ${partner.name}: ${level} (A->B:${snap.meldSources[ci]}, B->A:${partner.meldSources?.[gl.result.snapshots.indexOf(snap)] || 0})`)
          }
        }
      }
    }
    if (gBao.length > 0) {
      logLines.push('')
      logLines.push('- 三口/四口关系')
      logLines.push(...gBao)
    }

    // 结算明细
    logLines.push('')
    logLines.push('- 结算逐笔明细（谁付给谁、倍率和金额）')
    if (gl.result.settlementLog && gl.result.settlementLog.length > 0) {
      for (const s of gl.result.settlementLog) {
        const multStr = s.mult ? ` (${s.amount / s.mult}x${s.mult})` : ''
        logLines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
      }
    } else {
      logLines.push('  - (无)')
    }
  }

  // Save
  const metrics = {
    fitness: finalEval.akScore,
    huRate: finalEval.winRates['AI-AK'],
    drawRate: finalEval.draws / 1000,
    totalGames: ROUNDS * GAMES_PER_ROUND,
    note: `AI-AK iterative training - ${ROUNDS}x${GAMES_PER_ROUND}`
  }

  if (BASELINE_MODE) {
    // 基线模式：四家同步保存
    for (const name of AI_NAMES) {
      saveCharacter(name, bestPolicy, metrics)
    }
    console.log(`Baseline saved to all 4 AIs: ${AI_NAMES.join(', ')}`)
  } else {
    saveCharacter('AI-AK', bestPolicy, metrics)
  }

  fs.writeFileSync(mdFile, logLines.join('\n'), 'utf-8')
  fs.writeFileSync(policyFile, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  fs.writeFileSync(policyLatest, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  const indexFile = writeIndexFile(OUT_DIR, roundReports)

  console.log(`\nLog saved: ${mdFile}`)
  console.log(`Policy saved: ${policyFile}`)
  console.log(`Policy latest: ${policyLatest}`)
  console.log(`Index saved: ${indexFile}`)
}

// Only run when executed directly (not imported)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) main()
