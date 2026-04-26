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

function makeGame(players: Player[], discardPile: Tile[] = [], wallLength = 60): GameState {
  players.forEach((player, index) => {
    player.position = index
  })

  return {
    gameId: `route-discard-${Math.random().toString(36).slice(2)}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: Array.from({ length: wallLength }, (_, index) => tile(TileSuit.DOTS, (index % 9) + 1, `wall-${index}`)),
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

console.log('\n=== Regression: route discard planner ===\n')

{
  const isolatedWan = tile(TileSuit.CHARACTERS, 9, 'isolated-wan')
  const ai = makePlayer('ai1', 'AI-AK', [
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 4, 'd4'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7a'),
    tile(TileSuit.DOTS, 7, 'd7b'),
    tile(TileSuit.DOTS, 8, 'd8'),
    tile(TileSuit.DOTS, 9, 'd9'),
    tile(TileSuit.BAMBOOS, 2, 't2'),
    tile(TileSuit.BAMBOOS, 3, 't3'),
    tile(TileSuit.BAMBOOS, 4, 't4'),
    tile(TileSuit.WIND, 1, 'east'),
    isolatedWan,
  ])
  const game = makeGame([ai, makePlayer('p2', 'AI-阿水', []), makePlayer('p3', 'AI-小胖', []), makePlayer('p4', 'AI-老赵', [])], [])
  const selected = selectDiscardTile(ai, game)
  ok('observe phase keeps long suit pair and cuts isolated short-suit tile', selected === isolatedWan.id, `selected=${selected}`)
}

{
  const offSuit = tile(TileSuit.BAMBOOS, 9, 'off-suit-bamboo')
  const ai = makePlayer('ai2', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'hd1'),
    tile(TileSuit.DOTS, 2, 'hd2'),
    tile(TileSuit.DOTS, 3, 'hd3'),
    tile(TileSuit.DOTS, 4, 'hd4'),
    tile(TileSuit.DOTS, 5, 'hd5'),
    tile(TileSuit.DOTS, 6, 'hd6'),
    tile(TileSuit.DOTS, 7, 'hd7'),
    tile(TileSuit.DOTS, 8, 'hd8'),
    tile(TileSuit.WIND, 1, 'he1'),
    tile(TileSuit.WIND, 1, 'he2'),
    tile(TileSuit.DRAGON, 1, 'hr1'),
    tile(TileSuit.DRAGON, 2, 'hg1'),
    tile(TileSuit.DRAGON, 3, 'hw1'),
    offSuit,
  ])
  const game = makeGame([ai, makePlayer('p2', 'AI-阿水', []), makePlayer('p3', 'AI-小胖', []), makePlayer('p4', 'AI-老赵', [])], [])
  const selected = selectDiscardTile(ai, game)
  ok('half flush route clears non-target suit number tile first', selected === offSuit.id, `selected=${selected}`)
}

{
  const loneNumber = tile(TileSuit.DOTS, 5, 'lone-dot-5')
  const ai = makePlayer('ai3', 'AI-AK', [
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.WIND, 3, 'west-a'),
    tile(TileSuit.WIND, 3, 'west-b'),
    tile(TileSuit.WIND, 4, 'north-a'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DRAGON, 2, 'green-a'),
    tile(TileSuit.DRAGON, 3, 'white-a'),
    tile(TileSuit.DRAGON, 3, 'white-b'),
    loneNumber,
    tile(TileSuit.CHARACTERS, 7, 'wan-7'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'AI-阿水', []), makePlayer('p3', 'AI-小胖', []), makePlayer('p4', 'AI-老赵', [])], [])
  const selected = selectDiscardTile(ai, game)
  ok(
    'honor heavy route prefers cutting number tiles before honor core',
    selected === loneNumber.id || selected === 'wan-7',
    `selected=${selected}`
  )
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
