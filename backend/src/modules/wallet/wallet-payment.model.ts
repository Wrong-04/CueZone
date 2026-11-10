import mongoose, { Document, Schema, Types } from "mongoose";
import { WalletTransactionStatus } from "./wallet.model";

export interface IWalletPayment extends Document {
  userId: Types.ObjectId;
  referenceCode: string;
  amount: number;
  status: WalletTransactionStatus;
  responseCode?: string;
  transactionNo?: string;
  bankCode?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const walletPaymentSchema = new Schema<IWalletPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referenceCode: { type: String, required: true, unique: true, trim: true },
    amount: { type: Number, required: true, enum: [100000, 200000, 500000] },
    status: {
      type: String,
      enum: Object.values(WalletTransactionStatus),
      required: true,
      default: WalletTransactionStatus.PENDING,
    },
    responseCode: { type: String, trim: true },
    transactionNo: { type: String, trim: true },
    bankCode: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export const WalletPayment =
  mongoose.models.WalletPayment ||
  mongoose.model<IWalletPayment>("WalletPayment", walletPaymentSchema);
