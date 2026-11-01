import mongoose, { Document, Schema, Types } from "mongoose";

export enum CustomerOrderStatus {
  PENDING = "pending",
  PREPARING = "preparing",
  READY = "ready",
  SERVED = "served",
  REJECTED = "rejected",
}

export interface ICustomerOrderItem {
  productId: Types.ObjectId;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export interface ICustomerOrder extends Document {
  orderCode: string;
  customerId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableCode: string;
  tableName: string;
  sessionId: string;
  items: ICustomerOrderItem[];
  totalAmount: number;
  note?: string;
  status: CustomerOrderStatus;
  statusMessage?: string;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

const itemSchema = new Schema<ICustomerOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
  },
  { _id: false },
);

const customerOrderSchema = new Schema<ICustomerOrder>(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    tableCode: { type: String, required: true, trim: true },
    tableName: { type: String, required: true, trim: true },
    sessionId: { type: String, required: true, index: true },
    items: { type: [itemSchema], required: true, validate: (items: ICustomerOrderItem[]) => items.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: Object.values(CustomerOrderStatus),
      required: true,
      default: CustomerOrderStatus.PENDING,
      index: true,
    },
    statusMessage: { type: String, trim: true, maxlength: 500 },
    rejectedReason: { type: String, trim: true, maxlength: 500 },
    processedAt: Date,
  },
  { timestamps: true },
);

customerOrderSchema.index({ status: 1, createdAt: 1 });
customerOrderSchema.index({ customerId: 1, createdAt: -1 });

export const CustomerOrder =
  mongoose.models.CustomerOrder ||
  mongoose.model<ICustomerOrder>("CustomerOrder", customerOrderSchema);
