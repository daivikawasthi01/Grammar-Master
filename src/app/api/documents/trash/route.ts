import { authed, json } from "@/server/http";
import { emptyTrash } from "@/server/services/documents";

export const DELETE = authed(async ({ user }) => json({ deleted: await emptyTrash(user.id) }));
