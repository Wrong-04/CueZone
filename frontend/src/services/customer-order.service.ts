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
};
