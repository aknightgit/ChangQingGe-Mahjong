import {
  ActionType,
  GamePhase,
  GameState,
  Player,
  PlayerStatus,
  Tile,
  TileSuit,
} from '../server/types/game'
import { evaluateRouteClaim } from '../server/ai/route/claimPlanner'
import { evaluateRouteState } from '../server/ai/route/routeEvaluator'
import { shouldClaimPendingAction } from '../server/services/botService'

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
    gameId: `route-claim-${Math.random().toString(36).slice(2)}`,
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

function buildRouteState(player: Player, game: GameState, shanten: number, effectiveTiles: number) {
  return evaluateRouteState({
    game,
    player,
    hand: player.hand.concealedTiles,
    shanten,
    effectiveTiles,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })
}

console.log('\n=== Regression: route claim planner ===\n')

{
  const claimTile = tile(TileSuit.DOTS, 4, 'claim-dot-4')
  const ai = makePlayer('ai1', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.BAMBOOS, 2, 't2'),
    tile(TileSuit.BAMBOOS, 3, 't3'),
    tile(TileSuit.BAMBOOS, 4, 't4'),
    tile(TileSuit.CHARACTERS, 6, 'w6'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.WIND, 1, 'east'),
    tile(TileSuit.WIND, 1, 'east-2'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = buildRouteState(ai, game, 2, 14)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d3', 'd5'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 13,
    passShanten: 2,
    passEffective: 14,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'menqing speed blocks early chow that does not improve speed',
    routeState.current === 'MENQING_SPEED' && !decision.allowed,
    `route=${routeState.current}, allowed=${decision.allowed}, reason=${decision.reason}`
  )
}

{
  const claimTile = tile(TileSuit.WIND, 1, 'claim-east')
  const ai = makePlayer('ai2', 'AI-AK', [
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DOTS, 1, 'd1a'),
    tile(TileSuit.DOTS, 1, 'd1b'),
    tile(TileSuit.BAMBOOS, 9, 't9a'),
    tile(TileSuit.BAMBOOS, 9, 't9b'),
    tile(TileSuit.CHARACTERS, 4, 'w4a'),
    tile(TileSuit.CHARACTERS, 4, 'w4b'),
    tile(TileSuit.CHARACTERS, 8, 'w8'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = { ...buildRouteState(ai, game, 3, 8), current: 'ALL_PUNGS' as const }
  const pengDecision = evaluateRouteClaim({
    action: ActionType.PENG,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['east-a', 'east-b'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 10,
    passShanten: 3,
    passEffective: 8,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })
  const chowDecision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile: tile(TileSuit.DOTS, 2, 'claim-dot-2'),
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d1a', 'w4a'].includes(tile.id)),
    candidateShanten: 3,
    candidateEffective: 9,
    passShanten: 3,
    passEffective: 8,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'all pungs route boosts peng and blocks chow',
    routeState.current === 'ALL_PUNGS' && pengDecision.allowed && pengDecision.tuneDelta > 0 && !chowDecision.allowed,
    `route=${routeState.current}, pengAllowed=${pengDecision.allowed}, chowAllowed=${chowDecision.allowed}`
  )
}

{
  const claimTile = tile(TileSuit.DOTS, 7, 'claim-dot-7')
  const ai = makePlayer('ai3', 'AI-AK', [
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.WIND, 2, 'south-a'),
    tile(TileSuit.WIND, 2, 'south-b'),
    tile(TileSuit.WIND, 3, 'west-a'),
    tile(TileSuit.WIND, 3, 'west-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 1, 'red-b'),
    tile(TileSuit.DRAGON, 2, 'green-a'),
    tile(TileSuit.DRAGON, 2, 'green-b'),
    tile(TileSuit.DRAGON, 3, 'white-a'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = buildRouteState(ai, game, 2, 7)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d5', 'd6'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 7,
    passShanten: 2,
    passEffective: 7,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'honor heavy route rejects number chow',
    routeState.current === 'HONOR_HEAVY' && !decision.allowed,
    `route=${routeState.current}, allowed=${decision.allowed}, reason=${decision.reason}`
  )
}

{
  const claimTile = tile(TileSuit.DOTS, 4, 'live-dot-4')
  const ai = makePlayer('ai4', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.BAMBOOS, 2, 't2'),
    tile(TileSuit.BAMBOOS, 3, 't3'),
    tile(TileSuit.BAMBOOS, 4, 't4'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.CHARACTERS, 4, 'w4'),
    tile(TileSuit.WIND, 1, 'east'),
  ])
  const otherA = makePlayer('p2', 'B', [])
  const otherB = makePlayer('p3', 'C', [])
  const otherC = makePlayer('p4', 'D', [])
  const game = makeGame([ai, otherA, otherB, otherC], [])
  game.pendingActions = [{
    playerId: ai.id,
    availableActions: [ActionType.CHOW, ActionType.PASS],
    tile: claimTile,
    expiresAt: Date.now() + 1000,
  }]

  const originalRandom = Math.random
  Math.random = () => 0.5
  try {
    const action = await shouldClaimPendingAction(ai, [ActionType.CHOW, ActionType.PASS], game)
    ok(
      'AI-AK integrated claim flow passes on route-blocked early chow',
      action === ActionType.PASS,
      `action=${action}`
    )
  } finally {
    Math.random = originalRandom
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
