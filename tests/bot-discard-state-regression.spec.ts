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

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
