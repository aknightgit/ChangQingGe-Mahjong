import { gameManager } from '../server/utils/gameManager';
import { ActionType, GamePhase, MeldType, PlayerStatus, TileSuit } from '../server/types/game';

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

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value };
}

function player(id: string, position: number, concealedTiles: any[]) {
  return {
    id,
    name: id,
    position,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [],
      discardedTiles: []
    },
    status: PlayerStatus.PLAYING,
    isDealer: false,
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

function baseGame(players: any[], discardTile: any) {
  return {
    gameId: `approval-${Date.now()}-${Math.random()}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [tile('wall-1', TileSuit.DOTS, 9), tile('wall-2', TileSuit.DOTS, 8)],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile: [discardTile],
    actionHistory: [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    drawnThisTurn: false
  } as any;
}

console.log('\n=== 回归测试: 抢牌审批链 ===\n');

const events: any[] = [];
(gameManager as any).setWebSocketManager({
  broadcast: (_gameId: string, event: string, payload: any) => {
    events.push({ event, payload });
  }
});

// 用例1：吃牌请求遇到胡/碰时，应先给胡，再给碰，最后才轮到吃
{
  const discard = tile('discard-5', TileSuit.DOTS, 5);
  const discarder = player('discarder', 0, []);
  const chowRequester = player('chow', 1, [tile('c4', TileSuit.DOTS, 4), tile('c6', TileSuit.DOTS, 6)]);
  const huCandidate = player('hu', 2, []);
  const pengCandidate = player('peng', 3, [tile('p5a', TileSuit.DOTS, 5), tile('p5b', TileSuit.DOTS, 5)]);
  const game = baseGame([discarder, chowRequester, huCandidate, pengCandidate], discard);
  game.pendingActions = [{
    playerId: chowRequester.id,
    availableActions: [ActionType.CHOW, ActionType.PASS],
    tile: discard,
    expiresAt: Date.now() + 5000
  }];
  (gameManager as any).games.set(game.gameId, game);

  (gameManager as any).startApproval(
    game,
    chowRequester.id,
    'chow',
    [
      { playerId: huCandidate.id, availableActions: ['hu'] },
      { playerId: pengCandidate.id, availableActions: ['peng'] }
    ],
    discard,
    ['c4', 'c6']
  );

  test('第一阶段只弹给胡牌候选', game.pendingActions.some((pa: any) => pa.playerId === huCandidate.id && pa.availableActions.includes(ActionType.HU)));
  test('第一阶段不会提前给碰牌候选按钮', !game.pendingActions.some((pa: any) => pa.playerId === pengCandidate.id));

  await (gameManager as any).handleApprovalChoice(game.gameId, huCandidate.id, 'pass');

  test('胡牌候选放弃后，进入碰牌阶段', game.pendingActions.some((pa: any) => pa.playerId === pengCandidate.id && pa.availableActions.includes(ActionType.PENG)));
  test('碰牌阶段仍未直接执行吃牌', game.players[1].hand.exposedMelds.length === 0);
}

// 用例2：审批确认碰牌可以真正执行，不能再出现“点了没反应”
{
  const discard = tile('discard-7', TileSuit.DOTS, 7);
  const discarder = player('discarder2', 0, []);
  const chowRequester = player('requester2', 1, [tile('r6', TileSuit.DOTS, 6), tile('r8', TileSuit.DOTS, 8)]);
  const pengCandidate = player('peng2', 2, [tile('p7a', TileSuit.DOTS, 7), tile('p7b', TileSuit.DOTS, 7)]);
  const idle = player('idle2', 3, []);
  const game = baseGame([discarder, chowRequester, pengCandidate, idle], discard);
  game.pendingActions = [{
    playerId: chowRequester.id,
    availableActions: [ActionType.CHOW, ActionType.PASS],
    tile: discard,
    expiresAt: Date.now() + 5000
  }];
  (gameManager as any).games.set(game.gameId, game);

  (gameManager as any).startApproval(
    game,
    chowRequester.id,
    'chow',
    [{ playerId: pengCandidate.id, availableActions: ['peng'] }],
    discard,
    ['r6', 'r8']
  );

  await (gameManager as any).handleApprovalChoice(game.gameId, pengCandidate.id, 'confirm');

  test('确认碰牌后应产生碰副露', pengCandidate.hand.exposedMelds.some((meld: any) => meld.type === MeldType.TRIPLET));
  test('确认碰牌后轮到碰牌者出牌', game.currentPlayerIndex === 2);
  test('确认碰牌后请求者吃牌待定被清掉', !game.pendingActions.some((pa: any) => pa.playerId === chowRequester.id));
}

// 用例3：审批确认杠牌可以真正执行，且广播里带 expiresAt 给前端倒计时
{
  const discard = tile('discard-3', TileSuit.DOTS, 3);
  const discarder = player('discarder3', 0, []);
  const chowRequester = player('requester3', 1, [tile('r2', TileSuit.DOTS, 2), tile('r4', TileSuit.DOTS, 4)]);
  const kongCandidate = player('kong3', 2, [
    tile('k3a', TileSuit.DOTS, 3),
    tile('k3b', TileSuit.DOTS, 3),
    tile('k3c', TileSuit.DOTS, 3)
  ]);
  const idle = player('idle3', 3, []);
  const game = baseGame([discarder, chowRequester, kongCandidate, idle], discard);
  game.pendingActions = [{
    playerId: chowRequester.id,
    availableActions: [ActionType.CHOW, ActionType.PASS],
    tile: discard,
    expiresAt: Date.now() + 5000
  }];
  (gameManager as any).games.set(game.gameId, game);

  const eventCountBefore = events.length;
  (gameManager as any).startApproval(
    game,
    chowRequester.id,
    'chow',
    [{ playerId: kongCandidate.id, availableActions: ['kong'] }],
    discard,
    ['r2', 'r4']
  );

  const latestEvent = events.slice(eventCountBefore).find(e => e.event === 'actionApproval');
  test('审批广播包含 expiresAt，前端倒计时可对齐真实窗口', !!latestEvent?.payload?.expiresAt);

  await (gameManager as any).handleApprovalChoice(game.gameId, kongCandidate.id, 'confirm');

  test('确认杠牌后应产生杠副露', kongCandidate.hand.exposedMelds.some((meld: any) => meld.type === MeldType.KONG));
  test('确认杠牌后轮到杠牌者', game.currentPlayerIndex === 2);
}

// 用例4：已有 HU 倒计时不能被后续审批阶段重置
{
  const discard = tile('discard-9', TileSuit.DOTS, 9);
  const discarder = player('discarder4', 0, []);
  const chowRequester = player('requester4', 1, [tile('r8', TileSuit.DOTS, 8), tile('r10', TileSuit.DOTS, 1)]);
  const huCandidate = player('hu4', 2, []);
  const pengCandidate = player('peng4', 3, [tile('p9a', TileSuit.DOTS, 9), tile('p9b', TileSuit.DOTS, 9)]);
  const game = baseGame([discarder, chowRequester, huCandidate, pengCandidate], discard);
  const originalExpiresAt = Date.now() + 5000;
  game.pendingActions = [{
    playerId: huCandidate.id,
    availableActions: [ActionType.HU, ActionType.PASS],
    tile: discard,
    expiresAt: originalExpiresAt
  }];
  (gameManager as any).games.set(game.gameId, game);

  (gameManager as any).startApproval(
    game,
    chowRequester.id,
    'chow',
    [
      { playerId: huCandidate.id, availableActions: ['hu'] },
      { playerId: pengCandidate.id, availableActions: ['peng'] }
    ],
    discard,
    ['r8', 'r10']
  );

  const huPending = game.pendingActions.find((pa: any) => pa.playerId === huCandidate.id);
  test('已有 HU pending 的 expiresAt 不会被审批阶段重置', huPending?.expiresAt === originalExpiresAt, `expected=${originalExpiresAt}, actual=${huPending?.expiresAt}`);
}

console.log('\n==================================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
console.log('专项审批链回归通过');
