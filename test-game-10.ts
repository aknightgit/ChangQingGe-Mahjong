/**
 * K哥要求：极简碰碰胡测试
 * 用 train-ai-ak.ts 的 runGame，强制 AK 只做碰碰胡
 */
import { runGame } from './scripts/train-ai-ak'
import { BotPolicy } from './scripts/train-baseline'

// 碰碰胡专用策略：只碰/杠，不吃，强制自摸/捉冲
function makePengPengPolicy(): BotPolicy {
  return {
    id: 'ak-pp',
    // 摸牌后：只保留刻子/杠子，单张全丢
    selfWinChance: 1.0,    // 强制自摸
    discardHuChance: 1.0,  // 强制捉冲
    selfWinWildBoost: 0,
    discardHuWildPenalty: 0,
    discardHuMenQingPenalty: 0,
    pengChance: 1.0, kongChance: 1.0, chowChance: 0,
    anKongChance: 1.0,
    pengWildBoost: 0, kongWildBoost: 0, chowPenalty: 0,
    menqingKeepBonus: 0, meldPenalty: 0,
    allPungsPursuit: 1, pureFlushPursuit: 0, halfFlushWeight: 0,
    sevenPairsPursuit: 0, allHonorsPursuit: 0, allHonorsPungsPursuit: 0,
    qingPengPursuit: 1, hunPengPursuit: 0,
    windEastKeep: 0, windSouthKeep: 0, windWestKeep: 0, windNorthKeep: 0,
    windGeneralKeep: 0,
    dragonRedKeep: 0, dragonGreenKeep: 0, dragonWhiteKeep: 0, dragonGeneralKeep: 0,
    pairWeight: 0, nearWeight: 0, tripletKeepBonus: 1, terminalPenalty: 0,
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

// 碰碰胡基础策略（陪练）
function makeBasePolicy(): BotPolicy {
  return {
    id: 'base',
    selfWinChance: 0.8, discardHuChance: 0.8,
    selfWinWildBoost: 0.1, discardHuWildPenalty: 0.4, discardHuMenQingPenalty: 0.14,
    pengChance: 0.5, kongChance: 0.5, chowChance: 0.3,
    anKongChance: 0.3,
    pengWildBoost: 0.2, kongWildBoost: 0.2, chowPenalty: 0.3,
    menqingKeepBonus: 0.5, meldPenalty: 0.2,
    allPungsPursuit: 0.5, pureFlushPursuit: 0.5, halfFlushWeight: 0.3,
    sevenPairsPursuit: 0, allHonorsPursuit: 0, allHonorsPungsPursuit: 0,
    qingPengPursuit: 0.5, hunPengPursuit: 0.3,
    windEastKeep: 0.3, windSouthKeep: 0.3, windWestKeep: 0.3, windNorthKeep: 0.3,
    windGeneralKeep: 0.3,
    dragonRedKeep: 0.5, dragonGreenKeep: 0.3, dragonWhiteKeep: 0.3, dragonGeneralKeep: 0.3,
    pairWeight: 0.5, nearWeight: 0.1, tripletKeepBonus: 0.5, terminalPenalty: 0.2,
    wildKeepPenalty: 0.3, wildBailoutThreshold: 0.5,
    wild0Aggression: 0.5, wild1Aggression: 0.5, wild2Aggression: 0.5, wild3PlusAggression: 0.5,
    wild1RouteMeldPush: 0.3, wild2RouteMeldPush: 0.3, wild3RouteMeldPush: 0.3,
    wild1RouteFlushBoost: 0.3, wild2RouteFlushBoost: 0.3, wild3RouteFlushBoost: 0.3,
    wild1RouteHonorsBoost: 0.3, wild2RouteHonorsBoost: 0.3, wild3RouteHonorsBoost: 0.3,
    wild1RouteAllPungsBoost: 0.3, wild2RouteAllPungsBoost: 0.3, wild3RouteAllPungsBoost: 0.3,
    wildMultLowAggression: 0.5, wildMultMidAggression: 0.5, wildMultHighAggression: 0.5,
    wild0MenqingKeep: 0.5, wild1MenqingKeep: 0.5, wild2MenqingKeep: 0.5,
    wild1BaoPush: 0.3, wild2BaoPush: 0.3, wild3BaoPush: 0.3,
    multLowSpeedBias: 0.5, multHighValueBias: 0.5,
    discardObsFlushBoost: 0.5, discardObsWeight: 0.3,
    bao2ClaimPenalty: 0.5, bao3AvoidThreshold: 0.8, baoSelfClaimCaution: 0.5,
    wallEarlySpeedPush: 0.5, wallMidBalance: 0.5, wallLateDefense: 0.5,
    oppTingDetection: 0.5, safeTilePriority: 0.5, terminalDiscardTingSignal: 0.3,
    wildDiaoKeepBonus: 0.3, wildDiaoFlushBoost: 0.3, wildDiaoPungBoost: 0.3,
    scoreBehindRiskBoost: 0.5, scoreLeadDefenseBoost: 0.5,
    hand5RouteBias: 0.5, hand6RouteBias: 0.5, hand7RouteBias: 0.5,
    multLowHand5AllPungs: 0.5, multLowHand5HalfFlush: 0.5,
    multHighHand5AllPungs: 0.5, multHighHand5HalfFlush: 0.5,
    multLowHand6AllPungs: 0.5, multLowHand6HalfFlush: 0.5, multLowHand6PureFlush: 0.5,
    multHighHand6AllPungs: 0.5, multHighHand6HalfFlush: 0.5, multHighHand6PureFlush: 0.5,
    multLowHand7AllPungs: 0.5, multLowHand7HalfFlush: 0.5, multLowHand7PureFlush: 0.5,
    multHighHand7AllPungs: 0.5, multHighHand7HalfFlush: 0.5, multHighHand7PureFlush: 0.5,
    multHighHonorStart: 0.3,
    speedVsValueBalance: 0.5, defenseRiskAversion: 0.5, wallTilesImpact: 0.5,
    baoRiskAversion: 0.5, baoThreshold: 0.5,
    anKongAggression: 0.5, minkanAggression: 0.5, kakanAggression: 0.5, robKongAwareness: 0.5,
    noWildDoubleAwareness: 0.5, menqingDoubleAwareness: 0.5,
    flushVsPungsBalance: 0.5, honorVsSuitedBalance: 0.5, sequenceVsTripletBias: 0.5,
  }
}

function run(): void {
  console.log('=== 碰碰胡极简测试（10局）===\n')

  const akPolicy = makePengPengPolicy()
  const base = makeBasePolicy()

  let hu = 0, self = 0, disc = 0, draw = 0

  for (let i = 1; i <= 10; i++) {
    const result = runGame(akPolicy, [base, base, base])
    if (!result) {
      console.log(`第${i}局: 错误（result=null）`)
      draw++
      continue
    }

    const akWon = result.primaryWinner === 0
    const winMode = result.winMode || ''

    if (akWon) {
      hu++
      if (winMode.includes('自摸') || winMode.includes('self')) self++
      else disc++
      console.log(`第${i}局: ✅胡(${winMode})`)
    } else {
      draw++
      console.log(`第${i}局: ❌流局`)
    }
  }

  console.log(`\n=== 结果 ===`)
  console.log(`胡牌率: ${hu}/10 = ${hu * 10}%`)
  console.log(`自摸: ${self} | 捉冲: ${disc} | 流局: ${draw}`)
}

run()
