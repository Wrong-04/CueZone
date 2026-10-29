import mongoose, { Document, Schema, Types } from "mongoose";

export enum WalletTransactionType {
  TOPUP = "topup",
  PAYMENT = "payment",
}

export enum WalletTransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface IWalletTransaction {
  _id: Types.ObjectId;

  type: WalletTransactionType;

  status: WalletTransactionStatus;

  amount: number;

  description: string;

  referenceCode: string;

  balanceAfter: number;

  reviewedBy?: Types.ObjectId;

  reviewedAt?: Date;

  createdAt: Date;
}

export interface IWallet extends Document {
  userId: Types.ObjectId;

  balance: number;

  transactions: Types.DocumentArray<IWalletTransaction>;

  createdAt: Date;

  updatedAt: Date;
}

const transactionSchema = new Schema<IWalletTransaction>({
  type: { type: String, enum: Object.values(WalletTransactionType), required: true },

  status: { type: String, enum: Object.values(WalletTransactionStatus), required: true },

  amount: { type: Number, required: true, min: 1 },

  description: { type: String, required: true, trim: true, maxlength: 250 },

  referenceCode: { type: String, required: true, trim: true },

  balanceAfter: { type: Number, required: true, min: 0 },

  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },

  reviewedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    balance: { type: Number, required: true, default: 0, min: 0 },

    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true },
);

export const Wallet = mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", walletSchema);
