import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Các vai trò người dùng trong hệ thống CueZone:
 * - ADMIN: Quản trị viên toàn quyền hệ thống.
 * - STAFF: Nhân viên phục vụ / trực quầy sàn bida.
 * - CASHIER: Nhân viên thu ngân, phụ trách thanh toán hóa đơn POS.
 * - WAREHOUSE: Thủ kho phụ trách quản lý tồn kho F&B, vật tư, phụ kiện.
 * - REFEREE: Trọng tài giải đấu, phụ trách chấm điểm và điều hành trận đấu.
 * - CUSTOMER: Khách hàng / hội viên câu lạc bộ.
 */
export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CASHIER = "cashier",
  WAREHOUSE = "warehouse",
  REFEREE = "referee",
  CUSTOMER = "customer",
}

/**
 * Interface đại diện cho thực thể Người dùng (User).
 */
export interface IUser extends Document {
  /** Họ và tên của người dùng */
  name: string;
  /** Địa chỉ email đăng nhập (duy nhất, viết thường) */
  email: string;
  /** Mật khẩu đã được mã hóa bcrypt (mặc định select: false khi query) */
  password: string;
  /** Vai trò của tài khoản trong hệ thống (UserRole) */
  role: UserRole;
  /** Số điện thoại liên hệ */
  phone?: string;
  /** URL ảnh đại diện */
  avatar?: string;
  /** Trạng thái kích hoạt của tài khoản (true = đang hoạt động) */
  isActive: boolean;
  /** Cờ khóa tài khoản (true = bị khóa không thể đăng nhập) */
  isLocked: boolean;
  /** Chi nhánh làm việc (áp dụng cho nhân viên) */
  branch?: string;
  /** Chức vụ / vị trí công việc cụ thể của nhân viên */
  position?: string;
  /** Thời điểm tạo tài khoản */
  createdAt: Date;
  /** Thời điểm cập nhật tài khoản gần nhất */
  updatedAt: Date;
  /** Hàm tiện ích so sánh mật khẩu ứng viên với mật khẩu đã hash */
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    // Họ và tên người dùng, bắt buộc nhập, loại bỏ khoảng trắng thừa
    name: { type: String, required: true, trim: true },
    // Email đăng nhập duy nhất, chuẩn hóa chữ thường
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Mật khẩu đã băm (hash), ẩn khỏi kết quả query mặc định
    password: { type: String, required: true, select: false },
    // Phân quyền vai trò: mặc định là khách hàng (CUSTOMER)
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },
    // Số điện thoại liên hệ (duy nhất nếu có)
    phone: { type: String, trim: true, sparse: true, index: true },
    // Đường dẫn ảnh đại diện
    avatar: { type: String },
    // Trạng thái tài khoản đang hoạt động hay vô hiệu
    isActive: { type: Boolean, default: true },
    // Cờ khóa tài khoản quản trị viên áp dụng
    isLocked: { type: Boolean, default: false },
    // Tên chi nhánh công tác (cho nhân sự)
    branch: { type: String },
    // Vị trí/chức vụ cụ thể
    position: { type: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
