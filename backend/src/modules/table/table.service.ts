import { Table, ITable, TableStatus } from "./table.model";
import { User, UserRole } from "../user/user.model";
import { Voucher, VoucherDiscountType } from "../voucher/voucher.model";
import { Wallet } from "../wallet/wallet.model";
import { Booking } from "../booking/booking.model";
import { CreateTableDTO, UpdateTableDTO } from "./dto/table.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";

const notificationService = new NotificationService();

export class TableService {
  async lookupCustomer(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return null;
    const phonePattern = `^\\+?${digits.split("").join("[\\s().-]*")}$`;
    const user = await User.findOne({
      phone: { $regex: phonePattern },
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    }).select("name phone rank elo");
    if (!user) return null;
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        balance: 0,
        points: 0,
        transactions: [],
      });
    }

    const now = new Date();
    let availableVouchers = await Voucher.find({
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gt: now },
      $or: [
        { maxUses: { $exists: false } },
        { maxUses: null },
        { $expr: { $lt: ["$usageCount", "$maxUses"] } },
      ],
    })
      .select("code description discountType discountValue minOrderAmount")
      .lean();

    if (availableVouchers.length === 0) {
      const admin = await User.findOne({ role: UserRole.ADMIN });
      if (admin) {
        try {
          await Voucher.insertMany([
            {
              code: "CZVIP50",
              description: "Voucher Hội Viên VIP - Giảm 50.000đ",
              discountType: VoucherDiscountType.FIXED,
              discountValue: 50000,
              minOrderAmount: 100000,
              startsAt: new Date(Date.now() - 3600000),
              expiresAt: new Date(Date.now() + 60 * 86400000),
              isActive: true,
              createdBy: admin._id,
            },
            {
              code: "SINHNHAT",
              description: "Quà Tặng Sinh Nhật - Giảm 20%",
              discountType: VoucherDiscountType.PERCENT,
              discountValue: 20,
              minOrderAmount: 0,
              startsAt: new Date(Date.now() - 3600000),
              expiresAt: new Date(Date.now() + 60 * 86400000),
              isActive: true,
              createdBy: admin._id,
            },
            {
              code: "CUEZONE20",
              description: "Voucher Tích Điểm - Giảm 20.000đ",
              discountType: VoucherDiscountType.FIXED,
              discountValue: 20000,
              minOrderAmount: 50000,
              startsAt: new Date(Date.now() - 3600000),
              expiresAt: new Date(Date.now() + 60 * 86400000),
              isActive: true,
              createdBy: admin._id,
            },
          ]);
          availableVouchers = await Voucher.find({
            isActive: true,
            startsAt: { $lte: now },
            expiresAt: { $gt: now },
          })
            .select("code description discountType discountValue minOrderAmount")
            .lean();
        } catch {
          // Bỏ qua lỗi duplicate nếu đã có
        }
      }
    }

    return {
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      rank: user.rank || "Standard",
      elo: user.elo || 1000,
      walletBalance: wallet?.balance ?? 0,
      walletPoints: wallet?.points ?? 0,
      isMember: true,
      availableVouchers: availableVouchers.map((v) => ({
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderAmount: v.minOrderAmount,
      })),
    };
  }

  async getAll(filters?: {
    type?: string;
    status?: string;
    area?: string;
    isActive?: string;
  }): Promise<ITable[]> {
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
    const table = await Table.create({
      code,
      name,
      type,
      area,
      floor,
      pricePerHour,
      status: TableStatus.AVAILABLE,
    });
    notificationService
      .create({
        title: "Thêm bàn mới",
        message: `Đã thêm bàn "${table.name}" (Mã: ${table.code}) khu vực ${table.area}.`,
        type: NotificationType.TABLE,
      })
      .catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async update(id: string, dto: UpdateTableDTO): Promise<ITable> {
    const existing = await Table.findById(id);
    if (!existing) throw new Error("Không tìm thấy bàn");

    if (
      existing.currentSession &&
      ((dto as any).currentSession !== undefined || (dto as any).status !== undefined)
    ) {
      throw new Error(
        "Không thể thay đổi phiên chơi hoặc trạng thái bàn qua API cập nhật danh mục",
      );
    }

    const { name, type, area, floor, pricePerHour, isActive } = dto;
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    if (area) updateFields.area = area;
    if (floor !== undefined) updateFields.floor = floor;
    if (pricePerHour !== undefined) updateFields.pricePerHour = pricePerHour;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const table = await Table.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );
    if (!table) throw new Error("Không tìm thấy bàn");

    notificationService
      .create({
        title: "Cập nhật bàn",
        message: `Đã cập nhật thông tin bàn "${table.name}" (Mã: ${table.code}).`,
        type: NotificationType.TABLE,
      })
      .catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async updateStatus(id: string, status: TableStatus): Promise<ITable> {
    if (![TableStatus.AVAILABLE, TableStatus.MAINTENANCE].includes(status)) {
      throw new Error("Hãy dùng API phiên chơi hoặc đặt bàn để thay đổi trạng thái này");
    }
    const existing = await Table.findById(id);
    if (!existing) throw new Error("Không tìm thấy bàn");
    if (
      existing.currentSession ||
      existing.bookedInfo ||
      existing.status === TableStatus.PLAYING ||
      existing.status === TableStatus.BOOKED
    ) {
      throw new Error(
        "Bàn đang có khách chơi hoặc đã được đặt trước, không thể chuyển sang bảo trì",
      );
    }
    existing.status = status;
    await existing.save();
    const statusLabels: Record<string, string> = {
      available: "Trống",
      playing: "Đang chơi",
      booked: "Đặt trước",
      maintenance: "Bảo trì",
    };
    notificationService
      .create({
        title: "Đổi trạng thái bàn",
        message: `Bàn "${existing.name}" (Mã: ${existing.code}) chuyển sang trạng thái ${statusLabels[status] || status}.`,
        type: NotificationType.TABLE,
      })
      .catch(() => {});
    emitTableStatusChanged({
      tableId: String(existing._id),
      status: existing.status,
      table: existing,
    });
    return existing;
  }

  async delete(id: string): Promise<void> {
    const table = await Table.findById(id);
    if (!table) throw new Error("Không tìm thấy bàn");
    if (
      table.currentSession ||
      table.bookedInfo ||
      table.status === TableStatus.PLAYING ||
      table.status === TableStatus.BOOKED
    ) {
      throw new Error("Không thể xóa bàn đang có khách chơi hoặc đã được đặt trước");
    }
    await Table.findByIdAndDelete(id);
    notificationService
      .create({
        title: "Xóa bàn",
        message: `Đã xóa bàn "${table.name}" (Mã: ${table.code}).`,
        type: NotificationType.TABLE,
      })
      .catch(() => {});
    emitTableStatusChanged({ tableId: id, status: "deleted" });
  }

  async cancelBooking(id: string): Promise<ITable> {
    const table = await Table.findById(id);
    if (!table) throw new Error("Không tìm thấy bàn");
    if (table.status !== TableStatus.BOOKED) {
      // Nếu bàn đã mở hoặc đang chơi, chỉ cần xóa thông tin đặt trước nếu có
      table.bookedInfo = undefined;
      await table.save();
      emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
      return table;
    }
    table.status = TableStatus.AVAILABLE;
    table.bookedInfo = undefined;
    await table.save();
    notificationService
      .create({
        title: "Hủy đặt bàn",
        message: `Bàn "${table.name}" (Mã: ${table.code}) đã được giải phóng về trạng thái Trống.`,
        type: NotificationType.TABLE,
      })
      .catch(() => {});
    emitTableStatusChanged({ tableId: String(table._id), status: table.status, table });
    return table;
  }

  async getStats(): Promise<{
    total: number;
    available: number;
    playing: number;
    paused: number;
    booked: number;
    maintenance: number;
  }> {
    const tables = await Table.find();
    let available = 0,
      playing = 0,
      paused = 0,
      booked = 0,
      maintenance = 0;
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
    const typeLabel =
      type === "pool"
        ? "Bida Lỗ (Pool)"
        : type === "carom"
          ? "Bida Carom"
          : type === "snooker"
            ? "Snooker"
            : "bàn";

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

  async getPublicTables(filters?: {
    type?: string;
    area?: string;
    status?: string;
  }): Promise<any[]> {
    const query: any = { isActive: true };
    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;
    if (filters?.area) query.area = filters.area;

    const tables = await Table.find(query).sort({ code: 1 });
    const now = Date.now();

    // Tự động kiểm tra và giải phóng bàn đã hết hạn đặt hoặc chưa tới giờ giữ bàn
    for (const t of tables) {
      if (t.status === TableStatus.BOOKED && t.bookedInfo?.time) {
        const match = t.bookedInfo.time.match(/(\d{1,2}:\d{2})\s*\(([\d-]+)\)/);
        if (match) {
          const [, timeStr, dateStr] = match;
          const bookingStart = new Date(`${dateStr}T${timeStr}:00+07:00`).getTime();
          const minutesDiff = (bookingStart - now) / 60000;
          if (minutesDiff < -60) {
            t.status = TableStatus.AVAILABLE;
            const bId = t.bookedInfo.bookingId;
            t.bookedInfo = undefined;
            Table.updateOne(
              { _id: t._id },
              { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } },
            ).catch(() => {});
            if (bId) {
              Booking.updateOne(
                { _id: bId, status: { $in: ["pending", "approved", "confirmed"] } },
                { $set: { status: "cancelled", cancelReason: "Tự động hủy do quá hạn nhận bàn" } },
              ).catch(() => {});
            }
          } else if (minutesDiff > 60) {
            // Còn trên 60 phút nữa mới tới giờ hẹn: bàn vẫn khả dụng cho khách chơi trước
            t.status = TableStatus.AVAILABLE;
            Table.updateOne({ _id: t._id }, { $set: { status: TableStatus.AVAILABLE } }).catch(() => {});
          }
        }
      }
    }

    const typeLabels: Record<string, string> = {
      pool: "Bàn Bida Lỗ (Pool)",
      carom: "Bàn Bida Carom (Phăng)",
      snooker: "Bàn Bida Snooker",
    };

    return tables.map((t) => {
      let durationMinutes: number | undefined;
      let durationFormatted: string | undefined;

      if (
        (t.status === TableStatus.PLAYING || t.status === TableStatus.PAUSED) &&
        t.currentSession
      ) {
        const effectiveNow =
          t.currentSession.isPaused && t.currentSession.pausedAt ? t.currentSession.pausedAt : now;
        const elapsed = Math.max(
          0,
          effectiveNow - t.currentSession.startedAt - (t.currentSession.totalPausedMs || 0),
        );
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
