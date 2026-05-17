import { d as defineEventHandler, i as resolveUserFromEvent, n as gameManager } from '../../../nitro/nitro.mjs';
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

const myGames_get = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const user = await resolveUserFromEvent(event);
  const allGames = await gameManager.listGames();
  const myGames = [];
  for (const game of allGames) {
    if (game.phase === "ended") continue;
    if (game.phase === "waiting" && game.updatedAt) {
      const staleThreshold = Date.now() - 30 * 60 * 1e3;
      const updatedAt = typeof game.updatedAt === "number" ? game.updatedAt : (_b = (_a = game.updatedAt).getTime) == null ? void 0 : _b.call(_a);
      if (updatedAt && updatedAt < staleThreshold) continue;
    }
    const playerInGame = game.players.find((p) => p.userId === user.userId);
    if (!playerInGame) continue;
    const isBotMode = gameManager.isPlayerInBotMode(playerInGame.id);
    myGames.push({
      gameId: game.gameId,
      roomNumber: game.roomNumber,
      phase: game.phase,
      playerCount: game.players.length,
      players: game.players.map((p) => ({
        name: p.name,
        position: p.position,
        status: p.status
      })),
      myPlayerId: playerInGame.id,
      isBotMode,
      isMyTurn: game.phase === "playing" && ((_c = game.players[game.currentPlayerIndex]) == null ? void 0 : _c.id) === playerInGame.id,
      createdAt: game.createdAt
    });
  }
  myGames.sort((a, b) => b.createdAt - a.createdAt);
  return { success: true, data: { games: myGames } };
});

export { myGames_get as default };
//# sourceMappingURL=my-games.get.mjs.map
