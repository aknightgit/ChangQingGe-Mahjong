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
import { scoreRouteDiscardCandidate } from '../server/ai/route/discardPlanner'
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
  const ai = makePlayer('ai-route-memory', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.CHARACTERS, 4, 'w4'),
    tile(TileSuit.BAMBOOS, 4, 'b4'),
    tile(TileSuit.BAMBOOS, 6, 'b6'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const first = buildRouteState(ai, game, 2, 14)
  const second = evaluateRouteState({
    game,
    player: ai,
    hand: ai.hand.concealedTiles,
    shanten: 2,
    effectiveTiles: 13,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
    previousRouteState: first,
  })
  const noisyThird = evaluateRouteState({
    game,
    player: ai,
    hand: ai.hand.concealedTiles,
    shanten: 2,
    effectiveTiles: 13,
    tableThreat: 0.55,
    wallRemaining: game.wall.length - 6,
    previousRouteState: second,
  })

  ok(
    'route memory keeps previous route on single-turn noisy pressure instead of instant flip',
    first.current === second.current && second.current === noisyThird.current && noisyThird.stableTurns >= 2,
    `first=${first.current}, second=${second.current}, third=${noisyThird.current}, stable=${noisyThird.stableTurns}, evidence=${noisyThird.evidenceCounter}`
  )
}

{
  const ai = makePlayer('ai-observe-ae', 'AI-AK', [
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 4, 'd4'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.CHARACTERS, 1, 'w1'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.BAMBOOS, 8, 'b8'),
    tile(TileSuit.BAMBOOS, 5, 'b5'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DRAGON, 2, 'green-a'),
  ])
  const upstream = makePlayer('p4', 'D', [])
  upstream.hand.discardedTiles = [
    tile(TileSuit.BAMBOOS, 1, 'up-b1'),
    tile(TileSuit.BAMBOOS, 2, 'up-b2'),
  ]
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), upstream], [
    tile(TileSuit.BAMBOOS, 8, 'seen-b8'),
  ])
  const routeState = buildRouteState(ai, game, 3, 10)
  const bambooTile = ai.hand.concealedTiles.find(tile => tile.id === 'b8')!
  const honorTile = ai.hand.concealedTiles.find(tile => tile.id === 'east-a')!
  const bambooScore = scoreRouteDiscardCandidate({
    tile: bambooTile,
    hand: ai.hand.concealedTiles,
    player: ai,
    game,
    routeState,
    candidateShanten: 3,
    candidateEffective: 10,
    discardDanger: 0.2,
    winningTiles: 0,
    baselineScore: 0,
    afterRouteState: routeState,
  })
  const honorScore = scoreRouteDiscardCandidate({
    tile: honorTile,
    hand: ai.hand.concealedTiles,
    player: ai,
    game,
    routeState,
    candidateShanten: 3,
    candidateEffective: 10,
    discardDanger: 0.2,
    winningTiles: 0,
    baselineScore: 0,
    afterRouteState: routeState,
  })

  ok(
    'observe A-E ordering prioritizes weak upstream/shortest-suit waste over generic honor singleton',
    bambooScore > honorScore + 8,
    `bamboo=${bambooScore.toFixed(2)}, honor=${honorScore.toFixed(2)}, route=${routeState.current}`
  )
}

{
  const ai = makePlayer('ai-observe-ah', 'AI-AK', [
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 4, 'd4'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.CHARACTERS, 4, 'w4'),
    tile(TileSuit.CHARACTERS, 5, 'w5'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.BAMBOOS, 1, 'b1'),
    tile(TileSuit.BAMBOOS, 2, 'b2'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
  ])
  const upstream = makePlayer('p4', 'D', [])
  upstream.hand.discardedTiles = [
    tile(TileSuit.BAMBOOS, 8, 'up-b8'),
    tile(TileSuit.BAMBOOS, 9, 'up-b9'),
  ]
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), upstream], [
    tile(TileSuit.BAMBOOS, 1, 'seen-b1'),
    tile(TileSuit.WIND, 1, 'seen-east-1'),
    tile(TileSuit.WIND, 1, 'seen-east-2'),
    tile(TileSuit.WIND, 1, 'seen-east-3'),
    tile(TileSuit.DRAGON, 2, 'fill-1'),
    tile(TileSuit.DRAGON, 3, 'fill-2'),
    tile(TileSuit.WIND, 2, 'fill-3'),
    tile(TileSuit.WIND, 3, 'fill-4'),
    tile(TileSuit.WIND, 4, 'fill-5'),
    tile(TileSuit.DOTS, 9, 'fill-6'),
    tile(TileSuit.CHARACTERS, 9, 'fill-7'),
    tile(TileSuit.BAMBOOS, 9, 'fill-8'),
    tile(TileSuit.DOTS, 1, 'fill-9'),
    tile(TileSuit.CHARACTERS, 1, 'fill-10'),
    tile(TileSuit.BAMBOOS, 8, 'fill-11'),
    tile(TileSuit.DOTS, 8, 'fill-12'),
  ])
  const routeState = buildRouteState(ai, game, 3, 9)
  const eastTile = ai.hand.concealedTiles.find(tile => tile.id === 'east-a')!
  const shortConnector = ai.hand.concealedTiles.find(tile => tile.id === 'b1')!
  const coreTile = ai.hand.concealedTiles.find(tile => tile.id === 'd2')!
  const eastScore = scoreRouteDiscardCandidate({
    tile: eastTile,
    hand: ai.hand.concealedTiles,
    player: ai,
    game,
    routeState,
    candidateShanten: 3,
    candidateEffective: 9,
    discardDanger: 0.25,
    winningTiles: 0,
    baselineScore: 0,
    afterRouteState: routeState,
  })
  const shortConnectorScore = scoreRouteDiscardCandidate({
    tile: shortConnector,
    hand: ai.hand.concealedTiles,
    player: ai,
    game,
    routeState,
    candidateShanten: 3,
    candidateEffective: 9,
    discardDanger: 0.25,
    winningTiles: 0,
    baselineScore: 0,
    afterRouteState: routeState,
  })
  const coreScore = scoreRouteDiscardCandidate({
    tile: coreTile,
    hand: ai.hand.concealedTiles,
    player: ai,
    game,
    routeState,
    candidateShanten: 3,
    candidateEffective: 9,
    discardDanger: 0.25,
    winningTiles: 0,
    baselineScore: 0,
    afterRouteState: routeState,
  })

  ok(
    'observe A-H ordering clears exhausted honor pair and dead short connector before core long-suit tile',
    eastScore > coreScore + 8 && shortConnectorScore > coreScore + 6,
    `east=${eastScore.toFixed(2)}, short=${shortConnectorScore.toFixed(2)}, core=${coreScore.toFixed(2)}, route=${routeState.current}`
  )
}

{
  const claimTile = tile(TileSuit.DOTS, 4, 'claim-dot-4-high-mult')
  const ai = makePlayer('ai-high-mult', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.BAMBOOS, 2, 'b2'),
    tile(TileSuit.BAMBOOS, 3, 'b3'),
    tile(TileSuit.BAMBOOS, 4, 'b4'),
    tile(TileSuit.CHARACTERS, 6, 'w6'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  game.inheritMultiplier = 2
  game.roundMultiplier = 2
  const routeState = buildRouteState(ai, game, 2, 14)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d3', 'd5'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 15,
    passShanten: 2,
    passEffective: 14,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'high global multiplier lowers menqing hold and allows speed chow',
    decision.allowed,
    `allowed=${decision.allowed}, reason=${decision.reason}, tune=${decision.tuneDelta}`
  )
}

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
  const claimTile = tile(TileSuit.DOTS, 4, 'claim-dot-4-upstream')
  const ai = makePlayer('ai-upstream', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.BAMBOOS, 4, 'b4'),
    tile(TileSuit.BAMBOOS, 5, 'b5'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
  ])
  const upstream = makePlayer('p4', 'D', [])
  upstream.hand.discardedTiles = [
    tile(TileSuit.DOTS, 9, 'up-d9a'),
    tile(TileSuit.DOTS, 8, 'up-d8a'),
    tile(TileSuit.DOTS, 7, 'up-d7a'),
  ]
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), upstream], [])
  const routeState = buildRouteState(ai, game, 2, 13)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d3', 'd5'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 14,
    passShanten: 2,
    passEffective: 13,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'upstream repeated discard on same suit encourages opening our long suit',
    decision.allowed,
    `allowed=${decision.allowed}, reason=${decision.reason}, upstream=${routeState.features.upstreamRejectedSuit}`
  )
}

{
  const claimTile = tile(TileSuit.DOTS, 4, 'claim-dot-4-first-gate')
  const ai = makePlayer('ai-first-gate', 'AI-AK', [
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.BAMBOOS, 2, 'b2'),
    tile(TileSuit.BAMBOOS, 3, 'b3'),
    tile(TileSuit.BAMBOOS, 4, 'b4'),
    tile(TileSuit.BAMBOOS, 6, 'b6'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.CHARACTERS, 4, 'w4'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = buildRouteState(ai, game, 2, 11)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['d3', 'd5'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 12,
    passShanten: 2,
    passEffective: 11,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'first chow gate rejects opening chow when best number suit is under six tiles',
    !decision.allowed,
    `allowed=${decision.allowed}, reason=${decision.reason}`
  )
}

{
  const claimTile = tile(TileSuit.WIND, 1, 'claim-east-early-pairs')
  const ai = makePlayer('ai-pairs', 'AI-AK', [
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.WIND, 1, 'east-b'),
    tile(TileSuit.DOTS, 2, 'd2a'),
    tile(TileSuit.DOTS, 2, 'd2b'),
    tile(TileSuit.BAMBOOS, 4, 'b4a'),
    tile(TileSuit.BAMBOOS, 4, 'b4b'),
    tile(TileSuit.CHARACTERS, 6, 'w6a'),
    tile(TileSuit.CHARACTERS, 6, 'w6b'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.BAMBOOS, 5, 'b5'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.WIND, 2, 'south-a'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = buildRouteState(ai, game, 3, 10)
  const decision = evaluateRouteClaim({
    action: ActionType.PENG,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['east-a', 'east-b'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 12,
    passShanten: 3,
    passEffective: 10,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'early four-pair hand actively pushes peng instead of holding menqing',
    decision.allowed && decision.tuneDelta > 0.6,
    `allowed=${decision.allowed}, tune=${decision.tuneDelta}, route=${routeState.current}`
  )
}

{
  const claimTile = tile(TileSuit.BAMBOOS, 4, 'claim-b4-short-gap')
  const ai = makePlayer('ai-short-gap', 'AI-AK', [
    tile(TileSuit.DOTS, 1, 'd1'),
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 4, 'd4'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.DOTS, 7, 'd7'),
    tile(TileSuit.DOTS, 8, 'd8'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.CHARACTERS, 4, 'w4'),
    tile(TileSuit.CHARACTERS, 5, 'w5'),
    tile(TileSuit.BAMBOOS, 3, 'b3'),
    tile(TileSuit.BAMBOOS, 5, 'b5'),
    tile(TileSuit.WIND, 1, 'east-a'),
  ])
  const game = makeGame([ai, makePlayer('p2', 'B', []), makePlayer('p3', 'C', []), makePlayer('p4', 'D', [])], [])
  const routeState = buildRouteState(ai, game, 2, 12)
  const decision = evaluateRouteClaim({
    action: ActionType.CHOW,
    player: ai,
    game,
    claimTile,
    routeState,
    candidateHand: ai.hand.concealedTiles.filter(tile => !['b3', 'b5'].includes(tile.id)),
    candidateShanten: 2,
    candidateEffective: 13,
    passShanten: 2,
    passEffective: 12,
    tableThreat: 0.2,
    wallRemaining: game.wall.length,
  })

  ok(
    'large long-short suit gap blocks shortest-suit chow even when shape looks smooth',
    !decision.allowed,
    `allowed=${decision.allowed}, reason=${decision.reason}, route=${routeState.current}`
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

{
  const claimTile = tile(TileSuit.DOTS, 5, 'claim-dot-5-last-copy')
  const ai = makePlayer('ai-last-peng', 'AI-AK', [
    tile(TileSuit.DOTS, 5, 'd5a'),
    tile(TileSuit.DOTS, 5, 'd5b'),
    tile(TileSuit.DOTS, 2, 'd2a'),
    tile(TileSuit.DOTS, 2, 'd2b'),
    tile(TileSuit.CHARACTERS, 3, 'w3a'),
    tile(TileSuit.CHARACTERS, 3, 'w3b'),
    tile(TileSuit.BAMBOOS, 4, 'b4a'),
    tile(TileSuit.BAMBOOS, 4, 'b4b'),
    tile(TileSuit.CHARACTERS, 6, 'w6'),
    tile(TileSuit.CHARACTERS, 7, 'w7'),
    tile(TileSuit.BAMBOOS, 7, 'b7'),
    tile(TileSuit.WIND, 1, 'east-a'),
    tile(TileSuit.DRAGON, 1, 'red-a'),
  ])
  const otherA = makePlayer('p2', 'B', [])
  const otherB = makePlayer('p3', 'C', [])
  const otherC = makePlayer('p4', 'D', [])
  const game = makeGame([ai, otherA, otherB, otherC], [claimTile])
  game.pendingActions = [{
    playerId: ai.id,
    availableActions: [ActionType.PENG, ActionType.PASS],
    tile: claimTile,
    expiresAt: Date.now() + 1000,
  }]

  const originalRandom = Math.random
  Math.random = () => 0.0
  try {
    const action = await shouldClaimPendingAction(ai, [ActionType.PENG, ActionType.PASS], game)
    ok(
      'last-copy peng window actively takes peng instead of pass',
      action === ActionType.PENG,
      `action=${action}`
    )
  } finally {
    Math.random = originalRandom
  }
}

{
  const huTile = tile(TileSuit.CHARACTERS, 4, 'low-value-hu-tile')
  const ai = makePlayer('ai-low-value-hu', 'AI-AK', [
    tile(TileSuit.DOTS, 2, 'd2'),
    tile(TileSuit.DOTS, 3, 'd3'),
    tile(TileSuit.DOTS, 5, 'd5'),
    tile(TileSuit.DOTS, 6, 'd6'),
    tile(TileSuit.CHARACTERS, 2, 'w2'),
    tile(TileSuit.CHARACTERS, 3, 'w3'),
    tile(TileSuit.CHARACTERS, 5, 'w5'),
    tile(TileSuit.BAMBOOS, 2, 'b2'),
    tile(TileSuit.BAMBOOS, 3, 'b3'),
    tile(TileSuit.BAMBOOS, 4, 'b4'),
    tile(TileSuit.WIND, 1, 'east-a'),
  ], 4200)
  ai.hand.exposedMelds = [{
    type: 'pong',
    tile: tile(TileSuit.DRAGON, 1, 'meld-red'),
    tiles: [
      tile(TileSuit.DRAGON, 1, 'meld-red-a'),
      tile(TileSuit.DRAGON, 1, 'meld-red-b'),
      tile(TileSuit.DRAGON, 1, 'meld-red-c'),
    ],
    sourcePlayerId: 'p2',
  } as any]
  const threateningA = makePlayer('p2', 'B', [], 2600)
  threateningA.isTing = true
  threateningA.hand.exposedMelds = [{
    type: 'pong',
    tile: tile(TileSuit.DOTS, 9, 'threat-pong'),
    tiles: [tile(TileSuit.DOTS, 9, 'tp1'), tile(TileSuit.DOTS, 9, 'tp2'), tile(TileSuit.DOTS, 9, 'tp3')],
    sourcePlayerId: ai.id,
  } as any, {
    type: 'pong',
    tile: tile(TileSuit.BAMBOOS, 9, 'threat-pong-2'),
    tiles: [tile(TileSuit.BAMBOOS, 9, 'tb1'), tile(TileSuit.BAMBOOS, 9, 'tb2'), tile(TileSuit.BAMBOOS, 9, 'tb3')],
    sourcePlayerId: ai.id,
  } as any]
  const threateningB = makePlayer('p3', 'C', [], 2500)
  threateningB.hand.exposedMelds = [{
    type: 'pong',
    tile: tile(TileSuit.WIND, 2, 'threat-pong-3'),
    tiles: [tile(TileSuit.WIND, 2, 'tw1'), tile(TileSuit.WIND, 2, 'tw2'), tile(TileSuit.WIND, 2, 'tw3')],
    sourcePlayerId: ai.id,
  } as any, {
    type: 'pong',
    tile: tile(TileSuit.CHARACTERS, 8, 'threat-pong-4'),
    tiles: [tile(TileSuit.CHARACTERS, 8, 'tc1'), tile(TileSuit.CHARACTERS, 8, 'tc2'), tile(TileSuit.CHARACTERS, 8, 'tc3')],
    sourcePlayerId: ai.id,
  } as any]
  const threateningC = makePlayer('p4', 'D', [], 2400)
  const game = makeGame([ai, threateningA, threateningB, threateningC], [huTile])
  game.pendingActions = [{
    playerId: ai.id,
    availableActions: [ActionType.HU, ActionType.PASS],
    tile: huTile,
    type: 'discard',
    expiresAt: Date.now() + 1000,
  } as any]

  const originalRandom = Math.random
  Math.random = () => 0.0
  try {
    const action = await shouldClaimPendingAction(ai, [ActionType.HU, ActionType.PASS], game)
    ok(
      'high-risk low-value discard hu is declined when leading under strong table pressure',
      action === ActionType.PASS,
      `action=${action}`
    )
  } finally {
    Math.random = originalRandom
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
