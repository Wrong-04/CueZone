import api from "./api";
import type { ApiResponse, BilliardTable, PricingTier } from "../types";
import type { PosTable, PosTableSession, BookingRequest, CheckoutReceipt } from "../types/pos";

// Ánh xạ 3 loại bàn bida chuẩn: Bàn Bida Lỗ (Pool), Bàn Bida Carom (Phăng), Bàn Bida Snooker
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

function result<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error(response.message || "Máy chủ không trả về dữ liệu");
  return response.data;
}

export const posService = {
  async getTables(): Promise<PosTable[]> {
    const { data } = await api.get<ApiResponse<TableRecord[]>>("/tables", { params: { isActive: true } });
    return result(data).map(table => {
      const category = tableCategoryMap[table.type] || { type: "pool", typeName: "Bàn Bida Lỗ (Pool)" };
      return { ...table, id: table._id, type: category.type, typeName: category.typeName };
    });
  },
  async getPublicTables(params?: { type?: string; area?: string; status?: string }): Promise<Array<{
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
  }>> {
    const { data } = await api.get<ApiResponse<any[]>>("/public/tables", { params });
    return result(data);
  },
  async getPricingTiers(): Promise<PricingTier[]> {
    const { data } = await api.get<ApiResponse<PricingTier[]>>("/pricing");
    return result(data);
  },
  async open(tableId: string, input: { customerName: string; customerPhone: string; note: string; bookingId?: string }) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/session`, input);
    return result(data);
  },
  async pause(table: PosTable) {
    const { data } = await api.patch<ApiResponse<TableRecord>>(`/tables/${table.id}/session/pause`, {
      sessionId: table.currentSession?.sessionId, paused: !table.currentSession?.isPaused,
    });
    return result(data);
  },
  async move(table: PosTable, targetTableId: string, action: "transfer" | "merge") {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${table.id}/session/move`, {
      sessionId: table.currentSession?.sessionId, targetTableId, action,
    });
    return result(data);
  },
  async checkout(table: PosTable, discountPercent: number, paymentMethod: string): Promise<CheckoutReceipt> {
    const { data } = await api.post<ApiResponse<CheckoutReceipt>>(`/tables/${table.id}/session/checkout`, {
      sessionId: table.currentSession?.sessionId, discountPercent, paymentMethod,
    });
    return result(data);
  },
  async updateOrders(tableId: string, sessionId: string, orders: any[]) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/session/orders`, {
      sessionId, orders,
    });
    return result(data);
  },
  async cancelBooking(tableId: string) {
    const { data } = await api.post<ApiResponse<TableRecord>>(`/tables/${tableId}/cancel-booking`);
    return result(data);
  },
};

export const bookingService = {
  async getAll(): Promise<BookingRequest[]> {
    const { data } = await api.get<ApiResponse<any[]>>("/bookings");
    return result(data).map((b: any) => ({
      id: b._id || b.id || "",
      customerName: b.customerName || (typeof b.customer === "object" && b.customer ? b.customer.name : "") || "Khách đặt trước",
      phone: b.phone || (typeof b.customer === "object" && b.customer ? b.customer.phone : "") || "09xxxxxxxx",
      tableId: b.tableId || (typeof b.table === "object" && b.table ? b.table._id : b.table) || "",
      tableName: b.tableName || (typeof b.table === "object" && b.table ? b.table.name : "") || "Bàn bida",
      date: b.date || (b.bookingDate ? new Date(b.bookingDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
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
  async create(input: { customerName: string; phone: string; tableId: string; date: string; time: string; duration: number; deposit: number; note: string }) {
    const { data } = await api.post<ApiResponse<any>>("/bookings", input);
    return result(data);
  },
  async update(id: string, input: { status: "approved" | "rejected" | "pending"; tableId?: string; rejectionReason?: string }) {
    const { data } = await api.patch<ApiResponse<any>>(`/bookings/${id}`, input);
    return result(data);
  },
};
