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
  detectHandTypes, HandType, isTing
} from '../server/utils/handValidator'
import {
  calculateScore
} from '../server/utils/scoring'
import { TileSuit, MeldType, WinType, type Tile, type Meld } from '../server/types/game'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUNDS = parseInt(process.argv[2] || '10')
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000')
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const OUT_DIR = path.resolve(__dirname, '..', 'training-output')

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
  allPungsPursuit: 0.5, pureFlushPursuit: 0.3, halfFlushWeight: 0.4,
  sevenPairsPursuit: 0.2, allHonorsPursuit: 0.1, allHonorsPungsPursuit: 0.05,
  qingPengPursuit: 0.15, hunPengPursuit: 0.3,
  windEastKeep: 2.0, windSouthKeep: 1.0, windWestKeep: 1.0, windNorthKeep: 1.0,
  windGeneralKeep: 1.5,
  dragonRedKeep: 3.0, dragonGreenKeep: 3.0, dragonWhiteKeep: 2.5, dragonGeneralKeep: 3.0,
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
function tileEq(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value }
function tileStr(t: Tile): string {
  const suits: Record<string, string> = { dots: '筒', characters: '万', bamboos: '条', wind: '风', dragon: '箭', flower: '花' }
  const honors: Record<string, Record<number, string>> = { wind: { 1: '东', 2: '南', 3: '西', 4: '北' }, dragon: { 1: '中', 2: '发', 3: '白' } }
  if (t.suit === TileSuit.FLOWER) return `花${t.value}`
  if (honors[t.suit]) return honors[t.suit][t.value] || '?'
  return `${t.value}${suits[t.suit] || t.suit}`
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
    meldSources: [0, 0, 0, 0], discardedTiles: [] as Tile[]
  }))

  const gameMultiplier = nextGameMultiplier()

  return { deck, wallIdx: 0, players, current: 0, wildSuit: ws, wildValue: wv, discardPile: [],
    gameMultiplier, playerDiscards: [[], [], [], []] }
}

function drawTile(g: GameState, p: BotPlayer): Tile | null {
  if (g.wallIdx >= g.deck.length) return null
  const tile = g.deck[g.wallIdx++]
  if (isFlower(tile)) { p.flowerTiles.push(tile); return drawTile(g, p) }
  p.hand.push(tile)
  return tile
}

function isWT(t: Tile, p: BotPlayer): boolean { return isWild(t, p.wildSuit, p.wildValue) }
function makeWT(p: BotPlayer) { return buildWildTileChecker(p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null) }

// ========== Meld detection ==========
function canPeng(p: BotPlayer, tile: Tile): boolean {
  return p.hand.filter(t => tileEq(t, tile)).length >= 2
}
function canChow(p: BotPlayer, tile: Tile): boolean {
  if (isHonor(tile) || tile.suit === TileSuit.FLOWER) return false
  const v = tile.value
  if (v < 2 || v > 8) return false
  return p.hand.some(t => t.suit === tile.suit && t.value === v - 1) &&
         p.hand.some(t => t.suit === tile.suit && t.value === v + 1)
}
function canMingKong(p: BotPlayer, tile: Tile): boolean {
  return p.hand.filter(t => tileEq(t, tile)).length >= 3
}
function canAnKong(p: BotPlayer): Tile[] {
  const groups = groupTiles(p.hand)
  const result: Tile[] = []
  for (const [k, tiles] of groups) { if (tiles.length === 4) result.push(tiles[0]) }
  return result
}
function canJiaGang(p: BotPlayer): Tile[] {
  const result: Tile[] = []
  for (const meld of p.exposedMelds) {
    if (meld.type === MeldType.TRIPLET) {
      if (p.hand.find(t => tileEq(t, meld.tiles[0]))) result.push(p.hand.find(t => tileEq(t, meld.tiles[0]))!)
    }
  }
  return result
}

// ========== Apply melds ==========
function applyPeng(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  for (const u of matches) { const idx = p.hand.findIndex(rt => rt.id === u.id); if (idx >= 0) p.hand.splice(idx, 1) }
  p.exposedMelds.push({ type: MeldType.TRIPLET, tiles: [tile, tile, tile], isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyChow(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  const v = tile.value
  const low = p.hand.find(t => t.suit === tile.suit && t.value === v - 1)!
  const high = p.hand.find(t => t.suit === tile.suit && t.value === v + 1)!
  const idxL = p.hand.findIndex(t => t.id === low.id); if (idxL >= 0) p.hand.splice(idxL, 1)
  const idxH = p.hand.findIndex(t => t.id === high.id); if (idxH >= 0) p.hand.splice(idxH, 1)
  p.exposedMelds.push({ type: MeldType.SEQUENCE, tiles: [low, tile, high], isConcealed: false })
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyMingKong(p: BotPlayer, tile: Tile, sourcePos?: number): void {
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 3)
  for (const u of matches) { const idx = p.hand.findIndex(rt => rt.id === u.id); if (idx >= 0) p.hand.splice(idx, 1) }
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: false })
  p.kongCount++
  if (sourcePos !== undefined && sourcePos !== p.pos) p.meldSources[sourcePos]++
}
function applyAnKong(p: BotPlayer, tile: Tile): void {
  p.hand = p.hand.filter(t => !tileEq(t, tile))
  p.exposedMelds.push({ type: MeldType.KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
  p.kongCount++
}
function applyJiaGang(p: BotPlayer, tile: Tile): void {
  const meld = p.exposedMelds.find(m => m.type === MeldType.TRIPLET && tileEq(m.tiles[0], tile))!
  meld.type = MeldType.KONG; meld.tiles = [tile, tile, tile, tile]; meld.isConcealed = false
  p.hand = p.hand.filter(t => !tileEq(t, tile)); p.kongCount++
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
  const types = detectHandTypes(p.hand, p.exposedMelds, isSelfDraw, p.flowerTiles.length,
    p.wildSuit && p.wildValue ? `${p.wildSuit}-${p.wildValue}` : null)
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

// ========== AI Discard (长清阁规则) ==========
function aiDiscard(p: BotPlayer, gameMultiplier: number = 1, discardPile: Tile[] = [],
  wallIdx: number = 0, deckLen: number = 144, allPlayers: BotPlayer[] = [], myPos: number = 0): Tile {
  const policy = p.policy
  const hand = p.hand
  const wildCount = hand.filter(t => isWT(t, p)).length
  const isMenqing = p.exposedMelds.length === 0
  const totalMelds = p.exposedMelds.length
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const suitCounts = suits.map(s => hand.filter(t => t.suit === s).length)
  const maxSuitIdx = suitCounts.indexOf(Math.max(...suitCounts))
  const maxSuitCount = suitCounts[maxSuitIdx]
  const honorCount = hand.filter(t => isHonor(t)).length

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

    candidates.push({ tile, keepScore })
  }
  candidates.sort((a, b) => a.keepScore - b.keepScore)
  return candidates[0]?.tile || hand[0]
}

// ========== 游戏明细记录 ==========
interface GameEvent { turn: number; player: string; action: string; detail: string }
interface GameResult { winner: number; scores: number[]; events: GameEvent[]; multiplier: number }

// ========== Game Loop ==========
function runGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[]): GameResult | null {
  const g = setupGame(akPolicy, otherPolicies)
  const events: GameEvent[] = []
  let turn = 0
  const log = (player: string, action: string, detail: string) => { events.push({ turn, player, action, detail }) }

  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }
  // 发牌完成日志
  for (const p of g.players) log(p.name, '发牌', p.hand.map(t => tileStr(t)).join(' '))

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]
    turn = round
    const drawn = drawTile(g, player)
    if (!drawn) return null
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); continue }
    log(player.name, '摸牌', tileStr(drawn))

    // Self-draw win check
    if (canWin(player.hand.filter(t => t !== undefined), player.exposedMelds.length, makeWT(player)).canWin) {
      let winChance = player.policy.selfWinChance
      const wildCount = player.hand.filter(t => isWT(t, player)).length
      winChance += wildCount * player.policy.selfWinWildBoost
      winChance -= player.exposedMelds.length * player.policy.bailoutHuPenaltyPerMeld
      if (Math.random() < winChance) {
        const baseScore = calcScore(player, true, false, g.gameMultiplier)
        // 自摸：每人赔baseScore，赢家得3倍
        player.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
        // 互包结算
        applyBaoSettlement(g, curr, true, null, baseScore)
        log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
        return { winner: curr, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
      }
    }

    // AnKong / JiaGang (policy-driven)
    for (const ak of canAnKong(player)) {
      if (Math.random() < player.policy.anKongChance) {
        applyAnKong(player, ak)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(player.hand.filter(t => t !== undefined), player.exposedMelds.length, makeWT(player)).canWin) {
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            return { winner: curr, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
          }
        }
      }
    }
    for (const jg of canJiaGang(player)) {
      if (Math.random() < player.policy.kakanAggression) {
        applyJiaGang(player, jg)
        const extra = drawTile(g, player)
        if (extra && !isFlower(extra)) {
          if (canWin(player.hand.filter(t => t !== undefined), player.exposedMelds.length, makeWT(player)).canWin) {
            const baseScore = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore)
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            return { winner: curr, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
          }
        }
      }
    }

    player.isTing = isTing(player.hand, player.exposedMelds.length, makeWT(player))

    const discard = aiDiscard(player, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, curr)
    player.hand = player.hand.filter(t => t.id !== discard.id)
    player.discardedTiles.push(discard)
    g.discardPile.push(discard)
    g.playerDiscards[curr].push(discard)
    log(player.name, '出牌', `${tileStr(discard)} [手牌: ${player.hand.map(t => tileStr(t)).join(' ')}]`)

    // Others check hu
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWin(testHand, opp.exposedMelds.length, makeWT(opp)).canWin) {
        let huChance = opp.policy.discardHuChance
        const wildCount = opp.hand.filter(t => isWT(t, opp)).length
        huChance -= wildCount * opp.policy.discardHuWildPenalty
        if (opp.exposedMelds.length === 0) huChance -= opp.policy.discardHuMenQingPenalty
        if (Math.random() < huChance) {
          const score = calcScore(opp, false, false, g.gameMultiplier)
          opp.score += score; player.score -= score
          // 互包结算：如果有人对opp有包三，且放炮者不是包家
          applyBaoSettlement(g, other, false, curr, score)
          log(opp.name, '放炮胡', `${player.name}出${tileStr(discard)}→${opp.hand.map(t => tileStr(t)).join(' ')} [${score}]`)
          return { winner: other, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
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
      if (canPeng(opp, discard)) {
        let pengChance = opp.policy.pengChance
        if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue)
          pengChance += opp.policy.pengWildBoost
        if (Math.random() < pengChance) {
          applyPeng(opp, discard, curr)
          const d = drawTile(g, opp)
          if (!d) return null
          if (canWin(opp.hand.filter(t => t !== undefined), opp.exposedMelds.length, makeWT(opp)).canWin) {
            const baseScore = calcScore(opp, true, false, g.gameMultiplier)
            opp.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= baseScore }
            applyBaoSettlement(g, otherIdx, true, null, baseScore)
            log(opp.name, '碰后自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            return { winner: otherIdx, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
          }
          for (const ak of canAnKong(opp)) {
            applyAnKong(opp, ak)
            const extra = drawTile(g, opp)
            if (extra && !isFlower(extra)) {
              if (canWin(opp.hand.filter(t => t !== undefined), opp.exposedMelds.length, makeWT(opp)).canWin) {
                const kongBaseScore = calcScore(opp, true, true, g.gameMultiplier)
                opp.score += kongBaseScore * 3
                for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
                applyBaoSettlement(g, otherIdx, true, null, kongBaseScore)
                log(opp.name, '碰杠后自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
                return { winner: otherIdx, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
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
    if (canChow(nextP, discard) && Math.random() < nextP.policy.chowChance) {
      applyChow(nextP, discard, curr)
      const d = drawTile(g, nextP)
      if (!d) return null
      if (canWin(nextP.hand.filter(t => t !== undefined), nextP.exposedMelds.length, makeWT(nextP)).canWin) {
        const baseScore = calcScore(nextP, true, false, g.gameMultiplier)
        nextP.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== nextPlayer) g.players[i].score -= baseScore }
        applyBaoSettlement(g, nextPlayer, true, null, baseScore)
        log(nextP.name, '吃后自摸', `${nextP.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
        return { winner: nextPlayer, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
      }
      for (const ak of canAnKong(nextP)) {
        applyAnKong(nextP, ak)
        const extra = drawTile(g, nextP)
        if (extra && !isFlower(extra)) {
          if (canWin(nextP.hand.filter(t => t !== undefined), nextP.exposedMelds.length, makeWT(nextP)).canWin) {
            const kongBaseScore = calcScore(nextP, true, true, g.gameMultiplier)
            nextP.score += kongBaseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== nextPlayer) g.players[i].score -= kongBaseScore }
            applyBaoSettlement(g, nextPlayer, true, null, kongBaseScore)
            log(nextP.name, '吃杠后自摸', `${nextP.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
            return { winner: nextPlayer, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier }
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
  akScore: number
  akWins: number
  winRates: Record<string, number>
  scores: Record<string, number>
  draws: number
  bigWin: { gameIdx: number; result: GameResult; score: number } | null
  bigLoss: { gameIdx: number; result: GameResult; score: number } | null
}

function evaluatePolicy(akPolicy: BotPolicy, otherPolicies: BotPolicy[], games: number): EvalResult {
  const scores: Record<string, number> = {}
  const wins: Record<string, number> = {}
  for (const n of AI_NAMES) { scores[n] = 0; wins[n] = 0 }
  let draws = 0
  let bigWin: EvalResult['bigWin'] = null
  let bigLoss: EvalResult['bigLoss'] = null
  prevRoundWasDraw = false  // 重置流局追踪

  for (let g = 0; g < games; g++) {
    const result = runGame(akPolicy, otherPolicies)
    if (result) {
      const winner = AI_NAMES[result.winner]
      wins[winner]++
      prevRoundWasDraw = false
      const akDelta = result.scores[0] * SETTLEMENT_MULT
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += result.scores[i] * SETTLEMENT_MULT
      }
      // Track AK biggest win/loss
      if (akDelta > 0 && (!bigWin || akDelta > bigWin.score)) bigWin = { gameIdx: g, result, score: akDelta }
      if (akDelta < 0 && (!bigLoss || akDelta < bigLoss.score)) bigLoss = { gameIdx: g, result, score: akDelta }
    } else {
      draws++
      prevRoundWasDraw = true  // 流局→下局倍数×2
    }
  }

  const winRates: Record<string, number> = {}
  for (const n of AI_NAMES) winRates[n] = wins[n] / games

  return { akScore: scores['AI-AK'], akWins: wins['AI-AK'], winRates, scores, draws, bigWin, bigLoss }
}

// ========== Main Training Loop ==========
function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const logFile = path.join(OUT_DIR, `ai-ak-training-${timestamp}.log`)
  const policyFile = path.join(OUT_DIR, `best-policy-ai-ak-${timestamp}.json`)
  const policyLatest = path.join(OUT_DIR, 'best-policy.json')

  // Ensure output dir
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

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
    '============================================',
    `  AI-AK 策略迭代训练 - ${timestamp}`,
    `  Config: ${ROUNDS} rounds × ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`,
    `  对手: AI-小胖, AI-阿水, AI-老赵 (固定)`,
    `  目标: 最高盈利总分`,
    '============================================',
  ]
  console.log(header.join('\n'))
  logLines.push(...header)

  // Round 0: baseline evaluation
  console.log('\n--- Round 0: Baseline ---')
  logLines.push('\n--- Round 0: Baseline ---')
  const baseline = evaluatePolicy(bestPolicy, fixedPolicies, GAMES_PER_ROUND)
  bestScore = baseline.akScore
  const baseLine = `AI-AK baseline: score=${baseline.akScore}  wins=${baseline.akWins}/${GAMES_PER_ROUND} (${(baseline.winRates['AI-AK']*100).toFixed(1)}%)  draws=${baseline.draws}`
  console.log(baseLine)
  logLines.push(baseLine)

  // Track history for adaptive mutation
  const scoreHistory: number[] = [baseline.akScore]
  let plateauCount = 0

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

    const roundLines: string[] = []
    roundLines.push(`\n--- Round ${round}/${ROUNDS} (intensity=${intensity.toFixed(1)}, plateau=${plateauCount}) ---`)

    for (let c = 0; c < candidates.length; c++) {
      const result = evaluatePolicy(candidates[c], fixedPolicies, GAMES_PER_ROUND)
      const line = `  Candidate ${c+1}: score=${result.akScore}  wins=${result.akWins}/${GAMES_PER_ROUND} (${(result.winRates['AI-AK']*100).toFixed(1)}%)  draws=${result.draws}`
      roundLines.push(line)

      if (result.akScore > roundBestScore) {
        roundBestScore = result.akScore
        roundBestPolicy = candidates[c]
        roundBigWin = result.bigWin
        roundBigLoss = result.bigLoss
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
      roundLines.push(`\n  【本轮AK最大赢局】+${roundBigWin.score} (局次${roundBigWin.gameIdx}, 倍×${roundBigWin.result.multiplier})`)
      for (const e of evs.slice(-8)) roundLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
    }
    if (roundBigLoss) {
      const evs = roundBigLoss.result.events
      const winner = AI_NAMES[roundBigLoss.result.winner]
      roundLines.push(`\n  【本轮AK最大输局】${roundBigLoss.score} (局次${roundBigLoss.gameIdx}, 倍×${roundBigLoss.result.multiplier})`)
      for (const e of evs.slice(-8)) roundLines.push(`    ${e.player} ${e.action}: ${e.detail}`)
    }

    console.log(roundLines.join('\n'))
    logLines.push(...roundLines)
  }

  // Final evaluation
  console.log('\n============================================')
  console.log('  FINAL EVALUATION (1000 games)')
  console.log('============================================')
  logLines.push('\n============================================')
  logLines.push('  FINAL EVALUATION (1000 games)')
  logLines.push('============================================')

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

  // Save
  const metrics = {
    fitness: finalEval.akScore,
    huRate: finalEval.winRates['AI-AK'],
    drawRate: finalEval.draws / 1000,
    totalGames: ROUNDS * GAMES_PER_ROUND,
    note: `AI-AK iterative training - ${ROUNDS}x${GAMES_PER_ROUND}`
  }

  saveCharacter('AI-AK', bestPolicy, metrics)

  fs.writeFileSync(logFile, logLines.join('\n'), 'utf-8')
  fs.writeFileSync(policyFile, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  fs.writeFileSync(policyLatest, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')

  console.log(`\nLog saved: ${logFile}`)
  console.log(`Policy saved: ${policyFile}`)
  console.log(`Policy latest: ${policyLatest}`)
}

main()
