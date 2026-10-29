import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { applyErdDefaults } from "../../config/erd-fields";

export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CASHIER = "cashier",
  WAREHOUSE = "warehouse",
  REFEREE = "referee",
  CUSTOMER = "customer",
}

export interface IUser extends Document {
  name: string;
  userName?: string | null;

  status?: string | null;

  email: string;

  password: string;

  role: UserRole;

  phone?: string;
  dateOfBirth?: Date;

  avatar?: string;

  isActive: boolean;

  isLocked: boolean;

  branch?: string;

  position?: string;

  createdAt: Date;

  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      index: {
        name: "phone_1_v2",
        unique: true,
        partialFilterExpression: { phone: { $type: "string" } },
      },
    },
    dateOfBirth: { type: Date, default: null },
    userName: { type: String, trim: true, default: null },
    status: { type: String, default: null },

    avatar: { type: String },

    isActive: { type: Boolean, default: true },

    isLocked: { type: Boolean, default: false },

    branch: { type: String },

    position: { type: String },
  },
  { timestamps: true },
);

applyErdDefaults(userSchema, "User");

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
