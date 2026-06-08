/**
 * bug:9588 — 比赛过程中点击"下一局移除AI-AK"后,人数 < 4 时
 *   1) 亮牌(REVEAL) → 结算(ENDED) 应正常继续
 *   2) 结算后: phase 应变回 WAITING, 不应触发 beginGame 抛错
 *   3) 应广播"AI 已被移除"和"等待其他玩家加入"消息
 *
 * 根因: 旧逻辑 endRound → broadcastGameState(ENDED) → applyPendingChanges
 *   改 phase=WAITING 但**没有再 broadcast** → autoStartNextRound 触发 → beginGame
 *   看到 players<4 抛错 → 客户端永远卡在结算画面,等不到下一局
 *
 * 修复: endRound 在 applyPendingChanges 后,如果 phase===WAITING:
 *   - 重新 broadcastGameState 让客户端同步结算+WAITING 状态
 *   - 广播 AI 移除消息 + 等待加入消息
 *   - 跳过 autoStartNextRound(人数不足,beginGame 必失败)
 */
import { gameManager } from '../server/utils/gameManager';
import { GameEndReason, GamePhase, PlayerStatus, type GameState, type Player } from '../server/types/game';

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

function mkPlayer(id: string, position: number, name?: string): Player {
  return {
    id,
    userId: id,
    name: name || id,
    position,
    hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
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
    inheritMultiplier: 2,
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

console.log('\n=== 回归测试: bug:9588 移除 AI 后等待加入 ===\n');

// 监听广播
const broadcasts: Array<{ text: string; type: string; actionKind?: string }> = [];
const originalBroadcastQuick = (gameManager as any).broadcastQuickMessage?.bind(gameManager);
(gameManager as any).broadcastQuickMessage = (gameId: string, text: string, type: string, actionKind?: string) => {
  broadcasts.push({ text, type, actionKind });
  originalBroadcastQuick?.(gameId, text, type, actionKind);
};

// 监听 broadcastGameState 调用次数
let lastBroadcastedPhase: string | null = null;
let lastBroadcastedPlayerCount = 0;
const originalBroadcastState = (gameManager as any).broadcastGameState?.bind(gameManager);
(gameManager as any).broadcastGameState = (gameId: string) => {
  const g = (gameManager as any).games?.get(gameId);
  if (g) {
    lastBroadcastedPhase = g.phase;
    lastBroadcastedPlayerCount = g.players?.length || 0;
  }
  originalBroadcastState?.(gameId);
};

// 用例 1: 4 人 → endRound → 移除 AI-AK → 人数<4 → phase 应变 WAITING + 广播"AI 移除"+"等待加入"
{
  console.log('  --- 用例 1: 4人打完后移除 AI-AK ---');
  broadcasts.length = 0;
  lastBroadcastedPhase = null;
  lastBroadcastedPlayerCount = 0;

  const players = [
    mkPlayer('p1', 0, 'K哥'),
    mkPlayer('p2', 1, '小虾米'),
    mkPlayer('p3', 2, 'AI-AK'),
    mkPlayer('p4', 3, '老高'),
  ];
  const game = baseGame(`bug-9588-1-${Date.now()}-${Math.random()}`, players);
  // K哥胡
  game.players[0].status = PlayerStatus.WON;
  game.players[0].isSelfDrawn = true;
  game.players[0].wonFan = 10;
  game.players[0].winHandType = '碰碰胡';
  game.players[0].winningScoreBreakdown = {
    baseFan: 10, extraMultipliers: 1, diceMultiplier: 1, inheritMultiplier: 2,
    effectiveMultiplier: 2, settlementMultiplier: 10, finalPoints: 20,
    details: []
  };

  // 注入 gameManager
  (gameManager as any).games.set(game.gameId, game);
  (gameManager as any).playerToGame?.set('p1', game.gameId);
  (gameManager as any).playerToGame?.set('p2', game.gameId);
  (gameManager as any).playerToGame?.set('p3', game.gameId);
  (gameManager as any).playerToGame?.set('p4', game.gameId);

  // 比赛中"下一局移除AI-AK": 把 AI-AK 加入 pendingRemovals
  game.pendingRemovals = ['p3'];

  // 触发 endRound — 预设为 REVEAL 阶段跳过亮牌,直接进结算
  game.phase = GamePhase.REVEAL;
  (gameManager as any).endRound(game, GameEndReason.LAST_PLAYER);

  // 验证 1: 结算后人数 < 4
  test('移除后人数 < 4', game.players.length === 3, `actual=${game.players.length}`);
  // 验证 2: phase 应为 WAITING(不是 ENDED,因为人数不足回等待)
  test('人数 < 4 时 phase=WAITING', game.phase === GamePhase.WAITING, `actual=${game.phase}`);
  // 验证 3: AI-AK 已被移除
  test('AI-AK 已被移除', !game.players.find(p => p.id === 'p3'));
  test('AI-AK 名字 AK 已不在玩家列表', !game.players.find(p => p.name === 'AI-AK'));

  // 验证 4: 应广播过 phase=WAITING 状态
  test('endRound 后最后一次 broadcastGameState 的 phase=WAITING', lastBroadcastedPhase === GamePhase.WAITING, `actual=${lastBroadcastedPhase}`);

  // 验证 5: 应广播"AI 移除"和"等待加入"消息
  const hasRemoveMsg = broadcasts.some(b => b.text.includes('AI-AK') && b.text.includes('已被移除'));
  test('广播了"AI-AK 已被移除"消息', hasRemoveMsg, `broadcasts=${JSON.stringify(broadcasts.map(b => b.text))}`);
  const hasWaitMsg = broadcasts.some(b => b.text.includes('等待') && b.text.includes('加入'));
  test('广播了"等待其他玩家加入"消息', hasWaitMsg, `broadcasts=${JSON.stringify(broadcasts.map(b => b.text))}`);

  // 验证 6: 不应注册 autoStartNextRound timer
  // (因为 < 4 人会跳 beginGame 抛错,这里通过检查 phase 还是 WAITING 来间接验证)
  // 等 50ms 让可能的 timer 触发(10s 太久,这里只验证 phase 没被改成 STARTING)
  await new Promise(r => setTimeout(r, 100));
  test('100ms 后 phase 仍是 WAITING (没被 beginGame 错误改成 STARTING)', game.phase === GamePhase.WAITING, `actual=${game.phase}`);

  // 清理
  (gameManager as any).games.delete(game.gameId);
}

// 用例 2: 4 人 → 没人移除 → endRound 后 phase 仍为 ENDED, 不发"等待加入"
{
  console.log('  --- 用例 2: 4人满员,无移除 ---');
  broadcasts.length = 0;

  const players = [
    mkPlayer('a1', 0, 'p1'),
    mkPlayer('a2', 1, 'p2'),
    mkPlayer('a3', 2, 'p3'),
    mkPlayer('a4', 3, 'p4'),
  ];
  const game = baseGame(`bug-9588-2-${Date.now()}-${Math.random()}`, players);
  game.players[0].status = PlayerStatus.WON;
  game.players[0].isSelfDrawn = true;
  game.players[0].wonFan = 10;
  game.players[0].winHandType = '清一色';
  game.players[0].winningScoreBreakdown = {
    baseFan: 10, extraMultipliers: 1, diceMultiplier: 1, inheritMultiplier: 1,
    effectiveMultiplier: 1, settlementMultiplier: 10, finalPoints: 10,
    details: []
  };

  (gameManager as any).games.set(game.gameId, game);
  game.phase = GamePhase.REVEAL;
  (gameManager as any).endRound(game, GameEndReason.LAST_PLAYER);

  test('满员 4 人,endRound 后 phase=ENDED (不会变 WAITING)', game.phase === GamePhase.ENDED, `actual=${game.phase}`);
  test('满员时不应广播"等待加入"消息', !broadcasts.some(b => b.text.includes('等待') && b.text.includes('加入')));

  // 清理
  (gameManager as any).games.delete(game.gameId);
}

console.log(`\n=== Total: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
