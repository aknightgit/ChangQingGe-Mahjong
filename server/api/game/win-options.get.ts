import { gameManager } from '../../utils/gameManager';
import { generateWinOptions } from '../../utils/scoring';
import { TileSuit } from '../../types/game';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query as { gameId?: string; playerId?: string };

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

    const player = game.players.find(p => p.id === playerId);
    if (!player) throw createError({ statusCode: 404, message: 'Player not found' });

    const handTiles = player.hand.concealedTiles;
    const melds = player.hand.exposedMelds;
    const flowerTiles = handTiles.filter(t => t.suit === TileSuit.FLOWER);

    const winOptions = generateWinOptions({
      handTiles,
      exposedMelds: melds,
      flowerTiles,
      handTypes: [],
      isKongFlower: false,
      isRobbingKong: false,
      isMenQing: melds.length === 0,
      rawRoundMultiplier: game.roundMultiplier || 1,
      rawInheritMultiplier: game.inheritMultiplier || 1,
    });

    // 按分数降序排列
    winOptions.sort((a, b) => b.score - a.score);

    return { success: true, winOptions };
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || 'Failed to get win options' });
  }
});
