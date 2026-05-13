import { getCollection } from '../../utils/mongo'
import type { MahjongGame } from '../../types/database'

interface WaitingGameSummary {
  gameId: string
  roomNumber?: string
  playerCount: number
  updatedAt: string
  createdAt: string
  dealerName: string | null
}

export default defineEventHandler(async () => {
  const gamesCollection = await getCollection<MahjongGame>('mahjongGames')

  // 只返回 waiting 状态且 30 分钟内活跃的房间
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000)

  const waitingGames = await gamesCollection
    .find({
      phase: 'waiting',
      updatedAt: { $gte: staleThreshold }
    })
    .sort({ updatedAt: -1 })
    .limit(25)
    .toArray()

  const summaries: WaitingGameSummary[] = waitingGames.map((game) => ({
    gameId: game.gameId,
    roomNumber: (game as any).roomNumber,
    playerCount: game.players.length,
    createdAt: game.createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    updatedAt: game.updatedAt?.toISOString?.() ?? new Date(0).toISOString(),
    dealerName: game.players.find((p) => p.isDealer)?.name ?? null
  }))

  return {
    success: true,
    data: {
      games: summaries
    }
  }
})
