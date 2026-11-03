import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAccessoryWaste extends Document {
  disposalNumber: string;
  product: Types.ObjectId;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note?: string;
  performedBy: Types.ObjectId;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

const accessoryWasteSchema = new Schema<IAccessoryWaste>(
  {
    disposalNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
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

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      default: "WASTE",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "accessory_wastes",
  },
);

accessoryWasteSchema.index({ createdAt: -1 });
accessoryWasteSchema.index({ product: 1, createdAt: -1 });

function generateDisposalNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `XH-${yyyy}${mm}${dd}-${rand}`;
}

accessoryWasteSchema.pre("validate", function (next) {
  if (this.isNew && !this.disposalNumber) {
    this.disposalNumber = generateDisposalNumber();
  }
  next();
});

const AccessoryWaste: Model<IAccessoryWaste> =
  (mongoose.models.AccessoryWaste as Model<IAccessoryWaste>) ||
  mongoose.model<IAccessoryWaste>("AccessoryWaste", accessoryWasteSchema);

export default AccessoryWaste;

