import { gameManager } from '../../utils/gameManager';
import { emitToRoom } from '../../utils/socket';
import { requireGamePlayerAccess } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, choice } = body;

  if (!gameId || !playerId || !choice) {
    throw createError({ statusCode: 400, message: 'Game ID, player ID, and choice are required' });
  }

  if (choice !== 'confirm' && choice !== 'pass' && choice !== 'hu' && choice !== 'kong' && choice !== 'peng') {
    throw createError({ statusCode: 400, message: `Choice must be 'confirm', 'pass', 'hu', 'kong', or 'peng', got '${choice}'` });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: 'Game not found' });
    }

    await requireGamePlayerAccess(event, game, playerId);

    const mappedChoice = choice === 'pass' ? 'pass' : 'confirm';
    await gameManager.handleApprovalChoice(gameId, playerId, mappedChoice);

    emitToRoom(gameId, 'game:state-changed', {
      gameId,
      currentPlayerIndex: game.currentPlayerIndex,
      phase: game.phase
    });

    return { success: true };
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || 'Failed to process approval choice' });
  }
});
