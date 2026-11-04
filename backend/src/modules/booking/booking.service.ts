import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import { Booking } from "./booking.model";
import { Table, TableStatus, TableType } from "../table/table.model";
import { User } from "../user/user.model";
import { Product } from "../product/product.model";
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
  const preOrderItems = input.preOrderItems ?? [];
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
    (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000)) ||
    !Array.isArray(preOrderItems) ||
    preOrderItems.length > 30 ||
    preOrderItems.some(
      (item: any) =>
        !item ||
        typeof item !== "object" ||
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 50,
    )
  ) {
    throw new Error("Thông tin đặt bàn không hợp lệ");
  }
  if (new Set(preOrderItems.map((item: any) => String(item.productId))).size !== preOrderItems.length) {
    throw new Error("Mỗi món chỉ được xuất hiện một lần trong danh sách đặt trước");
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
    preOrderItems: preOrderItems.map((item: any) => ({
      productId: new mongoose.Types.ObjectId(String(item.productId)),
      quantity: item.quantity,
    })),
  };
}

export class BookingService {
  private hashQrToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private createQrToken() {
    return randomBytes(32).toString("hex");
  }

  async resolveQrToken(tokenValue: unknown) {
    if (typeof tokenValue !== "string" || !/^[a-f0-9]{64}$/.test(tokenValue)) {
      throw new Error("Mã QR đặt bàn không hợp lệ");
    }
    const booking = await Booking.findOne({
      qrTokenHash: this.hashQrToken(tokenValue),
      status: "approved",
    }).select("+qrTokenHash");
    if (!booking) throw new Error("Mã QR không hợp lệ, đã hủy hoặc lịch đã được nhận bàn");
    const { endDate } = getStoredBookingInterval(booking);
    if (!Number.isFinite(endDate.getTime()) || endDate.getTime() <= Date.now()) {
      throw new Error("Mã QR đặt bàn đã hết thời hạn sử dụng");
    }
    const table = await Table.findById(booking.table).select("code name");
    if (!table) throw new Error("Không tìm thấy bàn của lịch đặt");
    return {
      bookingId: String(booking._id),
      customerName: booking.customerName,
      phone: booking.phone,
      date: booking.date,
      time: booking.time,
      duration: booking.duration,
      status: booking.status,
      table: { id: String(table._id), code: table.code, name: table.name },
      preOrderItems: booking.preOrderItems,
      preOrderTotal: booking.preOrderItems.reduce(
        (sum: number, item: any) => sum + item.unitPrice * item.quantity,
        0,
      ),
    };
  }

  async issueQrToken(customerId: string, bookingId: string) {
    if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(bookingId)) {
      throw new Error("Lịch đặt bàn không hợp lệ");
    }
    const token = this.createQrToken();
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, customer: customerId, status: "approved" },
      { $set: { qrTokenHash: this.hashQrToken(token) } },
      { new: true },
    ).select("_id");
    if (!booking) throw new Error("Không tìm thấy lịch đặt bàn còn hiệu lực của bạn");
    return { qrToken: token };
  }

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
      status: TableStatus.AVAILABLE,
    };
    if (input.type) tableFilter.type = input.type;
    const tables = await Table.find(tableFilter).sort({ code: 1 });
    if (tables.length === 0) return [];

    const tableIds = tables.map((t) => t._id);
    const activeBookings = await Booking.find({
      table: { $in: tableIds },
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).select("table date time duration startDate endDate");

    const conflictingTableIds = new Set<string>();
    for (const booking of activeBookings) {
      const interval = getStoredBookingInterval(booking);
      if (
        Number.isFinite(interval.startDate.getTime()) &&
        Number.isFinite(interval.endDate.getTime()) &&
        interval.startDate < endDate &&
        interval.endDate > startDate
      ) {
        conflictingTableIds.add(String(booking.table));
      }
    }

    return tables.filter((table) => !conflictingTableIds.has(String(table._id)));
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
    if (customerId && !associatedCustomer) {
      throw new Error("Tài khoản khách hàng không hợp lệ");
    }
    const associatedCustomerId = associatedCustomer ? customerId : undefined;
    if (initialStatus === "pending" && !associatedCustomerId) {
      throw new Error("Vui lòng đăng nhập tài khoản khách hàng để đặt bàn");
    }
    const qrToken = this.createQrToken();
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
      let preOrderItems: Array<{
        productId: mongoose.Types.ObjectId;
        name: string;
        category: string;
        unitPrice: number;
        quantity: number;
      }> = [];
      if (dto.preOrderItems.length > 0) {
        const products = await Product.find({
          _id: { $in: dto.preOrderItems.map((item) => item.productId) },
          category: { $in: ["drink", "food", "snack"] },
          isForSale: true,
          isActive: true,
        })
          .select("_id name category salePrice")
          .session(session);
        if (products.length !== dto.preOrderItems.length) {
          throw new Error("Một hoặc nhiều món F&B không còn được bán");
        }
        const productById = new Map(products.map((product) => [String(product._id), product]));
        preOrderItems = dto.preOrderItems.map(({ productId, quantity }) => {
          const product = productById.get(String(productId))!;
          return {
            productId,
            name: product.name,
            category: product.category,
            unitPrice: product.salePrice,
            quantity,
          };
        });
        for (const item of preOrderItems) {
          const reserved = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              isActive: true,
              isForSale: true,
              stock: { $gte: item.quantity },
            },
            { $inc: { stock: -item.quantity } },
            { new: true, session },
          );
          if (!reserved) throw new Error(`Món ${item.name} không đủ tồn kho`);
        }
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
            preOrderItems,
            inventoryReserved: preOrderItems.length > 0,
            qrTokenHash: this.hashQrToken(qrToken),
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
        .catch((error) => console.error("Không thể gửi thông báo đặt bàn cho khách:", error));
    }
    await notificationService
      .create({
        title:
          initialStatus === "approved"
            ? "Lịch đặt bàn đã xác nhận tự động"
            : "Có lịch đặt bàn mới",
        content: `${result.booking.customerName} (${result.booking.phone}) đặt ${result.booking.tableName} ngày ${result.booking.date} lúc ${result.booking.time}, dự kiến ${result.booking.duration} giờ.${result.booking.preOrderItems.length ? ` Món đặt trước: ${result.booking.preOrderItems.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}.` : ""} Vui lòng chuẩn bị và giữ bàn.`,
        type: NotificationType.TABLE,
      })
      .catch((error) => console.error("Không thể gửi thông báo lịch đặt bàn cho nhân viên:", error));
    const bookingData = result.booking.toObject ? result.booking.toObject() : result.booking;
    delete bookingData.qrTokenHash;
    return {
      ...bookingData,
      tableId: String(result.table._id),
      tableCode: result.table.code,
      qrToken,
    };
  }

  async cancelCustomerBooking(customerId: string, id: string, reason?: string) {
    if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(id)) {
      throw new Error("Yêu cầu hủy đặt bàn không hợp lệ");
    }
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 1000)) {
      throw new Error("Lý do hủy không được vượt quá 1000 ký tự");
    }
    const result = await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOne({ _id: id, customer: customerId }).session(session);
      if (!booking) throw new Error("Không tìm thấy đơn đặt bàn");
      if (!["pending", "approved"].includes(booking.status)) {
        throw new Error("Chỉ có thể hủy lịch đặt bàn chưa nhận bàn");
      }
      const { startDate } = getStoredBookingInterval(booking);
      if (!Number.isFinite(startDate.getTime())) {
        throw new Error("Thời gian đặt bàn không hợp lệ");
      }
      if (startDate.getTime() - CANCELLATION_CUTOFF_MS <= Date.now()) {
        throw new Error("Đã quá hạn hủy đặt bàn (trước giờ chơi ít nhất 2 tiếng)");
      }
      const tableFilter: Record<string, any> = { _id: booking.table };
      const tableUpdate: Record<string, any> = { $inc: { bookingVersion: 1 } };
      if (booking.status === "approved") {
        tableFilter["bookedInfo.bookingId"] = id;
        tableUpdate.$set = { status: TableStatus.AVAILABLE };
        tableUpdate.$unset = { bookedInfo: 1 };
      }
      const tableUpdateResult = await Table.updateOne(
        tableFilter,
        tableUpdate,
        { session },
      );
      if (booking.status === "approved" && tableUpdateResult.modifiedCount !== 1) {
        throw new Error("Trạng thái giữ bàn đã thay đổi, vui lòng tải lại");
      }
      if (booking.inventoryReserved) {
        for (const item of booking.preOrderItems) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } },
            { session },
          );
        }
        booking.inventoryReserved = false;
        await booking.save({ session });
      }
      const update = await Booking.updateOne(
        { _id: id, customer: customerId, status: booking.status },
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
      return {
        booking: { ...booking.toObject(), status: "cancelled", cancelledAt: new Date() },
        tableId: String(booking.table),
      };
    });
    emitTableStatusChanged({ tableId: result.tableId });
    return result.booking;
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
      if (input.status === "rejected" && booking.inventoryReserved) {
        for (const item of booking.preOrderItems) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } },
            { session },
          );
        }
        booking.inventoryReserved = false;
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
