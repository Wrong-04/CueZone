import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvoice extends Document {
  sessionId: string;

  tableId: Types.ObjectId;
  transactionId?: Types.ObjectId;
  status: "paid" | "cancelled";
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;

  receipt: Record<string, any>;

  createdAt: Date;

  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    sessionId: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { sessionId: { $type: "string" } },
      },
    },

    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    status: { type: String, enum: ["paid", "cancelled"], required: true, default: "paid" },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String, trim: true },

    receipt: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

invoiceSchema.index({ "receipt.memberId": 1, createdAt: -1 });
invoiceSchema.index({ "receipt.customerPhone": 1, createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
