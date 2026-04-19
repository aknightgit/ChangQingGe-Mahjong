import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, viewingPlayerId } = body;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and Player ID are required'
    });
  }

  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' });
  }

  const { player } = await requireGamePlayerAccess(event, game, playerId);

  if (player.status !== 'won') {
    throw createError({ statusCode: 400, message: '只有已胡牌的玩家可以进入观战模式' });
  }

  if (viewingPlayerId) {
    const target = game.players.find(p => p.id === viewingPlayerId);
    if (!target || (target.status !== 'playing' && target.status !== 'won')) {
      throw createError({ statusCode: 400, message: '目标玩家不在游戏中' });
    }
    game.spectatorMode = { playerId, viewingPlayerId };
    console.log(`[Spectator] ${player.name} 观战 ${target.name}`);
  } else {
    game.spectatorMode = null;
    console.log(`[Spectator] ${player.name} 退出观战`);
  }

  (gameManager as any).broadcastGameState(gameId);

  return { success: true };
});
