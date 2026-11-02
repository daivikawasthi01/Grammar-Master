import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const emptyDoc = () => ({ type: "doc", content: [{ type: "paragraph" }] });

const documentSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Untitled document", trim: true, maxlength: 200 },
    // TipTap JSON. plainText is derived from it on every write and used for search and snippets.
    content: { type: Schema.Types.Mixed, default: emptyDoc },
    plainText: { type: String, default: "" },
    language: { type: String, default: "en-US" },
    status: { type: String, enum: ["active", "trashed"], default: "active" },
    // Only trashed documents carry deletedAt, so the TTL index purges trash and nothing else.
    deletedAt: { type: Date },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, minimize: false },
);

documentSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });
// Text indexes treat a field named "language" as a stemming override, and "en-US" is not a
// MongoDB language name, so point the override at a field that never exists.
documentSchema.index({ title: "text", plainText: "text" }, { default_language: "english", language_override: "textIndexLanguage" });
documentSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export type DocumentDoc = InferSchemaType<typeof documentSchema> & { _id: mongoose.Types.ObjectId };

export const DocumentModel: Model<DocumentDoc> =
  (mongoose.models.Document as Model<DocumentDoc>) || mongoose.model<DocumentDoc>("Document", documentSchema);
