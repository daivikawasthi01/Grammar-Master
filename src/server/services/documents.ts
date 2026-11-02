import "server-only";
import { Types } from "mongoose";
import mammoth from "mammoth";
import { connectDb } from "@/server/db";
import { DocumentModel, emptyDoc, type DocumentDoc } from "@/server/models/Document";
import { AppError, notFound } from "@/server/errors";
import { docToPlainText, markdownToDoc, plainTextToDoc, snippetOf, type PMNode } from "@/shared/tiptap-text";
import { MAX_UPLOAD_BYTES, type Language, type UpdateDocumentInput } from "@/shared/schemas";

export type DocumentSummary = {
  id: string;
  title: string;
  snippet: string;
  wordCount: number;
  language: string;
  status: "active" | "trashed";
  version: number;
  updatedAt: string;
  deletedAt: string | null;
};

export type DocumentDetail = DocumentSummary & { content: PMNode };

const oid = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw notFound("Document");
  return new Types.ObjectId(id);
};

const wordCount = (s: string) => s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;

function toSummary(d: Pick<DocumentDoc, "_id" | "title" | "plainText" | "language" | "status" | "version" | "updatedAt" | "deletedAt">): DocumentSummary {
  return {
    id: String(d._id),
    title: d.title || "Untitled document",
    snippet: snippetOf(d.plainText ?? ""),
    wordCount: wordCount(d.plainText ?? ""),
    language: d.language ?? "en-US",
    status: d.status as "active" | "trashed",
    version: d.version ?? 1,
    updatedAt: new Date(d.updatedAt as unknown as string).toISOString(),
    deletedAt: d.deletedAt ? new Date(d.deletedAt as unknown as string).toISOString() : null,
  };
}

const toDetail = (d: DocumentDoc): DocumentDetail => ({ ...toSummary(d), content: (d.content as PMNode) ?? emptyDoc() });

export async function listDocuments(ownerId: string, opts: { status: "active" | "trashed"; q?: string }): Promise<DocumentSummary[]> {
  await connectDb();
  const filter: Record<string, unknown> = { ownerId: oid(ownerId), status: opts.status };
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { plainText: rx }];
  }
  // Metadata only: never send every document's full content to the dashboard.
  const docs = await DocumentModel.find(filter, { content: 0 }).sort({ updatedAt: -1 }).limit(500).lean();
  return docs.map(toSummary);
}

export async function createDocument(ownerId: string, input: { title?: string; content?: PMNode; language?: Language }): Promise<DocumentDetail> {
  await connectDb();
  const content: PMNode = input.content ?? emptyDoc();
  const doc = await DocumentModel.create({
    ownerId: oid(ownerId),
    title: input.title?.trim() || "Untitled document",
    content,
    plainText: docToPlainText(content),
    language: input.language ?? "en-US",
  });
  return toDetail(doc.toObject());
}

export async function getDocument(ownerId: string, id: string): Promise<DocumentDetail> {
  await connectDb();
  // Owner is part of the query: another user's id is indistinguishable from a missing one.
  const doc = await DocumentModel.findOne({ _id: oid(id), ownerId: oid(ownerId) }).lean();
  if (!doc) throw notFound("Document");
  return toDetail(doc as DocumentDoc);
}

/** Optimistic concurrency in one query: the update only applies if the client saw the latest version. */
export async function updateDocument(ownerId: string, id: string, input: UpdateDocumentInput): Promise<{ version: number; updatedAt: string }> {
  await connectDb();
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title || "Untitled document";
  if (input.language !== undefined) set.language = input.language;
  if (input.content !== undefined) {
    set.content = input.content;
    set.plainText = docToPlainText(input.content as PMNode);
  }
  const updated = await DocumentModel.findOneAndUpdate(
    { _id: oid(id), ownerId: oid(ownerId), version: input.baseVersion, status: "active" },
    { $set: set, $inc: { version: 1 } },
    { new: true, projection: { version: 1, updatedAt: 1 } },
  ).lean();
  if (updated) return { version: updated.version ?? 1, updatedAt: new Date(updated.updatedAt as unknown as string).toISOString() };

  const current = await DocumentModel.findOne({ _id: oid(id), ownerId: oid(ownerId) }, { version: 1, status: 1 }).lean();
  if (!current) throw notFound("Document");
  if (current.status === "trashed") throw new AppError("VERSION_CONFLICT", "This document is in the trash. Restore it to keep editing.", { status: "trashed" });
  throw new AppError("VERSION_CONFLICT", "This document was changed in another tab or device.", { currentVersion: current.version });
}

export async function trashDocument(ownerId: string, id: string): Promise<void> {
  await connectDb();
  const res = await DocumentModel.updateOne(
    { _id: oid(id), ownerId: oid(ownerId), status: "active" },
    { $set: { status: "trashed", deletedAt: new Date() }, $inc: { version: 1 } },
  );
  if (!res.matchedCount) {
    const exists = await DocumentModel.exists({ _id: oid(id), ownerId: oid(ownerId) });
    if (!exists) throw notFound("Document");
  }
}

export async function restoreDocument(ownerId: string, id: string): Promise<DocumentSummary> {
  await connectDb();
  const doc = await DocumentModel.findOneAndUpdate(
    { _id: oid(id), ownerId: oid(ownerId) },
    { $set: { status: "active" }, $unset: { deletedAt: 1 }, $inc: { version: 1 } },
    { new: true, projection: { content: 0 } },
  ).lean();
  if (!doc) throw notFound("Document");
  return toSummary(doc);
}

export async function deleteDocumentPermanently(ownerId: string, id: string): Promise<void> {
  await connectDb();
  // Only from the trash, so a stray request cannot destroy an active document in one step.
  const res = await DocumentModel.deleteOne({ _id: oid(id), ownerId: oid(ownerId), status: "trashed" });
  if (!res.deletedCount) {
    const exists = await DocumentModel.exists({ _id: oid(id), ownerId: oid(ownerId) });
    if (!exists) throw notFound("Document");
    throw new AppError("VERSION_CONFLICT", "Move the document to the trash before deleting it permanently.");
  }
}

export async function emptyTrash(ownerId: string): Promise<number> {
  await connectDb();
  const res = await DocumentModel.deleteMany({ ownerId: oid(ownerId), status: "trashed" });
  return res.deletedCount ?? 0;
}

/** Converts an uploaded file into a TipTap document. Never substitutes placeholder text on failure. */
export async function importFile(file: File): Promise<{ title: string; content: PMNode }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Files can be at most 5 MB.");
  const name = file.name || "Untitled";
  const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const title = name.replace(/\.[^.]+$/, "").slice(0, 200) || "Untitled document";
  if (ext === ".doc") throw new AppError("UNSUPPORTED_FILE", "Old .doc files are not supported. Save it as .docx and upload again.");
  if (ext === ".docx") {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = (await mammoth.extractRawText({ buffer })).value;
    } catch {
      throw new AppError("UNSUPPORTED_FILE", "That .docx file could not be read. It may be damaged.");
    }
    return { title, content: plainTextToDoc(text) };
  }
  if (ext === ".txt" || ext === ".md") {
    const text = await file.text();
    if (text.includes("\u0000")) throw new AppError("UNSUPPORTED_FILE", "That file is not plain text.");
    return { title, content: ext === ".md" ? markdownToDoc(text) : plainTextToDoc(text) };
  }
  throw new AppError("UNSUPPORTED_FILE", "Upload a .docx, .txt or .md file.");
}
