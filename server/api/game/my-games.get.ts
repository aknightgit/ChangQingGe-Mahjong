import { gameManager } from '../../utils/gameManager';
import { UserService } from '../../services/userService';
import { AuthService } from '../../services/authService';

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token');
  if (!token) {
    return { success: true, data: { games: [] } };
  }

  const userId = await AuthService.validateSession(token);
  if (!userId) {
    return { success: true, data: { games: [] } };
  }

  const user = await UserService.getUserById(userId);
  if (!user) {
    return { success: true, data: { games: [] } };
  }

  // 查找该玩家参与的所有活跃牌局
  const allGames = await gameManager.listGames();
  const myGames: any[] = [];

  for (const game of allGames) {
    if (game.phase === 'ended') continue;
    const playerInGame = game.players.find(p => p.name === user.name);
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
