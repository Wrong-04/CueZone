import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import { Booking } from "./booking.model";
import { Table, TableStatus, TableType } from "../table/table.model";
import { User } from "../user/user.model";
import { Product } from "../product/product.model";
import { emitTableStatusChanged } from "../../utils/socketHolder";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { BookingPaymentReceipt } from "./booking-payment.model";
import {
  paymentError,
  sepayConfig,
  sepayReceipt,
  verifySepayAuthorization,
} from "../tournament/sepay";

const notificationService = new NotificationService();

// =========================================================================================
// CÁC HẰNG SỐ CẤU HÌNH NGHIỆP VỤ ĐẶT BÀN
// =========================================================================================
// Các trạng thái đặt bàn được tính là đang hoạt động / chiếm chỗ
const ACTIVE_BOOKING_STATUSES = ["pending", "approved", "confirmed", "checked_in"];

// Giới hạn thời gian tối thiểu để khách được tự hủy lịch: trước giờ chơi ít nhất 2 tiếng (2 giờ * 60 phút * 60 giây * 1000ms)
const CANCELLATION_CUTOFF_MS = 2 * 60 * 60 * 1000;

// Thời gian tối đa giữ chỗ để khách quét mã thanh toán tiền cọc: 5 phút
const PAYMENT_HOLD_MS = 5 * 60 * 1000;

// Lý do hệ thống tự hủy đơn khi quá hạn thanh toán cọc
const PAYMENT_EXPIRY_REASON = "Hết hạn chờ thanh toán tiền cọc";

/**
 * Hàm tính toán khoảng thời gian (Start Time -> End Time) của một lịch đặt bàn
 * @param date Ngày đặt dạng chuỗi (YYYY-MM-DD)
 * @param time Giờ đặt dạng chuỗi (HH:mm) theo múi giờ Việt Nam (+07:00)
 * @param duration Số giờ chơi dự kiến (ví dụ: 1h, 2h...)
 * @param allowPast Cho phép giờ trong quá khứ hay không (mặc định false - phải đặt ở tương lai)
 * @returns { startDate: Date, endDate: Date } Thời điểm bắt đầu và kết thúc
 */
function getBookingInterval(date: string, time: string, duration: number, allowPast = false) {
  // Tạo đối tượng Date với múi giờ Việt Nam UTC+7
  const startDate = new Date(`${date}T${time}:00+07:00`);
  if (
    !Number.isFinite(startDate.getTime()) ||
    new Date(startDate.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Ngày giờ đặt bàn không hợp lệ");
  }
  // Kiểm tra thời gian đặt phải nằm ở tương lai (không cho đặt lùi về quá khứ)
  if (!allowPast && startDate.getTime() <= Date.now()) {
    throw new Error("Ngày giờ đặt bàn phải ở tương lai (giờ Việt Nam)");
  }
  return {
    startDate,
    // Giờ kết thúc = giờ bắt đầu + (thời lượng chơi * số mili-giây mỗi giờ)
    endDate: new Date(startDate.getTime() + duration * 60 * 60 * 1000),
  };
}

/**
 * Hàm trích xuất khoảng thời gian (Start Date, End Date) từ một bản ghi đặt bàn đã lưu trong CSDL
 * @param booking Bản ghi đơn đặt bàn từ MongoDB
 */
function getStoredBookingInterval(booking: any) {
  const startDate = booking.startDate
    ? new Date(booking.startDate)
    : new Date(`${booking.date}T${booking.time}:00+07:00`);
  const endDate = booking.endDate
    ? new Date(booking.endDate)
    : new Date(startDate.getTime() + Number(booking.duration || 2) * 60 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Hàm kiểm tra tính hợp lệ và chuẩn hóa dữ liệu đầu vào khi tạo đơn đặt bàn
 * Validate: Họ tên khách, Số điện thoại, ID bàn, Ngày, Giờ, Thời lượng chơi, Món F&B đặt trước
 */
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
  // Đảm bảo không trùng lặp cùng một món ăn/đồ uống trong danh sách đặt trước
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
  /**
   * Băm mã QR Token bằng thuật toán SHA-256 để lưu trữ an toàn trong CSDL (tránh lộ token gốc)
   */
  private hashQrToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Tạo chuỗi ngẫu nhiên 32 bytes (64 ký tự hex) làm mã bảo mật QR Check-in cho khách
   */
  private createQrToken() {
    return randomBytes(32).toString("hex");
  }

  /**
   * Giải mã và xác thực mã QR khi khách hàng đưa cho nhân viên quét tại quầy lễ tân để nhận bàn
   * @param tokenValue Chuỗi token từ mã QR
   * @returns Thông tin lịch đặt và bàn tương ứng nếu hợp lệ
   */
  async resolveQrToken(tokenValue: unknown) {
    if (typeof tokenValue !== "string" || !/^[a-f0-9]{64}$/.test(tokenValue)) {
      throw new Error("Mã QR đặt bàn không hợp lệ");
    }
    // Tìm đơn đặt bàn có mã hash khớp và đang ở trạng thái 'approved' (đã duyệt/đã cọc)
    const booking = await Booking.findOne({
      qrTokenHash: this.hashQrToken(tokenValue),
      status: "approved",
    }).select("+qrTokenHash");
    if (!booking) throw new Error("Mã QR không hợp lệ, đã hủy hoặc lịch đã được nhận bàn");

    // Kiểm tra xem lịch đặt đã quá hạn sử dụng hay chưa
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

  /**
   * Cấp phát mã QR Check-in mới cho khách hàng từ tài khoản của họ
   */
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

  /**
   * Kiểm tra xung đột khung giờ chơi trên cùng 1 bàn
   * Thuật toán: Hai khoảng thời gian [A, B] và [C, D] trùng nhau khi và chỉ khi A < D và B > C
   * @param tableId ID bàn cần kiểm tra
   * @param startDate Thời điểm bắt đầu của lượt đặt mới
   * @param endDate Thời điểm kết thúc của lượt đặt mới
   * @param session Phiên giao dịch MongoDB (nếu có)
   * @param excludeBookingId Bỏ qua đơn đặt hiện tại (dùng khi cập nhật đơn)
   * @returns true nếu có xung đột trùng giờ, false nếu khung giờ còn trống
   */
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
    let query = Booking.find(filter).select(
      "date time duration startDate endDate paymentStatus paymentExpiresAt",
    );
    if (session) query = query.session(session);
    const bookings = await query;
    return bookings.some((booking) => {
      // Nếu đơn đang chờ thanh toán cọc nhưng đã quá 5 phút thì không tính là chiếm chỗ nữa
      if (
        booking.paymentStatus === "awaiting_payment" &&
        booking.paymentExpiresAt &&
        booking.paymentExpiresAt.getTime() <= Date.now()
      ) {
        return false;
      }
      const interval = getStoredBookingInterval(booking);
      // Điều kiện giao nhau của 2 khoảng thời gian: interval.startDate < endDate && interval.endDate > startDate
      return (
        Number.isFinite(interval.startDate.getTime()) &&
        Number.isFinite(interval.endDate.getTime()) &&
        interval.startDate < endDate &&
        interval.endDate > startDate
      );
    });
  }

  /**
   * =========================================================================================
   * [LUỒNG MỚI ĐẶT BÀN]: Lấy danh sách bàn theo khung giờ khách đã chọn
   * - Quy tắc cũ: Chỉ trả về bàn trống, bàn đã có người đặt sẽ bị ẩn hoàn toàn khỏi danh sách.
   * - Quy tắc mới: Trả về TẤT CẢ các bàn (trừ bàn bảo trì).
   *   + Mỗi bàn kèm trường `isAvailable` (true: bàn trống, false: đã có khách đặt / đang chơi).
   *   + Kèm trường `unavailableReason`: "booked" (đã có khách đặt trước) hoặc "playing" (đang có khách chơi trực tiếp).
   *   + Khi khách khác (Khách B) xem trên web, bàn vẫn hiển thị kèm nhãn trạng thái và khi bấm vào sẽ pop-up thông báo.
   * =========================================================================================
   */
  async getAvailableTables(input: {
    date: string;
    time: string;
    duration: number;
    type?: string;
  }) {
    // 1. Kiểm tra định dạng dữ liệu đầu vào
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

    // 2. Tự động dọn dẹp các đơn cọc quá hạn 5 phút trước khi truy vấn
    await this.expirePendingPayments();

    // 3. Tính khoảng thời gian khách muốn đặt
    const { startDate, endDate } = getBookingInterval(
      input.date,
      input.time,
      input.duration,
      true,
    );
    if (startDate.getTime() <= Date.now()) return [];

    // 4. Lấy tất cả bàn đang hoạt động (loại trừ các bàn bảo trì hư hỏng)
    const tableFilter: Record<string, any> = {
      isActive: true,
      status: { $ne: TableStatus.MAINTENANCE },
    };
    if (input.type) tableFilter.type = input.type;
    const tables = await Table.find(tableFilter).sort({ code: 1 });
    if (tables.length === 0) return [];

    const now = Date.now();
    const isToday =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(now)) === input.date;

    const tableIds = tables.map((t) => t._id);

    // 5. Tìm các lịch đặt đang hoạt động của các bàn này
    const activeBookings = await Booking.find({
      table: { $in: tableIds },
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).select("table date time duration startDate endDate");

    // Map lưu lý do không khả dụng của từng bàn: tableId -> "booked" | "playing"
    const conflictingTableMap = new Map<string, string>();

    // 6. Kiểm tra xem bàn nào bị trùng lịch hẹn trước (Conflicting Bookings)
    for (const booking of activeBookings) {
      const interval = getStoredBookingInterval(booking);
      // Bỏ qua các đơn đang chờ thanh toán cọc nhưng đã hết hạn 5 phút
      if (
        booking.paymentStatus === "awaiting_payment" &&
        booking.paymentExpiresAt &&
        booking.paymentExpiresAt.getTime() <= now
      ) {
        continue;
      }
      // Nếu có sự giao nhau về thời gian giữa lịch đã đặt và lịch khách đang xem
      if (
        Number.isFinite(interval.startDate.getTime()) &&
        Number.isFinite(interval.endDate.getTime()) &&
        interval.startDate < endDate &&
        interval.endDate > startDate
      ) {
        conflictingTableMap.set(String(booking.table), "booked");
      }
    }

    // 7. Nếu khách đặt lịch cho ngày hôm nay và giờ bắt đầu sắp đến (trong vòng 60 phút tới),
    // kiểm tra xem bàn có đang có khách chơi tại quán hay không
    if (isToday && startDate.getTime() <= now + 60 * 60 * 1000) {
      for (const table of tables) {
        if (
          table.status === TableStatus.PLAYING ||
          table.status === TableStatus.PAUSED ||
          Boolean(table.currentSession)
        ) {
          conflictingTableMap.set(String(table._id), "playing");
        }
      }
    }

    // 8. Trả về toàn bộ danh sách bàn kèm cờ trạng thái để frontend hiển thị và xử lý pop-up
    return tables.map((table) => {
      const reason = conflictingTableMap.get(String(table._id));
      return {
        ...table.toObject(),
        isAvailable: !reason, // true nếu không bị xung đột (bàn trống)
        unavailableReason: reason ?? null, // "booked" nếu đã có người đặt, "playing" nếu đang chơi
      };
    });
  }

  /**
   * Lấy toàn bộ danh sách đơn đặt bàn trong hệ thống (dành cho quản lý/thu ngân xem báo cáo)
   */
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
        phone: obj.phone || (cust && cust.phone ? cust.phone : ""),
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

  /**
   * Lấy danh sách lịch sử đặt bàn của một tài khoản khách hàng cụ thể
   * @param customerId ID người dùng (Customer)
   */
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

  /**
   * =========================================================================================
   * HÀM TẠO ĐƠN ĐẶT BÀN MỚI (CREATE BOOKING)
   * - Hỗ trợ cả đặt trực tiếp (thu ngân tạo) và đặt trực tuyến (khách tự đặt có cọc SePay).
   * - Dùng MongoDB Transaction đảm bảo tính toàn vẹn dữ liệu (Atomic):
   *   + Khóa bàn, kiểm tra xung đột khung giờ.
   *   + Trừ tạm thời tồn kho các món F&B đóng gói sẵn (không phải pha chế theo yêu cầu).
   *   + Tính tiền cọc: 50% tổng dự kiến (tiền giờ chơi + tiền món F&B).
   *   + Nếu yêu cầu cọc: tạo mã tham chiếu thanh toán (CB...), thời hạn giữ chỗ 5 phút.
   * =========================================================================================
   * @param input Dữ liệu form đặt bàn
   * @param customerId ID khách hàng (nếu đã đăng nhập)
   * @param initialStatus Trạng thái khởi tạo ("pending" hoặc "approved")
   * @param requireDeposit Có yêu cầu thanh toán cọc SePay hay không (khách vãng lai online: true)
   */
  async create(
    input: any,
    customerId?: string,
    initialStatus: "pending" | "approved" = "approved",
    requireDeposit = false,
  ) {
    // 1. Quét dọn các đơn cọc quá hạn trước khi tạo đơn mới
    if (requireDeposit) await this.expirePendingPayments();
    
    // 2. Validate và chuẩn hóa dữ liệu
    const dto = bookingInput(input);
    const paymentConfig = requireDeposit ? sepayConfig() : null;
    // Mã tham chiếu SePay dạng CB + 24 ký tự hex ngẫu nhiên
    const paymentReference = requireDeposit
      ? `CB${randomBytes(12).toString("hex").toUpperCase()}`
      : undefined;
    // Thời hạn giữ chỗ: 5 phút kể từ thời điểm tạo
    const paymentExpiresAt = requireDeposit
      ? new Date(Date.now() + PAYMENT_HOLD_MS)
      : undefined;

    // 3. Kiểm tra tài khoản khách hàng nếu có truyền customerId
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
    const qrToken = requireDeposit ? undefined : this.createQrToken();

    // 4. Bắt đầu Transaction để tránh tình trạng tranh chấp (Race condition)
    const result = await mongoose.connection.transaction(async (session) => {
      // 4.1. Tìm bàn và tăng bookingVersion để tạo lock
      const table = await Table.findOneAndUpdate(
        {
          _id: dto.table,
          isActive: true,
          status:
            initialStatus === "pending" || requireDeposit
              ? { $ne: TableStatus.MAINTENANCE }
              : TableStatus.AVAILABLE,
        },
        { $inc: { bookingVersion: 1 } },
        { new: true, session },
      );
      if (!table) throw new Error("Bàn không còn trống, vui lòng tải lại");

      // 4.2. Kiểm tra xem khung giờ có bị trùng với lịch khác không
      if (await this.hasSlotConflict(String(table._id), dto.startDate, dto.endDate, session)) {
        throw new Error("Khung giờ này đã có người đặt, vui lòng chọn thời gian khác");
      }

      // 4.3. Xử lý các món F&B đặt trước
      let preOrderItems: Array<{
        productId: mongoose.Types.ObjectId;
        name: string;
        category: string;
        unitPrice: number;
        quantity: number;
        isMadeToOrder?: boolean;
      }> = [];
      if (dto.preOrderItems.length > 0) {
        const products = await Product.find({
          _id: { $in: dto.preOrderItems.map((item) => item.productId) },
          productType: "fnb",
          isForSale: true,
          isActive: true,
        })
          .select("_id name category salePrice stock isMadeToOrder isTheMakeToOrder isthemaketoorder")
          .session(session);
        if (products.length !== dto.preOrderItems.length) {
          throw new Error("Một hoặc nhiều món F&B không còn được bán");
        }
        const productById = new Map(products.map((product) => [String(product._id), product]));
        preOrderItems = dto.preOrderItems.map(({ productId, quantity }) => {
          const product = productById.get(String(productId))!;
          const isMadeToOrder = Boolean(
            (product as any).isthemaketoorder ??
            (product as any).isTheMakeToOrder ??
            product.isMadeToOrder
          );
          return {
            productId,
            name: product.name,
            category: String(product.category),
            unitPrice: product.salePrice,
            quantity,
            isMadeToOrder,
          };
        });

        // Trừ kho tạm thời đối với món đóng gói sẵn nếu không qua cổng cọc SePay
        for (const item of preOrderItems) {
          if (!item.isMadeToOrder && !requireDeposit) {
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
      }

      // 4.4. Tính toán chi phí dự kiến và số tiền đặt cọc (50%)
      const hasInventoryReserved =
        !requireDeposit && preOrderItems.some((item) => !item.isMadeToOrder);
      const estimatedCost = table.pricePerHour * dto.duration;
      const depositAmount = Math.ceil(
        (estimatedCost +
          preOrderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)) /
          2,
      );
      if (!Number.isSafeInteger(depositAmount) || depositAmount <= 0) {
        throw new Error("Số tiền đặt cọc không hợp lệ");
      }

      // 4.5. Lưu bản ghi Booking vào CSDL MongoDB
      const [booking] = await Booking.create(
        [
          {
            ...dto,
            deposit: requireDeposit ? depositAmount : dto.deposit,
            table: table._id,
            customer: associatedCustomerId,
            tableName: table.name,
            estimatedCost,
            status: requireDeposit ? "pending" : initialStatus,
            ...(requireDeposit
              ? {
                  paymentStatus: "awaiting_payment",
                  paymentReference,
                  paymentExpiresAt,
                }
              : {}),
            preOrderItems,
            inventoryReserved: hasInventoryReserved,
            ...(qrToken ? { qrTokenHash: this.hashQrToken(qrToken) } : {}),
          },
        ],
        { session },
      );

      // 4.6. Nếu không cần cọc (đặt tại quầy), cập nhật trạng thái bàn thành BOOKED ngay
      if (!requireDeposit && initialStatus === "approved") {
        if (table.status === TableStatus.AVAILABLE) {
          table.status = TableStatus.BOOKED;
        }
        table.bookedInfo = {
          customerName: booking.customerName || "Khách đặt trước",
          phone: booking.phone || "",
          time: `${booking.time} (${booking.date})`,
          bookingId: String(booking._id),
        };
        await table.save({ session });
      }
      return { booking, table };
    });

    // 5. Phát sự kiện Socket.io thông báo thay đổi trạng thái bàn cho toàn hệ thống
    if (!requireDeposit && initialStatus === "approved") {
      emitTableStatusChanged({
        tableId: String(result.table._id),
        status: result.table.status,
        table: result.table,
      });
    }

    // 6. Gửi thông báo đến tài khoản khách hàng
    if (!requireDeposit && associatedCustomerId) {
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

    // 7. Gửi thông báo đến nhân viên quầy
    if (!requireDeposit) {
      await notificationService
        .create({
        title:
          initialStatus === "approved"
            ? "Lịch đặt bàn đã xác nhận tự động"
            : "Có lịch đặt bàn mới",
        content: `${result.booking.customerName} (${result.booking.phone}) đặt ${result.booking.tableName} ngày ${result.booking.date} lúc ${result.booking.time}, dự kiến ${result.booking.duration} giờ.${result.booking.preOrderItems.length ? ` Món đặt trước: ${result.booking.preOrderItems.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}.` : ""} Vui lòng chuẩn bị và giữ bàn.`,
        type: NotificationType.TABLE,
        })
        .catch((error) =>
          console.error("Không thể gửi thông báo lịch đặt bàn cho nhân viên:", error),
        );
    }

    // 8. Đóng gói dữ liệu trả về cho Frontend (kèm theo mã VietQR nếu cần cọc)
    const bookingData = result.booking.toObject ? result.booking.toObject() : result.booking;
    delete bookingData.qrTokenHash;
    const payment = requireDeposit && paymentConfig && paymentReference && paymentExpiresAt
      ? {
          reference: paymentReference,
          amount: result.booking.deposit,
          deadline: paymentExpiresAt,
          bankCode: paymentConfig.bankCode,
          accountNumber: paymentConfig.accountNumber,
          accountName: paymentConfig.accountName,
          qrUrl: this.buildPaymentQrUrl(
            paymentConfig.bankCode,
            paymentConfig.accountNumber,
            result.booking.deposit,
            paymentReference,
          ),
          status: "awaiting_payment",
        }
      : undefined;
    return {
      ...bookingData,
      tableId: String(result.table._id),
      tableCode: result.table.code,
      ...(qrToken ? { qrToken } : {}),
      ...(payment ? { payment } : {}),
    };
  }

  /**
   * Tạo đường dẫn mã QR VietQR theo chuẩn Napas để khách hàng quét mã chuyển khoản qua App ngân hàng
   * @param bankCode Mã ngân hàng (ví dụ: MB, VCB, ICB...)
   * @param accountNumber Số tài khoản nhận tiền
   * @param amount Số tiền cần chuyển khoản (tiền cọc 50%)
   * @param reference Nội dung chuyển khoản (bắt đầu bằng CB...)
   */
  private buildPaymentQrUrl(
    bankCode: string,
    accountNumber: string,
    amount: number,
    reference: string,
  ) {
    const qr = new URL("https://vietqr.app/img");
    for (const [key, value] of Object.entries({
      acc: accountNumber,
      bank: bankCode,
      amount: String(amount),
      des: reference,
      template: "compact",
    })) {
      qr.searchParams.set(key, value);
    }
    return qr.toString();
  }

  /**
   * Truy vấn trạng thái thanh toán tiền cọc (dành cho Frontend polling kiểm tra mỗi 3 giây)
   * @param reference Mã tham chiếu chuyển khoản (CB...)
   * @returns Trạng thái thanh toán: 'awaiting_payment' (chờ chuyển khoản), 'paid' (đã thanh toán thành công), 'expired' (hết hạn), 'cancelled' (đã hủy)
   */
  async getPublicPaymentStatus(reference: string) {
    if (!/^CB[A-F0-9]{24}$/.test(reference)) {
      throw paymentError("Mã thanh toán đặt bàn không hợp lệ");
    }
    // Dọn dẹp các đơn cọc quá hạn trước khi trả về
    await this.expirePendingPayments();
    const booking = await Booking.findOne({ paymentReference: reference }).populate("table");
    if (!booking) throw paymentError("Không tìm thấy yêu cầu thanh toán đặt bàn", 404);
    const status = booking.paymentStatus || "not_required";
    const config = status === "awaiting_payment" ? sepayConfig() : null;
    const table = booking.table as any;
    return {
      reference,
      status,
      amount: booking.deposit,
      deadline: booking.paymentExpiresAt,
      bankCode: config?.bankCode,
      accountNumber: config?.accountNumber,
      accountName: config?.accountName,
      qrUrl:
        config && status === "awaiting_payment"
          ? this.buildPaymentQrUrl(config.bankCode, config.accountNumber, booking.deposit, reference)
          : null,
      booking:
        status === "paid"
          ? {
              id: String(booking._id),
              tableId: table ? String(table._id) : String(booking.table),
              tableCode: table?.code,
              tableName: booking.tableName,
              date: booking.date,
              time: booking.time,
              duration: booking.duration,
              estimatedCost: booking.estimatedCost,
              deposit: booking.deposit,
              phone: booking.phone,
            }
          : undefined,
    };
  }

  /**
   * Khách hàng chủ động hủy yêu cầu đặt cọc trong lúc đang chờ thanh toán
   * Giải phóng khung giờ đặt bàn và hoàn trả tồn kho F&B nếu có
   * @param reference Mã tham chiếu chuyển khoản (CB...)
   */
  async cancelPublicPayment(reference: string) {
    if (!/^CB[A-F0-9]{24}$/.test(reference)) {
      throw paymentError("Mã thanh toán đặt bàn không hợp lệ");
    }

    const result = await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOne({ paymentReference: reference }).session(session);
      if (!booking) throw paymentError("Không tìm thấy yêu cầu thanh toán đặt bàn", 404);
      if (booking.paymentStatus === "paid") {
        throw paymentError("Đặt cọc đã được ghi nhận; không thể hủy yêu cầu này", 409);
      }
      if (booking.paymentStatus === "refund_required") {
        throw paymentError("Giao dịch cần được nhân viên đối soát trước khi xử lý", 409);
      }
      if (booking.paymentStatus === "cancelled") {
        return { status: "cancelled" as const, tableId: String(booking.table), changed: false };
      }
      if (booking.paymentStatus === "expired") {
        return { status: "expired" as const, tableId: String(booking.table), changed: false };
      }
      if (booking.paymentStatus !== "awaiting_payment" || booking.status !== "pending") {
        throw paymentError("Yêu cầu đặt cọc không còn ở trạng thái có thể hủy", 409);
      }

      const cancelledAt = new Date();
      const cancelledBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          status: "pending",
          paymentStatus: "awaiting_payment",
        },
        {
          $set: {
            status: "cancelled",
            paymentStatus: "cancelled",
            cancelledAt,
            cancellationReason: "Khách hàng hủy yêu cầu đặt cọc",
          },
        },
        { new: true, session },
      );
      if (!cancelledBooking) {
        throw paymentError("Trạng thái thanh toán đã thay đổi; vui lòng kiểm tra lại", 409);
      }

      if (cancelledBooking.inventoryReserved) {
        for (const item of cancelledBooking.preOrderItems) {
          if (!(item as any).isMadeToOrder) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }
        }
        cancelledBooking.inventoryReserved = false;
        await cancelledBooking.save({ session });
      }

      return {
        status: "cancelled" as const,
        tableId: String(cancelledBooking.table),
        changed: true,
      };
    });

    if (result.changed) emitTableStatusChanged({ tableId: result.tableId });
    return { reference, status: result.status };
  }

  /**
   * =========================================================================================
   * HÀM XỬ LÝ WEBHOOK TỰ ĐỘNG TỪ CỔNG THANH TOÁN SEPAY
   * - Khi khách quét mã QR VietQR và chuyển tiền cọc thành công, SePay bắn webhook về API này.
   * - Kiểm tra chữ ký xác thực (API Key header).
   * - Kiểm tra số tiền chuyển khớp với tiền cọc, đúng mã tham chiếu CB...
   * - Tự động cập nhật Booking thành 'approved', tiền cọc 'paid'.
   * - Tự động chuyển trạng thái bàn thành 'BOOKED' và phát Socket.io tới mọi máy POS & Khách hàng.
   * =========================================================================================
   */
  async handleSepayWebhook(header: string | undefined, body: unknown) {
    verifySepayAuthorization(header);
    const receipt = sepayReceipt(body);
    if (!receipt.incoming || !receipt.reference?.startsWith("CB")) return false;
    if (!(await Booking.exists({ paymentReference: receipt.reference }))) {
      const previous = await BookingPaymentReceipt.findOne({ providerId: receipt.providerId });
      if (previous) {
        if (
          previous.amount !== receipt.amount ||
          previous.accountNumber !== receipt.accountNumber ||
          previous.reference !== receipt.reference ||
          previous.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()
        ) {
          throw paymentError("ID giao dịch SePay đã tồn tại với dữ liệu khác", 409);
        }
        return true;
      }
      try {
        await BookingPaymentReceipt.create({
          providerId: receipt.providerId,
          reference: receipt.reference,
          accountNumber: receipt.accountNumber,
          amount: receipt.amount,
          bankPaidAt: receipt.bankPaidAt,
          status: "refund_required",
        });
        await notificationService
          .create({
            title: "Giao dịch cọc đặt bàn không tìm thấy yêu cầu",
            message: `Giao dịch SePay ${receipt.reference} (${receipt.amount.toLocaleString("vi-VN")}đ, mã GD ${receipt.providerId}) cần đối soát.`,
            type: NotificationType.TABLE,
          })
          .catch((error) =>
            console.error("Không thể gửi thông báo giao dịch đặt bàn không khớp:", error),
          );
      } catch (error: any) {
        if (error.code !== 11000) throw error;
        const duplicate = await BookingPaymentReceipt.findOne({
          providerId: receipt.providerId,
        });
        if (
          !duplicate ||
          duplicate.amount !== receipt.amount ||
          duplicate.accountNumber !== receipt.accountNumber ||
          duplicate.reference !== receipt.reference ||
          duplicate.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()
        ) {
          throw paymentError("Giao dịch SePay trùng không khớp dữ liệu", 409);
        }
      }
      return true;
    }

    let updatedTable: any = null;
    let isNewReceipt = false;
    let outcome: "confirmed" | "refund_required" = "refund_required";
    try {
      await mongoose.connection.transaction(async (session) => {
        updatedTable = null;
        isNewReceipt = false;
        outcome = "refund_required";
        const previous = await BookingPaymentReceipt.findOne({
          providerId: receipt.providerId,
        }).session(session);
        if (previous) {
          if (
            previous.amount !== receipt.amount ||
            previous.accountNumber !== receipt.accountNumber ||
            previous.reference !== receipt.reference ||
            previous.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()
          ) {
            throw paymentError("ID giao dịch SePay đã tồn tại với dữ liệu khác", 409);
          }
          outcome = previous.status;
          return;
        }

        const booking = await Booking.findOne({
          paymentReference: receipt.reference,
        }).session(session);
        if (!booking) return;

        const withinPaymentWindow =
          booking.paymentExpiresAt &&
          receipt.bankPaidAt.getTime() <= booking.paymentExpiresAt.getTime() &&
          receipt.bankPaidAt.getTime() >= booking.createdAt.getTime() - 60_000;
        const paymentCanStillBeApplied =
          (booking.paymentStatus === "awaiting_payment" && booking.status === "pending") ||
          (booking.paymentStatus === "expired" &&
            booking.status === "cancelled" &&
            booking.cancellationReason === PAYMENT_EXPIRY_REASON);
        const canConfirm =
          paymentCanStillBeApplied &&
          withinPaymentWindow &&
          receipt.amount === booking.deposit;

        if (canConfirm) {
          const interval = getStoredBookingInterval(booking);
          const conflict = await this.hasSlotConflict(
            String(booking.table),
            interval.startDate,
            interval.endDate,
            session,
            String(booking._id),
          );
          const table = await Table.findOne({
            _id: booking.table,
            isActive: true,
            status: { $ne: TableStatus.MAINTENANCE },
          }).session(session);

          let stockAvailable = true;
          const reservedItems: Array<{
            productId: mongoose.Types.ObjectId;
            quantity: number;
          }> = [];
          if (table && !conflict) {
            for (const item of booking.preOrderItems) {
              if ((item as any).isMadeToOrder) continue;
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
              if (!reserved) {
                stockAvailable = false;
                break;
              }
              reservedItems.push({
                productId: item.productId,
                quantity: item.quantity,
              });
            }
          }

          if (!stockAvailable) {
            for (const item of reservedItems) {
              await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } },
                { session },
              );
            }
          }

          if (table && !conflict && stockAvailable) {
            booking.status = "approved";
            booking.paymentStatus = "paid";
            booking.paymentProviderId = receipt.providerId;
            booking.paymentPaidAt = receipt.bankPaidAt;
            booking.inventoryReserved = booking.preOrderItems.some(
              (item) => !(item as any).isMadeToOrder,
            );
            if (table.status === TableStatus.AVAILABLE) {
              table.status = TableStatus.BOOKED;
            }
            table.bookedInfo = {
              customerName: booking.customerName || "Khách đặt trước",
              phone: booking.phone || "",
              time: `${booking.time} (${booking.date})`,
              bookingId: String(booking._id),
            };
            await table.save({ session });
            await booking.save({ session });
            updatedTable = table;
            outcome = "confirmed";
          } else {
            booking.status = "cancelled";
            booking.paymentStatus = "refund_required";
            booking.cancelledAt = new Date();
            booking.cancellationReason =
              "Không thể tự xác nhận sau khi nhận thanh toán; cần đối soát/hoàn tiền";
            await booking.save({ session });
          }
        } else if (booking.paymentStatus !== "paid") {
          booking.status = "cancelled";
          booking.paymentStatus = "refund_required";
          booking.cancelledAt = new Date();
          booking.cancellationReason =
            "Giao dịch đến trễ hoặc sai số tiền; cần đối soát/hoàn tiền";
          await booking.save({ session });
        }

        await BookingPaymentReceipt.create(
          [
            {
              providerId: receipt.providerId,
              booking: booking._id,
              reference: receipt.reference,
              accountNumber: receipt.accountNumber,
              amount: receipt.amount,
              bankPaidAt: receipt.bankPaidAt,
              status: outcome,
            },
          ],
          { session },
        );
        isNewReceipt = true;
      });
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      const previous = await BookingPaymentReceipt.findOne({
        providerId: receipt.providerId,
      });
      if (
        !previous ||
        previous.amount !== receipt.amount ||
        previous.accountNumber !== receipt.accountNumber ||
        previous.reference !== receipt.reference ||
        previous.bankPaidAt.getTime() !== receipt.bankPaidAt.getTime()
      ) {
        throw paymentError("Giao dịch SePay trùng không khớp dữ liệu", 409);
      }
      outcome = previous.status;
    }

    if (updatedTable) {
      emitTableStatusChanged({
        tableId: String(updatedTable._id),
        status: updatedTable.status,
        table: updatedTable,
      });
    }
    if (isNewReceipt) {
      await notificationService
        .create({
          title:
            outcome === "confirmed"
              ? "Đặt bàn đã được thanh toán"
              : "Giao dịch đặt bàn cần đối soát/hoàn tiền",
          message:
            outcome === "confirmed"
              ? `Đặt bàn ${receipt.reference} đã nhận cọc ${receipt.amount.toLocaleString("vi-VN")}đ và được xác nhận tự động.`
              : `Giao dịch SePay ${receipt.reference} (${receipt.amount.toLocaleString("vi-VN")}đ) cần kiểm tra và xử lý hoàn tiền.`,
          type: NotificationType.TABLE,
        })
        .catch((error) =>
          console.error("Không thể gửi thông báo giao dịch đặt bàn:", error),
        );
    }
    return true;
  }

  /**
   * Quét và tự động hủy các đơn đặt bàn đang chờ thanh toán cọc nhưng đã quá thời hạn giữ chỗ (5 phút)
   * Hoàn trả lại số lượng tồn kho của các món F&B đã giữ trước đó
   */
  async expirePendingPayments() {
    const expired = await Booking.find({
      status: "pending",
      paymentStatus: "awaiting_payment",
      paymentExpiresAt: { $lte: new Date() },
    }).select("_id table preOrderItems inventoryReserved");
    let released = 0;
    for (const candidate of expired) {
      const didExpire = await mongoose.connection.transaction(async (session) => {
        const booking = await Booking.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "pending",
            paymentStatus: "awaiting_payment",
            paymentExpiresAt: { $lte: new Date() },
          },
          {
            $set: {
              status: "cancelled",
              paymentStatus: "expired",
              cancelledAt: new Date(),
              cancellationReason: PAYMENT_EXPIRY_REASON,
            },
          },
          { new: true, session },
        );
        if (!booking) return false;
        if (booking.inventoryReserved) {
          for (const item of booking.preOrderItems) {
            if (!(item as any).isMadeToOrder) {
              await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } },
                { session },
              );
            }
          }
          booking.inventoryReserved = false;
          await booking.save({ session });
        }
        return true;
      });
      if (didExpire) released++;
    }
    return released;
  }

  /**
   * Khách hàng tự hủy lịch đặt bàn từ trang Lịch sử & Hóa đơn của mình
   * Ràng buộc nghiệp vụ: Chỉ cho phép hủy trước giờ nhận bàn ít nhất 2 tiếng (CANCELLATION_CUTOFF_MS)
   * Khi hủy thành công:
   * - Bàn được trả về trạng thái AVAILABLE
   * - Xóa thông tin bookedInfo trên bàn
   * - Hoàn trả tồn kho F&B nếu có
   * - Phát socket cập nhật giao diện ngay lập tức
   */
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
          if (!(item as any).isMadeToOrder) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }
        }
        booking.inventoryReserved = false;
        await booking.save({ session });
      }
      const update = await Booking.updateOne(
        { _id: id, customer: customerId, status: booking.status },
        {
          $set: {
            status: "cancelled",
            ...(booking.paymentStatus === "awaiting_payment"
              ? { paymentStatus: "expired" }
              : {}),
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

  /**
   * Quản trị viên / Thu ngân cập nhật trạng thái đơn đặt bàn (Duyệt hoặc Từ chối)
   * - Nếu Duyệt (approved): gán bàn, chuyển trạng thái bàn sang BOOKED và lưu bookedInfo.
   * - Nếu Từ chối (rejected): yêu cầu nhập lý do từ chối, giải phóng bàn và hoàn trả tồn kho F&B.
   * - Gửi thông báo trực tiếp qua hệ thống Notification cho khách hàng biết kết quả.
   */
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
      if (booking.paymentStatus === "awaiting_payment" && input.status === "approved") {
        throw new Error("Chỉ xác nhận đặt bàn sau khi SePay ghi nhận thanh toán tiền cọc");
      }
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
        const resolvedPhone: string = String(booking.phone || custUser?.phone || "");
        booking.customerName = resolvedName;
        booking.phone = resolvedPhone;
        booking.table = table._id;
        booking.tableName = table.name;
        if (!booking.startDate || !booking.endDate) {
          booking.startDate = interval.startDate;
          booking.endDate = interval.endDate;
        }
        booking.estimatedCost = table.pricePerHour * (booking.duration || 2);
        if (table.status === TableStatus.AVAILABLE) {
          table.status = TableStatus.BOOKED;
        }
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
          if (!(item as any).isMadeToOrder) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }
        }
        booking.inventoryReserved = false;
      }
      booking.status = input.status;
      if (input.status === "rejected" && booking.paymentStatus === "awaiting_payment") {
        booking.paymentStatus = "expired";
      }
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
