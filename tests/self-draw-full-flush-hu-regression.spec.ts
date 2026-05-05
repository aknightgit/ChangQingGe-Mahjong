import { canWin } from '../server/utils/handValidator'
import { gameManager } from '../server/utils/gameManager'
import {
  ActionType,
  GamePhase,
  Meld,
  MeldType,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game'

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`)
    failed++
  }
}

function tile(suit: TileSuit, value: number, id: string, isFlower = suit === TileSuit.FLOWER): Tile {
  return { suit, value, id, isFlower }
}

function sequence(suit: TileSuit, start: number, prefix: string): Tile[] {
  return [
    tile(suit, start, `${prefix}-${start}`),
    tile(suit, start + 1, `${prefix}-${start + 1}`),
    tile(suit, start + 2, `${prefix}-${start + 2}`),
  ]
}

function triplet(suit: TileSuit, value: number, prefix: string): Tile[] {
  return [
    tile(suit, value, `${prefix}-1`),
    tile(suit, value, `${prefix}-2`),
    tile(suit, value, `${prefix}-3`),
  ]
}

function flowerSet(count: number): Meld {
  return {
    type: MeldType.KONG,
    isConcealed: false,
    tiles: Array.from({ length: count }, (_, index) => tile(TileSuit.FLOWER, index + 1, `flower-${index + 1}`, true)),
  }
}

function player(id: string, concealedTiles: Tile[], exposedMelds: Meld[] = []): Player {
  return {
    id,
    name: id,
    position: 0,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [...exposedMelds],
      discardedTiles: [],
    },
    status: PlayerStatus.PLAYING,
    isDealer: true,
    isTing: false,
    missingSuit: null,
    windScore: 0,
    rainScore: 0,
    wonFan: 0,
    winOrder: null,
    winRound: null,
    winTimestamp: null,
    score: 0,
  }
}

const concealed = [
  tile(TileSuit.CHARACTERS, 2, 'wan-2'),
  tile(TileSuit.CHARACTERS, 3, 'wan-3'),
  tile(TileSuit.CHARACTERS, 4, 'wan-4'),
  tile(TileSuit.CHARACTERS, 5, 'wan-5a'),
  tile(TileSuit.CHARACTERS, 5, 'wan-5b'),
  tile(TileSuit.CHARACTERS, 7, 'wan-7a'),
  tile(TileSuit.CHARACTERS, 7, 'wan-7b'),
  tile(TileSuit.CHARACTERS, 7, 'wan-7c'),
]

const exposed = [
  {
    type: MeldType.SEQUENCE,
    isConcealed: false,
    tiles: sequence(TileSuit.CHARACTERS, 1, 'chi-123'),
  },
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: triplet(TileSuit.CHARACTERS, 6, 'peng-666'),
  },
  flowerSet(5),
]

const winCheck = canWin(concealed, exposed, null)
ok('canWin recognizes self-draw full flush with flowers', winCheck.canWin, JSON.stringify(winCheck))
ok('canWin returns at least one hand type', winCheck.types.length > 0, JSON.stringify(winCheck.types))

const p1 = player('p1', concealed, exposed)
const p2 = player('p2', [])
const p3 = player('p3', [])
const p4 = player('p4', [])
p2.position = 1
p3.position = 2
p4.position = 3

const game = {
  gameId: 'self-draw-full-flush-hu-regression',
  phase: GamePhase.PLAYING,
  endReason: null,
  players: [p1, p2, p3, p4],
  wall: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  discardPile: [],
  actionHistory: [
    {
      playerId: p1.id,
      type: ActionType.DRAW,
      timestamp: Date.now(),
      tile: tile(TileSuit.CHARACTERS, 4, 'drawn-4'),
    },
  ],
  winnersCount: 0,
  roundNumber: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActionTime: Date.now(),
  pendingActions: [],
  freezePlayerId: null,
  freezeComplete: false,
  inheritedGlobalMultiplier: 1,
  roundMultiplier: 1,
  inheritMultiplier: 1,
  hesitationWindow: 5000,
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
  customScoringMode: null,
} as any

;(gameManager as any).games.set(game.gameId, game)

const actions = await gameManager.getAvailableActions(game.gameId, p1.id)
ok('available actions include HU for the self-draw hand', actions.includes(ActionType.HU), `actions=${actions.join(',')}`)

;(gameManager as any).games.delete(game.gameId)
;(gameManager as any).clearPendingActionTimer?.(game.gameId)

const flowerReplacementPlayer = player('p-flower', [
  tile(TileSuit.CHARACTERS, 2, 'fr-wan-2'),
  tile(TileSuit.CHARACTERS, 3, 'fr-wan-3'),
  tile(TileSuit.CHARACTERS, 5, 'fr-wan-5a'),
  tile(TileSuit.CHARACTERS, 5, 'fr-wan-5b'),
  tile(TileSuit.CHARACTERS, 7, 'fr-wan-7a'),
  tile(TileSuit.CHARACTERS, 7, 'fr-wan-7b'),
  tile(TileSuit.CHARACTERS, 7, 'fr-wan-7c'),
], [
  {
    type: MeldType.SEQUENCE,
    isConcealed: false,
    tiles: sequence(TileSuit.CHARACTERS, 1, 'fr-chi-123'),
  },
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: triplet(TileSuit.CHARACTERS, 6, 'fr-peng-666'),
  },
  {
    type: MeldType.TRIPLET,
    isConcealed: false,
    tiles: [tile(TileSuit.FLOWER, 1, 'fr-flower-1', true)],
  },
])

const flowerGame = {
  gameId: 'self-draw-flower-replacement-hu-regression',
  phase: GamePhase.PLAYING,
  endReason: null,
  players: [flowerReplacementPlayer, p2, p3, p4],
  wall: [tile(TileSuit.CHARACTERS, 4, 'fr-draw-4')],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  discardPile: [],
  actionHistory: [],
  winnersCount: 0,
  roundNumber: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActionTime: Date.now(),
  pendingActions: [],
  freezePlayerId: null,
  freezeComplete: false,
  inheritedGlobalMultiplier: 1,
  roundMultiplier: 1,
  inheritMultiplier: 1,
  hesitationWindow: 5000,
  thinkUsage: {},
  chowPongExclusion: {},
  drawnThisTurn: false,
  botTakeoverPlayers: [],
  roundStats: [],
  settlementMultiplier: 1,
  pengChowConflict: null,
  leadingBrotherEvent: null,
  consecutiveDiscards: null,
  spectatorMode: null,
  customScoringMode: null,
} as any

;(gameManager as any).games.set(flowerGame.gameId, flowerGame)
await gameManager.executeAction(flowerGame.gameId, flowerReplacementPlayer.id, ActionType.DRAW)
const flowerActions = await gameManager.getAvailableActions(flowerGame.gameId, flowerReplacementPlayer.id)
ok('flower replacement that fills the hand still exposes HU', flowerActions.includes(ActionType.HU), `actions=${flowerActions.join(',')}`)

;(gameManager as any).games.delete(flowerGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(flowerGame.gameId)

console.log(`Result: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
