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

function player(id: string, position: number, concealedTiles: any[], exposedMelds: any[] = []) {
  return {
    id,
    name: id,
    position,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [...exposedMelds],
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
    gameId: `claim-gate-${Date.now()}-${Math.random()}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile: [discardTile],
    actionHistory: [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    drawnThisTurn: false,
    customScoringMode: null,
    wildTileGroup: undefined,
  } as any;
}

console.log('\n=== 回归测试: 门口无花不能捉冲 ===\n');

// 用例1：清碰/碰碰胡门口无花、无风箭刻、无杠，不允许捉冲
{
  const discard = tile('d5c', TileSuit.CHARACTERS, 5);
  const discarder = player('discarder', 0, []);
  const claimant = player('claimant', 1, [
    tile('c1a', TileSuit.CHARACTERS, 1), tile('c1b', TileSuit.CHARACTERS, 1), tile('c1c', TileSuit.CHARACTERS, 1),
    tile('c2a', TileSuit.CHARACTERS, 2), tile('c2b', TileSuit.CHARACTERS, 2), tile('c2c', TileSuit.CHARACTERS, 2),
    tile('c3a', TileSuit.CHARACTERS, 3), tile('c3b', TileSuit.CHARACTERS, 3), tile('c3c', TileSuit.CHARACTERS, 3),
    tile('c4a', TileSuit.CHARACTERS, 4), tile('c4b', TileSuit.CHARACTERS, 4),
    tile('c5a', TileSuit.CHARACTERS, 5), tile('c5b', TileSuit.CHARACTERS, 5),
  ]);
  const idleA = player('idleA', 2, []);
  const idleB = player('idleB', 3, []);
  const game = baseGame([discarder, claimant, idleA, idleB], discard);

  (gameManager as any).checkPendingActions(game, discard);
  const pending = game.pendingActions.find((pa: any) => pa.playerId === claimant.id);

  test('门口无有效番数时，不给 HU', !pending || !pending.availableActions.includes(ActionType.HU), JSON.stringify(pending?.availableActions || []));
}

// 用例2：大吊例外，门口无花也允许捉冲
{
  const discard = tile('d9b', TileSuit.DOTS, 9);
  const discarder = player('discarder2', 0, []);
  const claimant = player('claimant2', 1, [
    tile('d9a', TileSuit.DOTS, 9),
  ], [
    { type: MeldType.TRIPLET, isConcealed: false, tiles: [tile('m1a', TileSuit.CHARACTERS, 1), tile('m1b', TileSuit.CHARACTERS, 1), tile('m1c', TileSuit.CHARACTERS, 1)], sourcePosition: 0 },
    { type: MeldType.TRIPLET, isConcealed: false, tiles: [tile('m2a', TileSuit.CHARACTERS, 2), tile('m2b', TileSuit.CHARACTERS, 2), tile('m2c', TileSuit.CHARACTERS, 2)], sourcePosition: 0 },
    { type: MeldType.TRIPLET, isConcealed: false, tiles: [tile('m3a', TileSuit.CHARACTERS, 3), tile('m3b', TileSuit.CHARACTERS, 3), tile('m3c', TileSuit.CHARACTERS, 3)], sourcePosition: 0 },
    { type: MeldType.TRIPLET, isConcealed: false, tiles: [tile('m4a', TileSuit.CHARACTERS, 4), tile('m4b', TileSuit.CHARACTERS, 4), tile('m4c', TileSuit.CHARACTERS, 4)], sourcePosition: 0 },
  ]);
  const idleA = player('idleC', 2, []);
  const idleB = player('idleD', 3, []);
  const game = baseGame([discarder, claimant, idleA, idleB], discard);

  (gameManager as any).checkPendingActions(game, discard);
  const pending = game.pendingActions.find((pa: any) => pa.playerId === claimant.id);

  test('大吊例外仍允许 HU', !!pending && pending.availableActions.includes(ActionType.HU), JSON.stringify(pending?.availableActions || []));
}

console.log(`\n结果: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
