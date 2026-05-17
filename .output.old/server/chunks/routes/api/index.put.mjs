import { d as defineEventHandler, K as resolveUserIdFromEvent, r as readBody, c as createError, U as UserService } from '../../nitro/nitro.mjs';
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

const index_put = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const userId = await resolveUserIdFromEvent(event);
  const body = await readBody(event);
  const name = typeof (body == null ? void 0 : body.name) === "string" ? body.name.trim() : "";
  const address = typeof (body == null ? void 0 : body.address) === "string" ? body.address.trim() : void 0;
  const dateOfBirth = typeof (body == null ? void 0 : body.dateOfBirth) === "string" ? body.dateOfBirth.trim() : void 0;
  const gender = typeof (body == null ? void 0 : body.gender) === "string" ? body.gender.trim() : void 0;
  if (!name) {
    throw createError({
      statusCode: 400,
      message: "Name is required"
    });
  }
  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    throw createError({
      statusCode: 400,
      message: "Invalid date of birth"
    });
  }
  const updatedUser = await UserService.updateProfile(userId, {
    name,
    address,
    dateOfBirth,
    gender
  });
  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: "User not found"
    });
  }
  return {
    success: true,
    data: {
      userId: updatedUser.userId,
      name: updatedUser.name,
      email: updatedUser.email,
      address: (_a = updatedUser.address) != null ? _a : "",
      dateOfBirth: (_b = updatedUser.dateOfBirth) != null ? _b : "",
      gender: (_c = updatedUser.gender) != null ? _c : ""
    }
  };
});

export { index_put as default };
//# sourceMappingURL=index.put.mjs.map
