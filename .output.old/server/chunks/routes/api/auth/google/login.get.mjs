import { d as defineEventHandler, c as createError } from '../../../../nitro/nitro.mjs';
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

const login_get = defineEventHandler((event) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
    if (!clientId) {
      throw createError({
        statusCode: 500,
        message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env"
      });
    }
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    return {
      success: true,
      authUrl: authUrl.toString(),
      message: "Redirect user to this URL for Google login"
    };
  } catch (error) {
    console.error("Google Auth URL Error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to generate Google auth URL"
    });
  }
});

export { login_get as default };
//# sourceMappingURL=login.get.mjs.map
