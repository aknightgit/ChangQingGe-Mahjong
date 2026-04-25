import { GamePhase, PlayerStatus, TileSuit, type GameState, type Player, type Tile } from '../server/types/game';
import { canRevealSpectatorTarget, getSpectatorView, isSpectatorTargetWatchable } from '../server/utils/spectatorView';

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

function tile(id: string): Tile {
  return { id, suit: TileSuit.CHARACTERS, value: 1 };
}

function makePlayer(id: string, name = id, status = PlayerStatus.PLAYING): Player {
  return {
    id,
    name,
    position: 0,
    hand: {
      concealedTiles: [tile(`${id}-1`), tile(`${id}-2`)],
      exposedMelds: [],
      discardedTiles: []
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
    score: 0
  };
}

function makeGame(players: Player[]): GameState {
  players.forEach((player, index) => {
    player.position = index;
  });

  return {
    gameId: `spectator-${Date.now()}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [],
    currentPlayerIndex: 1,
    dealerIndex: 0,
    discardPile: [],
    actionHistory: [],
    winnersCount: 1,
    roundNumber: 7,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    spectatorMode: null,
    spectatorViews: {},
    spectatorApprovalRequests: []
  };
}

console.log('\n=== Regression: spectator view permissions ===\n');

const viewer = makePlayer('viewer', 'Viewer', PlayerStatus.WON);
const aiTarget = makePlayer('ai', 'AI-AK');
const humanTarget = makePlayer('human', 'Human');
const otherHuman = makePlayer('other-human', 'OtherHuman');
const game = makeGame([viewer, aiTarget, humanTarget, otherHuman]);

ok('playing target can be watched', isSpectatorTargetWatchable(humanTarget));
ok('lost target cannot be newly watched', !isSpectatorTargetWatchable(makePlayer('lost', 'Lost', PlayerStatus.LOST)));
ok('nothing reveals before spectator view is selected', !canRevealSpectatorTarget(game, viewer.id, aiTarget));

const view = getSpectatorView(game, viewer.id);
view.viewingPlayerId = aiTarget.id;
view.updatedAt = Date.now();

ok('AI target reveals immediately once selected', canRevealSpectatorTarget(game, viewer.id, aiTarget));
ok('unselected human target stays hidden while watching AI', !canRevealSpectatorTarget(game, viewer.id, humanTarget));

view.viewingPlayerId = humanTarget.id;
view.pendingHumanPlayerId = humanTarget.id;
view.approvedHumanPlayerId = null;
view.updatedAt = Date.now();

ok('pending human request does not reveal hand', !canRevealSpectatorTarget(game, viewer.id, humanTarget));

view.approvedHumanPlayerId = humanTarget.id;
view.pendingHumanPlayerId = null;
view.updatedAt = Date.now();

ok('approved human target reveals hand', canRevealSpectatorTarget(game, viewer.id, humanTarget));

view.viewingPlayerId = otherHuman.id;
view.updatedAt = Date.now();

ok('second human target stays hidden without approval', !canRevealSpectatorTarget(game, viewer.id, otherHuman));

game.roundNumber += 1;
const nextRoundView = getSpectatorView(game, viewer.id);

ok('new round resets approved human spectator view', nextRoundView.approvedHumanPlayerId === null && nextRoundView.viewingPlayerId === null);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
