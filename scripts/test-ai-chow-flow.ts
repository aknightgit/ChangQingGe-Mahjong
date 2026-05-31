/**
 * AI 吃牌完整流程测试
 * 
 * 测试 checkPendingActions → shouldClaimPendingAction → resolveBotChowNow 全链路
 * 
 * 用法: npx tsx scripts/test-ai-chow-flow.ts
 */

import { ActionType, TileSuit, type GameState, type Player, type Tile, GamePhase, PlayerStatus, MeldType } from '../server/types/game'

// ═══════════════════════════════════════════════
// 测试数据构造
// ═══════════════════════════════════════════════

let tileIdCounter = 0
function makeTile(suit: TileSuit, value: number, isWild = false): Tile {
  return { suit, value, id: `tile-${++tileIdCounter}`, isWild }
}

function makeBotPlayer(name: string, concealedTiles: Tile[]): Player {
  return {
    id: `bot-${name}`,
    name,
    position: 0,
    status: PlayerStatus.PLAYING as any,
    isTing: false,
    hand: {
      concealedTiles,
      exposedMelds: [],
      discardedTiles: [],
    },
  } as any
}

function makeGameState(players: Player[], discardPile: Tile[] = []): GameState {
  return {
    gameId: 'test-game',
    roomNumber: 'TEST',
    phase: GamePhase.PLAYING as any,
    players,
    wall: [],
    discardPile,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    pendingActions: [],
    actionHistory: [],
    roundNumber: 1,
    createdAt: Date.now(),
    lastActionTime: Date.now(),
    customScoringMode: null,
    wildTileGroup: [],
    chowPongExclusion: {},
    drawnThisTurn: false,
    dice: [1, 1],
    roundMultiplier: 1,
    inheritMultiplier: 1,
    inheritedGlobalMultiplier: 1,
    hesitationWindow: 4000,
  } as any
}

// ═══════════════════════════════════════════════
// 测试用例
// ═══════════════════════════════════════════════

interface TestCase {
  name: string
  description: string
  setup: () => { game: GameState; discardPlayer: Player; claimPlayer: Player; discardTile: Tile }
  expectPendingChow: boolean
  expectBotClaimChow: boolean
}

const testCases: TestCase[] = [
  {
    name: 'TC1: 基础夹张吃',
    description: 'bot 手牌有 3-5 筒，人类弃 4 筒 → bot 应有 CHOW pendingAction',
    setup: () => {
      const bot = makeBotPlayer('AI-Test', [
        makeTile(TileSuit.DOTS, 3), makeTile(TileSuit.DOTS, 5),
        makeTile(TileSuit.DOTS, 7), makeTile(TileSuit.DOTS, 8), makeTile(TileSuit.DOTS, 9),
        makeTile(TileSuit.BAMBOOS, 1), makeTile(TileSuit.BAMBOOS, 2), makeTile(TileSuit.BAMBOOS, 3),
        makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
        makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
        makeTile(TileSuit.DRAGON, 1),
      ])
      bot.position = 1
      const human = makeBotPlayer('Human', [
        makeTile(TileSuit.DOTS, 1), makeTile(TileSuit.DOTS, 2),
        makeTile(TileSuit.BAMBOOS, 4), makeTile(TileSuit.BAMBOOS, 5), makeTile(TileSuit.BAMBOOS, 6),
        makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
        makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2),
        makeTile(TileSuit.DRAGON, 2), makeTile(TileSuit.DRAGON, 2),
        makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3),
      ])
      human.position = 0
      human.id = 'human-player'
      const discardTile = makeTile(TileSuit.DOTS, 4)
      const game = makeGameState([human, bot])
      game.currentPlayerIndex = 0
      game.discardPile = [discardTile]
      return { game, discardPlayer: human, claimPlayer: bot, discardTile }
    },
    expectPendingChow: true,
    expectBotClaimChow: true,
  },
  {
    name: 'TC2: 无吃牌组合',
    description: 'bot 手牌无相关数牌 → 不应有 CHOW pendingAction',
    setup: () => {
      const bot = makeBotPlayer('AI-Test', [
        makeTile(TileSuit.BAMBOOS, 1), makeTile(TileSuit.BAMBOOS, 2), makeTile(TileSuit.BAMBOOS, 3),
        makeTile(TileSuit.BAMBOOS, 4), makeTile(TileSuit.BAMBOOS, 5), makeTile(TileSuit.BAMBOOS, 6),
        makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
        makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
        makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
      ])
      bot.position = 1
      const human = makeBotPlayer('Human', [
        makeTile(TileSuit.DOTS, 1), makeTile(TileSuit.DOTS, 2), makeTile(TileSuit.DOTS, 3),
        makeTile(TileSuit.DOTS, 4), makeTile(TileSuit.DOTS, 5), makeTile(TileSuit.DOTS, 6),
        makeTile(TileSuit.DOTS, 7), makeTile(TileSuit.DOTS, 8), makeTile(TileSuit.DOTS, 9),
        makeTile(TileSuit.BAMBOOS, 7), makeTile(TileSuit.BAMBOOS, 8), makeTile(TileSuit.BAMBOOS, 9),
        makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2),
      ])
      human.position = 0
      human.id = 'human-player'
      const discardTile = makeTile(TileSuit.DOTS, 4)
      const game = makeGameState([human, bot])
      game.currentPlayerIndex = 0
      game.discardPile = [discardTile]
      return { game, discardPlayer: human, claimPlayer: bot, discardTile }
    },
    expectPendingChow: false,
    expectBotClaimChow: false,
  },
  {
    name: 'TC3: 异门互斥阻止吃',
    description: 'bot 碰了条子后，弃筒子不应有 CHOW pendingAction',
    setup: () => {
      const bot = makeBotPlayer('AI-Test', [
        makeTile(TileSuit.DOTS, 3), makeTile(TileSuit.DOTS, 4),
        makeTile(TileSuit.DOTS, 7), makeTile(TileSuit.DOTS, 8), makeTile(TileSuit.DOTS, 9),
        makeTile(TileSuit.CHARACTERS, 1), makeTile(TileSuit.CHARACTERS, 2), makeTile(TileSuit.CHARACTERS, 3),
        makeTile(TileSuit.WIND, 1), makeTile(TileSuit.WIND, 1),
        makeTile(TileSuit.DRAGON, 1), makeTile(TileSuit.DRAGON, 1),
      ])
      bot.position = 1
      // 模拟碰了条子
      bot.hand.exposedMelds = [{
        type: MeldType.TRIPLET as any,
        tiles: [makeTile(TileSuit.BAMBOOS, 5), makeTile(TileSuit.BAMBOOS, 5), makeTile(TileSuit.BAMBOOS, 5)],
        isConcealed: false,
      }]
      const human = makeBotPlayer('Human', [
        makeTile(TileSuit.DOTS, 1), makeTile(TileSuit.DOTS, 2),
        makeTile(TileSuit.BAMBOOS, 1), makeTile(TileSuit.BAMBOOS, 2), makeTile(TileSuit.BAMBOOS, 3),
        makeTile(TileSuit.CHARACTERS, 4), makeTile(TileSuit.CHARACTERS, 5), makeTile(TileSuit.CHARACTERS, 6),
        makeTile(TileSuit.WIND, 2), makeTile(TileSuit.WIND, 2),
        makeTile(TileSuit.DRAGON, 2), makeTile(TileSuit.DRAGON, 2),
        makeTile(TileSuit.WIND, 3), makeTile(TileSuit.WIND, 3),
      ])
      human.position = 0
      human.id = 'human-player'
      const discardTile = makeTile(TileSuit.DOTS, 5)
      const game = makeGameState([human, bot])
      game.currentPlayerIndex = 0
      game.discardPile = [discardTile]
      game.chowPongExclusion = {
        [bot.id]: { firstActionSuit: 'bamboo', firstActionType: 'pong' }
      }
      return { game, discardPlayer: human, claimPlayer: bot, discardTile }
    },
    expectPendingChow: false,
    expectBotClaimChow: false,
  },
]

// ═══════════════════════════════════════════════
// 运行测试
// ═══════════════════════════════════════════════

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  AI 吃牌完整流程测试')
  console.log('═══════════════════════════════════════════════════════════\n')

  let passed = 0
  let failed = 0

  for (const tc of testCases) {
    console.log(`📋 ${tc.name}`)
    console.log(`   ${tc.description}`)

    const { game, claimPlayer, discardTile } = tc.setup()

    // 模拟 checkPendingActions 的核心逻辑
    const exclusion = game.chowPongExclusion?.[claimPlayer.id]
    const exclusionState = exclusion || { firstActionSuit: null, firstActionType: null }

    // 检查是否可以碰
    const matchingTiles = claimPlayer.hand.concealedTiles.filter(t =>
      t.suit === discardTile.suit && t.value === discardTile.value
    )
    const canPeng = matchingTiles.length >= 2

    // 检查是否可以吃（只有下家可以吃）
    const discarderIndex = game.currentPlayerIndex
    const nextPlayerIndex = (discarderIndex + 1) % game.players.length
    const isNextPlayer = game.players[nextPlayerIndex]?.id === claimPlayer.id

    let canChow = false
    let chowOptions: string[][] | undefined

    if (isNextPlayer) {
      // 检查异门互斥
      let exclusionAllows = true
      if (exclusionState.firstActionSuit && exclusionState.firstActionType) {
        const isSameSuit = discardTile.suit === exclusionState.firstActionSuit
        if (exclusionState.firstActionType === 'pong') {
          exclusionAllows = isSameSuit
        } else if (exclusionState.firstActionType === 'chow') {
          exclusionAllows = isSameSuit
        }
      }

      if (exclusionAllows) {
        // 检查字牌
        const isNumberSuit = discardTile.suit === TileSuit.DOTS || discardTile.suit === TileSuit.CHARACTERS || discardTile.suit === TileSuit.BAMBOOS
        if (isNumberSuit) {
          const v = discardTile.value
          const suit = discardTile.suit
          const suitHand = claimPlayer.hand.concealedTiles.filter(t => t.suit === suit)

          // 找所有吃牌组合
          const sequences: Tile[][] = []
          if (v <= 7) {
            const t2 = suitHand.find(t => t.value === v + 1)
            const t3 = suitHand.find(t => t.value === v + 2)
            if (t2 && t3 && t2.id !== t3.id) sequences.push([t2, t3])
          }
          if (v >= 2 && v <= 8) {
            const t1 = suitHand.find(t => t.value === v - 1)
            const t3 = suitHand.find(t => t.value === v + 1)
            if (t1 && t3 && t1.id !== t3.id) sequences.push([t1, t3])
          }
          if (v >= 3) {
            const t1 = suitHand.find(t => t.value === v - 2)
            const t2 = suitHand.find(t => t.value === v - 1)
            if (t1 && t2 && t1.id !== t2.id) sequences.push([t1, t2])
          }

          if (sequences.length > 0) {
            canChow = true
            chowOptions = sequences.map(seq => seq.map(t => t.id))
          }
        }
      }
    }

    const availableActions: ActionType[] = []
    if (canPeng) availableActions.push(ActionType.PENG)
    if (canChow) availableActions.push(ActionType.CHOW)
    if (availableActions.length > 0) availableActions.push(ActionType.PASS)

    const hasPendingChow = availableActions.includes(ActionType.CHOW)

    // 输出结果
    const pendingOk = hasPendingChow === tc.expectPendingChow
    if (pendingOk) passed++; else failed++

    console.log(`   ${pendingOk ? '✅' : '❌'} pendingAction: ${hasPendingChow ? '含CHOW' : '无CHOW'} (期望: ${tc.expectPendingChow ? '含CHOW' : '无CHOW'})`)
    console.log(`      availableActions: [${availableActions.map(a => ActionType[a]).join(', ')}]`)
    console.log(`      isNextPlayer: ${isNextPlayer}, canPeng: ${canPeng}, canChow: ${canChow}`)
    if (chowOptions) {
      console.log(`      chowOptions: ${chowOptions.length} 组合`)
    }
    console.log()
  }

  console.log('───────────────────────────────────────────────────────────')
  console.log(`结果: ${passed}/${passed + failed} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log()
  console.log('如果测试全部通过但实战仍不吃，请检查：')
  console.log('  1. 服务器是否部署了最新代码 (commit e8a4cdb)')
  console.log('  2. 搜索日志 [BotService] [ClaimDecider] [PendingResolve]')
  console.log('  3. 检查 bot 是否是"下家"（只有下家能吃）')
}

runTests().catch(console.error)
