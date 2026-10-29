import api from "./api";
import type { ApiResponse } from "../types";

export type WalletTransactionStatus = "pending" | "success" | "failed";
export type WalletTransactionType = "topup" | "payment";

export interface WalletTransaction {
  _id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  description: string;
  referenceCode: string;
  balanceAfter: number;
  createdAt: string;
  reviewedAt?: string;
}

export interface WalletInfo {
  _id: string;
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
}

export interface PendingTopup {
  walletId: string;
  user: { _id: string; name: string; email: string; phone?: string };
  transaction: WalletTransaction;
}

export const walletService = {
  async getMine(): Promise<WalletInfo> {
    const { data } = await api.get<ApiResponse<WalletInfo>>("/wallet");
    if (!data.success || !data.data) throw new Error(data.message || "Không thể tải ví");
    return data.data;
  },

  async requestTopup(amount: number): Promise<WalletInfo> {
    const { data } = await api.post<ApiResponse<WalletInfo>>("/wallet/topups", { amount });
    if (!data.success || !data.data)
      throw new Error(data.message || "Không thể tạo yêu cầu nạp ví");
    return data.data;
  },

  async getPendingTopups(): Promise<PendingTopup[]> {
    const { data } = await api.get<ApiResponse<PendingTopup[]>>("/wallet/topups/pending");
    if (!data.success) throw new Error(data.message || "Không thể tải yêu cầu nạp ví");
    return data.data || [];
  },

  async reviewTopup(transactionId: string, status: "success" | "failed") {
    const { data } = await api.patch<ApiResponse<unknown>>(`/wallet/topups/${transactionId}`, {
      status,
    });
    if (!data.success) throw new Error(data.message || "Không thể cập nhật giao dịch");
    return data;
  },
};
