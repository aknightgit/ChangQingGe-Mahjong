import { gameManager } from '../server/utils/gameManager'
import {
  ActionType,
  GamePhase,
  MeldType,
  PlayerStatus,
  TileSuit
} from '../server/types/game'

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`)
    passed++
  } else {
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value }
}

function waitingPengPengTiles(prefix: string) {
  return [
    tile(`${prefix}-1a`, TileSuit.DOTS, 1),
    tile(`${prefix}-1b`, TileSuit.DOTS, 1),
    tile(`${prefix}-1c`, TileSuit.DOTS, 1),
    tile(`${prefix}-2a`, TileSuit.DOTS, 2),
    tile(`${prefix}-2b`, TileSuit.DOTS, 2),
    tile(`${prefix}-2c`, TileSuit.DOTS, 2),
    tile(`${prefix}-3a`, TileSuit.DOTS, 3),
    tile(`${prefix}-3b`, TileSuit.DOTS, 3),
    tile(`${prefix}-3c`, TileSuit.DOTS, 3),
    tile(`${prefix}-4a`, TileSuit.DOTS, 4),
    tile(`${prefix}-4b`, TileSuit.DOTS, 4),
    tile(`${prefix}-4c`, TileSuit.DOTS, 4),
    tile(`${prefix}-5a`, TileSuit.DOTS, 5)
  ]
}

function player(id: string, position: number, concealedTiles: any[], exposedMelds: any[] = []) {
  return {
    id,
    userId: id,
    name: id,
    position,
    score: 0,
    isDealer: position === 0,
    status: PlayerStatus.PLAYING,
    isTing: false,
    missingSuit: null,
    hand: {
      concealedTiles: [...concealedTiles],
      exposedMelds: [...exposedMelds],
      discardedTiles: []
    },
    windScore: 0,
    rainScore: 0,
    wonFan: 0,
    winOrder: null,
    winRound: null,
    winTimestamp: null
  } as any
}

function baseGame(players: any[], discardTile?: any) {
  return {
    gameId: `extreme-${Date.now()}-${Math.random()}`,
    phase: GamePhase.PLAYING,
    endReason: null,
    players,
    wall: [
      tile('wall-1', TileSuit.BAMBOOS, 7),
      tile('wall-2', TileSuit.CHARACTERS, 8),
      tile('wall-3', TileSuit.DOTS, 9)
    ],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    discardPile: discardTile ? [discardTile] : [],
    actionHistory: discardTile ? [{
      playerId: players[0].id,
      type: ActionType.DISCARD,
      tile: discardTile,
      timestamp: Date.now()
    }] : [],
    winnersCount: 0,
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    pendingActions: [],
    pendingKongClaim: undefined,
    multiHuStarterIndex: undefined,
    drawnThisTurn: false,
    spectators: [],
    roomOwner: players[0]?.id,
    dice: [1, 2],
    roundMultiplier: 1,
    inheritMultiplier: 1,
    settlementMultiplier: 1
  } as any
}

console.log('\n=== 回归测试: 极端流程 ===\n')

// 用例1: 一炮多响时，首胡后必须记录“从谁右手继续”
{
  const winningTile = tile('discard-win', TileSuit.DOTS, 5)
  const discarder = player('discarder', 0, [])
  const winner1 = player('winner1', 1, waitingPengPengTiles('w1'))
  const winner2 = player('winner2', 2, waitingPengPengTiles('w2'))
  const nextPlayer = player('next', 3, waitingPengPengTiles('nx'))
  const game = baseGame([discarder, winner1, winner2, nextPlayer], winningTile)
  game.pendingActions = [
    { playerId: winner1.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 },
    { playerId: winner2.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 }
  ]

  await (gameManager as any).handleHu(game, winner1)

  test('首胡后保留其他可胡 pending', game.pendingActions.length === 1 && game.pendingActions[0].playerId === winner2.id)
  test('首胡后记录首胡玩家索引', game.multiHuStarterIndex === 1, `actual=${game.multiHuStarterIndex}`)
  test('首胡玩家状态变为 WON', winner1.status === PlayerStatus.WON)
}

// 用例2: 一炮多响中，剩余候选人 pass 后，应从首胡玩家右手继续
{
  const winningTile = tile('discard-win-2', TileSuit.DOTS, 5)
  const discarder = player('discarder2', 0, [])
  const winner1 = player('winnerA', 1, waitingPengPengTiles('wa'))
  const winner2 = player('winnerB', 2, waitingPengPengTiles('wb'))
  const nextPlayer = player('nextA', 3, waitingPengPengTiles('na'))
  const game = baseGame([discarder, winner1, winner2, nextPlayer], winningTile)
  game.pendingActions = [
    { playerId: winner1.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 },
    { playerId: winner2.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 }
  ]

  await (gameManager as any).handleHu(game, winner1)
  const winner2Before = winner2.hand.concealedTiles.length
  ;(gameManager as any).handlePass(game, winner2)

  test('剩余候选人 pass 后轮到首胡右手玩家', game.currentPlayerIndex === 2, `actual=${game.currentPlayerIndex}`)
  test('首胡右手玩家自动补摸一张', winner2.hand.concealedTiles.length === winner2Before + 1, `before=${winner2Before}, after=${winner2.hand.concealedTiles.length}`)
  test('继续牌局时 drawnThisTurn 被正确标记', game.drawnThisTurn === true)
}

// 用例3: 一炮多响中，多家都确认胡牌后，应从首胡右手的下一家继续
{
  const winningTile = tile('discard-win-3', TileSuit.DOTS, 5)
  const discarder = player('discarder3', 0, [])
  const winner1 = player('winnerC', 1, waitingPengPengTiles('wc'))
  const winner2 = player('winnerD', 2, waitingPengPengTiles('wd'))
  const nextPlayer = player('nextB', 3, waitingPengPengTiles('nb'))
  const game = baseGame([discarder, winner1, winner2, nextPlayer], winningTile)
  game.pendingActions = [
    { playerId: winner1.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 },
    { playerId: winner2.id, availableActions: [ActionType.HU, ActionType.PASS], tile: winningTile, expiresAt: Date.now() + 5000 }
  ]

  await (gameManager as any).handleHu(game, winner1)
  const nextBefore = nextPlayer.hand.concealedTiles.length
  await (gameManager as any).handleHu(game, winner2)

  test('多家都胡牌后轮到首胡右手的下一家', game.currentPlayerIndex === 3, `actual=${game.currentPlayerIndex}`)
  test('后一家获得继续摸牌', nextPlayer.hand.concealedTiles.length === nextBefore + 1, `before=${nextBefore}, after=${nextPlayer.hand.concealedTiles.length}`)
}

// 用例4: 抢杠无人胡时，所有人 pass 后应恢复补杠
{
  const concealedKongTile = tile('concealed-5', TileSuit.DOTS, 5)
  const kongPlayer = player(
    'konger',
    0,
    [concealedKongTile],
    [{
      type: MeldType.TRIPLET,
      tiles: [
        tile('meld-5a', TileSuit.DOTS, 5),
        tile('meld-5b', TileSuit.DOTS, 5),
        tile('meld-5c', TileSuit.DOTS, 5)
      ],
      isConcealed: false
    }]
  )
  const robber = player('robber', 1, waitingPengPengTiles('rb'))
  const idle1 = player('idle1', 2, waitingPengPengTiles('i1'))
  const idle2 = player('idle2', 3, waitingPengPengTiles('i2'))
  const game = baseGame([kongPlayer, robber, idle1, idle2])
  game.pendingKongClaim = { playerId: kongPlayer.id, tile: concealedKongTile }
  game.pendingActions = [
    { playerId: robber.id, availableActions: [ActionType.HU, ActionType.PASS], tile: concealedKongTile, expiresAt: Date.now() + 5000 }
  ]

  const concealedBefore = kongPlayer.hand.concealedTiles.length
  ;(gameManager as any).handlePass(game, robber)

  test('抢杠全员 pass 后清空 pendingKongClaim', !game.pendingKongClaim)
  test('补杠应恢复执行并升级为 KONG', kongPlayer.hand.exposedMelds.some((meld: any) => meld.type === MeldType.KONG && meld.tiles.length === 4))
  test('补杠后补牌保持手牌张数平衡', kongPlayer.hand.concealedTiles.length === concealedBefore, `before=${concealedBefore}, after=${kongPlayer.hand.concealedTiles.length}`)
}

console.log('\n==================================================')
console.log(`测试结果: ${passed} 通过, ${failed} 失败`)
if (failed > 0) {
  process.exit(1)
}
console.log('极端流程专项回归通过')
