import { gameManager } from '../../utils/gameManager';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { playerName } = body;

  if (!playerName || typeof playerName !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Player name is required'
    });
  }

  try {
    const result = await gameManager.createGame(playerName, {
      firstRoundDouble: body.firstRoundDouble ?? true,
      liangShanThreshold: body.liangShanThreshold ?? 1000,
      thinkChances: body.thinkChances ?? 3,
      settlementMultiplier: body.settlementMultiplier ?? 10,
      maxBots: body.maxBots ?? 3,
      hesitationWindow: body.hesitationWindow ?? 5000 // 默认5秒
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
