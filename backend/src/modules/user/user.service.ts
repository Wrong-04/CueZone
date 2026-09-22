import { User, IUser, UserRole } from "./user.model";
import { CreateUserDTO, UpdateUserDTO } from "./dto/user.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

export class UserService {
  async getAll(filters?: { role?: string; isActive?: string; search?: string; excludeCustomers?: string }): Promise<IUser[]> {
    const query: any = {};
    if (filters?.role) {
      query.role = filters.role;
    } else if (filters?.excludeCustomers !== "false") {
      query.role = { $ne: "customer" };
    }
    if (filters?.isActive !== undefined) query.isActive = filters.isActive === "true";
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } },
      ];
    }
    return User.find(query).sort({ createdAt: -1 });
  }

  async getById(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    return user;
  }

  async create(dto: CreateUserDTO): Promise<IUser> {
    if (!dto.password || dto.password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[a-zA-Z]/.test(dto.password) || !/[0-9]/.test(dto.password)) {
      throw new Error("Mật khẩu phải chứa cả chữ cái và số");
    }
    const existing = await User.findOne({ email: dto.email });
    if (existing) throw new Error("Email đã được sử dụng");
    const user = await User.create(dto);
    notificationService.create({
      title: "Tạo tài khoản nhân viên",
      message: `Đã tạo tài khoản "${user.name}" (${user.email}) với vai trò ${user.role}.`,
      type: NotificationType.USER,
    }).catch(() => {});
    return user;
  }

  async update(id: string, dto: UpdateUserDTO): Promise<IUser> {
    const user = await User.findByIdAndUpdate(id, dto, { new: true });
    if (!user) throw new Error("Không tìm thấy người dùng");
    return user;
  }

  async toggleLock(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    user.isLocked = !user.isLocked;
    await user.save();
    notificationService.create({
      title: user.isLocked ? "Khóa tài khoản" : "Mở khóa tài khoản",
      message: `Tài khoản "${user.name}" (${user.email}) đã ${user.isLocked ? "bị khóa" : "được mở khóa"}.`,
      type: NotificationType.USER,
    }).catch(() => {});
    return user;
  }

  async toggleActive(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    user.isActive = !user.isActive;
    await user.save();
    notificationService.create({
      title: user.isActive ? "Kích hoạt tài khoản" : "Vô hiệu hóa tài khoản",
      message: `Tài khoản "${user.name}" (${user.email}) đã ${user.isActive ? "được kích hoạt" : "bị vô hiệu hóa"}.`,
      type: NotificationType.USER,
    }).catch(() => {});
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (user.role === UserRole.ADMIN) {
      const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1) throw new Error("Không thể xóa tài khoản Admin cuối cùng trong hệ thống");
    }
    await User.findByIdAndDelete(id);
    notificationService.create({
      title: "Xóa tài khoản",
      message: `Đã xóa tài khoản "${user.name}" (${user.email}).`,
      type: NotificationType.USER,
    }).catch(() => {});
  }

  async getStats() {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true, isLocked: false });
    const locked = await User.countDocuments({ isLocked: true });
    const byRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    return { total, active, locked, byRole };
  }
}
