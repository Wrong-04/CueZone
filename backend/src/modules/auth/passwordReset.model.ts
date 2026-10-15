import mongoose, { Document, Schema } from "mongoose";

export enum ResetPurpose {
  RESET = "reset",
  CHANGE = "change",
}

export interface IPasswordReset extends Document {
  email: string;
  purpose: ResetPurpose;
  code: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: {
      type: String,
      enum: Object.values(ResetPurpose),
      required: true,
    },
    code: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mỗi email + purpose chỉ có 1 yêu cầu OTP đang mở
passwordResetSchema.index({ email: 1, purpose: 1 }, { unique: true });

// Tự xóa bản ghi khi hết hạn (TTL)
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model<IPasswordReset>(
  "PasswordReset",
  passwordResetSchema
);
