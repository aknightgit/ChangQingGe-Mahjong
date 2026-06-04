import { loadActiveGameStates } from "../utils/gamePersistence"
import { gameManager } from "../utils/gameManager"
import { cleanupStaleGames } from "../services/cleanupService"

export default defineNitroPlugin(() => {
  // Phase 1: Recover active games (3s delay for DB readiness)
  setTimeout(async () => {
    try {
      const games = await loadActiveGameStates()
      const playing = games.filter(g => g.phase === "playing")
      console.log("[StartupRecovery] Found " + playing.length + " active games, recovering...")

      for (const game of playing) {
        try {
          await gameManager.ensureGameLoaded(game.gameId)
          // ★ 修复卡死: winnersCount>=3 但还在 playing 阶段 → REVEAL 定时器丢失，强制 endRound
          if (game.winnersCount >= 3 && game.phase === 'playing') {
            console.log(`[StartupRecovery] Game ${game.roomNumber || game.gameId} has ${game.winnersCount} winners but still playing, forcing REVEAL→END`)
            game.phase = 'reveal'
            await gameManager.endRound(game, 'last_player' as any)
            // ★ 强制刷盘: endRound 的 flushGameNow 可能不更新 MongoDB phase 字段
            try {
              const { getDb } = await import("../utils/mongo")
              const db = await getDb()
              await db.collection("mahjongGames").updateOne(
                { gameId: game.gameId },
                { $set: { phase: game.phase, endReason: game.endReason, finalScores: game.finalScores, endedAt: game.endedAt } }
              )
              console.log(`[StartupRecovery] Persisted ${game.roomNumber} phase=${game.phase} to MongoDB`)
            } catch (e: any) {
              console.warn(`[StartupRecovery] MongoDB persist failed for ${game.roomNumber}:`, e.message)
            }
          }
          console.log("[StartupRecovery] Recovered game " + (game.roomNumber || game.gameId))
        } catch (err: any) {
          console.warn("[StartupRecovery] Failed to recover " + (game.roomNumber || game.gameId) + ":", err.message)
        }
      }
      console.log("[StartupRecovery] Recovery complete for " + playing.length + " games")

      // Phase 2: Clean up stale games
      const result = await cleanupStaleGames()
      console.log("[StartupCleanup] Removed " + result.cleanedMongo + " stale games from DB, " + result.cleanedMemory + " from memory")

    } catch (err: any) {
      console.warn("[StartupRecovery] Failed to load active games:", err.message)
    }
  }, 3000)

  // Phase 3: Periodic cleanup every 5 minutes
  setInterval(async () => {
    try {
      const result = await cleanupStaleGames()
      if (result.cleanedMongo > 0 || result.cleanedMemory > 0) {
        console.log("[PeriodicCleanup] Removed " + result.cleanedMongo + " stale games from DB, " + result.cleanedMemory + " from memory")
      }
      // ★ 修复卡死: 检查 playing 阶段但 winnersCount>=3 的游戏
      const { loadActiveGameStates } = await import("../utils/gamePersistence")
      const games = await loadActiveGameStates()
      for (const game of games.filter(g => g.phase === 'playing' && g.winnersCount >= 3)) {
        console.log(`[PeriodicCleanup] Stuck game ${game.roomNumber}: ${game.winnersCount} winners, forcing endRound`)
        try {
          game.phase = 'reveal'
          await gameManager.endRound(game, 'last_player' as any)
        } catch (e: any) {
          console.warn(`[PeriodicCleanup] Failed to fix stuck game ${game.roomNumber}:`, e.message)
        }
      }
    } catch (err: any) {
      console.warn("[PeriodicCleanup] Error:", err.message)
    }
  }, 5 * 60 * 1000)
})
