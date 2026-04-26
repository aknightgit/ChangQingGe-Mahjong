import {
  GamePhase,
  GameState,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game'
import { selectDiscardTile } from '../server/services/botService'

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

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: false }
}

function makePlayer(id: string, name: string, tiles: Tile[], score = 0): Player {
  return {
    id,
    name,
    position: 0,
    hand: {
      concealedTiles: tiles,
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
    score,
  }
}

function makeGame(players: Player[], discardPile: Tile[]): GameState {
  players.forEach((player, index) => {
    player.position = index
  })

  return {
    gameId: `dynamic-discard-${Math.random().toString(36).slice(2)}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile,
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
    hesitationWindow: 10,
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
  } as GameState
}

console.log('\n=== Regression: dynamic discard strategy ===\n')

const safeEast1 = tile(TileSuit.WIND, 1, 'safe-east-1')
const safeEast2 = tile(TileSuit.WIND, 1, 'safe-east-2')
const seenDot = tile(TileSuit.DOTS, 9, 'seen-dot-9')
const seenBamboo = tile(TileSuit.BAMBOOS, 1, 'seen-bamboo-1')
const liveSouth = tile(TileSuit.WIND, 2, 'live-south')

const ai = makePlayer('ai', 'AI-AK', [
  tile(TileSuit.DOTS, 1, 'd1a'),
  tile(TileSuit.DOTS, 2, 'd2a'),
  tile(TileSuit.DOTS, 3, 'd3a'),
  tile(TileSuit.DOTS, 1, 'd1b'),
  tile(TileSuit.DOTS, 2, 'd2b'),
  tile(TileSuit.DOTS, 3, 'd3b'),
  tile(TileSuit.DOTS, 4, 'd4'),
  tile(TileSuit.DOTS, 5, 'd5'),
  tile(TileSuit.DOTS, 6, 'd6'),
  tile(TileSuit.DOTS, 7, 'd7'),
  tile(TileSuit.DOTS, 8, 'd8'),
  tile(TileSuit.DOTS, 9, 'd9'),
  safeEast1,
  liveSouth,
], 12000)

const threatA = makePlayer('p2', 'AI-阿水', [], 4000)
threatA.isTing = true
threatA.hand.discardedTiles = [
  safeEast2,
  seenDot,
  seenBamboo,
  tile(TileSuit.CHARACTERS, 9, 'wan-9'),
  tile(TileSuit.CHARACTERS, 1, 'wan-1'),
  tile(TileSuit.BAMBOOS, 9, 'tiao-9'),
  tile(TileSuit.DOTS, 1, 'dot-1'),
  tile(TileSuit.DOTS, 4, 'dot-4'),
  tile(TileSuit.CHARACTERS, 7, 'wan-7'),
  tile(TileSuit.BAMBOOS, 5, 'tiao-5'),
]

const threatB = makePlayer('p3', 'AI-小胖', [], 5000)
threatB.hand.discardedTiles = [
  tile(TileSuit.DOTS, 2, 'b-dot-2'),
  tile(TileSuit.BAMBOOS, 7, 'b-tiao-7'),
  tile(TileSuit.CHARACTERS, 3, 'b-wan-3'),
]

const idle = makePlayer('p4', 'AI-老赵', [], 3000)

const discardPile = [...threatA.hand.discardedTiles, ...threatB.hand.discardedTiles]
const game = makeGame([ai, threatA, threatB, idle], discardPile)

const selectedTileId = selectDiscardTile(ai, game)

ok(
  'late-game threat prefers proven safe ting discard',
  selectedTileId === safeEast1.id,
  `selected=${selectedTileId}`
)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
