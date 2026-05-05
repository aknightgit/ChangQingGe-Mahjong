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

function seq(start: number, prefix: string): Tile[] {
  return [
    tile(TileSuit.BAMBOOS, start, `${prefix}-${start}`),
    tile(TileSuit.BAMBOOS, start + 1, `${prefix}-${start + 1}`),
    tile(TileSuit.BAMBOOS, start + 2, `${prefix}-${start + 2}`),
  ]
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
  }
}

const wildMode = `${TileSuit.DOTS}-9`
const exposed: Meld[] = [
  { type: MeldType.SEQUENCE, isConcealed: false, tiles: seq(1, 's1') },
  { type: MeldType.SEQUENCE, isConcealed: false, tiles: seq(4, 's4') },
  { type: MeldType.SEQUENCE, isConcealed: false, tiles: seq(7, 's7') },
]

const baseConcealed = [
  tile(TileSuit.DOTS, 9, 'wild'),
  tile(TileSuit.WIND, 2, 'south-a'),
  tile(TileSuit.WIND, 2, 'south-b'),
  tile(TileSuit.DRAGON, 3, 'white-a'),
]

const discardWin = canWin([...baseConcealed, tile(TileSuit.DRAGON, 3, 'white-b')], exposed, wildMode)
ok('discard white should be a winning hand', discardWin.canWin, JSON.stringify(discardWin))

const selfDrawWin = canWin([...baseConcealed, tile(TileSuit.WIND, 2, 'south-c')], exposed, wildMode)
ok('self draw south should be a winning hand', selfDrawWin.canWin, JSON.stringify(selfDrawWin))

const huPlayer = player('hu-player', baseConcealed, exposed)
const other1 = player('p2', [])
const other2 = player('p3', [])
const other3 = player('p4', [])
other1.position = 1
other2.position = 2
other3.position = 3

const discardGame = {
  gameId: 'half-flush-discard-hu-regression',
  phase: GamePhase.PLAYING,
  endReason: null,
  players: [other1, huPlayer, other2, other3],
  wall: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  discardPile: [tile(TileSuit.DRAGON, 3, 'white-b')],
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
  customScoringMode: wildMode,
  wildTileGroup: undefined,
} as any

;(gameManager as any).games.set(discardGame.gameId, discardGame)
await (gameManager as any).checkPendingActions?.(discardGame, 0)
const pendingForHu = discardGame.pendingActions.find((pa: any) => pa.playerId === huPlayer.id)
ok('discard white should expose HU action', !!pendingForHu?.availableActions?.includes(ActionType.HU), JSON.stringify(pendingForHu))

;(gameManager as any).games.delete(discardGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(discardGame.gameId)

const selfGame = {
  gameId: 'half-flush-self-hu-regression',
  phase: GamePhase.PLAYING,
  endReason: null,
  players: [huPlayer, other1, other2, other3],
  wall: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  discardPile: [],
  actionHistory: [
    {
      playerId: huPlayer.id,
      type: ActionType.DRAW,
      tile: tile(TileSuit.WIND, 2, 'south-c'),
      timestamp: Date.now(),
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
  customScoringMode: wildMode,
  wildTileGroup: undefined,
} as any
selfGame.players[0] = player('hu-player-self', [...baseConcealed, tile(TileSuit.WIND, 2, 'south-c')], exposed)
;(gameManager as any).games.set(selfGame.gameId, selfGame)
const selfActions = await gameManager.getAvailableActions(selfGame.gameId, selfGame.players[0].id)
ok('self draw south should expose HU action', selfActions.includes(ActionType.HU), `actions=${selfActions.join(',')}`)

;(gameManager as any).games.delete(selfGame.gameId)
;(gameManager as any).clearPendingActionTimer?.(selfGame.gameId)

console.log(`Result: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
