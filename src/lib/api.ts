/**
 * Typed fetch wrapper. Every non-2xx response becomes an ApiError carrying the
 * server's error code, so callers switch on `code`, never on message text.
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "EMAIL_TAKEN"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INTERNAL"
  | "AI_UNAVAILABLE"
  | "DB_UNAVAILABLE"
  | "NETWORK"
  | "ABORTED";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (e: unknown, code?: ApiErrorCode): e is ApiError => e instanceof ApiError && (!code || e.code === code);

type Options = Omit<RequestInit, "body"> & { body?: unknown; form?: FormData };

async function send(path: string, opts: Options = {}): Promise<Response> {
  const { body, form, headers, ...init } = opts;
  const h = new Headers(headers);
  let payload: BodyInit | undefined;
  if (form) payload = form;
  else if (body !== undefined) {
    h.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init, headers: h, body: payload });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new ApiError("ABORTED", "Request cancelled", 0);
    throw new ApiError("NETWORK", navigator.onLine ? "Could not reach the server." : "You are offline.", 0);
  }
  if (!res.ok) {
    let data: { error?: { code?: ApiErrorCode; message?: string; details?: Record<string, unknown>; requestId?: string } } = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON error body */
    }
    const e = data.error;
    const error = new ApiError(e?.code ?? "INTERNAL", e?.message ?? `Request failed (${res.status})`, res.status, e?.details, e?.requestId ?? res.headers.get("x-request-id") ?? undefined);
    if (error.code === "UNAUTHENTICATED" && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("gm:unauthenticated"));
    throw error;
  }
  return res;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await send(path, opts);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** For streamed responses (rewrites): yields text chunks as they arrive. */
export async function* apiStream(path: string, opts: Options = {}): AsyncGenerator<string> {
  const res = await send(path, opts);
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Human message for an error, with the request id when there is one so users can quote it. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "RATE_LIMITED") return "You're going a little fast. Try again in a moment.";
    return err.requestId && err.status >= 500 ? `${err.message} (ref ${err.requestId.slice(0, 8)})` : err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
