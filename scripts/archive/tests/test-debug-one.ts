/**
 * 单局调试：追踪 runGame 的完整流程
 */
import { runGame } from './scripts/train-ai-ak'
import { BotPolicy } from './scripts/train-baseline'

function makeTestPolicy(): BotPolicy {
  return {
    id: 'test',
    selfWinChance: 1.0, discardHuChance: 1.0,
    selfWinWildBoost: 0, discardHuWildPenalty: 0, discardHuMenQingPenalty: 0,
    pengChance: 0, kongChance: 0, chowChance: 0, anKongChance: 0,
    pengWildBoost: 0, kongWildBoost: 0, chowPenalty: 0,
    menqingKeepBonus: 0, meldPenalty: 0,
    allPungsPursuit: 0, pureFlushPursuit: 0, halfFlushWeight: 0,
    sevenPairsPursuit: 0, allHonorsPursuit: 0, allHonorsPungsPursuit: 0,
    qingPengPursuit: 0, hunPengPursuit: 0,
    windEastKeep: 0, windSouthKeep: 0, windWestKeep: 0, windNorthKeep: 0,
    windGeneralKeep: 0,
    dragonRedKeep: 0, dragonGreenKeep: 0, dragonWhiteKeep: 0, dragonGeneralKeep: 0,
    pairWeight: 0, nearWeight: 0, tripletKeepBonus: 0, terminalPenalty: 0,
    wildKeepPenalty: 0, wildBailoutThreshold: 0,
    wild0Aggression: 0, wild1Aggression: 0, wild2Aggression: 0, wild3PlusAggression: 0,
    wild1RouteMeldPush: 0, wild2RouteMeldPush: 0, wild3RouteMeldPush: 0,
    wild1RouteFlushBoost: 0, wild2RouteFlushBoost: 0, wild3RouteFlushBoost: 0,
    wild1RouteHonorsBoost: 0, wild2RouteHonorsBoost: 0, wild3RouteHonorsBoost: 0,
    wild1RouteAllPungsBoost: 0, wild2RouteAllPungsBoost: 0, wild3RouteAllPungsBoost: 0,
    wildMultLowAggression: 0, wildMultMidAggression: 0, wildMultHighAggression: 0,
    wild0MenqingKeep: 0, wild1MenqingKeep: 0, wild2MenqingKeep: 0,
    wild1BaoPush: 0, wild2BaoPush: 0, wild3BaoPush: 0,
    multLowSpeedBias: 0, multHighValueBias: 0,
    discardObsFlushBoost: 0, discardObsWeight: 0,
    bao2ClaimPenalty: 0, bao3AvoidThreshold: 0, baoSelfClaimCaution: 0,
    wallEarlySpeedPush: 0, wallMidBalance: 0, wallLateDefense: 0,
    oppTingDetection: 0, safeTilePriority: 0, terminalDiscardTingSignal: 0,
    wildDiaoKeepBonus: 0, wildDiaoFlushBoost: 0, wildDiaoPungBoost: 0,
    scoreBehindRiskBoost: 0, scoreLeadDefenseBoost: 0,
    hand5RouteBias: 0, hand6RouteBias: 0, hand7RouteBias: 0,
    multLowHand5AllPungs: 0, multLowHand5HalfFlush: 0,
    multHighHand5AllPungs: 0, multHighHand5HalfFlush: 0,
    multLowHand6AllPungs: 0, multLowHand6HalfFlush: 0, multLowHand6PureFlush: 0,
    multHighHand6AllPungs: 0, multHighHand6HalfFlush: 0, multHighHand6PureFlush: 0,
    multLowHand7AllPungs: 0, multLowHand7HalfFlush: 0, multLowHand7PureFlush: 0,
    multHighHand7AllPungs: 0, multHighHand7HalfFlush: 0, multHighHand7PureFlush: 0,
    multHighHonorStart: 0,
    speedVsValueBalance: 0, defenseRiskAversion: 0, wallTilesImpact: 0,
    baoRiskAversion: 0, baoThreshold: 0,
    anKongAggression: 0, minkanAggression: 0, kakanAggression: 0, robKongAwareness: 0,
    noWildDoubleAwareness: 0, menqingDoubleAwareness: 0,
    flushVsPungsBalance: 0, honorVsSuitedBalance: 0, sequenceVsTripletBias: 0,
  }
}

console.log('=== 单局调试测试 ===\n')
const policy = makeTestPolicy()
const result = runGame(policy, [policy, policy, policy])

if (result) {
  console.log(`\n结果: winner=${result.winner} mode=${result.winMode} round=${result.roundNum}`)
  console.log(`scores: ${result.scores.join(', ')}`)
  console.log(`winnersThisGame: ${result.winnersThisGame.length}`)
} else {
  console.log('\n结果: null (wall exhausted)')
}
