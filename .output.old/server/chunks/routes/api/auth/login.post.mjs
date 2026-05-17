import { d as defineEventHandler, r as readBody, c as createError, U as UserService, A as AuthService, s as setCookie } from '../../../nitro/nitro.mjs';
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

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { phone, password } = body;
  if (!phone || !password) {
    throw createError({
      statusCode: 400,
      message: "\u624B\u673A\u53F7\u548C\u5BC6\u7801\u90FD\u662F\u5FC5\u586B\u9879"
    });
  }
  try {
    const user = await UserService.loginByPhone(phone, password);
    const session = await AuthService.createSession(user.userId);
    setCookie(event, "mahjong_session", session.token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    return {
      success: true,
      data: {
        userId: user.userId,
        name: user.name,
        phone: user.phone,
        token: session.token
      }
    };
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error.message || "\u767B\u5F55\u5931\u8D25"
    });
  }
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
