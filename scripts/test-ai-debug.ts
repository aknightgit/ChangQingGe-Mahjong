import { runGame } from './train-baseline'
import * as fs from 'fs'
import * as path from 'path'

// Build a minimal policy
const DEFAULT_POLICY: any = {
  id: 'test',
  selfWinChance: 1.0, discardHuChance: 1.0,
  selfWinWildBoost: 0.1, discardHuWildPenalty: 0.2, discardHuMenQingPenalty: 0.05,
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

const outDir = '/home/node/.openclaw/workspace/ChangQingGe-Mahjong/training-output/test'
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const results: any[] = []
let drawCount = 0

for (let i = 0; i < 5; i++) {
  const r = runGame(DEFAULT_POLICY, [DEFAULT_POLICY, DEFAULT_POLICY, DEFAULT_POLICY])
  if (!r) {
    console.log(`Game ${i+1}: DRAW (null result)`)
    drawCount++
    results.push({ game: i+1, result: 'DRAW' })
  } else {
    const winnerDetail = r.winnerDetails?.[0]
    console.log(`Game ${i+1}: Winner=AI-${r.winner} Type=${winnerDetail?.handType || '?'} Mode=${winnerDetail?.winMode || '?'} Rounds=${r.roundNum}`)
    results.push({
      game: i+1,
      winner: r.winner,
      handType: winnerDetail?.handType,
      winMode: winnerDetail?.winMode,
      rounds: r.roundNum,
      wildTile: r.wildTile,
      multiplier: r.multiplier
    })
  }
}

// Save results
const content = `# AI 麻将测试报告\n\n## 5局测试结果\n\n| 局次 | 赢家 | 牌型 | 胡牌方式 | 回合数 | 百搭 | 倍率 |\n|------|------|------|----------|--------|------|------|\n${results.map((r: any) => {
  if (r.result === 'DRAW') return `| ${r.game} | 流局 | - | - | - | - | - |`
  return `| ${r.game} | AI-${r.winner} | ${r.handType} | ${r.winMode} | ${r.rounds} | ${r.wildTile} | ×${r.multiplier} |`
}).join('\n')}\n\n## 统计\n- 流局: ${drawCount}/5\n- 胡牌: ${5-drawCount}/5\n`
fs.writeFileSync(`${outDir}/round-run-summary.md`, content, 'utf-8')

// Also save each game
for (let i = 0; i < 5; i++) {
  const r = runGame(DEFAULT_POLICY, [DEFAULT_POLICY, DEFAULT_POLICY, DEFAULT_POLICY])
  const gameContent = r ? `# 游戏 ${i+1} 明细\n\nWinner: AI-${r.winner}\nHandType: ${r.winnerDetails?.[0]?.handType}\nWinMode: ${r.winnerDetails?.[0]?.winMode}\nRounds: ${r.roundNum}\nWildTile: ${r.wildTile}\nMultiplier: ${r.multiplier}\n\n## 所有事件\n${r.events.map((e: any) => `- [${e.turn}] ${e.player} ${e.action}: ${e.detail}`).join('\n')}\n\n## 回合快照\n${r.turnSnapshots?.map((s: any) => `Turn ${s.turn}: ${s.players[s.currentPlayer]?.name}摸了${s.drawnTile}打${s.discardedTile}`).join('\n') || '无'}\n` : `# 游戏 ${i+1}: 流局\n`
  fs.writeFileSync(`${outDir}/round-run${i+1}.md`, gameContent, 'utf-8')
  console.log(`Game ${i+1} saved`)
}

console.log(`\nSummary saved to ${outDir}/round-run-summary.md`)
