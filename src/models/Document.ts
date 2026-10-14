import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IDocument extends MongooseDocument {
  ownerId: mongoose.Types.ObjectId;
  title: string;
  content: Record<string, any>;
  plainText: string;
  language: string;
  status: "active" | "trashed";
  deletedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Untitled Document",
      trim: true,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      default: () => ({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      }),
    },
    plainText: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "American English",
    },
    status: {
      type: String,
      enum: ["active", "trashed"],
      default: "active",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user document listing sorted by last updated
DocumentSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });

// Full text search index on title and plainText content
DocumentSchema.index({ title: "text", plainText: "text" });

// TTL index to automatically purge trash items after 30 days
DocumentSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: "trashed" } }
);

export const DocumentModel =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
