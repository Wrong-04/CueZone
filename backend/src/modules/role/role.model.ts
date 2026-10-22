import mongoose, { Document, Schema } from "mongoose";

/**
 * Interface cấu hình quyền hạn cho từng phân hệ (module-level permission).
 */
export interface IPermission {
  /** Tên module được phân quyền (vd: "tables", "users", "invoices", "inventory", "tournaments") */
  module: string;
  /** Danh sách các hành động được phép thực thi (vd: ["read", "create", "update", "delete", "export"]) */
  actions: string[];
}

/**
 * Interface đại diện cho thực thể Vai trò người dùng (Role) trong hệ thống RBAC.
 */
export interface IRole extends Document {
  /** Mã định danh vai trò (viết thường, duy nhất: "admin", "staff", "cashier", ...) */
  name: string;
  /** Tên hiển thị thân thiện trên giao diện (vd: "Quản trị viên", "Thu ngân") */
  displayName: string;
  /** Mô tả chi tiết về phạm vi trách nhiệm của vai trò */
  description?: string;
  /** Danh sách các quyền chi tiết gắn với từng module */
  permissions: IPermission[];
  /** Đánh dấu vai trò mặc định của hệ thống (không cho phép xóa nếu là vai trò hệ thống) */
  isDefault: boolean;
  /** Thời điểm tạo vai trò */
  createdAt: Date;
  /** Thời điểm cập nhật vai trò gần nhất */
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>({
  // Tên phân hệ áp dụng quyền
  module: { type: String, required: true },
  // Danh sách các thao tác hợp lệ được cấp quyền
  actions: [{ type: String }],
});

const roleSchema = new Schema<IRole>(
  {
    // Mã vai trò duy nhất, viết thường, không khoảng trắng
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Tên hiển thị trực quan cho người dùng xem
    displayName: { type: String, required: true },
    // Diễn giải ý nghĩa/nhiệm vụ của vai trò
    description: { type: String },
    // Mảng các quyền chi tiết theo từng module
    permissions: [permissionSchema],
    // Cờ xác định vai trò mặc định tích hợp sẵn
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>("Role", roleSchema);
