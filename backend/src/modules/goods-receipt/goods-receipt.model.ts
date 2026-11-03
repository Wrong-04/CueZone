import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGoodsReceiptItem {
  product: Types.ObjectId;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface IGoodsReceipt extends Document {
  receiptNumber: string;
  supplier: Types.ObjectId;
  items: IGoodsReceiptItem[];
  totalAmount: number;
  status: "draft" | "completed";
  note?: string;
  createdBy: Types.ObjectId;
  completedBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const goodsReceiptItemSchema = new Schema<IGoodsReceiptItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, "Số lượng phải lớn hơn 0"] },
    unitCost: { type: Number, required: true, min: [0, "Đơn giá không được âm"] },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const goodsReceiptSchema = new Schema<IGoodsReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: { type: [goodsReceiptItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["draft", "completed"], default: "draft" },
    note: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "goods_receipts",
  },
);

goodsReceiptSchema.index({ receiptNumber: 1 });
goodsReceiptSchema.index({ status: 1 });
goodsReceiptSchema.index({ supplier: 1 });
goodsReceiptSchema.index({ createdAt: -1 });

export const GoodsReceipt =
  mongoose.models.GoodsReceipt ||
  mongoose.model<IGoodsReceipt>("GoodsReceipt", goodsReceiptSchema);

export default GoodsReceipt;
