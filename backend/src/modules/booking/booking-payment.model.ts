import { Schema, model, models } from "mongoose";

const bookingPaymentReceiptSchema = new Schema(
  {
    providerId: { type: String, required: true, unique: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking" },
    reference: { type: String, required: true },
    accountNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    bankPaidAt: { type: Date, required: true },
    status: { type: String, enum: ["confirmed", "refund_required"], required: true },
  },
  { timestamps: true, versionKey: false },
);

export const BookingPaymentReceipt =
  models.BookingPaymentReceipt ||
  model("BookingPaymentReceipt", bookingPaymentReceiptSchema);
