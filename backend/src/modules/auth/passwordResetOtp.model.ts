import mongoose, { Document, Schema } from "mongoose";

export interface IPasswordResetOtp extends Document {
  email: string;

  code: string;

  attempts: number;

  isUsed: boolean;

  expiresAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

const passwordResetOtpSchema = new Schema<IPasswordResetOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    code: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "password_reset_otps" },
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetOtp = mongoose.model<IPasswordResetOtp>(
  "PasswordResetOtp",
  passwordResetOtpSchema,
);
