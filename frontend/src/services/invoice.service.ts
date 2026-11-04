import api from "./api";
import type { ClubInvoice } from "../pages/admin/InvoicesManagementPage";

export interface InvoicesResponse {
  items: ClubInvoice[];
  total: number;
  metrics: {
    totalCount: number;
    paidCount: number;
    totalRevenue: number;
    totalTableFee: number;
    totalFnbFee: number;
    cashRevenue?: number;
    bankRevenue?: number;
    walletRevenue?: number;
    pendingCount: number;
  };
}

export interface QuickInvoicePayload {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  discountAmount?: number;
  note?: string;
}

export const invoiceService = {
  async getInvoices(params?: {
    search?: string;
    status?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<InvoicesResponse> {
    const res = await api.get<{ success: boolean; data: InvoicesResponse }>("/invoices", {
      params,
    });
    return res.data.data;
  },

  async getById(id: string) {
    const res = await api.get<{ success: boolean; data: any }>(`/invoices/${id}`);
    return res.data.data;
  },

  async createQuick(payload: QuickInvoicePayload) {
    const res = await api.post<{ success: boolean; data: any; message?: string }>(
      "/invoices/quick",
      payload,
    );
    return res.data;
  },
};
