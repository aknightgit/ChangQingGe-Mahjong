import { d as defineEventHandler, c as createError, r as readBody, n as gameManager } from '../../../nitro/nitro.mjs';
import { randomUUID } from 'crypto';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
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

function buildSelfDrawRound(owner, others) {
  return {
    roundNumber: 1,
    scores: {
      [owner.id]: 120,
      [others[0].id]: -80,
      [others[1].id]: -20,
      [others[2].id]: -20
    },
    winners: [owner.id],
    selfDraws: [owner.id],
    diceMultiplier: 2,
    inheritMultiplier: 4,
    effectiveMultiplier: 8,
    settlementMultiplier: 8,
    overflowCarryMultiplierNextRound: 2,
    bailoutRelations: [
      {
        player1: owner.id,
        player1Name: owner.name,
        player2: others[0].id,
        player2Name: others[0].name,
        type: "\u4E09\u53E3"
      }
    ],
    winnerDetails: [
      {
        playerId: owner.id,
        playerName: owner.name,
        handTypeName: "\u78B0\u78B0\u80E1",
        isSelfDrawn: true,
        baseFan: 10,
        extraMultipliers: 2,
        diceMultiplier: 2,
        inheritMultiplier: 4,
        effectiveMultiplier: 8,
        settlementMultiplier: 8,
        finalPoints: 20,
        details: [
          "\u65E0\u767E\u642D \xD72",
          "\u95E8\u6E05 \xD72",
          "\u6709\u6548\u500D\u7387 = min(8, \u9AB0\u5B50\u500D\u65702 \xD7 \u7EE7\u627F\u500D\u65704) = 8",
          "\u6700\u7EC8 = 10 \xD7 2 \xD7 8 \xD7 8 = 1280"
        ]
      }
    ],
    transfers: [
      {
        fromPlayerId: others[0].id,
        fromPlayerName: others[0].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 80,
        reason: "\u81EA\u6478\u4E92\u5305\u8D54\u4ED8\xD73",
        bailoutType: "\u4E09\u53E3"
      },
      {
        fromPlayerId: others[1].id,
        fromPlayerName: others[1].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 20,
        reason: "\u81EA\u6478\u8D54\u4ED8"
      },
      {
        fromPlayerId: others[2].id,
        fromPlayerName: others[2].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 20,
        reason: "\u81EA\u6478\u8D54\u4ED8"
      }
    ],
    specialEvents: [
      {
        type: "leading_brother",
        fromPlayerId: others[2].id,
        fromPlayerName: others[2].name,
        totalAmount: 30,
        amountPerPlayer: 10
      }
    ]
  };
}
function buildDiscardRound(owner, others) {
  return {
    roundNumber: 1,
    scores: {
      [owner.id]: 96,
      [others[0].id]: -64,
      [others[1].id]: -32,
      [others[2].id]: 0
    },
    winners: [owner.id],
    selfDraws: [],
    diceMultiplier: 2,
    inheritMultiplier: 2,
    effectiveMultiplier: 4,
    settlementMultiplier: 8,
    overflowCarryMultiplierNextRound: 1,
    bailoutRelations: [
      {
        player1: owner.id,
        player1Name: owner.name,
        player2: others[1].id,
        player2Name: others[1].name,
        type: "\u4E09\u53E3"
      }
    ],
    winnerDetails: [
      {
        playerId: owner.id,
        playerName: owner.name,
        handTypeName: "\u6DF7\u4E00\u8272",
        isSelfDrawn: false,
        discarderId: others[0].id,
        discarderName: others[0].name,
        baseFan: 12,
        extraMultipliers: 1,
        diceMultiplier: 2,
        inheritMultiplier: 2,
        effectiveMultiplier: 4,
        settlementMultiplier: 8,
        finalPoints: 8,
        details: [
          "\u56FA\u5B9A\u57FA\u7840\u756A\u8FBE\u523012",
          "\u6709\u6548\u500D\u7387 = min(8, \u9AB0\u5B50\u500D\u65702 \xD7 \u7EE7\u627F\u500D\u65702) = 4",
          "\u6700\u7EC8 = 12 \xD7 1 \xD7 4 \xD7 8 = 384"
        ]
      }
    ],
    transfers: [
      {
        fromPlayerId: others[0].id,
        fromPlayerName: others[0].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 64,
        reason: "\u653E\u51B2\u8D54\u4ED8"
      },
      {
        fromPlayerId: others[1].id,
        fromPlayerName: others[1].name,
        toPlayerId: owner.id,
        toPlayerName: owner.name,
        amount: 32,
        reason: "\u7B2C\u4E09\u65B9\u4E92\u5305\u8865\u8D54\xD71",
        bailoutType: "\u4E09\u53E3"
      }
    ],
    specialEvents: []
  };
}
const debugSeedSettlement_post = defineEventHandler(async (event) => {
  const debugRoutesEnabled = process.env.ENABLE_DEBUG_ROUTES === "true";
  if (!debugRoutesEnabled) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const body = await readBody(event).catch(() => ({}));
  const scenario = typeof (body == null ? void 0 : body.scenario) === "string" ? body.scenario : "self-draw-bailout";
  if (!["self-draw-bailout", "discard-flow"].includes(scenario)) {
    throw createError({ statusCode: 400, message: "Unknown seed scenario" });
  }
  const debugAccessToken = randomUUID();
  const { gameId, playerId } = await gameManager.createGame("OverlayUser", {
    userId: `debug-${scenario}-owner`,
    diceRollCount: 5,
    liangShanThreshold: 4800,
    settlementMultiplier: 8,
    maxBots: 3,
    hesitationWindow: 5e3
  });
  const botNames = ["AI-\u5C0F\u80D6", "AI-\u8001\u8D75", "AI-AK"];
  for (const botName of botNames) {
    await gameManager.joinGame(gameId, botName);
  }
  await gameManager.startGame(gameId, { hesitationWindow: 5e3 });
  const game = await gameManager.getGame(gameId);
  if (!game) {
    throw createError({ statusCode: 500, message: "Failed to seed game" });
  }
  game.debugAccessToken = debugAccessToken;
  const owner = game.players.find((player) => player.id === playerId);
  const others = game.players.filter((player) => player.id !== playerId);
  if (!owner || others.length < 3) {
    throw createError({ statusCode: 500, message: "Seeded game players mismatch" });
  }
  game.roundStats = [
    scenario === "discard-flow" ? buildDiscardRound(owner, others) : buildSelfDrawRound(owner, others)
  ];
  return {
    success: true,
    data: {
      gameId,
      playerId,
      roomNumber: game.roomNumber,
      debugAccessToken,
      scenario
    }
  };
});

export { debugSeedSettlement_post as default };
//# sourceMappingURL=debug-seed-settlement.post.mjs.map
