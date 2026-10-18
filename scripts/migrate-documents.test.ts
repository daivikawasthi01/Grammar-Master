import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import { migrate } from "./migrate-documents";

let client: MongoClient;
beforeAll(async () => {
  client = await MongoClient.connect(process.env.MONGODB_URI!);
});
afterAll(() => client.close());

it("moves embedded documents out of users, is a no-op on re-run, and backs up first", async () => {
  const db = client.db();
  const userId = new ObjectId();
  const docA = new ObjectId();
  const docB = new ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    email: "legacy@example.com",
    name: "Legacy",
    password: "$2b$12$hash",
    prompts: 3,
    documents: [{ _id: docA, title: "Kept", text: "Hello there.\n\nSecond paragraph.", language: "British English", updatedAt: new Date("2026-01-02") }],
    trashs: [{ _id: docB, title: "Binned", text: "Old." }],
  } as never);

  const dry = await migrate(db, { apply: false, log: () => {} });
  expect(dry).toMatchObject({ users: 1, documentsToCreate: 2, passwordsToRename: 1, applied: false });
  expect(await db.collection("documents").countDocuments()).toBe(0);

  const backupDir = mkdtempSync(join(tmpdir(), "gm-backup-"));
  const applied = await migrate(db, { apply: true, backupDir, log: () => {} });
  expect(applied.documentsToCreate).toBe(2);
  expect(JSON.parse(readFileSync(applied.backupFile!, "utf8"))[0].documents).toHaveLength(1);

  const kept = await db.collection("documents").findOne({ _id: docA });
  expect(kept).toMatchObject({ ownerId: userId, title: "Kept", status: "active", language: "en-GB", plainText: "Hello there.\nSecond paragraph.", version: 1 });
  expect(kept!.content.content).toHaveLength(2);
  expect(await db.collection("documents").findOne({ _id: docB })).toMatchObject({ status: "trashed", deletedAt: expect.any(Date) });

  const user = await db.collection("users").findOne({ _id: userId });
  expect(user).toMatchObject({ passwordHash: "$2b$12$hash" });
  expect(user).not.toHaveProperty("password");
  expect(user).not.toHaveProperty("documents");

  const again = await migrate(db, { apply: true, backupDir, log: () => {} });
  expect(again).toMatchObject({ users: 0, documentsToCreate: 0 });
  expect(await db.collection("documents").countDocuments()).toBe(2);
});
