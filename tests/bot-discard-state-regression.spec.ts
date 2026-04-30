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

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
