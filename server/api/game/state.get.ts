import { gameManager } from '../../utils/gameManager';
import { TileSuit } from '../../types/game';
import { requireGamePlayerAccess } from '../../utils/session';
import { apiLog } from '../../utils/apiLogService';
import { canRevealSpectatorTarget, canUseDebugBotSpectator } from '../../utils/spectatorView';

function getEffectiveGlobalMultiplier(game: any): number {
  const inherit = game.inheritMultiplier ?? game.inheritedGlobalMultiplier ?? 1;
  const round = game.roundMultiplier ?? 1;
  return Math.min(inherit * round, 8);
}

function getCurrentRoundNumber(game: any): number {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === 'ended' ? Math.max(1, completedRounds) : completedRounds + 1;
}

function getSpectatorScope(game: any): number {
  const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === 'ended' ? completedRounds : completedRounds + 1;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId, debugAccessToken } = query;
  const startTime = Date.now();
  const _t_marks: Record<string, number> = {};

  if (!gameId || !playerId) {
    await apiLog(event, {
      endpoint: 'state',
      statusCode: 400,
      durationMs: Date.now() - startTime,
      error: 'Game ID and player ID are required',
    });
    throw createError({
      statusCode: 400,
      message: 'Game ID and player ID are required'
    });
  }

  const normalizedGameId = gameId as string;
  const normalizedPlayerId = playerId as string;

  let game;
  try {
    game = await gameManager.getGame(normalizedGameId); _t_marks.getGame = Date.now() - startTime;
  } catch (err: any) {
    console.warn('⚠️ getGame failed:', err.message);
    game = undefined;
  }

  if (!game) {
    await apiLog(event, {
      endpoint: 'state',
      gameId: normalizedGameId,
      playerId: normalizedPlayerId,
      statusCode: 404,
      durationMs: Date.now() - startTime,
      error: 'Game not found',
    });
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

  let access;
  try {
    access = isDebugBypass
      ? {
          player: game.players.find((entry) => entry.id === normalizedPlayerId || entry.userId === normalizedPlayerId),
          isAdmin: true
        }
      : await requireGamePlayerAccess(event, game, normalizedPlayerId, { allowAdmin: true }); _t_marks.requireAccess = Date.now() - startTime;
  } catch (err: any) {
    // 访客（未登录用户）降级：通过 playerId 直接匹配，不校验 userId
    const fallbackPlayer = game.players.find(
      (entry) => entry.id === normalizedPlayerId || entry.userId === normalizedPlayerId
    );
    if (fallbackPlayer && (err.statusCode === 401 || err.statusCode === 403)) {
      access = { player: fallbackPlayer, isAdmin: false };
      console.log('[state.get] Guest access granted for player:', fallbackPlayer.name);
    } else {
      await apiLog(event, {
        endpoint: 'state',
        gameId: normalizedGameId,
        playerId: normalizedPlayerId,
        statusCode: err.statusCode || 403,
        durationMs: Date.now() - startTime,
        error: err.message || 'Access denied',
      });
      throw err;
    }
  }

  if (!access.player) {
    await apiLog(event, {
      endpoint: 'state',
      gameId: normalizedGameId,
      playerId: normalizedPlayerId,
      statusCode: 404,
      durationMs: Date.now() - startTime,
      error: 'Player not found',
    });
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    });
  }

  const { player, isAdmin } = access;

  let availableActions: string[] = [];
  try {
    availableActions = await gameManager.getAvailableActions(normalizedGameId, normalizedPlayerId); _t_marks.getActions = Date.now() - startTime;
  } catch (err: any) {
    console.warn('⚠️ getAvailableActions failed:', err.message);
    availableActions = [];
  }

  // 获取互包关系（三口/四口）
  const maskedPlayers = game.players.map((p) => {
    const hasDebugSpectatorLock =
      !!player &&
      !!(game.spectatorViews?.[normalizedPlayerId]) &&
      game.spectatorViews?.[normalizedPlayerId]?.roundNumber === getSpectatorScope(game) &&
      game.spectatorViews?.[normalizedPlayerId]?.viewingPlayerId === p.id &&
      canUseDebugBotSpectator(player, p);
    const shouldReveal =
      isAdmin ||
      p.id === normalizedPlayerId ||
      canRevealSpectatorTarget(game, normalizedPlayerId, p) ||
      hasDebugSpectatorLock ||
      game.phase === 'reveal' || game.phase === 'ended';  // REVEAL/ENDED 阶段：所有人可见手牌

    return {
      isBotControlled: gameManager.isPlayerInBotMode(p.id),
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

  // 听牌提示：只有客户端明确请求（?tingPreview=true）才计算
  let tingPreview = { isTing: false, winningTiles: [] as any[] };
  if (query.tingPreview === 'true') {
    try {
      tingPreview = await gameManager.getTingPreviewForPlayer(normalizedGameId, normalizedPlayerId, {
        skipQuickPrecheck: true
      });
    } catch (err: any) {
      console.warn('getTingPreviewForPlayer failed:', err.message);
    }
  }

  // Ensure isDealer is correctly passed
  const isDealer = player.isDealer;

  await apiLog(event, {
    endpoint: 'state',
    gameId: normalizedGameId,
    playerId: normalizedPlayerId,
    statusCode: 200,
    durationMs: Date.now() - startTime,
  });

  // 注入实时互包关系(三口/四口)，不是局初的空数组
  const bailoutRelations = gameManager.getMutualBailoutRelations(normalizedGameId).map(rel => ({
    ...rel,
    player1Name: game.players.find(p => p.id === rel.player1)?.name,
    player2Name: game.players.find(p => p.id === rel.player2)?.name
  }));
  _t_marks.bailout = Date.now() - startTime;
const _total = Date.now() - startTime;
  const _parts = [];
  for (const k of Object.keys(_t_marks)) _parts.push(k + "=" + _t_marks[k] + "ms");
  console.log("[timing-state] total=" + _total + "ms " + _parts.join(" ") + " gameId=" + normalizedGameId.slice(0, 8));
  return {
    success: true,
    data: {
      game: {
        ...game,
        bailoutRelations,
        currentRound: getCurrentRoundNumber(game),
        globalMultiplier: getEffectiveGlobalMultiplier(game),
        players: maskedPlayers,
        roundStats: Array.isArray(game.roundStats) ? game.roundStats : []
      },
      playerView: player.hand,
      availableActions,
      // [Fix] Only return tingPreview when explicitly requested, otherwise omit
      // so the frontend can distinguish "not requested" from "not ting"
      ...(query.tingPreview === 'true' ? { tingPreview } : {}),
      broadcastMessages: gameManager.getRecentBroadcasts(normalizedGameId)
    }
  };
});
