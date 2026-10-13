import { Table, ITable, TableStatus } from "./table.model";
import { CreateTableDTO, UpdateTableDTO } from "./dto/table.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

export class TableService {
  async getAll(filters?: { type?: string; status?: string; area?: string; isActive?: string }): Promise<ITable[]> {
    const query: any = {};
    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;
    if (filters?.area) query.area = filters.area;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive === "true";
    return Table.find(query).populate("pricingTier").sort({ code: 1 });
  }

  async getById(id: string): Promise<ITable> {
    const table = await Table.findById(id).populate("pricingTier");
    if (!table) throw new Error("Không tìm thấy bàn");
    return table;
  }

  async create(dto: CreateTableDTO): Promise<ITable> {
    const existing = await Table.findOne({ code: dto.code });
    if (existing) throw new Error("Mã bàn đã tồn tại");
    const table = await Table.create(dto);
    notificationService.create({
      title: "Thêm bàn mới",
      message: `Đã thêm bàn "${table.name}" (Mã: ${table.code}) khu vực ${table.area}.`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    return table;
  }

  async update(id: string, dto: UpdateTableDTO): Promise<ITable> {
    const table = await Table.findByIdAndUpdate(id, dto, { new: true });
    if (!table) throw new Error("Không tìm thấy bàn");
    notificationService.create({
      title: "Cập nhật bàn",
      message: `Đã cập nhật thông tin bàn "${table.name}" (Mã: ${table.code}).`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    return table;
  }

  async updateStatus(id: string, status: TableStatus): Promise<ITable> {
    const table = await Table.findByIdAndUpdate(id, { status }, { new: true });
    if (!table) throw new Error("Không tìm thấy bàn");
    const statusLabels: Record<string, string> = {
      available: "Trống",
      playing: "Đang chơi",
      booked: "Đặt trước",
      maintenance: "Bảo trì",
    };
    notificationService.create({
      title: "Đổi trạng thái bàn",
      message: `Bàn "${table.name}" (Mã: ${table.code}) chuyển sang trạng thái ${statusLabels[status] || status}.`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    return table;
  }

  async delete(id: string): Promise<void> {
    const table = await Table.findById(id);
    if (!table) throw new Error("Không tìm thấy bàn");
    if (table.status === TableStatus.PLAYING) throw new Error("Không thể xóa bàn đang chơi");
    await Table.findByIdAndDelete(id);
    notificationService.create({
      title: "Xóa bàn",
      message: `Đã xóa bàn "${table.name}" (Mã: ${table.code}).`,
      type: NotificationType.TABLE,
    }).catch(() => {});
  }

  async getStats() {
    const total = await Table.countDocuments({ isActive: true });
    const available = await Table.countDocuments({ status: TableStatus.AVAILABLE, isActive: true });
    const playing = await Table.countDocuments({ status: TableStatus.PLAYING, isActive: true });
    const booked = await Table.countDocuments({ status: TableStatus.BOOKED, isActive: true });
    const maintenance = await Table.countDocuments({ status: TableStatus.MAINTENANCE, isActive: true });
    return { total, available, playing, booked, maintenance };
  }
}
