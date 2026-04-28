import { gameManager } from '../server/utils/gameManager'
import { ActionType, GamePhase, PlayerStatus, TileSuit } from '../server/types/game'

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value, isFlower: false }
}

console.log('\n=== Regression: draw should clear chow-only pending state ===\n')

const player = {
  id: 'p1',
  userId: 'p1',
  name: 'p1',
  position: 0,
  score: 0,
  isDealer: true,
  status: PlayerStatus.PLAYING,
  isReady: true,
  isConnected: true,
  isBot: false,
  hand: {
    concealedTiles: [
      tile('w1', TileSuit.CHARACTERS, 1),
      tile('w2', TileSuit.CHARACTERS, 2),
      tile('w3', TileSuit.CHARACTERS, 3),
      tile('w4', TileSuit.CHARACTERS, 4),
      tile('w5', TileSuit.CHARACTERS, 5),
      tile('w6', TileSuit.CHARACTERS, 6),
      tile('t1', TileSuit.DOTS, 1),
      tile('t2', TileSuit.DOTS, 2),
      tile('t3', TileSuit.DOTS, 3),
      tile('b1', TileSuit.BAMBOOS, 1),
      tile('b2', TileSuit.BAMBOOS, 2),
      tile('b3', TileSuit.BAMBOOS, 3),
      tile('j1', TileSuit.DRAGON, 1),
    ],
    exposedMelds: [],
    discardedTiles: []
  },
  actions: [],
  isTing: false,
  missingSuit: null,
  windScore: 0,
  rainScore: 0,
  wonFan: 0,
  winOrder: null,
  winRound: null,
  winTimestamp: null
} as any

const game = {
  gameId: 'chow-draw-state-regression',
  players: [player],
  spectators: [],
  phase: GamePhase.PLAYING,
  wall: [tile('draw-1', TileSuit.DOTS, 9)],
  discardPile: [tile('discard-1', TileSuit.DOTS, 4)],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  currentRound: 1,
  roundNumber: 1,
  pendingActions: [
    {
      playerId: player.id,
      availableActions: [ActionType.CHOW, ActionType.PASS],
      tile: tile('discard-1', TileSuit.DOTS, 4),
      expiresAt: Date.now() + 5000,
    }
  ],
  actionHistory: [],
  dice: [1, 1],
  roundMultiplier: 1,
  inheritMultiplier: 1,
  settlementMultiplier: 1,
  hesitationWindow: 5000,
  winnersCount: 0,
  drawnThisTurn: false,
  roomOwner: player.id,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  botTakeoverPlayers: [],
  customScoringMode: null
} as any

;(gameManager as any).games.set(game.gameId, game)

await gameManager.executeAction(game.gameId, player.id, ActionType.DRAW)

const liveGame = await gameManager.getGame(game.gameId)
const actions = await gameManager.getAvailableActions(game.gameId, player.id)

test('draw clears chow-only pending action', (liveGame?.pendingActions?.length ?? 0) === 0, `pending=${liveGame?.pendingActions?.length ?? -1}`)
test('player is in discard state after draw', liveGame?.drawnThisTurn === true)
test('available actions no longer keep chow alive', !actions.includes(ActionType.CHOW), `actions=${actions.join(',')}`)
test('available actions allow discard after draw', actions.includes(ActionType.DISCARD), `actions=${actions.join(',')}`)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
