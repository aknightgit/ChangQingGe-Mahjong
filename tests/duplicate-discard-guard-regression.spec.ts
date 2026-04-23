import {
  ActionType,
  GamePhase,
  GameState,
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
    console.log(`  PASS ${name}`);
    passed++;
  } else {
    console.log(`  FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
    failed++;
  }
}

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: false };
}

function player(id: string, concealedTiles: Tile[]): Player {
  return {
    id,
    name: id,
    position: 0,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [],
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

function makeHand(prefix: string, count: number): Tile[] {
  const suits = [TileSuit.CHARACTERS, TileSuit.DOTS, TileSuit.BAMBOOS];
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(tile(suits[i % suits.length], (i % 9) + 1, `${prefix}-${i + 1}`));
  }
  return tiles;
}

function game(players: Player[]): GameState {
  players.forEach((p, index) => {
    p.position = index;
  });
  return {
    gameId: `dup-guard-${Math.random().toString(36).slice(2)}`,
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
    hesitationWindow: 80,
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

async function expectDiscardBlocked(label: string, currentGame: GameState, playerId: string, tileId: string, expectedMessage: string) {
  ;(gameManager as any).games.set(currentGame.gameId, currentGame);
  let caught = '';
  try {
    await gameManager.executeAction(currentGame.gameId, playerId, ActionType.DISCARD, tileId);
  } catch (error: any) {
    caught = error?.message || String(error);
  } finally {
    ;(gameManager as any).games.delete(currentGame.gameId);
  }

  ok(label, caught === expectedMessage, `got "${caught}"`);
}

console.log('\n=== Regression: duplicate discard guard rails ===\n');

{
  const p1Tiles = makeHand('p1', 11);
  const p2Tiles = makeHand('p2', 11);
  const p1 = player('p1', p1Tiles);
  const p2 = player('p2', p2Tiles);
  const currentGame = game([p1, p2]);
  currentGame.currentPlayerIndex = 1;
  await expectDiscardBlocked(
    'non-current player cannot discard even if drawnThisTurn=true',
    currentGame,
    p1.id,
    p1Tiles[0].id,
    'Not your turn to discard'
  );
}

{
  const p1Tiles = makeHand('pending', 11);
  const p1 = player('p1', p1Tiles);
  const p2 = player('p2', makeHand('other', 11));
  const currentGame = game([p1, p2]);
  currentGame.pendingActions.push({
    playerId: p2.id,
    availableActions: [ActionType.PENG, ActionType.PASS],
    tile: tile(TileSuit.CHARACTERS, 9, 'claimed-tile'),
    expiresAt: Date.now() + 1000,
  });
  await expectDiscardBlocked(
    'current player cannot discard while pending claims exist',
    currentGame,
    p1.id,
    p1Tiles[0].id,
    'Pending actions must resolve before discarding'
  );
}

{
  const p1Tiles = makeHand('bad-count', 10);
  const p1 = player('p1', p1Tiles);
  const p2 = player('p2', makeHand('other2', 11));
  const currentGame = game([p1, p2]);
  await expectDiscardBlocked(
    'discard blocked when concealed count is not in 3n+2 state',
    currentGame,
    p1.id,
    p1Tiles[0].id,
    'Invalid hand state for discard'
  );
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Test result: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
