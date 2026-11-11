import mongoose, { type Document } from "mongoose";

export interface IProduct extends Document {
  name: string;

  sku: string;
  category: "accessory" | "drink" | "food" | "snack" | "ingredient" | string;
  unit: string;

  costPrice: number;

  salePrice: number;

  stock: number;

  minStock: number;

  supplierId?: mongoose.Types.ObjectId | string | null;

  imageUrl?: string;

  description?: string;

  isForSale: boolean;

  isActive: boolean;

  isMadeToOrder?: boolean;
  isTheMakeToOrder?: boolean;
  isthemaketoorder?: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true },

    sku: { type: String, required: true, unique: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },

    unit: { type: String, required: true },

    costPrice: { type: Number, default: 0 },

    salePrice: { type: Number, default: 0 },

    stock: { type: Number, default: 0 },

    minStock: { type: Number, default: 10 },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    imageUrl: { type: String },

    description: { type: String },

    isForSale: { type: Boolean, default: true },

    isActive: { type: Boolean, default: true },

    isMadeToOrder: { type: Boolean, default: false },
    isTheMakeToOrder: { type: Boolean, default: false },
    isthemaketoorder: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
