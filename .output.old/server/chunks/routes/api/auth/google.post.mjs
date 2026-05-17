import { d as defineEventHandler, r as readBody, c as createError, A as AuthService, s as setCookie } from '../../../nitro/nitro.mjs';
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

const google_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { googleId, email, name, picture } = body;
  if (!googleId || !email || !name) {
    throw createError({
      statusCode: 400,
      message: "Missing required Google profile data"
    });
  }
  try {
    const { user, session } = await AuthService.handleGoogleAuth({
      id: googleId,
      email,
      name,
      picture
    });
    setCookie(event, "mahjong_session", session.token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      // 7 days
      path: "/"
    });
    return {
      success: true,
      data: {
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          stats: user.stats,
          isAdmin: user.isAdmin
        },
        token: session.token
      }
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Authentication failed"
    });
  }
});

export { google_post as default };
//# sourceMappingURL=google.post.mjs.map
