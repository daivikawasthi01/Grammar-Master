import { authed, json } from "@/server/http";
import { restoreDocument } from "@/server/services/documents";

export const POST = authed<{ id: string }>(async ({ user, params }) => json({ document: await restoreDocument(user.id, params.id) }));
