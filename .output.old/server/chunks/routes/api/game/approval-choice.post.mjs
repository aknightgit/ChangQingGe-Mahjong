import { d as defineEventHandler, r as readBody, c as createError, n as gameManager, o as requireGamePlayerAccess, p as emitToRoom } from '../../../nitro/nitro.mjs';
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

const approvalChoice_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { gameId, playerId, choice } = body;
  if (!gameId || !playerId || !choice) {
    throw createError({ statusCode: 400, message: "Game ID, player ID, and choice are required" });
  }
  if (choice !== "confirm" && choice !== "pass" && choice !== "hu" && choice !== "kong" && choice !== "peng") {
    throw createError({ statusCode: 400, message: `Choice must be 'confirm', 'pass', 'hu', 'kong', or 'peng', got '${choice}'` });
  }
  try {
    const game = await gameManager.getGame(gameId);
    if (!game) {
      throw createError({ statusCode: 404, message: "Game not found" });
    }
    await requireGamePlayerAccess(event, game, playerId);
    const mappedChoice = choice === "pass" ? "pass" : "confirm";
    await gameManager.handleApprovalChoice(gameId, playerId, mappedChoice);
    emitToRoom(gameId, "game:state-changed", {
      gameId,
      currentPlayerIndex: game.currentPlayerIndex,
      phase: game.phase
    });
    return { success: true };
  } catch (error) {
    throw createError({ statusCode: 400, message: error.message || "Failed to process approval choice" });
  }
});

export { approvalChoice_post as default };
//# sourceMappingURL=approval-choice.post.mjs.map
