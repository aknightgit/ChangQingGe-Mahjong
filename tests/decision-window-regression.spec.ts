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

function makeHand() {
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

function makePlayer(id: string, position: number) {
  return {
    id,
    userId: id,
    name: id,
    position,
    score: 0,
    isDealer: position === 0,
    status: PlayerStatus.PLAYING,
    isReady: true,
    isConnected: true,
    isBot: false,
    hand: {
      concealedTiles: makeHand(),
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

console.log('\n=== Regression: decision window and timeout execution ===\n')

const anyManager = gameManager as any
const originalSetTimeout = global.setTimeout

const thinkGame = {
  gameId: 'decision-window-think-retain',
  players: [makePlayer('p1', 0), makePlayer('p2', 1)],
  spectators: [],
  phase: GamePhase.PLAYING,
  wall: [tile('think-wall-1', TileSuit.DOTS, 9)],
  discardPile: [tile('think-discard-1', TileSuit.DOTS, 5)],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  currentRound: 1,
  roundNumber: 1,
  pendingActions: [{
    playerId: 'p2',
    availableActions: [ActionType.PENG, ActionType.PASS],
    tile: tile('think-discard-1', TileSuit.DOTS, 5),
    expiresAt: Date.now() + 5000,
  }],
  actionHistory: [],
  dice: [1, 1],
  roundMultiplier: 1,
  inheritMultiplier: 1,
  settlementMultiplier: 1,
  hesitationWindow: 5000,
  thinkChances: 3,
  winnersCount: 0,
  drawnThisTurn: false,
  roomOwner: 'p1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  botTakeoverPlayers: [],
  customScoringMode: null
} as any

anyManager.games.set(thinkGame.gameId, thinkGame)
try {
  global.setTimeout = ((fn: (...args: any[]) => void, _ms?: number, ...args: any[]) =>
    originalSetTimeout(fn, 10, ...args)) as any
  await anyManager.handleThink(thinkGame, thinkGame.players[1])
  await new Promise(resolve => originalSetTimeout(resolve, 40))
  const afterThinkGame = await gameManager.getGame(thinkGame.gameId)
  test(
    'think timeout does not auto-pass retained pending claims',
    (afterThinkGame?.pendingActions?.length ?? -1) === 1 && afterThinkGame?.pendingActions?.[0]?.playerId === 'p2',
    `pending=${JSON.stringify(afterThinkGame?.pendingActions)}`
  )
} finally {
  global.setTimeout = originalSetTimeout
  anyManager.clearPendingActionTimer?.(thinkGame.gameId)
  anyManager.games.delete(thinkGame.gameId)
}

const timeoutPlayer = makePlayer('timeout-p1', 0)
const timeoutNext = makePlayer('timeout-p2', 1)
const autoTimeoutGame = {
  gameId: 'decision-window-auto-timeout-draw-discard',
  players: [timeoutPlayer, timeoutNext],
  spectators: [],
  phase: GamePhase.PLAYING,
  wall: [tile('timeout-auto-draw-1', TileSuit.DOTS, 9)],
  discardPile: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  currentRound: 1,
  roundNumber: 1,
  pendingActions: [],
  actionHistory: [],
  dice: [1, 1],
  roundMultiplier: 1,
  inheritMultiplier: 1,
  settlementMultiplier: 1,
  hesitationWindow: 0,
  winnersCount: 0,
  drawnThisTurn: false,
  roomOwner: timeoutPlayer.id,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  botTakeoverPlayers: [],
  customScoringMode: null
} as any

anyManager.games.set(autoTimeoutGame.gameId, autoTimeoutGame)
try {
  global.setTimeout = ((fn: (...args: any[]) => void, _ms?: number, ...args: any[]) =>
    originalSetTimeout(fn, 10, ...args)) as any
  anyManager.scheduleAutoTakeover(autoTimeoutGame.gameId, timeoutPlayer.id, 0)
  await new Promise(resolve => originalSetTimeout(resolve, 150))
  const afterAutoTimeoutGame = await gameManager.getGame(autoTimeoutGame.gameId)
  const drawAction = afterAutoTimeoutGame?.actionHistory?.find((a: any) => a.playerId === timeoutPlayer.id && a.type === ActionType.DRAW)
  const discardAction = afterAutoTimeoutGame?.actionHistory?.find((a: any) => a.playerId === timeoutPlayer.id && a.type === ActionType.DISCARD)
  test('60s timeout auto-draws for the stalled current player', !!drawAction, `actions=${JSON.stringify(afterAutoTimeoutGame?.actionHistory)}`)
  test(
    '60s timeout auto-discards the drawn tile immediately',
    discardAction?.tile?.id === 'timeout-auto-draw-1' || afterAutoTimeoutGame?.discardPile?.[0]?.id === 'timeout-auto-draw-1',
    `discard=${discardAction?.tile?.id ?? afterAutoTimeoutGame?.discardPile?.[0]?.id}`
  )
  test('60s timeout advances turn after forced draw-discard', afterAutoTimeoutGame?.currentPlayerIndex === 1, `current=${afterAutoTimeoutGame?.currentPlayerIndex}`)
} finally {
  global.setTimeout = originalSetTimeout
  anyManager.clearPendingActionTimer?.(autoTimeoutGame.gameId)
  anyManager.clearAutoTakeover?.(autoTimeoutGame.gameId, timeoutPlayer.id)
  anyManager.games.delete(autoTimeoutGame.gameId)
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
