import { d as defineEventHandler, e as getCookie, A as AuthService, f as forceDisconnectUser, h as deleteCookie } from '../../../nitro/nitro.mjs';
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

const logout_post = defineEventHandler(async (event) => {
  const token = getCookie(event, "mahjong_session");
  const userId = getCookie(event, "user_id");
  if (token) {
    await AuthService.deleteSession(token);
  }
  if (userId) {
    await forceDisconnectUser(userId);
  }
  deleteCookie(event, "mahjong_session");
  deleteCookie(event, "auth_token");
  deleteCookie(event, "user_id");
  deleteCookie(event, "user_name");
  deleteCookie(event, "is_admin");
  return {
    success: true,
    message: "Logged out successfully"
  };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
