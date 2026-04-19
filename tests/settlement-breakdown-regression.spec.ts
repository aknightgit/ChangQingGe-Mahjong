import { gameManager } from '../server/utils/gameManager';
import { GameEndReason, GamePhase, PlayerStatus, TileSuit, type GameState, type Player } from '../server/types/game';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`);
    passed++;
  } else {
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function player(id: string, position: number): Player {
  return {
    id,
    userId: id,
    name: id,
    position,
    hand: {
      concealedTiles: [],
      exposedMelds: [],
      discardedTiles: []
    },
    status: PlayerStatus.PLAYING,
    isDealer: position === 0,
    isTing: false,
    missingSuit: null,
    windScore: 0,
    rainScore: 0,
    wonFan: 0,
    winOrder: null,
    winRound: null,
    winTimestamp: null,
    score: 0
  };
}

function baseGame(gameId: string, players: Player[]): GameState {
  return {
    gameId,
    roomNumber: '9999',
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile: [],
    actionHistory: [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    customScoringMode: null,
    finalScores: undefined,
    roundMultiplier: 2,
    inheritMultiplier: 4,
    inheritedGlobalMultiplier: undefined,
    diceRollCount: 2,
    liangShanThreshold: 4000,
    thinkChances: 3,
    settlementMultiplier: 10,
    hesitationWindow: 5000,
    botTakeoverPlayers: [],
    roundStats: [],
    drawnThisTurn: false
  } as any;
}

console.log('\n=== 回归测试: 结算明细/参数映射 ===\n');

// 用例1：建房参数应正确落到 game state
{
  const created = await gameManager.createGame('owner', {
    userId: 'owner',
    diceRollCount: 5,
    liangShanThreshold: 4800,
    settlementMultiplier: 8
  });
  const currentGame = await gameManager.getGame(created.gameId);

  test('建房参数 diceRollCount 落库', currentGame?.diceRollCount === 5, `actual=${currentGame?.diceRollCount}`);
  test('建房参数 liangShanThreshold 落库', currentGame?.liangShanThreshold === 4800, `actual=${currentGame?.liangShanThreshold}`);
  test('建房参数 settlementMultiplier 落库', currentGame?.settlementMultiplier === 8, `actual=${currentGame?.settlementMultiplier}`);
}

// 用例2：自摸局应生成完整 winnerDetails + transfers
{
  const players = [player('p1', 0), player('p2', 1), player('p3', 2), player('p4', 3)];
  const currentGame = baseGame(`settle-self-${Date.now()}`, players);
  const winner = currentGame.players[0];
  winner.status = PlayerStatus.WON;
  winner.isSelfDrawn = true;
  winner.wonFan = 20;
  winner.winHandType = '碰碰胡';
  winner.winningScoreBreakdown = {
    baseFan: 10,
    extraMultipliers: 2,
    diceMultiplier: 2,
    inheritMultiplier: 4,
    effectiveMultiplier: 8,
    settlementMultiplier: 10,
    finalPoints: 20,
    details: ['有效倍率 = min(8, 骰子倍数2 × 继承倍数4) = 8']
  };

  (gameManager as any).endRound(currentGame, GameEndReason.LAST_PLAYER);

  const round = currentGame.roundStats?.[0];
  test('自摸局记录 winnerDetails', !!round?.winnerDetails?.length);
  test('自摸局记录 3 条赔付流向', round?.transfers?.length === 3, `actual=${round?.transfers?.length}`);
  test('winnerDetails 带基础番', round?.winnerDetails?.[0]?.baseFan === 10, `actual=${round?.winnerDetails?.[0]?.baseFan}`);
  test('winnerDetails 带结算膨胀倍数', round?.winnerDetails?.[0]?.settlementMultiplier === 10, `actual=${round?.winnerDetails?.[0]?.settlementMultiplier}`);
  test('自摸局赢家总分正确', currentGame.finalScores?.p1 === 60, `actual=${currentGame.finalScores?.p1}`);
  test('自摸局输家分数同步到 player.score', currentGame.players[1].score === -20, `actual=${currentGame.players[1].score}`);
}

// 用例3：放冲局应记录放冲对象和单条赔付
{
  const players = [player('w1', 0), player('l2', 1), player('d3', 2), player('x4', 3)];
  const currentGame = baseGame(`settle-discard-${Date.now()}`, players);
  currentGame.roundMultiplier = 1;
  currentGame.inheritMultiplier = 2;
  currentGame.settlementMultiplier = 5;
  const winner = currentGame.players[0];
  winner.status = PlayerStatus.WON;
  winner.isSelfDrawn = false;
  winner.discarderId = 'd3';
  winner.wonFan = 30;
  winner.winHandType = '清一色';
  winner.winningScoreBreakdown = {
    baseFan: 30,
    extraMultipliers: 1,
    diceMultiplier: 1,
    inheritMultiplier: 2,
    effectiveMultiplier: 2,
    settlementMultiplier: 5,
    finalPoints: 30,
    details: ['放冲赔付']
  };

  (gameManager as any).endRound(currentGame, GameEndReason.LAST_PLAYER);

  const round = currentGame.roundStats?.[0];
  test('放冲局只记录 1 条赔付流向', round?.transfers?.length === 1, `actual=${round?.transfers?.length}`);
  test('放冲流向正确', round?.transfers?.[0]?.fromPlayerId === 'd3' && round?.transfers?.[0]?.toPlayerId === 'w1');
  test('winnerDetails 记录放冲者名称', round?.winnerDetails?.[0]?.discarderName === 'd3', `actual=${round?.winnerDetails?.[0]?.discarderName}`);
}

// 用例4：三口关系和带头大哥应写入回合明细
{
  const players = [player('a1', 0), player('b2', 1), player('c3', 2), player('d4', 3)];
  const currentGame = baseGame(`settle-bailout-${Date.now()}`, players);
  const winner = currentGame.players[0];
  winner.status = PlayerStatus.WON;
  winner.isSelfDrawn = true;
  winner.wonFan = 10;
  winner.winHandType = '大吊';
  winner.winningScoreBreakdown = {
    baseFan: 10,
    extraMultipliers: 1,
    diceMultiplier: 2,
    inheritMultiplier: 4,
    effectiveMultiplier: 8,
    settlementMultiplier: 10,
    finalPoints: 10,
    details: ['互包自摸']
  };
  currentGame.leadingBrotherEvent = { firstPlayerId: 'd4', tileKey: `${TileSuit.DOTS}-5` } as any;

  const bailoutMap = new Map();
  bailoutMap.set('b2', new Map([['a1', 3]]));
  (gameManager as any).mutualBailout.set(currentGame.gameId, bailoutMap);

  (gameManager as any).endRound(currentGame, GameEndReason.LAST_PLAYER);

  const round = currentGame.roundStats?.[0];
  const bailoutTransfer = round?.transfers?.find((transfer: any) => transfer.fromPlayerId === 'b2' && transfer.amount === 30);
  const leadingBrother = round?.specialEvents?.find((event: any) => event.type === 'leading_brother');

  test('三口关系写入 roundDetails', round?.bailoutRelations?.some((rel: any) => rel.player1 === 'b2' && rel.player2 === 'a1' && rel.type === '三口'));
  test('三口赔付按 3 倍记录', !!bailoutTransfer, `transfers=${JSON.stringify(round?.transfers)}`);
  test('带头大哥事件写入明细', !!leadingBrother);
  test('带头大哥赔付流向写入 transfers', round?.transfers?.some((transfer: any) => transfer.reason === '谢谢带头大哥赔付'));
}

console.log('\n==================================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
console.log('结算明细/参数映射专项回归通过');
