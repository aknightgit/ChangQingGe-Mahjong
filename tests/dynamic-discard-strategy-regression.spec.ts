import {
  GamePhase,
  GameState,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game'
import { applyStrategicPreferencePolicy, selectDiscardTile } from '../server/services/botService'

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

const offSuitResidueAi = makePlayer('ai-off-suit-residue', 'AI-AK', [
  tile(TileSuit.BAMBOOS, 2, 'b2'),
  tile(TileSuit.BAMBOOS, 3, 'b3'),
  tile(TileSuit.BAMBOOS, 4, 'b4'),
  tile(TileSuit.BAMBOOS, 5, 'b5'),
  tile(TileSuit.BAMBOOS, 6, 'b6'),
  tile(TileSuit.BAMBOOS, 7, 'b7'),
  tile(TileSuit.WIND, 1, 'east'),
  tile(TileSuit.WIND, 2, 'south'),
  tile(TileSuit.WIND, 3, 'west'),
  tile(TileSuit.DRAGON, 1, 'red'),
  tile(TileSuit.DOTS, 4, 'dot4-a'),
  tile(TileSuit.DOTS, 4, 'dot4-b'),
  tile(TileSuit.DOTS, 5, 'dot5'),
  tile(TileSuit.FLOWER, 2, 'flower-2'),
])
const offSuitResidueGame = makeGame([
  offSuitResidueAi,
  makePlayer('p2-off', 'AI-p2-off', []),
  makePlayer('p3-off', 'AI-p3-off', []),
  makePlayer('p4-off', 'AI-p4-off', []),
], [])
offSuitResidueGame.customScoringMode = 'flower-1' as any
offSuitResidueGame.wildTileGroup = ['1'] as any

const offSuitResidueDiscardId = selectDiscardTile(offSuitResidueAi, offSuitResidueGame)

ok(
  'long one-suit hand with many honors should purge the tiny off-suit residue before honors or the main suit',
  ['dot4-a', 'dot4-b', 'dot5'].includes(offSuitResidueDiscardId),
  `selected=${offSuitResidueDiscardId}`
)

const offSuitTripletAi = makePlayer('ai-off-suit-triplet', 'AI-AK', [
  tile(TileSuit.BAMBOOS, 2, 'tb2'),
  tile(TileSuit.BAMBOOS, 3, 'tb3'),
  tile(TileSuit.BAMBOOS, 4, 'tb4'),
  tile(TileSuit.BAMBOOS, 5, 'tb5'),
  tile(TileSuit.BAMBOOS, 6, 'tb6'),
  tile(TileSuit.BAMBOOS, 7, 'tb7'),
  tile(TileSuit.WIND, 1, 'teast'),
  tile(TileSuit.WIND, 2, 'tsouth'),
  tile(TileSuit.WIND, 3, 'twest'),
  tile(TileSuit.DRAGON, 1, 'tred'),
  tile(TileSuit.DRAGON, 2, 'tgreen'),
  tile(TileSuit.DOTS, 4, 'tdot4-a'),
  tile(TileSuit.DOTS, 4, 'tdot4-b'),
  tile(TileSuit.DOTS, 4, 'tdot4-c'),
])
const offSuitTripletGame = makeGame([
  offSuitTripletAi,
  makePlayer('p2-triplet', 'AI-p2-triplet', []),
  makePlayer('p3-triplet', 'AI-p3-triplet', []),
  makePlayer('p4-triplet', 'AI-p4-triplet', []),
], [])
offSuitTripletGame.customScoringMode = 'flower-1' as any
offSuitTripletGame.wildTileGroup = ['9'] as any

const offSuitTripletDiscardId = selectDiscardTile(offSuitTripletAi, offSuitTripletGame)

ok(
  'long one-suit hand with many honors still clears a short off-suit triplet when not pursuing all pungs',
  ['tdot4-a', 'tdot4-b', 'tdot4-c'].includes(offSuitTripletDiscardId),
  `selected=${offSuitTripletDiscardId}`
)

const pungsTuned = applyStrategicPreferencePolicy({
  pungsPreference: 1,
  pengChance: 0.6,
  chowChance: 0.8,
  allPungsPursuit: 0.2,
  pairWeight: 6,
  sequenceVsTripletBias: 0,
  flushVsPungsBalance: 0,
})

ok(
  'pungsPreference lifts all-pungs route pressure and pair retention together',
  pungsTuned.allPungsPursuit >= 2 &&
    pungsTuned.pairWeight >= 12 &&
    pungsTuned.sequenceVsTripletBias >= 1.8 &&
    pungsTuned.flushVsPungsBalance >= 1.3,
  `policy=${JSON.stringify(pungsTuned)}`
)

ok(
  'pungsPreference simultaneously suppresses chow and boosts peng',
  pungsTuned.pengChance >= 0.95 && pungsTuned.chowChance <= 0.2,
  `peng=${pungsTuned.pengChance}, chow=${pungsTuned.chowChance}`
)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
