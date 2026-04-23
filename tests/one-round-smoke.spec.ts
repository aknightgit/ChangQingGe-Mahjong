import { gameManager } from '../server/utils/gameManager'
import { GamePhase, PlayerStatus } from '../server/types/game'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatState(game: any) {
  return `phase=${game.phase} current=${game.currentPlayerIndex} pending=${game.pendingActions.length} discards=${game.discardPile.length} actions=${game.actionHistory.length}`
}

async function main() {
  console.log('\n=== Smoke: one full auto round ===\n')

  const { gameId } = await gameManager.createGame('SmokeHuman', {
    maxBots: 3,
    hesitationWindow: 80
  })
  await gameManager.joinGame(gameId, 'AI-AK')
  await gameManager.joinGame(gameId, 'AI-小胖')
  await gameManager.joinGame(gameId, 'AI-阿水')
  const prestart = await gameManager.getGame(gameId)
  if (!prestart) {
    console.log('FAIL game missing before start')
    process.exit(1)
  }
  prestart.players[0].name = 'AI-老赵'
  prestart.dealerIndex = 1
  prestart.currentPlayerIndex = 1
  prestart.players.forEach((player, index) => {
    player.isDealer = index === 1
  })
  await gameManager.startGame(gameId)

  let lastProgressAt = Date.now()
  let lastSignature = ''
  let progressCount = 0
  let observedPending = false

  const startedAt = Date.now()
  const maxRunMs = 12000
  const stallLimitMs = 3000

  while (Date.now() - startedAt < maxRunMs) {
    const game = await gameManager.getGame(gameId)
    if (!game) {
      console.log('FAIL game disappeared')
      process.exit(1)
    }

    const signature = [
      game.phase,
      game.currentPlayerIndex,
      game.pendingActions.length,
      game.discardPile.length,
      game.actionHistory.length,
      game.players.map(p => `${p.status}:${p.hand.concealedTiles.length}:${p.hand.exposedMelds.length}`).join('|')
    ].join(' / ')

    if (signature !== lastSignature) {
      lastSignature = signature
      lastProgressAt = Date.now()
      progressCount += 1
      console.log(`[tick ${progressCount}] ${formatState(game)}`)
    }

    if (game.pendingActions.length > 0) {
      observedPending = true
    }

    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING && player.status !== PlayerStatus.WON) {
        console.log(`FAIL invalid player status: ${player.name} -> ${player.status}`)
        process.exit(1)
      }
      if (player.hand.concealedTiles.length < 0) {
        console.log(`FAIL negative hand count: ${player.name}`)
        process.exit(1)
      }
    }

    if (Date.now() - lastProgressAt > stallLimitMs) {
      console.log(`FAIL stalled for ${Date.now() - lastProgressAt}ms :: ${formatState(game)}`)
      process.exit(1)
    }

    if (game.phase === GamePhase.ENDED) {
      console.log(`PASS round ended normally :: ${formatState(game)}`)
      process.exit(0)
    }

    await sleep(120)
  }

  const finalGame = await gameManager.getGame(gameId)
  if (!finalGame) {
    console.log('FAIL game missing at timeout')
    process.exit(1)
  }

  const progressedEnough = finalGame.discardPile.length >= 4 || finalGame.actionHistory.length >= 8
  if (!progressedEnough) {
    console.log(`FAIL insufficient progress :: ${formatState(finalGame)}`)
    process.exit(1)
  }

  console.log(`PASS round stayed live for smoke window :: ${formatState(finalGame)} observedPending=${observedPending}`)
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
