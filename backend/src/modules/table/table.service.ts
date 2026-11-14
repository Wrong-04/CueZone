import mongoose from "mongoose";
import { Table, ITable, TableStatus } from "./table.model";
import { User, UserRole } from "../user/user.model";
import { Voucher, VoucherDiscountType, VoucherUsage } from "../voucher/voucher.model";
import { Wallet } from "../wallet/wallet.model";
import { Booking } from "../booking/booking.model";
import { CreateTableDTO, UpdateTableDTO } from "./dto/table.dto";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";
import { getMemberTier, isVipMemberTier } from "../member/membership.policy";
import { normalizePhone, phonePattern } from "../../utils/phone";

const notificationService = new NotificationService();

function parseBookingTimestamp(timeStr?: string): number | null {
  if (!timeStr) return null;
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;
  const h = parseInt(timeMatch[1], 10);
  const m = parseInt(timeMatch[2], 10);

  const dateMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, mo, d] = dateMatch;
    const pad = (n: number | string) => String(n).padStart(2, "0");
    const ts = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(m)}:00+07:00`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  // Fallback ngày hôm nay theo giờ Việt Nam UTC+7
  const nowVN = new Date(Date.now() + 7 * 3600000);
  const y = nowVN.getUTCFullYear();
  const mo = String(nowVN.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nowVN.getUTCDate()).padStart(2, "0");
  const pad = (n: number | string) => String(n).padStart(2, "0");
  const ts = new Date(`${y}-${mo}-${d}T${pad(h)}:${pad(m)}:00+07:00`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export class TableService {
  async lookupCustomer(query: string) {
    const trimmed = (query || "").trim();
    if (!trimmed) return null;
    const pattern = phonePattern(trimmed);
    const conditions: any[] = [];
    if (pattern) {
      conditions.push({ phone: { $regex: pattern } });
    }
    if (trimmed.length >= 2) {
      const safeName = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({ name: { $regex: safeName, $options: "i" } });
    }
    if (conditions.length === 0) return null;

    const user = await User.findOne({
      $or: conditions,
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    }).select("name phone rank elo");
    if (!user) return null;
    const wallet = await Wallet.findOne({ userId: user._id }).select("points");
    const points = wallet?.points ?? 0;
    const { tier } = getMemberTier(points);

    const now = new Date();
    const isVipCustomer = isVipMemberTier(points);
    const audienceQuery = isVipCustomer
      ? { $in: ["all", "new_member", "vip", null, undefined] }
      : { $in: ["all", "new_member", null, undefined] };

    // Tìm các voucher mà khách hàng này đã từng sử dụng (mỗi khách dùng 1 lần)
    const usedConditions: any[] = [{ customerId: user._id }];
    if (user.phone) {
      const pattern = phonePattern(user.phone);
      if (pattern) {
        usedConditions.push({ customerPhone: { $regex: pattern } });
      } else {
        usedConditions.push({ customerPhone: user.phone });
      }
    }
    const usedVoucherIds = await VoucherUsage.find({ $or: usedConditions }).distinct("voucherId");

    const totalStoreVouchers = await Voucher.countDocuments({ isActive: true });

    const availableVouchers = await Voucher.find({
      _id: { $nin: usedVoucherIds },
      isActive: true,
      startsAt: { $lte: now },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
      $and: [
        {
          $or: [
            { targetAudience: audienceQuery },
            { targetAudience: { $exists: false } },
            { targetAudience: null },
          ],
        },
        {
          $or: [
            { maxUses: { $exists: false } },
            { maxUses: null },
            { $expr: { $lt: ["$usageCount", "$maxUses"] } },
          ],
        },
      ],
    })
      .select("code description discountType discountValue maxDiscountAmount minOrderAmount targetAudience")
      .lean();

    return {
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      rank: tier.name,
      membershipTierKey: tier.key,
      discountPercent: tier.tableDiscountPercent,
      fnbDiscountPercent: tier.fnbDiscountPercent,
      elo: user.elo || 1000,
      membershipPoints: points,
      isMember: true,
      totalStoreVouchers,
      availableVouchers: availableVouchers.map((v) => ({
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        maxDiscountAmount: v.maxDiscountAmount,
        minOrderAmount: v.minOrderAmount,
        targetAudience: (v as any).targetAudience || "all",
      })),
    };
  }

  async quickRegisterCustomer(data: { phone: string; name?: string }) {
    const rawPhone = (data.phone || "").trim();
    const digits = normalizePhone(rawPhone);
    if (digits.length < 8 || digits.length > 12) {
      throw new Error("Số điện thoại không hợp lệ (phải từ 8-12 chữ số)");
    }

    const users = await User.find({ phone: { $regex: phonePattern(rawPhone)! } }).limit(2);
    if (users.length > 1) {
      throw new Error("Số điện thoại hội viên không duy nhất, vui lòng kiểm tra hồ sơ tại quầy");
    }
    const existingAnyUser = users[0];

    if (existingAnyUser && existingAnyUser.role !== UserRole.CUSTOMER) {
      throw new Error(`Số điện thoại này đã được đăng ký cho tài khoản nhân viên (${existingAnyUser.name})`);
    }

    let user = existingAnyUser;

    let isNewCustomer = false;
    if (!user) {
      isNewCustomer = true;
      const customerName = (data.name || "").trim() || `Khách ${digits.slice(-4)}`;
      const uniqueSuffix = Date.now().toString(36);
      const email = `khach_${digits}_${uniqueSuffix}@cuezone.local`;

      user = new User({
        name: customerName,
        phone: digits,
        email,
        password: `cz@${digits.slice(-4)}`,
        role: UserRole.CUSTOMER,
        elo: 1000,
        isActive: true,
        isLocked: false,
      });
      await user.save();

      await Wallet.create({
        userId: user._id,
        balance: 0,
        points: 0,
      });
    } else if (data.name && data.name.trim() && (user.name.startsWith("Khách ") || !user.name)) {
      user.name = data.name.trim();
      await user.save();
    }

    const customerInfo = await this.lookupCustomer(user.phone || digits);
    return {
      ...customerInfo,
      isNewCustomer,
      message: isNewCustomer
        ? `Đăng ký thành công hội viên ${user.name}! Đã kích hoạt ví ưu đãi.`
        : `Hội viên ${user.name} đã sẵn sàng.`,
    };
  }

  async getAll(filters?: {
    type?: string;
    status?: string;
    area?: string;
    isActive?: string;
  }): Promise<ITable[]> {
    try {
      await this.autoReleaseExpiredBookings();
    } catch {
      // Tiếp tục thực hiện truy vấn nếu auto release lỗi
    }
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
    const bId = table.bookedInfo?.bookingId;

    if (table.status !== TableStatus.BOOKED) {
      // Nếu bàn đã mở hoặc đang chơi, chỉ cần xóa thông tin đặt trước nếu có
      table.bookedInfo = undefined;
      await table.save();
    } else {
      table.status = TableStatus.AVAILABLE;
      table.bookedInfo = undefined;
      await table.save();
    }

    if (bId && mongoose.isValidObjectId(bId)) {
      await Booking.updateOne(
        { _id: bId, status: { $in: ["pending", "approved", "confirmed"] } },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancellationReason: "Hủy giữ bàn tại quầy thu ngân",
          },
        },
      ).catch(() => {});
    }

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

  async autoReleaseExpiredBookings(): Promise<number> {
    const now = Date.now();
    const tables = await Table.find({
      $or: [
        { status: TableStatus.BOOKED },
        { "bookedInfo.time": { $exists: true } },
      ],
    });
    let releasedCount = 0;
    for (const t of tables) {
      if (!t.bookedInfo?.time) {
        if (t.status === TableStatus.BOOKED) {
          t.status = TableStatus.AVAILABLE;
          await t.save();
          releasedCount++;
          emitTableStatusChanged({ tableId: String(t._id), status: TableStatus.AVAILABLE, table: t });
        }
        continue;
      }

      const bookingStart = parseBookingTimestamp(t.bookedInfo.time);
      if (!bookingStart) continue;

      const overdueMinutes = (now - bookingStart) / 60000;
      // Quá hạn 15 phút không đến nhận bàn -> Tự động hủy và giải phóng bàn
      if (overdueMinutes > 15) {
        const bId = t.bookedInfo.bookingId;
        const customerName = t.bookedInfo.customerName;

        if (t.status === TableStatus.BOOKED) {
          t.status = TableStatus.AVAILABLE;
        }
        t.bookedInfo = undefined;
        await t.save();
        releasedCount++;

        if (bId && mongoose.isValidObjectId(bId)) {
          await Booking.updateOne(
            { _id: bId, status: { $in: ["pending", "approved", "confirmed"] } },
            {
              $set: {
                status: "cancelled",
                cancelledAt: new Date(),
                cancellationReason: "Tự động hủy do khách trễ quá hạn giữ bàn (15 phút)",
              },
            },
          ).catch(() => {});
        }

        notificationService
          .create({
            title: "Tự động giải phóng bàn quá hạn",
            message: `Bàn "${t.name}" (${t.code}) đã tự động hủy giữ bàn do khách ${customerName || "hẹn"} trễ quá 15 phút chưa đến nhận bàn.`,
            type: NotificationType.TABLE,
          })
          .catch(() => {});

        emitTableStatusChanged({ tableId: String(t._id), status: t.status, table: t });
      }
    }
    return releasedCount;
  }

  async getStats(): Promise<{
    total: number;
    available: number;
    playing: number;
    paused: number;
    booked: number;
    maintenance: number;
  }> {
    try {
      await this.autoReleaseExpiredBookings();
    } catch {
      // Bỏ qua lỗi
    }
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
    try {
      await this.autoReleaseExpiredBookings();
    } catch {
      // Bỏ qua lỗi
    }

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
