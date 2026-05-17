import { d as defineEventHandler, r as readBody, c as createError, m as ActionType, n as gameManager, o as requireGamePlayerAccess, p as emitToRoom, T as TileSuit } from '../../../nitro/nitro.mjs';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'socket.io';
import '@socket.io/redis-adapter';
import 'redis';
import 'fs';
import 'path';
import 'node:url';
import '@iconify/utils';
import 'consola';

function getEffectiveGlobalMultiplier(game) {
  var _a, _b, _c;
  const inherit = (_b = (_a = game.inheritMultiplier) != null ? _a : game.inheritedGlobalMultiplier) != null ? _b : 1;
  const round = (_c = game.roundMultiplier) != null ? _c : 1;
  return Math.min(inherit * round, 8);
}
const action_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  const { gameId, playerId, action: rawAction, type, tileId, tileIds, winOptionLabel } = body;
  const action = rawAction || type;
  if (!gameId || !playerId || !action) {
    throw createError({
      statusCode: 400,
      message: "Game ID, player ID, and action are required"
    });
  }
  if (!Object.values(ActionType).includes(action)) {
    throw createError({
      statusCode: 400,
      message: "Invalid action type"
    });
  }
  try {
    const currentGame = await gameManager.getGame(gameId);
    if (!currentGame) {
      throw createError({ statusCode: 404, message: "Game not found" });
    }
    await requireGamePlayerAccess(event, currentGame, playerId, { allowAdmin: action === ActionType.CHEAT_HU });
    await gameManager.executeAction(gameId, playerId, action, tileId, tileIds, winOptionLabel);
    const game = await gameManager.getGame(gameId);
    const player = game == null ? void 0 : game.players.find((p) => p.id === playerId);
    emitToRoom(gameId, "game:state-changed", {
      gameId,
      currentPlayerIndex: game == null ? void 0 : game.currentPlayerIndex,
      phase: game == null ? void 0 : game.phase,
      roundNumber: game == null ? void 0 : game.roundNumber,
      players: game.players.map((p) => ({
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
    const bailoutRelations = gameManager.getMutualBailoutRelations(gameId);
    return {
      success: true,
      data: {
        game: {
          ...game,
          currentRound: (_b = game == null ? void 0 : game.currentRound) != null ? _b : (((_a = game == null ? void 0 : game.roundStats) == null ? void 0 : _a.length) || 0) + ((game == null ? void 0 : game.phase) === "ended" ? 0 : 1),
          globalMultiplier: getEffectiveGlobalMultiplier(game),
          bailoutRelations,
          players: game.players.map((p) => ({
            ...p,
            hand: {
              ...p.hand,
              concealedTiles: p.id === playerId ? p.hand.concealedTiles : p.hand.concealedTiles.map((_, index) => ({
                id: `hidden-${p.id}-${index}`,
                suit: TileSuit.CHARACTERS,
                value: 0
              }))
            }
          }))
        },
        playerView: player == null ? void 0 : player.hand,
        availableActions,
        tingPreview
      }
    };
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error.message || "Failed to execute action"
    });
  }
});

export { action_post as default };
//# sourceMappingURL=action.post.mjs.map
