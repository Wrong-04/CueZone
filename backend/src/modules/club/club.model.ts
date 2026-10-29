import mongoose, { Schema } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

const money = {
  type: Number,
  min: 0,
  validate: (value: number | null) => value == null || Number.isSafeInteger(value),
};
const quantity = { type: Number, min: 1, validate: Number.isSafeInteger, required: true };
const itemSchema = new Schema(
  {
    tableSessionId: { type: Schema.Types.ObjectId, ref: "TableSession" },
    goodsReceiptId: { type: Schema.Types.ObjectId, ref: "GoodsReceipt" },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity,
    unitPrice: { ...money, required: true },
    totalPrice: { ...money, required: true },
    note: String,
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderCode: { type: String, required: true, unique: true, trim: true },
    name: String,
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    session: { type: Schema.Types.ObjectId, ref: "TableSession" },
    table: { type: Schema.Types.ObjectId, ref: "Table" },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    orderType: {
      type: String,
      enum: ["table_order", "pos_takeaway", "online_portal"],
      default: "table_order",
    },
    items: { type: [itemSchema], default: [] },
    subtotal: { ...money, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "served", "paid", "cancelled"],
      default: "pending",
    },
    paymentType: String,
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
    servedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    notes: String,
  },
  { timestamps: true, collection: "orders" },
);
orderSchema.index({ session: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $type: "objectId" } } },
);

const sessionSchema = new Schema(
  {
    sessionId: String,
    table: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    openedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voucher: { type: Schema.Types.ObjectId, ref: "Voucher" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "transferred", "merged"],
      required: true,
    },
    pauses: [
      new Schema(
        { pauseStart: { type: Date, required: true }, pauseEnd: Date, duration: Number },
        { _id: false },
      ),
    ],
    totalPausedMinutes: { type: Number, min: 0 },
    actualPlayingMinutes: { type: Number, min: 0 },
    pricingSnapshot: { pricePerHour: money, tierName: String },
    items: { type: [itemSchema], default: [] },
    review: {
      type: new Schema(
        {
          rating: { type: Number, min: 1, max: 5, required: true },
          comment: String,
          reviewedAt: Date,
        },
        { _id: false },
      ),
    },
    notes: String,
  },
  { timestamps: true, collection: "table_sessions" },
);
sessionSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } },
);
sessionSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { order: { $type: "objectId" } } },
);
sessionSchema.index({ table: 1, startTime: -1 });
sessionSchema.index({ customer: 1, startTime: -1 });

const receiptSchema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    name: String,
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    items: { type: [itemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    totalAmount: { ...money, required: true },
    status: { type: String, enum: ["draft", "completed", "cancelled"], default: "draft" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, default: null },
    completedAt: Date,
    note: String,
  },
  { timestamps: true, collection: "goods_receipts" },
);
receiptSchema.index({ supplier: 1, createdAt: -1 });

const transactionSchema = new Schema(
  {
    amount: { ...money, required: true },
    currency: { type: String, enum: ["VND"], default: "VND" },
    paymentMethod: {
      type: String,
      enum: ["cash", "wallet", "bank_transfer", "transfer", "vnpay", "card", "mixed"],
      required: true,
    },
    transactionCode: { type: String, trim: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "completed", "failed", "refunded"], required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: Date,
  },
  { timestamps: true, collection: "transactions" },
);
transactionSchema.index(
  { transactionCode: 1 },
  { unique: true, partialFilterExpression: { transactionCode: { $type: "string" } } },
);
transactionSchema.index({ status: 1, createdAt: -1 });

const voucherSchema = new Schema(
  {
    name: String,
    code: { type: String, required: true, unique: true, trim: true },
    discountType: { type: String, enum: ["percent", "fixed"], required: true },
    discountValue: { ...money, required: true },
    minOrderAmount: money,
    maxUses: { type: Number, min: 0, validate: Number.isSafeInteger },
    usedCount: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },

    date: { type: Date, default: null },
    expiredAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "vouchers" },
);
voucherSchema.pre("validate", function () {
  if (this.discountType === "percent" && this.discountValue > 100)
    this.invalidate("discountValue", "Giảm phần trăm không vượt 100");
});
voucherSchema.index({ isActive: 1, expiredAt: 1 });

const newsSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    imageUrl: String,
    category: { type: String, default: "news" },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
    time: { type: Date, default: null },
    status: { type: String, default: null },
  },
  { timestamps: true, collection: "news" },
);
newsSchema.index({ isPublished: 1, createdAt: -1 });

for (const [model, schema] of [
  ["Order", orderSchema],
  ["TableSession", sessionSchema],
  ["GoodsReceipt", receiptSchema],
  ["Transaction", transactionSchema],
  ["Voucher", voucherSchema],
  ["News", newsSchema],
] as const)
  applyErdDefaults(schema, model);

sessionSchema.pre("validate", function () {
  for (const item of this.items) item.tableSessionId = this._id;
});
receiptSchema.pre("validate", function () {
  for (const item of this.items) item.goodsReceiptId = this._id;
});

export const Order = mongoose.model("Order", orderSchema);
export const TableSessionHistory = mongoose.model("TableSession", sessionSchema);
export const GoodsReceipt = mongoose.model("GoodsReceipt", receiptSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
export const Voucher = mongoose.model("Voucher", voucherSchema);
export const News = mongoose.model("News", newsSchema);
