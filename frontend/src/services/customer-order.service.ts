import api from "./api";
import type { ApiResponse } from "../types";

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
    paymentMethod: "cash" | "transfer";
    requestedAt: string;
  };
}

export interface CheckoutRequest {
  tableId: string;
  tableCode: string;
  tableName: string;
  sessionId: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: "cash" | "transfer";
  voucherCode?: string;
  requestedAt: string;
  totalDue: number;
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

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || "Không thể hoàn tất yêu cầu gọi món");
  }
  return response.data;
}

export const customerOrderService = {
  async getActiveTables(): Promise<ActiveOrderTable[]> {
    const { data } = await api.get<ApiResponse<ActiveOrderTable[]>>(
      "/customer/fnb-orders/active-tables",
    );
    return unwrap(data);
  },
  async create(input: {
    tableId: string;
    sessionId: string;
    items: { productId: string; quantity: number }[];
    note?: string;
  }): Promise<CustomerOrder> {
    const { data } = await api.post<ApiResponse<CustomerOrder>>("/customer/fnb-orders", input);
    return unwrap(data);
  },
  async getMine(orderId: string): Promise<CustomerOrder> {
    const { data } = await api.get<ApiResponse<CustomerOrder>>(
      `/customer/fnb-orders/${encodeURIComponent(orderId)}`,
    );
    return unwrap(data);
  },
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
  async requestCheckout(
    tableId: string,
    input: { sessionId: string; paymentMethod: "cash" | "transfer" | "member_balance"; voucherCode?: string },
  ): Promise<{ status: "paid" | "pending_payment"; receipt?: Record<string, unknown> }> {
    const { data } = await api.post<
      ApiResponse<{ status: "paid" | "pending_payment"; receipt?: Record<string, unknown> }>
    >(`/customer/fnb-orders/${encodeURIComponent(tableId)}/checkout`, input);
    return unwrap(data);
  },
};

export const staffOrderService = {
  async getQueue(): Promise<CustomerOrder[]> {
    const { data } = await api.get<ApiResponse<CustomerOrder[]>>("/customer/fnb-orders/queue");
    return unwrap(data);
  },
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
  async getPaymentRequests(): Promise<CheckoutRequest[]> {
    const { data } = await api.get<ApiResponse<CheckoutRequest[]>>(
      "/customer/fnb-orders/payment-requests",
    );
    return unwrap(data);
  },
  async resolvePaymentRequest(
    tableId: string,
    sessionId: string,
    approved: boolean,
  ): Promise<{ status: "paid" | "rejected" }> {
    const { data } = await api.patch<ApiResponse<{ status: "paid" | "rejected" }>>(
      `/customer/fnb-orders/payment-requests/${encodeURIComponent(tableId)}`,
      { sessionId, approved },
    );
    return unwrap(data);
  },
};
