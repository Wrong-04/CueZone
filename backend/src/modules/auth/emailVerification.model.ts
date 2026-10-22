import mongoose, { Document, Schema } from "mongoose";

/**
 * Interface đại diện cho thực thể Xác thực Email Đăng ký (EmailVerification).
 * Dùng lưu trữ mã OTP xác minh khi người dùng mới đăng ký tài khoản trước khi chính thức tạo User.
 */
export interface IEmailVerification extends Document {
  /** Địa chỉ email đăng ký (viết thường, duy nhất) */
  email: string;
  /** Mã OTP xác thực (chuỗi 6 số) */
  code: string;
  /** Họ tên người dùng đăng ký */
  name: string;
  /** Mật khẩu người dùng nhập (đã mã hóa) chuẩn bị ghi vào tài khoản khi verify thành công */
  password: string;
  /** Số điện thoại của người dùng (tùy chọn) */
  phone?: string;
  /** Số lần nhập sai mã OTP (dùng chống tấn công brute-force) */
  attempts: number;
  /** Thời điểm hết hạn của mã xác thực (tự động bị xóa bởi TTL index) */
  expiresAt: Date;
  /** Thời điểm tạo yêu cầu xác thực */
  createdAt: Date;
  /** Thời điểm cập nhật gần nhất */
  updatedAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    // Email đăng ký xác thực, viết thường, duy nhất
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    // Mã OTP xác thực
    code: { type: String, required: true },
    // Họ tên người dùng đăng ký
    name: { type: String, required: true },
    // Mật khẩu đăng ký tạm thời
    password: { type: String, required: true },
    // Số điện thoại liên hệ
    phone: { type: String, trim: true },
    // Số lần đã thử nhập mã OTP
    attempts: { type: Number, default: 0 },
    // Thời điểm hết hạn của mã xác nhận
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB TTL Index: tự động xóa document này khi thời gian hiện tại vượt qua expiresAt
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerification = mongoose.model<IEmailVerification>(
  "EmailVerification",
  emailVerificationSchema
);
