/**
 * One-off migration from the original data shape to the current one.
 *
 *   users.documents[] / users.trashs[]  ->  documents collection (same _id, so re-runs are no-ops)
 *   users.password                      ->  users.passwordHash
 *
 * Dry run by default. With --apply it first writes a JSON backup of every user it touches.
 *
 *   MONGODB_URI=... node scripts/migrate-documents.ts            # report only
 *   MONGODB_URI=... node scripts/migrate-documents.ts --apply    # back up, then migrate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { MongoClient, type Db, type ObjectId } from "mongodb";
import { docToPlainText, plainTextToDoc, type PMNode } from "../src/shared/tiptap-text.ts";

type LegacyDoc = {
  _id: ObjectId;
  title?: string;
  text?: string;
  content?: unknown;
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSaved?: Date;
};

type LegacyUser = { _id: ObjectId; password?: string; passwordHash?: string; documents?: LegacyDoc[]; trashs?: LegacyDoc[] };

export type MigrationReport = { users: number; documentsToCreate: number; documentsExisting: number; passwordsToRename: number; applied: boolean; backupFile?: string };

const LANGUAGE_MAP: Record<string, string> = { "American English": "en-US", "British English": "en-GB", "Canadian English": "en-CA", "Australian English": "en-AU" };

function toContent(d: LegacyDoc): PMNode {
  const c = d.content as PMNode | undefined;
  if (c && c.type === "doc" && Array.isArray(c.content) && c.content.length) return c;
  return plainTextToDoc(d.text ?? "");
}

export async function migrate(db: Db, opts: { apply: boolean; backupDir?: string; log?: (m: string) => void }): Promise<MigrationReport> {
  const log = opts.log ?? console.log;
  const users = db.collection<LegacyUser>("users");
  const documents = db.collection("documents");
  const candidates = await users
    .find({ $or: [{ "documents.0": { $exists: true } }, { "trashs.0": { $exists: true } }, { password: { $exists: true } }] })
    .toArray();

  const report: MigrationReport = { users: candidates.length, documentsToCreate: 0, documentsExisting: 0, passwordsToRename: 0, applied: opts.apply };
  if (opts.apply && candidates.length) {
    const dir = opts.backupDir ?? "backups";
    mkdirSync(dir, { recursive: true });
    report.backupFile = `${dir}/users-before-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    writeFileSync(report.backupFile, JSON.stringify(candidates, null, 2));
    log(`Backup written to ${report.backupFile}`);
  }

  for (const user of candidates) {
    const legacy = [
      ...(user.documents ?? []).map((d) => ({ d, status: "active" as const })),
      ...(user.trashs ?? []).map((d) => ({ d, status: "trashed" as const })),
    ];
    for (const { d, status } of legacy) {
      if (await documents.findOne({ _id: d._id }, { projection: { _id: 1 } })) {
        report.documentsExisting++;
        continue;
      }
      report.documentsToCreate++;
      if (!opts.apply) continue;
      const content = toContent(d);
      const now = new Date();
      await documents.insertOne({
        _id: d._id,
        ownerId: user._id,
        title: d.title?.trim() || "Untitled document",
        content,
        plainText: docToPlainText(content),
        language: LANGUAGE_MAP[d.language ?? ""] ?? "en-US",
        status,
        ...(status === "trashed" ? { deletedAt: d.updatedAt ?? now } : {}),
        version: 1,
        createdAt: d.createdAt ?? now,
        updatedAt: d.updatedAt ?? d.lastSaved ?? now,
      });
    }
    if (user.password && !user.passwordHash) {
      report.passwordsToRename++;
      if (opts.apply) await users.updateOne({ _id: user._id }, { $rename: { password: "passwordHash" } });
    }
    // The embedded arrays are removed only after every document is safely in the new collection.
    if (opts.apply && legacy.length) {
      const migrated = await documents.countDocuments({ _id: { $in: legacy.map((l) => l.d._id) } });
      if (migrated === legacy.length) await users.updateOne({ _id: user._id }, { $unset: { documents: 1, trashs: 1, prompts: 1 } });
    }
  }
  return report;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI");
  const apply = process.argv.includes("--apply");
  const client = await MongoClient.connect(uri);
  try {
    const report = await migrate(client.db(), { apply });
    console.log(JSON.stringify(report, null, 2));
    if (!apply) console.log("Dry run only. Re-run with --apply to back up and migrate.");
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
