import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** AI calls per user per calendar month (UTC), counted with an atomic conditional $inc. */
const usageSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  period: { type: String, required: true }, // e.g. "2026-10"
  used: { type: Number, default: 0 },
});

usageSchema.index({ ownerId: 1, period: 1 }, { unique: true });

export type UsageDoc = InferSchemaType<typeof usageSchema> & { _id: mongoose.Types.ObjectId };

export const Usage: Model<UsageDoc> =
  (mongoose.models.Usage as Model<UsageDoc>) || mongoose.model<UsageDoc>("Usage", usageSchema);
