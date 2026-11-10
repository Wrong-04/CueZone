import { User, IUser, UserRole } from "./user.model";
import { CreateUserDTO, UpdateUserDTO } from "./dto/user.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

export class UserService {
  async getAll(filters?: {
    role?: string;
    isActive?: string;
    search?: string;
    excludeCustomers?: string;
  }): Promise<IUser[]> {
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

  async create(dto: CreateUserDTO): Promise<Omit<IUser, "password">> {
    if (!dto.password || dto.password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[a-zA-Z]/.test(dto.password) || !/[0-9]/.test(dto.password)) {
      throw new Error("Mật khẩu phải chứa cả chữ cái và số");
    }
    const existing = await User.findOne({ email: dto.email });
    if (existing) throw new Error("Email đã được sử dụng");
    const user = await User.create(dto);
    notificationService
      .create({
        title: "Tạo tài khoản nhân viên",
        message: `Đã tạo tài khoản "${user.name}" (${user.email}) với vai trò ${user.role}.`,
        type: NotificationType.USER,
      })
      .catch(() => {});
    const userObj = user.toObject();
    delete (userObj as any).password;
    return userObj as Omit<IUser, "password">;
  }

  async update(id: string, dto: UpdateUserDTO, actorId?: string): Promise<IUser> {
    // Chỉ cho phép các field trong UpdateUserDTO; tránh ghi đè password/email qua req.body.
    const allowed = ["name", "phone", "role", "isActive", "isLocked", "branch", "position"] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if ((dto as Record<string, unknown>)[key] !== undefined) {
        patch[key] = (dto as Record<string, unknown>)[key];
      }
    }
    // Phone rỗng = xóa SĐT (null), vì unique index chỉ áp dụng cho kiểu string.
    if (typeof patch.phone === "string") patch.phone = patch.phone.trim() || null;
    for (const key of ["isActive", "isLocked"] as const) {
      if (patch[key] !== undefined && typeof patch[key] !== "boolean") {
        throw new Error(`Giá trị ${key} không hợp lệ`);
      }
    }
    if (patch.role !== undefined && !Object.values(UserRole).includes(patch.role as UserRole)) {
      throw new Error("Vai trò không hợp lệ");
    }

    const current = await User.findById(id);
    if (!current) throw new Error("Không tìm thấy người dùng");
    const isSelf = actorId !== undefined && actorId === id;
    if (isSelf && (patch.isLocked === true || patch.isActive === false)) {
      throw new Error("Không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình");
    }
    if (isSelf && patch.role !== undefined && patch.role !== current.role) {
      throw new Error("Không thể tự thay đổi vai trò của chính mình");
    }
    if (
      (patch.role !== undefined && patch.role !== UserRole.ADMIN) ||
      patch.isLocked === true ||
      patch.isActive === false
    ) {
      await this.assertNotLastAdmin(current);
    }

    try {
      const user = await User.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
      if (!user) throw new Error("Không tìm thấy người dùng");
      return user;
    } catch (err: any) {
      if (err?.code === 11000) throw new Error("Số điện thoại đã được sử dụng");
      throw err;
    }
  }

  // Phải còn ít nhất một admin đang hoạt động sau thao tác hạ quyền/khóa target.
  // ponytail: check-then-write không atomic; hai admin cuối thao tác đồng thời vẫn có thể lọt.
  // Nếu cần tuyệt đối, chuyển sang transaction với điều kiện đếm trong cùng session.
  private async assertNotLastAdmin(target: IUser): Promise<void> {
    if (target.role !== UserRole.ADMIN || !target.isActive || target.isLocked) return;
    const otherActiveAdmins = await User.countDocuments({
      _id: { $ne: target._id },
      role: UserRole.ADMIN,
      isActive: true,
      isLocked: false,
    });
    if (otherActiveAdmins < 1) {
      throw new Error("Hệ thống phải còn ít nhất một tài khoản Admin đang hoạt động");
    }
  }

  async toggleLock(id: string, actorId?: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isLocked) {
      if (actorId === id) throw new Error("Không thể tự khóa tài khoản của chính mình");
      await this.assertNotLastAdmin(user);
    }
    user.isLocked = !user.isLocked;
    await user.save();
    notificationService
      .create({
        title: user.isLocked ? "Khóa tài khoản" : "Mở khóa tài khoản",
        message: `Tài khoản "${user.name}" (${user.email}) đã ${user.isLocked ? "bị khóa" : "được mở khóa"}.`,
        type: NotificationType.USER,
      })
      .catch(() => {});
    return user;
  }

  async toggleActive(id: string, actorId?: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (user.isActive) {
      if (actorId === id) throw new Error("Không thể tự vô hiệu hóa tài khoản của chính mình");
      await this.assertNotLastAdmin(user);
    }
    user.isActive = !user.isActive;
    await user.save();
    notificationService
      .create({
        title: user.isActive ? "Kích hoạt tài khoản" : "Vô hiệu hóa tài khoản",
        message: `Tài khoản "${user.name}" (${user.email}) đã ${user.isActive ? "được kích hoạt" : "bị vô hiệu hóa"}.`,
        type: NotificationType.USER,
      })
      .catch(() => {});
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await User.findById(id);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (user.role === UserRole.ADMIN) {
      const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1)
        throw new Error("Không thể xóa tài khoản Admin cuối cùng trong hệ thống");
    }
    await User.findByIdAndDelete(id);
    notificationService
      .create({
        title: "Xóa tài khoản",
        message: `Đã xóa tài khoản "${user.name}" (${user.email}).`,
        type: NotificationType.USER,
      })
      .catch(() => {});
  }

  async getStats() {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true, isLocked: false });
    const locked = await User.countDocuments({ isLocked: true });
    const byRole = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    return { total, active, locked, byRole };
  }
}
