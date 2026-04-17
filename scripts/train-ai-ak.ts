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
import { buildActionContext, rankActions } from '../server/ai/pipeline/policyEngine'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { writeRoundFile, buildRoundReport, formatRoundReport, writeIndexFile } from './training-reporter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROUNDS = parseInt(process.argv[2] || '10') || 10
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000') || 1000
const BASELINE_MODE = process.argv[4] === '--baseline'  // 基线训练：优化指标而非得分
const DETAIL_MODE = process.argv.includes('--detail')
const SKIP_WILD = process.argv.includes('--skip-wild')  // 跳过百搭分配进行胜负判断
const REWARD_MODE = process.argv[5] === '--reward-mode'  // 阶段奖励模式
const SETTLEMENT_MULT = 10
const CHAR_DIR = path.resolve(__dirname, '..', 'AI_policies', 'characters')
const OUT_DIR = path.resolve(__dirname, '..', 'training-output')

// ========== 全局错误处理（防止训练崩溃无日志） ==========
let _mainRoundReports: any[] = []
let _mainBestPolicy: any = null
let _mainMetrics: any = null
let _mainMdFile = ''

function _savePartialReport() {
  try {
    if (_mainMdFile && (_mainRoundReports.length > 0 || _mainBestPolicy)) {
      const mainOut: string[] = []
      for (const report of _mainRoundReports) {
        if (report.round === 0 || report.round === ROUNDS + 1) continue
        mainOut.push(formatRoundReport(report, false, `第${report.round}轮`))
      }
      fs.writeFileSync(_mainMdFile + '.partial.md', mainOut.join('\n'), 'utf-8')
      if (_mainBestPolicy) {
        fs.writeFileSync(_mainMdFile.replace('.md', '.policy.partial.json'), JSON.stringify({ metrics: _mainMetrics, policy: _mainBestPolicy }, null, 2), 'utf-8')
      }
      console.error('\n[TRAIN_CRASH] 已保存部分报告: ' + _mainMdFile + '.partial.md')
    }
  } catch (e) { console.error('[TRAIN_CRASH] 保存部分报告失败:', e) }
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err)
  _savePartialReport()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED_REJECTION]', reason)
  _savePartialReport()
  process.exit(1)
})

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
  allHonorsPursuit: number; allHonorsPungsPursuit: number
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
  pengChance: 0.7, kongChance: 0.47, chowChance: 0.5, anKongChance: 0.95,  // K哥: 碰率0.7/吃率0.5可训练，吃率上限0.8防无脑吃
  pengWildBoost: 0.06, kongWildBoost: 0.14, chowWildPenalty: 0.18,
  menqingKeepBonus: 0, meldPenalty: 0.05,  // K哥基线训练：门清bonus最低
  allPungsPursuit: 1.5, pureFlushPursuit: 1.5, halfFlushWeight: 1.0,
  allHonorsPursuit: 1.0, allHonorsPungsPursuit: 1.0,
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
  'allHonorsPursuit', 'allHonorsPungsPursuit',
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
  chowChance:                 { min: 0.2,  max: 0.8,  step: 0.05 },  // K哥: 吃率搜索范围0.2~0.8
  anKongChance:               { min: 0.5,  max: 1.0,  step: 0.05 },
  pengWildBoost:              { min: 0.0,  max: 0.3,  step: 0.02 },
  kongWildBoost:              { min: 0.0,  max: 0.4,  step: 0.02 },
  chowWildPenalty:            { min: 0.0,  max: 0.5,  step: 0.02 },
  menqingKeepBonus:           { min: 0.0,  max: 15.0, step: 0.5 },
  meldPenalty:                { min: 0.0,  max: 0.3,  step: 0.02 },
  allPungsPursuit:            { min: 0.0,  max: 2.0,  step: 0.1 },
  pureFlushPursuit:           { min: 0.0,  max: 2.0,  step: 0.1 },
  halfFlushWeight:            { min: 0.0,  max: 2.0,  step: 0.1 },
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

export function loadCharacter(name: string): BotPolicy {
  const filePath = path.join(CHAR_DIR, `${name}.json`)
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return { ...DEFAULT_POLICY, ...data.policy, id: data.policy?.id || name }
  } catch (e) {
    console.warn(`[Character] Failed to load ${name}, using default`)
    return { ...DEFAULT_POLICY, id: name }
  }
}

export function saveCharacter(name: string, policy: BotPolicy, metrics: any): void {
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

function setupGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[], meta?: GameMeta): GameState {
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

  const gameMultiplier = nextGameMultiplier(meta || {})

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
    const actualHand = p.hand.map(t => `${tileStr(t)}(${t.id.slice(-4)})`).join(',')
    console.error(`[铁律违规] ${p.name} phase=${phase} hand=${len} melds=${meldCount} expected=${expected} prevPhase=${prevPhase} prevHand=${prevHand}`)
    if (phase === 'draw' || phase === 'discard') console.error(`[铁律详情] ${p.name} ${phase} rawHandLen=${p.hand.length} handTiles=[${actualHand}]`)
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
  const rawHand = p.hand.length
  const rawMelds = p.exposedMelds.length
  p.hand = normalizeHand(p.hand)  // 铁律：apply前先normalize
  const before = p.hand.length
  const meldCount = p.exposedMelds.length
  const handBeforeIds = p.hand.map(t => t.id.slice(-6)).join(',')
  const validBefore = before === 13 - 3 * meldCount  // K哥铁律：只看口数
  const matches = p.hand.filter(t => tileEq(t, tile)).slice(0, 2)
  const matchIds = matches.map(m => m.id.slice(-6))
  console.error(`[PENG] ${p.name} before=${before} matches=${matches.length} matchIds=${matchIds.join(',')} tile=${tileStr(tile)} hand=[${handBeforeIds}]`)
  if (matches.length < 2) return
  // 精确移除：记录每一步
  const removedIds: string[] = []
  for (const m of matches) {
    const idx = p.hand.findIndex(rt => tileEq(rt, m))
    if (idx >= 0) { removedIds.push(p.hand[idx].id.slice(-6)); p.hand.splice(idx, 1) }
    else { console.error(`[PENG_BUG] ${p.name} match tile not found in hand! id=${m.id.slice(-6)}`) }
  }
  const after = p.hand.length
  const expected = before - 2
  if (process.env.DEBUG || after !== expected) {
    const handAfterIds = p.hand.map(t => t.id.slice(-6)).join(',')
    console.error(`[PENG] ${p.name} removed=[${removedIds.join(',')}] before=${before} after=${after} expected=${expected} handAfter=[${handAfterIds}]`)
  }

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
  // 用 tileEq（suit+value）移除，绕过 ID 重复 bug
  const removeTile = (t: Tile) => { const idx = p.hand.findIndex(h => tileEq(h, t)); if (idx >= 0) p.hand.splice(idx, 1) }

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
  p.exposedMelds.push({ type: MeldType.CONCEALED_KONG, tiles: [tile, tile, tile, tile], isConcealed: true })
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

interface GameMeta {
  dicePoints?: [number, number]
  diceMultiplier?: number
  flowMultiplier?: number
  inheritanceMultiplier?: number
  prevRoundWasDraw?: boolean
  prevRoundWasRebel?: boolean
}

// 模拟全局倍数（流局/造反继承）
let prevRoundWasDraw = false
function nextGameMultiplier(meta: GameMeta): number {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  meta.dicePoints = [d1, d2]
  const isPair = d1 === d2
  const isBigPair = isPair && (d1 === 1 || d1 === 4)
  meta.diceMultiplier = isBigPair ? 4 : isPair ? 2 : 1
  const flowMult = prevRoundWasDraw ? 2 : 1
  meta.flowMultiplier = flowMult
  // 继承倍数 = 流局(×2/×1) × 聚义(未实现×1) × 造反(未实现×1) × 上一把超帽(未实现×1)
  meta.inheritanceMultiplier = flowMult  // 目前只含流局倍数
  meta.prevRoundWasDraw = prevRoundWasDraw
  meta.prevRoundWasRebel = false  // 暂未实现
  // 全局倍数 = min(8, 骰子 × 流局)
  const globalMult = Math.min(8, meta.diceMultiplier * flowMult)
  return globalMult
}

function calcScore(p: BotPlayer, isSelfDraw: boolean, isKongWin: boolean, gameMultiplier: number): { finalPoints: number; baseFan: number; handTypeName: string } {
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
  return { finalPoints: result.finalPoints * SETTLEMENT_MULT, baseFan: result.baseFan, handTypeName: result.handTypeName }
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
  wallIdx: number = 0, deckLen: number = 144, allPlayers: BotPlayer[] = [], myPos: number = 0,
  turnNumber: number = 0): Tile {
  // 铁律：hand可能含undefined，在计算前先normalize
  p.hand = normalizeHand(p.hand)
  const policy = p.policy
  const hand = p.hand
  if (process.env.DEBUG_DISCARD === '1') console.error(`[DISCARD] ${p.name} hand_before=${p.hand.length} pos=${p.pos}`)
  const wildCount = hand.filter(t => isWT(t, p)).length
  // 暗杠不破门清：visibleMelds不算暗杠（暗杠属于手牌，不算门口副露）
  const visibleMelds = p.exposedMelds.filter(m => !m.isConcealed).length
  const totalMelds = p.exposedMelds.length  // 含暗杠，用于 meldsNeeded 计算
  const isMenqing = visibleMelds === 0
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  const suitCounts = suits.map(s => hand.filter(t => t.suit === s).length)
  const maxSuitIdx = suitCounts.indexOf(Math.max(...suitCounts))
  const maxSuitCount = suitCounts[maxSuitIdx]
  const honorCount = hand.filter(t => isHonor(t)).length

  // 百搭全局最优评估
  const wildEval = wildCount > 0 ? evalWildDeployment(hand, visibleMelds, wildCount, p.flowerTiles.length, gameMultiplier) : null
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

    // ====== 拆门决策层（每回合动态判断各门潜力和最优路线） ======
    // ---- 1. 各门分析：孤立张 vs 有用牌 ----
    const suitAnalysis = suits.map((s, suitIdx) => {
      const suitTiles = hand.filter(t => t.suit === s)
      const usefulTiles = suitTiles.filter(t => {
        const tileCount = suitTiles.filter(o => tileEq(o, t)).length
        if (tileCount >= 3) return true   // 刻子（碰/杠）
        if (tileCount === 2) return true   // 对子（进张可碰/可碰）← 修复：漏算对子
        const others = suitTiles.filter(o => !tileEq(o, t))
        if (others.some(o => o.value === t.value)) return true
        return others.some(o => Math.abs(o.value - t.value) <= 2)
      })
      return { suitIdx, count: suitTiles.length, usefulCount: usefulTiles.length, isolatedCount: suitTiles.length - usefulTiles.length }
    })

    // ---- 2. 各门排序：最长 / 次短 / 最短 ----
    const sortedSuits = [...suitAnalysis].sort((a, b) => b.count - a.count)
    const longestSuit = sortedSuits[0]
    const secondSuit = sortedSuits[sortedSuits.length - 2]
    const shortestSuit = sortedSuits[sortedSuits.length - 1]
    const thirdSuit = sortedSuits.length >= 3 ? sortedSuits[2] : null

    // ---- 3. 判断各路线是否可行 ----
    const canPureFlush = longestSuit.count >= 7 && longestSuit.isolatedCount <= 6
    const canHalfFlush = longestSuit.count >= 6 && honorCount >= 2
    const pengHuGroups = pairCount + tripletCount + quadCount * 2
    const canAllPungs = pengHuGroups >= 4
    const canAllHonors = honorCount >= 6

    // ---- 4. 选择最优目标路线（按潜力分数量化） ----
    let targetRoute: 'pure' | 'half' | 'pungs' | 'honors' | 'normal' = 'normal'
    let targetRouteScore = 0
    if (canPureFlush) { const s = longestSuit.count * 5 - longestSuit.isolatedCount * 3 + 100; if (s > targetRouteScore) { targetRouteScore = s; targetRoute = 'pure' } }
    if (canHalfFlush) { const s = longestSuit.count * 4 + honorCount * 3 + (pairCount >= 1 ? 20 : 0) + 80; if (s > targetRouteScore) { targetRouteScore = s; targetRoute = 'half' } }
    if (canAllPungs) { const s = pengHuGroups * 30 + pairCount * 10 + 60; if (s > targetRouteScore) { targetRouteScore = s; targetRoute = 'pungs' } }
    if (canAllHonors) { const s = honorCount * 10 + 50; if (s > targetRouteScore) { targetRouteScore = s; targetRoute = 'honors' } }

    // ---- 5. 确定非目标门的惩罚力度 ----
    const forceDiscardShortest = (targetRoute === 'pure' || targetRoute === 'half')
    const forceDiscardSecond = (targetRoute === 'pure' || targetRoute === 'half')
    const forceBreakPairs = (targetRoute === 'pure' || targetRoute === 'half')

    // ---- 6. 各门 index ----
    const shortestSuitIdx = shortestSuit.suitIdx
    const secondSuitIdx = secondSuit.suitIdx
    const thirdSuitIdx = thirdSuit ? thirdSuit.suitIdx : -1
    const targetSuitIdx = (targetRoute === 'pure' || targetRoute === 'half') ? longestSuit.suitIdx : -1

    // ---- 7. 孤立张判断 ----
    const isIsolated = sameSuit.every(o => o.value !== tile.value && Math.abs(o.value - tile.value) > 2)

    // ---- 8. 拆门加分（核心） ----
    const isInTargetSuit = targetSuitIdx >= 0 && tile.suit === suits[targetSuitIdx]
    const isInShortestSuit = tile.suit === suits[shortestSuitIdx]
    const isInSecondSuit = tile.suit === suits[secondSuitIdx]

    // 最短门孤立张 → 必须打
    if (forceDiscardShortest && isInShortestSuit && isIsolated) keepScore -= 50
    // 次短门孤立张 → 必须打（做一色时）
    if (forceDiscardSecond && isInSecondSuit && isIsolated) keepScore -= 20
    // 做一色时，次短门对子也要拆
    if (forceDiscardSecond && isInSecondSuit && count >= 2 && forceBreakPairs) keepScore -= 35
    // 做一色时，最短门对子也要拆
    if (forceDiscardShortest && isInShortestSuit && count >= 2 && forceBreakPairs) keepScore -= 45
    // 无明确路线时，最短门孤立张也适度惩罚
    if (targetRoute === 'normal' && isInShortestSuit && isIsolated) keepScore -= 20
    // 目标门加分（做某门时，该门所有牌都加分）
    if (isInTargetSuit) keepScore += 15
    // 非目标门孤立张适度惩罚
    if (!isInTargetSuit && isIsolated && !isInShortestSuit && !isInSecondSuit) keepScore -= 8

    // ====== K哥时序决策层（综合方案：出牌轮数 + 牌墙剩余） ======
    // deckLen - wallIdx = 牌墙剩余张数（约144张开始，摸一张少一张）
    const wallRemaining = deckLen - wallIdx
    // 单玩家出牌轮数（碰/杠后重置，自然反映个人进度）
    ;(p as any)._discardTurns = ((p as any)._discardTurns ?? 0) + 1
    const myTurns = (p as any)._discardTurns

    // Phase 1（< 3次出牌 OR 牌墙≥75张）：机械式拆散牌，不管路线
    if (myTurns < 3 || wallRemaining >= 75) {
      if (isInShortestSuit && isIsolated) keepScore -= 80
      if (isInSecondSuit && isIsolated) keepScore -= 50
      if (isInShortestSuit && count >= 2) keepScore -= 30
      if (isInSecondSuit && count >= 2) keepScore -= 15
    }
    // Phase 2（3-6次出牌 AND 50≤牌墙<75）：抉择方向阶段
    else if (myTurns < 6 && wallRemaining >= 50) {
      if (!(p as any)._chosenRoute) {
        const pureScore = longestSuit.count
        const pungsScore = (tripletCount * 3 + pairCount) * 4
        const honorsScore = honorCount * 5
        const best = Math.max(pureScore, pungsScore, honorsScore)
        if (best === pureScore) (p as any)._chosenRoute = 'pure'
        else if (best === pungsScore) (p as any)._chosenRoute = 'pungs'
        else (p as any)._chosenRoute = 'honors'
      }
      const route = (p as any)._chosenRoute
      if (route === 'pure' && !isInTargetSuit && isIsolated) keepScore -= 30
      if (route === 'pungs' && count >= 2) keepScore += 5
      if (route === 'honors' && !isHonor && isIsolated) keepScore -= 30
    }
    // Phase 3（≥6次出牌 OR 牌墙<50张）：按路线弃牌
    else {
      // 精细收口条件（满足任一即触发）：
      // 1. 手牌≤7张（大量拆牌后，接近听牌）
      // 2. 牌墙≤30张（全局进度接近尾局）
      // 3. 某数字门≥9张（这门很强，越多越需要精细化）
      // 4. 某数字门+百搭≥10张（百搭大幅提升该门潜力）
      const NEAR_WIN = hand.length <= 7 || wallRemaining <= 30
        || longestSuit.count >= 9 || (longestSuit.count + wildCount) >= 10
      if (NEAR_WIN) {
        if (count >= 2) keepScore += 15   // 对/刻子保留
        if (count === 1 && isIsolated) keepScore -= 25  // 孤立单张打出
      }
      else if ((p as any)._chosenRoute === 'pungs') {
        if (count >= 2) keepScore += 15
        if (count === 1) keepScore -= 20
      }
      else if ((p as any)._chosenRoute === 'pure' || (p as any)._chosenRoute === 'half') {
        if (!isInTargetSuit && isIsolated) keepScore -= 30
        if (count >= 2 && !isInTargetSuit) keepScore -= 15
      }
      else if ((p as any)._chosenRoute === 'honors') {
        if (!isHonor && isIsolated) keepScore -= 30
        if (!isHonor && count >= 2) keepScore -= 15
      }
    }

    // ====== 原有评分逻辑保留 ======
    // 碰碰胡保留对子
    if (targetRoute === 'pungs' && count >= 2) keepScore += 10

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
    if (baoPush > 0 && visibleMelds >= policy.baoThreshold) keepScore += baoPush * 4 * aggression
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
    if (policy.baoRiskAversion > 0 && visibleMelds >= policy.baoThreshold && baoPush < 0.3)
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
interface WinnerInfo { playerIndex: number; name: string; hand: string; melds: string[]; flowers: string[]; isSelfDraw: boolean; wonFan: number; baseFan: number; winHandType: string; roundNum: number; wildTile: string; wildTileValue?: number; isMenQing: boolean; winningTile?: string; handTypes: string[] }

interface TurnSnapshot {
  turn: number
  currentPlayer: number
  drawnTile: string
  discardedTile: string
  lastDiscardBy: number
  lastDiscard: string
  players: Array<{
    name: string
    hand: string
    exposed: string[]
    meldSources: number[]
    handCount: number
    flowers: string[]
  }>
  wildTile: string
  gameMultiplier: number
  gameIdx: number  // 游戏索引（用于 reporter 分隔多局）
  wallIdx: number  // 牌墙剩余张数 = g.deck.length - g.wallIdx
}
interface WinningGameRecord {
  gameIdx: number; winnerName: string; hand: string; melds: string[]; handTypes: string[];
  isSelfDraw: boolean; score: number; multiplier: number; roundNum: number;
  akDelta: number;  // AK的分数变化（正=赢，负=输）
  wonFan?: number;   // 最终点数（baseFan × all multipliers）
  baseFan?: number;  // 真实基础番（不含倍数）
  winHandType?: string;  // 牌型名称
  wildTile?: string;     // 百搭牌描述
  wildTileValue?: number; // 百搭数值（百搭所在位置）
  winningTile?: string; // 捉冲时对方放冲的牌（用于报告中显示完整手牌）
  result?: any  // GameResult，用于settlementLog
}
interface GameResult {
  winner: number; scores: number[]; events: GameEvent[]; multiplier: number
  settlementLog: SettlementEntry[]; snapshots: PlayerSnapshot[]; roundNum: number
  winnerPlayer?: BotPlayer  // 用于detectHandTypes
  winnersThisGame: WinnerInfo[]  // runGame 内所有赢家的追踪
  turnSnapshots: TurnSnapshot[]  // 每回合快照（--detail 时收集）
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
export function runGame(akPolicy: BotPolicy, otherPolicies: BotPolicy[], gameIdx: number = 0): GameResult | null {
  const runGameStart = performance.now()
  // 每局开始时清空 isTing 缓存（不同局wild牌不同）
  clearIsTingCache()
  clearCanWinCache()
  const gameStart = performance.now()
  const gameMeta: GameMeta = {}
  const g = setupGame(akPolicy, otherPolicies, gameMeta)
  const events: GameEvent[] = []
  const settlementLog: SettlementEntry[] = []
  const winnersThisGame: WinnerInfo[] = []  // 追踪本局所有赢家（血战到底）
  const finishedPlayers = new Set<number>()  // 已胡牌退出的玩家（血战）
  let turn = 0

  // 每回合快照（--detail 时收集）
  const turnSnapshots: TurnSnapshot[] = []

  // buildResult: 血战模式统一出口，构造 GameResult
  const buildResult = (
    primaryWinner: number, winMode: string, baseScore: number,
    handType: string, fanScore: number, discarder: number | undefined
  ): GameResult => {
    const winnerPlayer = g.players[primaryWinner]
    const discarderName = discarder !== undefined ? g.players[discarder].name : '-'
    console.error(`[INV_TRACE] WIN winner=${winnerPlayer.name} mode=${winMode} fan=${fanScore} handType=${handType} discarder=${discarderName} round=${turn} wall=${g.wallIdx}`)
    return {
      winner: primaryWinner,
      scores: g.players.map(p => p.score),
      events,
      multiplier: g.gameMultiplier,
      settlementLog,
      snapshots: recordSnapshots(),
      winnerPlayer,
      roundNum: turn,
      winnersThisGame: [...winnersThisGame],  // 传出快照，防止 return 后游戏循环继续执行导致数组污染
      turnSnapshots
    }
  }

  const recordPayment = (from: string, to: string, amount: number, reason: string, fan?: number, mult?: number) => {
    settlementLog.push({ from, to, amount, reason, fan, mult })
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
  const recordWinner = (p: BotPlayer, idx: number, isSelfDraw: boolean, wonFan: number, baseFan: number, roundNum: number, winningTile?: string) => {
    // 手牌分组：按花色分组，普通牌在前，百搭在后并加(*)
    // 重要：完整手牌 = 当前手牌 + 所有副露面子里的牌（与 recordSnapshots 一致）
    const wildSuit = p.wildSuit, wildVal = p.wildValue
    const isWT2 = (t: Tile) => wildSuit && wildVal ? t.suit === wildSuit && t.value === wildVal : false
    const allTiles = [...p.hand, ...p.exposedMelds.flatMap(m => m.tiles)]
    // 【修复】自摸时 winningTile 已在 p.hand 里（摸牌阶段），排除它避免显示14+张；捉冲时 winningTile 不在手牌里，不过滤
    const filteredTiles = (isSelfDraw && winningTile)
      ? allTiles.filter(t => tileStr(t) !== winningTile)
      : allTiles
    const normalTiles = filteredTiles.filter(t => !isFlower(t) && !isWT2(t))
    const wildTiles = filteredTiles.filter(t => !isFlower(t) && isWT2(t))
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
    // 【新增】计算牌型中文名（用于玩家明细显示）
    const typeStrs = p.winHandType ? p.winHandType.split(',').filter(t => t.length > 0 && t !== HandType.STANDARD) : []
    const typeNames = typeStrs.map(t => HAND_TYPE_NAMES[t as HandType] || t).filter(t => t)
    winnersThisGame.push({
      playerIndex: idx, name: p.name,
      hand: handStr,
      melds: meldStrs,
      flowers: p.flowerTiles.map(t => tileStr(t)),
      isSelfDraw, wonFan, baseFan, winHandType: p.winHandType || '', roundNum,
      wildTile: (wildSuit && wildVal) ? getTileDisplayName({ suit: wildSuit, value: wildVal, id: '' }) : '(无百搭)', wildTileValue: wildVal ?? 0,
      isMenQing: p.exposedMelds.length === 0,
      winningTile,
      handTypes: typeNames,  // 【新增】用于报告玩家明细
    })
  }
  // 快照：只记录字符串化数据，避免引用悬浮
  const recordSnapshots = (): PlayerSnapshot[] => {
    return g.players.map(p => {
      const wildSuit = p.wildSuit, wildVal = p.wildValue
      const wildTileStr = (wildSuit && wildVal) ? `${wildSuit}-${wildVal}` : null
      const wildTileName = wildTileStr ? getTileDisplayName({ suit: wildSuit as TileSuit, value: wildVal, id: '' }) : '(无百搭)'
      // 完整手牌 = 手牌 + 所有面子里的牌（都算作手牌），百搭加*
      const fullHandTiles = [...p.hand, ...p.exposedMelds.flatMap(m => m.tiles)]
      const handWithWildMark = fullHandTiles.map(t => {
        const base = tileStr(t)
        return isWT(t, p) ? base + '*' : base
      }).join(' ')
      return {
        name: p.name, hand: handWithWildMark,
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

  // 每回合快照：记录当前玩家摸打，供每圈明细使用
  // drawnTile 和 discardedTile 显式传入：表示当前玩家本回合的摸打
  const recordTurnSnapshot = (curr: number, drawnTile: string, discardedTile: string) => {
    const lastDiscard = g.discardPile[g.discardPile.length - 1] || null
    turnSnapshots.push({
      turn,
      currentPlayer: curr,
      drawnTile,
      discardedTile,
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
      wildTile: g.wildSuit && g.wildValue ? getTileDisplayName({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }) : '无百搭',
      gameMultiplier: g.gameMultiplier,
      gameIdx,
      wallIdx: g.wallIdx
    })
  }

  // 注入 NEW_GAME sentinel（reporter 用此检测游戏边界，比 turn<prevTurn 更可靠）
  // discardedTile 携带 gameIdx（字符串），turn=-1 保证不会误判为正常snapshot
  turnSnapshots.push({
    turn: -1, currentPlayer: -1, drawnTile: 'NEW_GAME', discardedTile: String(gameIdx),
    lastDiscardBy: -1, lastDiscard: '-',
    players: [],
    wildTile: g.wildSuit && g.wildValue ? getTileDisplayName({ suit: g.wildSuit as TileSuit, value: g.wildValue, id: '' }) : '无百搭',
    gameMultiplier: g.gameMultiplier,
    gameIdx,
    wallIdx: g.wallIdx
  })

  for (let i = 0; i < 13; i++) { for (let p = 0; p < 4; p++) drawTile(g, g.players[p]) }
  // 初始13张明细也记录（每人发牌后13张，无摸打）
  recordTurnSnapshot(g.current, '-', '-')
  // 发牌后每人13张（摸牌后=14）
  for (const p of g.players) {
    if (p.name === 'AI-小胖' && p.hand.length !== 13) {
      console.error(`初始手牌错误: ${p.name} hand=${p.hand.length} expected=13`)
    }
    // 检测手牌内重复tile ID（发牌阶段bug）
    const idCounts: Record<string, number> = {}
    for (const t of p.hand) { idCounts[t.id] = (idCounts[t.id] || 0) + 1 }
    const dupIds = Object.entries(idCounts).filter(([, c]) => c > 1)
    if (dupIds.length > 0) {
      console.error(`[INV_TRACE] DEAL_DUP ${p.name}: ${dupIds.map(([id, c]) => `${id}x${c}`).join(', ')}`)
    }
  }
  // 发牌完成日志
  for (const p of g.players) {
    log(p.name, '发牌', p.hand.map(t => tileStr(t)).join(' '))
    if (p.name === 'AI-AK' || p.name === 'AI-阿水') {
      const ids = p.hand.map(t => t.id.slice(-4)).join(',')
      console.error(`[INV_TRACE] DEAL ${p.name} h=${p.hand.length} m=0 exp=14 diff=${p.hand.length-14} wall=${g.wallIdx} flowerTiles=${p.flowerTiles.length} ids=[${ids}]`)
    }
  }

  const MAX_ROUNDS = 200
  let consecutiveDraws = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const curr = g.current
    const player = g.players[curr]
    turn = round
    const drawn = drawTile(g, player)
    if (!drawn) {
      console.error(`⚠️ 流局: 牌墙耗尽 round=${round} wallIdx=${g.wallIdx}/${g.deck.length}`)
      // 关键修复：流局也返回snapshot（之前 return null 导致 turnSnapshots 丢失，games 2-5 全部丢snapshot）
      return {
        winner: -1, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier,
        settlementLog, snapshots: [], roundNum: turn, winnersThisGame: [], turnSnapshots
      } as GameResult
    }
    if (isFlower(drawn)) { log(player.name, '补花', tileStr(drawn)); recordTurnSnapshot(curr, tileStr(drawn), '-'); continue }
    log(player.name, '摸牌', tileStr(drawn))
    if (player.name === 'AI-AK' || player.name === 'AI-阿水') {
      const h = player.hand.length, m = player.exposedMelds.length
      console.error(`[INV_TRACE] DRAW ${player.name} h=${h} m=${m} exp=${14-3*m} diff=${h-(14-3*m)} drawn=${tileStr(drawn)} wall=${g.wallIdx} flowers=${player.flowerTiles.length}`)
    }
    checkHandInvariant(player, 'draw')  // 摸牌后铁律：14/11/8/5/2张

    // Self-draw win check
    const normalizedHand = normalizeHand(player.hand)
    // [DEBUG] 追踪canWin诊断
    const numPungs = player.exposedMelds.filter(m => m.type === MeldType.TRIPLET || m.type === MeldType.SEQUENCE).length
    const winCheck = canWin(normalizedHand, player.exposedMelds, makeWT(player), SKIP_WILD)
    if (round < 3 || winCheck.canWin) {
      console.error(`[DEBUG round=${round} curr=${curr} ${player.name}] drawn=${tileStr(drawn)} hand=${normalizedHand.length} exposed=${player.exposedMelds.length} wild=${makeWT(player)} canWin=${winCheck.canWin} types=${winCheck.types.join(',')}`)
    }
    if (winCheck.canWin) {
      // [DEBUG FORCE SELF-DRAW] 强制100%自摸，验证AI能否正常做成特殊牌型
      const winChance = 1.0
      if (Math.random() < winChance) {
        console.error(`[SELF-WIN! round=${round} curr=${curr} ${player.name}] hand=${normalizedHand.length} exposed=${player.exposedMelds.length} canWin=${winCheck.canWin}`)
        const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, false, g.gameMultiplier)
        // 自摸：每人赔baseScore，赢家得3倍
        player.score += baseScore * 3
        for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
        // 互包结算
        applyBaoSettlement(g, curr, true, null, baseScore, 1)
        for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore, '自摸', baseFan, g.gameMultiplier) }
        log(player.name, '自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3×${g.gameMultiplier}=${baseScore*3*g.gameMultiplier}] [手牌${normalizedHand.length}张+副露${player.exposedMelds.length}]`)
        // 【修复】直接用 calcScore 返回的 handTypeName，绝不再调 detectHandTypes（避免参数状态不同导致误判）
        player.wonFan = baseScore
        player.winHandType = handTypeName || '普通自摸'
        player.status = 'won'
        finishedPlayers.add(curr)
        recordWinner(player, curr, true, baseScore, baseFan, turn)
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
          if (canWin(normalizeHand(player.hand), player.exposedMelds, makeWT(player), SKIP_WILD).canWin) {
            const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore, 1)
            for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore * g.gameMultiplier, '杠上自摸', baseFan, g.gameMultiplier) }
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            player.wonFan = baseScore
            player.winHandType = handTypeName || '普通杠开'
            player.status = 'won'
            finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, baseFan, turn)
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
          if (canWin(normalizeHand(player.hand), player.exposedMelds, makeWT(player), SKIP_WILD).canWin) {
            const { finalPoints: baseScore, baseFan, handTypeName } = calcScore(player, true, true, g.gameMultiplier)
            player.score += baseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== curr) g.players[i].score -= baseScore }
            applyBaoSettlement(g, curr, true, null, baseScore, 1)
            for (let i = 0; i < 4; i++) { if (i !== curr) recordPayment(g.players[i].name, player.name, baseScore * g.gameMultiplier, '杠上自摸', baseFan, g.gameMultiplier) }
            log(player.name, '杠上自摸', `${player.hand.map(t => tileStr(t)).join(' ')} [${baseScore}×3=${baseScore*3}]`)
            player.wonFan = baseScore
            player.winHandType = handTypeName || '普通杠开'
            player.status = 'won'
            finishedPlayers.add(curr)
            recordWinner(player, curr, true, baseScore, baseFan, turn)
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

    // Pipeline scorer 目前只接管吃/碰/杠，出牌仍用 legacy aiDiscard
    // TODO(P2-6): 扩展 ActionType 支持 DISCARD_<tileId>，实现完整的 pipeline 出牌决策
    const discard = aiDiscard(player, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, curr, round * 4 + curr)
    player.hand = player.hand.filter(t => t && t.id !== discard.id)
    player.discardedTiles.push(discard)
    g.discardPile.push(discard)
    g.playerDiscards[curr].push(discard)
    log(player.name, '出牌', `${tileStr(discard)} [手牌: ${player.hand.map(t => tileStr(t)).join(' ')}]`)
    recordTurnSnapshot(curr, tileStr(drawn), tileStr(discard))  // 每回合快照：显示本回合摸打
    if (player.name === 'AI-AK' || player.name === 'AI-阿水') {
      const h = player.hand.length, m = player.exposedMelds.length
      const ids = player.hand.map(t => t.id.slice(-4)).join(',')
      console.error(`[INV_TRACE] DISC ${player.name} h=${h} m=${m} exp=${14-3*m} diff=${h-(14-3*m)} discarded=${tileStr(discard)} wall=${g.wallIdx} ids=[${ids}]`)
    }
    checkHandInvariant(player, 'discard')  // 出牌后铁律：13/10/7/4/1张
    if (player.exposedMelds.length >= 2) {
      const cw = canWin(normalizeHand(player.hand), player.exposedMelds, makeWT(player), SKIP_WILD)
      console.error(`[DISCARD_WIN] ${player.name} hand=${player.hand.length} melds=${player.exposedMelds.length} canWin=${cw.canWin} types=${cw.types.join(',')}`)
    }

    // Others check hu
    for (let other = 0; other < 4; other++) {
      if (other === curr) continue
      const opp = g.players[other]
      const testHand = [...opp.hand.filter(t => t !== undefined), discard]
      if (canWin(testHand, opp.exposedMelds, makeWT(opp), SKIP_WILD).canWin) {
        // [DEBUG FORCE HU] 强制100%捉冲，只要能胡就必胡
        const huChance = 1.0
        if (Math.random() < huChance) {
          opp.hand = normalizeHand(testHand)
          const { finalPoints: score, baseFan, handTypeName } = calcScore(opp, false, false, g.gameMultiplier)
          opp.score += score; player.score -= score
          // 互包结算：如果有人对opp有包三，且放炮者不是包家
          applyBaoSettlement(g, other, false, curr, score, 1)
          // score = finalPoints = baseFan × extraMultipliers × globalMultiplier，已包含全局倍数，recordPayment直接用score
          recordPayment(player.name, opp.name, score, '放炮', baseFan, g.gameMultiplier)
          log(opp.name, '放炮胡', `${player.name}出${tileStr(discard)}→${opp.hand.map(t => tileStr(t)).join(' ')} [${score}]`)
          // 【修复】直接用 calcScore 返回的 handTypeName，绝不依赖 reporter 里的二次 detectHandTypes 调用
          // 根因：canWin 已在游戏循环中以 normalizedHand（player.hand 的 shallow copy）调用过，
          // 导致 opp.hand 被 JS 引用污染，后续 detectHandTypes 参数状态与 calcScore 内部不一致
          opp.wonFan = score
          opp.winHandType = handTypeName || '普通放冲'
          opp.status = 'won'
          finishedPlayers.add(other)
          recordWinner(opp, other, false, score, baseFan, turn, tileStr(discard))
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
          if (!extra) {
            console.error(`⚠️ 明杠后补摸失败(牌墙耗尽) turn=${turn}`)
            return { winner: -1, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier, settlementLog, snapshots: [], roundNum: turn, winnersThisGame: [], turnSnapshots } as GameResult
          }
          checkHandInvariant(opp, 'draw')  // 杠后摸牌
          if (extra && !isFlower(extra)) {
            if (canWin(normalizeHand(opp.hand), opp.exposedMelds, makeWT(opp), SKIP_WILD).canWin) {
              const { finalPoints: kongBaseScore, baseFan, handTypeName: htn1 } = calcScore(opp, true, true, g.gameMultiplier)
              opp.score += kongBaseScore * 3
              for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
              applyBaoSettlement(g, otherIdx, true, null, kongBaseScore, 1)
              for (let i = 0; i < 4; i++) { if (i !== otherIdx) recordPayment(g.players[i].name, opp.name, kongBaseScore, '明杠自摸', baseFan, g.gameMultiplier) }
              log(opp.name, '明杠自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3]（杠开）`)
              opp.wonFan = kongBaseScore
              opp.winHandType = htn1 || '普通杠开'
              opp.status = 'won'
              finishedPlayers.add(otherIdx)
              recordWinner(opp, otherIdx, true, kongBaseScore, baseFan, turn)
              log(opp.name, '胡牌(血战)', `明杠自摸 [${kongBaseScore}×3]`)
              if (finishedPlayers.size >= 3) {
                return buildResult(otherIdx, '杠上自摸', kongBaseScore, opp.winHandType || '明杠自摸', kongBaseScore, undefined)
              }
              g.current = (otherIdx + 1) % 4
              continue
            }
          }
          // 明杠后补摸，非自摸则打出
          const kongDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx, round * 4 + otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== kongDiscard.id)
          g.discardPile.push(kongDiscard)
          // 【修复】明杠后出牌写入 snapshot（drawnTile=补摸牌，discardedTile=明杠后打出的牌）
          recordTurnSnapshot(otherIdx, extra && !isFlower(extra) ? tileStr(extra) : '-', tileStr(kongDiscard))
          g.current = (otherIdx + 1) % 4
          meldTaken = true
          break
        }
      }
      const canP = canPeng(opp, discard)
      if (canP) {
        // K哥铁律：吃碰排斥检查必须在 pipeline 决策之前做，不受 REWARD_MODE 影响
        if (!checkChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)) continue;

        let shouldPeng = false
        if (opp.name === 'AI-AK' && REWARD_MODE) {
          // AI-AK: 用 pipeline scorer 决定是否碰
          try {
            const ctx = buildActionContext(g, opp.id, ['PENG', 'PASS'], round * 4 + otherIdx)
            const ranked = rankActions(ctx)
            const pengScore = ranked.find(r => r.action === 'PENG')?.score ?? 0
            const passScore = ranked.find(r => r.action === 'PASS')?.score ?? 0
            shouldPeng = pengScore > passScore
            console.error(`[PIPELINE_PENG] AI-AK PENG pengScore=${pengScore.toFixed(3)} passScore=${passScore.toFixed(3)} → ${shouldPeng ? 'YES' : 'NO'}`)
          } catch (e) {
            console.error(`[PIPELINE_ERROR] AI-AK peng:`, e)
            shouldPeng = Math.random() < opp.policy.pengChance
          }
        } else {
          const pengRoll = Math.random()
          console.error(`[PENG_CHECK] ${opp.name} CAN_PENG ${tileStr(discard)} hand=${opp.hand.map(t=>tileStr(t)).join(' ')} roll=${pengRoll.toFixed(3)}`)
          let pengChance = opp.policy.pengChance
          if (opp.wildSuit && opp.wildValue && discard.suit === opp.wildSuit && discard.value === opp.wildValue)
            pengChance += opp.policy.pengWildBoost
          shouldPeng = pengRoll < pengChance
        }
        if (shouldPeng) {
          const meldCountBefore = opp.exposedMelds.length
          const handBeforePeng = opp.hand.length
          applyPeng(opp, discard, curr)  // 内部已normalize，失败则不push meld
          if (opp.exposedMelds.length === meldCountBefore) continue  // apply失败，跳过pong（不设置meldTaken）
          meldTaken = true
          if (opp.name === 'AI-AK' || opp.name === 'AI-阿水') {
            const h = opp.hand.length, m = opp.exposedMelds.length
            console.error(`[INV_TRACE] PENG_APPLY ${opp.name} h=${h} m=${m} exp=${14-3*m} diff=${h-(14-3*m)} removed=${handBeforePeng - h} tile=${tileStr(discard)} wall=${g.wallIdx}`)
          }
          opp.chowPongExclusion = updateChowPongExclusion(opp.chowPongExclusion, 'pong', discard.suit)  // K哥铁律：记录碰行动
          checkHandInvariant(opp, 'claim')  // claim后（11/8/5/2张）
          if (opp.name === 'AI-AK' || opp.name === 'AI-阿水') {
            const h = opp.hand.length, m = opp.exposedMelds.length
            const ids = opp.hand.map(t => t.id.slice(-4)).join(',')
            console.error(`[INV_TRACE] CLAIM ${opp.name} h=${h} m=${m} exp=${14-3*m} diff=${h-(14-3*m)} tile=${tileStr(discard)} wall=${g.wallIdx} ids=[${ids}]`)
          }
          // 碰后自摸：必须先摸牌，删掉这里的错误判断
          for (const ak of canAnKong(opp)) {
            applyAnKong(opp, ak)
            const extra = drawTile(g, opp)
            if (!extra) {
              console.error(`⚠️ 碰后自摸补摸失败(牌墙耗尽) turn=${turn}`)
              return { winner: -1, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier, settlementLog, snapshots: [], roundNum: turn, winnersThisGame: [], turnSnapshots } as GameResult
            }
            checkHandInvariant(opp, 'draw')  // 杠后摸牌（正常摸牌规则）
            if (extra && !isFlower(extra)) {
              if (canWin(normalizeHand(opp.hand), opp.exposedMelds, makeWT(opp), SKIP_WILD).canWin) {
                const { finalPoints: kongBaseScore, baseFan, handTypeName: htn2 } = calcScore(opp, true, true, g.gameMultiplier)
                opp.score += kongBaseScore * 3
                for (let i = 0; i < 4; i++) { if (i !== otherIdx) g.players[i].score -= kongBaseScore }
                applyBaoSettlement(g, otherIdx, true, null, kongBaseScore, 1)
                for (let i = 0; i < 4; i++) { if (i !== otherIdx) recordPayment(g.players[i].name, opp.name, kongBaseScore, '碰杠后自摸', baseFan, g.gameMultiplier) }
                log(opp.name, '碰杠后自摸', `${opp.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
                opp.wonFan = kongBaseScore
                opp.winHandType = htn2 || '普通碰杠'
                opp.status = 'won'
                finishedPlayers.add(otherIdx)
                recordWinner(opp, otherIdx, true, kongBaseScore, baseFan, turn)
                log(opp.name, '胡牌(血战)', `碰杠后自摸 [${kongBaseScore}×3]`)
                if (finishedPlayers.size >= 3) {
                  return buildResult(otherIdx, '杠上自摸', kongBaseScore, opp.winHandType || '杠上自摸', kongBaseScore, undefined)
                }
                g.current = (otherIdx + 1) % 4
                continue
              }
            }
          }
          const pengDiscard = aiDiscard(opp, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, otherIdx, round * 4 + otherIdx)
          opp.hand = opp.hand.filter(t => t.id !== pengDiscard.id)
          g.discardPile.push(pengDiscard)
          // 【修复】碰后出牌写入 snapshot（碰家无摸牌，drawnTile='-'）
          recordTurnSnapshot(otherIdx, '-', tileStr(pengDiscard))
          console.error(`[PENG_SUCCESS] ${opp.name} now hand=${opp.hand.length} melds=${opp.exposedMelds.length}`)
          g.current = (otherIdx + 1) % 4  // K哥铁律：碰后下家摸牌，不是碰家继续
          meldTaken = true
          break
        }
      }
    }
    if (meldTaken) continue

    // Check chow (only next player)
    const nextP = g.players[nextPlayer]
    // AI-AK 使用 pipeline scorer 决定是否吃
    let shouldChow = false
    // K哥铁律：吃碰排斥检查必须在 pipeline 决策之前做
    const chowExcluded = !checkChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)
    if (nextP.name === 'AI-AK' && REWARD_MODE && canChow(nextP, discard)) {
      if (chowExcluded) {
        // 排斥状态下跳过 pipeline 决策，直接不执行吃
        shouldChow = false
      } else {
        try {
          const ctx = buildActionContext(g, nextP.id, ['CHOW', 'PASS'], round * 4 + nextPlayer)
          const ranked = rankActions(ctx)
          const chowScore = ranked.find(r => r.action === 'CHOW')?.score ?? 0
          const passScore = ranked.find(r => r.action === 'PASS')?.score ?? 0
          shouldChow = chowScore > passScore
          console.error(`[PIPELINE_CHOW] AI-AK CHOW chowScore=${chowScore.toFixed(3)} passScore=${passScore.toFixed(3)} → ${shouldChow ? 'YES' : 'NO'}`)
        } catch (e) {
          console.error(`[PIPELINE_ERROR] AI-AK chow:`, e)
          shouldChow = Math.random() < nextP.policy.chowChance
        }
      }
    } else {
      shouldChow = canChow(nextP, discard) && Math.random() < nextP.policy.chowChance
    }
    if (shouldChow) {
      if (!checkChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)) continue;  // K哥铁律：吃碰排斥
      const beforeChowMelds = nextP.exposedMelds.length
      applyChow(nextP, discard, curr)  // 内部已normalize，失败则不push meld
      if (nextP.exposedMelds.length === beforeChowMelds) continue  // apply失败，跳过chow
      nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', discard.suit)  // K哥铁律：记录吃行动
      checkHandInvariant(nextP, 'claim')  // 吃后（未出牌）铁律
      // 吃后自摸：必须先摸牌
      for (const ak of canAnKong(nextP)) {
        applyAnKong(nextP, ak)
        const extra = drawTile(g, nextP)
        if (!extra) {
          console.error(`⚠️ 吃后自摸补摸失败(牌墙耗尽) turn=${turn}`)
          return { winner: -1, scores: g.players.map(p => p.score), events, multiplier: g.gameMultiplier, settlementLog, snapshots: [], roundNum: turn, winnersThisGame: [], turnSnapshots } as GameResult
        }
        checkHandInvariant(nextP, 'draw')  // 吃后加杠仍可摸牌
        if (extra && !isFlower(extra)) {
          if (canWin(normalizeHand(nextP.hand), nextP.exposedMelds, makeWT(nextP), SKIP_WILD).canWin) {
            const { finalPoints: kongBaseScore, baseFan, handTypeName: htn4 } = calcScore(nextP, true, true, g.gameMultiplier)
            nextP.score += kongBaseScore * 3
            for (let i = 0; i < 4; i++) { if (i !== nextPlayer) g.players[i].score -= kongBaseScore }
            applyBaoSettlement(g, nextPlayer, true, null, kongBaseScore, 1)
            for (let i = 0; i < 4; i++) { if (i !== nextPlayer) recordPayment(g.players[i].name, nextP.name, kongBaseScore, '吃杠后自摸', baseFan, g.gameMultiplier) }
            log(nextP.name, '吃杠后自摸', `${nextP.hand.map(t => tileStr(t)).join(' ')} [${kongBaseScore}×3=${kongBaseScore*3}]`)
            nextP.wonFan = kongBaseScore
            nextP.winHandType = htn4 || '普通吃杠'
            nextP.status = 'won'
            finishedPlayers.add(nextPlayer)
            recordWinner(nextP, nextPlayer, true, kongBaseScore, baseFan, turn)
            log(nextP.name, '胡牌(血战)', `吃杠后自摸 [${kongBaseScore}×3]`)
            if (finishedPlayers.size >= 3) {
              return buildResult(nextPlayer, '杠上自摸', kongBaseScore, nextP.winHandType || '杠上自摸', kongBaseScore, undefined)
            }
            g.current = (nextPlayer + 1) % 4
            continue
          }
        }
      }
      const chowDiscard = aiDiscard(nextP, g.gameMultiplier, g.discardPile, g.wallIdx, g.deck.length, g.players, nextPlayer, round * 4 + nextPlayer)
      nextP.hand = nextP.hand.filter(t => t.id !== chowDiscard.id)
      g.discardPile.push(chowDiscard)
      // 【修复】吃后出牌写入 snapshot（吃家无摸牌，drawnTile='-'）
      recordTurnSnapshot(nextPlayer, '-', tileStr(chowDiscard))
      meldTaken = true
      g.current = (nextPlayer + 1) % 4  // K哥铁律：吃后下家摸牌，不是吃家继续
      break  // 吃后退出循环，防止其他家继续碰/杠
    }

    g.current = nextPlayer
    consecutiveDraws++
    if (consecutiveDraws > MAX_ROUNDS * 4) {
      // 流局：返回已有赢家（如果有的话）
      if (winnersThisGame.length > 0) {
        return buildResult(winnersThisGame[0].playerIndex, '流局', 0, '流局', 0, undefined)
      }
      return {
        winner: -1,
        scores: g.players.map(p => p.score),
        events: [],
        multiplier: g.gameMultiplier,
        settlementLog: [],
        snapshots: recordSnapshots(),
        winnerPlayer: undefined,
        roundNum: turn,
        winnersThisGame: [],
        turnSnapshots,
      }
    }
  // 牌墙耗尽：循环正常结束后（consecutiveDraws 未超限但 wall 已空）
  if (winnersThisGame.length > 0) {
    return buildResult(winnersThisGame[0].playerIndex, '流局', 0, '流局', 0, undefined)
  }
  return {
    winner: -1,
    scores: g.players.map(p => p.score),
    events: [],
    multiplier: g.gameMultiplier,
    settlementLog: [],
    snapshots: recordSnapshots(),
    winnerPlayer: undefined,
    roundNum: turn,
    winnersThisGame: [],
    turnSnapshots,
  }
}

// ========== Batch Evaluation ==========
interface EvalResult {
  akScore: number; akWins: number
  winRates: Record<string, number>; scores: Record<string, number>
  draws: number
  bigWin: { gameIdx: number; result: GameResult; score: number } | null
  bigLoss: { gameIdx: number; result: GameResult; score: number } | null
  // 模板输出用
  totalGames: number; winGames: number; winnerInstances?: number; selfDrawGames: number; discardWinGames?: number
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
  playerStats: { name: string; score: number; wins: number; deltas: number }[]
  // 每回合快照（--detail 时收集，用于 round 文件每圈明细）
  turnSnapshots: any[]
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
      const partner = r.snapshots?.[ci]
      // 【修复】显示条件：任一单向 >= 3 口即成立，无单向达到 >= 3 则不输出
      if (snap.meldSources[ci] >= 3 && partner) {
        const level = snap.meldSources[ci] >= 4 ? '四口' : '三口'
        const bToA = partner?.meldSources?.[r.snapshots.indexOf(snap)] ?? 0
        baoRelations.push(`  - ${snap.name} → ${partner.name}: ${level} (A->B:${snap.meldSources[ci]}, B->A:${bToA})`)
      }
    }
  }
  lines.push('')
  lines.push('- 三口/四口关系')
  if (baoRelations.length > 0) {
    lines.push(...baoRelations)
  } else {
    lines.push('  无')
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
  let winnerInstances = 0
  let selfDrawGames = 0
  let discardWinGames = 0
  let fightToLastGames = 0
  let bigWinGames = 0
  let menqingWinGames = 0
  let bigWin: EvalResult['bigWin'] = null
  let bigLoss: EvalResult['bigLoss'] = null
  let worstSingleLoss: EvalResult['worstSingleLoss'] = null
  const winningGames: WinningGameRecord[] = []
  const multiWinDist = [0, 0, 0, 0]  // [单人赢,双人赢,三人赢,四人赢] 局数
  const handTypeDist: Record<string, number> = {}
  const allTurnSnapshots: any[] = []  // --detail 时收集
  prevRoundWasDraw = false

  for (let g = 0; g < games; g++) {
    const result = runGame(akPolicy, otherPolicies, g)  // 传入 gameIdx 供 snapshot 使用
    if (result) {
      // 收集每局每圈快照
      if (result.turnSnapshots) allTurnSnapshots.push(...result.turnSnapshots)
      const gameWinners = result.winnersThisGame || []
      if (result.winner == null || result.winner < 0 || gameWinners.length === 0) {
        draws++
        prevRoundWasDraw = true
        continue
      }

      const winner = AI_NAMES[result.winner]
      wins[winner]++
      winGames++
      prevRoundWasDraw = false

      const akDelta = result.scores[0] * SETTLEMENT_MULT
      for (let i = 0; i < AI_NAMES.length; i++) {
        scores[AI_NAMES[i]] += result.scores[i] * SETTLEMENT_MULT
      }
      if (akDelta > 0 && (!bigWin || akDelta > bigWin.score)) bigWin = { gameIdx: g, result, score: akDelta }
      if (akDelta < 0 && (!bigLoss || akDelta < bigLoss.score)) bigLoss = { gameIdx: g, result, score: akDelta }

      // === 用 winnersThisGame（runGame 里每个赢家直接 push 的）统计 ===
      const winnerCount = gameWinners.length
      if (winnerCount > 0) {
        if (winnerCount >= 2) fightToLastGames++
        if (winnerCount >= 1) multiWinDist[Math.min(winnerCount, 4) - 1]++
        winnerInstances += gameWinners.length
        for (const w of gameWinners) {
          if (w.isSelfDraw) selfDrawGames++; else discardWinGames++;
          // winHandType 是逗号分隔的字符串枚举名（如 'all_triplets'、'half_flush'），不是数字
          const typeStrs = w.winHandType ? w.winHandType.split(',').filter(t => t.length > 0) : []
          const typeNamesRaw = typeStrs.filter(t => t !== HandType.STANDARD).map(t => HAND_TYPE_NAMES[t as HandType] || t)
          const typeNames = typeNamesRaw.length > 0 ? typeNamesRaw : ['普通']  // '普通' 仅作 display fallback
          const bigTypes = [HandType.FENG_PENG, HandType.ALL_WIND, HandType.QING_PENG]
          if (typeStrs.some(t => bigTypes.includes(t as HandType))) bigWinGames++
          if (w.melds.length === 0) menqingWinGames++
          for (const t of typeNames) handTypeDist[t] = (handTypeDist[t] || 0) + 1
          const winnerScore = result.scores[w.playerIndex] || 0
          winningGames.push({
            gameIdx: g, winnerName: w.name, hand: w.hand,
            melds: w.melds, handTypes: typeNames,
            isSelfDraw: w.isSelfDraw, score: winnerScore,
            multiplier: result.multiplier, roundNum: w.roundNum,
            akDelta: winnerScore * SETTLEMENT_MULT, result,
            wonFan: w.wonFan, baseFan: w.baseFan, winHandType: w.winHandType,
            wildTile: w.wildTile, wildTileValue: w.wildTileValue,
            isMenQing: w.isMenQing, winningTile: w.winningTile,
            flowers: w.flowers,
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
  const selfDrawRate = winnerInstances > 0 ? selfDrawGames / winnerInstances : 0
  const discardWinRate = winnerInstances > 0 ? discardWinGames / winnerInstances : 0
  const fightToLastRate = winGames > 0 ? fightToLastGames / winGames : 0
  const bigHandRate = winnerInstances > 0 ? bigWinGames / winnerInstances : 0
  const menqingWinRate = winnerInstances > 0 ? menqingWinGames / winnerInstances : 0

  let mf = 0
  mf -= Math.max(0, drawRate - 0.10) * 5000  // 流局率惩罚（目标<10%）
  mf += Math.max(0, (1 - drawRate) - 0.90) * 2500  // 胡牌率奖励（目标>=90%）
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
    bigWin, bigLoss, totalGames: games, winGames, winnerInstances, selfDrawGames, discardWinGames,
    fightToLastGames, bigWinGames, menqingWinGames, metricsFitness: mf, worstSingleLoss,
    winningGames, handTypeDist, multiWinDist,
    playerStats: AI_NAMES.map(name => ({ name, score: scores[name] || 0, wins: wins[name] || 0, deltas: [] })),
    turnSnapshots: allTurnSnapshots,
  }
}

// ========== Main Training Loop ==========
function main() {
  try {
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
    `创建时间: ${new Date().toISOString()}`,
    '训练脚本: train-ai-ak.ts',
    `Config: ${ROUNDS} rounds × ${GAMES_PER_ROUND} games = ${ROUNDS * GAMES_PER_ROUND} total`,
    '---',
  ]
  console.log(header.join('\n'))
  logLines.push(...header)

  // Round 0: baseline evaluation（仅多轮或多局时有意义）
  let baseline: EvalResult
  try {
    baseline = evaluatePolicy(bestPolicy, fixedPolicies, GAMES_PER_ROUND)
  } catch (e) {
    console.error('[BASELINE_ERROR] 基线评估崩溃:', e)
    _savePartialReport()
    process.exit(1)
  }
  bestScore = BASELINE_MODE ? baseline.metricsFitness : baseline.akScore
  const baseLine = BASELINE_MODE
    ? `| Bot | 总分 | 胜率 | 排名 |\n|-----|------|------|------|\n` + AI_NAMES.map(n => `| ${n} | ${baseline.scores[n]} | ${(baseline.winRates[n]*100).toFixed(1)}% | - |`).join('\n') + `\n| 流局率 | ${(baseline.draws/GAMES_PER_ROUND*100).toFixed(1)}% | | |`
    : `AI-AK baseline: score=${baseline.akScore}  wins=${baseline.akWins}/${GAMES_PER_ROUND}  draws=${baseline.draws ?? 0}`
  console.log(baseLine)
  logLines.push(baseLine)

  // Track history for adaptive mutation
  const scoreHistory: number[] = [baseline.akScore]
  let plateauCount = 0
  let lastRoundEval: EvalResult | null = null
  const roundReports: ReturnType<typeof buildRoundReport>[] = []

  // Round 0 baseline: 仅 ROUNDS>1 或 GAMES_PER_ROUND>1 时才记录（避免 1×1 时多余）
  if (ROUNDS > 1 || GAMES_PER_ROUND > 1) {
    const baselineReport = buildRoundReport(0, baseline, bestPolicy, AI_NAMES, 'train-ai-ak.ts')
    roundReports.push(baselineReport)
  }

  // 共享状态：崩溃时用于保存部分报告
  _mainMdFile = mdFile
  _mainBestPolicy = bestPolicy
  _mainRoundReports = roundReports

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
      let result: EvalResult | null = null
      try {
        result = evaluatePolicy(candidates[c], fixedPolicies, GAMES_PER_ROUND)
      } catch (e) {
        console.error(`[CANDIDATE_ERROR] candidate ${c}:`, e)
        continue
      }
      const score = BASELINE_MODE ? result!.metricsFitness : result!.akScore
      const selfDR = result.winGames > 0 ? (result.selfDrawGames/result.winGames*100).toFixed(0) : '0'


      if (result && score >= roundBestScore) {
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



    // Print opponent summary（已有bestEvalResult=roundBestPolicy评估，复用它避免重复计算崩溃风险）
    if (bestEvalResult) {
      lastRoundEval = bestEvalResult
      const summaryLine = `  Current standings: ` + AI_NAMES.map(n =>
        `${n}:${bestEvalResult!.scores[n]}(${(bestEvalResult!.winRates[n]*100).toFixed(0)}%)`
      ).join('  ')
      roundLines.push(summaryLine)
      console.log(roundLines.join('\n'))
    } else {
      // 没有候选成功（全部崩溃），跳过本轮输出
      console.error(`[ROUND_ERROR] 第${round}轮所有候选全部崩溃，跳过`)
    }



    console.log(roundLines.join('\n'))

    // 每轮单独输出文件（使用标准化reporter）
    // 无论是否 improved，每局结束后都写 round 文件（--detail 时）
    if (DETAIL_MODE && bestEvalResult) {
      const report = buildRoundReport(round, bestEvalResult, roundBestPolicy as any, AI_NAMES, 'train-ai-ak.ts')
      roundReports.push(report)
      const filename = writeRoundFile(OUT_DIR, report, true)  // showDetail=true
      console.log(`  → 轮次详情已保存: ${filename}`)
    } else if (!DETAIL_MODE) {
      // 依然构建 report（用于汇总），但不写 round 文件
      if (bestEvalResult) {
        const report = buildRoundReport(round, bestEvalResult, roundBestPolicy as any, AI_NAMES, 'train-ai-ak.ts')
        roundReports.push(report)
      }
    }
  }  // End round loop

  // Print cache stats
  const tingStats = getIsTingCacheStats()
  const canWinStats = getCanWinCacheStats()
  console.log(`\n[性能] isTing缓存: 命中${tingStats.hits} 未命中${tingStats.misses} 命中率${tingStats.hitRate}`)
  console.log(`[性能] canWin缓存: 命中${canWinStats.hits} 未命中${canWinStats.misses} 命中率${canWinStats.hitRate}`)
  logLines.push(`\n[性能] isTing缓存: 命中${tingStats.hits} 未命中${tingStats.misses} 命中率${tingStats.hitRate}`)
  logLines.push(`[性能] canWin缓存: 命中${canWinStats.hits} 未命中${canWinStats.misses} 命中率${canWinStats.hitRate}`)

let finalEvalLines: string[] = []
  // Final evaluation: 仅多轮或多局时有意义（1×1 时跳过，避免冗余）
  if (ROUNDS > 1 || GAMES_PER_ROUND > 1) {
    console.log('\n--- 最终评估 (' + GAMES_PER_ROUND + '局) ---')
    finalEvalLines.push('\n--- 最终评估 (' + GAMES_PER_ROUND + '局) ---')

    let finalEval: EvalResult
    try {
      finalEval = evaluatePolicy(bestPolicy, fixedPolicies, GAMES_PER_ROUND)
    } catch (e) {
      console.error('[FINAL_EVAL_ERROR] 最终评估崩溃:', e)
      finalEval = {
        akScore: bestScore, akWins: 0,
        winRates: Object.fromEntries(AI_NAMES.map(n => [n, 0])),
        scores: Object.fromEntries(AI_NAMES.map(n => [n, 0])),
        draws: 0, totalGames: 0, winGames: 0, selfDrawGames: 0,
        fightToLastGames: 0, bigWinGames: 0, menqingWinGames: 0,
        metricsFitness: bestScore, bigWin: null, bigLoss: null, worstSingleLoss: null,
        winningGames: [], multiWinDist: [0,0,0,0], handTypeDist: {}, turnSnapshots: [], playerStats: [],
      }
    }

    const finalReport = buildRoundReport(ROUNDS + 1, finalEval, bestPolicy, AI_NAMES, 'train-ai-ak.ts')
    const finalReportFormatted = formatRoundReport(finalReport, false, '最终评估')
    console.log(finalReportFormatted)
    finalEvalLines.push(finalReportFormatted)

    // 最具参考价值的逐局明细保留到 logLines（三口/四口关系 + 结算逐笔）
    if (finalEval.worstSingleLoss) {
      const gl = finalEval.worstSingleLoss
      finalEvalLines.push('')
      finalEvalLines.push('## 全局最大单人亏损局（跨所有轮次）')
      finalEvalLines.push(`- 最大亏损: ${gl.loser} ${gl.score} 点（绝对值 ${Math.abs(gl.score)}）`)
      finalEvalLines.push(`- 局号: ${gl.gameIdx}`)
      finalEvalLines.push(`- 倍数: ×${gl.result.multiplier}`)

      // 胡牌玩家明细
      finalEvalLines.push('')
      finalEvalLines.push('- 输出该局所有胡牌玩家明细')
      const gWinnerSnap = gl.result.snapshots?.[gl.result.winner]
      if (gWinnerSnap) {
        const gWinEvent = gl.result.events.find(e => e.action.includes('自摸') || e.action.includes('放炮胡') || e.action.includes('胡'))
        const gWinType = gWinEvent?.action?.includes('自摸') ? '自摸' : gWinEvent?.action?.includes('放冲') ? '放冲' : '胡牌'
        finalEvalLines.push(`  - 玩家: ${gWinnerSnap.name}`)
        finalEvalLines.push(`    - 胡牌方式: ${gWinType}`)
        finalEvalLines.push(`    - 手牌牌面: ${gWinnerSnap.hand || '(空)'}`)
        finalEvalLines.push(`    - 门口牌（吃/碰/杠）: ${gWinnerSnap.melds.length > 0 ? gWinnerSnap.melds.join(' ; ') : '(无)'}`)
        finalEvalLines.push(`    - 花牌: ${gWinnerSnap.flowers.length > 0 ? gWinnerSnap.flowers.join(' ') : '(无)'}`)
      }

      // 三口/四口
      const gBao: string[] = []
      for (const snap of gl.result.snapshots || []) {
        for (let ci = 0; ci < 4; ci++) {
          const partner = gl.result.snapshots?.[ci]
          // 【修复】任一单向 >= 3 口即成立，无单向达到 >= 3 则不输出
          if (snap.meldSources[ci] >= 3 && partner) {
            const level = snap.meldSources[ci] >= 4 ? '四口' : '三口'
            const bToA = partner?.meldSources?.[gl.result.snapshots.indexOf(snap)] ?? 0
            gBao.push(`  - ${snap.name} → ${partner.name}: ${level} (A->B:${snap.meldSources[ci]}, B->A:${bToA})`)
          }
        }
      }
      finalEvalLines.push('')
      finalEvalLines.push('- 三口/四口关系')
      if (gBao.length > 0) {
        finalEvalLines.push(...gBao)
      } else {
        finalEvalLines.push('  无')
      }


      // 结算明细
      finalEvalLines.push('')
      finalEvalLines.push('- 结算逐笔明细（谁付给谁、倍率和金额）')
      if (gl.result.settlementLog && gl.result.settlementLog.length > 0) {
        for (const s of gl.result.settlementLog) {
          const multStr = s.mult ? ` (${s.amount / s.mult}x${s.mult})` : ''
          finalEvalLines.push(`  - [${s.reason}] ${s.from} -> ${s.to} : ${s.amount}${multStr}`)
        }
      } else {
        finalEvalLines.push('  - (无)')
      }
    }
  }

  // Save: metrics 用 lastRoundEval（1×1 时即为真实结果，多轮时为最后一轮结果）
  const metrics = {
    fitness: lastRoundEval!.akScore,
    huRate: lastRoundEval!.winRates['AI-AK'],
    drawRate: lastRoundEval!.draws / Math.max(1, lastRoundEval!.totalGames),
    totalGames: ROUNDS * GAMES_PER_ROUND,
    note: `AI-AK iterative training - ${ROUNDS}x${GAMES_PER_ROUND}`
  }
  _mainMetrics = metrics  // 崩溃时用最新 metrics

  if (BASELINE_MODE) {
    // 基线模式：四家同步保存
    for (const name of AI_NAMES) {
      saveCharacter(name, bestPolicy, metrics)
    }
    console.log(`Baseline saved to all 4 AIs: ${AI_NAMES.join(', ')}`)
  } else {
    saveCharacter('AI-AK', bestPolicy, metrics)
  }

  // 主日志：只输出实际训练的轮次（第1轮到第ROUNDS轮），不输出初始评估和最终评估
  const mainOut: string[] = [...logLines]
  for (const report of roundReports) {
    if (report.round === 0 || report.round === ROUNDS + 1) continue  // 跳过初始评估和最终评估
    mainOut.push(formatRoundReport(report, false, `第${report.round}轮`))
  }
  fs.writeFileSync(mdFile, mainOut.join('\n'), 'utf-8')
  fs.writeFileSync(policyFile, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  fs.writeFileSync(policyLatest, JSON.stringify({ metrics, policy: bestPolicy }, null, 2), 'utf-8')
  const indexFile = writeIndexFile(OUT_DIR, roundReports)

  console.log(`\nLog saved: ${mdFile}`)
  console.log(`Policy saved: ${policyFile}`)
  console.log(`Policy latest: ${policyLatest}`)
  console.log(`Index saved: ${indexFile}`)
  } catch (err) {
    console.error('[MAIN_ERROR]', err)
    _savePartialReport()
    process.exit(1)
  }
}

// Only run when executed directly (not imported)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) main()

}
