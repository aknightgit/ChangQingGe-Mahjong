import { loadActiveGameStates } from "../utils/gamePersistence"
import { gameManager } from "../utils/gameManager"

export default defineNitroPlugin(() => {
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
    } catch (err: any) {
      console.warn("[StartupRecovery] Failed to load active games:", err.message)
    }
  }, 3000)
})
