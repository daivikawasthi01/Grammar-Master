import { randomUUID } from "crypto";
import pino from "pino";

/**
 * Structured JSON logger. One line per event, safe to ship to any log drain.
 * - Secrets and credentials are redacted wherever they appear in a logged object.
 * - Silent under Jest unless LOG_LEVEL is set.
 * - No pino transport (worker threads do not survive Next.js bundling); to read logs
 *   locally run `npm run dev:pretty`.
 */
export function createLogger(destination?: pino.DestinationStream) {
  return pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: { service: "grammar-master" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "newPassword",
      "currentPassword",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.newPassword",
      "*.currentPassword",
      "*.token",
      "*.authorization",
      "*.cookie",
      "headers.cookie",
      "headers.authorization",
      "req.headers.cookie",
      "req.headers.authorization",
    ],
    censor: "[redacted]",
  },
  serializers: { err: pino.stdSerializers.err },
  }, destination);
}

export const logger = createLogger();

export const REQUEST_ID_HEADER = "x-request-id";

/** Request id set by middleware; falls back to a fresh id when called outside a request. */
export function getRequestId(req?: { headers: { get(name: string): string | null } }): string {
  return req?.headers.get(REQUEST_ID_HEADER) || randomUUID();
}

/** Logger bound to one request, so every line for that request shares an id. */
export function getLogger(req: { headers: { get(name: string): string | null }; method?: string; url?: string }, route?: string) {
  let path: string | undefined;
  try {
    path = req.url ? new URL(req.url).pathname : undefined;
  } catch {
    path = undefined;
  }
  return logger.child({
    requestId: getRequestId(req),
    route: route ?? path,
    method: req.method,
  });
}
