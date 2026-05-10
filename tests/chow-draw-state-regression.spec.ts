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

const claimTimeoutMs = (gameManager as any).getHumanClaimDecisionTimeoutMs(game, player, [ActionType.CHOW, ActionType.PASS])
test('human chow-only claim window uses hesitationWindow instead of 60s fallback', claimTimeoutMs === 5000, `timeout=${claimTimeoutMs}`)

const pendingExpiresAt = (gameManager as any).getPendingActionExpiresAt(game, [ActionType.CHOW, ActionType.PASS])
const pendingWindowMs = pendingExpiresAt - Date.now()
test('pending chow-only expiry also tracks hesitationWindow', pendingWindowMs <= 5000 && pendingWindowMs > 4500, `pendingWindowMs=${pendingWindowMs}`)

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

let timeoutDrawThrew = false
try {
  await gameManager.executeAction(timeoutGame.gameId, player.id, ActionType.DRAW)
} catch (error) {
  timeoutDrawThrew = true
}

const afterTimeoutDrawGame = await gameManager.getGame(timeoutGame.gameId)

test('human chow timeout still accepts manual draw click', !timeoutDrawThrew)
test('manual draw after chow timeout marks drawnThisTurn true', afterTimeoutDrawGame?.drawnThisTurn === true, `drawn=${String(afterTimeoutDrawGame?.drawnThisTurn)}`)
test('manual draw after chow timeout consumes wall tile', (afterTimeoutDrawGame?.wall?.length ?? -1) === 0, `wall=${afterTimeoutDrawGame?.wall?.length ?? -1}`)

;(gameManager as any).games.delete(timeoutGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(timeoutGame.gameId)

const pengPendingGame = {
  ...game,
  gameId: 'peng-draw-state-regression',
  wall: [tile('draw-peng-1', TileSuit.DOTS, 6)],
  discardPile: [tile('discard-peng-1', TileSuit.DOTS, 6)],
  pendingActions: [
    {
      playerId: player.id,
      availableActions: [ActionType.PENG, ActionType.PASS],
      tile: tile('discard-peng-1', TileSuit.DOTS, 6),
      expiresAt: Date.now() + 2000,
    }
  ],
  drawnThisTurn: false,
  actionHistory: []
} as any

pengPendingGame.players = [
  createPlayer('p1')
]

;(gameManager as any).games.set(pengPendingGame.gameId, pengPendingGame)

const pengPendingActions = await gameManager.getAvailableActions(pengPendingGame.gameId, player.id)
test('peng window also exposes draw immediately for countdown UI', pengPendingActions.includes(ActionType.DRAW), `actions=${pengPendingActions.join(',')}`)

let earlyPengDrawThrew = false
try {
  await gameManager.executeAction(pengPendingGame.gameId, player.id, ActionType.DRAW)
} catch {
  earlyPengDrawThrew = true
}
test('draw remains blocked before peng window expires', earlyPengDrawThrew)

pengPendingGame.pendingActions[0].expiresAt = Date.now() - 10
const expiredPengActions = await gameManager.getAvailableActions(pengPendingGame.gameId, player.id)
test('expired peng window still keeps draw visible until manual action', expiredPengActions.includes(ActionType.DRAW), `actions=${expiredPengActions.join(',')}`)

let latePengDrawThrew = false
try {
  await gameManager.executeAction(pengPendingGame.gameId, player.id, ActionType.DRAW)
} catch {
  latePengDrawThrew = true
}

const afterPengDrawGame = await gameManager.getGame(pengPendingGame.gameId)
test('draw is accepted once peng window expires', !latePengDrawThrew)
test('expired peng window draw clears pending', (afterPengDrawGame?.pendingActions?.length ?? -1) === 0, `pending=${afterPengDrawGame?.pendingActions?.length ?? -1}`)
test('expired peng window draw marks drawnThisTurn true', afterPengDrawGame?.drawnThisTurn === true, `drawn=${String(afterPengDrawGame?.drawnThisTurn)}`)

;(gameManager as any).games.delete(pengPendingGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(pengPendingGame.gameId)

const botPassShouldNotSkipHumanGame = {
  ...game,
  gameId: 'stale-bot-pass-should-not-skip-human',
  wall: [tile('draw-stale-pass-1', TileSuit.DOTS, 7)],
  discardPile: [tile('discard-stale-pass-1', TileSuit.DOTS, 6)],
  currentPlayerIndex: 0,
  drawnThisTurn: false,
  actionHistory: [],
  pendingActions: [
    {
      playerId: 'bot-p2',
      availableActions: [ActionType.PENG, ActionType.PASS],
      tile: tile('discard-stale-pass-1', TileSuit.DOTS, 6),
      expiresAt: Date.now() + 5000,
    }
  ],
} as any

botPassShouldNotSkipHumanGame.players = [
  createPlayer('p1'),
  { ...createPlayer('bot-p2'), isBot: true, name: 'AI-bot-p2' }
]

;(gameManager as any).games.set(botPassShouldNotSkipHumanGame.gameId, botPassShouldNotSkipHumanGame)

let stalePassThrew = false
try {
  await gameManager.executeAction(botPassShouldNotSkipHumanGame.gameId, 'bot-p2', ActionType.PASS)
} catch {
  stalePassThrew = true
}

const afterStalePassGame = await gameManager.getGame(botPassShouldNotSkipHumanGame.gameId)
const afterStalePassActions = await gameManager.getAvailableActions(botPassShouldNotSkipHumanGame.gameId, 'p1')

test('stale bot pass is accepted', !stalePassThrew)
test('stale bot pass does not advance away from current human turn', afterStalePassGame?.currentPlayerIndex === 0, `current=${afterStalePassGame?.currentPlayerIndex}`)
test('human still retains draw action after stale bot pass', afterStalePassActions.includes(ActionType.DRAW), `actions=${afterStalePassActions.join(',')}`)

;(gameManager as any).games.delete(botPassShouldNotSkipHumanGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(botPassShouldNotSkipHumanGame.gameId)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
