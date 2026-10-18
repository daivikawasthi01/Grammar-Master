import { Writable } from "stream";
import { createLogger, getRequestId, getLogger } from "./logger";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()));
      cb();
    },
  });
  return { lines, log: createLogger(stream) };
}

describe("logger", () => {
  beforeAll(() => {
    process.env.LOG_LEVEL = "info";
  });

  it("redacts credentials at any depth", () => {
    const { lines, log } = capture();
    log.info({ password: "hunter2", user: { token: "abc", cookie: "t=1" }, headers: { authorization: "Bearer x" } }, "event");
    const out = JSON.stringify(lines[0]);
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("Bearer x");
    expect(out).not.toContain('"abc"');
    expect(out).toContain("[redacted]");
  });

  it("serializes errors with a stack", () => {
    const { lines, log } = capture();
    log.error({ err: new Error("boom") }, "failed");
    expect((lines[0].err as { message: string }).message).toBe("boom");
  });

  it("uses the request id set by middleware, or makes one", () => {
    const withId = new Headers({ "x-request-id": "req-123" });
    expect(getRequestId({ headers: withId })).toBe("req-123");
    expect(getRequestId({ headers: new Headers() })).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("binds request id and route to a child logger", () => {
    const child = getLogger({ headers: new Headers({ "x-request-id": "r1" }), method: "POST", url: "http://x/api/check" });
    expect(child.bindings()).toMatchObject({ requestId: "r1", route: "/api/check", method: "POST" });
  });
});
