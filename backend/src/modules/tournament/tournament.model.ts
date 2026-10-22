import mongoose, { Schema, Document } from "mongoose";

/**
 * Các trạng thái trong vòng đời của giải đấu bida:
 * - DRAFT: Giải đấu đang soạn thảo, chưa công bố.
 * - REGISTRATION_OPEN: Đang mở cổng đăng ký cho các cơ thủ tham gia.
 * - REGISTRATION_CLOSED: Đã đóng cổng đăng ký, chuẩn bị bốc thăm.
 * - BRACKET_GENERATED: Đã tạo nhánh đấu / sơ đồ thi đấu (bracket).
 * - IN_PROGRESS: Giải đấu đang diễn ra các trận tranh tài.
 * - COMPLETED: Giải đấu đã kết thúc và trao giải.
 */
export enum TournamentStatus {
  DRAFT = "draft",
  REGISTRATION_OPEN = "registration_open",
  REGISTRATION_CLOSED = "registration_closed",
  BRACKET_GENERATED = "bracket_generated",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

/**
 * Interface cấu trúc thông tin cơ thủ / người chơi đăng ký tham gia giải đấu.
 */
export interface ITournamentPlayer {
  /** ID tài khoản người dùng đăng ký (khóa ngoại User) */
  user: mongoose.Types.ObjectId;
  /** Tên cơ thủ tham gia thi đấu */
  name: string;
  /** Ảnh đại diện của cơ thủ */
  avatar?: string;
  /** Số điện thoại liên hệ cơ thủ */
  phone?: string;
  /** Thứ hạng hạt giống (nếu có xếp hạt giống khi chia bảng) */
  seed?: number;
  /** Trạng thái đã nộp lệ phí thi đấu hay chưa */
  feePaid: boolean;
  /** Thời điểm đăng ký tham gia giải đấu */
  registeredAt: Date;
}

/**
 * Interface đại diện cho thực thể Giải đấu bida (Tournament).
 */
export interface ITournament extends Document {
  /** Tên giải đấu (vd: "Giải Vô Địch CueZone Mở Rộng 2025") */
  name: string;
  /** Mô tả giới thiệu thông tin giải đấu */
  description?: string;
  /** Ngày giờ bắt đầu khởi tranh giải đấu */
  startDate: Date;
  /** Ngày giờ dự kiến bế mạc giải đấu */
  endDate: Date;
  /** Thời hạn chót đóng cổng đăng ký tham gia */
  registrationDeadline: Date;
  /** Quy mô số lượng cơ thủ tối đa (hỗ trợ sơ đồ nhánh chuẩn: 8, 16, 32 cơ thủ) */
  maxPlayers: number;
  /** Lệ phí đăng ký tham gia thi đấu (VNĐ/cơ thủ) */
  registrationFee: number;
  /** Tổng cơ cấu giải thưởng (vd: "20.000.000 VNĐ") */
  prizePool?: string;
  /** Giải thưởng dành cho nhà Vô địch (Giải Nhất) */
  firstPrize?: string;
  /** Giải thưởng dành cho Á quân (Giải Nhì) */
  secondPrize?: string;
  /** Giải thưởng dành cho Đồng Hạng Ba (Giải Ba) */
  thirdPrize?: string;
  /** Trạng thái hiện tại của giải đấu */
  status: TournamentStatus;
  /** Thể lệ, quy chế và luật áp dụng cho giải đấu */
  rules?: string;
  /** Thể thức thi đấu (mặc định loại trực tiếp "Single Elimination") */
  format: string;
  /** Điểm số/ván chạm cần đạt để thắng một trận (vd: race to 5 ván thắng) */
  raceToScore: number;
  /** Danh sách mã các bàn bida được dành riêng cho thi đấu giải */
  assignedTables?: string[];
  /** ID người dùng (admin/ban tổ chức) tạo giải đấu */
  createdBy?: mongoose.Types.ObjectId;
  /** Danh sách các cơ thủ đã đăng ký tham gia */
  players: ITournamentPlayer[];
  /** Thời điểm tạo giải đấu */
  createdAt: Date;
  /** Thời điểm cập nhật giải đấu gần nhất */
  updatedAt: Date;
}

const TournamentPlayerSchema = new Schema<ITournamentPlayer>(
  {
    // Tài khoản người chơi trong hệ thống
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Tên cơ thủ thi đấu
    name: { type: String, required: true },
    // Ảnh đại diện
    avatar: { type: String },
    // Số điện thoại liên lạc
    phone: { type: String },
    // Thứ hạng hạt giống (seed number)
    seed: { type: Number },
    // Xác nhận đã hoàn tất đóng lệ phí thi đấu
    feePaid: { type: Boolean, default: false },
    // Thời điểm ghi danh
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TournamentSchema = new Schema<ITournament>(
  {
    // Tên giải đấu
    name: { type: String, required: true, trim: true },
    // Giới thiệu tóm tắt
    description: { type: String, trim: true },
    // Thời điểm bắt đầu giải đấu
    startDate: { type: Date, required: true },
    // Thời điểm kết thúc giải đấu
    endDate: { type: Date, required: true },
    // Hạn cuối nhận đăng ký
    registrationDeadline: { type: Date, required: true },
    // Số lượng vận động viên tối đa: 8, 16 hoặc 32
    maxPlayers: {
      type: Number,
      required: true,
      enum: [8, 16, 32],
      default: 16,
    },
    // Tiền lệ phí tham dự giải
    registrationFee: { type: Number, required: true, min: 0, default: 0 },
    // Tổng giá trị giải thưởng
    prizePool: { type: String, trim: true },
    // Thưởng giải nhất
    firstPrize: { type: String, trim: true },
    // Thưởng giải nhì
    secondPrize: { type: String, trim: true },
    // Thưởng giải ba
    thirdPrize: { type: String, trim: true },
    // Trạng thái vận hành giải đấu
    status: {
      type: String,
      enum: Object.values(TournamentStatus),
      default: TournamentStatus.DRAFT,
      index: true,
    },
    // Luật thi đấu
    rules: { type: String, trim: true },
    // Thể thức thi đấu (Single Elimination)
    format: { type: String, default: "Single Elimination" },
    // Số ván/điểm cần đạt để thắng (Race to)
    raceToScore: { type: Number, default: 5, min: 1 },
    // Bàn bida được bố trí phục vụ giải đấu
    assignedTables: [{ type: String }],
    // Quản trị viên/người tổ chức giải đấu
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    // Danh sách đấu thủ tham gia
    players: [TournamentPlayerSchema],
  },
  { timestamps: true }
);

export const Tournament =
  mongoose.models.Tournament ||
  mongoose.model<ITournament>("Tournament", TournamentSchema);
