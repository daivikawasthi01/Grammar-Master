import "server-only";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { Logger } from "pino";
import { getLogger, getRequestId } from "@/lib/logger";
import { AppError } from "@/server/errors";
import { requireUser, type SessionUser } from "@/server/auth/session";
import { enforceRateLimit, type PolicyName } from "@/server/rate-limit";

export type ApiErrorBody = {
  error: { code: string; message: string; requestId: string; details?: Record<string, unknown> };
};

type BaseContext<P> = { req: Request; params: P; log: Logger; requestId: string };
type AuthedContext<P> = BaseContext<P> & { user: SessionUser };

type RouteOptions = {
  /** Rate-limit policy applied per user (or per IP for public routes). Defaults to "api". */
  rateLimit?: PolicyName | false;
};

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

export function errorResponse(err: unknown, log: Logger, requestId: string): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    if (err.status >= 500) log.error({ err, code: err.code }, err.message);
    else log.info({ code: err.code, status: err.status }, "request rejected");
    return NextResponse.json(
      { error: { code: err.code, message: err.message, requestId, ...(err.details ? { details: err.details } : {}) } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: issues[0]?.message ?? "Invalid input", requestId, details: { issues } } },
      { status: 422 },
    );
  }
  const isDbDown = err instanceof Error && /ECONNREFUSED|Server selection timed out|MongoNetworkError/i.test(`${err.name} ${err.message}`);
  log.error({ err }, "unhandled route error");
  return NextResponse.json(
    {
      error: {
        code: isDbDown ? "DB_UNAVAILABLE" : "INTERNAL",
        message: isDbDown ? "The database is unavailable. Your changes were not saved." : "Something went wrong",
        requestId,
      },
    },
    { status: isDbDown ? 503 : 500 },
  );
}

/** A route that requires a signed-in user. The user always comes from the session, never from the request body. */
export function authed<P = Record<string, string>>(
  handler: (ctx: AuthedContext<P>) => Promise<Response>,
  options: RouteOptions = {},
) {
  return async (req: Request, context: NextRouteContext): Promise<Response> => {
    const requestId = getRequestId(req);
    const log = getLogger(req);
    try {
      const user = await requireUser(req);
      const policy = options.rateLimit ?? "api";
      if (policy) await enforceRateLimit(policy, `${policy}:${user.id}`);
      const params = (await context?.params) as P;
      return await handler({ req, params, log: log.child({ userId: user.id }), requestId, user });
    } catch (err) {
      return errorResponse(err, log, requestId);
    }
  };
}

/** A route that does not require a session (login, register, health). Rate limiting is up to the handler. */
export function publicRoute<P = Record<string, string>>(handler: (ctx: BaseContext<P>) => Promise<Response>) {
  return async (req: Request, context: NextRouteContext): Promise<Response> => {
    const requestId = getRequestId(req);
    const log = getLogger(req);
    try {
      const params = (await context?.params) as P;
      return await handler({ req, params, log, requestId });
    } catch (err) {
      return errorResponse(err, log, requestId);
    }
  };
}

export const MAX_JSON_BYTES = 1_000_000;

/** Parse and validate a JSON body. Oversized or malformed bodies are rejected before parsing. */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large");
  const raw = await req.text();
  if (raw.length > MAX_JSON_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large");
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new AppError("BAD_REQUEST", "Body must be valid JSON");
  }
  return schema.parse(body);
}

export function parseQuery<S extends z.ZodType>(req: Request, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

export const json = <T>(data: T, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);
