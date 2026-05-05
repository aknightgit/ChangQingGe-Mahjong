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

function createBaseConcealedTiles() {
  return [
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
  ]
}

function createPlayer(id: string) {
  return {
    id,
    userId: id,
    name: id,
    position: 0,
    score: 0,
    isDealer: true,
    status: PlayerStatus.PLAYING,
    isReady: true,
    isConnected: true,
    isBot: false,
    hand: {
      concealedTiles: createBaseConcealedTiles(),
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
}

console.log('\n=== Regression: chow-only pending should still allow draw ===\n')

const player = createPlayer('p1')

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

const actions = await gameManager.getAvailableActions(game.gameId, player.id)

test('available actions still include chow', actions.includes(ActionType.CHOW), `actions=${actions.join(',')}`)
test('available actions expose draw during chow window', actions.includes(ActionType.DRAW), `actions=${actions.join(',')}`)

let threw = false
try {
  await gameManager.executeAction(game.gameId, player.id, ActionType.DRAW)
} catch {
  threw = true
}

const liveGame = await gameManager.getGame(game.gameId)

test('draw is accepted while chow-only pending action exists', !threw)
test('draw clears chow-only pending action', (liveGame?.pendingActions?.length ?? 0) === 0, `pending=${liveGame?.pendingActions?.length ?? -1}`)
test('player is marked as having drawn', liveGame?.drawnThisTurn === true)

;(gameManager as any).games.delete(game.gameId)
;(gameManager as any).clearPendingActionTimer?.(game.gameId)

const timeoutGame = {
  ...game,
  gameId: 'chow-draw-timeout-human-regression',
  wall: [tile('draw-timeout-1', TileSuit.DOTS, 8)],
  discardPile: [tile('discard-timeout-1', TileSuit.DOTS, 5)],
  pendingActions: [
    {
      playerId: player.id,
      availableActions: [ActionType.CHOW, ActionType.PASS],
      tile: tile('discard-timeout-1', TileSuit.DOTS, 5),
      expiresAt: Date.now() - 10,
    }
  ],
  drawnThisTurn: false,
  actionHistory: []
} as any

timeoutGame.players = [
  createPlayer('p1')
]

;(gameManager as any).games.set(timeoutGame.gameId, timeoutGame)
;(gameManager as any).schedulePendingActionTimeout?.(timeoutGame.gameId)
await new Promise(resolve => setTimeout(resolve, 50))

const afterTimeoutGame = await gameManager.getGame(timeoutGame.gameId)
const timeoutActions = await gameManager.getAvailableActions(timeoutGame.gameId, player.id)

test('human chow timeout clears pending instead of auto-drawing', (afterTimeoutGame?.pendingActions?.length ?? 0) === 0, `pending=${afterTimeoutGame?.pendingActions?.length ?? -1}`)
test('human chow timeout keeps drawnThisTurn false', afterTimeoutGame?.drawnThisTurn === false, `drawn=${String(afterTimeoutGame?.drawnThisTurn)}`)
test('human chow timeout exposes draw action for manual click', timeoutActions.includes(ActionType.DRAW), `actions=${timeoutActions.join(',')}`)

;(gameManager as any).games.delete(timeoutGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(timeoutGame.gameId)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
