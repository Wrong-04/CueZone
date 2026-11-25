// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: FRONTEND API CLIENT CHO MÀN HÌNH POS & ĐẶT BÀN
// PosTableFloorPage / CustomerBooking / POS Hooks
//   -> posService (vận hành bàn, gọi món, chuyển/gộp bàn, thanh toán, voucher)
//   -> bookingService (lấy bàn trống, đặt bàn, trạng thái cọc SePay, QR Check-in)
//   -> Backend Routers: /tables/:id/session/*, /tables/*, /bookings/*, /vouchers/*
// ============================================================================
import api from "./api";
import type { ApiResponse, BilliardTable, PricingTier } from "../types";
import type {
  PosTable,
  PosTableSession,
  BookingRequest,
  CheckoutReceipt,
  EligibleMoveTargetsResponse,
} from "../types/pos";

const tableCategoryMap: Record<string, { type: "pool" | "carom" | "snooker"; typeName: string }> = {
  pool: { type: "pool", typeName: "Bàn Bida Lỗ (Pool)" },
  carom: { type: "carom", typeName: "Bàn Bida Carom (Phăng)" },
  snooker: { type: "snooker", typeName: "Bàn Bida Snooker" },
};

type TableRecord = Omit<BilliardTable, "status"> & {
  status: PosTable["status"];
  currentSession?: PosTableSession;
  bookedInfo?: PosTable["bookedInfo"];
};

export interface BookingQrDetails {
  bookingId: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  table: { id: string; code: string; name: string };
  preOrderItems: {
    productId: string;
    name: string;
    category: string;
    unitPrice: number;
    quantity: number;
  }[];
  preOrderTotal: number;
}

function result<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined)
    throw new Error(response.message || "Máy chủ không trả về dữ liệu");
  return response.data;
}

export const posService = {
  /**
   * Lấy toàn bộ danh sách bàn đang hoạt động phục vụ sơ đồ bàn POS.
   * Luồng đi: PosTableFloorPage -> GET /tables?isActive=true -> chuẩn hóa nhãn pool/carom/snooker.
   *
   * @returns {Promise<PosTable[]>} Danh sách bàn kèm phiên chơi hiện tại (nếu có)
   */
  async getTables(): Promise<PosTable[]> {
    const { data } = await api.get<ApiResponse<TableRecord[]>>("/tables", {
      params: { isActive: true },
    });
    return result(data).map((table) => {
      const category = tableCategoryMap[table.type] || {
        type: "pool",
        typeName: "Bàn Bida Lỗ (Pool)",
      };
      return { ...table, id: table._id, type: category.type, typeName: category.typeName };
    });
  },
  async getPublicTables(params?: { type?: string; area?: string; status?: string }): Promise<
    Array<{
      _id: string;
      id: string;
      code: string;
      name: string;
      type: "pool" | "carom" | "snooker";
      typeName: string;
      area: string;
      floor: number;
      pricePerHour: number;
      status: "available" | "playing" | "paused" | "booked" | "maintenance";
      sessionStart?: string;
      isPaused?: boolean;
      bookedTime?: string;
      durationMinutes?: number;
      durationFormatted?: string;
    }>
  > {
    const { data } = await api.get<ApiResponse<any[]>>("/public/tables", {
      params: { ...params, _t: Date.now() },
    });
    return result(data);
  },
  /**
   * Lấy biểu giá theo khung giờ (ban ngày, cao điểm, cuối tuần, đêm) để tính tạm tính realtime.
   *
   * @returns {Promise<PricingTier[]>} Danh sách khung giá đang cấu hình
   */
  async getPricingTiers(): Promise<PricingTier[]> {
    const { data } = await api.get<ApiResponse<PricingTier[]>>("/public/pricing").catch(() => api.get<ApiResponse<PricingTier[]>>("/pricing"));
    return result(data);
  },
  /**
   * Mở phiên chơi mới trên bàn (hoặc check-in khách đặt trước).
   * Luồng đi: usePosOpenTable -> POST /tables/:id/session -> SessionService.open().
   *
   * @param {string} tableId - Mã định danh bàn cần mở
   * @param {object} input - Thông tin khách hàng, ghi chú và mã booking (nếu check-in)
   * @returns {Promise<TableRecord>} Dữ liệu bàn sau khi chuyển sang trạng thái playing
   */
  async open(
    tableId: string,
    input: {
      customerName: string;
      customerPhone: string;
      note: string;
      bookingId?: string;
      isMember?: boolean;
    },
  ) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/session`, input);
    return result(data);
  },
  /**
   * Tạm dừng hoặc tiếp tục đồng hồ tính giờ trên bàn đang mở.
   *
   * @param {PosTable} table - Bàn cần chuyển trạng thái tạm dừng / tiếp tục
   * @returns {Promise<TableRecord>} Dữ liệu bàn sau khi cập nhật
   */
  async pause(table: PosTable) {
    const { data } = await api.patch<ApiResponse<TableRecord>>(
      `/tables/${table.id}/session/pause`,
      {
        sessionId: table.currentSession?.sessionId,
        paused: !table.currentSession?.isPaused,
      },
    );
    return result(data);
  },
  /**
   * Chuyển bàn trống hoặc gộp phiên chơi sang một bàn đích khác.
   * Luồng đi: usePosTransfer -> POST /tables/:id/session/move -> SessionService.move().
   *
   * @param {PosTable} table - Bàn nguồn
   * @param {string} targetTableId - Mã bàn đích
   * @param {"transfer" | "merge"} action - Chế độ chuyển bàn hoặc gộp bàn
   * @param {object} [options] - Lý do và tùy chọn giữ/áp dụng giá giờ
   * @returns {Promise<TableRecord>} Dữ liệu bàn sau khi chuyển/gộp
   */
  async move(
    table: PosTable,
    targetTableId: string,
    action: "transfer" | "merge",
    options?: {
      reason?: string;
      pricingOption?: "keep_agreed" | "target_table";
    },
  ) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${table.id}/session/move`, {
      sessionId: table.currentSession?.sessionId,
      targetTableId,
      action,
      reason: options?.reason,
      pricingOption: options?.pricingOption,
    });
    return result(data);
  },
  /**
   * Lấy danh sách các bàn đích hợp lệ để chuyển hoặc gộp phiên chơi hiện tại.
   *
   * @param {string} tableId - Mã bàn nguồn
   * @param {"transfer" | "merge"} [action="transfer"] - Hành động chuyển hay gộp
   * @returns {Promise<EligibleMoveTargetsResponse>} Thông tin bàn nguồn và danh sách bàn đích
   */
  async getMoveTargets(
    tableId: string,
    action: "transfer" | "merge" = "transfer",
  ): Promise<EligibleMoveTargetsResponse> {
    const { data } = await api.get<ApiResponse<EligibleMoveTargetsResponse>>(
      `/tables/${tableId}/session/move-targets?action=${action}`,
    );
    return result(data);
  },
  /**
   * Chốt thanh toán phiên chơi, xuất hóa đơn và giải phóng bàn.
   * Luồng đi: usePosCheckout -> POST /tables/:id/session/checkout -> SessionService.checkout().
   *
   * @param {PosTable} table - Bàn cần thanh toán
   * @param {number} discountPercent - Phần trăm giảm giá hội viên (%)
   * @param {string} paymentMethod - Phương thức thanh toán (cash | vnpay | split | card; backend cũng hỗ trợ transfer | cash_qr | member_balance | wallet)
   * @param {string} [voucherCode] - Mã voucher áp dụng
   * @param {string} [customerPhone] - SĐT khách hàng để tích điểm / dùng voucher
   * @param {object} [paymentDetails] - Chi tiết tiền mặt & chuyển khoản (cho split)
   * @returns {Promise<CheckoutReceipt>} Biên lai hóa đơn đã lưu
   */
  async checkout(
    table: PosTable,
    discountPercent: number,
    paymentMethod: string,
    voucherCode?: string,
    customerPhone?: string,
    paymentDetails?: { cashAmount?: number; transferAmount?: number },
  ): Promise<CheckoutReceipt> {
    const { data } = await api.post<ApiResponse<CheckoutReceipt>>(
      `/tables/${table.id}/session/checkout`,
      {
        sessionId: table.currentSession?.sessionId,
        discountPercent,
        paymentMethod,
        ...(voucherCode ? { voucherCode } : {}),
        ...(customerPhone ? { customerPhone } : {}),
        ...(paymentDetails ? { paymentDetails } : {}),
      },
    );
    return result(data);
  },
  /**
   * Tra cứu hội viên theo số điện thoại để lấy hạng thẻ, % ưu đãi và danh sách voucher.
   *
   * @param {string} phone - Số điện thoại khách hàng
   * @returns {Promise<ApiResponse<any>>} Thông tin hội viên tương ứng (nếu tồn tại)
   */
  async lookupCustomer(phone: string) {
    const { data } = await api.get<
      ApiResponse<{
        id: string;
        name: string;
        phone: string;
        rank: string;
        membershipTierKey?: string;
        discountPercent?: number;
        fnbDiscountPercent?: number;
        elo: number;
        isMember: boolean;
        membershipPoints?: number;
        totalStoreVouchers?: number;
        availableVouchers?: Array<{
          code: string;
          description?: string;
          discountType: "percent" | "fixed";
          discountValue: number;
          maxDiscountAmount?: number;
          minOrderAmount: number;
          targetAudience?: "all" | "new_member" | "vip";
        }>;
      }>
    >("/tables/customer-lookup", { params: { phone } });
    return data;
  },
  async quickRegisterCustomer(input: { phone: string; name?: string }) {
    const { data } = await api.post<
      ApiResponse<{
        id: string;
        name: string;
        phone: string;
        rank: string;
        membershipTierKey?: string;
        discountPercent?: number;
        fnbDiscountPercent?: number;
        elo: number;
        isMember: boolean;
        membershipPoints?: number;
        totalStoreVouchers?: number;
        availableVouchers?: Array<{
          code: string;
          description?: string;
          discountType: "percent" | "fixed";
          discountValue: number;
          maxDiscountAmount?: number;
          minOrderAmount: number;
          targetAudience?: "all" | "new_member" | "vip";
        }>;
        isNewCustomer?: boolean;
        message?: string;
      }>
    >("/tables/quick-register-customer", input);
    return data;
  },
  /**
   * Kiểm tra tính hợp lệ và số tiền giảm thực tế của mã voucher trước khi chốt bill.
   *
   * @param {string} code - Mã voucher thu ngân nhập
   * @param {number} subtotal - Tổng tạm tính trước giảm giá
   * @param {string} [customerPhone] - SĐT hội viên để kiểm tra đối tượng áp dụng
   * @returns {Promise<object>} Kết quả giảm giá chi tiết của voucher
   */
  async validateVoucher(code: string, subtotal: number, customerPhone?: string) {
    const { data } = await api.post<
      ApiResponse<{
        code: string;
        discountType: "percent" | "fixed";
        discountValue: number;
        minOrderAmount: number;
        discountAmount: number;
      }>
    >("/vouchers/validate", { code, subtotal, customerPhone });
    return result(data);
  },
  /**
   * Hủy một phần hoặc toàn bộ món F&B đã gọi trong phiên và hoàn/ghi nhận hao hụt kho.
   * Luồng đi: usePosFnb -> POST /tables/:id/session/orders/cancel -> SessionService.cancelOrderItem().
   *
   * @param {string} tableId - Mã bàn đang mở phiên
   * @param {string} sessionId - Mã phiên chơi hiện tại
   * @param {string} orderItemId - Mã dòng món trong currentSession.orders
   * @param {number} quantity - Số lượng muốn hủy
   * @param {string} reason - Lý do hủy món
   * @param {boolean} [restoreStock=true] - Có hoàn trả lại tồn kho hay không
   * @returns {Promise<TableRecord>} Dữ liệu bàn sau khi hủy món
   */
  async cancelOrderItem(
    tableId: string,
    sessionId: string,
    orderItemId: string,
    quantity: number,
    reason: string,
    restoreStock: boolean = true,
  ) {
    const { data } = await api.post<ApiResponse<TableRecord>>(
      `/tables/${tableId}/session/orders/cancel`,
      {
        sessionId,
        orderItemId,
        quantity,
        reason,
        restoreStock,
      },
    );
    return result(data);
  },
  /**
   * Cập nhật danh sách món F&B mới vào phiên chơi của bàn và đồng bộ qua Socket.IO.
   * Luồng đi: usePosFnb -> POST /tables/:id/session/orders -> SessionService.updateOrders() (cập nhật currentSession.orders).
   *
   * @param {string} tableId - Mã bàn đang chơi
   * @param {string} sessionId - Mã phiên chơi hiện tại
   * @param {any[]} orders - Toàn bộ danh sách món cập nhật của phiên
   * @returns {Promise<TableRecord>} Dữ liệu bàn sau khi lưu món
   */
  async updateOrders(tableId: string, sessionId: string, orders: any[]) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/session/orders`, {
      sessionId,
      orders,
    });
    return result(data);
  },
  async cancelBooking(tableId: string) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/cancel-booking`);
    return result(data);
  },
};

export const bookingService = {
  /**
   * Lấy danh sách bàn theo khung giờ và loại bàn kèm cờ khả dụng.
   *
   * @param {object} input - Điều kiện tìm kiếm khung giờ đặt bàn
   * @param {string} input.date - Ngày cần đặt bàn (YYYY-MM-DD)
   * @param {string} input.time - Giờ nhận bàn (HH:mm)
   * @param {number} input.duration - Số giờ dự kiến chơi
   * @param {"pool" | "carom" | "snooker"} [input.type] - Thể loại bàn bida
   * @returns {Promise<Array<BilliardTable & { id: string }>>} Danh sách bàn bida kèm trạng thái
   */
  async getAvailableTables(input: {
    date: string;
    time: string;
    duration: number;
    type?: "pool" | "carom" | "snooker";
  }): Promise<Array<BilliardTable & { id: string }>> {
    const { data } = await api.get<ApiResponse<BilliardTable[]>>("/public/booking-availability", {
      params: input,
    });
    return result(data).map((table) => ({ ...table, id: table._id }));
  },

  /**
   * Lấy danh sách các lịch đặt bàn của tài khoản khách hàng hiện tại.
   *
   * @returns {Promise<BookingRequest[]>} Danh sách đơn đặt bàn của khách hàng
   */
  async getMine(): Promise<BookingRequest[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/bookings/mine");
    return result(data).map((booking: any) => ({
      id: booking._id || booking.id || "",
      customerName: booking.customerName || "",
      phone: booking.phone || "",
      tableId:
        booking.tableId ||
        (typeof booking.table === "object" && booking.table ? booking.table._id : booking.table) ||
        "",
      tableName:
        booking.tableName ||
        (typeof booking.table === "object" && booking.table ? booking.table.name : "") ||
        "Bàn bida",
      tableType:
        booking.tableType === "carom"
          ? "Bàn Bida Carom (Phăng)"
          : booking.tableType === "snooker"
            ? "Bàn Bida Snooker"
            : booking.tableType
              ? "Bàn Bida Lỗ (Pool)"
              : "",
      date: booking.date || "",
      time: booking.time || "",
      duration: Number(booking.duration || 2),
      estimatedCost: Number(booking.estimatedCost || 0),
      deposit: Number(booking.deposit || 0),
      note: booking.note || "",
      status: booking.status || "pending",
      rejectionReason: booking.rejectionReason,
      createdAt: booking.createdAt || "",
    }));
  },

  /**
   * Khách hàng tự hủy một lịch đặt bàn của mình trước thời hạn quy định.
   *
   * @param {string} id - Mã định danh của đơn đặt bàn cần hủy
   * @param {string} reason - Lý do hủy lịch đặt bàn
   * @returns {Promise<BookingRequest>} Dữ liệu đơn đặt bàn sau khi hủy
   */
  async cancelMine(id: string, reason: string): Promise<BookingRequest> {
    const { data } = await api.post<ApiResponse<BookingRequest>>(`/bookings/${id}/cancel`, {
      reason,
    });
    return result(data);
  },

  /**
   * Lấy toàn bộ danh sách đơn đặt bàn trong hệ thống để quản trị/thu ngân kiểm soát.
   *
   * @returns {Promise<BookingRequest[]>} Danh sách toàn bộ các đơn đặt bàn
   */
  async getAll(): Promise<BookingRequest[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/bookings");
    return result(data).map((b: any) => ({
      id: b._id || b.id || "",
      customerName:
        b.customerName ||
        (typeof b.customer === "object" && b.customer ? b.customer.name : "") ||
        "Khách đặt trước",
      phone:
        b.phone ||
        (typeof b.customer === "object" && b.customer ? b.customer.phone : "") ||
        "09xxxxxxxx",
      tableId: b.tableId || (typeof b.table === "object" && b.table ? b.table._id : b.table) || "",
      tableName:
        b.tableName || (typeof b.table === "object" && b.table ? b.table.name : "") || "Bàn bida",
      date:
        b.date ||
        (b.bookingDate
          ? new Date(b.bookingDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)),
      time: b.time || b.startTime || "19:00",
      duration: Number(b.duration || 2),
      estimatedCost: Number(b.estimatedCost || 0),
      deposit: Number(b.deposit || 0),
      note: b.note || "",
      status: (b.status === "confirmed" ? "approved" : b.status) || "pending",
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt || new Date().toISOString(),
    }));
  },

  /**
   * Tạo đơn đặt bàn trực tiếp từ quầy lễ tân / thu ngân POS.
   *
   * @param {object} input - Dữ liệu đặt bàn tại quầy
   * @param {string} input.customerName - Họ tên khách hàng
   * @param {string} input.phone - Số điện thoại liên hệ
   * @param {string} input.tableId - Mã định danh bàn được chọn
   * @param {string} input.date - Ngày chơi (YYYY-MM-DD)
   * @param {string} input.time - Giờ nhận bàn (HH:mm)
   * @param {number} input.duration - Số giờ đặt
   * @param {number} input.deposit - Số tiền cọc thu tại quầy
   * @param {string} input.note - Ghi chú đặc biệt
   * @returns {Promise<any>} Kết quả tạo đơn đặt bàn thành công
   */
  async create(input: {
    customerName: string;
    phone: string;
    tableId: string;
    date: string;
    time: string;
    duration: number;
    deposit: number;
    note: string;
  }) {
    const { data } = await api.post<ApiResponse<any>>("/bookings", input);
    return result(data);
  },

  /**
   * Khách hàng đặt bàn trực tuyến qua website công khai kèm cọc SePay.
   *
   * @param {object} input - Thông tin đặt bàn trực tuyến
   * @param {string} input.customerName - Họ tên người đặt
   * @param {string} input.phone - Số di động nhận mã
   * @param {string} input.tableId - Mã định danh bàn
   * @param {string} input.date - Ngày đặt bàn (YYYY-MM-DD)
   * @param {string} input.time - Giờ nhận bàn (HH:mm)
   * @param {number} input.duration - Thời lượng chơi dự kiến
   * @param {number} [input.deposit=0] - Số tiền cọc cần thanh toán
   * @param {string} [input.note] - Ghi chú đơn đặt bàn
   * @param {Array<{ productId: string, quantity: number }>} [input.preOrderItems] - Danh sách món F&B đặt trước
   * @returns {Promise<any>} Đơn đặt bàn kèm thông tin thanh toán VietQR
   */
  async createPublic(input: {
    customerName: string;
    phone: string;
    tableId: string;
    date: string;
    time: string;
    duration: number;
    deposit?: number;
    note?: string;
    preOrderItems?: { productId: string; quantity: number }[];
  }) {
    const { data } = await api.post<ApiResponse<any>>("/public/bookings", {
      ...input,
      deposit: input.deposit ?? 0,
    });
    return result(data);
  },

  /**
   * Kiểm tra trạng thái thanh toán tiền cọc SePay theo mã tham chiếu.
   *
   * @param {string} reference - Mã tham chiếu giao dịch cọc (CB...)
   * @returns {Promise<any>} Thông tin trạng thái thanh toán và đơn đặt bàn
   */
  async getPublicPaymentStatus(reference: string) {
    const { data } = await api.get<ApiResponse<any>>(
      `/public/bookings/payment/${encodeURIComponent(reference)}`,
    );
    return result(data);
  },

  /**
   * Hủy yêu cầu đặt cọc trong thời gian chờ thanh toán 5 phút.
   *
   * @param {string} reference - Mã tham chiếu chuyển khoản cần hủy
   * @returns {Promise<{ reference: string, status: "cancelled" | "expired" }>} Trạng thái sau khi hủy
   */
  async cancelPublicPayment(
    reference: string,
  ): Promise<{ reference: string; status: "cancelled" | "expired" }> {
    const { data } = await api.post<
      ApiResponse<{ reference: string; status: "cancelled" | "expired" }>
    >(`/public/bookings/payment/${encodeURIComponent(reference)}/cancel`);
    return result(data);
  },

  /**
   * Cấp phát mã QR Check-in điện tử cho một đơn đặt bàn đã thanh toán cọc.
   *
   * @param {string} id - Mã định danh của đơn đặt bàn
   * @returns {Promise<{ qrToken: string }>} Chuỗi token bí mật của mã QR
   */
  async issueQr(id: string): Promise<{ qrToken: string }> {
    const { data } = await api.post<ApiResponse<{ qrToken: string }>>(`/bookings/${id}/qr`);
    return result(data);
  },

  /**
   * Nhân viên quét hoặc nhập mã QR Token để trích xuất thông tin lịch đặt tại quầy.
   *
   * @param {string} qrToken - Chuỗi token đọc từ mã QR của khách
   * @returns {Promise<BookingQrDetails>} Chi tiết lịch đặt bàn và thông tin khách
   */
  async resolveQr(qrToken: string): Promise<BookingQrDetails> {
    const { data } = await api.post<ApiResponse<BookingQrDetails>>("/bookings/qr/resolve", {
      qrToken,
    });
    return result(data);
  },

  /**
   * Quản trị viên cập nhật trạng thái đơn đặt bàn (Duyệt/Từ chối/Đổi bàn).
   *
   * @param {string} id - Mã định danh của đơn đặt bàn
   * @param {object} input - Dữ liệu cập nhật
   * @param {"approved" | "rejected" | "pending"} input.status - Trạng thái mới
   * @param {string} [input.tableId] - Mã bàn mới được phân bổ
   * @param {string} [input.rejectionReason] - Lý do nếu từ chối đơn
   * @returns {Promise<any>} Dữ liệu sau khi cập nhật
   */
  async update(
    id: string,
    input: {
      status: "approved" | "rejected" | "pending";
      tableId?: string;
      rejectionReason?: string;
    },
  ) {
    const { data } = await api.patch<ApiResponse<any>>(`/bookings/${id}`, input);
    return result(data);
  },
};

export const tableAdminService = {
  async getAll(): Promise<BilliardTable[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/tables");
    return result(data).map((t) => ({
      _id: String(t._id),
      code: t.code,
      name: t.name,
      type: t.type,
      area: t.area,
      floor: t.floor,
      pricePerHour: t.pricePerHour,
      status: t.status,
      isActive: t.isActive !== false,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "",
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString().split("T")[0] : "",
    }));
  },
  async create(table: Partial<BilliardTable>): Promise<any> {
    const { data } = await api.post<ApiResponse<any>>("/tables", table);
    return result(data);
  },
  async update(id: string, table: Partial<BilliardTable>): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/tables/${id}`, table);
    return result(data);
  },
  async updateStatus(id: string, status: "available" | "maintenance"): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/tables/${id}/status`, { status });
    return result(data);
  },
  async delete(id: string): Promise<any> {
    const { data } = await api.delete<ApiResponse<any>>(`/tables/${id}`);
    return result(data);
  },
};

export const pricingAdminService = {
  async getAll(): Promise<PricingTier[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/pricing");
    return result(data).map((p) => ({
      _id: String(p._id),
      name: p.name,
      dayType: p.dayType,
      startTime: p.startTime,
      endTime: p.endTime,
      daysOfWeek: p.daysOfWeek || [1, 2, 3, 4, 5],
      prices: p.prices || { standard: 0, vip: 0, match: 0 },
      isActive: p.isActive !== false,
      isCurrentlyActive: p.isCurrentlyActive || false,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "",
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : "",
    }));
  },
  async create(tier: Partial<PricingTier>): Promise<any> {
    const { data } = await api.post<ApiResponse<any>>("/pricing", tier);
    return result(data);
  },
  async update(id: string, tier: Partial<PricingTier>): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/pricing/${id}`, tier);
    return result(data);
  },
  async activate(id: string): Promise<any> {
    const { data } = await api.put<ApiResponse<any>>(`/pricing/${id}/activate`);
    return result(data);
  },
  async delete(id: string): Promise<any> {
    const { data } = await api.delete<ApiResponse<any>>(`/pricing/${id}`);
    return result(data);
  },
};
