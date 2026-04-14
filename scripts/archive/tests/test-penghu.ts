import { runGame } from './scripts/train-ai-ak';
import { BotPolicy } from './scripts/train-baseline';

// 碰碰胡特化策略
function createPengHuPolicy(): BotPolicy {
  return {
    selfWinChance: 1.0,
    discardHuChance: 1.0,
    selfWinWildBoost: 0.0,
    discardHuWildPenalty: 0.0,
    discardHuMenQingPenalty: 0.0,
    pengChance: 1.0,
    kongChance: 1.0,
    chowChance: 0.0,
    anKongChance: 1.0,
    pengWildBoost: 0.0,
    kongWildBoost: 0.0,
    chowWildPenalty: 0.0,
    menqingKeepBonus: 5.0,
    meldPenalty: 0.0,
    allPungsPursuit: 3.0,
    multHighAllPungs: 3.0,
    multLowAllPungs: 2.0,
    multHighHalfFlush: 0.0,
    multLowHalfFlush: 0.0,
    multHighPureFlush: 0.0,
    multLowPureFlush: 0.0,
    multHighHand5AllPungs: 3.0,
    multLowHand5AllPungs: 2.0,
    multHighHand5HalfFlush: 0.0,
    multLowHand5HalfFlush: 0.0,
    multHighHand6AllPungs: 3.0,
    multLowHand6AllPungs: 2.0,
    multHighHand6HalfFlush: 0.0,
    multLowHand6HalfFlush: 0.0,
    multHighHand6PureFlush: 0.0,
    multLowHand6PureFlush: 0.0,
    multHighHand7AllPungs: 3.0,
    multLowHand7AllPungs: 2.0,
    multHighHand7HalfFlush: 0.0,
    multLowHand7HalfFlush: 0.0,
    multHighHand7PureFlush: 0.0,
    multLowHand7PureFlush: 0.0,
    multHighHonorStart: 0.0,
    multHighValueBias: 0.0,
    hand5RouteBias: 0.0,
    hand6RouteBias: 0.0,
    hand7RouteBias: 0.0,
    speedVsValueBalance: 0.0,
    nearWeight: 0.0,
    noWildDoubleAwareness: 1.0,
    menqingDoubleAwareness: 1.0,
    defenseRiskAversion: 2.0,
    baoRiskAversion: 0.0,
    baoThreshold: 4,
    bao2ClaimPenalty: 0.0,
    bao3AvoidThreshold: 0.0,
    kakanAggression: 0.5,
    wallEarlySpeedPush: 0.0,
    wallLateDefense: 0.0,
    terminalDiscardTingSignal: 0.0,
    safeTilePriority: 0.0,
    discardObsFlushBoost: 0.0,
    discardObsWeight: 0.0,
    wildKeepPenalty: 0.0,
  };
}

const policy = createPengHuPolicy();
for (let i = 0; i < 10; i++) {
  const result = runGame(policy, [policy, policy, policy]);
  if (result) {
    const winners = result.winnersThisGame;
    const selfWins = winners.filter(w => w.name === 'AI-AK').length;
    const selfDraws = winners.filter(w => w.mode === 'self_draw').length;
    const selfDiscards = winners.filter(w => w.mode === 'discard').length;
    console.log(`第${i+1}局: AK赢=${selfWins} 总胡=${winners.length} 自摸=${selfDraws} 捉冲=${selfDiscards} 牌型=${winners.map(w=>w.handType).join(',') || '无'}`);
  } else {
    console.log(`第${i+1}局: 流局`);
  }
}
