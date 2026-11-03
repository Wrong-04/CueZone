import api from "./api";

export interface RevenueKPIs {
  totalRevenue: number;
  tableRevenue: number;
  fnbRevenue: number;
  discountAmount: number;
  invoiceCount: number;
  averageBillValue: number;
}

export interface RevenueTimelinePoint {
  key: string;
  label: string;
  tableRevenue: number;
  fnbRevenue: number;
  discountAmount: number;
  totalRevenue: number;
  invoiceCount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopProductRevenue {
  name: string;
  quantity: number;
  revenue: number;
}

export interface RevenueReportData {
  period: {
    type: "day" | "week" | "month" | "year" | "custom";
    fromDate: string;
    toDate: string;
  };
  kpis: RevenueKPIs;
  timeline: RevenueTimelinePoint[];
  paymentMethods: PaymentMethodBreakdown[];
  topProducts: TopProductRevenue[];
}

export interface RevenueReportQuery {
  period?: "day" | "week" | "month" | "year" | "custom";
  fromDate?: string;
  toDate?: string;
}

export const revenueReportService = {
  /**
   * Lấy dữ liệu báo cáo doanh thu tổng hợp từ API backend
   */
  async getRevenueReport(query: RevenueReportQuery): Promise<RevenueReportData> {
    const params: Record<string, string> = {};
    if (query.period) params.period = query.period;
    if (query.fromDate) params.fromDate = query.fromDate;
    if (query.toDate) params.toDate = query.toDate;

    const res = await api.get<{ success: boolean; data: RevenueReportData }>("/reports/revenue", {
      params,
    });
    return res.data.data;
  },
};

