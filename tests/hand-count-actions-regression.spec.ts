import {
  ActionType,
  GameEndReason,
  GamePhase,
  GameState,
  Meld,
  MeldType,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game';
import { gameManager } from '../server/utils/gameManager';

let passed = 0;
let failed = 0;

const BEFORE_DISCARD = new Set([2, 5, 8, 11, 12, 14]);
// 用户消息里的 134 明显是 13 的笔误，这里按 13 校验。
const AFTER_DISCARD = new Set([1, 4, 7, 10, 13]);

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`);
    passed++;
  } else {
    console.log(`  FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
    failed++;
  }
}

function tile(suit: TileSuit, value: number, id: string, isFlower = suit === TileSuit.FLOWER): Tile {
  return { suit, value, id, isFlower };
}

function seq(base: number, prefix: string): Tile[] {
  return [
    tile(TileSuit.CHARACTERS, base, `${prefix}-${base}`),
    tile(TileSuit.CHARACTERS, base + 1, `${prefix}-${base + 1}`),
    tile(TileSuit.CHARACTERS, base + 2, `${prefix}-${base + 2}`),
  ];
}

function triplet(suit: TileSuit, value: number, prefix: string): Tile[] {
  return [
    tile(suit, value, `${prefix}-1`),
    tile(suit, value, `${prefix}-2`),
    tile(suit, value, `${prefix}-3`),
  ];
}

function pair(suit: TileSuit, value: number, prefix: string): Tile[] {
  return [
    tile(suit, value, `${prefix}-1`),
    tile(suit, value, `${prefix}-2`),
  ];
}

function player(id: string, concealedTiles: Tile[], exposedMelds: Meld[] = [], status = PlayerStatus.PLAYING): Player {
  return {
    id,
    name: id,
    position: 0,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [...exposedMelds],
      discardedTiles: [],
    },
    status,
    isDealer: false,
    isTing: false,
    missingSuit: null,
    windScore: 0,
    rainScore: 0,
    wonFan: 0,
    winOrder: null,
    winRound: null,
    winTimestamp: null,
    score: 0,
  };
}

function game(players: Player[], wall: Tile[] = []): GameState {
  players.forEach((p, index) => { p.position = index; });
  return {
    gameId: `g-${Math.random().toString(36).slice(2)}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [...wall],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile: [],
    actionHistory: [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    freezePlayerId: null,
    freezeComplete: false,
    inheritedGlobalMultiplier: 1,
    roundMultiplier: 1,
    inheritMultiplier: 1,
    hesitationWindow: 5000,
    thinkUsage: {},
    chowPongExclusion: {},
    drawnThisTurn: false,
    botTakeoverPlayers: [],
    roundStats: [],
    settlementMultiplier: 1,
    pengChowConflict: null,
    leadingBrotherEvent: null,
    consecutiveDiscards: null,
    spectatorMode: null,
  };
}

function countRelevantConcealed(currentGame: GameState, currentPlayer: Player): number {
  const concealedCount = currentPlayer.hand.concealedTiles.filter(t => {
    if (t.suit !== TileSuit.FLOWER) return true;
    return (gameManager as any).isWildTile(currentGame, t);
  }).length;
  const kongCount = currentPlayer.hand.exposedMelds.filter(meld =>
    meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG
  ).length;
  return concealedCount - kongCount;
}

function assertBeforeDiscard(label: string, currentGame: GameState, currentPlayer: Player) {
  const count = countRelevantConcealed(currentGame, currentPlayer);
  ok(`${label} -> before-discard count`, BEFORE_DISCARD.has(count), `got ${count}`);
}

function assertKongBeforeDiscard(label: string, currentGame: GameState, currentPlayer: Player) {
  const count = countRelevantConcealed(currentGame, currentPlayer);
  ok(`${label} -> kong-before-discard count`, count === 12, `got ${count}`);
}

function assertAfterDiscard(label: string, currentGame: GameState, currentPlayer: Player) {
  const count = countRelevantConcealed(currentGame, currentPlayer);
  ok(`${label} -> after-discard count`, AFTER_DISCARD.has(count), `got ${count}`);
}

function run(label: string, fn: () => Promise<void> | void) {
  console.log(`\n[${label}]`);
  return Promise.resolve(fn());
}

console.log('\n=== 回归测试: 动作后手牌数守恒 ===');

await run('普通花补花后摸牌', () => {
  const normalFlower = tile(TileSuit.FLOWER, 8, 'flower-8', true);
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'd'),
    tile(TileSuit.DOTS, 2, 'd-3'),
  ], [{
    type: MeldType.TRIPLET,
    tiles: [normalFlower],
    isConcealed: false,
  }]);
  const currentGame = game([p1], [
    tile(TileSuit.DOTS, 9, 'wall-r1'),
    tile(TileSuit.BAMBOOS, 9, 'wall-draw'),
  ]);

  (gameManager as any).replaceInitialFlowers(currentGame, p1);
  ok('普通花未进入暗手计数', countRelevantConcealed(currentGame, p1) === 13, `got ${countRelevantConcealed(currentGame, p1)}`);
  (gameManager as any).handleDraw(currentGame, p1);
  assertBeforeDiscard('普通花补花后摸牌', currentGame, p1);
});

await run('花是百搭时计入暗手', () => {
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'd'),
    tile(TileSuit.DOTS, 2, 'd-3'),
    tile(TileSuit.DOTS, 3, 'd-4'),
  ]);
  const currentGame = game([p1], [tile(TileSuit.FLOWER, 1, 'wild-flower', true)]);
  currentGame.customScoringMode = `${TileSuit.FLOWER}-1`;
  currentGame.wildTileGroup = ['1', '2', '3', '4'];

  (gameManager as any).handleDraw(currentGame, p1);
  ok('百搭花进入暗手计数', countRelevantConcealed(currentGame, p1) === 14, `got ${countRelevantConcealed(currentGame, p1)}`);
  assertBeforeDiscard('花百搭摸牌', currentGame, p1);
});

await run('出牌后落在 after-discard 集合', async () => {
  const concealed = [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'd'),
    tile(TileSuit.DOTS, 2, 'x-1'),
    tile(TileSuit.DOTS, 3, 'x-2'),
    tile(TileSuit.BAMBOOS, 9, 'drawn'),
  ];
  const p1 = player('p1', concealed);
  const currentGame = game([p1]);
  currentGame.drawnThisTurn = true;
  await (gameManager as any).handleDiscard(currentGame, p1, 'drawn');
  assertAfterDiscard('出牌', currentGame, p1);
});

await run('吃牌后落在 before-discard 集合', () => {
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    tile(TileSuit.CHARACTERS, 8, 'need-8'),
    tile(TileSuit.CHARACTERS, 9, 'need-9'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
  ]);
  const discarder = player('p2', []);
  const discard = tile(TileSuit.CHARACTERS, 7, 'discard-7');
  discarder.hand.discardedTiles.push(discard);
  const currentGame = game([discarder, p1]);
  currentGame.currentPlayerIndex = 0;
  currentGame.discardPile.push(discard);
  currentGame.pendingActions.push({ playerId: p1.id, availableActions: [ActionType.CHOW], tile: discard, expiresAt: Date.now() + 1000 });

  (gameManager as any).executeChowDirectly(currentGame, p1);
  ok('chow removes claimed tile from discarder discard area', !discarder.hand.discardedTiles.some(t => t.id === discard.id));
  assertBeforeDiscard('吃牌', currentGame, p1);
});

await run('碰牌后落在 before-discard 集合', () => {
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 9, 'pong-1'),
    tile(TileSuit.CHARACTERS, 9, 'pong-2'),
  ]);
  const discarder = player('p2', []);
  const discard = tile(TileSuit.CHARACTERS, 9, 'discard-9');
  discarder.hand.discardedTiles.push(discard);
  const currentGame = game([discarder, p1]);
  currentGame.currentPlayerIndex = 0;
  currentGame.discardPile.push(discard);

  (gameManager as any).executePengDirectly(currentGame, p1);
  assertBeforeDiscard('碰牌', currentGame, p1);
});

await run('明杠补牌后落在 before-discard 集合', () => {
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 9, 'kong-1'),
    tile(TileSuit.CHARACTERS, 9, 'kong-2'),
    tile(TileSuit.CHARACTERS, 9, 'kong-3'),
  ]);
  const discarder = player('p2', []);
  const discard = tile(TileSuit.CHARACTERS, 9, 'discard-9');
  discarder.hand.discardedTiles.push(discard);
  const currentGame = game([discarder, p1], [tile(TileSuit.DOTS, 9, 'supplement')]);
  currentGame.currentPlayerIndex = 0;
  currentGame.discardPile.push(discard);
  currentGame.actionHistory.push({ playerId: discarder.id, type: ActionType.DISCARD, tile: discard, timestamp: Date.now() });
  currentGame.pendingActions.push({ playerId: p1.id, availableActions: [ActionType.KONG], tile: discard, expiresAt: Date.now() + 1000 });

  (gameManager as any).executeKongDirectly(currentGame, p1, discard.id);
  ok('kong removes claimed tile from discarder discard area', !discarder.hand.discardedTiles.some(t => t.id === discard.id));
  ok('ming kong adds supplement tile', p1.hand.concealedTiles.some(t => t.id === 'supplement'), `concealed=${p1.hand.concealedTiles.map(t => t.id).join(',')}`);
  ok('明杠后补牌仍标记为已摸牌', currentGame.drawnThisTurn === true, `drawn=${currentGame.drawnThisTurn}`);
  assertBeforeDiscard('明杠补牌', currentGame, p1);
  ok('明杠副露类型正确', p1.hand.exposedMelds[0]?.type === MeldType.KONG, `got ${String(p1.hand.exposedMelds[0]?.type)}`);
  const bailoutCount = (gameManager as any).mutualBailout.get(currentGame.gameId)?.get(p1.id)?.get(discarder.id) || 0;
  ok('明杠记入来源口数', bailoutCount === 1, `got ${bailoutCount}`);
});

await run('多种吃法时生成候选组合', () => {
  const p1 = player('p1', [
    ...seq(6, 'a'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 1, 'left-1'),
    tile(TileSuit.CHARACTERS, 2, 'left-2'),
    tile(TileSuit.CHARACTERS, 4, 'right-4'),
    tile(TileSuit.CHARACTERS, 5, 'right-5'),
  ]);
  const discarder = player('p2', []);
  const discard = tile(TileSuit.CHARACTERS, 3, 'discard-3');
  const currentGame = game([discarder, p1]);
  currentGame.currentPlayerIndex = 0;

  (gameManager as any).checkPendingActions(currentGame, discard);
  const pending = currentGame.pendingActions.find(pa => pa.playerId === p1.id);
  ok('多种吃法生成 pending', !!pending, 'missing pending');
  ok('多种吃法暴露多个选项', (pending?.chowOptions?.length || 0) >= 2, `got ${pending?.chowOptions?.length || 0}`);
});

await run('吃牌支持指定组合', () => {
  const p1 = player('p1', [
    ...seq(6, 'a'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 1, 'left-1'),
    tile(TileSuit.CHARACTERS, 2, 'left-2'),
    tile(TileSuit.CHARACTERS, 4, 'right-4'),
    tile(TileSuit.CHARACTERS, 5, 'right-5'),
  ]);
  const discarder = player('p2', []);
  const discard = tile(TileSuit.CHARACTERS, 3, 'discard-3');
  discarder.hand.discardedTiles.push(discard);
  const currentGame = game([discarder, p1]);
  currentGame.currentPlayerIndex = 0;
  currentGame.discardPile.push(discard);
  currentGame.actionHistory.push({ playerId: discarder.id, type: ActionType.DISCARD, tile: discard, timestamp: Date.now() });
  (gameManager as any).checkPendingActions(currentGame, discard);
  const pending = currentGame.pendingActions.find((pa: any) => pa.playerId === p1.id);
  const selected = pending?.chowOptions?.find((option: string[]) => option.includes('right-4'));
  ok('吃牌指定组合前存在目标选项', !!selected, `options=${JSON.stringify(pending?.chowOptions || [])}`);
  if (!selected) return;

  (gameManager as any).executeChowDirectly(currentGame, p1, selected);
  ok('selected chow removes claimed tile from discarder discard area', !discarder.hand.discardedTiles.some(t => t.id === discard.id));
  const meld = p1.hand.exposedMelds[0];
  const meldIds = meld?.tiles.map(t => t.id).sort().join('|') || '';
  ok('吃牌使用玩家指定组合', meldIds === ['discard-3', 'right-4', 'right-5'].sort().join('|'), `got ${meldIds}`);
  ok('未选中的吃牌组合保留', p1.hand.concealedTiles.some(t => t.id === 'left-1') && p1.hand.concealedTiles.some(t => t.id === 'left-2'));
});

await run('暗杠补牌后落在 before-discard 集合', () => {
  const kongTiles = [
    tile(TileSuit.CHARACTERS, 9, 'kong-a'),
    tile(TileSuit.CHARACTERS, 9, 'kong-b'),
    tile(TileSuit.CHARACTERS, 9, 'kong-c'),
    tile(TileSuit.CHARACTERS, 9, 'kong-d'),
  ];
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'pair'),
    ...kongTiles,
  ]);
  const currentGame = game([p1], [tile(TileSuit.BAMBOOS, 9, 'supplement')]);

  (gameManager as any).handleConcealedKong(currentGame, p1, kongTiles.map(t => t.id));
  ok('concealed kong adds supplement tile', p1.hand.concealedTiles.some(t => t.id === 'supplement'), `concealed=${p1.hand.concealedTiles.map(t => t.id).join(',')}`);
  assertBeforeDiscard('暗杠补牌', currentGame, p1);
});

await run('杠花补牌后落在 before-discard 集合', () => {
  const kongTiles = [
    tile(TileSuit.CHARACTERS, 9, 'kong-a'),
    tile(TileSuit.CHARACTERS, 9, 'kong-b'),
    tile(TileSuit.CHARACTERS, 9, 'kong-c'),
    tile(TileSuit.CHARACTERS, 9, 'kong-d'),
  ];
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'pair'),
    ...kongTiles,
  ]);
  const currentGame = game([p1], [
    tile(TileSuit.BAMBOOS, 9, 'real-supplement'),
    tile(TileSuit.FLOWER, 8, 'normal-flower', true),
  ]);

  (gameManager as any).handleConcealedKong(currentGame, p1, kongTiles.map(t => t.id));
  assertBeforeDiscard('杠花补牌', currentGame, p1);
  ok('杠花未计入暗手', countRelevantConcealed(currentGame, p1) === 11, `got ${countRelevantConcealed(currentGame, p1)}`);
});

await run('补杠补牌后落在 before-discard 集合', () => {
  const kongBase = tile(TileSuit.CHARACTERS, 9, 'triplet-1');
  const p1 = player('p1', [
    ...seq(1, 'a'),
    ...seq(4, 'b'),
    ...seq(7, 'c'),
    ...pair(TileSuit.DOTS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 9, 'fourth'),
  ], [{
    type: MeldType.TRIPLET,
    tiles: [
      kongBase,
      tile(TileSuit.CHARACTERS, 9, 'triplet-2'),
      tile(TileSuit.CHARACTERS, 9, 'triplet-3'),
    ],
    isConcealed: false,
  }]);
  const currentGame = game([p1], [tile(TileSuit.BAMBOOS, 9, 'supplement')]);

  (gameManager as any).completeExtendedKong(currentGame, p1, tile(TileSuit.CHARACTERS, 9, 'fourth'));
  ok('extended kong adds supplement tile', p1.hand.concealedTiles.some(t => t.id === 'supplement'), `concealed=${p1.hand.concealedTiles.map(t => t.id).join(',')}`);
  assertBeforeDiscard('补杠补牌', currentGame, p1);
});

await run('自摸胡时暗手张数保持合法', async () => {
  const p1 = player('p1', [
    ...triplet(TileSuit.CHARACTERS, 1, 'a'),
    ...triplet(TileSuit.CHARACTERS, 2, 'b'),
    ...triplet(TileSuit.CHARACTERS, 3, 'c'),
    ...triplet(TileSuit.CHARACTERS, 4, 'd'),
    ...pair(TileSuit.DOTS, 1, 'pair'),
  ]);
  p1.isDealer = true;
  const currentGame = game([p1]);
  currentGame.currentPlayerIndex = 0;
  currentGame.drawnThisTurn = true;

  await (gameManager as any).handleHu(currentGame, p1);
  assertBeforeDiscard('自摸胡', currentGame, p1);
  ok('胡牌动作执行成功', currentGame.phase === GamePhase.ENDED || currentGame.endReason === GameEndReason.LAST_PLAYER);
});

await run('吃窗口开启后摸牌与吃牌同时可用', async () => {
  const discarder = player('discarder', [
    ...seq(1, 'd1'),
    ...seq(4, 'd2'),
    ...seq(7, 'd3'),
    ...pair(TileSuit.DOTS, 1, 'd4'),
  ]);
  const claimer = player('claimer', [
    ...seq(6, 'a'),
    ...triplet(TileSuit.DOTS, 3, 'dots3'),
    ...pair(TileSuit.BAMBOOS, 1, 'pair'),
    tile(TileSuit.CHARACTERS, 1, 'left-1'),
    tile(TileSuit.CHARACTERS, 2, 'left-2'),
    tile(TileSuit.CHARACTERS, 4, 'right-4'),
    tile(TileSuit.CHARACTERS, 5, 'right-5'),
  ]);
  const currentGame = game([discarder, claimer, player('f3', []), player('f4', [])], [tile(TileSuit.DOTS, 9, 'wall-draw')]);
  const discard = tile(TileSuit.CHARACTERS, 3, 'discard-3');
  currentGame.currentPlayerIndex = 0;
  currentGame.discardPile.push(discard);
  currentGame.actionHistory.push({ playerId: discarder.id, type: ActionType.DISCARD, tile: discard, timestamp: Date.now() });
  (gameManager as any).games.set(currentGame.gameId, currentGame);

  try {
    (gameManager as any).checkPendingActions(currentGame, discard);
    ok('chow-only pending immediately hands turn to next player', currentGame.currentPlayerIndex === 1, `current=${currentGame.currentPlayerIndex}`);
    const actions = await gameManager.getAvailableActions(currentGame.gameId, claimer.id);
    ok('current player can still chow during hesitation window', actions.includes(ActionType.CHOW), `actions=${actions.join(',')}`);
    ok('current player can still pass during hesitation window', actions.includes(ActionType.PASS), `actions=${actions.join(',')}`);
    ok('current player can draw during chow hesitation window', actions.includes(ActionType.DRAW), `actions=${actions.join(',')}`);

    (gameManager as any).handlePass(currentGame, claimer);
    const afterPass = await gameManager.getAvailableActions(currentGame.gameId, claimer.id);
    ok('timeout/pass on chow does not skip draw', afterPass.includes(ActionType.DRAW), `actions=${afterPass.join(',')}`);
    ok('timeout/pass keeps turn on the chow player', currentGame.currentPlayerIndex === 1, `current=${currentGame.currentPlayerIndex}`);
  } finally {
    (gameManager as any).games.delete(currentGame.gameId);
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
process.exit(0);
