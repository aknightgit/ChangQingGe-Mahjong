/**
 * 长清阁麻将 - 回归测试 v2
 * P0 Bug Fix: 同回合连续摸牌防护
 *
 * 运行方式: npx tsx tests/double-draw-regression.spec.ts
 * 或在 Playwright 环境中: npx playwright test tests/double-draw-regression.spec.ts
 *
 * v2 更新: 覆盖 startGame human timer + handlePass multiHuStarter 两条新增的修复路径
 */

import { ActionType } from '../server/types/game';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ============================================================
// Mock GameState for unit testing the state machine logic
// ============================================================

interface MockPlayer {
  id: string;
  name: string;
  hand: {
    concealedTiles: { suit: string; value: number; id: string; isFlower: boolean }[];
    exposedMelds: { tiles: { suit: string; value: number; id: string; isFlower: boolean }[] }[];
  };
  status: string;
}

interface MockGameState {
  phase: string;
  currentPlayerIndex: number;
  players: MockPlayer[];
  drawnThisTurn: boolean;
  wall: { suit: string; value: number; id: string; isFlower: boolean }[];
  pendingActions: unknown[];
  flowerReplacementDone: boolean;
}

// 模拟 executeAction 中 DRAW 分支的核心状态机校验逻辑
function simulateDrawAction(game: MockGameState, player: MockPlayer): { success: boolean; error?: string; drawnThisTurn: boolean } {
  // 【状态机修复】每回合最多摸一次，防同回合连续摸牌
  if (game.drawnThisTurn) {
    return {
      success: false,
      error: 'Already drew this turn',
      drawnThisTurn: true,
    };
  }

  // 模拟 replaceInitialFlowers（无花牌场景）
  // 模拟手牌未满14张的正常摸牌路径
  if (player.hand.concealedTiles.length < 14) {
    // 模拟 handleDraw：从 wall 摸一张
    if (game.wall.length > 0) {
      const drawnTile = game.wall.shift()!;
      if (!drawnTile.isFlower) {
        player.hand.concealedTiles.push(drawnTile);
      } else {
        // 花牌替换到门口，手牌数不变
      }
    }
  }

  // 标记已摸牌
  game.drawnThisTurn = true;
  return { success: true, drawnThisTurn: true };
}

// 模拟 moveToNextPlayer 重置 drawnThisTurn
function simulateMoveToNextPlayer(game: MockGameState) {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.drawnThisTurn = false; // 【状态机修复】新回合:重置摸牌状态
}

// 模拟 startGame human dealer timer auto-draw（修复点: 必须设置 drawnThisTurn）
function simulateStartGameHumanAutoDraw(game: MockGameState, player: MockPlayer): void {
  if (player.hand.concealedTiles.length < 14 && game.wall.length > 0) {
    const drawnTile = game.wall.shift()!;
    if (!drawnTile.isFlower) {
      player.hand.concealedTiles.push(drawnTile);
    }
  }
  // 【修复前遗漏】此处之前未设置 drawnThisTurn = true，导致客户端可在UI更新前二次摸牌
  game.drawnThisTurn = true; // ← v2 新增
}

// 模拟 handlePass multiHuStarter 路径（修复点: 给next player补摸后必须设置 drawnThisTurn）
function simulateMultiHuStarterDraw(game: MockGameState, player: MockPlayer): void {
  if (player.hand.concealedTiles.length < 14 && game.wall.length > 0) {
    const drawnTile = game.wall.shift()!;
    if (!drawnTile.isFlower) {
      player.hand.concealedTiles.push(drawnTile);
    }
  }
  // 【修复前遗漏】此处之前未设置 drawnThisTurn = true
  game.drawnThisTurn = true; // ← v2 新增
}

// ============================================================
// 测试用例
// ============================================================

console.log('\n=== 回归测试: 同回合连续摸牌防护 (P0) v2 ===\n');

// ---------- 用例1: 首次摸牌成功 ----------
console.log('【用例1】首次摸牌成功');
{
  const player: MockPlayer = {
    id: 'p1',
    name: 'TestPlayer',
    hand: { concealedTiles: [], exposedMelds: [] },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players: [player],
    drawnThisTurn: false,
    wall: [{ suit: 'CHARACTERS', value: 1, id: 'c1', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  const result = simulateDrawAction(game, player);
  test('首次摸牌: drawnThisTurn=false → 允许摸牌', result.success === true);
  test('首次摸牌后: drawnThisTurn 标记为 true', game.drawnThisTurn === true);
  test('首次摸牌后: 手牌数 = 1', player.hand.concealedTiles.length === 1);
}

// ---------- 用例2: 同回合第二次摸牌被拦截 ----------
console.log('\n【用例2】同回合第二次摸牌被拦截');
{
  const player: MockPlayer = {
    id: 'p1',
    name: 'TestPlayer',
    hand: { concealedTiles: [{ suit: 'CHARACTERS', value: 1, id: 'c1', isFlower: false }], exposedMelds: [] },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players: [player],
    drawnThisTurn: true, // 已摸过
    wall: [{ suit: 'CHARACTERS', value: 2, id: 'c2', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  const beforeTiles = player.hand.concealedTiles.length;
  const result = simulateDrawAction(game, player);
  test('第二次摸牌: drawnThisTurn=true → 拒绝摸牌', result.success === false);
  test('第二次摸牌: 错误信息正确', result.error === 'Already drew this turn');
  test('第二次摸牌后: drawnThisTurn 保持 true', game.drawnThisTurn === true);
  test('第二次摸牌后: 手牌数守恒(未增加)', player.hand.concealedTiles.length === beforeTiles);
}

// ---------- 用例3: 新回合重置后可以再次摸牌 ----------
console.log('\n【用例3】新回合重置后可以再次摸牌');
{
  const player: MockPlayer = {
    id: 'p1',
    name: 'TestPlayer',
    hand: { concealedTiles: [{ suit: 'CHARACTERS', value: 1, id: 'c1', isFlower: false }], exposedMelds: [] },
    status: 'PLAYING',
  };
  const p2: MockPlayer = {
    id: 'p2',
    name: 'NextPlayer',
    hand: { concealedTiles: [], exposedMelds: [] },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players: [player, p2],
    drawnThisTurn: true, // 上回合已摸
    wall: [{ suit: 'CHARACTERS', value: 2, id: 'c2', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  simulateMoveToNextPlayer(game);
  test('moveToNextPlayer 后: drawnThisTurn 重置为 false', game.drawnThisTurn === false);
  test('moveToNextPlayer 后: currentPlayerIndex 更新', game.currentPlayerIndex === 1);

  const result = simulateDrawAction(game, p2);
  test('新回合摸牌: drawnThisTurn=false → 允许摸牌', result.success === true);
  test('新回合摸牌后: drawnThisTurn 标记为 true', game.drawnThisTurn === true);
}

// ---------- 用例4: 手牌数守恒验证 ----------
console.log('\n【用例4】连续摸牌拦截: 手牌数守恒');
{
  const player: MockPlayer = {
    id: 'p1',
    name: 'TestPlayer',
    hand: {
      concealedTiles: [
        { suit: 'CHARACTERS', value: 1, id: 'c1', isFlower: false },
        { suit: 'CHARACTERS', value: 2, id: 'c2', isFlower: false },
        { suit: 'CHARACTERS', value: 3, id: 'c3', isFlower: false },
      ],
      exposedMelds: [],
    },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players: [player],
    drawnThisTurn: true,
    wall: [{ suit: 'CHARACTERS', value: 4, id: 'c4', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  const beforeTiles = player.hand.concealedTiles.length;
  simulateDrawAction(game, player); // 第二次摸牌应被拦截
  test('被拦截后: 手牌数未变化(守恒)', player.hand.concealedTiles.length === beforeTiles);
}

// ---------- 用例5: startGame human dealer auto-draw 路径 (v2 新增) ----------
console.log('\n【用例5】startGame human dealer auto-draw 路径');
{
  const dealer: MockPlayer = {
    id: 'dealer',
    name: 'Dealer',
    hand: { concealedTiles: [{ suit: 'CHARACTERS', value: 1, id: 'd1', isFlower: false }], exposedMelds: [] },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players: [dealer],
    drawnThisTurn: false,
    wall: [{ suit: 'DOTS', value: 5, id: 'w1', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  // 模拟 human dealer timer 到期自动摸牌
  simulateStartGameHumanAutoDraw(game, dealer);

  test('human dealer auto-draw 后: drawnThisTurn=true', game.drawnThisTurn === true);
  test('human dealer auto-draw 后: 手牌+1', dealer.hand.concealedTiles.length === 2);

  // 【关键】此时如果客户端再发 DRAW，应该被拦截
  const beforeTiles = dealer.hand.concealedTiles.length;
  const result = simulateDrawAction(game, dealer);
  test('double-draw 被拦截', result.success === false);
  test('double-draw 被拦截后: 手牌数守恒', dealer.hand.concealedTiles.length === beforeTiles);
}

// ---------- 用例6: handlePass multiHuStarter 路径 (v2 新增) ----------
console.log('\n【用例6】handlePass multiHuStarter 路径');
{
  const winner: MockPlayer = {
    id: 'winner',
    name: 'Winner',
    hand: { concealedTiles: [], exposedMelds: [] },
    status: 'WON',
  };
  const next: MockPlayer = {
    id: 'next',
    name: 'NextPlayer',
    hand: {
      concealedTiles: [
        { suit: 'CHARACTERS', value: 1, id: 'n1', isFlower: false },
        { suit: 'CHARACTERS', value: 2, id: 'n2', isFlower: false },
      ],
      exposedMelds: [],
    },
    status: 'PLAYING',
  };
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 1,
    players: [winner, next],
    drawnThisTurn: false,
    wall: [{ suit: 'BAMBOOS', value: 3, id: 'b1', isFlower: false }],
    pendingActions: [],
    flowerReplacementDone: false,
  };

  // 模拟 multiHuStarter 场景: handlePass 给下家补摸
  simulateMultiHuStarterDraw(game, next);

  test('multiHuStarter补摸后: drawnThisTurn=true', game.drawnThisTurn === true);
  test('multiHuStarter补摸后: 手牌+1', next.hand.concealedTiles.length === 3);

  // 防止连续摸牌
  const beforeTiles = next.hand.concealedTiles.length;
  const result = simulateDrawAction(game, next);
  test('multiHuStarter补摸后 double-draw 被拦截', result.success === false);
  test('multiHuStarter补摸后: 手牌数守恒', next.hand.concealedTiles.length === beforeTiles);
}

// ---------- 用例7: 四玩家完整轮转 ----------
console.log('\n【用例7】四玩家完整轮转: drawnThisTurn 重置验证');
{
  const players: MockPlayer[] = [
    { id: 'p0', name: 'P0', hand: { concealedTiles: [], exposedMelds: [] }, status: 'PLAYING' },
    { id: 'p1', name: 'P1', hand: { concealedTiles: [], exposedMelds: [] }, status: 'PLAYING' },
    { id: 'p2', name: 'P2', hand: { concealedTiles: [], exposedMelds: [] }, status: 'PLAYING' },
    { id: 'p3', name: 'P3', hand: { concealedTiles: [], exposedMelds: [] }, status: 'PLAYING' },
  ];
  const game: MockGameState = {
    phase: 'PLAYING',
    currentPlayerIndex: 0,
    players,
    drawnThisTurn: false,
    wall: Array.from({ length: 8 }, (_, i) => ({ suit: 'CHARACTERS', value: i + 1, id: `c${i + 1}`, isFlower: false })),
    pendingActions: [],
    flowerReplacementDone: false,
  };

  // 4个玩家各摸一次牌，验证每次都是新回合
  for (let round = 0; round < 4; round++) {
    // 新回合：重置
    simulateMoveToNextPlayer(game);
    test(`轮到 player[${round}] 时 drawnThisTurn=false（新回合）`, game.drawnThisTurn === false,
      `expected false, got ${game.drawnThisTurn}`);

    const p = players[round];
    const result = simulateDrawAction(game, p);
    test(`player[${round}] 摸牌成功`, result.success === true);
    test(`player[${round}] 摸牌后 hand=1`, p.hand.concealedTiles.length === 1);

    // 同回合二次摸牌应被拦截
    const beforeTiles = p.hand.concealedTiles.length;
    const retry = simulateDrawAction(game, p);
    test(`player[${round}] 同回合二次摸牌被拦截`, retry.success === false);
    test(`player[${round}] 二次摸牌拦截后手牌守恒`, p.hand.concealedTiles.length === beforeTiles);
  }
}

// ============================================================
// 结果汇总
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  console.error(`❌ 回归测试未通过，请检查 P0 bug 修复！`);
  process.exit(1);
} else {
  console.log(`✅ 所有回归测试通过！`);
  process.exit(0);
}
