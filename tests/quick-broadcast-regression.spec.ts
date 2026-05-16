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

function makePlayer(id: string, name: string, position: number, isBot = false) {
  return {
    id,
    userId: id,
    name,
    position,
    score: 0,
    isDealer: position === 0,
    status: PlayerStatus.PLAYING,
    isReady: true,
    isConnected: true,
    isBot,
    hand: {
      concealedTiles: [
        tile(`${id}-1`, TileSuit.CHARACTERS, 1),
        tile(`${id}-2`, TileSuit.CHARACTERS, 2),
        tile(`${id}-3`, TileSuit.CHARACTERS, 3),
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
}

console.log('\n=== Regression: quick broadcast messages ===\n')

const anyManager = gameManager as any
const originalWsManager = anyManager.wsManager
const originalPersistGame = anyManager.persistGame
const originalBroadcastGameState = anyManager.broadcastGameState

const messages: any[] = []
anyManager.wsManager = {
  broadcast: (_gameId: string, event: string, payload: any) => {
    if (event === 'broadcastMessage') messages.push(payload)
  }
}
anyManager.persistGame = async () => {}
anyManager.broadcastGameState = () => {}

try {
  const gameId = `quick-broadcast-${Date.now()}`
  const baseGame = {
    gameId,
    players: [makePlayer('p1', 'A', 0)],
    spectators: [],
    phase: GamePhase.WAITING,
    wall: [],
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
    hesitationWindow: 5000,
    winnersCount: 0,
    drawnThisTurn: false,
    roomOwner: 'p1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    botTakeoverPlayers: [],
    customScoringMode: null
  } as any
  anyManager.games.set(gameId, baseGame)
  anyManager.playerToGame.set('p1', gameId)

  const joinResult = await gameManager.joinGame(gameId, 'B', { userId: 'u-b' })
  const joinMsg = messages.find(m => String(m.actionKind || '') === 'roomJoin' || String(m.text || '').includes('进入到了房间'))
  test('join game pushes room join quick message', !!joinMsg, `messages=${JSON.stringify(messages)}`)

  const joinedPlayerId = joinResult.playerId
  const liveGame = await gameManager.getGame(gameId)
  messages.length = 0
  anyManager.recordBailoutAction(gameId, joinedPlayerId, 'p1', 'sequence')
  anyManager.checkAndBroadcastBailout(liveGame, joinedPlayerId, 'p1')
  anyManager.recordBailoutAction(gameId, joinedPlayerId, 'p1', 'sequence')
  anyManager.checkAndBroadcastBailout(liveGame, joinedPlayerId, 'p1')
  const twoKouMsg = messages.find(m => String(m.text || '').includes('2') && String(m.text || '').includes('口'))
  test('second bailout relationship pushes 2-kou quick message', !!twoKouMsg, `messages=${JSON.stringify(messages)}`)

  messages.length = 0
  anyManager.recordBailoutAction(gameId, joinedPlayerId, 'p1', 'sequence')
  anyManager.checkAndBroadcastBailout(liveGame, joinedPlayerId, 'p1')
  const threeKouMsg = messages.find(m => String(m.text || '').includes('3') && String(m.text || '').includes('口'))
  test('third bailout relationship pushes 3-kou quick message', !!threeKouMsg, `messages=${JSON.stringify(messages)}`)

  messages.length = 0
  const liangGame = {
    ...baseGame,
    gameId: `${gameId}-liang`,
    phase: GamePhase.PLAYING,
    players: [
      makePlayer('l1', '甲', 0),
      makePlayer('l2', '乙', 1),
      makePlayer('l3', '丙', 2),
      makePlayer('l4', '丁', 3),
    ],
    liangShanVotes: [],
    inheritMultiplier: 1,
    liangShanThreshold: 999999,
  } as any
  anyManager.games.set(liangGame.gameId, liangGame)
  anyManager.handleLiangShan(liangGame, liangGame.players[0])
  const initiateMsg = messages.find(m => String(m.text || '').includes('梁山聚义') && String(m.text || '').includes('甲'))
  test('liang shan initiation pushes quick message', !!initiateMsg, `messages=${JSON.stringify(messages)}`)

  messages.length = 0
  const autoLiangGame = {
    ...liangGame,
    gameId: `${gameId}-liang-auto`,
    liangShanVotes: [],
    players: [
      { ...makePlayer('a1', '发起者', 0), score: 0 },
      { ...makePlayer('a2', '响应者', 1), score: 0 },
      { ...makePlayer('a3', '旁观甲', 2), score: 0 },
      { ...makePlayer('a4', '旁观乙', 3), score: 0 },
    ],
    liangShanThreshold: -1,
  } as any
  anyManager.games.set(autoLiangGame.gameId, autoLiangGame)
  anyManager.handleLiangShan(autoLiangGame, autoLiangGame.players[0])
  const responseMsg = messages.find(m => String(m.text || '').includes('响应') && String(m.text || '').includes('发起者'))
  test('auto liang shan responses push responder quick message', !!responseMsg, `messages=${JSON.stringify(messages)}`)
} finally {
  anyManager.wsManager = originalWsManager
  anyManager.persistGame = originalPersistGame
  anyManager.broadcastGameState = originalBroadcastGameState
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
