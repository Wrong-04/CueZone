import mongoose from "mongoose";
import { Booking } from "./booking.model";
import { Table, TableStatus, TableType } from "../table/table.model";
import { User } from "../user/user.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";

const notificationService = new NotificationService();

const ACTIVE_BOOKING_STATUSES = ["pending", "approved", "confirmed", "checked_in"];
const CANCELLATION_CUTOFF_MS = 2 * 60 * 60 * 1000;

function getBookingInterval(date: string, time: string, duration: number, allowPast = false) {
  const startDate = new Date(`${date}T${time}:00+07:00`);
  if (
    !Number.isFinite(startDate.getTime()) ||
    new Date(startDate.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Ngày giờ đặt bàn không hợp lệ");
  }
  if (!allowPast && startDate.getTime() <= Date.now()) {
    throw new Error("Ngày giờ đặt bàn phải ở tương lai (giờ Việt Nam)");
  }
  return {
    startDate,
    endDate: new Date(startDate.getTime() + duration * 60 * 60 * 1000),
  };
}

function getStoredBookingInterval(booking: any) {
  const startDate = booking.startDate
    ? new Date(booking.startDate)
    : new Date(`${booking.date}T${booking.time}:00+07:00`);
  const endDate = booking.endDate
    ? new Date(booking.endDate)
    : new Date(startDate.getTime() + Number(booking.duration || 2) * 60 * 60 * 1000);
  return { startDate, endDate };
}

export function bookingInput(input: any) {
  const tableRef = input.table || input.tableId;
  const deposit = input.deposit ?? 0;
  if (
    typeof input.customerName !== "string" ||
    !input.customerName.trim() ||
    input.customerName.length > 120 ||
    typeof input.phone !== "string" ||
    !/^[+\d\s().-]{8,30}$/.test(input.phone) ||
    !mongoose.isValidObjectId(tableRef) ||
    typeof input.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    typeof input.time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
    !Number.isInteger(input.duration) ||
    input.duration < 1 ||
    input.duration > 24 ||
    !Number.isSafeInteger(deposit) ||
    deposit < 0 ||
    (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000))
  ) {
    throw new Error("Thông tin đặt bàn không hợp lệ");
  }
  const { startDate, endDate } = getBookingInterval(input.date, input.time, input.duration);
  return {
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    table: tableRef,
    date: input.date,
    time: input.time,
    duration: input.duration,
    startDate,
    endDate,
    deposit,
    note: input.note,
  };
}

export class BookingService {
  private async hasSlotConflict(
    tableId: string,
    startDate: Date,
    endDate: Date,
    session?: mongoose.ClientSession,
    excludeBookingId?: string,
  ) {
    const filter: Record<string, any> = {
      table: tableId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    };
    if (excludeBookingId) filter._id = { $ne: excludeBookingId };
    let query = Booking.find(filter).select("date time duration startDate endDate");
    if (session) query = query.session(session);
    const bookings = await query;
    return bookings.some((booking) => {
      const interval = getStoredBookingInterval(booking);
      return (
        Number.isFinite(interval.startDate.getTime()) &&
        Number.isFinite(interval.endDate.getTime()) &&
        interval.startDate < endDate &&
        interval.endDate > startDate
      );
    });
  }

  async getAvailableTables(input: {
    date: string;
    time: string;
    duration: number;
    type?: string;
  }) {
    if (
      typeof input.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      typeof input.time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
      !Number.isInteger(input.duration) ||
      input.duration < 1 ||
      input.duration > 24 ||
      (input.type !== undefined && !Object.values(TableType).includes(input.type as TableType))
    ) {
      throw new Error("Khung giờ tìm bàn không hợp lệ");
    }
    const { startDate, endDate } = getBookingInterval(
      input.date,
      input.time,
      input.duration,
      true,
    );
    if (startDate.getTime() <= Date.now()) return [];
    const tableFilter: Record<string, any> = {
      isActive: true,
      status: { $ne: TableStatus.MAINTENANCE },
    };
    if (input.type) tableFilter.type = input.type;
    const tables = await Table.find(tableFilter).sort({ code: 1 });
    const available = [];
    for (const table of tables) {
      if (!(await this.hasSlotConflict(String(table._id), startDate, endDate))) {
        available.push(table);
      }
    }
    return available;
  }

  async getAll() {
    const list = await Booking.find()
      .populate("customer")
      .populate("table")
      .sort({ createdAt: -1 });
    return list.map((b: any) => {
      const obj = b.toObject ? b.toObject() : b;
      const cust = obj.customer;
      const tbl = obj.table;
      return {
        ...obj,
        customerName: obj.customerName || (cust && cust.name ? cust.name : "Khách đặt trước"),
        phone: obj.phone || (cust && cust.phone ? cust.phone : "0900000000"),
        tableId: tbl ? String(tbl._id) : obj.table ? String(obj.table) : "",
        tableName: obj.tableName || (tbl ? tbl.name : "Bàn bida"),
        date:
          obj.date ||
          (obj.bookingDate
            ? new Date(obj.bookingDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)),
        time: obj.time || obj.startTime || "19:00",
        duration: obj.duration || 2,
        estimatedCost: obj.estimatedCost || (tbl ? tbl.pricePerHour * 2 : 120000),
        deposit: obj.deposit || 0,
        status: obj.status === "confirmed" ? "approved" : obj.status,
      };
    });
  }

  async getCustomerBookings(customerId: string) {
    if (!mongoose.isValidObjectId(customerId)) {
      throw new Error("Tài khoản khách hàng không hợp lệ");
    }
    const list = await Booking.find({ customer: customerId })
      .populate("table")
      .sort({ createdAt: -1 });
    return list.map((booking: any) => {
      const table = booking.table;
      return {
        ...(booking.toObject ? booking.toObject() : booking),
        tableId: table ? String(table._id) : String(booking.table || ""),
        tableName: booking.tableName || table?.name || "Bàn bida",
        tableType: table?.type,
        status: booking.status === "confirmed" ? "approved" : booking.status,
      };
    });
  }

  async create(
    input: any,
    customerId?: string,
    initialStatus: "pending" | "approved" = "approved",
  ) {
    const dto = bookingInput(input);
    const associatedCustomer =
      customerId && mongoose.isValidObjectId(customerId)
        ? await User.findOne({
            _id: customerId,
            role: "customer",
            isActive: true,
            isLocked: false,
          }).select("_id")
        : null;
    const associatedCustomerId = associatedCustomer ? customerId : undefined;
    if (initialStatus === "pending" && !associatedCustomerId) {
      throw new Error("Vui lòng đăng nhập tài khoản khách hàng để đặt bàn");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOneAndUpdate(
        {
          _id: dto.table,
          isActive: true,
          status:
            initialStatus === "pending"
              ? { $ne: TableStatus.MAINTENANCE }
              : TableStatus.AVAILABLE,
        },
        { $inc: { bookingVersion: 1 } },
        { new: true, session },
      );
      if (!table) throw new Error("Bàn không còn trống, vui lòng tải lại");
      if (await this.hasSlotConflict(String(table._id), dto.startDate, dto.endDate, session)) {
        throw new Error("Khung giờ này đã có người đặt, vui lòng chọn thời gian khác");
      }
      const [booking] = await Booking.create(
        [
          {
            ...dto,
            table: table._id,
            customer: associatedCustomerId,
            tableName: table.name,
            estimatedCost: table.pricePerHour * dto.duration,
            status: initialStatus,
          },
        ],
        { session },
      );
      if (initialStatus === "approved") {
        table.status = TableStatus.BOOKED;
        table.bookedInfo = {
          customerName: booking.customerName || "Khách đặt trước",
          phone: booking.phone || "0900000000",
          time: `${booking.time} (${booking.date})`,
          bookingId: String(booking._id),
        };
        await table.save({ session });
      }
      return { booking, table };
    });
    if (initialStatus === "approved") {
      emitTableStatusChanged({
        tableId: String(result.table._id),
        status: result.table.status,
        table: result.table,
      });
    }
    if (associatedCustomerId) {
      await notificationService
        .createForUser(associatedCustomerId, {
          title:
            initialStatus === "pending" ? "Đã nhận yêu cầu đặt bàn" : "Đặt bàn đã được xác nhận",
          content:
            initialStatus === "pending"
              ? `Yêu cầu đặt bàn ${result.booking.date} lúc ${result.booking.time} tại ${result.booking.tableName} đang chờ xác nhận.`
              : `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} tại ${result.booking.tableName} đã được xác nhận.`,
          type: NotificationType.TABLE,
        })
        .catch(() => undefined);
    }
    await notificationService
      .create({
        title: "Có lịch đặt bàn mới",
        content: `${result.booking.customerName} đặt ${result.booking.tableName} ngày ${result.booking.date} lúc ${result.booking.time}.`,
        type: NotificationType.TABLE,
      })
      .catch(() => undefined);
    return {
      ...(result.booking.toObject ? result.booking.toObject() : result.booking),
      tableId: String(result.table._id),
    };
  }

  async cancelCustomerBooking(customerId: string, id: string, reason?: string) {
    if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(id)) {
      throw new Error("Yêu cầu hủy đặt bàn không hợp lệ");
    }
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 1000)) {
      throw new Error("Lý do hủy không được vượt quá 1000 ký tự");
    }
    return mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOne({ _id: id, customer: customerId }).session(session);
      if (!booking) throw new Error("Không tìm thấy đơn đặt bàn");
      if (booking.status !== "pending") {
        throw new Error("Chỉ có thể hủy đơn đặt bàn đang chờ xác nhận");
      }
      const { startDate } = getStoredBookingInterval(booking);
      if (!Number.isFinite(startDate.getTime())) {
        throw new Error("Thời gian đặt bàn không hợp lệ");
      }
      if (startDate.getTime() - CANCELLATION_CUTOFF_MS <= Date.now()) {
        throw new Error("Đã quá hạn hủy đặt bàn (trước giờ chơi ít nhất 2 tiếng)");
      }
      await Table.updateOne(
        { _id: booking.table },
        { $inc: { bookingVersion: 1 } },
        { session },
      );
      const update = await Booking.updateOne(
        { _id: id, customer: customerId, status: "pending" },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancellationReason: reason?.trim() || undefined,
          },
        },
        { session },
      );
      if (update.modifiedCount !== 1) {
        throw new Error("Trạng thái đơn đã thay đổi, vui lòng tải lại");
      }
      return { ...booking.toObject(), status: "cancelled", cancelledAt: new Date() };
    });
  }

  async update(id: string, input: any) {
    const inputTableId = input.tableId || input.table;
    if (
      !mongoose.isValidObjectId(id) ||
      !["approved", "rejected", "pending"].includes(input.status)
    ) {
      throw new Error("Yêu cầu cập nhật không hợp lệ");
    }
    if (
      input.status === "rejected" &&
      (typeof input.rejectionReason !== "string" ||
        !input.rejectionReason.trim() ||
        input.rejectionReason.length > 1000)
    ) {
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
      if (!allowed[booking.status]?.includes(input.status))
        throw new Error("Trạng thái đơn đã thay đổi, vui lòng tải lại");
      let affectedTableId: string | undefined;
      if (input.status === "approved") {
        if (!mongoose.isValidObjectId(inputTableId)) throw new Error("Vui lòng chọn bàn hợp lệ");
        const table = await Table.findOne({
          _id: inputTableId,
          isActive: true,
          $or: [
            { status: TableStatus.AVAILABLE },
            { status: TableStatus.BOOKED, "bookedInfo.bookingId": id },
          ],
        }).session(session);
        if (!table) throw new Error("Bàn không còn trống");
        const interval = getStoredBookingInterval(booking);
        if (
          await this.hasSlotConflict(
            String(table._id),
            interval.startDate,
            interval.endDate,
            session,
            id,
          )
        ) {
          throw new Error("Khung giờ này đã có đơn đặt bàn khác");
        }
        if (
          String(booking.table) !== inputTableId &&
          (booking.status === "approved" || booking.status === "confirmed")
        ) {
          await Table.updateOne(
            { _id: booking.table, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
            { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } },
            { session },
          );
        }
        const custUser = booking.customer
          ? await User.findById(booking.customer).session(session)
          : null;
        const resolvedName: string = String(
          booking.customerName || custUser?.name || "Khách đặt trước",
        );
        const resolvedPhone: string = String(booking.phone || custUser?.phone || "0900000000");
        booking.customerName = resolvedName;
        booking.phone = resolvedPhone;
        booking.table = table._id;
        booking.tableName = table.name;
        if (!booking.startDate || !booking.endDate) {
          booking.startDate = interval.startDate;
          booking.endDate = interval.endDate;
        }
        booking.estimatedCost = table.pricePerHour * (booking.duration || 2);
        table.status = TableStatus.BOOKED;
        table.bookedInfo = {
          customerName: resolvedName,
          phone: resolvedPhone,
          time: `${booking.time || "19:00"} (${booking.date || new Date().toISOString().slice(0, 10)})`,
          bookingId: id,
        };
        await table.save({ session });
        affectedTableId = String(table._id);
      } else if (booking.status === "approved" || booking.status === "confirmed") {
        await Table.updateOne(
          { _id: booking.table, "bookedInfo.bookingId": id, status: TableStatus.BOOKED },
          { $set: { status: TableStatus.AVAILABLE }, $unset: { bookedInfo: 1 } },
          { session },
        );
        affectedTableId = String(booking.table);
      }
      booking.status = input.status;
      booking.rejectionReason =
        input.status === "rejected" ? input.rejectionReason.trim() : undefined;
      await booking.save({ session });
      return { booking, affectedTableId, previousStatus };
    });
    if (result.affectedTableId) {
      emitTableStatusChanged({ tableId: result.affectedTableId });
    }
    if (result.booking.customer && result.previousStatus !== result.booking.status) {
      const isRejected = result.booking.status === "rejected";
      if (isRejected || result.booking.status === "approved") {
        const reason = result.booking.rejectionReason
          ? ` Lý do: ${result.booking.rejectionReason}`
          : "";
        await notificationService
          .createForUser(String(result.booking.customer), {
            title: isRejected ? "Đặt bàn đã bị từ chối" : "Đặt bàn đã được xác nhận",
            content: isRejected
              ? `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} đã bị từ chối.${reason}`
              : `Lịch đặt bàn ${result.booking.date} lúc ${result.booking.time} tại ${result.booking.tableName} đã được xác nhận.`,
            type: NotificationType.TABLE,
          })
          .catch(() => undefined);
      }
    }
    return {
      ...(result.booking.toObject ? result.booking.toObject() : result.booking),
      tableId: result.affectedTableId,
    };
  }
}
