import mongoose from "mongoose";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test responses are asserted field by field
export type Call = { status: number; body: any; headers: Headers; cookie?: string }; 

/** Calls a route handler the way Next would, with an optional session cookie and route params. */
export async function call(
  handler: Handler,
  opts: { method?: string; path?: string; body?: unknown; form?: FormData; cookie?: string; params?: Record<string, string>; headers?: Record<string, string> } = {},
): Promise<Call> {
  const headers = new Headers(opts.headers);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers.set("content-type", "application/json");
  }
  const req = new Request(`http://localhost${opts.path ?? "/api/test"}`, { method: opts.method ?? "GET", headers, body });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* plain text body */
  }
  const setCookie = res.headers.get("set-cookie");
  const cookie = setCookie?.match(/^(gm_session=[^;]*)/)?.[1];
  return { status: res.status, body: parsed, headers: res.headers, cookie };
}

/** Empties every collection but keeps indexes (dropping the database would drop the unique indexes too). */
export async function resetDb() {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function closeDb() {
  await mongoose.disconnect();
}

let n = 0;
export async function signUp(register: Handler, overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  const res = await call(register, {
    method: "POST",
    headers: { "x-forwarded-for": `10.0.${n % 250}.${Math.floor(n / 250) + 1}` },
    body: { name: "Ada", email: `user${++n}-${Date.now()}@example.com`, password: "correct horse battery", ...overrides },
  });
  if (res.status !== 201 || !res.cookie) throw new Error(`sign up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { cookie: res.cookie, user: res.body.user as { id: string; email: string } };
}
