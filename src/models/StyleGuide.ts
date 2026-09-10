import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStyleGuide extends Document {
  userId: mongoose.Types.ObjectId | string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStyleGuideChunk extends Document {
  styleGuideId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  text: string;
  vectorId: string;
  createdAt: Date;
  updatedAt: Date;
}

const styleGuideSchema = new Schema<IStyleGuide>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const styleGuideChunkSchema = new Schema<IStyleGuideChunk>(
  {
    styleGuideId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    vectorId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const StyleGuide: Model<IStyleGuide> =
  mongoose.models.StyleGuide || mongoose.model<IStyleGuide>("StyleGuide", styleGuideSchema);

export const StyleGuideChunk: Model<IStyleGuideChunk> =
  mongoose.models.StyleGuideChunk ||
  mongoose.model<IStyleGuideChunk>("StyleGuideChunk", styleGuideChunkSchema);

export default StyleGuide;
