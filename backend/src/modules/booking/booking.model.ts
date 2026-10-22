import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Trạng thái yêu cầu đặt bàn:
 * - pending: Chờ duyệt.
 * - approved: Đã duyệt / đồng ý giữ bàn.
 * - rejected: Từ chối đặt bàn.
 * - checked_in: Khách đã đến nhận bàn và mở phiên chơi.
 * - confirmed: Khách đã xác nhận tham gia.
 */
export type BookingStatus = "pending" | "approved" | "rejected" | "checked_in" | "confirmed";

/**
 * Interface đại diện cho thực thể Đặt bàn trước (Booking).
 */
export interface IBooking extends Document {
  /** Tên khách hàng đặt bàn */
  customerName?: string;
  /** Số điện thoại liên hệ đặt bàn */
  phone?: string;
  /** Tham chiếu tài khoản người dùng (nếu khách đặt qua tài khoản hệ thống) */
  customer?: Types.ObjectId;
  /** ID bàn bida được đặt trước */
  tableId?: Types.ObjectId;
  /** Trường tương thích tham chiếu bàn */
  table?: Types.ObjectId;
  /** Tên bàn bida tại thời điểm tạo đơn đặt bàn */
  tableName?: string;
  /** Ngày đặt bàn (định dạng "YYYY-MM-DD") */
  date?: string;
  /** Giờ bắt đầu nhận bàn (định dạng "HH:mm") */
  time?: string;
  /** Thời lượng dự kiến chơi tính bằng giờ (mặc định 2 giờ, từ 1 - 24 giờ) */
  duration: number;
  /** Chi phí tiền giờ tạm tính ước tính ban đầu (VNĐ) */
  estimatedCost: number;
  /** Số tiền khách đã thanh toán đặt cọc để giữ bàn (VNĐ) */
  deposit: number;
  /** Ghi chú yêu cầu đặc biệt của khách hàng hoặc nhân viên */
  note?: string;
  /** Trạng thái hiện tại của đơn đặt bàn */
  status: BookingStatus;
  /** Lý do từ chối đơn đặt bàn (nếu đơn bị từ chối) */
  rejectionReason?: string;
  /** Thời điểm tạo đơn đặt */
  createdAt: Date;
  /** Thời điểm cập nhật đơn đặt gần nhất */
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    // Tên khách hàng
    customerName: { type: String, trim: true, maxlength: 120 },
    // Số điện thoại liên lạc
    phone: { type: String, trim: true, maxlength: 30 },
    // Khóa ngoại liên kết bảng User
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    // Khóa ngoại liên kết bảng Table (ID bàn)
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    // Trường alias bàn tương thích
    table: { type: Schema.Types.ObjectId, ref: "Table" },
    // Tên bàn lưu snapshot
    tableName: { type: String },
    // Ngày hẹn chơi (YYYY-MM-DD)
    date: { type: String },
    // Giờ hẹn chơi (HH:mm)
    time: { type: String },
    // Thời lượng chơi dự kiến (số giờ)
    duration: { type: Number, default: 2, min: 1, max: 24 },
    // Chi phí dự kiến tạm tính
    estimatedCost: { type: Number, default: 0, min: 0 },
    // Số tiền khách chuyển cọc trước
    deposit: { type: Number, default: 0, min: 0 },
    // Ghi chú của khách hoặc thu ngân
    note: { type: String, maxlength: 1000 },
    // Trạng thái xử lý đặt bàn
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "checked_in", "confirmed"],
      default: "pending",
    },
    // Lý do không nhận đặt bàn
    rejectionReason: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
