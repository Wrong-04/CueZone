import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type InventoryTransactionType = "in" | "out" | "adjustment";

export interface IInventoryTransaction extends Document {
  product: Types.ObjectId;
  type: InventoryTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "inventory_transactions",
  },
);

inventoryTransactionSchema.index({
  product: 1,
  createdAt: -1,
});

const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>("InventoryTransaction", inventoryTransactionSchema);

export default InventoryTransaction;
