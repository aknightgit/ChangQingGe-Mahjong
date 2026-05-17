import { d as defineEventHandler, u as useRuntimeConfig, g as getQuery, c as createError, a as getCollection, s as setCookie, b as sendRedirect, j as joinURL } from '../../../../nitro/nitro.mjs';
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

const callback_get = defineEventHandler(async (event) => {
  var _a;
  try {
    const runtimeConfig = useRuntimeConfig(event);
    const query = getQuery(event);
    const code = query.code;
    if (!code) {
      throw createError({
        statusCode: 400,
        message: "Authorization code is required"
      });
    }
    console.log("[GoogleOAuth] Received callback with code");
    const client = await createOAuthClient();
    const { tokens, googleUser } = await exchangeCodeForProfile(client, code);
    console.log("[GoogleOAuth] Google user verified", { email: googleUser.email, sub: googleUser.sub });
    const users = await getCollection("users");
    const existingUser = await users.findOne({ email: googleUser.email });
    let user;
    if (!existingUser) {
      console.log("[GoogleOAuth] Creating new user", googleUser.email);
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
      await users.insertOne(newUser);
      user = newUser;
    } else {
      console.log("[GoogleOAuth] Existing user login", googleUser.email);
      await users.updateOne(
        { email: googleUser.email },
        {
          $set: {
            lastLoginAt: /* @__PURE__ */ new Date(),
            oauthId: googleUser.sub,
            oauthProvider: "google",
            avatar: googleUser.picture,
            // Update avatar in case it changed
            name: googleUser.name
            // Update name in case it changed
          }
        }
      );
      user = {
        ...existingUser,
        lastLoginAt: /* @__PURE__ */ new Date(),
        avatar: googleUser.picture,
        name: googleUser.name,
        oauthProvider: "google",
        oauthId: googleUser.sub
      };
    }
    const sessionToken = (_a = tokens.access_token) != null ? _a : `session-${user.userId}`;
    console.log("[GoogleOAuth] Setting auth cookie and redirecting", { userId: user.userId });
    setCookie(event, "auth_token", sessionToken, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    setCookie(event, "user_name", user.name, { path: "/", maxAge: 60 * 60 * 24 * 7 });
    setCookie(event, "is_admin", user.isAdmin ? "true" : "false", { path: "/", maxAge: 60 * 60 * 24 * 7 });
    return sendRedirect(event, joinURL(runtimeConfig.app.baseURL || "/", "/"), 302);
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to process Google login"
    });
  }
});
async function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 500,
      message: "Google OAuth environment variables missing. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI."
    });
  }
  let OAuth2Client;
  try {
    ;
    ({ OAuth2Client } = await import('google-auth-library'));
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "google-auth-library is required. Run: npm install google-auth-library"
    });
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}
async function exchangeCodeForProfile(client, code) {
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw createError({
      statusCode: 400,
      message: "No ID token received from Google"
    });
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.name || !payload.sub) {
    throw createError({
      statusCode: 400,
      message: "Invalid token payload"
    });
  }
  const googleUser = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  };
  return { tokens, googleUser };
}

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map
