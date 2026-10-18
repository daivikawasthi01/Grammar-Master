import * as Sentry from "@sentry/nextjs";

/**
 * Error reporting. Entirely off unless SENTRY_DSN is set, so local dev and CI
 * never send anything. Request bodies, cookies and auth headers are stripped:
 * documents are private user text and must never reach a third party.
 */
export async function register() {
  // Fail at server start, not on the first login: importing env.ts validates
  // MONGODB_URI, JWT_SECRET and GROQ_API_KEY and throws if any is missing.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers["cookie"];
          delete event.request.headers["authorization"];
        }
      }
      return event;
    },
  });
}

// Reports unhandled errors thrown in route handlers and server components.
export const onRequestError = Sentry.captureRequestError;
