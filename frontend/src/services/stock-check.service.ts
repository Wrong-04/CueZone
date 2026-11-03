import api from "./api";

export type StockCheckStatus = "draft" | "submitted" | "completed" | "cancelled";

export interface StockCheckItem {
  product: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  systemStock: number;
  actualStock: number | null;
  variance: number;
  varianceValue: number;
  note?: string;
}

export interface StockCheckSummary {
  totalItems: number;
  matchedItems: number;
  surplusItems: number;
  deficitItems: number;
  totalVarianceValue: number;
}

export interface StockCheckSession {
  _id: string;
  checkCode: string;
  title: string;
  category: string;
  status: StockCheckStatus;
  items: StockCheckItem[];
  summary: StockCheckSummary;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  submittedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  note?: string;
  auditLog?: {
    action: string;
    performedBy: {
      _id: string;
      name: string;
      email: string;
    };
    performedAt: string;
    details?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockCheckInput {
  title: string;
  category?: string;
  note?: string;
}

export interface UpdateCountItemInput {
  productId: string;
  actualStock: number;
  note?: string;
}

export interface StockCheckFilter {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export const stockCheckService = {
  async getStockChecks(filter: StockCheckFilter = {}) {
    const res = await api.get<{
      success: boolean;
      data: StockCheckSession[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>("/inventory/stock-checks", { params: filter });
    return res.data;
  },

  async getStockCheckById(id: string) {
    const res = await api.get<{ success: boolean; data: StockCheckSession }>(
      `/inventory/stock-checks/${id}`,
    );
    return res.data.data;
  },

  async createStockCheck(input: CreateStockCheckInput) {
    const res = await api.post<{ success: boolean; data: StockCheckSession }>(
      "/inventory/stock-checks",
      input,
    );
    return res.data.data;
  },

  async updateCounts(id: string, counts: UpdateCountItemInput[], submit: boolean = false) {
    const res = await api.put<{ success: boolean; message: string; data: StockCheckSession }>(
      `/inventory/stock-checks/${id}/counts`,
      { counts, submit },
    );
    return res.data.data;
  },

  async approveStockCheck(id: string) {
    const res = await api.post<{ success: boolean; message: string; data: StockCheckSession }>(
      `/inventory/stock-checks/${id}/approve`,
    );
    return res.data.data;
  },

  async cancelStockCheck(id: string, reason?: string) {
    const res = await api.post<{ success: boolean; message: string; data: StockCheckSession }>(
      `/inventory/stock-checks/${id}/cancel`,
      { reason },
    );
    return res.data.data;
  },
};

