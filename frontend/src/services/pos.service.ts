import api from "./api";
import type { ApiResponse, BilliardTable } from "../types";
import type { PosTable, PosTableSession, BookingRequest, CheckoutReceipt } from "../types/pos";

const tableTypes = {
  standard_9ft: { type: "standard", typeName: "Bàn Thường 9FT" },
  vip_bank_pool: { type: "vip", typeName: "Bàn VIP Bank Pool" },
  match_ksteel: { type: "match", typeName: "Bàn Match K-Steel" },
} as const;

type TableRecord = Omit<BilliardTable, "status"> & {
  status: PosTable["status"];
  currentSession?: PosTableSession;
  bookedInfo?: PosTable["bookedInfo"];
};
type BookingRecord = Omit<BookingRequest, "id"> & { _id: string };

function result<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error(response.message || "Máy chủ không trả về dữ liệu");
  return response.data;
}

export const posService = {
  async getTables(): Promise<PosTable[]> {
    const { data } = await api.get<ApiResponse<TableRecord[]>>("/tables", { params: { isActive: true } });
    return result(data).map(table => ({ ...table, id: table._id, ...tableTypes[table.type] }));
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
};

export const bookingService = {
  async getAll(): Promise<BookingRequest[]> {
    const { data } = await api.get<ApiResponse<BookingRecord[]>>("/bookings");
    return result(data).map(booking => ({ ...booking, id: booking._id }));
  },
  async create(input: { customerName: string; phone: string; tableId: string; date: string; time: string; duration: number; deposit: number; note: string }) {
    const { data } = await api.post<ApiResponse<BookingRecord>>("/bookings", input);
    return result(data);
  },
  async update(id: string, input: { status: "approved" | "rejected" | "pending"; tableId?: string; rejectionReason?: string }) {
    const { data } = await api.patch<ApiResponse<BookingRecord>>(`/bookings/${id}`, input);
    return result(data);
  },
};
