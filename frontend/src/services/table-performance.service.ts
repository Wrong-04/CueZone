import api from "./api";

export interface TablePerformanceItem {
  tableId: string;
  tableName: string;
  tableCode: string;
  type: string;
  typeName: string;
  totalPlayMinutes: number;
  totalPlayHours: number;
  utilizationRate: number;
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  sessionCount: number;
  rank: number;
}

export interface TableTypePerformance {
  type: string;
  typeName: string;
  tableCount: number;
  totalPlayHours: number;
  utilizationRate: number;
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  averageHoursPerTable: number;
}

export interface HourlyFillRate {
  hour: number;
  label: string;
  occupancyPercent: number;
  sessionCount: number;
}

export interface TablePerformanceReportData {
  period: {
    type: string;
    fromDate: string;
    toDate: string;
    daysCount: number;
  };
  summary: {
    totalTables: number;
    totalPlayHours: number;
    averageUtilizationRate: number;
    totalRevenue: number;
    peakHour: string;
  };
  typeComparison: TableTypePerformance[];
  hourlyFillRates: HourlyFillRate[];
  topTables: TablePerformanceItem[];
}

export interface TablePerformanceFilter {
  period?: "day" | "week" | "month" | "year" | "custom";
  fromDate?: string;
  toDate?: string;
  type?: string;
}

export const tablePerformanceService = {
  async getReport(filter: TablePerformanceFilter): Promise<TablePerformanceReportData> {
    const params: Record<string, string> = {};
    if (filter.period) params.period = filter.period;
    if (filter.fromDate) params.fromDate = filter.fromDate;
    if (filter.toDate) params.toDate = filter.toDate;
    if (filter.type && filter.type !== "all") params.type = filter.type;

    const res = await api.get<{ success: boolean; data: TablePerformanceReportData }>(
      "/reports/table-performance",
      { params },
    );
    return res.data.data;
  },

  async getTopTables(filter: TablePerformanceFilter & { limit?: number }): Promise<TablePerformanceItem[]> {
    const params: Record<string, any> = { ...filter };
    if (params.type === "all") delete params.type;

    const res = await api.get<{ success: boolean; data: TablePerformanceItem[] }>(
      "/reports/top-tables",
      { params },
    );
    return res.data.data;
  },
};

