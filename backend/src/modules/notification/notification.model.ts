import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Phân loại nguồn gốc phát sinh thông báo trong hệ thống:
 * - USER: Liên quan tài khoản người dùng (đổi mật khẩu, khóa tài khoản...).
 * - TABLE: Liên quan tình trạng bàn bida (bàn mở, chuyển bàn, thanh toán bàn...).
 * - PRICING: Cập nhật bảng giá dịch vụ.
 * - ROLE: Phân quyền vai trò người dùng thay đổi.
 * - WALLET: Biến động số dư ví (nạp tiền thành công, thanh toán ví...).
 * - TOURNAMENT: Giải đấu (mở đăng ký, công bố sơ đồ nhánh đấu, kết quả trận...).
 * - SYSTEM: Thông báo bảo trì hoặc cấu hình toàn hệ thống.
 */
export enum NotificationType {
  USER = "user",
  TABLE = "table",
  PRICING = "pricing",
  ROLE = "role",
  WALLET = "wallet",
  TOURNAMENT = "tournament",
  SYSTEM = "system",
}

/**
 * Interface đại diện cho thực thể Thông báo (Notification).
 */
export interface INotification extends Document {
  /** ID người dùng nhận thông báo (khóa ngoại User) */
  userId: Types.ObjectId;
  /** Tiêu đề ngắn gọn của thông báo */
  title: string;
  /** Nội dung chi tiết thông báo */
  content: string;
  /** Phân loại thông báo (NotificationType) */
  type: NotificationType;
  /** Cờ đánh dấu người dùng đã đọc thông báo hay chưa */
  isRead: boolean;
  /** Thời điểm tạo thông báo */
  createdAt: Date;
  /** Thời điểm cập nhật thông báo gần nhất */
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    // Tài khoản người nhận thông báo
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Tiêu đề thông báo
    title: { type: String, required: true, trim: true },
    // Nội dung chi tiết
    content: { type: String, required: true, trim: true },
    // Nhóm thể loại thông báo
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.SYSTEM },
    // Trạng thái đã xem/chưa xem
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Tối ưu hóa truy vấn danh sách thông báo theo thứ tự thời gian mới nhất
notificationSchema.index({ userId: 1, createdAt: -1 });
// Tối ưu hóa truy vấn đếm số lượng thông báo chưa đọc của user
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
