import { gameManager } from '../../utils/gameManager';
import { ActionType } from '../../types/game';
import { emitToRoom } from '../../utils/socket';
import { requireGamePlayerAccess } from '../../utils/session';

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game.inheritMultiplier ?? game.inheritedGlobalMultiplier ?? 1;
  const round = game.roundMultiplier ?? 1;
  return Math.min(inherit * round, 8);
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, action: rawAction, type, tileId, tileIds, winOptionLabel } = body;
  const action = rawAction || type;

  if (!gameId || !playerId || !action) {
    throw createError({
      statusCode: 400,
      message: 'Game ID, player ID, and action are required'
    });
  }

  // Validate action type
  if (!Object.values(ActionType).includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action type'
    });
  }

  try {
    const currentGame = await gameManager.getGame(gameId);
    if (!currentGame) {
      throw createError({ statusCode: 404, message: 'Game not found' });
    }

    await requireGamePlayerAccess(event, currentGame, playerId, { allowAdmin: action === ActionType.CHEAT_HU });
    await gameManager.executeAction(gameId, playerId, action, tileId, tileIds, winOptionLabel);
    
    const game = await gameManager.getGame(gameId);
    const player = game?.players.find(p => p.id === playerId);

    // Broadcast game state to all players in the room via Socket.IO
    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      currentPlayerIndex: game?.currentPlayerIndex,
      phase: game?.phase,
      roundNumber: game?.roundNumber,
      players: game!.players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        discardedTiles: p.hand.discardedTiles,
        exposedMelds: p.hand.exposedMelds,
        status: p.status,
        windScore: p.windScore,
        rainScore: p.rainScore,
        score: p.score,
        handSize: p.hand.concealedTiles.length
      })),
      lastAction: {
        playerId,
        action,
        tileId
      }
    });

    const availableActions = await gameManager.getAvailableActions(gameId, playerId);
    const tingPreview = await gameManager.getTingPreviewForPlayer(gameId, playerId).catch(() => ({
      isTing: false,
      winningTiles: []
    }));

    // 获取互包关系
    const bailoutRelations = gameManager.getMutualBailoutRelations(gameId);

    return {
      success: true,
      data: {
        game: {
          ...game,
          currentRound: game?.currentRound ?? ((game?.roundStats?.length || 0) + (game?.phase === 'ended' ? 0 : 1)),
          globalMultiplier: getEffectiveGlobalMultiplier(game),
          bailoutRelations,
          players: game!.players.map(p => ({
            ...p,
            hand: {
              ...p.hand,
              concealedTiles: p.id === playerId ? p.hand.concealedTiles : []
            }
          }))
        },
        playerView: player?.hand,
        availableActions,
        tingPreview
      }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Failed to execute action'
    });
  }
});
