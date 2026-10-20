import mongoose, { type Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: "accessory" | "drink" | "food" | "snack" | "ingredient";
  unit: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
  description?: string;
  isForSale: boolean;
  isActive: boolean;
}

const ProductSchema = new mongoose.Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ["accessory", "drink", "food", "snack", "ingredient"],
      required: true,
    },
    unit: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 10 },
    imageUrl: { type: String },
    description: { type: String },
    isForSale: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
