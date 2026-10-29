import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvoice extends Document {
  sessionId: string;

  tableId: Types.ObjectId;
  transactionId?: Types.ObjectId;

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

    receipt: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
