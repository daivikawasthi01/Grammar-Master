import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const MAX_RULES = 500;
export const MAX_GUIDANCE_NOTES = 100;

const ruleSchema = new Schema(
  {
    id: { type: String, required: true },
    preferred: { type: String, required: true, trim: true, maxlength: 100 },
    forbidden: { type: [String], default: [] },
    caseSensitive: { type: Boolean, default: true },
    kind: { type: String, enum: ["replace", "protect"], default: "replace" },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

/** One structured style guide per user. Rules are parsed once at save time, never per request. */
const styleGuideSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "My style guide",
      trim: true,
      maxlength: 100,
    },
    rules: {
      type: [ruleSchema],
      default: [],
      validate: [
        (v: unknown[]) => v.length <= MAX_RULES,
        `At most ${MAX_RULES} rules`,
      ],
    },
    // Free-text guidance that doesn't reduce to an exact term swap (e.g. "keep
    // sentences short"), matched by semantic similarity instead of regex.
    guidanceNotes: {
      type: [String],
      default: [],
      validate: [
        (v: unknown[]) => v.length <= MAX_GUIDANCE_NOTES,
        `At most ${MAX_GUIDANCE_NOTES} guidance notes`,
      ],
    },
  },
  { timestamps: true },
);

export type StyleGuideDoc = InferSchemaType<typeof styleGuideSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StyleGuide: Model<StyleGuideDoc> =
  (mongoose.models.StyleGuide as Model<StyleGuideDoc>) ||
  mongoose.model<StyleGuideDoc>("StyleGuide", styleGuideSchema);
