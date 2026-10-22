import mongoose, { Document, Schema } from "mongoose";

/**
 * Interface đại diện cho thực thể Quản lý OTP Đặt lại mật khẩu (PasswordResetOtp).
 * Lưu trữ mã OTP xác minh khi người dùng yêu cầu khôi phục mật khẩu qua Email (SCRUM-741).
 */
export interface IPasswordResetOtp extends Document {
  /** Địa chỉ email của tài khoản cần đặt lại mật khẩu */
  email: string;
  /** Mã OTP xác thực (chuỗi 6 số) */
  code: string;
  /** Số lần đã nhập sai mã OTP */
  attempts: number;
  /** Cờ đánh dấu OTP đã được sử dụng hay chưa (Business Rule: chỉ dùng 1 lần) */
  isUsed: boolean;
  /** Thời điểm hết hạn của OTP (Business Rule: có hiệu lực trong 10 phút) */
  expiresAt: Date;
  /** Thời điểm tạo yêu cầu */
  createdAt: Date;
  /** Thời điểm cập nhật */
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
  { timestamps: true }
);

// TTL index: Tự động xóa bản ghi khi quá hạn
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetOtp = mongoose.model<IPasswordResetOtp>(
  "PasswordResetOtp",
  passwordResetOtpSchema
);
