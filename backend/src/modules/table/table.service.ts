import { Table, ITable, TableStatus } from "./table.model";
import { CreateTableDTO, UpdateTableDTO } from "./dto/table.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";

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
    const { code, name, type, area, floor, pricePerHour } = dto;
    const table = await Table.create({ code, name, type, area, floor, pricePerHour, status: TableStatus.AVAILABLE });
    notificationService.create({
      title: "Thêm bàn mới",
      message: `Đã thêm bàn "${table.name}" (Mã: ${table.code}) khu vực ${table.area}.`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async update(id: string, dto: UpdateTableDTO): Promise<ITable> {
    const existing = await Table.findById(id);
    if (!existing) throw new Error("Không tìm thấy bàn");

    // Nếu cố ý can thiệp currentSession hoặc status của bàn đang hoạt động qua API cập nhật danh mục
    if (existing.currentSession && ((dto as any).currentSession !== undefined || (dto as any).status !== undefined)) {
      throw new Error("Không thể thay đổi phiên chơi hoặc trạng thái bàn qua API cập nhật danh mục");
    }

    const { name, type, area, floor, pricePerHour, isActive } = dto;
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    if (area) updateFields.area = area;
    if (floor !== undefined) updateFields.floor = floor;
    if (pricePerHour !== undefined) updateFields.pricePerHour = pricePerHour;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const table = await Table.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });
    if (!table) throw new Error("Không tìm thấy bàn");

    notificationService.create({
      title: "Cập nhật bàn",
      message: `Đã cập nhật thông tin bàn "${table.name}" (Mã: ${table.code}).`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async updateStatus(id: string, status: TableStatus): Promise<ITable> {
    if (![TableStatus.AVAILABLE, TableStatus.MAINTENANCE].includes(status)) {
      throw new Error("Hãy dùng API phiên chơi hoặc đặt bàn để thay đổi trạng thái này");
    }
    const existing = await Table.findById(id);
    if (!existing) throw new Error("Không tìm thấy bàn");
    if (existing.currentSession || existing.bookedInfo || existing.status === TableStatus.PLAYING || existing.status === TableStatus.BOOKED) {
      throw new Error("Bàn đang có khách chơi hoặc đã được đặt trước, không thể chuyển sang bảo trì");
    }
    existing.status = status;
    await existing.save();
    const statusLabels: Record<string, string> = {
      available: "Trống",
      playing: "Đang chơi",
      booked: "Đặt trước",
      maintenance: "Bảo trì",
    };
    notificationService.create({
      title: "Đổi trạng thái bàn",
      message: `Bàn "${existing.name}" (Mã: ${existing.code}) chuyển sang trạng thái ${statusLabels[status] || status}.`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    emitTableStatusChanged({ tableId: String(existing._id), status: existing.status, table: existing });
    return existing;
  }

  async delete(id: string): Promise<void> {
    const table = await Table.findById(id);
    if (!table) throw new Error("Không tìm thấy bàn");
    if (table.currentSession || table.bookedInfo || table.status === TableStatus.PLAYING || table.status === TableStatus.BOOKED) {
      throw new Error("Không thể xóa bàn đang có khách chơi hoặc đã được đặt trước");
    }
    await Table.findByIdAndDelete(id);
    notificationService.create({
      title: "Xóa bàn",
      message: `Đã xóa bàn "${table.name}" (Mã: ${table.code}).`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    emitTableStatusChanged({ tableId: id, status: "deleted" });
  }

  async cancelBooking(id: string): Promise<ITable> {
    const table = await Table.findById(id);
    if (!table) throw new Error("Không tìm thấy bàn");
    if (table.status !== TableStatus.BOOKED) throw new Error("Bàn không ở trạng thái đặt trước");
    table.status = TableStatus.AVAILABLE;
    table.bookedInfo = undefined;
    await table.save();
    notificationService.create({
      title: "Hủy đặt bàn",
      message: `Bàn "${table.name}" (Mã: ${table.code}) đã được giải phóng về trạng thái Trống.`,
      type: NotificationType.TABLE,
    }).catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async getStats(): Promise<{ total: number; available: number; playing: number; paused: number; booked: number; maintenance: number }> {
    const tables = await Table.find();
    let available = 0, playing = 0, paused = 0, booked = 0, maintenance = 0;
    for (const t of tables) {
      if (t.status === TableStatus.AVAILABLE) available++;
      else if (t.status === TableStatus.PLAYING) {
        if (t.currentSession?.isPaused) paused++;
        else playing++;
      } else if (t.status === TableStatus.PAUSED) paused++;
      else if (t.status === TableStatus.BOOKED) booked++;
      else if (t.status === TableStatus.MAINTENANCE) maintenance++;
    }
    return {
      total: tables.length,
      available,
      playing,
      paused,
      booked,
      maintenance,
    };
  }

  async findAvailableByType(type?: string): Promise<{
    type?: string;
    availableCount: number;
    tables: ITable[];
    isAvailable: boolean;
    waitlistSuggested: boolean;
    message: string;
  }> {
    const query: any = { isActive: true, status: TableStatus.AVAILABLE };
    if (type) query.type = type;
    const tables = await Table.find(query).sort({ code: 1 });
    const availableCount = tables.length;
    const isAvailable = availableCount > 0;
    const waitlistSuggested = !isAvailable;
    const typeLabel = type === "pool" ? "Bida Lỗ (Pool)" : type === "carom" ? "Bida Carom" : type === "snooker" ? "Snooker" : "bàn";

    return {
      type,
      availableCount,
      tables,
      isAvailable,
      waitlistSuggested,
      message: isAvailable
        ? `Tìm thấy ${availableCount} bàn ${typeLabel} trống đang sẵn sàng phục vụ.`
        : `Hiện tại toàn bộ bàn ${typeLabel} đã kín khách. Khuyến nghị thêm khách vào Danh Sách Chờ (Waitlist).`,
    };
  }

  async getPublicTables(filters?: { type?: string; area?: string; status?: string }): Promise<any[]> {
    const query: any = { isActive: true };
    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;
    if (filters?.area) query.area = filters.area;

    const tables = await Table.find(query).sort({ code: 1 });
    const now = Date.now();

    const typeLabels: Record<string, string> = {
      pool: "Bàn Bida Lỗ (Pool)",
      carom: "Bàn Bida Carom (Phăng)",
      snooker: "Bàn Bida Snooker",
    };

    return tables.map((t) => {
      let durationMinutes: number | undefined;
      let durationFormatted: string | undefined;

      if ((t.status === TableStatus.PLAYING || t.status === TableStatus.PAUSED) && t.currentSession) {
        const effectiveNow = t.currentSession.isPaused && t.currentSession.pausedAt ? t.currentSession.pausedAt : now;
        const elapsed = Math.max(0, effectiveNow - t.currentSession.startedAt - (t.currentSession.totalPausedMs || 0));
        durationMinutes = Math.max(1, Math.round(elapsed / 60000));
        const hours = Math.floor(elapsed / 3600000);
        const mins = Math.floor((elapsed % 3600000) / 60000);
        durationFormatted = hours > 0 ? `${hours}h ${mins}p` : `${mins}p`;
      }

      return {
        _id: t._id,
        id: String(t._id),
        code: t.code,
        name: t.name,
        type: t.type,
        typeName: typeLabels[t.type] || t.type,
        area: t.area,
        floor: t.floor,
        pricePerHour: t.pricePerHour,
        status: t.status,
        sessionStart: t.currentSession?.sessionStart,
        isPaused: Boolean(t.currentSession?.isPaused || t.status === TableStatus.PAUSED),
        bookedTime: t.bookedInfo?.time,
        durationMinutes,
        durationFormatted,
      };
    });
  }
}


