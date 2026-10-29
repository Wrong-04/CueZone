import mongoose, { Document, Schema } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

/**
 * Interface đại diện cho bảng giá / khung giá giờ chơi (Pricing Tier).
 * Cho phép thiết lập giá linh hoạt theo thời gian (ngày thường, cuối tuần, giờ vàng/cao điểm).
 */
export interface IPricingTier extends Document {
  /** Tên khung giá (vd: "Khung giờ vàng tối", "Cuối tuần - Ban ngày") */
  name: string;
  status?: string | null;
  type?: boolean | null;
  price?: number | null;
  priceType?: string | null;
  note?: string | null;
  /** Phân loại ngày áp dụng: weekday (ngày thường T2-T6), weekend (cuối tuần T7-CN), peak (giờ cao điểm) */
  dayType: "weekday" | "weekend" | "peak";
  /** Giờ bắt đầu áp dụng (định dạng "HH:mm", vd: "18:00") */
  startTime: string;
  /** Giờ kết thúc áp dụng (định dạng "HH:mm", vd: "23:00") */
  endTime: string;
  /** Mảng các thứ trong tuần áp dụng (0: Chủ nhật, 1: Thứ 2, ..., 6: Thứ 7) */
  daysOfWeek: number[];
  /** Đơn giá giờ chơi chi tiết theo từng hạng bàn */
  prices: {
    /** Đơn giá cho bàn tiêu chuẩn (standard) - VNĐ/giờ */
    standard: number;
    /** Đơn giá cho bàn VIP (vip) - VNĐ/giờ */
    vip: number;
    /** Đơn giá cho bàn thi đấu (match / snooker) - VNĐ/giờ */
    match?: number;
  };
  /** Trạng thái kích hoạt cấu hình khung giá */
  isActive: boolean;
  /** Cờ đánh dấu khung giá có đang nằm trong khung giờ hiện tại hay không */
  isCurrentlyActive: boolean;
  /** Thời điểm tạo khung giá */
  createdAt: Date;
  /** Thời điểm cập nhật khung giá gần nhất */
  updatedAt: Date;
}

const pricingTierSchema = new Schema<IPricingTier>(
  {
    // Tên của khung giá
    name: { type: String, required: true, trim: true },
    // Các thuộc tính ERD chưa có quy tắc quy đổi từ biểu giá nhiều hạng.
    status: { type: String, default: null },
    type: { type: Boolean, default: null },
    price: { type: Number, min: 0, default: null },
    priceType: { type: String, default: null },
    note: { type: String, default: null },
    // Loại ngày áp dụng: ngày thường, cuối tuần hoặc cao điểm
    dayType: { type: String, enum: ["weekday", "weekend", "peak"], required: true },
    // Thời điểm bắt đầu có hiệu lực (HH:mm)
    startTime: { type: String, required: true },
    // Thời điểm kết thúc hiệu lực (HH:mm)
    endTime: { type: String, required: true },
    // Các ngày trong tuần áp dụng (0 - 6)
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    // Mức giá quy định cho từng phân khúc bàn
    prices: {
      standard: { type: Number, required: true, min: 0 },
      vip: { type: Number, required: true, min: 0 },
      match: { type: Number, default: 100000 },
    },
    // Cho phép áp dụng khung giá này hay không
    isActive: { type: Boolean, default: true },
    // Trạng thái hiệu lực theo thời gian thực hiện tại
    isCurrentlyActive: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "pricing_types" }
);

applyErdDefaults(pricingTierSchema, "PricingTier");

export const PricingTier = mongoose.model<IPricingTier>("PricingTier", pricingTierSchema);
