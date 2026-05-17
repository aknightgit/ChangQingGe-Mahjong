import { d as defineEventHandler, r as readBody, i as resolveUserFromEvent, n as gameManager, c as createError } from '../../../nitro/nitro.mjs';
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

const create_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const body = await readBody(event);
  const user = await resolveUserFromEvent(event);
  try {
    const result = await gameManager.createGame(user.name, {
      userId: user.userId,
      diceRollCount: (_a = body.diceRollCount) != null ? _a : 2,
      firstRoundDouble: (_b = body.firstRoundDouble) != null ? _b : true,
      liangShanThreshold: (_c = body.liangShanThreshold) != null ? _c : 4e3,
      thinkChances: (_d = body.thinkChances) != null ? _d : 3,
      settlementMultiplier: (_e = body.settlementMultiplier) != null ? _e : 10,
      maxBots: (_f = body.maxBots) != null ? _f : 3,
      minPlayers: (_g = body.minPlayers) != null ? _g : 4,
      hesitationWindow: (_h = body.hesitationWindow) != null ? _h : 5e3,
      selectedBots: (_i = body.selectedBots) != null ? _i : []
    });
    return {
      success: true,
      data: result
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to create game"
    });
  }
});

export { create_post as default };
//# sourceMappingURL=create.post.mjs.map
