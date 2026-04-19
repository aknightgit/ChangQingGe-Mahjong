import { randomUUID } from 'crypto'
import { gameManager } from '../../utils/gameManager'

type SeedScenario = 'self-draw-bailout' | 'discard-flow'

function buildSelfDrawRound(owner: any, others: any[]) {
  return {
    roundNumber: 1,
    scores: {
      [owner.id]: 120,
      [others[0].id]: -80,
      [others[1].id]: -20,
      [others[2].id]: -20
    },
    winners: [owner.id],
    selfDraws: [owner.id],
    diceMultiplier: 2,
    inheritMultiplier: 4,
    effectiveMultiplier: 8,
    settlementMultiplier: 8,
    overflowCarryMultiplierNextRound: 2,
    bailoutRelations: [
      {
        player1: owner.id,
        player1Name: owner.name,
        player2: others[0].id,
        player2Name: others[0].name,
        type: '三口'
      }
    ],
    winnerDetails: [
      {
        playerId: owner.id,
        playerName: owner.name,
        handTypeName: '碰碰胡',
        isSelfDrawn: true,
        baseFan: 10,
        extraMultipliers: 2,
        diceMultiplier: 2,
        inheritMultiplier: 4,
        effectiveMultiplier: 8,
        settlementMultiplier: 8,
        finalPoints: 20,
        details: [
          '无百搭 ×2',
          '门清 ×2',
          '有效倍率 = min(8, 骰子倍数2 × 继承倍数4) = 8',
          '最终 = 10 × 2 × 8 × 8 = 1280'
        ]
      }
    ],
    transfers: [
      {
        fromPlayerId: others[0].id,
        fromPlayerName: others[0].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 80,
        reason: '自摸互包赔付×3',
        bailoutType: '三口'
      },
      {
        fromPlayerId: others[1].id,
        fromPlayerName: others[1].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 20,
        reason: '自摸赔付'
      },
      {
        fromPlayerId: others[2].id,
        fromPlayerName: others[2].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 20,
        reason: '自摸赔付'
      }
    ],
    specialEvents: [
      {
        type: 'leading_brother',
        fromPlayerId: others[2].id,
        fromPlayerName: others[2].name,
        totalAmount: 30,
        amountPerPlayer: 10
      }
    ]
  }
}

function buildDiscardRound(owner: any, others: any[]) {
  return {
    roundNumber: 1,
    scores: {
      [owner.id]: 96,
      [others[0].id]: -64,
      [others[1].id]: -32,
      [others[2].id]: 0
    },
    winners: [owner.id],
    selfDraws: [],
    diceMultiplier: 2,
    inheritMultiplier: 2,
    effectiveMultiplier: 4,
    settlementMultiplier: 8,
    overflowCarryMultiplierNextRound: 1,
    bailoutRelations: [
      {
        player1: owner.id,
        player1Name: owner.name,
        player2: others[1].id,
        player2Name: others[1].name,
        type: '三口'
      }
    ],
    winnerDetails: [
      {
        playerId: owner.id,
        playerName: owner.name,
        handTypeName: '混一色',
        isSelfDrawn: false,
        discarderId: others[0].id,
        discarderName: others[0].name,
        baseFan: 12,
        extraMultipliers: 1,
        diceMultiplier: 2,
        inheritMultiplier: 2,
        effectiveMultiplier: 4,
        settlementMultiplier: 8,
        finalPoints: 8,
        details: [
          '固定基础番达到12',
          '有效倍率 = min(8, 骰子倍数2 × 继承倍数2) = 4',
          '最终 = 12 × 1 × 4 × 8 = 384'
        ]
      }
    ],
    transfers: [
      {
        fromPlayerId: others[0].id,
        fromPlayerName: others[0].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 64,
        reason: '放冲赔付'
      },
      {
        fromPlayerId: others[1].id,
        fromPlayerName: others[1].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 32,
        reason: '第三方互包补赔×1',
        bailoutType: '三口'
      }
    ],
    specialEvents: []
  }
}

export default defineEventHandler(async (event) => {
  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true'
  if (!debugRoutesEnabled) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const body = await readBody(event).catch(() => ({}))
  const scenario = (
    typeof body?.scenario === 'string' ? body.scenario : 'self-draw-bailout'
  ) as SeedScenario
  if (!['self-draw-bailout', 'discard-flow'].includes(scenario)) {
    throw createError({ statusCode: 400, message: 'Unknown seed scenario' })
  }

  const debugAccessToken = randomUUID()
  const { gameId, playerId } = await gameManager.createGame('OverlayUser', {
    userId: `debug-${scenario}-owner`,
    diceRollCount: 5,
    liangShanThreshold: 4800,
    settlementMultiplier: 8,
    maxBots: 3,
    hesitationWindow: 5000
  })

  const botNames = ['AI-小胖', 'AI-老赵', 'AI-AK']
  for (const botName of botNames) {
    await gameManager.joinGame(gameId, botName)
  }

  await gameManager.startGame(gameId, { hesitationWindow: 5000 })
  const game = await gameManager.getGame(gameId)
  if (!game) {
    throw createError({ statusCode: 500, message: 'Failed to seed game' })
  }

  ;(game as any).debugAccessToken = debugAccessToken

  const owner = game.players.find((player) => player.id === playerId)
  const others = game.players.filter((player) => player.id !== playerId)
  if (!owner || others.length < 3) {
    throw createError({ statusCode: 500, message: 'Seeded game players mismatch' })
  }

  game.roundStats = [
    scenario === 'discard-flow'
      ? buildDiscardRound(owner, others)
      : buildSelfDrawRound(owner, others)
  ]

  return {
    success: true,
    data: {
      gameId,
      playerId,
      roomNumber: game.roomNumber,
      debugAccessToken,
      scenario
    }
  }
})
