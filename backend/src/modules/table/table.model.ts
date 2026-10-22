import mongoose, { Document, Schema } from "mongoose";

/**
 * 3 thể loại bàn bida chuẩn được hệ thống hỗ trợ:
 * - POOL: Bida lỗ (bida 8 bi, 9 bi, 10 bi...).
 * - CAROM: Bida phăng / bida 3 băng (Libre, 3Cushion).
 * - SNOOKER: Bida Snooker (bàn kích thước lớn kiểu Anh).
 */
export enum TableType {
  POOL = "pool",
  CAROM = "carom",
  SNOOKER = "snooker",
}

/**
 * Bảng ánh xạ tương thích ngược từ các mã loại bàn cũ sang 3 loại chuẩn
 */
export const LEGACY_TABLE_TYPE_MAP: Record<string, TableType> = {
  standard_9ft: TableType.POOL,
  standard: TableType.POOL,
  nine_ball: TableType.POOL,
  full_ball: TableType.POOL,
  vip_bank_pool: TableType.CAROM,
  vip: TableType.CAROM,
  libre: TableType.CAROM,
  three_cushion: TableType.CAROM,
  match_ksteel: TableType.SNOOKER,
  match: TableType.SNOOKER,
};

/**
 * Các trạng thái vận hành của bàn bida:
 * - AVAILABLE: Bàn trống, sẵn sàng đón khách mới.
 * - PLAYING: Đang có khách chơi, bộ đếm giờ đang chạy.
 * - PAUSED: Tạm dừng tính giờ (khách tạm nghỉ hoặc chờ chuyển bàn).
 * - BOOKED: Bàn đã được khách đặt trước (giữ chỗ).
 * - MAINTENANCE: Bàn đang bảo trì hoặc sửa chữa (thay nỉ, cân bi, đổi bóng...).
 */
export enum TableStatus {
  AVAILABLE = "available",
  PLAYING = "playing",
  PAUSED = "paused",
  BOOKED = "booked",
  MAINTENANCE = "maintenance",
}

/**
 * Cấu trúc phiên chơi (Session) được nhúng trực tiếp vào bàn khi bàn đang hoạt động.
 */
export interface TableSession {
  /** Mã định danh phiên chơi (UUID v4) */
  sessionId: string;
  /** Chuỗi thời gian bắt đầu phiên hiển thị trực quan (vd: "14:30") */
  sessionStart: string;
  /** Timestamp (epoch ms) thời điểm bắt đầu chơi thực tế */
  startedAt: number;
  /** Giá tiền mỗi giờ chơi được chốt tại thời điểm mở bàn */
  pricePerHour: number;
  /** Trạng thái phiên chơi có đang tạm dừng đếm giờ hay không */
  isPaused: boolean;
  /** Timestamp (epoch ms) lúc bấm tạm dừng gần nhất (nếu có) */
  pausedAt?: number;
  /** Tổng thời gian tạm dừng tích lũy (tính bằng milliseconds) */
  totalPausedMs: number;
  /** Chi phí tiền giờ được chuyển giao thừa kế từ bàn khác (khi gộp/chuyển bàn) */
  carriedCost: number;
  /** Tên khách hàng đang sử dụng bàn */
  customerName: string;
  /** Số điện thoại của khách hàng */
  customerPhone?: string;
  /** Khách có phải là hội viên (member) tích điểm hay không */
  isMember: boolean;
  /** Danh sách dịch vụ/món F&B gọi thêm trong phiên */
  orders: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    orderTime: string;
    status: string;
  }[];
  /** Ghi chú đặc biệt cho phiên chơi */
  note?: string;
  /** Số tiền khách đã đặt cọc trước (nếu có) */
  deposit: number;
}

/**
 * Interface đại diện cho thực thể Bàn bida (Table) trong cơ sở dữ liệu.
 */
export interface ITable extends Document {
  /** Mã định danh bàn (duy nhất trong hệ thống, vd: "B01", "T02-L1") */
  code: string;
  /** Tên hiển thị của bàn (vd: "Bàn 1", "Bàn VIP 02") */
  name: string;
  /** Loại bàn bida (pool, carom, snooker) */
  type: TableType;
  /** Khu vực đặt bàn (vd: "Khu A - Phổ thông", "Khu VIP", "Tầng lửng") */
  area: string;
  /** Số tầng của cơ sở đặt bàn (mặc định tầng 1) */
  floor: number;
  /** Giá tiền giờ chơi mặc định của bàn (VNĐ/giờ) */
  pricePerHour: number;
  /** Trạng thái hiện tại của bàn (available, playing, paused, booked, maintenance) */
  status: TableStatus;
  /** Cờ trạng thái cho phép kinh doanh bàn hay vô hiệu hóa tạm thời */
  isActive: boolean;
  /** Khung giá linh hoạt liên kết (PricingTier) nếu bàn áp dụng bảng giá giờ cao điểm */
  pricingTier?: mongoose.Types.ObjectId;
  /** Subdocument thông tin phiên chơi hiện tại (chỉ có khi status là playing hoặc paused) */
  currentSession?: TableSession;
  /** Subdocument lưu thông tin giữ chỗ khi bàn ở trạng thái BOOKED */
  bookedInfo?: {
    customerName: string;
    phone: string;
    time: string;
    bookingId: string;
  };
  /** Thời điểm tạo bàn */
  createdAt: Date;
  /** Thời điểm cập nhật bàn gần nhất */
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    // Mã bàn duy nhất trong quán
    code: { type: String, required: true, unique: true, trim: true },
    // Tên hiển thị thân thiện của bàn
    name: { type: String, required: true, trim: true },
    // Thể loại bàn (pool, carom, snooker)
    type: { type: String, enum: Object.values(TableType), required: true },
    // Phân khu vực đặt bàn
    area: { type: String, required: true, trim: true },
    // Tầng chứa bàn
    floor: { type: Number, default: 1 },
    // Đơn giá giờ chơi mặc định (VNĐ)
    pricePerHour: { type: Number, required: true, min: 0 },
    // Trạng thái hiện tại của bàn
    status: { type: String, enum: Object.values(TableStatus), default: TableStatus.AVAILABLE },
    // Cho phép hiển thị và phục vụ hay không
    isActive: { type: Boolean, default: true },
    // Tham chiếu đến bảng giá theo khung giờ
    pricingTier: { type: Schema.Types.ObjectId, ref: "PricingTier" },
    // Phiên chơi hiện tại nhúng trực tiếp vào bàn
    currentSession: {
      type: new Schema<TableSession>({
        // Mã định danh phiên chơi
        sessionId: { type: String, required: true },
        // Chuỗi giờ bắt đầu hiển thị giao diện
        sessionStart: String,
        // Thời gian bắt đầu chơi tính bằng epoch ms
        startedAt: { type: Number, required: true },
        // Mức giá giờ áp dụng tại thời điểm mở bàn
        pricePerHour: { type: Number, required: true, min: 0 },
        // Cờ bàn đang tạm dừng đếm giờ
        isPaused: { type: Boolean, default: false },
        // Thời điểm tạm dừng gần nhất (epoch ms)
        pausedAt: Number,
        // Tổng thời gian tạm dừng tính bằng ms
        totalPausedMs: { type: Number, default: 0 },
        // Tiền giờ kế thừa khi chuyển hoặc gộp bàn
        carriedCost: { type: Number, default: 0 },
        // Tên khách chơi
        customerName: { type: String, required: true },
        // Số điện thoại khách
        customerPhone: String,
        // Cờ xác nhận khách có phải hội viên
        isMember: { type: Boolean, default: false },
        // Danh sách đồ ăn/thức uống khách gọi tại bàn
        orders: { type: [new Schema({ id: String, name: String, price: Number, quantity: Number, category: String, orderTime: String, status: String }, { _id: false })], default: [] },
        // Ghi chú của thu ngân hoặc nhân viên phục vụ
        note: String,
        // Tiền cọc trước của khách
        deposit: { type: Number, default: 0, min: 0 },
      }, { _id: false }),
      default: undefined,
    },
    // Thông tin đặt bàn giữ chỗ
    bookedInfo: {
      type: new Schema({ customerName: String, phone: String, time: String, bookingId: String }, { _id: false }),
      default: undefined,
    },
  },
  { timestamps: true }
);

// Tự động chuẩn hóa loại bàn cũ sang 3 loại chuẩn (pool, carom, snooker)
tableSchema.pre("validate", function (next) {
  if (this.type && LEGACY_TABLE_TYPE_MAP[this.type]) {
    this.type = LEGACY_TABLE_TYPE_MAP[this.type];
  }
  next();
});

tableSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as any;
  if (update) {
    if (update.type && LEGACY_TABLE_TYPE_MAP[update.type]) {
      update.type = LEGACY_TABLE_TYPE_MAP[update.type];
    }
    if (update.$set?.type && LEGACY_TABLE_TYPE_MAP[update.$set.type]) {
      update.$set.type = LEGACY_TABLE_TYPE_MAP[update.$set.type];
    }
  }
  next();
});

export const Table = mongoose.model<ITable>("Table", tableSchema);
