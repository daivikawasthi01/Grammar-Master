import { call, closeDb, resetDb, signUp } from "../../../../test/api";
import * as register from "../auth/register/route";
import * as documents from "../documents/route";
import * as document from "../documents/[id]/route";
import * as restore from "../documents/[id]/restore/route";
import * as trash from "../documents/trash/route";

afterAll(closeDb);
beforeEach(resetDb);

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

async function create(cookie: string, body: object = {}) {
  const res = await call(documents.POST as never, { method: "POST", cookie, body });
  expect(res.status).toBe(201);
  return res.body.document as { id: string; version: number };
}

describe("documents", () => {
  it("creates, lists metadata only, loads, and saves with a version", async () => {
    const { cookie } = await signUp(register.POST as never);
    const created = await create(cookie, { title: "Plan" });
    expect(created.version).toBe(1);

    const saved = await call(document.PATCH as never, { method: "PATCH", cookie, params: { id: created.id }, body: { baseVersion: 1, content: doc("Hello world, this is a test."), title: "Plan v2" } });
    expect(saved.status).toBe(200);
    expect(saved.body.version).toBe(2);

    const list = await call(documents.GET as never, { cookie, path: "/api/documents" });
    expect(list.body.documents).toEqual([expect.objectContaining({ id: created.id, title: "Plan v2", snippet: "Hello world, this is a test.", wordCount: 6 })]);
    expect(list.body.documents[0].content).toBeUndefined();

    const loaded = await call(document.GET as never, { cookie, params: { id: created.id } });
    expect(loaded.body.document.content).toEqual(doc("Hello world, this is a test."));
  });

  it("answers 409 when a stale tab saves, instead of overwriting newer text", async () => {
    const { cookie } = await signUp(register.POST as never);
    const { id } = await create(cookie);
    await call(document.PATCH as never, { method: "PATCH", cookie, params: { id }, body: { baseVersion: 1, content: doc("tab A") } });
    const stale = await call(document.PATCH as never, { method: "PATCH", cookie, params: { id }, body: { baseVersion: 1, content: doc("tab B") } });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "VERSION_CONFLICT", details: { currentVersion: 2 } });
    const loaded = await call(document.GET as never, { cookie, params: { id } });
    expect(loaded.body.document.content).toEqual(doc("tab A"));
  });

  it("hides other users' documents behind 404", async () => {
    const a = await signUp(register.POST as never);
    const b = await signUp(register.POST as never);
    const { id } = await create(a.cookie, { title: "Private" });
    for (const [handler, method, body] of [
      [document.GET, "GET", undefined],
      [document.PATCH, "PATCH", { baseVersion: 1, title: "pwned" }],
      [document.DELETE, "DELETE", undefined],
      [restore.POST, "POST", undefined],
    ] as const) {
      const res = await call(handler as never, { method, cookie: b.cookie, params: { id }, body });
      expect(res.status).toBe(404);
    }
    expect((await call(documents.GET as never, { cookie: b.cookie, path: "/api/documents" })).body.documents).toEqual([]);
    expect((await call(document.GET as never, { cookie: a.cookie, params: { id } })).body.document.title).toBe("Private");
  });

  it("answers 404 for a malformed id", async () => {
    const { cookie } = await signUp(register.POST as never);
    expect((await call(document.GET as never, { cookie, params: { id: "not-an-id" } })).status).toBe(404);
  });

  it("trashes, lists trash, restores, and deletes permanently only from the trash", async () => {
    const { cookie } = await signUp(register.POST as never);
    const { id } = await create(cookie, { title: "Old" });
    const directDelete = await call(document.DELETE as never, { method: "DELETE", cookie, params: { id }, path: `/api/documents/${id}?permanent=1` });
    expect(directDelete.status).toBe(409);

    expect((await call(document.DELETE as never, { method: "DELETE", cookie, params: { id }, path: `/api/documents/${id}` })).status).toBe(204);
    expect((await call(documents.GET as never, { cookie, path: "/api/documents" })).body.documents).toEqual([]);
    const trashed = await call(documents.GET as never, { cookie, path: "/api/documents?status=trashed" });
    expect(trashed.body.documents[0]).toMatchObject({ id, status: "trashed", deletedAt: expect.any(String) });

    // Saving a trashed document is refused rather than silently resurrecting it.
    const save = await call(document.PATCH as never, { method: "PATCH", cookie, params: { id }, body: { baseVersion: 2, title: "x" } });
    expect(save.status).toBe(409);

    const restored = await call(restore.POST as never, { method: "POST", cookie, params: { id } });
    expect(restored.body.document).toMatchObject({ status: "active", deletedAt: null });

    await call(document.DELETE as never, { method: "DELETE", cookie, params: { id }, path: `/api/documents/${id}` });
    expect((await call(document.DELETE as never, { method: "DELETE", cookie, params: { id }, path: `/api/documents/${id}?permanent=1` })).status).toBe(204);
    expect((await call(document.GET as never, { cookie, params: { id } })).status).toBe(404);
  });

  it("empties the trash", async () => {
    const { cookie } = await signUp(register.POST as never);
    for (const t of ["a", "b"]) {
      const { id } = await create(cookie, { title: t });
      await call(document.DELETE as never, { method: "DELETE", cookie, params: { id }, path: `/api/documents/${id}` });
    }
    await create(cookie, { title: "keep" });
    expect((await call(trash.DELETE as never, { method: "DELETE", cookie })).body.deleted).toBe(2);
    expect((await call(documents.GET as never, { cookie, path: "/api/documents" })).body.documents).toHaveLength(1);
  });

  it("searches title and text", async () => {
    const { cookie } = await signUp(register.POST as never);
    const { id } = await create(cookie, { title: "Quarterly report", content: doc("Revenue grew in Q3.") });
    await create(cookie, { title: "Shopping list", content: doc("Milk and eggs") });
    const byTitle = await call(documents.GET as never, { cookie, path: "/api/documents?q=quarterly" });
    const byText = await call(documents.GET as never, { cookie, path: "/api/documents?q=revenue" });
    expect(byTitle.body.documents.map((d: { id: string }) => d.id)).toEqual([id]);
    expect(byText.body.documents.map((d: { id: string }) => d.id)).toEqual([id]);
  });

  describe("upload", () => {
    const upload = (cookie: string, name: string, content: BlobPart, type = "text/plain") => {
      const form = new FormData();
      form.set("file", new File([content], name, { type }));
      return call(documents.POST as never, { method: "POST", cookie, form });
    };

    it("imports .txt and .md into structured content", async () => {
      const { cookie } = await signUp(register.POST as never);
      const txt = await upload(cookie, "notes.txt", "First paragraph.\n\nSecond paragraph.");
      expect(txt.status).toBe(201);
      expect(txt.body.document.title).toBe("notes");
      expect(txt.body.document.content.content).toHaveLength(2);
      const md = await upload(cookie, "readme.md", "# Title\n\n- one\n- two");
      expect(md.body.document.content.content.map((n: { type: string }) => n.type)).toEqual(["heading", "bulletList"]);
    });

    it("rejects .doc with a clear message and never substitutes placeholder text", async () => {
      const { cookie } = await signUp(register.POST as never);
      const res = await upload(cookie, "old.doc", "binary", "application/msword");
      expect(res.status).toBe(415);
      expect(res.body.error.message).toMatch(/\.docx/);
      expect((await call(documents.GET as never, { cookie, path: "/api/documents" })).body.documents).toEqual([]);
    });

    it("rejects unreadable .docx and files over 5 MB", async () => {
      const { cookie } = await signUp(register.POST as never);
      expect((await upload(cookie, "broken.docx", "not a zip")).status).toBe(415);
      expect((await upload(cookie, "big.txt", "x".repeat(5 * 1024 * 1024 + 1))).status).toBe(413);
      expect((await upload(cookie, "image.png", "png")).status).toBe(415);
    });
  });
});
