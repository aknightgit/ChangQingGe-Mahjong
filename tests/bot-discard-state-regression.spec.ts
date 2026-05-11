import {
  ActionType,
  GamePhase,
  GameState,
  MeldType,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game';
import { gameManager } from '../server/utils/gameManager';
import { selectBotChowTileIds } from '../server/services/botService';

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`);
    passed++;
  } else {
    console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
    failed++;
  }
}

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: false };
}

function makeTiles(prefix: string, count: number): Tile[] {
  const suits = [TileSuit.CHARACTERS, TileSuit.DOTS, TileSuit.BAMBOOS];
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(tile(suits[i % suits.length], (i % 9) + 1, `${prefix}-${i + 1}`));
  }
  return tiles;
}

function makePlayer(id: string, concealedCount: number, meldTriplets = 0): Player {
  const exposedMelds = Array.from({ length: meldTriplets }, (_, i) => ({
    type: MeldType.TRIPLET,
    tiles: [
      tile(TileSuit.CHARACTERS, i + 1, `${id}-meld-${i}-1`),
      tile(TileSuit.CHARACTERS, i + 1, `${id}-meld-${i}-2`),
      tile(TileSuit.CHARACTERS, i + 1, `${id}-meld-${i}-3`),
    ],
  }));

  return {
    id,
    name: id,
    position: 0,
    hand: {
      concealedTiles: makeTiles(id, concealedCount),
      exposedMelds,
      discardedTiles: [],
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
    score: 0,
  };
}

function makeGame(players: Player[]): GameState {
  players.forEach((p, index) => {
    p.position = index;
  });
  return {
    gameId: `bot-discard-${Math.random().toString(36).slice(2)}`,
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
    freezePlayerId: null,
    freezeComplete: false,
    inheritedGlobalMultiplier: 1,
    roundMultiplier: 1,
    inheritMultiplier: 1,
    hesitationWindow: 10,
    thinkUsage: {},
    chowPongExclusion: {},
    drawnThisTurn: true,
    botTakeoverPlayers: [],
    roundStats: [],
    settlementMultiplier: 1,
    pengChowConflict: null,
    leadingBrotherEvent: null,
    consecutiveDiscards: null,
    spectatorMode: null,
  } as GameState;
}

console.log('\n=== Regression: bot discard state guard ===\n');

const anyManager = gameManager as any;
const discardState = anyManager.isConcealedDiscardState.bind(gameManager);

ok('14 concealed tiles is a valid discard state', discardState(makePlayer('p14', 14)) === true);
ok('11 concealed tiles after one meld is a valid discard state', discardState(makePlayer('p11', 11, 1)) === true);
ok('13 concealed tiles is not a valid discard state', discardState(makePlayer('p13', 13)) === false);
ok('10 concealed tiles is not a valid discard state', discardState(makePlayer('p10', 10, 1)) === false);

const p1 = makePlayer('bot', 13);
const p2 = makePlayer('other', 11, 1);
const game = makeGame([p1, p2]);
anyManager.games.set(game.gameId, game);

try {
  let caught = '';
  try {
    await gameManager.executeAction(game.gameId, p1.id, ActionType.DISCARD, p1.hand.concealedTiles[0].id);
  } catch (error: any) {
    caught = error?.message || String(error);
  }
  ok('service still blocks bot discard when concealed count is 13', caught === 'Invalid hand state for discard', `got ${caught}`);
} finally {
  anyManager.games.delete(game.gameId);
}

const discarder = makePlayer('discarder', 13);
const claimer = makePlayer('claimer', 13);
const spectator = makePlayer('spectator', 13);
const filler = makePlayer('filler', 13);
const pengGame = makeGame([discarder, claimer, spectator, filler]);
const pengTile = tile(TileSuit.DOTS, 5, 'discard-dot-5');

discarder.hand.discardedTiles = [pengTile];
claimer.hand.concealedTiles = [
  pengTile,
  tile(TileSuit.DOTS, 5, 'claim-dot-5-b'),
  ...makeTiles('claimer-fill', 11),
].slice(0, 13);
pengGame.discardPile = [pengTile];
pengGame.actionHistory = [{ playerId: discarder.id, type: ActionType.DISCARD, tile: pengTile, timestamp: Date.now() }];

anyManager.executePengDirectly(pengGame, claimer);

ok(
  'executePengDirectly hands turn to claimer',
  pengGame.currentPlayerIndex === 1,
  `current=${pengGame.currentPlayerIndex}`
);
ok(
  'executePengDirectly leaves claimer in discard state',
  discardState(claimer) === true && pengGame.drawnThisTurn === true,
  `concealed=${claimer.hand.concealedTiles.length}, drawn=${pengGame.drawnThisTurn}`
);

const flowerPengGame = makeGame([makePlayer('flower-discarder', 13), makePlayer('flower-claimer', 13), makePlayer('flower-watch', 13), makePlayer('flower-fill', 13)]);
const flowerPengTile = tile(TileSuit.DOTS, 3, 'flower-peng-discard');
const flowerClaimer = flowerPengGame.players[1];
flowerClaimer.hand.concealedTiles = [
  flowerPengTile,
  tile(TileSuit.DOTS, 3, 'flower-peng-match'),
  ...makeTiles('flower-claimer-fill', 11),
].slice(0, 13);
flowerClaimer.hand.exposedMelds.push({
  type: MeldType.TRIPLET,
  tiles: [{ suit: TileSuit.FLOWER, value: 8, id: 'flower-door-8', isFlower: true }],
  isConcealed: false,
  replacementDone: false as any,
} as any);
flowerPengGame.wall = [tile(TileSuit.BAMBOOS, 9, 'flower-replacement-1')];
flowerPengGame.discardPile = [flowerPengTile];
flowerPengGame.actionHistory = [{ playerId: flowerPengGame.players[0].id, type: ActionType.DISCARD, tile: flowerPengTile, timestamp: Date.now() }];

anyManager.executePengDirectly(flowerPengGame, flowerClaimer);

ok(
  'executePengDirectly replaces doorway flowers when claim turn starts',
  flowerClaimer.hand.exposedMelds.some((meld: any) => meld.tiles?.[0]?.id === 'flower-door-8' && meld.replacementDone === true)
    && flowerClaimer.hand.concealedTiles.some(tile => tile.id === 'flower-replacement-1'),
  `melds=${JSON.stringify(flowerClaimer.hand.exposedMelds)}, concealed=${flowerClaimer.hand.concealedTiles.map(tile => tile.id).join(',')}`
);

const chowDiscarder = makePlayer('chow-discarder', 13);
const chowBot = makePlayer('AI-chow-bot', 13);
const chowGame = makeGame([chowDiscarder, chowBot, makePlayer('chow-filler-a', 13), makePlayer('chow-filler-b', 13)]);
chowGame.hesitationWindow = 1000;
const chowTile = tile(TileSuit.CHARACTERS, 3, 'chow-discard-3');
chowGame.discardPile = [chowTile];
chowGame.pendingActions = [{
  playerId: chowBot.id,
  availableActions: [ActionType.CHOW, ActionType.PASS],
  tile: chowTile,
  chowOptions: [['AI-chow-bot-1', 'AI-chow-bot-2', chowTile.id]],
  expiresAt: Date.now() + 60000,
}];
anyManager.games.set(chowGame.gameId, chowGame);
const originalPersistGame = anyManager.persistGame;
const originalBroadcastGameState = anyManager.broadcastGameState;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  await anyManager.handleBotPendingActions(chowGame.gameId);
  const pending = chowGame.pendingActions.find((pa: any) => pa.playerId === chowBot.id);
  ok('bot chow pending is preserved for timeout resolution', !!pending, `pending=${JSON.stringify(chowGame.pendingActions)}`);
  ok('bot chow pending uses bot hesitation window', !!pending?.expiresAt && pending.expiresAt - Date.now() <= 1500, `expiresAt=${pending?.expiresAt}`);
} finally {
  anyManager.persistGame = originalPersistGame;
  anyManager.broadcastGameState = originalBroadcastGameState;
  anyManager.clearPendingActionTimer(chowGame.gameId);
  anyManager.games.delete(chowGame.gameId);
}

const stuckBot = makePlayer('AI-stuck-bot', 14);
const stuckOtherA = makePlayer('stuck-a', 13);
const stuckOtherB = makePlayer('stuck-b', 13);
const stuckOtherC = makePlayer('stuck-c', 13);
const stuckGame = makeGame([stuckBot, stuckOtherA, stuckOtherB, stuckOtherC]);
stuckGame.currentPlayerIndex = 0;
stuckGame.drawnThisTurn = true;
(stuckGame as any).allClaimMode = true;
stuckGame.pendingActions = [{
  playerId: stuckBot.id,
  availableActions: [ActionType.CHOW, ActionType.PASS],
  tile: tile(TileSuit.CHARACTERS, 6, 'stuck-discard-6'),
  expiresAt: Date.now() - 10,
}];
anyManager.games.set(stuckGame.gameId, stuckGame);
const originalPersistGame3 = anyManager.persistGame;
const originalBroadcastGameState3 = anyManager.broadcastGameState;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  anyManager.scheduleBotDiscard(stuckGame.gameId, stuckBot.id);
  await new Promise(resolve => setTimeout(resolve, 80));
  ok(
    'bot discard clears expired local chow-only pending instead of freezing',
    stuckGame.pendingActions.length === 0,
    `pending=${JSON.stringify(stuckGame.pendingActions)}`
  );
  ok(
    'bot discard consumes one tile after clearing local chow-only pending',
    stuckBot.hand.concealedTiles.length === 13,
    `concealed=${stuckBot.hand.concealedTiles.length}`
  );
} finally {
  anyManager.persistGame = originalPersistGame3;
  anyManager.broadcastGameState = originalBroadcastGameState3;
  anyManager.clearPendingActionTimer(stuckGame.gameId);
  const botTimer = anyManager.botTimers?.get?.(stuckGame.gameId);
  if (botTimer) {
    clearTimeout(botTimer);
    anyManager.botTimers.delete(stuckGame.gameId);
  }
  anyManager.games.delete(stuckGame.gameId);
}

const freezeBot = makePlayer('AI-freeze-bot', 13);
const freezeOtherA = makePlayer('freeze-a', 13);
const freezeOtherB = makePlayer('freeze-b', 13);
const freezeOtherC = makePlayer('freeze-c', 13);
const freezeGame = makeGame([freezeOtherA, freezeBot, freezeOtherB, freezeOtherC]);
freezeGame.currentPlayerIndex = 1;
freezeGame.drawnThisTurn = false;
freezeGame.hesitationWindow = 0;
freezeGame.wall = [tile(TileSuit.BAMBOOS, 9, 'freeze-draw-1')];
freezeGame.pendingActions = [{
  playerId: freezeBot.id,
  availableActions: [ActionType.CHOW, ActionType.PASS],
  tile: tile(TileSuit.CHARACTERS, 6, 'freeze-discard-6'),
  expiresAt: Date.now() + 60000,
}];
anyManager.games.set(freezeGame.gameId, freezeGame);
const originalPersistGame5 = anyManager.persistGame;
const originalBroadcastGameState5 = anyManager.broadcastGameState;
const originalGetBotDiscardDelayMs5 = anyManager.getBotDiscardDelayMs;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  anyManager.getBotDiscardDelayMs = () => 0;
  anyManager.scheduleBotDiscard(freezeGame.gameId, freezeBot.id);
  await new Promise(resolve => setTimeout(resolve, 80));
  ok(
    'bot discard clears unexpired local chow-only pending before drawing',
    freezeGame.pendingActions.length === 0,
    `pending=${JSON.stringify(freezeGame.pendingActions)}`
  );
  ok(
    'bot discard draws and discards instead of freezing behind local chow-only pending',
    freezeBot.hand.concealedTiles.length === 13 && freezeGame.currentPlayerIndex !== 1,
    `concealed=${freezeBot.hand.concealedTiles.length}, current=${freezeGame.currentPlayerIndex}, drawn=${freezeGame.drawnThisTurn}`
  );
} finally {
  anyManager.persistGame = originalPersistGame5;
  anyManager.broadcastGameState = originalBroadcastGameState5;
  anyManager.getBotDiscardDelayMs = originalGetBotDiscardDelayMs5;
  anyManager.clearPendingActionTimer(freezeGame.gameId);
  const botTimer = anyManager.botTimers?.get?.(freezeGame.gameId);
  if (botTimer) {
    clearTimeout(botTimer);
    anyManager.botTimers.delete(freezeGame.gameId);
  }
  anyManager.games.delete(freezeGame.gameId);
}

const freezeTimerBot = makePlayer('AI-freeze-timer-bot', 13);
const freezeTimerGame = makeGame([makePlayer('freeze-timer-a', 13), freezeTimerBot, makePlayer('freeze-timer-c', 13)]);
freezeTimerGame.currentPlayerIndex = 1;
freezeTimerGame.drawnThisTurn = false;
freezeTimerGame.hesitationWindow = 0;
freezeTimerGame.wall = [tile(TileSuit.DOTS, 5, 'freeze-timer-draw-1')];
freezeTimerGame.pendingActions = [{
  playerId: freezeTimerBot.id,
  availableActions: [ActionType.CHOW, ActionType.PASS],
  tile: tile(TileSuit.CHARACTERS, 7, 'freeze-timer-discard-7'),
  expiresAt: Date.now() - 10,
}];
anyManager.games.set(freezeTimerGame.gameId, freezeTimerGame);
const originalPersistGame6 = anyManager.persistGame;
const originalBroadcastGameState6 = anyManager.broadcastGameState;
const originalGetBotDiscardDelayMs6 = anyManager.getBotDiscardDelayMs;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  anyManager.getBotDiscardDelayMs = () => 0;
  await anyManager.beginCurrentPlayerTurn(freezeTimerGame);
  await new Promise(resolve => setTimeout(resolve, 80));
  ok(
    'bot freeze timeout clears expired local chow-only pending',
    freezeTimerGame.pendingActions.length === 0,
    `pending=${JSON.stringify(freezeTimerGame.pendingActions)}`
  );
  ok(
    'bot freeze timeout advances past draw state instead of deadlocking on stale chow pending',
    freezeTimerBot.hand.concealedTiles.length === 13 && freezeTimerGame.currentPlayerIndex !== 1,
    `concealed=${freezeTimerBot.hand.concealedTiles.length}, current=${freezeTimerGame.currentPlayerIndex}, drawn=${freezeTimerGame.drawnThisTurn}`
  );
} finally {
  anyManager.persistGame = originalPersistGame6;
  anyManager.broadcastGameState = originalBroadcastGameState6;
  anyManager.getBotDiscardDelayMs = originalGetBotDiscardDelayMs6;
  anyManager.clearPendingActionTimer(freezeTimerGame.gameId);
  const freezeTimer = anyManager.freezeTimers?.get?.(freezeTimerGame.gameId);
  if (freezeTimer) {
    clearTimeout(freezeTimer);
    anyManager.freezeTimers.delete(freezeTimerGame.gameId);
  }
  const botTimer = anyManager.botTimers?.get?.(freezeTimerGame.gameId);
  if (botTimer) {
    clearTimeout(botTimer);
    anyManager.botTimers.delete(freezeTimerGame.gameId);
  }
  anyManager.games.delete(freezeTimerGame.gameId);
}

const stalePassBot = makePlayer('AI-stale-pass-bot', 13);
stalePassBot.name = 'AI-阿水';
const skippedPlayer = makePlayer('skip-target', 13);
skippedPlayer.name = 'AI-老赵';
const stalePassGame = makeGame([makePlayer('discarder-stale', 13), skippedPlayer, stalePassBot, makePlayer('filler-stale', 13)]);
stalePassGame.currentPlayerIndex = 1;
stalePassGame.drawnThisTurn = false;
stalePassGame.wall = [tile(TileSuit.DOTS, 9, 'stale-draw-1')];
stalePassGame.pendingActions = [{
  playerId: stalePassBot.id,
  availableActions: [ActionType.PENG, ActionType.KONG, ActionType.PASS],
  tile: tile(TileSuit.DOTS, 6, 'stale-discard-6'),
  expiresAt: Date.now() + 60000,
}];
anyManager.games.set(stalePassGame.gameId, stalePassGame);
const originalPersistGame4 = anyManager.persistGame;
const originalBroadcastGameState4 = anyManager.broadcastGameState;
const originalScheduleBotDiscard4 = anyManager.scheduleBotDiscard;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  anyManager.scheduleBotDiscard = () => {};
  await anyManager.handleBotPendingActions(stalePassGame.gameId);
  ok(
    'stale bot priority pass does not skip the newly advanced player turn',
    stalePassGame.currentPlayerIndex === 1,
    `current=${stalePassGame.currentPlayerIndex}`
  );
  ok(
    'newly advanced player still retains draw opportunity after stale bot priority pass',
    anyManager.canPlayerDrawOnCurrentTurn(stalePassGame, skippedPlayer) === true,
    `drawn=${stalePassGame.drawnThisTurn}, wall=${stalePassGame.wall.length}, concealed=${skippedPlayer.hand.concealedTiles.length}`
  );
} finally {
  anyManager.persistGame = originalPersistGame4;
  anyManager.broadcastGameState = originalBroadcastGameState4;
  anyManager.scheduleBotDiscard = originalScheduleBotDiscard4;
  anyManager.clearPendingActionTimer(stalePassGame.gameId);
  anyManager.games.delete(stalePassGame.gameId);
}

const aiAk = makePlayer('ai-ak', 13);
aiAk.name = 'AI-AK';
aiAk.hand.concealedTiles = [
  tile(TileSuit.DOTS, 1, 'd1'),
  tile(TileSuit.DOTS, 2, 'd2'),
  tile(TileSuit.DOTS, 3, 'd3'),
  tile(TileSuit.DOTS, 5, 'd5'),
  tile(TileSuit.DOTS, 6, 'd6'),
  tile(TileSuit.DOTS, 7, 'd7'),
  tile(TileSuit.BAMBOOS, 2, 't2'),
  tile(TileSuit.BAMBOOS, 3, 't3'),
  tile(TileSuit.BAMBOOS, 4, 't4'),
  tile(TileSuit.CHARACTERS, 2, 'w2'),
  tile(TileSuit.CHARACTERS, 3, 'w3'),
  tile(TileSuit.CHARACTERS, 4, 'w4'),
  tile(TileSuit.WIND, 1, 'east'),
];
const selectedChow = selectBotChowTileIds(
  aiAk,
  makeGame([aiAk, makePlayer('p2', 13), makePlayer('p3', 13), makePlayer('p4', 13)]),
  tile(TileSuit.DOTS, 4, 'live-dot-4'),
  [['d2', 'd3'], ['d3', 'd5'], ['d5', 'd6']]
);
ok(
  'AI-AK chow option selection returns a concrete option',
  !!selectedChow && selectedChow.length === 2,
  `selected=${JSON.stringify(selectedChow)}`
);

{
  const winner = makePlayer('winner', 14);
  const upper = makePlayer('upper', 13);
  const lower = makePlayer('lower', 13);
  const other = makePlayer('other', 13);
  winner.name = 'winner';
  upper.name = 'upper';
  lower.name = 'lower';
  other.name = 'other';
  winner.hand.concealedTiles = [
    tile(TileSuit.DOTS, 1, 'w-d1a'),
    tile(TileSuit.DOTS, 1, 'w-d1b'),
    tile(TileSuit.DOTS, 1, 'w-d1c'),
    tile(TileSuit.DOTS, 2, 'w-d2'),
    tile(TileSuit.DOTS, 3, 'w-d3'),
    tile(TileSuit.DOTS, 4, 'w-d4'),
    tile(TileSuit.BAMBOOS, 2, 'w-b2'),
    tile(TileSuit.BAMBOOS, 3, 'w-b3'),
    tile(TileSuit.BAMBOOS, 4, 'w-b4'),
    tile(TileSuit.CHARACTERS, 5, 'w-c5'),
    tile(TileSuit.CHARACTERS, 6, 'w-c6'),
    tile(TileSuit.CHARACTERS, 7, 'w-c7'),
    tile(TileSuit.DRAGON, 1, 'w-r1a'),
    tile(TileSuit.DRAGON, 1, 'w-r1b'),
  ];
  const huGame = makeGame([winner, upper, lower, other]);
  huGame.currentPlayerIndex = 0;
  huGame.drawnThisTurn = true;
  anyManager.games.set(huGame.gameId, huGame);

  const originalPersistGame2 = anyManager.persistGame;
  const originalBroadcastGameState2 = anyManager.broadcastGameState;
  const originalGetCachedWinCheck = anyManager.getCachedWinCheck;
try {
  anyManager.persistGame = async () => {};
  anyManager.broadcastGameState = () => {};
  anyManager.getCachedWinCheck = () => ({ canWin: true, types: ['all_triplets'] });
  await anyManager.executeAction(huGame.gameId, winner.id, ActionType.HU);
  ok('self-draw hu advances turn away from winner when round continues', huGame.currentPlayerIndex !== 0, `current=${huGame.currentPlayerIndex}`);
  } finally {
    anyManager.persistGame = originalPersistGame2;
    anyManager.broadcastGameState = originalBroadcastGameState2;
    anyManager.getCachedWinCheck = originalGetCachedWinCheck;
    anyManager.clearPendingActionTimer(huGame.gameId);
    anyManager.games.delete(huGame.gameId);
  }
}

{
  const huBot = makePlayer('AI-hu-bot', 14);
  const p2 = makePlayer('hu-bot-p2', 13);
  const p3 = makePlayer('hu-bot-p3', 13);
  const p4 = makePlayer('hu-bot-p4', 13);
  const huBotGame = makeGame([huBot, p2, p3, p4]);
  huBotGame.currentPlayerIndex = 0;
  huBotGame.drawnThisTurn = true;
  huBotGame.hesitationWindow = 0;
  (huBotGame as any).allClaimMode = true;
  anyManager.games.set(huBotGame.gameId, huBotGame);

  const originalGetAvailableActions5 = anyManager.getAvailableActions;
  const originalExecuteAction5 = anyManager.executeAction;
  const actionsSeen: ActionType[] = [];
  try {
    anyManager.getAvailableActions = async () => [ActionType.HU, ActionType.DISCARD];
    anyManager.executeAction = async (_gameId: string, _playerId: string, action: ActionType) => {
      actionsSeen.push(action);
    };
    anyManager.scheduleBotDiscard(huBotGame.gameId, huBot.id);
    await new Promise(resolve => setTimeout(resolve, 60));
    ok(
      'bot discard scheduler prefers self-draw hu over discard when hu is available',
      actionsSeen.length === 1 && actionsSeen[0] === ActionType.HU,
      `actions=${actionsSeen.join(',')}`
    );
  } finally {
    anyManager.getAvailableActions = originalGetAvailableActions5;
    anyManager.executeAction = originalExecuteAction5;
    const botTimer = anyManager.botTimers?.get?.(huBotGame.gameId);
    if (botTimer) {
      clearTimeout(botTimer);
      anyManager.botTimers.delete(huBotGame.gameId);
    }
    anyManager.games.delete(huBotGame.gameId);
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
