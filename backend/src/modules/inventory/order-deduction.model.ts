import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IOrderDeductionItem {
  product: Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  previousStock: number;
  newStock: number;
}

export interface IOrderStockDeduction extends Document {
  orderId: string;
  tableId?: Types.ObjectId;
  tableName?: string;
  sessionId?: string;
  items: IOrderDeductionItem[];
  totalQuantity: number;
  status: "CONFIRMED" | "PROCESSED";
  processedAt: Date;
  deductedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderDeductionItemSchema = new Schema<IOrderDeductionItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderStockDeductionSchema = new Schema<IOrderStockDeduction>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    tableId: {
      type: Schema.Types.ObjectId,
      ref: "Table",
    },

    tableName: {
      type: String,
      trim: true,
      default: "",
    },

    sessionId: {
      type: String,
      trim: true,
    },

    items: {
      type: [orderDeductionItemSchema],
      required: true,
      validate: {
        validator: (arr: IOrderDeductionItem[]) => Array.isArray(arr) && arr.length > 0,
        message: "Đơn bán hàng phải có ít nhất một mặt hàng để trừ kho.",
      },
    },

    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["CONFIRMED", "PROCESSED"],
      default: "CONFIRMED",
    },

    processedAt: {
      type: Date,
      default: Date.now,
    },

    deductedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "order_stock_deductions",
  },
);

orderStockDeductionSchema.index({ createdAt: -1 });

const OrderStockDeduction: Model<IOrderStockDeduction> =
  (mongoose.models.OrderStockDeduction as Model<IOrderStockDeduction>) ||
  mongoose.model<IOrderStockDeduction>("OrderStockDeduction", orderStockDeductionSchema);

export default OrderStockDeduction;

