import mongoose, { Document, Schema } from "mongoose";

export interface IEmailVerification extends Document {
  email: string;
  code: string;
  name: string;
  password: string;
  phone?: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification = mongoose.model<IEmailVerification>(
  "EmailVerification",
  emailVerificationSchema
);
