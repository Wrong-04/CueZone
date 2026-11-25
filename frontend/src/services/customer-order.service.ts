// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: ORDER F&B & YÊU CẦU THANH TOÁN TẠI BÀN
// - customerOrderService: Dùng cho Khách hàng (/customer/fnb) gọi món & gọi tính tiền
// - staffOrderService   : Dùng cho Nhân viên POS (CustomerOrderDrawer & CustomerPaymentRequests)
//   -> Backend: customer-order.routes.ts -> CustomerOrderService / SessionService
// ============================================================================
import api from "./api";
import type { ApiResponse } from "../types";
import type { CheckoutReceipt } from "../types/pos";

export type CustomerOrderStatus = "pending" | "preparing" | "ready" | "served" | "rejected";

export interface ActiveOrderTable {
  tableId: string;
  tableCode: string;
  tableName: string;
  status: "playing" | "paused";
  sessionId: string;
  sessionStart: string;
  startedAt: number;
  isPaused: boolean;
  minutes: number;
  formattedTime: string;
  elapsedSeconds: number;
  playingCost: number;
  fnbTotal: number;
  orders: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    orderTime: string;
    status: string;
  }[];
  subtotal: number;
  deposit: number;
  tier: {
    key: string;
    name: string;
    tableDiscountPercent: number;
    fnbDiscountPercent: number;
  };
  membershipDiscountAmount: number;
  voucherDiscountAmount: number;
  discountAmount: number;
  totalDue: number;
  walletBalance: number;
  checkoutState: "open" | "pending_payment";
  pendingCheckout?: {
    requestedAt: string;
  };
}

export type CheckoutPaymentMethod = "cash" | "vnpay" | "split";

export interface CheckoutPaymentDetails {
  cashAmount: number;
  transferAmount: number;
}

export interface CheckoutRequest {
  tableId: string;
  tableCode: string;
  tableName: string;
  tableType: string;
  sessionId: string;
  customerName: string;
  customerPhone?: string;
  voucherCode?: string;
  requestedAt: string;
  totalDue: number;
  sessionStart: string;
  durationMinutes: number;
  durationFormatted: string;
  playingCost: number;
  fnbTotal: number;
  orders: {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    status: string;
  }[];
  subtotal: number;
  deposit: number;
  membershipTierName: string;
  membershipDiscountAmount: number;
  voucherDiscountAmount: number;
}

export interface CustomerCheckoutPreview {
  playingCost: number;
  fnbTotal: number;
  subtotal: number;
  deposit: number;
  tier: ActiveOrderTable["tier"];
  membershipDiscountAmount: number;
  voucherCode?: string;
  voucherDiscountAmount: number;
  discountAmount: number;
  totalDue: number;
  walletBalance: number;
}

export interface CustomerOrder {
  _id: string;
  orderCode: string;
  customerId: string;
  tableId: string;
  tableCode: string;
  tableName: string;
  sessionId: string;
  items: {
    productId: string;
    name: string;
    category: string;
    unitPrice: number;
    quantity: number;
  }[];
  totalAmount: number;
  note?: string;
  status: CustomerOrderStatus;
  statusMessage?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Chuẩn hóa phản hồi từ API và ném lỗi kèm thông điệp tiếng Việt nếu request thất bại.
 *
 * @param {ApiResponse<T>} response - Gói dữ liệu trả về từ backend
 * @returns {T} Dữ liệu nghiệp vụ đã giải nén
 */
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || "Không thể hoàn tất yêu cầu gọi món");
  }
  return response.data;
}

/** Tập API dành cho Khách hàng tự gọi món F&B và yêu cầu thanh toán tại bàn */
export const customerOrderService = {
  /**
   * Lấy danh sách các bàn mà tài khoản khách hàng đang chơi để gắn vào đơn gọi món.
   *
   * @returns {Promise<ActiveOrderTable[]>} Danh sách phiên bàn đang mở của khách
   */
  async getActiveTables(): Promise<ActiveOrderTable[]> {
    const { data } = await api.get<ApiResponse<ActiveOrderTable[]>>(
      "/customer/fnb-orders/active-tables",
    );
    return unwrap(data);
  },
  /**
   * Khách hàng gửi đơn gọi món F&B mới lên quầy thu ngân POS.
   *
   * @param {object} input - Thông tin bàn, phiên, danh sách món và ghi chú
   * @returns {Promise<CustomerOrder>} Đơn gọi món vừa khởi tạo ở trạng thái pending
   */
  async create(input: {
    tableId: string;
    sessionId: string;
    items: { productId: string; quantity: number }[];
    note?: string;
  }): Promise<CustomerOrder> {
    const { data } = await api.post<ApiResponse<CustomerOrder>>("/customer/fnb-orders", input);
    return unwrap(data);
  },
  /**
   * Lấy chi tiết một đơn gọi món cụ thể của chính khách hàng.
   *
   * @param {string} orderId - Mã đơn gọi món
   * @returns {Promise<CustomerOrder>} Thông tin và trạng thái mới nhất của đơn
   */
  async getMine(orderId: string): Promise<CustomerOrder> {
    const { data } = await api.get<ApiResponse<CustomerOrder>>(
      `/customer/fnb-orders/${encodeURIComponent(orderId)}`,
    );
    return unwrap(data);
  },
  /**
   * Xem trước tạm tính (tiền giờ, F&B, giảm giá hội viên, voucher) trước khi khách bấm gọi tính tiền.
   *
   * @param {string} tableId - Mã bàn đang chơi
   * @param {string} sessionId - Mã phiên chơi hiện tại
   * @param {string} [voucherCode] - Mã voucher áp dụng thử
   * @returns {Promise<CustomerCheckoutPreview>} Bảng tạm tính chi tiết cho khách
   */
  async previewCheckout(
    tableId: string,
    sessionId: string,
    voucherCode?: string,
  ): Promise<CustomerCheckoutPreview> {
    const { data } = await api.post<ApiResponse<CustomerCheckoutPreview>>(
      `/customer/fnb-orders/${encodeURIComponent(tableId)}/checkout-preview`,
      { sessionId, voucherCode },
    );
    return unwrap(data);
  },
  /**
   * Khách hàng gửi yêu cầu thanh toán bàn tới nhân viên thu ngân tại quầy POS.
   *
   * @param {string} tableId - Mã bàn đang chơi
   * @param {object} input - Mã phiên chơi và voucher áp dụng (nếu có)
   * @returns {Promise<object>} Kết quả chờ nhân viên xác nhận tại quầy
   */
  async requestCheckout(
    tableId: string,
    input: { sessionId: string; voucherCode?: string },
  ): Promise<{ status: "paid" | "pending_payment"; receipt?: Record<string, unknown> }> {
    const { data } = await api.post<
      ApiResponse<{ status: "paid" | "pending_payment"; receipt?: Record<string, unknown> }>
    >(`/customer/fnb-orders/${encodeURIComponent(tableId)}/checkout`, input);
    return unwrap(data);
  },
};

/** Tập API dành cho Nhân viên POS xử lý hàng đợi món F&B và yêu cầu thanh toán */
export const staffOrderService = {
  /**
   * Lấy danh sách đơn gọi món trực tuyến trong 24h đang chờ quầy xử lý.
   *
   * @returns {Promise<CustomerOrder[]>} Danh sách đơn hàng ở trạng thái pending/preparing/ready
   */
  async getQueue(): Promise<CustomerOrder[]> {
    const { data } = await api.get<ApiResponse<CustomerOrder[]>>("/customer/fnb-orders/queue");
    return unwrap(data);
  },
  /**
   * Nhân viên cập nhật trạng thái đơn gọi món của khách (tiếp nhận pha chế, sẵn sàng, phục vụ hoặc từ chối).
   *
   * @param {string} orderId - Mã đơn gọi món
   * @param {CustomerOrderStatus} status - Trạng thái mới
   * @param {string} [rejectedReason] - Lý do nếu từ chối đơn
   * @returns {Promise<CustomerOrder>} Đơn sau khi cập nhật trạng thái
   */
  async updateStatus(
    orderId: string,
    status: CustomerOrderStatus,
    rejectedReason?: string,
  ): Promise<CustomerOrder> {
    const { data } = await api.patch<ApiResponse<CustomerOrder>>(
      `/customer/fnb-orders/${encodeURIComponent(orderId)}/status`,
      { status, rejectedReason },
    );
    return unwrap(data);
  },
  /**
   * Lấy danh sách các bàn có khách đang chờ thu ngân xác nhận thanh toán.
   *
   * @returns {Promise<CheckoutRequest[]>} Danh sách yêu cầu thanh toán chờ xử lý
   */
  async getPaymentRequests(): Promise<CheckoutRequest[]> {
    const { data } = await api.get<ApiResponse<CheckoutRequest[]>>(
      "/customer/fnb-orders/payment-requests",
    );
    return unwrap(data);
  },
  /**
   * Thu ngân xác nhận thu tiền (tiền mặt / VietQR / kết hợp) hoặc từ chối yêu cầu tính tiền của khách.
   *
   * @param {string} tableId - Mã bàn đang chờ thanh toán
   * @param {string} sessionId - Mã phiên chơi hiện tại
   * @param {boolean} approved - true nếu đồng ý chốt hóa đơn, false nếu từ chối
   * @param {object} [payment] - Hình thức thanh toán và phân bổ tiền mặt/chuyển khoản
   * @returns {Promise<object>} Biên lai hóa đơn nếu đã thanh toán hoặc trạng thái từ chối
   */
  async resolvePaymentRequest(
    tableId: string,
    sessionId: string,
    approved: boolean,
    payment?: {
      paymentMethod: CheckoutPaymentMethod;
      paymentDetails: CheckoutPaymentDetails;
    },
  ): Promise<{ status: "paid"; receipt: CheckoutReceipt } | { status: "rejected" }> {
    const { data } = await api.patch<
      ApiResponse<{ status: "paid"; receipt: CheckoutReceipt } | { status: "rejected" }>
    >(
      `/customer/fnb-orders/payment-requests/${encodeURIComponent(tableId)}`,
      { sessionId, approved, ...payment },
    );
    return unwrap(data);
  },
};
