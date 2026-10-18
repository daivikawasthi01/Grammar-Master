import { call, closeDb, resetDb, signUp } from "../../../../test/api";
import * as register from "../auth/register/route";
import * as login from "../auth/login/route";
import * as logout from "../auth/logout/route";
import * as me from "../me/route";
import * as password from "../me/password/route";
import * as email from "../me/email/route";
import * as documents from "../documents/route";
import * as document from "../documents/[id]/route";
import * as restore from "../documents/[id]/restore/route";
import * as trash from "../documents/trash/route";
import * as styleGuide from "../style-guide/route";
import * as styleImport from "../style-guide/import/route";
import * as check from "../check/route";
import * as rewrite from "../rewrite/route";
import * as tone from "../tone/route";

afterAll(closeDb);
beforeEach(resetDb);

describe("every protected route", () => {
  const routes: Array<[string, (req: Request, ctx: never) => Promise<Response>]> = [
    ["GET /api/me", me.GET],
    ["PATCH /api/me", me.PATCH],
    ["DELETE /api/me", me.DELETE],
    ["POST /api/me/password", password.POST],
    ["POST /api/me/email", email.POST],
    ["GET /api/documents", documents.GET],
    ["POST /api/documents", documents.POST],
    ["DELETE /api/documents/trash", trash.DELETE],
    ["GET /api/documents/:id", document.GET],
    ["PATCH /api/documents/:id", document.PATCH],
    ["DELETE /api/documents/:id", document.DELETE],
    ["POST /api/documents/:id/restore", restore.POST],
    ["GET /api/style-guide", styleGuide.GET],
    ["PUT /api/style-guide", styleGuide.PUT],
    ["POST /api/style-guide/import", styleImport.POST],
    ["POST /api/check", check.POST],
    ["POST /api/rewrite", rewrite.POST],
    ["POST /api/tone", tone.POST],
  ];

  it.each(routes)("%s answers 401 without a session", async (_name, handler) => {
    const res = await call(handler as never, { method: "POST", body: {}, params: { id: "64b7f0000000000000000000" } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a forged cookie", async () => {
    const res = await call(me.GET as never, { cookie: "gm_session=eyJhbGciOiJIUzI1NiJ9.eyJzaWQiOiJ4In0.bad" });
    expect(res.status).toBe(401);
  });
});

describe("register and login", () => {
  it("registers, sets an HTTP-only cookie and returns the profile", async () => {
    const res = await call(register.POST as never, { method: "POST", body: { name: "Ada", email: "Ada@Example.com ", password: "correct horse battery" } });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Ada", email: "ada@example.com" });
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const profile = await call(me.GET as never, { cookie: res.cookie });
    expect(profile.status).toBe(200);
    expect(profile.body.usage).toMatchObject({ used: 0, limit: 5 });
  });

  it("answers 409 for a duplicate email and 422 for a weak password", async () => {
    await signUp(register.POST as never, { email: "dup@example.com" });
    const dup = await call(register.POST as never, { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: { name: "B", email: "DUP@example.com", password: "correct horse battery" } });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMAIL_TAKEN");
    const weak = await call(register.POST as never, { method: "POST", headers: { "x-forwarded-for": "9.9.9.8" }, body: { name: "B", email: "b@example.com", password: "short" } });
    expect(weak.status).toBe(422);
  });

  it("gives the same error for an unknown email and a wrong password", async () => {
    await signUp(register.POST as never, { email: "known@example.com" });
    const wrong = await call(login.POST as never, { method: "POST", headers: { "x-forwarded-for": "1.1.1.1" }, body: { email: "known@example.com", password: "nope nope nope" } });
    const unknown = await call(login.POST as never, { method: "POST", headers: { "x-forwarded-for": "1.1.1.2" }, body: { email: "ghost@example.com", password: "nope nope nope" } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("rate-limits repeated failed logins for one account", async () => {
    await signUp(register.POST as never, { email: "target@example.com" });
    let last = 0;
    for (let i = 0; i < 10; i++) {
      last = (await call(login.POST as never, { method: "POST", headers: { "x-forwarded-for": `2.2.2.${i}` }, body: { email: "target@example.com", password: "guess guess guess" } })).status;
    }
    expect(last).toBe(429);
  });

  it("logout revokes the session server-side, not just the cookie", async () => {
    const { cookie } = await signUp(register.POST as never);
    await call(logout.POST as never, { method: "POST", cookie });
    // The old token is still validly signed; it must still be refused.
    expect((await call(me.GET as never, { cookie })).status).toBe(401);
  });

  it("a password change needs the current password and signs out other sessions", async () => {
    const { cookie, user } = await signUp(register.POST as never, { email: "pw@example.com" });
    const other = await call(login.POST as never, { method: "POST", headers: { "x-forwarded-for": "3.3.3.3" }, body: { email: user.email, password: "correct horse battery" } });
    const bad = await call(password.POST as never, { method: "POST", cookie, body: { currentPassword: "wrong", newPassword: "another long password" } });
    expect(bad.status).toBe(401);
    const ok = await call(password.POST as never, { method: "POST", cookie, body: { currentPassword: "correct horse battery", newPassword: "another long password" } });
    expect(ok.status).toBe(200);
    expect((await call(me.GET as never, { cookie })).status).toBe(200);
    expect((await call(me.GET as never, { cookie: other.cookie })).status).toBe(401);
  });

  it("ignores any user id the client sends", async () => {
    const a = await signUp(register.POST as never);
    const b = await signUp(register.POST as never);
    const res = await call(me.PATCH as never, { method: "PATCH", cookie: a.cookie, body: { name: "Renamed", _id: b.user.id, id: b.user.id } });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(a.user.id);
    expect((await call(me.GET as never, { cookie: b.cookie })).body.user.name).toBe("Ada");
  });
});
