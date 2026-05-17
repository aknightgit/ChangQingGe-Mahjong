import { d as defineEventHandler, n as gameManager } from '../../../nitro/nitro.mjs';
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

const list_get = defineEventHandler(async (event) => {
  const games = await gameManager.listGames();
  return {
    success: true,
    data: {
      games: games.map((g) => ({
        gameId: g.gameId,
        phase: g.phase,
        playerCount: g.players.length,
        roundNumber: g.roundNumber,
        createdAt: g.createdAt
      }))
    }
  };
});

export { list_get as default };
//# sourceMappingURL=list.get.mjs.map
