import mongoose, { Schema } from "mongoose";

export type TournamentPaymentIntentStatus =
  | "awaiting_payment"
  | "paid_pending"
  | "confirmed"
  | "refund_required"
  | "reconciliation_required";

const intentSchema = new Schema({
  tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  accountNumber: String,
  bankCode: String,
  accountName: String,
  deadline: { type: Date, required: true },
  name: { type: String, required: true },
  avatar: String,
  phone: String,
  status: {
    type: String,
    enum: [
      "awaiting_payment",
      "paid_pending",
      "confirmed",
      "refund_required",
      "reconciliation_required",
    ],
    default: "awaiting_payment",
    index: true,
  },
}, { timestamps: true });
intentSchema.index({ tournament: 1, user: 1 }, { unique: true });

const receiptSchema = new Schema({
  providerId: { type: String, required: true, unique: true },
  reference: String,
  intent: { type: Schema.Types.ObjectId, ref: "TournamentPaymentIntent" },
  tournament: { type: Schema.Types.ObjectId, ref: "Tournament", index: true },
  accountNumber: { type: String, required: true },
  amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  bankPaidAt: { type: Date, required: true },
  receivedAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const TournamentPaymentIntent = mongoose.models.TournamentPaymentIntent || mongoose.model("TournamentPaymentIntent", intentSchema);
export const TournamentPaymentReceipt = mongoose.models.TournamentPaymentReceipt || mongoose.model("TournamentPaymentReceipt", receiptSchema);
