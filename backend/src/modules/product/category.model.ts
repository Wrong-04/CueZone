import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  code: string;
  scope?: "fnb" | "warehouse";
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    scope: {
      type: String,
      enum: ["fnb", "warehouse"],
      default: "fnb",
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "categories",
  },
);

categorySchema.index({ code: 1 }, { unique: true });

categorySchema.index({ isActive: 1 });

categorySchema.index({ scope: 1, isActive: 1 });

const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>("Category", categorySchema);

export default Category;
