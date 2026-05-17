import { d as defineEventHandler, g as getQuery, a as getCollection } from '../../../nitro/nitro.mjs';
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

const rounds_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const playerId = typeof query.playerId === "string" ? query.playerId : void 0;
  const limitParam = typeof query.limit === "string" ? parseInt(query.limit, 10) : void 0;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 60;
  const collection = await getCollection("mahjongTrainingRounds");
  const filter = playerId ? { "initialSnapshot.players.id": playerId } : {};
  const rounds = await collection.find(filter).sort({ recordedAt: -1, roundNumber: -1 }).limit(limit).toArray();
  const data = rounds.map((round) => {
    var _a, _b, _c;
    const players = Array.isArray((_a = round.initialSnapshot) == null ? void 0 : _a.players) ? round.initialSnapshot.players : [];
    const scores = round.finalScores || ((_b = round.roundStat) == null ? void 0 : _b.scores) || {};
    const winners = Array.isArray((_c = round.roundStat) == null ? void 0 : _c.winnerDetails) ? round.roundStat.winnerDetails : [];
    const winnerIds = new Set(winners.map((winner) => winner.playerId));
    const winnerNames = winners.sort((a, b) => {
      const orderA = Number.isFinite(Number(a == null ? void 0 : a.winOrder)) ? Number(a.winOrder) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b == null ? void 0 : b.winOrder)) ? Number(b.winOrder) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    }).map((winner) => winner.playerName);
    return {
      gameId: round.gameId,
      roomId: round.roomId,
      roomNumber: round.roomNumber || round.roomId,
      roundNumber: round.roundNumber,
      recordedAt: round.recordedAt,
      endReason: round.endReason,
      winnerNames,
      players: players.map((player) => {
        var _a2;
        return {
          playerId: player.id,
          name: player.name,
          status: player.status,
          isWinner: winnerIds.has(player.id),
          score: Number((_a2 = scores[player.id]) != null ? _a2 : 0)
        };
      })
    };
  });
  return {
    success: true,
    data
  };
});

export { rounds_get as default };
//# sourceMappingURL=rounds.get.mjs.map
