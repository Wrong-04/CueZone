import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPlayReview extends Document {
  sessionId: string;
  invoiceId: Types.ObjectId;
  memberId: Types.ObjectId;
  tableRating: number;
  serviceRating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const playReviewSchema = new Schema<IPlayReview>(
  {
    sessionId: { type: String, required: true, unique: true, trim: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tableRating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    serviceRating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

export const PlayReview =
  mongoose.models.PlayReview || mongoose.model<IPlayReview>("PlayReview", playReviewSchema);
