import { getCollection } from '../../utils/mongo'
import type { RoundStat } from '../../types/game'

type TrainingRoundPlayer = {
  id: string
  name: string
  status: string
}

type TrainingRoundRecord = {
  gameId: string
  roomId: string
  roomNumber?: string
  roundNumber: number
  recordedAt: Date
  endReason: string | null
  finalScores?: Record<string, number>
  initialSnapshot?: {
    players?: TrainingRoundPlayer[]
  }
  roundStat?: RoundStat
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const playerId = typeof query.playerId === 'string' ? query.playerId : undefined
  const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined
  const limit = Number.isFinite(limitParam) && limitParam! > 0 ? limitParam! : 60

  const collection = await getCollection<TrainingRoundRecord>('mahjongTrainingRounds')
  const filter = playerId
    ? { 'initialSnapshot.players.id': playerId }
    : {}

  const rounds = await collection
    .find(filter)
    .sort({ recordedAt: -1, roundNumber: -1 })
    .limit(limit)
    .toArray()

  const data = rounds.map((round) => {
    const players = Array.isArray(round.initialSnapshot?.players) ? round.initialSnapshot!.players! : []
    const scores = round.finalScores || round.roundStat?.scores || {}
    const winners = Array.isArray(round.roundStat?.winnerDetails) ? round.roundStat!.winnerDetails! : []
    const winnerIds = new Set(winners.map((winner: any) => winner.playerId))
    const winnerNames = winners
      .sort((a: any, b: any) => {
        const orderA = Number.isFinite(Number(a?.winOrder)) ? Number(a.winOrder) : Number.MAX_SAFE_INTEGER
        const orderB = Number.isFinite(Number(b?.winOrder)) ? Number(b.winOrder) : Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
      .map((winner: any) => winner.playerName)

    return {
      gameId: round.gameId,
      roomId: round.roomId,
      roomNumber: round.roomNumber || round.roomId,
      roundNumber: round.roundNumber,
      recordedAt: round.recordedAt,
      endReason: round.endReason,
      winnerNames,
      players: players.map((player) => ({
        playerId: player.id,
        name: player.name,
        status: player.status,
        isWinner: winnerIds.has(player.id),
        score: Number(scores[player.id] ?? 0),
      })),
    }
  })

  return {
    success: true,
    data,
  }
})
