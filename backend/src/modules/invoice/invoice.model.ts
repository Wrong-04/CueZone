import mongoose, { Schema } from "mongoose";

const invoiceSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    index: {
      unique: true,
      partialFilterExpression: { sessionId: { $type: "string" } },
    },
  },
  tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
  receipt: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const Invoice = mongoose.model("Invoice", invoiceSchema);
