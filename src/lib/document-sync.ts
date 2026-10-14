import mongoose from "mongoose";
import User from "@/app/db/schema";
import DocumentModel from "@/models/Document";

/**
 * Idempotently migrates any legacy embedded documents in User.documents and User.trashs
 * into the standalone documents collection for the given user.
 */
export async function syncLegacyUserDocuments(userId: string): Promise<void> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;

  try {
    const user = (await User.findById(userId).lean()) as any;
    if (!user) return;

    // 1. Migrate active documents
    if (Array.isArray(user.documents) && user.documents.length > 0) {
      for (const doc of user.documents) {
        if (!doc._id) continue;
        const exists = await DocumentModel.findById(doc._id);
        if (!exists) {
          const plainText = doc.text || "";
          await DocumentModel.create({
            _id: doc._id,
            ownerId: user._id,
            title: doc.title || "Untitled Document",
            plainText,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: plainText }],
                },
              ],
            },
            language: doc.language || "American English",
            status: "active",
            version: 1,
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.lastSaved || doc.updatedAt || new Date(),
          });
        }
      }
    }

    // 2. Migrate trash documents
    if (Array.isArray(user.trashs) && user.trashs.length > 0) {
      for (const trash of user.trashs) {
        if (!trash._id) continue;
        const exists = await DocumentModel.findById(trash._id);
        if (!exists) {
          const plainText = trash.text || "";
          await DocumentModel.create({
            _id: trash._id,
            ownerId: user._id,
            title: trash.title || "Untitled Document",
            plainText,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: plainText }],
                },
              ],
            },
            language: trash.language || "American English",
            status: "trashed",
            deletedAt: new Date(),
            version: 1,
            createdAt: trash.createdAt || new Date(),
            updatedAt: trash.updatedAt || new Date(),
          });
        }
      }
    }
  } catch (err) {
    console.error("Document sync error:", err);
  }
}
