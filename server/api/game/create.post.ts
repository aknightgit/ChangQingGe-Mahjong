import { gameManager } from '../../utils/gameManager';
import { resolveUserFromEvent } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const user = await resolveUserFromEvent(event);

  try {
    const result = await gameManager.createGame(user.name, {
      userId: user.userId,
      diceRollCount: body.diceRollCount ?? 2,
      firstRoundDouble: body.firstRoundDouble ?? true,
      liangShanThreshold: body.liangShanThreshold ?? 4000,
      thinkChances: body.thinkChances ?? 3,
      settlementMultiplier: body.settlementMultiplier ?? 10,
      maxBots: body.maxBots ?? 3,
      minPlayers: body.minPlayers ?? 4,
      hesitationWindow: body.hesitationWindow ?? 5000,
      selectedBots: body.selectedBots ?? []
    });
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create game'
    });
  }
});
