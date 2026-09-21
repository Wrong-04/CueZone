import { Role, IRole } from "./role.model";
import { CreateRoleDTO, UpdateRoleDTO } from "./dto/role.dto";

export class RoleService {
  async getAll(): Promise<IRole[]> {
    return Role.find().sort({ createdAt: -1 });
  }

  async getById(id: string): Promise<IRole> {
    const role = await Role.findById(id);
    if (!role) throw new Error("Không tìm thấy role");
    return role;
  }

  async create(dto: CreateRoleDTO): Promise<IRole> {
    const existing = await Role.findOne({ name: dto.name });
    if (existing) throw new Error("Tên role đã tồn tại");
    return Role.create(dto);
  }

  async update(id: string, dto: UpdateRoleDTO): Promise<IRole> {
    const role = await Role.findByIdAndUpdate(id, dto, { new: true });
    if (!role) throw new Error("Không tìm thấy role");
    return role;
  }

  async delete(id: string): Promise<void> {
    const role = await Role.findById(id);
    if (!role) throw new Error("Không tìm thấy role");
    if (role.isDefault) throw new Error("Không thể xóa role mặc định");
    await Role.findByIdAndDelete(id);
  }
}
