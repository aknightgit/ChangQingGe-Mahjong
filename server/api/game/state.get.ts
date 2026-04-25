import { gameManager } from '../../utils/gameManager';
import { TileSuit } from '../../types/game';
import { requireGamePlayerAccess } from '../../utils/session';
import { canRevealSpectatorTarget } from '../../utils/spectatorView';

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game.inheritMultiplier ?? game.inheritedGlobalMultiplier ?? 1;
  const round = game.roundMultiplier ?? 1;
  return Math.min(inherit * round, 8);
}

function getCurrentRoundNumber(game: any): number {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === 'ended' ? Math.max(1, completedRounds) : completedRounds + 1;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId, debugAccessToken } = query;

  if (!gameId || !playerId) {
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const normalizedGameId = gameId as string;
  const normalizedPlayerId = playerId as string;

  let game;
  try {
    game = await gameManager.getGame(normalizedGameId);
  } catch (err: any) {
    console.warn('⚠️ getGame failed:', err.message);
    game = undefined;
  }

  if (!game) {
    throw createError({
      statusCode: 404,
      message: 'Game not found'
    });
  }

  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true';
  const isDebugBypass =
    debugRoutesEnabled &&
    typeof debugAccessToken === 'string' &&
    (game as any).debugAccessToken === debugAccessToken;

  const access = isDebugBypass
    ? {
        player: game.players.find((entry) => entry.id === normalizedPlayerId),
        isAdmin: true
      }
    : await requireGamePlayerAccess(event, game, normalizedPlayerId, { allowAdmin: true });

  if (!access.player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    });
  }

  const { player, isAdmin } = access;

  let availableActions: string[] = [];
  try {
    availableActions = await gameManager.getAvailableActions(normalizedGameId, normalizedPlayerId);
  } catch (err: any) {
    console.warn('⚠️ getAvailableActions failed:', err.message);
    availableActions = [];
  }

  // 获取互包关系（三口/四口）
  const bailoutRelations = gameManager.getMutualBailoutRelations(normalizedGameId);
  (game as any).bailoutRelations = bailoutRelations;

  const maskedPlayers = game.players.map((p) => {
    const shouldReveal =
      isAdmin ||
      p.id === normalizedPlayerId ||
      canRevealSpectatorTarget(game, normalizedPlayerId, p);

    return {
      ...p,
      hand: {
        ...p.hand,
        concealedTiles: shouldReveal
          ? p.hand.concealedTiles
          : p.hand.concealedTiles.map((_, index) => ({
              id: `hidden-${p.id}-${index}`,
              suit: TileSuit.CHARACTERS,
              value: 0
            }))
      }
    };
  });

  let tingPreview = { isTing: false, winningTiles: [] as any[] };
  try {
    tingPreview = await gameManager.getTingPreviewForPlayer(normalizedGameId, normalizedPlayerId);
  } catch (err: any) {
    console.warn('getTingPreviewForPlayer failed:', err.message);
  }

  // Ensure isDealer is correctly passed
  const isDealer = player.isDealer;

  return {
    success: true,
    data: {
      game: {
        ...game,
        currentRound: getCurrentRoundNumber(game),
        globalMultiplier: getEffectiveGlobalMultiplier(game),
        players: maskedPlayers
      },
      playerView: player.hand,
      availableActions,
      tingPreview
    }
  };
});
