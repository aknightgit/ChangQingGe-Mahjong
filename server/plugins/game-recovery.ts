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
    } catch (err: any) {
      console.warn("[PeriodicCleanup] Error:", err.message)
    }
  }, 5 * 60 * 1000)
})
