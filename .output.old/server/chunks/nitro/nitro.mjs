import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { MongoClient } from 'mongodb';
import http, { Server as Server$2 } from 'node:http';
import https, { Server as Server$1 } from 'node:https';
import nodeCrypto, { createHash } from 'node:crypto';
import require$$0$2 from 'stream';
import require$$0$3 from 'events';
import require$$2 from 'http';
import require$$1, { randomUUID as randomUUID$1, createHash as createHash$1 } from 'crypto';
import require$$0$1 from 'buffer';
import require$$0 from 'zlib';
import require$$1$1 from 'https';
import require$$3 from 'net';
import require$$4 from 'tls';
import require$$7 from 'url';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import fs from 'fs';
import path$1 from 'path';
import { fileURLToPath } from 'node:url';
import { getIcons } from '@iconify/utils';
import { consola } from 'consola';

nodeCrypto.webcrypto?.subtle || {};
const randomUUID = () => {
  return nodeCrypto.randomUUID();
};

const kNodeInspect = /* @__PURE__ */ Symbol.for(
  "nodejs.util.inspect.custom"
);
function toBufferLike(val) {
  if (val === void 0 || val === null) {
    return "";
  }
  const type = typeof val;
  if (type === "string") {
    return val;
  }
  if (type === "number" || type === "boolean" || type === "bigint") {
    return val.toString();
  }
  if (type === "function" || type === "symbol") {
    return "{}";
  }
  if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
    return val;
  }
  if (isPlainObject$1(val)) {
    return JSON.stringify(val);
  }
  return val;
}
function isPlainObject$1(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

class Message {
  /** Access to the original [message event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event) if available. */
  event;
  /** Access to the Peer that emitted the message. */
  peer;
  /** Raw message data (can be of any type). */
  rawData;
  #id;
  #uint8Array;
  #arrayBuffer;
  #blob;
  #text;
  #json;
  constructor(rawData, peer, event) {
    this.rawData = rawData || "";
    this.peer = peer;
    this.event = event;
  }
  /**
   * Unique random [uuid v4](https://developer.mozilla.org/en-US/docs/Glossary/UUID) identifier for the message.
   */
  get id() {
    if (!this.#id) {
      this.#id = randomUUID();
    }
    return this.#id;
  }
  // --- data views ---
  /**
   * Get data as [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) value.
   *
   * If raw data is in any other format or string, it will be automatically converted and encoded.
   */
  uint8Array() {
    const _uint8Array = this.#uint8Array;
    if (_uint8Array) {
      return _uint8Array;
    }
    const rawData = this.rawData;
    if (rawData instanceof Uint8Array) {
      return this.#uint8Array = rawData;
    }
    if (rawData instanceof ArrayBuffer || rawData instanceof SharedArrayBuffer) {
      this.#arrayBuffer = rawData;
      return this.#uint8Array = new Uint8Array(rawData);
    }
    if (typeof rawData === "string") {
      this.#text = rawData;
      return this.#uint8Array = new TextEncoder().encode(this.#text);
    }
    if (Symbol.iterator in rawData) {
      return this.#uint8Array = new Uint8Array(rawData);
    }
    if (typeof rawData?.length === "number") {
      return this.#uint8Array = new Uint8Array(rawData);
    }
    if (rawData instanceof DataView) {
      return this.#uint8Array = new Uint8Array(
        rawData.buffer,
        rawData.byteOffset,
        rawData.byteLength
      );
    }
    throw new TypeError(
      `Unsupported message type: ${Object.prototype.toString.call(rawData)}`
    );
  }
  /**
   * Get data as [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) or [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) value.
   *
   * If raw data is in any other format or string, it will be automatically converted and encoded.
   */
  arrayBuffer() {
    const _arrayBuffer = this.#arrayBuffer;
    if (_arrayBuffer) {
      return _arrayBuffer;
    }
    const rawData = this.rawData;
    if (rawData instanceof ArrayBuffer || rawData instanceof SharedArrayBuffer) {
      return this.#arrayBuffer = rawData;
    }
    return this.#arrayBuffer = this.uint8Array().buffer;
  }
  /**
   * Get data as [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) value.
   *
   * If raw data is in any other format or string, it will be automatically converted and encoded. */
  blob() {
    const _blob = this.#blob;
    if (_blob) {
      return _blob;
    }
    const rawData = this.rawData;
    if (rawData instanceof Blob) {
      return this.#blob = rawData;
    }
    return this.#blob = new Blob([this.uint8Array()]);
  }
  /**
   * Get stringified text version of the message.
   *
   * If raw data is in any other format, it will be automatically converted and decoded.
   */
  text() {
    const _text = this.#text;
    if (_text) {
      return _text;
    }
    const rawData = this.rawData;
    if (typeof rawData === "string") {
      return this.#text = rawData;
    }
    return this.#text = new TextDecoder().decode(this.uint8Array());
  }
  /**
   * Get parsed version of the message text with [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse).
   */
  json() {
    const _json = this.#json;
    if (_json) {
      return _json;
    }
    return this.#json = JSON.parse(this.text());
  }
  /**
   * Message data (value varies based on `peer.websocket.binaryType`).
   */
  get data() {
    switch (this.peer?.websocket?.binaryType) {
      case "arraybuffer": {
        return this.arrayBuffer();
      }
      case "blob": {
        return this.blob();
      }
      case "nodebuffer": {
        return globalThis.Buffer ? Buffer.from(this.uint8Array()) : this.uint8Array();
      }
      case "uint8array": {
        return this.uint8Array();
      }
      case "text": {
        return this.text();
      }
      default: {
        return this.rawData;
      }
    }
  }
  // --- inspect ---
  toString() {
    return this.text();
  }
  [Symbol.toPrimitive]() {
    return this.text();
  }
  [kNodeInspect]() {
    return { data: this.rawData };
  }
}

class Peer {
  _internal;
  _topics;
  _id;
  #ws;
  constructor(internal) {
    this._topics = /* @__PURE__ */ new Set();
    this._internal = internal;
  }
  get context() {
    return this._internal.context ??= {};
  }
  /**
   * Unique random [uuid v4](https://developer.mozilla.org/en-US/docs/Glossary/UUID) identifier for the peer.
   */
  get id() {
    if (!this._id) {
      this._id = randomUUID();
    }
    return this._id;
  }
  /** IP address of the peer */
  get remoteAddress() {
    return void 0;
  }
  /** upgrade request */
  get request() {
    return this._internal.request;
  }
  /**
   * Get the [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) instance.
   *
   * **Note:** crossws adds polyfill for the following properties if native values are not available:
   * - `protocol`: Extracted from the `sec-websocket-protocol` header.
   * - `extensions`: Extracted from the `sec-websocket-extensions` header.
   * - `url`: Extracted from the request URL (http -> ws).
   * */
  get websocket() {
    if (!this.#ws) {
      const _ws = this._internal.ws;
      const _request = this._internal.request;
      this.#ws = _request ? createWsProxy(_ws, _request) : _ws;
    }
    return this.#ws;
  }
  /** All connected peers to the server */
  get peers() {
    return this._internal.peers || /* @__PURE__ */ new Set();
  }
  /** All topics, this peer has been subscribed to. */
  get topics() {
    return this._topics;
  }
  /** Abruptly close the connection */
  terminate() {
    this.close();
  }
  /** Subscribe to a topic */
  subscribe(topic) {
    this._topics.add(topic);
  }
  /** Unsubscribe from a topic */
  unsubscribe(topic) {
    this._topics.delete(topic);
  }
  // --- inspect ---
  toString() {
    return this.id;
  }
  [Symbol.toPrimitive]() {
    return this.id;
  }
  [Symbol.toStringTag]() {
    return "WebSocket";
  }
  [kNodeInspect]() {
    return Object.fromEntries(
      [
        ["id", this.id],
        ["remoteAddress", this.remoteAddress],
        ["peers", this.peers],
        ["webSocket", this.websocket]
      ].filter((p) => p[1])
    );
  }
}
function createWsProxy(ws, request) {
  return new Proxy(ws, {
    get: (target, prop) => {
      const value = Reflect.get(target, prop);
      if (!value) {
        switch (prop) {
          case "protocol": {
            return request?.headers?.get("sec-websocket-protocol") || "";
          }
          case "extensions": {
            return request?.headers?.get("sec-websocket-extensions") || "";
          }
          case "url": {
            return request?.url?.replace(/^http/, "ws") || void 0;
          }
        }
      }
      return value;
    }
  });
}

class AdapterHookable {
  options;
  constructor(options) {
    this.options = options || {};
  }
  callHook(name, arg1, arg2) {
    const globalHook = this.options.hooks?.[name];
    const globalPromise = globalHook?.(arg1, arg2);
    const resolveHooksPromise = this.options.resolve?.(arg1);
    if (!resolveHooksPromise) {
      return globalPromise;
    }
    const resolvePromise = resolveHooksPromise instanceof Promise ? resolveHooksPromise.then((hooks) => hooks?.[name]) : resolveHooksPromise?.[name];
    return Promise.all([globalPromise, resolvePromise]).then(
      ([globalRes, hook]) => {
        const hookResPromise = hook?.(arg1, arg2);
        return hookResPromise instanceof Promise ? hookResPromise.then((hookRes) => hookRes || globalRes) : hookResPromise || globalRes;
      }
    );
  }
  async upgrade(request) {
    let context = request.context;
    if (!context) {
      context = {};
      Object.defineProperty(request, "context", {
        enumerable: true,
        value: context
      });
    }
    try {
      const res = await this.callHook(
        "upgrade",
        request
      );
      if (!res) {
        return { context };
      }
      if (res.ok === false) {
        return { context, endResponse: res };
      }
      if (res.headers) {
        return {
          context,
          upgradeHeaders: res.headers
        };
      }
    } catch (error) {
      const errResponse = error.response || error;
      if (errResponse instanceof Response) {
        return {
          context,
          endResponse: errResponse
        };
      }
      throw error;
    }
    return { context };
  }
}

function adapterUtils(peers) {
  return {
    peers,
    publish(topic, message, options) {
      let firstPeerWithTopic;
      for (const peer of peers) {
        if (peer.topics.has(topic)) {
          firstPeerWithTopic = peer;
          break;
        }
      }
      if (firstPeerWithTopic) {
        firstPeerWithTopic.send(message, options);
        firstPeerWithTopic.publish(topic, message, options);
      }
    }
  };
}

class WSError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "WSError";
  }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var bufferUtil = {exports: {}};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;

	const BINARY_TYPES = ['nodebuffer', 'arraybuffer', 'fragments'];
	const hasBlob = typeof Blob !== 'undefined';

	if (hasBlob) BINARY_TYPES.push('blob');

	constants = {
	  BINARY_TYPES,
	  EMPTY_BUFFER: Buffer.alloc(0),
	  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
	  hasBlob,
	  kForOnEventAttribute: Symbol('kIsForOnEventAttribute'),
	  kListener: Symbol('kListener'),
	  kStatusCode: Symbol('status-code'),
	  kWebSocket: Symbol('websocket'),
	  NOOP: () => {}
	};
	return constants;
}

var hasRequiredBufferUtil;

function requireBufferUtil () {
	if (hasRequiredBufferUtil) return bufferUtil.exports;
	hasRequiredBufferUtil = 1;

	const { EMPTY_BUFFER } = requireConstants();

	const FastBuffer = Buffer[Symbol.species];

	/**
	 * Merges an array of buffers into a new buffer.
	 *
	 * @param {Buffer[]} list The array of buffers to concat
	 * @param {Number} totalLength The total length of buffers in the list
	 * @return {Buffer} The resulting buffer
	 * @public
	 */
	function concat(list, totalLength) {
	  if (list.length === 0) return EMPTY_BUFFER;
	  if (list.length === 1) return list[0];

	  const target = Buffer.allocUnsafe(totalLength);
	  let offset = 0;

	  for (let i = 0; i < list.length; i++) {
	    const buf = list[i];
	    target.set(buf, offset);
	    offset += buf.length;
	  }

	  if (offset < totalLength) {
	    return new FastBuffer(target.buffer, target.byteOffset, offset);
	  }

	  return target;
	}

	/**
	 * Masks a buffer using the given mask.
	 *
	 * @param {Buffer} source The buffer to mask
	 * @param {Buffer} mask The mask to use
	 * @param {Buffer} output The buffer where to store the result
	 * @param {Number} offset The offset at which to start writing
	 * @param {Number} length The number of bytes to mask.
	 * @public
	 */
	function _mask(source, mask, output, offset, length) {
	  for (let i = 0; i < length; i++) {
	    output[offset + i] = source[i] ^ mask[i & 3];
	  }
	}

	/**
	 * Unmasks a buffer using the given mask.
	 *
	 * @param {Buffer} buffer The buffer to unmask
	 * @param {Buffer} mask The mask to use
	 * @public
	 */
	function _unmask(buffer, mask) {
	  for (let i = 0; i < buffer.length; i++) {
	    buffer[i] ^= mask[i & 3];
	  }
	}

	/**
	 * Converts a buffer to an `ArrayBuffer`.
	 *
	 * @param {Buffer} buf The buffer to convert
	 * @return {ArrayBuffer} Converted buffer
	 * @public
	 */
	function toArrayBuffer(buf) {
	  if (buf.length === buf.buffer.byteLength) {
	    return buf.buffer;
	  }

	  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
	}

	/**
	 * Converts `data` to a `Buffer`.
	 *
	 * @param {*} data The data to convert
	 * @return {Buffer} The buffer
	 * @throws {TypeError}
	 * @public
	 */
	function toBuffer(data) {
	  toBuffer.readOnly = true;

	  if (Buffer.isBuffer(data)) return data;

	  let buf;

	  if (data instanceof ArrayBuffer) {
	    buf = new FastBuffer(data);
	  } else if (ArrayBuffer.isView(data)) {
	    buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
	  } else {
	    buf = Buffer.from(data);
	    toBuffer.readOnly = false;
	  }

	  return buf;
	}

	bufferUtil.exports = {
	  concat,
	  mask: _mask,
	  toArrayBuffer,
	  toBuffer,
	  unmask: _unmask
	};

	/* istanbul ignore else  */
	if (!process.env.WS_NO_BUFFER_UTIL) {
	  try {
	    const bufferUtil$1 = require('bufferutil');

	    bufferUtil.exports.mask = function (source, mask, output, offset, length) {
	      if (length < 48) _mask(source, mask, output, offset, length);
	      else bufferUtil$1.mask(source, mask, output, offset, length);
	    };

	    bufferUtil.exports.unmask = function (buffer, mask) {
	      if (buffer.length < 32) _unmask(buffer, mask);
	      else bufferUtil$1.unmask(buffer, mask);
	    };
	  } catch (e) {
	    // Continue regardless of the error.
	  }
	}
	return bufferUtil.exports;
}

var limiter;
var hasRequiredLimiter;

function requireLimiter () {
	if (hasRequiredLimiter) return limiter;
	hasRequiredLimiter = 1;

	const kDone = Symbol('kDone');
	const kRun = Symbol('kRun');

	/**
	 * A very simple job queue with adjustable concurrency. Adapted from
	 * https://github.com/STRML/async-limiter
	 */
	class Limiter {
	  /**
	   * Creates a new `Limiter`.
	   *
	   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
	   *     to run concurrently
	   */
	  constructor(concurrency) {
	    this[kDone] = () => {
	      this.pending--;
	      this[kRun]();
	    };
	    this.concurrency = concurrency || Infinity;
	    this.jobs = [];
	    this.pending = 0;
	  }

	  /**
	   * Adds a job to the queue.
	   *
	   * @param {Function} job The job to run
	   * @public
	   */
	  add(job) {
	    this.jobs.push(job);
	    this[kRun]();
	  }

	  /**
	   * Removes a job from the queue and runs it if possible.
	   *
	   * @private
	   */
	  [kRun]() {
	    if (this.pending === this.concurrency) return;

	    if (this.jobs.length) {
	      const job = this.jobs.shift();

	      this.pending++;
	      job(this[kDone]);
	    }
	  }
	}

	limiter = Limiter;
	return limiter;
}

var permessageDeflate;
var hasRequiredPermessageDeflate;

function requirePermessageDeflate () {
	if (hasRequiredPermessageDeflate) return permessageDeflate;
	hasRequiredPermessageDeflate = 1;

	const zlib = require$$0;

	const bufferUtil = requireBufferUtil();
	const Limiter = requireLimiter();
	const { kStatusCode } = requireConstants();

	const FastBuffer = Buffer[Symbol.species];
	const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
	const kPerMessageDeflate = Symbol('permessage-deflate');
	const kTotalLength = Symbol('total-length');
	const kCallback = Symbol('callback');
	const kBuffers = Symbol('buffers');
	const kError = Symbol('error');

	//
	// We limit zlib concurrency, which prevents severe memory fragmentation
	// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
	// and https://github.com/websockets/ws/issues/1202
	//
	// Intentionally global; it's the global thread pool that's an issue.
	//
	let zlibLimiter;

	/**
	 * permessage-deflate implementation.
	 */
	class PerMessageDeflate {
	  /**
	   * Creates a PerMessageDeflate instance.
	   *
	   * @param {Object} [options] Configuration options
	   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
	   *     for, or request, a custom client window size
	   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
	   *     acknowledge disabling of client context takeover
	   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
	   *     calls to zlib
	   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
	   *     use of a custom server window size
	   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
	   *     disabling of server context takeover
	   * @param {Number} [options.threshold=1024] Size (in bytes) below which
	   *     messages should not be compressed if context takeover is disabled
	   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
	   *     deflate
	   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
	   *     inflate
	   * @param {Boolean} [isServer=false] Create the instance in either server or
	   *     client mode
	   * @param {Number} [maxPayload=0] The maximum allowed message length
	   */
	  constructor(options, isServer, maxPayload) {
	    this._maxPayload = maxPayload | 0;
	    this._options = options || {};
	    this._threshold =
	      this._options.threshold !== undefined ? this._options.threshold : 1024;
	    this._isServer = !!isServer;
	    this._deflate = null;
	    this._inflate = null;

	    this.params = null;

	    if (!zlibLimiter) {
	      const concurrency =
	        this._options.concurrencyLimit !== undefined
	          ? this._options.concurrencyLimit
	          : 10;
	      zlibLimiter = new Limiter(concurrency);
	    }
	  }

	  /**
	   * @type {String}
	   */
	  static get extensionName() {
	    return 'permessage-deflate';
	  }

	  /**
	   * Create an extension negotiation offer.
	   *
	   * @return {Object} Extension parameters
	   * @public
	   */
	  offer() {
	    const params = {};

	    if (this._options.serverNoContextTakeover) {
	      params.server_no_context_takeover = true;
	    }
	    if (this._options.clientNoContextTakeover) {
	      params.client_no_context_takeover = true;
	    }
	    if (this._options.serverMaxWindowBits) {
	      params.server_max_window_bits = this._options.serverMaxWindowBits;
	    }
	    if (this._options.clientMaxWindowBits) {
	      params.client_max_window_bits = this._options.clientMaxWindowBits;
	    } else if (this._options.clientMaxWindowBits == null) {
	      params.client_max_window_bits = true;
	    }

	    return params;
	  }

	  /**
	   * Accept an extension negotiation offer/response.
	   *
	   * @param {Array} configurations The extension negotiation offers/reponse
	   * @return {Object} Accepted configuration
	   * @public
	   */
	  accept(configurations) {
	    configurations = this.normalizeParams(configurations);

	    this.params = this._isServer
	      ? this.acceptAsServer(configurations)
	      : this.acceptAsClient(configurations);

	    return this.params;
	  }

	  /**
	   * Releases all resources used by the extension.
	   *
	   * @public
	   */
	  cleanup() {
	    if (this._inflate) {
	      this._inflate.close();
	      this._inflate = null;
	    }

	    if (this._deflate) {
	      const callback = this._deflate[kCallback];

	      this._deflate.close();
	      this._deflate = null;

	      if (callback) {
	        callback(
	          new Error(
	            'The deflate stream was closed while data was being processed'
	          )
	        );
	      }
	    }
	  }

	  /**
	   *  Accept an extension negotiation offer.
	   *
	   * @param {Array} offers The extension negotiation offers
	   * @return {Object} Accepted configuration
	   * @private
	   */
	  acceptAsServer(offers) {
	    const opts = this._options;
	    const accepted = offers.find((params) => {
	      if (
	        (opts.serverNoContextTakeover === false &&
	          params.server_no_context_takeover) ||
	        (params.server_max_window_bits &&
	          (opts.serverMaxWindowBits === false ||
	            (typeof opts.serverMaxWindowBits === 'number' &&
	              opts.serverMaxWindowBits > params.server_max_window_bits))) ||
	        (typeof opts.clientMaxWindowBits === 'number' &&
	          !params.client_max_window_bits)
	      ) {
	        return false;
	      }

	      return true;
	    });

	    if (!accepted) {
	      throw new Error('None of the extension offers can be accepted');
	    }

	    if (opts.serverNoContextTakeover) {
	      accepted.server_no_context_takeover = true;
	    }
	    if (opts.clientNoContextTakeover) {
	      accepted.client_no_context_takeover = true;
	    }
	    if (typeof opts.serverMaxWindowBits === 'number') {
	      accepted.server_max_window_bits = opts.serverMaxWindowBits;
	    }
	    if (typeof opts.clientMaxWindowBits === 'number') {
	      accepted.client_max_window_bits = opts.clientMaxWindowBits;
	    } else if (
	      accepted.client_max_window_bits === true ||
	      opts.clientMaxWindowBits === false
	    ) {
	      delete accepted.client_max_window_bits;
	    }

	    return accepted;
	  }

	  /**
	   * Accept the extension negotiation response.
	   *
	   * @param {Array} response The extension negotiation response
	   * @return {Object} Accepted configuration
	   * @private
	   */
	  acceptAsClient(response) {
	    const params = response[0];

	    if (
	      this._options.clientNoContextTakeover === false &&
	      params.client_no_context_takeover
	    ) {
	      throw new Error('Unexpected parameter "client_no_context_takeover"');
	    }

	    if (!params.client_max_window_bits) {
	      if (typeof this._options.clientMaxWindowBits === 'number') {
	        params.client_max_window_bits = this._options.clientMaxWindowBits;
	      }
	    } else if (
	      this._options.clientMaxWindowBits === false ||
	      (typeof this._options.clientMaxWindowBits === 'number' &&
	        params.client_max_window_bits > this._options.clientMaxWindowBits)
	    ) {
	      throw new Error(
	        'Unexpected or invalid parameter "client_max_window_bits"'
	      );
	    }

	    return params;
	  }

	  /**
	   * Normalize parameters.
	   *
	   * @param {Array} configurations The extension negotiation offers/reponse
	   * @return {Array} The offers/response with normalized parameters
	   * @private
	   */
	  normalizeParams(configurations) {
	    configurations.forEach((params) => {
	      Object.keys(params).forEach((key) => {
	        let value = params[key];

	        if (value.length > 1) {
	          throw new Error(`Parameter "${key}" must have only a single value`);
	        }

	        value = value[0];

	        if (key === 'client_max_window_bits') {
	          if (value !== true) {
	            const num = +value;
	            if (!Number.isInteger(num) || num < 8 || num > 15) {
	              throw new TypeError(
	                `Invalid value for parameter "${key}": ${value}`
	              );
	            }
	            value = num;
	          } else if (!this._isServer) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	        } else if (key === 'server_max_window_bits') {
	          const num = +value;
	          if (!Number.isInteger(num) || num < 8 || num > 15) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	          value = num;
	        } else if (
	          key === 'client_no_context_takeover' ||
	          key === 'server_no_context_takeover'
	        ) {
	          if (value !== true) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	        } else {
	          throw new Error(`Unknown parameter "${key}"`);
	        }

	        params[key] = value;
	      });
	    });

	    return configurations;
	  }

	  /**
	   * Decompress data. Concurrency limited.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @public
	   */
	  decompress(data, fin, callback) {
	    zlibLimiter.add((done) => {
	      this._decompress(data, fin, (err, result) => {
	        done();
	        callback(err, result);
	      });
	    });
	  }

	  /**
	   * Compress data. Concurrency limited.
	   *
	   * @param {(Buffer|String)} data Data to compress
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @public
	   */
	  compress(data, fin, callback) {
	    zlibLimiter.add((done) => {
	      this._compress(data, fin, (err, result) => {
	        done();
	        callback(err, result);
	      });
	    });
	  }

	  /**
	   * Decompress data.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @private
	   */
	  _decompress(data, fin, callback) {
	    const endpoint = this._isServer ? 'client' : 'server';

	    if (!this._inflate) {
	      const key = `${endpoint}_max_window_bits`;
	      const windowBits =
	        typeof this.params[key] !== 'number'
	          ? zlib.Z_DEFAULT_WINDOWBITS
	          : this.params[key];

	      this._inflate = zlib.createInflateRaw({
	        ...this._options.zlibInflateOptions,
	        windowBits
	      });
	      this._inflate[kPerMessageDeflate] = this;
	      this._inflate[kTotalLength] = 0;
	      this._inflate[kBuffers] = [];
	      this._inflate.on('error', inflateOnError);
	      this._inflate.on('data', inflateOnData);
	    }

	    this._inflate[kCallback] = callback;

	    this._inflate.write(data);
	    if (fin) this._inflate.write(TRAILER);

	    this._inflate.flush(() => {
	      const err = this._inflate[kError];

	      if (err) {
	        this._inflate.close();
	        this._inflate = null;
	        callback(err);
	        return;
	      }

	      const data = bufferUtil.concat(
	        this._inflate[kBuffers],
	        this._inflate[kTotalLength]
	      );

	      if (this._inflate._readableState.endEmitted) {
	        this._inflate.close();
	        this._inflate = null;
	      } else {
	        this._inflate[kTotalLength] = 0;
	        this._inflate[kBuffers] = [];

	        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
	          this._inflate.reset();
	        }
	      }

	      callback(null, data);
	    });
	  }

	  /**
	   * Compress data.
	   *
	   * @param {(Buffer|String)} data Data to compress
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @private
	   */
	  _compress(data, fin, callback) {
	    const endpoint = this._isServer ? 'server' : 'client';

	    if (!this._deflate) {
	      const key = `${endpoint}_max_window_bits`;
	      const windowBits =
	        typeof this.params[key] !== 'number'
	          ? zlib.Z_DEFAULT_WINDOWBITS
	          : this.params[key];

	      this._deflate = zlib.createDeflateRaw({
	        ...this._options.zlibDeflateOptions,
	        windowBits
	      });

	      this._deflate[kTotalLength] = 0;
	      this._deflate[kBuffers] = [];

	      this._deflate.on('data', deflateOnData);
	    }

	    this._deflate[kCallback] = callback;

	    this._deflate.write(data);
	    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
	      if (!this._deflate) {
	        //
	        // The deflate stream was closed while data was being processed.
	        //
	        return;
	      }

	      let data = bufferUtil.concat(
	        this._deflate[kBuffers],
	        this._deflate[kTotalLength]
	      );

	      if (fin) {
	        data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
	      }

	      //
	      // Ensure that the callback will not be called again in
	      // `PerMessageDeflate#cleanup()`.
	      //
	      this._deflate[kCallback] = null;

	      this._deflate[kTotalLength] = 0;
	      this._deflate[kBuffers] = [];

	      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
	        this._deflate.reset();
	      }

	      callback(null, data);
	    });
	  }
	}

	permessageDeflate = PerMessageDeflate;

	/**
	 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function deflateOnData(chunk) {
	  this[kBuffers].push(chunk);
	  this[kTotalLength] += chunk.length;
	}

	/**
	 * The listener of the `zlib.InflateRaw` stream `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function inflateOnData(chunk) {
	  this[kTotalLength] += chunk.length;

	  if (
	    this[kPerMessageDeflate]._maxPayload < 1 ||
	    this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
	  ) {
	    this[kBuffers].push(chunk);
	    return;
	  }

	  this[kError] = new RangeError('Max payload size exceeded');
	  this[kError].code = 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH';
	  this[kError][kStatusCode] = 1009;
	  this.removeListener('data', inflateOnData);

	  //
	  // The choice to employ `zlib.reset()` over `zlib.close()` is dictated by the
	  // fact that in Node.js versions prior to 13.10.0, the callback for
	  // `zlib.flush()` is not called if `zlib.close()` is used. Utilizing
	  // `zlib.reset()` ensures that either the callback is invoked or an error is
	  // emitted.
	  //
	  this.reset();
	}

	/**
	 * The listener of the `zlib.InflateRaw` stream `'error'` event.
	 *
	 * @param {Error} err The emitted error
	 * @private
	 */
	function inflateOnError(err) {
	  //
	  // There is no need to call `Zlib#close()` as the handle is automatically
	  // closed when an error is emitted.
	  //
	  this[kPerMessageDeflate]._inflate = null;

	  if (this[kError]) {
	    this[kCallback](this[kError]);
	    return;
	  }

	  err[kStatusCode] = 1007;
	  this[kCallback](err);
	}
	return permessageDeflate;
}

var validation = {exports: {}};

var hasRequiredValidation;

function requireValidation () {
	if (hasRequiredValidation) return validation.exports;
	hasRequiredValidation = 1;

	const { isUtf8 } = require$$0$1;

	const { hasBlob } = requireConstants();

	//
	// Allowed token characters:
	//
	// '!', '#', '$', '%', '&', ''', '*', '+', '-',
	// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
	//
	// tokenChars[32] === 0 // ' '
	// tokenChars[33] === 1 // '!'
	// tokenChars[34] === 0 // '"'
	// ...
	//
	// prettier-ignore
	const tokenChars = [
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
	  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
	  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
	];

	/**
	 * Checks if a status code is allowed in a close frame.
	 *
	 * @param {Number} code The status code
	 * @return {Boolean} `true` if the status code is valid, else `false`
	 * @public
	 */
	function isValidStatusCode(code) {
	  return (
	    (code >= 1000 &&
	      code <= 1014 &&
	      code !== 1004 &&
	      code !== 1005 &&
	      code !== 1006) ||
	    (code >= 3000 && code <= 4999)
	  );
	}

	/**
	 * Checks if a given buffer contains only correct UTF-8.
	 * Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
	 * Markus Kuhn.
	 *
	 * @param {Buffer} buf The buffer to check
	 * @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
	 * @public
	 */
	function _isValidUTF8(buf) {
	  const len = buf.length;
	  let i = 0;

	  while (i < len) {
	    if ((buf[i] & 0x80) === 0) {
	      // 0xxxxxxx
	      i++;
	    } else if ((buf[i] & 0xe0) === 0xc0) {
	      // 110xxxxx 10xxxxxx
	      if (
	        i + 1 === len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i] & 0xfe) === 0xc0 // Overlong
	      ) {
	        return false;
	      }

	      i += 2;
	    } else if ((buf[i] & 0xf0) === 0xe0) {
	      // 1110xxxx 10xxxxxx 10xxxxxx
	      if (
	        i + 2 >= len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i + 2] & 0xc0) !== 0x80 ||
	        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
	        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
	      ) {
	        return false;
	      }

	      i += 3;
	    } else if ((buf[i] & 0xf8) === 0xf0) {
	      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
	      if (
	        i + 3 >= len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i + 2] & 0xc0) !== 0x80 ||
	        (buf[i + 3] & 0xc0) !== 0x80 ||
	        (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
	        (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
	        buf[i] > 0xf4 // > U+10FFFF
	      ) {
	        return false;
	      }

	      i += 4;
	    } else {
	      return false;
	    }
	  }

	  return true;
	}

	/**
	 * Determines whether a value is a `Blob`.
	 *
	 * @param {*} value The value to be tested
	 * @return {Boolean} `true` if `value` is a `Blob`, else `false`
	 * @private
	 */
	function isBlob(value) {
	  return (
	    hasBlob &&
	    typeof value === 'object' &&
	    typeof value.arrayBuffer === 'function' &&
	    typeof value.type === 'string' &&
	    typeof value.stream === 'function' &&
	    (value[Symbol.toStringTag] === 'Blob' ||
	      value[Symbol.toStringTag] === 'File')
	  );
	}

	validation.exports = {
	  isBlob,
	  isValidStatusCode,
	  isValidUTF8: _isValidUTF8,
	  tokenChars
	};

	if (isUtf8) {
	  validation.exports.isValidUTF8 = function (buf) {
	    return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
	  };
	} /* istanbul ignore else  */ else if (!process.env.WS_NO_UTF_8_VALIDATE) {
	  try {
	    const isValidUTF8 = require('utf-8-validate');

	    validation.exports.isValidUTF8 = function (buf) {
	      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
	    };
	  } catch (e) {
	    // Continue regardless of the error.
	  }
	}
	return validation.exports;
}

var receiver;
var hasRequiredReceiver;

function requireReceiver () {
	if (hasRequiredReceiver) return receiver;
	hasRequiredReceiver = 1;

	const { Writable } = require$$0$2;

	const PerMessageDeflate = requirePermessageDeflate();
	const {
	  BINARY_TYPES,
	  EMPTY_BUFFER,
	  kStatusCode,
	  kWebSocket
	} = requireConstants();
	const { concat, toArrayBuffer, unmask } = requireBufferUtil();
	const { isValidStatusCode, isValidUTF8 } = requireValidation();

	const FastBuffer = Buffer[Symbol.species];

	const GET_INFO = 0;
	const GET_PAYLOAD_LENGTH_16 = 1;
	const GET_PAYLOAD_LENGTH_64 = 2;
	const GET_MASK = 3;
	const GET_DATA = 4;
	const INFLATING = 5;
	const DEFER_EVENT = 6;

	/**
	 * HyBi Receiver implementation.
	 *
	 * @extends Writable
	 */
	class Receiver extends Writable {
	  /**
	   * Creates a Receiver instance.
	   *
	   * @param {Object} [options] Options object
	   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {String} [options.binaryType=nodebuffer] The type for binary data
	   * @param {Object} [options.extensions] An object containing the negotiated
	   *     extensions
	   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
	   *     client or server mode
	   * @param {Number} [options.maxPayload=0] The maximum allowed message length
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   */
	  constructor(options = {}) {
	    super();

	    this._allowSynchronousEvents =
	      options.allowSynchronousEvents !== undefined
	        ? options.allowSynchronousEvents
	        : true;
	    this._binaryType = options.binaryType || BINARY_TYPES[0];
	    this._extensions = options.extensions || {};
	    this._isServer = !!options.isServer;
	    this._maxPayload = options.maxPayload | 0;
	    this._skipUTF8Validation = !!options.skipUTF8Validation;
	    this[kWebSocket] = undefined;

	    this._bufferedBytes = 0;
	    this._buffers = [];

	    this._compressed = false;
	    this._payloadLength = 0;
	    this._mask = undefined;
	    this._fragmented = 0;
	    this._masked = false;
	    this._fin = false;
	    this._opcode = 0;

	    this._totalPayloadLength = 0;
	    this._messageLength = 0;
	    this._fragments = [];

	    this._errored = false;
	    this._loop = false;
	    this._state = GET_INFO;
	  }

	  /**
	   * Implements `Writable.prototype._write()`.
	   *
	   * @param {Buffer} chunk The chunk of data to write
	   * @param {String} encoding The character encoding of `chunk`
	   * @param {Function} cb Callback
	   * @private
	   */
	  _write(chunk, encoding, cb) {
	    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

	    this._bufferedBytes += chunk.length;
	    this._buffers.push(chunk);
	    this.startLoop(cb);
	  }

	  /**
	   * Consumes `n` bytes from the buffered data.
	   *
	   * @param {Number} n The number of bytes to consume
	   * @return {Buffer} The consumed bytes
	   * @private
	   */
	  consume(n) {
	    this._bufferedBytes -= n;

	    if (n === this._buffers[0].length) return this._buffers.shift();

	    if (n < this._buffers[0].length) {
	      const buf = this._buffers[0];
	      this._buffers[0] = new FastBuffer(
	        buf.buffer,
	        buf.byteOffset + n,
	        buf.length - n
	      );

	      return new FastBuffer(buf.buffer, buf.byteOffset, n);
	    }

	    const dst = Buffer.allocUnsafe(n);

	    do {
	      const buf = this._buffers[0];
	      const offset = dst.length - n;

	      if (n >= buf.length) {
	        dst.set(this._buffers.shift(), offset);
	      } else {
	        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
	        this._buffers[0] = new FastBuffer(
	          buf.buffer,
	          buf.byteOffset + n,
	          buf.length - n
	        );
	      }

	      n -= buf.length;
	    } while (n > 0);

	    return dst;
	  }

	  /**
	   * Starts the parsing loop.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  startLoop(cb) {
	    this._loop = true;

	    do {
	      switch (this._state) {
	        case GET_INFO:
	          this.getInfo(cb);
	          break;
	        case GET_PAYLOAD_LENGTH_16:
	          this.getPayloadLength16(cb);
	          break;
	        case GET_PAYLOAD_LENGTH_64:
	          this.getPayloadLength64(cb);
	          break;
	        case GET_MASK:
	          this.getMask();
	          break;
	        case GET_DATA:
	          this.getData(cb);
	          break;
	        case INFLATING:
	        case DEFER_EVENT:
	          this._loop = false;
	          return;
	      }
	    } while (this._loop);

	    if (!this._errored) cb();
	  }

	  /**
	   * Reads the first two bytes of a frame.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getInfo(cb) {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(2);

	    if ((buf[0] & 0x30) !== 0x00) {
	      const error = this.createError(
	        RangeError,
	        'RSV2 and RSV3 must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_RSV_2_3'
	      );

	      cb(error);
	      return;
	    }

	    const compressed = (buf[0] & 0x40) === 0x40;

	    if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
	      const error = this.createError(
	        RangeError,
	        'RSV1 must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_RSV_1'
	      );

	      cb(error);
	      return;
	    }

	    this._fin = (buf[0] & 0x80) === 0x80;
	    this._opcode = buf[0] & 0x0f;
	    this._payloadLength = buf[1] & 0x7f;

	    if (this._opcode === 0x00) {
	      if (compressed) {
	        const error = this.createError(
	          RangeError,
	          'RSV1 must be clear',
	          true,
	          1002,
	          'WS_ERR_UNEXPECTED_RSV_1'
	        );

	        cb(error);
	        return;
	      }

	      if (!this._fragmented) {
	        const error = this.createError(
	          RangeError,
	          'invalid opcode 0',
	          true,
	          1002,
	          'WS_ERR_INVALID_OPCODE'
	        );

	        cb(error);
	        return;
	      }

	      this._opcode = this._fragmented;
	    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
	      if (this._fragmented) {
	        const error = this.createError(
	          RangeError,
	          `invalid opcode ${this._opcode}`,
	          true,
	          1002,
	          'WS_ERR_INVALID_OPCODE'
	        );

	        cb(error);
	        return;
	      }

	      this._compressed = compressed;
	    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
	      if (!this._fin) {
	        const error = this.createError(
	          RangeError,
	          'FIN must be set',
	          true,
	          1002,
	          'WS_ERR_EXPECTED_FIN'
	        );

	        cb(error);
	        return;
	      }

	      if (compressed) {
	        const error = this.createError(
	          RangeError,
	          'RSV1 must be clear',
	          true,
	          1002,
	          'WS_ERR_UNEXPECTED_RSV_1'
	        );

	        cb(error);
	        return;
	      }

	      if (
	        this._payloadLength > 0x7d ||
	        (this._opcode === 0x08 && this._payloadLength === 1)
	      ) {
	        const error = this.createError(
	          RangeError,
	          `invalid payload length ${this._payloadLength}`,
	          true,
	          1002,
	          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
	        );

	        cb(error);
	        return;
	      }
	    } else {
	      const error = this.createError(
	        RangeError,
	        `invalid opcode ${this._opcode}`,
	        true,
	        1002,
	        'WS_ERR_INVALID_OPCODE'
	      );

	      cb(error);
	      return;
	    }

	    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
	    this._masked = (buf[1] & 0x80) === 0x80;

	    if (this._isServer) {
	      if (!this._masked) {
	        const error = this.createError(
	          RangeError,
	          'MASK must be set',
	          true,
	          1002,
	          'WS_ERR_EXPECTED_MASK'
	        );

	        cb(error);
	        return;
	      }
	    } else if (this._masked) {
	      const error = this.createError(
	        RangeError,
	        'MASK must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_MASK'
	      );

	      cb(error);
	      return;
	    }

	    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
	    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
	    else this.haveLength(cb);
	  }

	  /**
	   * Gets extended payload length (7+16).
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getPayloadLength16(cb) {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    this._payloadLength = this.consume(2).readUInt16BE(0);
	    this.haveLength(cb);
	  }

	  /**
	   * Gets extended payload length (7+64).
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getPayloadLength64(cb) {
	    if (this._bufferedBytes < 8) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(8);
	    const num = buf.readUInt32BE(0);

	    //
	    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
	    // if payload length is greater than this number.
	    //
	    if (num > Math.pow(2, 53 - 32) - 1) {
	      const error = this.createError(
	        RangeError,
	        'Unsupported WebSocket frame: payload length > 2^53 - 1',
	        false,
	        1009,
	        'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH'
	      );

	      cb(error);
	      return;
	    }

	    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
	    this.haveLength(cb);
	  }

	  /**
	   * Payload length has been read.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  haveLength(cb) {
	    if (this._payloadLength && this._opcode < 0x08) {
	      this._totalPayloadLength += this._payloadLength;
	      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
	        const error = this.createError(
	          RangeError,
	          'Max payload size exceeded',
	          false,
	          1009,
	          'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
	        );

	        cb(error);
	        return;
	      }
	    }

	    if (this._masked) this._state = GET_MASK;
	    else this._state = GET_DATA;
	  }

	  /**
	   * Reads mask bytes.
	   *
	   * @private
	   */
	  getMask() {
	    if (this._bufferedBytes < 4) {
	      this._loop = false;
	      return;
	    }

	    this._mask = this.consume(4);
	    this._state = GET_DATA;
	  }

	  /**
	   * Reads data bytes.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getData(cb) {
	    let data = EMPTY_BUFFER;

	    if (this._payloadLength) {
	      if (this._bufferedBytes < this._payloadLength) {
	        this._loop = false;
	        return;
	      }

	      data = this.consume(this._payloadLength);

	      if (
	        this._masked &&
	        (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0
	      ) {
	        unmask(data, this._mask);
	      }
	    }

	    if (this._opcode > 0x07) {
	      this.controlMessage(data, cb);
	      return;
	    }

	    if (this._compressed) {
	      this._state = INFLATING;
	      this.decompress(data, cb);
	      return;
	    }

	    if (data.length) {
	      //
	      // This message is not compressed so its length is the sum of the payload
	      // length of all fragments.
	      //
	      this._messageLength = this._totalPayloadLength;
	      this._fragments.push(data);
	    }

	    this.dataMessage(cb);
	  }

	  /**
	   * Decompresses data.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Function} cb Callback
	   * @private
	   */
	  decompress(data, cb) {
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
	      if (err) return cb(err);

	      if (buf.length) {
	        this._messageLength += buf.length;
	        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
	          const error = this.createError(
	            RangeError,
	            'Max payload size exceeded',
	            false,
	            1009,
	            'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
	          );

	          cb(error);
	          return;
	        }

	        this._fragments.push(buf);
	      }

	      this.dataMessage(cb);
	      if (this._state === GET_INFO) this.startLoop(cb);
	    });
	  }

	  /**
	   * Handles a data message.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  dataMessage(cb) {
	    if (!this._fin) {
	      this._state = GET_INFO;
	      return;
	    }

	    const messageLength = this._messageLength;
	    const fragments = this._fragments;

	    this._totalPayloadLength = 0;
	    this._messageLength = 0;
	    this._fragmented = 0;
	    this._fragments = [];

	    if (this._opcode === 2) {
	      let data;

	      if (this._binaryType === 'nodebuffer') {
	        data = concat(fragments, messageLength);
	      } else if (this._binaryType === 'arraybuffer') {
	        data = toArrayBuffer(concat(fragments, messageLength));
	      } else if (this._binaryType === 'blob') {
	        data = new Blob(fragments);
	      } else {
	        data = fragments;
	      }

	      if (this._allowSynchronousEvents) {
	        this.emit('message', data, true);
	        this._state = GET_INFO;
	      } else {
	        this._state = DEFER_EVENT;
	        setImmediate(() => {
	          this.emit('message', data, true);
	          this._state = GET_INFO;
	          this.startLoop(cb);
	        });
	      }
	    } else {
	      const buf = concat(fragments, messageLength);

	      if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
	        const error = this.createError(
	          Error,
	          'invalid UTF-8 sequence',
	          true,
	          1007,
	          'WS_ERR_INVALID_UTF8'
	        );

	        cb(error);
	        return;
	      }

	      if (this._state === INFLATING || this._allowSynchronousEvents) {
	        this.emit('message', buf, false);
	        this._state = GET_INFO;
	      } else {
	        this._state = DEFER_EVENT;
	        setImmediate(() => {
	          this.emit('message', buf, false);
	          this._state = GET_INFO;
	          this.startLoop(cb);
	        });
	      }
	    }
	  }

	  /**
	   * Handles a control message.
	   *
	   * @param {Buffer} data Data to handle
	   * @return {(Error|RangeError|undefined)} A possible error
	   * @private
	   */
	  controlMessage(data, cb) {
	    if (this._opcode === 0x08) {
	      if (data.length === 0) {
	        this._loop = false;
	        this.emit('conclude', 1005, EMPTY_BUFFER);
	        this.end();
	      } else {
	        const code = data.readUInt16BE(0);

	        if (!isValidStatusCode(code)) {
	          const error = this.createError(
	            RangeError,
	            `invalid status code ${code}`,
	            true,
	            1002,
	            'WS_ERR_INVALID_CLOSE_CODE'
	          );

	          cb(error);
	          return;
	        }

	        const buf = new FastBuffer(
	          data.buffer,
	          data.byteOffset + 2,
	          data.length - 2
	        );

	        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
	          const error = this.createError(
	            Error,
	            'invalid UTF-8 sequence',
	            true,
	            1007,
	            'WS_ERR_INVALID_UTF8'
	          );

	          cb(error);
	          return;
	        }

	        this._loop = false;
	        this.emit('conclude', code, buf);
	        this.end();
	      }

	      this._state = GET_INFO;
	      return;
	    }

	    if (this._allowSynchronousEvents) {
	      this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
	      this._state = GET_INFO;
	    } else {
	      this._state = DEFER_EVENT;
	      setImmediate(() => {
	        this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
	        this._state = GET_INFO;
	        this.startLoop(cb);
	      });
	    }
	  }

	  /**
	   * Builds an error object.
	   *
	   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
	   * @param {String} message The error message
	   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
	   *     `message`
	   * @param {Number} statusCode The status code
	   * @param {String} errorCode The exposed error code
	   * @return {(Error|RangeError)} The error
	   * @private
	   */
	  createError(ErrorCtor, message, prefix, statusCode, errorCode) {
	    this._loop = false;
	    this._errored = true;

	    const err = new ErrorCtor(
	      prefix ? `Invalid WebSocket frame: ${message}` : message
	    );

	    Error.captureStackTrace(err, this.createError);
	    err.code = errorCode;
	    err[kStatusCode] = statusCode;
	    return err;
	  }
	}

	receiver = Receiver;
	return receiver;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex" }] */

var sender;
var hasRequiredSender;

function requireSender () {
	if (hasRequiredSender) return sender;
	hasRequiredSender = 1;

	const { Duplex } = require$$0$2;
	const { randomFillSync } = require$$1;

	const PerMessageDeflate = requirePermessageDeflate();
	const { EMPTY_BUFFER, kWebSocket, NOOP } = requireConstants();
	const { isBlob, isValidStatusCode } = requireValidation();
	const { mask: applyMask, toBuffer } = requireBufferUtil();

	const kByteLength = Symbol('kByteLength');
	const maskBuffer = Buffer.alloc(4);
	const RANDOM_POOL_SIZE = 8 * 1024;
	let randomPool;
	let randomPoolPointer = RANDOM_POOL_SIZE;

	const DEFAULT = 0;
	const DEFLATING = 1;
	const GET_BLOB_DATA = 2;

	/**
	 * HyBi Sender implementation.
	 */
	class Sender {
	  /**
	   * Creates a Sender instance.
	   *
	   * @param {Duplex} socket The connection socket
	   * @param {Object} [extensions] An object containing the negotiated extensions
	   * @param {Function} [generateMask] The function used to generate the masking
	   *     key
	   */
	  constructor(socket, extensions, generateMask) {
	    this._extensions = extensions || {};

	    if (generateMask) {
	      this._generateMask = generateMask;
	      this._maskBuffer = Buffer.alloc(4);
	    }

	    this._socket = socket;

	    this._firstFragment = true;
	    this._compress = false;

	    this._bufferedBytes = 0;
	    this._queue = [];
	    this._state = DEFAULT;
	    this.onerror = NOOP;
	    this[kWebSocket] = undefined;
	  }

	  /**
	   * Frames a piece of data according to the HyBi WebSocket protocol.
	   *
	   * @param {(Buffer|String)} data The data to frame
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @return {(Buffer|String)[]} The framed data
	   * @public
	   */
	  static frame(data, options) {
	    let mask;
	    let merge = false;
	    let offset = 2;
	    let skipMasking = false;

	    if (options.mask) {
	      mask = options.maskBuffer || maskBuffer;

	      if (options.generateMask) {
	        options.generateMask(mask);
	      } else {
	        if (randomPoolPointer === RANDOM_POOL_SIZE) {
	          /* istanbul ignore else  */
	          if (randomPool === undefined) {
	            //
	            // This is lazily initialized because server-sent frames must not
	            // be masked so it may never be used.
	            //
	            randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
	          }

	          randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
	          randomPoolPointer = 0;
	        }

	        mask[0] = randomPool[randomPoolPointer++];
	        mask[1] = randomPool[randomPoolPointer++];
	        mask[2] = randomPool[randomPoolPointer++];
	        mask[3] = randomPool[randomPoolPointer++];
	      }

	      skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
	      offset = 6;
	    }

	    let dataLength;

	    if (typeof data === 'string') {
	      if (
	        (!options.mask || skipMasking) &&
	        options[kByteLength] !== undefined
	      ) {
	        dataLength = options[kByteLength];
	      } else {
	        data = Buffer.from(data);
	        dataLength = data.length;
	      }
	    } else {
	      dataLength = data.length;
	      merge = options.mask && options.readOnly && !skipMasking;
	    }

	    let payloadLength = dataLength;

	    if (dataLength >= 65536) {
	      offset += 8;
	      payloadLength = 127;
	    } else if (dataLength > 125) {
	      offset += 2;
	      payloadLength = 126;
	    }

	    const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);

	    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
	    if (options.rsv1) target[0] |= 0x40;

	    target[1] = payloadLength;

	    if (payloadLength === 126) {
	      target.writeUInt16BE(dataLength, 2);
	    } else if (payloadLength === 127) {
	      target[2] = target[3] = 0;
	      target.writeUIntBE(dataLength, 4, 6);
	    }

	    if (!options.mask) return [target, data];

	    target[1] |= 0x80;
	    target[offset - 4] = mask[0];
	    target[offset - 3] = mask[1];
	    target[offset - 2] = mask[2];
	    target[offset - 1] = mask[3];

	    if (skipMasking) return [target, data];

	    if (merge) {
	      applyMask(data, mask, target, offset, dataLength);
	      return [target];
	    }

	    applyMask(data, mask, data, 0, dataLength);
	    return [target, data];
	  }

	  /**
	   * Sends a close message to the other peer.
	   *
	   * @param {Number} [code] The status code component of the body
	   * @param {(String|Buffer)} [data] The message component of the body
	   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  close(code, data, mask, cb) {
	    let buf;

	    if (code === undefined) {
	      buf = EMPTY_BUFFER;
	    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
	      throw new TypeError('First argument must be a valid error code number');
	    } else if (data === undefined || !data.length) {
	      buf = Buffer.allocUnsafe(2);
	      buf.writeUInt16BE(code, 0);
	    } else {
	      const length = Buffer.byteLength(data);

	      if (length > 123) {
	        throw new RangeError('The message must not be greater than 123 bytes');
	      }

	      buf = Buffer.allocUnsafe(2 + length);
	      buf.writeUInt16BE(code, 0);

	      if (typeof data === 'string') {
	        buf.write(data, 2);
	      } else {
	        buf.set(data, 2);
	      }
	    }

	    const options = {
	      [kByteLength]: buf.length,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x08,
	      readOnly: false,
	      rsv1: false
	    };

	    if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, buf, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(buf, options), cb);
	    }
	  }

	  /**
	   * Sends a ping message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  ping(data, mask, cb) {
	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (byteLength > 125) {
	      throw new RangeError('The data size must not be greater than 125 bytes');
	    }

	    const options = {
	      [kByteLength]: byteLength,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x09,
	      readOnly,
	      rsv1: false
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, false, options, cb]);
	      } else {
	        this.getBlobData(data, false, options, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(data, options), cb);
	    }
	  }

	  /**
	   * Sends a pong message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  pong(data, mask, cb) {
	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (byteLength > 125) {
	      throw new RangeError('The data size must not be greater than 125 bytes');
	    }

	    const options = {
	      [kByteLength]: byteLength,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x0a,
	      readOnly,
	      rsv1: false
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, false, options, cb]);
	      } else {
	        this.getBlobData(data, false, options, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(data, options), cb);
	    }
	  }

	  /**
	   * Sends a data message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Object} options Options object
	   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
	   *     or text
	   * @param {Boolean} [options.compress=false] Specifies whether or not to
	   *     compress `data`
	   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
	   *     last one
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  send(data, options, cb) {
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
	    let opcode = options.binary ? 2 : 1;
	    let rsv1 = options.compress;

	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (this._firstFragment) {
	      this._firstFragment = false;
	      if (
	        rsv1 &&
	        perMessageDeflate &&
	        perMessageDeflate.params[
	          perMessageDeflate._isServer
	            ? 'server_no_context_takeover'
	            : 'client_no_context_takeover'
	        ]
	      ) {
	        rsv1 = byteLength >= perMessageDeflate._threshold;
	      }
	      this._compress = rsv1;
	    } else {
	      rsv1 = false;
	      opcode = 0;
	    }

	    if (options.fin) this._firstFragment = true;

	    const opts = {
	      [kByteLength]: byteLength,
	      fin: options.fin,
	      generateMask: this._generateMask,
	      mask: options.mask,
	      maskBuffer: this._maskBuffer,
	      opcode,
	      readOnly,
	      rsv1
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
	      } else {
	        this.getBlobData(data, this._compress, opts, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, this._compress, opts, cb]);
	    } else {
	      this.dispatch(data, this._compress, opts, cb);
	    }
	  }

	  /**
	   * Gets the contents of a blob as binary data.
	   *
	   * @param {Blob} blob The blob
	   * @param {Boolean} [compress=false] Specifies whether or not to compress
	   *     the data
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  getBlobData(blob, compress, options, cb) {
	    this._bufferedBytes += options[kByteLength];
	    this._state = GET_BLOB_DATA;

	    blob
	      .arrayBuffer()
	      .then((arrayBuffer) => {
	        if (this._socket.destroyed) {
	          const err = new Error(
	            'The socket was closed while the blob was being read'
	          );

	          //
	          // `callCallbacks` is called in the next tick to ensure that errors
	          // that might be thrown in the callbacks behave like errors thrown
	          // outside the promise chain.
	          //
	          process.nextTick(callCallbacks, this, err, cb);
	          return;
	        }

	        this._bufferedBytes -= options[kByteLength];
	        const data = toBuffer(arrayBuffer);

	        if (!compress) {
	          this._state = DEFAULT;
	          this.sendFrame(Sender.frame(data, options), cb);
	          this.dequeue();
	        } else {
	          this.dispatch(data, compress, options, cb);
	        }
	      })
	      .catch((err) => {
	        //
	        // `onError` is called in the next tick for the same reason that
	        // `callCallbacks` above is.
	        //
	        process.nextTick(onError, this, err, cb);
	      });
	  }

	  /**
	   * Dispatches a message.
	   *
	   * @param {(Buffer|String)} data The message to send
	   * @param {Boolean} [compress=false] Specifies whether or not to compress
	   *     `data`
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  dispatch(data, compress, options, cb) {
	    if (!compress) {
	      this.sendFrame(Sender.frame(data, options), cb);
	      return;
	    }

	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    this._bufferedBytes += options[kByteLength];
	    this._state = DEFLATING;
	    perMessageDeflate.compress(data, options.fin, (_, buf) => {
	      if (this._socket.destroyed) {
	        const err = new Error(
	          'The socket was closed while data was being compressed'
	        );

	        callCallbacks(this, err, cb);
	        return;
	      }

	      this._bufferedBytes -= options[kByteLength];
	      this._state = DEFAULT;
	      options.readOnly = false;
	      this.sendFrame(Sender.frame(buf, options), cb);
	      this.dequeue();
	    });
	  }

	  /**
	   * Executes queued send operations.
	   *
	   * @private
	   */
	  dequeue() {
	    while (this._state === DEFAULT && this._queue.length) {
	      const params = this._queue.shift();

	      this._bufferedBytes -= params[3][kByteLength];
	      Reflect.apply(params[0], this, params.slice(1));
	    }
	  }

	  /**
	   * Enqueues a send operation.
	   *
	   * @param {Array} params Send operation parameters.
	   * @private
	   */
	  enqueue(params) {
	    this._bufferedBytes += params[3][kByteLength];
	    this._queue.push(params);
	  }

	  /**
	   * Sends a frame.
	   *
	   * @param {(Buffer | String)[]} list The frame to send
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  sendFrame(list, cb) {
	    if (list.length === 2) {
	      this._socket.cork();
	      this._socket.write(list[0]);
	      this._socket.write(list[1], cb);
	      this._socket.uncork();
	    } else {
	      this._socket.write(list[0], cb);
	    }
	  }
	}

	sender = Sender;

	/**
	 * Calls queued callbacks with an error.
	 *
	 * @param {Sender} sender The `Sender` instance
	 * @param {Error} err The error to call the callbacks with
	 * @param {Function} [cb] The first callback
	 * @private
	 */
	function callCallbacks(sender, err, cb) {
	  if (typeof cb === 'function') cb(err);

	  for (let i = 0; i < sender._queue.length; i++) {
	    const params = sender._queue[i];
	    const callback = params[params.length - 1];

	    if (typeof callback === 'function') callback(err);
	  }
	}

	/**
	 * Handles a `Sender` error.
	 *
	 * @param {Sender} sender The `Sender` instance
	 * @param {Error} err The error
	 * @param {Function} [cb] The first pending callback
	 * @private
	 */
	function onError(sender, err, cb) {
	  callCallbacks(sender, err, cb);
	  sender.onerror(err);
	}
	return sender;
}

var eventTarget;
var hasRequiredEventTarget;

function requireEventTarget () {
	if (hasRequiredEventTarget) return eventTarget;
	hasRequiredEventTarget = 1;

	const { kForOnEventAttribute, kListener } = requireConstants();

	const kCode = Symbol('kCode');
	const kData = Symbol('kData');
	const kError = Symbol('kError');
	const kMessage = Symbol('kMessage');
	const kReason = Symbol('kReason');
	const kTarget = Symbol('kTarget');
	const kType = Symbol('kType');
	const kWasClean = Symbol('kWasClean');

	/**
	 * Class representing an event.
	 */
	class Event {
	  /**
	   * Create a new `Event`.
	   *
	   * @param {String} type The name of the event
	   * @throws {TypeError} If the `type` argument is not specified
	   */
	  constructor(type) {
	    this[kTarget] = null;
	    this[kType] = type;
	  }

	  /**
	   * @type {*}
	   */
	  get target() {
	    return this[kTarget];
	  }

	  /**
	   * @type {String}
	   */
	  get type() {
	    return this[kType];
	  }
	}

	Object.defineProperty(Event.prototype, 'target', { enumerable: true });
	Object.defineProperty(Event.prototype, 'type', { enumerable: true });

	/**
	 * Class representing a close event.
	 *
	 * @extends Event
	 */
	class CloseEvent extends Event {
	  /**
	   * Create a new `CloseEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {Number} [options.code=0] The status code explaining why the
	   *     connection was closed
	   * @param {String} [options.reason=''] A human-readable string explaining why
	   *     the connection was closed
	   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
	   *     connection was cleanly closed
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kCode] = options.code === undefined ? 0 : options.code;
	    this[kReason] = options.reason === undefined ? '' : options.reason;
	    this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
	  }

	  /**
	   * @type {Number}
	   */
	  get code() {
	    return this[kCode];
	  }

	  /**
	   * @type {String}
	   */
	  get reason() {
	    return this[kReason];
	  }

	  /**
	   * @type {Boolean}
	   */
	  get wasClean() {
	    return this[kWasClean];
	  }
	}

	Object.defineProperty(CloseEvent.prototype, 'code', { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, 'reason', { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, 'wasClean', { enumerable: true });

	/**
	 * Class representing an error event.
	 *
	 * @extends Event
	 */
	class ErrorEvent extends Event {
	  /**
	   * Create a new `ErrorEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {*} [options.error=null] The error that generated this event
	   * @param {String} [options.message=''] The error message
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kError] = options.error === undefined ? null : options.error;
	    this[kMessage] = options.message === undefined ? '' : options.message;
	  }

	  /**
	   * @type {*}
	   */
	  get error() {
	    return this[kError];
	  }

	  /**
	   * @type {String}
	   */
	  get message() {
	    return this[kMessage];
	  }
	}

	Object.defineProperty(ErrorEvent.prototype, 'error', { enumerable: true });
	Object.defineProperty(ErrorEvent.prototype, 'message', { enumerable: true });

	/**
	 * Class representing a message event.
	 *
	 * @extends Event
	 */
	class MessageEvent extends Event {
	  /**
	   * Create a new `MessageEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {*} [options.data=null] The message content
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kData] = options.data === undefined ? null : options.data;
	  }

	  /**
	   * @type {*}
	   */
	  get data() {
	    return this[kData];
	  }
	}

	Object.defineProperty(MessageEvent.prototype, 'data', { enumerable: true });

	/**
	 * This provides methods for emulating the `EventTarget` interface. It's not
	 * meant to be used directly.
	 *
	 * @mixin
	 */
	const EventTarget = {
	  /**
	   * Register an event listener.
	   *
	   * @param {String} type A string representing the event type to listen for
	   * @param {(Function|Object)} handler The listener to add
	   * @param {Object} [options] An options object specifies characteristics about
	   *     the event listener
	   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
	   *     listener should be invoked at most once after being added. If `true`,
	   *     the listener would be automatically removed when invoked.
	   * @public
	   */
	  addEventListener(type, handler, options = {}) {
	    for (const listener of this.listeners(type)) {
	      if (
	        !options[kForOnEventAttribute] &&
	        listener[kListener] === handler &&
	        !listener[kForOnEventAttribute]
	      ) {
	        return;
	      }
	    }

	    let wrapper;

	    if (type === 'message') {
	      wrapper = function onMessage(data, isBinary) {
	        const event = new MessageEvent('message', {
	          data: isBinary ? data : data.toString()
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'close') {
	      wrapper = function onClose(code, message) {
	        const event = new CloseEvent('close', {
	          code,
	          reason: message.toString(),
	          wasClean: this._closeFrameReceived && this._closeFrameSent
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'error') {
	      wrapper = function onError(error) {
	        const event = new ErrorEvent('error', {
	          error,
	          message: error.message
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'open') {
	      wrapper = function onOpen() {
	        const event = new Event('open');

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else {
	      return;
	    }

	    wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
	    wrapper[kListener] = handler;

	    if (options.once) {
	      this.once(type, wrapper);
	    } else {
	      this.on(type, wrapper);
	    }
	  },

	  /**
	   * Remove an event listener.
	   *
	   * @param {String} type A string representing the event type to remove
	   * @param {(Function|Object)} handler The listener to remove
	   * @public
	   */
	  removeEventListener(type, handler) {
	    for (const listener of this.listeners(type)) {
	      if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
	        this.removeListener(type, listener);
	        break;
	      }
	    }
	  }
	};

	eventTarget = {
	  CloseEvent,
	  ErrorEvent,
	  Event,
	  EventTarget,
	  MessageEvent
	};

	/**
	 * Call an event listener
	 *
	 * @param {(Function|Object)} listener The listener to call
	 * @param {*} thisArg The value to use as `this`` when calling the listener
	 * @param {Event} event The event to pass to the listener
	 * @private
	 */
	function callListener(listener, thisArg, event) {
	  if (typeof listener === 'object' && listener.handleEvent) {
	    listener.handleEvent.call(listener, event);
	  } else {
	    listener.call(thisArg, event);
	  }
	}
	return eventTarget;
}

var extension;
var hasRequiredExtension;

function requireExtension () {
	if (hasRequiredExtension) return extension;
	hasRequiredExtension = 1;

	const { tokenChars } = requireValidation();

	/**
	 * Adds an offer to the map of extension offers or a parameter to the map of
	 * parameters.
	 *
	 * @param {Object} dest The map of extension offers or parameters
	 * @param {String} name The extension or parameter name
	 * @param {(Object|Boolean|String)} elem The extension parameters or the
	 *     parameter value
	 * @private
	 */
	function push(dest, name, elem) {
	  if (dest[name] === undefined) dest[name] = [elem];
	  else dest[name].push(elem);
	}

	/**
	 * Parses the `Sec-WebSocket-Extensions` header into an object.
	 *
	 * @param {String} header The field value of the header
	 * @return {Object} The parsed object
	 * @public
	 */
	function parse(header) {
	  const offers = Object.create(null);
	  let params = Object.create(null);
	  let mustUnescape = false;
	  let isEscaping = false;
	  let inQuotes = false;
	  let extensionName;
	  let paramName;
	  let start = -1;
	  let code = -1;
	  let end = -1;
	  let i = 0;

	  for (; i < header.length; i++) {
	    code = header.charCodeAt(i);

	    if (extensionName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (
	        i !== 0 &&
	        (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
	      ) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        const name = header.slice(start, end);
	        if (code === 0x2c) {
	          push(offers, name, params);
	          params = Object.create(null);
	        } else {
	          extensionName = name;
	        }

	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else if (paramName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (code === 0x20 || code === 0x09) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        push(params, header.slice(start, end), true);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        start = end = -1;
	      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
	        paramName = header.slice(start, i);
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else {
	      //
	      // The value of a quoted-string after unescaping must conform to the
	      // token ABNF, so only token characters are valid.
	      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
	      //
	      if (isEscaping) {
	        if (tokenChars[code] !== 1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	        if (start === -1) start = i;
	        else if (!mustUnescape) mustUnescape = true;
	        isEscaping = false;
	      } else if (inQuotes) {
	        if (tokenChars[code] === 1) {
	          if (start === -1) start = i;
	        } else if (code === 0x22 /* '"' */ && start !== -1) {
	          inQuotes = false;
	          end = i;
	        } else if (code === 0x5c /* '\' */) {
	          isEscaping = true;
	        } else {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
	        inQuotes = true;
	      } else if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
	        if (end === -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        let value = header.slice(start, end);
	        if (mustUnescape) {
	          value = value.replace(/\\/g, '');
	          mustUnescape = false;
	        }
	        push(params, paramName, value);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        paramName = undefined;
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    }
	  }

	  if (start === -1 || inQuotes || code === 0x20 || code === 0x09) {
	    throw new SyntaxError('Unexpected end of input');
	  }

	  if (end === -1) end = i;
	  const token = header.slice(start, end);
	  if (extensionName === undefined) {
	    push(offers, token, params);
	  } else {
	    if (paramName === undefined) {
	      push(params, token, true);
	    } else if (mustUnescape) {
	      push(params, paramName, token.replace(/\\/g, ''));
	    } else {
	      push(params, paramName, token);
	    }
	    push(offers, extensionName, params);
	  }

	  return offers;
	}

	/**
	 * Builds the `Sec-WebSocket-Extensions` header field value.
	 *
	 * @param {Object} extensions The map of extensions and parameters to format
	 * @return {String} A string representing the given object
	 * @public
	 */
	function format(extensions) {
	  return Object.keys(extensions)
	    .map((extension) => {
	      let configurations = extensions[extension];
	      if (!Array.isArray(configurations)) configurations = [configurations];
	      return configurations
	        .map((params) => {
	          return [extension]
	            .concat(
	              Object.keys(params).map((k) => {
	                let values = params[k];
	                if (!Array.isArray(values)) values = [values];
	                return values
	                  .map((v) => (v === true ? k : `${k}=${v}`))
	                  .join('; ');
	              })
	            )
	            .join('; ');
	        })
	        .join(', ');
	    })
	    .join(', ');
	}

	extension = { format, parse };
	return extension;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex|Readable$", "caughtErrors": "none" }] */

var websocket;
var hasRequiredWebsocket;

function requireWebsocket () {
	if (hasRequiredWebsocket) return websocket;
	hasRequiredWebsocket = 1;

	const EventEmitter = require$$0$3;
	const https = require$$1$1;
	const http = require$$2;
	const net = require$$3;
	const tls = require$$4;
	const { randomBytes, createHash } = require$$1;
	const { Duplex, Readable } = require$$0$2;
	const { URL } = require$$7;

	const PerMessageDeflate = requirePermessageDeflate();
	const Receiver = requireReceiver();
	const Sender = requireSender();
	const { isBlob } = requireValidation();

	const {
	  BINARY_TYPES,
	  EMPTY_BUFFER,
	  GUID,
	  kForOnEventAttribute,
	  kListener,
	  kStatusCode,
	  kWebSocket,
	  NOOP
	} = requireConstants();
	const {
	  EventTarget: { addEventListener, removeEventListener }
	} = requireEventTarget();
	const { format, parse } = requireExtension();
	const { toBuffer } = requireBufferUtil();

	const closeTimeout = 30 * 1000;
	const kAborted = Symbol('kAborted');
	const protocolVersions = [8, 13];
	const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
	const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

	/**
	 * Class representing a WebSocket.
	 *
	 * @extends EventEmitter
	 */
	class WebSocket extends EventEmitter {
	  /**
	   * Create a new `WebSocket`.
	   *
	   * @param {(String|URL)} address The URL to which to connect
	   * @param {(String|String[])} [protocols] The subprotocols
	   * @param {Object} [options] Connection options
	   */
	  constructor(address, protocols, options) {
	    super();

	    this._binaryType = BINARY_TYPES[0];
	    this._closeCode = 1006;
	    this._closeFrameReceived = false;
	    this._closeFrameSent = false;
	    this._closeMessage = EMPTY_BUFFER;
	    this._closeTimer = null;
	    this._errorEmitted = false;
	    this._extensions = {};
	    this._paused = false;
	    this._protocol = '';
	    this._readyState = WebSocket.CONNECTING;
	    this._receiver = null;
	    this._sender = null;
	    this._socket = null;

	    if (address !== null) {
	      this._bufferedAmount = 0;
	      this._isServer = false;
	      this._redirects = 0;

	      if (protocols === undefined) {
	        protocols = [];
	      } else if (!Array.isArray(protocols)) {
	        if (typeof protocols === 'object' && protocols !== null) {
	          options = protocols;
	          protocols = [];
	        } else {
	          protocols = [protocols];
	        }
	      }

	      initAsClient(this, address, protocols, options);
	    } else {
	      this._autoPong = options.autoPong;
	      this._isServer = true;
	    }
	  }

	  /**
	   * For historical reasons, the custom "nodebuffer" type is used by the default
	   * instead of "blob".
	   *
	   * @type {String}
	   */
	  get binaryType() {
	    return this._binaryType;
	  }

	  set binaryType(type) {
	    if (!BINARY_TYPES.includes(type)) return;

	    this._binaryType = type;

	    //
	    // Allow to change `binaryType` on the fly.
	    //
	    if (this._receiver) this._receiver._binaryType = type;
	  }

	  /**
	   * @type {Number}
	   */
	  get bufferedAmount() {
	    if (!this._socket) return this._bufferedAmount;

	    return this._socket._writableState.length + this._sender._bufferedBytes;
	  }

	  /**
	   * @type {String}
	   */
	  get extensions() {
	    return Object.keys(this._extensions).join();
	  }

	  /**
	   * @type {Boolean}
	   */
	  get isPaused() {
	    return this._paused;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onclose() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onerror() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onopen() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onmessage() {
	    return null;
	  }

	  /**
	   * @type {String}
	   */
	  get protocol() {
	    return this._protocol;
	  }

	  /**
	   * @type {Number}
	   */
	  get readyState() {
	    return this._readyState;
	  }

	  /**
	   * @type {String}
	   */
	  get url() {
	    return this._url;
	  }

	  /**
	   * Set up the socket and the internal resources.
	   *
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Object} options Options object
	   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Number} [options.maxPayload=0] The maximum allowed message size
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   * @private
	   */
	  setSocket(socket, head, options) {
	    const receiver = new Receiver({
	      allowSynchronousEvents: options.allowSynchronousEvents,
	      binaryType: this.binaryType,
	      extensions: this._extensions,
	      isServer: this._isServer,
	      maxPayload: options.maxPayload,
	      skipUTF8Validation: options.skipUTF8Validation
	    });

	    const sender = new Sender(socket, this._extensions, options.generateMask);

	    this._receiver = receiver;
	    this._sender = sender;
	    this._socket = socket;

	    receiver[kWebSocket] = this;
	    sender[kWebSocket] = this;
	    socket[kWebSocket] = this;

	    receiver.on('conclude', receiverOnConclude);
	    receiver.on('drain', receiverOnDrain);
	    receiver.on('error', receiverOnError);
	    receiver.on('message', receiverOnMessage);
	    receiver.on('ping', receiverOnPing);
	    receiver.on('pong', receiverOnPong);

	    sender.onerror = senderOnError;

	    //
	    // These methods may not be available if `socket` is just a `Duplex`.
	    //
	    if (socket.setTimeout) socket.setTimeout(0);
	    if (socket.setNoDelay) socket.setNoDelay();

	    if (head.length > 0) socket.unshift(head);

	    socket.on('close', socketOnClose);
	    socket.on('data', socketOnData);
	    socket.on('end', socketOnEnd);
	    socket.on('error', socketOnError);

	    this._readyState = WebSocket.OPEN;
	    this.emit('open');
	  }

	  /**
	   * Emit the `'close'` event.
	   *
	   * @private
	   */
	  emitClose() {
	    if (!this._socket) {
	      this._readyState = WebSocket.CLOSED;
	      this.emit('close', this._closeCode, this._closeMessage);
	      return;
	    }

	    if (this._extensions[PerMessageDeflate.extensionName]) {
	      this._extensions[PerMessageDeflate.extensionName].cleanup();
	    }

	    this._receiver.removeAllListeners();
	    this._readyState = WebSocket.CLOSED;
	    this.emit('close', this._closeCode, this._closeMessage);
	  }

	  /**
	   * Start a closing handshake.
	   *
	   *          +----------+   +-----------+   +----------+
	   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
	   *    |     +----------+   +-----------+   +----------+     |
	   *          +----------+   +-----------+         |
	   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
	   *          +----------+   +-----------+   |
	   *    |           |                        |   +---+        |
	   *                +------------------------+-->|fin| - - - -
	   *    |         +---+                      |   +---+
	   *     - - - - -|fin|<---------------------+
	   *              +---+
	   *
	   * @param {Number} [code] Status code explaining why the connection is closing
	   * @param {(String|Buffer)} [data] The reason why the connection is
	   *     closing
	   * @public
	   */
	  close(code, data) {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      abortHandshake(this, this._req, msg);
	      return;
	    }

	    if (this.readyState === WebSocket.CLOSING) {
	      if (
	        this._closeFrameSent &&
	        (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
	      ) {
	        this._socket.end();
	      }

	      return;
	    }

	    this._readyState = WebSocket.CLOSING;
	    this._sender.close(code, data, !this._isServer, (err) => {
	      //
	      // This error is handled by the `'error'` listener on the socket. We only
	      // want to know if the close frame has been sent here.
	      //
	      if (err) return;

	      this._closeFrameSent = true;

	      if (
	        this._closeFrameReceived ||
	        this._receiver._writableState.errorEmitted
	      ) {
	        this._socket.end();
	      }
	    });

	    setCloseTimer(this);
	  }

	  /**
	   * Pause the socket.
	   *
	   * @public
	   */
	  pause() {
	    if (
	      this.readyState === WebSocket.CONNECTING ||
	      this.readyState === WebSocket.CLOSED
	    ) {
	      return;
	    }

	    this._paused = true;
	    this._socket.pause();
	  }

	  /**
	   * Send a ping.
	   *
	   * @param {*} [data] The data to send
	   * @param {Boolean} [mask] Indicates whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when the ping is sent
	   * @public
	   */
	  ping(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Send a pong.
	   *
	   * @param {*} [data] The data to send
	   * @param {Boolean} [mask] Indicates whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when the pong is sent
	   * @public
	   */
	  pong(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Resume the socket.
	   *
	   * @public
	   */
	  resume() {
	    if (
	      this.readyState === WebSocket.CONNECTING ||
	      this.readyState === WebSocket.CLOSED
	    ) {
	      return;
	    }

	    this._paused = false;
	    if (!this._receiver._writableState.needDrain) this._socket.resume();
	  }

	  /**
	   * Send a data message.
	   *
	   * @param {*} data The message to send
	   * @param {Object} [options] Options object
	   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
	   *     text
	   * @param {Boolean} [options.compress] Specifies whether or not to compress
	   *     `data`
	   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
	   *     last one
	   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when data is written out
	   * @public
	   */
	  send(data, options, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof options === 'function') {
	      cb = options;
	      options = {};
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    const opts = {
	      binary: typeof data !== 'string',
	      mask: !this._isServer,
	      compress: true,
	      fin: true,
	      ...options
	    };

	    if (!this._extensions[PerMessageDeflate.extensionName]) {
	      opts.compress = false;
	    }

	    this._sender.send(data || EMPTY_BUFFER, opts, cb);
	  }

	  /**
	   * Forcibly close the connection.
	   *
	   * @public
	   */
	  terminate() {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      abortHandshake(this, this._req, msg);
	      return;
	    }

	    if (this._socket) {
	      this._readyState = WebSocket.CLOSING;
	      this._socket.destroy();
	    }
	  }
	}

	/**
	 * @constant {Number} CONNECTING
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CONNECTING', {
	  enumerable: true,
	  value: readyStates.indexOf('CONNECTING')
	});

	/**
	 * @constant {Number} CONNECTING
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
	  enumerable: true,
	  value: readyStates.indexOf('CONNECTING')
	});

	/**
	 * @constant {Number} OPEN
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'OPEN', {
	  enumerable: true,
	  value: readyStates.indexOf('OPEN')
	});

	/**
	 * @constant {Number} OPEN
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'OPEN', {
	  enumerable: true,
	  value: readyStates.indexOf('OPEN')
	});

	/**
	 * @constant {Number} CLOSING
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CLOSING', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSING')
	});

	/**
	 * @constant {Number} CLOSING
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CLOSING', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSING')
	});

	/**
	 * @constant {Number} CLOSED
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CLOSED', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSED')
	});

	/**
	 * @constant {Number} CLOSED
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CLOSED', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSED')
	});

	[
	  'binaryType',
	  'bufferedAmount',
	  'extensions',
	  'isPaused',
	  'protocol',
	  'readyState',
	  'url'
	].forEach((property) => {
	  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
	});

	//
	// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
	// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
	//
	['open', 'error', 'close', 'message'].forEach((method) => {
	  Object.defineProperty(WebSocket.prototype, `on${method}`, {
	    enumerable: true,
	    get() {
	      for (const listener of this.listeners(method)) {
	        if (listener[kForOnEventAttribute]) return listener[kListener];
	      }

	      return null;
	    },
	    set(handler) {
	      for (const listener of this.listeners(method)) {
	        if (listener[kForOnEventAttribute]) {
	          this.removeListener(method, listener);
	          break;
	        }
	      }

	      if (typeof handler !== 'function') return;

	      this.addEventListener(method, handler, {
	        [kForOnEventAttribute]: true
	      });
	    }
	  });
	});

	WebSocket.prototype.addEventListener = addEventListener;
	WebSocket.prototype.removeEventListener = removeEventListener;

	websocket = WebSocket;

	/**
	 * Initialize a WebSocket client.
	 *
	 * @param {WebSocket} websocket The client to initialize
	 * @param {(String|URL)} address The URL to which to connect
	 * @param {Array} protocols The subprotocols
	 * @param {Object} [options] Connection options
	 * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether any
	 *     of the `'message'`, `'ping'`, and `'pong'` events can be emitted multiple
	 *     times in the same tick
	 * @param {Boolean} [options.autoPong=true] Specifies whether or not to
	 *     automatically send a pong in response to a ping
	 * @param {Function} [options.finishRequest] A function which can be used to
	 *     customize the headers of each http request before it is sent
	 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
	 *     redirects
	 * @param {Function} [options.generateMask] The function used to generate the
	 *     masking key
	 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
	 *     handshake request
	 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
	 *     size
	 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
	 *     allowed
	 * @param {String} [options.origin] Value of the `Origin` or
	 *     `Sec-WebSocket-Origin` header
	 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
	 *     permessage-deflate
	 * @param {Number} [options.protocolVersion=13] Value of the
	 *     `Sec-WebSocket-Version` header
	 * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	 *     not to skip UTF-8 validation for text and close messages
	 * @private
	 */
	function initAsClient(websocket, address, protocols, options) {
	  const opts = {
	    allowSynchronousEvents: true,
	    autoPong: true,
	    protocolVersion: protocolVersions[1],
	    maxPayload: 100 * 1024 * 1024,
	    skipUTF8Validation: false,
	    perMessageDeflate: true,
	    followRedirects: false,
	    maxRedirects: 10,
	    ...options,
	    socketPath: undefined,
	    hostname: undefined,
	    protocol: undefined,
	    timeout: undefined,
	    method: 'GET',
	    host: undefined,
	    path: undefined,
	    port: undefined
	  };

	  websocket._autoPong = opts.autoPong;

	  if (!protocolVersions.includes(opts.protocolVersion)) {
	    throw new RangeError(
	      `Unsupported protocol version: ${opts.protocolVersion} ` +
	        `(supported versions: ${protocolVersions.join(', ')})`
	    );
	  }

	  let parsedUrl;

	  if (address instanceof URL) {
	    parsedUrl = address;
	  } else {
	    try {
	      parsedUrl = new URL(address);
	    } catch (e) {
	      throw new SyntaxError(`Invalid URL: ${address}`);
	    }
	  }

	  if (parsedUrl.protocol === 'http:') {
	    parsedUrl.protocol = 'ws:';
	  } else if (parsedUrl.protocol === 'https:') {
	    parsedUrl.protocol = 'wss:';
	  }

	  websocket._url = parsedUrl.href;

	  const isSecure = parsedUrl.protocol === 'wss:';
	  const isIpcUrl = parsedUrl.protocol === 'ws+unix:';
	  let invalidUrlMessage;

	  if (parsedUrl.protocol !== 'ws:' && !isSecure && !isIpcUrl) {
	    invalidUrlMessage =
	      'The URL\'s protocol must be one of "ws:", "wss:", ' +
	      '"http:", "https:", or "ws+unix:"';
	  } else if (isIpcUrl && !parsedUrl.pathname) {
	    invalidUrlMessage = "The URL's pathname is empty";
	  } else if (parsedUrl.hash) {
	    invalidUrlMessage = 'The URL contains a fragment identifier';
	  }

	  if (invalidUrlMessage) {
	    const err = new SyntaxError(invalidUrlMessage);

	    if (websocket._redirects === 0) {
	      throw err;
	    } else {
	      emitErrorAndClose(websocket, err);
	      return;
	    }
	  }

	  const defaultPort = isSecure ? 443 : 80;
	  const key = randomBytes(16).toString('base64');
	  const request = isSecure ? https.request : http.request;
	  const protocolSet = new Set();
	  let perMessageDeflate;

	  opts.createConnection =
	    opts.createConnection || (isSecure ? tlsConnect : netConnect);
	  opts.defaultPort = opts.defaultPort || defaultPort;
	  opts.port = parsedUrl.port || defaultPort;
	  opts.host = parsedUrl.hostname.startsWith('[')
	    ? parsedUrl.hostname.slice(1, -1)
	    : parsedUrl.hostname;
	  opts.headers = {
	    ...opts.headers,
	    'Sec-WebSocket-Version': opts.protocolVersion,
	    'Sec-WebSocket-Key': key,
	    Connection: 'Upgrade',
	    Upgrade: 'websocket'
	  };
	  opts.path = parsedUrl.pathname + parsedUrl.search;
	  opts.timeout = opts.handshakeTimeout;

	  if (opts.perMessageDeflate) {
	    perMessageDeflate = new PerMessageDeflate(
	      opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
	      false,
	      opts.maxPayload
	    );
	    opts.headers['Sec-WebSocket-Extensions'] = format({
	      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
	    });
	  }
	  if (protocols.length) {
	    for (const protocol of protocols) {
	      if (
	        typeof protocol !== 'string' ||
	        !subprotocolRegex.test(protocol) ||
	        protocolSet.has(protocol)
	      ) {
	        throw new SyntaxError(
	          'An invalid or duplicated subprotocol was specified'
	        );
	      }

	      protocolSet.add(protocol);
	    }

	    opts.headers['Sec-WebSocket-Protocol'] = protocols.join(',');
	  }
	  if (opts.origin) {
	    if (opts.protocolVersion < 13) {
	      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
	    } else {
	      opts.headers.Origin = opts.origin;
	    }
	  }
	  if (parsedUrl.username || parsedUrl.password) {
	    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
	  }

	  if (isIpcUrl) {
	    const parts = opts.path.split(':');

	    opts.socketPath = parts[0];
	    opts.path = parts[1];
	  }

	  let req;

	  if (opts.followRedirects) {
	    if (websocket._redirects === 0) {
	      websocket._originalIpc = isIpcUrl;
	      websocket._originalSecure = isSecure;
	      websocket._originalHostOrSocketPath = isIpcUrl
	        ? opts.socketPath
	        : parsedUrl.host;

	      const headers = options && options.headers;

	      //
	      // Shallow copy the user provided options so that headers can be changed
	      // without mutating the original object.
	      //
	      options = { ...options, headers: {} };

	      if (headers) {
	        for (const [key, value] of Object.entries(headers)) {
	          options.headers[key.toLowerCase()] = value;
	        }
	      }
	    } else if (websocket.listenerCount('redirect') === 0) {
	      const isSameHost = isIpcUrl
	        ? websocket._originalIpc
	          ? opts.socketPath === websocket._originalHostOrSocketPath
	          : false
	        : websocket._originalIpc
	          ? false
	          : parsedUrl.host === websocket._originalHostOrSocketPath;

	      if (!isSameHost || (websocket._originalSecure && !isSecure)) {
	        //
	        // Match curl 7.77.0 behavior and drop the following headers. These
	        // headers are also dropped when following a redirect to a subdomain.
	        //
	        delete opts.headers.authorization;
	        delete opts.headers.cookie;

	        if (!isSameHost) delete opts.headers.host;

	        opts.auth = undefined;
	      }
	    }

	    //
	    // Match curl 7.77.0 behavior and make the first `Authorization` header win.
	    // If the `Authorization` header is set, then there is nothing to do as it
	    // will take precedence.
	    //
	    if (opts.auth && !options.headers.authorization) {
	      options.headers.authorization =
	        'Basic ' + Buffer.from(opts.auth).toString('base64');
	    }

	    req = websocket._req = request(opts);

	    if (websocket._redirects) {
	      //
	      // Unlike what is done for the `'upgrade'` event, no early exit is
	      // triggered here if the user calls `websocket.close()` or
	      // `websocket.terminate()` from a listener of the `'redirect'` event. This
	      // is because the user can also call `request.destroy()` with an error
	      // before calling `websocket.close()` or `websocket.terminate()` and this
	      // would result in an error being emitted on the `request` object with no
	      // `'error'` event listeners attached.
	      //
	      websocket.emit('redirect', websocket.url, req);
	    }
	  } else {
	    req = websocket._req = request(opts);
	  }

	  if (opts.timeout) {
	    req.on('timeout', () => {
	      abortHandshake(websocket, req, 'Opening handshake has timed out');
	    });
	  }

	  req.on('error', (err) => {
	    if (req === null || req[kAborted]) return;

	    req = websocket._req = null;
	    emitErrorAndClose(websocket, err);
	  });

	  req.on('response', (res) => {
	    const location = res.headers.location;
	    const statusCode = res.statusCode;

	    if (
	      location &&
	      opts.followRedirects &&
	      statusCode >= 300 &&
	      statusCode < 400
	    ) {
	      if (++websocket._redirects > opts.maxRedirects) {
	        abortHandshake(websocket, req, 'Maximum redirects exceeded');
	        return;
	      }

	      req.abort();

	      let addr;

	      try {
	        addr = new URL(location, address);
	      } catch (e) {
	        const err = new SyntaxError(`Invalid URL: ${location}`);
	        emitErrorAndClose(websocket, err);
	        return;
	      }

	      initAsClient(websocket, addr, protocols, options);
	    } else if (!websocket.emit('unexpected-response', req, res)) {
	      abortHandshake(
	        websocket,
	        req,
	        `Unexpected server response: ${res.statusCode}`
	      );
	    }
	  });

	  req.on('upgrade', (res, socket, head) => {
	    websocket.emit('upgrade', res);

	    //
	    // The user may have closed the connection from a listener of the
	    // `'upgrade'` event.
	    //
	    if (websocket.readyState !== WebSocket.CONNECTING) return;

	    req = websocket._req = null;

	    const upgrade = res.headers.upgrade;

	    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
	      abortHandshake(websocket, socket, 'Invalid Upgrade header');
	      return;
	    }

	    const digest = createHash('sha1')
	      .update(key + GUID)
	      .digest('base64');

	    if (res.headers['sec-websocket-accept'] !== digest) {
	      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
	      return;
	    }

	    const serverProt = res.headers['sec-websocket-protocol'];
	    let protError;

	    if (serverProt !== undefined) {
	      if (!protocolSet.size) {
	        protError = 'Server sent a subprotocol but none was requested';
	      } else if (!protocolSet.has(serverProt)) {
	        protError = 'Server sent an invalid subprotocol';
	      }
	    } else if (protocolSet.size) {
	      protError = 'Server sent no subprotocol';
	    }

	    if (protError) {
	      abortHandshake(websocket, socket, protError);
	      return;
	    }

	    if (serverProt) websocket._protocol = serverProt;

	    const secWebSocketExtensions = res.headers['sec-websocket-extensions'];

	    if (secWebSocketExtensions !== undefined) {
	      if (!perMessageDeflate) {
	        const message =
	          'Server sent a Sec-WebSocket-Extensions header but no extension ' +
	          'was requested';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      let extensions;

	      try {
	        extensions = parse(secWebSocketExtensions);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Extensions header';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      const extensionNames = Object.keys(extensions);

	      if (
	        extensionNames.length !== 1 ||
	        extensionNames[0] !== PerMessageDeflate.extensionName
	      ) {
	        const message = 'Server indicated an extension that was not requested';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      try {
	        perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Extensions header';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      websocket._extensions[PerMessageDeflate.extensionName] =
	        perMessageDeflate;
	    }

	    websocket.setSocket(socket, head, {
	      allowSynchronousEvents: opts.allowSynchronousEvents,
	      generateMask: opts.generateMask,
	      maxPayload: opts.maxPayload,
	      skipUTF8Validation: opts.skipUTF8Validation
	    });
	  });

	  if (opts.finishRequest) {
	    opts.finishRequest(req, websocket);
	  } else {
	    req.end();
	  }
	}

	/**
	 * Emit the `'error'` and `'close'` events.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {Error} The error to emit
	 * @private
	 */
	function emitErrorAndClose(websocket, err) {
	  websocket._readyState = WebSocket.CLOSING;
	  //
	  // The following assignment is practically useless and is done only for
	  // consistency.
	  //
	  websocket._errorEmitted = true;
	  websocket.emit('error', err);
	  websocket.emitClose();
	}

	/**
	 * Create a `net.Socket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {net.Socket} The newly created socket used to start the connection
	 * @private
	 */
	function netConnect(options) {
	  options.path = options.socketPath;
	  return net.connect(options);
	}

	/**
	 * Create a `tls.TLSSocket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {tls.TLSSocket} The newly created socket used to start the connection
	 * @private
	 */
	function tlsConnect(options) {
	  options.path = undefined;

	  if (!options.servername && options.servername !== '') {
	    options.servername = net.isIP(options.host) ? '' : options.host;
	  }

	  return tls.connect(options);
	}

	/**
	 * Abort the handshake and emit an error.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
	 *     abort or the socket to destroy
	 * @param {String} message The error message
	 * @private
	 */
	function abortHandshake(websocket, stream, message) {
	  websocket._readyState = WebSocket.CLOSING;

	  const err = new Error(message);
	  Error.captureStackTrace(err, abortHandshake);

	  if (stream.setHeader) {
	    stream[kAborted] = true;
	    stream.abort();

	    if (stream.socket && !stream.socket.destroyed) {
	      //
	      // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
	      // called after the request completed. See
	      // https://github.com/websockets/ws/issues/1869.
	      //
	      stream.socket.destroy();
	    }

	    process.nextTick(emitErrorAndClose, websocket, err);
	  } else {
	    stream.destroy(err);
	    stream.once('error', websocket.emit.bind(websocket, 'error'));
	    stream.once('close', websocket.emitClose.bind(websocket));
	  }
	}

	/**
	 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
	 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {*} [data] The data to send
	 * @param {Function} [cb] Callback
	 * @private
	 */
	function sendAfterClose(websocket, data, cb) {
	  if (data) {
	    const length = isBlob(data) ? data.size : toBuffer(data).length;

	    //
	    // The `_bufferedAmount` property is used only when the peer is a client and
	    // the opening handshake fails. Under these circumstances, in fact, the
	    // `setSocket()` method is not called, so the `_socket` and `_sender`
	    // properties are set to `null`.
	    //
	    if (websocket._socket) websocket._sender._bufferedBytes += length;
	    else websocket._bufferedAmount += length;
	  }

	  if (cb) {
	    const err = new Error(
	      `WebSocket is not open: readyState ${websocket.readyState} ` +
	        `(${readyStates[websocket.readyState]})`
	    );
	    process.nextTick(cb, err);
	  }
	}

	/**
	 * The listener of the `Receiver` `'conclude'` event.
	 *
	 * @param {Number} code The status code
	 * @param {Buffer} reason The reason for closing
	 * @private
	 */
	function receiverOnConclude(code, reason) {
	  const websocket = this[kWebSocket];

	  websocket._closeFrameReceived = true;
	  websocket._closeMessage = reason;
	  websocket._closeCode = code;

	  if (websocket._socket[kWebSocket] === undefined) return;

	  websocket._socket.removeListener('data', socketOnData);
	  process.nextTick(resume, websocket._socket);

	  if (code === 1005) websocket.close();
	  else websocket.close(code, reason);
	}

	/**
	 * The listener of the `Receiver` `'drain'` event.
	 *
	 * @private
	 */
	function receiverOnDrain() {
	  const websocket = this[kWebSocket];

	  if (!websocket.isPaused) websocket._socket.resume();
	}

	/**
	 * The listener of the `Receiver` `'error'` event.
	 *
	 * @param {(RangeError|Error)} err The emitted error
	 * @private
	 */
	function receiverOnError(err) {
	  const websocket = this[kWebSocket];

	  if (websocket._socket[kWebSocket] !== undefined) {
	    websocket._socket.removeListener('data', socketOnData);

	    //
	    // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
	    // https://github.com/websockets/ws/issues/1940.
	    //
	    process.nextTick(resume, websocket._socket);

	    websocket.close(err[kStatusCode]);
	  }

	  if (!websocket._errorEmitted) {
	    websocket._errorEmitted = true;
	    websocket.emit('error', err);
	  }
	}

	/**
	 * The listener of the `Receiver` `'finish'` event.
	 *
	 * @private
	 */
	function receiverOnFinish() {
	  this[kWebSocket].emitClose();
	}

	/**
	 * The listener of the `Receiver` `'message'` event.
	 *
	 * @param {Buffer|ArrayBuffer|Buffer[])} data The message
	 * @param {Boolean} isBinary Specifies whether the message is binary or not
	 * @private
	 */
	function receiverOnMessage(data, isBinary) {
	  this[kWebSocket].emit('message', data, isBinary);
	}

	/**
	 * The listener of the `Receiver` `'ping'` event.
	 *
	 * @param {Buffer} data The data included in the ping frame
	 * @private
	 */
	function receiverOnPing(data) {
	  const websocket = this[kWebSocket];

	  if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
	  websocket.emit('ping', data);
	}

	/**
	 * The listener of the `Receiver` `'pong'` event.
	 *
	 * @param {Buffer} data The data included in the pong frame
	 * @private
	 */
	function receiverOnPong(data) {
	  this[kWebSocket].emit('pong', data);
	}

	/**
	 * Resume a readable stream
	 *
	 * @param {Readable} stream The readable stream
	 * @private
	 */
	function resume(stream) {
	  stream.resume();
	}

	/**
	 * The `Sender` error event handler.
	 *
	 * @param {Error} The error
	 * @private
	 */
	function senderOnError(err) {
	  const websocket = this[kWebSocket];

	  if (websocket.readyState === WebSocket.CLOSED) return;
	  if (websocket.readyState === WebSocket.OPEN) {
	    websocket._readyState = WebSocket.CLOSING;
	    setCloseTimer(websocket);
	  }

	  //
	  // `socket.end()` is used instead of `socket.destroy()` to allow the other
	  // peer to finish sending queued data. There is no need to set a timer here
	  // because `CLOSING` means that it is already set or not needed.
	  //
	  this._socket.end();

	  if (!websocket._errorEmitted) {
	    websocket._errorEmitted = true;
	    websocket.emit('error', err);
	  }
	}

	/**
	 * Set a timer to destroy the underlying raw socket of a WebSocket.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @private
	 */
	function setCloseTimer(websocket) {
	  websocket._closeTimer = setTimeout(
	    websocket._socket.destroy.bind(websocket._socket),
	    closeTimeout
	  );
	}

	/**
	 * The listener of the socket `'close'` event.
	 *
	 * @private
	 */
	function socketOnClose() {
	  const websocket = this[kWebSocket];

	  this.removeListener('close', socketOnClose);
	  this.removeListener('data', socketOnData);
	  this.removeListener('end', socketOnEnd);

	  websocket._readyState = WebSocket.CLOSING;

	  let chunk;

	  //
	  // The close frame might not have been received or the `'end'` event emitted,
	  // for example, if the socket was destroyed due to an error. Ensure that the
	  // `receiver` stream is closed after writing any remaining buffered data to
	  // it. If the readable side of the socket is in flowing mode then there is no
	  // buffered data as everything has been already written and `readable.read()`
	  // will return `null`. If instead, the socket is paused, any possible buffered
	  // data will be read as a single chunk.
	  //
	  if (
	    !this._readableState.endEmitted &&
	    !websocket._closeFrameReceived &&
	    !websocket._receiver._writableState.errorEmitted &&
	    (chunk = websocket._socket.read()) !== null
	  ) {
	    websocket._receiver.write(chunk);
	  }

	  websocket._receiver.end();

	  this[kWebSocket] = undefined;

	  clearTimeout(websocket._closeTimer);

	  if (
	    websocket._receiver._writableState.finished ||
	    websocket._receiver._writableState.errorEmitted
	  ) {
	    websocket.emitClose();
	  } else {
	    websocket._receiver.on('error', receiverOnFinish);
	    websocket._receiver.on('finish', receiverOnFinish);
	  }
	}

	/**
	 * The listener of the socket `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function socketOnData(chunk) {
	  if (!this[kWebSocket]._receiver.write(chunk)) {
	    this.pause();
	  }
	}

	/**
	 * The listener of the socket `'end'` event.
	 *
	 * @private
	 */
	function socketOnEnd() {
	  const websocket = this[kWebSocket];

	  websocket._readyState = WebSocket.CLOSING;
	  websocket._receiver.end();
	  this.end();
	}

	/**
	 * The listener of the socket `'error'` event.
	 *
	 * @private
	 */
	function socketOnError() {
	  const websocket = this[kWebSocket];

	  this.removeListener('error', socketOnError);
	  this.on('error', NOOP);

	  if (websocket) {
	    websocket._readyState = WebSocket.CLOSING;
	    this.destroy();
	  }
	}
	return websocket;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^WebSocket$" }] */

var stream;
var hasRequiredStream;

function requireStream () {
	if (hasRequiredStream) return stream;
	hasRequiredStream = 1;

	requireWebsocket();
	const { Duplex } = require$$0$2;

	/**
	 * Emits the `'close'` event on a stream.
	 *
	 * @param {Duplex} stream The stream.
	 * @private
	 */
	function emitClose(stream) {
	  stream.emit('close');
	}

	/**
	 * The listener of the `'end'` event.
	 *
	 * @private
	 */
	function duplexOnEnd() {
	  if (!this.destroyed && this._writableState.finished) {
	    this.destroy();
	  }
	}

	/**
	 * The listener of the `'error'` event.
	 *
	 * @param {Error} err The error
	 * @private
	 */
	function duplexOnError(err) {
	  this.removeListener('error', duplexOnError);
	  this.destroy();
	  if (this.listenerCount('error') === 0) {
	    // Do not suppress the throwing behavior.
	    this.emit('error', err);
	  }
	}

	/**
	 * Wraps a `WebSocket` in a duplex stream.
	 *
	 * @param {WebSocket} ws The `WebSocket` to wrap
	 * @param {Object} [options] The options for the `Duplex` constructor
	 * @return {Duplex} The duplex stream
	 * @public
	 */
	function createWebSocketStream(ws, options) {
	  let terminateOnDestroy = true;

	  const duplex = new Duplex({
	    ...options,
	    autoDestroy: false,
	    emitClose: false,
	    objectMode: false,
	    writableObjectMode: false
	  });

	  ws.on('message', function message(msg, isBinary) {
	    const data =
	      !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;

	    if (!duplex.push(data)) ws.pause();
	  });

	  ws.once('error', function error(err) {
	    if (duplex.destroyed) return;

	    // Prevent `ws.terminate()` from being called by `duplex._destroy()`.
	    //
	    // - If the `'error'` event is emitted before the `'open'` event, then
	    //   `ws.terminate()` is a noop as no socket is assigned.
	    // - Otherwise, the error is re-emitted by the listener of the `'error'`
	    //   event of the `Receiver` object. The listener already closes the
	    //   connection by calling `ws.close()`. This allows a close frame to be
	    //   sent to the other peer. If `ws.terminate()` is called right after this,
	    //   then the close frame might not be sent.
	    terminateOnDestroy = false;
	    duplex.destroy(err);
	  });

	  ws.once('close', function close() {
	    if (duplex.destroyed) return;

	    duplex.push(null);
	  });

	  duplex._destroy = function (err, callback) {
	    if (ws.readyState === ws.CLOSED) {
	      callback(err);
	      process.nextTick(emitClose, duplex);
	      return;
	    }

	    let called = false;

	    ws.once('error', function error(err) {
	      called = true;
	      callback(err);
	    });

	    ws.once('close', function close() {
	      if (!called) callback(err);
	      process.nextTick(emitClose, duplex);
	    });

	    if (terminateOnDestroy) ws.terminate();
	  };

	  duplex._final = function (callback) {
	    if (ws.readyState === ws.CONNECTING) {
	      ws.once('open', function open() {
	        duplex._final(callback);
	      });
	      return;
	    }

	    // If the value of the `_socket` property is `null` it means that `ws` is a
	    // client websocket and the handshake failed. In fact, when this happens, a
	    // socket is never assigned to the websocket. Wait for the `'error'` event
	    // that will be emitted by the websocket.
	    if (ws._socket === null) return;

	    if (ws._socket._writableState.finished) {
	      callback();
	      if (duplex._readableState.endEmitted) duplex.destroy();
	    } else {
	      ws._socket.once('finish', function finish() {
	        // `duplex` is not destroyed here because the `'end'` event will be
	        // emitted on `duplex` after this `'finish'` event. The EOF signaling
	        // `null` chunk is, in fact, pushed when the websocket emits `'close'`.
	        callback();
	      });
	      ws.close();
	    }
	  };

	  duplex._read = function () {
	    if (ws.isPaused) ws.resume();
	  };

	  duplex._write = function (chunk, encoding, callback) {
	    if (ws.readyState === ws.CONNECTING) {
	      ws.once('open', function open() {
	        duplex._write(chunk, encoding, callback);
	      });
	      return;
	    }

	    ws.send(chunk, callback);
	  };

	  duplex.on('end', duplexOnEnd);
	  duplex.on('error', duplexOnError);
	  return duplex;
	}

	stream = createWebSocketStream;
	return stream;
}

requireStream();

requireReceiver();

requireSender();

requireWebsocket();

var subprotocol;
var hasRequiredSubprotocol;

function requireSubprotocol () {
	if (hasRequiredSubprotocol) return subprotocol;
	hasRequiredSubprotocol = 1;

	const { tokenChars } = requireValidation();

	/**
	 * Parses the `Sec-WebSocket-Protocol` header into a set of subprotocol names.
	 *
	 * @param {String} header The field value of the header
	 * @return {Set} The subprotocol names
	 * @public
	 */
	function parse(header) {
	  const protocols = new Set();
	  let start = -1;
	  let end = -1;
	  let i = 0;

	  for (i; i < header.length; i++) {
	    const code = header.charCodeAt(i);

	    if (end === -1 && tokenChars[code] === 1) {
	      if (start === -1) start = i;
	    } else if (
	      i !== 0 &&
	      (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
	    ) {
	      if (end === -1 && start !== -1) end = i;
	    } else if (code === 0x2c /* ',' */) {
	      if (start === -1) {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }

	      if (end === -1) end = i;

	      const protocol = header.slice(start, end);

	      if (protocols.has(protocol)) {
	        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
	      }

	      protocols.add(protocol);
	      start = end = -1;
	    } else {
	      throw new SyntaxError(`Unexpected character at index ${i}`);
	    }
	  }

	  if (start === -1 || end !== -1) {
	    throw new SyntaxError('Unexpected end of input');
	  }

	  const protocol = header.slice(start, i);

	  if (protocols.has(protocol)) {
	    throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
	  }

	  protocols.add(protocol);
	  return protocols;
	}

	subprotocol = { parse };
	return subprotocol;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex$", "caughtErrors": "none" }] */

var websocketServer;
var hasRequiredWebsocketServer;

function requireWebsocketServer () {
	if (hasRequiredWebsocketServer) return websocketServer;
	hasRequiredWebsocketServer = 1;

	const EventEmitter = require$$0$3;
	const http = require$$2;
	const { Duplex } = require$$0$2;
	const { createHash } = require$$1;

	const extension = requireExtension();
	const PerMessageDeflate = requirePermessageDeflate();
	const subprotocol = requireSubprotocol();
	const WebSocket = requireWebsocket();
	const { GUID, kWebSocket } = requireConstants();

	const keyRegex = /^[+/0-9A-Za-z]{22}==$/;

	const RUNNING = 0;
	const CLOSING = 1;
	const CLOSED = 2;

	/**
	 * Class representing a WebSocket server.
	 *
	 * @extends EventEmitter
	 */
	class WebSocketServer extends EventEmitter {
	  /**
	   * Create a `WebSocketServer` instance.
	   *
	   * @param {Object} options Configuration options
	   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {Boolean} [options.autoPong=true] Specifies whether or not to
	   *     automatically send a pong in response to a ping
	   * @param {Number} [options.backlog=511] The maximum length of the queue of
	   *     pending connections
	   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
	   *     track clients
	   * @param {Function} [options.handleProtocols] A hook to handle protocols
	   * @param {String} [options.host] The hostname where to bind the server
	   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
	   *     size
	   * @param {Boolean} [options.noServer=false] Enable no server mode
	   * @param {String} [options.path] Accept only connections matching this path
	   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
	   *     permessage-deflate
	   * @param {Number} [options.port] The port where to bind the server
	   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
	   *     server to use
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   * @param {Function} [options.verifyClient] A hook to reject connections
	   * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
	   *     class to use. It must be the `WebSocket` class or class that extends it
	   * @param {Function} [callback] A listener for the `listening` event
	   */
	  constructor(options, callback) {
	    super();

	    options = {
	      allowSynchronousEvents: true,
	      autoPong: true,
	      maxPayload: 100 * 1024 * 1024,
	      skipUTF8Validation: false,
	      perMessageDeflate: false,
	      handleProtocols: null,
	      clientTracking: true,
	      verifyClient: null,
	      noServer: false,
	      backlog: null, // use default (511 as implemented in net.js)
	      server: null,
	      host: null,
	      path: null,
	      port: null,
	      WebSocket,
	      ...options
	    };

	    if (
	      (options.port == null && !options.server && !options.noServer) ||
	      (options.port != null && (options.server || options.noServer)) ||
	      (options.server && options.noServer)
	    ) {
	      throw new TypeError(
	        'One and only one of the "port", "server", or "noServer" options ' +
	          'must be specified'
	      );
	    }

	    if (options.port != null) {
	      this._server = http.createServer((req, res) => {
	        const body = http.STATUS_CODES[426];

	        res.writeHead(426, {
	          'Content-Length': body.length,
	          'Content-Type': 'text/plain'
	        });
	        res.end(body);
	      });
	      this._server.listen(
	        options.port,
	        options.host,
	        options.backlog,
	        callback
	      );
	    } else if (options.server) {
	      this._server = options.server;
	    }

	    if (this._server) {
	      const emitConnection = this.emit.bind(this, 'connection');

	      this._removeListeners = addListeners(this._server, {
	        listening: this.emit.bind(this, 'listening'),
	        error: this.emit.bind(this, 'error'),
	        upgrade: (req, socket, head) => {
	          this.handleUpgrade(req, socket, head, emitConnection);
	        }
	      });
	    }

	    if (options.perMessageDeflate === true) options.perMessageDeflate = {};
	    if (options.clientTracking) {
	      this.clients = new Set();
	      this._shouldEmitClose = false;
	    }

	    this.options = options;
	    this._state = RUNNING;
	  }

	  /**
	   * Returns the bound address, the address family name, and port of the server
	   * as reported by the operating system if listening on an IP socket.
	   * If the server is listening on a pipe or UNIX domain socket, the name is
	   * returned as a string.
	   *
	   * @return {(Object|String|null)} The address of the server
	   * @public
	   */
	  address() {
	    if (this.options.noServer) {
	      throw new Error('The server is operating in "noServer" mode');
	    }

	    if (!this._server) return null;
	    return this._server.address();
	  }

	  /**
	   * Stop the server from accepting new connections and emit the `'close'` event
	   * when all existing connections are closed.
	   *
	   * @param {Function} [cb] A one-time listener for the `'close'` event
	   * @public
	   */
	  close(cb) {
	    if (this._state === CLOSED) {
	      if (cb) {
	        this.once('close', () => {
	          cb(new Error('The server is not running'));
	        });
	      }

	      process.nextTick(emitClose, this);
	      return;
	    }

	    if (cb) this.once('close', cb);

	    if (this._state === CLOSING) return;
	    this._state = CLOSING;

	    if (this.options.noServer || this.options.server) {
	      if (this._server) {
	        this._removeListeners();
	        this._removeListeners = this._server = null;
	      }

	      if (this.clients) {
	        if (!this.clients.size) {
	          process.nextTick(emitClose, this);
	        } else {
	          this._shouldEmitClose = true;
	        }
	      } else {
	        process.nextTick(emitClose, this);
	      }
	    } else {
	      const server = this._server;

	      this._removeListeners();
	      this._removeListeners = this._server = null;

	      //
	      // The HTTP/S server was created internally. Close it, and rely on its
	      // `'close'` event.
	      //
	      server.close(() => {
	        emitClose(this);
	      });
	    }
	  }

	  /**
	   * See if a given request should be handled by this server instance.
	   *
	   * @param {http.IncomingMessage} req Request object to inspect
	   * @return {Boolean} `true` if the request is valid, else `false`
	   * @public
	   */
	  shouldHandle(req) {
	    if (this.options.path) {
	      const index = req.url.indexOf('?');
	      const pathname = index !== -1 ? req.url.slice(0, index) : req.url;

	      if (pathname !== this.options.path) return false;
	    }

	    return true;
	  }

	  /**
	   * Handle a HTTP Upgrade request.
	   *
	   * @param {http.IncomingMessage} req The request object
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Function} cb Callback
	   * @public
	   */
	  handleUpgrade(req, socket, head, cb) {
	    socket.on('error', socketOnError);

	    const key = req.headers['sec-websocket-key'];
	    const upgrade = req.headers.upgrade;
	    const version = +req.headers['sec-websocket-version'];

	    if (req.method !== 'GET') {
	      const message = 'Invalid HTTP method';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
	      return;
	    }

	    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
	      const message = 'Invalid Upgrade header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	      return;
	    }

	    if (key === undefined || !keyRegex.test(key)) {
	      const message = 'Missing or invalid Sec-WebSocket-Key header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	      return;
	    }

	    if (version !== 8 && version !== 13) {
	      const message = 'Missing or invalid Sec-WebSocket-Version header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	      return;
	    }

	    if (!this.shouldHandle(req)) {
	      abortHandshake(socket, 400);
	      return;
	    }

	    const secWebSocketProtocol = req.headers['sec-websocket-protocol'];
	    let protocols = new Set();

	    if (secWebSocketProtocol !== undefined) {
	      try {
	        protocols = subprotocol.parse(secWebSocketProtocol);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Protocol header';
	        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	        return;
	      }
	    }

	    const secWebSocketExtensions = req.headers['sec-websocket-extensions'];
	    const extensions = {};

	    if (
	      this.options.perMessageDeflate &&
	      secWebSocketExtensions !== undefined
	    ) {
	      const perMessageDeflate = new PerMessageDeflate(
	        this.options.perMessageDeflate,
	        true,
	        this.options.maxPayload
	      );

	      try {
	        const offers = extension.parse(secWebSocketExtensions);

	        if (offers[PerMessageDeflate.extensionName]) {
	          perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
	          extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
	        }
	      } catch (err) {
	        const message =
	          'Invalid or unacceptable Sec-WebSocket-Extensions header';
	        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	        return;
	      }
	    }

	    //
	    // Optionally call external client verification handler.
	    //
	    if (this.options.verifyClient) {
	      const info = {
	        origin:
	          req.headers[`${version === 8 ? 'sec-websocket-origin' : 'origin'}`],
	        secure: !!(req.socket.authorized || req.socket.encrypted),
	        req
	      };

	      if (this.options.verifyClient.length === 2) {
	        this.options.verifyClient(info, (verified, code, message, headers) => {
	          if (!verified) {
	            return abortHandshake(socket, code || 401, message, headers);
	          }

	          this.completeUpgrade(
	            extensions,
	            key,
	            protocols,
	            req,
	            socket,
	            head,
	            cb
	          );
	        });
	        return;
	      }

	      if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
	    }

	    this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
	  }

	  /**
	   * Upgrade the connection to WebSocket.
	   *
	   * @param {Object} extensions The accepted extensions
	   * @param {String} key The value of the `Sec-WebSocket-Key` header
	   * @param {Set} protocols The subprotocols
	   * @param {http.IncomingMessage} req The request object
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Function} cb Callback
	   * @throws {Error} If called more than once with the same socket
	   * @private
	   */
	  completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
	    //
	    // Destroy the socket if the client has already sent a FIN packet.
	    //
	    if (!socket.readable || !socket.writable) return socket.destroy();

	    if (socket[kWebSocket]) {
	      throw new Error(
	        'server.handleUpgrade() was called more than once with the same ' +
	          'socket, possibly due to a misconfiguration'
	      );
	    }

	    if (this._state > RUNNING) return abortHandshake(socket, 503);

	    const digest = createHash('sha1')
	      .update(key + GUID)
	      .digest('base64');

	    const headers = [
	      'HTTP/1.1 101 Switching Protocols',
	      'Upgrade: websocket',
	      'Connection: Upgrade',
	      `Sec-WebSocket-Accept: ${digest}`
	    ];

	    const ws = new this.options.WebSocket(null, undefined, this.options);

	    if (protocols.size) {
	      //
	      // Optionally call external protocol selection handler.
	      //
	      const protocol = this.options.handleProtocols
	        ? this.options.handleProtocols(protocols, req)
	        : protocols.values().next().value;

	      if (protocol) {
	        headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
	        ws._protocol = protocol;
	      }
	    }

	    if (extensions[PerMessageDeflate.extensionName]) {
	      const params = extensions[PerMessageDeflate.extensionName].params;
	      const value = extension.format({
	        [PerMessageDeflate.extensionName]: [params]
	      });
	      headers.push(`Sec-WebSocket-Extensions: ${value}`);
	      ws._extensions = extensions;
	    }

	    //
	    // Allow external modification/inspection of handshake headers.
	    //
	    this.emit('headers', headers, req);

	    socket.write(headers.concat('\r\n').join('\r\n'));
	    socket.removeListener('error', socketOnError);

	    ws.setSocket(socket, head, {
	      allowSynchronousEvents: this.options.allowSynchronousEvents,
	      maxPayload: this.options.maxPayload,
	      skipUTF8Validation: this.options.skipUTF8Validation
	    });

	    if (this.clients) {
	      this.clients.add(ws);
	      ws.on('close', () => {
	        this.clients.delete(ws);

	        if (this._shouldEmitClose && !this.clients.size) {
	          process.nextTick(emitClose, this);
	        }
	      });
	    }

	    cb(ws, req);
	  }
	}

	websocketServer = WebSocketServer;

	/**
	 * Add event listeners on an `EventEmitter` using a map of <event, listener>
	 * pairs.
	 *
	 * @param {EventEmitter} server The event emitter
	 * @param {Object.<String, Function>} map The listeners to add
	 * @return {Function} A function that will remove the added listeners when
	 *     called
	 * @private
	 */
	function addListeners(server, map) {
	  for (const event of Object.keys(map)) server.on(event, map[event]);

	  return function removeListeners() {
	    for (const event of Object.keys(map)) {
	      server.removeListener(event, map[event]);
	    }
	  };
	}

	/**
	 * Emit a `'close'` event on an `EventEmitter`.
	 *
	 * @param {EventEmitter} server The event emitter
	 * @private
	 */
	function emitClose(server) {
	  server._state = CLOSED;
	  server.emit('close');
	}

	/**
	 * Handle socket errors.
	 *
	 * @private
	 */
	function socketOnError() {
	  this.destroy();
	}

	/**
	 * Close the connection when preconditions are not fulfilled.
	 *
	 * @param {Duplex} socket The socket of the upgrade request
	 * @param {Number} code The HTTP response status code
	 * @param {String} [message] The HTTP response body
	 * @param {Object} [headers] Additional HTTP response headers
	 * @private
	 */
	function abortHandshake(socket, code, message, headers) {
	  //
	  // The socket is writable unless the user destroyed or ended it before calling
	  // `server.handleUpgrade()` or in the `verifyClient` function, which is a user
	  // error. Handling this does not make much sense as the worst that can happen
	  // is that some of the data written by the user might be discarded due to the
	  // call to `socket.end()` below, which triggers an `'error'` event that in
	  // turn causes the socket to be destroyed.
	  //
	  message = message || http.STATUS_CODES[code];
	  headers = {
	    Connection: 'close',
	    'Content-Type': 'text/html',
	    'Content-Length': Buffer.byteLength(message),
	    ...headers
	  };

	  socket.once('finish', socket.destroy);

	  socket.end(
	    `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
	      Object.keys(headers)
	        .map((h) => `${h}: ${headers[h]}`)
	        .join('\r\n') +
	      '\r\n\r\n' +
	      message
	  );
	}

	/**
	 * Emit a `'wsClientError'` event on a `WebSocketServer` if there is at least
	 * one listener for it, otherwise call `abortHandshake()`.
	 *
	 * @param {WebSocketServer} server The WebSocket server
	 * @param {http.IncomingMessage} req The request object
	 * @param {Duplex} socket The socket of the upgrade request
	 * @param {Number} code The HTTP response status code
	 * @param {String} message The HTTP response body
	 * @private
	 */
	function abortHandshakeOrEmitwsClientError(server, req, socket, code, message) {
	  if (server.listenerCount('wsClientError')) {
	    const err = new Error(message);
	    Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);

	    server.emit('wsClientError', err, socket, req);
	  } else {
	    abortHandshake(socket, code, message);
	  }
	}
	return websocketServer;
}

var websocketServerExports = requireWebsocketServer();
const _WebSocketServer = /*@__PURE__*/getDefaultExportFromCjs(websocketServerExports);

const nodeAdapter = (options = {}) => {
  const hooks = new AdapterHookable(options);
  const peers = /* @__PURE__ */ new Set();
  const wss = options.wss || new _WebSocketServer({
    noServer: true,
    ...options.serverOptions
  });
  wss.on("connection", (ws, nodeReq) => {
    const request = new NodeReqProxy(nodeReq);
    const peer = new NodePeer({ ws, request, peers, nodeReq });
    peers.add(peer);
    hooks.callHook("open", peer);
    ws.on("message", (data) => {
      if (Array.isArray(data)) {
        data = Buffer.concat(data);
      }
      hooks.callHook("message", peer, new Message(data, peer));
    });
    ws.on("error", (error) => {
      peers.delete(peer);
      hooks.callHook("error", peer, new WSError(error));
    });
    ws.on("close", (code, reason) => {
      peers.delete(peer);
      hooks.callHook("close", peer, {
        code,
        reason: reason?.toString()
      });
    });
  });
  wss.on("headers", (outgoingHeaders, req) => {
    const upgradeHeaders = req._upgradeHeaders;
    if (upgradeHeaders) {
      for (const [key, value] of new Headers(upgradeHeaders)) {
        outgoingHeaders.push(`${key}: ${value}`);
      }
    }
  });
  return {
    ...adapterUtils(peers),
    handleUpgrade: async (nodeReq, socket, head) => {
      const request = new NodeReqProxy(nodeReq);
      const { upgradeHeaders, endResponse, context } = await hooks.upgrade(request);
      if (endResponse) {
        return sendResponse(socket, endResponse);
      }
      nodeReq._request = request;
      nodeReq._upgradeHeaders = upgradeHeaders;
      nodeReq._context = context;
      wss.handleUpgrade(nodeReq, socket, head, (ws) => {
        wss.emit("connection", ws, nodeReq);
      });
    },
    closeAll: (code, data, force) => {
      for (const client of wss.clients) {
        if (force) {
          client.terminate();
        } else {
          client.close(code, data);
        }
      }
    }
  };
};
class NodePeer extends Peer {
  get remoteAddress() {
    return this._internal.nodeReq.socket?.remoteAddress;
  }
  get context() {
    return this._internal.nodeReq._context;
  }
  send(data, options) {
    const dataBuff = toBufferLike(data);
    const isBinary = typeof dataBuff !== "string";
    this._internal.ws.send(dataBuff, {
      compress: options?.compress,
      binary: isBinary,
      ...options
    });
    return 0;
  }
  publish(topic, data, options) {
    const dataBuff = toBufferLike(data);
    const isBinary = typeof data !== "string";
    const sendOptions = {
      compress: options?.compress,
      binary: isBinary,
      ...options
    };
    for (const peer of this._internal.peers) {
      if (peer !== this && peer._topics.has(topic)) {
        peer._internal.ws.send(dataBuff, sendOptions);
      }
    }
  }
  close(code, data) {
    this._internal.ws.close(code, data);
  }
  terminate() {
    this._internal.ws.terminate();
  }
}
class NodeReqProxy {
  _req;
  _headers;
  _url;
  constructor(req) {
    this._req = req;
  }
  get url() {
    if (!this._url) {
      const req = this._req;
      const host = req.headers["host"] || "localhost";
      const isSecure = req.socket?.encrypted ?? req.headers["x-forwarded-proto"] === "https";
      this._url = `${isSecure ? "https" : "http"}://${host}${req.url}`;
    }
    return this._url;
  }
  get headers() {
    if (!this._headers) {
      this._headers = new Headers(this._req.headers);
    }
    return this._headers;
  }
}
async function sendResponse(socket, res) {
  const head = [
    `HTTP/1.1 ${res.status || 200} ${res.statusText || ""}`,
    ...[...res.headers.entries()].map(
      ([key, value]) => `${encodeURIComponent(key)}: ${encodeURIComponent(value)}`
    )
  ];
  socket.write(head.join("\r\n") + "\r\n\r\n");
  if (res.body) {
    for await (const chunk of res.body) {
      socket.write(chunk);
    }
  }
  return new Promise((resolve) => {
    socket.end(() => {
      socket.destroy();
      resolve();
    });
  });
}

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode$1(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$1(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$1(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c$1=class c{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c$1.prototype,i$1.prototype),Object.assign(c$1.prototype,l$1.prototype),c$1}function m(...n){return function(...e){for(const t of n)t(...e);}}const g$1=_();class A extends g$1{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode$1(params[key]);
    }
  }
  return params;
}
function getRouterParam(event, name, opts = {}) {
  const params = getRouterParams(event, opts);
  return params[name];
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies$1(event) {
  return parse(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies$1(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch({ fetch, Headers: Headers$1, AbortController });
const $fetch$1 = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize$1(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

function isEqual(object1, object2) {
  if (object1 === object2) {
    return true;
  }
  if (serialize$1(object1) === serialize$1(object2)) {
    return true;
  }
  return false;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash$1(input) {
  return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {},
  "ui": {
    "colors": {
      "primary": "green",
      "secondary": "blue",
      "success": "green",
      "info": "blue",
      "warning": "yellow",
      "error": "red",
      "neutral": "slate"
    },
    "icons": {
      "arrowLeft": "i-lucide-arrow-left",
      "arrowRight": "i-lucide-arrow-right",
      "check": "i-lucide-check",
      "chevronDoubleLeft": "i-lucide-chevrons-left",
      "chevronDoubleRight": "i-lucide-chevrons-right",
      "chevronDown": "i-lucide-chevron-down",
      "chevronLeft": "i-lucide-chevron-left",
      "chevronRight": "i-lucide-chevron-right",
      "chevronUp": "i-lucide-chevron-up",
      "close": "i-lucide-x",
      "ellipsis": "i-lucide-ellipsis",
      "external": "i-lucide-arrow-up-right",
      "file": "i-lucide-file",
      "folder": "i-lucide-folder",
      "folderOpen": "i-lucide-folder-open",
      "loading": "i-lucide-loader-circle",
      "minus": "i-lucide-minus",
      "plus": "i-lucide-plus",
      "search": "i-lucide-search",
      "upload": "i-lucide-upload"
    }
  },
  "icon": {
    "provider": "none",
    "class": "",
    "aliases": {},
    "iconifyApiEndpoint": "https://api.iconify.design",
    "localApiEndpoint": "/api/_nuxt_icon",
    "fallbackToApi": true,
    "cssSelectorPrefix": "i-",
    "cssWherePseudo": true,
    "cssLayer": "components",
    "mode": "css",
    "attrs": {
      "aria-hidden": true
    },
    "collections": [
      "academicons",
      "akar-icons",
      "ant-design",
      "arcticons",
      "basil",
      "bi",
      "bitcoin-icons",
      "bpmn",
      "brandico",
      "bx",
      "bxl",
      "bxs",
      "bytesize",
      "carbon",
      "catppuccin",
      "cbi",
      "charm",
      "ci",
      "cib",
      "cif",
      "cil",
      "circle-flags",
      "circum",
      "clarity",
      "codex",
      "codicon",
      "covid",
      "cryptocurrency",
      "cryptocurrency-color",
      "cuida",
      "dashicons",
      "devicon",
      "devicon-plain",
      "dinkie-icons",
      "duo-icons",
      "ei",
      "el",
      "emojione",
      "emojione-monotone",
      "emojione-v1",
      "entypo",
      "entypo-social",
      "eos-icons",
      "ep",
      "et",
      "eva",
      "f7",
      "fa",
      "fa-brands",
      "fa-regular",
      "fa-solid",
      "fa6-brands",
      "fa6-regular",
      "fa6-solid",
      "fa7-brands",
      "fa7-regular",
      "fa7-solid",
      "fad",
      "famicons",
      "fe",
      "feather",
      "file-icons",
      "flag",
      "flagpack",
      "flat-color-icons",
      "flat-ui",
      "flowbite",
      "fluent",
      "fluent-color",
      "fluent-emoji",
      "fluent-emoji-flat",
      "fluent-emoji-high-contrast",
      "fluent-mdl2",
      "fontelico",
      "fontisto",
      "formkit",
      "foundation",
      "fxemoji",
      "gala",
      "game-icons",
      "garden",
      "geo",
      "gg",
      "gis",
      "gravity-ui",
      "gridicons",
      "grommet-icons",
      "guidance",
      "healthicons",
      "heroicons",
      "heroicons-outline",
      "heroicons-solid",
      "hugeicons",
      "humbleicons",
      "ic",
      "icomoon-free",
      "icon-park",
      "icon-park-outline",
      "icon-park-solid",
      "icon-park-twotone",
      "iconamoon",
      "iconoir",
      "icons8",
      "il",
      "ion",
      "iwwa",
      "ix",
      "jam",
      "la",
      "lets-icons",
      "line-md",
      "lineicons",
      "logos",
      "ls",
      "lsicon",
      "lucide",
      "lucide-lab",
      "mage",
      "majesticons",
      "maki",
      "map",
      "marketeq",
      "material-icon-theme",
      "material-symbols",
      "material-symbols-light",
      "mdi",
      "mdi-light",
      "medical-icon",
      "memory",
      "meteocons",
      "meteor-icons",
      "mi",
      "mingcute",
      "mono-icons",
      "mynaui",
      "nimbus",
      "nonicons",
      "noto",
      "noto-v1",
      "nrk",
      "octicon",
      "oi",
      "ooui",
      "openmoji",
      "oui",
      "pajamas",
      "pepicons",
      "pepicons-pencil",
      "pepicons-pop",
      "pepicons-print",
      "ph",
      "picon",
      "pixel",
      "pixelarticons",
      "prime",
      "proicons",
      "ps",
      "qlementine-icons",
      "quill",
      "radix-icons",
      "raphael",
      "ri",
      "rivet-icons",
      "roentgen",
      "si",
      "si-glyph",
      "sidekickicons",
      "simple-icons",
      "simple-line-icons",
      "skill-icons",
      "solar",
      "stash",
      "streamline",
      "streamline-block",
      "streamline-color",
      "streamline-cyber",
      "streamline-cyber-color",
      "streamline-emojis",
      "streamline-flex",
      "streamline-flex-color",
      "streamline-freehand",
      "streamline-freehand-color",
      "streamline-kameleon-color",
      "streamline-logos",
      "streamline-pixel",
      "streamline-plump",
      "streamline-plump-color",
      "streamline-sharp",
      "streamline-sharp-color",
      "streamline-stickies-color",
      "streamline-ultimate",
      "streamline-ultimate-color",
      "subway",
      "svg-spinners",
      "system-uicons",
      "tabler",
      "tdesign",
      "teenyicons",
      "temaki",
      "token",
      "token-branded",
      "topcoat",
      "twemoji",
      "typcn",
      "uil",
      "uim",
      "uis",
      "uit",
      "uiw",
      "unjs",
      "vaadin",
      "vs",
      "vscode-icons",
      "websymbol",
      "weui",
      "whh",
      "wi",
      "wpf",
      "zmdi",
      "zondicons"
    ],
    "fetchTimeout": 1500
  }
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/mahjong/",
    "buildId": "2e20cd6e-6f65-4e94-9064-665d15103c2c",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {},
  "icon": {
    "serverKnownCssClasses": []
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
const _sharedAppConfig = _deepFreeze(klona(appConfig));
function useAppConfig(event) {
  {
    return _sharedAppConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}

getContext("nitro-app", {
  asyncContext: false,
  AsyncLocalStorage: void 0
});

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
	
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		
		return;
	}
	
	const defaultRes = await defaultHandler(error, event, { json: true });
	
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	
	const reqHeaders = getRequestHeaders(event);
	
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
	
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	
	if (!res) {
		const { template } = await import('../_/error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/mahjong/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const script = "\"use strict\";(()=>{const t=window,e=document.documentElement,c=[\"dark\",\"light\"],n=getStorageValue(\"localStorage\",\"nuxt-color-mode\")||\"system\";let i=n===\"system\"?u():n;const r=e.getAttribute(\"data-color-mode-forced\");r&&(i=r),l(i),t[\"__NUXT_COLOR_MODE__\"]={preference:n,value:i,getColorScheme:u,addColorScheme:l,removeColorScheme:d};function l(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.add(s):e.className+=\" \"+s,a&&e.setAttribute(\"data-\"+a,o)}function d(o){const s=\"\"+o+\"\",a=\"\";e.classList?e.classList.remove(s):e.className=e.className.replace(new RegExp(s,\"g\"),\"\"),a&&e.removeAttribute(\"data-\"+a)}function f(o){return t.matchMedia(\"(prefers-color-scheme\"+o+\")\")}function u(){if(t.matchMedia&&f(\"\").media!==\"not all\"){for(const o of c)if(f(\":\"+o).matches)return o}return\"light\"}})();function getStorageValue(t,e){switch(t){case\"localStorage\":return window.localStorage.getItem(e);case\"sessionStorage\":return window.sessionStorage.getItem(e);case\"cookie\":return getCookie(e);default:return null}}function getCookie(t){const c=(\"; \"+window.document.cookie).split(\"; \"+t+\"=\");if(c.length===2)return c.pop()?.split(\";\").shift()}";

const _jQO0PqkFUlYSs2One7S4eWh0meJY0zMfckEqjHoQ1Lc = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

function defineNitroPlugin(def) {
  return def;
}

const SUPPRESS_CODES = /* @__PURE__ */ new Set(["ECONNABORTED", "EPIPE", "ECONNRESET", "ECANCELED"]);
function shouldSuppress(err) {
  if (!err) return false;
  if (SUPPRESS_CODES.has(err == null ? void 0 : err.code)) return true;
  if (typeof (err == null ? void 0 : err.message) === "string" && [...SUPPRESS_CODES].some((c) => err.message.includes(c))) return true;
  if (typeof (err == null ? void 0 : err.stack) === "string" && [...SUPPRESS_CODES].some((c) => err.stack.includes(c))) return true;
  if (Array.isArray(err == null ? void 0 : err.errors) && err.errors.some((inner) => shouldSuppress(inner))) return true;
  if ((err == null ? void 0 : err.error) && shouldSuppress(err.error)) return true;
  if ((err == null ? void 0 : err.data) && shouldSuppress(err.data)) return true;
  if ((err == null ? void 0 : err.reason) && shouldSuppress(err.reason)) return true;
  if (err == null ? void 0 : err.cause) return shouldSuppress(err.cause);
  return false;
}
process.on("unhandledRejection", (reason) => {
  if (shouldSuppress(reason)) {
    console.warn("\u26A0\uFE0F Suppressed rejection:", (reason == null ? void 0 : reason.code) || String((reason == null ? void 0 : reason.message) || reason).slice(0, 60));
    return;
  }
  console.error("\u274C unhandledRejection:", reason);
});
process.on("uncaughtException", (error) => {
  if (shouldSuppress(error)) {
    console.warn("\u26A0\uFE0F Suppressed exception:", (error == null ? void 0 : error.code) || String((error == null ? void 0 : error.message) || error).slice(0, 60));
    return;
  }
  console.error("\u274C uncaughtException:", error);
});
const _ujpCNWk8GNreIhCLSnb6W0LvCIFz2dasUxef_hN6_Q8 = defineNitroPlugin(() => {
  console.log("\u{1F6E1}\uFE0F Error handler active");
});

const g = globalThis;
function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment (e.g. .env) like:\nMONGODB_URI=mongodb://localhost:27017\nOptionally set MONGODB_DB for the default database name."
    );
  }
  return uri;
}
function getDefaultDbName() {
  return process.env.MONGODB_DB || "changqingge";
}
async function getMongoClient() {
  if (g._mongoClient) return g._mongoClient;
  const client = new MongoClient(getMongoUri(), {
    connectTimeoutMS: 1e4,
    // 连接超时 10s（防挂死）
    socketTimeoutMS: 3e4,
    // Socket 超时 30s（加快失败）
    serverSelectionTimeoutMS: 1e4,
    // 服务选择超时 10s
    retryWrites: true,
    // 写入失败自动重试
    retryReads: true,
    // 读取失败自动重试
    maxPoolSize: 10,
    // 连接池
    minPoolSize: 1,
    heartbeatFrequencyMS: 1e4
  });
  await client.db("admin").command({ ping: 1 });
  g._mongoClient = client;
  return client;
}
async function getDb(dbName) {
  if (g._mongoDb && (true)) {
    return g._mongoDb;
  }
  const client = await getMongoClient();
  const db = client.db(getDefaultDbName());
  g._mongoDb = db;
  return db;
}
async function getCollection$1(name, dbName) {
  const db = await getDb();
  return db.collection(name);
}

var TileSuit = /* @__PURE__ */ ((TileSuit2) => {
  TileSuit2["DOTS"] = "dots";
  TileSuit2["CHARACTERS"] = "wan";
  TileSuit2["BAMBOOS"] = "tiao";
  TileSuit2["WIND"] = "feng";
  TileSuit2["DRAGON"] = "jian";
  TileSuit2["FLOWER"] = "hua";
  return TileSuit2;
})(TileSuit || {});
var MeldType = /* @__PURE__ */ ((MeldType2) => {
  MeldType2["SEQUENCE"] = "sequence";
  MeldType2["TRIPLET"] = "triplet";
  MeldType2["KONG"] = "kong";
  MeldType2["CONCEALED_KONG"] = "concealed_kong";
  MeldType2["PAIR"] = "pair";
  return MeldType2;
})(MeldType || {});
var PlayerStatus = /* @__PURE__ */ ((PlayerStatus2) => {
  PlayerStatus2["WAITING"] = "waiting";
  PlayerStatus2["PLAYING"] = "playing";
  PlayerStatus2["WON"] = "won";
  PlayerStatus2["LOST"] = "lost";
  PlayerStatus2["SPECTATING"] = "spectating";
  return PlayerStatus2;
})(PlayerStatus || {});
var ActionType = /* @__PURE__ */ ((ActionType2) => {
  ActionType2["DRAW"] = "draw";
  ActionType2["DISCARD"] = "discard";
  ActionType2["CHOW"] = "chow";
  ActionType2["PENG"] = "peng";
  ActionType2["KONG"] = "kong";
  ActionType2["EXTENDED_KONG"] = "extended_kong";
  ActionType2["CONCEALED_KONG"] = "concealed_kong";
  ActionType2["HU"] = "hu";
  ActionType2["PASS"] = "pass";
  ActionType2["CHEAT_HU"] = "cheat_hu";
  ActionType2["REBEL"] = "rebel";
  ActionType2["LIANG_SHAN"] = "liang_shan";
  ActionType2["THINK"] = "think";
  return ActionType2;
})(ActionType || {});
var GamePhase = /* @__PURE__ */ ((GamePhase2) => {
  GamePhase2["WAITING"] = "waiting";
  GamePhase2["STARTING"] = "starting";
  GamePhase2["PLAYING"] = "playing";
  GamePhase2["CHA_JIAO"] = "cha_jiao";
  GamePhase2["ENDED"] = "ended";
  return GamePhase2;
})(GamePhase || {});
var GameEndReason = /* @__PURE__ */ ((GameEndReason2) => {
  GameEndReason2["WALL_EXHAUSTED"] = "wall_exhausted";
  GameEndReason2["LAST_PLAYER"] = "last_player";
  GameEndReason2["OWNER_LEFT"] = "owner_left";
  GameEndReason2["EMPTY_ROOM"] = "empty_room";
  return GameEndReason2;
})(GameEndReason || {});

function createDeck() {
  const tiles = [];
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numberSuits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          suit,
          value,
          id: `${suit}-${value}-${copy}`,
          isFlower: false
        });
      }
    }
  }
  const windNames = ["dong", "nan", "xi", "bei"];
  for (let w = 1; w <= 4; w++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        suit: TileSuit.WIND,
        value: w,
        id: `feng-${windNames[w - 1]}-${copy}`,
        isFlower: false
      });
    }
  }
  const dragonNames = ["zhong", "fa", "bai"];
  for (let d = 1; d <= 3; d++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        suit: TileSuit.DRAGON,
        value: d,
        id: `jian-${dragonNames[d - 1]}-${copy}`,
        isFlower: false
      });
    }
  }
  const flowerNames = ["chun", "xia", "qiu", "dong", "mei", "lan", "zhu", "ju"];
  for (let f = 1; f <= 8; f++) {
    tiles.push({
      suit: TileSuit.FLOWER,
      value: f,
      id: `hua-${flowerNames[f - 1]}`,
      isFlower: true
    });
  }
  return tiles;
}
function shuffleTiles(tiles) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function tilesEqual(tile1, tile2) {
  return tile1.suit === tile2.suit && tile1.value === tile2.value;
}
function findTileById(tiles, tileId) {
  return tiles.find((t) => t.id === tileId);
}
function removeTile(tiles, tileId) {
  return tiles.filter((t) => t.id !== tileId);
}
function groupTiles(tiles) {
  const groups = /* @__PURE__ */ new Map();
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tile);
  }
  return groups;
}
function getSuits(tiles) {
  return new Set(tiles.map((t) => t.suit));
}
function isMissingOneSuit(tiles) {
  const suits = getSuits(tiles);
  if (suits.size === 2) {
    const allSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    const missingSuit = allSuits.find((s) => !suits.has(s)) || null;
    return { missing: true, missingSuit };
  }
  return { missing: false, missingSuit: null };
}
function isWind(tile) {
  return tile.suit === TileSuit.WIND;
}
function isDragon(tile) {
  return tile.suit === TileSuit.DRAGON;
}
function isFlower(tile) {
  return !!tile && (tile.suit === TileSuit.FLOWER || tile.isFlower === true);
}
function isHonor(tile) {
  return tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON;
}
function getWindName(value) {
  const names = ["\u4E1C", "\u5357", "\u897F", "\u5317"];
  return names[value - 1] || "?";
}
function getDragonName(value) {
  const names = ["\u4E2D", "\u53D1", "\u767D"];
  return names[value - 1] || "?";
}
function getFlowerName(value) {
  const names = ["\u6625", "\u590F", "\u79CB", "\u51AC", "\u6885", "\u5170", "\u7AF9", "\u83CA"];
  return names[value - 1] || "?";
}
function isFivePoison(tiles, wildTileSuit, wildTileValue, exposedTiles = []) {
  const nonFlowerTiles = tiles.filter((t) => !isFlower(t));
  if (nonFlowerTiles.length !== tiles.length) return false;
  if (exposedTiles.some((t) => isFlower(t))) return false;
  const suits = getSuits(nonFlowerTiles);
  const hasDots = suits.has(TileSuit.DOTS);
  const hasWan = suits.has(TileSuit.CHARACTERS);
  const hasTiao = suits.has(TileSuit.BAMBOOS);
  if (!hasDots || !hasWan || !hasTiao) return false;
  const hasWind = nonFlowerTiles.some((t) => t.suit === TileSuit.WIND);
  if (!hasWind) return false;
  const hasDragon = nonFlowerTiles.some((t) => t.suit === TileSuit.DRAGON);
  if (!hasDragon) return false;
  if (wildTileSuit !== void 0 && wildTileValue !== void 0) {
    const hasWild = nonFlowerTiles.some((t) => t.suit === wildTileSuit && t.value === wildTileValue);
    if (hasWild) return false;
  }
  const groups = groupTiles(nonFlowerTiles);
  for (const [, group] of groups) {
    if (group.length >= 2) return false;
  }
  return true;
}
function getTileDisplayName(tile) {
  if (tile.suit === TileSuit.WIND) return getWindName(tile.value);
  if (tile.suit === TileSuit.DRAGON) return getDragonName(tile.value);
  if (tile.suit === TileSuit.FLOWER) return getFlowerName(tile.value);
  const suitNames = {
    [TileSuit.DOTS]: "\u7B52",
    [TileSuit.CHARACTERS]: "\u4E07",
    [TileSuit.BAMBOOS]: "\u6761"
  };
  const numNames = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D"];
  return `${numNames[tile.value - 1]}${suitNames[tile.suit]}`;
}

function meldSignature(melds) {
  if (!melds.length) return "none";
  return melds.map((meld) => {
    const tileSig = meld.tiles.map((tile) => `${tile.suit[0]}${tile.value}`).sort().join(",");
    return `${meld.type}:${meld.isConcealed ? 1 : 0}:${tileSig}`;
  }).sort().join("|");
}
var HandType = /* @__PURE__ */ ((HandType2) => {
  HandType2["FENG_PENG"] = "feng_peng";
  HandType2["ALL_WIND"] = "all_wind";
  HandType2["QING_PENG"] = "qing_peng";
  HandType2["HUN_PENG"] = "hun_peng";
  HandType2["EIGHT_FLOWERS"] = "eight_flowers";
  HandType2["FULL_FLUSH"] = "full_flush";
  HandType2["HALF_FLUSH"] = "half_flush";
  HandType2["FOUR_WILD"] = "four_wild";
  HandType2["ALL_TRIPLETS"] = "all_triplets";
  HandType2["DA_DIAO"] = "da_diao";
  HandType2["STANDARD"] = "standard";
  return HandType2;
})(HandType || {});
const HAND_TYPE_TIER = {
  // TIER_1: 顶级固定番数牌型
  TIER_1: {
    ["feng_peng" /* FENG_PENG */]: 100,
    // 风碰 = 40点
    ["all_wind" /* ALL_WIND */]: 90,
    // 风一色 = 20点
    ["qing_peng" /* QING_PENG */]: 80
    // 清碰 = 20点
  },
  // TIER_2: 次级固定番数牌型
  TIER_2: {
    ["hun_peng" /* HUN_PENG */]: 70,
    // 混碰 = 10点
    ["eight_flowers" /* EIGHT_FLOWERS */]: 85,
    // 八花自摸 = 20点
    ["four_wild" /* FOUR_WILD */]: 55,
    // 四百搭 = 10点
    ["full_flush" /* FULL_FLUSH */]: 50
    // 清一色 = 10点
  },
  // TIER_3: 公式计算牌型（需根据花牌/组合计算番数）
  TIER_3: {
    ["half_flush" /* HALF_FLUSH */]: 40,
    // 混一色（公式计算）
    ["all_triplets" /* ALL_TRIPLETS */]: 30
    // 碰碰胡（公式计算）
  },
  // TIER_4: 特殊独立牌型
  TIER_4: {
    ["da_diao" /* DA_DIAO */]: 45,
    // 大吊 = 10点固定（高于混一色/碰碰胡，确保独立大吊被识别）
    ["standard" /* STANDARD */]: 10
    // 普通胡（最低优先级兜底）
  }
};
const HAND_TYPE_PRIORITY = (() => {
  const priority = {};
  for (const tier of Object.values(HAND_TYPE_TIER)) {
    for (const [type, value] of Object.entries(tier)) {
      priority[type] = value;
    }
  }
  return priority;
})();
function normalizeSuitAlias(suit) {
  const s = suit.toLowerCase();
  if (s === "bamboo") return "tiao";
  if (s === "tong") return "dots";
  if (s === "wan") return "wan";
  if (s === "tiao") return "tiao";
  if (s === "dots") return "dots";
  return s;
}
function buildWildTileChecker(wildTileId, wildTileGroup) {
  if (!wildTileId || typeof wildTileId !== "string") {
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t) => t.suit === TileSuit.FLOWER && wildTileGroup.includes(String(t.value));
    }
    return () => false;
  }
  const parts = wildTileId.split("-");
  if (parts.length < 2) {
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t) => t.suit === TileSuit.FLOWER && wildTileGroup.includes(String(t.value));
    }
    return () => false;
  }
  const canonicalSuit = normalizeSuitAlias(parts[0]);
  const normalizedSuit = normalizeTileSuit(canonicalSuit);
  if (!normalizedSuit) {
    if (wildTileGroup && wildTileGroup.length > 0) {
      return (t) => t.suit === TileSuit.FLOWER && wildTileGroup.includes(String(t.value));
    }
    return () => false;
  }
  if (normalizedSuit === TileSuit.FLOWER && wildTileGroup && wildTileGroup.length > 0) {
    return (t) => t.suit === TileSuit.FLOWER && wildTileGroup.includes(String(t.value));
  }
  return (t) => t.suit === normalizedSuit && String(t.value) === parts[1];
}
function normalizeTileSuit(rawSuit) {
  switch (rawSuit) {
    case TileSuit.DOTS:
    case "tong":
      return TileSuit.DOTS;
    case TileSuit.CHARACTERS:
    case "wan":
      return TileSuit.CHARACTERS;
    case TileSuit.BAMBOOS:
    case "tiao":
      return TileSuit.BAMBOOS;
    case "bamboo":
      return TileSuit.BAMBOOS;
    case TileSuit.WIND:
    case "feng":
      return TileSuit.WIND;
    case TileSuit.DRAGON:
    case "jian":
      return TileSuit.DRAGON;
    case TileSuit.FLOWER:
    case "hua":
      return TileSuit.FLOWER;
    // 兼容历史命名（避免重复case，已在上面处理）
    case "WAN":
    case "TIAO":
    case "DOTS":
      return null;
    // 这些全大写形式不应出现在TileSuit中，保持null
    default:
      return null;
  }
}
function tileKeyOrder(key) {
  const [suit, valueText] = key.split("-");
  const value = parseInt(valueText, 10) || 0;
  const suitRank = (() => {
    switch (suit) {
      case TileSuit.DOTS:
        return 0;
      case TileSuit.CHARACTERS:
        return 1;
      case TileSuit.BAMBOOS:
        return 2;
      case TileSuit.WIND:
        return 3;
      case TileSuit.DRAGON:
        return 4;
      case TileSuit.FLOWER:
        return 5;
      default:
        return 9;
    }
  })();
  return suitRank * 100 + value;
}
function findLowestPositiveKey(map) {
  let bestKey = null;
  let bestOrder = Number.POSITIVE_INFINITY;
  for (const [key, count] of map) {
    if (count <= 0) continue;
    const order = tileKeyOrder(key);
    if (order < bestOrder) {
      bestOrder = order;
      bestKey = key;
    }
  }
  return bestKey;
}
function isValidHandSize(count) {
  return [2, 5, 8, 11, 14].includes(count);
}
function isValidTingHandSize(count) {
  return [1, 4, 7, 10, 13].includes(count);
}
const _debugHandCache = /* @__PURE__ */ new Set();
function canFormMelds(tiles, n, isWildTile) {
  if (n === 0) {
    if (tiles.length === 0) return true;
    if (tiles.length === 2) {
      const wilds2 = tiles.filter((t) => isWildTile(t));
      const naturals2 = tiles.filter((t) => !isWildTile(t));
      if (wilds2.length >= 2) return true;
      if (naturals2.length === 2 && naturals2[0].suit === naturals2[1].suit && naturals2[0].value === naturals2[1].value) return true;
      if (naturals2.length === 1 && wilds2.length === 1) return true;
    }
    return false;
  }
  const wilds = tiles.filter((t) => isWildTile(t));
  const naturals = tiles.filter((t) => !isWildTile(t));
  const countMap = /* @__PURE__ */ new Map();
  for (const t of naturals) {
    const k = `${t.suit}-${t.value}`;
    countMap.set(k, (countMap.get(k) || 0) + 1);
  }
  const pairCandidates = [];
  const natPairs = [];
  for (const [k, cnt] of countMap) {
    if (cnt >= 2) natPairs.push({ key: k, cnt, isWild: false });
  }
  natPairs.sort((a, b) => a.cnt - b.cnt);
  const wildOne = [];
  if (wilds.length >= 1) {
    for (const [k, cnt] of countMap) {
      wildOne.push({ key: k, cnt, isWild: true });
    }
  }
  wildOne.sort((a, b) => b.cnt - a.cnt);
  if (wilds.length >= 2) {
    pairCandidates.push({ key: "__wild_pair__", cnt: 2, isWild: true });
  }
  pairCandidates.push(...wildOne);
  pairCandidates.push(...natPairs);
  for (const pair of pairCandidates) {
    const map2 = new Map(countMap);
    let wildLeft = wilds.length;
    if (!pair.isWild) {
      const prev = map2.get(pair.key);
      if (prev < 2) continue;
      map2.set(pair.key, prev - 2);
    } else if (pair.key === "__wild_pair__") {
      wildLeft -= 2;
    } else {
      const prev = map2.get(pair.key);
      map2.set(pair.key, prev - 1);
      wildLeft -= 1;
    }
    if (wildLeft < 0) continue;
    if (tryFormMelds(n, wildLeft, map2)) return true;
  }
  if (tiles.length >= 11 && _debugHandCache.size < 5) {
    const sig = tiles.map((t) => `${t.suit[0]}${t.value}`).sort().join(",");
    if (!_debugHandCache.has(sig)) {
      _debugHandCache.add(sig);
    }
  }
  return false;
}
function canFormOnlyTripletsFrom(tiles, n, isWildTile) {
  if (n === 0) return tiles.length === 0;
  const wilds = tiles.filter((t) => isWildTile(t));
  const naturals = tiles.filter((t) => !isWildTile(t));
  const countMap = /* @__PURE__ */ new Map();
  for (const t of naturals) {
    const k = `${t.suit}-${t.value}`;
    countMap.set(k, (countMap.get(k) || 0) + 1);
  }
  const pairCandidates = [];
  for (const [k, cnt] of countMap) {
    if (cnt >= 2) pairCandidates.push({ key: k, cnt, isWild: false });
  }
  if (wilds.length >= 1) {
    for (const [k] of countMap) {
      pairCandidates.push({ key: k, cnt: 1, isWild: true });
    }
  }
  if (wilds.length >= 2) {
    pairCandidates.push({ key: "__wild_pair__", cnt: 2, isWild: true });
  }
  for (const pair of pairCandidates) {
    const map2 = new Map(countMap);
    let wildLeft = wilds.length;
    if (!pair.isWild) {
      const prev = map2.get(pair.key);
      if (prev < 2) continue;
      map2.set(pair.key, prev - 2);
    } else if (pair.key === "__wild_pair__") {
      wildLeft -= 2;
    } else {
      const prev = map2.get(pair.key);
      map2.set(pair.key, prev - 1);
      wildLeft -= 1;
    }
    if (wildLeft < 0) continue;
    if (tryFormOnlyTriplets(n, wildLeft, map2)) return true;
  }
  return false;
}
function tryFormOnlyTriplets(n, wildLeft, map) {
  if (n === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }
  const firstKey = findLowestPositiveKey(map);
  if (!firstKey) return wildLeft >= n * 3;
  const cnt = map.get(firstKey);
  const needTriplet = Math.max(0, 3 - cnt);
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, Math.max(0, cnt - 3));
    if (tryFormOnlyTriplets(n - 1, wildLeft - needTriplet, map)) return true;
    map.set(firstKey, saved);
  }
  return false;
}
function tryFormMelds(n, wildLeft, map) {
  if (n === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }
  const firstKey = findLowestPositiveKey(map);
  if (!firstKey) return wildLeft >= n * 3;
  const [suit, valStr] = firstKey.split("-");
  const val = parseInt(valStr);
  const cnt = map.get(firstKey);
  const needTriplet = Math.max(0, 3 - cnt);
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, Math.max(0, cnt - 3));
    if (tryFormMelds(n - 1, wildLeft - needTriplet, map)) return true;
    map.set(firstKey, saved);
  }
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (numSuits.includes(suit) && val <= 7) {
    const k2 = `${suit}-${val + 1}`;
    const k3 = `${suit}-${val + 2}`;
    const c2 = map.get(k2) || 0;
    const c3 = map.get(k3) || 0;
    const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);
    if (missing <= wildLeft) {
      const s2 = c2, s3 = c3;
      const saved = cnt;
      map.set(firstKey, cnt - 1);
      if (c2 > 0) map.set(k2, c2 - 1);
      if (c3 > 0) map.set(k3, c3 - 1);
      if (tryFormMelds(n - 1, wildLeft - missing, map)) return true;
      map.set(firstKey, saved);
      if (s2 > 0) map.set(k2, s2);
      if (s3 > 0) map.set(k3, s3);
    }
  }
  return false;
}
function isGarbageMultiSuitsWithSequenceProjectRule(concealedTiles) {
  const suits = getSuits(concealedTiles);
  if (suits.size < 2) return false;
  const nonFlower = concealedTiles.filter((t) => !isFlower(t));
  const m = (nonFlower.length - 2) / 3;
  if (!Number.isInteger(m) || m < 0) return false;
  if (canFormOnlyTripletsFrom(nonFlower, m, () => false)) return false;
  return true;
}
function canWinByProjectRuleNoWild(concealed, exposed) {
  const concealedNonFlower = concealed.filter((t) => !isFlower(t));
  if (!isValidHandSize(concealedNonFlower.length) && concealedNonFlower.length !== 1) return false;
  const allWind = concealedNonFlower.length > 0 && concealedNonFlower.every((t) => isWind(t) || isDragon(t));
  if (allWind) return true;
  let remainingMelds;
  if (concealedNonFlower.length === 1) {
    remainingMelds = 0;
  } else {
    remainingMelds = (concealedNonFlower.length - 2) / 3;
    if (!Number.isInteger(remainingMelds) || remainingMelds < 0) return false;
  }
  const satisfiesFormat = concealedNonFlower.length === 1 ? true : canFormMelds(concealedNonFlower, remainingMelds, () => false);
  if (!satisfiesFormat) return false;
  const hasExposedSequence = exposed.some((m) => m.type === MeldType.SEQUENCE);
  const canFormOnlyTriplets = concealedNonFlower.length === 1 ? false : canFormOnlyTripletsFrom(concealedNonFlower, remainingMelds, () => false);
  if (!hasExposedSequence && canFormOnlyTriplets) return true;
  const allExposedNonFlower = exposed.flatMap((m) => m.tiles).filter((t) => !isFlower(t));
  const allNonFlower = [...concealedNonFlower, ...allExposedNonFlower];
  const suits = getSuits(allNonFlower);
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const windSuits = [TileSuit.WIND];
  let numSuitCount = 0;
  let windCount = 0;
  for (const s of suits) {
    if (numSuits.includes(s)) numSuitCount++;
    else if (windSuits.includes(s) || s === TileSuit.DRAGON) windCount++;
  }
  if (numSuitCount === 1 && windCount === 0) return true;
  if (numSuitCount === 1 && windCount >= 1) return true;
  if (concealedNonFlower.length === 1) return true;
  return !isGarbageMultiSuitsWithSequenceProjectRule(concealedNonFlower);
}
function canWinByProjectRuleWithWildExact(concealed, exposed, wildTileId) {
  const parts = wildTileId.split("-");
  if (parts.length < 2) return canWinByProjectRuleNoWild(concealed, exposed);
  const [wildSuitRaw, wildVal] = parts;
  const wildSuit = normalizeTileSuit(wildSuitRaw);
  if (!wildSuit) return canWinByProjectRuleNoWild(concealed, exposed);
  const isWild = (t) => t.suit === wildSuit && String(t.value) === wildVal;
  const wildCount = concealed.filter((t) => isWild(t)).length;
  if (wildCount === 0) return canWinByProjectRuleNoWild(concealed, exposed);
  if (wildCount > 3) return false;
  const naturals = concealed.filter((t) => !isWild(t));
  const allCandidates = [];
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 9; value++) {
      allCandidates.push({ suit, value });
    }
  }
  for (let value = 1; value <= 4; value++) allCandidates.push({ suit: TileSuit.WIND, value });
  for (let value = 1; value <= 3; value++) allCandidates.push({ suit: TileSuit.DRAGON, value });
  const enumerate = (depth, alloc) => {
    if (depth === wildCount) {
      return canWinByProjectRuleNoWild([...naturals, ...alloc], exposed);
    }
    for (const candidate of allCandidates) {
      alloc.push({ suit: candidate.suit, value: candidate.value, id: `exact-${depth}-${candidate.suit}-${candidate.value}`, isFlower: false });
      if (enumerate(depth + 1, alloc)) {
        alloc.pop();
        return true;
      }
      alloc.pop();
    }
    return false;
  };
  return enumerate(0, []);
}
function detectTypes(concealed, exposed) {
  const types = [];
  const concealedNonFlower = concealed.filter((t) => !isFlower(t));
  const concealedFlowerCount = concealed.filter((t) => isFlower(t)).length;
  const flowerCount = concealedFlowerCount >= 6 ? concealedFlowerCount + exposed.flatMap((m) => m.tiles).filter((t) => isFlower(t)).length : concealedFlowerCount;
  if (flowerCount >= 8) types.push("eight_flowers" /* EIGHT_FLOWERS */);
  if (types.length === 0 && !isValidHandSize(concealedNonFlower.length) && concealedNonFlower.length !== 1) return [];
  const exposedNonFlower = exposed.flatMap((m) => m.tiles).filter((t) => !isFlower(t));
  const allTilesNonFlower = [...concealedNonFlower, ...exposedNonFlower];
  const allWind = allTilesNonFlower.length > 0 && allTilesNonFlower.every((t) => isWind(t) || isDragon(t));
  if (allWind) types.push("all_wind" /* ALL_WIND */);
  let remainingMelds;
  if (concealedNonFlower.length === 1) {
    remainingMelds = 0;
  } else {
    remainingMelds = (concealedNonFlower.length - 2) / 3;
    if (!Number.isInteger(remainingMelds) || remainingMelds < 0) return [];
  }
  const hasExposedSequence = exposed.some((m) => m.type === MeldType.SEQUENCE);
  const satisfiesFormat = concealedNonFlower.length === 1 ? true : canFormMelds(concealedNonFlower, remainingMelds, () => false);
  const canFormOnlyTriplets = concealedNonFlower.length === 1 ? false : canFormOnlyTripletsFrom(concealedNonFlower, remainingMelds, () => false);
  if (!hasExposedSequence && canFormOnlyTriplets) {
    types.push("all_triplets" /* ALL_TRIPLETS */);
  }
  if (concealedNonFlower.length === 1) {
    const exposedAllTriplets = exposed.every(
      (m) => m.type === MeldType.TRIPLET || m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG
    );
    if (!hasExposedSequence && exposedAllTriplets) {
      types.push("all_triplets" /* ALL_TRIPLETS */);
    }
  }
  const allExposedNonFlower = exposedNonFlower;
  const allNonFlower = [...concealedNonFlower, ...allExposedNonFlower];
  const suits = getSuits(allNonFlower);
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const windSuits = [TileSuit.WIND];
  let numSuitCount = 0, windCount = 0;
  for (const s of suits) {
    if (numSuits.includes(s)) numSuitCount++;
    else if (windSuits.includes(s) || s === TileSuit.DRAGON) windCount++;
  }
  const isFullFlushHand = numSuitCount === 1 && windCount === 0;
  const isHalfFlushHand = numSuitCount === 1 && windCount >= 1;
  if (isFullFlushHand && satisfiesFormat) {
    types.push("full_flush" /* FULL_FLUSH */);
    if (types.includes("all_triplets" /* ALL_TRIPLETS */)) types.push("qing_peng" /* QING_PENG */);
  }
  if (isHalfFlushHand && satisfiesFormat) {
    types.push("half_flush" /* HALF_FLUSH */);
    if (types.includes("all_triplets" /* ALL_TRIPLETS */)) types.push("hun_peng" /* HUN_PENG */);
  }
  if (types.includes("all_wind" /* ALL_WIND */) && types.includes("all_triplets" /* ALL_TRIPLETS */)) {
    types.push("feng_peng" /* FENG_PENG */);
  }
  function isGarbageMultiSuitsWithSequence(concealedTiles) {
    const suits2 = getSuits(concealedTiles);
    if (suits2.size < 2) return false;
    const nonFlower = concealedTiles.filter((t) => !isFlower(t));
    const m = (nonFlower.length - 2) / 3;
    if (!Number.isInteger(m) || m < 0) return false;
    if (canFormOnlyTripletsFrom(nonFlower, m, () => false)) return false;
    return true;
  }
  if (types.length === 0 && satisfiesFormat) {
    if (!isGarbageMultiSuitsWithSequence(concealedNonFlower)) {
      types.push("standard" /* STANDARD */);
    }
  }
  return types.sort((a, b) => {
    var _a, _b;
    return ((_a = HAND_TYPE_PRIORITY[b]) != null ? _a : 0) - ((_b = HAND_TYPE_PRIORITY[a]) != null ? _b : 0);
  });
}
function findBestAssignmentByPriority(concealed, exposed, wildTileId) {
  if (!wildTileId || typeof wildTileId !== "string") return detectTypes(concealed, exposed);
  const parts = wildTileId.split("-");
  if (parts.length < 2) return detectTypes(concealed, exposed);
  const [wildSuitRaw, wildVal] = parts;
  const wildSuit = normalizeTileSuit(wildSuitRaw);
  if (!wildSuit) return detectTypes(concealed, exposed);
  const isWild = (t) => t.suit === wildSuit && String(t.value) === wildVal;
  const wildCount = concealed.filter((t) => isWild(t)).length;
  if (wildCount === 0) return detectTypes(concealed, exposed);
  const naturals = concealed.filter((t) => !isWild(t));
  const allCandidates = [];
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numSuits) {
    for (let value = 1; value <= 9; value++) {
      allCandidates.push({ suit, value });
    }
  }
  for (let value = 1; value <= 4; value++) {
    allCandidates.push({ suit: TileSuit.WIND, value });
  }
  for (let value = 1; value <= 3; value++) {
    allCandidates.push({ suit: TileSuit.DRAGON, value });
  }
  if (naturals.length === 0) {
    const virtualHand = [];
    for (let i = 0; i < wildCount; i++) {
      virtualHand.push({ suit: wildSuit, value: parseInt(wildVal, 10), id: `vhp-${i}`, isFlower: false });
    }
    return detectTypes(virtualHand, exposed);
  }
  const compareTypes = (left, right) => {
    var _a, _b;
    const leftScore = left.length > 0 ? (_a = HAND_TYPE_PRIORITY[left[0]]) != null ? _a : 0 : -1;
    const rightScore = right.length > 0 ? (_b = HAND_TYPE_PRIORITY[right[0]]) != null ? _b : 0 : -1;
    return leftScore - rightScore;
  };
  const materializeTypes = (alloc) => {
    const virtualHand = [...naturals];
    for (let i = 0; i < alloc.length; i++) {
      const tile = alloc[i];
      virtualHand.push({ suit: tile.suit, value: tile.value, id: `vhp-${i}`, isFlower: false });
    }
    const result = detectTypes(virtualHand, exposed);
    return result;
  };
  if (wildCount <= 3) {
    let bestExact = [];
    const enumerateExact = (depth, alloc) => {
      if (depth === wildCount) {
        const types = materializeTypes(alloc);
        if (types.length > 0 && compareTypes(types, bestExact) > 0) {
          bestExact = [...types];
        }
        return;
      }
      for (const candidate of allCandidates) {
        alloc.push(candidate);
        enumerateExact(depth + 1, alloc);
        alloc.pop();
      }
    };
    enumerateExact(0, []);
    return bestExact;
  }
  const baselineTypes = detectTypes(concealed, exposed);
  if (baselineTypes.length > 0) return baselineTypes;
  const naturalCountByKey = /* @__PURE__ */ new Map();
  for (const tile of naturals) {
    const key = `${tile.suit}-${tile.value}`;
    naturalCountByKey.set(key, (naturalCountByKey.get(key) || 0) + 1);
  }
  const pushUniqueCandidate = (target, seen, suit, value) => {
    const key = `${suit}-${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    target.push({ suit, value });
  };
  const numericCandidatePool = (() => {
    var _a;
    const candidates = [];
    const seen = /* @__PURE__ */ new Set();
    const suitCounts = /* @__PURE__ */ new Map();
    for (const tile of naturals) {
      if (tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS) {
        suitCounts.set(tile.suit, (suitCounts.get(tile.suit) || 0) + 1);
      }
    }
    const dominantNumericSuit = (_a = Array.from(suitCounts.entries()).sort((a, b) => b[1] - a[1])[0]) == null ? void 0 : _a[0];
    const orderedNaturals = [...naturals].filter((tile) => tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS).sort((a, b) => {
      const aCount = naturalCountByKey.get(`${a.suit}-${a.value}`) || 0;
      const bCount = naturalCountByKey.get(`${b.suit}-${b.value}`) || 0;
      const aBoost = a.suit === dominantNumericSuit ? 100 : 0;
      const bBoost = b.suit === dominantNumericSuit ? 100 : 0;
      return bBoost + bCount - (aBoost + aCount);
    });
    for (const tile of orderedNaturals) {
      pushUniqueCandidate(candidates, seen, tile.suit, tile.value);
    }
    for (const tile of orderedNaturals) {
      for (const delta of [-2, -1, 1, 2]) {
        const nextValue = tile.value + delta;
        if (nextValue >= 1 && nextValue <= 9) {
          pushUniqueCandidate(candidates, seen, tile.suit, nextValue);
        }
      }
    }
    return candidates;
  })();
  const buildHonorPool = (suit, maxValue) => {
    const candidates = [];
    const seen = /* @__PURE__ */ new Set();
    for (let value = 1; value <= maxValue; value++) {
      if ((naturalCountByKey.get(`${suit}-${value}`) || 0) > 0) {
        pushUniqueCandidate(candidates, seen, suit, value);
      }
    }
    for (let value = 1; value <= maxValue; value++) {
      pushUniqueCandidate(candidates, seen, suit, value);
    }
    return candidates;
  };
  const buildPairSeeds = (suit, maxValue) => {
    const seeds = [];
    for (let value = 1; value <= maxValue; value++) {
      const naturalCount = naturalCountByKey.get(`${suit}-${value}`) || 0;
      const need = Math.max(0, 2 - naturalCount);
      if (need <= wildCount) {
        seeds.push(Array.from({ length: need }, () => ({ suit, value })));
      }
    }
    return seeds.sort((a, b) => a.length - b.length);
  };
  const runLimitedSearch = (params) => {
    const { seeds = [[]], candidatePool, accept, stopOnFirst = false, width = 6 } = params;
    let best = [];
    const trimmedPool = candidatePool.slice(0, Math.max(1, width));
    const search = (alloc, remaining) => {
      if (remaining === 0) {
        const types = materializeTypes(alloc);
        if (types.length === 0) return null;
        if (accept && !accept(types)) return null;
        if (stopOnFirst) return types;
        if (compareTypes(types, best) > 0) {
          best = [...types];
        }
        return null;
      }
      for (const candidate of trimmedPool) {
        alloc.push(candidate);
        const hit = search(alloc, remaining - 1);
        alloc.pop();
        if (hit) return hit;
      }
      return null;
    };
    for (const seed of seeds) {
      if (seed.length > wildCount) continue;
      const hit = search([...seed], wildCount - seed.length);
      if (hit) return hit;
      if (!stopOnFirst && best.length > 0) return best;
    }
    return best;
  };
  const noFlowerSelfDrawTypes = runLimitedSearch({
    candidatePool: numericCandidatePool,
    width: 10,
    accept: (types) => types.includes("all_triplets" /* ALL_TRIPLETS */) || types.includes("half_flush" /* HALF_FLUSH */) || types.includes("hun_peng" /* HUN_PENG */) || types.includes("qing_peng" /* QING_PENG */)
  });
  if (noFlowerSelfDrawTypes.length > 0) return noFlowerSelfDrawTypes;
  const dragonTypes = runLimitedSearch({
    seeds: buildPairSeeds(TileSuit.DRAGON, 3),
    candidatePool: [
      ...buildHonorPool(TileSuit.DRAGON, 3),
      ...buildHonorPool(TileSuit.WIND, 4),
      ...numericCandidatePool
    ],
    width: 10
  });
  if (dragonTypes.length > 0) return dragonTypes;
  const windTypes = runLimitedSearch({
    seeds: buildPairSeeds(TileSuit.WIND, 4),
    candidatePool: [
      ...buildHonorPool(TileSuit.WIND, 4),
      ...buildHonorPool(TileSuit.DRAGON, 3),
      ...numericCandidatePool
    ],
    width: 10
  });
  if (windTypes.length > 0) return windTypes;
  return runLimitedSearch({
    candidatePool: numericCandidatePool.length > 0 ? numericCandidatePool : allCandidates,
    width: 12,
    stopOnFirst: true
  });
}
function canWin(handTiles, exposedOrCount, wildTileIdOrChecker, _skipWildAssignment) {
  const isOldSig = typeof exposedOrCount === "number";
  const exposed = isOldSig ? [] : exposedOrCount;
  const wildTileId = isOldSig ? typeof wildTileIdOrChecker === "string" ? wildTileIdOrChecker : null : typeof wildTileIdOrChecker === "string" ? wildTileIdOrChecker : null;
  const handSig = handSignature(handTiles);
  const exposedSig = meldSignature(exposed);
  const wildCacheKey = typeof wildTileIdOrChecker === "function" ? "__wild_fn__" : wildTileId || "";
  const cacheKey = `${handSig}|${exposedSig}|${wildCacheKey}`;
  if (canWinResultCache.has(cacheKey)) {
    const cached = canWinResultCache.get(cacheKey);
    return { canWin: cached.canWin, types: cached.types };
  }
  const concealed = handTiles;
  const concealedFlowers = concealed.filter((t) => isFlower(t));
  const isWildTileFn = typeof wildTileIdOrChecker === "function" ? wildTileIdOrChecker : buildWildTileChecker(wildTileId);
  const concealedNonFlower = concealed.filter((t) => !isFlower(t) || isWildTileFn(t));
  const flowerCount = concealedFlowers.length >= 6 ? concealedFlowers.length + exposed.flatMap((m) => m.tiles).filter((t) => isFlower(t)).length : concealedFlowers.length;
  let isFourWild = false;
  if (wildTileId) {
    const wildCount = concealed.filter((t) => isWildTileFn(t)).length;
    isFourWild = wildCount >= 4 && exposed.length === 0 && isValidHandSize(concealedNonFlower.length);
  }
  if (isFourWild) {
    return { canWin: true, types: ["four_wild" /* FOUR_WILD */] };
  }
  if (wildTileId) {
    if (!isValidHandSize(concealedNonFlower.length)) {
      return { canWin: false, types: [] };
    }
  } else {
    if (flowerCount >= 8) {
      return { canWin: true, types: ["eight_flowers" /* EIGHT_FLOWERS */] };
    }
    if (!isValidHandSize(concealedNonFlower.length)) {
      return { canWin: false, types: [] };
    }
  }
  if (!wildTileId && flowerCount >= 8) {
    return { canWin: true, types: ["eight_flowers" /* EIGHT_FLOWERS */] };
  }
  const exposedNonFlower = exposed.flatMap((m) => m.tiles).filter((t) => !isFlower(t) || isWildTileFn(t));
  const combinedNonFlower = [...concealedNonFlower, ...exposedNonFlower];
  const allWind = combinedNonFlower.length > 0 && combinedNonFlower.every((t) => isWind(t) || isDragon(t) || isWildTileFn(t));
  if (allWind) {
    return { canWin: true, types: ["all_wind" /* ALL_WIND */] };
  }
  if (typeof wildTileIdOrChecker === "function" && !wildTileId) {
    const meldsNeeded = Math.floor((concealedNonFlower.length - 2) / 3);
    const genericCanWin = meldsNeeded >= 0 && isValidHandSize(concealedNonFlower.length) && canFormMelds(concealedNonFlower, meldsNeeded, isWildTileFn);
    const genericResult = {
      canWin: genericCanWin,
      types: genericCanWin ? ["standard" /* STANDARD */] : []
    };
    if (canWinResultCache.size < CAN_WIN_CACHE_MAX) {
      canWinResultCache.set(cacheKey, genericResult);
    }
    return genericResult;
  }
  const types = wildTileId && true ? findBestAssignmentByPriority(concealed, exposed, wildTileId) : detectTypes(concealed, exposed);
  const exactCanWin = wildTileId ? canWinByProjectRuleWithWildExact(concealed, exposed, wildTileId) : canWinByProjectRuleNoWild(concealed, exposed);
  const finalCanWin = types.length > 0 || exactCanWin;
  const validTypes = finalCanWin ? types.length > 0 ? types : ["standard" /* STANDARD */] : [];
  const result = { canWin: finalCanWin, types: validTypes };
  if (canWinResultCache.size < CAN_WIN_CACHE_MAX) {
    canWinResultCache.set(cacheKey, { canWin: result.canWin, types: result.types });
  }
  return result;
}
function detectHandTypes(handTiles, exposedOrCount, wildTileIdOrChecker, _isSelfDrawn, _flowerCount, _ruleConfigOrNull, gameStateOrWildGroup) {
  let resolvedWild = wildTileIdOrChecker;
  if (!resolvedWild) {
    const src = _ruleConfigOrNull;
    if (src && typeof src === "object") {
      if (typeof src.customScoringMode === "string" && src.customScoringMode.includes("-")) {
        const [suit, ...rest] = src.customScoringMode.split("-");
        resolvedWild = normalizeSuitAlias(suit) + "-" + rest.join("-");
      } else if (typeof src.wildTileId === "string") {
        const parts = src.wildTileId.split("-");
        resolvedWild = parts.length >= 2 ? normalizeSuitAlias(parts[0]) + "-" + parts.slice(1).join("-") : src.wildTileId;
      } else if (typeof src.wildTileSuit === "string" && typeof src.wildTileValue === "number") {
        resolvedWild = `${src.wildTileSuit}-${src.wildTileValue}`;
      }
    }
  }
  return canWin(handTiles, exposedOrCount, resolvedWild).types;
}
const canWinResultCache = /* @__PURE__ */ new Map();
const CAN_WIN_CACHE_MAX = 1e5;
const isTingCache = /* @__PURE__ */ new Map();
const IS_TING_CACHE_MAX = 5e4;
function handSignature(tiles) {
  const len = tiles.length;
  const parts = new Array(len);
  for (let i = 0; i < len; i++) {
    const t = tiles[i];
    parts[i] = t.suit[0] + t.value;
  }
  parts.sort();
  return parts.join(",");
}
function isTing(tiles, existingMelds, wildTileIdOrChecker = () => false, wildTileGroup) {
  const isWildTile = typeof wildTileIdOrChecker === "function" ? wildTileIdOrChecker : buildWildTileChecker(wildTileIdOrChecker, wildTileGroup);
  const wildKey = typeof wildTileIdOrChecker === "function" ? `fn:${(wildTileGroup == null ? void 0 : wildTileGroup.join(",")) || ""}` : `${wildTileIdOrChecker || ""}|${(wildTileGroup == null ? void 0 : wildTileGroup.join(",")) || ""}`;
  const nonFlower = tiles.filter((t) => !isFlower(t) || isWildTile(t));
  const expected = 13 - 3 * existingMelds;
  if (!isValidTingHandSize(nonFlower.length) || nonFlower.length !== expected) {
    return false;
  }
  const sig = handSignature(tiles);
  const key = `${sig}|${existingMelds}|${wildKey}`;
  if (isTingCache.has(key)) {
    return isTingCache.get(key);
  }
  const candidates = buildTingCandidateTiles(wildTileIdOrChecker, wildTileGroup);
  for (const t of candidates) {
    if (canWin([...tiles, t], existingMelds, isWildTile).canWin) {
      isTingCache.set(key, true);
      return true;
    }
  }
  isTingCache.set(key, false);
  if (isTingCache.size > IS_TING_CACHE_MAX) {
    const keys = Array.from(isTingCache.keys());
    for (let i = 0; i < keys.length / 2; i++) {
      isTingCache.delete(keys[i]);
    }
  }
  return false;
}
function checkChowPongExclusion(state, actionType, tileSuit) {
  if (!state.firstActionSuit || !state.firstActionType) return true;
  if (tileSuit === "feng" || tileSuit === "jian") return true;
  const isSameSuit = tileSuit === state.firstActionSuit;
  switch (state.firstActionType) {
    case "chow":
      return isSameSuit;
    case "pong":
      if (actionType === "chow") return isSameSuit;
      return true;
    // 碰任何门均允许
    default:
      return true;
  }
}
function updateChowPongExclusion(state, actionType, tileSuit) {
  if (!state.firstActionSuit) {
    return { firstActionSuit: tileSuit, firstActionType: actionType };
  }
  return state;
}
function buildTingCandidateTiles(wildTileIdOrChecker = null, wildTileGroup) {
  const candidates = [];
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let value = 1; value <= 9; value++) {
      candidates.push({ suit, value, id: `t-${suit}-${value}`, isFlower: false });
    }
  }
  for (let value = 1; value <= 4; value++) {
    candidates.push({ suit: TileSuit.WIND, value, id: `t-${TileSuit.WIND}-${value}`, isFlower: false });
  }
  for (let value = 1; value <= 3; value++) {
    candidates.push({ suit: TileSuit.DRAGON, value, id: `t-${TileSuit.DRAGON}-${value}`, isFlower: false });
  }
  const includeFlowerWilds = Array.isArray(wildTileGroup) && wildTileGroup.length > 0 && (typeof wildTileIdOrChecker === "function" || !wildTileIdOrChecker || wildTileIdOrChecker.startsWith(`${TileSuit.FLOWER}-`));
  if (includeFlowerWilds) {
    for (const valueText of wildTileGroup) {
      const value = parseInt(valueText, 10);
      if (!Number.isNaN(value) && value >= 1 && value <= 8) {
        candidates.push({ suit: TileSuit.FLOWER, value, id: `t-${TileSuit.FLOWER}-${value}`, isFlower: true });
      }
    }
  }
  return candidates;
}

const FIXED_FAN = {
  "\u98CE\u78B0": 40,
  // 风一色 + 碰碰胡
  "\u98CE\u4E00\u8272": 20,
  // 全部风牌
  "\u6E05\u78B0": 20,
  // 清一色 + 碰碰胡
  "\u6DF7\u78B0": 10,
  // 混一色 + 碰碰胡
  "\u5927\u540A\u78B0\u78B0\u80E1": 10,
  // 碰碰胡 + 大吊
  "\u5927\u540A\u6DF7\u4E00\u8272": 10,
  // 混一色 + 大吊
  "\u5927\u540A\u6E05\u4E00\u8272": 10,
  // 清一色 + 大吊
  "\u5927\u540A\u6E05\u78B0": 20,
  // 清碰 + 大吊
  "\u5927\u540A\u98CE\u4E00\u8272": 20,
  // 风一色 + 大吊
  "\u5927\u540A\u98CE\u78B0": 40,
  // 风碰 + 大吊
  "\u5927\u540A": 10,
  // 独立大吊（无其他特殊牌型时）固定10点
  "\u6E05\u4E00\u8272": 10,
  // 全部一门花色
  "\u65E0\u82B1\u81EA\u6478": 10,
  // 碰碰胡/混一色，门口无花，自摸
  "\u6760\u5F00": 10,
  // 杠牌/杠花后补牌自摸
  "\u516B\u82B1\u81EA\u6478": 20,
  // 手牌+副露共8花，自摸
  "\u56DB\u767E\u642D": 10
  // 手牌有4张百搭
};
const MAX_FORMULA_FAN = 10;
function calculateScore(params) {
  const {
    handTiles,
    exposedMelds,
    flowerTiles,
    handTypes,
    isSelfDrawn,
    isKongFlower,
    isRobbingKong,
    isMenQing,
    isDaDiao = false,
    wildTileSuit,
    wildTileValue,
    wildTileGroup,
    rawRoundMultiplier,
    rawInheritMultiplier,
    globalIncludesRound = true,
    settlementMultiplier = 1
  } = params;
  const details = [];
  let handTypeName = "\u666E\u901A\u80E1";
  let baseFan = 0;
  let extraMultipliers = 1;
  if (handTypes.length === 0) {
    return {
      baseFan: 0,
      finalPoints: 0,
      handTypeName: "\u65E0\u6548\u724C\u578B",
      details: ["\u65E0\u6709\u6548\u724C\u578B"],
      roundMultiplier: 0,
      inheritMultiplier: 0,
      globalMultiplier: 0,
      settlementMultiplier,
      extraMultipliers: 0
    };
  }
  if (handTypes.length > 0) {
    const topType = handTypes[0];
    handTypeName = getHandTypeDisplayName(topType);
    const fixedName = getFixedFanName(topType, isSelfDrawn, isKongFlower, handTypes, isDaDiao);
    if (fixedName && FIXED_FAN[fixedName]) {
      baseFan = FIXED_FAN[fixedName];
      details.push(`${fixedName} = ${baseFan}\u756A`);
    }
  }
  if (baseFan === 0) {
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles, wildTileSuit, wildTileValue);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }
  if (baseFan < 10 && isSelfDrawn) {
    const isWildFlower = wildTileGroup && wildTileGroup.length > 0;
    if (!isWildFlower) {
      const hasNoFlowers = flowerTiles.length === 0 && exposedMelds.every((m) => m.tiles.every((t) => !isFlower(t)));
      const hasNoBlocks = !hasWindMelds(exposedMelds, handTiles) && hasNoArrowMelds(exposedMelds) && hasNoMingKong(exposedMelds) && hasNoAnKong(exposedMelds);
      if (hasNoFlowers && hasNoBlocks) {
        const isPengOrHun = handTypes.includes(HandType.ALL_TRIPLETS) || handTypes.includes(HandType.HALF_FLUSH);
        if (isPengOrHun) {
          baseFan = Math.max(baseFan, 10);
          details.push("\u65E0\u82B1\u81EA\u6478 = 10\u756A");
        }
      }
    }
  }
  if (isSelfDrawn && isKongFlower) {
    baseFan = Math.max(baseFan, 10);
    details.push("\u6760\u5F00 = 10\u756A");
  }
  if (wildTileSuit !== void 0 && wildTileValue !== void 0) {
    const wildCount = countWildTiles(handTiles, wildTileSuit, wildTileValue, wildTileGroup);
    if (wildCount >= 4) {
      baseFan = Math.max(baseFan, 10);
      details.push("\u56DB\u767E\u642D = 10\u756A");
    }
  }
  if (baseFan === 0) {
    const formulaResult = calculateFormulaFan(handTiles, exposedMelds, flowerTiles, wildTileSuit, wildTileValue);
    baseFan = formulaResult.fan;
    details.push(...formulaResult.details);
  }
  if (wildTileSuit !== void 0 && wildTileValue !== void 0) {
    const wildCount = countWildTiles(handTiles, wildTileSuit, wildTileValue, wildTileGroup);
    const isWindOrDragonWild = wildTileSuit === TileSuit.WIND || wildTileSuit === TileSuit.DRAGON;
    const isWindHand = handTypes.includes(HandType.ALL_WIND) || handTypes.includes(HandType.FENG_PENG);
    if (wildCount === 0) {
      extraMultipliers *= 2;
      details.push("\u65E0\u767E\u642D \xD72");
    } else {
      const noWildCheck = canWin(handTiles, exposedMelds.length, () => false);
      if (noWildCheck.canWin) {
        extraMultipliers *= 2;
        details.push("\u65E0\u767E\u642D(\u767E\u642D\u5F52\u4F4D) \xD72");
      } else if (isWindOrDragonWild && isWindHand) {
        if (handTypes.includes(HandType.FENG_PENG)) {
          if (checkAllTripletsWithoutWild(handTiles, exposedMelds, wildTileSuit, wildTileValue)) {
            extraMultipliers *= 2;
            details.push("\u65E0\u767E\u642D(\u98CE\u78B0,\u767E\u642D\u5F52\u4F4D) \xD72");
          }
        } else {
          extraMultipliers *= 2;
          details.push("\u65E0\u767E\u642D(\u98CE\u4E00\u8272,\u767E\u642D\u5F52\u4F4D) \xD72");
        }
      }
    }
  }
  if (isMenQing) {
    extraMultipliers *= 2;
    details.push("\u95E8\u6E05 \xD72");
  }
  const roundMultiplier = Math.max(1, rawRoundMultiplier != null ? rawRoundMultiplier : 1);
  const baseGlobal = Math.max(1, rawInheritMultiplier != null ? rawInheritMultiplier : 1);
  const globalMultiplier = globalIncludesRound ? Math.max(1, Math.min(baseGlobal * roundMultiplier, 8)) : Math.max(1, Math.min(baseGlobal, 8));
  const finalPoints = (globalIncludesRound ? baseFan * extraMultipliers * globalMultiplier : baseFan * extraMultipliers * roundMultiplier * globalMultiplier) * settlementMultiplier;
  const sm = settlementMultiplier > 1 ? ` \xD7 ${settlementMultiplier}` : "";
  if (globalIncludesRound) {
    details.push(`\u6709\u6548\u500D\u7387 = min(8, \u9AB0\u5B50\u500D\u6570${roundMultiplier} \xD7 \u7EE7\u627F\u500D\u6570${baseGlobal}) = ${globalMultiplier}`);
    details.push(`\u6700\u7EC8 = ${baseFan} \xD7 ${extraMultipliers} \xD7 ${globalMultiplier}${sm} = ${finalPoints}`);
  } else {
    details.push(`\u6700\u7EC8 = ${baseFan} \xD7 ${extraMultipliers} \xD7 ${roundMultiplier} \xD7 ${globalMultiplier}${sm} = ${finalPoints}`);
  }
  return {
    baseFan,
    extraMultipliers,
    roundMultiplier,
    inheritMultiplier: baseGlobal,
    globalMultiplier,
    settlementMultiplier,
    finalPoints,
    handTypeName,
    details
  };
}
function generateWinOptions(params) {
  const options = [];
  const baseParams = { ...params };
  const allDecompositions = enumerateHandDecompositions(
    params.handTiles,
    params.exposedMelds,
    params.wildTileSuit,
    params.wildTileValue
  );
  for (const decomp of allDecompositions) {
    const selfDrawResult = calculateScore({
      ...baseParams,
      handTypes: decomp.types,
      isSelfDrawn: true,
      globalIncludesRound: true
    });
    if (selfDrawResult.finalPoints > 0) {
      const label = `${selfDrawResult.handTypeName}\xB7\u81EA\u6478`;
      const decompKey = `self_draw|${label}|${(decomp.types || []).sort().join(",")}`;
      const existing = options.find((o) => o.label === label);
      if (!existing) {
        options.push({
          label,
          score: selfDrawResult.finalPoints,
          details: [...selfDrawResult.details],
          type: "self_draw",
          handTypeName: selfDrawResult.handTypeName,
          handTypes: [...decomp.types],
          summary: {
            baseFan: selfDrawResult.baseFan,
            extraMultipliers: selfDrawResult.extraMultipliers,
            roundMultiplier: selfDrawResult.roundMultiplier,
            globalMultiplier: selfDrawResult.globalMultiplier,
            settlementMultiplier: selfDrawResult.settlementMultiplier,
            finalPoints: selfDrawResult.finalPoints
          },
          _decompKey: decompKey
        });
      } else if (selfDrawResult.finalPoints > existing.score) {
        existing.score = selfDrawResult.finalPoints;
        existing.details = [...selfDrawResult.details];
        existing.handTypeName = selfDrawResult.handTypeName;
        existing.handTypes = [...decomp.types];
        existing.summary = {
          baseFan: selfDrawResult.baseFan,
          extraMultipliers: selfDrawResult.extraMultipliers,
          roundMultiplier: selfDrawResult.roundMultiplier,
          globalMultiplier: selfDrawResult.globalMultiplier,
          settlementMultiplier: selfDrawResult.settlementMultiplier,
          finalPoints: selfDrawResult.finalPoints
        };
        existing._decompKey = decompKey;
      }
    }
    const discardResult = calculateScore({
      ...baseParams,
      handTypes: decomp.types,
      isSelfDrawn: false,
      globalIncludesRound: true
    });
    if (discardResult.finalPoints > 0) {
      const label = `${discardResult.handTypeName}\xB7\u6349\u51B2`;
      const decompKey = `discard|${label}|${(decomp.types || []).sort().join(",")}`;
      const existing = options.find((o) => o.label === label);
      if (!existing) {
        options.push({
          label,
          score: discardResult.finalPoints,
          details: [...discardResult.details],
          type: "discard",
          handTypeName: discardResult.handTypeName,
          handTypes: [...decomp.types],
          summary: {
            baseFan: discardResult.baseFan,
            extraMultipliers: discardResult.extraMultipliers,
            roundMultiplier: discardResult.roundMultiplier,
            globalMultiplier: discardResult.globalMultiplier,
            settlementMultiplier: discardResult.settlementMultiplier,
            finalPoints: discardResult.finalPoints
          },
          _decompKey: decompKey
        });
      } else if (discardResult.finalPoints > existing.score) {
        existing.score = discardResult.finalPoints;
        existing.details = [...discardResult.details];
        existing.handTypeName = discardResult.handTypeName;
        existing.handTypes = [...decomp.types];
        existing.summary = {
          baseFan: discardResult.baseFan,
          extraMultipliers: discardResult.extraMultipliers,
          roundMultiplier: discardResult.roundMultiplier,
          globalMultiplier: discardResult.globalMultiplier,
          settlementMultiplier: discardResult.settlementMultiplier,
          finalPoints: discardResult.finalPoints
        };
        existing._decompKey = decompKey;
      }
    }
  }
  if (params.wildTileSuit !== void 0 && params.wildTileValue !== void 0 && params.wildTileSuit !== TileSuit.FLOWER) {
    const wildCount = countWildTiles(params.handTiles, params.wildTileSuit, params.wildTileValue, params.wildTileGroup);
    if (wildCount > 0) {
      const noWildCheck = canWin(params.handTiles, params.exposedMelds.length, () => false);
      if (noWildCheck.canWin) {
        const noWildTypes = noWildCheck.types;
        const noWildResult = calculateScore({
          ...baseParams,
          handTypes: noWildTypes,
          wildTileSuit: void 0,
          wildTileValue: void 0,
          isSelfDrawn: true,
          globalIncludesRound: true
        });
        const doubledPoints = noWildResult.finalPoints * 2;
        const noWildLabel = `${noWildResult.handTypeName}\xB7\u81EA\u6478(\u65E0\u767E\u642D\xD72)`;
        const existingNoWild = options.find((o) => o.label === noWildLabel);
        if (!existingNoWild) {
          options.push({
            label: noWildLabel,
            score: doubledPoints,
            details: [...noWildResult.details, `\u65E0\u767E\u642D\u7FFB\u500D \xD72 = ${doubledPoints}\u70B9`],
            type: "self_draw",
            handTypeName: noWildResult.handTypeName,
            handTypes: [...noWildTypes],
            summary: {
              baseFan: noWildResult.baseFan,
              extraMultipliers: noWildResult.extraMultipliers * 2,
              roundMultiplier: noWildResult.roundMultiplier,
              globalMultiplier: noWildResult.globalMultiplier,
              settlementMultiplier: noWildResult.settlementMultiplier,
              finalPoints: doubledPoints
            }
          });
        } else if (doubledPoints > existingNoWild.score) {
          existingNoWild.score = doubledPoints;
          existingNoWild.handTypeName = noWildResult.handTypeName;
          existingNoWild.handTypes = [...noWildTypes];
          existingNoWild.details = [...noWildResult.details, `\u65E0\u767E\u642D\u7FFB\u500D \xD72 = ${doubledPoints}\u70B9`];
          existingNoWild.summary = {
            baseFan: noWildResult.baseFan,
            extraMultipliers: noWildResult.extraMultipliers * 2,
            roundMultiplier: noWildResult.roundMultiplier,
            globalMultiplier: noWildResult.globalMultiplier,
            settlementMultiplier: noWildResult.settlementMultiplier,
            finalPoints: doubledPoints
          };
        }
        const noWildDiscard = calculateScore({
          ...baseParams,
          handTypes: noWildTypes,
          wildTileSuit: void 0,
          wildTileValue: void 0,
          isSelfDrawn: false,
          globalIncludesRound: true
        });
        const doubledDiscard = noWildDiscard.finalPoints * 2;
        const noWildDiscardLabel = `${noWildDiscard.handTypeName}\xB7\u6349\u51B2(\u65E0\u767E\u642D\xD72)`;
        const existingNoWildDiscard = options.find((o) => o.label === noWildDiscardLabel);
        if (!existingNoWildDiscard) {
          options.push({
            label: noWildDiscardLabel,
            score: doubledDiscard,
            details: [...noWildDiscard.details, `\u65E0\u767E\u642D\u7FFB\u500D \xD72 = ${doubledDiscard}\u70B9`],
            type: "discard",
            handTypeName: noWildDiscard.handTypeName,
            handTypes: [...noWildTypes],
            summary: {
              baseFan: noWildDiscard.baseFan,
              extraMultipliers: noWildDiscard.extraMultipliers * 2,
              roundMultiplier: noWildDiscard.roundMultiplier,
              globalMultiplier: noWildDiscard.globalMultiplier,
              settlementMultiplier: noWildDiscard.settlementMultiplier,
              finalPoints: doubledDiscard
            }
          });
        } else if (doubledDiscard > existingNoWildDiscard.score) {
          existingNoWildDiscard.score = doubledDiscard;
          existingNoWildDiscard.handTypeName = noWildDiscard.handTypeName;
          existingNoWildDiscard.handTypes = [...noWildTypes];
          existingNoWildDiscard.details = [...noWildDiscard.details, `\u65E0\u767E\u642D\u7FFB\u500D \xD72 = ${doubledDiscard}\u70B9`];
          existingNoWildDiscard.summary = {
            baseFan: noWildDiscard.baseFan,
            extraMultipliers: noWildDiscard.extraMultipliers * 2,
            roundMultiplier: noWildDiscard.roundMultiplier,
            globalMultiplier: noWildDiscard.globalMultiplier,
            settlementMultiplier: noWildDiscard.settlementMultiplier,
            finalPoints: doubledDiscard
          };
        }
      }
    }
  }
  const labelBest = /* @__PURE__ */ new Map();
  for (const opt of options) {
    const key = `${opt.label}|${(opt.handTypes || []).slice().sort().join(",")}`;
    const existing = labelBest.get(key);
    if (!existing || opt.score > existing.score) {
      labelBest.set(key, opt);
    }
  }
  let uniqueOptions = Array.from(labelBest.values()).sort((a, b) => b.score - a.score);
  const hasFixedPointOption = uniqueOptions.some(
    (opt) => {
      var _a;
      return (_a = opt.handTypes) == null ? void 0 : _a.some((type) => {
        const name = getFixedFanName(type, opt.type === "self_draw", false, opt.handTypes);
        return !!name && !!FIXED_FAN[name];
      });
    }
  );
  if (hasFixedPointOption) {
    const fixedOptions = uniqueOptions.filter(
      (opt) => {
        var _a;
        return (_a = opt.handTypes) == null ? void 0 : _a.some((type) => {
          const name = getFixedFanName(type, opt.type === "self_draw", false, opt.handTypes);
          return !!name && !!FIXED_FAN[name];
        });
      }
    );
    const maxFixedScore = Math.max(...fixedOptions.map((o) => o.score), 0);
    uniqueOptions = uniqueOptions.filter((opt) => {
      var _a;
      const hasFixed = (_a = opt.handTypes) == null ? void 0 : _a.some((type) => {
        const name = getFixedFanName(type, opt.type === "self_draw", false, opt.handTypes);
        return !!name && !!FIXED_FAN[name];
      });
      if (hasFixed) {
        for (const other of fixedOptions) {
          if (other === opt) continue;
          if (other.score <= opt.score) continue;
          if (!opt.handTypes || !other.handTypes) continue;
          if (opt.handTypes.length < other.handTypes.length && opt.handTypes.every((t) => other.handTypes.includes(t))) {
            return false;
          }
        }
        return true;
      }
      return opt.score >= maxFixedScore;
    });
  }
  return uniqueOptions;
}
function enumerateHandDecompositions(handTiles, exposedMelds, wildTileSuit, wildTileValue) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const wildTileId = wildTileSuit !== void 0 && wildTileValue !== void 0 ? `${wildTileSuit}-${wildTileValue}` : null;
  const result = canWin(handTiles, exposedMelds, wildTileId);
  if (result.canWin && result.types.length > 0) {
    const candidates = [];
    candidates.push([...result.types]);
    for (const type of result.types) {
      if (type === HandType.STANDARD && result.types.length > 1) continue;
      if (type === HandType.DA_DIAO) continue;
      candidates.push([type]);
      if (result.types.includes(HandType.DA_DIAO)) {
        candidates.push([HandType.DA_DIAO, type]);
      }
    }
    if (result.types.includes(HandType.DA_DIAO)) {
      candidates.push([HandType.DA_DIAO]);
    }
    for (const candidate of candidates) {
      const normalized = [...candidate].sort((a, b) => {
        var _a, _b;
        return ((_a = HAND_TYPE_PRIORITY[b]) != null ? _a : 0) - ((_b = HAND_TYPE_PRIORITY[a]) != null ? _b : 0);
      });
      const key = normalized.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ types: normalized });
    }
  }
  return results;
}
function calculateFormulaFan(handTiles, exposedMelds, flowerTiles, wildTileSuit, wildTileValue, wildTileGroup) {
  const details = [];
  let comboPoints = 0;
  const flowerCount = flowerTiles.length;
  [...handTiles];
  if (wildTileSuit !== void 0 && wildTileValue !== void 0) {
    const wildTiles = handTiles.filter((t) => t.suit === wildTileSuit && t.value === wildTileValue);
    if (wildTiles.length > 0) {
      const nonWildTiles = handTiles.filter((t) => !(t.suit === wildTileSuit && t.value === wildTileValue));
      let remainingWilds = wildTiles.length;
      const virtualParts = [...nonWildTiles];
      const seenDragons = /* @__PURE__ */ new Set();
      for (const dragon of nonWildTiles) {
        if (!isDragon(dragon)) continue;
        const dk = `${dragon.suit}-${dragon.value}`;
        if (seenDragons.has(dk)) continue;
        seenDragons.add(dk);
        const dragonCount = nonWildTiles.filter((t) => t.suit === dragon.suit && t.value === dragon.value).length;
        if (remainingWilds >= 3) {
          for (let i = 0; i < 3; i++) {
            virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
          }
          remainingWilds -= 3;
          details.push(`\u767E\u642D\xD73\u2192${getTileDisplayName(dragon)}(\u7BAD\u724C\u523B\u5B50) +2`);
        } else if (dragonCount >= 2 && remainingWilds >= 1) {
          virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds].id, isWild: false });
          remainingWilds -= 1;
          details.push(`\u767E\u642D\u2192${getTileDisplayName(dragon)}(\u7BAD\u724C\u523B\u5B50) +2`);
        } else if (dragonCount >= 1 && remainingWilds >= 2) {
          for (let i = 0; i < 2; i++) {
            virtualParts.push({ ...dragon, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
          }
          remainingWilds -= 2;
          details.push(`\u767E\u642D\xD72\u2192${getTileDisplayName(dragon)}(\u7BAD\u724C\u523B\u5B50) +2`);
        }
        if (remainingWilds <= 0) break;
      }
      if (remainingWilds > 0) {
        const seenWinds = /* @__PURE__ */ new Set();
        for (const wind of nonWildTiles) {
          if (!isWind(wind)) continue;
          const wk = `${wind.suit}-${wind.value}`;
          if (seenWinds.has(wk)) continue;
          seenWinds.add(wk);
          const windCount = nonWildTiles.filter((t) => t.suit === wind.suit && t.value === wind.value).length;
          if (remainingWilds >= 3) {
            for (let i = 0; i < 3; i++) {
              virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
            }
            remainingWilds -= 3;
            details.push(`\u767E\u642D\xD73\u2192${getTileDisplayName(wind)}(\u98CE\u724C\u523B\u5B50) +1`);
          } else if (windCount >= 2 && remainingWilds >= 1) {
            virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds].id, isWild: false });
            remainingWilds -= 1;
            details.push(`\u767E\u642D\u2192${getTileDisplayName(wind)}(\u98CE\u724C\u523B\u5B50) +1`);
          } else if (windCount >= 1 && remainingWilds >= 2) {
            for (let i = 0; i < 2; i++) {
              virtualParts.push({ ...wind, id: wildTiles[wildTiles.length - remainingWilds + i].id, isWild: false });
            }
            remainingWilds -= 2;
            details.push(`\u767E\u642D\xD72\u2192${getTileDisplayName(wind)}(\u98CE\u724C\u523B\u5B50) +1`);
          }
          if (remainingWilds <= 0) break;
        }
      }
    }
  }
  const allMelds = [...exposedMelds];
  const actualConcealedGroups = groupTiles(handTiles);
  for (const [, group] of actualConcealedGroups) {
    if (group.length === 4) {
      const alreadyExposed = exposedMelds.some(
        (m) => (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) && tilesEqual(m.tiles[0], group[0])
      );
      if (alreadyExposed) continue;
      allMelds.push({
        type: MeldType.CONCEALED_KONG,
        tiles: group,
        isConcealed: true
      });
    }
  }
  for (const meld of allMelds) {
    const isKong = meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG;
    const isConcealed = meld.type === MeldType.CONCEALED_KONG;
    const firstTile = meld.tiles[0];
    if (isWind(firstTile)) {
      if (isKong) {
        let points = 2;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`\u98CE\u724C\u6760${isConcealed ? "(\u6697)" : ""} = ${points}\u70B9`);
      } else if (meld.type === MeldType.TRIPLET) {
        comboPoints += 1;
        details.push("\u98CE\u724C\u523B\u5B50 = 1\u70B9");
      }
    } else if (isDragon(firstTile)) {
      if (isKong) {
        let points = 3;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`\u7BAD\u724C\u6760${isConcealed ? "(\u6697)" : ""} = ${points}\u70B9`);
      } else if (meld.type === MeldType.TRIPLET) {
        comboPoints += 2;
        details.push("\u7BAD\u724C\u523B\u5B50 = 2\u70B9");
      }
    } else {
      if (isKong) {
        let points = 1;
        if (isConcealed) points += 1;
        comboPoints += points;
        details.push(`\u5176\u4ED6\u724C\u6760${isConcealed ? "(\u6697)" : ""} = ${points}\u70B9`);
      }
    }
  }
  let fan = 2 + flowerCount + comboPoints;
  fan = Math.min(fan, MAX_FORMULA_FAN);
  details.unshift(`\u516C\u5F0F: 2 + ${flowerCount}\u82B1 + ${comboPoints}\u7EC4\u5408 = ${fan}\u756A`);
  return { fan, details };
}
function getHandTypeDisplayName(type) {
  const names = {
    [HandType.STANDARD]: "",
    [HandType.FENG_PENG]: "\u98CE\u78B0",
    [HandType.ALL_WIND]: "\u98CE\u4E00\u8272",
    [HandType.QING_PENG]: "\u6E05\u78B0",
    [HandType.HUN_PENG]: "\u6DF7\u78B0",
    [HandType.EIGHT_FLOWERS]: "\u516B\u82B1\u81EA\u6478",
    [HandType.FULL_FLUSH]: "\u6E05\u4E00\u8272",
    [HandType.FOUR_WILD]: "\u56DB\u767E\u642D",
    [HandType.DA_DIAO]: "\u5927\u540A",
    [HandType.HALF_FLUSH]: "\u6DF7\u4E00\u8272",
    [HandType.ALL_TRIPLETS]: "\u78B0\u78B0\u80E1"
  };
  if (!(type in names)) return `\u672A\u77E5\u724C\u578B[${type}]`;
  return names[type];
}
function getFixedFanName(type, isSelfDrawn, isKongFlower, handTypes, isDaDiao) {
  if (isDaDiao) {
    if (handTypes) {
      if (handTypes.includes(HandType.FENG_PENG)) return "\u5927\u540A\u98CE\u78B0";
      if (handTypes.includes(HandType.ALL_WIND)) return "\u5927\u540A\u98CE\u4E00\u8272";
      if (handTypes.includes(HandType.QING_PENG)) return "\u5927\u540A\u6E05\u78B0";
      if (handTypes.includes(HandType.ALL_TRIPLETS)) return "\u5927\u540A\u78B0\u78B0\u80E1";
      if (handTypes.includes(HandType.HALF_FLUSH)) return "\u5927\u540A\u6DF7\u4E00\u8272";
      if (handTypes.includes(HandType.FULL_FLUSH)) return "\u5927\u540A\u6E05\u4E00\u8272";
    }
    return "\u5927\u540A";
  }
  switch (type) {
    case HandType.FENG_PENG:
      return "\u98CE\u78B0";
    case HandType.ALL_WIND:
      return "\u98CE\u4E00\u8272";
    case HandType.QING_PENG:
      return "\u6E05\u78B0";
    case HandType.HUN_PENG:
      return "\u6DF7\u78B0";
    case HandType.FULL_FLUSH:
      return "\u6E05\u4E00\u8272";
    case HandType.EIGHT_FLOWERS:
      return isSelfDrawn ? "\u516B\u82B1\u81EA\u6478" : null;
    case HandType.FOUR_WILD:
      return "\u56DB\u767E\u642D";
    case HandType.DA_DIAO:
      return "\u5927\u540A";
    default:
      return null;
  }
}
function hasWindMelds(exposedMelds, handTiles) {
  for (const meld of exposedMelds) {
    if (meld.tiles.length === 0) continue;
    const lead = meld.tiles[0];
    if (isWind(lead)) return true;
    if (isDragon(lead)) return true;
    if (meld.type === MeldType.KONG || meld.type === MeldType.CONCEALED_KONG) return true;
  }
  const groups = groupTiles(handTiles);
  for (const [key, group] of groups) {
    if (group.length >= 3 && isWind(group[0])) {
      return true;
    }
  }
  return false;
}
function hasNoMingKong(exposedMelds) {
  return !exposedMelds.some((m) => m.type === MeldType.KONG && !m.isConcealed);
}
function hasNoAnKong(exposedMelds) {
  return !exposedMelds.some((m) => m.type === MeldType.CONCEALED_KONG);
}
function hasNoArrowMelds(exposedMelds) {
  return !exposedMelds.some((m) => {
    if (m.tiles.length === 0) return false;
    return isDragon(m.tiles[0]);
  });
}
function countWildTiles(tiles, wildSuit, wildValue, wildGroup) {
  return tiles.filter((t) => {
    if (t.suit === wildSuit && t.value === wildValue) return true;
    if (wildSuit === TileSuit.FLOWER && t.suit === TileSuit.FLOWER && wildGroup) {
      return wildGroup.includes(String(t.value));
    }
    return false;
  }).length;
}
function checkAllTripletsWithoutWild(handTiles, exposedMelds, wildSuit, wildValue) {
  for (const meld of exposedMelds) {
    if (meld.type === MeldType.SEQUENCE) return false;
  }
  const expectedTriplets = 4 - exposedMelds.length;
  const counts = /* @__PURE__ */ new Map();
  let wildCount = 0;
  for (const t of handTiles) {
    const isWild = t.suit === wildSuit && t.value === wildValue;
    if (isWild) {
      wildCount++;
      continue;
    }
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const values = Array.from(counts.values());
  const tryWithPair = (pairKey, pairNeedWild) => {
    if (pairNeedWild > wildCount) return false;
    let remainingWild = wildCount - pairNeedWild;
    let triplets = 0;
    for (let i = 0; i < values.length; i++) {
      let c = values[i];
      if (pairKey && Array.from(counts.keys())[i] === pairKey) {
        c -= 2;
      }
      if (c < 0) return false;
      const need = (3 - c % 3) % 3;
      remainingWild -= need;
      if (remainingWild < 0) return false;
      triplets += Math.floor((c + need) / 3);
    }
    triplets += Math.floor(remainingWild / 3);
    return triplets === expectedTriplets;
  };
  for (const [k, c] of counts) {
    if (c >= 2 && tryWithPair(k, 0)) return true;
  }
  for (const [k, c] of counts) {
    if (c >= 1 && tryWithPair(k, 1)) return true;
  }
  if (tryWithPair(null, 2)) return true;
  return false;
}
function calculateSettlementBreakdownByRules(winnerFinalPoints, isSelfDrawn, winnerIndex, allPlayerIndices, mutualBailout, discarderId) {
  var _a, _b;
  const deltas = /* @__PURE__ */ new Map();
  const transfers = [];
  for (const idx of allPlayerIndices) {
    deltas.set(idx, 0);
  }
  const addDelta = (idx, delta) => {
    deltas.set(idx, (deltas.get(idx) || 0) + delta);
  };
  const addTransfer = (fromIndex, toIndex, amount, reason, bailoutType) => {
    if (amount <= 0) return;
    transfers.push({ fromIndex, toIndex, amount, reason, bailoutType });
    addDelta(fromIndex, -amount);
    addDelta(toIndex, amount);
  };
  if (isSelfDrawn) {
    const bailoutLoser = allPlayerIndices.find((idx) => {
      if (idx === winnerIndex) return false;
      const bailout = mutualBailout == null ? void 0 : mutualBailout.get(idx);
      return (bailout == null ? void 0 : bailout.partnerIndex) === winnerIndex;
    });
    if (bailoutLoser !== void 0) {
      const bailout = mutualBailout.get(bailoutLoser);
      const bailoutMultiplier = bailout.type === "\u56DB\u53E3" ? 5 : 3;
      const otherMultiplier = bailout.type === "\u56DB\u53E3" ? 0 : 1;
      for (const idx of allPlayerIndices) {
        if (idx === winnerIndex) continue;
        const pay = idx === bailoutLoser ? winnerFinalPoints * bailoutMultiplier : winnerFinalPoints * otherMultiplier;
        if (pay === 0) continue;
        addTransfer(
          idx,
          winnerIndex,
          pay,
          idx === bailoutLoser ? `\u81EA\u6478\u4E92\u5305\u8D54\u4ED8\xD7${bailoutMultiplier}` : "\u81EA\u6478\u8D54\u4ED8",
          idx === bailoutLoser ? bailout.type : void 0
        );
      }
      return { deltas, transfers };
    }
    for (const idx of allPlayerIndices) {
      if (idx === winnerIndex) continue;
      addTransfer(idx, winnerIndex, winnerFinalPoints, "\u81EA\u6478\u8D54\u4ED8");
    }
    return { deltas, transfers };
  }
  if (discarderId !== void 0 && allPlayerIndices.includes(discarderId)) {
    const bailoutLoser = allPlayerIndices.find((idx) => {
      if (idx === winnerIndex || idx === discarderId) return false;
      const bailout = mutualBailout == null ? void 0 : mutualBailout.get(idx);
      return (bailout == null ? void 0 : bailout.partnerIndex) === winnerIndex;
    });
    if (bailoutLoser !== void 0) {
      if (discarderId === bailoutLoser) {
        const pay = winnerFinalPoints * 2;
        const bailoutType = (_a = mutualBailout == null ? void 0 : mutualBailout.get(discarderId)) == null ? void 0 : _a.type;
        addTransfer(discarderId, winnerIndex, pay, "\u653E\u51B2\u4E14\u4E92\u5305\u8D54\u4ED8\xD72", bailoutType);
      } else {
        const bailoutType = (_b = mutualBailout == null ? void 0 : mutualBailout.get(bailoutLoser)) == null ? void 0 : _b.type;
        addTransfer(discarderId, winnerIndex, winnerFinalPoints, "\u653E\u51B2\u8D54\u4ED8");
        addTransfer(bailoutLoser, winnerIndex, winnerFinalPoints, "\u7B2C\u4E09\u65B9\u653E\u51B2\u89E6\u53D1\u4E92\u5305\u8865\u8D54", bailoutType);
      }
      return { deltas, transfers };
    }
    addTransfer(discarderId, winnerIndex, winnerFinalPoints, "\u653E\u51B2\u8D54\u4ED8");
    return { deltas, transfers };
  }
  for (const idx of allPlayerIndices) {
    if (idx === winnerIndex) continue;
    const bailout = mutualBailout == null ? void 0 : mutualBailout.get(idx);
    const pay = bailout && bailout.partnerIndex === winnerIndex ? winnerFinalPoints * 2 : winnerFinalPoints;
    addTransfer(
      idx,
      winnerIndex,
      pay,
      bailout && bailout.partnerIndex === winnerIndex ? "\u4E92\u5305\u8D54\u4ED8\xD72" : "\u8D54\u4ED8",
      bailout && bailout.partnerIndex === winnerIndex ? bailout.type : void 0
    );
  }
  return { deltas, transfers };
}
function calculateRoundMultiplier(dice1, dice2) {
  const isDouble = dice1 === dice2;
  const isOneFourCombo = dice1 === 1 && dice2 === 4 || dice1 === 4 && dice2 === 1;
  if (isDouble) {
    if (dice1 === 1 || dice1 === 4) return 4;
    return 2;
  }
  if (isOneFourCombo) {
    return 2;
  }
  return 1;
}
function calculateGlobalMultiplier(currentMultiplier, event) {
  const newMultiplier = currentMultiplier * 2;
  return Math.min(newMultiplier, 8);
}
function calculateGameResult(players, winners) {
  const scores = {};
  for (const p of players) {
    scores[p.id] = 0;
  }
  if (!winners.length) {
    return scores;
  }
  const winnerIds = new Set(winners.map((w) => w.id));
  const losers = players.filter((p) => !winnerIds.has(p.id));
  for (const winner of winners) {
    const winFan = Math.max(1, winner.wonFan || 1);
    for (const loser of losers) {
      scores[loser.id] -= winFan;
      scores[winner.id] += winFan;
    }
  }
  return scores;
}

const COLLECTION_NAME$1 = "mahjongGames";
const tileToStored = (tile) => ({
  suit: tile.suit,
  value: tile.value,
  id: tile.id
});
const storedToTile = (tile) => ({
  suit: tile.suit,
  value: tile.value,
  id: tile.id
});
const meldToStored = (meld) => ({
  type: meld.type,
  tiles: meld.tiles.map(tileToStored),
  isConcealed: meld.isConcealed,
  sourcePosition: meld.sourcePosition,
  sourceTileId: meld.sourceTileId
});
const storedToMeld = (meld) => ({
  type: meld.type,
  tiles: meld.tiles.map(storedToTile),
  isConcealed: meld.isConcealed,
  sourcePosition: meld.sourcePosition,
  sourceTileId: meld.sourceTileId
});
const playerToStored = (player) => ({
  userId: player.id,
  name: player.name,
  position: player.position,
  hand: {
    concealedTiles: player.hand.concealedTiles.map(tileToStored),
    exposedMelds: player.hand.exposedMelds.map(meldToStored),
    discardedTiles: player.hand.discardedTiles.map(tileToStored)
  },
  status: player.status,
  isDealer: player.isDealer,
  isTing: player.isTing,
  missingSuit: player.missingSuit,
  windScore: player.windScore,
  rainScore: player.rainScore,
  wonFan: player.wonFan,
  winOrder: player.winOrder,
  winRound: player.winRound,
  winTimestamp: player.winTimestamp,
  score: player.score
});
const storedToPlayer = (player) => {
  var _a, _b, _c, _d, _e;
  return {
    id: player.userId,
    name: player.name,
    position: player.position,
    hand: {
      concealedTiles: player.hand.concealedTiles.map(storedToTile),
      exposedMelds: player.hand.exposedMelds.map(storedToMeld),
      discardedTiles: player.hand.discardedTiles.map(storedToTile)
    },
    status: player.status,
    isDealer: player.isDealer,
    isTing: player.isTing,
    missingSuit: (_a = player.missingSuit) != null ? _a : null,
    windScore: player.windScore,
    rainScore: player.rainScore,
    wonFan: player.wonFan,
    winOrder: (_b = player.winOrder) != null ? _b : null,
    winRound: (_c = player.winRound) != null ? _c : null,
    winTimestamp: (_d = player.winTimestamp) != null ? _d : null,
    score: (_e = player.score) != null ? _e : 0
  };
};
const actionToStored = (action) => ({
  playerId: action.playerId,
  type: action.type,
  tile: action.tile ? tileToStored(action.tile) : void 0,
  tiles: action.tiles ? action.tiles.map(tileToStored) : void 0,
  timestamp: action.timestamp
});
const storedToAction = (action) => ({
  playerId: action.playerId,
  type: action.type,
  tile: action.tile ? storedToTile(action.tile) : void 0,
  tiles: action.tiles ? action.tiles.map(storedToTile) : void 0,
  timestamp: action.timestamp
});
const gameStateToDocument = (game) => {
  var _a;
  return {
    gameId: game.gameId,
    roomId: game.gameId,
    roomNumber: game.roomNumber,
    phase: game.phase,
    endReason: game.endReason,
    players: game.players.map(playerToStored),
    wall: game.wall.map(tileToStored),
    currentPlayerIndex: game.currentPlayerIndex,
    dealerIndex: game.dealerIndex,
    discardPile: game.discardPile.map(tileToStored),
    actionHistory: game.actionHistory.map(actionToStored),
    winnersCount: game.winnersCount,
    roundNumber: game.roundNumber,
    createdAt: new Date(game.createdAt),
    lastActionTime: new Date(game.lastActionTime),
    updatedAt: /* @__PURE__ */ new Date(),
    endedAt: game.endedAt ? new Date(game.endedAt) : void 0,
    finalScores: game.finalScores,
    customScoringMode: (_a = game.customScoringMode) != null ? _a : null,
    pendingActions: game.pendingActions,
    dice: game.dice,
    roundMultiplier: game.roundMultiplier,
    inheritMultiplier: game.inheritMultiplier,
    inheritedGlobalMultiplier: game.inheritedGlobalMultiplier,
    rebelEvent: game.rebelEvent,
    hesitationWindow: game.hesitationWindow,
    diceRollCount: game.diceRollCount,
    trainingRoundStartSnapshot: game.trainingRoundStartSnapshot
  };
};
const documentToGameState = (doc) => {
  var _a, _b, _c;
  return {
    gameId: doc.gameId,
    roomNumber: doc.roomNumber,
    phase: doc.phase,
    endReason: (_a = doc.endReason) != null ? _a : null,
    players: doc.players.map(storedToPlayer),
    wall: doc.wall.map(storedToTile),
    currentPlayerIndex: doc.currentPlayerIndex,
    dealerIndex: doc.dealerIndex,
    discardPile: doc.discardPile.map(storedToTile),
    actionHistory: doc.actionHistory.map(storedToAction),
    winnersCount: doc.winnersCount,
    roundNumber: doc.roundNumber,
    createdAt: doc.createdAt.getTime(),
    lastActionTime: doc.lastActionTime.getTime(),
    endedAt: doc.endedAt ? doc.endedAt.getTime() : void 0,
    finalScores: doc.finalScores,
    customScoringMode: (_b = doc.customScoringMode) != null ? _b : null,
    pendingActions: (_c = doc.pendingActions) != null ? _c : [],
    dice: doc.dice,
    roundMultiplier: doc.roundMultiplier,
    inheritMultiplier: doc.inheritMultiplier,
    inheritedGlobalMultiplier: doc.inheritedGlobalMultiplier,
    rebelEvent: doc.rebelEvent,
    hesitationWindow: doc.hesitationWindow,
    diceRollCount: doc.diceRollCount,
    trainingRoundStartSnapshot: doc.trainingRoundStartSnapshot
  };
};
const saveGameState = async (game) => {
  const games = await getCollection$1(COLLECTION_NAME$1);
  const doc = gameStateToDocument(game);
  await games.updateOne(
    { gameId: game.gameId },
    { $set: doc },
    { upsert: true }
  );
};
const loadGameState = async (gameId) => {
  const games = await getCollection$1(COLLECTION_NAME$1);
  const doc = await games.findOne({ gameId });
  return doc ? documentToGameState(doc) : null;
};
const deleteGameState = async (gameId) => {
  const games = await getCollection$1(COLLECTION_NAME$1);
  await games.deleteOne({ gameId });
};
const loadActiveGameStates = async () => {
  const games = await getCollection$1(COLLECTION_NAME$1);
  const docs = await games.find({ phase: { $ne: "ended" } }).toArray();
  return docs.map(documentToGameState);
};

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => __defNormalProp$3(obj, key + "" , value);
class MatchHistoryService {
  /**
   * 从 actionHistory 推断胡牌类型
   */
  static inferWinType(game, playerId) {
    var _a;
    const actions = game.actionHistory;
    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      if (action.playerId === playerId && action.type === ActionType.HU) {
        if (i > 0) {
          const prev = actions[i - 1];
          if (prev.type === ActionType.DRAW && prev.playerId === playerId) {
            return "self_draw";
          }
          if (prev.type === ActionType.DISCARD && prev.playerId !== playerId) {
            return "catch_discard";
          }
          if (prev.type === ActionType.EXTENDED_KONG) {
            return "rob_kong";
          }
        }
        if (action.tile) {
          const isOwnTile = (_a = game.players.find((p) => p.id === playerId)) == null ? void 0 : _a.hand.concealedTiles.some((t) => {
            var _a2;
            return t.id === ((_a2 = action.tile) == null ? void 0 : _a2.id);
          });
          if (!isOwnTile) return "catch_discard";
        }
        return "self_draw";
      }
    }
    return null;
  }
  static async recordMatch(game, finalScores, reason) {
    var _a;
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const completedAtMs = (_a = game.endedAt) != null ? _a : Date.now();
    const winners = game.players.filter((player) => player.status === PlayerStatus.WON);
    const computedScores = game.customScoringMode === "cheat" ? game.players.reduce((acc, player) => {
      acc[player.id] = winners.some((w) => w.id === player.id) ? 1 : -1;
      return acc;
    }, {}) : calculateGameResult(game.players, winners);
    const history = {
      gameId: game.gameId,
      roomId: game.roomNumber || game.gameId,
      roomNumber: game.roomNumber,
      endReason: reason,
      winnersCount: game.winnersCount,
      roundNumber: game.roundNumber,
      completedAt: new Date(completedAtMs),
      durationMs: Math.max(completedAtMs - game.createdAt, 0),
      finalScores: finalScores != null ? finalScores : computedScores,
      results: game.players.map((player) => {
        var _a2, _b, _c, _d, _e, _f;
        return {
          playerId: player.id,
          name: player.name,
          position: player.position,
          status: player.status,
          winOrder: (_a2 = player.winOrder) != null ? _a2 : null,
          winRound: (_b = player.winRound) != null ? _b : null,
          winTimestamp: (_c = player.winTimestamp) != null ? _c : null,
          winType: player.status === PlayerStatus.WON ? this.inferWinType(game, player.id) : null,
          wonFan: player.wonFan,
          windScore: player.windScore,
          rainScore: player.rainScore,
          finalScore: (_f = (_e = (_d = player.score) != null ? _d : finalScores[player.id]) != null ? _e : computedScores == null ? void 0 : computedScores[player.id]) != null ? _f : 0
        };
      })
    };
    await collection.updateOne(
      { gameId: game.gameId },
      { $set: history },
      { upsert: true }
    );
  }
  static async listMatches(options) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const { userId, playerId, limit = 20 } = options || {};
    const targetPlayerId = playerId || userId;
    const query = targetPlayerId ? { "results.playerId": targetPlayerId } : {};
    return collection.find(query).sort({ completedAt: -1 }).limit(limit).toArray();
  }
}
__publicField$3(MatchHistoryService, "COLLECTION_NAME", "matchHistory");

const COLLECTION_NAME = "mahjongTrainingRounds";
const clonePlain = (value) => JSON.parse(JSON.stringify(value != null ? value : null));
class TrainingRecordService {
  static captureRoundStart(game) {
    game.trainingRoundStartSnapshot = this.captureSnapshot(game, "round_start");
  }
  static captureSnapshot(game, label) {
    var _a, _b;
    const completedHands = ((_a = game.roundStats) == null ? void 0 : _a.length) || 0;
    const handNumber = label === "round_start" ? completedHands + 1 : Math.max(1, completedHands || 1);
    return {
      capturedAt: /* @__PURE__ */ new Date(),
      label,
      handNumber,
      turnRoundNumber: game.roundNumber,
      phase: game.phase,
      customScoringMode: (_b = game.customScoringMode) != null ? _b : null,
      wildTileGroup: game.wildTileGroup ? clonePlain(game.wildTileGroup) : void 0,
      dice: game.dice ? clonePlain(game.dice) : void 0,
      roundMultiplier: game.roundMultiplier,
      inheritMultiplier: game.inheritMultiplier,
      inheritedGlobalMultiplier: game.inheritedGlobalMultiplier,
      currentPlayerIndex: game.currentPlayerIndex,
      dealerIndex: game.dealerIndex,
      wallCount: game.wall.length,
      wall: clonePlain(game.wall),
      discardPile: clonePlain(game.discardPile),
      pendingActions: clonePlain(game.pendingActions),
      actionHistory: clonePlain(game.actionHistory),
      players: clonePlain(game.players.map((player) => ({
        id: player.id,
        userId: player.userId,
        name: player.name,
        position: player.position,
        status: player.status,
        isDealer: player.isDealer,
        isTing: player.isTing,
        missingSuit: player.missingSuit,
        score: player.score,
        windScore: player.windScore,
        rainScore: player.rainScore,
        wonFan: player.wonFan,
        winHandType: player.winHandType,
        winOrder: player.winOrder,
        winRound: player.winRound,
        winTimestamp: player.winTimestamp,
        isSelfDrawn: player.isSelfDrawn,
        discarderId: player.discarderId,
        winningScoreBreakdown: player.winningScoreBreakdown,
        hand: player.hand
      })))
    };
  }
  static async recordRound(game, endReason, finalScores, roundStat) {
    var _a;
    const actions = game.actionHistory || [];
    const byType = {};
    const byPlayer = {};
    for (const action of actions) {
      byType[action.type] = (byType[action.type] || 0) + 1;
      if (!byPlayer[action.playerId]) byPlayer[action.playerId] = {};
      byPlayer[action.playerId][action.type] = (byPlayer[action.playerId][action.type] || 0) + 1;
    }
    const initialSnapshot = game.trainingRoundStartSnapshot || this.captureSnapshot(game, "round_start_missing");
    const handNumber = initialSnapshot.handNumber || Math.max(1, ((_a = game.roundStats) == null ? void 0 : _a.length) || game.roundNumber);
    const record = {
      gameId: game.gameId,
      roomId: game.roomNumber || game.gameId,
      roomNumber: game.roomNumber,
      roundNumber: handNumber,
      turnRoundNumber: game.roundNumber,
      recordedAt: /* @__PURE__ */ new Date(),
      endReason,
      dice: game.dice,
      roundMultiplier: game.roundMultiplier,
      inheritMultiplier: game.inheritMultiplier,
      inheritedGlobalMultiplier: game.inheritedGlobalMultiplier,
      finalScores: clonePlain(finalScores),
      initialSnapshot,
      finalSnapshot: this.captureSnapshot(game, "round_end"),
      roundStat: roundStat ? clonePlain(roundStat) : void 0,
      actionStats: {
        total: actions.length,
        byType,
        byPlayer
      }
    };
    const collection = await getCollection$1(COLLECTION_NAME);
    await collection.updateOne(
      { gameId: game.gameId, roundNumber: handNumber },
      { $set: record },
      { upsert: true }
    );
  }
}

const USE_PIPELINE_SCORER = process.env.USE_PIPELINE_SCORER === "true";
const USE_OFFICIAL_ROUTE_BOT_PATH = process.env.USE_OFFICIAL_ROUTE_BOT_PATH !== "false";
const DISABLE_LEGACY_BOT_PATH = process.env.DISABLE_LEGACY_BOT_PATH !== "false";
const PIPELINE_SHADOW_MODE = process.env.PIPELINE_SHADOW_MODE !== "false";
process.env.PIPELINE_LOG_BREAKDOWN === "true";
parseFloat(process.env.SOFT_POLICY_TEMPERATURE || "1.0");

function detectDecisionPhase(input) {
  const {
    estimatedRound,
    shanten,
    tableThreat,
    wallRemaining,
    meldCount,
    opponentOpenMelds,
    downstreamPressure,
    fastOpenOpponentCount,
    bigOpenOpponentCount,
    wallEarlySpeedPush = 0,
    wallMidBalance = 0,
    wallLateDefense = 0,
    safeTilePriority = 0,
    defenseRiskAversion = 0,
    wallTilesImpact = 0
  } = input;
  const defenseBias = (wallLateDefense + safeTilePriority + defenseRiskAversion) / 3;
  const defenseThreatThreshold = 0.84 - defenseBias * 0.12;
  const rushRoundThreshold = Math.max(7, 11 - wallMidBalance * 2.2 - wallEarlySpeedPush * 1.2);
  const commitRoundThreshold = Math.max(4, 6 - wallEarlySpeedPush * 1.6);
  const lateWallPressureThreshold = Math.max(14, 18 + wallTilesImpact * 8 - wallLateDefense * 3);
  const rushWallThreshold = Math.max(22, 30 + wallTilesImpact * 10 - wallMidBalance * 4);
  if (tableThreat >= defenseThreatThreshold && shanten > 1 || downstreamPressure >= 1.35 || bigOpenOpponentCount >= 1 && tableThreat >= 0.6 && shanten > 1 || fastOpenOpponentCount >= 2 && shanten > 1 || opponentOpenMelds >= 5 && shanten > 1 || wallRemaining <= lateWallPressureThreshold && shanten > 0) {
    return "DEFENSE";
  }
  if (shanten <= 1 || estimatedRound >= rushRoundThreshold || wallRemaining <= rushWallThreshold || meldCount >= 2 || downstreamPressure >= 0.9 || bigOpenOpponentCount >= 1 || fastOpenOpponentCount >= 1 || opponentOpenMelds >= 4) {
    return "RUSH";
  }
  if (estimatedRound >= commitRoundThreshold || opponentOpenMelds >= 2 || fastOpenOpponentCount >= 1) {
    return "COMMIT";
  }
  return "OBSERVE";
}

const NUMBER_SUITS = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
const ROUTES = ["MENQING_SPEED", "OPEN_SPEED", "HALF_FLUSH", "ALL_PUNGS", "HONOR_HEAVY"];
function getPolicyValue(policy, key, fallback = 0) {
  var _a;
  const raw = Number((_a = policy == null ? void 0 : policy[key]) != null ? _a : fallback);
  return Number.isFinite(raw) ? raw : fallback;
}
function getRouteBucketBoost(policy, handQuality, isHighMult, route) {
  if (handQuality < 5) return 0;
  const multPrefix = isHighMult ? "multHigh" : "multLow";
  if (route === "ALL_PUNGS") {
    return getPolicyValue(policy, `${multPrefix}Hand${handQuality}AllPungs`);
  }
  if (route === "HALF_FLUSH") {
    return getPolicyValue(policy, `${multPrefix}Hand${handQuality}HalfFlush`);
  }
  if (route === "HALF_FLUSH") return 0;
  return 0;
}
function getPureFlushBucketBoost(policy, handQuality, isHighMult) {
  if (handQuality < 6) return 0;
  const multPrefix = isHighMult ? "multHigh" : "multLow";
  return getPolicyValue(policy, `${multPrefix}Hand${handQuality}PureFlush`);
}
function getWildRouteBoost(policy, wildCount, route) {
  if (wildCount <= 0) return 0;
  const bucket = wildCount >= 3 ? "wild3" : wildCount === 2 ? "wild2" : "wild1";
  const suffix = route === "meld" ? "RouteMeldPush" : route === "flush" ? "RouteFlushBoost" : route === "honors" ? "RouteHonorsBoost" : "RouteAllPungsBoost";
  return getPolicyValue(policy, `${bucket}${suffix}`);
}
function getEffectiveGlobalMultiplier$2(game) {
  var _a, _b, _c;
  const inherit = (_b = (_a = game == null ? void 0 : game.inheritMultiplier) != null ? _a : game == null ? void 0 : game.inheritedGlobalMultiplier) != null ? _b : 1;
  const round = (_c = game == null ? void 0 : game.roundMultiplier) != null ? _c : 1;
  return Math.min(inherit * round, 8);
}
function countAdjacentPartners(tile, hand) {
  if (!NUMBER_SUITS.includes(tile.suit)) return 0;
  return hand.filter(
    (candidate) => candidate.id !== tile.id && candidate.suit === tile.suit && Math.abs(candidate.value - tile.value) > 0 && Math.abs(candidate.value - tile.value) <= 2
  ).length;
}
function buildFeatureSummary(input) {
  var _a, _b, _c, _d, _e;
  const { game, player, hand } = input;
  const suitCounts = {};
  const groups = groupTiles(hand);
  let pairCount = 0;
  let tripletCount = 0;
  let isolatedCount = 0;
  let honorCount = 0;
  let honorPairCount = 0;
  let weakHonorPairCount = 0;
  let wildCount = 0;
  for (const tile of hand) {
    if (tile.isWild) wildCount++;
    if (NUMBER_SUITS.includes(tile.suit)) {
      suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1;
    }
    if (isHonor(tile)) honorCount++;
  }
  for (const [key, tiles] of groups.entries()) {
    if (tiles.length >= 2) pairCount++;
    if (tiles.length >= 3) tripletCount++;
    const sample = tiles[0];
    if (isHonor(sample) && tiles.length >= 2) honorPairCount++;
    if (isHonor(sample) && tiles.length === 2) weakHonorPairCount++;
    if (tiles.length === 1 && countAdjacentPartners(sample, hand) === 0) isolatedCount++;
  }
  let sequenceLikeCount = 0;
  for (const tile of hand) {
    if (countAdjacentPartners(tile, hand) > 0) sequenceLikeCount++;
  }
  const orderedSuits = NUMBER_SUITS.map((suit) => ({ suit, count: suitCounts[suit] || 0 })).sort((a, b) => b.count - a.count);
  const longestSuit = ((_a = orderedSuits[0]) == null ? void 0 : _a.count) ? orderedSuits[0].suit : null;
  const longestSuitCount = ((_b = orderedSuits[0]) == null ? void 0 : _b.count) || 0;
  const secondSuitCount = ((_c = orderedSuits[1]) == null ? void 0 : _c.count) || 0;
  const shortestSuitEntry = [...orderedSuits].reverse().find((entry) => entry.count > 0) || null;
  const shortestSuit = (shortestSuitEntry == null ? void 0 : shortestSuitEntry.suit) || null;
  const shortestSuitCount = (shortestSuitEntry == null ? void 0 : shortestSuitEntry.count) || 0;
  const upstream = game.players[(player.position + 3) % game.players.length];
  const downstream = game.players[(player.position + 1) % game.players.length];
  const upstreamDiscards = ((upstream == null ? void 0 : upstream.hand.discardedTiles) || []).filter((discard) => NUMBER_SUITS.includes(discard.suit));
  const upstreamSuitCounts = {};
  const upstreamConsecutiveSuitCounts = {};
  for (const discard of upstreamDiscards) {
    upstreamSuitCounts[discard.suit] = (upstreamSuitCounts[discard.suit] || 0) + 1;
  }
  for (let index = 0; index < upstreamDiscards.length - 1; index++) {
    const current = upstreamDiscards[index];
    const next = upstreamDiscards[index + 1];
    if (!current || !next || current.suit !== next.suit) continue;
    upstreamConsecutiveSuitCounts[current.suit] = (upstreamConsecutiveSuitCounts[current.suit] || 0) + 1;
  }
  const upstreamVoidSuit = NUMBER_SUITS.map((suit) => ({
    suit,
    count: upstreamSuitCounts[suit] || 0,
    consecutive: upstreamDiscards.some(
      (discard, index) => {
        var _a2;
        return discard.suit === suit && ((_a2 = upstreamDiscards[index + 1]) == null ? void 0 : _a2.suit) === suit;
      }
    )
  })).sort((a, b) => Number(b.consecutive) - Number(a.consecutive) || b.count - a.count)[0];
  const upstreamRejectedSuit = NUMBER_SUITS.map((suit) => ({
    suit,
    runCount: upstreamConsecutiveSuitCounts[suit] || 0,
    count: upstreamSuitCounts[suit] || 0
  })).sort((a, b) => b.runCount - a.runCount || b.count - a.count)[0];
  const allOpponentsAvoidSuit = NUMBER_SUITS.find(
    (suit) => game.players.filter((candidate) => candidate.id !== player.id).every((candidate) => (candidate.hand.discardedTiles || []).some((discard) => discard.suit === suit))
  ) || null;
  const opponents = game.players.filter((candidate) => candidate.id !== player.id);
  const opponentOpenMelds = opponents.reduce((sum, candidate) => {
    var _a2;
    return sum + (((_a2 = candidate.hand.exposedMelds) == null ? void 0 : _a2.length) || 0);
  }, 0);
  const fastOpenOpponentCount = opponents.filter(
    (candidate) => {
      var _a2;
      return (((_a2 = candidate.hand.exposedMelds) == null ? void 0 : _a2.length) || 0) >= 2 || !!candidate.isTing;
    }
  ).length;
  const bigOpenOpponentCount = opponents.filter((candidate) => {
    const melds = candidate.hand.exposedMelds || [];
    if (melds.length >= 3) return true;
    let honorMelds = 0;
    const suitSet = /* @__PURE__ */ new Set();
    for (const meld of melds) {
      for (const tile of meld.tiles || []) {
        if (isHonor(tile)) honorMelds++;
        if (NUMBER_SUITS.includes(tile.suit)) suitSet.add(tile.suit);
      }
    }
    return honorMelds >= 3 || melds.length >= 2 && suitSet.size === 1;
  }).length;
  const downstreamPressure = (((_d = downstream == null ? void 0 : downstream.hand.exposedMelds) == null ? void 0 : _d.length) || 0) * 0.45 + ((downstream == null ? void 0 : downstream.isTing) ? 0.9 : 0);
  const oneSuitOpponentCount = opponents.filter((candidate) => {
    const numberSuits = /* @__PURE__ */ new Set();
    let numberedTiles = 0;
    for (const meld of candidate.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (!NUMBER_SUITS.includes(tile.suit)) continue;
        numberSuits.add(tile.suit);
        numberedTiles++;
      }
    }
    return numberedTiles >= 3 && numberSuits.size === 1;
  }).length;
  let liveHonorCount = 0;
  for (const suit of [TileSuit.WIND, TileSuit.DRAGON]) {
    const maxValue = suit === TileSuit.WIND ? 4 : 3;
    for (let value = 1; value <= maxValue; value++) {
      const visible = (game.discardPile || []).filter((tile) => tile.suit === suit && tile.value === value).length + game.players.reduce((sum, candidate) => sum + candidate.hand.exposedMelds.reduce(
        (meldSum, meld) => meldSum + meld.tiles.filter((tile) => tile.suit === suit && tile.value === value).length,
        0
      ), 0);
      if (visible < 3) liveHonorCount++;
    }
  }
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier$2(game);
  const estimatedRound = Math.max(1, Math.floor((((_e = game.discardPile) == null ? void 0 : _e.length) || 0) / 4) + 1);
  const pureFlushUpgradeReady = longestSuitCount >= 10 && secondSuitCount === 0 && honorPairCount >= 1 && honorCount <= 2 && weakHonorPairCount >= 1 && estimatedRound <= 15 && input.tableThreat <= 0.58 && opponentOpenMelds <= 3 && downstreamPressure <= 0.75 && oneSuitOpponentCount === 0 && effectiveGlobalMultiplier <= 3;
  return {
    longestSuit,
    longestSuitCount,
    shortestSuit,
    shortestSuitCount,
    secondSuitCount,
    pairCount,
    tripletCount,
    sequenceLikeCount,
    isolatedCount,
    honorCount,
    honorPairCount,
    wildCount,
    upstreamVoidSuit: upstreamVoidSuit && (upstreamVoidSuit.consecutive || upstreamVoidSuit.count >= 2) ? upstreamVoidSuit.suit : null,
    upstreamRejectedSuit: upstreamRejectedSuit && upstreamRejectedSuit.runCount >= 1 ? upstreamRejectedSuit.suit : null,
    allOpponentsAvoidSuit,
    liveHonorCount,
    opponentOpenMelds,
    fastOpenOpponentCount,
    bigOpenOpponentCount,
    downstreamPressure,
    oneSuitOpponentCount,
    pureFlushUpgradeReady,
    weakHonorPairCount
  };
}
function evaluateSingleRoute(route, input, features) {
  var _a, _b, _c, _d;
  const reasons = [];
  let score = 0;
  let targetSuit = null;
  const policy = (_c = (_b = input.policy) != null ? _b : (_a = input.previousRouteState) == null ? void 0 : _a.policy) != null ? _c : null;
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier$2(input.game);
  const estimatedRound = Math.max(1, Math.floor((((_d = input.game.discardPile) == null ? void 0 : _d.length) || 0) / 4) + 1);
  const handQuality = features.longestSuitCount >= 7 ? 7 : features.longestSuitCount >= 6 ? 6 : features.longestSuitCount >= 5 ? 5 : 0;
  const handRouteBias = handQuality >= 7 ? getPolicyValue(policy, "hand7RouteBias") : handQuality >= 6 ? getPolicyValue(policy, "hand6RouteBias") : handQuality >= 5 ? getPolicyValue(policy, "hand5RouteBias") : 0;
  const isHighMult = effectiveGlobalMultiplier >= 4;
  const routeBucketBoost = getRouteBucketBoost(policy, handQuality, isHighMult, route);
  const pureFlushBucketBoost = getPureFlushBucketBoost(policy, handQuality, isHighMult);
  const earlyPairHeavy = estimatedRound <= 5 && features.pairCount >= 4;
  const noWildOpenPush = features.wildCount === 0;
  const multiWildMenqingPush = features.wildCount >= 2;
  const oneWildLongSuitPivot = features.wildCount === 1 && features.longestSuitCount >= 6;
  const suitedPairCount = Math.max(0, features.pairCount - features.honorPairCount);
  const qingPengReady = features.longestSuitCount >= 8 && features.secondSuitCount === 0 && features.honorCount <= 2;
  const hunPengReady = features.longestSuitCount >= 6 && features.honorCount >= 2 && features.secondSuitCount <= 1;
  const upstreamRejectedLongSuit = !!features.upstreamRejectedSuit && features.longestSuit === features.upstreamRejectedSuit && features.longestSuitCount >= 6;
  switch (route) {
    case "MENQING_SPEED":
      score += 9;
      score += Math.max(0, 10 - input.shanten * 3.5);
      score += input.effectiveTiles * 0.28;
      score += features.pairCount * 2.4;
      score += features.sequenceLikeCount * 0.45;
      score += Math.max(0, features.longestSuitCount - 4) * 0.7;
      score -= features.isolatedCount * 1.8;
      score -= input.player.hand.exposedMelds.length * 3.2;
      score -= Math.max(0, features.longestSuitCount - 6) * 1.1;
      score -= Math.max(0, features.pairCount - 3) * 1.3;
      score -= input.tableThreat * 4;
      score -= features.opponentOpenMelds * 1.35;
      score -= features.downstreamPressure * 2.2;
      score -= Math.max(0, effectiveGlobalMultiplier - 1) * 1.9;
      if (noWildOpenPush) score -= 2.6;
      if (oneWildLongSuitPivot) score -= 0.9;
      if (upstreamRejectedLongSuit) score -= 2.4;
      if (earlyPairHeavy) score -= 3.8;
      if (multiWildMenqingPush) score += 2.8;
      if (input.player.hand.exposedMelds.length === 0) score += 3;
      if (input.shanten <= 2 && features.isolatedCount <= 2) score += 2.5;
      if (features.upstreamVoidSuit) {
        reasons.push("upstream_void_suit");
        score += 1.5;
      }
      score += getPolicyValue(policy, "wallEarlySpeedPush") * 0.8;
      break;
    case "OPEN_SPEED":
      score += 8;
      score += Math.max(0, 8 - input.shanten * 2.5);
      score += input.effectiveTiles * 0.22;
      score += features.tripletCount * 2.2;
      score += features.pairCount * 1.4;
      score += Math.max(0, features.longestSuitCount - features.secondSuitCount) * 0.7;
      score += input.tableThreat * 8;
      score += features.downstreamPressure * 4.2;
      score += features.opponentOpenMelds * 1.4;
      score += input.player.hand.exposedMelds.length * 1.6;
      score += getWildRouteBoost(policy, features.wildCount, "meld") * 3.5;
      score += getPolicyValue(policy, "wallEarlySpeedPush") * 1.1;
      score += getPolicyValue(policy, "wallMidBalance") * 0.8;
      score += Math.max(0, effectiveGlobalMultiplier - 1) * 2.1;
      if (noWildOpenPush) score += 2.4;
      if (oneWildLongSuitPivot) score += 1.2;
      if (upstreamRejectedLongSuit) {
        reasons.push("upstream_rejected_long_suit");
        score += 3.2;
      }
      if (earlyPairHeavy) {
        reasons.push("early_pair_heavy_open_push");
        score += 2.1;
      }
      if (multiWildMenqingPush) score -= 1.2;
      score -= Math.max(0, features.isolatedCount - 1) * 0.8;
      if (input.shanten <= 2) score += 2.4;
      break;
    case "HALF_FLUSH":
      targetSuit = features.longestSuit;
      score += features.longestSuitCount * 4.1;
      score += features.honorCount * 1.6;
      score += features.honorPairCount * 1.5;
      score += features.wildCount * 2.2;
      score += getPolicyValue(policy, "halfFlushWeight") * 4.5;
      score += getWildRouteBoost(policy, features.wildCount, "flush") * 4.2;
      score += routeBucketBoost * (2.6 + handRouteBias);
      score += pureFlushBucketBoost * (features.secondSuitCount === 0 ? 2.2 : 1.1);
      score -= features.secondSuitCount * 2.5;
      if (hunPengReady) score += getPolicyValue(policy, "hunPengPursuit") * (3.8 + suitedPairCount * 0.35);
      if (qingPengReady) score += getPolicyValue(policy, "qingPengPursuit") * (2.4 + pureFlushBucketBoost * 0.6);
      score += getPolicyValue(policy, "pureFlushPursuit") * Math.max(0, features.longestSuitCount - 6) * 0.8;
      if (features.longestSuitCount >= 9) {
        reasons.push("half_flush_nine_tiles");
        score += 16;
      } else if (features.longestSuitCount >= 7) {
        reasons.push("half_flush_seven_tiles");
        score += 10;
      } else if (features.longestSuitCount < 6) {
        score -= 6;
      }
      if (features.upstreamVoidSuit && features.upstreamVoidSuit === targetSuit) {
        reasons.push("upstream_void_target");
        score += 3;
      }
      if (features.upstreamRejectedSuit && features.upstreamRejectedSuit === targetSuit && features.longestSuitCount >= 6) {
        reasons.push("upstream_rejected_target");
        score += 2.4;
      }
      if (features.allOpponentsAvoidSuit && features.allOpponentsAvoidSuit === targetSuit) {
        reasons.push("global_void_target");
        score += 2;
      }
      if (features.wildCount === 0) score += 1.1;
      score += features.oneSuitOpponentCount * 0.8;
      if (features.pureFlushUpgradeReady) {
        reasons.push("pure_flush_upgrade_ready");
        score += 8.5;
      }
      break;
    case "ALL_PUNGS":
      score += features.pairCount * 5.2;
      score += features.tripletCount * 5.8;
      score += features.honorPairCount * 2.5;
      score += features.wildCount * 2.8;
      score += getPolicyValue(policy, "allPungsPursuit") * 6.5;
      score += getWildRouteBoost(policy, features.wildCount, "allPungs") * 4.8;
      score += routeBucketBoost * (3 + handRouteBias);
      score += getPolicyValue(policy, "sequenceVsTripletBias") * Math.max(0, features.tripletCount - features.sequenceLikeCount * 0.25) * 1.2;
      score -= features.sequenceLikeCount * 1.8;
      score -= Math.max(0, features.secondSuitCount - 3) * 0.6;
      if (qingPengReady) score += getPolicyValue(policy, "qingPengPursuit") * (6.2 + pureFlushBucketBoost * 0.9);
      if (hunPengReady) score += getPolicyValue(policy, "hunPengPursuit") * (5.4 + features.honorPairCount * 0.8);
      if (features.honorCount >= 6) score += getPolicyValue(policy, "allHonorsPursuit") * 2.2;
      score += getPolicyValue(policy, "flushVsPungsBalance") * ((qingPengReady ? 2.4 : 0) - (features.secondSuitCount > 0 ? 0.8 : 0));
      if (earlyPairHeavy) {
        reasons.push("early_four_pairs_push");
        score += 8.5;
      }
      if (noWildOpenPush) score += 1.4;
      if (effectiveGlobalMultiplier >= 4) score += 1.6;
      if (features.pairCount + features.tripletCount >= 4 && features.wildCount > 0) {
        reasons.push("pair_stack_with_wild");
        score += 10;
      } else if (features.pairCount + features.tripletCount < 3) {
        score -= 5;
      }
      break;
    case "HONOR_HEAVY":
      score += features.honorCount * 4;
      score += features.honorPairCount * 3.5;
      score += features.wildCount * 2.6;
      score += features.liveHonorCount * 0.4;
      score += getPolicyValue(policy, "allHonorsPursuit") * 8.2;
      score += getPolicyValue(policy, "allHonorsPungsPursuit") * (features.tripletCount + features.honorPairCount) * 1.6;
      score += getWildRouteBoost(policy, features.wildCount, "honors") * 4.6;
      score += getPolicyValue(policy, "honorVsSuitedBalance") * 6;
      score -= (features.longestSuitCount + features.secondSuitCount) * 0.7;
      if (features.honorCount >= 9) {
        reasons.push("honor_stack_nine_plus");
        score += 10;
      } else if (features.honorCount >= 7) {
        score += 4;
      } else if (features.honorCount < 6) {
        score -= 11;
      }
      if (features.longestSuitCount >= 4) {
        score -= 8;
      }
      if (features.longestSuitCount + features.honorCount >= 8) {
        score -= 6;
      }
      if (features.honorCount >= 6) {
        reasons.push("dense_honors");
      }
      break;
  }
  if (input.wallRemaining <= 28 && route !== "MENQING_SPEED") {
    score += 1.5;
  }
  if (input.tableThreat >= 0.8 && route === "OPEN_SPEED") {
    score += 2.5;
  }
  return { route, score, targetSuit, reasons };
}
function evaluateRouteState(input) {
  var _a, _b, _c, _d;
  const estimatedRound = Math.max(1, Math.floor((((_a = input.game.discardPile) == null ? void 0 : _a.length) || 0) / 4) + 1);
  const features = buildFeatureSummary(input);
  const policy = (_d = (_c = input.policy) != null ? _c : (_b = input.previousRouteState) == null ? void 0 : _b.policy) != null ? _d : null;
  const phase = detectDecisionPhase({
    estimatedRound,
    shanten: input.shanten,
    tableThreat: input.tableThreat,
    wallRemaining: input.wallRemaining,
    meldCount: input.player.hand.exposedMelds.length,
    opponentOpenMelds: features.opponentOpenMelds,
    downstreamPressure: features.downstreamPressure,
    fastOpenOpponentCount: features.fastOpenOpponentCount,
    bigOpenOpponentCount: features.bigOpenOpponentCount,
    wallEarlySpeedPush: getPolicyValue(policy, "wallEarlySpeedPush"),
    wallMidBalance: getPolicyValue(policy, "wallMidBalance"),
    wallLateDefense: getPolicyValue(policy, "wallLateDefense"),
    safeTilePriority: getPolicyValue(policy, "safeTilePriority"),
    defenseRiskAversion: getPolicyValue(policy, "defenseRiskAversion"),
    wallTilesImpact: getPolicyValue(policy, "wallTilesImpact")
  });
  const routeScores = ROUTES.map((route) => evaluateSingleRoute(route, input, features)).sort((a, b) => b.score - a.score);
  const previousRouteState = input.previousRouteState || null;
  const topCandidate = routeScores[0];
  const previousCandidate = previousRouteState ? routeScores.find((candidate) => candidate.route === previousRouteState.current) || null : null;
  const evidenceAgainstPrevious = previousRouteState && previousRouteState.current !== topCandidate.route ? (previousRouteState.evidenceCounter || 0) + 1 : 0;
  const softLockedPrevious = !!previousRouteState && (previousRouteState.lockLevel > 0 || (previousRouteState.stableTurns || 0) >= 2);
  const requiredEvidenceToFlip = (previousRouteState == null ? void 0 : previousRouteState.lockLevel) === 2 ? 3 : (previousRouteState == null ? void 0 : previousRouteState.lockLevel) === 1 ? 2 : ((previousRouteState == null ? void 0 : previousRouteState.stableTurns) || 0) >= 2 ? 2 : 1;
  const canHoldPreviousRoute = !!previousRouteState && !!previousCandidate && softLockedPrevious && (previousCandidate.score >= topCandidate.score - (previousRouteState.lockLevel === 2 ? 3.6 : previousRouteState.lockLevel === 1 ? 2.2 : 1.4) || evidenceAgainstPrevious < requiredEvidenceToFlip);
  const current = canHoldPreviousRoute ? previousCandidate : topCandidate;
  const secondary = routeScores.find((candidate) => candidate.route !== current.route) || null;
  const gap = current && secondary ? current.score - secondary.score : (current == null ? void 0 : current.score) || 0;
  const stableOnPrevious = (previousRouteState == null ? void 0 : previousRouteState.current) === (current == null ? void 0 : current.route);
  const stableTurns = stableOnPrevious ? ((previousRouteState == null ? void 0 : previousRouteState.stableTurns) || 1) + 1 : 1;
  const switchCount = previousRouteState && previousRouteState.current !== current.route ? (previousRouteState.switchCount || 0) + 1 : (previousRouteState == null ? void 0 : previousRouteState.switchCount) || 0;
  const evidenceCounter = canHoldPreviousRoute && previousRouteState && previousRouteState.current !== topCandidate.route ? evidenceAgainstPrevious : 0;
  const lockLevel = stableTurns >= 3 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel === 2 && gap >= 1.4 ? 2 : phase === "RUSH" && gap >= 4 ? 2 : stableTurns >= 2 && stableOnPrevious && previousRouteState && previousRouteState.lockLevel >= 1 && gap >= 1.1 ? 1 : (phase === "COMMIT" || phase === "RUSH") && gap >= 2.5 ? 1 : 0;
  return {
    policy,
    phase,
    current: (current == null ? void 0 : current.route) || "MENQING_SPEED",
    secondary: (secondary == null ? void 0 : secondary.route) || null,
    confidence: gap,
    lockLevel,
    stableTurns,
    switchCount,
    evidenceCounter,
    targetSuit: (current == null ? void 0 : current.targetSuit) || null,
    routeScores,
    features
  };
}

function sameTypeCount(input) {
  var _a;
  return ((_a = groupTiles(input.hand).get(`${input.tile.suit}-${input.tile.value}`)) == null ? void 0 : _a.length) || 0;
}
function adjacentCount(input) {
  if (![TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(input.tile.suit)) return 0;
  return input.hand.filter(
    (tile) => tile.id !== input.tile.id && tile.suit === input.tile.suit && Math.abs(tile.value - input.tile.value) > 0 && Math.abs(tile.value - input.tile.value) <= 2
  ).length;
}
function countVisibleCopies$1(input) {
  let visible = 0;
  for (const tile of input.game.discardPile || []) {
    if (tile.suit === input.tile.suit && tile.value === input.tile.value) visible++;
  }
  for (const player of input.game.players || []) {
    for (const meld of player.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (tile.suit === input.tile.suit && tile.value === input.tile.value) visible++;
      }
    }
  }
  return visible;
}
function getSecondSuit(input) {
  var _a;
  const ordered = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].map((suit) => ({ suit, count: input.hand.filter((tile) => tile.suit === suit).length })).filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);
  return ((_a = ordered[1]) == null ? void 0 : _a.suit) || null;
}
function getObserveBucketScore(input) {
  var _a;
  const estimatedRound = Math.max(1, Math.floor((((_a = input.game.discardPile) == null ? void 0 : _a.length) || 0) / 4) + 1);
  const isSingleton = sameTypeCount(input) === 1;
  const isPair = sameTypeCount(input) >= 2;
  const nearby = adjacentCount(input);
  const visibleCopies = countVisibleCopies$1(input);
  const shortestSuit = input.routeState.features.shortestSuit;
  const longestSuit = input.routeState.features.longestSuit;
  const secondSuit = getSecondSuit(input);
  const shortSuitGap = input.routeState.features.longestSuitCount - input.routeState.features.shortestSuitCount;
  const weakUpstreamSuit = input.routeState.features.upstreamRejectedSuit && input.tile.suit === input.routeState.features.upstreamRejectedSuit && input.tile.suit !== longestSuit && !isHonor(input.tile) ? 18 + (isSingleton ? 4 : 0) : 0;
  const shortestSeenSingleton = shortestSuit && input.tile.suit === shortestSuit && isSingleton && nearby === 0 && visibleCopies >= 1 ? 16 + Math.min(4, visibleCopies * 2) : 0;
  const shortestSingleton = shortestSuit && input.tile.suit === shortestSuit && isSingleton && nearby === 0 ? 12 + Math.max(0, shortSuitGap - 1) : 0;
  const shortestSeenConnector = shortestSuit && input.tile.suit === shortestSuit && nearby > 0 && visibleCopies >= 1 && shortSuitGap >= 4 ? 10 + Math.min(4, visibleCopies) + Math.max(0, shortSuitGap - 3) : 0;
  const seenHonorWaste = isHonor(input.tile) && isSingleton && visibleCopies >= 3 && input.routeState.current !== "HONOR_HEAVY" && input.routeState.current !== "HALF_FLUSH" ? 11 + visibleCopies : 0;
  const exhaustedHonorPair = isHonor(input.tile) && isPair && visibleCopies >= 2 && estimatedRound >= 5 && input.routeState.current !== "HONOR_HEAVY" && input.routeState.current !== "HALF_FLUSH" ? 8 + visibleCopies : 0;
  const secondSuitWaste = secondSuit && input.tile.suit === secondSuit && input.tile.suit !== longestSuit && isSingleton && nearby === 0 && !isHonor(input.tile) ? 8 : 0;
  const secondSuitSeenWaste = secondSuit && input.tile.suit === secondSuit && input.tile.suit !== longestSuit && isSingleton && nearby <= 1 && !isHonor(input.tile) && visibleCopies >= 1 ? 9 + Math.min(3, visibleCopies) : 0;
  return Math.max(
    weakUpstreamSuit || 0,
    shortestSeenSingleton || 0,
    shortestSingleton || 0,
    shortestSeenConnector || 0,
    seenHonorWaste || 0,
    exhaustedHonorPair || 0,
    secondSuitWaste || 0,
    secondSuitSeenWaste || 0
  );
}
function scoreByRoute(input) {
  var _a;
  const { routeState, tile } = input;
  const count = sameTypeCount(input);
  const nearby = adjacentCount(input);
  const isOfficialOpening = input.hand.length >= 11;
  const estimatedRound = Math.max(1, Math.floor((((_a = input.game.discardPile) == null ? void 0 : _a.length) || 0) / 4) + 1);
  const longestSuit = routeState.features.longestSuit;
  const shortestSuit = routeState.features.shortestSuit;
  const longestSuitCount = routeState.features.longestSuitCount;
  const shortestSuitCount = routeState.features.shortestSuitCount;
  const isShortestSuitTile = !!shortestSuit && tile.suit === shortestSuit;
  const isLongestSuitTile = !!longestSuit && tile.suit === longestSuit;
  const suitGap = Math.max(0, longestSuitCount - shortestSuitCount);
  const shortSuitGapTrap = isShortestSuitTile && suitGap >= 4;
  const shortestSuitSequenceBreakBias = isShortestSuitTile && nearby > 0 ? 6.4 + Math.max(0, suitGap - 1) * 1.2 + (shortSuitGapTrap && count === 1 ? 3.6 : 0) : 0;
  const shortestSuitPairReserveBias = shortSuitGapTrap && count >= 2 && estimatedRound <= 6 ? 3.2 + Math.max(0, 6 - estimatedRound) * 0.25 : 0;
  const longestSuitSingletonKeepBias = isLongestSuitTile && count === 1 ? 1.2 + nearby * 0.5 + Math.max(0, suitGap - 1) * 0.35 : 0;
  switch (routeState.current) {
    case "MENQING_SPEED":
      return (isShortestSuitTile ? 5.1 + suitGap * 0.6 : 0) + shortestSuitSequenceBreakBias + (isShortestSuitTile && count >= 2 ? -shortestSuitPairReserveBias : 0) + (count === 1 ? 1.2 : -2.6) + (nearby === 0 ? 1.8 : -0.65 * nearby) + (isLongestSuitTile ? -longestSuitSingletonKeepBias : 0) + (isHonor(tile) && count === 1 ? isOfficialOpening ? -2.4 : 1.2 : 0);
    case "OPEN_SPEED":
      return (count === 1 ? 2.2 : -1.6) + (nearby === 0 ? 1.6 : -0.15 * nearby) + (longestSuit && tile.suit !== longestSuit && !isHonor(tile) ? 2.2 : 0) + (isShortestSuitTile ? 2.4 + shortestSuitSequenceBreakBias : 0) + (isShortestSuitTile && count >= 2 ? -Math.max(1.4, shortestSuitPairReserveBias * 0.6) : 0) + (isLongestSuitTile ? -Math.max(0.8, longestSuitSingletonKeepBias * 0.85) : 0) + (routeState.targetSuit && tile.suit !== routeState.targetSuit && !isHonor(tile) ? 4.8 : 0) + (routeState.targetSuit && tile.suit === routeState.targetSuit && !isHonor(tile) ? -2.6 : 0) + (isHonor(tile) && count === 1 ? 0.4 : 0);
    case "HALF_FLUSH":
      if (tile.suit === routeState.targetSuit) {
        return (count >= 2 ? -4.4 : -3.2) + (nearby > 0 ? -1.6 : -0.3);
      }
      if (isHonor(tile)) {
        if (routeState.features.pureFlushUpgradeReady) {
          return count >= 2 ? 5.6 : 3.4;
        }
        return count === 1 ? -0.1 : -1.8;
      }
      return 5.8 + (tile.suit === shortestSuit ? 1.1 : 0);
    case "ALL_PUNGS":
      return (count >= 2 ? -4.4 : 2.8) + (nearby > 0 && count === 1 ? 1.6 : 0) + (isHonor(tile) && count >= 2 ? -1 : 0);
    case "HONOR_HEAVY":
      if (isHonor(tile)) {
        return count >= 2 ? -4.2 : -1.4;
      }
      return 3.8 + (longestSuit && tile.suit !== longestSuit ? 0.6 : 0);
  }
}
function scoreRouteDiscardCandidate(input) {
  const routeBias = scoreByRoute(input);
  const preservePrimary = input.afterRouteState.current === input.routeState.current ? 1.2 : -1.1;
  const targetSuitBonus = input.routeState.targetSuit && input.afterRouteState.targetSuit === input.routeState.targetSuit ? 0.6 : 0;
  const routeStrengthDelta = input.afterRouteState.routeScores[0].score - input.routeState.routeScores[0].score;
  const observeOrdering = input.routeState.phase === "OBSERVE" ? getObserveBucketScore(input) + (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && sameTypeCount(input) === 1 ? 2.3 : 0) + (input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && adjacentCount(input) > 0 ? 5.4 : 0) + (input.routeState.features.shortestSuitCount > 0 && input.routeState.features.longestSuitCount - input.routeState.features.shortestSuitCount >= 4 && input.routeState.features.shortestSuit && input.tile.suit === input.routeState.features.shortestSuit && sameTypeCount(input) >= 2 ? -2.6 : 0) + (input.routeState.features.upstreamVoidSuit && input.tile.suit === input.routeState.features.upstreamVoidSuit && sameTypeCount(input) === 1 ? 1.5 : 0) + (input.routeState.features.longestSuit && input.tile.suit === input.routeState.features.longestSuit && sameTypeCount(input) >= 2 ? -1.2 : 0) + (input.routeState.features.longestSuit && input.tile.suit === input.routeState.features.longestSuit && sameTypeCount(input) === 1 ? -1.8 : 0) + (input.routeState.features.longestSuit && input.routeState.features.longestSuitCount >= 6 && input.tile.suit === input.routeState.features.longestSuit ? -3.2 : 0) + (input.routeState.features.longestSuitCount - input.routeState.features.secondSuitCount >= 3 && input.routeState.features.longestSuit && input.tile.suit === input.routeState.features.longestSuit ? -2.4 : 0) : 0;
  const dangerAdjustment = (0.65 - input.discardDanger) * (input.routeState.phase === "DEFENSE" ? 4 : input.routeState.phase === "RUSH" ? 2 : 1);
  const tingBonus = input.candidateShanten === 0 ? input.winningTiles * 0.18 - input.discardDanger * 2 : input.candidateShanten === 1 ? input.candidateEffective * 0.04 : 0;
  const pureFlushUpgradeBonus = input.routeState.current === "HALF_FLUSH" && input.routeState.features.pureFlushUpgradeReady && isHonor(input.tile) && sameTypeCount(input) >= 2 ? 7.5 : 0;
  return routeBias + preservePrimary + targetSuitBonus + observeOrdering + routeStrengthDelta * 0.18 + dangerAdjustment + tingBonus + pureFlushUpgradeBonus;
}

function isNumberSuit(suit) {
  return suit === TileSuit.DOTS || suit === TileSuit.CHARACTERS || suit === TileSuit.BAMBOOS;
}
function getEffectiveGlobalMultiplier$1(game) {
  var _a, _b, _c;
  const inherit = (_b = (_a = game == null ? void 0 : game.inheritMultiplier) != null ? _a : game == null ? void 0 : game.inheritedGlobalMultiplier) != null ? _b : 1;
  const round = (_c = game == null ? void 0 : game.roundMultiplier) != null ? _c : 1;
  return Math.min(inherit * round, 8);
}
function getCommittedOpenNumberSuit$1(player) {
  const suits = /* @__PURE__ */ new Set();
  let numberedTileCount = 0;
  for (const meld of player.hand.exposedMelds || []) {
    for (const tile of meld.tiles || []) {
      if (!isNumberSuit(tile.suit)) continue;
      suits.add(tile.suit);
      numberedTileCount++;
    }
  }
  if (numberedTileCount < 3 || suits.size !== 1) return null;
  return [...suits][0] || null;
}
function getNumberSuitCount(hand, suit) {
  return hand.filter((tile) => tile.suit === suit).length;
}
function countPairs$1(hand) {
  let pairs = 0;
  for (const tiles of groupTiles(hand).values()) {
    if (tiles.length >= 2) pairs++;
  }
  return pairs;
}
function getBestNumberSuit(hand, routeState) {
  var _a;
  if (routeState.targetSuit && isNumberSuit(routeState.targetSuit)) return routeState.targetSuit;
  const ranked = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].map((suit) => ({ suit, count: getNumberSuitCount(hand, suit) })).sort((a, b) => b.count - a.count);
  return ((_a = ranked[0]) == null ? void 0 : _a.count) ? ranked[0].suit : null;
}
function breaksCoreStructure(beforeHand, afterHand) {
  var _a;
  const beforeGroups = groupTiles(beforeHand);
  const afterGroups = groupTiles(afterHand);
  for (const [key, tiles] of beforeGroups.entries()) {
    if (tiles.length < 2) continue;
    const afterCount = ((_a = afterGroups.get(key)) == null ? void 0 : _a.length) || 0;
    if (afterCount < Math.min(tiles.length, 2)) return true;
  }
  return false;
}
function evaluateRouteClaim(input) {
  var _a;
  const {
    action,
    player,
    game,
    claimTile,
    routeState,
    candidateHand,
    candidateShanten,
    candidateEffective,
    passShanten,
    passEffective,
    tableThreat,
    wallRemaining
  } = input;
  const policy = routeState.policy || null;
  const afterRouteState = evaluateRouteState({
    game,
    player,
    hand: candidateHand,
    shanten: candidateShanten,
    effectiveTiles: candidateEffective,
    tableThreat,
    wallRemaining,
    previousRouteState: routeState
  });
  const routeGain = afterRouteState.routeScores[0].score - routeState.routeScores[0].score;
  const speedGain = (passShanten - candidateShanten) * 3 + (candidateEffective - passEffective) * 0.08;
  const isTargetSuit = !!routeState.targetSuit && claimTile.suit === routeState.targetSuit;
  const isHonorTile = isHonor(claimTile);
  const phase = routeState.phase;
  const openingMenqing = player.hand.exposedMelds.length === 0 && player.hand.concealedTiles.length >= 11;
  const committedOpenSuit = getCommittedOpenNumberSuit$1(player);
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier$1(game);
  const estimatedRound = Math.max(1, Math.floor((((_a = game.discardPile) == null ? void 0 : _a.length) || 0) / 4) + 1);
  const wildCount = routeState.features.wildCount;
  const pairHeavyPungsPush = estimatedRound <= 5 && routeState.features.pairCount >= 4;
  const upstreamRejectedSuit = routeState.features.upstreamRejectedSuit;
  const upstreamSuitCount = upstreamRejectedSuit ? getNumberSuitCount(player.hand.concealedTiles, upstreamRejectedSuit) : 0;
  const upstreamRejectedOpenPush = !!upstreamRejectedSuit && upstreamSuitCount >= 6 && isNumberSuit(claimTile.suit) && claimTile.suit === upstreamRejectedSuit;
  const noWildOpenPush = wildCount === 0;
  const multiWildMenqingPush = wildCount >= 2;
  const suitGap = Math.max(0, routeState.features.longestSuitCount - routeState.features.shortestSuitCount);
  const honorPengPush = action === ActionType.PENG && isHonorTile && (routeState.current === "ALL_PUNGS" || routeState.current === "HONOR_HEAVY" || routeState.features.honorPairCount >= 1 || routeState.features.tripletCount >= 1);
  const shortestSuitChow = action === ActionType.CHOW && !!routeState.features.shortestSuit && claimTile.suit === routeState.features.shortestSuit;
  const shortSuitGapTrap = shortestSuitChow && suitGap >= 4 && routeState.features.longestSuitCount >= 6;
  if (shortSuitGapTrap && (candidateShanten >= passShanten || candidateEffective <= passEffective + 2 || !noWildOpenPush && effectiveGlobalMultiplier < 4)) {
    return { allowed: false, tuneDelta: -2.2, reason: "shortest_suit_gap_chow_blocked" };
  }
  if (shortestSuitChow && candidateShanten >= passShanten && candidateEffective <= passEffective) {
    return { allowed: false, tuneDelta: -1.9, reason: "shortest_suit_chow_blocked" };
  }
  if (committedOpenSuit && action === ActionType.CHOW && claimTile.suit !== committedOpenSuit) {
    return { allowed: false, tuneDelta: -1.6, reason: "off_route_open_suit_chow" };
  }
  if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0) {
    const bestSuit2 = getBestNumberSuit(player.hand.concealedTiles, routeState);
    const bestSuitCount2 = bestSuit2 ? getNumberSuitCount(player.hand.concealedTiles, bestSuit2) : 0;
    const claimSuitCount = isNumberSuit(claimTile.suit) ? getNumberSuitCount(player.hand.concealedTiles, claimTile.suit) : 0;
    const pairCount = countPairs$1(player.hand.concealedTiles);
    const canRelaxFirstChowGate = noWildOpenPush || effectiveGlobalMultiplier >= 4 || upstreamRejectedOpenPush || wildCount === 1 && bestSuit2 !== null && claimTile.suit === bestSuit2 && bestSuitCount2 >= 6;
    const requiredBestSuitTiles = multiWildMenqingPush ? 6 : canRelaxFirstChowGate ? 4 : 5;
    if (!bestSuit2 || bestSuitCount2 < requiredBestSuitTiles) {
      return { allowed: false, tuneDelta: -1.3, reason: "first_chow_requires_five_tiles" };
    }
    if (claimTile.suit !== bestSuit2) {
      return { allowed: false, tuneDelta: -1.7, reason: "first_chow_must_follow_best_suit" };
    }
    if (!pairHeavyPungsPush && pairCount >= 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 2) {
      return { allowed: false, tuneDelta: -2, reason: "first_chow_breaks_pair_heavy_shape" };
    }
    if (!upstreamRejectedOpenPush && bestSuitCount2 >= claimSuitCount + 4 && candidateShanten >= passShanten && candidateEffective <= passEffective + 1) {
      return { allowed: false, tuneDelta: -1.9, reason: "first_chow_abandons_long_suit" };
    }
    if (!canRelaxFirstChowGate && breaksCoreStructure(player.hand.concealedTiles, candidateHand)) {
      return { allowed: false, tuneDelta: -1.9, reason: "first_chow_breaks_core_structure" };
    }
  }
  const bestSuit = getBestNumberSuit(player.hand.concealedTiles, routeState);
  const bestSuitCount = bestSuit ? getNumberSuitCount(player.hand.concealedTiles, bestSuit) : 0;
  if (action === ActionType.CHOW && bestSuit && isNumberSuit(claimTile.suit) && claimTile.suit !== bestSuit && bestSuitCount >= 7 && candidateShanten >= passShanten && candidateEffective <= passEffective + 1) {
    return { allowed: false, tuneDelta: -1.7, reason: "off_route_chow_from_long_suit_hand" };
  }
  switch (routeState.current) {
    case "MENQING_SPEED": {
      if (honorPengPush && candidateShanten <= passShanten && candidateEffective + 2 >= passEffective) {
        return { allowed: true, tuneDelta: 0.65 + routeGain * 0.05, reason: "honor_peng_push" };
      }
      const canBreakForSpeed = candidateShanten < passShanten || phase === "RUSH" && candidateShanten <= passShanten && candidateEffective >= passEffective - 1 || tableThreat >= 0.82 && candidateShanten <= passShanten && speedGain >= 0 || effectiveGlobalMultiplier >= 4 && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective || noWildOpenPush && candidateShanten <= passShanten && candidateEffective + (action === ActionType.CHOW ? 1 : 0) >= passEffective || upstreamRejectedOpenPush && candidateShanten <= passShanten && candidateEffective + 1 >= passEffective || pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG);
      const openingBreakNeeds = candidateShanten < passShanten || candidateEffective >= passEffective + (action === ActionType.CHOW ? 3 : 6) || speedGain >= (action === ActionType.CHOW ? 0.8 : 1.5) || routeGain >= (isHonorTile ? 1 : 0.65) || effectiveGlobalMultiplier >= 4 || noWildOpenPush && (action === ActionType.PENG || candidateEffective >= passEffective + 1) || upstreamRejectedOpenPush || pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG);
      const canBreakOpeningMenqing = openingMenqing ? multiWildMenqingPush ? openingBreakNeeds && effectiveGlobalMultiplier >= 4 : openingBreakNeeds : canBreakForSpeed;
      if (action === ActionType.CHOW && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing) {
        return { allowed: false, tuneDelta: -1.5, reason: "menqing_hold_chow" };
      }
      if ((action === ActionType.PENG || action === ActionType.KONG) && player.hand.exposedMelds.length === 0 && !canBreakOpeningMenqing) {
        return { allowed: false, tuneDelta: -1.2, reason: "menqing_hold_pung" };
      }
      let tuneDelta = canBreakOpeningMenqing ? 0.35 + routeGain * 0.04 : -0.15;
      if (effectiveGlobalMultiplier >= 4) tuneDelta += 0.4 + (effectiveGlobalMultiplier - 4) * 0.08;
      if (noWildOpenPush) tuneDelta += 0.28;
      if (upstreamRejectedOpenPush) tuneDelta += 0.32;
      if (pairHeavyPungsPush && (action === ActionType.PENG || action === ActionType.KONG)) tuneDelta += 0.5;
      if (multiWildMenqingPush && openingMenqing) tuneDelta -= 0.18;
      return { allowed: true, tuneDelta, reason: "menqing_speed" };
    }
    case "OPEN_SPEED":
      return {
        allowed: true,
        tuneDelta: 0.48 + Math.max(0, speedGain) * 0.1 + (action === ActionType.CHOW ? 0.2 : 0.12) + (committedOpenSuit && claimTile.suit === committedOpenSuit ? 0.35 : 0),
        reason: "open_speed_push"
      };
    case "HALF_FLUSH":
      if (!isHonorTile && routeState.targetSuit && claimTile.suit !== routeState.targetSuit) {
        return { allowed: false, tuneDelta: -1.6, reason: "off_route_half_flush" };
      }
      if (isHonorTile && routeState.features.pureFlushUpgradeReady && routeState.features.weakHonorPairCount >= 1 && candidateShanten >= passShanten && candidateEffective <= passEffective + 1) {
        return { allowed: false, tuneDelta: -1.5, reason: "pure_flush_upgrade_blocks_honor_claim" };
      }
      return {
        allowed: true,
        tuneDelta: (isTargetSuit ? 0.72 : 0.28) + routeGain * 0.06 + (routeState.features.pureFlushUpgradeReady && isTargetSuit ? 0.42 : 0) + ((policy == null ? void 0 : policy.hunPengPursuit) || 0) * (routeState.features.honorPairCount >= 1 && isTargetSuit ? 0.18 : 0) + ((policy == null ? void 0 : policy.qingPengPursuit) || 0) * (routeState.features.secondSuitCount === 0 && isTargetSuit ? 0.12 : 0),
        reason: isTargetSuit ? routeState.features.pureFlushUpgradeReady ? "pure_flush_upgrade_target_claim" : "target_suit_claim" : "honor_support_claim"
      };
    case "ALL_PUNGS":
      if (action === ActionType.CHOW) {
        return { allowed: false, tuneDelta: -2, reason: "all_pungs_blocks_chow" };
      }
      return {
        allowed: true,
        tuneDelta: 0.55 + (action === ActionType.KONG ? 0.18 : 0.12) + routeGain * 0.04 + ((policy == null ? void 0 : policy.qingPengPursuit) || 0) * (routeState.features.secondSuitCount === 0 ? 0.14 : 0) + ((policy == null ? void 0 : policy.hunPengPursuit) || 0) * (routeState.features.honorPairCount >= 1 ? 0.16 : 0),
        reason: "all_pungs_claim"
      };
    case "HONOR_HEAVY":
      if (action === ActionType.CHOW) {
        return { allowed: false, tuneDelta: -2, reason: "honor_heavy_blocks_chow" };
      }
      if (!isHonorTile) {
        return { allowed: false, tuneDelta: -1.4, reason: "number_claim_breaks_honor_heavy" };
      }
      return {
        allowed: true,
        tuneDelta: 0.7 + routeGain * 0.05 + ((policy == null ? void 0 : policy.allHonorsPursuit) || 0) * 0.18 + ((policy == null ? void 0 : policy.allHonorsPungsPursuit) || 0) * 0.12,
        reason: "honor_claim_push"
      };
  }
  if (isNumberSuit(claimTile.suit)) {
    return { allowed: true, tuneDelta: routeGain * 0.03, reason: "default_number_claim" };
  }
  return { allowed: true, tuneDelta: routeGain * 0.02, reason: "default_claim" };
}

let _pipelineEngine = null;
async function getPipelineEngine() {
  return _pipelineEngine;
}
async function shadowEvaluate(player, availableActions, game) {
  var _a, _b, _c, _d;
  const engine = await getPipelineEngine();
  if (!engine) return;
  if (!PIPELINE_SHADOW_MODE) return;
  const PIPELINE_LOG_BREAKDOWN = process.env.PIPELINE_LOG_BREAKDOWN === "true";
  try {
    const ctx = engine.buildActionContext(game, player.id, availableActions, game.turnIndex);
    const ranked = engine.evaluateAllActions(ctx);
    const bestAction = (_b = (_a = ranked[0]) == null ? void 0 : _a.action) != null ? _b : "PASS";
    const bestScore = (_d = (_c = ranked[0]) == null ? void 0 : _c.score) != null ? _d : 0;
    if (PIPELINE_LOG_BREAKDOWN) {
      console.log(
        `[PIPELINE_SHADOW] ${player.name} actions=`,
        ranked.map((r) => `${r.action}:${r.score.toFixed(2)}`).join(" | "),
        ` | best=${bestAction}(${bestScore.toFixed(2)})`,
        ` | fv=shanten=${ctx.fv.shanten} eff=${ctx.fv.effectiveTiles} menqing=${ctx.fv.isMenqing} baidaLock=${ctx.fv.baidaLockTurns}`
      );
    } else {
      console.log(`[PIPELINE_SHADOW] ${player.name} best=${bestAction}(${bestScore.toFixed(2)})`);
    }
  } catch (e) {
  }
}
function sigmoid(x, temperature = 1) {
  return 1 / (1 + Math.exp(-x / temperature));
}
function chanceToLogit(chance) {
  const c = Math.min(0.95, Math.max(0.05, chance));
  return Math.log(c / (1 - c));
}
function softScoreWins(s, best, baseChance, temperature = 1) {
  s = { ...s, shanten: (s.shanten - best.shanten) * 1.2 };
  const scoreDiff = (-s.shanten - 0) * 1 + // shanten越低越好
  (s.effective - best.effective) * 1 + // effective进张（与tune同等权重）
  (s.tune - best.tune) * 1;
  const priorDiff = chanceToLogit(baseChance);
  const p = sigmoid(scoreDiff + priorDiff, temperature);
  return Math.random() < p;
}
let _policies = {};
let _policySources = {};
function usesOfficialRouteStrategy(_botName) {
  return USE_OFFICIAL_ROUTE_BOT_PATH;
}
function resolvePolicyBotName(botName) {
  return botName;
}
function getPlayerRouteMemory(player) {
  return player.__routeStateMemory || null;
}
function setPlayerRouteMemory(player, routeState) {
  player.__routeStateMemory = routeState;
}
function getLiveRouteMetricPolicy(policy) {
  var _a, _b, _c, _d;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return {
    menqingHoldTurns: clamp(Number((_a = policy == null ? void 0 : policy.menqingHoldTurns) != null ? _a : 4), 2, 8),
    forcedOpenRate: clamp(Number((_b = policy == null ? void 0 : policy.forcedOpenRate) != null ? _b : 0.28), 0.05, 0.7),
    deadHandRate: clamp(Number((_c = policy == null ? void 0 : policy.deadHandRate) != null ? _c : 0.2), 0.05, 0.7),
    tingQuality: clamp(Number((_d = policy == null ? void 0 : policy.tingQuality) != null ? _d : 4), 1, 8)
  };
}
function getEffectiveGlobalMultiplier(game) {
  var _a, _b, _c;
  return Math.min(
    ((_b = (_a = game == null ? void 0 : game.inheritMultiplier) != null ? _a : game == null ? void 0 : game.inheritedGlobalMultiplier) != null ? _b : 1) * ((_c = game == null ? void 0 : game.roundMultiplier) != null ? _c : 1),
    8
  );
}
function shouldDeclineLowValueHu(game, player) {
  var _a;
  const pendingDiscard = game.pendingActions.find((pa) => pa.type === "discard" && pa.playerId === player.id) || game.pendingActions.find((pa) => pa.type === "discard" && pa.playerId !== player.id);
  const discardTile = pendingDiscard == null ? void 0 : pendingDiscard.tile;
  if (!discardTile) return false;
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game);
  const huTableThreat = estimateTableThreat(game, player.id);
  const topOpponentScore = Math.max(...game.players.filter((p) => p.id !== player.id).map((p) => {
    var _a2;
    return (_a2 = p.score) != null ? _a2 : 0;
  }), 0);
  const scoreLead2 = ((_a = player.score) != null ? _a : 0) - topOpponentScore;
  const wildCount = player.hand.concealedTiles.filter((t) => isWildTile(t, game)).length;
  const isWildDiscard = isWildTile(discardTile, game);
  const isMenQing = player.hand.exposedMelds.length === 0;
  const likelyLowValueHu = !isMenQing && !isWildDiscard && effectiveGlobalMultiplier <= 2 && wildCount <= 1;
  return huTableThreat >= 0.9 && scoreLead2 >= 800 && likelyLowValueHu;
}
function estimateRouteExpectedFan(routeState, player, game, winningTiles) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const policy = (_a = routeState == null ? void 0 : routeState.policy) != null ? _a : getPolicyForPlayer(player);
  const exposedCount = player.hand.exposedMelds.length;
  const effectiveGlobalMultiplier = getEffectiveGlobalMultiplier(game);
  const longestSuitCount = ((_b = routeState == null ? void 0 : routeState.features) == null ? void 0 : _b.longestSuitCount) || 0;
  const secondSuitCount = ((_c = routeState == null ? void 0 : routeState.features) == null ? void 0 : _c.secondSuitCount) || 0;
  const honorCount = ((_d = routeState == null ? void 0 : routeState.features) == null ? void 0 : _d.honorCount) || 0;
  const honorPairCount = ((_e = routeState == null ? void 0 : routeState.features) == null ? void 0 : _e.honorPairCount) || 0;
  const tripletCount = ((_f = routeState == null ? void 0 : routeState.features) == null ? void 0 : _f.tripletCount) || 0;
  const wildCount = ((_g = routeState == null ? void 0 : routeState.features) == null ? void 0 : _g.wildCount) || 0;
  const handQuality = longestSuitCount >= 7 ? 7 : longestSuitCount >= 6 ? 6 : longestSuitCount >= 5 ? 5 : 0;
  const multPrefix = effectiveGlobalMultiplier >= 4 ? "multHigh" : "multLow";
  const multPureFlushBoost = handQuality >= 6 ? Number((_h = policy == null ? void 0 : policy[`${multPrefix}Hand${handQuality}PureFlush`]) != null ? _h : 0) : 0;
  const multHalfFlushBoost = handQuality >= 5 ? Number((_i = policy == null ? void 0 : policy[`${multPrefix}Hand${handQuality}HalfFlush`]) != null ? _i : 0) : 0;
  const multAllPungsBoost = handQuality >= 5 ? Number((_j = policy == null ? void 0 : policy[`${multPrefix}Hand${handQuality}AllPungs`]) != null ? _j : 0) : 0;
  const qingPengReady = longestSuitCount >= 8 && secondSuitCount === 0 && honorCount <= 2;
  const hunPengReady = longestSuitCount >= 6 && honorCount >= 2 && secondSuitCount <= 1;
  let fan = exposedCount === 0 ? 2.2 : 0.8;
  switch (routeState == null ? void 0 : routeState.current) {
    case "HALF_FLUSH":
      fan += ((_k = routeState == null ? void 0 : routeState.features) == null ? void 0 : _k.pureFlushUpgradeReady) ? 8.5 : 4.8;
      fan += ((policy == null ? void 0 : policy.halfFlushWeight) || 0) * 1.8;
      fan += ((policy == null ? void 0 : policy.pureFlushPursuit) || 0) * Math.max(0, longestSuitCount - 6) * 0.3;
      fan += multHalfFlushBoost * 2.2 + multPureFlushBoost * (((_l = routeState == null ? void 0 : routeState.features) == null ? void 0 : _l.pureFlushUpgradeReady) ? 2.4 : 0.8);
      fan += ((policy == null ? void 0 : policy.hunPengPursuit) || 0) * (hunPengReady ? 1.8 : 0);
      fan += ((policy == null ? void 0 : policy.qingPengPursuit) || 0) * (qingPengReady ? 1.4 : 0);
      break;
    case "ALL_PUNGS":
      fan += 4.2 + Math.max(0, (((_m = routeState == null ? void 0 : routeState.features) == null ? void 0 : _m.tripletCount) || 0) - 1) * 0.35;
      fan += ((policy == null ? void 0 : policy.allPungsPursuit) || 0) * 1.8;
      fan += multAllPungsBoost * 2.4;
      fan += ((policy == null ? void 0 : policy.qingPengPursuit) || 0) * (qingPengReady ? 2.1 : 0);
      fan += ((policy == null ? void 0 : policy.hunPengPursuit) || 0) * (hunPengReady ? 2 : 0);
      break;
    case "HONOR_HEAVY":
      fan += 4.6 + Math.max(0, honorPairCount - 1) * 0.45;
      fan += ((policy == null ? void 0 : policy.allHonorsPursuit) || 0) * 2.8;
      fan += ((policy == null ? void 0 : policy.allHonorsPungsPursuit) || 0) * Math.max(1, honorPairCount + tripletCount * 0.6);
      break;
    case "OPEN_SPEED":
      fan += 1.4;
      break;
    default:
      fan += 1.8;
      break;
  }
  if ((((_n = routeState == null ? void 0 : routeState.features) == null ? void 0 : _n.wildCount) || 0) === 0) fan += 0.6;
  if (wildCount === 1) fan += ((policy == null ? void 0 : policy.wild1RouteFlushBoost) || 0) * ((routeState == null ? void 0 : routeState.current) === "HALF_FLUSH" ? 0.8 : 0.2);
  if (wildCount === 2) fan += ((policy == null ? void 0 : policy.wild2RouteFlushBoost) || 0) * ((routeState == null ? void 0 : routeState.current) === "HALF_FLUSH" ? 1.1 : 0.2);
  if (wildCount >= 3) fan += ((policy == null ? void 0 : policy.wild3RouteFlushBoost) || 0) * ((routeState == null ? void 0 : routeState.current) === "HALF_FLUSH" ? 1.2 : 0.25);
  if (winningTiles >= 12) fan += 0.5;
  else if (winningTiles <= 5) fan -= 0.4;
  fan += Math.max(0, effectiveGlobalMultiplier - 1) * 0.45;
  return Math.max(1, fan);
}
function estimateTingDecisionValue(input) {
  var _a;
  const { routeState, player, game, winningTiles, discardDanger, tableThreat, scoreLead: scoreLead2 } = input;
  const policy = (_a = routeState == null ? void 0 : routeState.policy) != null ? _a : getPolicyForPlayer(player);
  const expectedFan = estimateRouteExpectedFan(routeState, player, game, winningTiles);
  const tsumoValue = expectedFan * (player.hand.exposedMelds.length === 0 ? 1.45 : 1.1) + winningTiles * 0.08;
  const ronValue = expectedFan * ((routeState == null ? void 0 : routeState.current) === "HALF_FLUSH" ? 1.3 : 1.05) + winningTiles * 0.04;
  const safetyPreference = ((policy == null ? void 0 : policy.safeTilePriority) || 0) + ((policy == null ? void 0 : policy.wallLateDefense) || 0) * 0.6;
  const defensePreference = ((policy == null ? void 0 : policy.defenseRiskAversion) || 0) + ((policy == null ? void 0 : policy.oppTingDetection) || 0) * 0.4;
  const riskCost = discardDanger * (1.4 + tableThreat * (scoreLead2 > 1e3 ? 6.4 : 4.2) + safetyPreference * 1.8 + defensePreference * 2.1 + (scoreLead2 < -800 ? 0.4 : 0));
  return tsumoValue + ronValue - riskCost;
}
function estimateNearTingDecisionValue(input) {
  var _a;
  const { routeState, player, game, shanten, effective, winningTiles, tableThreat, scoreLead: scoreLead2 } = input;
  const policy = (_a = routeState == null ? void 0 : routeState.policy) != null ? _a : getPolicyForPlayer(player);
  const expectedFan = estimateRouteExpectedFan(routeState, player, game, Math.max(winningTiles, Math.floor(effective / 2)));
  if (shanten === 0) {
    return estimateTingDecisionValue({
      routeState,
      player,
      game,
      winningTiles,
      discardDanger: tableThreat * 0.35,
      tableThreat,
      scoreLead: scoreLead2
    });
  }
  return expectedFan * (1.1 + ((policy == null ? void 0 : policy.speedVsValueBalance) || 0) * 0.12) + effective * 0.08 - tableThreat * ((scoreLead2 > 1e3 ? 2.1 : 1.5) + ((policy == null ? void 0 : policy.safeTilePriority) || 0) * 0.7 + ((policy == null ? void 0 : policy.defenseRiskAversion) || 0) * 0.8);
}
function tuneLiveClaimPolicy(policy) {
  const tuned = { ...policy || {} };
  const raise = (key, value) => {
    var _a;
    tuned[key] = Math.max(Number((_a = tuned[key]) != null ? _a : 0), value);
  };
  const lower = (key, value) => {
    var _a;
    tuned[key] = Math.min(Number((_a = tuned[key]) != null ? _a : value), value);
  };
  raise("pengChance", 0.9);
  raise("chowChance", 0.92);
  raise("kongChance", 0.72);
  raise("minkanAggression", 0.75);
  raise("speedVsValueBalance", 0.78);
  raise("wallEarlySpeedPush", 0.82);
  raise("wallMidBalance", 0.72);
  raise("wild0Aggression", 0.55);
  raise("wild1Aggression", 0.62);
  raise("wild2Aggression", 0.75);
  raise("menqingHoldTurns", 4);
  raise("forcedOpenRate", 0.28);
  raise("deadHandRate", 0.2);
  raise("tingQuality", 4);
  lower("menqingKeepBonus", 0.35);
  lower("defenseRiskAversion", 0.16);
  lower("wallLateDefense", 0.25);
  lower("safeTilePriority", 0.24);
  lower("oppTingDetection", 0.18);
  lower("bao2ClaimPenalty", 0.25);
  lower("bao3AvoidThreshold", 0.35);
  lower("baoRiskAversion", 0.3);
  lower("baoSelfClaimCaution", 0.18);
  lower("allPungsPursuit", 0.35);
  lower("pureFlushPursuit", 0.45);
  lower("halfFlushWeight", 0.45);
  return tuned;
}
function loadPolicyFile(cacheKey, filePath, logLabel) {
  const stat = fs.statSync(filePath);
  const cachedSource = _policySources[cacheKey];
  if (_policies[cacheKey] && cachedSource && cachedSource.path === filePath && cachedSource.mtimeMs === stat.mtimeMs) {
    return _policies[cacheKey];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  const policy = data.policy || data;
  _policies[cacheKey] = policy;
  _policySources[cacheKey] = { path: filePath, mtimeMs: stat.mtimeMs };
  console.log(`[BotService] Loaded policy for ${logLabel}:`, policy.id || "character");
  return policy;
}
function loadCharacterPolicy(botName) {
  var _a;
  const resolvedBotName = resolvePolicyBotName(botName);
  const characterPaths = [
    path$1.resolve(process.cwd(), `AI_policies/characters/${resolvedBotName}.json`),
    path$1.resolve(process.cwd(), `training-output/policies/characters/${resolvedBotName}.json`),
    path$1.resolve(process.cwd(), `../../AI_policies/characters/${resolvedBotName}.json`)
  ];
  for (const p of characterPaths) {
    if (fs.existsSync(p)) {
      try {
        const policy = loadPolicyFile(resolvedBotName, p, resolvedBotName);
        _policies[botName] = policy;
        _policySources[botName] = _policySources[resolvedBotName];
        return policy;
      } catch (err) {
        console.warn(`[BotService] Failed to parse ${p}:`, err.message);
      }
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const data = JSON.parse(raw);
        _policies[resolvedBotName] = data.policy || data;
        _policies[botName] = _policies[resolvedBotName];
        console.log(`[BotService] \u2705 Loaded policy for ${resolvedBotName}:`, _policies[resolvedBotName].id || "character");
        return _policies[botName];
      } catch (err) {
        console.warn(`[BotService] \u26A0\uFE0F Failed to parse ${p}:`, err.message);
      }
    }
  }
  const defaultPaths = [
    path$1.resolve(process.cwd(), "AI_policies/best-policy.json"),
    path$1.resolve(process.cwd(), "training-output/best-policy.json"),
    path$1.resolve(process.cwd(), "training/best-policy.json"),
    path$1.resolve(process.cwd(), "../../AI_policies/best-policy.json"),
    path$1.resolve(process.cwd(), "../../training-output/best-policy.json")
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      try {
        loadPolicyFile("default", p, "default");
        break;
      } catch (err) {
        console.warn(`[BotService] Failed to parse ${p}:`, err.message);
      }
    }
  }
  if (!_policies["default"]) {
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, "utf-8");
          const data = JSON.parse(raw);
          _policies["default"] = data.policy || data;
          console.log(`[BotService] \u2705 Loaded default policy:`, _policies["default"].id || "best");
          break;
        } catch (err) {
          console.warn(`[BotService] \u26A0\uFE0F Failed to parse ${p}:`, err.message);
        }
      }
    }
    if (!_policies["default"]) {
      _policies["default"] = {
        id: "fallback",
        selfWinChance: 0.95,
        discardHuChance: 0.7,
        discardHuWildPenalty: 0.3,
        discardHuMenQingPenalty: 0.1,
        pengChance: 0.6,
        kongChance: 0.5,
        chowChance: 0.65,
        chowWildPenalty: 0.05,
        menqingKeepBonus: 0.3,
        // 门清执念：降低意愿，AI更愿意吃牌做牌
        allPungsPursuit: 0,
        // 碰碰胡追求：越高越不愿吃顺
        pureFlushPursuit: 0,
        halfFlushWeight: 0,
        wildKeepPenalty: 0,
        dominantSuitBonus: 3,
        tripletKeepBonus: 1,
        pairWeight: 8,
        nearWeight: 0.8,
        honorPairBonus: 0,
        honorRushThreshold: 8,
        honorRushBoost: 0.2,
        bailoutHuPenaltyPerMeld: 0.01
      };
      _policies["default"] = tuneLiveClaimPolicy(_policies["default"]);
      console.log("[BotService] \u26A0\uFE0F Using hardcoded fallback policy");
    }
  }
  _policies[resolvedBotName] = _policies["default"];
  _policySources[resolvedBotName] = _policySources["default"];
  _policies[botName] = _policies["default"];
  _policySources[botName] = _policySources["default"];
  console.log(`[BotService] policy id for ${botName}: ${((_a = _policies[botName]) == null ? void 0 : _a.id) || "unknown"}`);
  return _policies[botName];
}
function getPolicyForPlayer(player) {
  return loadCharacterPolicy(player.name);
}
function isBotPlayer(player) {
  return player.name.startsWith("AI-") || player.name.startsWith("\u7535\u8111");
}
function getWildTileType(game) {
  if (!game.customScoringMode) return null;
  const parts = game.customScoringMode.split("-");
  if (parts.length < 2) return null;
  return { suit: parts[0], value: parseInt(parts[1]) };
}
function isWildTile(tile, game) {
  const wildType = getWildTileType(game);
  if (!wildType) return false;
  if (tile.suit === wildType.suit && tile.value === wildType.value) return true;
  if (tile.suit === TileSuit.FLOWER && wildType.suit === TileSuit.FLOWER && game.wildTileGroup) {
    return game.wildTileGroup.includes(String(tile.value));
  }
  return false;
}
function isNumberTile(tile) {
  return tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS;
}
function countNearbySameSuitTiles(tile, hand) {
  if (!isNumberTile(tile)) return 0;
  return hand.filter(
    (candidate) => candidate.id !== tile.id && candidate.suit === tile.suit && Math.abs(candidate.value - tile.value) > 0 && Math.abs(candidate.value - tile.value) <= 2
  ).length;
}
function tilesMatch(a, b) {
  return a.suit === b.suit && a.value === b.value;
}
function countVisibleCopies(target, game) {
  let visible = 0;
  for (const tile of game.discardPile || []) {
    if (tilesMatch(tile, target)) visible++;
  }
  for (const player of game.players || []) {
    for (const meld of player.hand.exposedMelds || []) {
      for (const tile of meld.tiles || []) {
        if (tilesMatch(tile, target)) visible++;
      }
    }
  }
  return visible;
}
function hasWeakNumberWasteCandidate(hand, excludeTileId) {
  const groups = groupTiles(hand);
  return hand.some((candidate) => {
    var _a;
    if (candidate.id === excludeTileId || isHonor(candidate) || candidate.suit === TileSuit.FLOWER) return false;
    const candidateCount = ((_a = groups.get(`${candidate.suit}-${candidate.value}`)) == null ? void 0 : _a.length) || 0;
    if (candidateCount >= 2) return false;
    return !hand.some(
      (other) => other.id !== candidate.id && other.suit === candidate.suit && Math.abs(other.value - candidate.value) > 0 && Math.abs(other.value - candidate.value) <= 2
    );
  });
}
function countPairs(hand) {
  let pairs = 0;
  for (const tiles of groupTiles(hand).values()) {
    if (tiles.length >= 2) pairs++;
  }
  return pairs;
}
function getCommittedOpenNumberSuit(player) {
  const suits = /* @__PURE__ */ new Set();
  let numberedTileCount = 0;
  for (const meld of player.hand.exposedMelds || []) {
    for (const tile of meld.tiles || []) {
      if (!isNumberTile(tile)) continue;
      suits.add(tile.suit);
      numberedTileCount++;
    }
  }
  if (numberedTileCount < 3 || suits.size !== 1) return null;
  return [...suits][0] || null;
}
function getNumberSuitCounts(hand) {
  return [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].map((suit) => ({
    suit,
    count: hand.filter((tile) => tile.suit === suit).length
  })).filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);
}
function hasOffSuitNumberWaste(hand, committedSuit, excludeTileId) {
  return hand.some((tile) => {
    if (tile.id === excludeTileId || tile.suit === committedSuit || !isNumberTile(tile)) return false;
    const sameTileCount = hand.filter((other) => other.suit === tile.suit && other.value === tile.value).length;
    if (sameTileCount >= 2) return false;
    return !hand.some(
      (other) => other.id !== tile.id && other.suit === tile.suit && Math.abs(other.value - tile.value) > 0 && Math.abs(other.value - tile.value) <= 2
    );
  });
}
function countHonorSingletons(hand, excludeTileId) {
  const groups = groupTiles(hand);
  return hand.filter((tile) => {
    var _a;
    if (tile.id === excludeTileId || !isHonor(tile)) return false;
    return (((_a = groups.get(`${tile.suit}-${tile.value}`)) == null ? void 0 : _a.length) || 0) === 1;
  }).length;
}
function estimateOpponentThreat(opponent, game) {
  var _a, _b, _c;
  if (opponent.status !== PlayerStatus.PLAYING) return 0;
  let threat = 0;
  const discardCount = ((_a = opponent.hand.discardedTiles) == null ? void 0 : _a.length) || 0;
  const exposedCount = ((_b = opponent.hand.exposedMelds) == null ? void 0 : _b.length) || 0;
  if (opponent.isTing) threat += 1;
  if (exposedCount > 0) threat += Math.min(0.45, exposedCount * 0.16);
  if (discardCount >= 9) threat += 0.15;
  if (discardCount >= 13) threat += 0.1;
  if ((((_c = game.discardPile) == null ? void 0 : _c.length) || 0) >= 28) threat += 0.08;
  return Math.min(1, threat);
}
function estimateTableThreat(game, selfId) {
  let threat = 0;
  for (const opponent of game.players || []) {
    if (opponent.id === selfId) continue;
    threat = Math.max(threat, estimateOpponentThreat(opponent, game));
  }
  return threat;
}
function getDiscardDangerScore(tile, game, player) {
  if (isFlower(tile)) return 0;
  const visibleCopies = countVisibleCopies(tile, game);
  let baseDanger = 0.55;
  if (isHonor(tile)) baseDanger = 0.42;
  else if (tile.value === 1 || tile.value === 9) baseDanger = 0.3;
  else if (tile.value === 2 || tile.value === 8) baseDanger = 0.48;
  else baseDanger = 0.68;
  baseDanger *= Math.max(0.12, 1 - visibleCopies * 0.18);
  let danger = 0;
  for (const opponent of game.players || []) {
    if (opponent.id === player.id) continue;
    const threat = estimateOpponentThreat(opponent, game);
    if (threat <= 0) continue;
    const opponentDiscards = opponent.hand.discardedTiles || [];
    if (opponentDiscards.some((discard) => tilesMatch(discard, tile))) {
      danger += 0.04 * threat;
      continue;
    }
    let opponentFactor = 1;
    if (isHonor(tile) && opponentDiscards.length > 0) opponentFactor -= 0.1;
    if (isNumberTile(tile)) {
      const sameSuitDiscards = opponentDiscards.filter((discard) => discard.suit === tile.suit);
      if (sameSuitDiscards.some((discard) => Math.abs(discard.value - tile.value) >= 3)) {
        opponentFactor -= 0.08;
      }
    }
    danger += baseDanger * Math.max(0.2, opponentFactor) * threat;
  }
  return Math.max(0, Math.min(1, danger));
}
function scoreTileForDiscard(tile, hand, game, player, postDiscardShanten, postDiscardEffective) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const policy = getPolicyForPlayer(player);
  let score = 0;
  const phaseTileCount = hand.length;
  const isEarlyPhase = phaseTileCount >= 11;
  const isMidPhase = phaseTileCount >= 5 && phaseTileCount <= 10;
  const isLatePhase = phaseTileCount <= 4;
  const nearWeightFactor = isEarlyPhase ? 1.25 : isMidPhase ? 0.9 : 0.75;
  const pairWeightFactor = isEarlyPhase ? 0.9 : isMidPhase ? 1.25 : 1.1;
  const tripletWeightFactor = isEarlyPhase ? 0.85 : isMidPhase ? 1.2 : 1.25;
  const suitCounts = {};
  let honorCount = 0;
  for (const t of hand) {
    if (t.suit === TileSuit.FLOWER) continue;
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1;
    if (isWind(t) || isDragon(t)) honorCount++;
  }
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const dominantNumberSuit = numberSuits.filter((s) => (suitCounts[s] || 0) > 0).sort((a, b) => (suitCounts[b] || 0) - (suitCounts[a] || 0))[0] || null;
  const dominantNumberSuitCount = dominantNumberSuit ? suitCounts[dominantNumberSuit] || 0 : 0;
  const honorFocus = honorCount >= 6;
  const handQuality = dominantNumberSuitCount >= 7 ? 7 : dominantNumberSuitCount >= 6 ? 6 : dominantNumberSuitCount >= 5 ? 5 : 0;
  const handRouteBias = handQuality >= 7 ? policy.hand7RouteBias || 0.9 : handQuality >= 6 ? policy.hand6RouteBias || 0.6 : handQuality >= 5 ? policy.hand5RouteBias || 0.3 : 0;
  const phaseFactor = isEarlyPhase ? 0.35 : isMidPhase ? 0.75 : 1;
  const routeBiasFactor = Math.max(phaseFactor, handRouteBias);
  const groups = groupTiles(hand);
  const tileKey2 = `${tile.suit}-${tile.value}`;
  const sameTypeCount = ((_a = groups.get(tileKey2)) == null ? void 0 : _a.length) || 0;
  const isOfficialOpening = usesOfficialRouteStrategy(player.name) && isEarlyPhase;
  const tableThreat = estimateTableThreat(game, player.id);
  const discardDanger = getDiscardDangerScore(tile, game, player);
  if (isWildTile(tile, game)) {
    let remainingWilds = 0;
    for (const t of hand) {
      if (t !== tile && isWildTile(t, game)) remainingWilds++;
    }
    const wildAggression = remainingWilds === 0 ? policy.wild0Aggression || 0.3 : remainingWilds === 1 ? policy.wild1Aggression || 0.5 : remainingWilds === 2 ? policy.wild2Aggression || 0.7 : policy.wild3PlusAggression || 0.9;
    const penalty = policy.wildKeepPenalty * (1.3 - wildAggression * 0.5);
    const hardKeepFloor = remainingWilds === 0 ? 140 : 220 + remainingWilds * 40;
    score -= Math.max(penalty, hardKeepFloor);
    return score;
  }
  if (isHonor(tile)) {
    if (sameTypeCount >= 2) {
      let pairBase = policy.pairWeight * pairWeightFactor * policy.honorPairBonus;
      if (isWind(tile)) {
        if (tile.value === 1) pairBase *= policy.windEastKeep || 1;
        else if (tile.value === 2) pairBase *= policy.windSouthKeep || 1;
        else if (tile.value === 3) pairBase *= policy.windWestKeep || 1;
        else if (tile.value === 4) pairBase *= policy.windNorthKeep || 1;
        pairBase *= policy.windGeneralKeep || 1;
        pairBase += policy.windDragonPairKeepBonus || 0;
      }
      if (isDragon(tile)) {
        if (tile.value === 1) pairBase *= policy.dragonRedKeep || 1;
        else if (tile.value === 2) pairBase *= policy.dragonGreenKeep || 1;
        else if (tile.value === 3) pairBase *= policy.dragonWhiteKeep || 1;
        pairBase *= policy.dragonGeneralKeep || 1;
      }
      if (sameTypeCount >= 3) {
        pairBase += policy.honorTripletKeepBonus || 0;
      }
      score -= pairBase;
    } else {
      score += 5;
      if (isOfficialOpening) {
        const hasWeakNumberWaste = hasWeakNumberWasteCandidate(hand, tile.id);
        score += hasWeakNumberWaste ? -7.2 : -0.8;
      }
      if (honorFocus && (policy.allHonorsPungsPursuit || 0) > 0) {
        score -= (policy.allHonorsPungsPursuit || 0) * 2;
      }
    }
    return score;
  }
  if (sameTypeCount >= 3) {
    score -= policy.tripletKeepBonus * tripletWeightFactor * 3;
  } else if (sameTypeCount >= 2) {
    score -= policy.pairWeight * pairWeightFactor;
  }
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    const value = tile.value;
    const suit = tile.suit;
    for (const v of [value - 1, value - 2, value + 1, value + 2]) {
      if (v >= 1 && v <= 9) {
        const key = `${suit}-${v}`;
        if (groups.has(key)) {
          score -= policy.nearWeight * nearWeightFactor;
        }
      }
    }
  }
  const maxSuitCount = Object.values(suitCounts).length > 0 ? Math.max(...Object.values(suitCounts)) : 0;
  const dominantSuit = Object.keys(suitCounts).find((s) => suitCounts[s] === maxSuitCount);
  if (dominantSuit && maxSuitCount >= policy.honorRushThreshold) {
    if (tile.suit !== dominantSuit && tile.suit !== TileSuit.FLOWER) {
      score += policy.dominantSuitBonus * routeBiasFactor;
    }
  }
  if (dominantNumberSuit && dominantNumberSuitCount >= 6) {
    if (tile.suit === dominantNumberSuit) score -= 2 * routeBiasFactor;
    else if (!isHonor(tile) && tile.suit !== TileSuit.FLOWER) score += 2 * routeBiasFactor;
  }
  if (honorFocus) {
    if (isWind(tile) || isDragon(tile)) score -= 2 * routeBiasFactor;
    else if (tile.suit !== TileSuit.FLOWER) score += 2 * routeBiasFactor;
  }
  if (sameTypeCount >= 2) score -= 1 * routeBiasFactor;
  if (!isHonor(tile) && sameTypeCount < 2) {
    score += 0.6 * routeBiasFactor;
  }
  if (isLatePhase) {
    const dangerPenalty = isHonor(tile) ? 0.15 : 0.45;
    score += dangerPenalty;
  }
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    if (tile.value === 1 || tile.value === 9) {
      score += policy.terminalPenalty || 0.638;
    }
  }
  if (isEarlyPhase) {
    score += (policy.wallEarlySpeedPush || 0) * 0.5;
  }
  if (isMidPhase) {
    score += (policy.wallMidBalance || 0) * 0.5;
  }
  if (isLatePhase) {
    score += (policy.safeTilePriority || 0) * 0.5;
    score += (policy.defenseRiskAversion || 0) * 0.3;
    score += (policy.wallLateDefense || 0) * 0.4;
  }
  const threatScale = Math.max(
    isLatePhase ? 0.7 : 0.25,
    tableThreat * ((policy.oppTingDetection || 0) * 0.9 + (policy.wallLateDefense || 0) * 0.4 + 0.35)
  );
  const safetyBonus = (1 - discardDanger) * ((policy.safeTilePriority || 0) * 1.8 + (policy.wallLateDefense || 0) * 0.8);
  const threatPenalty = discardDanger * ((policy.defenseRiskAversion || 0) * 3.2 + (policy.oppTingDetection || 0) * 2.2 + 0.4);
  score += safetyBonus * threatScale;
  score -= threatPenalty * threatScale;
  const playerScore = (_b = player.score) != null ? _b : 0;
  const dealerScore = (_c = game.dealerScore) != null ? _c : playerScore;
  const scoreDiff = playerScore - dealerScore;
  if (scoreDiff < -1e3 && ((_d = policy.scoreBehindRiskBoost) != null ? _d : 0) > 0) {
    const riskFactor = Math.min(1, Math.abs(scoreDiff) / 5e3);
    score += (((_e = policy.scoreBehindRiskBoost) != null ? _e : 1) - 1) * riskFactor * 1.5;
  }
  if (scoreDiff > 1e3 && ((_f = policy.scoreLeadDefenseBoost) != null ? _f : 0) > 0) {
    const leadFactor = Math.min(1, scoreDiff / 5e3);
    score += (((_g = policy.scoreLeadDefenseBoost) != null ? _g : 1) - 1) * leadFactor * 0.5;
  }
  if (scoreDiff < -1e3 && tableThreat < 0.6) {
    const chaseBoost = Math.min(1, Math.abs(scoreDiff) / 6e3);
    score += chaseBoost * Math.max(0, 0.75 - discardDanger) * 0.8;
  }
  if (isWildTile(tile, game) && (policy.wildDefenseKeep || 0) > 0) {
    score -= (policy.wildDefenseKeep || 0) * 0.5;
  }
  if (game.discardPile && (policy.discardObsFlushBoost || 0) > 0) {
    const discardPile = game.discardPile;
    const discardCounts = {};
    for (const d of discardPile) {
      if (d.suit !== TileSuit.FLOWER && d.suit !== TileSuit.WIND && d.suit !== TileSuit.DRAGON) {
        discardCounts[d.suit] = (discardCounts[d.suit] || 0) + 1;
      }
    }
    const dominantDiscardSuit = (_h = Object.entries(discardCounts).sort((a, b) => b[1] - a[1])[0]) == null ? void 0 : _h[0];
    const dominantDiscardCount = dominantDiscardSuit ? discardCounts[dominantDiscardSuit] || 0 : 0;
    if (dominantDiscardCount >= 5 && dominantDiscardSuit && tile.suit === dominantDiscardSuit) {
      score -= (policy.discardObsFlushBoost || 0) * (policy.discardObsWeight || 0) * routeBiasFactor;
    }
  }
  if (((_i = policy.speedVsValueBalance) != null ? _i : 0.5) > 0.5) {
    const speedFactor = (policy.speedVsValueBalance - 0.5) * 2;
    const sameSuitTiles = hand.filter(
      (t) => t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    );
    const neighbors = sameSuitTiles.filter((t) => Math.abs(t.value - tile.value) <= 2);
    if (neighbors.length === 0) score += speedFactor * 3;
    else if (neighbors.length >= 2) score += speedFactor * 1;
  }
  const roundMult = (_j = game.roundMultiplier) != null ? _j : 1;
  const inheritMult = (_k = game.inheritMultiplier) != null ? _k : 1;
  const globalMult = Math.max(roundMult, inheritMult);
  const multHighSpeedBias = (_l = policy.multHighSpeedBias) != null ? _l : 0;
  const multLowSpeedBias = (_m = policy.multLowSpeedBias) != null ? _m : 0;
  if (globalMult >= 4 && multHighSpeedBias !== 0) {
    const sameSuitTiles2 = hand.filter(
      (t) => t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    );
    const neighbors2 = sameSuitTiles2.filter((t) => Math.abs(t.value - tile.value) <= 2);
    if (neighbors2.length === 0) score += multHighSpeedBias * 2;
    else if (neighbors2.length >= 2) score += multHighSpeedBias * 0.5;
  } else if (globalMult < 4 && multLowSpeedBias !== 0) {
    const sameSuitTiles3 = hand.filter(
      (t) => t !== tile && t.suit === tile.suit && !isWildTile(t, game) && !isFlower(t)
    );
    const neighbors3 = sameSuitTiles3.filter((t) => Math.abs(t.value - tile.value) <= 2);
    if (neighbors3.length === 0) score += multLowSpeedBias * 1;
  }
  if (postDiscardShanten === 0) {
    score += 1.2;
    score += Math.max(0, (postDiscardEffective != null ? postDiscardEffective : 0) - 4) * 0.08;
  } else if (postDiscardShanten === 1) {
    score += Math.max(0, (postDiscardEffective != null ? postDiscardEffective : 0) - 6) * 0.04;
  }
  return score;
}
let _shantenCache = /* @__PURE__ */ new Map();
function tileKey(tiles, exposedCount) {
  const counts = /* @__PURE__ */ new Map();
  for (const t of tiles) {
    const k = `${t.suit}-${t.value}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const parts = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`);
  return `${parts.join(",")};e${exposedCount}`;
}
function computeShanten(tiles, exposedCount, isWildTileChecker) {
  const key = tileKey(tiles, exposedCount);
  if (_shantenCache.has(key)) return _shantenCache.get(key);
  const groups = /* @__PURE__ */ new Map();
  for (const t of tiles) {
    if (isWildTileChecker(t)) {
      continue;
    }
    const k = `${t.suit}-${t.value}`;
    groups.set(k, (groups.get(k) || 0) + 1);
  }
  let pairs = 0, triplets = 0, sequences = 0;
  const counted = /* @__PURE__ */ new Set();
  for (const [k, c] of groups) {
    if (c >= 3) {
      triplets++;
      counted.add(k);
    }
  }
  const numSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of numSuits) {
    for (let v = 1; v <= 7; v++) {
      const k1 = `${suit}-${v}`, k2 = `${suit}-${v + 1}`, k3 = `${suit}-${v + 2}`;
      if (!counted.has(k1) && !counted.has(k2) && !counted.has(k3)) {
        if ((groups.get(k1) || 0) > 0 && (groups.get(k2) || 0) > 0 && (groups.get(k3) || 0) > 0) {
          sequences++;
          counted.add(k1);
          counted.add(k2);
          counted.add(k3);
        }
      }
    }
  }
  for (const [k, c] of groups) {
    if (!counted.has(k) && c >= 2) {
      pairs++;
      counted.add(k);
    }
  }
  for (const [k, c] of groups) {
    if (!counted.has(k)) ;
  }
  const melds = triplets + sequences;
  let shanten = 8 - 2 * melds - Math.max(0, pairs - 1);
  shanten = Math.max(0, Math.min(8, shanten));
  _shantenCache.set(key, shanten);
  return shanten;
}
const calculateShanten = computeShanten;
function countEffectiveTiles(tiles, exposedCount, isWildTileChecker) {
  const currentShanten = calculateShanten(tiles, exposedCount, isWildTileChecker);
  const candidates = [];
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) {
      candidates.push({ suit, value: v });
    }
  }
  for (let v = 1; v <= 4; v++) candidates.push({ suit: TileSuit.WIND, value: v });
  for (let v = 1; v <= 3; v++) candidates.push({ suit: TileSuit.DRAGON, value: v });
  let total = 0;
  for (const c of candidates) {
    const testTile = { suit: c.suit, value: c.value, id: `eff-${c.suit}-${c.value}` };
    const nextShanten = calculateShanten([...tiles, testTile], exposedCount, isWildTileChecker);
    if (nextShanten < currentShanten) {
      const inHand = tiles.filter((t) => t.suit === c.suit && t.value === c.value).length;
      total += Math.max(0, 4 - inHand);
    }
  }
  return total;
}
function countPlayableTilesForBot(player) {
  const concealed = player.hand.concealedTiles.length;
  const exposed = player.hand.exposedMelds.reduce((sum, meld) => {
    if (meld.tiles.length === 1 && isFlower(meld.tiles[0])) return sum;
    return sum + meld.tiles.length;
  }, 0);
  return concealed + exposed;
}
function validateBotDiscardState(player, context) {
  const concealed = player.hand.concealedTiles.length;
  const exposedMelds = player.hand.exposedMelds.length;
  const playable = countPlayableTilesForBot(player);
  const validPlayableCounts = /* @__PURE__ */ new Set([2, 5, 8, 11, 14]);
  const concealedLooksDiscardable = concealed >= 2 && concealed % 3 === 2;
  if (!concealedLooksDiscardable || !validPlayableCounts.has(playable)) {
    console.warn(
      `[BotHandInvariant] ${player.name} invalid discard state @${context}: concealed=${concealed} exposedMelds=${exposedMelds} playable=${playable}`
    );
  }
}
function selectDiscardTile(player, game) {
  var _a, _b, _c, _d, _e, _f, _g;
  _shantenCache = /* @__PURE__ */ new Map();
  validateBotDiscardState(player, "selectDiscardTile");
  const hand = player.hand.concealedTiles;
  if (hand.length === 0) return "";
  const nonWildHand = hand.filter((tile) => !isWildTile(tile, game));
  const discardCandidates = nonWildHand.length > 0 ? nonWildHand : hand;
  const openingHasWeakNumberWaste = usesOfficialRouteStrategy(player.name) && hand.length >= 11 && hasWeakNumberWasteCandidate(hand);
  const exposedCount = player.hand.exposedMelds.length;
  const wildChecker = (tile) => isWildTile(tile, game);
  const wallRemaining = ((_a = game.wall) == null ? void 0 : _a.length) || 0;
  const estimatedRound = Math.max(1, Math.floor((((_b = game.discardPile) == null ? void 0 : _b.length) || 0) / 4) + 1);
  const currentShanten = calculateShanten(hand, exposedCount, wildChecker);
  const currentEffective = countEffectiveTiles(hand, exposedCount, wildChecker);
  const tableThreat = estimateTableThreat(game, player.id);
  const topOpponentScore = Math.max(...game.players.filter((p) => p.id !== player.id).map((p) => {
    var _a2;
    return (_a2 = p.score) != null ? _a2 : 0;
  }), 0);
  const scoreLead2 = ((_c = player.score) != null ? _c : 0) - topOpponentScore;
  const useRoutePlanner = usesOfficialRouteStrategy(player.name);
  const legacyDiscardPathDisabled = DISABLE_LEGACY_BOT_PATH;
  const committedOpenSuit = useRoutePlanner ? getCommittedOpenNumberSuit(player) : null;
  const hasCommittedOpenOffSuitNumberCandidate = !!committedOpenSuit && discardCandidates.some(
    (tile) => isNumberTile(tile) && tile.suit !== committedOpenSuit
  );
  const hasCommittedOpenOffSuitNumberWaste = !!committedOpenSuit && hasOffSuitNumberWaste(hand, committedOpenSuit);
  const numberSuitCounts = useRoutePlanner ? getNumberSuitCounts(hand) : [];
  const dominantTwoSuitGap = numberSuitCounts.length === 2 ? numberSuitCounts[0].count - numberSuitCounts[1].count : 0;
  const routeMetricPolicy = getLiveRouteMetricPolicy(getPolicyForPlayer(player));
  const routeState = useRoutePlanner ? evaluateRouteState({
    game,
    player,
    hand,
    shanten: currentShanten,
    effectiveTiles: currentEffective,
    tableThreat,
    wallRemaining,
    previousRouteState: getPlayerRouteMemory(player),
    policy: getPolicyForPlayer(player)
  }) : null;
  let bestTile = discardCandidates[0];
  let bestShanten = Infinity;
  let bestEffective = -1;
  let bestScore = -Infinity;
  let bestTingValue = -Infinity;
  let bestComposite = -Infinity;
  for (let i = 0; i < discardCandidates.length; i++) {
    const tile = discardCandidates[i];
    if (committedOpenSuit && hasCommittedOpenOffSuitNumberCandidate && tile.suit === committedOpenSuit) {
      continue;
    }
    if (committedOpenSuit && hasCommittedOpenOffSuitNumberWaste && isHonor(tile)) {
      continue;
    }
    let removed = false;
    const remaining = hand.filter((candidate) => {
      if (!removed && candidate.id === tile.id) {
        removed = true;
        return false;
      }
      return true;
    });
    const shanten = calculateShanten(remaining, exposedCount, wildChecker);
    const effective = countEffectiveTiles(remaining, exposedCount, wildChecker);
    let score = scoreTileForDiscard(tile, hand, game, player, shanten, effective);
    const discardDanger = getDiscardDangerScore(tile, game, player);
    const winningTiles = shanten === 0 ? countWinningTilesForHand(remaining, exposedCount, game) : 0;
    const waitWeight = scoreLead2 < -1e3 ? 1.15 : 1;
    const safetyWeight = tableThreat * (scoreLead2 > 1e3 ? 5.5 : 3.2);
    const timingValue = shanten === 0 ? winningTiles * waitWeight - discardDanger * safetyWeight : -Infinity;
    let composite = -shanten * 100 + effective * 2.5 + score;
    const tilePairCount = hand.filter((other) => tilesMatch(other, tile)).length;
    if (openingHasWeakNumberWaste && isHonor(tile) && !hand.some((other) => other.id !== tile.id && tilesMatch(other, tile))) {
      composite -= 10;
    }
    if (committedOpenSuit) {
      const hasOtherNumberSuitTiles = hand.some(
        (other) => other.id !== tile.id && isNumberTile(other) && other.suit !== committedOpenSuit
      );
      const offSuitWasteExists = hasOffSuitNumberWaste(hand, committedOpenSuit, tile.id);
      if (tile.suit === committedOpenSuit) {
        composite -= hasOtherNumberSuitTiles ? 40 : offSuitWasteExists ? 30 : 16;
      } else if (isHonor(tile)) {
        composite += tilePairCount >= 2 ? -1.2 : 1.2;
      } else {
        composite += hasOtherNumberSuitTiles ? 34 : offSuitWasteExists ? 28 : 18;
      }
    }
    if (committedOpenSuit && isHonor(tile)) {
      const visibleCopies = countVisibleCopies(tile, game);
      const honorSingletons = countHonorSingletons(hand, tile.id);
      const exposedMeldCount = player.hand.exposedMelds.length;
      const routeWantsCommittedSuit = !!routeState && (routeState.targetSuit === committedOpenSuit || routeState.current === "OPEN_SPEED" || routeState.current === "HALF_FLUSH");
      if (tilePairCount <= 1 && exposedMeldCount >= 2 && routeWantsCommittedSuit) {
        composite += 12 + visibleCopies * 6 + honorSingletons * 2.5;
      } else if (tilePairCount <= 1 && routeWantsCommittedSuit) {
        composite += 5 + visibleCopies * 3;
      }
    }
    if (useRoutePlanner && dominantTwoSuitGap >= 3 && isNumberTile(tile)) {
      const dominantSuit = ((_d = numberSuitCounts[0]) == null ? void 0 : _d.suit) || null;
      const minoritySuit = ((_e = numberSuitCounts[1]) == null ? void 0 : _e.suit) || null;
      const dominantSuitCount = ((_f = numberSuitCounts[0]) == null ? void 0 : _f.count) || 0;
      const minoritySuitCount = ((_g = numberSuitCounts[1]) == null ? void 0 : _g.count) || 0;
      const nearbySameSuit = countNearbySameSuitTiles(tile, hand);
      if (tile.suit === dominantSuit) {
        composite -= 12 + dominantTwoSuitGap;
      } else if (tile.suit === minoritySuit) {
        composite += 8 + dominantTwoSuitGap;
        if (nearbySameSuit > 0 && dominantSuitCount >= 6 && minoritySuitCount <= 3) {
          composite += 36 + nearbySameSuit * 4 + dominantTwoSuitGap * 2;
        } else if (nearbySameSuit > 0) {
          composite += 14 + nearbySameSuit * 2 + dominantTwoSuitGap;
        }
      }
    }
    if (useRoutePlanner && routeState) {
      const afterRouteState = evaluateRouteState({
        game,
        player,
        hand: remaining,
        shanten,
        effectiveTiles: effective,
        tableThreat,
        wallRemaining,
        previousRouteState: routeState,
        policy: getPolicyForPlayer(player)
      });
      const routeScore = scoreRouteDiscardCandidate({
        tile,
        hand,
        game,
        routeState,
        candidateShanten: shanten,
        candidateEffective: effective,
        discardDanger,
        winningTiles,
        afterRouteState
      });
      const expectedFan = shanten === 0 ? estimateRouteExpectedFan(afterRouteState, player, game, winningTiles) : 0;
      const tingDecisionValue = shanten === 0 ? estimateTingDecisionValue({
        routeState: afterRouteState,
        player,
        game,
        winningTiles,
        discardDanger,
        tableThreat,
        scoreLead: scoreLead2
      }) : 0;
      score += routeScore;
      composite += routeScore * 2;
      const visibleCopies = countVisibleCopies(tile, game);
      const overdueMenqingHold = exposedCount === 0 && estimatedRound > routeMetricPolicy.menqingHoldTurns && routeState.current === "MENQING_SPEED";
      const deadHandPressure = routeState.current === "MENQING_SPEED" && currentShanten >= 2 && routeState.features.isolatedCount >= 3;
      const weakObserveTile = routeState.phase === "OBSERVE" && (routeState.features.shortestSuit && tile.suit === routeState.features.shortestSuit && tilePairCount === 1 || isHonor(tile) && tilePairCount === 1 && visibleCopies >= 2);
      if (overdueMenqingHold && weakObserveTile) {
        composite += 8 + routeMetricPolicy.forcedOpenRate * 18;
      }
      if (deadHandPressure && weakObserveTile) {
        composite += 6 + routeMetricPolicy.deadHandRate * 20;
      }
      if (shanten === 0) {
        composite += timingValue * (3.2 + routeMetricPolicy.tingQuality * 0.2);
        composite += tingDecisionValue * (1.15 + routeMetricPolicy.tingQuality * 0.08);
        composite += expectedFan * 1.4;
      } else if (routeState.phase === "OBSERVE" && routeState.current === "MENQING_SPEED") {
        composite += (effective - currentEffective) * 0.4;
      } else if (shanten === 1) {
        composite += effective * (routeMetricPolicy.tingQuality * 0.03);
        composite += estimateRouteExpectedFan(afterRouteState, player, game, Math.max(4, effective / 2)) * 0.9;
      }
    }
    if (useRoutePlanner) {
      if (composite > bestComposite + 1e-3 || Math.abs(composite - bestComposite) <= 1e-3 && shanten < bestShanten || Math.abs(composite - bestComposite) <= 1e-3 && shanten === bestShanten && effective > bestEffective) {
        bestComposite = composite;
        bestShanten = shanten;
        bestEffective = effective;
        bestScore = score;
        bestTingValue = timingValue;
        bestTile = tile;
      }
    } else if (!legacyDiscardPathDisabled && (shanten < bestShanten || shanten === 0 && bestShanten === 0 && timingValue > bestTingValue + 1e-3 || shanten === bestShanten && effective > bestEffective || shanten === bestShanten && effective === bestEffective && score > bestScore)) {
      bestShanten = shanten;
      bestEffective = effective;
      bestScore = score;
      bestTingValue = timingValue;
      bestTile = tile;
    }
  }
  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState);
  }
  return bestTile.id;
}
function selectBotChowTileIds(player, game, claimTile, chowOptions) {
  var _a;
  if (!(chowOptions == null ? void 0 : chowOptions.length)) return void 0;
  const hand = player.hand.concealedTiles;
  const exposedCount = player.hand.exposedMelds.length;
  const wildChecker = (tile) => isWildTile(tile, game);
  const wallRemaining = ((_a = game.wall) == null ? void 0 : _a.length) || 0;
  const tableThreat = estimateTableThreat(game, player.id);
  const useRoutePlanner = usesOfficialRouteStrategy(player.name);
  const evaluateResultingHand = (candidateHand) => {
    let bestShanten = Infinity;
    let bestEffective = -1;
    for (let i = 0; i < candidateHand.length; i++) {
      const remain = candidateHand.filter((_, idx) => idx !== i);
      const shanten = calculateShanten(remain, exposedCount + 1, wildChecker);
      const effective = countEffectiveTiles(remain, exposedCount + 1, wildChecker);
      if (shanten < bestShanten || shanten === bestShanten && effective > bestEffective) {
        bestShanten = shanten;
        bestEffective = effective;
      }
    }
    return { shanten: bestShanten, effective: bestEffective };
  };
  const passShanten = calculateShanten(hand, exposedCount, wildChecker);
  const passEffective = countEffectiveTiles(hand, exposedCount, wildChecker);
  const routeState = useRoutePlanner ? evaluateRouteState({
    game,
    player,
    hand,
    shanten: passShanten,
    effectiveTiles: passEffective,
    tableThreat,
    wallRemaining,
    previousRouteState: getPlayerRouteMemory(player)
  }) : null;
  let best = null;
  for (const option of chowOptions) {
    const optionIds = option.filter((id) => id !== claimTile.id);
    const removeIds = [...optionIds];
    const candidateHand = hand.filter((tile) => {
      const idx = removeIds.indexOf(tile.id);
      if (idx === -1) return true;
      removeIds.splice(idx, 1);
      return false;
    });
    if (candidateHand.length === 0) continue;
    const { shanten, effective } = evaluateResultingHand(candidateHand);
    let tune = evaluateChowValue(player, game, claimTile);
    if (useRoutePlanner && routeState) {
      const routeDecision = evaluateRouteClaim({
        action: ActionType.CHOW,
        player,
        game,
        claimTile,
        routeState,
        candidateHand,
        candidateShanten: shanten,
        candidateEffective: effective,
        passShanten,
        passEffective,
        tableThreat,
        wallRemaining
      });
      if (!routeDecision.allowed) continue;
      tune += routeDecision.tuneDelta;
    }
    if (!best || shanten < best.shanten || shanten === best.shanten && effective > best.effective || shanten === best.shanten && effective === best.effective && tune > best.tune) {
      best = { tileIds: optionIds, shanten, effective, tune };
    }
  }
  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState);
  }
  return best == null ? void 0 : best.tileIds;
}
function countWinningTilesForHand(hand, exposedCount, game) {
  if (hand.length === 0) return 0;
  const wildTileId = game.customScoringMode || null;
  let count = 0;
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  for (const suit of suits) {
    for (let v = 1; v <= 9; v++) {
      const testTile = { suit, value: v, id: `test-${suit}-${v}` };
      const testHand = [...hand, testTile];
      const result = canWin(testHand, exposedCount, wildTileId);
      if (result.canWin) {
        const inHand = hand.filter((t) => t.suit === suit && t.value === v).length;
        const visible = countVisibleCopies(testTile, game);
        count += Math.max(0, 4 - inHand - visible);
      }
    }
  }
  for (let v = 1; v <= 4; v++) {
    const testTile = { suit: TileSuit.WIND, value: v, id: `test-wind-${v}` };
    const testHand = [...hand, testTile];
    const result = canWin(testHand, exposedCount, wildTileId);
    if (result.canWin) {
      const inHand = hand.filter((t) => t.suit === TileSuit.WIND && t.value === v).length;
      count += Math.max(0, 4 - inHand - countVisibleCopies(testTile, game));
    }
  }
  for (let v = 1; v <= 3; v++) {
    const testTile = { suit: TileSuit.DRAGON, value: v, id: `test-dragon-${v}` };
    const testHand = [...hand, testTile];
    const result = canWin(testHand, exposedCount, wildTileId);
    if (result.canWin) {
      const inHand = hand.filter((t) => t.suit === TileSuit.DRAGON && t.value === v).length;
      count += Math.max(0, 4 - inHand - countVisibleCopies(testTile, game));
    }
  }
  if ((wildTileId == null ? void 0 : wildTileId.startsWith(`${TileSuit.FLOWER}-`)) && Array.isArray(game.wildTileGroup)) {
    for (const valueText of game.wildTileGroup) {
      const v = parseInt(valueText, 10);
      if (Number.isNaN(v) || v < 1 || v > 8) continue;
      const testTile = { suit: TileSuit.FLOWER, value: v, id: `test-flower-${v}`, isFlower: true };
      const testHand = [...hand, testTile];
      const result = canWin(testHand, exposedCount, wildTileId);
      if (result.canWin) {
        const inHand = hand.filter((t) => t.suit === TileSuit.FLOWER && t.value === v).length;
        count += Math.max(0, 1 - inHand - countVisibleCopies(testTile, game));
      }
    }
  }
  return count;
}
function countWinningTiles(player, game) {
  return countWinningTilesForHand(player.hand.concealedTiles, player.hand.exposedMelds.length, game);
}
function isChowBeneficial(player, game, chowTile) {
  const hand = player.hand.concealedTiles;
  const v = chowTile.value;
  const suit = chowTile.suit;
  const groups = groupTiles(hand);
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`) && groups.has(`${suit}-${v - 1}`);
  const hasLeftRight = groups.has(`${suit}-${v - 1}`) && groups.has(`${suit}-${v + 1}`);
  const hasRightRight = groups.has(`${suit}-${v + 1}`) && groups.has(`${suit}-${v + 2}`);
  return hasLeftLeft || hasLeftRight || hasRightRight;
}
function evaluateChowValue(player, game, chowTile) {
  var _a, _b, _c, _d;
  const hand = player.hand.concealedTiles;
  const policy = getPolicyForPlayer(player);
  const routeMetricPolicy = getLiveRouteMetricPolicy(policy);
  const meldCount = player.hand.exposedMelds.length;
  const effectiveGlobalMultiplier = Math.min(
    ((_b = (_a = game.inheritMultiplier) != null ? _a : game.inheritedGlobalMultiplier) != null ? _b : 1) * ((_c = game.roundMultiplier) != null ? _c : 1),
    8
  );
  const estimatedRound = Math.max(1, Math.floor((((_d = game.discardPile) == null ? void 0 : _d.length) || 0) / 4) + 1);
  const wildCount = hand.filter((t) => isWildTile(t, game)).length;
  const numberSuitCounts = getNumberSuitCounts(hand);
  const longestSuitEntry = numberSuitCounts[0] || null;
  const shortestSuitEntry = numberSuitCounts[numberSuitCounts.length - 1] || null;
  if (player.isTing) return 0;
  let score = policy.chowChance;
  if (meldCount === 0) {
    const menqingPenalty = Math.min(0.6, (policy.menqingKeepBonus || 0) * 0.5);
    const multiplierPush = effectiveGlobalMultiplier >= 4 ? 0.22 + (effectiveGlobalMultiplier - 4) * 0.04 : 0;
    const noWildPush = wildCount === 0 ? 0.18 : 0;
    const multiWildHold = wildCount >= 2 ? 0.16 : 0;
    score -= Math.max(0.12, menqingPenalty - multiplierPush - noWildPush + multiWildHold);
  }
  if (meldCount >= 3) {
    score -= 0.7;
  } else if (meldCount >= 2) {
    score -= 0.3;
  }
  if (!isChowBeneficial(player, game, chowTile)) {
    score -= 0.8;
  }
  const v = chowTile.value;
  const suit = chowTile.suit;
  const groups = groupTiles(hand);
  const hasLeft = groups.has(`${suit}-${v - 1}`);
  const hasRight = groups.has(`${suit}-${v + 1}`);
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`);
  const hasRightRight = groups.has(`${suit}-${v + 2}`);
  const visibleCopies = countVisibleCopies(chowTile, game);
  const remainingClaimCopies = Math.max(0, 4 - visibleCopies);
  const isShortestSuit = (shortestSuitEntry == null ? void 0 : shortestSuitEntry.suit) === suit;
  const suitGap = Math.max(0, ((longestSuitEntry == null ? void 0 : longestSuitEntry.count) || 0) - ((shortestSuitEntry == null ? void 0 : shortestSuitEntry.count) || 0));
  const shortSuitGapTrap = isShortestSuit && suitGap >= 4 && ((longestSuitEntry == null ? void 0 : longestSuitEntry.count) || 0) >= 6;
  const strongMenqingHold = meldCount === 0 && wildCount >= 2;
  const pairHeavyPungsHold = estimatedRound <= 5 && countPairs(hand) >= 4;
  const middleWaitShape = hasLeft && hasRight;
  const overdueMenqingHold = meldCount === 0 && estimatedRound > routeMetricPolicy.menqingHoldTurns && wildCount <= 1;
  if (hasLeft && hasRight) {
    score += 1;
  } else if (hasLeft && hasRightRight) {
    score += 0.6;
  } else if (hasRight && hasLeftLeft) {
    score += 0.6;
  } else if (hasLeft && v - 1 === 1 || hasRight && v + 1 === 9) {
    score += 0.3;
  } else if (hasLeft || hasRight) {
    score += 0;
  } else if (hasLeftLeft || hasRightRight) {
    score -= 0.3;
  }
  if (shortSuitGapTrap) {
    score -= pairHeavyPungsHold ? 0.35 : 0.7;
    if (middleWaitShape) score -= 0.25;
  } else if (middleWaitShape && !strongMenqingHold) {
    score += 0.28;
    if (remainingClaimCopies <= 1) score += 0.18;
  }
  if ((policy.allPungsPursuit || 0) > 0) {
    score -= (policy.allPungsPursuit || 0) * 0.8;
  }
  let adjacentKept = 0;
  if (hasLeft) adjacentKept++;
  if (hasRight) adjacentKept++;
  if (hasLeftLeft && !hasLeft) adjacentKept += 0.5;
  if (hasRightRight && !hasRight) adjacentKept += 0.5;
  score += adjacentKept * (policy.nearWeight || 0) * 0.05;
  const suitCounts = {};
  let total = 0;
  for (const t of hand) {
    if (isWildTile(t, game) || isHonor(t) || t.suit === TileSuit.FLOWER) continue;
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1;
    total++;
  }
  const dominantSuit = (() => {
    var _a2, _b2;
    if (total > 0) {
      const sorted = Object.entries(suitCounts).sort((a, b) => b[1] - a[1]);
      return (_b2 = (_a2 = sorted[0]) == null ? void 0 : _a2[0]) != null ? _b2 : null;
    }
    return null;
  })();
  const dominantCount = dominantSuit ? suitCounts[dominantSuit] || 0 : 0;
  const upstream = game.players[(player.position + 3) % game.players.length];
  const upstreamDiscards = ((upstream == null ? void 0 : upstream.hand.discardedTiles) || []).filter((discard) => discard.suit === suit);
  const upstreamRejectedSuit = upstreamDiscards.some(
    (discard, index) => {
      var _a2;
      return discard.suit === suit && ((_a2 = upstreamDiscards[index + 1]) == null ? void 0 : _a2.suit) === suit;
    }
  );
  if (dominantCount >= 6 && (policy.pureFlushPursuit || 0) > 0) {
    const isSameSuit = dominantSuit === suit;
    if (!isSameSuit) {
      const purePenalty = (policy.pureFlushPursuit || 0) * 0.6;
      const halfPenalty = (policy.halfFlushWeight || 0) * 0.3;
      score -= Math.max(purePenalty, halfPenalty);
    }
  }
  if (dominantSuit === suit && (policy.flushChaseBonus || 0) > 0) {
    if (dominantCount >= 7) {
      score += (policy.flushChaseBonus || 0) * 0.5;
    }
  }
  if (wildCount === 0) {
    score += 0.18;
  } else if (wildCount >= 2) {
    score -= 0.12;
  } else if (wildCount === 1 && dominantSuit === suit && dominantCount >= 6) {
    score += 0.12;
  }
  if (effectiveGlobalMultiplier >= 4) {
    score += 0.18 + (effectiveGlobalMultiplier - 4) * 0.05;
  }
  if (remainingClaimCopies <= 1 && !strongMenqingHold && !shortSuitGapTrap) {
    score += 0.16;
  }
  if (overdueMenqingHold && !shortSuitGapTrap) {
    score += 0.12 + routeMetricPolicy.forcedOpenRate * 0.2;
  }
  if (upstreamRejectedSuit && dominantCount >= 6) {
    score += 0.22;
  }
  if (estimatedRound <= 5 && countPairs(hand) >= 4) {
    score -= 0.16;
  }
  const chowSuitCount = hand.filter((t) => t.suit === suit && !isWildTile(t, game)).length;
  if (chowSuitCount >= 2 && (policy.tripletComboBonus || 0) > 0) {
    score += (policy.tripletComboBonus || 0) * 0.1;
  }
  const tilesNeeded = 14 - hand.length - meldCount * 3;
  if (tilesNeeded <= 2) {
    score += 0.3;
  }
  if (hand.length <= 6) {
    const winningCount = countWinningTiles(player, game);
    if (winningCount <= 8) {
      score += 0.4;
    }
  }
  if (isWildTile(chowTile, game)) {
    score -= policy.chowWildPenalty || 0.5;
  }
  return Math.max(0.05, Math.min(1, score));
}
async function shouldClaimPendingAction(player, availableActions, game) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w;
  const policy = getPolicyForPlayer(player);
  const routeMetricPolicy = getLiveRouteMetricPolicy(policy);
  const hand = player.hand.concealedTiles;
  const exposedCount = player.hand.exposedMelds.length;
  const pendingAction = game.pendingActions.find((pa) => pa.playerId === player.id);
  const claimTile = pendingAction == null ? void 0 : pendingAction.tile;
  if (USE_PIPELINE_SCORER) {
    shadowEvaluate(player, availableActions, game).catch(() => {
    });
    const engine = await getPipelineEngine();
    if (engine) {
      try {
        const ctx = engine.buildActionContext(game, player.id, availableActions, game.turnIndex);
        const ranked = engine.rankActions(ctx);
        if (((_a = ranked[0]) == null ? void 0 : _a.action) === ActionType.HU) {
          return shouldDeclineLowValueHu(game, player) ? ActionType.PASS : ActionType.HU;
        }
        const bestNonHu = ranked.find((r) => r.action !== ActionType.HU);
        if (bestNonHu) return bestNonHu.action;
        return ActionType.PASS;
      } catch (e) {
      }
    }
  }
  if (availableActions.includes(ActionType.HU)) {
    const isSelfDraw = !claimTile;
    if (isSelfDraw) {
      const selfWinProb = (_b = policy.selfWinChance) != null ? _b : 0.95;
      if (Math.random() < selfWinProb) {
        return ActionType.HU;
      }
    }
    const pendingDiscard = game.pendingActions.find((pa) => pa.type === "discard" && pa.playerId === player.id) || game.pendingActions.find((pa) => pa.type === "discard" && pa.playerId !== player.id);
    if (pendingDiscard) {
      const discardTile = pendingDiscard.tile;
      const isWildDiscard = discardTile ? isWildTile(discardTile, game) : false;
      const isMenQing = exposedCount === 0;
      const wildCount = hand.filter((t) => isWildTile(t, game)).length;
      if (shouldDeclineLowValueHu(game, player)) {
        return ActionType.PASS;
      }
      if (isWildDiscard && ((_c = policy.discardHuWildPenalty) != null ? _c : 0) > 0) {
        const wildProb = Math.max(0, 1 - ((_d = policy.discardHuWildPenalty) != null ? _d : 0));
        if (Math.random() >= wildProb) return ActionType.PASS;
      }
      if (isMenQing && ((_e = policy.discardHuMenQingPenalty) != null ? _e : 0) > 0) {
        const menqingProb = Math.max(0, 1 - ((_f = policy.discardHuMenQingPenalty) != null ? _f : 0));
        if (Math.random() >= menqingProb) return ActionType.PASS;
      }
      if (wildCount >= 2 && ((_g = policy.bao2ClaimPenalty) != null ? _g : 0) > 0) {
        const penalty = Math.max(0, 1 - ((_h = policy.bao2ClaimPenalty) != null ? _h : 0));
        if (Math.random() >= penalty) return ActionType.PASS;
      }
      if (wildCount >= 3 && ((_i = policy.bao3AvoidThreshold) != null ? _i : 0) > 0) {
        const avoidProb = Math.min(0.9, ((_j = policy.bao3AvoidThreshold) != null ? _j : 0) * 0.9);
        if (Math.random() < avoidProb) return ActionType.PASS;
      }
      const discardHuProb = Math.max(0, Math.min(1, (_k = policy.discardHuChance) != null ? _k : 1));
      return Math.random() < discardHuProb ? ActionType.HU : ActionType.PASS;
    }
    return ActionType.HU;
  }
  if (!claimTile) return ActionType.PASS;
  const wildChecker = (t) => isWildTile(t, game);
  const exclusionState = ((_l = game.chowPongExclusion) == null ? void 0 : _l[player.id]) || { firstActionSuit: null, firstActionType: null };
  const useRoutePlanner = usesOfficialRouteStrategy(player.name);
  const wallRemaining = ((_m = game.wall) == null ? void 0 : _m.length) || 0;
  const tableThreat = estimateTableThreat(game, player.id);
  const suitCounts = {};
  for (const tile of hand) {
    if (tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS) {
      suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1;
    }
  }
  const actionScores = /* @__PURE__ */ new Map();
  const evaluateResultingHand = (candidateHand) => {
    let bestShanten = Infinity;
    let bestEffective = -1;
    for (let i = 0; i < candidateHand.length; i++) {
      const remain = candidateHand.filter((_, idx) => idx !== i);
      const shanten = calculateShanten(remain, exposedCount + 1, wildChecker);
      const effective = countEffectiveTiles(remain, exposedCount + 1, wildChecker);
      if (shanten < bestShanten || shanten === bestShanten && effective > bestEffective) {
        bestShanten = shanten;
        bestEffective = effective;
      }
    }
    return { shanten: bestShanten, effective: bestEffective };
  };
  {
    const shanten = calculateShanten(hand, exposedCount, wildChecker);
    const effective = countEffectiveTiles(hand, exposedCount, wildChecker);
    actionScores.set(ActionType.PASS, { shanten, effective, tune: 0 });
  }
  const passEval = actionScores.get(ActionType.PASS);
  const routeState = useRoutePlanner ? evaluateRouteState({
    game,
    player,
    hand,
    shanten: passEval.shanten,
    effectiveTiles: passEval.effective,
    tableThreat,
    wallRemaining,
    previousRouteState: getPlayerRouteMemory(player),
    policy
  }) : null;
  if (availableActions.includes(ActionType.PENG) && checkChowPongExclusion(exclusionState, "pong", claimTile.suit)) {
    const groups = groupTiles(hand);
    const key = `${claimTile.suit}-${claimTile.value}`;
    const sameTiles = groups.get(key) || [];
    if (sameTiles.length >= 2) {
      const candidateHand = [...hand];
      let removed = 0;
      for (let i = candidateHand.length - 1; i >= 0 && removed < 2; i--) {
        if (candidateHand[i].suit === claimTile.suit && candidateHand[i].value === claimTile.value) {
          candidateHand.splice(i, 1);
          removed++;
        }
      }
      if (removed === 2 && candidateHand.length > 0) {
        const { shanten, effective } = evaluateResultingHand(candidateHand);
        const candidateRouteState = useRoutePlanner ? evaluateRouteState({
          game,
          player,
          hand: candidateHand,
          shanten,
          effectiveTiles: effective,
          tableThreat,
          wallRemaining,
          previousRouteState: routeState,
          policy
        }) : routeState;
        let pengTune = policy.pengChance || 0;
        const pairCount = countPairs(hand);
        const wildCount = hand.filter((t) => isWildTile(t, game)).length;
        const effectiveGlobalMultiplier = Math.min(
          ((_o = (_n = game.inheritMultiplier) != null ? _n : game.inheritedGlobalMultiplier) != null ? _o : 1) * ((_p = game.roundMultiplier) != null ? _p : 1),
          8
        );
        const estimatedRound = Math.max(1, Math.floor((((_q = game.discardPile) == null ? void 0 : _q.length) || 0) / 4) + 1);
        const longestSuitEntry = getNumberSuitCounts(hand)[0] || null;
        const upstream = game.players[(player.position + 3) % game.players.length];
        const upstreamDiscardedSameSuit = isNumberTile(claimTile) ? ((upstream == null ? void 0 : upstream.hand.discardedTiles) || []).filter((discard) => discard.suit === claimTile.suit) : [];
        const visibleCopies = countVisibleCopies(claimTile, game);
        const remainingClaimCopies = Math.max(0, 4 - visibleCopies - sameTiles.length);
        const upstreamRejectedSuit = isNumberTile(claimTile) && upstreamDiscardedSameSuit.some((discard, index) => {
          var _a2;
          return discard.suit === claimTile.suit && ((_a2 = upstreamDiscardedSameSuit[index + 1]) == null ? void 0 : _a2.suit) === claimTile.suit;
        });
        const pairHeavyOpenPush = estimatedRound <= 5 && pairCount >= 4;
        const strongMenqingHold = exposedCount === 0 && wildCount >= 2 && passEval.shanten <= 2 && passEval.effective >= 14;
        const overdueMenqingHold = exposedCount === 0 && estimatedRound > routeMetricPolicy.menqingHoldTurns && wildCount <= 1;
        const deadHandPressure = passEval.shanten >= 2 && passEval.effective <= 10 && pairCount + ((longestSuitEntry == null ? void 0 : longestSuitEntry.count) || 0) <= 9;
        if (isWildTile(claimTile, game) && (policy.pengWildBoost || 0) > 0) {
          pengTune += policy.pengWildBoost || 0;
        }
        if ((policy.allPungsPursuit || 0) > 0) {
          pengTune += (policy.allPungsPursuit || 0) * 0.3;
        }
        const meldCount = exposedCount;
        if (meldCount === 0 && (policy.menqingKeepBonus || 0) > 0) {
          pengTune -= (policy.menqingKeepBonus || 0) * 0.4;
        }
        if (wildCount === 0) {
          pengTune += 0.2;
        } else if (wildCount >= 2 && meldCount === 0) {
          pengTune -= 0.08;
        }
        if (effectiveGlobalMultiplier >= 4) {
          pengTune += 0.18 + (effectiveGlobalMultiplier - 4) * 0.06;
        }
        if (upstreamRejectedSuit && longestSuitEntry && longestSuitEntry.suit === claimTile.suit && longestSuitEntry.count >= 6) {
          pengTune += 0.24;
        }
        if (pairHeavyOpenPush) {
          pengTune += 0.55;
        }
        if (remainingClaimCopies <= 1 && !strongMenqingHold) {
          pengTune += 0.72 + (pairHeavyOpenPush ? 0.2 : 0);
        }
        if (overdueMenqingHold) {
          pengTune += 0.16 + routeMetricPolicy.forcedOpenRate * 0.35;
        }
        if (deadHandPressure) {
          pengTune += 0.12 + routeMetricPolicy.deadHandRate * 0.3;
        }
        if (shanten <= 1 && candidateRouteState) {
          const winningTilesAfterClaim = shanten === 0 ? countWinningTilesForHand(candidateHand, exposedCount + 1, game) : 0;
          pengTune += estimateNearTingDecisionValue({
            routeState: candidateRouteState,
            player,
            game,
            shanten,
            effective,
            winningTiles: winningTilesAfterClaim,
            tableThreat,
            scoreLead
          }) * (0.06 + routeMetricPolicy.tingQuality * 6e-3);
        }
        if ((policy.oppTingDetection || 0) > 0 && game.opponentTingIndicator) {
          pengTune *= Math.max(0, 1 - (policy.oppTingDetection || 0) * 0.8);
        }
        let pengBlockedByRoute = false;
        if (useRoutePlanner && routeState) {
          const routeDecision = evaluateRouteClaim({
            action: ActionType.PENG,
            player,
            game,
            claimTile,
            routeState,
            candidateHand,
            candidateShanten: shanten,
            candidateEffective: effective,
            passShanten: passEval.shanten,
            passEffective: passEval.effective,
            tableThreat,
            wallRemaining
          });
          pengBlockedByRoute = !routeDecision.allowed;
          pengTune = routeDecision.allowed ? pengTune + routeDecision.tuneDelta : 0.01;
        }
        if (!pengBlockedByRoute) {
          pengTune = Math.max(0.05, pengTune);
          actionScores.set(ActionType.PENG, { shanten, effective, tune: pengTune });
        }
      }
    }
  }
  if (availableActions.includes(ActionType.KONG)) {
    const groups = groupTiles(hand);
    const key = `${claimTile.suit}-${claimTile.value}`;
    const sameTiles = groups.get(key) || [];
    if (sameTiles.length >= 3) {
      const candidateHand = [...hand];
      let removed = 0;
      for (let i = candidateHand.length - 1; i >= 0 && removed < 3; i--) {
        if (candidateHand[i].suit === claimTile.suit && candidateHand[i].value === claimTile.value) {
          candidateHand.splice(i, 1);
          removed++;
        }
      }
      if (removed === 3 && candidateHand.length > 0) {
        const { shanten, effective } = evaluateResultingHand(candidateHand);
        let kongTune = (_s = (_r = policy.minkanAggression) != null ? _r : policy.kongChance) != null ? _s : 0;
        if (isWildTile(claimTile, game) && (policy.kongWildBoost || 0) > 0) {
          kongTune += policy.kongWildBoost || 0;
        }
        const existingPong = player.hand.exposedMelds.some(
          (m) => m.type === "pong" && m.tile.suit === claimTile.suit && m.tile.value === claimTile.value
        );
        if (existingPong && (policy.kakanAggression || 0) > 0) {
          kongTune += (policy.kakanAggression || 0) * 0.5;
        }
        if ((policy.anKongAggression || 0) > 0 && !pendingAction) {
          kongTune += (policy.anKongAggression || 0) * 0.3;
        }
        const wildCount = hand.filter((t) => isWildTile(t, game)).length;
        if (wildCount > 0 && (policy.selfWinWildBoost || 0) > 0) {
          kongTune += (policy.selfWinWildBoost || 0) * Math.min(wildCount, 3) * 0.2;
        }
        if ((policy.baoRiskAversion || 0) > 0 && wildCount >= (policy.baoThreshold || 4)) {
          kongTune *= Math.max(0, 1 - (policy.baoRiskAversion || 0) * 0.5);
        }
        if ((policy.baoSelfClaimCaution || 0) > 0) {
          kongTune *= Math.max(0, 1 - (policy.baoSelfClaimCaution || 0) * 0.4);
        }
        kongTune = Math.max(0.05, Math.min(2, kongTune));
        let kongBlockedByRoute = false;
        if (useRoutePlanner && routeState) {
          const routeDecision = evaluateRouteClaim({
            action: ActionType.KONG,
            player,
            game,
            claimTile,
            routeState,
            candidateHand,
            candidateShanten: shanten,
            candidateEffective: effective,
            passShanten: passEval.shanten,
            passEffective: passEval.effective,
            tableThreat,
            wallRemaining
          });
          kongBlockedByRoute = !routeDecision.allowed;
          kongTune = routeDecision.allowed ? kongTune + routeDecision.tuneDelta : 0.01;
        }
        if (!kongBlockedByRoute) {
          kongTune = Math.max(0.05, Math.min(2, kongTune));
          actionScores.set(ActionType.KONG, { shanten, effective, tune: kongTune });
        }
      }
    }
  }
  if (availableActions.includes(ActionType.CHOW) && checkChowPongExclusion(exclusionState, "chow", claimTile.suit) && !isHonor(claimTile)) {
    const v = claimTile.value;
    const suit = claimTile.suit;
    const chowPatterns = [
      [v - 2, v - 1],
      [v - 1, v + 1],
      [v + 1, v + 2]
    ];
    let bestChow = null;
    for (const [a, b] of chowPatterns) {
      if (a < 1 || b > 9) continue;
      const idxA = hand.findIndex((t) => t.suit === suit && t.value === a);
      const idxB = hand.findIndex((t, i) => i !== idxA && t.suit === suit && t.value === b);
      if (idxA === -1 || idxB === -1) continue;
      const candidateHand = hand.filter((_, i) => i !== idxA && i !== idxB);
      if (candidateHand.length === 0) continue;
      const { shanten, effective } = evaluateResultingHand(candidateHand);
      const chowTune = evaluateChowValue(player, game, claimTile);
      const candidate = { shanten, effective, tune: chowTune, candidateHand };
      if (!bestChow || candidate.shanten < bestChow.shanten || candidate.shanten === bestChow.shanten && candidate.effective > bestChow.effective || candidate.shanten === bestChow.shanten && candidate.effective === bestChow.effective && candidate.tune > bestChow.tune) {
        bestChow = candidate;
      }
    }
    if (bestChow) {
      const candidateRouteState = useRoutePlanner ? evaluateRouteState({
        game,
        player,
        hand: bestChow.candidateHand,
        shanten: bestChow.shanten,
        effectiveTiles: bestChow.effective,
        tableThreat,
        wallRemaining,
        previousRouteState: routeState,
        policy
      }) : routeState;
      {
        if ((policy.allPungsPursuit || 0) > 0) {
          bestChow.tune -= (policy.allPungsPursuit || 0) * 0.5;
        }
        if (claimTile) {
          const chowSuit = claimTile.suit;
          const currentSuits = Object.keys(suitCounts).filter((s) => (suitCounts[s] || 0) > 0);
          if (!currentSuits.includes(chowSuit) && currentSuits.length >= 2) {
            const doorBreakPenalty = (policy.nearWeight || 0) * 0.02;
            bestChow.tune -= Math.min(0.5, doorBreakPenalty);
          }
        }
      }
      let chowBlockedByRoute = false;
      if (useRoutePlanner && routeState) {
        const routeDecision = evaluateRouteClaim({
          action: ActionType.CHOW,
          player,
          game,
          claimTile,
          routeState,
          candidateHand: bestChow.candidateHand,
          candidateShanten: bestChow.shanten,
          candidateEffective: bestChow.effective,
          passShanten: passEval.shanten,
          passEffective: passEval.effective,
          tableThreat,
          wallRemaining
        });
        chowBlockedByRoute = !routeDecision.allowed;
        bestChow.tune = routeDecision.allowed ? bestChow.tune + routeDecision.tuneDelta : 0.01;
      }
      if (!chowBlockedByRoute) {
        if (bestChow.shanten <= 1 && candidateRouteState) {
          const winningTilesAfterClaim = bestChow.shanten === 0 ? countWinningTilesForHand(bestChow.candidateHand, exposedCount + 1, game) : 0;
          bestChow.tune += estimateNearTingDecisionValue({
            routeState: candidateRouteState,
            player,
            game,
            shanten: bestChow.shanten,
            effective: bestChow.effective,
            winningTiles: winningTilesAfterClaim,
            tableThreat,
            scoreLead
          }) * (0.055 + routeMetricPolicy.tingQuality * 5e-3);
        }
        bestChow.tune = Math.max(0.05, bestChow.tune);
        actionScores.set(ActionType.CHOW, {
          shanten: bestChow.shanten,
          effective: bestChow.effective,
          tune: bestChow.tune
        });
      }
    }
  }
  const baseChances = {
    [ActionType.PASS]: 0.5,
    // PASS无先验（50/50）
    [ActionType.PENG]: (_t = policy.pengChance) != null ? _t : 0.4,
    // P1: 降低碰牌概率
    [ActionType.KONG]: (_u = policy.kongChance) != null ? _u : 0.7,
    [ActionType.CHOW]: (_v = policy.chowChance) != null ? _v : 0.6,
    // P1: 提高吃牌概率
    [ActionType.HU]: 1
    // 胡牌100%（已在HU分支处理）
  };
  const singleTileHand = player.hand.concealedTiles.length === 1;
  const drawnOrClaimedTile = player.hand.concealedTiles.length > 0 ? player.hand.concealedTiles[player.hand.concealedTiles.length - 1] : null;
  if (singleTileHand && drawnOrClaimedTile) {
    const isWild = isWildTile(drawnOrClaimedTile, game);
    const wildCount = player.hand.exposedMelds.reduce((acc, meld) => acc + meld.tiles.filter((t) => isWildTile(t, game)).length, 0);
    const totalWildCount = wildCount + (isWild ? 1 : 0);
    if (totalWildCount <= 1) {
      bestAction = ActionType.HU;
      return bestAction;
    }
  }
  let bestAction = ActionType.PASS;
  let best = actionScores.get(ActionType.PASS);
  for (const [action, s] of actionScores.entries()) {
    if (action === ActionType.PASS) continue;
    if (!softScoreWins(s, best, (_w = baseChances[action]) != null ? _w : 0.5, 0.75)) continue;
    bestAction = action;
    best = s;
  }
  if (useRoutePlanner && routeState) {
    setPlayerRouteMemory(player, routeState);
  }
  return bestAction;
}

const BEIJING_TIME_ZONE = "Asia/Shanghai";
function formatBeijingTime(value = Date.now(), options = {
  hour: "2-digit",
  minute: "2-digit"
}) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING_TIME_ZONE,
    ...options
  }).format(date);
}
function formatBeijingDateTime(value = Date.now()) {
  return formatBeijingTime(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function isConcealedDiscardState(player) {
  const concealedCount = player.hand.concealedTiles.length;
  return concealedCount >= 2 && concealedCount % 3 === 2;
}
function tileLabel(tile) {
  if (!tile) return "\u672A\u77E5\u724C";
  if (tile.suit === TileSuit.FLOWER) {
    const names = ["\u6625", "\u590F", "\u79CB", "\u51AC", "\u6885", "\u5170", "\u7AF9", "\u83CA"];
    return names[tile.value - 1] || `\u82B1${tile.value}`;
  }
  if (tile.suit === TileSuit.WIND) {
    const names = ["\u4E1C", "\u5357", "\u897F", "\u5317"];
    return names[tile.value - 1] || `\u98CE${tile.value}`;
  }
  if (tile.suit === TileSuit.DRAGON) {
    const names = ["\u4E2D", "\u53D1", "\u767D"];
    return names[tile.value - 1] || `\u7BAD${tile.value}`;
  }
  const suitLabel = tile.suit === TileSuit.CHARACTERS ? "\u4E07" : tile.suit === TileSuit.DOTS ? "\u7B52" : tile.suit === TileSuit.BAMBOOS ? "\u6761" : "";
  const digit = ["\u96F6", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D"][tile.value] || String(tile.value);
  return `${digit}${suitLabel}`;
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
class GameManager {
  constructor() {
    __publicField$2(this, "games", /* @__PURE__ */ new Map());
    __publicField$2(this, "playerToGame", /* @__PURE__ */ new Map());
    __publicField$2(this, "wsManager", null);
    __publicField$2(this, "isHydrated", false);
    // 互包跟踪: gameId -> Map<playerId, Map<partnerId, count>>
    // 记录每个玩家从另一个玩家吃/碰/杠了多少口
    __publicField$2(this, "mutualBailout", /* @__PURE__ */ new Map());
    // Pending action超时处理(自动推进)
    __publicField$2(this, "pendingActionTimers", /* @__PURE__ */ new Map());
    // 原子锁：防止同一游戏并发重复消费 pending actions
    __publicField$2(this, "actionResolutionLocks", /* @__PURE__ */ new Set());
    __publicField$2(this, "isConcealedDiscardState", isConcealedDiscardState);
    __publicField$2(this, "tileLabel", tileLabel);
    // Freeze/dealer auto-draw timers(需要在新局开始时清除)
    __publicField$2(this, "freezeTimers", /* @__PURE__ */ new Map());
    // AI托管模式:玩家ID集合,被标记的玩家由AI自动出牌
    __publicField$2(this, "botModePlayers", /* @__PURE__ */ new Set());
    __publicField$2(this, "winEvaluationCache", /* @__PURE__ */ new Map());
    /**
     * 超时自动接管:人类玩家连续2回合60秒未操作 → 自动AI托管
     * 仅本局结算减半,玩家回来后下一局恢复正常
     */
    __publicField$2(this, "autoTakeoverTimers", /* @__PURE__ */ new Map());
    // 追踪每个玩家连续超时次数(gameId-playerId → count)
    __publicField$2(this, "consecutiveTimeouts", /* @__PURE__ */ new Map());
    /**
     * 调度 bot 玩家延迟出牌
     */
    __publicField$2(this, "botTimers", /* @__PURE__ */ new Map());
  }
  detachTimer(timer) {
    var _a;
    (_a = timer == null ? void 0 : timer.unref) == null ? void 0 : _a.call(timer);
    return timer;
  }
  broadcastQuickMessage(gameId, text, type = "info", actionKind) {
    if (!this.wsManager) return;
    this.wsManager.broadcast(gameId, "broadcastMessage", {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      text,
      actionKind,
      type,
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }
  broadcastFlowerReplacement(game, player) {
    if (!this.wsManager) {
      console.log(`[broadcast] SKIP flowerReplace for ${player.name}: wsManager not set`);
      return;
    }
    console.log(`[broadcast] flowerReplace: ${player.name} \u8865\u82B1`);
    this.wsManager.broadcast(game.gameId, "broadcastMessage", {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      text: `\u{1F338} ${player.name}\u8865\u82B1`,
      actionKind: "flowerReplace",
      type: "special",
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }
  broadcastKongSupplement(game, player, kind) {
    if (!this.wsManager) return;
    const label = kind === "an" ? "\u6697\u6760" : kind === "jia" ? "\u8865\u6760" : "\u660E\u6760";
    this.wsManager.broadcast(game.gameId, "broadcastMessage", {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      text: `\u{1F004} ${player.name}${label}\u540E\u8865\u724C`,
      actionKind: "kongSupplement",
      type: "info",
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }
  broadcastRoomJoin(game, player) {
    if (!this.wsManager) return;
    this.wsManager.broadcast(game.gameId, "broadcastMessage", {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      text: `\u{1F464} ${player.name}\u8FDB\u5165\u5230\u4E86\u623F\u95F4`,
      actionKind: "roomJoin",
      type: "info",
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }
  canPlayerDrawOnCurrentTurn(game, player) {
    var _a;
    return game.phase === GamePhase.PLAYING && ((_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id) === player.id && !game.drawnThisTurn && this.getPlayableTileCount(player) < 14 && game.wall.length > 0;
  }
  hasActiveHuSelectionLock(game, excludePlayerId) {
    const locks = game.huSelectionLocks || {};
    return Object.keys(locks).some((playerId) => playerId !== excludePlayerId && Number(locks[playerId]) > 0);
  }
  hasBlockingDecisionLock(game, playerId) {
    if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now() && game.thinkFreezePlayerId !== playerId) {
      return true;
    }
    return this.hasActiveHuSelectionLock(game, playerId);
  }
  async setHuSelectionLock(gameId, playerId, locked) {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) throw new Error("Game not found");
    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");
    const nextLocks = { ...game.huSelectionLocks || {} };
    if (locked) {
      nextLocks[playerId] = Date.now();
    } else {
      delete nextLocks[playerId];
    }
    game.huSelectionLocks = Object.keys(nextLocks).length ? nextLocks : void 0;
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }
  isSharedDrawClaimWindow(game, playerId) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    const playerPending = game.pendingActions.filter((pa) => pa.playerId === playerId);
    if (playerPending.length === 0) return false;
    if (game.pendingActions.some((pa) => pa.playerId !== playerId)) return false;
    return playerPending.every(
      (pa) => pa.availableActions.length > 0 && pa.availableActions.every((action) => action === ActionType.CHOW || action === ActionType.PASS)
    );
  }
  isChowOnlyPendingTurn(game, playerId) {
    var _a;
    if (((_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id) !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    return game.pendingActions.every(
      (pa) => pa.playerId === playerId && pa.availableActions.every((action) => action === ActionType.CHOW || action === ActionType.PASS)
    );
  }
  canCurrentTurnPlayerDrawDuringPending(game, playerId) {
    return false;
  }
  canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (game.pendingActions.length === 0) return false;
    if (game.drawnThisTurn) return false;
    return this.canPlayerDrawOnCurrentTurn(game, currentPlayer);
  }
  canExecuteCurrentTurnPlayerDrawDuringPending(game, playerId, now = Date.now()) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (!this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId)) return false;
    return game.pendingActions.length > 0 && game.pendingActions.every((pa) => pa.playerId === playerId);
  }
  shouldAdvanceTurnAfterPass(game) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== PlayerStatus.PLAYING) return false;
    return !this.isConcealedDiscardState(currentPlayer) && !this.canPlayerDrawOnCurrentTurn(game, currentPlayer);
  }
  shouldRetainCurrentPlayerChowPending(game, pendingAction) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || pendingAction.playerId !== currentPlayer.id) return false;
    return this.isSharedDrawClaimWindow(game, currentPlayer.id) && pendingAction.availableActions.every((action) => action === ActionType.CHOW || action === ActionType.PASS);
  }
  /**
   * 按第5条规则清除过期claim：
   * - 当前摸牌方（下家B）的所有claim永远不清除
   * - 其他玩家（C/D）的过期claim清除
   * - 如果决策期内有动作触发（hasTriggeredAction），不清除任何claim
   */
  clearExpiredClaimsButKeepCurrentPlayerChow(game, now = Date.now()) {
    var _a;
    if (game.hasTriggeredAction) {
      return;
    }
    const currentPlayerId = (_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id;
    game.pendingActions = game.pendingActions.filter((pendingAction) => {
      if (!pendingAction.expiresAt || pendingAction.expiresAt > now) return true;
      if (pendingAction.playerId === currentPlayerId) return true;
      const player = game.players.find((p) => p.id === pendingAction.playerId);
      if (player && !this.isPlayerBotControlled(player)) return true;
      return false;
    });
    game.pengChowConflict = null;
    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
    }
  }
  /**
   * 清除当前玩家已过期的吃牌待处理动作。
   * 【重要】对于人类玩家，即使过期也不清除——玩家可能正在吃牌选择器中做选择，
   * 清除会导致前端丢失状态（玩家已点"吃"、选择中，却被摸倒计时清除了）。
   * 人类玩家应通过自己摸牌、过牌或确认吃牌来自然清除。bot 的吃牌过期则正常清除。
   */
  clearExpiredCurrentPlayerChowPending(game, now = Date.now()) {
    const before = game.pendingActions.length;
    const currentPlayer = game.players[game.currentPlayerIndex];
    const isHumanPlayer = currentPlayer && !this.isPlayerBotControlled(currentPlayer);
    game.pendingActions = game.pendingActions.filter((pendingAction) => {
      if (!this.shouldRetainCurrentPlayerChowPending(game, pendingAction)) return true;
      const expiresAt = typeof pendingAction.expiresAt === "number" ? pendingAction.expiresAt : 0;
      if (expiresAt > now) return true;
      if (isHumanPlayer) return true;
      return false;
    });
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }
  clearCurrentPlayerChowPending(game) {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter((pendingAction) => !this.shouldRetainCurrentPlayerChowPending(game, pendingAction));
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }
  clearExpiredClaimsForDecisionWindow(game, now = Date.now()) {
    var _a;
    if (game.hasTriggeredAction) return;
    const currentPlayerId = (_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id;
    game.pendingActions = game.pendingActions.filter((pendingAction) => {
      if (!pendingAction.expiresAt || pendingAction.expiresAt > now) return true;
      return pendingAction.playerId === currentPlayerId;
    });
    game.pengChowConflict = null;
    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
    }
  }
  clearCurrentTurnPendingActions(game, playerId) {
    const before = game.pendingActions.length;
    game.pendingActions = game.pendingActions.filter((pendingAction) => pendingAction.playerId !== playerId);
    if (before !== game.pendingActions.length) {
      game.pengChowConflict = null;
      this.clearPendingActionTimer(game.gameId);
      return true;
    }
    return false;
  }
  autoDrawForCurrentPlayer(game) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== PlayerStatus.PLAYING) return false;
    if (!this.canPlayerDrawOnCurrentTurn(game, currentPlayer)) return false;
    this.replaceInitialFlowers(game, currentPlayer);
    const totalTileCount = this.getPlayableTileCount(currentPlayer);
    if (totalTileCount >= 14) {
      game.drawnThisTurn = true;
      return true;
    }
    this.handleDraw(game, currentPlayer);
    game.drawnThisTurn = true;
    return true;
  }
  canPlayerDeclareTurnHu(game, player) {
    if (!game.drawnThisTurn) return false;
    if (player.lastDrawnTile) return true;
    const lastAction = game.actionHistory[game.actionHistory.length - 1];
    return !!lastAction && lastAction.playerId === player.id && lastAction.type === ActionType.DRAW;
  }
  getConcealedPlayableTiles(game, player) {
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    return player.hand.concealedTiles.filter((tile) => !isFlower(tile) || isWildTile(tile));
  }
  isListeningPreviewState(game, player) {
    const concealedPlayableCount = this.getConcealedPlayableTiles(game, player).length;
    return [1, 4, 7, 10, 13].includes(concealedPlayableCount);
  }
  isDaDiaoReadyState(game, player) {
    return this.getConcealedPlayableTiles(game, player).length === 1;
  }
  filterBigDiaoPreviewTiles(game, player, winningTiles) {
    if (!this.isDaDiaoReadyState(game, player)) return winningTiles;
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const visibleTiles = [
      ...player.hand.concealedTiles.filter((tile) => !isWildTile(tile) && !isFlower(tile)),
      ...player.hand.exposedMelds.flatMap((meld) => meld.tiles || []).filter((tile) => !isWildTile(tile) && !isFlower(tile))
    ];
    const numberSuits = new Set(visibleTiles.filter((tile) => tile.suit === TileSuit.DOTS || tile.suit === TileSuit.CHARACTERS || tile.suit === TileSuit.BAMBOOS).map((tile) => tile.suit));
    const hasHonor = visibleTiles.some((tile) => tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON);
    if (numberSuits.size !== 1 || hasHonor) return winningTiles;
    const [lockedSuit] = [...numberSuits];
    return winningTiles.filter((entry) => entry.tile.suit === lockedSuit);
  }
  getPlayerWinCache(gameId, playerId) {
    if (!this.winEvaluationCache.has(gameId)) {
      this.winEvaluationCache.set(gameId, /* @__PURE__ */ new Map());
    }
    const gameCache = this.winEvaluationCache.get(gameId);
    if (!gameCache.has(playerId)) {
      gameCache.set(playerId, {
        fast: /* @__PURE__ */ new Map(),
        options: /* @__PURE__ */ new Map(),
        ting: /* @__PURE__ */ new Map()
      });
    }
    return gameCache.get(playerId);
  }
  invalidateWinEvaluationCache(gameId, playerIds) {
    if (!playerIds || playerIds.length === 0) {
      this.winEvaluationCache.delete(gameId);
      return;
    }
    const gameCache = this.winEvaluationCache.get(gameId);
    if (!gameCache) return;
    for (const playerId of playerIds) {
      gameCache.delete(playerId);
    }
    if (gameCache.size === 0) {
      this.winEvaluationCache.delete(gameId);
    }
  }
  buildTileSignature(tiles) {
    return tiles.map((tile) => `${tile.suit}:${tile.value}`).sort().join(",");
  }
  buildMeldSignature(melds) {
    return melds.map((meld) => `${meld.type}:${meld.isConcealed ? "1" : "0"}:${this.buildTileSignature(meld.tiles)}`).sort().join("|");
  }
  getPlayerFlowerTiles(player) {
    return player.hand.exposedMelds.flatMap((meld) => meld.tiles).filter((tile) => isFlower(tile));
  }
  isPlayerMenQing(player) {
    return !player.hand.exposedMelds.some(
      (meld) => meld.type === MeldType.TRIPLET || meld.type === MeldType.SEQUENCE || meld.type === MeldType.KONG && !meld.isConcealed
    );
  }
  getPlayerWinContextKey(game, player) {
    var _a, _b, _c;
    return [
      `concealed=${this.buildTileSignature(player.hand.concealedTiles)}`,
      `melds=${this.buildMeldSignature(player.hand.exposedMelds)}`,
      `flowers=${this.getPlayerFlowerTiles(player).length}`,
      `wild=${game.customScoringMode || ""}`,
      `wildGroup=${(game.wildTileGroup || []).join(",")}`,
      `round=${(_a = game.roundMultiplier) != null ? _a : 1}`,
      `inherit=${(_b = game.inheritMultiplier) != null ? _b : 1}`,
      `settlement=${(_c = game.settlementMultiplier) != null ? _c : 1}`
    ].join("|");
  }
  getWinWildArg(game) {
    return game.customScoringMode || null;
  }
  getCachedWinCheck(game, player) {
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = this.getPlayerWinContextKey(game, player);
    const cached = playerCache.fast.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = canWin(player.hand.concealedTiles, player.hand.exposedMelds, this.getWinWildArg(game));
    playerCache.fast.set(cacheKey, result);
    return result;
  }
  getCachedWinOptions(game, player, context, flags) {
    var _a, _b, _c, _d;
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = [
      this.getPlayerWinContextKey(game, player),
      `ctx=${context}`,
      `kongFlower=${(flags == null ? void 0 : flags.isKongFlower) ? 1 : 0}`,
      `robKong=${(flags == null ? void 0 : flags.isRobbingKong) ? 1 : 0}`,
      `extra=${(flags == null ? void 0 : flags.extraTile) ? `${flags.extraTile.suit}-${flags.extraTile.value}` : ""}`
    ].join("|");
    const cached = playerCache.options.get(cacheKey);
    if (cached) {
      return cached;
    }
    const handTiles = (flags == null ? void 0 : flags.extraTile) ? [...player.hand.concealedTiles, flags.extraTile] : player.hand.concealedTiles;
    const winCheck = (flags == null ? void 0 : flags.extraTile) ? canWin(handTiles, player.hand.exposedMelds, this.getWinWildArg(game)) : this.getCachedWinCheck(game, player);
    const wildParts = (_a = game.customScoringMode) == null ? void 0 : _a.split("-");
    const wildSuit = (wildParts == null ? void 0 : wildParts[0]) ? wildParts[0] : void 0;
    const wildValue = (wildParts == null ? void 0 : wildParts[1]) ? parseInt(wildParts[1], 10) : void 0;
    const allOptions = generateWinOptions({
      handTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles: this.getPlayerFlowerTiles(player),
      handTypes: winCheck.types,
      isKongFlower: !!(flags == null ? void 0 : flags.isKongFlower),
      isRobbingKong: !!(flags == null ? void 0 : flags.isRobbingKong),
      isMenQing: this.isPlayerMenQing(player),
      wildTileSuit: wildSuit,
      wildTileValue: wildValue,
      wildTileGroup: game.wildTileGroup,
      rawRoundMultiplier: (_b = game.roundMultiplier) != null ? _b : 1,
      rawInheritMultiplier: (_c = game.inheritMultiplier) != null ? _c : 1,
      settlementMultiplier: (_d = game.settlementMultiplier) != null ? _d : 1
    });
    const topOptions = allOptions.filter((option) => option.type === context).sort((a, b) => b.score - a.score).slice(0, 3);
    playerCache.options.set(cacheKey, topOptions);
    return topOptions;
  }
  prewarmWinEvaluation(game, player, context, extraTile) {
    if (player.status !== PlayerStatus.PLAYING) return;
    const winCheck = extraTile ? canWin([...player.hand.concealedTiles, extraTile], player.hand.exposedMelds, this.getWinWildArg(game)) : this.getCachedWinCheck(game, player);
    if (!winCheck.canWin) return;
    this.getCachedWinOptions(game, player, context, {
      isKongFlower: context === "self_draw" && !!player.isSelfDrawn,
      isRobbingKong: context === "discard" && !!game.pendingKongClaim,
      extraTile
    });
  }
  getWinningTileCandidates() {
    const candidates = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let value = 1; value <= 9; value++) {
        candidates.push({ suit, value });
      }
    }
    for (let value = 1; value <= 4; value++) {
      candidates.push({ suit: TileSuit.WIND, value });
    }
    for (let value = 1; value <= 3; value++) {
      candidates.push({ suit: TileSuit.DRAGON, value });
    }
    return candidates;
  }
  getTingPreviewCandidates(game) {
    var _a;
    const candidates = this.getWinningTileCandidates();
    if (((_a = game.customScoringMode) == null ? void 0 : _a.startsWith(`${TileSuit.FLOWER}-`)) && Array.isArray(game.wildTileGroup)) {
      for (const valueText of game.wildTileGroup) {
        const value = parseInt(valueText, 10);
        if (!Number.isNaN(value) && value >= 1 && value <= 8) {
          candidates.push({ suit: TileSuit.FLOWER, value });
        }
      }
    }
    return candidates;
  }
  getTileMaxCopies(suit) {
    return suit === TileSuit.FLOWER ? 1 : 4;
  }
  getVisibleRemainingCount(game, player, suit, value) {
    const visibleCount = player.hand.concealedTiles.filter((tile) => tile.suit === suit && tile.value === value).length + game.discardPile.filter((tile) => tile.suit === suit && tile.value === value).length + game.players.flatMap((p) => p.hand.exposedMelds).flatMap((meld) => meld.tiles).filter((tile) => tile.suit === suit && tile.value === value).length;
    return Math.max(0, this.getTileMaxCopies(suit) - visibleCount);
  }
  quickPrecheckTenpai(game, player) {
    const discardCount = game.discardPile.length;
    const playerCount = game.players.filter((p) => p.status === PlayerStatus.PLAYING).length;
    const calculatedRound = Math.max(1, Math.ceil(discardCount / Math.max(1, playerCount)));
    if (calculatedRound < 3) {
      return false;
    }
    const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const concealed = player.hand.concealedTiles;
    const wildCount = concealed.filter((t) => isWildTile(t)).length;
    const flowerCount = concealed.filter((t) => isFlower(t)).length;
    if (wildCount >= 4) return true;
    if (flowerCount >= 8) return true;
    const nonWildNonFlower = concealed.filter((t) => !isFlower(t) && !isWildTile(t));
    const valueCounts = /* @__PURE__ */ new Map();
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }
    const numberSuits = /* @__PURE__ */ new Set();
    for (const t of nonWildNonFlower) {
      if (t.suit !== TileSuit.WIND && t.suit !== TileSuit.DRAGON) {
        numberSuits.add(t.suit);
      }
    }
    const hasMultipleNumberSuits = numberSuits.size >= 2;
    let orphanCount = 0;
    for (const t of nonWildNonFlower) {
      const key = `${t.suit}-${t.value}`;
      if (valueCounts.get(key) >= 2) continue;
      if (t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON) {
        orphanCount++;
        continue;
      }
      const prevKey = `${t.suit}-${t.value - 1}`;
      const nextKey = `${t.suit}-${t.value + 1}`;
      if (!valueCounts.has(prevKey) && !valueCounts.has(nextKey)) {
        orphanCount++;
      }
    }
    if (wildCount === 0) {
      if (orphanCount >= 2) return false;
      if (hasMultipleNumberSuits && orphanCount >= 1) return false;
      return true;
    }
    if (hasMultipleNumberSuits && orphanCount >= 2) return false;
    return true;
  }
  getCachedTingPreview(game, player) {
    const playerCache = this.getPlayerWinCache(game.gameId, player.id);
    const cacheKey = `${this.getPlayerWinContextKey(game, player)}|ting-preview`;
    const cached = playerCache.ting.get(cacheKey);
    if (cached) {
      return cached;
    }
    if (!this.quickPrecheckTenpai(game, player)) {
      const emptyResult = { isTing: false, winningTiles: [] };
      playerCache.ting.set(cacheKey, emptyResult);
      return emptyResult;
    }
    const candidates = this.getTingPreviewCandidates(game);
    const wildChecker = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    const winWildArg = game.customScoringMode || null;
    const winningTileMap = /* @__PURE__ */ new Map();
    if (!this.isListeningPreviewState(game, player)) {
      const emptyResult = { isTing: false, winningTiles: [] };
      playerCache.ting.set(cacheKey, emptyResult);
      return emptyResult;
    }
    for (const { suit, value } of candidates) {
      const testTile = {
        id: `ting-preview-${suit}-${value}`,
        suit,
        value,
        isFlower: suit === TileSuit.FLOWER
      };
      const winCheck = canWin([...player.hand.concealedTiles, testTile], player.hand.exposedMelds, winWildArg);
      if (!winCheck.canWin) continue;
      const discardOptions = this.getCachedWinOptions(game, player, "discard", {
        extraTile: testTile,
        isRobbingKong: false
      });
      const selfDrawOptions = this.getCachedWinOptions(game, player, "self_draw", {
        extraTile: testTile,
        isKongFlower: false
      });
      const bestDiscardOption = discardOptions[0] || null;
      const bestSelfDrawOption = selfDrawOptions[0] || null;
      const bestOverallOption = [bestDiscardOption, bestSelfDrawOption].filter(Boolean).sort((a, b) => {
        var _a, _b;
        return ((_a = b.score) != null ? _a : 0) - ((_b = a.score) != null ? _b : 0);
      })[0] || null;
      winningTileMap.set(`${suit}-${value}`, {
        tile: testTile,
        remainingCount: 0,
        bestDiscardOption,
        bestSelfDrawOption,
        bestOverallOption
      });
    }
    const winningTiles = this.filterBigDiaoPreviewTiles(game, player, [...winningTileMap.values()]).filter((entry) => !wildChecker(entry.tile)).sort((a, b) => {
      var _a, _b;
      const suitOrder = {
        [TileSuit.CHARACTERS]: 0,
        [TileSuit.BAMBOOS]: 1,
        [TileSuit.DOTS]: 2,
        [TileSuit.WIND]: 3,
        [TileSuit.DRAGON]: 4,
        [TileSuit.FLOWER]: 5
      };
      const suitDelta = ((_a = suitOrder[a.tile.suit]) != null ? _a : 99) - ((_b = suitOrder[b.tile.suit]) != null ? _b : 99);
      if (suitDelta !== 0) return suitDelta;
      const valueDelta = a.tile.value - b.tile.value;
      if (valueDelta !== 0) return valueDelta;
      return 0;
    });
    const result = {
      isTing: winningTiles.length > 0,
      winningTiles
    };
    playerCache.ting.set(cacheKey, result);
    return result;
  }
  /** 训练快速模式: TRAINING_FAST_MODE=true 或 allClaimMode */
  isTrainingFastMode(game) {
    const fastByEnv = String(process.env.TRAINING_FAST_MODE || "").toLowerCase() === "true";
    return fastByEnv || !!game.allClaimMode;
  }
  /** 获取决策犹豫期(毫秒):训练模式0~30ms,实战默认5000ms */
  getHesitationWindow(game) {
    var _a;
    const raw = (_a = game.hesitationWindow) != null ? _a : 5e3;
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, raw));
    }
    return raw;
  }
  /** 获取犹豫等待毫秒数(用于setTimeout等) */
  getHesitationWaitMs(gameId) {
    const game = this.games.get(gameId);
    if (!game) return 5e3;
    return this.getHesitationWindow(game);
  }
  getBotDrawFreezeMs(game) {
    const base = this.getHesitationWindow(game);
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, base));
    }
    return base;
  }
  getBotDiscardDelayMs(game) {
    const base = this.getHesitationWindow(game);
    if (this.isTrainingFastMode(game)) {
      return Math.min(30, Math.max(0, base));
    }
    const reducedBase = Math.max(250, Math.floor(base / 2));
    return reducedBase + Math.floor(Math.random() * 250);
  }
  isChowChoiceOnlyActions(actions) {
    return actions.includes(ActionType.CHOW) && !actions.some((action) => [
      ActionType.HU,
      ActionType.PENG,
      ActionType.KONG,
      ActionType.CONCEALED_KONG,
      ActionType.EXTENDED_KONG
    ].includes(action));
  }
  getPendingActionExpiresAt(game, actions) {
    return Date.now() + this.getHesitationWindow(game);
  }
  getHumanClaimDecisionTimeoutMs(game, player, actions) {
    return this.getHesitationWindow(game);
  }
  getPendingActionWaitMs(gameId) {
    const game = this.games.get(gameId);
    if (!(game == null ? void 0 : game.pendingActions.length)) return this.getHesitationWaitMs(gameId);
    const now = Date.now();
    const nextExpiresAt = Math.min(
      ...game.pendingActions.map(
        (pa) => typeof pa.expiresAt === "number" ? pa.expiresAt : now + this.getHesitationWindow(game)
      )
    );
    return Math.max(0, nextExpiresAt - now);
  }
  setWebSocketManager(manager) {
    this.wsManager = manager;
  }
  // ===== AI托管模式控制 =====
  /**
   * 判断玩家是否被AI托管(包括本身是bot玩家,或被手动标记为AI托管)
   */
  isPlayerBotControlled(player) {
    return isBotPlayer(player) || this.botModePlayers.has(player.id);
  }
  /**
   * 启用AI托管模式
   */
  enableBotMode(gameId, playerId) {
    this.botModePlayers.add(playerId);
    const game = this.games.get(gameId);
    if (game) {
      if (!game.botTakeoverPlayers) game.botTakeoverPlayers = [];
      if (!game.botTakeoverPlayers.includes(playerId)) {
        game.botTakeoverPlayers.push(playerId);
      }
    }
    this.scheduleBotDiscard(gameId, playerId);
  }
  /**
   * 禁用AI托管模式(玩家回来)
   */
  disableBotMode(playerId) {
    this.botModePlayers.delete(playerId);
  }
  /**
   * 检查玩家是否处于AI托管模式
   */
  isPlayerInBotMode(playerId) {
    return this.botModePlayers.has(playerId);
  }
  clearPendingActionTimer(gameId) {
    const timer = this.pendingActionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.pendingActionTimers.delete(gameId);
    }
  }
  currentTurnPlayerHasPendingClaims(game) {
    var _a;
    const currentPlayerId = (_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id;
    if (!currentPlayerId) return false;
    return game.pendingActions.some((pa) => pa.playerId === currentPlayerId);
  }
  refreshPendingActionExpirations(game, now = Date.now(), predicate) {
    const nextExpiresAt = now + this.getHesitationWindow(game);
    for (const pendingAction of game.pendingActions) {
      if (predicate && !predicate(pendingAction)) continue;
      pendingAction.expiresAt = Math.max(
        typeof pendingAction.expiresAt === "number" ? pendingAction.expiresAt : 0,
        nextExpiresAt
      );
    }
  }
  schedulePendingActionTimeout(gameId) {
    this.clearPendingActionTimer(gameId);
    const timer = this.detachTimer(setTimeout(async () => {
      if (this.actionResolutionLocks.has(gameId)) return;
      this.actionResolutionLocks.add(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (!game.pendingActions.length) return;
        if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now()) {
          this.schedulePendingActionTimeout(gameId);
          return;
        }
        if (game.pengChowConflict) {
          this.schedulePendingActionTimeout(gameId);
          return;
        }
        const pendingTiles = game.pendingActions.map((pa) => {
          var _a;
          return (_a = pa.tile) == null ? void 0 : _a.id;
        }).filter(Boolean);
        const discardIds = new Set(game.discardPile.map((t) => t.id));
        const tileClaimed = pendingTiles.some((tid) => tid && !discardIds.has(tid));
        if (tileClaimed) {
          game.pendingActions = [];
          await this.persistGame(game);
          return;
        }
        const allClaimMode = game.allClaimMode;
        const now = Date.now();
        const currentPlayer = game.players[game.currentPlayerIndex];
        const expired = game.pendingActions.filter(
          (pa) => !pa.expiresAt || pa.expiresAt <= now
        );
        const hasTriggeredAction = !!game.hasTriggeredAction;
        if (allClaimMode) {
          const pending = game.pendingActions;
          const resolvedPlayerIds = /* @__PURE__ */ new Set();
          for (const pa of pending) {
            const player = game.players.find((p) => p.id === pa.playerId);
            if (!player || !this.isPlayerBotControlled(player)) continue;
            await this.resolvePendingAction(game, player, pa);
            resolvedPlayerIds.add(player.id);
          }
          if (resolvedPlayerIds.size === 0) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
            return;
          }
          game.pendingActions = game.pendingActions.filter((pa) => !resolvedPlayerIds.has(pa.playerId));
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          if (game.pendingActions.length > 0) {
            this.schedulePendingActionTimeout(gameId);
            return;
          }
          if (currentPlayer && this.isPlayerBotControlled(currentPlayer) && this.autoDrawForCurrentPlayer(game)) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
          }
          return;
        }
        if (hasTriggeredAction) {
          this.refreshPendingActionExpirations(game, now);
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          this.schedulePendingActionTimeout(gameId);
          return;
        }
        this.clearExpiredClaimsForDecisionWindow(game, now);
        if (game.pendingActions.length === 0) {
          if (currentPlayer && this.isPlayerBotControlled(currentPlayer) && this.autoDrawForCurrentPlayer(game)) {
            await this.persistGame(game);
            this.broadcastGameState(gameId);
            this.scheduleBotDiscard(gameId, currentPlayer.id);
            return;
          }
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          return;
        }
        if (currentPlayer && this.canExecuteCurrentTurnPlayerDrawDuringPending(game, currentPlayer.id)) {
          if (this.isPlayerBotControlled(currentPlayer)) {
            this.clearCurrentTurnPendingActions(game, currentPlayer.id);
            if (this.autoDrawForCurrentPlayer(game)) {
              await this.persistGame(game);
              this.broadcastGameState(gameId);
              this.scheduleBotDiscard(gameId, currentPlayer.id);
              return;
            }
          }
          await this.persistGame(game);
          this.broadcastGameState(gameId);
          return;
        }
        this.schedulePendingActionTimeout(gameId);
        await this.persistGame(game);
        this.broadcastGameState(gameId);
      } catch (err) {
        console.error("Failed to auto-resolve pending actions:", err);
      } finally {
        this.actionResolutionLocks.delete(gameId);
        if (this.pendingActionTimers.get(gameId) === timer) {
          this.pendingActionTimers.delete(gameId);
        }
      }
    }, this.getPendingActionWaitMs(gameId)));
    this.pendingActionTimers.set(gameId, timer);
  }
  /**
   * 让 bot 处理自己的 pending action(碰/杠/胡/吃/过)
   * Bug修复:bot必须等满 hesitationWindow 再 action,否则人类按钮闪现消失
   */
  /** 统一处理 pendingAction 决策(吃/碰/杠/胡/PASS) */
  async resolvePendingAction(game, player, pa) {
    const action = await shouldClaimPendingAction(player, pa.availableActions, game);
    console.log(`[PendingResolve] ${player.name} \u2192 ${action}`);
    if (action === ActionType.PASS) {
      this.handlePass(game, player);
    } else if (action === ActionType.PENG) {
      const pengExposed = this.countExposedTilesExcludingFlowerMelds(player);
      const pengTotal = player.hand.concealedTiles.length + pengExposed;
      if (pengTotal - 2 + 3 <= 14) {
        this.handlePeng(game, player);
      } else {
        this.handlePass(game, player);
      }
    } else if (action === ActionType.CHOW) {
      const chowExposed = this.countExposedTilesExcludingFlowerMelds(player);
      const chowTotal = player.hand.concealedTiles.length + chowExposed;
      if (chowTotal - 2 + 3 <= 14) {
        console.log(`[PendingResolve] ${player.name} executing CHOW (concealed=${player.hand.concealedTiles.length}, exposed=${chowExposed})`);
        this.handleChow(game, player, pa.selectedChowTileIds);
      } else {
        console.warn(`[PendingResolve] ${player.name} CHOW blocked: would exceed 14 tiles (total=${chowTotal})`);
        this.handlePass(game, player);
      }
    } else if (action === ActionType.HU) {
      await this.handleHu(game, player);
    } else {
      this.handlePass(game, player);
    }
  }
  /** bot 训练模式专用 */
  countExposedTilesExcludingFlowerMelds(player) {
    return player.hand.exposedMelds.reduce((sum, m) => {
      if (m.tiles.length === 1 && isFlower(m.tiles[0])) return sum;
      if (m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG) return sum + 3;
      return sum + m.tiles.length;
    }, 0);
  }
  getPlayableTileCount(player) {
    return player.hand.concealedTiles.length + this.countExposedTilesExcludingFlowerMelds(player);
  }
  /**
   * 实战模式：bot 高优先级动作（碰/杠/胡）立即执行，但不破坏人类玩家的决策窗口
   * 
   * 核心规则：
   * 1. bot 的碰/杠/胡可以立即执行（不需要等满 hesitationWindow）
   * 2. 执行后保留人类玩家的 pending 状态，特别是胡按钮必须在决策期内保持可用
   * 3. 人类玩家的吃按钮可以被清除（因为碰/杠/胡优先级更高）
   * 4. 人类的胡按钮必须在 hesitationWindow 内保持可用，等人类自己响应或超时
   */
  async handleBotPendingActions(gameId) {
    var _a;
    if (this.actionResolutionLocks.has(gameId)) return;
    const game = this.games.get(gameId);
    if (!game) return;
    try {
      if (game.phase !== GamePhase.PLAYING) return;
      if (game.pendingActions.length === 0) return;
      let claimedHigherPriority = false;
      const humanPendingActions = game.pendingActions.filter((pa) => {
        const p = game.players.find((pl) => pl.id === pa.playerId);
        return p && !this.isPlayerBotControlled(p);
      });
      for (const pa of [...game.pendingActions]) {
        const player = game.players.find((p) => p.id === pa.playerId);
        if (!player || player.status !== PlayerStatus.PLAYING) continue;
        if (!this.isPlayerBotControlled(player)) continue;
        const higherActions = pa.availableActions.filter(
          (a) => a === ActionType.PENG || a === ActionType.KONG || a === ActionType.HU
        );
        if (higherActions.length === 0) continue;
        const filteredHigherActions = higherActions.filter((candidate) => {
          if (candidate !== ActionType.HU) return true;
          const winOptions = this.getCachedWinOptions(game, player, "discard", {
            isRobbingKong: !!game.pendingKongClaim
          });
          return winOptions.length > 0;
        });
        if (filteredHigherActions.length === 0) {
          if (pa.availableActions.includes(ActionType.CHOW)) continue;
          this.handlePass(game, player);
          continue;
        }
        const action = await shouldClaimPendingAction(player, filteredHigherActions, game);
        console.log(`[BotService] ${player.name} priority action: ${action} (from ${filteredHigherActions})`);
        if (action === ActionType.PENG) {
          const pengExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
          if (pengTotalCount - 2 + 3 <= 14) {
            this.handlePeng(game, player);
            claimedHigherPriority = true;
          } else {
            console.warn(`[BotPeng] ${player.name} blocked: would exceed 14 tiles`);
            this.handlePass(game, player);
          }
        } else if (action === ActionType.KONG) {
          const kongExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 <= 14) {
            this.handleKong(game, player, ((_a = pa.tile) == null ? void 0 : _a.id) || "");
            claimedHigherPriority = true;
          } else {
            console.warn(`[BotKong] ${player.name} blocked: would exceed 14 tiles`);
            this.handlePass(game, player);
          }
        } else if (action === ActionType.HU) {
          try {
            await this.handleHu(game, player);
            claimedHigherPriority = true;
          } catch (err) {
            console.warn(`[BotHu] ${player.name} skipped invalid hu: ${(err == null ? void 0 : err.message) || err}`);
            this.handlePass(game, player);
          }
        }
      }
      if (claimedHigherPriority) {
        const botIds = new Set(game.players.filter((p) => this.isPlayerBotControlled(p)).map((p) => p.id));
        game.pendingActions = game.pendingActions.filter((pa) => !botIds.has(pa.playerId));
      } else {
        const botIds = new Set(game.players.filter((p) => this.isPlayerBotControlled(p)).map((p) => p.id));
        game.pendingActions = game.pendingActions.filter(
          (pa) => !botIds.has(pa.playerId) || pa.availableActions.includes(ActionType.CHOW)
        );
        const now = Date.now();
        for (const pa of game.pendingActions) {
          const pendingPlayer = game.players.find((p) => p.id === pa.playerId);
          if (pendingPlayer && this.isPlayerBotControlled(pendingPlayer) && this.isChowChoiceOnlyActions(pa.availableActions)) {
            pa.selectedChowTileIds = pa.tile ? selectBotChowTileIds(pendingPlayer, game, pa.tile, pa.chowOptions) : void 0;
            pa.expiresAt = now + this.getHesitationWindow(game);
          }
        }
      }
      await this.persistGame(game);
      this.broadcastGameState(gameId);
      if (claimedHigherPriority) {
        const claimingPlayer = game.players[game.currentPlayerIndex];
        if (claimingPlayer && this.isPlayerBotControlled(claimingPlayer)) {
          this.scheduleBotDiscard(gameId, claimingPlayer.id);
        }
        this.schedulePendingActionTimeout(gameId);
      } else if (game.pendingActions.length === 0 && this.shouldAdvanceTurnAfterPass(game)) {
        await this.moveToNextPlayer(game);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    } catch (err) {
      console.error("[BotService] Pending action error:", err);
    }
  }
  /**
   * 记录吃/碰来源,检测互包关系
   */
  recordBailoutAction(gameId, playerId, sourcePlayerId, meldType) {
    if (!sourcePlayerId) return 0;
    if (meldType !== MeldType.TRIPLET && meldType !== MeldType.SEQUENCE && meldType !== MeldType.KONG) return 0;
    if (!this.mutualBailout.has(gameId)) {
      this.mutualBailout.set(gameId, /* @__PURE__ */ new Map());
    }
    const gameBailout = this.mutualBailout.get(gameId);
    if (!gameBailout.has(playerId)) {
      gameBailout.set(playerId, /* @__PURE__ */ new Map());
    }
    const playerBailout = gameBailout.get(playerId);
    const currentCount = playerBailout.get(sourcePlayerId) || 0;
    const nextCount = currentCount + 1;
    playerBailout.set(sourcePlayerId, nextCount);
    return nextCount;
  }
  /**
   * 获取互包关系
   * @returns 三口/四口关系列表
   */
  getMutualBailoutRelations(gameId) {
    var _a, _b;
    const relations = [];
    const gameBailout = this.mutualBailout.get(gameId);
    if (!gameBailout) return relations;
    const checked = /* @__PURE__ */ new Set();
    for (const [playerId, partnerCounts] of gameBailout) {
      for (const [partnerId, count] of partnerCounts) {
        const key = [playerId, partnerId].sort().join("-");
        if (checked.has(key)) continue;
        checked.add(key);
        const countAtoB = ((_a = gameBailout.get(playerId)) == null ? void 0 : _a.get(partnerId)) || 0;
        const countBtoA = ((_b = gameBailout.get(partnerId)) == null ? void 0 : _b.get(playerId)) || 0;
        if (countAtoB >= 4 || countBtoA >= 4) {
          relations.push({ player1: playerId, player2: partnerId, type: "\u56DB\u53E3" });
        } else if (countAtoB >= 3 || countBtoA >= 3) {
          relations.push({ player1: playerId, player2: partnerId, type: "\u4E09\u53E3" });
        }
      }
    }
    return relations;
  }
  /** 检测新形成的互包关系并广播到牌局快讯 */
  checkAndBroadcastBailout(game, playerId, sourcePlayerId) {
    var _a, _b;
    const relations = this.getMutualBailoutRelations(game.gameId);
    const player = game.players.find((p) => p.id === playerId);
    const source = game.players.find((p) => p.id === sourcePlayerId);
    if (!player || !source) {
      console.log(`[BAILOUT] SKIP: player=${!!player} source=${!!source} playerId=${playerId} sourcePlayerId=${sourcePlayerId}`);
      return;
    }
    const rawCount = (_b = (_a = this.mutualBailout.get(game.gameId)) == null ? void 0 : _a.get(playerId)) == null ? void 0 : _b.get(sourcePlayerId);
    const currentCount = rawCount || 0;
    console.log(`[BAILOUT] game=${game.gameId} player=${player.name} source=${source.name} count=${currentCount} wsManager=${!!this.wsManager}`);
    if ((currentCount === 2 || currentCount === 3) && this.wsManager) {
      const label = currentCount === 3 ? "\u4E09\u53E3" : "\u4E24\u53E3";
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now(),
        text: `\u{1F4E3} ${player.name}\u5DF2\u7ECF\u641E\u4E86${source.name}${label}\u4E86\uFF01`,
        type: "special",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    if ((currentCount === 2 || currentCount === 3) && this.wsManager) {
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now() + 1,
        text: `\u{1F4E3} ${player.name}\u5DF2\u7ECF\u641E\u4E86${source.name}${currentCount}\u53E3\u4E86\uFF01`,
        type: "special",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    for (const rel of relations) {
      const pairIds = [rel.player1, rel.player2].sort().join("-");
      const checkIds = [playerId, sourcePlayerId].sort().join("-");
      if (pairIds === checkIds) {
        const msg = `${player.name}\u641E\u4E86${source.name}${rel.type}\u4E86!`;
        if (this.wsManager) {
          this.wsManager.broadcast(game.gameId, "broadcastMessage", {
            id: Date.now(),
            text: msg,
            type: "special",
            timestamp: Date.now(),
            timeLabel: formatBeijingTime()
          });
        }
      }
    }
  }
  /**
   * 检查两个玩家之间是否有互包关系
   */
  getBailoutMultiplier(gameId, payerId, winnerId) {
    const relations = this.getMutualBailoutRelations(gameId);
    for (const rel of relations) {
      if (rel.player1 === payerId && rel.player2 === winnerId || rel.player1 === winnerId && rel.player2 === payerId) {
        return {
          multiplier: rel.type === "\u56DB\u53E3" ? 5 : 3,
          type: rel.type
        };
      }
    }
    return { multiplier: 1, type: null };
  }
  /**
   * 获取最后一张弃牌的玩家ID
   */
  getLastDiscardPlayerId(game) {
    var _a;
    if (game.lastDiscardPlayerId) {
      return game.lastDiscardPlayerId;
    }
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      if (game.actionHistory[i].type === ActionType.DISCARD) {
        return game.actionHistory[i].playerId;
      }
    }
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (lastDiscard) {
      const discarder = game.players.find((p) => p.hand.discardedTiles.some((t) => t.id === lastDiscard.id));
      if (discarder) return discarder.id;
      return (_a = game.players[game.currentPlayerIndex]) == null ? void 0 : _a.id;
    }
    return void 0;
  }
  getPlayerPosition(game, playerId) {
    var _a, _b;
    return (_b = (_a = game.players.find((p) => p.id === playerId)) == null ? void 0 : _a.position) != null ? _b : 0;
  }
  getLastDiscardPosition(game) {
    if (typeof game.lastDiscardPosition === "number") {
      return game.lastDiscardPosition;
    }
    const id = this.getLastDiscardPlayerId(game);
    if (!id) return void 0;
    return this.getPlayerPosition(game, id);
  }
  /**
   * 检测杠上开花:自摸且最近的非DRAW动作是杠牌
   * 流程:杠 → 自动补牌(可能补花再DRAW) → 玩家回合胡牌
   */
  isWinAfterKong(game, playerId) {
    const kongTypes = /* @__PURE__ */ new Set([
      ActionType.KONG,
      ActionType.CONCEALED_KONG,
      ActionType.EXTENDED_KONG
    ]);
    for (let i = game.actionHistory.length - 1; i >= 0; i--) {
      const action = game.actionHistory[i];
      if (action.playerId !== playerId) continue;
      if (action.type === ActionType.DRAW) continue;
      return kongTypes.has(action.type);
    }
    return false;
  }
  async hydrateFromDatabase() {
    if (this.isHydrated) return;
    this.isHydrated = true;
  }
  async ensureGameLoaded(gameId) {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }
    try {
      const stored = await loadGameState(gameId);
      if (stored) {
        this.games.set(gameId, stored);
        for (const player of stored.players) {
          this.playerToGame.set(player.id, gameId);
        }
        return stored;
      }
    } catch (err) {
      console.warn("\u26A0\uFE0F ensureGameLoaded failed:", err.message);
    }
    return void 0;
  }
  async persistGame(game) {
    try {
      await saveGameState(game);
    } catch (error) {
      console.warn("\u26A0\uFE0F MongoDB persist failed:", error.message);
    }
  }
  broadcastGameState(gameId) {
    if (!this.wsManager) return;
    const game = this.games.get(gameId);
    if (!game) return;
    this.wsManager.broadcast(gameId, "gameStateUpdate", {
      gameId,
      phase: game.phase,
      currentPlayerIndex: game.currentPlayerIndex,
      discardPile: game.discardPile,
      wallCount: game.wall.length,
      winnersCount: game.winnersCount,
      _freezeUntil: game._freezeUntil || 0
    });
  }
  /**
   * Create a new game
   */
  generateRoomNumber() {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const num = String(Math.floor(1e3 + Math.random() * 9e3));
      let exists = false;
      for (const game of this.games.values()) {
        if (game.roomNumber === num && game.phase !== GamePhase.ENDED) {
          exists = true;
          break;
        }
      }
      if (!exists) return num;
    }
    return String(Date.now()).slice(-4);
  }
  async createGame(playerName, options) {
    var _a, _b, _c, _d, _e, _f, _g;
    await this.hydrateFromDatabase();
    const gameId = randomUUID$1();
    const playerId = randomUUID$1();
    const player = {
      id: playerId,
      userId: options == null ? void 0 : options.userId,
      name: playerName,
      position: 0,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: true,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    };
    const game = {
      gameId,
      roomNumber: this.generateRoomNumber(),
      phase: GamePhase.WAITING,
      endReason: null,
      players: [player],
      wall: [],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: Date.now(),
      lastActionTime: Date.now(),
      endedAt: void 0,
      customScoringMode: null,
      finalScores: void 0,
      pendingActions: [],
      pendingKongClaim: void 0,
      multiHuStarterIndex: void 0,
      dice: void 0,
      roundMultiplier: void 0,
      inheritMultiplier: void 0,
      inheritedGlobalMultiplier: (options == null ? void 0 : options.firstRoundDouble) ? 2 : 1,
      rebelEvent: void 0,
      diceRollCount: (_a = options == null ? void 0 : options.diceRollCount) != null ? _a : 2,
      liangShanThreshold: (_b = options == null ? void 0 : options.liangShanThreshold) != null ? _b : 4e3,
      thinkChances: (_c = options == null ? void 0 : options.thinkChances) != null ? _c : 3,
      settlementMultiplier: (_d = options == null ? void 0 : options.settlementMultiplier) != null ? _d : 10,
      maxBots: (_e = options == null ? void 0 : options.maxBots) != null ? _e : 3,
      // 默认允许最多3个AI
      minPlayers: (_f = options == null ? void 0 : options.minPlayers) != null ? _f : 4,
      // 默认最少4人开局
      hesitationWindow: (() => {
        var _a2;
        const raw = (_a2 = options == null ? void 0 : options.hesitationWindow) != null ? _a2 : 5e3;
        const fastByEnv = String(process.env.TRAINING_FAST_MODE || "").toLowerCase() === "true";
        const fastMode = fastByEnv || !!(options == null ? void 0 : options.allClaimMode);
        return fastMode ? Math.min(30, Math.max(0, raw)) : raw;
      })(),
      // 决策犹豫期:训练模式0~30ms,实战默认5秒
      thinkUsage: {},
      allClaimMode: options == null ? void 0 : options.allClaimMode,
      spectatorMode: null,
      spectatorViews: {},
      spectatorApprovalRequests: []
    };
    this.games.set(gameId, game);
    this.playerToGame.set(playerId, gameId);
    const aiBots = (_g = options == null ? void 0 : options.selectedBots) != null ? _g : [];
    for (const botName of aiBots) {
      if (game.players.length >= 4) break;
      const botId = randomUUID$1();
      const botPlayer = {
        id: botId,
        name: botName,
        position: game.players.length,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PlayerStatus.WAITING,
        isDealer: false,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0,
        winOrder: null,
        winRound: null,
        winTimestamp: null,
        score: 0
      };
      game.players.push(botPlayer);
      this.playerToGame.set(botId, gameId);
    }
    await this.persistGame(game);
    return { gameId, playerId };
  }
  /**
   * Join an existing game
   */
  /**
   * 通过4位房间号查找游戏
   */
  async findGameByRoomNumber(roomNumber) {
    await this.hydrateFromDatabase();
    for (const [gameId, game] of this.games) {
      if (game.roomNumber === roomNumber && game.phase !== GamePhase.ENDED) {
        return gameId;
      }
    }
    return null;
  }
  async joinGame(gameId, playerName, options) {
    var _a;
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    const isFull = game.players.length >= 4;
    if (isFull) {
      const spectatorId = "spectator-" + randomUUID$1();
      const spectator = {
        id: spectatorId,
        userId: options == null ? void 0 : options.userId,
        name: playerName + "(\u89C2\u8D5B)",
        position: -1,
        status: PlayerStatus.SPECTATING,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        score: 0
      };
      game.players.push(spectator);
      if (!game.spectatorViews) game.spectatorViews = {};
      const scope = (() => {
        const completedRounds = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
        return game.phase === "ended" ? completedRounds : completedRounds + 1;
      })();
      const defaultTarget = game.players.find((p) => p.status !== "spectating" && p.status !== "left");
      game.spectatorViews[spectatorId] = {
        viewingPlayerId: defaultTarget ? defaultTarget.id : null,
        approvedHumanPlayerId: null,
        pendingHumanPlayerId: null,
        roundNumber: scope,
        updatedAt: Date.now()
      };
      await this.persistGame(game);
      return { playerId: spectatorId, position: -1, isSpectator: true };
    }
    const isBotJoin = playerName.startsWith("AI-") || playerName.startsWith("\u7535\u8111");
    if (isBotJoin) {
      const currentBots = game.players.filter((p) => p.name.startsWith("AI-") || p.name.startsWith("\u7535\u8111")).length;
      const maxBots = (_a = game.maxBots) != null ? _a : 3;
      if (currentBots >= maxBots) {
        throw new Error(`AI\u73A9\u5BB6\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650(${maxBots}\u4E2A)`);
      }
    }
    if (options == null ? void 0 : options.userId) {
      const existingPlayer = game.players.find((player2) => player2.userId === options.userId);
      if (existingPlayer) {
        if (!existingPlayer.id) {
          existingPlayer.id = existingPlayer.userId;
        }
        return { playerId: existingPlayer.id, position: existingPlayer.position };
      }
    }
    const playerId = randomUUID$1();
    const position = game.players.length;
    const player = {
      id: playerId,
      userId: options == null ? void 0 : options.userId,
      name: playerName,
      position,
      hand: {
        concealedTiles: [],
        exposedMelds: [],
        discardedTiles: []
      },
      status: PlayerStatus.WAITING,
      isDealer: false,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    };
    game.players.push(player);
    this.playerToGame.set(playerId, gameId);
    await this.persistGame(game);
    if (!isBotJoin) {
      this.broadcastRoomJoin(game, player);
    }
    this.broadcastGameState(gameId);
    return { playerId, position };
  }
  /**
   * Set game to STARTING phase (broadcast to all clients for dice animation)
   * Called when dealer clicks "开始游戏" in waiting room, before actual dealing
   */
  async setStartingPhase(gameId) {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== GamePhase.WAITING && game.phase !== GamePhase.ENDED && game.phase !== GamePhase.CHA_JIAO && game.phase !== GamePhase.STARTING) return;
    if (game.players.length < 4) throw new Error("Need 4 players to start");
    game.endReason = null;
    game.endedAt = void 0;
    game.finalScores = void 0;
    game.phase = GamePhase.STARTING;
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }
  /**
   * Start the game
   */
  async startGame(gameId, options) {
    var _a, _b, _c, _d, _e;
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;
    if (game.players.length < 4) {
      throw new Error("Need 4 players to start");
    }
    game.endReason = null;
    game.endedAt = void 0;
    game.finalScores = void 0;
    game.customScoringMode = null;
    game.discardPile = [];
    game.pendingActions = [];
    game.drawnThisTurn = false;
    if (typeof (options == null ? void 0 : options.hesitationWindow) === "number") {
      const fastMode = this.isTrainingFastMode(game);
      game.hesitationWindow = fastMode ? Math.min(30, Math.max(0, options.hesitationWindow)) : Math.max(1e3, options.hesitationWindow);
    }
    game.thinkUsage = {};
    game.thinkFreezeUntil = void 0;
    game.thinkFreezePlayerId = void 0;
    game.spectatorMode = null;
    game.spectatorViews = {};
    game.spectatorApprovalRequests = [];
    game.consecutiveDiscards = null;
    game.leadingBrotherEvent = null;
    this.mutualBailout.delete(gameId);
    game.bailoutRelations = [];
    const oldFreezeTimer = this.freezeTimers.get(gameId);
    if (oldFreezeTimer) {
      clearTimeout(oldFreezeTimer);
      this.freezeTimers.delete(gameId);
      console.log(`[WallDebug] Cleared stale freeze timer for game ${gameId}`);
    }
    game.freezePlayerId = null;
    game.freezeComplete = false;
    game.freezeRound = void 0;
    this.applySwapRequests(game);
    this.applyBotReplacement(game);
    const isFirstRound = (game.roundStats || []).length === 0;
    if (isFirstRound) {
      const shuffledIndices = Array.from({ length: game.players.length }, (_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
      game.players = shuffledIndices.map((origIdx, newPos) => {
        const p = game.players[origIdx];
        p.position = newPos;
        return p;
      });
    }
    if (game.nextDealerId) {
      const nextDealer = game.players.find((p) => p.id === game.nextDealerId);
      if (nextDealer) {
        game.dealerIndex = nextDealer.position;
        console.log(`[StartGame] \u4E0A\u5C40\u6307\u5B9A\u5E84\u5BB6: ${nextDealer.name}`);
      } else {
        game.dealerIndex = Math.floor(Math.random() * game.players.length);
      }
      game.nextDealerId = null;
    } else {
      game.dealerIndex = Math.floor(Math.random() * game.players.length);
    }
    game.players.forEach((p, i) => {
      p.isDealer = i === game.dealerIndex;
    });
    const deck = createDeck();
    console.log(`[WallDebug] createDeck: ${deck.length} tiles`);
    game.wall = shuffleTiles(deck);
    console.log(`[WallDebug] after shuffle: ${game.wall.length} tiles`);
    game.chowPongExclusion = {};
    const allTileTypes = [];
    for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
      for (let v = 1; v <= 9; v++) allTileTypes.push({ suit, value: v });
    }
    for (let v = 1; v <= 4; v++) allTileTypes.push({ suit: TileSuit.WIND, value: v });
    for (let v = 1; v <= 3; v++) allTileTypes.push({ suit: TileSuit.DRAGON, value: v });
    for (let v = 1; v <= 8; v++) allTileTypes.push({ suit: TileSuit.FLOWER, value: v });
    const wildIndex = Math.floor(Math.random() * allTileTypes.length);
    const wildType = allTileTypes[wildIndex];
    game.customScoringMode = `${wildType.suit}-${wildType.value}`;
    if (wildType.suit === TileSuit.FLOWER) {
      if (wildType.value <= 4) {
        game.wildTileGroup = ["1", "2", "3", "4"];
      } else {
        game.wildTileGroup = ["5", "6", "7", "8"];
      }
    }
    for (const player of game.players) {
      player.hand.concealedTiles = [];
      player.hand.exposedMelds = [];
      player.hand.discardedTiles = [];
      for (let i = 0; i < 13; i++) {
        const tile = game.wall.pop();
        if (isFlower(tile) && !this.isWildTile(game, tile)) {
          player.hand.exposedMelds.push({
            type: MeldType.TRIPLET,
            tiles: [tile],
            isConcealed: false,
            replacementDone: false
          });
        } else if (isFlower(tile) && this.isWildTile(game, tile)) {
          player.hand.concealedTiles.push(tile);
        } else {
          player.hand.concealedTiles.push(tile);
        }
      }
      player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      player.status = PlayerStatus.PLAYING;
      player.score = 0;
    }
    {
      const tile = game.wall.pop();
      if (isFlower(tile) && !this.isWildTile(game, tile)) {
        game.players[game.dealerIndex].hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [tile],
          isConcealed: false,
          replacementDone: false
        });
      } else if (isFlower(tile) && this.isWildTile(game, tile)) {
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      } else {
        game.players[game.dealerIndex].hand.concealedTiles.push(tile);
      }
      game.players[game.dealerIndex].hand.concealedTiles = this.sortHandWithWildFront(
        game.players[game.dealerIndex].hand.concealedTiles,
        game
      );
    }
    console.log(`[WallDebug] after dealing (13\xD74+1): wall=${game.wall.length} tiles`);
    for (const player of game.players) {
      player.winOrder = null;
      player.winRound = null;
      player.winTimestamp = null;
      player.wonFan = 0;
      player.winHandType = void 0;
      player.isSelfDrawn = void 0;
      player.discarderId = void 0;
      player.winningScoreBreakdown = void 0;
      player.score = 0;
    }
    const d1 = Math.min(6, Math.max(1, Math.round((_b = (_a = options == null ? void 0 : options.fixedDice) == null ? void 0 : _a[0]) != null ? _b : Math.floor(Math.random() * 6) + 1)));
    const d2 = Math.min(6, Math.max(1, Math.round((_d = (_c = options == null ? void 0 : options.fixedDice) == null ? void 0 : _c[1]) != null ? _d : Math.floor(Math.random() * 6) + 1)));
    game.dice = [d1, d2];
    game.roundMultiplier = calculateRoundMultiplier(d1, d2);
    const prevGlobal = (_e = game.inheritedGlobalMultiplier) != null ? _e : 1;
    if (game.rebelEvent) {
      game.inheritMultiplier = calculateGlobalMultiplier(prevGlobal);
      game.rebelEvent = void 0;
    } else {
      game.inheritMultiplier = prevGlobal;
    }
    game.inheritedGlobalMultiplier = void 0;
    game.currentPlayerIndex = game.dealerIndex;
    game.phase = GamePhase.PLAYING;
    game.lastActionTime = Date.now();
    TrainingRecordService.captureRoundStart(game);
    console.log(`[WallDebug] after dealing: wall=${game.wall.length} tiles, PLAYING phase`);
    await this.persistGame(game);
    this.broadcastGameState(gameId);
    const freezeMs = this.getHesitationWindow(game);
    const dealer = game.players[game.currentPlayerIndex];
    if (dealer) {
      if (this.isPlayerBotControlled(dealer)) {
        const botTimer = this.detachTimer(setTimeout(async () => {
          try {
            this.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            const liveDealer = freshGame.players[freshGame.currentPlayerIndex];
            if (!liveDealer || liveDealer.id !== dealer.id || liveDealer.status !== PlayerStatus.PLAYING) return;
            this.replaceFlowers(freshGame, liveDealer);
            if (this.getPlayableTileCount(liveDealer) >= 14) {
              freshGame.drawnThisTurn = true;
              console.log(`[start-bot-freeze] Dealer ${liveDealer.name} reached discard state after flower replacement`);
            } else {
              this.handleDraw(freshGame, liveDealer);
              freshGame.drawnThisTurn = true;
            }
            this.scheduleBotDiscard(gameId, liveDealer.id);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error("[start-bot-freeze] Error:", err);
          }
        }, this.getBotDrawFreezeMs(game)));
        this.freezeTimers.set(gameId, botTimer);
      } else {
        game._freezeUntil = Date.now() + freezeMs;
        await this.persistGame(game);
        this.broadcastGameState(gameId);
        const humanTimer = this.detachTimer(setTimeout(async () => {
          try {
            this.freezeTimers.delete(gameId);
            const freshGame = await this.getGame(gameId);
            if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
            if (freshGame.currentPlayerIndex !== game.currentPlayerIndex) return;
            if (freshGame.pendingActions.length > 0) return;
            delete freshGame._freezeUntil;
            const nextPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (nextPlayer && nextPlayer.status === PlayerStatus.PLAYING) {
              this.replaceFlowers(freshGame, nextPlayer);
              if (this.getPlayableTileCount(nextPlayer) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[start-freeze] Dealer ${nextPlayer.name} reached discard state after flower replacement`);
              } else {
                this.handleDraw(freshGame, nextPlayer);
                freshGame.drawnThisTurn = true;
                console.log(`[start-freeze] Auto-draw for dealer ${nextPlayer.name}`);
              }
            }
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
          } catch (err) {
            console.error("[start-freeze] Error:", err);
          }
        }, freezeMs));
        this.freezeTimers.set(gameId, humanTimer);
      }
    }
  }
  /**
   * Get game state
   */
  async getGame(gameId) {
    await this.hydrateFromDatabase();
    if (this.games.has(gameId)) return this.games.get(gameId);
    return this.ensureGameLoaded(gameId);
  }
  /**
   * Get game by player ID
   */
  async getGameByPlayer(playerId) {
    await this.hydrateFromDatabase();
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return void 0;
    return this.ensureGameLoaded(gameId);
  }
  /**
   * Get available actions for a player
   */
  async getAvailableActions(gameId, playerId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    try {
      await this.hydrateFromDatabase();
      const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
      if (!game) {
        console.warn("\u26A0\uFE0F getAvailableActions: game not found:", gameId);
        return [];
      }
      if (game.phase !== GamePhase.PLAYING) return [];
      const player = game.players.find((p) => p.id === playerId);
      if (!player || player.status !== PlayerStatus.PLAYING) return [];
      if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now()) {
        if (game.thinkFreezePlayerId !== playerId) {
          const currentTurnPlayer = game.players[game.currentPlayerIndex];
          if ((currentTurnPlayer == null ? void 0 : currentTurnPlayer.id) === playerId && this.canPlayerDrawOnCurrentTurn(game, player)) {
            return [ActionType.DRAW];
          }
          const pendingAction2 = game.pendingActions.find((pa) => pa.playerId === playerId);
          if (pendingAction2) {
            return pendingAction2.availableActions;
          }
          return [];
        }
      }
      const actions = [];
      const currentPlayer = game.players[game.currentPlayerIndex];
      const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
      if (!currentPlayer) {
        return actions;
      }
      const pendingAction = game.pendingActions.find((pa) => pa.playerId === playerId);
      if (pendingAction) {
        if (game.freezePlayerId && game.freezePlayerId !== playerId) {
          if (!game.freezeComplete) {
            return [];
          }
        }
        const pendingHasPriority = pendingAction.availableActions.some(
          (a) => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG || a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
        );
        if (pendingHasPriority) {
          const maxChances = (_a = game.thinkChances) != null ? _a : 3;
          const used = (_c = (_b = game.thinkUsage) == null ? void 0 : _b[playerId]) != null ? _c : 0;
          if (used < maxChances) {
            const pendingActionsWithThink = [...pendingAction.availableActions, ActionType.THINK];
            if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !pendingActionsWithThink.includes(ActionType.DRAW)) {
              pendingActionsWithThink.push(ActionType.DRAW);
            }
            return pendingActionsWithThink;
          }
        }
        if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !pendingAction.availableActions.includes(ActionType.DRAW)) {
          return [...pendingAction.availableActions, ActionType.DRAW];
        }
        return pendingAction.availableActions;
      }
      const discardCount = game.actionHistory.filter((a) => a.type === ActionType.DISCARD).length;
      if (game.phase === GamePhase.PLAYING && player.status === PlayerStatus.PLAYING && discardCount < 3) {
        const allHuman = game.players.length >= 4 && game.players.every((p) => !this.isPlayerBotControlled(p));
        const atMultiplierCap = ((_d = game.inheritMultiplier) != null ? _d : 1) >= 8;
        if (allHuman && !atMultiplierCap) {
          const votes = game.liangShanVotes || [];
          if (!votes.includes(playerId)) {
            actions.push(ActionType.LIANG_SHAN);
          }
        }
      }
      const hasPriorityActions = actions.some(
        (a) => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG || a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
      );
      if (hasPriorityActions) {
        const maxChances = (_e = game.thinkChances) != null ? _e : 3;
        const used = (_g = (_f = game.thinkUsage) == null ? void 0 : _f[playerId]) != null ? _g : 0;
        if (used < maxChances) {
          actions.push(ActionType.THINK);
        }
      }
      if (currentPlayer.id === playerId) {
        if (game.pendingActions.length > 0 && !this.canCurrentTurnPlayerDrawDuringPending(game, playerId)) {
          if (this.canExposeCurrentTurnPlayerDrawDuringPending(game, playerId) && !actions.includes(ActionType.DRAW)) {
            actions.push(ActionType.DRAW);
          }
          return actions;
        }
        const unreplacedFlowers = player.hand.exposedMelds.filter(
          (m) => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !m.replacementDone
        );
        if (unreplacedFlowers.length > 0 && game.wall.length > 0) {
          const totalTileCount2 = this.getPlayableTileCount(player);
          if (totalTileCount2 < 14) {
            actions.push(ActionType.DRAW);
            return actions;
          }
          actions.push(ActionType.DISCARD);
          return actions;
        }
        const rebellionTurns = game.actionHistory.filter((a) => a.type === ActionType.DISCARD).length;
        const isDealer = player.position === game.dealerIndex;
        const isFirstTurn = rebellionTurns === 0;
        const hasEatenBefore = player.hand.exposedMelds.some((m) => m.type === MeldType.SEQUENCE);
        if (game.roundNumber <= 1 && isDealer && isFirstTurn && !hasEatenBefore) {
          const wildParts = (_h = game.customScoringMode) == null ? void 0 : _h.split("-");
          const wildSuit = wildParts ? wildParts[0] : void 0;
          const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : void 0;
          if (isFivePoison(
            player.hand.concealedTiles,
            wildSuit,
            wildValue,
            player.hand.exposedMelds.flatMap((meld) => meld.tiles || [])
          )) {
            actions.push(ActionType.REBEL);
          }
        }
        if (player.hand.concealedTiles.length > 0 && game.drawnThisTurn) {
          actions.push(ActionType.DISCARD);
        }
        const totalTileCount = this.getPlayableTileCount(player);
        const winCheck = this.getCachedWinCheck(game, player);
        if (this.isDaDiaoReadyState(game, player) && winCheck.canWin && winCheck.types.length > 0) {
          actions.push(ActionType.HU);
        } else if (totalTileCount < 14 && game.wall.length > 0 && !game.drawnThisTurn) {
          actions.push(ActionType.DRAW);
        }
        if (totalTileCount >= 14) {
          const groups = groupTiles(player.hand.concealedTiles);
          for (const group of groups.values()) {
            if (group.length === 4) {
              actions.push(ActionType.CONCEALED_KONG);
            }
          }
          for (const meld of player.hand.exposedMelds) {
            if (meld.type === MeldType.TRIPLET) {
              const hasFourth = player.hand.concealedTiles.some((t) => tilesEqual(t, meld.tiles[0]));
              if (hasFourth) {
                actions.push(ActionType.EXTENDED_KONG);
              }
            }
          }
          if (this.canPlayerDeclareTurnHu(game, player) && winCheck.canWin && winCheck.types.length > 0) {
            actions.push(ActionType.HU);
          }
        }
      }
      const hasFinalPriorityActions = actions.some(
        (a) => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG || a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
      );
      if (hasFinalPriorityActions && !actions.includes(ActionType.THINK)) {
        const maxChances = (_i = game.thinkChances) != null ? _i : 3;
        const used = (_k = (_j = game.thinkUsage) == null ? void 0 : _j[playerId]) != null ? _k : 0;
        if (used < maxChances) {
          actions.push(ActionType.THINK);
        } else {
          this.schedulePendingActionTimeout(gameId);
        }
      }
      return actions;
    } catch (err) {
      console.warn("\u26A0\uFE0F getAvailableActions failed:", err.message);
      return [];
    }
  }
  async getWinOptionsForPlayer(gameId, playerId) {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    const pendingAction = game.pendingActions.find((pa) => pa.playerId === playerId);
    (game.actionHistory || []).some(
      (a) => a.type === "peng" || a.type === "kong"
    );
    const currentRoundActions = (game.actionHistory || []).filter((a) => {
      return a.roundNumber === game.roundNumber || a.roundNumber === void 0;
    });
    const hadPengOrKongThisRound = currentRoundActions.some(
      (a) => a.type === "peng" || a.type === "kong"
    );
    const context = (pendingAction == null ? void 0 : pendingAction.tile) ? "discard" : hadPengOrKongThisRound ? "discard" : "self_draw";
    return this.getCachedWinOptions(game, player, context, {
      isKongFlower: false,
      isRobbingKong: !!(pendingAction == null ? void 0 : pendingAction.tile) && !!game.pendingKongClaim,
      extraTile: pendingAction == null ? void 0 : pendingAction.tile
    });
  }
  async getTingPreviewForPlayer(gameId, playerId) {
    await this.hydrateFromDatabase();
    const game = this.games.get(gameId) || await this.ensureGameLoaded(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    if (player.status !== PlayerStatus.PLAYING) {
      return { isTing: false, winningTiles: [] };
    }
    const preview = this.getCachedTingPreview(game, player);
    if (!preview.isTing && !player.isTing) {
      return { isTing: false, winningTiles: [] };
    }
    return preview;
  }
  /**
   * Execute a game action
   */
  async executeAction(gameId, playerId, action, tileId, tileIds, winOptionLabel) {
    var _a, _b, _c, _d;
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== GamePhase.PLAYING) {
      throw new Error("Game is not active");
    }
    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");
    this.clearPendingActionTimer(gameId);
    this.clearAutoTakeover(gameId, playerId);
    const gameAction = {
      playerId,
      type: action,
      timestamp: Date.now()
    };
    if ((_a = game.huSelectionLocks) == null ? void 0 : _a[playerId]) {
      const nextLocks = { ...game.huSelectionLocks };
      delete nextLocks[playerId];
      game.huSelectionLocks = Object.keys(nextLocks).length ? nextLocks : void 0;
    }
    if (action !== ActionType.PASS && action !== ActionType.DRAW) {
      game.hasTriggeredAction = true;
    }
    switch (action) {
      case ActionType.DISCARD:
        {
          const currentTurnPlayer = game.players[game.currentPlayerIndex];
          if (!currentTurnPlayer || currentTurnPlayer.id !== player.id) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} is not current player (current=${(_b = currentTurnPlayer == null ? void 0 : currentTurnPlayer.name) != null ? _b : "none"} index=${game.currentPlayerIndex})`
            );
            throw new Error("Not your turn to discard");
          }
          if (game.pendingActions.length > 0) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} attempted discard with pending actions unresolved (${game.pendingActions.length})`
            );
            throw new Error("Pending actions must resolve before discarding");
          }
          const concealedCount = player.hand.concealedTiles.length;
          if (!this.isConcealedDiscardState(player)) {
            console.warn(
              `[DISCARD] Blocked: ${player.name} has invalid concealed count for discard (${concealedCount})`
            );
            throw new Error("Invalid hand state for discard");
          }
        }
        if (!game.drawnThisTurn) {
          console.warn(`[DISCARD] Blocked: ${player.name} has not drawn yet this turn`);
          throw new Error("Must draw before discarding");
        }
        gameAction.tile = findTileById(player.hand.concealedTiles, tileId);
        await this.handleDiscard(game, player, tileId);
        break;
      case ActionType.DRAW:
        {
          const freezeUntil = Number((_c = game._freezeUntil) != null ? _c : 0);
          if (freezeUntil > Date.now()) {
            console.warn(`[DRAW] Blocked: ${player.name} is still in hesitation freeze until ${freezeUntil}`);
            throw new Error("Draw is locked until the hesitation window ends");
          }
          if (game.thinkFreezeUntil && game.thinkFreezeUntil > Date.now() && game.thinkFreezePlayerId !== player.id) {
            console.warn(`[DRAW] Blocked: ${player.name} is waiting for ${game.thinkFreezePlayerId} think freeze to end`);
            throw new Error("Draw is locked while another player is thinking");
          }
          if (this.hasActiveHuSelectionLock(game, player.id)) {
            console.warn(`[DRAW] Blocked: ${player.name} is waiting for another player's HU selection lock`);
            throw new Error("Draw is locked while another player is selecting a HU option");
          }
          if (game.pendingActions.length > 0 && !this.canExecuteCurrentTurnPlayerDrawDuringPending(game, player.id)) {
            console.warn(
              `[DRAW] Deferred: ${player.name} must wait for pending window to end before drawing`
            );
            throw new Error("Draw is not available until the current response window ends");
          }
        }
        {
          const currentTurnPlayer = game.players[game.currentPlayerIndex];
          if (!currentTurnPlayer || currentTurnPlayer.id !== player.id) {
            console.warn(
              `[DRAW] Blocked: ${player.name} is not current player (current=${(_d = currentTurnPlayer == null ? void 0 : currentTurnPlayer.name) != null ? _d : "none"} index=${game.currentPlayerIndex})`
            );
            throw new Error("Not your turn to draw");
          }
          const unreplacedFlowers = player.hand.exposedMelds.filter(
            (m) => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !m.replacementDone
          );
          const hasPendingDrawWork = unreplacedFlowers.length > 0 || this.canPlayerDrawOnCurrentTurn(game, player);
          if (!hasPendingDrawWork) {
            console.warn(
              `[DRAW] Blocked: ${player.name} is not eligible to draw (drawn=${game.drawnThisTurn}, playable=${this.getPlayableTileCount(player)}, wall=${game.wall.length})`
            );
            throw new Error("Cannot draw in current state");
          }
        }
        if (game.drawnThisTurn) {
          console.warn(`[DRAW] Blocked: ${player.name} already drew this turn (double-draw attempt)`);
          throw new Error("Already drew this turn");
        }
        if (game.pendingActions.length > 0 && this.canExecuteCurrentTurnPlayerDrawDuringPending(game, player.id)) {
          this.clearCurrentTurnPendingActions(game, player.id);
        }
        this.replaceInitialFlowers(game, player);
        {
          const totalTileCount = this.getPlayableTileCount(player);
          if (totalTileCount >= 14) {
            console.warn(`[DRAW] Flower replacement already filled hand: player ${player.id} has ${totalTileCount} playable tiles`);
            game.drawnThisTurn = true;
            break;
          }
        }
        this.handleDraw(game, player);
        game.drawnThisTurn = true;
        break;
      case ActionType.PENG:
        {
          const pengExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const pengTotalCount = player.hand.concealedTiles.length + pengExposedCount;
          if (pengTotalCount - 2 + 3 > 14) {
            console.warn(`[PENG] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handlePeng(game, player);
        break;
      case ActionType.CHOW:
        {
          const chowExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const chowTotalCount = player.hand.concealedTiles.length + chowExposedCount;
          if (chowTotalCount - 2 + 3 > 14) {
            console.warn(`[CHOW] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handleChow(game, player, tileIds);
        break;
      case ActionType.KONG:
        {
          const kongExposedCount = this.countExposedTilesExcludingFlowerMelds(player);
          const kongTotalCount = player.hand.concealedTiles.length + kongExposedCount;
          if (kongTotalCount - 3 + 4 > 14) {
            console.warn(`[KONG] Blocked: player ${player.id} would exceed 14 tiles`);
            break;
          }
        }
        this.handleKong(game, player, tileId);
        break;
      case ActionType.CONCEALED_KONG:
        this.handleConcealedKong(game, player, tileIds);
        break;
      case ActionType.EXTENDED_KONG:
        this.handleExtendedKong(game, player, tileId);
        break;
      case ActionType.HU:
        await this.handleHu(game, player, winOptionLabel);
        break;
      case ActionType.CHEAT_HU:
        this.handleCheatHu(game, player);
        break;
      case ActionType.REBEL:
        this.handleRebel(game, player);
        break;
      case ActionType.LIANG_SHAN:
        this.handleLiangShan(game, player);
        break;
      case ActionType.THINK:
        this.handleThink(game, player);
        break;
      case ActionType.PASS:
        this.handlePass(game, player);
        break;
    }
    game.actionHistory.push(gameAction);
    game.lastActionTime = Date.now();
    if (game.pendingActions.length === 0) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && this.isPlayerBotControlled(currentP) && currentP.status === PlayerStatus.PLAYING) {
        if (action === ActionType.PENG || action === ActionType.CHOW || action === ActionType.KONG || action === ActionType.CONCEALED_KONG || action === ActionType.EXTENDED_KONG) {
          this.scheduleBotDiscard(gameId, currentP.id);
        }
      }
      if (action === ActionType.HU && game.phase === GamePhase.PLAYING) {
        await this.moveToNextPlayer(game);
      } else if (action === ActionType.PASS && this.shouldAdvanceTurnAfterPass(game)) {
        await this.moveToNextPlayer(game);
      } else {
        this.schedulePendingActionTimeout(gameId);
      }
    }
    this.invalidateWinEvaluationCache(gameId);
    if (game.phase === GamePhase.PLAYING) {
      const currentP = game.players[game.currentPlayerIndex];
      if (currentP && currentP.status === PlayerStatus.PLAYING && game.drawnThisTurn) {
        this.prewarmWinEvaluation(game, currentP, "self_draw");
      }
      for (const pending of game.pendingActions) {
        if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
        const targetPlayer = game.players.find((p) => p.id === pending.playerId);
        if (!targetPlayer) continue;
        this.prewarmWinEvaluation(game, targetPlayer, "discard", pending.tile);
      }
      if (!this.isTrainingFastMode(game)) {
        for (const candidate of game.players) {
          if (candidate.status === PlayerStatus.PLAYING && candidate.isTing) {
            this.getCachedTingPreview(game, candidate);
          }
        }
      }
    }
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }
  async handleDiscard(game, player, tileId) {
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) throw new Error("Tile not found");
    const discarderIndex = game.currentPlayerIndex;
    game.lastDiscardPlayerId = player.id;
    game.lastDiscardPosition = player.position;
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tileId);
    player.lastDrawnTile = null;
    player.hand.discardedTiles.push(tile);
    game.discardPile.push(tile);
    this.checkLeadingBrother(game, tile, player);
    this.updateRoundNumber(game);
    const missing = isMissingOneSuit(player.hand.concealedTiles);
    if (missing.missing) {
      player.missingSuit = missing.missingSuit;
    }
    player.isTing = isTing(
      player.hand.concealedTiles,
      player.hand.exposedMelds.length,
      game.customScoringMode || null,
      game.wildTileGroup
    );
    if (this.isWildTile(game, tile)) {
      game.freezePlayerId = player.id;
      game.freezeComplete = false;
      game.pendingActions = [];
      if (this.wsManager) {
        this.wsManager.broadcast(game.gameId, "broadcastMessage", {
          id: Date.now(),
          text: `\u{1F0CF} ${player.name}\u6253\u51FA\u4E86\u767E\u642D\uFF0C\u672C\u8F6E\u4E0D\u80FD\u5403\u78B0\u6349\u51B2\uFF01`,
          type: "warn",
          timestamp: Date.now(),
          timeLabel: formatBeijingTime()
        });
      }
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);
      await this.moveToNextPlayer(game);
      return;
    }
    this.checkPendingActions(game, tile);
    const nextPlayer = this.getNextActivePlayer(game, discarderIndex);
    if (nextPlayer) {
      const nextPlayerIndex = game.players.findIndex((p) => p.id === nextPlayer.id);
      if (nextPlayerIndex >= 0) {
        game.currentPlayerIndex = nextPlayerIndex;
      }
    }
    await this.beginCurrentPlayerTurn(game);
    if (game.pendingActions.length > 0) {
      const existingBotTimer = this.botTimers.get(game.gameId);
      if (existingBotTimer) {
        clearTimeout(existingBotTimer);
        this.botTimers.delete(game.gameId);
      }
      this.schedulePendingActionTimeout(game.gameId);
    }
  }
  /**
   * 谢谢带头大哥:四名玩家连续打出同一张牌(不要求相邻出牌)
   * 第一个打出该牌的玩家,结算时额外赔付其余三家每家10分
   */
  checkLeadingBrother(game, tile, currentPlayer) {
    const tileKey = `${tile.suit}-${tile.value}`;
    if (!game.consecutiveDiscards || game.consecutiveDiscards.suit !== tile.suit || game.consecutiveDiscards.value !== tile.value) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }
    const cd = game.consecutiveDiscards;
    if (cd.playerIds.includes(currentPlayer.id)) {
      game.consecutiveDiscards = { suit: tile.suit, value: tile.value, playerIds: [currentPlayer.id] };
      return;
    }
    cd.playerIds.push(currentPlayer.id);
    new Set(cd.playerIds);
    const activePlayerIds = new Set(
      game.players.filter((p) => p.status === PlayerStatus.PLAYING).map((p) => p.id)
    );
    const activeDiscarders = new Set(cd.playerIds.filter((id) => activePlayerIds.has(id)));
    if (activePlayerIds.size >= 4 && cd.playerIds.length === 4 && activeDiscarders.size === 4) {
      const firstPlayerId = cd.playerIds[0];
      game.leadingBrotherEvent = { firstPlayerId, tileKey };
      const firstPlayer = game.players.find((p) => p.id === firstPlayerId);
      console.log(`[LeadingBrother] ${firstPlayer == null ? void 0 : firstPlayer.name} \u662F\u5E26\u5934\u5927\u54E5!\u8FDE\u7EED\u51FA ${tileKey}`);
      if (this.wsManager) {
        this.wsManager.broadcast(game.gameId, "leadingBrother", {
          firstPlayerName: (firstPlayer == null ? void 0 : firstPlayer.name) || "\u672A\u77E5",
          tileKey
        });
      }
      game.consecutiveDiscards = null;
    }
  }
  hasTenPointClaimExemption(handTypes, isDaDiao) {
    if (isDaDiao) return true;
    return handTypes.some((type) => [
      HandType.FENG_PENG,
      HandType.ALL_WIND,
      HandType.QING_PENG,
      HandType.HUN_PENG,
      HandType.EIGHT_FLOWERS,
      HandType.FOUR_WILD,
      HandType.FULL_FLUSH
    ].includes(type));
  }
  countFlowerTiles(player) {
    return player.hand.exposedMelds.flatMap((m) => m.tiles).filter((t) => isFlower(t)).length;
  }
  handleDraw(game, player, options) {
    if (game.wall.length === 0) {
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
      return;
    }
    const playableTileCount = this.getPlayableTileCount(player);
    if (!(options == null ? void 0 : options.allowFullHand) && playableTileCount >= 14) {
      console.warn(`[DRAW] Skipped: ${player.name} already has ${playableTileCount} playable tiles`);
      return;
    }
    let tile = game.wall.pop();
    while (isFlower(tile) && !this.isWildTile(game, tile)) {
      player.hand.exposedMelds.push({
        type: MeldType.TRIPLET,
        tiles: [tile],
        isConcealed: false,
        replacementDone: true
      });
      this.broadcastFlowerReplacement(game, player);
      console.log(`[FLOWER] ${player.name} \u6478\u5230\u82B1\u724C: ${tile.id}, \u95E8\u53E3\u82B1\u724C\u6570: ${player.hand.exposedMelds.filter((m) => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0])).length}`);
      if (game.wall.length === 0) {
        this.endRound(game, GameEndReason.WALL_EXHAUSTED);
        return;
      }
      tile = game.wall.pop();
    }
    if (isFlower(tile) && this.isWildTile(game, tile)) {
      player.hand.concealedTiles.push(tile);
    } else {
      player.hand.concealedTiles.push(tile);
    }
    player.lastDrawnTile = tile;
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
  }
  /**
   * 替换门口的初始花牌(发牌时放门口但未补花的)
   */
  replaceInitialFlowers(game, player) {
    const flowerMelds = player.hand.exposedMelds.filter(
      (m) => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !m.replacementDone
    );
    if (flowerMelds.length === 0) return;
    console.log(`[WallDebug] replaceInitialFlowers: ${player.name} has ${flowerMelds.length} flowers, wall=${game.wall.length}`);
    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      meld.replacementDone = true;
      let replacement = game.wall.pop();
      console.log(`[WallDebug] flower replace: drew ${replacement.id}, wall now=${game.wall.length}`);
      while (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false,
          replacementDone: true
        });
        this.broadcastFlowerReplacement(game, player);
        if (game.wall.length === 0) {
          replacement = null;
          break;
        }
        replacement = game.wall.pop();
        console.log(`[WallDebug] flower replace: chained draw ${replacement.id}, wall now=${game.wall.length}`);
      }
      if (!replacement) {
        break;
      }
      if (isFlower(replacement) && this.isWildTile(game, replacement)) {
        player.hand.concealedTiles.push(replacement);
        player.lastDrawnTile = replacement;
        player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      } else {
        player.hand.concealedTiles.push(replacement);
        player.lastDrawnTile = replacement;
        player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      }
      this.broadcastFlowerReplacement(game, player);
    }
  }
  /**
   * 手牌排序:百搭放最左边,其余按花色数值排序
   */
  /**
   * 手牌排序:百搭放最左边,其余按花色→点数排序
   * - 百搭最前
   * - 数牌(dots→characters→bamboos)按花色→点数
   * - 风/箭/花统一在数牌后按suit顺序
   * - 含边界保护(空牌/缺字段时不抛异常)
   */
  sortHandWithWildFront(tiles, game) {
    if (!tiles || tiles.length === 0) return [];
    const suitOrder = {
      dots: 0,
      wan: 1,
      tiao: 2,
      feng: 3,
      jian: 4,
      hua: 5
    };
    return [...tiles].sort((a, b) => {
      var _a, _b;
      if (!a || !a.suit || a.value == null) return 1;
      if (!b || !b.suit || b.value == null) return -1;
      const aIsWild = this.isWildTile(game, a);
      const bIsWild = this.isWildTile(game, b);
      if (aIsWild && !bIsWild) return -1;
      if (!aIsWild && bIsWild) return 1;
      if (aIsWild && bIsWild) return 0;
      if (a.suit !== b.suit) return ((_a = suitOrder[a.suit]) != null ? _a : 99) - ((_b = suitOrder[b.suit]) != null ? _b : 99);
      return a.value - b.value;
    });
  }
  /**
   * 检查牌是否是百搭
   */
  isWildTile(game, tile) {
    if (!game.customScoringMode) return false;
    const parts = game.customScoringMode.split("-");
    if (parts.length < 2) return false;
    const wildSuit = parts[0];
    const wildValue = parseInt(parts[1]);
    if (tile.suit === wildSuit && tile.value === wildValue) return true;
    if (tile.suit === TileSuit.FLOWER && wildSuit === TileSuit.FLOWER && game.wildTileGroup) {
      return game.wildTileGroup.includes(String(tile.value));
    }
    return false;
  }
  /**
   * 通用审批流程:检查高优先级玩家
   */
  checkHighPriorityCandidates(game, requestingPlayerId, discardedTile) {
    const huCandidates = [];
    const pengCandidates = [];
    const kongCandidates = [];
    for (const p of game.players) {
      if (p.id === requestingPlayerId) continue;
      if (p.status !== PlayerStatus.PLAYING) continue;
      const testHand = [...p.hand.concealedTiles, discardedTile];
      buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
      const winCheck = canWin(testHand, p.hand.exposedMelds.length, this.getWinWildArg(game));
      if (winCheck.canWin) {
        const handTypes = detectHandTypes(testHand, p.hand.exposedMelds, false, this.countFlowerTiles(p), null, game.wildTileGroup);
        if (handTypes.length > 0) {
          huCandidates.push(p.id);
          continue;
        }
      }
      const matchingCount = p.hand.concealedTiles.filter((t) => tilesEqual(t, discardedTile)).length;
      if (matchingCount >= 2) {
        pengCandidates.push(p.id);
        if (matchingCount >= 3) kongCandidates.push(p.id);
      }
    }
    return { huCandidates, pengCandidates, kongCandidates };
  }
  /**
   * 通用审批:给高优先级玩家广播冲突事件并设置pending
   */
  getApprovalActionPriority(action) {
    switch (action) {
      case ActionType.HU:
      case "hu":
        return 3;
      case ActionType.KONG:
      case "kong":
        return 2;
      case ActionType.PENG:
      case "peng":
        return 1;
      default:
        return 0;
    }
  }
  executeRequesterApprovalAction(game) {
    const conflict = game.pengChowConflict;
    if (!conflict) return;
    const requester = game.players.find((p) => p.id === conflict.requesterId);
    if (!requester) return;
    if (conflict.requesterAction === "chow") {
      this.executeChowDirectly(game, requester, conflict.requesterTileIds);
    } else if (conflict.requesterAction === "peng") {
      this.executePengDirectly(game, requester);
    } else {
      this.executeKongDirectly(game, requester, conflict.tile.id);
    }
  }
  async advanceApprovalConflict(game) {
    const conflict = game.pengChowConflict;
    if (!conflict) return;
    const activeStageIds = new Set(conflict.currentStagePlayerIds || []);
    const stagePending = game.pendingActions.filter((pa) => activeStageIds.has(pa.playerId));
    if (stagePending.length > 0) return;
    const queue = conflict.approvalQueue || [];
    if (queue.length === 0) {
      game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== conflict.requesterId);
      this.clearPendingActionTimer(game.gameId);
      this.executeRequesterApprovalAction(game);
      game.pengChowConflict = null;
      return;
    }
    const highestPriority = Math.max(
      ...queue.map((candidate) => Math.max(...candidate.availableActions.map((action) => this.getApprovalActionPriority(action))))
    );
    const stage = queue.filter(
      (candidate) => candidate.availableActions.some((action) => this.getApprovalActionPriority(action) === highestPriority)
    );
    conflict.approvalQueue = queue.filter((candidate) => !stage.some((current) => current.playerId === candidate.playerId));
    conflict.currentStagePlayerIds = stage.map((candidate) => candidate.playerId);
    conflict.timestamp = Date.now();
    conflict.expiresAt = Date.now() + this.getHesitationWindow(game);
    this.clearPendingActionTimer(game.gameId);
    const requester = game.players.find((p) => p.id === conflict.requesterId);
    if (!requester || !this.wsManager) return;
    const label = conflict.requesterAction === "chow" ? "\u5403" : conflict.requesterAction === "peng" ? "\u78B0" : "\u6760";
    for (const candidate of stage) {
      const candidatePlayer = game.players.find((p) => p.id === candidate.playerId);
      if (!candidatePlayer) continue;
      const expiresAt = Date.now() + this.getHumanClaimDecisionTimeoutMs(
        game,
        candidatePlayer,
        candidate.availableActions
      );
      const existingPending = game.pendingActions.find((pa) => pa.playerId === candidate.playerId);
      if (existingPending) {
        const previousHadHu = existingPending.availableActions.includes(ActionType.HU);
        const previousExpiresAt = existingPending.expiresAt;
        existingPending.availableActions = candidate.availableActions;
        existingPending.tile = conflict.tile;
        existingPending.expiresAt = previousHadHu && typeof previousExpiresAt === "number" ? previousExpiresAt : expiresAt;
      } else {
        game.pendingActions.push({
          playerId: candidate.playerId,
          availableActions: candidate.availableActions,
          tile: conflict.tile,
          expiresAt
        });
      }
      this.wsManager.broadcast(game.gameId, "actionApproval", {
        requesterName: requester.name,
        requesterAction: label,
        candidatePlayerId: candidate.playerId,
        availableActions: candidate.availableActions,
        tileKey: `${conflict.tile.suit}-${conflict.tile.value}`,
        expiresAt
      });
    }
    const expectedTimestamp = conflict.timestamp;
    const gid = game.gameId;
    this.detachTimer(setTimeout(async () => {
      try {
        const freshGame = await this.getGame(gid);
        const freshConflict = freshGame == null ? void 0 : freshGame.pengChowConflict;
        if (!freshGame || !freshConflict || freshConflict.timestamp !== expectedTimestamp) return;
        const currentStageIds = new Set(freshConflict.currentStagePlayerIds || []);
        freshGame.pendingActions = freshGame.pendingActions.filter((pa) => !currentStageIds.has(pa.playerId));
        freshConflict.currentStagePlayerIds = [];
        await this.advanceApprovalConflict(freshGame);
        await this.persistGame(freshGame);
        this.broadcastGameState(gid);
        const currentPlayer = freshGame.players[freshGame.currentPlayerIndex];
        if (currentPlayer && this.isPlayerBotControlled(currentPlayer)) {
          this.scheduleBotDiscard(gid, currentPlayer.id);
        }
      } catch (e) {
        console.error("[Approval] timeout err:", e);
      }
    }, this.getHesitationWaitMs(game.gameId)));
  }
  async startApproval(game, requesterPlayerId, requesterAction, candidates, tile, requesterTileIds) {
    const aiCandidates = candidates.filter((c) => {
      const p = game.players.find((pl) => pl.id === c.playerId);
      return p && this.isPlayerBotControlled(p);
    });
    const humanCandidates = candidates.filter((c) => {
      const p = game.players.find((pl) => pl.id === c.playerId);
      return !p || !this.isPlayerBotControlled(p);
    });
    if (aiCandidates.length > 0) {
      const sortedAi = [...aiCandidates].sort((a, b) => {
        const aPriority = Math.max(...a.availableActions.map((action) => this.getApprovalActionPriority(action)));
        const bPriority = Math.max(...b.availableActions.map((action) => this.getApprovalActionPriority(action)));
        return bPriority - aPriority;
      });
      for (const aiCand of sortedAi) {
        const aiPlayer = game.players.find((p) => p.id === aiCand.playerId);
        if (!aiPlayer || aiPlayer.status !== PlayerStatus.PLAYING) continue;
        const aiActions = aiCand.availableActions;
        if (aiActions.includes(ActionType.HU)) {
          try {
            await this.executeWinDirectly(game, aiPlayer, tile);
            return;
          } catch (e) {
            console.warn("[Approval] AI HU failed:", e);
          }
        }
        if (aiActions.includes(ActionType.KONG)) {
          this.executeKongDirectly(game, aiPlayer, tile.id);
          return;
        }
        if (aiActions.includes(ActionType.PENG)) {
          this.executePengDirectly(game, aiPlayer);
          return;
        }
      }
    }
    if (humanCandidates.length === 0) {
      if (requesterAction === "chow") this.executeChowDirectly(game, game.players.find((p) => p.id === requesterPlayerId), requesterTileIds);
      else if (requesterAction === "peng") this.executePengDirectly(game, game.players.find((p) => p.id === requesterPlayerId));
      else if (requesterAction === "kong") this.executeKongDirectly(game, game.players.find((p) => p.id === requesterPlayerId), tile.id);
      return;
    }
    game.pengChowConflict = {
      requesterId: requesterPlayerId,
      requesterAction,
      tile,
      requesterTileIds,
      timestamp: Date.now(),
      approvalQueue: humanCandidates.map((candidate) => ({
        playerId: candidate.playerId,
        availableActions: candidate.availableActions
      })),
      currentStagePlayerIds: []
    };
    await this.advanceApprovalConflict(game);
    return;
  }
  async handleChow(game, player, tileIds) {
    let pendingAction = game.pendingActions.find((pa) => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) {
      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (!lastDiscard) return;
      pendingAction = { playerId: player.id, availableActions: [ActionType.CHOW], tile: lastDiscard };
    }
    const discardedTile = pendingAction.tile;
    const otherPlayersPending = game.pendingActions.filter(
      (pa) => pa.playerId !== player.id && pa.availableActions.some((a) => a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG)
    );
    if (otherPlayersPending.length > 0) {
      const { huCandidates, pengCandidates, kongCandidates } = this.checkHighPriorityCandidates(game, player.id, discardedTile);
      if (huCandidates.length > 0 || pengCandidates.length > 0 || kongCandidates.length > 0) {
        const candidates = [];
        for (const pid of huCandidates) {
          candidates.push({ playerId: pid, availableActions: ["hu"] });
        }
        for (const pid of kongCandidates) {
          const existing = candidates.find((c) => c.playerId === pid);
          if (existing) {
            if (!existing.availableActions.includes("hu")) existing.availableActions.push("kong");
          } else {
            candidates.push({ playerId: pid, availableActions: ["kong"] });
          }
        }
        for (const pid of pengCandidates) {
          const existing = candidates.find((c) => c.playerId === pid);
          if (existing) {
            if (!existing.availableActions.includes("hu") && !existing.availableActions.includes("kong")) {
              existing.availableActions.push("peng");
            }
          } else {
            candidates.push({ playerId: pid, availableActions: ["peng"] });
          }
        }
        await this.startApproval(game, player.id, "chow", candidates, discardedTile, tileIds);
        return;
      }
    }
    this.executeChowDirectly(game, player, tileIds);
  }
  /**
   * 直接执行吃牌(不检查碰优先级)
   */
  executeChowDirectly(game, player, tileIds) {
    var _a;
    const discardTile = game.discardPile[game.discardPile.length - 1];
    if (!discardTile) return;
    const exclusion = (_a = game.chowPongExclusion) == null ? void 0 : _a[player.id];
    const state = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(state, "chow", discardTile.suit)) {
      console.warn(`[CHOW] Player ${player.name} blocked by exclusion rule (firstAction=${state.firstActionSuit})`);
      game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== player.id);
      return;
    }
    let pendingAction = game.pendingActions.find((pa) => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) {
      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (!lastDiscard) return;
      pendingAction = { playerId: player.id, availableActions: [ActionType.CHOW], tile: lastDiscard };
    }
    const discardedTile = pendingAction.tile;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    const discarderIndex = game.players.findIndex((p) => p.id === sourcePlayerId);
    const nextPlayerAfterDiscarder = discarderIndex >= 0 ? this.getNextActivePlayer(game, discarderIndex) : void 0;
    if (!nextPlayerAfterDiscarder || nextPlayerAfterDiscarder.id !== player.id) {
      console.warn(`[CHOW] Not the next player after discarder: expected=${nextPlayerAfterDiscarder == null ? void 0 : nextPlayerAfterDiscarder.name}, got=${player.id}`);
      return;
    }
    const sequences = this.findChowSequences(player.hand.concealedTiles, discardedTile, game);
    if (sequences.length === 0) {
      console.warn("[CHOW] No sequence");
      return;
    }
    const sequence = this.selectChowSequence(sequences, discardedTile, tileIds);
    const handTiles = sequence.filter((t) => t.id !== discardedTile.id);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.SEQUENCE);
    this.checkAndBroadcastBailout(game, player.id, sourcePlayerId);
    for (const tile of handTiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }
    const sourcePos = this.getLastDiscardPosition(game);
    const meld = {
      type: MeldType.SEQUENCE,
      tiles: sequence,
      isConcealed: false,
      ...sourcePos !== void 0 && { sourcePosition: sourcePos },
      sourceTileId: discardedTile.id
    };
    player.hand.exposedMelds.push(meld);
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, "chow", discardTile.suit);
    const cdIdx = game.discardPile.findIndex((t) => t.id === discardedTile.id);
    if (cdIdx >= 0) game.discardPile.splice(cdIdx, 1);
    const discarder = game.players.find((p) => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter((t) => t.id !== discardedTile.id);
    }
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex((p) => p.id === player.id);
    this.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now() + Math.floor(Math.random() * 1e3),
        text: `\u{1F35C} ${player.name}\u5403\u724C`,
        actionKind: "chow",
        type: "info",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
  }
  /**
   * 直接执行碰(不检查胡优先级)
   */
  executePengDirectly(game, player) {
    var _a;
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;
    const exclusion = (_a = game.chowPongExclusion) == null ? void 0 : _a[player.id];
    const state = exclusion || { firstActionSuit: null, firstActionType: null };
    if (!checkChowPongExclusion(state, "pong", lastDiscard.suit)) {
      console.warn(`[PENG] Player ${player.name} blocked by exclusion rule (firstAction=${state.firstActionSuit})`);
      game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== player.id);
      return;
    }
    const matchingTiles = player.hand.concealedTiles.filter((t) => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 2) return;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.TRIPLET);
    this.checkAndBroadcastBailout(game, player.id, sourcePlayerId);
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now() + Math.floor(Math.random() * 1e3),
        text: `\u24D8 ${player.name}\u78B0\u724C`,
        actionKind: "pong",
        type: "info",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[0].id);
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, matchingTiles[1].id);
    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.TRIPLET,
      tiles: [lastDiscard, matchingTiles[0], matchingTiles[1]],
      isConcealed: false,
      ...sourcePos !== void 0 && { sourcePosition: sourcePos },
      sourceTileId: lastDiscard.id
    });
    if (!game.chowPongExclusion) game.chowPongExclusion = {};
    const prevState = game.chowPongExclusion[player.id] || { firstActionSuit: null, firstActionType: null };
    game.chowPongExclusion[player.id] = updateChowPongExclusion(prevState, "pong", lastDiscard.suit);
    const pdIdx = game.discardPile.findIndex((t) => t.id === lastDiscard.id);
    if (pdIdx >= 0) game.discardPile.splice(pdIdx, 1);
    const discarder = game.players.find((p) => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter((t) => t.id !== lastDiscard.id);
    }
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex((p) => p.id === player.id);
    this.replaceInitialFlowers(game, player);
    game.drawnThisTurn = true;
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
  }
  /**
   * 直接执行胡(碰吃冲突中,高优先级胡直接执行)
   */
  async executeWinDirectly(game, player, winningTile) {
    const fakePending = {
      playerId: player.id,
      availableActions: [ActionType.HU],
      tile: winningTile
    };
    game.pendingActions.push(fakePending);
    try {
      await this.handleHu(game, player);
    } finally {
      game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== player.id);
    }
  }
  /**
   * 直接执行杠(不检查胡优先级)
   */
  executeKongDirectly(game, player, tileId) {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;
    const pendingAction = game.pendingActions.find((pa) => pa.playerId === player.id);
    if (!pendingAction || !pendingAction.tile) return;
    const matchingTiles = player.hand.concealedTiles.filter((t) => tilesEqual(t, lastDiscard));
    if (matchingTiles.length < 3) return;
    const sourcePlayerId = this.getLastDiscardPlayerId(game);
    this.recordBailoutAction(game.gameId, player.id, sourcePlayerId, MeldType.KONG);
    for (const t of matchingTiles) player.hand.concealedTiles = removeTile(player.hand.concealedTiles, t.id);
    const sourcePos = this.getLastDiscardPosition(game);
    player.hand.exposedMelds.push({
      type: MeldType.KONG,
      tiles: [lastDiscard, ...matchingTiles],
      isConcealed: false,
      ...sourcePos !== void 0 && { sourcePosition: sourcePos },
      sourceTileId: lastDiscard.id
    });
    const kgIdx = game.discardPile.findIndex((t) => t.id === lastDiscard.id);
    if (kgIdx >= 0) game.discardPile.splice(kgIdx, 1);
    if (this.wsManager) {
      const label = pendingAction.type === "kong_an" ? "\u6697\u6760" : pendingAction.type === "kong_bu" ? "\u8865\u6760" : "\u660E\u6760";
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now() + Math.floor(Math.random() * 1e3),
        text: `\u24D8 ${player.name}${label}`,
        actionKind: "kong",
        type: "info",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    const discarder = game.players.find((p) => p.id === sourcePlayerId);
    if (discarder) {
      discarder.hand.discardedTiles = discarder.hand.discardedTiles.filter((t) => t.id !== lastDiscard.id);
    }
    player.windScore += 2;
    game.pendingActions = [];
    game.pengChowConflict = null;
    game.currentPlayerIndex = game.players.findIndex((p) => p.id === player.id);
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, "ming");
  }
  /**
   * 处理审批回应(碰吃冲突、碰胡冲突等)
   */
  async handleApprovalChoice(gameId, playerId, choice) {
    var _a;
    const game = this.games.get(gameId);
    if (!game || !game.pengChowConflict) return;
    const approvalConflict = game.pengChowConflict;
    const pending = game.pendingActions.find((pa) => pa.playerId === playerId);
    if (choice === "confirm") {
      const candPlayer = game.players.find((p) => p.id === playerId);
      if (!candPlayer || !pending) return;
      this.clearPendingActionTimer(gameId);
      game.pendingActions = game.pendingActions.filter(
        (pa) => pa.playerId === playerId || pa.playerId !== approvalConflict.requesterId && !(approvalConflict.currentStagePlayerIds || []).includes(pa.playerId)
      );
      game.pengChowConflict = null;
      if (pending.availableActions.includes(ActionType.HU)) {
        await this.executeWinDirectly(game, candPlayer, approvalConflict.tile);
      } else if (pending.availableActions.includes(ActionType.KONG)) {
        this.executeKongDirectly(game, candPlayer, approvalConflict.tile.id);
      } else if (pending.availableActions.includes(ActionType.PENG)) {
        this.executePengDirectly(game, candPlayer);
      }
      await this.persistGame(game);
      this.broadcastGameState(gameId);
      return;
    }
    game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== playerId);
    if ((_a = approvalConflict.currentStagePlayerIds) == null ? void 0 : _a.includes(playerId)) {
      approvalConflict.currentStagePlayerIds = approvalConflict.currentStagePlayerIds.filter((id) => id !== playerId);
    }
    await this.advanceApprovalConflict(game);
    await this.persistGame(game);
    this.broadcastGameState(gameId);
    return;
  }
  /**
   * @deprecated 使用 handleApprovalChoice 代替
   */
  handlePengChowChoice(gameId, pengPlayerId, choice) {
    this.handleApprovalChoice(gameId, pengPlayerId, choice === "peng" ? "confirm" : "pass");
  }
  async handlePeng(game, player) {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map((pid) => ({ playerId: pid, availableActions: ["hu"] }));
      await this.startApproval(game, player.id, "peng", candidates, lastDiscard);
      return;
    }
    this.executePengDirectly(game, player);
  }
  async handleKong(game, player, tileId) {
    const lastDiscard = game.discardPile[game.discardPile.length - 1];
    if (!lastDiscard) return;
    const { huCandidates } = this.checkHighPriorityCandidates(game, player.id, lastDiscard);
    if (huCandidates.length > 0) {
      const candidates = huCandidates.map((pid) => ({ playerId: pid, availableActions: ["hu"] }));
      await this.startApproval(game, player.id, "kong", candidates, lastDiscard);
      return;
    }
    this.executeKongDirectly(game, player, tileId);
  }
  handleConcealedKong(game, player, tileIds) {
    if (tileIds.length !== 4) return;
    const tiles = tileIds.map((id) => findTileById(player.hand.concealedTiles, id)).filter((t) => t);
    if (tiles.length !== 4) return;
    for (const tile of tiles) {
      player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    }
    const meld = {
      type: MeldType.CONCEALED_KONG,
      tiles,
      isConcealed: false
    };
    player.hand.exposedMelds.push(meld);
    const nonWinners = game.players.filter((p) => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.rainScore += nonWinners.length * 2;
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, "an");
  }
  handleExtendedKong(game, player, tileId) {
    var _a;
    const tile = findTileById(player.hand.concealedTiles, tileId);
    if (!tile) return;
    const tripletIndex = player.hand.exposedMelds.findIndex(
      (m) => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;
    const robbers = [];
    for (const candidate of game.players) {
      if (candidate.id === player.id) continue;
      if (candidate.status !== PlayerStatus.PLAYING) continue;
      const testHand = [...candidate.hand.concealedTiles, tile];
      const robWildId = typeof game.customScoringMode === "string" ? game.customScoringMode : null;
      const winCheck = canWin(testHand, candidate.hand.exposedMelds, robWildId || ((_a = game.wildTileGroup) != null ? _a : null));
      if (!winCheck.canWin) continue;
      const flowerCount = this.countFlowerTiles(candidate);
      const robHandTypes = detectHandTypes(
        testHand,
        candidate.hand.exposedMelds,
        false,
        flowerCount,
        game.customScoringMode || null,
        game.wildTileGroup
      );
      if (robHandTypes.length === 0) continue;
      const concealedNonFlower = candidate.hand.concealedTiles.filter((t) => !isFlower(t));
      const isDaDiao = concealedNonFlower.length === 1;
      const hasTenPointExemption = this.hasTenPointClaimExemption(robHandTypes, isDaDiao);
      if (!hasTenPointExemption) {
        const hasFlowerAtDoor = candidate.hand.exposedMelds.some(
          (m) => m.tiles.some((t) => t.suit === TileSuit.FLOWER)
        );
        const hasWindDragonTriplet = candidate.hand.exposedMelds.some(
          (m) => (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) && m.tiles[0] && (m.tiles[0].suit === TileSuit.WIND || m.tiles[0].suit === TileSuit.DRAGON)
        );
        const hasAnyKong = candidate.hand.exposedMelds.some(
          (m) => m.type === MeldType.KONG || m.type === MeldType.CONCEALED_KONG
        );
        if (!hasFlowerAtDoor && !hasWindDragonTriplet && !hasAnyKong) {
          continue;
        }
      }
      robbers.push({
        playerId: candidate.id,
        availableActions: [ActionType.HU, ActionType.PASS],
        tile,
        expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, candidate, [ActionType.HU, ActionType.PASS])
      });
    }
    if (robbers.length > 0) {
      game.pendingKongClaim = { playerId: player.id, tile };
      game.pendingActions = robbers;
      this.schedulePendingActionTimeout(game.gameId);
      return;
    }
    this.completeExtendedKong(game, player, tile);
  }
  completeExtendedKong(game, player, tile) {
    player.hand.concealedTiles = removeTile(player.hand.concealedTiles, tile.id);
    const tripletIndex = player.hand.exposedMelds.findIndex(
      (m) => m.type === MeldType.TRIPLET && tilesEqual(m.tiles[0], tile)
    );
    if (tripletIndex === -1) return;
    player.hand.exposedMelds[tripletIndex].type = MeldType.KONG;
    player.hand.exposedMelds[tripletIndex].tiles.push(tile);
    const nonWinners = game.players.filter((p) => p.status === PlayerStatus.PLAYING && p.id !== player.id);
    player.windScore += nonWinners.length * 1;
    this.handleDraw(game, player, { allowFullHand: true });
    game.drawnThisTurn = true;
    this.broadcastKongSupplement(game, player, "jia");
  }
  resolveRobKongIfNeeded(game) {
    const pendingClaim = game.pendingKongClaim;
    if (!pendingClaim) return false;
    if (game.pendingActions.length > 0) return true;
    if (!pendingClaim.cancelledByHu) {
      const kongPlayer = game.players.find((p) => p.id === pendingClaim.playerId);
      if (kongPlayer && kongPlayer.status === PlayerStatus.PLAYING) {
        this.completeExtendedKong(game, kongPlayer, pendingClaim.tile);
      }
    }
    game.pendingKongClaim = void 0;
    return true;
  }
  async handleHu(game, player, selectedWinOptionLabel) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const pendingAction = game.pendingActions.find((pa) => pa.playerId === player.id);
    const winningTile = pendingAction == null ? void 0 : pendingAction.tile;
    if (winningTile) {
      player.hand.concealedTiles.push(winningTile);
      player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
      const lastDiscard = game.discardPile[game.discardPile.length - 1];
      if (lastDiscard && lastDiscard.id === winningTile.id) {
        game.discardPile.pop();
      } else {
        const discardIndex = game.discardPile.findIndex((t) => t.id === winningTile.id);
        if (discardIndex !== -1) {
          game.discardPile.splice(discardIndex, 1);
        }
      }
    }
    game.pendingActions = game.pendingActions.filter(
      (pa) => pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );
    const isSelfDrawn = !pendingAction;
    const projectedWinOrder = game.winnersCount + 1;
    if (!game.nextDealerId) {
      if (projectedWinOrder === 1) {
        game.nextDealerId = player.id;
        if (!isSelfDrawn) {
          const discarderId = this.getLastDiscardPlayerId(game);
          if (discarderId) {
            game.nextDealerId = discarderId;
            const discarder = game.players.find((p) => p.id === discarderId);
            console.log(`[handleHu] \u4E00\u70AE\u591A\u54CD,\u653E\u51B2\u8005 ${discarder == null ? void 0 : discarder.name} \u4E3A\u4E0B\u5C40\u5E84\u5BB6`);
          }
        } else {
          console.log(`[handleHu] \u81EA\u6478,${player.name} \u4E3A\u4E0B\u5C40\u5E84\u5BB6`);
        }
      }
    }
    const winCheck = this.getCachedWinCheck(game, player);
    if (!winCheck.canWin) {
      throw new Error("Invalid Hu declaration");
    }
    const isKongFlower = this.isWinAfterKong(game, player.id);
    const isRobbingKong = !!(pendingAction == null ? void 0 : pendingAction.tile) && !!game.pendingKongClaim;
    const preferredWinType = isSelfDrawn ? "self_draw" : "discard";
    const filteredWinOptions = this.getCachedWinOptions(game, player, preferredWinType, {
      isKongFlower,
      isRobbingKong
    });
    const selectedWinOption = selectedWinOptionLabel ? filteredWinOptions.find((option) => option.label === selectedWinOptionLabel) : filteredWinOptions[0];
    const huHandTypes = detectHandTypes(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      isSelfDrawn,
      this.countFlowerTiles(player),
      game.customScoringMode,
      game.wildTileGroup
    );
    const resolvedHuHandTypes = huHandTypes.length ? huHandTypes : ((_a = selectedWinOption == null ? void 0 : selectedWinOption.handTypes) == null ? void 0 : _a.length) ? selectedWinOption.handTypes : winCheck.types;
    if (!resolvedHuHandTypes.length) {
      throw new Error("No valid hand type for Hu");
    }
    const flowerTiles = player.hand.exposedMelds.flatMap((m) => m.tiles).filter((t) => isFlower(t));
    const handTypes = detectHandTypes(
      player.hand.concealedTiles,
      player.hand.exposedMelds,
      isSelfDrawn,
      flowerTiles.length,
      game.customScoringMode,
      // 百搭牌标识
      game.wildTileGroup
    );
    const isMenQing = !player.hand.exposedMelds.some(
      (m) => m.type === MeldType.TRIPLET || m.type === MeldType.SEQUENCE || m.type === MeldType.KONG && !m.isConcealed
    );
    const wildParts = (_b = game.customScoringMode) == null ? void 0 : _b.split("-");
    const wildSuit = wildParts && wildParts[0] ? wildParts[0] : void 0;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1], 10) : void 0;
    const concealedNonFlower = player.hand.concealedTiles.filter((t) => !isFlower(t));
    const isDaDiao = concealedNonFlower.length === 1;
    const scoreResult = calculateScore({
      handTiles: player.hand.concealedTiles,
      exposedMelds: player.hand.exposedMelds,
      flowerTiles,
      handTypes: ((_c = selectedWinOption == null ? void 0 : selectedWinOption.handTypes) == null ? void 0 : _c.length) ? selectedWinOption.handTypes : handTypes.length ? handTypes : resolvedHuHandTypes,
      isSelfDrawn,
      isKongFlower,
      isRobbingKong,
      isMenQing,
      isDaDiao,
      wildTileSuit: wildSuit,
      wildTileValue: wildValue,
      wildTileGroup: game.wildTileGroup,
      rawRoundMultiplier: (_d = game.roundMultiplier) != null ? _d : 1,
      rawInheritMultiplier: (_e = game.inheritMultiplier) != null ? _e : 1,
      globalIncludesRound: true,
      settlementMultiplier: (_f = game.settlementMultiplier) != null ? _f : 1
    });
    player.status = PlayerStatus.WON;
    player.winOrder = projectedWinOrder;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    game.winnersCount++;
    player.wonFan = (_g = selectedWinOption == null ? void 0 : selectedWinOption.score) != null ? _g : scoreResult.finalPoints;
    player.winHandType = (_h = selectedWinOption == null ? void 0 : selectedWinOption.handTypeName) != null ? _h : scoreResult.handTypeName;
    player.isSelfDrawn = isSelfDrawn;
    player.winningScoreBreakdown = {
      baseFan: scoreResult.baseFan,
      extraMultipliers: scoreResult.extraMultipliers,
      diceMultiplier: scoreResult.roundMultiplier,
      inheritMultiplier: scoreResult.inheritMultiplier,
      effectiveMultiplier: scoreResult.globalMultiplier,
      settlementMultiplier: scoreResult.settlementMultiplier,
      finalPoints: player.wonFan,
      details: [...scoreResult.details]
    };
    if (!isSelfDrawn) {
      player.discarderId = (_i = this.getLastDiscardPlayerId(game)) != null ? _i : void 0;
    }
    const remainingActive = game.players.filter((p) => p.status === PlayerStatus.PLAYING).length;
    const hadPendingForMultiHu = !isSelfDrawn && game.pendingActions.some(
      (pa) => pa.playerId !== player.id && pa.availableActions.includes(ActionType.HU)
    );
    if (remainingActive <= 1) {
      this.endRound(game, GameEndReason.LAST_PLAYER);
      return;
    }
    game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== player.id);
    if (game.multiHuStarterIndex === void 0) {
      game.multiHuStarterIndex = game.players.findIndex((p) => p.id === player.id);
    }
    if (isRobbingKong && game.pendingKongClaim) {
      game.pendingKongClaim.cancelledByHu = true;
    }
    if (!hadPendingForMultiHu) {
      game.pendingActions = [];
    }
    return;
  }
  /**
   * 造反处理
   * 触发条件: 五毒散(见 isFivePoison)
   * 效果: 本局结束,下局倍数×2,造反者成为庄家
   */
  handleRebel(game, player) {
    var _a;
    const wildParts = (_a = game.customScoringMode) == null ? void 0 : _a.split("-");
    const wildSuit = wildParts ? wildParts[0] : void 0;
    const wildValue = wildParts && wildParts[1] ? parseInt(wildParts[1]) : void 0;
    if (!isFivePoison(
      player.hand.concealedTiles,
      wildSuit,
      wildValue,
      player.hand.exposedMelds.flatMap((meld) => meld.tiles || [])
    )) {
      throw new Error("Not eligible for rebel (\u4E94\u6BD2\u6563 condition not met)");
    }
    game.phase = GamePhase.ENDED;
    game.endReason = GameEndReason.LAST_PLAYER;
    game.endedAt = Date.now();
    game.rebelEvent = {
      playerId: player.id,
      playerName: player.name,
      newDealerIndex: player.position
    };
    game.dealerIndex = player.position;
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now(),
        text: `\u2694\uFE0F ${player.name}\u9020\u53CD\u6210\u529F\uFF01\u4E0B\u628A\u7FFB\u500D\uFF01`,
        type: "special",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
  }
  /**
   * 梁山聚义:全员投票机制(仅活跃玩家,4人全真人时开启)
   * - 每个活跃玩家可点击一次(之后锁定)
   * - 累积赢分超过被QJ线的玩家:自动视为同意,无否决权
   * - 全部活跃玩家都同意 → 本局结束,下把翻倍
   */
  handleLiangShan(game, player) {
    var _a, _b, _c, _d, _e;
    if (game.phase !== GamePhase.PLAYING) return;
    if (player.status !== PlayerStatus.PLAYING) return;
    if (((_a = game.inheritMultiplier) != null ? _a : 1) >= 8) return;
    const allHuman = game.players.length >= 4 && game.players.every((p) => !this.isPlayerBotControlled(p));
    if (!allHuman) return;
    if (!game.liangShanVotes) {
      game.liangShanVotes = [];
    }
    if (game.liangShanVotes.includes(player.id)) return;
    game.liangShanVotes.push(player.id);
    if (this.wsManager) {
      this.wsManager.broadcast(game.gameId, "broadcastMessage", {
        id: Date.now(),
        text: `\u{1F525} ${player.name}\u53D1\u8D77\u4E86\u6881\u5C71\u805A\u4E49\uFF01`,
        type: "special",
        timestamp: Date.now(),
        timeLabel: formatBeijingTime()
      });
    }
    const activePlayers = game.players.filter((p) => p.status === PlayerStatus.PLAYING);
    const threshold = (_b = game.liangShanThreshold) != null ? _b : 4e3;
    let effectiveVoteCount = game.liangShanVotes.length;
    for (const ap of activePlayers) {
      if (game.liangShanVotes.includes(ap.id)) continue;
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, ap.id);
      if (cumulativeScore > threshold) {
        effectiveVoteCount++;
        if (!game.liangShanVotes.includes(ap.id)) {
          game.liangShanVotes.push(ap.id);
          if (this.wsManager) {
            this.wsManager.broadcast(game.gameId, "broadcastMessage", {
              id: Date.now() + effectiveVoteCount,
              text: `\u{1F525} ${ap.name}\u54CD\u5E94\u4E86${player.name}\u7684\u6881\u5C71\u805A\u4E49\uFF01`,
              type: "special",
              timestamp: Date.now(),
              timeLabel: formatBeijingTime()
            });
          }
        }
        console.log(`[LiangShan] ${ap.name} \u7D2F\u79EF\u8D62\u5206${cumulativeScore}\u8D85\u8FC7QJ\u7EBF${threshold},\u81EA\u52A8\u540C\u610F`);
      }
    }
    console.log(`[LiangShan] ${player.name} voted (${effectiveVoteCount}/${activePlayers.length}, threshold: ${threshold})`);
    if (effectiveVoteCount >= activePlayers.length) {
      console.log(`[LiangShan] All players agreed! Ending round with \xD72 multiplier.`);
      for (const p of game.players) {
        if (p.status !== PlayerStatus.WON) {
          p.status = PlayerStatus.LOST;
        }
      }
      const doubled = Math.min(((_c = game.inheritMultiplier) != null ? _c : 1) * 2, 8);
      const roundMul = (_d = game.roundMultiplier) != null ? _d : 1;
      const effective = doubled * roundMul;
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : doubled, 8);
      game.phase = GamePhase.CHA_JIAO;
      game.endReason = GameEndReason.LAST_PLAYER;
      game.endedAt = Date.now();
      game.lastActionTime = Date.now();
      const winners = game.players.filter((p) => p.status === PlayerStatus.WON);
      const finalScores = calculateGameResult(game.players, winners);
      game.finalScores = finalScores;
      for (const p of game.players) {
        p.score = (_e = finalScores[p.id]) != null ? _e : 0;
      }
    }
  }
  /**
   * 等我想一想:冻结其他玩家8秒,给自己思考时间
   * - 每局限定次数(默认3次)
   * - 只有有胡/碰/杠选项时可用
   * - 冻结期间其他家不能操作
   */
  handleThink(game, player) {
    var _a, _b, _c, _d;
    if (game.phase !== GamePhase.PLAYING) return;
    const maxChances = (_a = game.thinkChances) != null ? _a : 3;
    if (!game.thinkUsage) game.thinkUsage = {};
    const used = (_b = game.thinkUsage[player.id]) != null ? _b : 0;
    let remaining = Math.max(0, maxChances - used);
    const hasHuClaim = game.pendingActions.some(
      (pa) => pa.playerId === player.id && pa.availableActions.includes(ActionType.HU)
    );
    if (!hasHuClaim) {
      if (used >= maxChances) return;
      game.thinkUsage[player.id] = used + 1;
      remaining = maxChances - used - 1;
      console.log(`[Think] ${player.name} used think chance (${used + 1}/${maxChances})`);
    } else {
      console.log(`[Think] ${player.name} opened HuPanel (auto-lock, no chance consumed)`);
    }
    game.thinkFreezeUntil = Date.now() + 8e3;
    game.thinkFreezePlayerId = player.id;
    const freezeTimer = this.freezeTimers.get(game.gameId);
    if (freezeTimer) {
      clearTimeout(freezeTimer);
      this.freezeTimers.delete(game.gameId);
    }
    const botTimer = this.botTimers.get(game.gameId);
    if (botTimer) {
      clearTimeout(botTimer);
      this.botTimers.delete(game.gameId);
    }
    for (const pending of game.pendingActions) {
      pending.expiresAt = Math.max((_c = pending.expiresAt) != null ? _c : 0, game.thinkFreezeUntil);
    }
    if (game.pengChowConflict) {
      game.pengChowConflict.expiresAt = Math.max((_d = game.pengChowConflict.expiresAt) != null ? _d : 0, game.thinkFreezeUntil);
    }
    if (game.pendingActions.length > 0 || game.pengChowConflict) {
      this.schedulePendingActionTimeout(game.gameId);
    }
    console.log(`[Think] ${player.name} \u4F7F\u7528\u300C\u7B49\u6211\u60F3\u4E00\u60F3\u300D,\u5269\u4F59${remaining}\u6B21,\u51BB\u7ED38\u79D2`);
    const gameId = game.gameId;
    const expectedPlayerId = player.id;
    this.detachTimer(setTimeout(async () => {
      try {
        const freshGame = await this.getGame(gameId);
        if (!freshGame) return;
        if (freshGame.thinkFreezePlayerId === expectedPlayerId) {
          freshGame.thinkFreezeUntil = void 0;
          freshGame.thinkFreezePlayerId = void 0;
          if (freshGame.pendingActions.length > 0 || freshGame.pengChowConflict) {
            this.schedulePendingActionTimeout(gameId);
            await this.persistGame(freshGame);
            this.broadcastGameState(gameId);
            console.log(`[Think] ${player.name} \xE7\u0161\u201E\xE6\u20AC\x9D\xE8\u20AC\u0192\xE6\u2014\xB6\xE9\u2014\xB4\xE7\xBB\u201C\xE6\x9D\u0178`);
            return;
          }
          const triggerPending = freshGame.pendingActions.find((pa) => pa.playerId === expectedPlayerId);
          if (triggerPending && triggerPending.expiresAt && triggerPending.expiresAt < Date.now()) {
            const triggerPlayer = freshGame.players.find((p) => p.id === expectedPlayerId);
            if (triggerPlayer) {
              console.log(`[Think] ${triggerPlayer.name} \u7684\u601D\u8003\u65F6\u95F4\u7ED3\u675F,\u81EA\u52A8\u8FC7(PASS)\u8FC7\u671Fpending`);
              this.handlePass(freshGame, triggerPlayer);
            }
          }
          if (freshGame.pendingActions.length > 0 || freshGame.pengChowConflict) {
            this.schedulePendingActionTimeout(gameId);
          } else {
            const currentPlayer = freshGame.players[freshGame.currentPlayerIndex];
            if (currentPlayer && currentPlayer.status === PlayerStatus.PLAYING) {
              if (this.isPlayerBotControlled(currentPlayer)) {
                this.scheduleBotDiscard(gameId, currentPlayer.id);
              } else {
                if (currentPlayer.id === expectedPlayerId) {
                  if (!freshGame.pendingActions.length) {
                    await this.moveToNextPlayer(freshGame);
                    await this.persistGame(freshGame);
                    this.broadcastGameState(gameId);
                  }
                }
              }
            }
          }
          await this.persistGame(freshGame);
          this.broadcastGameState(gameId);
          console.log(`[Think] ${player.name} \u7684\u601D\u8003\u65F6\u95F4\u7ED3\u675F`);
        }
      } catch (err) {
        console.error("[Think] Error:", err);
      }
    }, 8e3));
    if (this.wsManager) {
      this.wsManager.broadcast(gameId, "thinkFreeze", {
        playerName: player.name,
        remaining,
        expiresAt: game.thinkFreezeUntil
      });
    }
  }
  /**
   * 获取玩家在本房间的累积有效输赢(仅计算与真人玩家的对战,去掉AI)
   * 通过 matchHistory 计算
   */
  getPlayerCumulativeScore(gameId, playerId) {
    var _a;
    const game = this.games.get(gameId);
    if (!game || !game.roundStats) return 0;
    let cumulative = 0;
    for (const round of game.roundStats) {
      const score = (_a = round.scores[playerId]) != null ? _a : 0;
      if (score > 0) {
        cumulative += score;
      }
    }
    return cumulative;
  }
  /**
   * 检查各玩家是否突破被聚义QJ线,更新 qjAlerts(每局独立刷新)
   */
  checkQJThresholdAlerts(game) {
    var _a;
    const threshold = (_a = game.liangShanThreshold) != null ? _a : 4e3;
    const alerts = [];
    for (const player of game.players) {
      if (this.isPlayerBotControlled(player)) continue;
      const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, player.id);
      if (cumulativeScore > threshold) {
        alerts.push({ playerId: player.id, playerName: player.name, score: cumulativeScore });
      }
    }
    game.qjAlerts = alerts;
    if (alerts.length > 0) {
      console.log(`[QJ Alert] ${alerts.map((a) => `${a.playerName}(${a.score})`).join(", ")} \u5DF2\u7A81\u7834\u88AB\u805A\u4E49QJ\u7EBF${threshold}`);
    }
  }
  /**
   * 计算玩家换位置次数(基于累积输分)
   * 每输一个QJ线距离,获得1次机会
   * 默认QJ线4000:输4000→1次,输8000→2次,输12000→3次
   */
  computeSwapChances(game, playerId) {
    var _a;
    const threshold = (_a = game.liangShanThreshold) != null ? _a : 4e3;
    const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, playerId);
    if (cumulativeScore >= 0) return 0;
    const absScore = Math.abs(cumulativeScore);
    return Math.min(Math.floor(absScore / threshold), 10);
  }
  /**
   * 请求换位置
   */
  requestSwapPosition(gameId, playerId, targetId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.ENDED) {
      throw new Error("Can only swap during or after a round");
    }
    const player = game.players.find((p) => p.id === playerId);
    const target = game.players.find((p) => p.id === targetId);
    if (!player || !target) throw new Error("Player not found");
    if (this.isPlayerBotControlled(player)) throw new Error("AI players cannot swap positions");
    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = (game.swapRequests || []).filter((r) => r.playerId === playerId).length;
    const remainingChances = totalChances - usedChances;
    if (remainingChances <= 0) {
      throw new Error("\u6CA1\u6709\u6362\u4F4D\u7F6E\u673A\u4F1A\u4E86(\u79EF\u5206\u672A\u8FBE\u6807\u6216\u5DF2\u7528\u5B8C)");
    }
    if (!game.swapRequests) game.swapRequests = [];
    const existing = game.swapRequests.find((r) => r.playerId === playerId && r.targetId === targetId);
    if (existing) throw new Error("\u5DF2\u63D0\u4EA4\u8FC7\u6362\u4F4D\u8BF7\u6C42,\u7B49\u5F85\u751F\u6548\u4E2D");
    game.swapRequests.push({
      playerId,
      targetId,
      requestedAt: Date.now()
    });
    console.log(`[Swap] ${player.name} \u8BF7\u6C42\u4E0E ${target.name} \u6362\u4F4D\u7F6E (\u5269\u4F59${remainingChances - 1}\u6B21)`);
    return {
      success: true,
      message: `${player.name} \u4E0B\u4E00\u5C40\u5F00\u59CB\u5C06\u4E0E ${target.name} \u4E92\u6362\u4F4D\u7F6E`
    };
  }
  /**
   * 应用待生效的换位请求(在startGame中调用)
   */
  applySwapRequests(game) {
    if (!game.swapRequests || game.swapRequests.length === 0) return;
    for (const req of game.swapRequests) {
      const p1Idx = game.players.findIndex((p) => p.id === req.playerId);
      const p2Idx = game.players.findIndex((p) => p.id === req.targetId);
      if (p1Idx < 0 || p2Idx < 0) continue;
      const p1 = game.players[p1Idx];
      const p2 = game.players[p2Idx];
      const tmpPos = p1.position;
      p1.position = p2.position;
      p2.position = tmpPos;
      game.players[p1Idx] = p2;
      game.players[p2Idx] = p1;
      console.log(`[Swap] ${p1.name} \u2194 ${p2.name} \u4F4D\u7F6E\u5DF2\u4E92\u6362`);
    }
    game.swapRequests = [];
  }
  /**
   * 观赛者请求下局替换某个AI
   */
  requestBotReplacement(gameId, spectatorId, targetBotId, playerName, userId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    const spectator = game.players.find((p) => p.id === spectatorId && p.status === PlayerStatus.SPECTATING);
    if (!spectator) throw new Error("Spectator not found");
    const bot = game.players.find((p) => p.id === targetBotId && (p.name.startsWith("AI-") || p.name.startsWith("\u7535\u8111")));
    if (!bot) throw new Error("Target bot not found");
    if (!game.botReplacementQueue) game.botReplacementQueue = [];
    game.botReplacementQueue = game.botReplacementQueue.filter((r) => r.spectatorId !== spectatorId);
    game.botReplacementQueue.push({
      spectatorId,
      spectatorName: playerName,
      targetBotId,
      userId,
      requestedAt: Date.now()
    });
    console.log(`[BotReplace] ${playerName}(\u89C2\u8D5B) \u8BF7\u6C42\u4E0B\u5C40\u66FF\u6362 ${bot.name}`);
  }
  /**
   * 应用待生效的替换AI请求(在startGame中调用)
   */
  applyBotReplacement(game) {
    if (!game.botReplacementQueue || game.botReplacementQueue.length === 0) return;
    for (const req of game.botReplacementQueue) {
      const botIdx = game.players.findIndex((p) => p.id === req.targetBotId);
      if (botIdx < 0) {
        console.warn(`[BotReplace] \u76EE\u6807AI ${req.targetBotId} \u5DF2\u4E0D\u5728\u623F\u95F4,\u8DF3\u8FC7`);
        continue;
      }
      const spectatorIdx = game.players.findIndex((p) => p.id === req.spectatorId);
      if (spectatorIdx < 0) {
        console.warn(`[BotReplace] \u89C2\u8D5B\u8005 ${req.spectatorId} \u5DF2\u4E0D\u5728\u623F\u95F4,\u8DF3\u8FC7`);
        continue;
      }
      const bot = game.players[botIdx];
      const oldSpectator = game.players[spectatorIdx];
      const newPlayerId = randomUUID$1();
      const newPlayer = {
        id: newPlayerId,
        userId: req.userId,
        name: req.spectatorName,
        position: bot.position,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PlayerStatus.WAITING,
        isDealer: false,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0
      };
      game.players[botIdx] = newPlayer;
      game.players.splice(spectatorIdx, 1);
      if (game.spectatorViews) {
        delete game.spectatorViews[req.spectatorId];
      }
      console.log(`[BotReplace] ${oldSpectator.name} \u2192 \u66FF\u6362 ${bot.name} \u6210\u529F, \u65B0\u73A9\u5BB6ID: ${newPlayerId}`);
    }
    game.botReplacementQueue = [];
  }
  /**
   * 获取玩家剩余换位置次数信息
   */
  getSwapInfo(gameId, playerId) {
    const game = this.games.get(gameId);
    if (!game) return { totalChances: 0, usedChances: 0, remaining: 0 };
    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = (game.swapRequests || []).filter((r) => r.playerId === playerId).length;
    return { totalChances, usedChances, remaining: totalChances - usedChances };
  }
  handleCheatHu(game, player) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== player.id) {
      throw new Error("Cheat Hu is only available on your turn");
    }
    if (player.status !== PlayerStatus.PLAYING) {
      return;
    }
    game.pendingActions = [];
    player.status = PlayerStatus.WON;
    player.winOrder = game.winnersCount + 1;
    player.winRound = game.roundNumber;
    player.winTimestamp = Date.now();
    player.wonFan = 1;
    game.winnersCount++;
    game.customScoringMode = "cheat";
    this.endRound(game, GameEndReason.LAST_PLAYER);
  }
  async handlePass(game, player) {
    var _a, _b, _c;
    game.pendingActions = game.pendingActions.filter((pa) => pa.playerId !== player.id);
    if ((_b = (_a = game.pengChowConflict) == null ? void 0 : _a.currentStagePlayerIds) == null ? void 0 : _b.includes(player.id)) {
      game.pengChowConflict.currentStagePlayerIds = game.pengChowConflict.currentStagePlayerIds.filter((id) => id !== player.id);
      await this.advanceApprovalConflict(game);
      if (game.pengChowConflict) {
        return;
      }
    }
    if (game.pendingActions.length === 0 && game.pendingKongClaim && game.multiHuStarterIndex === void 0) {
      this.resolveRobKongIfNeeded(game);
      return;
    }
    if (game.pendingActions.length === 0 && game.multiHuStarterIndex !== void 0) {
      const starter = game.multiHuStarterIndex;
      game.multiHuStarterIndex = void 0;
      if ((_c = game.pendingKongClaim) == null ? void 0 : _c.cancelledByHu) {
        game.pendingKongClaim = void 0;
      }
      const next = this.getNextActivePlayer(game, starter);
      if (next) {
        game.currentPlayerIndex = game.players.findIndex((p) => p.id === next.id);
        this.replaceFlowers(game, next);
        this.handleDraw(game, next);
        game.drawnThisTurn = true;
      }
      return;
    }
  }
  checkPendingActions(game, discardedTile) {
    var _a;
    game.pendingActions = [];
    delete game.hasTriggeredAction;
    const discarderIndex = game.currentPlayerIndex;
    buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
    for (const player of game.players) {
      if (player.status !== PlayerStatus.PLAYING) continue;
      if (player.id === game.players[game.currentPlayerIndex].id) continue;
      const actions = [];
      const matchingTiles = player.hand.concealedTiles.filter((t) => tilesEqual(t, discardedTile));
      if (matchingTiles.length >= 2) {
        actions.push(ActionType.PENG);
      }
      if (matchingTiles.length >= 3) {
        actions.push(ActionType.KONG);
      }
      const testHand = [...player.hand.concealedTiles, discardedTile];
      const wildTileId = typeof game.customScoringMode === "string" ? game.customScoringMode : null;
      const winCheck = canWin(testHand, player.hand.exposedMelds, wildTileId || ((_a = game.wildTileGroup) != null ? _a : null));
      if (winCheck.canWin) {
        const flowerCount = player.hand.exposedMelds.flatMap((m) => m.tiles).filter((t) => isFlower(t)).length;
        const handTypes = detectHandTypes(
          testHand,
          player.hand.exposedMelds,
          false,
          flowerCount,
          game.customScoringMode || null,
          game.wildTileGroup
        );
        const concealedNonFlower = player.hand.concealedTiles.filter((t) => !isFlower(t));
        const isDaDiao = concealedNonFlower.length === 1;
        const hasTenPointExemption = this.hasTenPointClaimExemption(handTypes, isDaDiao);
        const requiresFlowerGate = !hasTenPointExemption;
        const hasFlowerAtDoor = flowerCount > 0;
        const hasWindDragonTriplet = player.hand.exposedMelds.some(
          (m) => (m.type === MeldType.TRIPLET || m.type === MeldType.KONG) && m.tiles[0] && (isWind(m.tiles[0]) || isDragon(m.tiles[0]))
        );
        const hasAnyKong = player.hand.exposedMelds.some((m) => m.type === MeldType.KONG);
        const hasGatePass = hasFlowerAtDoor || hasWindDragonTriplet || hasAnyKong;
        if (!requiresFlowerGate || hasGatePass) {
          actions.push(ActionType.HU);
        }
      }
      if (actions.length > 0) {
        actions.push(ActionType.PASS);
        game.pendingActions.push({
          playerId: player.id,
          availableActions: actions,
          tile: discardedTile,
          expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, player, actions)
        });
      }
    }
    for (const pending of game.pendingActions) {
      if (!pending.availableActions.includes(ActionType.HU) || !pending.tile) continue;
      const targetPlayer = game.players.find((player) => player.id === pending.playerId);
      if (!targetPlayer) continue;
      this.invalidateWinEvaluationCache(game.gameId, [targetPlayer.id]);
      this.prewarmWinEvaluation(game, targetPlayer, "discard", pending.tile);
    }
    const chowPlayer = this.getNextActivePlayer(game, discarderIndex);
    if (chowPlayer) {
      const sequences = this.findChowSequences(chowPlayer.hand.concealedTiles, discardedTile, game);
      if (sequences.length > 0) {
        const chowOptions = this.buildChowOptionIds(sequences, discardedTile);
        const existing = game.pendingActions.find((pa) => pa.playerId === chowPlayer.id);
        if (existing) {
          if (!existing.availableActions.includes(ActionType.CHOW)) {
            existing.availableActions.push(ActionType.CHOW);
          }
          existing.chowOptions = chowOptions;
          existing.selectedChowTileIds = this.isPlayerBotControlled(chowPlayer) ? selectBotChowTileIds(chowPlayer, game, discardedTile, chowOptions) : void 0;
        } else {
          game.pendingActions.push({
            playerId: chowPlayer.id,
            availableActions: [ActionType.CHOW, ActionType.PASS],
            tile: discardedTile,
            chowOptions,
            selectedChowTileIds: this.isPlayerBotControlled(chowPlayer) ? selectBotChowTileIds(chowPlayer, game, discardedTile, chowOptions) : void 0,
            expiresAt: Date.now() + this.getHumanClaimDecisionTimeoutMs(game, chowPlayer, [ActionType.CHOW, ActionType.PASS])
          });
        }
      }
    }
    if (chowPlayer) {
      const chowPlayerIndex = game.players.findIndex((p) => p.id === chowPlayer.id);
      if (chowPlayerIndex >= 0) {
        const hasPendingForChowPlayer = game.pendingActions.some((pa) => pa.playerId === chowPlayer.id);
        if (hasPendingForChowPlayer) {
          game.currentPlayerIndex = chowPlayerIndex;
          game.drawnThisTurn = false;
        }
      }
    }
    if (game.pendingActions.length === 0) {
      this.clearPendingActionTimer(game.gameId);
    }
  }
  /**
   * Get the next active (PLAYING) player after the given index, skipping WON/LOST players
   */
  getNextActivePlayer(game, afterIndex) {
    const count = game.players.length;
    for (let i = 1; i <= count; i++) {
      const idx = (afterIndex + i) % count;
      if (game.players[idx].status === PlayerStatus.PLAYING) {
        return game.players[idx];
      }
    }
    return void 0;
  }
  /**
   * Get the previous active (PLAYING) player before the given index, skipping WON/LOST players
   */
  getPreviousActivePlayer(game, beforeIndex) {
    const count = game.players.length;
    for (let i = 1; i <= count; i++) {
      const idx = (beforeIndex - i + count) % count;
      if (game.players[idx].status === PlayerStatus.PLAYING) {
        return game.players[idx];
      }
    }
    return void 0;
  }
  /**
   * Find all possible sequence combinations in hand that include the given tile
   * Only works for number suits (筒万条)
   * 百搭牌不能用于吃牌
   */
  findChowSequences(hand, discardedTile, game) {
    const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
    if (!numberSuits.includes(discardedTile.suit)) return [];
    if (game && this.isWildTile(game, discardedTile)) return [];
    const eligibleHand = game ? hand.filter((t) => !this.isWildTile(game, t)) : hand;
    const sequences = [];
    const v = discardedTile.value;
    const suit = discardedTile.suit;
    if (v <= 7) {
      const t2 = eligibleHand.find((t) => t.suit === suit && t.value === v + 1);
      const t3 = eligibleHand.find((t) => t.suit === suit && t.value === v + 2);
      if (t2 && t3) {
        sequences.push([discardedTile, t2, t3]);
      }
    }
    if (v >= 2 && v <= 8) {
      const t1 = eligibleHand.find((t) => t.suit === suit && t.value === v - 1);
      const t3 = eligibleHand.find((t) => t.suit === suit && t.value === v + 1);
      if (t1 && t3) {
        sequences.push([t1, discardedTile, t3]);
      }
    }
    if (v >= 3) {
      const t1 = eligibleHand.find((t) => t.suit === suit && t.value === v - 2);
      const t2 = eligibleHand.find((t) => t.suit === suit && t.value === v - 1);
      if (t1 && t2) {
        sequences.push([t1, t2, discardedTile]);
      }
    }
    return sequences;
  }
  buildChowOptionIds(sequences, discardedTile) {
    const seen = /* @__PURE__ */ new Set();
    const options = [];
    for (const sequence of sequences) {
      const ids = sequence.filter((tile) => tile.id !== discardedTile.id).map((tile) => tile.id).sort();
      const key = ids.join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      options.push(ids);
    }
    return options;
  }
  /**
   * 对吃牌组合评分,选择最优吃法
   * 评分规则:
   * - 夹张(弃牌在中间):最高优先,完成搭子
   * - 单边(弃牌在边且手牌是1,2或8,9):次优先,完成边搭
   * - 两面(弃牌在边且手牌连号):最低优先,留下灵活搭子
   */
  scoreChowSequence(sequence, discardedTile) {
    const sorted = [...sequence].sort((a, b) => a.value - b.value);
    const values = sorted.map((t) => t.value);
    const discardIdx = sorted.findIndex((t) => t.id === discardedTile.id);
    let score = 0;
    if (discardIdx === 1) {
      const gap = values[2] - values[0];
      if (gap === 2) {
        score += 10;
      }
    }
    if (discardIdx === 0 || discardIdx === 2) {
      const remaining = discardIdx === 0 ? [values[1], values[2]] : [values[0], values[1]];
      if (remaining[0] === 1 && remaining[1] === 2 || remaining[0] === 8 && remaining[1] === 9) {
        score += 8;
      } else {
        score += 2;
      }
    }
    const hand = [...sequence].filter((t) => t.id !== discardedTile.id);
    if (hand.length === 2 && Math.abs(hand[0].value - hand[1].value) === 1) {
      score += 1;
    }
    return score;
  }
  /**
   * 从多个吃牌组合中选择最优组合
   */
  selectBestChowSequence(sequences, discardedTile) {
    if (sequences.length === 1) return sequences[0];
    let best = sequences[0];
    let bestScore = this.scoreChowSequence(sequences[0], discardedTile);
    for (let i = 1; i < sequences.length; i++) {
      const score = this.scoreChowSequence(sequences[i], discardedTile);
      if (score > bestScore) {
        bestScore = score;
        best = sequences[i];
      }
    }
    return best;
  }
  selectChowSequence(sequences, discardedTile, tileIds) {
    if (tileIds == null ? void 0 : tileIds.length) {
      const requested = [...tileIds].sort().join("|");
      const matched = sequences.find((sequence) => {
        const ids = sequence.filter((tile) => tile.id !== discardedTile.id).map((tile) => tile.id).sort().join("|");
        return ids === requested;
      });
      if (!matched) {
        throw new Error("Invalid chow selection");
      }
      return matched;
    }
    return this.selectBestChowSequence(sequences, discardedTile);
  }
  async moveToNextPlayer(game) {
    if (game.phase !== GamePhase.PLAYING) {
      return;
    }
    if (game.pendingActions.length > 0) {
      console.log(`[moveToNextPlayer] Skipped: ${game.pendingActions.length} pending actions remaining`);
      return;
    }
    if (game.players.length === 0) {
      throw new Error("No players remaining");
    }
    let rotations = 0;
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      rotations++;
      if (rotations > game.players.length) {
        throw new Error("No active players remaining");
      }
    } while (game.players[game.currentPlayerIndex].status !== PlayerStatus.PLAYING);
    await this.beginCurrentPlayerTurn(game);
  }
  async beginCurrentPlayerTurn(game) {
    const nextPlayer = game.players[game.currentPlayerIndex];
    if (!nextPlayer) {
      throw new Error("No current player available");
    }
    const freezeMs = this.getHesitationWindow(game);
    console.log(`[moveToNextPlayer] \u2192 ${nextPlayer.name} (${this.isPlayerBotControlled(nextPlayer) ? "BOT" : "HUMAN"}), freeze: ${freezeMs}ms`);
    game.drawnThisTurn = false;
    game.huSelectionLocks = void 0;
    if (game.freezePlayerId) {
      const freezePlayer = game.players.find((p) => p.id === game.freezePlayerId);
      if (freezePlayer && nextPlayer.id === game.freezePlayerId) {
        console.log(`[Freeze] \u4E00\u5708\u5B8C\u6210\uFF0C\u89E3\u9664\u51B7\u51BB for ${freezePlayer.name}`);
        game.freezePlayerId = null;
        game.freezeComplete = false;
        if (this.wsManager) {
          this.wsManager.broadcast(game.gameId, "broadcastMessage", {
            id: Date.now(),
            text: `\u{1F0CF} \u51B7\u51BB\u89E3\u9664\uFF0C\u73B0\u5728\u53EF\u4EE5\u6B63\u5E38\u5403\u78B0\u6349\u51B2\u4E86\uFF01`,
            type: "info",
            timestamp: Date.now(),
            timeLabel: formatBeijingTime()
          });
        }
      }
    }
    this.replaceFlowers(game, nextPlayer);
    if (this.isPlayerBotControlled(nextPlayer)) {
      const freezeBotIndex = game.currentPlayerIndex;
      const botFreezeTimer = this.detachTimer(setTimeout(async () => {
        try {
          this.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeBotIndex) return;
          const livePlayer = freshGame.players[freshGame.currentPlayerIndex];
          if (!livePlayer || livePlayer.id !== nextPlayer.id || livePlayer.status !== PlayerStatus.PLAYING) return;
          if (freshGame.pendingActions.length > 0) {
            const botLogMsg = freshGame.hasTriggeredAction ? "[bot-freeze] hasTriggeredAction=true, retaining all claims" : "[bot-freeze] No action triggered, clearing CD claims (B preserved)";
            console.log(`[bot-freeze] Freeze expired for ${livePlayer.name}, ${botLogMsg}`);
            this.clearExpiredClaimsForDecisionWindow(freshGame);
            if (freshGame.pendingActions.length > 0 && !this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              this.schedulePendingActionTimeout(game.gameId);
              return;
            }
            if (this.canExecuteCurrentTurnPlayerDrawDuringPending(freshGame, livePlayer.id)) {
              this.clearCurrentTurnPendingActions(freshGame, livePlayer.id);
            }
            if (freshGame.pendingActions.length > 0) {
              console.log(`[bot-freeze] ${livePlayer.name} no response, clearing pending actions`);
              freshGame.pendingActions = [];
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
            }
          }
          console.log(`[bot-freeze] Freeze expired for ${livePlayer.name}, drawing...`);
          if (freshGame.wall.length === 0) {
            this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            return;
          }
          this.replaceFlowers(freshGame, livePlayer);
          if (this.getPlayableTileCount(livePlayer) >= 14) {
            freshGame.drawnThisTurn = true;
            console.log(`[bot-freeze] ${livePlayer.name} already filled hand via flower replacement, scheduling discard`);
          } else {
            this.handleDraw(freshGame, livePlayer);
            freshGame.drawnThisTurn = true;
            console.log(`[bot-freeze] Draw done, hand: ${livePlayer.hand.concealedTiles.length} tiles, scheduling discard`);
          }
          this.scheduleBotDiscard(game.gameId, livePlayer.id);
          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error("[bot-freeze] Error:", err);
        }
      }, this.getBotDrawFreezeMs(game)));
      this.freezeTimers.set(game.gameId, botFreezeTimer);
    } else {
      game._freezeUntil = Date.now() + freezeMs;
      await this.persistGame(game);
      this.broadcastGameState(game.gameId);
      const freezeCurrentIndex = game.currentPlayerIndex;
      const humanFreezeTimer = this.detachTimer(setTimeout(async () => {
        var _a;
        try {
          this.freezeTimers.delete(game.gameId);
          const freshGame = await this.getGame(game.gameId);
          if (!freshGame || freshGame.phase !== GamePhase.PLAYING) return;
          if (freshGame.currentPlayerIndex !== freezeCurrentIndex) return;
          delete freshGame._freezeUntil;
          if (freshGame.pendingActions.length > 0) {
            console.log(`[freeze] Pending actions active for ${(_a = freshGame.players[freezeCurrentIndex]) == null ? void 0 : _a.name}, keeping all claims`);
            await this.persistGame(freshGame);
            this.broadcastGameState(game.gameId);
            this.schedulePendingActionTimeout(game.gameId);
            return;
          }
          const nextPlayer2 = freshGame.players[freshGame.currentPlayerIndex];
          if (nextPlayer2 && nextPlayer2.status === PlayerStatus.PLAYING) {
            if (freshGame.wall.length === 0) {
              this.endRound(freshGame, GameEndReason.WALL_EXHAUSTED);
              await this.persistGame(freshGame);
              this.broadcastGameState(game.gameId);
              return;
            }
            if (this.isPlayerBotControlled(nextPlayer2)) {
              this.replaceFlowers(freshGame, nextPlayer2);
              if (this.getPlayableTileCount(nextPlayer2) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[freeze] ${nextPlayer2.name} reached discard state after flower replacement`);
              } else {
                this.handleDraw(freshGame, nextPlayer2);
                freshGame.drawnThisTurn = true;
                console.log(`[freeze] Auto-draw for bot ${nextPlayer2.name}`);
              }
              this.scheduleBotDiscard(game.gameId, nextPlayer2.id);
            } else {
              if (this.getPlayableTileCount(nextPlayer2) >= 14) {
                freshGame.drawnThisTurn = true;
                console.log(`[freeze] Human ${nextPlayer2.name} reached discard state after flower replacement`);
              } else {
                console.log(`[freeze] Human ${nextPlayer2.name} freeze expired, waiting for manual draw`);
              }
            }
            if (!this.isPlayerBotControlled(nextPlayer2)) {
              this.scheduleAutoTakeover(game.gameId, nextPlayer2.id, freezeCurrentIndex);
            }
          }
          await this.persistGame(freshGame);
          this.broadcastGameState(game.gameId);
        } catch (err) {
          console.error("[freeze] Error clearing freeze:", err);
        }
      }, freezeMs));
      this.freezeTimers.set(game.gameId, humanFreezeTimer);
    }
  }
  getAutoTakeoverTimeoutMs() {
    return 6e4;
  }
  scheduleAutoTakeover(gameId, playerId, expectedIndex) {
    const key = `${gameId}-${playerId}`;
    const existing = this.autoTakeoverTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = this.detachTimer(setTimeout(async () => {
      var _a, _b, _c;
      this.autoTakeoverTimers.delete(key);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) return;
        if (game.currentPlayerIndex !== expectedIndex) return;
        const player = game.players[game.currentPlayerIndex];
        if (!player || player.id !== playerId) return;
        if (this.isPlayerBotControlled(player)) return;
        const currentCount = (this.consecutiveTimeouts.get(key) || 0) + 1;
        this.consecutiveTimeouts.set(key, currentCount);
        if (!game.pendingActions.length) {
          if (!game.drawnThisTurn && this.canPlayerDrawOnCurrentTurn(game, player)) {
            await this.executeAction(gameId, playerId, ActionType.DRAW, void 0);
          }
          const refreshedGame = await this.getGame(gameId);
          const refreshedPlayer = (_a = refreshedGame == null ? void 0 : refreshedGame.players) == null ? void 0 : _a[refreshedGame.currentPlayerIndex];
          if (refreshedGame && refreshedGame.phase === GamePhase.PLAYING && refreshedPlayer && refreshedPlayer.id === playerId && refreshedGame.drawnThisTurn && this.isConcealedDiscardState(refreshedPlayer)) {
            const forcedTileId = ((_b = refreshedPlayer.lastDrawnTile) == null ? void 0 : _b.id) || ((_c = refreshedPlayer.hand.concealedTiles[refreshedPlayer.hand.concealedTiles.length - 1]) == null ? void 0 : _c.id);
            if (forcedTileId) {
              await this.executeAction(gameId, playerId, ActionType.DISCARD, forcedTileId);
            }
          }
          this.consecutiveTimeouts.set(key, currentCount);
        }
        if (currentCount >= 2) {
          console.log(`[AutoTakeover] ${player.name} \u8FDE\u7EED${currentCount}\u56DE\u5408\u8D85\u65F660\u79D2,\u81EA\u52A8AI\u63A5\u7BA1`);
          this.consecutiveTimeouts.delete(key);
          this.enableBotMode(gameId, playerId);
          await this.persistGame(game);
          this.broadcastGameState(gameId);
        } else {
          console.log(`[AutoTakeover] ${player.name} \u7B2C${currentCount}\u6B21\u8D85\u65F660\u79D2(\u8FDE\u7EED2\u6B21\u624D\u63A5\u7BA1)`);
        }
      } catch (err) {
        console.error("[AutoTakeover] Error:", err);
      }
    }, 6e4));
    this.autoTakeoverTimers.set(key, timer);
  }
  /**
   * 取消超时自动接管(玩家已操作),重置连续超时计数
   */
  clearAutoTakeover(gameId, playerId) {
    const key = `${gameId}-${playerId}`;
    const timer = this.autoTakeoverTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.autoTakeoverTimers.delete(key);
    }
    this.consecutiveTimeouts.delete(key);
  }
  scheduleBotDiscard(gameId, playerId) {
    const existing = this.botTimers.get(gameId);
    if (existing) clearTimeout(existing);
    const timer = this.detachTimer(setTimeout(async () => {
      this.botTimers.delete(gameId);
      try {
        const game = await this.getGame(gameId);
        if (!game || game.phase !== GamePhase.PLAYING) {
          console.log(`[bot-discard] Game not playing, skipping`);
          return;
        }
        const currentP = game.players[game.currentPlayerIndex];
        if (currentP.id !== playerId) {
          if (this.isPlayerBotControlled(currentP) && !this.botTimers.has(gameId)) {
            console.log(`[bot-discard] Current player changed to bot ${currentP.name}, rescheduling`);
            this.scheduleBotDiscard(gameId, currentP.id);
          }
          return;
        }
        if (game.pendingActions.length > 0) {
          const currentPlayerOwnPending = game.pendingActions.every((pa) => pa.playerId === currentP.id);
          if (currentPlayerOwnPending) {
            if (game.drawnThisTurn) {
              this.clearCurrentTurnPendingActions(game, currentP.id);
              await this.persistGame(game);
            }
          } else {
            console.log(`[bot-discard] Pending actions still unresolved for ${currentP.name}, delegating to timeout`);
            this.schedulePendingActionTimeout(gameId);
            return;
          }
        }
        if (!game.drawnThisTurn) {
          console.log(`[bot-discard] ${currentP.name} has not drawn yet, drawing first...`);
          await this.executeAction(gameId, playerId, ActionType.DRAW, void 0);
        }
        const refreshedGame = await this.getGame(gameId);
        if (!refreshedGame || refreshedGame.phase !== GamePhase.PLAYING) return;
        if (refreshedGame.pendingActions.length > 0) {
          console.log(`[bot-discard] Pending actions reappeared for ${playerId}, delegating to timeout`);
          this.schedulePendingActionTimeout(gameId);
          return;
        }
        const refreshedPlayer = refreshedGame.players[refreshedGame.currentPlayerIndex];
        if (!refreshedPlayer || refreshedPlayer.id !== playerId) return;
        const availableActions = await this.getAvailableActions(gameId, playerId);
        if (availableActions.includes(ActionType.HU)) {
          console.log(`[bot-discard] ${refreshedPlayer.name} found self-draw HU before discard`);
          await this.executeAction(gameId, playerId, ActionType.HU);
          return;
        }
        if (!this.isConcealedDiscardState(refreshedPlayer)) {
          console.warn(
            `[bot-discard] ${refreshedPlayer.name} is not in discard state: concealed=${refreshedPlayer.hand.concealedTiles.length}, drawn=${refreshedGame.drawnThisTurn}`
          );
          return;
        }
        const tileId = selectDiscardTile(refreshedPlayer, refreshedGame);
        if (tileId) {
          console.log(`[bot-discard] ${refreshedPlayer.name} discarding tile: ${tileId}`);
          await this.executeAction(gameId, playerId, ActionType.DISCARD, tileId);
        } else {
          console.warn(`[bot-discard] ${refreshedPlayer.name} has no tile to discard! hand: ${refreshedPlayer.hand.concealedTiles.length}`);
        }
      } catch (err) {
        console.error("[bot-discard] Error:", err);
      }
    }, (() => {
      const g = this.games.get(gameId);
      if (!g) return 500;
      return this.getBotDiscardDelayMs(g);
    })()));
    this.botTimers.set(gameId, timer);
  }
  /**
   * 补花:门口有花牌时,从牌墙补牌到手牌
   */
  replaceFlowers(game, player) {
    const flowerMelds = player.hand.exposedMelds.filter(
      (m) => m.tiles.length === 1 && isFlower(m.tiles[0]) && !this.isWildTile(game, m.tiles[0]) && !m.replacementDone
    );
    if (flowerMelds.length === 0) return;
    for (const meld of flowerMelds) {
      if (game.wall.length === 0) break;
      meld.replacementDone = true;
      meld.tiles[0];
      let replacement = game.wall.pop();
      while (isFlower(replacement) && !this.isWildTile(game, replacement)) {
        player.hand.exposedMelds.push({
          type: MeldType.TRIPLET,
          tiles: [replacement],
          isConcealed: false,
          replacementDone: true
        });
        this.broadcastFlowerReplacement(game, player);
        if (game.wall.length === 0) {
          replacement = null;
          break;
        }
        replacement = game.wall.pop();
      }
      if (replacement) {
        player.hand.concealedTiles.push(replacement);
        player.lastDrawnTile = replacement;
        this.broadcastFlowerReplacement(game, player);
      }
    }
    player.hand.concealedTiles = this.sortHandWithWildFront(player.hand.concealedTiles, game);
    if (game.wall.length === 0 && game.phase === GamePhase.PLAYING) {
      console.log(`[replaceFlowers] Wall exhausted after flower replacement`);
      this.endRound(game, GameEndReason.WALL_EXHAUSTED);
    }
  }
  updateRoundNumber(game) {
    const playerCount = game.players.length || 1;
    const discardCount = game.discardPile.length;
    const calculatedRound = Math.max(1, Math.ceil(discardCount / playerCount));
    game.roundNumber = calculatedRound;
  }
  endRound(game, reason) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    this.clearPendingActionTimer(game.gameId);
    game.phase = GamePhase.CHA_JIAO;
    const winners = game.players.filter((p) => p.status === PlayerStatus.WON);
    const winnerIds = new Set(winners.map((w) => w.id));
    for (const player of game.players) {
      if (!winnerIds.has(player.id)) {
        player.status = PlayerStatus.LOST;
      }
    }
    let finalScores;
    const roundTransfers = [];
    const specialEvents = [];
    if (game.customScoringMode === "cheat") {
      finalScores = {};
      for (const player of game.players) {
        const isWinner = winners.some((w) => w.id === player.id);
        finalScores[player.id] = isWinner ? 1 : -1;
      }
    } else {
      finalScores = {};
      for (const p of game.players) {
        finalScores[p.id] = 0;
      }
      const mutualBailoutRelations = this.getMutualBailoutRelations(game.gameId);
      const mutualBailout = /* @__PURE__ */ new Map();
      for (const rel of mutualBailoutRelations) {
        const p1Idx = game.players.findIndex((p) => p.id === rel.player1);
        const p2Idx = game.players.findIndex((p) => p.id === rel.player2);
        if (p1Idx >= 0 && p2Idx >= 0) {
          mutualBailout.set(p1Idx, { partnerIndex: p2Idx, type: rel.type });
          mutualBailout.set(p2Idx, { partnerIndex: p1Idx, type: rel.type });
        }
      }
      for (const winner of winners) {
        const winnerIdx = game.players.findIndex((p) => p.id === winner.id);
        if (winnerIdx < 0) continue;
        const currentWinOrder = (_a = winner.winOrder) != null ? _a : Number.MAX_SAFE_INTEGER;
        const eligiblePlayerIndices = game.players.map((player, index) => ({ player, index })).filter(({ player, index }) => {
          if (index === winnerIdx) return true;
          return player.winOrder == null || player.winOrder > currentWinOrder;
        }).map(({ index }) => index);
        let discarderIdx;
        if (!winner.isSelfDrawn && winner.discarderId) {
          discarderIdx = game.players.findIndex((p) => p.id === winner.discarderId);
        }
        const breakdown = calculateSettlementBreakdownByRules(
          winner.wonFan,
          // 最终点数（已含全局倍数，用于正常结算和互包赔付）
          (_b = winner.isSelfDrawn) != null ? _b : false,
          winnerIdx,
          eligiblePlayerIndices,
          mutualBailout,
          discarderIdx
        );
        for (const transfer of breakdown.transfers) {
          roundTransfers.push({
            fromPlayerId: game.players[transfer.fromIndex].id,
            fromPlayerName: game.players[transfer.fromIndex].name,
            toPlayerId: game.players[transfer.toIndex].id,
            toPlayerName: game.players[transfer.toIndex].name,
            amount: transfer.amount,
            reason: transfer.reason,
            bailoutType: transfer.bailoutType
          });
        }
        for (const [idx, delta] of breakdown.deltas) {
          const pid = game.players[idx].id;
          finalScores[pid] = ((_c = finalScores[pid]) != null ? _c : 0) + delta;
        }
      }
    }
    game.finalScores = finalScores;
    for (const player of game.players) {
      player.score = (_d = finalScores[player.id]) != null ? _d : 0;
    }
    if (game.leadingBrotherEvent) {
      const { firstPlayerId } = game.leadingBrotherEvent;
      const firstPlayer = game.players.find((p) => p.id === firstPlayerId);
      if (firstPlayer) {
        const penalty = 30;
        firstPlayer.score -= penalty;
        finalScores[firstPlayerId] = (finalScores[firstPlayerId] || 0) - penalty;
        specialEvents.push({
          type: "leading_brother",
          fromPlayerId: firstPlayer.id,
          fromPlayerName: firstPlayer.name,
          totalAmount: penalty,
          amountPerPlayer: 10
        });
        for (const p of game.players) {
          if (p.id !== firstPlayerId) {
            p.score += 10;
            finalScores[p.id] = (finalScores[p.id] || 0) + 10;
            roundTransfers.push({
              fromPlayerId: firstPlayer.id,
              fromPlayerName: firstPlayer.name,
              toPlayerId: p.id,
              toPlayerName: p.name,
              amount: 10,
              reason: "\u8C22\u8C22\u5E26\u5934\u5927\u54E5\u8D54\u4ED8"
            });
          }
        }
        game.finalScores = finalScores;
        console.log(`[LeadingBrother] ${firstPlayer.name} \u8D54\u4ED830\u5206(\u6BCF\u5BB610\u5206)`);
      }
      game.leadingBrotherEvent = null;
    }
    const botAffected = game.botTakeoverPlayers || [];
    for (const player of game.players) {
      if (botAffected.includes(player.id)) {
        if (player.score > 0) {
          const half = Math.floor(player.score / 2);
          console.log(`[BotPenalty] ${player.name}(AI\u63A5\u7BA1) \u8D62\u5206\u51CF\u534A: ${player.score} \u2192 ${half}`);
          player.score = half;
        }
      }
    }
    const totalScore = game.players.reduce((s, p) => s + p.score, 0);
    if (totalScore !== 0) {
      const losers = game.players.filter((p) => p.score < 0);
      const totalLoss = losers.reduce((s, p) => s + Math.abs(p.score), 0);
      const deficit = Math.abs(totalScore);
      if (totalLoss > 0) {
        for (const loser of losers) {
          const ratio = Math.abs(loser.score) / totalLoss;
          const reduction = Math.floor(deficit * ratio);
          loser.score += reduction;
        }
      }
      const finalTotal = game.players.reduce((s, p) => s + p.score, 0);
      if (finalTotal !== 0) {
        const minP = game.players.reduce((a, b) => a.score < b.score ? a : b);
        minP.score -= finalTotal;
      }
    }
    for (const player of game.players) {
      finalScores[player.id] = player.score;
    }
    game.finalScores = finalScores;
    game.botTakeoverPlayers = [];
    if (!game.roundStats) game.roundStats = [];
    const roundWinners = game.players.filter((p) => p.status === PlayerStatus.WON);
    this.checkQJThresholdAlerts(game);
    const finalReason = reason === GameEndReason.WALL_EXHAUSTED && roundWinners.length > 0 ? GameEndReason.LAST_PLAYER : reason;
    if (finalReason === GameEndReason.WALL_EXHAUSTED) {
      const currentGlobal = (_e = game.inheritMultiplier) != null ? _e : 1;
      const roundMul = (_f = game.roundMultiplier) != null ? _f : 1;
      const doubled = Math.min(currentGlobal * 2, 8);
      const effective = doubled * roundMul;
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : doubled, 8);
    } else if (game.inheritedGlobalMultiplier === void 0) {
      const currentGlobal = (_g = game.inheritMultiplier) != null ? _g : 1;
      const roundMul = (_h = game.roundMultiplier) != null ? _h : 1;
      const effective = currentGlobal * roundMul;
      game.inheritedGlobalMultiplier = Math.min(effective > 8 ? Math.floor(effective / 8) : 1, 8);
    }
    game.roundStats.push({
      roundNumber: game.roundNumber,
      scores: { ...finalScores },
      winners: roundWinners.map((w) => w.id),
      selfDraws: roundWinners.filter((w) => w.isSelfDrawn).map((w) => w.id),
      diceMultiplier: (_i = game.roundMultiplier) != null ? _i : 1,
      inheritMultiplier: (_j = game.inheritMultiplier) != null ? _j : 1,
      effectiveMultiplier: Math.min(((_k = game.inheritMultiplier) != null ? _k : 1) * ((_l = game.roundMultiplier) != null ? _l : 1), 8),
      settlementMultiplier: (_m = game.settlementMultiplier) != null ? _m : 1,
      overflowCarryMultiplierNextRound: (_n = game.inheritedGlobalMultiplier) != null ? _n : 1,
      bailoutRelations: this.getMutualBailoutRelations(game.gameId).map((rel) => {
        var _a2, _b2;
        return {
          ...rel,
          player1Name: (_a2 = game.players.find((player) => player.id === rel.player1)) == null ? void 0 : _a2.name,
          player2Name: (_b2 = game.players.find((player) => player.id === rel.player2)) == null ? void 0 : _b2.name
        };
      }),
      winnerDetails: roundWinners.map((winner) => {
        var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2, _l2, _m2, _n2, _o, _p, _q, _r, _s, _t, _u, _v;
        const discarder = winner.discarderId ? game.players.find((player) => player.id === winner.discarderId) : void 0;
        const concealedTiles = winner.hand.concealedTiles.map((tile) => ({ ...tile }));
        const exposedTiles = winner.hand.exposedMelds.flatMap((meld) => meld.tiles).map((tile) => ({ ...tile }));
        const allWinnerTiles = [...concealedTiles, ...exposedTiles];
        const isWildTile = buildWildTileChecker(game.customScoringMode || null, game.wildTileGroup);
        return {
          playerId: winner.id,
          playerName: winner.name,
          handTypeName: winner.winHandType,
          isSelfDrawn: (_a2 = winner.isSelfDrawn) != null ? _a2 : false,
          discarderId: winner.discarderId,
          discarderName: discarder == null ? void 0 : discarder.name,
          baseFan: (_c2 = (_b2 = winner.winningScoreBreakdown) == null ? void 0 : _b2.baseFan) != null ? _c2 : 0,
          extraMultipliers: (_e2 = (_d2 = winner.winningScoreBreakdown) == null ? void 0 : _d2.extraMultipliers) != null ? _e2 : 1,
          diceMultiplier: (_h2 = (_f2 = winner.winningScoreBreakdown) == null ? void 0 : _f2.diceMultiplier) != null ? _h2 : (_g2 = game.roundMultiplier) != null ? _g2 : 1,
          inheritMultiplier: (_k2 = (_i2 = winner.winningScoreBreakdown) == null ? void 0 : _i2.inheritMultiplier) != null ? _k2 : (_j2 = game.inheritMultiplier) != null ? _j2 : 1,
          effectiveMultiplier: (_o = (_l2 = winner.winningScoreBreakdown) == null ? void 0 : _l2.effectiveMultiplier) != null ? _o : Math.min(((_m2 = game.inheritMultiplier) != null ? _m2 : 1) * ((_n2 = game.roundMultiplier) != null ? _n2 : 1), 8),
          settlementMultiplier: (_r = (_p = winner.winningScoreBreakdown) == null ? void 0 : _p.settlementMultiplier) != null ? _r : (_q = game.settlementMultiplier) != null ? _q : 1,
          finalPoints: (_t = (_s = winner.winningScoreBreakdown) == null ? void 0 : _s.finalPoints) != null ? _t : winner.wonFan,
          details: (_v = (_u = winner.winningScoreBreakdown) == null ? void 0 : _u.details) != null ? _v : [],
          flowerCount: this.getPlayerFlowerTiles(winner).length,
          handTiles: concealedTiles,
          exposedTiles,
          exposedMeldGroups: winner.hand.exposedMelds.map((meld) => meld.tiles.map((tile) => ({ ...tile }))),
          tileFaces: allWinnerTiles.map((tile) => this.tileLabel(tile)),
          isMenQing: this.isPlayerMenQing(winner),
          hasWild: allWinnerTiles.some((tile) => isWildTile(tile))
        };
      }),
      transfers: roundTransfers,
      specialEvents: specialEvents.length ? specialEvents : void 0
    });
    const latestRoundStat = game.roundStats[game.roundStats.length - 1];
    const endedAt = Date.now();
    game.phase = GamePhase.ENDED;
    game.endReason = finalReason;
    game.pendingActions = [];
    game.endedAt = endedAt;
    game.lastActionTime = endedAt;
    MatchHistoryService.recordMatch(game, finalScores, finalReason).catch((error) => {
      console.error("Failed to persist match history:", error);
    });
    TrainingRecordService.recordRound(game, finalReason, finalScores, latestRoundStat).catch((error) => {
      console.error("Failed to persist training round record:", error);
    });
    game.customScoringMode = null;
    this.applyPendingChanges(game);
    if (finalReason === GameEndReason.LAST_PLAYER) {
      this.autoStartNextRound(game.gameId, 2e3);
    }
  }
  /**
   * 自动进入下一局（延时后设置STARTING阶段）
   */
  autoStartNextRound(gameId, delayMs = 2e3) {
    this.detachTimer(setTimeout(async () => {
      try {
        await this.setStartingPhase(gameId);
      } catch (err) {
        console.error("[autoStartNextRound] Error:", err);
      }
    }, delayMs));
  }
  /**
   * 应用出局/替换请求(在每局结束后调用)
   */
  applyPendingChanges(game) {
    var _a, _b;
    if ((_a = game.pendingReplacements) == null ? void 0 : _a.length) {
      for (const req of game.pendingReplacements) {
        const aiIdx = game.players.findIndex((p) => p.id === req.aiPlayerId);
        if (aiIdx === -1) continue;
        const aiName = game.players[aiIdx].name;
        game.players[aiIdx].id = req.spectatorId;
        game.players[aiIdx].name = req.spectatorName || "\u66FF\u8865\u73A9\u5BB6";
        console.log(`[ApplyChanges] ${aiName} \u2192 ${req.spectatorName || "\u66FF\u8865\u73A9\u5BB6"} \u63A5\u66FF`);
      }
      game.pendingReplacements = [];
    }
    if ((_b = game.pendingRemovals) == null ? void 0 : _b.length) {
      for (const removeId of game.pendingRemovals) {
        const idx = game.players.findIndex((p) => p.id === removeId);
        if (idx === -1) continue;
        const name = game.players[idx].name;
        game.players.splice(idx, 1);
        game.players.forEach((p, i) => {
          p.position = i;
        });
        console.log(`[ApplyChanges] ${name} \u5DF2\u79FB\u9664`);
      }
      game.pendingRemovals = [];
      if (game.players.length < 4) {
        game.phase = GamePhase.WAITING;
        game.currentPlayerIndex = 0;
        game.dealerIndex = 0;
        game.pendingActions = [];
        game.actionHistory = [];
        game.discardPile = [];
        game.winnersCount = 0;
        game.roundNumber = 1;
        for (const p of game.players) {
          p.status = PlayerStatus.WAITING;
          p.hand = { concealedTiles: [], exposedMelds: [], discardedTiles: [] };
          p.isTing = false;
          p.missingSuit = null;
          p.windScore = 0;
          p.rainScore = 0;
          p.wonFan = 0;
          p.winHandType = void 0;
          p.winOrder = null;
          p.winRound = null;
          p.winTimestamp = null;
          p.isSelfDrawn = void 0;
          p.discarderId = void 0;
          p.winningScoreBreakdown = void 0;
          p.score = 0;
        }
        console.log(`[ApplyChanges] \u73A9\u5BB6\u4E0D\u8DB34\u4EBA(${game.players.length}),\u56DE\u5230\u7B49\u5F85\u72B6\u6001`);
      }
    }
  }
  async endGameForEmptyRoom(gameId, reason = GameEndReason.EMPTY_ROOM) {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (!game) return;
    if (game.phase === GamePhase.ENDED) {
      game.endReason = reason;
      await this.persistGame(game);
      return;
    }
    for (const player of game.players) {
      if (player.status !== PlayerStatus.WON) {
        player.status = PlayerStatus.LOST;
      }
      player.isTing = false;
    }
    game.pendingActions = [];
    this.endRound(game, reason);
    await this.persistGame(game);
    this.broadcastGameState(gameId);
  }
  /**
   * List all active games
   */
  async listGames() {
    const allGames = await loadActiveGameStates();
    return Array.from(allGames);
  }
  /**
   * Delete a game
   */
  async deleteGame(gameId) {
    await this.hydrateFromDatabase();
    const game = await this.ensureGameLoaded(gameId);
    if (game) {
      for (const player of game.players) {
        this.playerToGame.delete(player.id);
      }
      this.games.delete(gameId);
    }
    await deleteGameState(gameId);
  }
}
const globalGameManager = globalThis;
if (!globalGameManager.gameManager) {
  globalGameManager.gameManager = new GameManager();
}
const gameManager = globalGameManager.gameManager;

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, key + "" , value);
class UserService {
  /**
   * Simple password hash (SHA-256, for demo - use bcrypt in production)
   */
  static hashPassword(password) {
    return createHash$1("sha256").update(password).digest("hex");
  }
  /**
   * Validate Chinese phone number (11 digits, starts with 1)
   */
  static isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }
  /**
   * Register user with phone + password
   */
  static async registerByPhone(data) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    if (!this.isValidPhone(data.phone)) {
      throw new Error("\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E\uFF08\u970011\u4F4D\u56FD\u5185\u624B\u673A\u53F7\uFF09");
    }
    const existing = await collection.findOne({ phone: data.phone });
    if (existing) {
      throw new Error("\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C");
    }
    if (!data.password || data.password.length < 4) {
      throw new Error("\u5BC6\u7801\u81F3\u5C114\u4F4D");
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("\u73A9\u5BB6\u540D\u4E0D\u80FD\u4E3A\u7A7A");
    }
    const user = {
      userId: randomUUID$1(),
      email: "",
      // 本地注册不需要email
      name: data.name.trim(),
      phone: data.phone,
      passwordHash: this.hashPassword(data.password),
      oauthProvider: "local",
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
    await collection.insertOne(user);
    return user;
  }
  /**
   * Login with phone + password
   */
  static async loginByPhone(phone, password) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    if (!this.isValidPhone(phone)) {
      throw new Error("\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E");
    }
    const user = await collection.findOne({ phone });
    if (!user) {
      throw new Error("\u8BE5\u624B\u673A\u53F7\u672A\u6CE8\u518C");
    }
    const hash = this.hashPassword(password);
    if (user.passwordHash !== hash) {
      throw new Error("\u5BC6\u7801\u9519\u8BEF");
    }
    await collection.updateOne(
      { userId: user.userId },
      { $set: { lastLoginAt: /* @__PURE__ */ new Date() } }
    );
    return { ...user, lastLoginAt: /* @__PURE__ */ new Date() };
  }
  /**
   * Check if phone is registered
   */
  static async isPhoneRegistered(phone) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const user = await collection.findOne({ phone });
    return !!user;
  }
  /**
   * Create a new user (for local registration)
   */
  static async createUser(data) {
    var _a;
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const user = {
      userId: randomUUID$1(),
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      oauthProvider: "local",
      isAdmin: (_a = data.isAdmin) != null ? _a : false,
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
    await collection.insertOne(user);
    return user;
  }
  /**
   * List all users (debug/admin tooling)
   */
  static async getAllUsers() {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    return await collection.find({}).sort({ createdAt: 1 }).toArray();
  }
  static async getUsersByProvider(provider) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    return await collection.find({ oauthProvider: provider }).sort({ createdAt: 1 }).toArray();
  }
  /**
   * Create or update user from Google OAuth
   */
  static async upsertGoogleUser(profile) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const existingUser = await collection.findOne({
      oauthProvider: "google",
      oauthId: profile.googleId
    });
    if (existingUser) {
      await collection.updateOne(
        { userId: existingUser.userId },
        {
          $set: {
            lastLoginAt: /* @__PURE__ */ new Date(),
            name: profile.name,
            avatar: profile.avatar,
            email: profile.email
          }
        }
      );
      return { ...existingUser, lastLoginAt: /* @__PURE__ */ new Date() };
    }
    const newUser = {
      userId: randomUUID$1(),
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      oauthProvider: "google",
      oauthId: profile.googleId,
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
    await collection.insertOne(newUser);
    return newUser;
  }
  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    return await collection.findOne({ userId });
  }
  /**
   * Get user by email
   */
  static async getUserByEmail(email) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    return await collection.findOne({ email });
  }
  /**
   * Update user stats after game
   */
  static async updateStats(userId, updates) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const user = await this.getUserById(userId);
    if (!user) return;
    const newStats = { ...user.stats };
    if (updates.gamesPlayed) newStats.gamesPlayed += updates.gamesPlayed;
    if (updates.gamesWon) newStats.gamesWon += updates.gamesWon;
    if (updates.scoreChange) newStats.totalScore += updates.scoreChange;
    if (updates.highestFan && updates.highestFan > newStats.highestFan) {
      newStats.highestFan = updates.highestFan;
    }
    newStats.winRate = newStats.gamesPlayed > 0 ? newStats.gamesWon / newStats.gamesPlayed : 0;
    await collection.updateOne(
      { userId },
      { $set: { stats: newStats } }
    );
  }
  /**
   * Update basic profile fields for a user
   */
  static async updateProfile(userId, profile) {
    var _a;
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const name = (_a = profile.name) == null ? void 0 : _a.trim();
    if (!name) {
      throw new Error("Name is required");
    }
    const setDoc = {
      name,
      profileUpdatedAt: /* @__PURE__ */ new Date()
    };
    const unsetDoc = {};
    const handleOptionalField = (field, value) => {
      if (value && value.toString().trim()) {
        setDoc[field] = value.toString().trim();
      } else {
        unsetDoc[field] = "";
      }
    };
    handleOptionalField("address", profile.address);
    handleOptionalField("dateOfBirth", profile.dateOfBirth);
    handleOptionalField("gender", profile.gender);
    const updateQuery = {
      $set: setDoc
    };
    if (Object.keys(unsetDoc).length > 0) {
      updateQuery.$unset = unsetDoc;
    }
    await collection.updateOne({ userId }, updateQuery);
    return await this.getUserById(userId);
  }
  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit = 10) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    return await collection.find({}).sort({ "stats.totalScore": -1 }).limit(limit).toArray();
  }
}
__publicField$1(UserService, "COLLECTION_NAME", "users");

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
class AuthService {
  /**
   * Create session for user
   */
  static async createSession(userId) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const sessionId = randomUUID$1();
    const token = randomUUID$1();
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const session = {
      sessionId,
      userId,
      token,
      expiresAt,
      createdAt: /* @__PURE__ */ new Date()
    };
    await collection.insertOne(session);
    return { sessionId, token };
  }
  /**
   * Validate session token
   */
  static async validateSession(token) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const session = await collection.findOne({
      token,
      expiresAt: { $gt: /* @__PURE__ */ new Date() }
    });
    return (session == null ? void 0 : session.userId) || null;
  }
  /**
   * Delete session (logout)
   */
  static async deleteSession(token) {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    await collection.deleteOne({ token });
  }
  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    const collection = await getCollection$1(this.COLLECTION_NAME);
    const result = await collection.deleteMany({
      expiresAt: { $lt: /* @__PURE__ */ new Date() }
    });
    return result.deletedCount;
  }
  /**
   * Handle Google OAuth callback
   */
  static async handleGoogleAuth(googleProfile) {
    const user = await UserService.upsertGoogleUser({
      googleId: googleProfile.id,
      email: googleProfile.email,
      name: googleProfile.name,
      avatar: googleProfile.picture
    });
    const session = await this.createSession(user.userId);
    return { user, session };
  }
}
__publicField(AuthService, "COLLECTION_NAME", "sessions");

let io = null;
const pendingOwnerDismissals = /* @__PURE__ */ new Map();
const OWNER_RECONNECT_GRACE_MS = 15e3;
function parseCookies(header) {
  const result = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rest.join("=") || "");
    result[key] = value;
  }
  return result;
}
async function socketIsAdmin(socket) {
  const user = await resolveSocketUser(socket);
  return !!(user == null ? void 0 : user.isAdmin);
}
async function resolveSocketUser(socket) {
  const handshakeAuth = socket.handshake.auth;
  const debugAccessToken = typeof (handshakeAuth == null ? void 0 : handshakeAuth.debugAccessToken) === "string" ? handshakeAuth.debugAccessToken : "";
  const debugRoomId = typeof (handshakeAuth == null ? void 0 : handshakeAuth.roomId) === "string" ? handshakeAuth.roomId : "";
  const debugPlayerId = typeof (handshakeAuth == null ? void 0 : handshakeAuth.playerId) === "string" ? handshakeAuth.playerId : "";
  if (process.env.ENABLE_DEBUG_ROUTES === "true" && debugAccessToken && debugRoomId && debugPlayerId) {
    const game = await gameManager.getGame(debugRoomId);
    const debugPlayer = game == null ? void 0 : game.players.find((player) => player.id === debugPlayerId);
    if ((game == null ? void 0 : game.debugAccessToken) === debugAccessToken && debugPlayer) {
      return {
        userId: debugPlayer.id,
        userName: debugPlayer.name,
        isAdmin: true
      };
    }
  }
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token = cookies.mahjong_session || cookies.auth_token;
  if (!token) return null;
  const userId = await AuthService.validateSession(token);
  if (!userId) return null;
  const user = await UserService.getUserById(userId);
  if (!user) return null;
  return {
    userId: user.userId,
    userName: user.name,
    isAdmin: !!user.isAdmin
  };
}
async function getSocketConnectionsCollection() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "changqingge");
  return db.collection("socketConnections");
}
async function getRoomStatesCollection() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "changqingge");
  return db.collection("roomStates");
}
async function initializeSocketIO(server) {
  if (io) return io;
  const transports = ["websocket", "polling"];
  io = new Server(server, {
    path: "/mahjong/socket.io",
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports
  });
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("\u2705 Socket.IO Redis adapter connected");
  } catch (error) {
    console.warn("\u26A0\uFE0F  Redis not available, running in single-server mode");
    console.warn("   Set REDIS_URL environment variable to enable scaling");
  }
  io.on("connection", (socket) => {
    console.log(`[socket] transport=${socket.conn.transport.name} id=${socket.id}`);
    socket.conn.on("upgrade", () => {
      console.log(`[socket] upgraded transport=${socket.conn.transport.name} id=${socket.id}`);
    });
    console.log(`\u{1F50C} Client connected: ${socket.id}`);
    gameManager.setWebSocketManager({
      broadcast: (gameId, event, data) => {
        emitToRoom(gameId, event, data);
      }
    });
    socket.on("auth:login", async (data) => {
      try {
        const authUser = await resolveSocketUser(socket);
        if (!authUser) {
          socket.emit("auth:error", { message: "Authentication required" });
          return;
        }
        const collection = await getSocketConnectionsCollection();
        await collection.insertOne({
          socketId: socket.id,
          userId: authUser.userId,
          userName: authUser.userName,
          connectedAt: /* @__PURE__ */ new Date(),
          lastSeenAt: /* @__PURE__ */ new Date()
        });
        socket.emit("auth:success", { socketId: socket.id });
        console.log(`\u2705 User authenticated: ${data.userName} (${data.userId})`);
      } catch (error) {
        console.error("Error in auth:login:", error);
        socket.emit("auth:error", { message: "Authentication failed" });
      }
    });
    socket.on("room:join", async (data) => {
      const { roomId } = data;
      console.log(
        "[room:join]",
        "PID:",
        process.pid,
        "roomId:",
        roomId,
        "user:",
        data.userName,
        "socket:",
        socket.id
      );
      try {
        const authUser = await resolveSocketUser(socket);
        if (!authUser) {
          socket.emit("room:error", { message: "Authentication required" });
          return;
        }
        const userId = authUser.userId;
        const userName = authUser.userName;
        const roomStates = await getRoomStatesCollection();
        const connections = await getSocketConnectionsCollection();
        let roomState = await roomStates.findOne({ roomId });
        if (!roomState) {
          await roomStates.insertOne({
            roomId,
            playerIds: [],
            socketIds: [],
            ownerId: userId,
            maxPlayers: 4,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
          roomState = await roomStates.findOne({ roomId });
        } else if (!roomState.ownerId) {
          await roomStates.updateOne(
            { roomId },
            { $set: { ownerId: userId } }
          );
          roomState = await roomStates.findOne({ roomId });
        }
        if (roomState.socketIds.length >= 4) {
          socket.emit("room:error", { message: "Room is full (max 4 players)" });
          return;
        }
        await socket.join(roomId);
        await roomStates.updateOne(
          { roomId },
          {
            $addToSet: {
              socketIds: socket.id,
              playerIds: userId
            },
            $set: { updatedAt: /* @__PURE__ */ new Date() }
          }
        );
        await connections.updateOne(
          { socketId: socket.id },
          {
            $set: {
              roomId,
              lastSeenAt: /* @__PURE__ */ new Date()
            }
          }
        );
        const updatedRoom = await roomStates.findOne({ roomId });
        const roomUsers = await connections.find({
          socketId: { $in: updatedRoom.socketIds }
        }).toArray();
        const roomUsersList = roomUsers.map((u) => ({
          userId: u.userId,
          userName: u.userName,
          socketId: u.socketId
        }));
        const pending = pendingOwnerDismissals.get(roomId);
        if (pending && pending.userId === userId) {
          clearTimeout(pending.timer);
          pendingOwnerDismissals.delete(roomId);
          console.log(`\u2705 Owner ${userName} reconnected to room ${roomId}, grace period cancelled`);
          io.to(roomId).emit("room:owner-reconnected", { userId, userName });
        }
        io.to(roomId).emit("room:user-joined", {
          userId,
          userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom.socketIds.length
        });
        io.to(roomId).emit("broadcastMessage", {
          id: Date.now(),
          text: `\u{1F464} ${userName}\u8FDB\u5165\u5230\u4E86\u623F\u95F4`,
          type: "info",
          actionKind: "roomJoin",
          timestamp: Date.now(),
          timeLabel: formatBeijingTime()
        });
        console.log(`\u{1F465} ${userName} joined room ${roomId} (${updatedRoom.socketIds.length}/4 players)`);
      } catch (error) {
        console.error("Error in room:join:", error);
        socket.emit("room:error", { message: "Failed to join room" });
      }
    });
    socket.on("room:leave", async (data) => {
      const pending = pendingOwnerDismissals.get(data.roomId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingOwnerDismissals.delete(data.roomId);
      }
      await handleLeaveRoom(socket, data.roomId);
    });
    socket.on("game:action", async (data) => {
      try {
        const { gameId, playerId, type, tileId, tileIds } = data;
        console.log(`\u{1F3AE} Action received: ${type} from ${playerId} in game ${gameId}`);
        if (type === ActionType.CHEAT_HU) {
          const isAdmin = await socketIsAdmin(socket);
          if (!isAdmin) {
            socket.emit("game:error", { message: "Admin privileges required" });
            return;
          }
        }
        await gameManager.executeAction(gameId, playerId, type, tileId, tileIds);
      } catch (error) {
        console.error("Error in game:action:", error.message);
        socket.emit("game:error", { message: error.message });
      }
    });
    socket.on("game:state-update", async (data) => {
      try {
        const connections = await getSocketConnectionsCollection();
        const user = await connections.findOne({ socketId: socket.id });
        if (!user || !user.roomId) return;
        io.to(user.roomId).emit("game:state-changed", data);
      } catch (error) {
        console.error("Error in game:state-update:", error);
      }
    });
    socket.on("chat:message", async (data) => {
      try {
        const connections = await getSocketConnectionsCollection();
        const user = await connections.findOne({ socketId: socket.id });
        if (!user || !user.roomId) return;
        io.to(user.roomId).emit("chat:message-received", {
          userId: user.userId,
          userName: user.userName,
          message: data.message,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error in chat:message:", error);
      }
    });
    socket.on("player:ready", async (data) => {
      try {
        const connections = await getSocketConnectionsCollection();
        const user = await connections.findOne({ socketId: socket.id });
        if (!user || !user.roomId) return;
        io.to(user.roomId).emit("player:ready-changed", {
          userId: user.userId,
          userName: user.userName,
          isReady: data.isReady
        });
      } catch (error) {
        console.error("Error in player:ready:", error);
      }
    });
    socket.on("disconnect", async () => {
      try {
        const connections = await getSocketConnectionsCollection();
        const roomStates = await getRoomStatesCollection();
        const user = await connections.findOne({ socketId: socket.id });
        if (user && user.roomId) {
          const room = await roomStates.findOne({ roomId: user.roomId });
          const isOwner = room && room.ownerId === user.userId;
          if (isOwner) {
            console.log(`\u23F3 Owner ${user.userName} disconnected from room ${user.roomId}, grace period started (${OWNER_RECONNECT_GRACE_MS / 1e3}s)`);
            io.to(user.roomId).emit("room:owner-disconnected", {
              graceSeconds: OWNER_RECONNECT_GRACE_MS / 1e3
            });
            await roomStates.updateOne(
              { roomId: user.roomId },
              {
                $pull: { socketIds: socket.id },
                $set: { updatedAt: /* @__PURE__ */ new Date() }
              }
            );
            await connections.updateOne(
              { socketId: socket.id },
              { $unset: { roomId: "" }, $set: { lastSeenAt: /* @__PURE__ */ new Date() } }
            );
            const existing = pendingOwnerDismissals.get(user.roomId);
            if (existing) clearTimeout(existing.timer);
            const timer = setTimeout(async () => {
              pendingOwnerDismissals.delete(user.roomId);
              console.log(`\u23F0 Owner grace period expired for room ${user.roomId}, dismissing`);
              const freshRoom = await roomStates.findOne({ roomId: user.roomId });
              if (freshRoom) {
                io.to(user.roomId).emit("room:dismissed", {
                  reason: GameEndReason.OWNER_LEFT,
                  message: "Room closed by host"
                });
                const remainingSocketIds = freshRoom.socketIds;
                if (remainingSocketIds.length > 0) {
                  await connections.updateMany(
                    { socketId: { $in: remainingSocketIds } },
                    { $unset: { roomId: "" }, $set: { lastSeenAt: /* @__PURE__ */ new Date() } }
                  );
                  for (const sid of remainingSocketIds) {
                    const peer = io.sockets.sockets.get(sid);
                    peer == null ? void 0 : peer.leave(user.roomId);
                  }
                }
                try {
                  await gameManager.endGameForEmptyRoom(user.roomId, GameEndReason.OWNER_LEFT);
                } catch (err) {
                  console.error("Failed to end game after owner grace period:", err);
                }
                await roomStates.deleteOne({ roomId: user.roomId });
              }
            }, OWNER_RECONNECT_GRACE_MS);
            pendingOwnerDismissals.set(user.roomId, { timer, userId: user.userId, userName: user.userName });
          } else {
            await handleLeaveRoom(socket, user.roomId);
          }
        }
        await connections.deleteOne({ socketId: socket.id });
        console.log(`\u274C Client disconnected: ${socket.id}`);
      } catch (error) {
        console.error("Error in disconnect:", error);
      }
    });
  });
  console.log("\u{1F680} Socket.IO initialized with MongoDB state storage");
  return io;
}
async function handleLeaveRoom(socket, roomId) {
  try {
    const connections = await getSocketConnectionsCollection();
    const roomStates = await getRoomStatesCollection();
    const user = await connections.findOne({ socketId: socket.id });
    socket.leave(roomId);
    await roomStates.updateOne(
      { roomId },
      {
        $pull: {
          socketIds: socket.id,
          playerIds: user == null ? void 0 : user.userId
        },
        $set: { updatedAt: /* @__PURE__ */ new Date() }
      }
    );
    await connections.updateOne(
      { socketId: socket.id },
      {
        $unset: { roomId: "" },
        $set: { lastSeenAt: /* @__PURE__ */ new Date() }
      }
    );
    const updatedRoom = await roomStates.findOne({ roomId });
    if (updatedRoom) {
      const ownerLeft = updatedRoom.ownerId && (user == null ? void 0 : user.userId) === updatedRoom.ownerId;
      if (ownerLeft) {
        const remainingSocketIds = updatedRoom.socketIds.filter((id) => id !== socket.id);
        io.to(roomId).emit("room:dismissed", {
          reason: GameEndReason.OWNER_LEFT,
          message: "Room closed by host"
        });
        if (remainingSocketIds.length > 0) {
          await connections.updateMany(
            { socketId: { $in: remainingSocketIds } },
            { $unset: { roomId: "" }, $set: { lastSeenAt: /* @__PURE__ */ new Date() } }
          );
          for (const sid of remainingSocketIds) {
            const peer = io.sockets.sockets.get(sid);
            peer == null ? void 0 : peer.leave(roomId);
          }
        }
        try {
          await gameManager.endGameForEmptyRoom(roomId, GameEndReason.OWNER_LEFT);
        } catch (error) {
          console.error("Failed to end game after owner left:", error);
        }
        await roomStates.deleteOne({ roomId });
        return;
      }
      const roomUsers = await connections.find({
        socketId: { $in: updatedRoom.socketIds }
      }).toArray();
      const roomUsersList = roomUsers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        socketId: u.socketId
      }));
      if (user) {
        io.to(roomId).emit("room:user-left", {
          userId: user.userId,
          userName: user.userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom.socketIds.length
        });
        console.log(`\u{1F44B} ${user.userName} left room ${roomId} (${updatedRoom.socketIds.length}/4 players)`);
      }
      if (updatedRoom.socketIds.length === 0) {
        try {
          await gameManager.endGameForEmptyRoom(roomId);
        } catch (error) {
          console.error("Failed to mark game ended for empty room:", error);
        }
        console.log(`[room:cleanup] Room ${roomId} empty; deleting state document`);
        await roomStates.deleteOne({ roomId });
      }
    }
  } catch (error) {
    console.error("Error in handleLeaveRoom:", error);
  }
}
function emitToRoom(roomId, event, data) {
  if (io) {
    io.to(roomId).emit(event, data);
  }
}
async function forceDisconnectUser(userId) {
  try {
    const connections = await getSocketConnectionsCollection();
    const roomStates = await getRoomStatesCollection();
    const userConnections = await connections.find({ userId }).toArray();
    if (userConnections.length === 0) {
      console.log(`[forceDisconnect] No connections found for user ${userId}`);
      return;
    }
    for (const conn of userConnections) {
      const socketId = conn.socketId;
      const roomId = conn.roomId;
      if (roomId && io) {
        const room = await roomStates.findOne({ roomId });
        if (room) {
          const isOwner = room.ownerId === userId;
          if (isOwner) {
            io.to(roomId).emit("room:dismissed", {
              reason: GameEndReason.OWNER_LEFT,
              message: "\u623F\u4E3B\u5DF2\u9000\u51FA\u6E38\u620F"
            });
            const remainingSocketIds = room.socketIds || [];
            if (remainingSocketIds.length > 0) {
              await connections.updateMany(
                { socketId: { $in: remainingSocketIds } },
                { $unset: { roomId: "" }, $set: { lastSeenAt: /* @__PURE__ */ new Date() } }
              );
              for (const sid of remainingSocketIds) {
                const peer = io.sockets.sockets.get(sid);
                peer == null ? void 0 : peer.leave(roomId);
              }
            }
            try {
              await gameManager.endGameForEmptyRoom(roomId, GameEndReason.OWNER_LEFT);
            } catch (err) {
              console.error("[forceDisconnect] Failed to end game:", err);
            }
            await roomStates.deleteOne({ roomId });
          } else {
            io.to(roomId).emit("room:player-left", {
              userId,
              userName: conn.userName || "\u672A\u77E5\u73A9\u5BB6",
              isOwner: false
            });
            await roomStates.updateOne(
              { roomId },
              {
                $pull: { socketIds: socketId, playerIds: userId },
                $set: { updatedAt: /* @__PURE__ */ new Date() }
              }
            );
            const sock = io.sockets.sockets.get(socketId);
            sock == null ? void 0 : sock.leave(roomId);
            try {
              await gameManager.handlePlayerLeave(roomId, userId);
            } catch (err) {
              console.error("[forceDisconnect] Failed to handle player leave:", err);
            }
          }
        }
      }
      if (io) {
        const sock = io.sockets.sockets.get(socketId);
        sock == null ? void 0 : sock.disconnect(true);
      }
    }
    await connections.deleteMany({ userId });
    console.log(`[forceDisconnect] User ${userId} fully disconnected (${userConnections.length} connections cleaned)`);
  } catch (error) {
    console.error("[forceDisconnect] Error:", error);
  }
}

let initialized = false;
const _emdUBknskVjvBfumZQqbSRJzv2a19uww6CsKkBB9QSc = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    if (initialized) return;
    try {
      const req = event.node.req;
      const rawSocket = req.socket;
      if (rawSocket && rawSocket.server) {
        initializeSocketIO(rawSocket.server);
        initialized = true;
        console.log("\u2705 Socket.IO initialized from Nitro plugin");
      }
    } catch (err) {
      console.error("\u274C Socket.IO init failed:", err);
    }
  });
});

const plugins = [
  _jQO0PqkFUlYSs2One7S4eWh0meJY0zMfckEqjHoQ1Lc,
_ujpCNWk8GNreIhCLSnb6W0LvCIFz2dasUxef_hN6_Q8,
_emdUBknskVjvBfumZQqbSRJzv2a19uww6CsKkBB9QSc
];

const assets = {
  "/_nuxt/Autumn.-l86GspE.png": {
    "type": "image/png",
    "etag": "\"23c5-IFjwMySDbz+Wu/MXRlIs5wtvbqk\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 9157,
    "path": "../public/_nuxt/Autumn.-l86GspE.png"
  },
  "/_nuxt/A_Man1.CcXupYgd.png": {
    "type": "image/png",
    "etag": "\"1035-yZucfKNNqXlCNZXkeJ+Otc2yDi8\"",
    "mtime": "2026-05-17T00:12:05.787Z",
    "size": 4149,
    "path": "../public/_nuxt/A_Man1.CcXupYgd.png"
  },
  "/_nuxt/B0dCixSo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1dc9-cMN12fdSZfvIMpceghK5B8FHF5A\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 7625,
    "path": "../public/_nuxt/B0dCixSo.js"
  },
  "/_nuxt/BNVlwRnT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e2c-tAYIs3tYwe1uYXM/UqZsKITOAcA\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 7724,
    "path": "../public/_nuxt/BNVlwRnT.js"
  },
  "/_nuxt/B5F7sNJ9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"41d-apB18tugZ9qJBLEmU4PNp9on58c\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 1053,
    "path": "../public/_nuxt/B5F7sNJ9.js"
  },
  "/_nuxt/BQfENd92.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3289-lyGeo5qlSGJT2357MiI4DoAIIgo\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 12937,
    "path": "../public/_nuxt/BQfENd92.js"
  },
  "/_nuxt/B_Man1.Dk02Msys.png": {
    "type": "image/png",
    "etag": "\"1139-lciBUqMmXVUqF00a0sMfMGuH0wg\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 4409,
    "path": "../public/_nuxt/B_Man1.Dk02Msys.png"
  },
  "/_nuxt/BSwPhfDD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3a561-u6u7kGt0htQ2Y0rpBzGg0U0XTCk\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 238945,
    "path": "../public/_nuxt/BSwPhfDD.js"
  },
  "/_nuxt/B_Man2.JrTzUl9M.png": {
    "type": "image/png",
    "etag": "\"1394-aHtShCyXHOHkDV3+88aDFck389k\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 5012,
    "path": "../public/_nuxt/B_Man2.JrTzUl9M.png"
  },
  "/_nuxt/Bamboo.B9tJ7i67.png": {
    "type": "image/png",
    "etag": "\"24e0-EPDP04EelIlqZuIc5mD85ZwrrGs\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 9440,
    "path": "../public/_nuxt/Bamboo.B9tJ7i67.png"
  },
  "/_nuxt/BfrV7zmQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"345e8-O1bH65u5wg712qHUVeBb6H/Xvh8\"",
    "mtime": "2026-05-17T00:12:05.787Z",
    "size": 214504,
    "path": "../public/_nuxt/BfrV7zmQ.js"
  },
  "/_nuxt/BjECSHd5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1433-Y1Gabo2dL3L2ljDNW03YA7AhFJE\"",
    "mtime": "2026-05-17T00:12:05.783Z",
    "size": 5171,
    "path": "../public/_nuxt/BjECSHd5.js"
  },
  "/_nuxt/BvnZ6ERn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1e6c-10DIov4xmxXV18TB5vgCI1uKErU\"",
    "mtime": "2026-05-17T00:12:05.787Z",
    "size": 7788,
    "path": "../public/_nuxt/BvnZ6ERn.js"
  },
  "/_nuxt/CGJWVE-Y.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"167-YstKonmPM+o2pdIr50DmmH6j3WY\"",
    "mtime": "2026-05-17T00:12:05.787Z",
    "size": 359,
    "path": "../public/_nuxt/CGJWVE-Y.js"
  },
  "/_nuxt/CfettmzQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f6-YxCGXyarILV1JTlTodin9kYLdlY\"",
    "mtime": "2026-05-17T00:12:05.815Z",
    "size": 502,
    "path": "../public/_nuxt/CfettmzQ.js"
  },
  "/_nuxt/Chrysanthemum.mO1jml8V.png": {
    "type": "image/png",
    "etag": "\"2297-DJy64BIuRkM5qNGHR8/v2SWO7rE\"",
    "mtime": "2026-05-17T00:12:05.815Z",
    "size": 8855,
    "path": "../public/_nuxt/Chrysanthemum.mO1jml8V.png"
  },
  "/_nuxt/Chun.02YDAlin.png": {
    "type": "image/png",
    "etag": "\"129b-u/x4Tz7pXcScYRb5eFQxtSrNxXY\"",
    "mtime": "2026-05-17T00:12:05.815Z",
    "size": 4763,
    "path": "../public/_nuxt/Chun.02YDAlin.png"
  },
  "/_nuxt/D1IH1cHg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"eec-lN+Y4x/GjuRb5BUEc+e2ZfN5Pj4\"",
    "mtime": "2026-05-17T00:12:05.815Z",
    "size": 3820,
    "path": "../public/_nuxt/D1IH1cHg.js"
  },
  "/_nuxt/D3D9FFyv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a8f-7S3Un1gWBwUiEvbq6c09w/DUBxg\"",
    "mtime": "2026-05-17T00:12:05.815Z",
    "size": 6799,
    "path": "../public/_nuxt/D3D9FFyv.js"
  },
  "/_nuxt/DgfnkcG0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2cdb3-jw24NVJ0vgGImTcoSxyZlh3EpdA\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 183731,
    "path": "../public/_nuxt/DgfnkcG0.js"
  },
  "/_nuxt/CcKcycX-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"136a-yomzBkcS1QQRnRxliU9SH1K1YHc\"",
    "mtime": "2026-05-17T00:12:05.787Z",
    "size": 4970,
    "path": "../public/_nuxt/CcKcycX-.js"
  },
  "/_nuxt/DjiCbidf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14d7-2D8G1HZv0HcEdt+pLz1bL4xkGHo\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 5335,
    "path": "../public/_nuxt/DjiCbidf.js"
  },
  "/_nuxt/DsVOXG6m.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"22cbd-s4ZplOTnTteojHwaXjMT4L7QKKI\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 142525,
    "path": "../public/_nuxt/DsVOXG6m.js"
  },
  "/_nuxt/Hatsu.iPN2TBlv.png": {
    "type": "image/png",
    "etag": "\"1d32-NwCqF/+EVqZ0JmKXd072SpsbTag\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 7474,
    "path": "../public/_nuxt/Hatsu.iPN2TBlv.png"
  },
  "/_nuxt/-MGUDD-H.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b2deb-Ui1EMgG0AZ+ZrgpfWp7eFCmycbQ\"",
    "mtime": "2026-05-17T00:12:11.508Z",
    "size": 732651,
    "path": "../public/_nuxt/-MGUDD-H.js"
  },
  "/_nuxt/Man1.DFmef1um.png": {
    "type": "image/png",
    "etag": "\"1660-Q0SJsxptbG8qqyS3qIKHQU29H0Q\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 5728,
    "path": "../public/_nuxt/Man1.DFmef1um.png"
  },
  "/_nuxt/Man1.rSRy7AH5.png": {
    "type": "image/png",
    "etag": "\"1d4c-aT/E3xxekfKItwexdV8jj+nfMMA\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 7500,
    "path": "../public/_nuxt/Man1.rSRy7AH5.png"
  },
  "/_nuxt/Man2.BMx7hbc-.png": {
    "type": "image/png",
    "etag": "\"1de4-4j7mfhnpsxzZXsqaA1l+qmLYyxo\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 7652,
    "path": "../public/_nuxt/Man2.BMx7hbc-.png"
  },
  "/_nuxt/Man3.DTrCQ-zp.png": {
    "type": "image/png",
    "etag": "\"1376-NcugZosmEiNAPJ6xB5EI8ZH6Jy8\"",
    "mtime": "2026-05-17T00:12:05.823Z",
    "size": 4982,
    "path": "../public/_nuxt/Man3.DTrCQ-zp.png"
  },
  "/_nuxt/Man4.Coih0Axx.png": {
    "type": "image/png",
    "etag": "\"1f17-y82zB4w/Ih1ddQ3UqMsK06I1jwU\"",
    "mtime": "2026-05-17T00:12:05.823Z",
    "size": 7959,
    "path": "../public/_nuxt/Man4.Coih0Axx.png"
  },
  "/_nuxt/Man5.DPEvcUJI.png": {
    "type": "image/png",
    "etag": "\"1f6a-32AM1k2OoP2dZFJz+L+g/loD384\"",
    "mtime": "2026-05-17T00:12:05.823Z",
    "size": 8042,
    "path": "../public/_nuxt/Man5.DPEvcUJI.png"
  },
  "/_nuxt/Man6.CjAIDoWG.png": {
    "type": "image/png",
    "etag": "\"13fc-JY4PV/hlnlZiu2EesKk5oT4LzAE\"",
    "mtime": "2026-05-17T00:12:06.219Z",
    "size": 5116,
    "path": "../public/_nuxt/Man6.CjAIDoWG.png"
  },
  "/_nuxt/Man6.ZMch1YAd.png": {
    "type": "image/png",
    "etag": "\"1d7c-5X2H92i5mV471BQ3FvDLepi5SgA\"",
    "mtime": "2026-05-17T00:12:05.983Z",
    "size": 7548,
    "path": "../public/_nuxt/Man6.ZMch1YAd.png"
  },
  "/_nuxt/Man7.C92urtLM.png": {
    "type": "image/png",
    "etag": "\"1dce-GCdXjD/P7kJQ2pTJYZTYCeBFAAk\"",
    "mtime": "2026-05-17T00:12:05.983Z",
    "size": 7630,
    "path": "../public/_nuxt/Man7.C92urtLM.png"
  },
  "/_nuxt/Man7.YgaNm2jw.png": {
    "type": "image/png",
    "etag": "\"176e-lpymsL6aCsH+bR0WhW4AcophIHQ\"",
    "mtime": "2026-05-17T00:12:05.987Z",
    "size": 5998,
    "path": "../public/_nuxt/Man7.YgaNm2jw.png"
  },
  "/_nuxt/Man8.B5lxvnh7.png": {
    "type": "image/png",
    "etag": "\"1c8e-jOxXaXcz9seA/LdpSd6kJc8G/6s\"",
    "mtime": "2026-05-17T00:12:05.987Z",
    "size": 7310,
    "path": "../public/_nuxt/Man8.B5lxvnh7.png"
  },
  "/_nuxt/Man9.DDiTRH7T.png": {
    "type": "image/png",
    "etag": "\"2084-5sPoISSZ4yeWZd9znV1fNuWlYrY\"",
    "mtime": "2026-05-17T00:12:05.987Z",
    "size": 8324,
    "path": "../public/_nuxt/Man9.DDiTRH7T.png"
  },
  "/_nuxt/Nan.D_YDyd6Z.png": {
    "type": "image/png",
    "etag": "\"1a05-aaStdL9g56MjWaP2MAUfdb0VPgo\"",
    "mtime": "2026-05-17T00:12:05.987Z",
    "size": 6661,
    "path": "../public/_nuxt/Nan.D_YDyd6Z.png"
  },
  "/_nuxt/Orchid.j_f8_nG7.png": {
    "type": "image/png",
    "etag": "\"1e15-Hqii4qHofYkhDE6A6L0N6BXpGRo\"",
    "mtime": "2026-05-17T00:12:06.195Z",
    "size": 7701,
    "path": "../public/_nuxt/Orchid.j_f8_nG7.png"
  },
  "/_nuxt/Pa4DQ91Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f6e-WzbnXHYFXWCggEY/s7Ge6WW0ciA\"",
    "mtime": "2026-05-17T00:12:06.199Z",
    "size": 8046,
    "path": "../public/_nuxt/Pa4DQ91Z.js"
  },
  "/_nuxt/Pei.BnV0ggZ1.png": {
    "type": "image/png",
    "etag": "\"18fc-JyygP5IrPqY6WmRDaRDJ3E/7kzk\"",
    "mtime": "2026-05-17T00:12:06.199Z",
    "size": 6396,
    "path": "../public/_nuxt/Pei.BnV0ggZ1.png"
  },
  "/_nuxt/Pin1.DPj6X3ww.png": {
    "type": "image/png",
    "etag": "\"2104-/G0uC/tr+A1592qTl5X2cAuE/wA\"",
    "mtime": "2026-05-17T00:12:06.203Z",
    "size": 8452,
    "path": "../public/_nuxt/Pin1.DPj6X3ww.png"
  },
  "/_nuxt/Pin2.BUs9rXFv.png": {
    "type": "image/png",
    "etag": "\"1cb9-f4+yyEnKP9BZa/4G7pz1ViYqIU8\"",
    "mtime": "2026-05-17T00:12:06.203Z",
    "size": 7353,
    "path": "../public/_nuxt/Pin2.BUs9rXFv.png"
  },
  "/_nuxt/Pin5.Cap8WSJR.png": {
    "type": "image/png",
    "etag": "\"1dca-1wq1mVBsTk2Jk+lKCIr9/ehOi14\"",
    "mtime": "2026-05-17T00:12:06.203Z",
    "size": 7626,
    "path": "../public/_nuxt/Pin5.Cap8WSJR.png"
  },
  "/_nuxt/Pin5.DEIPO8bQ.png": {
    "type": "image/png",
    "etag": "\"1496-MElgcHaVWy+ZLiDxgifyBkplel0\"",
    "mtime": "2026-05-17T00:12:06.203Z",
    "size": 5270,
    "path": "../public/_nuxt/Pin5.DEIPO8bQ.png"
  },
  "/_nuxt/Pin6.2TgiKI9I.png": {
    "type": "image/png",
    "etag": "\"209c-xfMhkgCHWHFP45eL1DSs7S9hMoo\"",
    "mtime": "2026-05-17T00:12:06.291Z",
    "size": 8348,
    "path": "../public/_nuxt/Pin6.2TgiKI9I.png"
  },
  "/_nuxt/Pin8.Rxh-2JCz.png": {
    "type": "image/png",
    "etag": "\"23fd-2p8FTtUc54fd8uCCvahkcXYSG3A\"",
    "mtime": "2026-05-17T00:12:06.279Z",
    "size": 9213,
    "path": "../public/_nuxt/Pin8.Rxh-2JCz.png"
  },
  "/_nuxt/Pin7.ppEVpxJx.png": {
    "type": "image/png",
    "etag": "\"2104-xBtpI+w4j1SkoqxS29wM0IUuq0s\"",
    "mtime": "2026-05-17T00:12:06.279Z",
    "size": 8452,
    "path": "../public/_nuxt/Pin7.ppEVpxJx.png"
  },
  "/_nuxt/Man3.BmAwFOdL.png": {
    "type": "image/png",
    "etag": "\"1e8c-X/C0T+8ftjkg6/sPQ28Kt7w+o74\"",
    "mtime": "2026-05-17T00:12:05.819Z",
    "size": 7820,
    "path": "../public/_nuxt/Man3.BmAwFOdL.png"
  },
  "/_nuxt/Pin9.BjgcLZ8y.png": {
    "type": "image/png",
    "etag": "\"27bc-+ISCvriWyjao7Cp4hYijlDo3Nn4\"",
    "mtime": "2026-05-17T00:12:06.279Z",
    "size": 10172,
    "path": "../public/_nuxt/Pin9.BjgcLZ8y.png"
  },
  "/_nuxt/PlayerAvatar.rxPhl5Hl.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"829-Zg/qErn/mpSnELUTUSI5TpDOSIo\"",
    "mtime": "2026-05-17T00:12:06.295Z",
    "size": 2089,
    "path": "../public/_nuxt/PlayerAvatar.rxPhl5Hl.css"
  },
  "/_nuxt/Plum.C6VwdJEX.png": {
    "type": "image/png",
    "etag": "\"20bc-tcMgSQPGdlU5LZZcH6J9/E5xFQg\"",
    "mtime": "2026-05-17T00:12:06.295Z",
    "size": 8380,
    "path": "../public/_nuxt/Plum.C6VwdJEX.png"
  },
  "/_nuxt/Sou1.CUi2ZsKy.png": {
    "type": "image/png",
    "etag": "\"2144-uCZp65T2gllByakWwZaqnt4aiPA\"",
    "mtime": "2026-05-17T00:12:06.295Z",
    "size": 8516,
    "path": "../public/_nuxt/Sou1.CUi2ZsKy.png"
  },
  "/_nuxt/Sou2.Dj5CXMVH.png": {
    "type": "image/png",
    "etag": "\"182f-2nfxAzEDg5XOOiwpiMS1wzuNslM\"",
    "mtime": "2026-05-17T00:12:06.295Z",
    "size": 6191,
    "path": "../public/_nuxt/Sou2.Dj5CXMVH.png"
  },
  "/_nuxt/Sou3.PEfclpwq.png": {
    "type": "image/png",
    "etag": "\"1a08-N3NRrY+26KjeYMmkX84G5UEOK7o\"",
    "mtime": "2026-05-17T00:12:06.503Z",
    "size": 6664,
    "path": "../public/_nuxt/Sou3.PEfclpwq.png"
  },
  "/_nuxt/Sou4.anWp-Ckd.png": {
    "type": "image/png",
    "etag": "\"1c38-iCMKHuFWKyy98zFrLjtbnPwwu6Y\"",
    "mtime": "2026-05-17T00:12:06.299Z",
    "size": 7224,
    "path": "../public/_nuxt/Sou4.anWp-Ckd.png"
  },
  "/_nuxt/Sou5.CXLAYesq.png": {
    "type": "image/png",
    "etag": "\"208a-7yleT2drx+1xUOXwn3Ud3Mhsd2o\"",
    "mtime": "2026-05-17T00:12:06.299Z",
    "size": 8330,
    "path": "../public/_nuxt/Sou5.CXLAYesq.png"
  },
  "/_nuxt/Sou6.pPMat7Mp.png": {
    "type": "image/png",
    "etag": "\"22cc-k3Eo0VhZrhDtD8VH2zMaLxGLcCw\"",
    "mtime": "2026-05-17T00:12:06.299Z",
    "size": 8908,
    "path": "../public/_nuxt/Sou6.pPMat7Mp.png"
  },
  "/_nuxt/Sou7.Cc24rn9W.png": {
    "type": "image/png",
    "etag": "\"1fbb-hWEPBhcYSdqd4oV8ac7sw8DxFKc\"",
    "mtime": "2026-05-17T00:12:06.487Z",
    "size": 8123,
    "path": "../public/_nuxt/Sou7.Cc24rn9W.png"
  },
  "/_nuxt/Sou8.nuuY5_TC.png": {
    "type": "image/png",
    "etag": "\"2249-/Ohmb24mMO5C6c0KR2tbmr7LRCU\"",
    "mtime": "2026-05-17T00:12:06.487Z",
    "size": 8777,
    "path": "../public/_nuxt/Sou8.nuuY5_TC.png"
  },
  "/_nuxt/Sou9.B3udWNF4.png": {
    "type": "image/png",
    "etag": "\"2649-49Tgm+KDD9irn8EMJzmE2V3zvOQ\"",
    "mtime": "2026-05-17T00:12:06.491Z",
    "size": 9801,
    "path": "../public/_nuxt/Sou9.B3udWNF4.png"
  },
  "/_nuxt/Spring.Drk5EmsE.png": {
    "type": "image/png",
    "etag": "\"1caf-8oQVfvOZYHR+E2SoQ1eoR7arpK4\"",
    "mtime": "2026-05-17T00:12:06.491Z",
    "size": 7343,
    "path": "../public/_nuxt/Spring.Drk5EmsE.png"
  },
  "/_nuxt/Summer.DnR0_duQ.png": {
    "type": "image/png",
    "etag": "\"1e84-3aDHcmNzWshBd93TkWqYvrdfUI4\"",
    "mtime": "2026-05-17T00:12:06.491Z",
    "size": 7812,
    "path": "../public/_nuxt/Summer.DnR0_duQ.png"
  },
  "/_nuxt/Ton.DJ1OduKi.png": {
    "type": "image/png",
    "etag": "\"19ef-lCbZ1qa3PDez8rXHoLctjNmIcFI\"",
    "mtime": "2026-05-17T00:12:06.563Z",
    "size": 6639,
    "path": "../public/_nuxt/Ton.DJ1OduKi.png"
  },
  "/_nuxt/Winter.DsRo0aNY.png": {
    "type": "image/png",
    "etag": "\"236e-ayjRpejPyfoBXYwELeeZRAR2TSI\"",
    "mtime": "2026-05-17T00:12:06.563Z",
    "size": 9070,
    "path": "../public/_nuxt/Winter.DsRo0aNY.png"
  },
  "/_nuxt/_roomId_.CDQ2tOP5.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1dd-6+AH+EKdBi9c2Ndygq9RQEjM7nM\"",
    "mtime": "2026-05-17T00:12:06.563Z",
    "size": 477,
    "path": "../public/_nuxt/_roomId_.CDQ2tOP5.css"
  },
  "/_nuxt/admin-test.BYwdaGUr.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"d80-G7uWOjMn7i17HBqklYJ7sH+q/XM\"",
    "mtime": "2026-05-17T00:12:06.567Z",
    "size": 3456,
    "path": "../public/_nuxt/admin-test.BYwdaGUr.css"
  },
  "/_nuxt/_roomId_.CxEAOI3H.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"19d87-KPfMW7ZePYw5RnB7P08Ju2UOucg\"",
    "mtime": "2026-05-17T00:12:06.567Z",
    "size": 105863,
    "path": "../public/_nuxt/_roomId_.CxEAOI3H.css"
  },
  "/_nuxt/avatar-demo.BiNVCx0_.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"815-MZfVORRQaP1+0XA0CbYUJTYBY+g\"",
    "mtime": "2026-05-17T00:12:06.711Z",
    "size": 2069,
    "path": "../public/_nuxt/avatar-demo.BiNVCx0_.css"
  },
  "/_nuxt/autumn.DxbtXCWh.jpg": {
    "type": "image/jpeg",
    "etag": "\"17286-arAkFeWkh0+/mv6NVhWrUrFKQOs\"",
    "mtime": "2026-05-17T00:12:06.711Z",
    "size": 94854,
    "path": "../public/_nuxt/autumn.DxbtXCWh.jpg"
  },
  "/_nuxt/bai.Ca1hFFct.jpg": {
    "type": "image/jpeg",
    "etag": "\"6f85-07oew4j1QfL8THpsu5CjjB9pdvc\"",
    "mtime": "2026-05-17T00:12:06.567Z",
    "size": 28549,
    "path": "../public/_nuxt/bai.Ca1hFFct.jpg"
  },
  "/_nuxt/bamboo1.BmNzbiGC.jpg": {
    "type": "image/jpeg",
    "etag": "\"11866-OsUz1A8VNj7GnAQUPwdlHUb+YuM\"",
    "mtime": "2026-05-17T00:12:06.903Z",
    "size": 71782,
    "path": "../public/_nuxt/bamboo1.BmNzbiGC.jpg"
  },
  "/_nuxt/bamboo2.CC4GjzZ0.jpg": {
    "type": "image/jpeg",
    "etag": "\"9ec9-aAdX5CDKUVesgfL46z1iapoZfoU\"",
    "mtime": "2026-05-17T00:12:06.711Z",
    "size": 40649,
    "path": "../public/_nuxt/bamboo2.CC4GjzZ0.jpg"
  },
  "/_nuxt/bamboo3.DxiHJvi8.jpg": {
    "type": "image/jpeg",
    "etag": "\"c4f7-xG/a8rXgomKh/4+qSJOIcG3ZdEs\"",
    "mtime": "2026-05-17T00:12:06.715Z",
    "size": 50423,
    "path": "../public/_nuxt/bamboo3.DxiHJvi8.jpg"
  },
  "/_nuxt/bamboo4.DRZe11ME.jpg": {
    "type": "image/jpeg",
    "etag": "\"dee8-/28FZrhFYR7f0Vom1vuoYY2M3t8\"",
    "mtime": "2026-05-17T00:12:06.715Z",
    "size": 57064,
    "path": "../public/_nuxt/bamboo4.DRZe11ME.jpg"
  },
  "/_nuxt/bamboo8.rjEkuLxl.jpg": {
    "type": "image/jpeg",
    "etag": "\"128af-5rgfH8G0CLU15zqe5jf69z2ClX4\"",
    "mtime": "2026-05-17T00:12:06.811Z",
    "size": 75951,
    "path": "../public/_nuxt/bamboo8.rjEkuLxl.jpg"
  },
  "/_nuxt/bamboo7.BroSFXFv.jpg": {
    "type": "image/jpeg",
    "etag": "\"ef96-W1PFKuJorQNYq1pWaOAYt2Hl6EI\"",
    "mtime": "2026-05-17T00:12:06.715Z",
    "size": 61334,
    "path": "../public/_nuxt/bamboo7.BroSFXFv.jpg"
  },
  "/_nuxt/buhua.CGHj8oJl.opus": {
    "type": "audio/ogg",
    "etag": "\"1f9c-YypIz/MPpGucMkax+dwX9/338gk\"",
    "mtime": "2026-05-17T00:12:07.027Z",
    "size": 8092,
    "path": "../public/_nuxt/buhua.CGHj8oJl.opus"
  },
  "/_nuxt/bamboo_flower.DOhG2Tk2.jpg": {
    "type": "image/jpeg",
    "etag": "\"12895-2CLwrVv2PKoIOiP9N1TRxqV+SCE\"",
    "mtime": "2026-05-17T00:12:06.815Z",
    "size": 75925,
    "path": "../public/_nuxt/bamboo_flower.DOhG2Tk2.jpg"
  },
  "/_nuxt/create-room.BGKe2fb5.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"183f-FFDKU662ufCkpDgwrIYKIixFli0\"",
    "mtime": "2026-05-17T00:12:06.815Z",
    "size": 6207,
    "path": "../public/_nuxt/create-room.BGKe2fb5.css"
  },
  "/_nuxt/bamboo9.DEcF0xqO.jpg": {
    "type": "image/jpeg",
    "etag": "\"1535d-j+G9Rp86qvk4IG0/JN0V+4neHQQ\"",
    "mtime": "2026-05-17T00:12:06.811Z",
    "size": 86877,
    "path": "../public/_nuxt/bamboo9.DEcF0xqO.jpg"
  },
  "/_nuxt/east.BS54hGaO.jpg": {
    "type": "image/jpeg",
    "etag": "\"6db8-az7AVCkAN+emNZEnVUtTeK/P9Qs\"",
    "mtime": "2026-05-17T00:12:07.007Z",
    "size": 28088,
    "path": "../public/_nuxt/east.BS54hGaO.jpg"
  },
  "/_nuxt/chrysanthemum.diwO_tdI.jpg": {
    "type": "image/jpeg",
    "etag": "\"15b92-h5E80tDs4+FGLLrQegh3vl5WZ0w\"",
    "mtime": "2026-05-17T00:12:06.815Z",
    "size": 88978,
    "path": "../public/_nuxt/chrysanthemum.diwO_tdI.jpg"
  },
  "/_nuxt/fa.qSkkQYzn.jpg": {
    "type": "image/jpeg",
    "etag": "\"9a29-3HGRR7RFj7BlCxHv+JHhNRBPFII\"",
    "mtime": "2026-05-17T00:12:07.011Z",
    "size": 39465,
    "path": "../public/_nuxt/fa.qSkkQYzn.jpg"
  },
  "/_nuxt/bamboo5.BLZ6zvw9.jpg": {
    "type": "image/jpeg",
    "etag": "\"fbe7-hrZ+NLXQhS/Xt/XzmvpITA0qiuc\"",
    "mtime": "2026-05-17T00:12:06.715Z",
    "size": 64487,
    "path": "../public/_nuxt/bamboo5.BLZ6zvw9.jpg"
  },
  "/_nuxt/feng_east.CzRzIhe9.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-j/4Rv28IK9QrFLZ444xYjRJyfC8\"",
    "mtime": "2026-05-17T00:12:07.191Z",
    "size": 21357,
    "path": "../public/_nuxt/feng_east.CzRzIhe9.mp3"
  },
  "/_nuxt/feng_east.CRIuFlcO.opus": {
    "type": "audio/ogg",
    "etag": "\"24cc-dnwx6AQrga9QCiWyisk/pzaLQWE\"",
    "mtime": "2026-05-17T00:12:07.123Z",
    "size": 9420,
    "path": "../public/_nuxt/feng_east.CRIuFlcO.opus"
  },
  "/_nuxt/feng_east.uZqisK2q.opus": {
    "type": "audio/ogg",
    "etag": "\"2268-ZS1rZ8AclDm0Uh5VvL53kK0GmzY\"",
    "mtime": "2026-05-17T00:12:07.199Z",
    "size": 8808,
    "path": "../public/_nuxt/feng_east.uZqisK2q.opus"
  },
  "/_nuxt/feng_north.DZc-8dwB.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-mmR7ROdej8E/N/ZKv3y+dfmMUNA\"",
    "mtime": "2026-05-17T00:12:07.307Z",
    "size": 21357,
    "path": "../public/_nuxt/feng_north.DZc-8dwB.mp3"
  },
  "/_nuxt/feng_north.wkELUyGl.opus": {
    "type": "audio/ogg",
    "etag": "\"1f3d-fU7aB6R9qD4K/yPHnehKwJNN+mg\"",
    "mtime": "2026-05-17T00:12:07.303Z",
    "size": 7997,
    "path": "../public/_nuxt/feng_north.wkELUyGl.opus"
  },
  "/_nuxt/bamboo6.BO3ywUnU.jpg": {
    "type": "image/jpeg",
    "etag": "\"11c82-wRUpSWRNfLDHwARzVtlTWDujhxY\"",
    "mtime": "2026-05-17T00:12:06.715Z",
    "size": 72834,
    "path": "../public/_nuxt/bamboo6.BO3ywUnU.jpg"
  },
  "/_nuxt/feng_south.7EGSIva3.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-M1Ly6//Q9REcPGnBAW8ThLF1fq8\"",
    "mtime": "2026-05-17T00:12:07.311Z",
    "size": 21357,
    "path": "../public/_nuxt/feng_south.7EGSIva3.mp3"
  },
  "/_nuxt/feng_south.DGEdF6V5.opus": {
    "type": "audio/ogg",
    "etag": "\"24d3-U6a8ftOCRFHX5rlyqme5vQ2BBIQ\"",
    "mtime": "2026-05-17T00:12:07.443Z",
    "size": 9427,
    "path": "../public/_nuxt/feng_south.DGEdF6V5.opus"
  },
  "/_nuxt/feng_south.Ri9b_vQs.opus": {
    "type": "audio/ogg",
    "etag": "\"24aa-ZSMRWOabXrneR6H5U3o093CA940\"",
    "mtime": "2026-05-17T00:12:07.447Z",
    "size": 9386,
    "path": "../public/_nuxt/feng_south.Ri9b_vQs.opus"
  },
  "/_nuxt/feng_west.BCdW5ZET.opus": {
    "type": "audio/ogg",
    "etag": "\"2607-gxxLiPL7i/xcA1ram37OH+mb63M\"",
    "mtime": "2026-05-17T00:12:07.439Z",
    "size": 9735,
    "path": "../public/_nuxt/feng_west.BCdW5ZET.opus"
  },
  "/_nuxt/feng_north.AxiNVsdy.opus": {
    "type": "audio/ogg",
    "etag": "\"1cba-U4C6bEtOekxIy6rro2T2K2fTixA\"",
    "mtime": "2026-05-17T00:12:07.199Z",
    "size": 7354,
    "path": "../public/_nuxt/feng_north.AxiNVsdy.opus"
  },
  "/_nuxt/entry.C3jPMm6_.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1eae7-cHnwJ4USVKoP/l3A8B0lslgOAt0\"",
    "mtime": "2026-05-17T00:12:07.011Z",
    "size": 125671,
    "path": "../public/_nuxt/entry.C3jPMm6_.css"
  },
  "/_nuxt/feng_west.C1ZX8A9u.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-VXa4rA/AxXBpBEFXF35TInrzJcY\"",
    "mtime": "2026-05-17T00:12:07.435Z",
    "size": 21357,
    "path": "../public/_nuxt/feng_west.C1ZX8A9u.mp3"
  },
  "/_nuxt/feng_west.DgQpKW01.opus": {
    "type": "audio/ogg",
    "etag": "\"29e8-jrDoPHMv87CUhIJmZCZbXHPvK2M\"",
    "mtime": "2026-05-17T00:12:07.531Z",
    "size": 10728,
    "path": "../public/_nuxt/feng_west.DgQpKW01.opus"
  },
  "/_nuxt/game.z5IpEbvo.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"41a0-8L3mDtefoGsYY4NamEAlVMcZ6zk\"",
    "mtime": "2026-05-17T00:12:07.439Z",
    "size": 16800,
    "path": "../public/_nuxt/game.z5IpEbvo.css"
  },
  "/_nuxt/gang.BklBu3jJ.opus": {
    "type": "audio/ogg",
    "etag": "\"1a33-v97CuadiWVhVDlUOChOq/zbkV9w\"",
    "mtime": "2026-05-17T00:12:07.547Z",
    "size": 6707,
    "path": "../public/_nuxt/gang.BklBu3jJ.opus"
  },
  "/_nuxt/history.d3bkI2QN.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1617-MIsAnI4XzsGQU+PKYoo77i14p7o\"",
    "mtime": "2026-05-17T00:12:07.535Z",
    "size": 5655,
    "path": "../public/_nuxt/history.d3bkI2QN.css"
  },
  "/_nuxt/hua_plum.CFaoPjQm.opus": {
    "type": "audio/ogg",
    "etag": "\"1928-R+eUXDdABCCM9JpSRqBZ0wnM59M\"",
    "mtime": "2026-05-17T00:12:07.671Z",
    "size": 6440,
    "path": "../public/_nuxt/hua_plum.CFaoPjQm.opus"
  },
  "/_nuxt/hua_plum.CO3DCUN4.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-H0DwUOkPiJK268KAaBuQuscxinU\"",
    "mtime": "2026-05-17T00:12:07.683Z",
    "size": 15981,
    "path": "../public/_nuxt/hua_plum.CO3DCUN4.mp3"
  },
  "/_nuxt/hua_plum.sC-hxPB5.opus": {
    "type": "audio/ogg",
    "etag": "\"1d70-acUZ1/Fd4Cd1yFFjI9XBKoGkhn8\"",
    "mtime": "2026-05-17T00:12:07.695Z",
    "size": 7536,
    "path": "../public/_nuxt/hua_plum.sC-hxPB5.opus"
  },
  "/_nuxt/hule.B4BElX1s.opus": {
    "type": "audio/ogg",
    "etag": "\"327d-GUhA9OXD3ymlOKuKddx9Gsf/NGY\"",
    "mtime": "2026-05-17T00:12:07.675Z",
    "size": 12925,
    "path": "../public/_nuxt/hule.B4BElX1s.opus"
  },
  "/_nuxt/index.j8ZxzU_j.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"24c4-5seHPWFPmi7JyiS7ZHBJOmuiGP4\"",
    "mtime": "2026-05-17T00:12:07.675Z",
    "size": 9412,
    "path": "../public/_nuxt/index.j8ZxzU_j.css"
  },
  "/_nuxt/iUIYW032.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2086-TumfgD0P52aG4FaNiSPpFfsZl70\"",
    "mtime": "2026-05-17T00:12:07.675Z",
    "size": 8326,
    "path": "../public/_nuxt/iUIYW032.js"
  },
  "/_nuxt/jian_bai.BHegukVZ.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-5O346FkMgp+mkoTQ6Zq11KzNddo\"",
    "mtime": "2026-05-17T00:12:07.755Z",
    "size": 18669,
    "path": "../public/_nuxt/jian_bai.BHegukVZ.mp3"
  },
  "/_nuxt/jian_bai.CD6nKM-d.opus": {
    "type": "audio/ogg",
    "etag": "\"1daa-a4QySxj+A5ugyE79zAZbeGvqaL4\"",
    "mtime": "2026-05-17T00:12:07.763Z",
    "size": 7594,
    "path": "../public/_nuxt/jian_bai.CD6nKM-d.opus"
  },
  "/_nuxt/jian_bai.Iab5y6OY.opus": {
    "type": "audio/ogg",
    "etag": "\"228a-4XjjqsBr37vWRBXo2xtsJggaOVs\"",
    "mtime": "2026-05-17T00:12:07.895Z",
    "size": 8842,
    "path": "../public/_nuxt/jian_bai.Iab5y6OY.opus"
  },
  "/_nuxt/jian_fa.755d4JyA.opus": {
    "type": "audio/ogg",
    "etag": "\"23f1-u7677pMw4NcwOfbKQTKwEoiWUuE\"",
    "mtime": "2026-05-17T00:12:07.819Z",
    "size": 9201,
    "path": "../public/_nuxt/jian_fa.755d4JyA.opus"
  },
  "/_nuxt/jian_fa.B1-gKhn1.opus": {
    "type": "audio/ogg",
    "etag": "\"1f6c-HxPd43tcagZXDqJHHU0Hu5ZcyXw\"",
    "mtime": "2026-05-17T00:12:07.899Z",
    "size": 8044,
    "path": "../public/_nuxt/jian_fa.B1-gKhn1.opus"
  },
  "/_nuxt/jian_fa.DTdwqlVX.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-LAJAyeTVqcMgi9O7OlvkYmECpCs\"",
    "mtime": "2026-05-17T00:12:07.903Z",
    "size": 21357,
    "path": "../public/_nuxt/jian_fa.DTdwqlVX.mp3"
  },
  "/_nuxt/jian_zhong.Cb46TrrA.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-HpzI4lx/a1QUIr1CHuKgPDADook\"",
    "mtime": "2026-05-17T00:12:07.879Z",
    "size": 18669,
    "path": "../public/_nuxt/jian_zhong.Cb46TrrA.mp3"
  },
  "/_nuxt/jian_zhong.DaTpXEns.opus": {
    "type": "audio/ogg",
    "etag": "\"1d81-+g350ZfHtML5Dvlgln0yY3diPgU\"",
    "mtime": "2026-05-17T00:12:07.983Z",
    "size": 7553,
    "path": "../public/_nuxt/jian_zhong.DaTpXEns.opus"
  },
  "/_nuxt/jian_zhong.DvY138rR.opus": {
    "type": "audio/ogg",
    "etag": "\"1bed-Xsbh7rPGNQ/5fOm0ueuCQULWRMI\"",
    "mtime": "2026-05-17T00:12:08.039Z",
    "size": 7149,
    "path": "../public/_nuxt/jian_zhong.DvY138rR.opus"
  },
  "/_nuxt/join-game.CQZbQg0J.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"d34-ADKrVe2i39aNmT0rzBcCNBgAT1M\"",
    "mtime": "2026-05-17T00:12:07.899Z",
    "size": 3380,
    "path": "../public/_nuxt/join-game.CQZbQg0J.css"
  },
  "/_nuxt/juyi.CSxMOkgl.opus": {
    "type": "audio/ogg",
    "etag": "\"6957-dggqnTh4t+o0kYq+6z4Px/c2esE\"",
    "mtime": "2026-05-17T00:12:08.115Z",
    "size": 26967,
    "path": "../public/_nuxt/juyi.CSxMOkgl.opus"
  },
  "/_nuxt/login.CS7oxuFc.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"10ff-duLRiKjGj51nv+k3FFDrZnQ5W5E\"",
    "mtime": "2026-05-17T00:12:07.983Z",
    "size": 4351,
    "path": "../public/_nuxt/login.CS7oxuFc.css"
  },
  "/_nuxt/man1.vMMXdhpA.jpg": {
    "type": "image/jpeg",
    "etag": "\"c670-xMS2ifzqgz+oQb91+Mmna5wqyZc\"",
    "mtime": "2026-05-17T00:12:07.983Z",
    "size": 50800,
    "path": "../public/_nuxt/man1.vMMXdhpA.jpg"
  },
  "/_nuxt/man2.DsOyNXWi.jpg": {
    "type": "image/jpeg",
    "etag": "\"cab3-7znuwnBAIv5RRG0U03T8JCCK+bw\"",
    "mtime": "2026-05-17T00:12:07.987Z",
    "size": 51891,
    "path": "../public/_nuxt/man2.DsOyNXWi.jpg"
  },
  "/_nuxt/man3.CXhyO8lN.jpg": {
    "type": "image/jpeg",
    "etag": "\"e762-hXVDEjsvWJfLyBfQxfVhfBYI1Wc\"",
    "mtime": "2026-05-17T00:12:07.987Z",
    "size": 59234,
    "path": "../public/_nuxt/man3.CXhyO8lN.jpg"
  },
  "/_nuxt/man4.BhtxCcAZ.jpg": {
    "type": "image/jpeg",
    "etag": "\"edfe-TKAwnpaiPeUTLFWiA66gJm81o7I\"",
    "mtime": "2026-05-17T00:12:08.103Z",
    "size": 60926,
    "path": "../public/_nuxt/man4.BhtxCcAZ.jpg"
  },
  "/_nuxt/man5.j9cORqp_.jpg": {
    "type": "image/jpeg",
    "etag": "\"fca5-Y44YI8KEKa18CmTscY4SfQIGAsU\"",
    "mtime": "2026-05-17T00:12:08.115Z",
    "size": 64677,
    "path": "../public/_nuxt/man5.j9cORqp_.jpg"
  },
  "/_nuxt/man6.C2hsrMrZ.jpg": {
    "type": "image/jpeg",
    "etag": "\"d5b5-2g+mvYG2maTtd6D+uUIFrgONYC4\"",
    "mtime": "2026-05-17T00:12:08.119Z",
    "size": 54709,
    "path": "../public/_nuxt/man6.C2hsrMrZ.jpg"
  },
  "/_nuxt/man7.CC2vAZ1i.jpg": {
    "type": "image/jpeg",
    "etag": "\"dbe6-AZk9bw1vqXuGQk2ze2WJinqrcA4\"",
    "mtime": "2026-05-17T00:12:08.119Z",
    "size": 56294,
    "path": "../public/_nuxt/man7.CC2vAZ1i.jpg"
  },
  "/_nuxt/man8.DCppy-4S.jpg": {
    "type": "image/jpeg",
    "etag": "\"d22a-fk/sWqNu+UWrkcWugttGc0uzBwA\"",
    "mtime": "2026-05-17T00:12:08.119Z",
    "size": 53802,
    "path": "../public/_nuxt/man8.DCppy-4S.jpg"
  },
  "/_nuxt/man9.CmL2uHG7.jpg": {
    "type": "image/jpeg",
    "etag": "\"d2f3-6s91KrSdL7lLElzriU6G6jPc7HU\"",
    "mtime": "2026-05-17T00:12:08.119Z",
    "size": 54003,
    "path": "../public/_nuxt/man9.CmL2uHG7.jpg"
  },
  "/_nuxt/north.BhDbxtDg.jpg": {
    "type": "image/jpeg",
    "etag": "\"60c7-BQTgetmSGHPvM/bm596/PpU1hbc\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 24775,
    "path": "../public/_nuxt/north.BhDbxtDg.jpg"
  },
  "/_nuxt/orchid.BHpqrx7e.jpg": {
    "type": "image/jpeg",
    "etag": "\"13798-cg40uba+ZU9xQHo89DnlzDGUND8\"",
    "mtime": "2026-05-17T00:12:08.263Z",
    "size": 79768,
    "path": "../public/_nuxt/orchid.BHpqrx7e.jpg"
  },
  "/_nuxt/peng.xEpL-68t.opus": {
    "type": "audio/ogg",
    "etag": "\"1858-4rFf0FCUN4LaaCBY+AMJgFb9iO8\"",
    "mtime": "2026-05-17T00:12:08.375Z",
    "size": 6232,
    "path": "../public/_nuxt/peng.xEpL-68t.opus"
  },
  "/_nuxt/pin1.CByrT3xb.jpg": {
    "type": "image/jpeg",
    "etag": "\"11f67-ftyYmzHvQT2Dl6Ltg2mSBzIqKjc\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 73575,
    "path": "../public/_nuxt/pin1.CByrT3xb.jpg"
  },
  "/_nuxt/pin2.CYo0Z_I-.jpg": {
    "type": "image/jpeg",
    "etag": "\"e316-Un4C4nb3mzMg3bx5qPUT7qov+gk\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 58134,
    "path": "../public/_nuxt/pin2.CYo0Z_I-.jpg"
  },
  "/_nuxt/pin3.w0MtYyOG.jpg": {
    "type": "image/jpeg",
    "etag": "\"f5d9-YHqne1y4GU47HVyHDDniBoDW4t8\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 62937,
    "path": "../public/_nuxt/pin3.w0MtYyOG.jpg"
  },
  "/_nuxt/pin4.NjRgdhOS.jpg": {
    "type": "image/jpeg",
    "etag": "\"eab4-4kGaVQYzCCigJXSU6uiVKXxoIek\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 60084,
    "path": "../public/_nuxt/pin4.NjRgdhOS.jpg"
  },
  "/_nuxt/pin5.D-LkqaGU.jpg": {
    "type": "image/jpeg",
    "etag": "\"11828-JVp4aUoyvE9jOGn4OT6471drsdg\"",
    "mtime": "2026-05-17T00:12:08.267Z",
    "size": 71720,
    "path": "../public/_nuxt/pin5.D-LkqaGU.jpg"
  },
  "/_nuxt/pin6.ColFbyZL.jpg": {
    "type": "image/jpeg",
    "etag": "\"12c9e-vlUWlnu4ouHgjU8S1qMHD15zIH4\"",
    "mtime": "2026-05-17T00:12:08.355Z",
    "size": 76958,
    "path": "../public/_nuxt/pin6.ColFbyZL.jpg"
  },
  "/_nuxt/pin7.Dx3IZf5W.jpg": {
    "type": "image/jpeg",
    "etag": "\"13a79-t9xtNl/a1DQDaSUHTRlNJqd6ejw\"",
    "mtime": "2026-05-17T00:12:08.379Z",
    "size": 80505,
    "path": "../public/_nuxt/pin7.Dx3IZf5W.jpg"
  },
  "/_nuxt/pin8.B-wc6_hM.jpg": {
    "type": "image/jpeg",
    "etag": "\"14c54-jtVGYPX92l56d0Df0o0/ML6w3QU\"",
    "mtime": "2026-05-17T00:12:08.379Z",
    "size": 85076,
    "path": "../public/_nuxt/pin8.B-wc6_hM.jpg"
  },
  "/_nuxt/pin9.tqxDrx1H.jpg": {
    "type": "image/jpeg",
    "etag": "\"17a48-NvNIm22T0UlKAqrcXKTc73wP3O4\"",
    "mtime": "2026-05-17T00:12:08.383Z",
    "size": 96840,
    "path": "../public/_nuxt/pin9.tqxDrx1H.jpg"
  },
  "/_nuxt/plum.CM6t3tTT.jpg": {
    "type": "image/jpeg",
    "etag": "\"15d5c-5mv3RV5DxuvwLHgCUndyrvCuGok\"",
    "mtime": "2026-05-17T00:12:08.383Z",
    "size": 89436,
    "path": "../public/_nuxt/plum.CM6t3tTT.jpg"
  },
  "/_nuxt/rules.BhqmULG-.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"d3a-Zw6a++62z19OE9YN2XixR2+ZgHA\"",
    "mtime": "2026-05-17T00:12:08.383Z",
    "size": 3386,
    "path": "../public/_nuxt/rules.BhqmULG-.css"
  },
  "/_nuxt/south.MKWkd-6C.jpg": {
    "type": "image/jpeg",
    "etag": "\"6681-cJiTvybHmn+XEMq/+B2R9RPxlPY\"",
    "mtime": "2026-05-17T00:12:08.383Z",
    "size": 26241,
    "path": "../public/_nuxt/south.MKWkd-6C.jpg"
  },
  "/_nuxt/spring.BeRYf0QU.jpg": {
    "type": "image/jpeg",
    "etag": "\"15a4f-/K+tcMtwh7pNqJ3GoQZ0ccznXWE\"",
    "mtime": "2026-05-17T00:12:08.563Z",
    "size": 88655,
    "path": "../public/_nuxt/spring.BeRYf0QU.jpg"
  },
  "/_nuxt/summer.zWPo-kIk.jpg": {
    "type": "image/jpeg",
    "etag": "\"17a94-yyL/NgUQJ3HfD57seC/MvvmTgb4\"",
    "mtime": "2026-05-17T00:12:08.563Z",
    "size": 96916,
    "path": "../public/_nuxt/summer.zWPo-kIk.jpg"
  },
  "/_nuxt/tiao_1.BLo_3hMf.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-/BDksWvgD3vCeuYCohCn/mxJwPU\"",
    "mtime": "2026-05-17T00:12:08.659Z",
    "size": 15981,
    "path": "../public/_nuxt/tiao_1.BLo_3hMf.mp3"
  },
  "/_nuxt/tiao_1.DDEJZhTH.opus": {
    "type": "audio/ogg",
    "etag": "\"2030-aajvPP9rO4iS4e+1JtiBYDVk/TA\"",
    "mtime": "2026-05-17T00:12:08.747Z",
    "size": 8240,
    "path": "../public/_nuxt/tiao_1.DDEJZhTH.opus"
  },
  "/_nuxt/tiao_1.c4f4id4C.opus": {
    "type": "audio/ogg",
    "etag": "\"1e78-wdULBiyGuxpmJ/l3oJMi92FCaUA\"",
    "mtime": "2026-05-17T00:12:08.739Z",
    "size": 7800,
    "path": "../public/_nuxt/tiao_1.c4f4id4C.opus"
  },
  "/_nuxt/tiao_2.CQtT_KUa.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-YdwGvUMbXkrXY4xdHZFGApxs1KY\"",
    "mtime": "2026-05-17T00:12:08.751Z",
    "size": 15981,
    "path": "../public/_nuxt/tiao_2.CQtT_KUa.mp3"
  },
  "/_nuxt/tiao_2.CgFpgDzh.opus": {
    "type": "audio/ogg",
    "etag": "\"1bfb-ZTrSGXKW0ry2T3dyZ3Cq6bF/XWk\"",
    "mtime": "2026-05-17T00:12:08.743Z",
    "size": 7163,
    "path": "../public/_nuxt/tiao_2.CgFpgDzh.opus"
  },
  "/_nuxt/tiao_2.DSPcbrf5.opus": {
    "type": "audio/ogg",
    "etag": "\"184a-PMquWXbk2P3Dcf6lQKLAvy/9sOo\"",
    "mtime": "2026-05-17T00:12:08.903Z",
    "size": 6218,
    "path": "../public/_nuxt/tiao_2.DSPcbrf5.opus"
  },
  "/_nuxt/tiao_3.7J-eAo-q.opus": {
    "type": "audio/ogg",
    "etag": "\"26ca-RM8JOKZRtbm6LiV1aE6mF8XspUM\"",
    "mtime": "2026-05-17T00:12:08.883Z",
    "size": 9930,
    "path": "../public/_nuxt/tiao_3.7J-eAo-q.opus"
  },
  "/_nuxt/tiao_3.8pwnzyg2.opus": {
    "type": "audio/ogg",
    "etag": "\"217a-K5bsR+2tzYT+ql/AQco3NM8tEus\"",
    "mtime": "2026-05-17T00:12:08.915Z",
    "size": 8570,
    "path": "../public/_nuxt/tiao_3.8pwnzyg2.opus"
  },
  "/_nuxt/tiao_3.BLQWEzT6.mp3": {
    "type": "audio/mpeg",
    "etag": "\"476d-Y8Wi7C7Fkc8Hh3hM+re7NaZDTZg\"",
    "mtime": "2026-05-17T00:12:08.959Z",
    "size": 18285,
    "path": "../public/_nuxt/tiao_3.BLQWEzT6.mp3"
  },
  "/_nuxt/tiao_4.BbJGzL04.opus": {
    "type": "audio/ogg",
    "etag": "\"1f7f-fJaVJmUZ8YuyCexE4TS9F22wKxk\"",
    "mtime": "2026-05-17T00:12:09.055Z",
    "size": 8063,
    "path": "../public/_nuxt/tiao_4.BbJGzL04.opus"
  },
  "/_nuxt/tiao_4.DJzOz35C.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-epj7I/KxQG+QzDxoRc18csNavNs\"",
    "mtime": "2026-05-17T00:12:09.043Z",
    "size": 15981,
    "path": "../public/_nuxt/tiao_4.DJzOz35C.mp3"
  },
  "/_nuxt/tiao_4.Dq8-gKOr.opus": {
    "type": "audio/ogg",
    "etag": "\"1b76-eem2alJkpH5sqIyJ2BwjAdEgYW8\"",
    "mtime": "2026-05-17T00:12:08.975Z",
    "size": 7030,
    "path": "../public/_nuxt/tiao_4.Dq8-gKOr.opus"
  },
  "/_nuxt/tiao_5.BOmYE6PR.opus": {
    "type": "audio/ogg",
    "etag": "\"1adc-6xCvKgRuMe9bmb6R2WVGZIJnadw\"",
    "mtime": "2026-05-17T00:12:09.123Z",
    "size": 6876,
    "path": "../public/_nuxt/tiao_5.BOmYE6PR.opus"
  },
  "/_nuxt/tiao_5.CGV3FC6O.opus": {
    "type": "audio/ogg",
    "etag": "\"2346-hoCgWsZBZ8tiE2dxPgHDdSfASMs\"",
    "mtime": "2026-05-17T00:12:09.131Z",
    "size": 9030,
    "path": "../public/_nuxt/tiao_5.CGV3FC6O.opus"
  },
  "/_nuxt/tiao_6.BpcYGKke.mp3": {
    "type": "audio/mpeg",
    "etag": "\"476d-4iJlmhvipYDPMEd+S+YRgODH+18\"",
    "mtime": "2026-05-17T00:12:09.255Z",
    "size": 18285,
    "path": "../public/_nuxt/tiao_6.BpcYGKke.mp3"
  },
  "/_nuxt/tiao_5.Cc8R8yO3.mp3": {
    "type": "audio/mpeg",
    "etag": "\"476d-c5VNN9CBwaIcxg+aEcw6wxFpRfU\"",
    "mtime": "2026-05-17T00:12:09.111Z",
    "size": 18285,
    "path": "../public/_nuxt/tiao_5.Cc8R8yO3.mp3"
  },
  "/_nuxt/tiao_6.CHpbvBnv.opus": {
    "type": "audio/ogg",
    "etag": "\"1ac5-pGmhwtFSf+Pfy3ay4/npPmIVQKA\"",
    "mtime": "2026-05-17T00:12:09.179Z",
    "size": 6853,
    "path": "../public/_nuxt/tiao_6.CHpbvBnv.opus"
  },
  "/_nuxt/tiao_6.D9VN1aSB.opus": {
    "type": "audio/ogg",
    "etag": "\"21ca-0gSrHadoXEg5hYWw2qTRcQEHdA4\"",
    "mtime": "2026-05-17T00:12:09.235Z",
    "size": 8650,
    "path": "../public/_nuxt/tiao_6.D9VN1aSB.opus"
  },
  "/_nuxt/tiao_7.DPGqyZYz.opus": {
    "type": "audio/ogg",
    "etag": "\"23d8-P0Ag3gmLNEpHZitA7yMWB8y1IWE\"",
    "mtime": "2026-05-17T00:12:09.247Z",
    "size": 9176,
    "path": "../public/_nuxt/tiao_7.DPGqyZYz.opus"
  },
  "/_nuxt/tiao_7.DTjSBKeC.mp3": {
    "type": "audio/mpeg",
    "etag": "\"476d-Q1Rp2bQmAxWG/PnF8ValCzwxCpY\"",
    "mtime": "2026-05-17T00:12:09.355Z",
    "size": 18285,
    "path": "../public/_nuxt/tiao_7.DTjSBKeC.mp3"
  },
  "/_nuxt/tiao_7.XRdJB9BM.opus": {
    "type": "audio/ogg",
    "etag": "\"2802-wGHah6uNn33fzq4aAqE8AzdKql8\"",
    "mtime": "2026-05-17T00:12:09.347Z",
    "size": 10242,
    "path": "../public/_nuxt/tiao_7.XRdJB9BM.opus"
  },
  "/_nuxt/tiao_8.Bc6ytb-W.mp3": {
    "type": "audio/mpeg",
    "etag": "\"476d-OesQyUpi5XxqNef6eLpkkfnPSQY\"",
    "mtime": "2026-05-17T00:12:09.351Z",
    "size": 18285,
    "path": "../public/_nuxt/tiao_8.Bc6ytb-W.mp3"
  },
  "/_nuxt/tiao_8.C2wiiFHT.opus": {
    "type": "audio/ogg",
    "etag": "\"226b-Y5Iji+Vv9AtoD2rSyZvSGFl0qE8\"",
    "mtime": "2026-05-17T00:12:09.343Z",
    "size": 8811,
    "path": "../public/_nuxt/tiao_8.C2wiiFHT.opus"
  },
  "/_nuxt/tiao_8.CrO8gyFY.opus": {
    "type": "audio/ogg",
    "etag": "\"1e5b-BUcTotS0fRLw7GNOUdJR0ds3QnE\"",
    "mtime": "2026-05-17T00:12:09.407Z",
    "size": 7771,
    "path": "../public/_nuxt/tiao_8.CrO8gyFY.opus"
  },
  "/_nuxt/tiao_9.24y5B9YB.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-/aq77u/rnpRfV+QQ05IKy5vvp44\"",
    "mtime": "2026-05-17T00:12:09.479Z",
    "size": 18669,
    "path": "../public/_nuxt/tiao_9.24y5B9YB.mp3"
  },
  "/_nuxt/tiao_9.BAy0cLdi.opus": {
    "type": "audio/ogg",
    "etag": "\"200a-+FjEGG5pXorKu+03edKSfWLEYwA\"",
    "mtime": "2026-05-17T00:12:09.471Z",
    "size": 8202,
    "path": "../public/_nuxt/tiao_9.BAy0cLdi.opus"
  },
  "/_nuxt/tiao_9.CEok6zfc.opus": {
    "type": "audio/ogg",
    "etag": "\"260a-mYOciGfg6GrM0VwnemH1eLutG0Q\"",
    "mtime": "2026-05-17T00:12:09.467Z",
    "size": 9738,
    "path": "../public/_nuxt/tiao_9.CEok6zfc.opus"
  },
  "/_nuxt/tong_1.ASLyqSt9.opus": {
    "type": "audio/ogg",
    "etag": "\"1df9-7n5p5U1BY1XAS2w6UkkiziBvl5o\"",
    "mtime": "2026-05-17T00:12:09.559Z",
    "size": 7673,
    "path": "../public/_nuxt/tong_1.ASLyqSt9.opus"
  },
  "/_nuxt/tong_1.BrSaCRfy.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-Nn9dQk8F/Fse7tu81jBduo8y+DQ\"",
    "mtime": "2026-05-17T00:12:09.575Z",
    "size": 15981,
    "path": "../public/_nuxt/tong_1.BrSaCRfy.mp3"
  },
  "/_nuxt/tong_1.CZPYQrgF.opus": {
    "type": "audio/ogg",
    "etag": "\"27e8-OvZd3YzjWHNfWOq5IceJzCb2Fog\"",
    "mtime": "2026-05-17T00:12:09.559Z",
    "size": 10216,
    "path": "../public/_nuxt/tong_1.CZPYQrgF.opus"
  },
  "/_nuxt/tong_2.CvDa6Xy-.opus": {
    "type": "audio/ogg",
    "etag": "\"1e2c-peW7a5e94LfrF2/tvyWlyJo+mgA\"",
    "mtime": "2026-05-17T00:12:09.663Z",
    "size": 7724,
    "path": "../public/_nuxt/tong_2.CvDa6Xy-.opus"
  },
  "/_nuxt/tong_2.B_O7vUpO.opus": {
    "type": "audio/ogg",
    "etag": "\"1e80-7r8tYyqDsZEQttoFd7ovQOW5uy4\"",
    "mtime": "2026-05-17T00:12:09.643Z",
    "size": 7808,
    "path": "../public/_nuxt/tong_2.B_O7vUpO.opus"
  },
  "/_nuxt/tong_2.5-6V8nbk.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-zQs57rGVBxi/Rkot4o6YZ2znK8g\"",
    "mtime": "2026-05-17T00:12:09.739Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_2.5-6V8nbk.mp3"
  },
  "/_nuxt/tong_4.BA-09TSc.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-EfHevfOXR+f38xh/JYxBq/1ij3U\"",
    "mtime": "2026-05-17T00:12:09.843Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_4.BA-09TSc.mp3"
  },
  "/_nuxt/tong_3.CcRoCotK.opus": {
    "type": "audio/ogg",
    "etag": "\"2b17-MKKFvMCILA3NK8SC5tbxsLLdQHo\"",
    "mtime": "2026-05-17T00:12:09.835Z",
    "size": 11031,
    "path": "../public/_nuxt/tong_3.CcRoCotK.opus"
  },
  "/_nuxt/tong_3.7dWHJco1.opus": {
    "type": "audio/ogg",
    "etag": "\"1e7f-jbYFyrvSq/eGwzrzeMg+Z2EqqqU\"",
    "mtime": "2026-05-17T00:12:09.731Z",
    "size": 7807,
    "path": "../public/_nuxt/tong_3.7dWHJco1.opus"
  },
  "/_nuxt/tong_3.DEKrXwIH.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-J7u9mUY3rcA2d7gin5640yPyYY4\"",
    "mtime": "2026-05-17T00:12:09.839Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_3.DEKrXwIH.mp3"
  },
  "/_nuxt/tong_5.DjIHYWRN.opus": {
    "type": "audio/ogg",
    "etag": "\"1d1a-gc16ZhjqfK7KNO6agvD7DrUr1YI\"",
    "mtime": "2026-05-17T00:12:09.979Z",
    "size": 7450,
    "path": "../public/_nuxt/tong_5.DjIHYWRN.opus"
  },
  "/_nuxt/tong_4.BBNfpoqv.opus": {
    "type": "audio/ogg",
    "etag": "\"1e1d-QIblfOYtf0urBo8yFLgip2AoZ3w\"",
    "mtime": "2026-05-17T00:12:09.851Z",
    "size": 7709,
    "path": "../public/_nuxt/tong_4.BBNfpoqv.opus"
  },
  "/_nuxt/tong_5.K0rUkZNE.opus": {
    "type": "audio/ogg",
    "etag": "\"1a1a-kJL6pe0FAkeLOYzaIfwUMDhBq1o\"",
    "mtime": "2026-05-17T00:12:09.987Z",
    "size": 6682,
    "path": "../public/_nuxt/tong_5.K0rUkZNE.opus"
  },
  "/_nuxt/tong_6.CsFDWZ-C.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-Tx7rStmxi9u03ITF7l/DiG9jKS4\"",
    "mtime": "2026-05-17T00:12:10.063Z",
    "size": 15981,
    "path": "../public/_nuxt/tong_6.CsFDWZ-C.mp3"
  },
  "/_nuxt/tong_7.1x946VFk.opus": {
    "type": "audio/ogg",
    "etag": "\"25fb-QZ1mu5PL8ef9t1wP2GdLcgHYotQ\"",
    "mtime": "2026-05-17T00:12:10.155Z",
    "size": 9723,
    "path": "../public/_nuxt/tong_7.1x946VFk.opus"
  },
  "/_nuxt/tong_6.2_Vj6mnN.opus": {
    "type": "audio/ogg",
    "etag": "\"2581-eQCNYsEdm6CEITJsnNbfSAH8UHg\"",
    "mtime": "2026-05-17T00:12:10.075Z",
    "size": 9601,
    "path": "../public/_nuxt/tong_6.2_Vj6mnN.opus"
  },
  "/_nuxt/tong_7.CFAtk4L8.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-QDrLzoBW3adFyNrq4p1AsGfXifc\"",
    "mtime": "2026-05-17T00:12:10.223Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_7.CFAtk4L8.mp3"
  },
  "/_nuxt/tong_8.BJCne9ib.opus": {
    "type": "audio/ogg",
    "etag": "\"228b-TBelxC3zFohfZ8zs+7ArLbZ5RoM\"",
    "mtime": "2026-05-17T00:12:10.131Z",
    "size": 8843,
    "path": "../public/_nuxt/tong_8.BJCne9ib.opus"
  },
  "/_nuxt/tong_7.D6zOYqa-.opus": {
    "type": "audio/ogg",
    "etag": "\"1dda-5IwumAx0DhJiAQFPy9DG8w40lCU\"",
    "mtime": "2026-05-17T00:12:10.235Z",
    "size": 7642,
    "path": "../public/_nuxt/tong_7.D6zOYqa-.opus"
  },
  "/_nuxt/tong_6.h-3Ur0DZ.opus": {
    "type": "audio/ogg",
    "etag": "\"1b0d-cXGEkEZaV08LneSkeFTR68pxWFU\"",
    "mtime": "2026-05-17T00:12:10.083Z",
    "size": 6925,
    "path": "../public/_nuxt/tong_6.h-3Ur0DZ.opus"
  },
  "/_nuxt/tong_4.C3YVGwQW.opus": {
    "type": "audio/ogg",
    "etag": "\"1be1-y0H5NLNNgziPXmc5CnJNnf5PD+A\"",
    "mtime": "2026-05-17T00:12:09.979Z",
    "size": 7137,
    "path": "../public/_nuxt/tong_4.C3YVGwQW.opus"
  },
  "/_nuxt/tong_5.CCBG8Jzr.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-kEmbveuXwaTTl+R4PPS95R4b6WU\"",
    "mtime": "2026-05-17T00:12:09.975Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_5.CCBG8Jzr.mp3"
  },
  "/_nuxt/tong_8.DI4P-TYv.opus": {
    "type": "audio/ogg",
    "etag": "\"19df-Zu0W/hD1VkRsqPLJyzaOGBjGL6g\"",
    "mtime": "2026-05-17T00:12:10.311Z",
    "size": 6623,
    "path": "../public/_nuxt/tong_8.DI4P-TYv.opus"
  },
  "/_nuxt/tong_8.CyV30bgV.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-tA+hZKJWIrcYrVVkM2doOHD6ksU\"",
    "mtime": "2026-05-17T00:12:10.319Z",
    "size": 15981,
    "path": "../public/_nuxt/tong_8.CyV30bgV.mp3"
  },
  "/_nuxt/tong_9.BjK4bqrK.opus": {
    "type": "audio/ogg",
    "etag": "\"1fd4-8w8PdFUYA//agAwQc+X1tdpvulU\"",
    "mtime": "2026-05-17T00:12:10.419Z",
    "size": 8148,
    "path": "../public/_nuxt/tong_9.BjK4bqrK.opus"
  },
  "/_nuxt/tong_9.CSEeg-y2.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-YLVliCOeGEv9GBAIRDtl6nTicpY\"",
    "mtime": "2026-05-17T00:12:10.475Z",
    "size": 18669,
    "path": "../public/_nuxt/tong_9.CSEeg-y2.mp3"
  },
  "/_nuxt/tong_9.Cs28q-m7.opus": {
    "type": "audio/ogg",
    "etag": "\"246f-slISHIN0SGo/KH+bQjTYsPpZ1Xg\"",
    "mtime": "2026-05-17T00:12:10.395Z",
    "size": 9327,
    "path": "../public/_nuxt/tong_9.Cs28q-m7.opus"
  },
  "/_nuxt/wan_1.1nAFOImy.opus": {
    "type": "audio/ogg",
    "etag": "\"1c00-/bdxVq8xwHemOP4FUPJ8/mQKwFc\"",
    "mtime": "2026-05-17T00:12:10.555Z",
    "size": 7168,
    "path": "../public/_nuxt/wan_1.1nAFOImy.opus"
  },
  "/_nuxt/wan_1.Bvg8q0rV.opus": {
    "type": "audio/ogg",
    "etag": "\"206f-7O+4uuWu09tgU4vbhoGvh/DZLAY\"",
    "mtime": "2026-05-17T00:12:10.563Z",
    "size": 8303,
    "path": "../public/_nuxt/wan_1.Bvg8q0rV.opus"
  },
  "/_nuxt/wan_1.DPjPxgRG.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-UkR+xeexRdBI9R5GN9M5aoaj+ck\"",
    "mtime": "2026-05-17T00:12:10.567Z",
    "size": 18669,
    "path": "../public/_nuxt/wan_1.DPjPxgRG.mp3"
  },
  "/_nuxt/wan_2.Cyne5nH2.opus": {
    "type": "audio/ogg",
    "etag": "\"1cd7-LPdUmQD/RMYgUYMKlG0Xd+Wju8U\"",
    "mtime": "2026-05-17T00:12:10.647Z",
    "size": 7383,
    "path": "../public/_nuxt/wan_2.Cyne5nH2.opus"
  },
  "/_nuxt/wan_2.DW8q-9Lo.opus": {
    "type": "audio/ogg",
    "etag": "\"1b23-YoBRiIbxgWIanHxeuWe6cfBJATw\"",
    "mtime": "2026-05-17T00:12:10.623Z",
    "size": 6947,
    "path": "../public/_nuxt/wan_2.DW8q-9Lo.opus"
  },
  "/_nuxt/wan_2.BcPMsyaK.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-EEGa8oAD6PdGV/i2ySaImQi6A44\"",
    "mtime": "2026-05-17T00:12:10.563Z",
    "size": 15981,
    "path": "../public/_nuxt/wan_2.BcPMsyaK.mp3"
  },
  "/_nuxt/wan_3.89_kAwQg.mp3": {
    "type": "audio/mpeg",
    "etag": "\"536d-7P0JKrdL9c1qHKfJHRO4IE7ne50\"",
    "mtime": "2026-05-17T00:12:10.727Z",
    "size": 21357,
    "path": "../public/_nuxt/wan_3.89_kAwQg.mp3"
  },
  "/_nuxt/wan_3.BxTfxw_i.opus": {
    "type": "audio/ogg",
    "etag": "\"2777-41cpD55EncXlT5yrnUAUKUyG59s\"",
    "mtime": "2026-05-17T00:12:10.811Z",
    "size": 10103,
    "path": "../public/_nuxt/wan_3.BxTfxw_i.opus"
  },
  "/_nuxt/wan_4.BiE_eVsr.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-itBLDnCFByEKu1T2M9pohwUi7XI\"",
    "mtime": "2026-05-17T00:12:10.819Z",
    "size": 15981,
    "path": "../public/_nuxt/wan_4.BiE_eVsr.mp3"
  },
  "/_nuxt/wan_3.hVZJRN_c.opus": {
    "type": "audio/ogg",
    "etag": "\"2482-5EeCCXvq0qzbroNI9niIT4Nx+xQ\"",
    "mtime": "2026-05-17T00:12:10.815Z",
    "size": 9346,
    "path": "../public/_nuxt/wan_3.hVZJRN_c.opus"
  },
  "/_nuxt/wan_4.TODj7-_n.opus": {
    "type": "audio/ogg",
    "etag": "\"21b6-cUeIVwAMld9u05ZnJW2kbXdHs1E\"",
    "mtime": "2026-05-17T00:12:10.831Z",
    "size": 8630,
    "path": "../public/_nuxt/wan_4.TODj7-_n.opus"
  },
  "/_nuxt/wan_4.C3vslbpq.opus": {
    "type": "audio/ogg",
    "etag": "\"1b0d-EgzDTjm7YEMVaYU2v7NdyU9hnZ8\"",
    "mtime": "2026-05-17T00:12:10.827Z",
    "size": 6925,
    "path": "../public/_nuxt/wan_4.C3vslbpq.opus"
  },
  "/_nuxt/wan_5.YT--6khl.opus": {
    "type": "audio/ogg",
    "etag": "\"1bea-v4ikpw5f7IUl2e32WpotV4Ypwwo\"",
    "mtime": "2026-05-17T00:12:10.979Z",
    "size": 7146,
    "path": "../public/_nuxt/wan_5.YT--6khl.opus"
  },
  "/_nuxt/wan_5.CprO9R5U.opus": {
    "type": "audio/ogg",
    "etag": "\"1ae9-481qtD1DAizmia/VsZcKUJSMnEE\"",
    "mtime": "2026-05-17T00:12:10.891Z",
    "size": 6889,
    "path": "../public/_nuxt/wan_5.CprO9R5U.opus"
  },
  "/_nuxt/wan_6.BRX2LprN.opus": {
    "type": "audio/ogg",
    "etag": "\"1ab7-Py4G0j/3qJbCsesAfAPA243ndvA\"",
    "mtime": "2026-05-17T00:12:10.983Z",
    "size": 6839,
    "path": "../public/_nuxt/wan_6.BRX2LprN.opus"
  },
  "/_nuxt/wan_6.BD43pl79.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-3HZFs76KpOdHGE5xydbyoX6aiyc\"",
    "mtime": "2026-05-17T00:12:10.891Z",
    "size": 15981,
    "path": "../public/_nuxt/wan_6.BD43pl79.mp3"
  },
  "/_nuxt/wan_7.BgEKrvdE.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-IrtCqVlz7oJMxql7hAg9XpUrB7o\"",
    "mtime": "2026-05-17T00:12:11.164Z",
    "size": 18669,
    "path": "../public/_nuxt/wan_7.BgEKrvdE.mp3"
  },
  "/_nuxt/wan_7.C0Gh1T1U.opus": {
    "type": "audio/ogg",
    "etag": "\"1bb4-VJ/Aa10LMjta4PBECGCZ8XAoPKI\"",
    "mtime": "2026-05-17T00:12:11.100Z",
    "size": 7092,
    "path": "../public/_nuxt/wan_7.C0Gh1T1U.opus"
  },
  "/_nuxt/wan_5.hXGrZyJz.mp3": {
    "type": "audio/mpeg",
    "etag": "\"3e6d-i+ROUoKkLYWragKABqBix3FQ8J8\"",
    "mtime": "2026-05-17T00:12:10.975Z",
    "size": 15981,
    "path": "../public/_nuxt/wan_5.hXGrZyJz.mp3"
  },
  "/_nuxt/wan_7.JkD_ixn-.opus": {
    "type": "audio/ogg",
    "etag": "\"21ca-9oZiisUVTgOhRgGl8L90xrhWbwY\"",
    "mtime": "2026-05-17T00:12:11.168Z",
    "size": 8650,
    "path": "../public/_nuxt/wan_7.JkD_ixn-.opus"
  },
  "/_nuxt/wan_8.CY7LlOce.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-TFy0ZlgkyLJJPtGm5izzqkTmjrY\"",
    "mtime": "2026-05-17T00:12:11.180Z",
    "size": 18669,
    "path": "../public/_nuxt/wan_8.CY7LlOce.mp3"
  },
  "/_nuxt/wan_6.C1QgcIYa.opus": {
    "type": "audio/ogg",
    "etag": "\"1d8f-g16bAn4r0a4K15ypywylNIOEkJ0\"",
    "mtime": "2026-05-17T00:12:10.975Z",
    "size": 7567,
    "path": "../public/_nuxt/wan_6.C1QgcIYa.opus"
  },
  "/_nuxt/wan_8.DiNg626P.opus": {
    "type": "audio/ogg",
    "etag": "\"19e0-Ef5pKcunNx7EeKiICJFn7ANb9sQ\"",
    "mtime": "2026-05-17T00:12:11.212Z",
    "size": 6624,
    "path": "../public/_nuxt/wan_8.DiNg626P.opus"
  },
  "/_nuxt/wan_8.ez5OIcZ4.opus": {
    "type": "audio/ogg",
    "etag": "\"21b3-nT4Ah12aJLG/tWe3JndQdv3stys\"",
    "mtime": "2026-05-17T00:12:11.228Z",
    "size": 8627,
    "path": "../public/_nuxt/wan_8.ez5OIcZ4.opus"
  },
  "/_nuxt/wan_9.BfN4j14G.opus": {
    "type": "audio/ogg",
    "etag": "\"22ba-tUn70iZZ1o0BXbRCQRjwKo0OCNM\"",
    "mtime": "2026-05-17T00:12:11.212Z",
    "size": 8890,
    "path": "../public/_nuxt/wan_9.BfN4j14G.opus"
  },
  "/_nuxt/wan_9.ClSn2Z44.mp3": {
    "type": "audio/mpeg",
    "etag": "\"48ed-ST0Q5Rez9NybYm4TnqRKp1mQwkk\"",
    "mtime": "2026-05-17T00:12:11.288Z",
    "size": 18669,
    "path": "../public/_nuxt/wan_9.ClSn2Z44.mp3"
  },
  "/_nuxt/wan_9.CvmQaiCC.opus": {
    "type": "audio/ogg",
    "etag": "\"1fcd-oettNRf2JdnUzy8wTNBsTc0JATE\"",
    "mtime": "2026-05-17T00:12:11.396Z",
    "size": 8141,
    "path": "../public/_nuxt/wan_9.CvmQaiCC.opus"
  },
  "/_nuxt/west.BM8nUGVx.jpg": {
    "type": "image/jpeg",
    "etag": "\"5ff9-ZJsmaCZGi9WC6RpFsuAn36O5Xxk\"",
    "mtime": "2026-05-17T00:12:11.216Z",
    "size": 24569,
    "path": "../public/_nuxt/west.BM8nUGVx.jpg"
  },
  "/_nuxt/winter.jhUNKyXG.jpg": {
    "type": "image/jpeg",
    "etag": "\"171f0-+5atYgVxM0R78HiuPIp4wEdJV/s\"",
    "mtime": "2026-05-17T00:12:11.216Z",
    "size": 94704,
    "path": "../public/_nuxt/winter.jhUNKyXG.jpg"
  },
  "/_nuxt/wochi.DDkp4oY9.opus": {
    "type": "audio/ogg",
    "etag": "\"2ab8-yMh5LpsQlaWvUbMxR/kHWkTQv2o\"",
    "mtime": "2026-05-17T00:12:11.408Z",
    "size": 10936,
    "path": "../public/_nuxt/wochi.DDkp4oY9.opus"
  },
  "/_nuxt/zaofan.DbQ3TqLB.opus": {
    "type": "audio/ogg",
    "etag": "\"5410-Vo4qCXNJ68xo1E0H4+GvGXcwhwM\"",
    "mtime": "2026-05-17T00:12:11.520Z",
    "size": 21520,
    "path": "../public/_nuxt/zaofan.DbQ3TqLB.opus"
  },
  "/_nuxt/zbIfL4o8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"345-3mvCJa4u/3JOyfAKzFZV7eVp7rs\"",
    "mtime": "2026-05-17T00:12:11.500Z",
    "size": 837,
    "path": "../public/_nuxt/zbIfL4o8.js"
  },
  "/_nuxt/zhong.Bu6vo1HV.jpg": {
    "type": "image/jpeg",
    "etag": "\"64f8-RRx/fa/YN+2CBzAbT+Bjc3x8pW4\"",
    "mtime": "2026-05-17T00:12:11.504Z",
    "size": 25848,
    "path": "../public/_nuxt/zhong.Bu6vo1HV.jpg"
  },
  "/_nuxt/zimo.OMoUfJn_.opus": {
    "type": "audio/ogg",
    "etag": "\"1f37-Cflo+5H7DkKWwpidKripxfEXJl8\"",
    "mtime": "2026-05-17T00:12:11.608Z",
    "size": 7991,
    "path": "../public/_nuxt/zimo.OMoUfJn_.opus"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-UtbxYLAILn+HuJwyqgDnNWGYiJY\"",
    "mtime": "2026-05-17T00:12:05.667Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/_nuxt/builds/meta/2e20cd6e-6f65-4e94-9064-665d15103c2c.json": {
    "type": "application/json",
    "etag": "\"58-rd/lFvmsqQi1gi/48nCW4bBGDBA\"",
    "mtime": "2026-05-17T00:12:05.659Z",
    "size": 88,
    "path": "../public/_nuxt/builds/meta/2e20cd6e-6f65-4e94-9064-665d15103c2c.json"
  },
  "/_nuxt/yumantang.mJZTBE9s.mp3": {
    "type": "audio/mpeg",
    "etag": "\"4cba09-hWB+V8ezcIBm4ZAoQdPAozghyTI\"",
    "mtime": "2026-05-17T00:12:11.236Z",
    "size": 5028361,
    "path": "../public/_nuxt/yumantang.mJZTBE9s.mp3"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};
const basename = function(p, extension) {
  const segments = normalizeWindowsPath(p).split("/");
  let lastSegment = "";
  for (let i = segments.length - 1; i >= 0; i--) {
    const val = segments[i];
    if (val) {
      lastSegment = val;
      break;
    }
  }
  return extension && lastSegment.endsWith(extension) ? lastSegment.slice(0, -extension.length) : lastSegment;
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _ctSrsf = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const _boijOk = defineEventHandler((event) => {
  var _a, _b, _c;
  const req = (_a = event.node) == null ? void 0 : _a.req;
  const url = (_b = req == null ? void 0 : req.url) != null ? _b : "/";
  const method = (_c = req == null ? void 0 : req.method) != null ? _c : "GET";
  console.log(`[request] ${formatBeijingDateTime()} ${method} ${url}`);
});

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

function baseURL() {
	
	return useRuntimeConfig().app.baseURL;
}
function buildAssetsDir() {
	
	return useRuntimeConfig().app.buildAssetsDir;
}
function buildAssetsURL(...path) {
	return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path);
}
function publicAssetsURL(...path) {
	
	const app = useRuntimeConfig().app;
	const publicBase = app.cdnURL || app.baseURL;
	return path.length ? joinRelativeURL(publicBase, ...path) : publicBase;
}

const MONGO_URI = process.env.MONGODB_URI || "mongodb://admin:***@192.168.3.241:27017/changqingge?authSource=admin";
const MONGO_DB = process.env.MONGODB_DB || "changqingge";
const LOG_COLLECTION = "apiLogs";
const IS_ENABLED = (process.env.ENABLE_API_LOG || "").toLowerCase() === "true";
let _client = null;
let _connected = false;
let _connectError = null;
async function getCollection() {
  if (!_client) {
    _client = new MongoClient(MONGO_URI, {
      connectTimeoutMS: 3e3,
      serverSelectionTimeoutMS: 3e3
    });
  }
  if (!_connected) {
    try {
      await _client.connect();
      _connected = true;
    } catch (e) {
      _connectError = e.message;
      console.warn("[ApiLog] MongoDB connect failed:", e.message);
      return null;
    }
  }
  try {
    return _client.db(MONGO_DB).collection(LOG_COLLECTION);
  } catch (e) {
    console.warn("[ApiLog] getCollection failed:", e.message);
    return null;
  }
}
async function apiLog(event, data) {
  var _a;
  if (!IS_ENABLED) return;
  try {
    const col = await getCollection();
    if (!col) return;
    let userId;
    let userName;
    try {
      const cookie = ((_a = event == null ? void 0 : event.headers) == null ? void 0 : _a.cookie) || "";
      const match = cookie.match(/user_id=([^;]+)/);
      userId = match ? decodeURIComponent(match[1]) : void 0;
    } catch {
    }
    const entry = {
      endpoint: data.endpoint,
      userId,
      userName: void 0,
      gameId: data.gameId,
      playerId: data.playerId,
      roomNumber: data.roomNumber,
      statusCode: data.statusCode,
      durationMs: data.durationMs,
      error: data.error,
      timestamp: /* @__PURE__ */ new Date()
    };
    col.insertOne(entry).catch((e) => {
      console.warn("[ApiLog] insert failed:", e.message);
    });
  } catch (e) {
    console.warn("[ApiLog] log failed:", e.message);
  }
}
async function queryApiLogs(options = {}) {
  const col = await getCollection();
  if (!col) return [];
  const filter = {};
  if (options.endpoint) filter.endpoint = options.endpoint;
  if (options.gameId) filter.gameId = options.gameId;
  if (options.playerId) filter.playerId = options.playerId;
  if (options.userId) filter.userId = options.userId;
  if (options.since) filter.timestamp = { $gte: options.since };
  if (options.onlyErrors) filter.error = { $exists: true, $ne: "" };
  return col.find(filter).sort({ timestamp: -1 }).limit(options.limit || 100).skip(options.skip || 0).toArray();
}
function getApiLogStatus() {
  if (_connectError) return { connected: false, error: _connectError };
  return { connected: _connected, clientExists: !!_client };
}

async function validateSessionToken(token) {
  if (!token) return null;
  return AuthService.validateSession(token);
}
async function resolveUserIdFromEvent(event) {
  const sessionUserId = await validateSessionToken(getCookie(event, "mahjong_session")) || await validateSessionToken(getCookie(event, "auth_token"));
  if (sessionUserId) {
    return sessionUserId;
  }
  throw createError$1({
    statusCode: 401,
    message: "Not authenticated"
  });
}
async function resolveUserFromEvent(event) {
  const userId = await resolveUserIdFromEvent(event);
  const user = await UserService.getUserById(userId);
  if (!user) {
    throw createError$1({
      statusCode: 404,
      message: "User not found"
    });
  }
  return user;
}
async function requireAdminUser(event) {
  const user = await resolveUserFromEvent(event);
  if (!user.isAdmin) {
    throw createError$1({
      statusCode: 403,
      message: "Admin privileges required"
    });
  }
  return user;
}
async function requireGamePlayerAccess(event, game, playerId, options) {
  const user = await resolveUserFromEvent(event);
  const player = game.players.find((entry) => entry.id === playerId || entry.userId === playerId);
  if (!player) {
    throw createError$1({
      statusCode: 404,
      message: "Player not found"
    });
  }
  if ((options == null ? void 0 : options.allowAdmin) && user.isAdmin) {
    return { user, player, isAdmin: true };
  }
  if (!player.userId || player.userId !== user.userId) {
    throw createError$1({
      statusCode: 403,
      message: "Forbidden"
    });
  }
  return { user, player, isAdmin: false };
}

const TEMP_DEBUG_SPECTATE_BOT_NAMES = /* @__PURE__ */ new Set(["AI-AK"]);
function getSpectatorScope(game) {
  const completedHands = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === GamePhase.ENDED ? completedHands : completedHands + 1;
}
function getSpectatorView(game, viewerId) {
  if (!game.spectatorViews) game.spectatorViews = {};
  const existing = game.spectatorViews[viewerId];
  const scope = getSpectatorScope(game);
  if (existing && existing.roundNumber === scope) {
    return existing;
  }
  const view = {
    viewingPlayerId: null,
    approvedHumanPlayerId: null,
    pendingHumanPlayerId: null,
    roundNumber: scope,
    updatedAt: Date.now()
  };
  game.spectatorViews[viewerId] = view;
  return view;
}
function clearPendingSpectatorRequests(game, requesterId, targetId) {
  const now = Date.now();
  for (const request of game.spectatorApprovalRequests || []) {
    if (request.status === "pending" && request.requesterId === requesterId && request.roundNumber === getSpectatorScope(game) && (!targetId || request.targetId === targetId)) {
      request.status = "cancelled";
      request.resolvedAt = now;
    }
  }
}
function isSpectatorTargetWatchable(target) {
  return target.status === PlayerStatus.PLAYING || target.status === PlayerStatus.WON;
}
function canUseDebugBotSpectator(viewer, target) {
  return !!viewer && !!target && viewer.id !== target.id && isBotPlayer(target) && TEMP_DEBUG_SPECTATE_BOT_NAMES.has(target.name);
}
function canRevealSpectatorTarget(game, viewerId, target) {
  var _a;
  const viewer = game.players.find((entry) => entry.id === viewerId);
  const view = (_a = game.spectatorViews) == null ? void 0 : _a[viewerId];
  if (!view || view.roundNumber !== getSpectatorScope(game) || view.viewingPlayerId !== target.id) {
    return false;
  }
  if ((viewer == null ? void 0 : viewer.status) === PlayerStatus.WON && isBotPlayer(target)) return true;
  if (canUseDebugBotSpectator(viewer, target)) return true;
  if (!viewer || viewer.status !== PlayerStatus.WON) return false;
  if (isBotPlayer(target)) return true;
  return view.approvedHumanPlayerId === target.id;
}

const collections = {
};

const DEFAULT_ENDPOINT = "https://api.iconify.design";
const _SbeVGf = defineCachedEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (!url)
    return createError$1({ status: 400, message: "Invalid icon request" });
  const options = useAppConfig().icon;
  const collectionName = event.context.params?.collection?.replace(/\.json$/, "");
  const collection = collectionName ? await collections[collectionName]?.() : null;
  const apiEndPoint = options.iconifyApiEndpoint || DEFAULT_ENDPOINT;
  const icons = url.searchParams.get("icons")?.split(",");
  if (collection) {
    if (icons?.length) {
      const data = getIcons(
        collection,
        icons
      );
      consola.debug(`[Icon] serving ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from bundled collection`);
      return data;
    }
  }
  if (options.fallbackToApi === true || options.fallbackToApi === "server-only") {
    const apiUrl = new URL("./" + basename(url.pathname) + url.search, apiEndPoint);
    consola.debug(`[Icon] fetching ${(icons || []).map((i) => "`" + collectionName + ":" + i + "`").join(",")} from iconify api`);
    if (apiUrl.host !== new URL(apiEndPoint).host) {
      return createError$1({ status: 400, message: "Invalid icon request" });
    }
    try {
      const data = await $fetch(apiUrl.href);
      return data;
    } catch (e) {
      consola.error(e);
      if (e.status === 404)
        return createError$1({ status: 404 });
      else
        return createError$1({ status: 500, message: "Failed to fetch fallback icon" });
    }
  }
  return createError$1({ status: 404 });
}, {
  group: "nuxt",
  name: "icon",
  getKey(event) {
    const collection = event.context.params?.collection?.replace(/\.json$/, "") || "unknown";
    const icons = String(getQuery(event).icons || "");
    return `${collection}_${icons.split(",")[0]}_${icons.length}_${hash$1(icons)}`;
  },
  swr: true,
  maxAge: 60 * 60 * 24 * 7
  // 1 week
});

const _SxA8c9 = defineEventHandler(() => {});

const _lazy_E9NRE3 = () => import('../routes/api/auth/debug-login.post.mjs');
const _lazy_oWntMe = () => import('../routes/api/auth/google.post.mjs');
const _lazy_1lUCZB = () => import('../routes/api/auth/google/callback.get.mjs');
const _lazy__L3iuL = () => import('../routes/api/auth/google/login.get.mjs');
const _lazy_RQvETf = () => import('../routes/api/auth/google/verify.post.mjs');
const _lazy_4WtTR4 = () => import('../routes/api/auth/login.post.mjs');
const _lazy_WMZsZm = () => import('../routes/api/auth/logout.post.mjs');
const _lazy_yApDvr = () => import('../routes/api/auth/me.get.mjs');
const _lazy_PwoXg7 = () => import('../routes/api/auth/mock-google-login.post.mjs');
const _lazy_Q_GXij = () => import('../routes/api/auth/register.post.mjs');
const _lazy_miPIBp = () => import('../routes/api/auth/users.get.mjs');
const _lazy_cSwFhG = () => import('../routes/api/debug/api-logs.get.mjs');
const _lazy_iLyd9d = () => import('../routes/api/game/action.post.mjs');
const _lazy_L3DiyR = () => import('../routes/api/game/approval-choice.post.mjs');
const _lazy_MQHsZI = () => import('../routes/api/game/bot-mode.post.mjs');
const _lazy_cGkprN = () => import('../routes/api/game/comeback.post.mjs');
const _lazy_OhkH9G = () => import('../routes/api/game/create.post.mjs');
const _lazy_LcGRQE = () => import('../routes/api/game/debug-seed-settlement.post.mjs');
const _lazy_160kAy = () => import('../routes/api/game/hu-selection.post.mjs');
const _lazy_f494fZ = () => import('../routes/api/game/join.post.mjs');
const _lazy_QecTt1 = () => import('../routes/api/game/kick-player.post.mjs');
const _lazy_rGIOnw = () => import('../routes/api/game/list.get.mjs');
const _lazy_p1qsFR = () => import('../routes/api/game/my-games.get.mjs');
const _lazy_oyb0ep = () => import('../routes/api/game/peng-chow-choice.post.mjs');
const _lazy_WSYJCB = () => import('../routes/api/game/replace-bot.post.mjs');
const _lazy_iIO6vs = () => import('../routes/api/game/replace-player.post.mjs');
const _lazy_r_D9ee = () => import('../routes/api/game/settle.post.mjs');
const _lazy_E3b3MC = () => import('../routes/api/game/spectate-approval.post.mjs');
const _lazy_YEB04u = () => import('../routes/api/game/spectate.post.mjs');
const _lazy_2dMvA3 = () => import('../routes/api/game/start.post.mjs');
const _lazy_FAcPKD = () => import('../routes/api/game/state.get.mjs');
const _lazy_SdnxPi = () => import('../routes/api/game/swap-position.post.mjs');
const _lazy_Muig60 = () => import('../routes/api/game/waiting.get.mjs');
const _lazy_RRSkF1 = () => import('../routes/api/game/win-options.get.mjs');
const _lazy_ArXCOK = () => import('../routes/api/games/_id_.get.mjs');
const _lazy_FkKSBT = () => import('../routes/api/history/list.get.mjs');
const _lazy_us4wNE = () => import('../routes/api/history/rounds.get.mjs');
const _lazy_2kgAKN = () => import('../routes/api/history/stats.get.mjs');
const _lazy_KseZLj = () => import('../routes/api/log.get.mjs');
const _lazy_PEe7Zf = () => import('../routes/api/ping.get.mjs');
const _lazy_lOppXL = () => import('../routes/api/index.get.mjs');
const _lazy_U35hUS = () => import('../routes/api/index.put.mjs');
const _lazy_IWA2cq = () => import('../routes/api/rooms/create.post.mjs');
const _lazy_iDsTWQ = () => import('../routes/api/rooms/join.post.mjs');
const _lazy_a9KGrF = () => import('../routes/api/rooms/list.get.mjs');
const _lazy_aGFwoh = () => import('../routes/api/rooms/start.post.mjs');
const _lazy_zDxNE2 = () => import('../routes/api/test-delete.post.mjs');
const _lazy_tDO_3Y = () => import('../routes/api/test-get-user.get.mjs');
const _lazy_XZk9S8 = () => import('../routes/api/test-insert.post.mjs');
const _lazy_LUMnPw = () => import('../routes/api/test-mongo-status.get.mjs');
const _lazy_DyMrvq = () => import('../routes/api/test-update.post.mjs');
const _lazy_tY5Cw3 = () => import('../routes/api/test-users.get.mjs');
const _lazy_u8Lvuh = () => import('../routes/socket.io/_..._.mjs');
const _lazy_ClY_IF = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '', handler: _ctSrsf, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _boijOk, lazy: false, middleware: true, method: undefined },
  { route: '/api/auth/debug-login', handler: _lazy_E9NRE3, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/google', handler: _lazy_oWntMe, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/google/callback', handler: _lazy_1lUCZB, lazy: true, middleware: false, method: "get" },
  { route: '/api/auth/google/login', handler: _lazy__L3iuL, lazy: true, middleware: false, method: "get" },
  { route: '/api/auth/google/verify', handler: _lazy_RQvETf, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/login', handler: _lazy_4WtTR4, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/logout', handler: _lazy_WMZsZm, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/me', handler: _lazy_yApDvr, lazy: true, middleware: false, method: "get" },
  { route: '/api/auth/mock-google-login', handler: _lazy_PwoXg7, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/register', handler: _lazy_Q_GXij, lazy: true, middleware: false, method: "post" },
  { route: '/api/auth/users', handler: _lazy_miPIBp, lazy: true, middleware: false, method: "get" },
  { route: '/api/debug/api-logs', handler: _lazy_cSwFhG, lazy: true, middleware: false, method: "get" },
  { route: '/api/game/action', handler: _lazy_iLyd9d, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/approval-choice', handler: _lazy_L3DiyR, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/bot-mode', handler: _lazy_MQHsZI, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/comeback', handler: _lazy_cGkprN, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/create', handler: _lazy_OhkH9G, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/debug-seed-settlement', handler: _lazy_LcGRQE, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/hu-selection', handler: _lazy_160kAy, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/join', handler: _lazy_f494fZ, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/kick-player', handler: _lazy_QecTt1, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/list', handler: _lazy_rGIOnw, lazy: true, middleware: false, method: "get" },
  { route: '/api/game/my-games', handler: _lazy_p1qsFR, lazy: true, middleware: false, method: "get" },
  { route: '/api/game/peng-chow-choice', handler: _lazy_oyb0ep, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/replace-bot', handler: _lazy_WSYJCB, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/replace-player', handler: _lazy_iIO6vs, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/settle', handler: _lazy_r_D9ee, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/spectate-approval', handler: _lazy_E3b3MC, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/spectate', handler: _lazy_YEB04u, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/start', handler: _lazy_2dMvA3, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/state', handler: _lazy_FAcPKD, lazy: true, middleware: false, method: "get" },
  { route: '/api/game/swap-position', handler: _lazy_SdnxPi, lazy: true, middleware: false, method: "post" },
  { route: '/api/game/waiting', handler: _lazy_Muig60, lazy: true, middleware: false, method: "get" },
  { route: '/api/game/win-options', handler: _lazy_RRSkF1, lazy: true, middleware: false, method: "get" },
  { route: '/api/games/:id', handler: _lazy_ArXCOK, lazy: true, middleware: false, method: "get" },
  { route: '/api/history/list', handler: _lazy_FkKSBT, lazy: true, middleware: false, method: "get" },
  { route: '/api/history/rounds', handler: _lazy_us4wNE, lazy: true, middleware: false, method: "get" },
  { route: '/api/history/stats', handler: _lazy_2kgAKN, lazy: true, middleware: false, method: "get" },
  { route: '/api/log', handler: _lazy_KseZLj, lazy: true, middleware: false, method: "get" },
  { route: '/api/ping', handler: _lazy_PEe7Zf, lazy: true, middleware: false, method: "get" },
  { route: '/api/profile', handler: _lazy_lOppXL, lazy: true, middleware: false, method: "get" },
  { route: '/api/profile', handler: _lazy_U35hUS, lazy: true, middleware: false, method: "put" },
  { route: '/api/rooms/create', handler: _lazy_IWA2cq, lazy: true, middleware: false, method: "post" },
  { route: '/api/rooms/join', handler: _lazy_iDsTWQ, lazy: true, middleware: false, method: "post" },
  { route: '/api/rooms/list', handler: _lazy_a9KGrF, lazy: true, middleware: false, method: "get" },
  { route: '/api/rooms/start', handler: _lazy_aGFwoh, lazy: true, middleware: false, method: "post" },
  { route: '/api/test-delete', handler: _lazy_zDxNE2, lazy: true, middleware: false, method: "post" },
  { route: '/api/test-get-user', handler: _lazy_tDO_3Y, lazy: true, middleware: false, method: "get" },
  { route: '/api/test-insert', handler: _lazy_XZk9S8, lazy: true, middleware: false, method: "post" },
  { route: '/api/test-mongo-status', handler: _lazy_LUMnPw, lazy: true, middleware: false, method: "get" },
  { route: '/api/test-update', handler: _lazy_DyMrvq, lazy: true, middleware: false, method: "post" },
  { route: '/api/test-users', handler: _lazy_tY5Cw3, lazy: true, middleware: false, method: "get" },
  { route: '/socket.io/**', handler: _lazy_u8Lvuh, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_ClY_IF, lazy: true, middleware: false, method: undefined },
  { route: '/api/_nuxt_icon/:collection', handler: _SbeVGf, lazy: false, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_ClY_IF, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server$1({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$2(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
{
  const { handleUpgrade } = nodeAdapter(nitroApp.h3App.websocket);
  server.on("upgrade", handleUpgrade);
}
const nodeServer = {};

export { defuFn as $, AuthService as A, clearPendingSpectatorRequests as B, canRevealSpectatorTarget as C, getTileDisplayName as D, getRouterParam as E, createDeck as F, GamePhase as G, shuffleTiles as H, formatBeijingDateTime as I, getDb as J, resolveUserIdFromEvent as K, buildAssetsURL as L, MatchHistoryService as M, publicAssetsURL as N, getResponseStatusText as O, PlayerStatus as P, getResponseStatus as Q, encodePath as R, defineRenderHandler as S, TileSuit as T, UserService as U, destr as V, getRouteRules as W, useNitroApp as X, klona as Y, parseURL as Z, decodePath as _, getCollection$1 as a, hasProtocol as a0, isScriptProtocol as a1, withQuery as a2, getRequestHeader as a3, isEqual as a4, sanitizeStatusCode as a5, getContext as a6, $fetch$1 as a7, baseURL as a8, executeAsync as a9, defu as aa, getRequestHeaders as ab, hash$1 as ac, serialize$1 as ad, parseQuery as ae, withTrailingSlash as af, withoutTrailingSlash as ag, nodeServer as ah, sendRedirect as b, createError$1 as c, defineEventHandler as d, getCookie as e, forceDisconnectUser as f, getQuery as g, deleteCookie as h, resolveUserFromEvent as i, joinURL as j, requireAdminUser as k, getApiLogStatus as l, ActionType as m, gameManager as n, requireGamePlayerAccess as o, emitToRoom as p, queryApiLogs as q, readBody as r, setCookie as s, apiLog as t, useRuntimeConfig as u, GameEndReason as v, getSpectatorView as w, canUseDebugBotSpectator as x, isSpectatorTargetWatchable as y, isBotPlayer as z };
//# sourceMappingURL=nitro.mjs.map
