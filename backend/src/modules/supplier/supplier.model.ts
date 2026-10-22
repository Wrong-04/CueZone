import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface ISupplier
  extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema =
  new Schema<ISupplier>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      contactPerson: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 20,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 150,
        default: "",
      },

      address: {
        type: String,
        trim: true,
        maxlength: 255,
        default: "",
      },

      note: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      collection: "suppliers",
    }
  );

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier ||
  mongoose.model<ISupplier>(
    "Supplier",
    supplierSchema
  );

export default Supplier;