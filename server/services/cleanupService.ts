import { getCollection } from '../utils/mongo'
import type { MahjongGame } from '../types/database'

/**
 * 清理残留牌局：
 * 1. 只有 AI 玩家且超过 30 分钟无操作的牌局 → 标记为 ended
 * 2. 有真实玩家的牌局超过 2 小时无操作 → 标记为 ended
 * 3. 同时从内存中卸载
 */
export async function cleanupStaleGames(): Promise<{ cleanedMongo: number; cleanedMemory: number }> {
  const collection = await getCollection<MahjongGame>('mahjongGames')
  if (!collection) return { cleanedMongo: 0, cleanedMemory: 0 }

  const now = Date.now()
  const THIRTY_MIN = 30 * 60 * 1000
  const TWO_HOURS = 2 * 60 * 60 * 1000

  const games = await collection.find({
    phase: { $nin: ['ended', 'finished'] }
  }).project({
    gameId: 1,
    phase: 1,
    players: 1,
    lastActionTime: 1,
    createdAt: 1,
    roomNumber: 1,
  }).toArray()

  let cleanedMongo = 0

  for (const game of games) {
    const lastActive = game.lastActionTime || game.createdAt
    if (!lastActive) continue
    const idleMs = now - new Date(lastActive).getTime()

    const hasRealPlayer = (game.players || []).some((p: any) => {
      if (!p.name) return false
      return !p.name.startsWith('AI-')
    })

    let shouldClean = false
    if (!hasRealPlayer && idleMs > THIRTY_MIN) {
      shouldClean = true
    } else if (idleMs > TWO_HOURS) {
      shouldClean = true
    }

    if (shouldClean && game.gameId) {
      // Mark ended in DB
      await collection.updateOne(
        { gameId: game.gameId },
        { $set: { phase: 'ended', endedAt: new Date(), updatedAt: new Date() } }
      )
      cleanedMongo++
      console.log(`[Cleanup] Ended game #${game.roomNumber} (${game.gameId.slice(0, 8)}...) idle=${Math.round(idleMs / 60000)}min hasPlayer=${hasRealPlayer}`)
    }
  }

  // Clean in-memory: remove from GameManager's maps
  let cleanedMemory = 0
  try {
    const { gameManager } = await import('../utils/gameManager')
    for (const game of games) {
      if (!game.gameId) continue
      const lastActive = game.lastActionTime || game.createdAt
      if (!lastActive) continue
      const idleMs = now - new Date(lastActive).getTime()
      const hasRealPlayer = (game.players || []).some((p: any) => !p.name?.startsWith('AI-'))

      let shouldClean = false
      if (!hasRealPlayer && idleMs > THIRTY_MIN) {
        shouldClean = true
      } else if (idleMs > TWO_HOURS) {
        shouldClean = true
      }

      if (shouldClean) {
        // Check if game is in memory
        if (gameManager.games?.has(game.gameId)) {
          const gameState = gameManager.games.get(game.gameId)
          // Remove players from playerToGame map
          for (const player of gameState?.players || []) {
            gameManager.playerToGame?.delete(player.id)
          }
          gameManager.games.delete(game.gameId)
          cleanedMemory++
        }
      }
    }
  } catch (e: any) {
    console.warn('[Cleanup] Memory cleanup error:', e.message)
  }

  return { cleanedMongo, cleanedMemory }
}
