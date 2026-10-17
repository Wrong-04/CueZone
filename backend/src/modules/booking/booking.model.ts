import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
  customerName: { type: String, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30 },
  customer: { type: Schema.Types.ObjectId, ref: "User" },
  tableId: { type: Schema.Types.ObjectId, ref: "Table" },
  table: { type: Schema.Types.ObjectId, ref: "Table" },
  tableName: { type: String },
  date: { type: String },
  time: { type: String },
  duration: { type: Number, default: 2, min: 1, max: 24 },
  estimatedCost: { type: Number, default: 0, min: 0 },
  deposit: { type: Number, default: 0, min: 0 },
  note: { type: String, maxlength: 1000 },
  status: { type: String, enum: ["pending", "approved", "rejected", "checked_in", "confirmed"], default: "pending" },
  rejectionReason: { type: String, maxlength: 1000 },
}, { timestamps: true });

export const Booking = mongoose.model("Booking", bookingSchema);
