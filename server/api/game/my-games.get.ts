import { gameManager } from '../../utils/gameManager';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const user = await resolveUserFromEvent(event);

  // 查找该玩家参与的所有活跃牌局
  const allGames = await gameManager.listGames();
  const myGames: any[] = [];

  for (const game of allGames) {
    if (game.phase === 'ended') continue;
    // waiting 状态且超过30分钟不活跃的房间不展示
    if (game.phase === 'waiting' && game.updatedAt) {
      const staleThreshold = Date.now() - 30 * 60 * 1000
      const updatedAt = typeof game.updatedAt === 'number' ? game.updatedAt : game.updatedAt.getTime?.()
      if (updatedAt && updatedAt < staleThreshold) continue
    }
    const playerInGame = game.players.find(p => p.userId === user.userId);
    if (!playerInGame) continue;

    const isBotMode = gameManager.isPlayerInBotMode(playerInGame.id);
    myGames.push({
      gameId: game.gameId,
      roomNumber: game.roomNumber,
      phase: game.phase,
      playerCount: game.players.length,
      players: game.players.map(p => ({
        name: p.name,
        position: p.position,
        status: p.status
      })),
      myPlayerId: playerInGame.id,
      isBotMode,
      isMyTurn: game.phase === 'playing' && game.players[game.currentPlayerIndex]?.id === playerInGame.id,
      createdAt: game.createdAt
    });
  }

  // 按创建时间倒序（最新的在前）
  myGames.sort((a, b) => b.createdAt - a.createdAt);

  return { success: true, data: { games: myGames } };
});
