import mongoose, { Document, Schema, Types } from "mongoose";

export enum VoucherDiscountType {
  PERCENT = "percent",
  FIXED = "fixed",
}

export type VoucherTargetAudience = "all" | "new_member" | "vip";

export interface IVoucher extends Document {
  code: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  startsAt: Date;
  expiresAt?: Date | null;
  maxUses?: number;
  usageCount: number;
  isActive: boolean;
  targetAudience?: VoucherTargetAudience;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVoucherUsage extends Document {
  voucherId: Types.ObjectId;
  code: string;
  sessionId: string;
  invoiceCode: string;
  tableId: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  customerId?: Types.ObjectId;
  subtotal: number;
  discountAmount: number;
  usedAt: Date;
}

const voucherSchema = new Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 32 },
    description: { type: String, trim: true, maxlength: 250 },
    discountType: { type: String, enum: Object.values(VoucherDiscountType), required: true },
    discountValue: { type: Number, required: true, min: 1 },
    maxDiscountAmount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, required: true, min: 0, default: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: false, default: null },
    maxUses: { type: Number, min: 1 },
    usageCount: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
    targetAudience: { type: String, enum: ["all", "new_member", "vip"], default: "all" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true },
);

const voucherUsageSchema = new Schema<IVoucherUsage>(
  {
    voucherId: { type: Schema.Types.ObjectId, ref: "Voucher", required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    sessionId: { type: String, required: true, unique: true },
    invoiceCode: { type: String, required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

export const Voucher =
  mongoose.models.Voucher || mongoose.model<IVoucher>("Voucher", voucherSchema);
export const VoucherUsage =
  mongoose.models.VoucherUsage ||
  mongoose.model<IVoucherUsage>("VoucherUsage", voucherUsageSchema);
