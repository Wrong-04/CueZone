import mongoose from "mongoose";
import { Booking } from "./booking.model";
import { Table, TableStatus } from "../table/table.model";

export function bookingInput(input: any) {
  if (typeof input.customerName !== "string" || !input.customerName.trim() || input.customerName.length > 120 ||
      typeof input.phone !== "string" || !/^[+\d\s().-]{8,30}$/.test(input.phone) ||
      !mongoose.isValidObjectId(input.tableId) ||
      typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      typeof input.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
      !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 24 ||
      !Number.isSafeInteger(input.deposit) || input.deposit < 0 ||
      (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))) {
    throw new Error("Thông tin đặt bàn không hợp lệ");
  }
  const start = new Date(`${input.date}T${input.time}:00+07:00`);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now() ||
      new Date(start.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== input.date) {
    throw new Error("Ngày giờ đặt bàn phải hợp lệ và ở tương lai (giờ Việt Nam)");
  }
  return { customerName: input.customerName.trim(), phone: input.phone.trim(), tableId: input.tableId,
    date: input.date, time: input.time, duration: input.duration, deposit: input.deposit, note: input.note };
}

export class BookingService {
  async getAll() {
    return Booking.find().sort({ createdAt: -1 });
  }

  async create(input: any) {
    const dto = bookingInput(input);
    // ponytail: one held reservation per table; add interval scheduling when multiple future slots are needed.
    return mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({ _id: dto.tableId, isActive: true, status: TableStatus.AVAILABLE }).session(session);
      if (!table) throw new Error("Bàn không còn trống, vui lòng tải lại");
      const [booking] = await Booking.create([{ ...dto, tableName: table.name, estimatedCost: table.pricePerHour * dto.duration, status: "approved" }], { session });
      table.status = TableStatus.BOOKED;
      table.bookedInfo = { customerName: booking.customerName, phone: booking.phone,
        time: `${booking.time} (${booking.date})`, bookingId: String(booking._id) };
      await table.save({ session });
      return booking;
    });
  }

  async update(id: string, input: any) {
    if (!mongoose.isValidObjectId(id) || !["approved", "rejected", "pending"].includes(input.status)) {
      throw new Error("Yêu cầu cập nhật không hợp lệ");
    }
    if (input.status === "rejected" && (typeof input.rejectionReason !== "string" ||
        !input.rejectionReason.trim() || input.rejectionReason.length > 1000)) {
      throw new Error("Vui lòng nhập lý do từ chối (tối đa 1000 ký tự)");
    }
    return mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new Error("Không tìm thấy đơn đặt bàn");
      const allowed: Record<string, string[]> = { pending: ["approved", "rejected"], approved: ["approved", "rejected"], rejected: ["pending"] };
      if (!allowed[booking.status]?.includes(input.status)) throw new Error("Trạng thái đơn đã thay đổi, vui lòng tải lại");
      if (input.status === "approved") {
        if (!mongoose.isValidObjectId(input.tableId)) throw new Error("Vui lòng chọn bàn hợp lệ");
        const table = await Table.findOne({ _id: input.tableId, isActive: true, $or: [
          { status: TableStatus.AVAILABLE }, { status: TableStatus.BOOKED, "bookedInfo.bookingId": id },
        ] }).session(session);
        if (!table) throw new Error("Bàn không còn trống");
        if (String(booking.tableId) !== input.tableId && booking.status === "approved") {
          await Table.updateOne({ _id: booking.tableId, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
            { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } }, { session });
        }
        booking.tableId = table._id;
        booking.tableName = table.name;
        booking.estimatedCost = table.pricePerHour * booking.duration;
        table.status = TableStatus.BOOKED;
        table.bookedInfo = { customerName: booking.customerName, phone: booking.phone,
          time: `${booking.time} (${booking.date})`, bookingId: id };
        await table.save({ session });
      } else if (booking.status === "approved") {
        await Table.updateOne({ _id: booking.tableId, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
          { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } }, { session });
      }
      booking.status = input.status;
      booking.rejectionReason = input.status === "rejected" ? input.rejectionReason.trim() : undefined;
      await booking.save({ session });
      return booking;
    });
  }
}
