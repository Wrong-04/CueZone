import mongoose, { Schema } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

const preOrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    isMadeToOrder: { type: Boolean, default: false },
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    customerName: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    table: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    tableName: { type: String },
    date: { type: String },
    time: { type: String },
    duration: { type: Number, default: 2, min: 1, max: 24 },
    estimatedCost: { type: Number, default: 0, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    note: { type: String, maxlength: 1000 },
    preOrderItems: { type: [preOrderItemSchema], default: [] },
    inventoryReserved: { type: Boolean, default: false },
    qrTokenHash: { type: String, select: false, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "checked_in", "confirmed", "cancelled"],
      default: "pending",
    },
    rejectionReason: { type: String, maxlength: 1000 },
    cancellationReason: { type: String, maxlength: 1000 },
    cancelledAt: { type: Date },
    checkedInAt: { type: Date },
    staff: { type: Schema.Types.ObjectId, ref: "User" },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ table: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ customer: 1, createdAt: -1 });

applyErdDefaults(bookingSchema, "Booking");

export const Booking = mongoose.model("Booking", bookingSchema);
