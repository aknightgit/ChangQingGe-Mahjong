import { d as defineEventHandler, r as readBody, c as createError, a as getCollection } from '../../../../nitro/nitro.mjs';
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

const verify_post = defineEventHandler(async (event) => {
  var _a, _b;
  try {
    const body = await readBody(event);
    const { idToken } = body;
    if (!idToken) {
      throw createError({
        statusCode: 400,
        message: "ID token is required"
      });
    }
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload) {
      throw createError({
        statusCode: 400,
        message: "Invalid Google token"
      });
    }
    const googleUser = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    const users = await getCollection("users");
    let user = await users.findOne({ email: googleUser.email });
    if (!user) {
      const newUser = {
        userId: randomUUID(),
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        oauthProvider: "google",
        oauthId: googleUser.sub,
        isAdmin: false,
        createdAt: /* @__PURE__ */ new Date(),
        lastLoginAt: /* @__PURE__ */ new Date(),
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalScore: 0,
          highestFan: 0,
          winRate: 0
        }
      };
      const result = await users.insertOne(newUser);
      user = newUser;
      return {
        success: true,
        isNewUser: true,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          oauthProvider: user.oauthProvider,
          isAdmin: (_a = user.isAdmin) != null ? _a : false
        },
        message: "New user created and logged in"
      };
    } else {
      await users.updateOne(
        { email: googleUser.email },
        {
          $set: {
            lastLoginAt: /* @__PURE__ */ new Date(),
            oauthId: googleUser.sub,
            oauthProvider: "google",
            avatar: googleUser.picture,
            name: googleUser.name
          }
        }
      );
      const updatedUser = await users.findOne({ email: googleUser.email });
      return {
        success: true,
        isNewUser: false,
        user: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          oauthProvider: updatedUser.oauthProvider,
          stats: updatedUser.stats,
          isAdmin: (_b = updatedUser.isAdmin) != null ? _b : false
        },
        message: "User logged in successfully"
      };
    }
  } catch (error) {
    console.error("Google Verify Token Error:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to verify Google token"
    });
  }
});

export { verify_post as default };
//# sourceMappingURL=verify.post.mjs.map
