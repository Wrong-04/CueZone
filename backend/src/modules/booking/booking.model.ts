import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
  tableName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true, min: 1, max: 24 },
  estimatedCost: { type: Number, required: true, min: 0 },
  deposit: { type: Number, default: 0, min: 0 },
  note: { type: String, maxlength: 1000 },
  status: { type: String, enum: ["pending", "approved", "rejected", "checked_in"], default: "pending" },
  rejectionReason: { type: String, maxlength: 1000 },
}, { timestamps: true });

export const Booking = mongoose.model("Booking", bookingSchema);
