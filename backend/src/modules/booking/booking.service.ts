import mongoose from "mongoose";
import { Booking } from "./booking.model";
import { Table, TableStatus } from "../table/table.model";
import { User } from "../user/user.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

export function bookingInput(input: any) {
  const deposit = input.deposit ?? 0;
  if (typeof input.customerName !== "string" || !input.customerName.trim() || input.customerName.length > 120 ||
      typeof input.phone !== "string" || !/^[+\d\s().-]{8,30}$/.test(input.phone) ||
      !mongoose.isValidObjectId(input.tableId) ||
      typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      typeof input.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
      !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 24 ||
      !Number.isSafeInteger(deposit) || deposit < 0 ||
      (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))) {
    throw new Error("Thông tin đặt bàn không hợp lệ");
  }
  const start = new Date(`${input.date}T${input.time}:00+07:00`);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now() ||
      new Date(start.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== input.date) {
    throw new Error("Ngày giờ đặt bàn phải hợp lệ và ở tương lai (giờ Việt Nam)");
  }
  return { customerName: input.customerName.trim(), phone: input.phone.trim(), tableId: input.tableId,
    date: input.date, time: input.time, duration: input.duration, deposit, note: input.note };
}

export class BookingService {
  async getAll() {
    const list = await Booking.find().populate("customer").populate("table").sort({ createdAt: -1 });
    return list.map((b: any) => {
      const obj = b.toObject ? b.toObject() : b;
      const cust = obj.customer;
      const tbl = obj.table;
      return {
        ...obj,
        customerName: obj.customerName || (cust && cust.name ? cust.name : "Khách đặt trước"),
        phone: obj.phone || (cust && cust.phone ? cust.phone : "0900000000"),
        tableId: obj.tableId || (tbl ? String(tbl._id) : (obj.table ? String(obj.table) : "")),
        tableName: obj.tableName || (tbl ? tbl.name : "Bàn bida"),
        date: obj.date || (obj.bookingDate ? new Date(obj.bookingDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
        time: obj.time || obj.startTime || "19:00",
        duration: obj.duration || 2,
        estimatedCost: obj.estimatedCost || (tbl ? tbl.pricePerHour * 2 : 120000),
        deposit: obj.deposit || 0,
        status: obj.status === "confirmed" ? "approved" : obj.status,
      };
    });
  }

  async create(input: any, customerId?: string) {
    const dto = bookingInput(input);
    const associatedCustomer = customerId && mongoose.isValidObjectId(customerId)
      ? await User.findOne({ _id: customerId, role: "customer", isActive: true, isLocked: false }).select("_id")
      : null;
    const associatedCustomerId = associatedCustomer ? customerId : undefined;
    // ponytail: one held reservation per table; add interval scheduling when multiple future slots are needed.
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({ _id: dto.tableId, isActive: true, status: TableStatus.AVAILABLE }).session(session);
      if (!table) throw new Error("Bàn không còn trống, vui lòng tải lại");
      const [booking] = await Booking.create([{
        ...dto,
        customer: associatedCustomerId,
        tableName: table.name,
        estimatedCost: table.pricePerHour * dto.duration,
        status: "approved",
      }], { session });
      table.status = TableStatus.BOOKED;
      table.bookedInfo = { customerName: booking.customerName || "Khách đặt trước", phone: booking.phone || "0900000000",
        time: `${booking.time} (${booking.date})`, bookingId: String(booking._id) };
      await table.save({ session });
      return { booking, table };
    });
    emitTableStatusChanged({ tableId: String(result.table._id), status: result.table.status, table: result.table });
    if (associatedCustomerId) {
      await notificationService.createForUser(associatedCustomerId, {
        title: "Đặt bàn đã được xác nhận",
        content: `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} tại ${result.booking.tableName} đã được xác nhận.`,
        type: NotificationType.TABLE,
      }).catch(() => undefined);
    }
    await notificationService.create({
      title: "Có lịch đặt bàn mới",
      content: `${result.booking.customerName} đặt ${result.booking.tableName} ngày ${result.booking.date} lúc ${result.booking.time}.`,
      type: NotificationType.TABLE,
    }).catch(() => undefined);
    return result.booking;
  }

  async update(id: string, input: any) {
    if (!mongoose.isValidObjectId(id) || !["approved", "rejected", "pending"].includes(input.status)) {
      throw new Error("Yêu cầu cập nhật không hợp lệ");
    }
    if (input.status === "rejected" && (typeof input.rejectionReason !== "string" ||
        !input.rejectionReason.trim() || input.rejectionReason.length > 1000)) {
      throw new Error("Vui lòng nhập lý do từ chối (tối đa 1000 ký tự)");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new Error("Không tìm thấy đơn đặt bàn");
      const previousStatus = booking.status;
      const allowed: Record<string, string[]> = {
        pending: ["approved", "rejected"],
        approved: ["approved", "rejected"],
        confirmed: ["approved", "rejected"],
        rejected: ["pending"],
      };
      if (!allowed[booking.status]?.includes(input.status)) throw new Error("Trạng thái đơn đã thay đổi, vui lòng tải lại");
      let affectedTableId: string | undefined;
      if (input.status === "approved") {
        if (!mongoose.isValidObjectId(input.tableId)) throw new Error("Vui lòng chọn bàn hợp lệ");
        const table = await Table.findOne({ _id: input.tableId, isActive: true, $or: [
          { status: TableStatus.AVAILABLE }, { status: TableStatus.BOOKED, "bookedInfo.bookingId": id },
        ] }).session(session);
        if (!table) throw new Error("Bàn không còn trống");
        if (String(booking.tableId) !== input.tableId && (booking.status === "approved" || booking.status === "confirmed")) {
          await Table.updateOne({ _id: booking.tableId, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
            { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } }, { session });
        }
        const custUser = booking.customer ? await User.findById(booking.customer).session(session) : null;
        const resolvedName: string = String(booking.customerName || custUser?.name || "Khách đặt trước");
        const resolvedPhone: string = String(booking.phone || custUser?.phone || "0900000000");
        booking.customerName = resolvedName;
        booking.phone = resolvedPhone;
        booking.tableId = table._id;
        booking.tableName = table.name;
        booking.estimatedCost = table.pricePerHour * (booking.duration || 2);
        table.status = TableStatus.BOOKED;
        table.bookedInfo = { customerName: resolvedName, phone: resolvedPhone,
          time: `${booking.time || "19:00"} (${booking.date || new Date().toISOString().slice(0, 10)})`, bookingId: id };
        await table.save({ session });
        affectedTableId = String(table._id);
      } else if (booking.status === "approved" || booking.status === "confirmed") {
        await Table.updateOne({ _id: booking.tableId, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
          { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } }, { session });
        affectedTableId = String(booking.tableId);
      }
      booking.status = input.status;
      booking.rejectionReason = input.status === "rejected" ? input.rejectionReason.trim() : undefined;
      await booking.save({ session });
      return { booking, affectedTableId, previousStatus };
    });
    if (result.affectedTableId) {
      emitTableStatusChanged({ tableId: result.affectedTableId });
    }
    if (result.booking.customer && result.previousStatus !== result.booking.status) {
      const isRejected = result.booking.status === "rejected";
      if (isRejected || result.booking.status === "approved") {
        const reason = result.booking.rejectionReason ? ` Lý do: ${result.booking.rejectionReason}` : "";
        await notificationService.createForUser(String(result.booking.customer), {
          title: isRejected ? "Đặt bàn đã bị từ chối" : "Đặt bàn đã được xác nhận",
          content: isRejected
            ? `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} đã bị từ chối.${reason}`
            : `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} tại ${result.booking.tableName} đã được xác nhận.`,
          type: NotificationType.TABLE,
        }).catch(() => undefined);
      }
    }
    return result.booking;
  }
}
