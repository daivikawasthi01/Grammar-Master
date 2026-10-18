import { authed, json, parseJson } from "@/server/http";
import { updateDocumentSchema } from "@/shared/schemas";
import { deleteDocumentPermanently, getDocument, trashDocument, updateDocument } from "@/server/services/documents";

type Params = { id: string };

export const GET = authed<Params>(async ({ user, params }) => json({ document: await getDocument(user.id, params.id) }));

// Autosave fires often, so it gets the general limit, not a stricter one.
export const PATCH = authed<Params>(async ({ req, user, params }) => {
  const input = await parseJson(req, updateDocumentSchema);
  return json(await updateDocument(user.id, params.id, input));
});

export const DELETE = authed<Params>(async ({ req, user, params }) => {
  if (new URL(req.url).searchParams.get("permanent") === "1") {
    await deleteDocumentPermanently(user.id, params.id);
  } else {
    await trashDocument(user.id, params.id);
  }
  return new Response(null, { status: 204 });
});
