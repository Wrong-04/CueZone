import mongoose, { Document, Schema, Types } from "mongoose";

export type StockCheckStatus = "draft" | "submitted" | "completed" | "cancelled";

export interface IStockCheckItem {
  product: Types.ObjectId;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  systemStock: number;
  actualStock: number | null;
  variance: number;
  varianceValue: number;
  note?: string;
}

export interface IStockCheckSummary {
  totalItems: number;
  matchedItems: number;
  surplusItems: number;
  deficitItems: number;
  totalVarianceValue: number;
}

export interface IStockCheck extends Document {
  checkCode: string;
  title: string;
  category?: string;
  status: StockCheckStatus;
  items: IStockCheckItem[];
  summary: IStockCheckSummary;
  createdBy: Types.ObjectId;
  submittedBy?: Types.ObjectId;
  submittedAt?: Date;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  note?: string;
  auditLog?: {
    action: string;
    performedBy: Types.ObjectId;
    performedAt: Date;
    details?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const stockCheckItemSchema = new Schema<IStockCheckItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    systemStock: { type: Number, required: true },
    actualStock: { type: Number, default: null },
    variance: { type: Number, default: 0 },
    varianceValue: { type: Number, default: 0 },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const stockCheckSchema = new Schema<IStockCheck>(
  {
    checkCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "all" },
    status: {
      type: String,
      enum: ["draft", "submitted", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    items: [stockCheckItemSchema],
    summary: {
      totalItems: { type: Number, default: 0 },
      matchedItems: { type: Number, default: 0 },
      surplusItems: { type: Number, default: 0 },
      deficitItems: { type: Number, default: 0 },
      totalVarianceValue: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    note: { type: String, trim: true },
    auditLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        performedAt: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
  },
  { timestamps: true },
);

export const StockCheck = mongoose.model<IStockCheck>("StockCheck", stockCheckSchema);

