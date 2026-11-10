import api from "./api";
import type { ApiResponse } from "../types";

export type VoucherDiscountType = "percent" | "fixed";
export type VoucherTargetAudience = "all" | "new_member" | "vip";

export interface Voucher {
  _id: string;
  code: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  startsAt: string;
  expiresAt?: string | null;
  maxUses?: number;
  usageCount: number;
  isActive: boolean;
  targetAudience?: VoucherTargetAudience;
}

export interface VoucherUsage {
  _id: string;
  code: string;
  sessionId: string;
  invoiceCode: string;
  tableId: string;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  usedAt: string;
}

export interface VoucherInput {
  code: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  startsAt: string;
  expiresAt?: string | null;
  maxUses: number | null;
  isActive?: boolean;
  targetAudience?: VoucherTargetAudience;
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || "Không thể hoàn tất yêu cầu voucher");
  }
  return response.data;
}

export const voucherService = {
  async list(): Promise<Voucher[]> {
    const { data } = await api.get<ApiResponse<Voucher[]>>("/vouchers");
    return unwrap(data);
  },
  async create(input: VoucherInput): Promise<Voucher> {
    const { data } = await api.post<ApiResponse<Voucher>>("/vouchers", input);
    return unwrap(data);
  },
  async update(id: string, input: VoucherInput): Promise<Voucher> {
    const { data } = await api.put<ApiResponse<Voucher>>(`/vouchers/${id}`, input);
    return unwrap(data);
  },
  async setActive(id: string, isActive: boolean): Promise<Voucher> {
    const { data } = await api.put<ApiResponse<Voucher>>(`/vouchers/${id}`, { isActive });
    return unwrap(data);
  },
  async remove(id: string): Promise<void> {
    const { data } = await api.delete<ApiResponse<undefined>>(`/vouchers/${id}`);
    if (!data.success) throw new Error(data.message || "Không thể xóa voucher");
  },
  async usageHistory(id: string): Promise<VoucherUsage[]> {
    const { data } = await api.get<ApiResponse<VoucherUsage[]>>(`/vouchers/${id}/usage`);
    return unwrap(data);
  },
};
