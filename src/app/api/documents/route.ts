import { authed, json, parseJson, parseQuery } from "@/server/http";
import { createDocumentSchema, listDocumentsSchema, MAX_UPLOAD_BYTES, type Language } from "@/shared/schemas";
import { createDocument, importFile, listDocuments } from "@/server/services/documents";
import { AppError } from "@/server/errors";
import type { PMNode } from "@/shared/tiptap-text";

export const GET = authed(async ({ req, user }) => {
  const query = parseQuery(req, listDocumentsSchema);
  return json({ documents: await listDocuments(user.id, query) });
});

/** JSON creates a blank (or given) document; multipart/form-data with a "file" field imports one. */
export const POST = authed(async ({ req, user }) => {
  const type = req.headers.get("content-type") ?? "";
  if (type.startsWith("multipart/form-data")) {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Files can be at most 5 MB.");
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "Attach a file in the “file” field.");
    const { title, content } = await importFile(file);
    return json({ document: await createDocument(user.id, { title, content, language: user.language as Language }) }, 201);
  }
  const input = await parseJson(req, createDocumentSchema);
  return json({ document: await createDocument(user.id, { ...input, language: input.language ?? (user.language as Language), content: input.content as PMNode | undefined }) }, 201);
});
