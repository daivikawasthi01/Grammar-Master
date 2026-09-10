import bufferModule from 'buffer';
import util from 'util';

// Patch buffer module for compatibility with jwa / buffer-equal-constant-time on Node 22+
try {
  const buf = require('buffer');
  if (!buf.SlowBuffer) {
    buf.SlowBuffer = buf.Buffer;
  }
  if (buf.SlowBuffer && !buf.SlowBuffer.prototype) {
    buf.SlowBuffer.prototype = buf.Buffer.prototype;
  }
} catch (e) {}

if (!(bufferModule as any).SlowBuffer) {
  (bufferModule as any).SlowBuffer = bufferModule.Buffer;
}
if ((bufferModule as any).SlowBuffer && !(bufferModule as any).SlowBuffer.prototype) {
  (bufferModule as any).SlowBuffer.prototype = bufferModule.Buffer.prototype;
}

if (typeof globalThis !== 'undefined') {
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    if (!(globalThis as any).Buffer.SlowBuffer) {
      (globalThis as any).Buffer.SlowBuffer = (globalThis as any).Buffer;
    }
  }
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET || 'writ-ai-build-secret-key-fallback';
}

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = util.TextEncoder;
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = util.TextDecoder as any;
}

